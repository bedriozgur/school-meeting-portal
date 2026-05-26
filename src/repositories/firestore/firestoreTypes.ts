export type FirestoreSchoolDocument = {
  name?: string;
  logoInitials?: string;
};

export type FirestoreEventDocument = {
  schoolId?: string;
  meetingCode?: string;
  status?: string;
  includedClasses?: string[];
  title?: string;
  date?: string;
};

export type FirestoreStudentDocument = {
  schoolId?: string;
  schoolNumber?: string;
  fullName?: string;
  classId?: string;
};

export type FirestoreClassDocument = {
  schoolId?: string;
  name?: string;
  grade?: string;
  classTeacherId?: string;
};

export type FirestoreTeacherDocument = {
  schoolId?: string;
  fullName?: string;
  defaultSubject?: string;
};

export type FirestoreMeetingAssignmentDocument = {
  eventId?: string;
  schoolId?: string;
  teacherId?: string;
  classId?: string;
  subject?: string;
  building?: string;
  floor?: number;
  classroom?: string;
  isAvailable?: boolean;
};
