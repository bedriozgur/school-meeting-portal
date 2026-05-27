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
  logFirestoreParentLookup("event lookup query", {
    meetingCode: normalizedCode,
    status: ["active", "draft"],
    limit: 1,
  });
  const eventQuery = query(
    collection(db, "events"),
    where("meetingCode", "==", normalizedCode),
    where("status", "in", ["active", "draft"]),
    limit(1),
  );
  const snapshot = await getDocs(eventQuery);
  logFirestoreParentLookup("event lookup result", {
    meetingCode: normalizedCode,
    docsCount: snapshot.docs.length,
  });
  const eventDocument = snapshot.docs[0] as
    | QueryDocumentSnapshot<FirestoreEventDocument>
    | undefined;

  if (!eventDocument) {
    logFirestoreParentLookup("event lookup rejected", {
      meetingCode: normalizedCode,
      reason: "inactive-or-missing-event",
    });
    return null;
  }

  logFirestoreParentLookup("event lookup resolved", {
    meetingCode: normalizedCode,
    eventId: eventDocument.id,
    schoolId: String(eventDocument.data().schoolId ?? "").trim(),
    status: String(eventDocument.data().status ?? ""),
    includedClasses: eventDocument.data().includedClasses ?? [],
  });

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

  const trimmedSchoolNumber = String(schoolNumber ?? "").trim();
  const normalizedSchoolNumber = normalizeSchoolNumber(trimmedSchoolNumber);
  logFirestoreParentLookup("student lookup start", {
    eventId: event.id,
    eventSchoolId: String(event.schoolId ?? "").trim(),
    studentSchoolNumber: trimmedSchoolNumber,
    studentNormalizedSchoolNumber: normalizedSchoolNumber,
    includedClasses: event.includedClasses,
  });

  const studentDocument =
    (await findStudentDocumentBySchoolNumber(db, event.schoolId, trimmedSchoolNumber)) ??
    (await findStudentDocumentByNormalizedSchoolNumber(db, event.schoolId, normalizedSchoolNumber)) ??
    (await findStudentDocumentByNumericSchoolNumber(db, event.schoolId, trimmedSchoolNumber));

  if (!studentDocument) {
    logFirestoreParentLookup("student lookup rejected", {
      eventId: event.id,
      schoolId: String(event.schoolId ?? "").trim(),
      studentSchoolNumber: trimmedSchoolNumber,
      studentNormalizedSchoolNumber: normalizedSchoolNumber,
      reason: "student-not-found",
    });
    return null;
  }

  const studentData = studentDocument.data();
  const studentSchoolId = String(studentData.schoolId ?? "").trim();
  const classId = String(studentData.classId ?? "").trim();
  const isActive = studentData.isActive ?? true;

  logFirestoreParentLookup("student lookup resolved", {
    studentId: studentDocument.id,
    studentSchoolId,
    studentClassId: classId,
    isActive,
  });

  if (studentSchoolId !== String(event.schoolId ?? "").trim()) {
    logFirestoreParentLookup("student lookup rejected", {
      eventId: event.id,
      studentId: studentDocument.id,
      studentSchoolId,
      eventSchoolId: String(event.schoolId ?? "").trim(),
      reason: "school-id-mismatch",
    });
    return null;
  }

  if (!isActive) {
    logFirestoreParentLookup("student lookup rejected", {
      eventId: event.id,
      studentId: studentDocument.id,
      reason: "inactive-student",
    });
    return null;
  }

  if (!classId || !event.includedClasses.map((classItem) => String(classItem).trim()).includes(classId)) {
    logFirestoreParentLookup("student lookup rejected", {
      eventId: event.id,
      studentId: studentDocument.id,
      studentClassId: classId,
      includedClasses: event.includedClasses,
      reason: "class-not-in-event",
    });
    return null;
  }

  const classData = await getClassById(db, classId);

  return mapStudent({
    id: studentDocument.id,
    studentData,
    classData,
  });
}

function normalizeSchoolNumber(schoolNumber: string) {
  return schoolNumber.trim();
}

function logFirestoreParentLookup(
  message: string,
  details: Record<string, unknown>,
) {
  if (!isDevelopmentEnvironment()) {
    return;
  }

  console.info(`[Firestore parent lookup] ${message}`, details);
}

function isDevelopmentEnvironment() {
  return typeof import.meta !== "undefined" && import.meta.env?.DEV === true;
}

async function findStudentDocumentBySchoolNumber(
  db: Firestore,
  schoolId: string,
  schoolNumber: string,
) {
  const trimmedSchoolNumber = String(schoolNumber ?? "").trim();
  if (!trimmedSchoolNumber) {
    return undefined;
  }

  logFirestoreParentLookup("student exact query", {
    schoolId: String(schoolId ?? "").trim(),
    schoolNumber: trimmedSchoolNumber,
    queryField: "schoolNumber",
    queryValueType: "string",
    limit: 1,
  });

  const snapshot = await getDocs(
    query(
      collection(db, "students"),
      where("schoolId", "==", schoolId),
      where("schoolNumber", "==", trimmedSchoolNumber),
      limit(1),
    ),
  );

  logFirestoreParentLookup("student exact query result", {
    schoolId: String(schoolId ?? "").trim(),
    schoolNumber: trimmedSchoolNumber,
    docsCount: snapshot.docs.length,
  });

  return snapshot.docs[0] as
    | QueryDocumentSnapshot<FirestoreStudentDocument>
    | undefined;
}

async function findStudentDocumentByNormalizedSchoolNumber(
  db: Firestore,
  schoolId: string,
  normalizedSchoolNumber: string,
) {
  if (!normalizedSchoolNumber) {
    return undefined;
  }

  logFirestoreParentLookup("student normalized query", {
    schoolId: String(schoolId ?? "").trim(),
    normalizedSchoolNumber,
    queryField: "normalizedSchoolNumber",
    queryValueType: "string",
    limit: 1,
  });

  const snapshot = await getDocs(
    query(
      collection(db, "students"),
      where("schoolId", "==", schoolId),
      where("normalizedSchoolNumber", "==", normalizedSchoolNumber),
      limit(1),
    ),
  );

  logFirestoreParentLookup("student normalized query result", {
    schoolId: String(schoolId ?? "").trim(),
    normalizedSchoolNumber,
    docsCount: snapshot.docs.length,
  });

  return snapshot.docs[0] as
    | QueryDocumentSnapshot<FirestoreStudentDocument>
    | undefined;
}

async function findStudentDocumentByNumericSchoolNumber(
  db: Firestore,
  schoolId: string,
  schoolNumber: string,
) {
  const parsedSchoolNumber = Number(schoolNumber.trim());
  if (!Number.isInteger(parsedSchoolNumber)) {
    return undefined;
  }

  logFirestoreParentLookup("student numeric query", {
    schoolId: String(schoolId ?? "").trim(),
    schoolNumber: parsedSchoolNumber,
    queryField: "schoolNumber",
    queryValueType: "number",
    limit: 1,
  });

  const snapshot = await getDocs(
    query(
      collection(db, "students"),
      where("schoolId", "==", schoolId),
      where("schoolNumber", "==", parsedSchoolNumber),
      limit(1),
    ),
  );

  logFirestoreParentLookup("student numeric query result", {
    schoolId: String(schoolId ?? "").trim(),
    schoolNumber: parsedSchoolNumber,
    docsCount: snapshot.docs.length,
  });

  return snapshot.docs[0] as
    | QueryDocumentSnapshot<FirestoreStudentDocument>
    | undefined;
}
