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
) {
  return [...assignments].sort((left, right) => {
    const leftCompleted = teacherState[left.id]?.visited ?? false;
    const rightCompleted = teacherState[right.id]?.visited ?? false;

    if (leftCompleted !== rightCompleted) {
      return leftCompleted ? 1 : -1;
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
