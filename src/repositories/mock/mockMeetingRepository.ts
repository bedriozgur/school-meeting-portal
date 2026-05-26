import type { MeetingRepository } from "../interfaces";
import {
  assertValidEventTransition,
  getNextStatusForAction,
  type EventLifecycleAction,
} from "../eventLifecycle";
import { buildEventReadiness } from "../eventReadiness";
import {
  mockMeetingEvents,
  mockClasses,
} from "./mockData";
import { getAssignmentsForEvent } from "./mockAssignmentRepository";
import {
  generateUniqueMeetingCode,
  normalizeMeetingCode,
} from "../meetingCodes";
import type { EventFormInput } from "../../domain/models";

export const mockMeetingRepository: MeetingRepository = {
  async findByCode(meetingCode) {
    const normalizedCode = meetingCode.trim().toUpperCase();

    return (
      mockMeetingEvents.find(
        (meeting) =>
          meeting.code === normalizedCode &&
          ["active", "draft"].includes(meeting.status),
      ) ??
      null
    );
  },
  async listEvents() {
    return mockMeetingEvents;
  },
  async getEventById(eventId) {
    return mockMeetingEvents.find((event) => event.id === eventId) ?? null;
  },
  async getEventAssignments(eventId) {
    return getAssignmentsForEvent(eventId);
  },
  async validateEventReadiness(eventId) {
    return buildEventReadiness({
      event: mockMeetingEvents.find((event) => event.id === eventId) ?? null,
      classes: mockClasses,
      assignments: getAssignmentsForEvent(eventId),
    });
  },
  async isMeetingCodeAvailable(meetingCode, excludingEventId) {
    const normalizedCode = normalizeMeetingCode(meetingCode);

    return !mockMeetingEvents.some(
      (event) =>
        event.code === normalizedCode &&
        (!excludingEventId || event.id !== excludingEventId),
    );
  },
  async activateEvent(eventId) {
    return updateMockEventStatus(eventId, "activate");
  },
  async archiveEvent(eventId) {
    return updateMockEventStatus(eventId, "archive");
  },
  async markEventOld(eventId) {
    return updateMockEventStatus(eventId, "markOld");
  },
  async restoreEventToDraft(eventId) {
    return updateMockEventStatus(eventId, "restoreDraft");
  },
  async createEvent(input) {
    const event = await buildMockEvent(input);
    mockMeetingEvents.unshift(event);

    return event;
  },
  async updateEvent(eventId, input) {
    const event = mockMeetingEvents.find((meeting) => meeting.id === eventId);

    if (!event) {
      throw new Error(`Event not found: ${eventId}`);
    }

    const classNames = getClassNames(input.includedClasses);
    Object.assign(event, {
      title: input.title,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      includedClasses: input.includedClasses,
      includedClassNames: classNames,
    });

    return event;
  },
  async duplicateEvent(eventId, inputOverrides) {
    if (!mockMeetingEvents.some((meeting) => meeting.id === eventId)) {
      throw new Error(`Event not found: ${eventId}`);
    }

    const event = await buildMockEvent(inputOverrides);
    mockMeetingEvents.unshift(event);

    return event;
  },
};

async function updateMockEventStatus(
  eventId: string,
  action: EventLifecycleAction,
) {
  const event = mockMeetingEvents.find((meeting) => meeting.id === eventId);

  if (!event) {
    throw new Error(`Event not found: ${eventId}`);
  }

  const nextStatus = getNextStatusForAction(action);
  assertValidEventTransition(event.status, nextStatus);
  if (nextStatus === "active") {
    const readiness = await mockMeetingRepository.validateEventReadiness(eventId);

    if (!readiness.isReady) {
      throw new Error("Event is not ready to activate.");
    }
  }
  event.status = nextStatus;

  return event;
}

async function buildMockEvent(input: EventFormInput) {
  const code = input.meetingCode
    ? normalizeMeetingCode(input.meetingCode)
    : await generateUniqueMeetingCode((meetingCode) =>
        mockMeetingRepository.isMeetingCodeAvailable(meetingCode),
      );

  if (!(await mockMeetingRepository.isMeetingCodeAvailable(code))) {
    throw new Error(`Meeting code is already in use: ${code}`);
  }

  return {
    id: `event-${code.toLowerCase()}`,
    schoolId: mockClasses[0]?.schoolId ?? "atatürk-ortaokulu",
    code,
    status: "draft" as const,
    includedClasses: input.includedClasses,
    includedClassNames: getClassNames(input.includedClasses),
    title: input.title,
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
  };
}

function getClassNames(classIds: string[]) {
  return classIds.map(
    (classId) =>
      mockClasses.find((schoolClass) => schoolClass.id === classId)?.name ??
      classId,
  );
}
