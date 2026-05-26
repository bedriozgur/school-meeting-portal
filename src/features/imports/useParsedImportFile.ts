import { ChangeEvent, useMemo, useState } from "react";
import { parseImportFile, splitImportRows } from "./importUtils";
import type { ImportResult, ImportRowBase, ImportStatus } from "./types";

type UseParsedImportFileParams<Row extends ImportRowBase> = {
  validateRows: (rows: Record<string, unknown>[]) => Promise<Row[]> | Row[];
  importRows: (rows: Row[]) => Promise<ImportResult>;
};

export function useParsedImportFile<Row extends ImportRowBase>({
  validateRows,
  importRows,
}: UseParsedImportFileParams<Row>) {
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [rows, setRows] = useState<Row[]>([]);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const validation = useMemo(() => splitImportRows(rows), [rows]);
  const canImport = status === "ready" && validation.validRows.length > 0;

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setStatus("parsing");
    setFileName(file.name);
    setResult(null);

    try {
      const parsedRows = await parseImportFile(file);
      setRows(await validateRows(parsedRows));
      setStatus("ready");
    } catch {
      setRows([]);
      setStatus("error");
    }
  }

  async function handleImport() {
    if (!canImport) {
      return;
    }

    setStatus("importing");

    try {
      setResult(await importRows(validation.validRows));
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return {
    canImport,
    fileName,
    handleFileChange,
    handleImport,
    result,
    rows,
    status,
    ...validation,
  };
}
