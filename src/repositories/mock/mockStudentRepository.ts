import type { StudentRepository } from "../interfaces";
import { mockMeetingRepository } from "./mockMeetingRepository";
import { mockStudents } from "./mockData";

export const mockStudentRepository: StudentRepository = {
  async findBySchoolNumber({ meetingCode, schoolNumber }) {
    const meeting = await mockMeetingRepository.findByCode(meetingCode);

    if (!meeting) {
      return null;
    }

    return (
      mockStudents.find(
        (student) =>
          student.schoolId === meeting.schoolId &&
          student.schoolNumber === schoolNumber.trim(),
      ) ?? null
    );
  },
};
