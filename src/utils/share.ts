import type { ParentMeetingView } from "../domain/models";
import { translate, type Language } from "../i18n/i18n";
import type { useSessionStore } from "../store/sessionStore";
import { formatFloorLabel, sortTeacherAssignments } from "./teachers";

type TeacherState = ReturnType<typeof useSessionStore.getState>["teacherState"];

type ParentMeetingReport = {
  subject: string;
  body: string;
};

export function buildParentMeetingReport(params: {
  language: Language;
  parentMeetingView: ParentMeetingView;
  teacherState: TeacherState;
}): ParentMeetingReport {
  const { language, parentMeetingView, teacherState } = params;
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const { meetingEvent, student, school, classTeacher, teacherAssignments } =
    parentMeetingView;
  const meetingName = meetingEvent.title.trim() || t("summary.meetingNotes");
  const subject = `${school.name} - ${meetingName}`;
  const visitedAssignments = sortTeacherAssignments(teacherAssignments).filter(
    (assignment) => teacherState[assignment.id]?.visited,
  );
  const notVisitedAssignments = sortTeacherAssignments(teacherAssignments).filter(
    (assignment) => !teacherState[assignment.id]?.visited,
  );

  const lines = [
    school.name,
    meetingName,
    "",
    `${t("summary.meetingCode")}: ${meetingEvent.code}`,
    `${t("summary.student")}: ${student.name}`,
    `${t("summary.schoolNumber")}: ${student.schoolNumber}`,
    `${t("summary.class")}: ${student.className}`,
    `${t("summary.classTeacher")}: ${classTeacher?.name ?? t("dashboard.unknownClass")}`,
    "",
    "────────────────────────",
    "",
    `${t("summary.visitedTeachers")} (${visitedAssignments.length})`,
    "",
    ...renderTeacherSection(visitedAssignments, teacherState, t),
    "────────────────────────",
    "",
    `${t("summary.notVisitedTeachers")} (${notVisitedAssignments.length})`,
    "",
    ...renderTeacherSection(notVisitedAssignments, teacherState, t),
  ];

  return {
    subject,
    body: lines.join("\n"),
  };
}

export function buildNotesSummary(params: {
  language: Language;
  parentMeetingView: ParentMeetingView;
  teacherState: TeacherState;
}): string {
  return buildParentMeetingReport(params).body;
}

function renderTeacherSection(
  assignments: ParentMeetingView["teacherAssignments"],
  teacherState: TeacherState,
  t: (key: Parameters<typeof translate>[1]) => string,
) {
  return assignments.flatMap((assignment) => {
    const state = teacherState[assignment.id];
    const notes = state?.notes.trim() || t("summary.noNotes");
    const location = assignment.locationMissing
      ? t("summary.locationMissing")
      : `${assignment.building} · ${formatFloorLabel(assignment.floor)} · ${assignment.classroom}`;
    const visited = state?.visited ? t("summary.yes") : t("summary.no");

    return [
      "────────────────────────",
      "",
      `${assignment.teacher.name} — ${assignment.subject || t("admin.masterDataMissingValue")}`,
      "",
      location,
      "",
      `${t("summary.visitedState")}: ${visited}`,
      `${t("summary.notesLabel")}:`,
      notes,
      "",
    ];
  });
}
