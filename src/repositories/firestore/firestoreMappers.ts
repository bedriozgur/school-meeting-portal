import type {
  MeetingEvent,
  School,
  Student,
  Teacher,
  TeacherAssignment,
} from "../../domain/models";
import type {
  FirestoreClassDocument,
  FirestoreEventDocument,
  FirestoreMeetingAssignmentDocument,
  FirestoreSchoolDocument,
  FirestoreStudentDocument,
  FirestoreTeacherDocument,
} from "./firestoreTypes";

export function mapSchool(id: string, data: FirestoreSchoolDocument): School {
  return {
    id,
    name: data.name ?? "",
    logoInitials: data.logoInitials ?? "",
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
    status: data.status === "draft" ? "draft" : "active",
    includedClasses: data.includedClasses ?? [],
    title: data.title ?? "",
    date: data.date ?? "",
  };
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
  };
}

export function mapTeacherAssignment(params: {
  id: string;
  assignmentData: FirestoreMeetingAssignmentDocument;
  teacher: Teacher;
}): TeacherAssignment {
  const { id, assignmentData, teacher } = params;

  return {
    id,
    teacher,
    subject: assignmentData.subject ?? teacher.subject,
    building: assignmentData.building ?? "",
    floor: assignmentData.floor ?? 0,
    classroom: assignmentData.classroom ?? "",
    availability: assignmentData.isAvailable ? "available" : "busy",
  };
}
