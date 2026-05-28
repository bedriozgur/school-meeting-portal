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

  return (
    <article
      className={`surface p-5 transition ${
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
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-strong truncate text-lg font-extrabold sm:text-xl">
              {assignment.teacher.name}
              <span className="mx-2 text-[color:var(--color-muted-text)]">—</span>
              <span className="text-strong">{assignment.subject || t("admin.masterDataMissingValue")}</span>
            </h3>
            <p className="copy mt-2 text-sm font-semibold sm:text-base">
              {assignment.building || t("admin.masterDataMissingValue")}
              {" · "}
              {floorLabel}
              {" · "}
              {assignment.classroom || t("admin.masterDataMissingValue")}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {assignment.availability === "available" ? null : (
              <span
                className={`rounded-full px-3 py-1 text-xs font-extrabold ${availabilityClasses[assignment.availability]}`}
              >
                {t("dashboard.unavailable")}
              </span>
            )}
            {completed ? (
              <span className="status-success rounded-full px-3 py-1 text-xs font-extrabold">
                {t("dashboard.completed")}
              </span>
            ) : null}
          </div>
        </div>

        {assignment.locationMissing ? (
          <p className="status-warning rounded-2xl px-4 py-3 text-sm font-bold">
            {t("dashboard.locationMissing")}
          </p>
        ) : null}

        {assignment.subjectMissing ? (
          <p className="status-warning rounded-2xl px-4 py-3 text-sm font-bold">
            {t("dashboard.subjectMissing")}
          </p>
        ) : null}

        <label className="flex min-h-12 items-center gap-3 rounded-2xl border bg-white px-4 py-3 text-base font-extrabold [border-color:var(--color-border)]">
          <input
            checked={visited}
            className="h-5 w-5 shrink-0 [accent-color:var(--color-primary)]"
            onChange={(event) =>
              setTeacherVisited(assignment.id, event.target.checked)
            }
            type="checkbox"
          />
          {t("dashboard.visited")}
        </label>

        <label className="block">
          <span className="label">{t("dashboard.notes")}</span>
          <textarea
            className="input mt-2 min-h-20 resize-y text-sm"
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

function formatFloor(floor: number) {
  if (floor === 0) {
    return "Zemin Kat";
  }

  if (floor === 1) {
    return "Kat 1";
  }

  return `Kat ${floor}`;
}
