import type {
  EventFormInput,
  ClassBulkUpsertResult,
  ClassFormInput,
  MeetingEvent,
  EventReadiness,
  ParentMeetingView,
  SchoolClass,
  Student,
  StudentBulkUpsertResult,
  StudentFormInput,
  Teacher,
  TeacherBulkUpsertResult,
  TeacherFormInput,
  EventTeacherSetupOverview,
  EventTeacherSetupBulkUpsertResult,
  EventTeacherSetupFormInput,
  TeachingAssignment,
  TeachingAssignmentBulkUpsertResult,
  TeachingAssignmentFormInput,
} from "../domain/models";

export type MeetingRepository = {
  findByCode: (meetingCode: string) => Promise<MeetingEvent | null>;
  listEvents: () => Promise<MeetingEvent[]>;
  getEventById: (eventId: string) => Promise<MeetingEvent | null>;
  getEventAssignments: (
    eventId: string,
  ) => Promise<EventTeacherSetupOverview[]>;
  validateEventReadiness: (eventId: string) => Promise<EventReadiness>;
  isMeetingCodeAvailable: (
    meetingCode: string,
    excludingEventId?: string,
  ) => Promise<boolean>;
  activateEvent: (eventId: string) => Promise<MeetingEvent>;
  archiveEvent: (eventId: string) => Promise<MeetingEvent>;
  markEventOld: (eventId: string) => Promise<MeetingEvent>;
  restoreEventToDraft: (eventId: string) => Promise<MeetingEvent>;
  createEvent: (input: EventFormInput) => Promise<MeetingEvent>;
  updateEvent: (eventId: string, input: EventFormInput) => Promise<MeetingEvent>;
  duplicateEvent: (
    eventId: string,
    inputOverrides: EventFormInput,
  ) => Promise<MeetingEvent>;
};

export type TeachingAssignmentRepository = {
  listTeachingAssignmentsForClass: (classId: string) => Promise<TeachingAssignment[]>;
  listTeachingAssignmentsForTeacher: (teacherId: string) => Promise<TeachingAssignment[]>;
  getTeachingAssignmentById: (teachingAssignmentId: string) => Promise<TeachingAssignment | null>;
  createTeachingAssignment: (
    input: TeachingAssignmentFormInput,
  ) => Promise<TeachingAssignment>;
  updateTeachingAssignment: (
    teachingAssignmentId: string,
    input: TeachingAssignmentFormInput,
  ) => Promise<TeachingAssignment>;
  deleteTeachingAssignment: (teachingAssignmentId: string) => Promise<void>;
  bulkUpsertTeachingAssignments: (
    inputs: TeachingAssignmentFormInput[],
  ) => Promise<TeachingAssignmentBulkUpsertResult>;
};

export type EventTeacherSetupRepository = {
  listEventAssignments: (eventId: string) => Promise<EventTeacherSetupOverview[]>;
  createEventAssignment: (
    input: EventTeacherSetupFormInput,
  ) => Promise<EventTeacherSetupOverview>;
  updateEventAssignment: (
    assignmentId: string,
    input: EventTeacherSetupFormInput,
  ) => Promise<EventTeacherSetupOverview>;
  deleteEventAssignment: (assignmentId: string) => Promise<void>;
  bulkUpsertEventAssignments: (
    inputs: EventTeacherSetupFormInput[],
  ) => Promise<EventTeacherSetupBulkUpsertResult>;
};

export type ClassRepository = {
  listClasses: () => Promise<SchoolClass[]>;
  getClassById: (classId: string) => Promise<SchoolClass | null>;
  createClass: (input: ClassFormInput) => Promise<SchoolClass>;
  updateClass: (
    classId: string,
    input: ClassFormInput,
  ) => Promise<SchoolClass>;
  bulkUpsertClasses: (
    inputs: ClassFormInput[],
  ) => Promise<ClassBulkUpsertResult>;
};

export type TeacherRepository = {
  listTeachers: () => Promise<Teacher[]>;
  getTeacherById: (teacherId: string) => Promise<Teacher | null>;
  createTeacher: (input: TeacherFormInput) => Promise<Teacher>;
  updateTeacher: (
    teacherId: string,
    input: TeacherFormInput,
  ) => Promise<Teacher>;
  bulkUpsertTeachers: (
    inputs: TeacherFormInput[],
  ) => Promise<TeacherBulkUpsertResult>;
};

export type AssignmentRepository = {
} & EventTeacherSetupRepository;

export type StudentRepository = {
  listStudents: () => Promise<Student[]>;
  getStudentById: (studentId: string) => Promise<Student | null>;
  createStudent: (input: StudentFormInput) => Promise<Student>;
  updateStudent: (
    studentId: string,
    input: StudentFormInput,
  ) => Promise<Student>;
  bulkUpsertStudents: (
    inputs: StudentFormInput[],
  ) => Promise<StudentBulkUpsertResult>;
  findBySchoolNumber: (params: {
    meetingCode: string;
    schoolNumber: string;
  }) => Promise<Student | null>;
};

export type ParentMeetingRepository = {
  getParentMeetingView: (params: {
    meetingCode: string;
    schoolNumber: string;
  }) => Promise<ParentMeetingView | null>;
};
