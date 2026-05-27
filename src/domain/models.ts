export type Availability = "available" | "busy" | "limited";

export type School = {
  id: string;
  name: string;
  shortName?: string;
  logoInitials: string;
  isActive?: boolean;
  themePreset?: string;
};

export type SchoolUserRole = "schoolAdmin" | "staff";

export type SchoolUser = {
  id: string;
  schoolId: string;
  uid: string;
  email: string;
  role: SchoolUserRole;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type SchoolUserFormInput = {
  schoolId: string;
  uid: string;
  email: string;
  role: SchoolUserRole;
  isActive: boolean;
};

export type MeetingEvent = {
  id: string;
  schoolId: string;
  code: string;
  status: "active" | "draft" | "old" | "archived";
  includedClasses: string[];
  includedClassNames: string[];
  title: string;
  date: string;
  startTime: string;
  endTime: string;
};

export type Student = {
  id: string;
  schoolId: string;
  schoolNumber: string;
  name: string;
  classId: string;
  className: string;
  grade: string;
  classTeacherId: string;
  isActive?: boolean;
};

export type StudentFormInput = {
  schoolNumber: string;
  name: string;
  classId: string;
  isActive: boolean;
};

export type StudentBulkUpsertResult = {
  created: number;
  updated: number;
  students: Student[];
};

export type SchoolClass = {
  id: string;
  schoolId: string;
  name: string;
  grade: string;
  classTeacherId: string;
  isActive?: boolean;
};

export type ClassFormInput = {
  name: string;
  grade: string;
  classTeacherId: string | null;
  isActive: boolean;
};

export type ClassBulkUpsertResult = {
  created: number;
  updated: number;
  classes: SchoolClass[];
};

export type Teacher = {
  id: string;
  schoolId?: string;
  name: string;
  subject: string;
  isActive?: boolean;
};

export type TeacherFormInput = {
  name: string;
  subject: string;
  isActive: boolean;
};

export type TeacherBulkUpsertResult = {
  created: number;
  updated: number;
  teachers: Teacher[];
};

export type TeachingAssignment = {
  id: string;
  schoolId: string;
  classId: string;
  teacherId: string;
  subject: string;
  subjectOverride?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type TeachingAssignmentFormInput = {
  classId: string;
  teacherId: string;
  subject?: string;
  subjectOverride?: string | null;
  isActive: boolean;
};

export type TeachingAssignmentBulkUpsertResult = {
  created: number;
  updated: number;
  teachingAssignments: TeachingAssignment[];
};

export type EventFormInput = {
  meetingCode?: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  includedClasses: string[];
};

export type EventTeacherSetup = {
  id: string;
  schoolId: string;
  eventId: string;
  teacherId: string;
  building: string;
  floor: number;
  classroom: string;
  isAvailable: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type EventTeacherSetupFormInput = {
  eventId: string;
  teacherId: string;
  building: string;
  floor: number;
  classroom: string;
  isAvailable: boolean;
};

export type EventTeacherSetupBulkUpsertResult = {
  created: number;
  updated: number;
  eventTeacherSetups: EventTeacherSetupOverview[];
};

export type EventTeacherSetupOverview = {
  id: string;
  teacher: Teacher;
  subject: string;
  building: string;
  floor: number;
  classroom: string;
  availability: Availability;
  locationMissing?: boolean;
};

export type TeacherAssignment = {
  id: string;
  teacher: Teacher;
  subject: string;
  subjectMissing?: boolean;
  building: string;
  floor: number;
  classroom: string;
  availability: Availability;
  locationMissing?: boolean;
};

export type EventAssignmentOverview = EventTeacherSetupOverview;

export type EventAssignmentBulkUpsertResult = EventTeacherSetupBulkUpsertResult;

export type EventAssignmentInput = EventTeacherSetupFormInput;

export type ParentMeetingView = {
  school: School;
  meetingEvent: MeetingEvent;
  student: Student;
  classTeacher: Teacher | null;
  teacherAssignments: TeacherAssignment[];
};

export type EventReadinessCode =
  | "noIncludedClasses"
  | "classMissingTeachingAssignment"
  | "teachingAssignmentMissingTeacher"
  | "teachingAssignmentMissingSubject"
  | "teachingAssignmentInactiveTeacher"
  | "includedClassInactive"
  | "eventTeacherSetupMissing"
  | "eventTeacherSetupMissingBuilding"
  | "eventTeacherSetupMissingFloor"
  | "eventTeacherSetupMissingClassroom"
  | "unavailableTeachers"
  | "classOnlyOneTeachingAssignment";

export type EventReadinessItem = {
  code: EventReadinessCode;
  detail?: string;
};

export type EventReadiness = {
  isReady: boolean;
  errors: EventReadinessItem[];
  warnings: EventReadinessItem[];
};
