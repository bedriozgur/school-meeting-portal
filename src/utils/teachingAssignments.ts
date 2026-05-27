import type { Teacher, TeachingAssignment } from "../domain/models";

export function normalizeTeachingAssignmentSubject(value: string) {
  return value.trim().toLocaleLowerCase("tr");
}

export function resolveTeachingAssignmentSubject(params: {
  assignment: Pick<TeachingAssignment, "subject" | "subjectOverride">;
  teacher?: Pick<Teacher, "subject"> | null;
}) {
  const { assignment, teacher } = params;
  const override = assignment.subjectOverride?.trim() ?? "";
  const legacy = assignment.subject?.trim() ?? "";
  const defaultSubject = teacher?.subject?.trim() ?? "";

  return override || legacy || defaultSubject;
}

export function resolveTeachingAssignmentInputSubject(params: {
  input: {
    subject?: string;
    subjectOverride?: string | null;
  };
  teacher?: Pick<Teacher, "subject"> | null;
}) {
  const override = params.input.subjectOverride?.trim() ?? "";
  const legacy = params.input.subject?.trim() ?? "";
  const defaultSubject = params.teacher?.subject?.trim() ?? "";

  return override || legacy || defaultSubject;
}

export function teachingAssignmentSubjectKey(params: {
  classId: string;
  teacherId: string;
  subject: string;
}) {
  return [
    params.classId,
    params.teacherId,
    normalizeTeachingAssignmentSubject(params.subject),
  ].join("|");
}

export function teachingAssignmentSubjectKeyFromAssignment(params: {
  assignment: Pick<TeachingAssignment, "classId" | "teacherId" | "subject" | "subjectOverride">;
  teacher?: Pick<Teacher, "subject"> | null;
}) {
  return teachingAssignmentSubjectKey({
    classId: params.assignment.classId,
    teacherId: params.assignment.teacherId,
    subject: resolveTeachingAssignmentSubject({
      assignment: params.assignment,
      teacher: params.teacher ?? null,
    }),
  });
}
