import type { ReactNode } from "react";
import { useT } from "../../hooks/useT";
import type { TranslationKey } from "../../i18n/i18n";
import type { ImportRowBase } from "./types";

type ImportPreviewTableProps<Row extends ImportRowBase> = {
  renderRow: (row: Row) => ReactNode;
  rows: Row[];
  titleKey: TranslationKey;
};

export function ImportPreviewTable<Row extends ImportRowBase>({
  renderRow,
  rows,
  titleKey,
}: ImportPreviewTableProps<Row>) {
  const { t } = useT();

  return (
    <div className="grid gap-3">
      <p className="label">{t(titleKey)}</p>
      {rows.map((row) => (
        <article className="soft-panel rounded-2xl p-4" key={row.rowNumber}>
          {renderRow(row)}
        </article>
      ))}
    </div>
  );
}

export function PreviewCell({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="label">{label}</p>
      <p className="text-strong mt-1 text-sm font-black">{value}</p>
    </div>
  );
}
