export type Availability = "available" | "busy" | "limited";

export type School = {
  id: string;
  name: string;
  logoInitials: string;
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

export type EventFormInput = {
  meetingCode?: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  includedClasses: string[];
};

export type EventAssignmentInput = {
  eventId: string;
  classId: string;
  teacherId: string;
  subject: string;
  building: string;
  floor: number;
  classroom: string;
  availability: Availability;
};

export type TeacherAssignment = {
  id: string;
  teacher: Teacher;
  subject: string;
  building: string;
  floor: number;
  classroom: string;
  availability: Availability;
};

export type EventAssignmentOverview = {
  id: string;
  classId: string;
  className: string;
  teacher: Teacher;
  subject: string;
  building: string;
  floor: number;
  classroom: string;
  availability: Availability;
};

export type EventAssignmentBulkUpsertResult = {
  created: number;
  updated: number;
  assignments: EventAssignmentOverview[];
};

export type ParentMeetingView = {
  school: School;
  meetingEvent: MeetingEvent;
  student: Student;
  classTeacher: Teacher | null;
  teacherAssignments: TeacherAssignment[];
};

export type EventReadinessCode =
  | "noIncludedClasses"
  | "classMissingAssignment"
  | "assignmentMissingTeacher"
  | "assignmentMissingSubject"
  | "assignmentMissingBuilding"
  | "assignmentMissingFloor"
  | "assignmentMissingClassroom"
  | "assignmentInactiveTeacher"
  | "includedClassInactive"
  | "unavailableTeachers"
  | "classOnlyOneAssignment"
  | "eventNoClassTeacher";

export type EventReadinessItem = {
  code: EventReadinessCode;
  detail?: string;
};

export type EventReadiness = {
  isReady: boolean;
  errors: EventReadinessItem[];
  warnings: EventReadinessItem[];
};
