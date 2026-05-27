import type { ParentMeetingView } from "../domain/models";
import { translate, type Language } from "../i18n/i18n";
import type { useSessionStore } from "../store/sessionStore";
import { sortTeacherAssignments } from "./teachers";

type TeacherState = ReturnType<typeof useSessionStore.getState>["teacherState"];

export function buildNotesSummary(params: {
  language: Language;
  parentMeetingView: ParentMeetingView;
  teacherState: TeacherState;
}): string {
  const { language, parentMeetingView, teacherState } = params;
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const { meetingEvent, student } = parentMeetingView;
  const lines = [
    t("summary.header"),
    `${t("summary.meetingCode")}: ${meetingEvent.code}`,
    `${t("summary.schoolNumber")}: ${student.schoolNumber}`,
    `${t("dashboard.studentName")}: ${student.name}`,
    `${t("dashboard.className")}: ${student.className}`,
    "",
  ];

  for (const assignment of sortTeacherAssignments(
    parentMeetingView.teacherAssignments,
  )) {
    const state = teacherState[assignment.id];
    const status = state?.visited
      ? t("summary.visited")
      : t("summary.notVisited");
    const notes = state?.notes.trim() || t("summary.noNotes");
    const location = assignment.locationMissing
      ? t("summary.locationMissing")
      : `${assignment.building}/${assignment.floor}/${assignment.classroom}`;

    lines.push(
      `${assignment.teacher.name} - ${
        assignment.subject || t("admin.masterDataMissingValue")
      } - ${location}`,
      `${status}: ${notes}`,
      "",
    );
  }

  return lines.join("\n");
}
