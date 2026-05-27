import type { ParentMeetingRepository } from "../interfaces";
import {
  mockSchool,
  mockTeachers,
  mockEventTeacherSetups,
} from "./mockData";
import { mockMeetingRepository } from "./mockMeetingRepository";
import { mockStudentRepository } from "./mockStudentRepository";
import { getTeachingAssignmentsForClass } from "./mockTeachingAssignmentRepository";
import { sortTeacherAssignments } from "../../utils/teachers";
import type { TeacherAssignment } from "../../domain/models";

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
    const teachingAssignments = getTeachingAssignmentsForClass(student.classId).filter(
      (assignment) => assignment.isActive,
    );
    const setupByTeacherId = new Map(
      mockEventTeacherSetups
        .filter((setup) => setup.eventId === meetingEvent.id)
        .map((setup) => [setup.teacherId, setup] as const),
    );
    const teacherAssignments = teachingAssignments
      .map<TeacherAssignment | null>((assignment) => {
        const teacher = mockTeachers.find((item) => item.id === assignment.teacherId);
        if (!teacher) {
          return null;
        }

        const setup = setupByTeacherId.get(assignment.teacherId);

        return {
          id: assignment.id,
          teacher,
          subject: assignment.subject,
          subjectMissing: !assignment.subject.trim(),
          building: setup?.building ?? "",
          floor: setup?.floor ?? 0,
          classroom: setup?.classroom ?? "",
          availability: setup?.isAvailable ? ("available" as const) : ("busy" as const),
          locationMissing: !setup,
        };
      })
      .filter((assignment): assignment is TeacherAssignment => Boolean(assignment));

    return {
      school: mockSchool,
      meetingEvent,
      student,
      classTeacher,
      teacherAssignments: sortTeacherAssignments(teacherAssignments),
    };
  },
};
