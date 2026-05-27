import {
  addDoc,
  collection,
  getCountFromServer,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import type { Student } from "../../domain/models";
import { DEFAULT_SCHOOL_ID } from "../../config/school";
import type { StudentRepository } from "../interfaces";
import {
  findStudentForEvent,
  getClassById,
  requireFirestore,
} from "./firestoreLookups";
import { logFirestoreCollectionFailure } from "./firestoreRepositoryLogging";
import type { FirestoreStudentDocument } from "./firestoreTypes";

export const firestoreStudentRepository: StudentRepository = {
  async listStudents(schoolId = DEFAULT_SCHOOL_ID) {
    const db = requireFirestore();
    try {
      const snapshot = await getDocs(
        query(collection(db, "students"), where("schoolId", "==", schoolId)),
      );
      const students = await Promise.all(
        snapshot.docs.map(async (studentDocument) => {
          const data = studentDocument.data() as FirestoreStudentDocument;
          const classData = await getClassById(db, data.classId ?? "");

          return {
            id: studentDocument.id,
            schoolId: data.schoolId ?? "",
            schoolNumber: data.schoolNumber ?? "",
            name: data.fullName ?? "",
            classId: data.classId ?? "",
            className: classData.name ?? "",
            grade: classData.grade ?? "",
            classTeacherId: classData.classTeacherId ?? "",
            isActive: data.isActive ?? true,
          } satisfies Student;
        }),
      );

      return students.sort((left, right) =>
        left.schoolNumber.localeCompare(right.schoolNumber, "tr", {
          numeric: true,
        }),
      );
    } catch (error) {
      await logFirestoreCollectionFailure({
        collectionName: "students",
        operation: "listStudents",
        schoolId,
        error,
      });
      throw error;
    }
  },
  async countStudents(schoolId = DEFAULT_SCHOOL_ID) {
    const db = requireFirestore();
    try {
      const snapshot = await getCountFromServer(
        query(collection(db, "students"), where("schoolId", "==", schoolId)),
      );

      return snapshot.data().count;
    } catch (error) {
      await logFirestoreCollectionFailure({
        collectionName: "students",
        operation: "countStudents",
        schoolId,
        error,
      });
      throw error;
    }
  },
  async getStudentById(studentId) {
    const db = requireFirestore();
    const snapshot = await getDoc(doc(db, "students", studentId));

    if (!snapshot.exists()) {
      return null;
    }

    return mapStudentDocument(studentId, snapshot.data() as FirestoreStudentDocument);
  },
  async createStudent(input) {
    const db = requireFirestore();
    await assertSchoolNumberAvailable(input.schoolNumber);
    const classData = await getClassById(db, input.classId);
    const studentData = {
      schoolId: DEFAULT_SCHOOL_ID,
      schoolNumber: input.schoolNumber.trim(),
      normalizedSchoolNumber: normalizeSchoolNumber(input.schoolNumber),
      fullName: input.name.trim(),
      classId: input.classId,
      isActive: input.isActive,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const studentRef = await addDoc(collection(db, "students"), studentData);

    return mapStudentFromData(studentRef.id, studentData, classData);
  },
  async updateStudent(studentId, input) {
    const db = requireFirestore();
    const studentRef = doc(db, "students", studentId);
    const snapshot = await getDoc(studentRef);

    if (!snapshot.exists()) {
      throw new Error(`Student not found: ${studentId}`);
    }

    await assertSchoolNumberAvailable(input.schoolNumber, studentId);
    const classData = await getClassById(db, input.classId);
    const studentData = {
      schoolNumber: input.schoolNumber.trim(),
      normalizedSchoolNumber: normalizeSchoolNumber(input.schoolNumber),
      fullName: input.name.trim(),
      classId: input.classId,
      isActive: input.isActive,
      updatedAt: serverTimestamp(),
    };
    await updateDoc(studentRef, studentData);

    return mapStudentFromData(
      studentId,
      {
        ...(snapshot.data() as FirestoreStudentDocument),
        ...studentData,
      },
      classData,
    );
  },
  async bulkUpsertStudents(inputs) {
    const db = requireFirestore();
    const existingSnapshot = await getDocs(
      query(collection(db, "students"), where("schoolId", "==", DEFAULT_SCHOOL_ID)),
    );
    const studentIdByNormalizedSchoolNumber = new Map(
      existingSnapshot.docs.map((studentDocument) => {
        const data = studentDocument.data() as FirestoreStudentDocument;

        return [
          data.normalizedSchoolNumber ??
            normalizeSchoolNumber(data.schoolNumber ?? ""),
          studentDocument.id,
        ] as const;
      }),
    );
    const students = [];
    let created = 0;
    let updated = 0;

    for (const input of inputs) {
      const normalizedSchoolNumber = normalizeSchoolNumber(input.schoolNumber);
      const existingStudentId =
        studentIdByNormalizedSchoolNumber.get(normalizedSchoolNumber);

      if (existingStudentId) {
        students.push(
          await firestoreStudentRepository.updateStudent(existingStudentId, input),
        );
        updated += 1;
      } else {
        const student = await firestoreStudentRepository.createStudent(input);
        studentIdByNormalizedSchoolNumber.set(normalizedSchoolNumber, student.id);
        students.push(student);
        created += 1;
      }
    }

    return { created, updated, students };
  },
  async findBySchoolNumber({ meetingCode, schoolNumber }) {
    const db = requireFirestore();

    return findStudentForEvent({
      db,
      meetingCode,
      schoolNumber,
    });
  },
};

async function assertSchoolNumberAvailable(
  schoolNumber: string,
  excludingStudentId?: string,
) {
  const db = requireFirestore();
  try {
    const snapshot = await getDocs(
      query(
        collection(db, "students"),
        where("schoolId", "==", DEFAULT_SCHOOL_ID),
        where("schoolNumber", "==", schoolNumber.trim()),
      ),
    );
    const duplicate = snapshot.docs.some(
      (studentDocument) =>
        !excludingStudentId || studentDocument.id !== excludingStudentId,
    );

    if (duplicate) {
      throw new Error(`School number is already in use: ${schoolNumber.trim()}`);
    }
  } catch (error) {
    await logFirestoreCollectionFailure({
      collectionName: "students",
      operation: "assertSchoolNumberAvailable",
      schoolId: DEFAULT_SCHOOL_ID,
      error,
    });
    throw error;
  }
}

function normalizeSchoolNumber(schoolNumber: string) {
  return schoolNumber.trim();
}

async function mapStudentDocument(
  studentId: string,
  studentData: FirestoreStudentDocument,
) {
  const db = requireFirestore();
  const classData = await getClassById(db, studentData.classId ?? "");

  return mapStudentFromData(studentId, studentData, classData);
}

function mapStudentFromData(
  studentId: string,
  studentData: FirestoreStudentDocument,
  classData: Awaited<ReturnType<typeof getClassById>>,
): Student {
  return {
    id: studentId,
    schoolId: studentData.schoolId ?? DEFAULT_SCHOOL_ID,
    schoolNumber: studentData.schoolNumber ?? "",
    name: studentData.fullName ?? "",
    classId: studentData.classId ?? "",
    className: classData.name ?? "",
    grade: classData.grade ?? "",
    classTeacherId: classData.classTeacherId ?? "",
    isActive: studentData.isActive ?? true,
  };
}
