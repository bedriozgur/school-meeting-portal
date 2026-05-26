import type { MeetingRepository } from "../interfaces";
import { mockMeetingEvents } from "./mockData";

export const mockMeetingRepository: MeetingRepository = {
  async findByCode(meetingCode) {
    const normalizedCode = meetingCode.trim().toUpperCase();

    return (
      mockMeetingEvents.find((meeting) => meeting.code === normalizedCode) ??
      null
    );
  },
};
