import { useT } from "../../hooks/useT";

type ImportValidationSummaryProps = {
  errorCount: number;
  validCount: number;
  warningCount: number;
};

export function ImportValidationSummary({
  errorCount,
  validCount,
  warningCount,
}: ImportValidationSummaryProps) {
  const { t } = useT();

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <ImportMetric label={t("admin.importValidRows")} value={String(validCount)} />
      <ImportMetric
        label={t("admin.importWarningRows")}
        value={String(warningCount)}
      />
      <ImportMetric label={t("admin.importErrorRows")} value={String(errorCount)} />
    </div>
  );
}

function ImportMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="soft-panel rounded-2xl p-4">
      <p className="label">{label}</p>
      <p className="text-strong mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}
