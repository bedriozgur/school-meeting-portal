import { mockMeetingRepository } from "./mock/mockMeetingRepository";
import { mockAssignmentRepository } from "./mock/mockAssignmentRepository";
import { mockTeachingAssignmentRepository } from "./mock/mockTeachingAssignmentRepository";
import { mockClassRepository } from "./mock/mockClassRepository";
import { mockParentMeetingRepository } from "./mock/mockParentMeetingRepository";
import { mockSchoolRepository } from "./mock/mockSchoolRepository";
import { mockSchoolUserRepository } from "./mock/mockSchoolUserRepository";
import { mockStudentRepository } from "./mock/mockStudentRepository";
import { mockTeacherRepository } from "./mock/mockTeacherRepository";
import { firestoreAssignmentRepository } from "./firestore/firestoreAssignmentRepository";
import { firestoreTeachingAssignmentRepository } from "./firestore/firestoreTeachingAssignmentRepository";
import { firestoreMeetingRepository } from "./firestore/firestoreMeetingRepository";
import { firestoreClassRepository } from "./firestore/firestoreClassRepository";
import { firestoreParentMeetingRepository } from "./firestore/firestoreParentMeetingRepository";
import { firestoreSchoolRepository } from "./firestore/firestoreSchoolRepository";
import { firestoreSchoolUserRepository } from "./firestore/firestoreSchoolUserRepository";
import { firestoreStudentRepository } from "./firestore/firestoreStudentRepository";
import { firestoreTeacherRepository } from "./firestore/firestoreTeacherRepository";
import type {
  AssignmentRepository,
  ClassRepository,
  MeetingRepository,
  ParentMeetingRepository,
  SchoolRepository,
  SchoolUserRepository,
  StudentRepository,
  TeacherRepository,
  TeachingAssignmentRepository,
} from "./interfaces";

type DataSource = "mock" | "firestore";

type RepositorySet = {
  meetingRepository: MeetingRepository;
  classRepository: ClassRepository;
  teacherRepository: TeacherRepository;
  teachingAssignmentRepository: TeachingAssignmentRepository;
  assignmentRepository: AssignmentRepository;
  schoolRepository: SchoolRepository;
  schoolUserRepository: SchoolUserRepository;
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
  teachingAssignmentRepository: mockTeachingAssignmentRepository,
  assignmentRepository: mockAssignmentRepository,
  schoolRepository: mockSchoolRepository,
  schoolUserRepository: mockSchoolUserRepository,
  studentRepository: mockStudentRepository,
  parentMeetingRepository: mockParentMeetingRepository,
};

const firestoreRepositories: RepositorySet = {
  meetingRepository: firestoreMeetingRepository,
  classRepository: firestoreClassRepository,
  teacherRepository: firestoreTeacherRepository,
  teachingAssignmentRepository: firestoreTeachingAssignmentRepository,
  assignmentRepository: firestoreAssignmentRepository,
  schoolRepository: firestoreSchoolRepository,
  schoolUserRepository: firestoreSchoolUserRepository,
  studentRepository: firestoreStudentRepository,
  parentMeetingRepository: firestoreParentMeetingRepository,
};

export const dataSource = getDataSource();

export const repositories =
  dataSource === "firestore" ? firestoreRepositories : mockRepositories;
