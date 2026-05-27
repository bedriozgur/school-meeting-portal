import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { useT } from "../hooks/useT";
import { usePilotReadinessSummary } from "../features/pilot/usePilotReadiness";
import { useAdminSchoolStore } from "../store/adminSchoolStore";

export function AdminDashboardPage() {
  const { signOut, user } = useAuth();
  const { t } = useT();
  const { currentSchoolId, hasHydrated } = useAdminSchoolStore();
  const { status, data } = usePilotReadinessSummary(currentSchoolId, hasHydrated);

  const summary = status === "ready" && data
    ? {
        dataSourceLabel:
          data.dataSource === "mock"
            ? t("admin.pilotSummaryDataSourceMock")
            : t("admin.pilotSummaryDataSourceFirestore"),
        activeEventsLabel:
          data.activeEventsCount > 0
            ? `${data.activeEventsCount} ${t("admin.pilotChecklistActiveEventsFound")}`
            : t("admin.pilotChecklistNoActiveEventsValue"),
        warningsLabel:
          data.readinessWarningCount > 0
            ? `${data.readinessWarningCount} ${t("admin.pilotSummaryWarningsFound")}`
            : t("admin.pilotSummaryNoWarnings"),
        staffPortalLabel: data.staffPortalConfigured
          ? t("admin.pilotSummaryConfigured")
          : t("admin.pilotSummaryNeedsAttention"),
        firebaseLabel: data.firebaseConfigured
          ? t("admin.pilotSummaryConfigured")
          : t("admin.pilotSummaryNeedsAttention"),
      }
    : null;

  return (
    <section className="surface space-y-6 p-6 sm:p-8">
      <div className="space-y-3">
        <p className="label">{t("admin.dashboardEyebrow")}</p>
        <h1 className="heading font-display text-4xl font-black sm:text-5xl">
          {t("admin.dashboardTitle")}
        </h1>
        <p className="copy text-base font-semibold leading-7">
          {t("admin.dashboardDescription")}
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="soft-panel rounded-2xl p-4">
          <p className="label">{t("admin.pilotSummaryEyebrow")}</p>
          <h2 className="text-strong mt-2 text-2xl font-black">
            {t("admin.pilotSummaryTitle")}
          </h2>
          <p className="copy mt-2 text-xs font-semibold">
            {t("admin.currentSchoolLabel")}: {currentSchoolId}
          </p>
          <p className="copy mt-2 text-sm font-semibold leading-6">
            {t("admin.pilotSummaryDescription")}
          </p>

          {summary ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <MiniStat
                label={t("admin.pilotChecklistDataSourceLabel")}
                value={summary.dataSourceLabel}
              />
              <MiniStat
                label={t("admin.pilotChecklistActiveEventsLabel")}
                value={summary.activeEventsLabel}
              />
              <MiniStat
                label={t("admin.pilotSummaryWarningsLabel")}
                value={summary.warningsLabel}
              />
              <MiniStat
                label={t("admin.pilotChecklistStaffTitle")}
                value={summary.staffPortalLabel}
              />
              <MiniStat
                label={t("admin.pilotChecklistFirebaseLabel")}
                value={summary.firebaseLabel}
              />
            </div>
          ) : (
            <p className="status-warning mt-4 rounded-2xl px-4 py-3 text-sm font-bold">
              {t("admin.pilotSummaryLoading")}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="soft-panel rounded-2xl p-4">
            <p className="label">{t("admin.signedInEmail")}</p>
            <p className="text-strong mt-2 break-words text-lg font-black">
              {user?.email}
            </p>
          </div>
          <Link className="btn-primary w-full" to="/admin/pilot-checklist">
            {t("admin.pilotSummaryOpenChecklist")}
          </Link>
          <button className="btn-secondary w-full" onClick={signOut} type="button">
            {t("admin.signOut")}
          </button>
          <p className="copy text-sm font-semibold leading-6">
            {t("admin.pilotSummaryHint")}
          </p>
        </div>
      </div>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border bg-white p-3 [border-color:var(--color-border)]">
      <p className="label">{label}</p>
      <p className="text-strong mt-2 text-sm font-black leading-6">{value}</p>
    </article>
  );
}
