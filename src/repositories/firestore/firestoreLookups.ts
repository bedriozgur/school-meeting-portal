import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
  type Firestore,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { getFirebaseFirestore } from "../../lib/firebase";
import type {
  MeetingEvent,
  School,
  Student,
  Teacher,
  TeachingAssignment,
} from "../../domain/models";
import { FirestoreRepositoryError } from "./firestoreErrors";
import {
  mapMeetingEvent,
  mapSchool,
  mapStudent,
  mapTeacher,
  mapTeachingAssignment,
} from "./firestoreMappers";
import type {
  FirestoreClassDocument,
  FirestoreEventDocument,
  FirestoreSchoolDocument,
  FirestoreStudentDocument,
  FirestoreTeachingAssignmentDocument,
  FirestoreTeacherDocument,
} from "./firestoreTypes";

export function requireFirestore(): Firestore {
  const db = getFirebaseFirestore();

  if (!db) {
    throw new FirestoreRepositoryError(
      "missing-config",
      "Firebase configuration is missing.",
    );
  }

  return db;
}

export async function findActiveOrDraftEventByCode(
  db: Firestore,
  meetingCode: string,
): Promise<MeetingEvent | null> {
  const normalizedCode = meetingCode.trim().toUpperCase();
  const eventQuery = query(
    collection(db, "events"),
    where("meetingCode", "==", normalizedCode),
    where("status", "in", ["active", "draft"]),
    limit(1),
  );
  const snapshot = await getDocs(eventQuery);
  const eventDocument = snapshot.docs[0] as
    | QueryDocumentSnapshot<FirestoreEventDocument>
    | undefined;

  if (!eventDocument) {
    return null;
  }

  return mapMeetingEvent(eventDocument.id, eventDocument.data());
}

export async function getSchoolById(
  db: Firestore,
  schoolId: string,
): Promise<School> {
  const schoolSnapshot = await getDoc(doc(db, "schools", schoolId));

  if (!schoolSnapshot.exists()) {
    throw new FirestoreRepositoryError(
      "missing-school",
      `School document ${schoolId} was not found.`,
    );
  }

  return mapSchool(
    schoolSnapshot.id,
    schoolSnapshot.data() as FirestoreSchoolDocument,
  );
}

export async function getClassById(
  db: Firestore,
  classId: string,
): Promise<FirestoreClassDocument> {
  const classSnapshot = await getDoc(doc(db, "classes", classId));

  if (!classSnapshot.exists()) {
    throw new FirestoreRepositoryError(
      "missing-class",
      `Class document ${classId} was not found.`,
    );
  }

  return classSnapshot.data() as FirestoreClassDocument;
}

export async function getTeacherById(
  db: Firestore,
  teacherId: string,
): Promise<Teacher> {
  const teacherSnapshot = await getDoc(doc(db, "teachers", teacherId));

  if (!teacherSnapshot.exists()) {
    throw new FirestoreRepositoryError(
      "missing-teacher",
      `Teacher document ${teacherId} was not found.`,
    );
  }

  return mapTeacher(
    teacherSnapshot.id,
    teacherSnapshot.data() as FirestoreTeacherDocument,
  );
}

export async function getTeacherByIdOrNull(
  db: Firestore,
  teacherId: string,
): Promise<Teacher | null> {
  const teacherSnapshot = await getDoc(doc(db, "teachers", teacherId));

  if (!teacherSnapshot.exists()) {
    return null;
  }

  return mapTeacher(
    teacherSnapshot.id,
    teacherSnapshot.data() as FirestoreTeacherDocument,
  );
}

export async function getTeachingAssignmentsForClass(
  db: Firestore,
  classId: string,
): Promise<TeachingAssignment[]> {
  const snapshot = await getDocs(
    query(
      collection(db, "teachingAssignments"),
      where("classId", "==", classId),
      limit(100),
    ),
  );

  return Promise.all(
    snapshot.docs.map(async (assignmentDocument) => {
      const assignmentData =
        assignmentDocument.data() as FirestoreTeachingAssignmentDocument;
      const teacher = assignmentData.teacherId
        ? await getTeacherByIdOrNull(db, assignmentData.teacherId)
        : null;

      return mapTeachingAssignment({
        id: assignmentDocument.id,
        assignmentData,
        classId: assignmentDocument.data().classId ?? "",
        teacherId: assignmentDocument.data().teacherId ?? "",
        teacher,
      });
    }),
  );
}

export async function getTeachingAssignmentsForTeacher(
  db: Firestore,
  teacherId: string,
): Promise<TeachingAssignment[]> {
  const snapshot = await getDocs(
    query(
      collection(db, "teachingAssignments"),
      where("teacherId", "==", teacherId),
      limit(100),
    ),
  );

  return Promise.all(
    snapshot.docs.map(async (assignmentDocument) => {
      const assignmentData =
        assignmentDocument.data() as FirestoreTeachingAssignmentDocument;
      const teacher = assignmentData.teacherId
        ? await getTeacherByIdOrNull(db, assignmentData.teacherId)
        : null;

      return mapTeachingAssignment({
        id: assignmentDocument.id,
        assignmentData,
        classId: assignmentDocument.data().classId ?? "",
        teacherId: assignmentDocument.data().teacherId ?? "",
        teacher,
      });
    }),
  );
}

export async function findStudentForEvent(params: {
  db: Firestore;
  meetingCode: string;
  schoolNumber: string;
}): Promise<Student | null> {
  const { db, meetingCode, schoolNumber } = params;
  const event = await findActiveOrDraftEventByCode(db, meetingCode);

  if (!event) {
    return null;
  }

  const studentQuery = query(
    collection(db, "students"),
    where("schoolNumber", "==", schoolNumber.trim()),
    where("schoolId", "==", event.schoolId),
    limit(1),
  );
  const snapshot = await getDocs(studentQuery);
  const studentDocument = snapshot.docs[0] as
    | QueryDocumentSnapshot<FirestoreStudentDocument>
    | undefined;

  if (!studentDocument) {
    return null;
  }

  const studentData = studentDocument.data();
  const classId = studentData.classId ?? "";

  if (!classId || !event.includedClasses.includes(classId)) {
    return null;
  }

  const classData = await getClassById(db, classId);

  return mapStudent({
    id: studentDocument.id,
    studentData,
    classData,
  });
}
