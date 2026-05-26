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

    return left.classroom.localeCompare(right.classroom, "tr", {
      numeric: true,
    });
  });
}
