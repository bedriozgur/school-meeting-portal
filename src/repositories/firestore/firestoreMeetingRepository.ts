import {
  addDoc,
  collection,
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
import type { EventAssignmentOverview, EventFormInput } from "../../domain/models";
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
  requireFirestore,
} from "./firestoreLookups";
import type {
  FirestoreClassDocument,
  FirestoreEventDocument,
  FirestoreMeetingAssignmentDocument,
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
  async listEvents() {
    const db = requireFirestore();
    const snapshot = await getDocs(
      query(collection(db, "events"), orderBy("date", "desc")),
    );

    return snapshot.docs.map((eventDocument) =>
      mapMeetingEvent(
        eventDocument.id,
        eventDocument.data() as FirestoreEventDocument,
      ),
    );
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
    const snapshot = await getDocs(
      query(
        collection(db, "meetingAssignments"),
        where("eventId", "==", eventId),
        limit(50),
      ),
    );
    const rows: Array<EventAssignmentOverview | null> = await Promise.all(
      snapshot.docs.map(async (assignmentDocument) => {
        const assignmentData =
          assignmentDocument.data() as FirestoreMeetingAssignmentDocument;
        const [classData, teacherSnapshot] = await Promise.all([
          getClassById(db, assignmentData.classId ?? ""),
          getDoc(doc(db, "teachers", assignmentData.teacherId ?? "")),
        ]);

        if (!teacherSnapshot.exists()) {
          return null;
        }

        const overview: EventAssignmentOverview = {
          id: assignmentDocument.id,
          classId: assignmentData.classId ?? "",
          className: classData.name ?? "",
          teacher: mapTeacher(
            teacherSnapshot.id,
            teacherSnapshot.data() as FirestoreTeacherDocument,
          ),
          subject: assignmentData.subject ?? "",
          building: assignmentData.building ?? "",
          floor: assignmentData.floor ?? 0,
          classroom: assignmentData.classroom ?? "",
          availability: assignmentData.isAvailable ? "available" : "busy",
        };

        return overview;
      }),
    );

    return rows
      .filter((row): row is EventAssignmentOverview => Boolean(row))
      .sort((left, right) => {
        const className = left.className.localeCompare(right.className, "tr", {
          numeric: true,
        });

        if (className !== 0) {
          return className;
        }

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
    const [classesSnapshot, assignments] = await Promise.all([
      getDocs(query(collection(db, "classes"), orderBy("name", "asc"))),
      firestoreMeetingRepository.getEventAssignments(eventId),
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

    return buildEventReadiness({
      event,
      classes,
      assignments,
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
    const assignmentsSnapshot = await getDocs(
      query(
        collection(db, "meetingAssignments"),
        where("eventId", "==", eventId),
        limit(50),
      ),
    );

    await Promise.all(
      assignmentsSnapshot.docs.map((assignmentDocument) => {
        const assignmentData =
          assignmentDocument.data() as FirestoreMeetingAssignmentDocument;

        if (
          assignmentData.classId &&
          !inputOverrides.includedClasses.includes(assignmentData.classId)
        ) {
          return Promise.resolve();
        }

        return addDoc(collection(db, "meetingAssignments"), {
          ...assignmentData,
          eventId: newEventRef.id,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }),
    );

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
