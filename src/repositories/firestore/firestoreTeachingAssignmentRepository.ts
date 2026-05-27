import {
  addDoc,
  collection,
  getCountFromServer,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import type {
  TeachingAssignment,
  TeachingAssignmentBulkUpsertResult,
  TeachingAssignmentFormInput,
} from "../../domain/models";
import { DEFAULT_SCHOOL_ID } from "../../config/school";
import type { TeachingAssignmentRepository } from "../interfaces";
import { mapTeachingAssignment } from "./firestoreMappers";
import {
  getClassById,
  getTeacherById,
  getTeacherByIdOrNull,
  requireFirestore,
} from "./firestoreLookups";
import type { FirestoreTeachingAssignmentDocument } from "./firestoreTypes";
import {
  normalizeTeachingAssignmentSubject,
  resolveTeachingAssignmentInputSubject,
  teachingAssignmentSubjectKey,
  teachingAssignmentSubjectKeyFromAssignment,
} from "../../utils/teachingAssignments";

export const firestoreTeachingAssignmentRepository: TeachingAssignmentRepository = {
  async listTeachingAssignmentsForClass(classId) {
    const db = requireFirestore();
    const snapshot = await getDocs(
      query(
        collection(db, "teachingAssignments"),
        where("classId", "==", classId),
      ),
    );

    const rows = await Promise.all(
      snapshot.docs.map(async (assignmentDocument) => {
        const assignmentData =
          assignmentDocument.data() as FirestoreTeachingAssignmentDocument;
        const teacher = assignmentData.teacherId
          ? await getTeacherByIdOrNull(db, assignmentData.teacherId)
          : null;

        return mapTeachingAssignment({
          id: assignmentDocument.id,
          assignmentData,
          classId: assignmentDocument.data().classId ?? "",
          teacherId: assignmentDocument.data().teacherId ?? "",
          teacher,
        });
      }),
    );

    return rows.sort(sortTeachingAssignments);
  },
  async listTeachingAssignmentsForTeacher(teacherId) {
    const db = requireFirestore();
    const snapshot = await getDocs(
      query(
        collection(db, "teachingAssignments"),
        where("teacherId", "==", teacherId),
      ),
    );

    const rows = await Promise.all(
      snapshot.docs.map(async (assignmentDocument) => {
        const assignmentData =
          assignmentDocument.data() as FirestoreTeachingAssignmentDocument;
        const teacher = assignmentData.teacherId
          ? await getTeacherByIdOrNull(db, assignmentData.teacherId)
          : null;

        return mapTeachingAssignment({
          id: assignmentDocument.id,
          assignmentData,
          classId: assignmentDocument.data().classId ?? "",
          teacherId: assignmentDocument.data().teacherId ?? "",
          teacher,
        });
      }),
    );

    return rows.sort(sortTeachingAssignments);
  },
  async countTeachingAssignments() {
    const db = requireFirestore();
    const snapshot = await getCountFromServer(
      query(
        collection(db, "teachingAssignments"),
        where("schoolId", "==", DEFAULT_SCHOOL_ID),
      ),
    );

    return snapshot.data().count;
  },
  async getTeachingAssignmentById(teachingAssignmentId) {
    const db = requireFirestore();
    const snapshot = await getDoc(doc(db, "teachingAssignments", teachingAssignmentId));

    if (!snapshot.exists()) {
      return null;
    }

    return mapTeachingAssignment({
      id: snapshot.id,
      assignmentData: snapshot.data() as FirestoreTeachingAssignmentDocument,
      classId: snapshot.data().classId ?? "",
      teacherId: snapshot.data().teacherId ?? "",
      teacher: await getTeacherByIdOrNull(
        db,
        (snapshot.data() as FirestoreTeachingAssignmentDocument).teacherId ?? "",
      ),
    });
  },
  async createTeachingAssignment(input) {
    const db = requireFirestore();
    await getClassById(db, input.classId);
    const teacher = await getTeacherById(db, input.teacherId);
    const assignmentData = toFirestoreTeachingAssignment(input, teacher, true);
    await assertNoDuplicate(db, input, teacher);
    const assignmentRef = await addDoc(
      collection(db, "teachingAssignments"),
      assignmentData,
    );

    return mapTeachingAssignment({
      id: assignmentRef.id,
      assignmentData,
      classId: input.classId,
      teacherId: input.teacherId,
      teacher,
    });
  },
  async updateTeachingAssignment(teachingAssignmentId, input) {
    const db = requireFirestore();
    const assignmentRef = doc(db, "teachingAssignments", teachingAssignmentId);
    const snapshot = await getDoc(assignmentRef);

    if (!snapshot.exists()) {
      throw new Error(`Teaching assignment not found: ${teachingAssignmentId}`);
    }

    await getClassById(db, input.classId);
    const teacher = await getTeacherById(db, input.teacherId);
    await assertNoDuplicate(db, input, teacher, teachingAssignmentId);
    const assignmentData = {
      ...toFirestoreTeachingAssignment(input, teacher, false),
      updatedAt: serverTimestamp(),
    };
    await updateDoc(assignmentRef, assignmentData);

    return mapTeachingAssignment({
      id: teachingAssignmentId,
      assignmentData: {
        ...(snapshot.data() as FirestoreTeachingAssignmentDocument),
        ...assignmentData,
      },
      classId: input.classId,
      teacherId: input.teacherId,
      teacher,
    });
  },
  async deleteTeachingAssignment(teachingAssignmentId) {
    const db = requireFirestore();
    await deleteDoc(doc(db, "teachingAssignments", teachingAssignmentId));
  },
  async bulkUpsertTeachingAssignments(inputs) {
    const db = requireFirestore();
    const teacherIds = new Set(inputs.map((input) => input.teacherId));
    const existingSnapshot = await getDocs(
      query(collection(db, "teachingAssignments"), where("schoolId", "==", DEFAULT_SCHOOL_ID)),
    );
    const existingAssignments = existingSnapshot.docs.map((assignmentDocument) => ({
      id: assignmentDocument.id,
      data: assignmentDocument.data() as FirestoreTeachingAssignmentDocument,
    }));
    const teachersById = new Map(
      await Promise.all(
        [...teacherIds].map(async (teacherId) => [
          teacherId,
          await getTeacherByIdOrNull(db, teacherId),
        ] as const),
      ),
    );
    const uniqueInputs = dedupeInputs(inputs, teachersById);
    const assignments: TeachingAssignment[] = [];
    let created = 0;
    let updated = 0;

    for (const input of uniqueInputs) {
      const match = existingAssignments.find((assignment) =>
        isSameTeachingAssignmentKey(assignment.data, input, teachersById.get(input.teacherId)),
      );

      if (match) {
        const updatedData = {
          ...toFirestoreTeachingAssignment(input, teachersById.get(input.teacherId) ?? null, false),
          updatedAt: serverTimestamp(),
        };
        await updateDoc(doc(db, "teachingAssignments", match.id), updatedData);
        updated += 1;
        assignments.push(
          mapTeachingAssignment({
            id: match.id,
            assignmentData: {
              ...match.data,
              ...updatedData,
            } as FirestoreTeachingAssignmentDocument,
            classId: input.classId,
            teacherId: input.teacherId,
            teacher: teachersById.get(input.teacherId) ?? null,
          }),
        );
        continue;
      }

      const teacher = teachersById.get(input.teacherId) ?? null;
      const assignmentData = toFirestoreTeachingAssignment(input, teacher, true);
      const assignmentRef = await addDoc(
        collection(db, "teachingAssignments"),
        assignmentData,
      );
      created += 1;
      assignments.push(
        mapTeachingAssignment({
          id: assignmentRef.id,
          assignmentData,
          classId: input.classId,
          teacherId: input.teacherId,
          teacher: teacher ?? null,
        }),
      );
    }

    return { created, updated, teachingAssignments: assignments };
  },
};

function toFirestoreTeachingAssignment(
  input: TeachingAssignmentFormInput,
  teacher: Awaited<ReturnType<typeof getTeacherByIdOrNull>>,
  includeCreatedAt: boolean,
) {
  const resolvedSubject = resolveTeachingAssignmentInputSubject({
    input,
    teacher,
  });
  const subject = input.subject?.trim() ?? "";
  const subjectOverride = input.subjectOverride?.trim() ?? "";

  return {
    schoolId: DEFAULT_SCHOOL_ID,
    classId: input.classId,
    teacherId: input.teacherId,
    subject,
    subjectOverride: subjectOverride || null,
    normalizedSubject: normalizeTeachingAssignmentSubject(resolvedSubject),
    isActive: input.isActive,
    ...(includeCreatedAt ? { createdAt: serverTimestamp() } : {}),
    updatedAt: serverTimestamp(),
  };
}

async function assertNoDuplicate(
  db: ReturnType<typeof requireFirestore>,
  input: TeachingAssignmentFormInput,
  teacher: Awaited<ReturnType<typeof getTeacherByIdOrNull>>,
  excludingAssignmentId?: string,
) {
  const snapshot = await getDocs(
    query(collection(db, "teachingAssignments"), where("schoolId", "==", DEFAULT_SCHOOL_ID)),
  );
  const duplicate = snapshot.docs.some((assignmentDocument) => {
    if (assignmentDocument.id === excludingAssignmentId) {
      return false;
    }

    const data = assignmentDocument.data() as FirestoreTeachingAssignmentDocument;
    return isSameTeachingAssignmentKey(data, input, teacher);
  });

  if (duplicate) {
    throw new Error("Duplicate teaching assignment.");
  }
}

function dedupeInputs(
  inputs: TeachingAssignmentFormInput[],
  teachersById?: Map<string, Awaited<ReturnType<typeof getTeacherByIdOrNull>> | null>,
) {
  const seen = new Set<string>();

  return inputs.filter((input) => {
    const key = teachingAssignmentKey(input, teachersById?.get(input.teacherId) ?? null);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function teachingAssignmentKey(
  input: TeachingAssignmentFormInput,
  teacher?: Awaited<ReturnType<typeof getTeacherByIdOrNull>> | null,
) {
  return [
    input.classId,
    input.teacherId,
    normalizeTeachingAssignmentSubject(
      resolveTeachingAssignmentInputSubject({ input, teacher }),
    ),
  ].join("|");
}

function isSameTeachingAssignmentKey(
  assignment: FirestoreTeachingAssignmentDocument,
  input: TeachingAssignmentFormInput,
  teacher?: Awaited<ReturnType<typeof getTeacherByIdOrNull>> | null,
) {
  return (
    assignment.classId === input.classId &&
    assignment.teacherId === input.teacherId &&
    teachingAssignmentKey(input) ===
      teachingAssignmentSubjectKeyFromAssignment({
        assignment: {
          classId: assignment.classId ?? "",
          teacherId: assignment.teacherId ?? "",
          subject: assignment.subject ?? "",
          subjectOverride: assignment.subjectOverride ?? null,
        },
        teacher,
      })
  );
}

function sortTeachingAssignments(
  left: TeachingAssignment,
  right: TeachingAssignment,
) {
  const classId = left.classId.localeCompare(right.classId, "tr");

  if (classId !== 0) {
    return classId;
  }

  const teacherId = left.teacherId.localeCompare(right.teacherId, "tr");

  if (teacherId !== 0) {
    return teacherId;
  }

  return left.subject.localeCompare(right.subject, "tr");
}
