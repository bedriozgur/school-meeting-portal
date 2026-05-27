import type {
  TeachingAssignmentBulkUpsertResult,
  TeachingAssignmentFormInput,
  TeachingAssignment,
} from "../../domain/models";
import type { TeachingAssignmentRepository } from "../interfaces";
import { DEFAULT_SCHOOL_ID } from "../../config/school";
import { mockClasses, mockTeachers, mockTeachingAssignments } from "./mockData";
import {
  resolveTeachingAssignmentInputSubject,
  teachingAssignmentSubjectKey,
  teachingAssignmentSubjectKeyFromAssignment,
} from "../../utils/teachingAssignments";

export const mockTeachingAssignmentRepository: TeachingAssignmentRepository = {
  async listTeachingAssignmentsForClass(classId, schoolId = DEFAULT_SCHOOL_ID) {
    return getTeachingAssignmentsForClass(classId, schoolId);
  },
  async listTeachingAssignmentsForTeacher(teacherId, schoolId = DEFAULT_SCHOOL_ID) {
    return getTeachingAssignmentsForTeacher(teacherId, schoolId);
  },
  async countTeachingAssignments(schoolId = DEFAULT_SCHOOL_ID) {
    return mockTeachingAssignments.filter((assignment) => assignment.schoolId === schoolId).length;
  },
  async getTeachingAssignmentById(teachingAssignmentId) {
    return (
      mockTeachingAssignments.find(
        (teachingAssignment) => teachingAssignment.id === teachingAssignmentId,
      ) ?? null
    );
  },
  async createTeachingAssignment(input) {
    assertTeachingAssignmentAvailable(input);
    const teachingAssignment: TeachingAssignment = {
      id: `ta-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      schoolId: DEFAULT_SCHOOL_ID,
      classId: input.classId,
      teacherId: input.teacherId,
      subject: input.subject?.trim() || "",
      subjectOverride: input.subjectOverride?.trim() || null,
      isActive: input.isActive,
    };
    mockTeachingAssignments.push(teachingAssignment);

    return teachingAssignment;
  },
  async updateTeachingAssignment(teachingAssignmentId, input) {
    const teachingAssignment = mockTeachingAssignments.find(
      (currentTeachingAssignment) =>
        currentTeachingAssignment.id === teachingAssignmentId,
    );

    if (!teachingAssignment) {
      throw new Error(`Teaching assignment not found: ${teachingAssignmentId}`);
    }

    assertTeachingAssignmentAvailable(input, teachingAssignmentId);
    Object.assign(teachingAssignment, {
      classId: input.classId,
      teacherId: input.teacherId,
      subject: input.subject?.trim() || "",
      subjectOverride: input.subjectOverride?.trim() || null,
      isActive: input.isActive,
    });

    return teachingAssignment;
  },
  async deleteTeachingAssignment(teachingAssignmentId) {
    const index = mockTeachingAssignments.findIndex(
      (teachingAssignment) => teachingAssignment.id === teachingAssignmentId,
    );

    if (index === -1) {
      throw new Error(`Teaching assignment not found: ${teachingAssignmentId}`);
    }

    mockTeachingAssignments.splice(index, 1);
  },
  async bulkUpsertTeachingAssignments(inputs) {
    const uniqueInputs = dedupeInputs(inputs);
    let created = 0;
    let updated = 0;
    const teachingAssignments: TeachingAssignment[] = [];

    uniqueInputs.forEach((input) => {
      const teacher =
        mockTeachers.find((item) => item.id === input.teacherId) ?? null;
      const existingTeachingAssignment = mockTeachingAssignments.find(
        (teachingAssignment) =>
          isSameTeachingAssignmentKey(teachingAssignment, input, teacher),
      );
      if (!existingTeachingAssignment) {
        const teachingAssignment: TeachingAssignment = {
          id: `ta-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          schoolId: DEFAULT_SCHOOL_ID,
          classId: input.classId,
          teacherId: input.teacherId,
          subject: input.subject?.trim() || "",
          subjectOverride: input.subjectOverride?.trim() || null,
          isActive: input.isActive,
        };
        mockTeachingAssignments.push(teachingAssignment);
        created += 1;
        teachingAssignments.push(teachingAssignment);
        return;
      }

      Object.assign(existingTeachingAssignment, {
        classId: input.classId,
        teacherId: input.teacherId,
        subject: input.subject?.trim() || "",
        subjectOverride: input.subjectOverride?.trim() || null,
        isActive: input.isActive,
      });
      updated += 1;
      teachingAssignments.push(existingTeachingAssignment);
    });

    return {
      created,
      updated,
      teachingAssignments,
    } satisfies TeachingAssignmentBulkUpsertResult;
  },
};

export function getTeachingAssignmentsForClass(classId: string, schoolId = DEFAULT_SCHOOL_ID) {
  return mockTeachingAssignments
    .filter(
      (teachingAssignment) =>
        teachingAssignment.schoolId === schoolId &&
        teachingAssignment.classId === classId,
    )
    .map((teachingAssignment) => resolveTeachingAssignment(teachingAssignment));
}

export function getTeachingAssignmentsForTeacher(teacherId: string, schoolId = DEFAULT_SCHOOL_ID) {
  return mockTeachingAssignments
    .filter(
      (teachingAssignment) =>
        teachingAssignment.schoolId === schoolId &&
        teachingAssignment.teacherId === teacherId,
    )
    .map((teachingAssignment) => resolveTeachingAssignment(teachingAssignment));
}

function assertTeachingAssignmentAvailable(
  input: TeachingAssignmentFormInput,
  excludingId?: string,
) {
  const teacher =
    mockTeachers.find((item) => item.id === input.teacherId) ?? null;
  const duplicate = mockTeachingAssignments.some(
    (teachingAssignment) =>
      isSameTeachingAssignmentKey(teachingAssignment, input, teacher) &&
      teachingAssignment.id !== excludingId,
  );

  if (duplicate) {
    throw new Error("Duplicate teaching assignment.");
  }

  if (!mockClasses.some((schoolClass) => schoolClass.id === input.classId)) {
    throw new Error(`Class not found: ${input.classId}`);
  }

  if (!teacher) {
    throw new Error(`Teacher not found: ${input.teacherId}`);
  }
}

function dedupeInputs(inputs: TeachingAssignmentFormInput[]) {
  const seen = new Set<string>();

  return inputs.filter((input) => {
    const teacher =
      mockTeachers.find((item) => item.id === input.teacherId) ?? null;
    const key = teachingAssignmentSubjectKey({
      classId: input.classId,
      teacherId: input.teacherId,
      subject: resolveTeachingAssignmentInputSubject({ input, teacher }),
    });

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function isSameTeachingAssignmentKey(
  teachingAssignment: TeachingAssignment,
  input: TeachingAssignmentFormInput,
  teacher: { subject: string } | null,
) {
  return (
    teachingAssignmentSubjectKeyFromAssignment({
      assignment: teachingAssignment,
      teacher,
    }) ===
    teachingAssignmentSubjectKey({
      classId: input.classId,
      teacherId: input.teacherId,
      subject: resolveTeachingAssignmentInputSubject({ input, teacher }),
    })
  );
}

function resolveTeachingAssignment(teachingAssignment: TeachingAssignment) {
  const teacher =
    mockTeachers.find((item) => item.id === teachingAssignment.teacherId) ?? null;
  const subject = teachingAssignment.subjectOverride?.trim()
    ? teachingAssignment.subjectOverride.trim()
    : teachingAssignment.subject.trim() || teacher?.subject.trim() || "";

  return {
    ...teachingAssignment,
    subject,
  };
}
