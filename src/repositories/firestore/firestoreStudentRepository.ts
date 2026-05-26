import type { StudentRepository } from "../interfaces";
import { findStudentForEvent, requireFirestore } from "./firestoreLookups";

export const firestoreStudentRepository: StudentRepository = {
  async findBySchoolNumber({ meetingCode, schoolNumber }) {
    const db = requireFirestore();

    return findStudentForEvent({
      db,
      meetingCode,
      schoolNumber,
    });
  },
};
