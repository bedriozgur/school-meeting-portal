export type FirestoreSchoolDocument = {
  name?: string;
  logoInitials?: string;
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
