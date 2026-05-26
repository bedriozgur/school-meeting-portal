import type {
  EventAssignmentOverview,
  EventReadiness,
  EventReadinessCode,
  EventReadinessItem,
  MeetingEvent,
  SchoolClass,
} from "../domain/models";

export function buildEventReadiness(params: {
  event: MeetingEvent | null;
  classes: SchoolClass[];
  assignments: EventAssignmentOverview[];
}): EventReadiness {
  const { event, classes, assignments } = params;
  const errors: EventReadinessItem[] = [];
  const warnings: EventReadinessItem[] = [];

  if (!event || event.includedClasses.length === 0) {
    addItem(errors, "noIncludedClasses");
    return {
      isReady: false,
      errors,
      warnings,
    };
  }

  const classById = new Map(classes.map((schoolClass) => [schoolClass.id, schoolClass]));
  const assignmentsByClass = new Map<string, EventAssignmentOverview[]>();

  assignments.forEach((assignment) => {
    assignmentsByClass.set(assignment.classId, [
      ...(assignmentsByClass.get(assignment.classId) ?? []),
      assignment,
    ]);

    if (!assignment.teacher.id) {
      addItem(errors, "assignmentMissingTeacher", assignment.subject);
    }

    if (!assignment.subject.trim()) {
      addItem(errors, "assignmentMissingSubject", assignment.teacher.name);
    }

    if (!assignment.building.trim()) {
      addItem(errors, "assignmentMissingBuilding", assignment.teacher.name);
    }

    if (!Number.isFinite(assignment.floor)) {
      addItem(errors, "assignmentMissingFloor", assignment.teacher.name);
    }

    if (!assignment.classroom.trim()) {
      addItem(errors, "assignmentMissingClassroom", assignment.teacher.name);
    }

    if (assignment.teacher.isActive === false) {
      addItem(errors, "assignmentInactiveTeacher", assignment.teacher.name);
    }
  });

  event.includedClasses.forEach((classId) => {
    const schoolClass = classById.get(classId);
    const className =
      schoolClass?.name ??
      event.includedClassNames[event.includedClasses.indexOf(classId)] ??
      classId;
    const classAssignments = assignmentsByClass.get(classId) ?? [];

    if (schoolClass?.isActive === false) {
      addItem(errors, "includedClassInactive", className);
    }

    if (classAssignments.length === 0) {
      addItem(errors, "classMissingAssignment", className);
    }

    if (classAssignments.length === 1) {
      addItem(warnings, "classOnlyOneAssignment", className);
    }

    if (!schoolClass?.classTeacherId) {
      addItem(warnings, "eventNoClassTeacher", className);
    }
  });

  if (assignments.some((assignment) => assignment.availability === "busy")) {
    addItem(warnings, "unavailableTeachers");
  }

  return {
    isReady: errors.length === 0,
    errors,
    warnings,
  };
}

function addItem(
  items: EventReadinessItem[],
  code: EventReadinessCode,
  detail?: string,
) {
  items.push({ code, detail });
}
