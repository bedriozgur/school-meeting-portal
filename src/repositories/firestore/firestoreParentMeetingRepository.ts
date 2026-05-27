import { collection, getDocs, limit, query, where } from "firebase/firestore";
import type { ParentMeetingRepository } from "../interfaces";
import type { TeacherAssignment } from "../../domain/models";
import { sortTeacherAssignments } from "../../utils/teachers";
import { requireFirestore, findActiveOrDraftEventByCode, findStudentForEvent, getSchoolById, getClassById, getTeacherByIdOrNull, getTeachingAssignmentsForClass } from "./firestoreLookups";
import type { FirestoreEventTeacherSetupDocument } from "./firestoreTypes";

export const firestoreParentMeetingRepository: ParentMeetingRepository = {
  async getParentMeetingView({ meetingCode, schoolNumber }) {
    const db = requireFirestore();
    const lookupContext = {
      meetingCode: meetingCode.trim().toUpperCase(),
      schoolNumber: String(schoolNumber ?? "").trim(),
    };

    try {
      const meetingEvent = await findActiveOrDraftEventByCode(db, meetingCode);

      if (!meetingEvent) {
        logParentMeetingLookup("event not found", {
          ...lookupContext,
          reason: "inactive-or-missing-event",
        });
        return null;
      }

      logParentMeetingLookup("event resolved", {
        ...lookupContext,
        eventId: meetingEvent.id,
        eventSchoolId: meetingEvent.schoolId,
        eventStatus: meetingEvent.status,
        includedClasses: meetingEvent.includedClasses,
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
      });

      if (!student) {
        logParentMeetingLookup("student lookup rejected", {
          ...lookupContext,
          eventId: meetingEvent.id,
          eventSchoolId: meetingEvent.schoolId,
          reason: "student-validation-failed",
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
      });

      logParentMeetingLookup("school lookup started", {
        ...lookupContext,
        eventId: meetingEvent.id,
        schoolId: meetingEvent.schoolId,
      });
      const school = await getSchoolById(db, meetingEvent.schoolId);
      logParentMeetingLookup("school lookup resolved", {
        ...lookupContext,
        eventId: meetingEvent.id,
        schoolId: school.id,
      });

      logParentMeetingLookup("class lookup started", {
        ...lookupContext,
        eventId: meetingEvent.id,
        classId: student.classId,
      });
      const classData = await getClassById(db, student.classId);
      logParentMeetingLookup("class lookup resolved", {
        ...lookupContext,
        eventId: meetingEvent.id,
        classId: student.classId,
        classTeacherId: classData.classTeacherId ?? null,
      });

      logParentMeetingLookup("teachingAssignments query started", {
        ...lookupContext,
        eventId: meetingEvent.id,
        classId: student.classId,
      });
      const teachingAssignments = await getTeachingAssignmentsForClass(db, student.classId);
      logParentMeetingLookup("teachingAssignments query resolved", {
        ...lookupContext,
        eventId: meetingEvent.id,
        classId: student.classId,
        docsCount: teachingAssignments.length,
      });

      logParentMeetingLookup("eventTeacherSetups query started", {
        ...lookupContext,
        eventId: meetingEvent.id,
      });
      const setupSnapshot = await getDocs(
        query(
          collection(db, "eventTeacherSetups"),
          where("eventId", "==", meetingEvent.id),
          limit(100),
        ),
      );
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
      const classTeacher = classData.classTeacherId
        ? await getTeacherByIdOrNull(db, classData.classTeacherId)
        : null;
      const teacherAssignments: TeacherAssignment[] = [];
      let resolvedTeacherCount = 0;
      for (const assignment of teachingAssignments.filter((row) => row.isActive)) {
        const teacherId = assignment.teacherId;
        const teacher = await getTeacherByIdOrNull(db, teacherId);
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
