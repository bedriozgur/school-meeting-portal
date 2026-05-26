import { mockMeetingRepository } from "./mock/mockMeetingRepository";
import { mockAssignmentRepository } from "./mock/mockAssignmentRepository";
import { mockClassRepository } from "./mock/mockClassRepository";
import { mockParentMeetingRepository } from "./mock/mockParentMeetingRepository";
import { mockStudentRepository } from "./mock/mockStudentRepository";
import { mockTeacherRepository } from "./mock/mockTeacherRepository";
import { firestoreAssignmentRepository } from "./firestore/firestoreAssignmentRepository";
import { firestoreMeetingRepository } from "./firestore/firestoreMeetingRepository";
import { firestoreClassRepository } from "./firestore/firestoreClassRepository";
import { firestoreParentMeetingRepository } from "./firestore/firestoreParentMeetingRepository";
import { firestoreStudentRepository } from "./firestore/firestoreStudentRepository";
import { firestoreTeacherRepository } from "./firestore/firestoreTeacherRepository";
import type {
  AssignmentRepository,
  ClassRepository,
  MeetingRepository,
  ParentMeetingRepository,
  StudentRepository,
  TeacherRepository,
} from "./interfaces";

type DataSource = "mock" | "firestore";

type RepositorySet = {
  meetingRepository: MeetingRepository;
  classRepository: ClassRepository;
  teacherRepository: TeacherRepository;
  assignmentRepository: AssignmentRepository;
  studentRepository: StudentRepository;
  parentMeetingRepository: ParentMeetingRepository;
};

function getDataSource(): DataSource {
  return import.meta.env.VITE_DATA_SOURCE === "firestore"
    ? "firestore"
    : "mock";
}

const mockRepositories: RepositorySet = {
  meetingRepository: mockMeetingRepository,
  classRepository: mockClassRepository,
  teacherRepository: mockTeacherRepository,
  assignmentRepository: mockAssignmentRepository,
  studentRepository: mockStudentRepository,
  parentMeetingRepository: mockParentMeetingRepository,
};

const firestoreRepositories: RepositorySet = {
  meetingRepository: firestoreMeetingRepository,
  classRepository: firestoreClassRepository,
  teacherRepository: firestoreTeacherRepository,
  assignmentRepository: firestoreAssignmentRepository,
  studentRepository: firestoreStudentRepository,
  parentMeetingRepository: firestoreParentMeetingRepository,
};

export const dataSource = getDataSource();

export const repositories =
  dataSource === "firestore" ? firestoreRepositories : mockRepositories;
