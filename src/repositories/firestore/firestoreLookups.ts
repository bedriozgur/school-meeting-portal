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
import { DEFAULT_SCHOOL_ID } from "../../config/school";
import { buildMeetingCodeLookupCandidates } from "../meetingCodes";
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
  const candidateCodes = buildMeetingCodeLookupCandidates(meetingCode);

  return runFirestoreParentLookupStep("event lookup", { meetingCode: normalizedCode, candidateCodes }, async () => {
    logFirestoreParentLookup("event query start", {
      meetingCode: normalizedCode,
      candidateCodes,
      constraints: {
        status: ["active", "draft"],
        limit: 1,
      },
    });

    for (const candidateCode of candidateCodes) {
      try {
        const eventQuery = query(
          collection(db, "events"),
          where("schoolId", "==", DEFAULT_SCHOOL_ID),
          where("meetingCode", "==", candidateCode),
          where("status", "in", ["active", "draft"]),
          limit(1),
        );
        const snapshot = await getDocs(eventQuery);
        logFirestoreParentLookup("event query resolved", {
          meetingCode: normalizedCode,
          candidateCode,
          docsCount: snapshot.docs.length,
        });

        const eventDocument = snapshot.docs[0] as
          | QueryDocumentSnapshot<FirestoreEventDocument>
          | undefined;

        if (!eventDocument) {
          continue;
        }

        logFirestoreParentLookup("event resolved", {
          meetingCode: normalizedCode,
          candidateCode,
          eventId: eventDocument.id,
          schoolId: String(eventDocument.data().schoolId ?? "").trim(),
          status: String(eventDocument.data().status ?? ""),
          includedClasses: eventDocument.data().includedClasses ?? [],
        });

        return mapMeetingEvent(eventDocument.id, eventDocument.data());
      } catch (error) {
        logFirestoreParentLookupError("event lookup", error, {
          meetingCode: normalizedCode,
          candidateCode,
        });
        throw error;
      }
    }

    logFirestoreParentLookup("event lookup rejected", {
      meetingCode: normalizedCode,
      candidateCodes,
      reason: "inactive-or-missing-event",
    });
    return null;
  });
}

export async function getSchoolById(
  db: Firestore,
  schoolId: string,
): Promise<School> {
  return runFirestoreParentLookupStep("school lookup", { schoolId }, async () => {
    try {
      logFirestoreParentLookup("school lookup started", { schoolId });
      const schoolSnapshot = await getDoc(doc(db, "schools", schoolId));

      if (!schoolSnapshot.exists()) {
        const error = new FirestoreRepositoryError(
          "missing-school",
          `School document ${schoolId} was not found.`,
        );
        logFirestoreParentLookupError("school lookup", error, { schoolId });
        throw error;
      }

      logFirestoreParentLookup("school lookup resolved", { schoolId, schoolDocumentId: schoolSnapshot.id });
      return mapSchool(
        schoolSnapshot.id,
        schoolSnapshot.data() as FirestoreSchoolDocument,
      );
    } catch (error) {
      if (!(error instanceof FirestoreRepositoryError && error.code === "missing-school")) {
        logFirestoreParentLookupError("school lookup", error, { schoolId });
      }
      throw error;
    }
  });
}

export async function getClassById(
  db: Firestore,
  classId: string,
): Promise<FirestoreClassDocument> {
  return runFirestoreParentLookupStep("class lookup", { classId }, async () => {
    try {
      logFirestoreParentLookup("class lookup started", { classId });
      const classSnapshot = await getDoc(doc(db, "classes", classId));

      if (!classSnapshot.exists()) {
        const error = new FirestoreRepositoryError(
          "missing-class",
          `Class document ${classId} was not found.`,
        );
        logFirestoreParentLookupError("class lookup", error, { classId });
        throw error;
      }

      logFirestoreParentLookup("class lookup resolved", { classId, classDocumentId: classSnapshot.id });
      return classSnapshot.data() as FirestoreClassDocument;
    } catch (error) {
      if (!(error instanceof FirestoreRepositoryError && error.code === "missing-class")) {
        logFirestoreParentLookupError("class lookup", error, { classId });
      }
      throw error;
    }
  });
}

export async function getTeacherById(
  db: Firestore,
  teacherId: string,
): Promise<Teacher> {
  return runFirestoreParentLookupStep("teacher lookup", { teacherId }, async () => {
    try {
      logFirestoreParentLookup("teacher lookup started", { teacherId });
      const teacherSnapshot = await getDoc(doc(db, "teachers", teacherId));

      if (!teacherSnapshot.exists()) {
        const error = new FirestoreRepositoryError(
          "missing-teacher",
          `Teacher document ${teacherId} was not found.`,
        );
        logFirestoreParentLookupError("teacher lookup", error, { teacherId });
        throw error;
      }

      logFirestoreParentLookup("teacher lookup resolved", { teacherId, teacherDocumentId: teacherSnapshot.id });
      return mapTeacher(
        teacherSnapshot.id,
        teacherSnapshot.data() as FirestoreTeacherDocument,
      );
    } catch (error) {
      if (!(error instanceof FirestoreRepositoryError && error.code === "missing-teacher")) {
        logFirestoreParentLookupError("teacher lookup", error, { teacherId });
      }
      throw error;
    }
  });
}

export async function getTeacherByIdOrNull(
  db: Firestore,
  teacherId: string,
): Promise<Teacher | null> {
  return runFirestoreParentLookupStep("teacher lookup optional", { teacherId }, async () => {
    try {
      logFirestoreParentLookup("teacher lookup started", { teacherId });
      const teacherSnapshot = await getDoc(doc(db, "teachers", teacherId));

      if (!teacherSnapshot.exists()) {
        logFirestoreParentLookup("teacher lookup resolved", { teacherId, found: false });
        return null;
      }

      logFirestoreParentLookup("teacher lookup resolved", { teacherId, found: true, teacherDocumentId: teacherSnapshot.id });
      return mapTeacher(
        teacherSnapshot.id,
        teacherSnapshot.data() as FirestoreTeacherDocument,
      );
    } catch (error) {
      logFirestoreParentLookupError("teacher lookup optional", error, { teacherId });
      throw error;
    }
  });
}

export async function getTeachingAssignmentsForClass(
  db: Firestore,
  classId: string,
  teacherLookup: (teacherId: string) => Promise<Teacher | null> = (teacherId) =>
    getTeacherByIdOrNull(db, teacherId),
  schoolId = DEFAULT_SCHOOL_ID,
): Promise<TeachingAssignment[]> {
  return runFirestoreParentLookupStep("teachingAssignments lookup", { classId }, async () => {
    try {
      logFirestoreParentLookup("teachingAssignments query started", {
        classId,
        schoolId: String(schoolId ?? "").trim(),
        queryField: "classId",
        queryValueType: "string",
        limit: 100,
      });
      const snapshot = await getDocs(
        query(
          collection(db, "teachingAssignments"),
          where("schoolId", "==", schoolId),
          where("classId", "==", classId),
          limit(100),
        ),
      );
      logFirestoreParentLookup("teachingAssignments query resolved", {
        classId,
        schoolId: String(schoolId ?? "").trim(),
        docsCount: snapshot.docs.length,
      });

      const assignments = await Promise.all(
        snapshot.docs.map(async (assignmentDocument) => {
          const assignmentData =
            assignmentDocument.data() as FirestoreTeachingAssignmentDocument;
          const teacher = assignmentData.teacherId
            ? await teacherLookup(assignmentData.teacherId)
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

      return assignments;
    } catch (error) {
      logFirestoreParentLookupError("teachingAssignments lookup", error, { classId });
      throw error;
    }
  });
}

export async function getTeachingAssignmentsForTeacher(
  db: Firestore,
  teacherId: string,
  teacherLookup: (teacherId: string) => Promise<Teacher | null> = (id) =>
    getTeacherByIdOrNull(db, id),
): Promise<TeachingAssignment[]> {
  return runFirestoreParentLookupStep("teachingAssignments lookup", { teacherId }, async () => {
    try {
      logFirestoreParentLookup("teachingAssignments query started", {
        teacherId,
        queryField: "teacherId",
        queryValueType: "string",
        limit: 100,
      });
      const snapshot = await getDocs(
        query(
          collection(db, "teachingAssignments"),
          where("teacherId", "==", teacherId),
          limit(100),
        ),
      );
      logFirestoreParentLookup("teachingAssignments query resolved", {
        teacherId,
        docsCount: snapshot.docs.length,
      });

      const assignments = await Promise.all(
        snapshot.docs.map(async (assignmentDocument) => {
          const assignmentData =
            assignmentDocument.data() as FirestoreTeachingAssignmentDocument;
          const teacher = assignmentData.teacherId
            ? await teacherLookup(assignmentData.teacherId)
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

      return assignments;
    } catch (error) {
      logFirestoreParentLookupError("teachingAssignments lookup", error, { teacherId });
      throw error;
    }
  });
}

export async function findStudentForEvent(params: {
  db: Firestore;
  meetingCode: string;
  schoolNumber: string;
  event?: MeetingEvent | null;
}): Promise<Student | null> {
  const { db, meetingCode, schoolNumber, event: resolvedEvent } = params;
  const startedAt = performance.now();
  const event = resolvedEvent ?? (await findActiveOrDraftEventByCode(db, meetingCode));

  if (!event) {
    return null;
  }

  if (resolvedEvent) {
    logFirestoreParentLookup("event reused for student lookup", {
      eventId: event.id,
      schoolId: String(event.schoolId ?? "").trim(),
      includedClasses: event.includedClasses,
    });
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
  const studentLookupDurationMs = Math.round(performance.now() - startedAt);

  if (!studentDocument) {
    logFirestoreParentLookup("student lookup rejected", {
      eventId: event.id,
      schoolId: String(event.schoolId ?? "").trim(),
      studentSchoolNumber: trimmedSchoolNumber,
      studentNormalizedSchoolNumber: normalizedSchoolNumber,
      reason: "student-not-found",
      studentLookupDurationMs,
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
    studentLookupDurationMs,
  });

  if (studentSchoolId !== String(event.schoolId ?? "").trim()) {
    logFirestoreParentLookup("student lookup rejected", {
      eventId: event.id,
      studentId: studentDocument.id,
      studentSchoolId,
      eventSchoolId: String(event.schoolId ?? "").trim(),
      reason: "school-id-mismatch",
      studentLookupDurationMs,
    });
    return null;
  }

  if (!isActive) {
    logFirestoreParentLookup("student lookup rejected", {
      eventId: event.id,
      studentId: studentDocument.id,
      reason: "inactive-student",
      studentLookupDurationMs,
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
      studentLookupDurationMs,
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

function logFirestoreParentLookupError(
  step: string,
  error: unknown,
  details: Record<string, unknown>,
) {
  if (!isDevelopmentEnvironment()) {
    return;
  }

  console.error(`[Firestore parent lookup] ${step} failed`, {
    step,
    errorMessage: getErrorMessage(error),
    errorCode: getFirebaseErrorCode(error),
    details: stringifySafe(details),
    error: stringifySafe(error),
  });
}

async function runFirestoreParentLookupStep<T>(
  step: string,
  details: Record<string, unknown>,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    logFirestoreParentLookupError(step, error, details);
    throw error;
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function getFirebaseErrorCode(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    return (error as { code: string }).code;
  }

  return undefined;
}

function stringifySafe(value: unknown) {
  try {
    return JSON.parse(
      JSON.stringify(value, (_key, nestedValue) => {
        if (nestedValue instanceof Error) {
          return {
            name: nestedValue.name,
            message: nestedValue.message,
            code: getFirebaseErrorCode(nestedValue),
          };
        }

        if (typeof nestedValue === "bigint") {
          return nestedValue.toString();
        }

        if (typeof nestedValue === "function") {
          return "[Function]";
        }

        return nestedValue;
      }),
    ) as unknown;
  } catch {
    return {
      serializationFailed: true,
      value: String(value),
    };
  }
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
