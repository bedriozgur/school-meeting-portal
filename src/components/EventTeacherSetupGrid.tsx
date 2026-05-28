import type { ReactNode } from "react";
import { useT } from "../hooks/useT";

export type EditableEventTeacherSetupRow = {
  id: string;
  persistedId: string | null;
  teacherId: string;
  teacherName: string;
  subject: string;
  isAvailable: boolean;
  building: string;
  floor: string;
  classroom: string;
  locationMissing: boolean;
  deleted: boolean;
  baseline: {
    isAvailable: boolean;
    building: string;
    floor: string;
    classroom: string;
    deleted: boolean;
  };
};

type EventTeacherSetupGridProps = {
  rows: EditableEventTeacherSetupRow[];
  isDraft: boolean;
  isSaving: boolean;
  onMarkAllAvailable: () => void;
  onMarkAllUnavailable: () => void;
  onRowChange: (
    rowId: string,
    patch: Partial<
      Pick<
        EditableEventTeacherSetupRow,
        "isAvailable" | "building" | "floor" | "classroom"
      >
    >,
  ) => void;
  onSaveAll: () => void;
  onToggleDelete: (rowId: string) => void;
};

export function EventTeacherSetupGrid({
  rows,
  isDraft,
  isSaving,
  onMarkAllAvailable,
  onMarkAllUnavailable,
  onRowChange,
  onSaveAll,
  onToggleDelete,
}: EventTeacherSetupGridProps) {
  const { t } = useT();
  const hasDirtyRows = rows.some(isRowDirty);

  return (
    <section className="surface p-6 sm:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="label">{t("admin.assignmentsGridEyebrow")}</p>
          <h2 className="text-strong mt-2 text-2xl font-black">
            {t("admin.assignmentsGridTitle")}
          </h2>
          <p className="copy mt-2 max-w-3xl text-sm font-semibold leading-7">
            {t("admin.assignmentsGridDescription")}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row lg:min-w-80 lg:flex-col">
          <button
            className="btn-primary"
            disabled={!isDraft || !hasDirtyRows || isSaving}
            onClick={onSaveAll}
            type="button"
          >
            {isSaving ? t("admin.assignmentsSavingAll") : t("admin.assignmentsSaveAll")}
          </button>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            <button
              className="btn-secondary"
              disabled={!isDraft || isSaving}
              onClick={onMarkAllAvailable}
              type="button"
            >
              {t("admin.assignmentsMarkAllAvailable")}
            </button>
            <button
              className="btn-secondary"
              disabled={!isDraft || isSaving}
              onClick={onMarkAllUnavailable}
              type="button"
            >
              {t("admin.assignmentsMarkAllUnavailable")}
            </button>
          </div>
        </div>
      </div>

      {!isDraft ? (
        <p className="status-warning mt-5 rounded-2xl px-4 py-3 text-sm font-bold">
          {t("admin.assignmentsReadOnlyNotice")}
        </p>
      ) : null}

      <div className="mt-5 overflow-x-auto">
        <table className="min-w-[72rem] w-full border-separate border-spacing-y-3">
          <thead>
            <tr className="text-left">
              <Th>{t("admin.assignmentTeacher")} / {t("admin.assignmentSubject")}</Th>
              <Th>{t("admin.assignmentAvailability")}</Th>
              <Th>{t("dashboard.building")}</Th>
              <Th>{t("dashboard.floor")}</Th>
              <Th>{t("dashboard.classroom")}</Th>
              <Th>{t("admin.assignmentsColumnStatus")}</Th>
              <Th className="text-right">{t("admin.assignmentsColumnActions")}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const dirty = isRowDirty(row);

              return (
                <tr
                  className={[
                    "rounded-2xl border shadow-soft transition",
                    row.deleted
                      ? "bg-red-50/70 opacity-75"
                      : dirty
                        ? "bg-amber-50/60"
                        : "bg-white",
                  ].join(" ")}
                  key={row.id}
                >
                  <Td>
                    <div className="min-w-0">
                      <p className="text-strong text-sm font-black">
                        {row.teacherName}
                      </p>
                      <p className="copy mt-1 text-xs font-semibold">
                        {row.subject || t("admin.masterDataMissingValue")}
                      </p>
                      {row.locationMissing ? (
                        <p className="status-warning mt-2 inline-flex rounded-full px-2 py-1 text-[11px] font-extrabold">
                          {t("admin.assignmentTeacherSetupMissing")}
                        </p>
                      ) : null}
                    </div>
                  </Td>
                  <Td>
                    <label className="inline-flex items-center gap-3 rounded-2xl border border-[color:var(--color-border)] bg-white px-3 py-2 text-sm font-extrabold">
                      <input
                        checked={row.isAvailable}
                        className="h-5 w-5 [accent-color:var(--color-primary)]"
                        disabled={!isDraft || row.deleted || isSaving}
                        onChange={(event) =>
                          onRowChange(row.id, {
                            isAvailable: event.target.checked,
                          })
                        }
                        type="checkbox"
                      />
                      {row.isAvailable ? t("dashboard.available") : t("dashboard.busy")}
                    </label>
                  </Td>
                  <Td>
                    <input
                      className="input min-h-12"
                      disabled={!isDraft || row.deleted || isSaving}
                      onChange={(event) =>
                        onRowChange(row.id, { building: event.target.value })
                      }
                      value={row.building}
                    />
                  </Td>
                  <Td>
                    <input
                      className="input min-h-12"
                      disabled={!isDraft || row.deleted || isSaving}
                      onChange={(event) =>
                        onRowChange(row.id, { floor: event.target.value })
                      }
                      type="number"
                      value={row.floor}
                    />
                  </Td>
                  <Td>
                    <input
                      className="input min-h-12"
                      disabled={!isDraft || row.deleted || isSaving}
                      onChange={(event) =>
                        onRowChange(row.id, { classroom: event.target.value })
                      }
                      value={row.classroom}
                    />
                  </Td>
                  <Td>
                    <div className="space-y-2">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-extrabold ${
                          row.deleted
                            ? "status-danger"
                            : dirty
                              ? "status-warning"
                              : row.locationMissing
                                ? "status-warning"
                                : "status-success"
                        }`}
                      >
                        {row.deleted
                          ? t("admin.assignmentsRowMarkedForDelete")
                          : dirty
                            ? t("admin.assignmentsRowUnsaved")
                            : row.locationMissing
                              ? t("admin.assignmentTeacherSetupMissing")
                              : t("admin.assignmentTeacherSetupComplete")}
                      </span>
                      {!row.deleted && row.locationMissing ? (
                        <p className="copy text-xs font-semibold">
                          {t("admin.assignmentTeacherSetupMissingHint")}
                        </p>
                      ) : null}
                    </div>
                  </Td>
                  <Td className="text-right">
                    <button
                      className={`btn-secondary min-h-10 px-3 py-2 text-xs ${
                        row.deleted
                          ? "border-[color:var(--color-primary)] text-[color:var(--color-primary)]"
                          : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                      }`}
                      disabled={!isDraft || isSaving}
                      onClick={() => onToggleDelete(row.id)}
                      type="button"
                    >
                      {row.deleted
                        ? t("admin.assignmentsUndoRemove")
                        : t("admin.assignmentsRemove")}
                    </button>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {rows.length === 0 ? (
        <p className="copy mt-4 text-sm font-semibold">
          {t("admin.assignmentsGridEmpty")}
        </p>
      ) : null}
    </section>
  );
}

function isRowDirty(row: EditableEventTeacherSetupRow) {
  return (
    row.isAvailable !== row.baseline.isAvailable ||
    row.building !== row.baseline.building ||
    row.floor !== row.baseline.floor ||
    row.classroom !== row.baseline.classroom ||
    row.deleted !== row.baseline.deleted
  );
}

function Th({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <th className={`label px-3 pb-2 text-[10px] ${className}`}>{children}</th>
  );
}

function Td({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <td className={`px-3 py-3 align-top ${className}`}>{children}</td>
  );
}
