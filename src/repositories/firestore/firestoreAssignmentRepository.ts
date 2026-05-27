import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import type {
  EventTeacherSetupBulkUpsertResult,
  EventTeacherSetupFormInput,
  EventTeacherSetupOverview,
} from "../../domain/models";
import { DEFAULT_SCHOOL_ID } from "../../config/school";
import type { AssignmentRepository } from "../interfaces";
import { mapEventTeacherSetupOverview } from "./firestoreMappers";
import {
  getTeacherByIdOrNull,
  getTeachingAssignmentsForClass,
  requireFirestore,
} from "./firestoreLookups";
import type { FirestoreEventTeacherSetupDocument } from "./firestoreTypes";

export const firestoreAssignmentRepository: AssignmentRepository = {
  async listEventAssignments(eventId) {
    const db = requireFirestore();
    const eventSnapshot = await getDoc(doc(db, "events", eventId));

    if (!eventSnapshot.exists()) {
      return [];
    }

    const event = eventSnapshot.data() as { includedClasses?: string[] };
    const teachingAssignments = await Promise.all(
      (event.includedClasses ?? []).map((classId) =>
        getTeachingAssignmentsForClass(db, classId),
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

    const rows = await Promise.all(
      [...teacherSubjectById.entries()].map(async ([teacherId, subject]) => {
        const teacher = await getTeacherByIdOrNull(db, teacherId);

        if (!teacher) {
          return null;
        }

        const setup = setupByTeacherId.get(teacherId);

        if (!setup) {
          return mapEventTeacherSetupOverview({
            id: `missing-${eventId}-${teacherId}`,
            setupData: {
              eventId,
              schoolId: DEFAULT_SCHOOL_ID,
              teacherId,
              building: "",
              floor: 0,
              classroom: "",
              isAvailable: false,
            },
            teacher,
            subject,
          });
        }

        return mapEventTeacherSetupOverview({
          id: setup.id,
          setupData: setup.data,
          teacher,
          subject,
        });
      }),
    );

    return rows
      .filter((row): row is EventTeacherSetupOverview => Boolean(row))
      .sort(sortEventSetups);
  },
  async createEventAssignment(input) {
    const db = requireFirestore();
    await assertNoDuplicate(db, input);
    await ensureTeacherExists(db, input.teacherId);
    const assignmentData = toFirestoreEventTeacherSetup(input, true);
    const assignmentRef = await addDoc(
      collection(db, "eventTeacherSetups"),
      assignmentData,
    );

    const teacher = await getTeacherByIdOrNull(db, input.teacherId);
    if (!teacher) {
      throw new Error(`Teacher not found: ${input.teacherId}`);
    }

    return mapEventTeacherSetupOverview({
      id: assignmentRef.id,
      setupData: assignmentData,
      teacher,
      subject: teacher.subject,
    });
  },
  async updateEventAssignment(assignmentId, input) {
    const db = requireFirestore();
    const assignmentRef = doc(db, "eventTeacherSetups", assignmentId);
    const snapshot = await getDoc(assignmentRef);

    if (!snapshot.exists()) {
      throw new Error(`Event teacher setup not found: ${assignmentId}`);
    }

    await assertNoDuplicate(db, input, assignmentId);
    await ensureTeacherExists(db, input.teacherId);
    const assignmentData = {
      ...toFirestoreEventTeacherSetup(input, false),
      updatedAt: serverTimestamp(),
    };
    await updateDoc(assignmentRef, assignmentData);

    const teacher = await getTeacherByIdOrNull(db, input.teacherId);
    if (!teacher) {
      throw new Error(`Teacher not found: ${input.teacherId}`);
    }

    return mapEventTeacherSetupOverview({
      id: assignmentId,
      setupData: {
        ...(snapshot.data() as FirestoreEventTeacherSetupDocument),
        ...assignmentData,
      },
      teacher,
      subject: teacher.subject,
    });
  },
  async deleteEventAssignment(assignmentId) {
    const db = requireFirestore();
    await deleteDoc(doc(db, "eventTeacherSetups", assignmentId));
  },
  async bulkUpsertEventAssignments(inputs) {
    const db = requireFirestore();
    const uniqueInputs = dedupeInputs(inputs);
    const existingSnapshot = await getDocs(
      query(
        collection(db, "eventTeacherSetups"),
        where("schoolId", "==", DEFAULT_SCHOOL_ID),
        limit(100),
      ),
    );
    const existing = existingSnapshot.docs.map((assignmentDocument) => ({
      id: assignmentDocument.id,
      data: assignmentDocument.data() as FirestoreEventTeacherSetupDocument,
    }));
    const eventTeacherSetups: EventTeacherSetupOverview[] = [];
    let created = 0;
    let updated = 0;

    for (const input of uniqueInputs) {
      const match = existing.find((setup) =>
        setup.data.eventId === input.eventId &&
        setup.data.teacherId === input.teacherId,
      );

      if (match) {
        const updatedData = {
          ...toFirestoreEventTeacherSetup(input, false),
          updatedAt: serverTimestamp(),
        };
        await updateDoc(doc(db, "eventTeacherSetups", match.id), updatedData);
        updated += 1;
        const teacher = await getTeacherByIdOrNull(db, input.teacherId);
        if (!teacher) {
          throw new Error(`Teacher not found: ${input.teacherId}`);
        }
        eventTeacherSetups.push(
          mapEventTeacherSetupOverview({
            id: match.id,
            setupData: {
              ...match.data,
              ...updatedData,
            },
            teacher,
            subject: teacher.subject,
          }),
        );
        continue;
      }

      const setupData = toFirestoreEventTeacherSetup(input, true);
      const setupRef = await addDoc(collection(db, "eventTeacherSetups"), setupData);
      created += 1;
      const teacher = await getTeacherByIdOrNull(db, input.teacherId);
      if (!teacher) {
        throw new Error(`Teacher not found: ${input.teacherId}`);
      }
      eventTeacherSetups.push(
        mapEventTeacherSetupOverview({
          id: setupRef.id,
          setupData,
          teacher,
          subject: teacher.subject,
        }),
      );
    }

    return { created, updated, eventTeacherSetups } satisfies EventTeacherSetupBulkUpsertResult;
  },
};

function toFirestoreEventTeacherSetup(
  input: EventTeacherSetupFormInput,
  includeCreatedAt: boolean,
) {
  return {
    eventId: input.eventId,
    schoolId: DEFAULT_SCHOOL_ID,
    teacherId: input.teacherId,
    building: input.building.trim(),
    floor: input.floor,
    classroom: input.classroom.trim(),
    isAvailable: input.isAvailable,
    ...(includeCreatedAt ? { createdAt: serverTimestamp() } : {}),
    updatedAt: serverTimestamp(),
  };
}

async function ensureTeacherExists(db: ReturnType<typeof requireFirestore>, teacherId: string) {
  const teacher = await getTeacherByIdOrNull(db, teacherId);

  if (!teacher) {
    throw new Error(`Teacher not found: ${teacherId}`);
  }
}

async function assertNoDuplicate(
  db: ReturnType<typeof requireFirestore>,
  input: EventTeacherSetupFormInput,
  excludingAssignmentId?: string,
) {
  const snapshot = await getDocs(
    query(
      collection(db, "eventTeacherSetups"),
      where("eventId", "==", input.eventId),
      where("teacherId", "==", input.teacherId),
    ),
  );
  const duplicate = snapshot.docs.some((assignmentDocument) =>
    assignmentDocument.id !== excludingAssignmentId,
  );

  if (duplicate) {
    throw new Error("Duplicate event teacher setup.");
  }
}

function dedupeInputs(inputs: EventTeacherSetupFormInput[]) {
  const seen = new Set<string>();

  return inputs.filter((input) => {
    const key = [input.eventId, input.teacherId].join("|");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function sortEventSetups(
  left: EventTeacherSetupOverview,
  right: EventTeacherSetupOverview,
) {
  const building = left.building.localeCompare(right.building, "tr");

  if (building !== 0) {
    return building;
  }

  if (left.floor !== right.floor) {
    return left.floor - right.floor;
  }

  return left.classroom.localeCompare(right.classroom, "tr", { numeric: true });
}

function sortEventTeacherSetups(assignments: EventTeacherSetupOverview[]) {
  return [...assignments].sort(sortEventSetups);
}
