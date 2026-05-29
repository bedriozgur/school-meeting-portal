import type { TeacherAssignment } from "../domain/models";

export function sortTeacherAssignments(
  assignments: TeacherAssignment[],
): TeacherAssignment[] {
  return [...assignments].sort((left, right) => {
    const building = left.building.localeCompare(right.building, "tr");

    if (building !== 0) {
      return building;
    }

    if (left.floor !== right.floor) {
      return left.floor - right.floor;
    }

    const classroom = left.classroom.localeCompare(right.classroom, "tr", {
      numeric: true,
    });

    if (classroom !== 0) {
      return classroom;
    }

    const subject = left.subject.localeCompare(right.subject, "tr");

    if (subject !== 0) {
      return subject;
    }

    return left.id.localeCompare(right.id, "tr");
  });
}

export function sortTeacherAssignmentsWithCompletion(
  assignments: TeacherAssignment[],
  teacherState: Record<string, { visited?: boolean } | undefined>,
  recentlyCompletedIds: Set<string> = new Set(),
) {
  return [...assignments].sort((left, right) => {
    const leftCompleted = teacherState[left.id]?.visited ?? false;
    const rightCompleted = teacherState[right.id]?.visited ?? false;
    const leftSettling = leftCompleted && recentlyCompletedIds.has(left.id);
    const rightSettling = rightCompleted && recentlyCompletedIds.has(right.id);
    const leftGroup = getCompletionGroup(left, leftCompleted, leftSettling);
    const rightGroup = getCompletionGroup(right, rightCompleted, rightSettling);

    if (leftGroup !== rightGroup) {
      return leftGroup - rightGroup;
    }

    const building = left.building.localeCompare(right.building, "tr");

    if (building !== 0) {
      return building;
    }

    if (left.floor !== right.floor) {
      return left.floor - right.floor;
    }

    const classroom = left.classroom.localeCompare(right.classroom, "tr", {
      numeric: true,
    });

    if (classroom !== 0) {
      return classroom;
    }

    const subject = left.subject.localeCompare(right.subject, "tr");

    if (subject !== 0) {
      return subject;
    }

    return left.id.localeCompare(right.id, "tr");
  });
}

export function formatFloorLabel(floor: number) {
  if (floor === 0) {
    return "Zemin Kat";
  }

  if (floor === 1) {
    return "Kat 1";
  }

  return `Kat ${floor}`;
}

function getCompletionGroup(
  assignment: TeacherAssignment,
  completed: boolean,
  settling: boolean,
) {
  if (settling) {
    return isUnavailable(assignment) ? 1 : 0;
  }

  if (completed) {
    return 2;
  }

  return isUnavailable(assignment) ? 1 : 0;
}

function isUnavailable(assignment: TeacherAssignment) {
  return assignment.availability !== "available";
}
