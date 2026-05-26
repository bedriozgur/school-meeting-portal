import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../auth/useAuth";
import type { EventReadinessCode } from "../domain/models";
import { useT } from "../hooks/useT";
import type { TranslationKey } from "../i18n/i18n";
import { usePilotReadiness } from "../features/pilot/usePilotReadiness";

const readinessKeys: Record<EventReadinessCode, TranslationKey> = {
  noIncludedClasses: "admin.readiness.errorNoIncludedClasses",
  classMissingAssignment: "admin.readiness.errorClassMissingAssignment",
  assignmentMissingTeacher: "admin.readiness.errorAssignmentMissingTeacher",
  assignmentMissingSubject: "admin.readiness.errorAssignmentMissingSubject",
  assignmentMissingBuilding: "admin.readiness.errorAssignmentMissingBuilding",
  assignmentMissingFloor: "admin.readiness.errorAssignmentMissingFloor",
  assignmentMissingClassroom: "admin.readiness.errorAssignmentMissingClassroom",
  assignmentInactiveTeacher: "admin.readiness.errorAssignmentInactiveTeacher",
  includedClassInactive: "admin.readiness.errorIncludedClassInactive",
  unavailableTeachers: "admin.readiness.warningUnavailableTeachers",
  classOnlyOneAssignment: "admin.readiness.warningClassOnlyOneAssignment",
  eventNoClassTeacher: "admin.readiness.warningEventNoClassTeacher",
};

export function AdminPilotChecklistPage() {
  const { t } = useT();
  const { hasAdminClaim, isAllowlistedAdmin } = useAuth();
  const { status, data } = usePilotReadiness();

  if (status === "loading") {
    return (
      <section className="surface p-6 sm:p-8">
        <p className="text-strong text-lg font-extrabold">
          {t("admin.pilotChecklistLoading")}
        </p>
      </section>
    );
  }

  if (status === "error" || !data) {
    return (
      <section className="surface p-6 sm:p-8">
        <p className="status-danger rounded-2xl px-4 py-3 text-sm font-bold">
          {t("admin.pilotChecklistLoadError")}
        </p>
      </section>
    );
  }

  const hasMockWarning = data.dataSource === "mock";
  const hasNoActiveEventsWarning = data.activeEventsCount === 0;
  const hasDraftReadinessErrors = data.activeDraftReadiness.some(
    (item) => item.event.status === "draft" && !item.readiness.isReady,
  );

  return (
    <div className="space-y-5">
      <section className="surface p-6 sm:p-8">
        <p className="label">{t("admin.pilotChecklistEyebrow")}</p>
        <h1 className="heading mt-3 font-display text-4xl font-black">
          {t("admin.pilotChecklistTitle")}
        </h1>
        <p className="copy mt-3 max-w-3xl text-base font-semibold leading-7">
          {t("admin.pilotChecklistDescription")}
        </p>
      </section>

      {hasMockWarning ? (
        <ChecklistNotice title={t("admin.pilotChecklistMockModeTitle")}>
          {t("admin.pilotChecklistMockModeDescription")}
        </ChecklistNotice>
      ) : null}

      {!data.staffPortalConfigured ? (
        <ChecklistNotice title={t("admin.pilotChecklistStaffTitle")}>
          {t("admin.pilotChecklistStaffWarning")}
        </ChecklistNotice>
      ) : null}

      {hasNoActiveEventsWarning ? (
        <ChecklistNotice title={t("admin.pilotChecklistActiveEventsTitle")}>
          {t("admin.pilotChecklistNoActiveEventsWarning")}
        </ChecklistNotice>
      ) : null}

      {hasDraftReadinessErrors ? (
        <ChecklistNotice title={t("admin.pilotChecklistReadinessTitle")}>
          {t("admin.pilotChecklistDraftReadinessWarning")}
        </ChecklistNotice>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <StatusCard
          description={
            data.firebaseConfigured
              ? t("admin.pilotChecklistFirebaseConfigured")
              : t("admin.pilotChecklistFirebaseMissing")
          }
          label={t("admin.pilotChecklistFirebaseLabel")}
          tone={data.firebaseConfigured ? "success" : "warning"}
        />
        <StatusCard
          description={
            data.dataSource === "mock"
              ? t("admin.pilotChecklistDataSourceMock")
              : t("admin.pilotChecklistDataSourceFirestore")
          }
          label={t("admin.pilotChecklistDataSourceLabel")}
          tone={data.dataSource === "mock" ? "warning" : "success"}
        />
        <StatusCard
          description={t("admin.pilotChecklistAdminAuthDescription")}
          label={t("admin.pilotChecklistAdminAuthLabel")}
          tone={isAllowlistedAdmin || hasAdminClaim ? "success" : "warning"}
        />
        <StatusCard
          description={
            data.activeEventsCount > 0
              ? `${data.activeEventsCount} ${t("admin.pilotChecklistActiveEventsFound")}`
              : t("admin.pilotChecklistNoActiveEventsValue")
          }
          label={t("admin.pilotChecklistActiveEventsLabel")}
          tone={data.activeEventsCount > 0 ? "success" : "warning"}
        />
        <StatusCard
          description={t("admin.pilotChecklistImportsAvailable")}
          label={t("admin.pilotChecklistImportsLabel")}
          tone="success"
          action={
            <Link className="btn-secondary" to="/admin/import">
              {t("admin.pilotChecklistOpen")}
            </Link>
          }
        />
        <StatusCard
          description={t("admin.pilotChecklistQrAvailable")}
          label={t("admin.pilotChecklistQrLabel")}
          tone="success"
          action={
            <Link className="btn-secondary" to="/admin/qr">
              {t("admin.pilotChecklistOpen")}
            </Link>
          }
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={t("admin.pilotChecklistTeachersCount")} value={data.teachersCount} />
        <MetricCard label={t("admin.pilotChecklistClassesCount")} value={data.classesCount} />
        <MetricCard label={t("admin.pilotChecklistStudentsCount")} value={data.studentsCount} />
        <MetricCard label={t("admin.pilotChecklistAssignmentsCount")} value={data.assignmentsCount} />
      </section>

      <section className="surface space-y-4 p-6 sm:p-8">
        <div>
          <p className="label">{t("admin.pilotChecklistEventReadinessEyebrow")}</p>
          <h2 className="text-strong mt-2 text-2xl font-black">
            {t("admin.pilotChecklistEventReadinessTitle")}
          </h2>
        </div>

        <div className="grid gap-4">
          {data.activeDraftReadiness.length > 0 ? (
            data.activeDraftReadiness.map(({ event, readiness }) => (
              <article
                className={`rounded-3xl border bg-white p-4 ${
                  readiness.isReady
                    ? "border-[var(--color-border)]"
                    : "border-[color-mix(in_srgb,var(--color-warning)_55%,var(--color-border))]"
                }`}
                key={event.id}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-strong text-lg font-black">{event.title}</p>
                    <p className="copy mt-1 text-sm font-semibold">
                      {event.code} · {event.date} · {event.startTime} - {event.endTime}
                    </p>
                  </div>
                  <span
                    className={`w-fit rounded-full px-3 py-1 text-xs font-extrabold ${
                      readiness.isReady ? "status-success" : "status-warning"
                    }`}
                  >
                    {readiness.isReady
                      ? t("admin.pilotChecklistReady")
                      : t("admin.pilotChecklistNeedsAttention")}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  <ReadinessList
                    emptyText={t("admin.pilotChecklistNoErrors")}
                    items={readiness.errors}
                    title={t("admin.pilotChecklistErrorsTitle")}
                    tone="error"
                  />
                  <ReadinessList
                    emptyText={t("admin.pilotChecklistNoWarnings")}
                    items={readiness.warnings}
                    title={t("admin.pilotChecklistWarningsTitle")}
                    tone="warning"
                  />
                </div>
              </article>
            ))
          ) : (
            <p className="copy text-sm font-semibold">{t("admin.pilotChecklistNoEvents")}</p>
          )}
        </div>
      </section>
    </div>
  );
}

function StatusCard({
  label,
  description,
  tone,
  action,
}: {
  label: string;
  description: string;
  tone: "success" | "warning";
  action?: React.ReactNode;
}) {
  return (
    <article
      className={`surface flex flex-col justify-between gap-4 p-5 ${
        tone === "warning" ? "ring-1 ring-[color-mix(in_srgb,var(--color-warning)_30%,transparent)]" : ""
      }`}
    >
      <div>
        <p className="label">{label}</p>
        <p className="text-strong mt-2 text-lg font-black">{description}</p>
      </div>
      {action ? <div className="flex justify-start">{action}</div> : null}
    </article>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="soft-panel rounded-3xl p-5">
      <p className="label">{label}</p>
      <p className="text-strong mt-3 text-4xl font-black">{value}</p>
    </article>
  );
}

function ChecklistNotice({
  title,
  children,
}: {
  title: string;
  children: string;
}) {
  return (
    <section className="status-warning rounded-3xl px-5 py-4">
      <p className="text-sm font-black">{title}</p>
      <p className="mt-2 text-sm font-semibold leading-6">{children}</p>
    </section>
  );
}

function ReadinessList({
  items,
  title,
  emptyText,
  tone,
}: {
  items: { code: EventReadinessCode; detail?: string }[];
  title: string;
  emptyText: string;
  tone: "error" | "warning";
}) {
  const { t } = useT();

  return (
    <div
      className={`rounded-3xl border bg-white p-4 ${
        tone === "error"
          ? "border-[color-mix(in_srgb,var(--color-danger)_35%,var(--color-border))]"
          : "border-[color-mix(in_srgb,var(--color-warning)_35%,var(--color-border))]"
      }`}
    >
      <p className="text-strong text-sm font-black">{title}</p>
      {items.length === 0 ? (
        <p className="copy mt-2 text-sm font-semibold">{emptyText}</p>
      ) : (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm font-semibold">
          {items.map((item, index) => (
            <li key={`${item.code}-${item.detail ?? ""}-${index}`}>
              {t(readinessKeys[item.code])}
              {item.detail ? `: ${item.detail}` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
