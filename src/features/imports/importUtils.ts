import type { ImportRowBase, ImportValidationGroups } from "./types";

export async function parseImportFile(file: File) {
  const XLSX = await import("xlsx");
  const extension = file.name.split(".").pop()?.toLocaleLowerCase("en");
  const workbook =
    extension === "csv"
      ? XLSX.read(await file.text(), { type: "string" })
      : XLSX.read(await file.arrayBuffer(), { type: "array" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

  if (!firstSheet) {
    return [];
  }

  return XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
    defval: "",
  });
}

export function parseIsActive(value: unknown) {
  const normalizedValue = String(value ?? "").trim().toLocaleLowerCase("en");

  if (!normalizedValue) {
    return true;
  }

  return !["false", "0", "no", "inactive"].includes(normalizedValue);
}

export function splitImportRows<Row extends ImportRowBase>(
  rows: Row[],
): ImportValidationGroups<Row> {
  return {
    validRows: rows.filter((row) => row.errors.length === 0),
    invalidRows: rows.filter((row) => row.errors.length > 0),
    warningRows: rows.filter((row) => row.warnings.length > 0),
  };
}
