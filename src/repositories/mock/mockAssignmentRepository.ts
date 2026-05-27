import type {
  EventTeacherSetupBulkUpsertResult,
  EventTeacherSetupFormInput,
  EventTeacherSetupOverview,
  EventTeacherSetup,
} from "../../domain/models";
import type { AssignmentRepository } from "../interfaces";
import { DEFAULT_SCHOOL_ID } from "../../config/school";
import {
  mockEventTeacherSetups,
  mockMeetingEvents,
  mockTeachers,
} from "./mockData";
import { getTeachingAssignmentsForClass } from "./mockTeachingAssignmentRepository";

export const mockAssignmentRepository: AssignmentRepository = {
  async listEventAssignments(eventId) {
    return getEventTeacherSetupsForEvent(eventId);
  },
  async createEventAssignment(input) {
    assertEventTeacherSetupAvailable(input);
    const eventTeacherSetup: EventTeacherSetup = {
      id: `ets-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      schoolId: DEFAULT_SCHOOL_ID,
      eventId: input.eventId,
      teacherId: input.teacherId,
      building: input.building.trim(),
      floor: input.floor,
      classroom: input.classroom.trim(),
      isAvailable: input.isAvailable,
    };
    mockEventTeacherSetups.push(eventTeacherSetup);

    return mapEventTeacherSetup(eventTeacherSetup);
  },
  async updateEventAssignment(assignmentId, input) {
    const eventTeacherSetup = mockEventTeacherSetups.find(
      (setup) => setup.id === assignmentId,
    );

    if (!eventTeacherSetup) {
      throw new Error(`Event teacher setup not found: ${assignmentId}`);
    }

    assertEventTeacherSetupAvailable(input, assignmentId);
    Object.assign(eventTeacherSetup, {
      eventId: input.eventId,
      teacherId: input.teacherId,
      building: input.building.trim(),
      floor: input.floor,
      classroom: input.classroom.trim(),
      isAvailable: input.isAvailable,
    });

    return mapEventTeacherSetup(eventTeacherSetup);
  },
  async deleteEventAssignment(assignmentId) {
    const index = mockEventTeacherSetups.findIndex(
      (setup) => setup.id === assignmentId,
    );

    if (index === -1) {
      throw new Error(`Event teacher setup not found: ${assignmentId}`);
    }

    mockEventTeacherSetups.splice(index, 1);
  },
  async bulkUpsertEventAssignments(inputs) {
    const uniqueInputs = dedupeInputs(inputs);
    let created = 0;
    let updated = 0;
    const eventTeacherSetups: EventTeacherSetupOverview[] = [];

    uniqueInputs.forEach((input) => {
      const existingSetup = mockEventTeacherSetups.find((setup) =>
        isSameEventTeacherSetupKey(setup, input),
      );

      if (!existingSetup) {
        const eventTeacherSetup: EventTeacherSetup = {
          id: `ets-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          schoolId: DEFAULT_SCHOOL_ID,
          eventId: input.eventId,
          teacherId: input.teacherId,
          building: input.building.trim(),
          floor: input.floor,
          classroom: input.classroom.trim(),
          isAvailable: input.isAvailable,
        };
        mockEventTeacherSetups.push(eventTeacherSetup);
        created += 1;
        eventTeacherSetups.push(mapEventTeacherSetup(eventTeacherSetup));
        return;
      }

      Object.assign(existingSetup, {
        eventId: input.eventId,
        teacherId: input.teacherId,
        building: input.building.trim(),
        floor: input.floor,
        classroom: input.classroom.trim(),
        isAvailable: input.isAvailable,
      });
      updated += 1;
      eventTeacherSetups.push(mapEventTeacherSetup(existingSetup));
    });

    return {
      created,
      updated,
      eventTeacherSetups,
    } satisfies EventTeacherSetupBulkUpsertResult;
  },
};

export function getEventTeacherSetupsForEvent(eventId: string) {
  return mockEventTeacherSetups
    .filter((setup) => setup.eventId === eventId)
    .map(mapEventTeacherSetup)
    .sort(sortEventTeacherSetup);
}

export function getEventSetupTeacherIdsForEvent(eventId: string) {
  const event = mockMeetingEvents.find((meeting) => meeting.id === eventId);

  if (!event) {
    return [];
  }

  const teacherIds = new Set<string>();

  event.includedClasses.forEach((classId) => {
    getTeachingAssignmentsForClass(classId)
      .filter((assignment) => assignment.isActive)
      .forEach((assignment) => {
        teacherIds.add(assignment.teacherId);
      });
  });

  return [...teacherIds];
}

function mapEventTeacherSetup(
  setup: EventTeacherSetup,
): EventTeacherSetupOverview {
  const teacher = mockTeachers.find(
    (currentTeacher) => currentTeacher.id === setup.teacherId,
  );
  const subject =
    getTeachingAssignmentSubject(setup.eventId, setup.teacherId) ??
    teacher?.subject ??
    "";

  if (!teacher) {
    throw new Error(`Invalid event teacher setup: ${setup.id}`);
  }

  return {
    id: setup.id,
    teacher,
    subject,
    building: setup.building,
    floor: setup.floor,
    classroom: setup.classroom,
    availability: setup.isAvailable ? "available" : "busy",
    locationMissing:
      !setup.building.trim() ||
      !setup.classroom.trim() ||
      !Number.isFinite(setup.floor),
  };
}

function getTeachingAssignmentSubject(eventId: string, teacherId: string) {
  const event = mockMeetingEvents.find((meeting) => meeting.id === eventId);

  if (!event) {
    return null;
  }

  for (const classId of event.includedClasses) {
    const match = getTeachingAssignmentsForClass(classId)
      .filter((assignment) => assignment.isActive)
      .find((assignment) => assignment.teacherId === teacherId);

    if (match) {
      return match.subject;
    }
  }

  return null;
}

function assertEventTeacherSetupAvailable(
  input: EventTeacherSetupFormInput,
  excludingId?: string,
) {
  const duplicate = mockEventTeacherSetups.some(
    (setup) =>
      isSameEventTeacherSetupKey(setup, input) && setup.id !== excludingId,
  );

  if (duplicate) {
    throw new Error("Duplicate event teacher setup.");
  }

  if (!mockTeachers.some((teacher) => teacher.id === input.teacherId)) {
    throw new Error(`Teacher not found: ${input.teacherId}`);
  }
}

function dedupeInputs(inputs: EventTeacherSetupFormInput[]) {
  const seen = new Set<string>();

  return inputs.filter((input) => {
    const key = eventTeacherSetupKey(input);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function eventTeacherSetupKey(input: EventTeacherSetupFormInput) {
  return [input.eventId, input.teacherId].join("|");
}

function isSameEventTeacherSetupKey(
  setup: EventTeacherSetup,
  input: EventTeacherSetupFormInput,
) {
  return eventTeacherSetupKey(setup) === eventTeacherSetupKey(input);
}

function sortEventTeacherSetup(
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
