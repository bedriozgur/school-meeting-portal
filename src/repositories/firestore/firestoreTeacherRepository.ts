import {
  addDoc,
  collection,
  getCountFromServer,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import type { Teacher } from "../../domain/models";
import { DEFAULT_SCHOOL_ID } from "../../config/school";
import type { TeacherRepository } from "../interfaces";
import { mapTeacher } from "./firestoreMappers";
import { requireFirestore } from "./firestoreLookups";
import type { FirestoreTeacherDocument } from "./firestoreTypes";

export const firestoreTeacherRepository: TeacherRepository = {
  async listTeachers() {
    const db = requireFirestore();
    const snapshot = await getDocs(
      query(collection(db, "teachers"), orderBy("fullName", "asc")),
    );

    return snapshot.docs.map((teacherDocument) =>
      mapTeacher(
        teacherDocument.id,
        teacherDocument.data() as FirestoreTeacherDocument,
      ),
    ) satisfies Teacher[];
  },
  async countTeachers() {
    const db = requireFirestore();
    const snapshot = await getCountFromServer(
      query(collection(db, "teachers"), where("schoolId", "==", DEFAULT_SCHOOL_ID)),
    );

    return snapshot.data().count;
  },
  async getTeacherById(teacherId) {
    const db = requireFirestore();
    const snapshot = await getDoc(doc(db, "teachers", teacherId));

    if (!snapshot.exists()) {
      return null;
    }

    return mapTeacher(snapshot.id, snapshot.data() as FirestoreTeacherDocument);
  },
  async createTeacher(input) {
    const db = requireFirestore();
    const teacherData = {
      schoolId: DEFAULT_SCHOOL_ID,
      fullName: input.name.trim(),
      normalizedFullName: normalizeTeacherName(input.name),
      defaultSubject: input.subject.trim(),
      isActive: input.isActive,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const teacherRef = await addDoc(collection(db, "teachers"), teacherData);

    return mapTeacher(teacherRef.id, teacherData);
  },
  async updateTeacher(teacherId, input) {
    const db = requireFirestore();
    const teacherRef = doc(db, "teachers", teacherId);
    const snapshot = await getDoc(teacherRef);

    if (!snapshot.exists()) {
      throw new Error(`Teacher not found: ${teacherId}`);
    }

    const teacherData = {
      fullName: input.name.trim(),
      normalizedFullName: normalizeTeacherName(input.name),
      defaultSubject: input.subject.trim(),
      isActive: input.isActive,
      updatedAt: serverTimestamp(),
    };
    await updateDoc(teacherRef, teacherData);

    return mapTeacher(teacherId, {
      ...(snapshot.data() as FirestoreTeacherDocument),
      ...teacherData,
    });
  },
  async bulkUpsertTeachers(inputs) {
    const db = requireFirestore();
    const existingSnapshot = await getDocs(
      query(collection(db, "teachers"), where("schoolId", "==", DEFAULT_SCHOOL_ID)),
    );
    const teacherIdByNormalizedName = new Map(
      existingSnapshot.docs.map((teacherDocument) => {
        const data = teacherDocument.data() as FirestoreTeacherDocument;

        return [
          data.normalizedFullName ?? normalizeTeacherName(data.fullName ?? ""),
          teacherDocument.id,
        ] as const;
      }),
    );
    const teachers = [];
    let created = 0;
    let updated = 0;

    for (const input of inputs) {
      const normalizedName = normalizeTeacherName(input.name);
      const existingTeacherId = teacherIdByNormalizedName.get(normalizedName);

      if (existingTeacherId) {
        teachers.push(
          await firestoreTeacherRepository.updateTeacher(existingTeacherId, input),
        );
        updated += 1;
      } else {
        const teacher = await firestoreTeacherRepository.createTeacher(input);
        teacherIdByNormalizedName.set(normalizedName, teacher.id);
        teachers.push(teacher);
        created += 1;
      }
    }

    return { created, updated, teachers };
  },
};

function normalizeTeacherName(name: string) {
  return name.trim().toLocaleLowerCase("tr");
}
