import { useT } from "../../hooks/useT";
import type { ImportRowBase } from "./types";

type ImportMessagesProps<Row extends ImportRowBase> = {
  rows: Row[];
  title: string;
  type: "error" | "warning";
};

export function ImportMessages<Row extends ImportRowBase>({
  rows,
  title,
  type,
}: ImportMessagesProps<Row>) {
  const { t } = useT();

  return (
    <div
      className={`rounded-2xl px-4 py-3 text-sm font-bold ${
        type === "error" ? "status-danger" : "status-warning"
      }`}
    >
      <p className="mb-2 font-black">{title}</p>
      <ul className="list-disc space-y-1 pl-5">
        {rows.flatMap((row) =>
          (type === "error" ? row.errors : row.warnings).map((messageKey) => (
            <li key={`${row.rowNumber}-${messageKey}`}>
              {t("admin.importRow")} {row.rowNumber}: {t(messageKey)}
            </li>
          )),
        )}
      </ul>
    </div>
  );
}
