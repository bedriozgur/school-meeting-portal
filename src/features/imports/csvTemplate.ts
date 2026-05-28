type CsvTemplateRow = Record<string, string>;

export function downloadCsvTemplate(params: {
  filename: string;
  headers: string[];
  exampleRow: CsvTemplateRow;
}) {
  const { filename, headers, exampleRow } = params;
  downloadCsvRows({
    filename,
    headers,
    rows: [exampleRow],
  });
}

export function downloadCsvRows(params: {
  filename: string;
  headers: string[];
  rows: CsvTemplateRow[];
}) {
  const { filename, headers, rows } = params;
  const csvText = buildCsvText(headers, rows);
  const blob = new Blob([`\uFEFF${csvText}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function buildCsvText(headers: string[], rows: CsvTemplateRow[]) {
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCsvCell(row[header] ?? "")).join(",")),
  ].join("\n");
}

export function escapeCsvCell(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}
