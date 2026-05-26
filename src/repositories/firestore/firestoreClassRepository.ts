import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import type { SchoolClass } from "../../domain/models";
import { DEFAULT_SCHOOL_ID } from "../../config/school";
import type { ClassRepository } from "../interfaces";
import { requireFirestore } from "./firestoreLookups";
import type { FirestoreClassDocument } from "./firestoreTypes";

export const firestoreClassRepository: ClassRepository = {
  async listClasses() {
    const db = requireFirestore();
    const snapshot = await getDocs(
      query(collection(db, "classes"), orderBy("name", "asc")),
    );

    return snapshot.docs.map((classDocument) =>
      mapSchoolClass(
        classDocument.id,
        classDocument.data() as FirestoreClassDocument,
      ),
    );
  },
  async getClassById(classId) {
    const db = requireFirestore();
    const snapshot = await getDoc(doc(db, "classes", classId));

    if (!snapshot.exists()) {
      return null;
    }

    return mapSchoolClass(snapshot.id, snapshot.data() as FirestoreClassDocument);
  },
  async createClass(input) {
    const db = requireFirestore();
    const classData = {
      schoolId: DEFAULT_SCHOOL_ID,
      name: input.name.trim(),
      normalizedClassName: normalizeClassName(input.name),
      grade: input.grade.trim(),
      classTeacherId: input.classTeacherId || null,
      isActive: input.isActive,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const classRef = await addDoc(collection(db, "classes"), classData);

    return mapSchoolClass(classRef.id, classData);
  },
  async updateClass(classId, input) {
    const db = requireFirestore();
    const classRef = doc(db, "classes", classId);
    const snapshot = await getDoc(classRef);

    if (!snapshot.exists()) {
      throw new Error(`Class not found: ${classId}`);
    }

    const classData = {
      name: input.name.trim(),
      normalizedClassName: normalizeClassName(input.name),
      grade: input.grade.trim(),
      classTeacherId: input.classTeacherId || null,
      isActive: input.isActive,
      updatedAt: serverTimestamp(),
    };
    await updateDoc(classRef, classData);

    return mapSchoolClass(classId, {
      ...(snapshot.data() as FirestoreClassDocument),
      ...classData,
    });
  },
  async bulkUpsertClasses(inputs) {
    const db = requireFirestore();
    const existingSnapshot = await getDocs(
      query(collection(db, "classes"), where("schoolId", "==", DEFAULT_SCHOOL_ID)),
    );
    const classIdByNormalizedName = new Map(
      existingSnapshot.docs.map((classDocument) => {
        const data = classDocument.data() as FirestoreClassDocument;

        return [
          data.normalizedClassName ?? normalizeClassName(data.name ?? ""),
          classDocument.id,
        ] as const;
      }),
    );
    const classes = [];
    let created = 0;
    let updated = 0;

    for (const input of inputs) {
      const normalizedName = normalizeClassName(input.name);
      const existingClassId = classIdByNormalizedName.get(normalizedName);

      if (existingClassId) {
        classes.push(await firestoreClassRepository.updateClass(existingClassId, input));
        updated += 1;
      } else {
        const schoolClass = await firestoreClassRepository.createClass(input);
        classIdByNormalizedName.set(normalizedName, schoolClass.id);
        classes.push(schoolClass);
        created += 1;
      }
    }

    return { created, updated, classes };
  },
};

function mapSchoolClass(id: string, data: FirestoreClassDocument): SchoolClass {
  return {
    id,
    schoolId: data.schoolId ?? "",
    name: data.name ?? "",
    grade: data.grade ?? "",
    classTeacherId: data.classTeacherId ?? "",
    isActive: data.isActive ?? true,
  };
}

function normalizeClassName(name: string) {
  return name.trim().toLocaleLowerCase("tr");
}
