import type { TeacherAssignment } from "../domain/models";
import { useT } from "../hooks/useT";
import { useSessionStore } from "../store/sessionStore";
import { formatFloorLabel } from "../utils/teachers";

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
  const floorLabel = formatFloorLabel(assignment.floor);
  const isUnavailable = assignment.availability !== "available";
  const titleClassName = completed
    ? "text-[color:var(--color-muted-text)]"
    : "text-strong";
  const locationClassName = completed
    ? "copy text-[12px] font-medium sm:text-[13px]"
    : "copy text-[13px] font-semibold sm:text-sm";

  return (
    <article
      className={`surface max-w-full overflow-hidden p-3 transition-all duration-200 sm:p-4 ${
        completed ? "border-dashed opacity-70 shadow-none" : ""
      }`}
      style={
        completed
          ? {
              background:
                "color-mix(in srgb, var(--color-border) 36%, var(--color-surface))",
            }
          : undefined
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <label className="mt-0.5 flex shrink-0 items-center">
            <input
              aria-label={t("dashboard.visited")}
              checked={visited}
              className="h-5 w-5 shrink-0 [accent-color:var(--color-primary)]"
              onChange={(event) =>
                setTeacherVisited(assignment.id, event.target.checked)
              }
              type="checkbox"
            />
          </label>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <h3
                className={`${titleClassName} break-words text-base font-extrabold leading-tight sm:text-[1.05rem]`}
              >
                {assignment.teacher.name}
              </h3>
              <span className="text-[color:var(--color-muted-text)]">—</span>
              <p
                className={`${titleClassName} break-words text-base font-extrabold leading-tight sm:text-[1.05rem]`}
              >
                {assignment.subject || t("admin.masterDataMissingValue")}
              </p>
            </div>
            <p className={`${locationClassName} mt-1 break-words leading-snug`}>
              {assignment.building || t("admin.masterDataMissingValue")}
              {" · "}
              {floorLabel}
              {" · "}
              {assignment.classroom || t("admin.masterDataMissingValue")}
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1">
            {isUnavailable ? (
              <span
                className={`max-w-full rounded-full border border-[color:var(--color-border)] px-2 py-1 text-[10px] font-extrabold leading-tight ${
                  completed
                    ? "bg-white/70 text-[color:var(--color-muted-text)]"
                    : "bg-white/80 text-[color:var(--color-muted-text)]"
                }`}
              >
                {t("dashboard.unavailable")}
              </span>
            ) : null}
            {completed ? (
              <span className="status-success max-w-full rounded-full px-3 py-1.5 text-xs font-black leading-tight tracking-[0.08em] shadow-sm">
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

        <label className="block">
          <span className="sr-only">{t("dashboard.notes")}</span>
          <textarea
            className="input min-h-14 resize-y text-base leading-6"
            rows={2}
            onChange={(event) =>
              setTeacherNotes(assignment.id, event.target.value)
            }
            placeholder={t("dashboard.notesPlaceholder")}
            value={notes}
          />
        </label>
      </div>
    </article>
  );
}
