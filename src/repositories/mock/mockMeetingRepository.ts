import type { MeetingRepository } from "../interfaces";
import { DEFAULT_SCHOOL_ID } from "../../config/school";
import {
  assertValidEventTransition,
  getNextStatusForAction,
  type EventLifecycleAction,
} from "../eventLifecycle";
import { buildEventReadiness } from "../eventReadiness";
import {
  mockMeetingEvents,
  mockClasses,
  mockTeachers,
  mockEventTeacherSetups,
} from "./mockData";
import { getTeachingAssignmentsForClass } from "./mockTeachingAssignmentRepository";
import { getEventTeacherSetupsForEvent } from "./mockAssignmentRepository";
import {
  generateUniqueMeetingCode,
  buildMeetingCodeLookupCandidates,
  normalizeMeetingCode,
} from "../meetingCodes";
import type { EventFormInput, EventTeacherSetupOverview } from "../../domain/models";

export const mockMeetingRepository: MeetingRepository = {
  async findByCode(meetingCode) {
    const candidateCodes = new Set(buildMeetingCodeLookupCandidates(meetingCode));

    return (
      mockMeetingEvents.find(
        (meeting) =>
          candidateCodes.has(meeting.code.trim().toUpperCase()) &&
          ["active", "draft"].includes(meeting.status),
      ) ??
      null
    );
  },
  async listEvents(schoolId = DEFAULT_SCHOOL_ID) {
    return mockMeetingEvents.filter((meeting) => meeting.schoolId === schoolId);
  },
  async listActiveDraftEvents(schoolId = DEFAULT_SCHOOL_ID) {
    return mockMeetingEvents.filter(
      (meeting) =>
        meeting.schoolId === schoolId &&
        ["active", "draft"].includes(meeting.status),
    );
  },
  async countEvents(schoolId = DEFAULT_SCHOOL_ID) {
    return mockMeetingEvents.filter((meeting) => meeting.schoolId === schoolId).length;
  },
  async getEventById(eventId) {
    return mockMeetingEvents.find((event) => event.id === eventId) ?? null;
  },
  async getEventAssignments(eventId) {
    return buildEventTeacherAssignments(eventId);
  },
  async validateEventReadiness(eventId) {
    const event = mockMeetingEvents.find((meeting) => meeting.id === eventId) ?? null;
    return buildEventReadiness({
      event,
      classes: mockClasses,
      teachers: mockTeachers,
      teachingAssignments: event
        ? event.includedClasses.flatMap((classId) =>
            getTeachingAssignmentsForClass(classId).filter(
              (assignment) => assignment.isActive,
            ),
          )
        : [],
      eventTeacherSetups: mockEventTeacherSetups.filter(
        (setup) => setup.eventId === eventId,
      ),
    });
  },
  async isMeetingCodeAvailable(meetingCode, excludingEventId) {
    const candidateCodes = new Set(buildMeetingCodeLookupCandidates(meetingCode));

    return !mockMeetingEvents.some(
      (event) =>
        candidateCodes.has(event.code.trim().toUpperCase()) &&
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
  async deleteDraftEvent(eventId) {
    const eventIndex = mockMeetingEvents.findIndex((meeting) => meeting.id === eventId);

    if (eventIndex === -1) {
      throw new Error(`Event not found: ${eventId}`);
    }

    const event = mockMeetingEvents[eventIndex];
    if (event.status !== "draft") {
      throw new Error("Only draft events can be deleted.");
    }

    mockMeetingEvents.splice(eventIndex, 1);
    for (let index = mockEventTeacherSetups.length - 1; index >= 0; index -= 1) {
      if (mockEventTeacherSetups[index].eventId === eventId) {
        mockEventTeacherSetups.splice(index, 1);
      }
    }
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
    schoolId: mockClasses[0]?.schoolId ?? DEFAULT_SCHOOL_ID,
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

function buildEventTeacherAssignments(eventId: string) {
  const event = mockMeetingEvents.find((meeting) => meeting.id === eventId);

  if (!event) {
    return [];
  }

  const teachingAssignments = event.includedClasses.flatMap((classId) =>
    getTeachingAssignmentsForClass(classId),
  );
  const teacherSubjectById = new Map<string, string>();

  teachingAssignments.forEach((assignment) => {
    if (!assignment.isActive) {
      return;
    }
    if (!teacherSubjectById.has(assignment.teacherId)) {
      teacherSubjectById.set(assignment.teacherId, assignment.subject);
    }
  });

  const setupByTeacherId = new Map(
    getEventTeacherSetupsForEvent(eventId).map((setup) => [
      setup.teacher.id,
      setup,
    ] as const),
  );

  return [...teacherSubjectById.entries()]
    .map<EventTeacherSetupOverview | null>(([teacherId, subject]) => {
      const teacher = mockTeachers.find((currentTeacher) => currentTeacher.id === teacherId);
      if (!teacher) {
        return null;
      }

      const setup = setupByTeacherId.get(teacherId);

      return {
        id: setup?.id ?? `missing-setup-${eventId}-${teacherId}`,
        teacher,
        subject,
        building: setup?.building ?? "",
        floor: setup?.floor ?? 0,
        classroom: setup?.classroom ?? "",
        availability: setup?.availability ?? ("busy" as const),
        locationMissing: !setup,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((left, right) => {
      const building = left.building.localeCompare(right.building, "tr");
      if (building !== 0) return building;
      if (left.floor !== right.floor) return left.floor - right.floor;
      return left.classroom.localeCompare(right.classroom, "tr", { numeric: true });
    });
}
