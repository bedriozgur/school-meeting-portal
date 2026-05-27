import { collection, doc, getDoc, getDocs, orderBy, query } from "firebase/firestore";
import type { SchoolRepository } from "../interfaces";
import { mapSchool } from "./firestoreMappers";
import { requireFirestore } from "./firestoreLookups";
import type { FirestoreSchoolDocument } from "./firestoreTypes";

export const firestoreSchoolRepository: SchoolRepository = {
  async listSchools() {
    const db = requireFirestore();
    const snapshot = await getDocs(
      query(collection(db, "schools"), orderBy("name", "asc")),
    );

    return snapshot.docs.map((schoolDocument) =>
      mapSchool(schoolDocument.id, schoolDocument.data() as FirestoreSchoolDocument),
    );
  },
  async getSchoolById(schoolId) {
    const db = requireFirestore();
    const snapshot = await getDoc(doc(db, "schools", schoolId));

    if (!snapshot.exists()) {
      return null;
    }

    return mapSchool(snapshot.id, snapshot.data() as FirestoreSchoolDocument);
  },
};
