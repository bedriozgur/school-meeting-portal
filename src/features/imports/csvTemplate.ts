type CsvTemplateRow = Record<string, string>;

export function downloadCsvTemplate(params: {
  filename: string;
  headers: string[];
  exampleRow: CsvTemplateRow;
}) {
  const { filename, headers, exampleRow } = params;
  const csvLines = [
    headers.join(","),
    headers.map((header) => escapeCsvCell(exampleRow[header] ?? "")).join(","),
  ];
  const csvText = `\uFEFF${csvLines.join("\n")}`;
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
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

function escapeCsvCell(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}
