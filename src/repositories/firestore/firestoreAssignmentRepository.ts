import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import type {
  EventAssignmentBulkUpsertResult,
  EventAssignmentInput,
  EventAssignmentOverview,
} from "../../domain/models";
import { DEFAULT_SCHOOL_ID } from "../../config/school";
import type { AssignmentRepository } from "../interfaces";
import { getClassById, getTeacherById, requireFirestore } from "./firestoreLookups";
import type { FirestoreMeetingAssignmentDocument } from "./firestoreTypes";

export const firestoreAssignmentRepository: AssignmentRepository = {
  async listEventAssignments(eventId) {
    return getAssignmentsForEvent(eventId);
  },
  async createEventAssignment(input) {
    const db = requireFirestore();
    await assertNoDuplicate(input);
    const assignmentData = toFirestoreAssignment(input, true);
    const assignmentRef = await addDoc(
      collection(db, "meetingAssignments"),
      assignmentData,
    );

    return buildAssignmentOverview(db, assignmentRef.id, assignmentData);
  },
  async updateEventAssignment(assignmentId, input) {
    const db = requireFirestore();
    const assignmentRef = doc(db, "meetingAssignments", assignmentId);
    const snapshot = await getDoc(assignmentRef);

    if (!snapshot.exists()) {
      throw new Error(`Assignment not found: ${assignmentId}`);
    }

    await assertNoDuplicate(input, assignmentId);
    const assignmentData = {
      ...toFirestoreAssignment(input, false),
      updatedAt: serverTimestamp(),
    };
    await updateDoc(assignmentRef, assignmentData);

    return buildAssignmentOverview(
      db,
      assignmentId,
      assignmentData as FirestoreMeetingAssignmentDocument,
    );
  },
  async deleteEventAssignment(assignmentId) {
    const db = requireFirestore();
    await deleteDoc(doc(db, "meetingAssignments", assignmentId));
  },
  async bulkUpsertEventAssignments(inputs) {
    const db = requireFirestore();
    const uniqueInputs = dedupeInputs(inputs);
    const groupedInputs = groupByEventId(uniqueInputs);
    let created = 0;
    let updated = 0;
    const assignments: EventAssignmentOverview[] = [];

    for (const [eventId, eventInputs] of groupedInputs) {
      const existingAssignments = await loadAssignmentsForEvent(db, eventId);

      for (const input of eventInputs) {
        const matchingAssignment = existingAssignments.find((assignment) =>
          isSameAssignmentKey(assignment.data, input),
        );

        if (matchingAssignment) {
          const updatedData = {
            ...toFirestoreAssignment(input, false),
            updatedAt: serverTimestamp(),
          };
          await updateDoc(matchingAssignment.ref, updatedData);
          updated += 1;
          assignments.push(
            await buildAssignmentOverview(db, matchingAssignment.ref.id, {
              ...matchingAssignment.data,
              ...updatedData,
            } as FirestoreMeetingAssignmentDocument),
          );
          continue;
        }

        const assignmentData = toFirestoreAssignment(input, true);
        const assignmentRef = await addDoc(
          collection(db, "meetingAssignments"),
          assignmentData,
        );
        created += 1;
        assignments.push(
          await buildAssignmentOverview(db, assignmentRef.id, assignmentData),
        );
      }
    }

    return {
      created,
      updated,
      assignments,
    } satisfies EventAssignmentBulkUpsertResult;
  },
};

async function getAssignmentsForEvent(eventId: string) {
  const db = requireFirestore();
  const snapshot = await loadAssignmentsForEvent(db, eventId);
  const rows = await Promise.all(
    snapshot.map((assignmentDocument) =>
      buildAssignmentOverview(
        db,
        assignmentDocument.id,
        assignmentDocument.data,
      ),
    ),
  );

  return rows.sort(sortAssignmentOverview);
}

async function assertNoDuplicate(
  input: EventAssignmentInput,
  excludingAssignmentId?: string,
) {
  const db = requireFirestore();
  const assignments = await loadAssignmentsForEvent(db, input.eventId);
  const duplicate = assignments.some(
    (assignment) =>
      assignment.id !== excludingAssignmentId &&
      isSameAssignmentKey(assignment.data, input),
  );

  if (duplicate) {
    throw new Error("Duplicate assignment.");
  }
}

async function loadAssignmentsForEvent(
  db: ReturnType<typeof requireFirestore>,
  eventId: string,
) {
  const snapshot = await getDocs(
    query(collection(db, "meetingAssignments"), where("eventId", "==", eventId)),
  );

  return snapshot.docs.map((assignmentDocument) => ({
    id: assignmentDocument.id,
    data: assignmentDocument.data() as FirestoreMeetingAssignmentDocument,
    ref: assignmentDocument.ref,
  }));
}

async function buildAssignmentOverview(
  db: ReturnType<typeof requireFirestore>,
  id: string,
  assignmentData: FirestoreMeetingAssignmentDocument,
): Promise<EventAssignmentOverview> {
  const [classData, teacher] = await Promise.all([
    getClassById(db, assignmentData.classId ?? ""),
    getTeacherById(db, assignmentData.teacherId ?? ""),
  ]);

  return {
    id,
    classId: assignmentData.classId ?? "",
    className: classData.name ?? "",
    teacher,
    subject: assignmentData.subject ?? "",
    building: assignmentData.building ?? "",
    floor: assignmentData.floor ?? 0,
    classroom: assignmentData.classroom ?? "",
    availability: assignmentData.isAvailable ? "available" : "busy",
  };
}

function toFirestoreAssignment(
  input: EventAssignmentInput,
  includeCreatedAt: boolean,
) {
  return {
    eventId: input.eventId,
    schoolId: DEFAULT_SCHOOL_ID,
    teacherId: input.teacherId,
    classId: input.classId,
    subject: input.subject,
    building: input.building,
    floor: input.floor,
    classroom: input.classroom,
    isAvailable: input.availability !== "busy",
    ...(includeCreatedAt ? { createdAt: serverTimestamp() } : {}),
    updatedAt: serverTimestamp(),
  };
}

function dedupeInputs(inputs: EventAssignmentInput[]) {
  const seen = new Set<string>();

  return inputs.filter((input) => {
    const key = assignmentKey(input);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function groupByEventId(inputs: EventAssignmentInput[]) {
  const grouped = new Map<string, EventAssignmentInput[]>();

  inputs.forEach((input) => {
    grouped.set(input.eventId, [...(grouped.get(input.eventId) ?? []), input]);
  });

  return grouped;
}

function assignmentKey(input: EventAssignmentInput) {
  return [
    input.eventId,
    input.classId,
    input.teacherId,
    input.subject.trim().toLocaleLowerCase("tr"),
  ].join("|");
}

function isSameAssignmentKey(
  assignment: FirestoreMeetingAssignmentDocument,
  input: EventAssignmentInput,
) {
  return assignmentKey({
    eventId: assignment.eventId ?? "",
    classId: assignment.classId ?? "",
    teacherId: assignment.teacherId ?? "",
    subject: assignment.subject ?? "",
    building: assignment.building ?? "",
    floor: assignment.floor ?? 0,
    classroom: assignment.classroom ?? "",
    availability: assignment.isAvailable ? "available" : "busy",
  }) === assignmentKey(input);
}

function sortAssignmentOverview(
  left: EventAssignmentOverview,
  right: EventAssignmentOverview,
) {
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
}
