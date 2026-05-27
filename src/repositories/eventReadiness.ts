import type {
  EventReadiness,
  EventReadinessCode,
  EventReadinessItem,
  EventTeacherSetup,
  MeetingEvent,
  SchoolClass,
  Teacher,
  TeachingAssignment,
} from "../domain/models";
import { resolveTeachingAssignmentSubject } from "../utils/teachingAssignments";

export function buildEventReadiness(params: {
  event: MeetingEvent | null;
  classes: SchoolClass[];
  teachers: Teacher[];
  teachingAssignments: TeachingAssignment[];
  eventTeacherSetups: EventTeacherSetup[];
}): EventReadiness {
  const { event, classes, teachers, teachingAssignments, eventTeacherSetups } =
    params;
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
  const teacherById = new Map(teachers.map((teacher) => [teacher.id, teacher]));
  const activeAssignments = teachingAssignments.filter(
    (assignment) => assignment.isActive,
  );
  const assignmentsByClass = new Map<string, TeachingAssignment[]>();
  const teachersInEvent = new Set<string>();

  activeAssignments.forEach((assignment) => {
    teachersInEvent.add(assignment.teacherId);
    assignmentsByClass.set(assignment.classId, [
      ...(assignmentsByClass.get(assignment.classId) ?? []),
      assignment,
    ]);

    const teacher = teacherById.get(assignment.teacherId);

    if (!teacher) {
      addItem(errors, "teachingAssignmentMissingTeacher", assignment.subject);
      return;
    }

    const resolvedSubject = resolveTeachingAssignmentSubject({
      assignment,
      teacher,
    });

    if (!resolvedSubject.trim()) {
      addItem(errors, "teachingAssignmentMissingSubject", teacher.name);
    }

    if (teacher.isActive === false) {
      addItem(errors, "teachingAssignmentInactiveTeacher", teacher.name);
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
      addItem(errors, "classMissingTeachingAssignment", className);
    }

    if (classAssignments.length === 1) {
      addItem(warnings, "classOnlyOneTeachingAssignment", className);
    }
  });

  const setupByTeacherId = new Map(
    eventTeacherSetups
      .filter((setup) => setup.eventId === event.id)
      .map((setup) => [setup.teacherId, setup] as const),
  );

  for (const teacherId of teachersInEvent) {
    const teacher = teacherById.get(teacherId);
    const setup = setupByTeacherId.get(teacherId);

    if (!setup) {
      addItem(errors, "eventTeacherSetupMissing", teacher?.name ?? teacherId);
      continue;
    }

    if (!setup.building.trim()) {
      addItem(errors, "eventTeacherSetupMissingBuilding", teacher?.name ?? teacherId);
    }

    if (!Number.isFinite(setup.floor)) {
      addItem(errors, "eventTeacherSetupMissingFloor", teacher?.name ?? teacherId);
    }

    if (!setup.classroom.trim()) {
      addItem(errors, "eventTeacherSetupMissingClassroom", teacher?.name ?? teacherId);
    }

    if (setup.isAvailable === false) {
      addItem(warnings, "unavailableTeachers", teacher?.name ?? teacherId);
    }
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
