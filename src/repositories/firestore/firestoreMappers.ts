import type {
  MeetingEvent,
  School,
  SchoolUser,
  Student,
  Teacher,
  TeacherAssignment,
  TeachingAssignment,
  EventTeacherSetupOverview,
} from "../../domain/models";
import type {
  FirestoreClassDocument,
  FirestoreEventDocument,
  FirestoreEventTeacherSetupDocument,
  FirestoreSchoolDocument,
  FirestoreSchoolUserDocument,
  FirestoreStudentDocument,
  FirestoreTeachingAssignmentDocument,
  FirestoreTeacherDocument,
} from "./firestoreTypes";

export function mapSchool(id: string, data: FirestoreSchoolDocument): School {
  return {
    id,
    name: data.name ?? "",
    shortName: data.shortName ?? "",
    logoInitials: data.logoInitials ?? "",
    isActive: data.isActive ?? true,
    themePreset: data.themePreset ?? "",
  };
}

export function mapSchoolUser(
  id: string,
  data: FirestoreSchoolUserDocument,
): SchoolUser {
  return {
    id,
    schoolId: data.schoolId ?? "",
    uid: data.uid ?? "",
    email: data.email ?? "",
    role: data.role === "staff" ? "staff" : "schoolAdmin",
    isActive: data.isActive ?? true,
    createdAt: stringifyTimestamp(data.createdAt),
    updatedAt: stringifyTimestamp(data.updatedAt),
  };
}

export function mapMeetingEvent(
  id: string,
  data: FirestoreEventDocument,
): MeetingEvent {
  return {
    id,
    schoolId: data.schoolId ?? "",
    code: data.meetingCode ?? "",
    status: isMeetingEventStatus(data.status) ? data.status : "draft",
    includedClasses: data.includedClasses ?? [],
    includedClassNames: data.includedClassNames ?? data.includedClasses ?? [],
    title: data.title ?? "",
    date: data.date ?? "",
    startTime: data.startTime ?? "",
    endTime: data.endTime ?? "",
  };
}

function isMeetingEventStatus(
  value: string | undefined,
): value is MeetingEvent["status"] {
  return (
    value === "active" ||
    value === "draft" ||
    value === "old" ||
    value === "archived"
  );
}

export function mapStudent(params: {
  id: string;
  studentData: FirestoreStudentDocument;
  classData: FirestoreClassDocument;
}): Student {
  const { id, studentData, classData } = params;

  return {
    id,
    schoolId: studentData.schoolId ?? "",
    schoolNumber: studentData.schoolNumber ?? "",
    name: studentData.fullName ?? "",
    classId: studentData.classId ?? "",
    className: classData.name ?? "",
    grade: classData.grade ?? "",
    classTeacherId: classData.classTeacherId ?? "",
    isActive: studentData.isActive ?? true,
  };
}

export function mapTeacher(
  id: string,
  data: FirestoreTeacherDocument,
): Teacher {
  return {
    id,
    name: data.fullName ?? "",
    subject: data.defaultSubject ?? "",
    isActive: data.isActive ?? true,
  };
}

export function mapTeacherAssignment(params: {
  id: string;
  assignmentData: FirestoreEventTeacherSetupDocument;
  teacher: Teacher;
  subject: string;
  subjectMissing?: boolean;
}): TeacherAssignment {
  const { id, assignmentData, teacher, subject, subjectMissing } = params;

  return {
    id,
    teacher,
    subject,
    subjectMissing,
    building: assignmentData.building ?? "",
    floor: assignmentData.floor ?? 0,
    classroom: assignmentData.classroom ?? "",
    availability: assignmentData.isAvailable ? "available" : "busy",
  };
}

export function mapTeachingAssignment(params: {
  id: string;
  assignmentData: FirestoreTeachingAssignmentDocument;
  classId: string;
  teacherId: string;
  teacher?: Teacher | null;
}): TeachingAssignment {
  const { id, assignmentData, classId, teacherId, teacher } = params;
  const subjectOverride = assignmentData.subjectOverride?.trim() ?? "";
  const legacySubject = assignmentData.subject?.trim() ?? "";
  const teacherDefaultSubject = teacher?.subject?.trim() ?? "";
  const subject = subjectOverride || legacySubject || teacherDefaultSubject;

  return {
    id,
    schoolId: assignmentData.schoolId ?? "",
    classId,
    teacherId,
    subject,
    subjectOverride: subjectOverride || null,
    isActive: assignmentData.isActive ?? true,
    createdAt: stringifyTimestamp(assignmentData.createdAt),
    updatedAt: stringifyTimestamp(assignmentData.updatedAt),
  };
}

export function mapEventTeacherSetupOverview(params: {
  id: string;
  setupData: FirestoreEventTeacherSetupDocument;
  teacher: Teacher;
  subject: string;
}): EventTeacherSetupOverview {
  const { id, setupData, teacher, subject } = params;

  return {
    id,
    teacher,
    subject,
    building: setupData.building ?? "",
    floor: setupData.floor ?? 0,
    classroom: setupData.classroom ?? "",
    availability: setupData.isAvailable ? "available" : "busy",
    locationMissing:
      !setupData.building?.trim() ||
      !setupData.classroom?.trim() ||
      !Number.isFinite(setupData.floor),
  };
}

function stringifyTimestamp(value: unknown) {
  if (!value) {
    return undefined;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object" && value && "toDate" in value) {
    const timestamp = value as { toDate: () => Date };

    return timestamp.toDate().toISOString();
  }

  return undefined;
}
