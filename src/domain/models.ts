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
  status: "active" | "draft";
  includedClasses: string[];
  title: string;
  date: string;
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
};

export type Teacher = {
  id: string;
  name: string;
  subject: string;
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

export type ParentMeetingView = {
  school: School;
  meetingEvent: MeetingEvent;
  student: Student;
  classTeacher: Teacher | null;
  teacherAssignments: TeacherAssignment[];
};
