import type { ParentMeetingRepository } from "../interfaces";
import {
  mockSchool,
  mockTeacherAssignments,
  mockTeachers,
} from "./mockData";
import { mockMeetingRepository } from "./mockMeetingRepository";
import { mockStudentRepository } from "./mockStudentRepository";

export const mockParentMeetingRepository: ParentMeetingRepository = {
  async getParentMeetingView({ meetingCode, schoolNumber }) {
    const meetingEvent = await mockMeetingRepository.findByCode(meetingCode);
    const student = await mockStudentRepository.findBySchoolNumber({
      meetingCode,
      schoolNumber,
    });

    if (!meetingEvent || !student) {
      return null;
    }

    const classTeacher =
      mockTeachers.find((teacher) => teacher.id === student.classTeacherId) ??
      mockTeachers[0];

    return {
      school: mockSchool,
      meetingEvent,
      student,
      classTeacher,
      teacherAssignments: mockTeacherAssignments,
    };
  },
};
