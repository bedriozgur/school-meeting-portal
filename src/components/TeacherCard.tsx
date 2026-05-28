import { useEffect, useState } from "react";
import type { TeacherAssignment } from "../domain/models";
import { useT } from "../hooks/useT";
import { useSessionStore } from "../store/sessionStore";

const availabilityClasses = {
  available: "status-success",
  busy: "status-danger",
  limited: "status-warning",
} as const;

type TeacherCardProps = {
  assignment: TeacherAssignment;
};

export function TeacherCard({ assignment }: TeacherCardProps) {
  const { t } = useT();
  const visited = useSessionStore(
    (store) => store.teacherState[assignment.id]?.visited ?? false,
  );
  const notes = useSessionStore(
    (store) => store.teacherState[assignment.id]?.notes ?? "",
  );
  const setTeacherVisited = useSessionStore((store) => store.setTeacherVisited);
  const setTeacherNotes = useSessionStore((store) => store.setTeacherNotes);
  const completed = visited;
  const floorLabel = formatFloor(assignment.floor);
  const [notesOpen, setNotesOpen] = useState(notes.trim().length > 0);

  useEffect(() => {
    if (notes.trim().length > 0) {
      setNotesOpen(true);
    }
  }, [notes]);

  return (
    <article
      className={`surface max-w-full overflow-hidden p-3 transition sm:p-4 ${
        completed ? "border-dashed opacity-90 shadow-none" : ""
      }`}
      style={
        completed
          ? {
              background:
                "color-mix(in srgb, var(--color-border) 20%, var(--color-surface))",
            }
          : undefined
      }
    >
      <div className="flex flex-col gap-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-strong break-words text-[15px] font-extrabold leading-tight sm:text-base">
              {assignment.teacher.name}
              <span className="mx-1 text-[color:var(--color-muted-text)]">—</span>
              <span className="text-strong">
                {assignment.subject || t("admin.masterDataMissingValue")}
              </span>
            </h3>
            <p className="copy mt-1 break-words text-xs font-semibold leading-snug sm:text-sm">
              {assignment.building || t("admin.masterDataMissingValue")}
              {" · "}
              {floorLabel}
              {" · "}
              {assignment.classroom || t("admin.masterDataMissingValue")}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {assignment.availability === "available" ? null : (
              <span
                className={`max-w-full rounded-full px-2 py-1 text-[10px] font-extrabold leading-tight ${availabilityClasses[assignment.availability]}`}
              >
                {t("dashboard.unavailable")}
              </span>
            )}
            {completed ? (
              <span className="status-success max-w-full rounded-full px-2 py-1 text-[10px] font-extrabold leading-tight">
                {t("dashboard.completed")}
              </span>
            ) : null}
          </div>
        </div>

        {assignment.locationMissing ? (
          <p className="status-warning rounded-2xl px-3 py-2 text-xs font-bold leading-snug">
            {t("dashboard.locationMissing")}
          </p>
        ) : null}

        {assignment.subjectMissing ? (
          <p className="status-warning rounded-2xl px-3 py-2 text-xs font-bold leading-snug">
            {t("dashboard.subjectMissing")}
          </p>
        ) : null}

        <label className="flex min-h-10 items-center gap-2 rounded-2xl border bg-white px-3 py-2 text-sm font-extrabold [border-color:var(--color-border)]">
          <input
            checked={visited}
            className="h-4 w-4 shrink-0 [accent-color:var(--color-primary)]"
            onChange={(event) =>
              setTeacherVisited(assignment.id, event.target.checked)
            }
            type="checkbox"
          />
          {t("dashboard.visited")}
        </label>

        <details
          className="rounded-2xl border bg-white [border-color:var(--color-border)]"
          open={notesOpen}
          onToggle={(event) =>
            setNotesOpen((event.currentTarget as HTMLDetailsElement).open)
          }
        >
          <summary className="cursor-pointer list-none px-3 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-[color:var(--color-muted-text)]">
            {t("dashboard.notes")}
          </summary>
          <div className="px-3 pb-3">
            <textarea
              className="input min-h-16 resize-y text-sm"
              onChange={(event) =>
                setTeacherNotes(assignment.id, event.target.value)
              }
              placeholder={t("dashboard.notesPlaceholder")}
              value={notes}
            />
          </div>
        </details>
      </div>
    </article>
  );
}

function formatFloor(floor: number) {
  if (floor === 0) {
    return "Zemin Kat";
  }

  if (floor === 1) {
    return "Kat 1";
  }

  return `Kat ${floor}`;
}
