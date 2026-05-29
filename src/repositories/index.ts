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

function createLazyRepository<T extends object>(
  loader: () => Promise<T>,
): T {
  let loaded: Promise<T> | null = null;

  const load = () => {
    loaded ??= loader();
    return loaded;
  };

  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === Symbol.toStringTag) {
          return "LazyRepository";
        }

        return (...args: unknown[]) =>
          load().then((repository) => {
            const method = Reflect.get(repository as object, prop, repository);

            if (typeof method !== "function") {
              throw new Error(
                `Lazy repository method ${String(prop)} is not available.`,
              );
            }

            return method.apply(repository, args);
          });
      },
    },
  ) as T;
}

function createLazyRepositories(loader: {
  meetingRepository: () => Promise<RepositorySet["meetingRepository"]>;
  classRepository: () => Promise<RepositorySet["classRepository"]>;
  teacherRepository: () => Promise<RepositorySet["teacherRepository"]>;
  teachingAssignmentRepository: () => Promise<
    RepositorySet["teachingAssignmentRepository"]
  >;
  assignmentRepository: () => Promise<RepositorySet["assignmentRepository"]>;
  schoolRepository: () => Promise<RepositorySet["schoolRepository"]>;
  schoolUserRepository: () => Promise<RepositorySet["schoolUserRepository"]>;
  studentRepository: () => Promise<RepositorySet["studentRepository"]>;
  parentMeetingRepository: () => Promise<
    RepositorySet["parentMeetingRepository"]
  >;
}): RepositorySet {
  return {
    meetingRepository: createLazyRepository(() => loader.meetingRepository()),
    classRepository: createLazyRepository(() => loader.classRepository()),
    teacherRepository: createLazyRepository(() => loader.teacherRepository()),
    teachingAssignmentRepository: createLazyRepository(() =>
      loader.teachingAssignmentRepository(),
    ),
    assignmentRepository: createLazyRepository(() => loader.assignmentRepository()),
    schoolRepository: createLazyRepository(() => loader.schoolRepository()),
    schoolUserRepository: createLazyRepository(() => loader.schoolUserRepository()),
    studentRepository: createLazyRepository(() => loader.studentRepository()),
    parentMeetingRepository: createLazyRepository(() =>
      loader.parentMeetingRepository(),
    ),
  };
}

const mockRepositories = createLazyRepositories({
  meetingRepository: () =>
    import("./mock/mockMeetingRepository").then((module) => module.mockMeetingRepository),
  classRepository: () =>
    import("./mock/mockClassRepository").then((module) => module.mockClassRepository),
  teacherRepository: () =>
    import("./mock/mockTeacherRepository").then((module) => module.mockTeacherRepository),
  teachingAssignmentRepository: () =>
    import("./mock/mockTeachingAssignmentRepository").then(
      (module) => module.mockTeachingAssignmentRepository,
    ),
  assignmentRepository: () =>
    import("./mock/mockAssignmentRepository").then((module) => module.mockAssignmentRepository),
  schoolRepository: () =>
    import("./mock/mockSchoolRepository").then((module) => module.mockSchoolRepository),
  schoolUserRepository: () =>
    import("./mock/mockSchoolUserRepository").then((module) => module.mockSchoolUserRepository),
  studentRepository: () =>
    import("./mock/mockStudentRepository").then((module) => module.mockStudentRepository),
  parentMeetingRepository: () =>
    import("./mock/mockParentMeetingRepository").then(
      (module) => module.mockParentMeetingRepository,
    ),
});

const firestoreRepositories = createLazyRepositories({
  meetingRepository: () =>
    import("./firestore/firestoreMeetingRepository").then(
      (module) => module.firestoreMeetingRepository,
    ),
  classRepository: () =>
    import("./firestore/firestoreClassRepository").then(
      (module) => module.firestoreClassRepository,
    ),
  teacherRepository: () =>
    import("./firestore/firestoreTeacherRepository").then(
      (module) => module.firestoreTeacherRepository,
    ),
  teachingAssignmentRepository: () =>
    import("./firestore/firestoreTeachingAssignmentRepository").then(
      (module) => module.firestoreTeachingAssignmentRepository,
    ),
  assignmentRepository: () =>
    import("./firestore/firestoreAssignmentRepository").then(
      (module) => module.firestoreAssignmentRepository,
    ),
  schoolRepository: () =>
    import("./firestore/firestoreSchoolRepository").then(
      (module) => module.firestoreSchoolRepository,
    ),
  schoolUserRepository: () =>
    import("./firestore/firestoreSchoolUserRepository").then(
      (module) => module.firestoreSchoolUserRepository,
    ),
  studentRepository: () =>
    import("./firestore/firestoreStudentRepository").then(
      (module) => module.firestoreStudentRepository,
    ),
  parentMeetingRepository: () =>
    import("./firestore/firestoreParentMeetingRepository").then(
      (module) => module.firestoreParentMeetingRepository,
    ),
});

export const dataSource = getDataSource();

export const repositories =
  dataSource === "firestore" ? firestoreRepositories : mockRepositories;
