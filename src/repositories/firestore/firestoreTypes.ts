export type FirestoreSchoolDocument = {
  name?: string;
  shortName?: string;
  logoInitials?: string;
  isActive?: boolean;
  themePreset?: string;
};

export type FirestoreSchoolUserDocument = {
  schoolId?: string;
  uid?: string;
  email?: string;
  role?: "schoolAdmin" | "staff";
  isActive?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type FirestoreEventDocument = {
  schoolId?: string;
  meetingCode?: string;
  status?: string;
  includedClasses?: string[];
  includedClassNames?: string[];
  title?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
};

export type FirestoreStudentDocument = {
  schoolId?: string;
  schoolNumber?: string;
  normalizedSchoolNumber?: string;
  fullName?: string;
  classId?: string;
  isActive?: boolean;
};

export type FirestoreClassDocument = {
  schoolId?: string;
  name?: string;
  normalizedClassName?: string;
  grade?: string;
  classTeacherId?: string | null;
  isActive?: boolean;
};

export type FirestoreTeacherDocument = {
  schoolId?: string;
  fullName?: string;
  normalizedFullName?: string;
  defaultSubject?: string;
  isActive?: boolean;
};

export type FirestoreTeachingAssignmentDocument = {
  schoolId?: string;
  classId?: string;
  teacherId?: string;
  subject?: string;
  subjectOverride?: string | null;
  normalizedSubject?: string;
  isActive?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type FirestoreEventTeacherSetupDocument = {
  schoolId?: string;
  eventId?: string;
  teacherId?: string;
  building?: string;
  floor?: number;
  classroom?: string;
  isAvailable?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type FirestoreMeetingAssignmentDocument = FirestoreEventTeacherSetupDocument;
