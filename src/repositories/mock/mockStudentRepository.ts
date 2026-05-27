import type { StudentRepository } from "../interfaces";
import { DEFAULT_SCHOOL_ID } from "../../config/school";
import { mockMeetingRepository } from "./mockMeetingRepository";
import { mockClasses, mockStudents } from "./mockData";

export const mockStudentRepository: StudentRepository = {
  async listStudents(schoolId = DEFAULT_SCHOOL_ID) {
    return mockStudents.filter((student) => student.schoolId === schoolId);
  },
  async countStudents(schoolId = DEFAULT_SCHOOL_ID) {
    return mockStudents.filter((student) => student.schoolId === schoolId).length;
  },
  async getStudentById(studentId) {
    return mockStudents.find((student) => student.id === studentId) ?? null;
  },
  async createStudent(input) {
    assertSchoolNumberAvailable(input.schoolNumber);
    const schoolClass = requireMockClass(input.classId);
    const student = {
      id: `student-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      schoolId: DEFAULT_SCHOOL_ID,
      schoolNumber: input.schoolNumber.trim(),
      name: input.name.trim(),
      classId: input.classId,
      className: schoolClass.name,
      grade: schoolClass.grade,
      classTeacherId: schoolClass.classTeacherId,
      isActive: input.isActive,
    };
    mockStudents.push(student);

    return student;
  },
  async updateStudent(studentId, input) {
    const student = mockStudents.find(
      (currentStudent) => currentStudent.id === studentId,
    );

    if (!student) {
      throw new Error(`Student not found: ${studentId}`);
    }

    assertSchoolNumberAvailable(input.schoolNumber, studentId);
    const schoolClass = requireMockClass(input.classId);
    Object.assign(student, {
      schoolNumber: input.schoolNumber.trim(),
      name: input.name.trim(),
      classId: input.classId,
      className: schoolClass.name,
      grade: schoolClass.grade,
      classTeacherId: schoolClass.classTeacherId,
      isActive: input.isActive,
    });

    return student;
  },
  async bulkUpsertStudents(inputs) {
    const students = [];
    let created = 0;
    let updated = 0;

    for (const input of inputs) {
      const normalizedSchoolNumber = normalizeSchoolNumber(input.schoolNumber);
      const existingStudent = mockStudents.find(
        (student) =>
          student.schoolId === DEFAULT_SCHOOL_ID &&
          normalizeSchoolNumber(student.schoolNumber) === normalizedSchoolNumber,
      );

      if (existingStudent) {
        students.push(await mockStudentRepository.updateStudent(existingStudent.id, input));
        updated += 1;
      } else {
        students.push(await mockStudentRepository.createStudent(input));
        created += 1;
      }
    }

    return { created, updated, students };
  },
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

function assertSchoolNumberAvailable(
  schoolNumber: string,
  excludingStudentId?: string,
) {
  const normalizedSchoolNumber = schoolNumber.trim();
  const duplicate = mockStudents.some(
    (student) =>
      student.schoolId === DEFAULT_SCHOOL_ID &&
      student.schoolNumber === normalizedSchoolNumber &&
      student.id !== excludingStudentId,
  );

  if (duplicate) {
    throw new Error(`School number is already in use: ${normalizedSchoolNumber}`);
  }
}

function normalizeSchoolNumber(schoolNumber: string) {
  return schoolNumber.trim();
}

function requireMockClass(classId: string) {
  const schoolClass = mockClasses.find(
    (currentClass) => currentClass.id === classId,
  );

  if (!schoolClass) {
    throw new Error(`Class not found: ${classId}`);
  }

  return schoolClass;
}
