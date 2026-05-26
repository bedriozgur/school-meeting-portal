import { mockMeetingRepository } from "./mock/mockMeetingRepository";
import { mockParentMeetingRepository } from "./mock/mockParentMeetingRepository";
import { mockStudentRepository } from "./mock/mockStudentRepository";
import { firestoreMeetingRepository } from "./firestore/firestoreMeetingRepository";
import { firestoreParentMeetingRepository } from "./firestore/firestoreParentMeetingRepository";
import { firestoreStudentRepository } from "./firestore/firestoreStudentRepository";
import type {
  MeetingRepository,
  ParentMeetingRepository,
  StudentRepository,
} from "./interfaces";

type DataSource = "mock" | "firestore";

type RepositorySet = {
  meetingRepository: MeetingRepository;
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
  studentRepository: mockStudentRepository,
  parentMeetingRepository: mockParentMeetingRepository,
};

const firestoreRepositories: RepositorySet = {
  meetingRepository: firestoreMeetingRepository,
  studentRepository: firestoreStudentRepository,
  parentMeetingRepository: firestoreParentMeetingRepository,
};

export const dataSource = getDataSource();

export const repositories =
  dataSource === "firestore" ? firestoreRepositories : mockRepositories;
