import type { TeacherAssignment } from "../domain/models";
import { useT } from "../hooks/useT";
import { useSessionStore } from "../store/sessionStore";

const availabilityKeys = {
  available: "dashboard.available",
  busy: "dashboard.busy",
  limited: "dashboard.limited",
} as const;

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

  return (
    <article className="surface p-5">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-strong text-xl font-extrabold">
              {assignment.teacher.name}
            </h3>
            <p className="copy mt-1 text-base font-bold">
              {assignment.subject || t("admin.masterDataMissingValue")}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-extrabold ${availabilityClasses[assignment.availability]}`}
          >
            {t(availabilityKeys[assignment.availability])}
          </span>
        </div>

        <dl className="grid grid-cols-3 gap-2 text-sm">
          <div className="soft-panel rounded-2xl p-3">
            <dt className="copy font-extrabold">
              {t("dashboard.building")}
            </dt>
            <dd className="mt-1 text-lg font-black">{assignment.building}</dd>
          </div>
          <div className="soft-panel rounded-2xl p-3">
            <dt className="copy font-extrabold">
              {t("dashboard.floor")}
            </dt>
            <dd className="mt-1 text-lg font-black">{assignment.floor}</dd>
          </div>
          <div className="soft-panel rounded-2xl p-3">
            <dt className="copy font-extrabold">
              {t("dashboard.classroom")}
            </dt>
            <dd className="mt-1 text-lg font-black">{assignment.classroom}</dd>
          </div>
        </dl>

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
            className="h-6 w-6 [accent-color:var(--color-primary)]"
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
            className="input mt-2 min-h-28 resize-y"
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
