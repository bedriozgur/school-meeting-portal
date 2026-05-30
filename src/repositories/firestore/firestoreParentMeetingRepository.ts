import { collection, getDocs, limit, query, where } from "firebase/firestore";
import type { ParentMeetingRepository } from "../interfaces";
import type { TeacherAssignment } from "../../domain/models";
import { sortTeacherAssignments } from "../../utils/teachers";
import {
  findActiveOrDraftEventByCode,
  findStudentForEvent,
  getClassById,
  getSchoolById,
  getTeacherByIdOrNull,
  getTeachingAssignmentsForClass,
  requireFirestore,
} from "./firestoreLookups";
import type { FirestoreEventTeacherSetupDocument } from "./firestoreTypes";
import type { FirestoreClassDocument } from "./firestoreTypes";
import type { School, Teacher } from "../../domain/models";

export const firestoreParentMeetingRepository: ParentMeetingRepository = {
  async getParentMeetingView({ meetingCode, schoolNumber }) {
    const db = requireFirestore();
    const cache = createParentLookupCache(db);
    const debugEnabled = isDevelopmentEnvironment();
    const startedAt = performance.now();
    const lookupContext = {
      meetingCode: meetingCode.trim().toUpperCase(),
      schoolNumber: String(schoolNumber ?? "").trim(),
    };

    try {
      const meetingEvent = await findActiveOrDraftEventByCode(db, meetingCode);
      const eventLookupDurationMs = Math.round(performance.now() - startedAt);

      if (!meetingEvent) {
        logParentMeetingLookup("event not found", {
          ...lookupContext,
          reason: "inactive-or-missing-event",
          eventLookupDurationMs,
        });
        return null;
      }

      logParentMeetingLookup("event resolved", {
        ...lookupContext,
        eventId: meetingEvent.id,
        eventSchoolId: meetingEvent.schoolId,
        eventStatus: meetingEvent.status,
        includedClasses: meetingEvent.includedClasses,
        eventLookupDurationMs,
      });

      logParentMeetingLookup("student lookup started", {
        ...lookupContext,
        eventId: meetingEvent.id,
        eventSchoolId: meetingEvent.schoolId,
      });
      const student = await findStudentForEvent({
        db,
        meetingCode,
        schoolNumber,
        event: meetingEvent,
      });
      const studentLookupDurationMs = Math.round(performance.now() - startedAt);

      if (!student) {
        logParentMeetingLookup("student lookup rejected", {
          ...lookupContext,
          eventId: meetingEvent.id,
          eventSchoolId: meetingEvent.schoolId,
          reason: "student-validation-failed",
          eventLookupDurationMs,
          studentLookupDurationMs,
        });
        return null;
      }

      logParentMeetingLookup("student resolved", {
        ...lookupContext,
        eventId: meetingEvent.id,
        studentId: student.id,
        studentSchoolId: student.schoolId,
        studentClassId: student.classId,
        studentActive: student.isActive,
        eventLookupDurationMs,
        studentLookupDurationMs,
      });

      logParentMeetingLookup("school lookup started", {
        ...lookupContext,
        eventId: meetingEvent.id,
        schoolId: meetingEvent.schoolId,
      });
      logParentMeetingLookup("class lookup started", {
        ...lookupContext,
        eventId: meetingEvent.id,
        classId: student.classId,
      });
      logParentMeetingLookup("teachingAssignments query started", {
        ...lookupContext,
        eventId: meetingEvent.id,
        classId: student.classId,
      });
      logParentMeetingLookup("eventTeacherSetups query started", {
        ...lookupContext,
        eventId: meetingEvent.id,
      });
      const [school, classData, teachingAssignments, setupSnapshot] = await Promise.all([
        cache.getSchool(meetingEvent.schoolId),
        cache.getClass(student.classId),
        getTeachingAssignmentsForClass(db, student.classId, cache.getTeacher),
        getDocs(
          query(
            collection(db, "eventTeacherSetups"),
            where("schoolId", "==", meetingEvent.schoolId),
            where("eventId", "==", meetingEvent.id),
            limit(100),
          ),
        ),
      ]);

      logParentMeetingLookup("school lookup resolved", {
        ...lookupContext,
        eventId: meetingEvent.id,
        schoolId: school.id,
      });
      logParentMeetingLookup("class lookup resolved", {
        ...lookupContext,
        eventId: meetingEvent.id,
        classId: student.classId,
        classTeacherId: classData.classTeacherId ?? null,
      });
      logParentMeetingLookup("teachingAssignments query resolved", {
        ...lookupContext,
        eventId: meetingEvent.id,
        classId: student.classId,
        docsCount: teachingAssignments.length,
      });
      logParentMeetingLookup("eventTeacherSetups query resolved", {
        ...lookupContext,
        eventId: meetingEvent.id,
        docsCount: setupSnapshot.docs.length,
      });

      const setupByTeacherId = new Map(
        setupSnapshot.docs.map((setupDocument) => [
          (setupDocument.data() as FirestoreEventTeacherSetupDocument).teacherId ?? "",
          setupDocument.data() as FirestoreEventTeacherSetupDocument,
        ] as const),
      );

      logParentMeetingLookup("teacher lookup started", {
        ...lookupContext,
        eventId: meetingEvent.id,
        teachingAssignmentCount: teachingAssignments.filter((row) => row.isActive).length,
      });
      const activeAssignments = teachingAssignments.filter((row) => row.isActive);
      const teacherIds = Array.from(
        new Set([
          ...activeAssignments.map((assignment) => assignment.teacherId).filter(Boolean),
          ...(classData.classTeacherId ? [classData.classTeacherId] : []),
        ]),
      );
      const teacherEntries = await Promise.all(
        teacherIds.map(async (teacherId) => [
          teacherId,
          await cache.getTeacher(teacherId),
        ] as const),
      );
      const teacherById = new Map(
        teacherEntries.filter((entry): entry is readonly [string, Teacher] => Boolean(entry[1])),
      );
      const classTeacher = classData.classTeacherId
        ? teacherById.get(classData.classTeacherId) ?? null
        : null;
      const teacherAssignments: TeacherAssignment[] = [];
      let resolvedTeacherCount = 0;
      for (const assignment of activeAssignments) {
        const teacherId = assignment.teacherId;
        const teacher = teacherById.get(teacherId);
        if (!teacher) {
          continue;
        }
        resolvedTeacherCount += 1;

        const setup = setupByTeacherId.get(teacherId);
        teacherAssignments.push({
          id: assignment.id,
          teacher,
          subject: assignment.subject,
          subjectMissing: !assignment.subject.trim(),
          building: setup?.building ?? "",
          floor: setup?.floor ?? 0,
          classroom: setup?.classroom ?? "",
          availability: setup?.isAvailable ? ("available" as const) : ("busy" as const),
          locationMissing: !setup,
        });
      }

      logParentMeetingLookup("teacher lookup resolved", {
        ...lookupContext,
        eventId: meetingEvent.id,
        requestedTeacherCount: teacherIds.length,
        resolvedTeacherCount,
        availableSetupCount: setupSnapshot.docs.length,
      });

      logParentMeetingLookup("final ParentMeetingView built", {
        ...lookupContext,
        eventId: meetingEvent.id,
        studentId: student.id,
        classId: student.classId,
        teachingAssignmentCount: teachingAssignments.length,
        teacherAssignmentCount: teacherAssignments.length,
        eventLookupDurationMs,
        studentLookupDurationMs,
        teachingAssignmentsCount: teachingAssignments.length,
        eventTeacherSetupsCount: setupSnapshot.docs.length,
        teacherDocCount: teacherIds.length,
        totalParentLoadDurationMs: Math.round(performance.now() - startedAt),
      });

      return {
        school,
        meetingEvent,
        student,
        classTeacher,
        teacherAssignments: sortTeacherAssignments(teacherAssignments),
      };
    } catch (error) {
      logParentMeetingLookupError("parent meeting view build", error, lookupContext);
      throw error;
    }
  },
};

function createParentLookupCache(db: ReturnType<typeof requireFirestore>) {
  const schoolCache = new Map<string, Promise<School>>();
  const classCache = new Map<string, Promise<FirestoreClassDocument>>();
  const teacherCache = new Map<string, Promise<Teacher | null>>();

  return {
    getSchool(schoolId: string) {
      const cacheKey = schoolId.trim();
      const cached = schoolCache.get(cacheKey);
      if (cached) {
        return cached;
      }

      const startedAt = performance.now();
      if (isDevelopmentEnvironment()) {
        logParentMeetingLookup("school lookup cache miss", {
          schoolId: cacheKey,
        });
      }

      const promise = getSchoolById(db, cacheKey);
      promise.then((school) => {
        if (isDevelopmentEnvironment()) {
          logParentMeetingLookup("school lookup resolved", {
            schoolId: cacheKey,
            schoolDocumentId: school.id,
            schoolLookupDurationMs: Math.round(performance.now() - startedAt),
          });
        }
      });
      schoolCache.set(cacheKey, promise);
      return promise;
    },
    getClass(classId: string) {
      const cacheKey = classId.trim();
      const cached = classCache.get(cacheKey);
      if (cached) {
        return cached;
      }

      const startedAt = performance.now();
      if (isDevelopmentEnvironment()) {
        logParentMeetingLookup("class lookup cache miss", {
          classId: cacheKey,
        });
      }

      const promise = getClassById(db, cacheKey);
      promise.then(() => {
        if (isDevelopmentEnvironment()) {
          logParentMeetingLookup("class lookup resolved", {
            classId: cacheKey,
            classLookupDurationMs: Math.round(performance.now() - startedAt),
          });
        }
      });
      classCache.set(cacheKey, promise);
      return promise;
    },
    getTeacher(teacherId: string) {
      const cacheKey = teacherId.trim();
      const cached = teacherCache.get(cacheKey);
      if (cached) {
        return cached;
      }

      const startedAt = performance.now();
      if (isDevelopmentEnvironment()) {
        logParentMeetingLookup("teacher lookup cache miss", {
          teacherId: cacheKey,
        });
      }

      const promise = getTeacherByIdOrNull(db, cacheKey);
      promise.then((teacher) => {
        if (isDevelopmentEnvironment()) {
          logParentMeetingLookup("teacher lookup resolved", {
            teacherId: cacheKey,
            found: Boolean(teacher),
            teacherLookupDurationMs: Math.round(performance.now() - startedAt),
          });
        }
      });
      teacherCache.set(cacheKey, promise);
      return promise;
    },
  };
}

function logParentMeetingLookup(step: string, details: Record<string, unknown>) {
  if (!isDevelopmentEnvironment()) {
    return;
  }

  console.info(`[Firestore parent lookup] ${step}`, stringifySafe(details));
}

function logParentMeetingLookupError(
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
    errorCode: getErrorCode(error),
    details: stringifySafe(details),
    error: stringifySafe(error),
  });
}

function isDevelopmentEnvironment() {
  return typeof import.meta !== "undefined" && import.meta.env?.DEV === true;
}

function stringifySafe(value: unknown) {
  try {
    return JSON.parse(
      JSON.stringify(value, (_key, nestedValue) => {
        if (nestedValue instanceof Error) {
          return {
            name: nestedValue.name,
            message: nestedValue.message,
            code: getErrorCode(nestedValue),
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

function getErrorCode(error: unknown) {
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

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
