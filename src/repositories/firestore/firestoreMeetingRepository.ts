import {
  addDoc,
  collection,
  getCountFromServer,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import type {
  EventFormInput,
  EventTeacherSetup,
  EventTeacherSetupOverview,
  TeachingAssignment,
  Teacher,
} from "../../domain/models";
import { DEFAULT_SCHOOL_ID } from "../../config/school";
import type { MeetingRepository } from "../interfaces";
import {
  assertValidEventTransition,
  getNextStatusForAction,
  type EventLifecycleAction,
} from "../eventLifecycle";
import { buildEventReadiness } from "../eventReadiness";
import { mapMeetingEvent, mapTeacher } from "./firestoreMappers";
import {
  findActiveOrDraftEventByCode,
  getClassById,
  getTeacherByIdOrNull,
  getTeachingAssignmentsForClass,
  requireFirestore,
} from "./firestoreLookups";
import type {
  FirestoreClassDocument,
  FirestoreEventDocument,
  FirestoreEventTeacherSetupDocument,
  FirestoreTeacherDocument,
} from "./firestoreTypes";
import {
  generateUniqueMeetingCode,
  normalizeMeetingCode,
} from "../meetingCodes";

export const firestoreMeetingRepository: MeetingRepository = {
  async findByCode(meetingCode) {
    const db = requireFirestore();

    return findActiveOrDraftEventByCode(db, meetingCode);
  },
  async listEvents(schoolId = DEFAULT_SCHOOL_ID) {
    const db = requireFirestore();
    const snapshot = await getDocs(
      query(
        collection(db, "events"),
        where("schoolId", "==", schoolId),
        orderBy("date", "desc"),
      ),
    );

    return snapshot.docs.map((eventDocument) =>
      mapMeetingEvent(
        eventDocument.id,
        eventDocument.data() as FirestoreEventDocument,
      ),
    );
  },
  async listActiveDraftEvents(schoolId = DEFAULT_SCHOOL_ID) {
    const db = requireFirestore();
    const snapshot = await getDocs(
      query(
        collection(db, "events"),
        where("schoolId", "==", schoolId),
        where("status", "in", ["active", "draft"]),
      ),
    );

    return snapshot.docs
      .map((eventDocument) =>
        mapMeetingEvent(
          eventDocument.id,
          eventDocument.data() as FirestoreEventDocument,
        ),
      )
      .sort((left, right) => right.date.localeCompare(left.date));
  },
  async countEvents(schoolId = DEFAULT_SCHOOL_ID) {
    const db = requireFirestore();
    const snapshot = await getCountFromServer(
      query(collection(db, "events"), where("schoolId", "==", schoolId)),
    );

    return snapshot.data().count;
  },
  async getEventById(eventId) {
    const db = requireFirestore();
    const snapshot = await getDoc(doc(db, "events", eventId));

    if (!snapshot.exists()) {
      return null;
    }

    return mapMeetingEvent(
      snapshot.id,
      snapshot.data() as FirestoreEventDocument,
    );
  },
  async getEventAssignments(eventId) {
    const db = requireFirestore();
    const event = await firestoreMeetingRepository.getEventById(eventId);

    if (!event) {
      return [];
    }

    const teachingAssignments = await Promise.all(
      event.includedClasses.map((classId) =>
        getTeachingAssignmentsForClass(db, classId, undefined, event.schoolId),
      ),
    );
    const teacherSubjectById = new Map<string, string>();

    teachingAssignments.flat().forEach((assignment) => {
      if (!assignment.isActive) {
        return;
      }
      if (!teacherSubjectById.has(assignment.teacherId)) {
        teacherSubjectById.set(assignment.teacherId, assignment.subject);
      }
    });

    const setupsSnapshot = await getDocs(
      query(
        collection(db, "eventTeacherSetups"),
        where("schoolId", "==", event.schoolId),
        where("eventId", "==", eventId),
        limit(100),
      ),
    );
    const setupByTeacherId = new Map(
      setupsSnapshot.docs.map((setupDocument) => [
        (setupDocument.data() as FirestoreEventTeacherSetupDocument).teacherId ??
          "",
        {
          id: setupDocument.id,
          data: setupDocument.data() as FirestoreEventTeacherSetupDocument,
        },
      ]),
    );

    const rows: Array<EventTeacherSetupOverview | null> = await Promise.all(
      [...teacherSubjectById.entries()].map(async ([teacherId, subject]) => {
        const teacher = await getTeacherByIdOrNull(db, teacherId);

        if (!teacher) {
          return null;
        }

        const setup = setupByTeacherId.get(teacherId);
        const setupData: FirestoreEventTeacherSetupDocument = setup?.data ?? {
          eventId,
          schoolId: event.schoolId,
          teacherId,
          building: "",
          floor: 0,
          classroom: "",
          isAvailable: false,
        };

        return {
          id: setup?.id ?? `missing-${eventId}-${teacherId}`,
          teacher,
          subject,
          building: setupData.building ?? "",
          floor: setupData.floor ?? 0,
          classroom: setupData.classroom ?? "",
          availability: setupData.isAvailable ? ("available" as const) : ("busy" as const),
          locationMissing: !setup,
        } satisfies EventTeacherSetupOverview;
      }),
    );

    return rows
      .filter((row): row is EventTeacherSetupOverview => row !== null)
      .sort((left, right) => {
        const building = left.building.localeCompare(right.building, "tr");

        if (building !== 0) {
          return building;
        }

        if (left.floor !== right.floor) {
          return left.floor - right.floor;
        }

        return left.classroom.localeCompare(right.classroom, "tr", {
          numeric: true,
        });
      });
  },
  async validateEventReadiness(eventId) {
    const db = requireFirestore();
    const event = await firestoreMeetingRepository.getEventById(eventId);
    const setupsPromise = event
      ? getDocs(
          query(
            collection(db, "eventTeacherSetups"),
            where("schoolId", "==", event.schoolId),
            where("eventId", "==", event.id),
            limit(100),
          ),
        )
      : Promise.resolve({ docs: [] } as { docs: Array<{ data: () => FirestoreEventTeacherSetupDocument; id: string }> });
    const [classesSnapshot, teachingAssignments, setupsSnapshot] = await Promise.all([
      getDocs(
        query(
          collection(db, "classes"),
          where("schoolId", "==", event?.schoolId ?? DEFAULT_SCHOOL_ID),
          orderBy("name", "asc"),
        ),
      ),
      Promise.all(
        (event?.includedClasses ?? []).map((classId) =>
          getTeachingAssignmentsForClass(
            db,
            classId,
            undefined,
            event?.schoolId ?? DEFAULT_SCHOOL_ID,
          ),
        ),
      ),
      setupsPromise,
    ]);
    const classes = classesSnapshot.docs.map((classDocument) => {
      const data = classDocument.data() as FirestoreClassDocument;

      return {
        id: classDocument.id,
        schoolId: data.schoolId ?? "",
        name: data.name ?? "",
        grade: data.grade ?? "",
        classTeacherId: data.classTeacherId ?? "",
        isActive: data.isActive ?? true,
      };
    });
    const teachers: Teacher[] = [];
    const teacherIdSet = new Set<string>();
    teachingAssignments.flat().forEach((assignment) => {
      if (!assignment.isActive) {
        return;
      }
      teacherIdSet.add(assignment.teacherId);
    });
    setupsSnapshot.docs.forEach((setupDocument) => {
      const data = setupDocument.data() as FirestoreEventTeacherSetupDocument;
      if (data.teacherId) {
        teacherIdSet.add(data.teacherId);
      }
    });
    await Promise.all(
      [...teacherIdSet].map(async (teacherId) => {
        const teacher = await getTeacherByIdOrNull(db, teacherId);
        if (teacher) {
          teachers.push(teacher);
        }
      }),
    );

    return buildEventReadiness({
      event,
      classes,
      teachers,
      teachingAssignments: teachingAssignments.flat(),
      eventTeacherSetups: setupsSnapshot.docs.map((setupDocument) => ({
        id: setupDocument.id,
        schoolId: (setupDocument.data() as FirestoreEventTeacherSetupDocument).schoolId ?? "",
        eventId: (setupDocument.data() as FirestoreEventTeacherSetupDocument).eventId ?? "",
        teacherId: (setupDocument.data() as FirestoreEventTeacherSetupDocument).teacherId ?? "",
        building: (setupDocument.data() as FirestoreEventTeacherSetupDocument).building ?? "",
        floor: (setupDocument.data() as FirestoreEventTeacherSetupDocument).floor ?? 0,
        classroom: (setupDocument.data() as FirestoreEventTeacherSetupDocument).classroom ?? "",
        isAvailable: (setupDocument.data() as FirestoreEventTeacherSetupDocument).isAvailable ?? false,
      }) as EventTeacherSetup),
    });
  },
  async isMeetingCodeAvailable(meetingCode, excludingEventId) {
    const db = requireFirestore();
    const normalizedCode = normalizeMeetingCode(meetingCode);
    const snapshot = await getDocs(
      query(
        collection(db, "events"),
        where("meetingCode", "==", normalizedCode),
        limit(2),
      ),
    );

    return !snapshot.docs.some(
      (eventDocument) =>
        !excludingEventId || eventDocument.id !== excludingEventId,
    );
  },
  async activateEvent(eventId) {
    return updateFirestoreEventStatus(eventId, "activate");
  },
  async archiveEvent(eventId) {
    return updateFirestoreEventStatus(eventId, "archive");
  },
  async markEventOld(eventId) {
    return updateFirestoreEventStatus(eventId, "markOld");
  },
  async restoreEventToDraft(eventId) {
    return updateFirestoreEventStatus(eventId, "restoreDraft");
  },
  async createEvent(input) {
    const db = requireFirestore();
    const classNames = await getClassNames(input.includedClasses);
    const meetingCode = input.meetingCode
      ? normalizeMeetingCode(input.meetingCode)
      : await generateUniqueMeetingCode((code) =>
          firestoreMeetingRepository.isMeetingCodeAvailable(code),
        );

    if (!(await firestoreMeetingRepository.isMeetingCodeAvailable(meetingCode))) {
      throw new Error(`Meeting code is already in use: ${meetingCode}`);
    }

    const newEvent = {
      schoolId: DEFAULT_SCHOOL_ID,
      meetingCode,
      status: "draft",
      includedClasses: input.includedClasses,
      includedClassNames: classNames,
      title: input.title,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const eventRef = await addDoc(collection(db, "events"), newEvent);

    return mapMeetingEvent(eventRef.id, newEvent);
  },
  async updateEvent(eventId, input) {
    const db = requireFirestore();
    const eventRef = doc(db, "events", eventId);
    const snapshot = await getDoc(eventRef);

    if (!snapshot.exists()) {
      throw new Error(`Event not found: ${eventId}`);
    }

    const currentEvent = mapMeetingEvent(
      snapshot.id,
      snapshot.data() as FirestoreEventDocument,
    );
    const classNames = await getClassNames(input.includedClasses);
    await updateDoc(eventRef, {
      title: input.title,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      includedClasses: input.includedClasses,
      includedClassNames: classNames,
      updatedAt: serverTimestamp(),
    });

    return {
      ...currentEvent,
      title: input.title,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      includedClasses: input.includedClasses,
      includedClassNames: classNames,
    };
  },
  async duplicateEvent(eventId, inputOverrides) {
    const db = requireFirestore();
    const sourceSnapshot = await getDoc(doc(db, "events", eventId));

    if (!sourceSnapshot.exists()) {
      throw new Error(`Event not found: ${eventId}`);
    }

    const classNames = await getClassNames(inputOverrides.includedClasses);
    const meetingCode = inputOverrides.meetingCode
      ? normalizeMeetingCode(inputOverrides.meetingCode)
      : await generateUniqueMeetingCode((code) =>
          firestoreMeetingRepository.isMeetingCodeAvailable(code),
        );

    if (!(await firestoreMeetingRepository.isMeetingCodeAvailable(meetingCode))) {
      throw new Error(`Meeting code is already in use: ${meetingCode}`);
    }

    const newEvent = {
      schoolId: DEFAULT_SCHOOL_ID,
      meetingCode,
      status: "draft",
      includedClasses: inputOverrides.includedClasses,
      includedClassNames: classNames,
      title: inputOverrides.title,
      date: inputOverrides.date,
      startTime: inputOverrides.startTime,
      endTime: inputOverrides.endTime,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const newEventRef = await addDoc(collection(db, "events"), newEvent);
    await Promise.all([]);

    return mapMeetingEvent(newEventRef.id, newEvent);
  },
};

async function updateFirestoreEventStatus(
  eventId: string,
  action: EventLifecycleAction,
) {
  const db = requireFirestore();
  const eventRef = doc(db, "events", eventId);
  const snapshot = await getDoc(eventRef);

  if (!snapshot.exists()) {
    throw new Error(`Event not found: ${eventId}`);
  }

  const currentEvent = mapMeetingEvent(
    snapshot.id,
    snapshot.data() as FirestoreEventDocument,
  );
  const nextStatus = getNextStatusForAction(action);
  assertValidEventTransition(currentEvent.status, nextStatus);
  if (nextStatus === "active") {
    const readiness = await firestoreMeetingRepository.validateEventReadiness(eventId);

    if (!readiness.isReady) {
      throw new Error("Event is not ready to activate.");
    }
  }
  await updateDoc(eventRef, {
    status: nextStatus,
    updatedAt: serverTimestamp(),
  });

  return {
    ...currentEvent,
    status: nextStatus,
  };
}

async function getClassNames(classIds: string[]) {
  const db = requireFirestore();
  const classNames = await Promise.all(
    classIds.map(async (classId) => {
      const snapshot = await getDoc(doc(db, "classes", classId));

      if (!snapshot.exists()) {
        return classId;
      }

      const data = snapshot.data() as FirestoreClassDocument;
      return data.name ?? classId;
    }),
  );

  return classNames;
}
