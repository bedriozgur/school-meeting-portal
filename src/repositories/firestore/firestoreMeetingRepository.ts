import type { MeetingRepository } from "../interfaces";
import {
  findActiveOrDraftEventByCode,
  requireFirestore,
} from "./firestoreLookups";

export const firestoreMeetingRepository: MeetingRepository = {
  async findByCode(meetingCode) {
    const db = requireFirestore();

    return findActiveOrDraftEventByCode(db, meetingCode);
  },
};
