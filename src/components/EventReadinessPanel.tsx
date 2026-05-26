import type { EventReadiness, EventReadinessCode } from "../domain/models";
import { useT } from "../hooks/useT";
import type { TranslationKey } from "../i18n/i18n";

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

type EventReadinessPanelProps = {
  readiness: EventReadiness | null;
};

export function EventReadinessPanel({ readiness }: EventReadinessPanelProps) {
  const { t } = useT();

  if (!readiness) {
    return (
      <section className="surface p-6 sm:p-8">
        <p className="text-strong text-lg font-extrabold">
          {t("admin.readinessLoading")}
        </p>
      </section>
    );
  }

  return (
    <section className="surface space-y-4 p-6 sm:p-8">
      <div>
        <p className="label">{t("admin.readinessEyebrow")}</p>
        <h2 className="text-strong mt-2 text-2xl font-black">
          {readiness.isReady
            ? t("admin.readinessReadyTitle")
            : t("admin.readinessBlockedTitle")}
        </h2>
      </div>

      {readiness.errors.length === 0 ? (
        <p className="status-success rounded-2xl px-4 py-3 text-sm font-bold">
          {t("admin.readinessNoErrors")}
        </p>
      ) : (
        <ReadinessList
          items={readiness.errors}
          title={t("admin.readinessErrorsTitle")}
          type="error"
        />
      )}

      {readiness.warnings.length > 0 ? (
        <ReadinessList
          items={readiness.warnings}
          title={t("admin.readinessWarningsTitle")}
          type="warning"
        />
      ) : null}
    </section>
  );
}

function ReadinessList({
  items,
  title,
  type,
}: {
  items: EventReadiness["errors"];
  title: string;
  type: "error" | "warning";
}) {
  const { t } = useT();

  return (
    <div
      className={`rounded-2xl px-4 py-3 text-sm font-bold ${
        type === "error" ? "status-danger" : "status-warning"
      }`}
    >
      <p className="mb-2 font-black">{title}</p>
      <ul className="list-disc space-y-1 pl-5">
        {items.map((item, index) => (
          <li key={`${item.code}-${item.detail ?? ""}-${index}`}>
            {t(readinessKeys[item.code])}
            {item.detail ? `: ${item.detail}` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
