import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import type { SchoolUserRepository } from "../interfaces";
import { DEFAULT_SCHOOL_ID } from "../../config/school";
import { mapSchoolUser } from "./firestoreMappers";
import { requireFirestore } from "./firestoreLookups";
import type { FirestoreSchoolUserDocument } from "./firestoreTypes";

export const firestoreSchoolUserRepository: SchoolUserRepository = {
  async listSchoolUsers(schoolId) {
    const db = requireFirestore();
    const snapshot = await getDocs(
      query(collection(db, "schoolUsers"), where("schoolId", "==", schoolId)),
    );

    return snapshot.docs.map((schoolUserDocument) =>
      mapSchoolUser(
        schoolUserDocument.id,
        schoolUserDocument.data() as FirestoreSchoolUserDocument,
      ),
    );
  },
  async getUserSchoolRoles(uid) {
    const db = requireFirestore();
    const snapshot = await getDocs(
      query(collection(db, "schoolUsers"), where("uid", "==", uid)),
    );

    return snapshot.docs.map((schoolUserDocument) =>
      mapSchoolUser(
        schoolUserDocument.id,
        schoolUserDocument.data() as FirestoreSchoolUserDocument,
      ),
    );
  },
  async upsertSchoolUserRole(input) {
    const db = requireFirestore();
    const schoolUserId = `${input.schoolId}_${input.uid}`;
    const schoolUserRef = doc(db, "schoolUsers", schoolUserId);
    const snapshot = await getDoc(schoolUserRef);
    const normalizedEmail = normalizeEmail(input.email);

    const schoolUserData = {
      schoolId: input.schoolId || DEFAULT_SCHOOL_ID,
      uid: input.uid.trim(),
      email: normalizedEmail,
      role: input.role,
      isActive: input.isActive,
      updatedAt: serverTimestamp(),
      ...(snapshot.exists()
        ? {}
        : {
            createdAt: serverTimestamp(),
          }),
    };

    await setDoc(schoolUserRef, schoolUserData, { merge: true });

    return mapSchoolUser(schoolUserId, {
      ...(snapshot.data() as FirestoreSchoolUserDocument),
      ...schoolUserData,
    });
  },
  async deactivateSchoolUserRole(id) {
    const db = requireFirestore();
    const schoolUserRef = doc(db, "schoolUsers", id);
    const snapshot = await getDoc(schoolUserRef);

    if (!snapshot.exists()) {
      throw new Error(`School user not found: ${id}`);
    }

    await updateDoc(schoolUserRef, {
      isActive: false,
      updatedAt: serverTimestamp(),
    });

    return mapSchoolUser(id, {
      ...(snapshot.data() as FirestoreSchoolUserDocument),
      isActive: false,
    });
  },
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
