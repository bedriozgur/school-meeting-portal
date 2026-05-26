import type {
  EventAssignmentBulkUpsertResult,
  EventAssignmentInput,
  EventAssignmentOverview,
} from "../../domain/models";
import type { AssignmentRepository } from "../interfaces";
import {
  mockClasses,
  mockEventAssignments,
  mockTeachers,
} from "./mockData";

export const mockAssignmentRepository: AssignmentRepository = {
  async listEventAssignments(eventId) {
    return getAssignmentsForEvent(eventId);
  },
  async createEventAssignment(input) {
    assertNoDuplicate(input);
    const assignment = {
      ...input,
      id: `assignment-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    };
    mockEventAssignments.push(assignment);

    return mapAssignment(assignment);
  },
  async updateEventAssignment(assignmentId, input) {
    const assignmentIndex = mockEventAssignments.findIndex(
      (assignment) => assignment.id === assignmentId,
    );

    if (assignmentIndex === -1) {
      throw new Error(`Assignment not found: ${assignmentId}`);
    }

    assertNoDuplicate(input, assignmentId);
    mockEventAssignments[assignmentIndex] = {
      ...input,
      id: assignmentId,
    };

    return mapAssignment(mockEventAssignments[assignmentIndex]);
  },
  async deleteEventAssignment(assignmentId) {
    const assignmentIndex = mockEventAssignments.findIndex(
      (assignment) => assignment.id === assignmentId,
    );

    if (assignmentIndex === -1) {
      throw new Error(`Assignment not found: ${assignmentId}`);
    }

    mockEventAssignments.splice(assignmentIndex, 1);
  },
  async bulkUpsertEventAssignments(inputs) {
    const uniqueInputs = dedupeInputs(inputs);
    let created = 0;
    let updated = 0;
    const assignments: EventAssignmentOverview[] = [];

    uniqueInputs.forEach((input) => {
      const assignmentIndex = mockEventAssignments.findIndex(
        (assignment) => isSameAssignmentKey(assignment, input),
      );

      if (assignmentIndex === -1) {
        const assignment = {
          ...input,
          id: `assignment-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        };
        mockEventAssignments.push(assignment);
        created += 1;
        assignments.push(mapAssignment(assignment));
        return;
      }

      mockEventAssignments[assignmentIndex] = {
        ...mockEventAssignments[assignmentIndex],
        ...input,
        id: mockEventAssignments[assignmentIndex].id,
      };
      updated += 1;
      assignments.push(mapAssignment(mockEventAssignments[assignmentIndex]));
    });

    return {
      created,
      updated,
      assignments,
    } satisfies EventAssignmentBulkUpsertResult;
  },
};

export function getAssignmentsForEvent(eventId: string) {
  return mockEventAssignments
    .filter((assignment) => assignment.eventId === eventId)
    .map(mapAssignment)
    .sort(sortAssignmentOverview);
}

function assertNoDuplicate(input: EventAssignmentInput, excludingId?: string) {
  const duplicate = mockEventAssignments.some(
    (assignment) =>
      isSameAssignmentKey(assignment, input) &&
      assignment.id !== excludingId,
  );

  if (duplicate) {
    throw new Error("Duplicate assignment.");
  }
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

function assignmentKey(input: EventAssignmentInput) {
  return [
    input.eventId,
    input.classId,
    input.teacherId,
    input.subject.trim().toLocaleLowerCase("tr"),
  ].join("|");
}

function isSameAssignmentKey(
  assignment: EventAssignmentInput & { id: string },
  input: EventAssignmentInput,
) {
  return assignmentKey(assignment) === assignmentKey(input);
}

function mapAssignment(
  assignment: EventAssignmentInput & { id: string },
): EventAssignmentOverview {
  const teacher = mockTeachers.find(
    (currentTeacher) => currentTeacher.id === assignment.teacherId,
  );
  const schoolClass = mockClasses.find(
    (currentClass) => currentClass.id === assignment.classId,
  );

  if (!teacher || !schoolClass) {
    throw new Error(`Invalid assignment: ${assignment.id}`);
  }

  return {
    id: assignment.id,
    classId: assignment.classId,
    className: schoolClass.name,
    teacher,
    subject: assignment.subject,
    building: assignment.building,
    floor: assignment.floor,
    classroom: assignment.classroom,
    availability: assignment.availability,
  };
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
