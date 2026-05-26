import type { ChangeEvent, ReactNode } from "react";
import { useT } from "../../hooks/useT";
import type { TranslationKey } from "../../i18n/i18n";
import { ImportMessages } from "./ImportMessages";
import { ImportPreviewTable } from "./ImportPreviewTable";
import { ImportUploader } from "./ImportUploader";
import { ImportValidationSummary } from "./ImportValidationSummary";
import type { ImportResult, ImportRowBase, ImportStatus } from "./types";

type ImportSectionProps<Row extends ImportRowBase> = {
  canImport: boolean;
  confirmKey: TranslationKey;
  descriptionKey: TranslationKey;
  errorKey: TranslationKey;
  expectedColumnsKey: TranslationKey;
  fileName: string;
  handleFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleImport: () => void;
  invalidRows: Row[];
  importingKey: TranslationKey;
  previewTitleKey: TranslationKey;
  templateActions?: Array<{
    labelKey: TranslationKey;
    onDownload: () => void;
  }>;
  renderPreviewRow: (row: Row) => ReactNode;
  result: ImportResult | null;
  rows: Row[];
  status: ImportStatus;
  successKey: TranslationKey;
  titleKey: TranslationKey;
  uploadTitleKey: TranslationKey;
  validRows: Row[];
  validRowsTitleKey: TranslationKey;
  warningRows: Row[];
  eyebrowKey?: TranslationKey;
};

export function ImportSection<Row extends ImportRowBase>({
  canImport,
  confirmKey,
  descriptionKey,
  errorKey,
  expectedColumnsKey,
  eyebrowKey = "admin.importEyebrow",
  fileName,
  handleFileChange,
  handleImport,
  importingKey,
  invalidRows,
  previewTitleKey,
  templateActions,
  renderPreviewRow,
  result,
  rows,
  status,
  successKey,
  titleKey,
  uploadTitleKey,
  validRows,
  validRowsTitleKey,
  warningRows,
}: ImportSectionProps<Row>) {
  const { t } = useT();

  return (
    <>
      <section className="surface p-6 sm:p-8">
        <p className="label">{t(eyebrowKey)}</p>
        <h1 className="heading mt-3 font-display text-4xl font-black">
          {t(titleKey)}
        </h1>
        <p className="copy mt-3 max-w-3xl text-base font-semibold leading-7">
          {t(descriptionKey)}
        </p>
      </section>

      <ImportUploader
        expectedColumnsKey={expectedColumnsKey}
        fileName={fileName}
        templateActions={templateActions}
        onFileChange={handleFileChange}
        uploadTitleKey={uploadTitleKey}
      />

      {status === "parsing" || status === "importing" ? (
        <section className="surface p-6 text-center">
          <p className="text-strong text-lg font-extrabold">
            {status === "parsing" ? t("admin.importParsing") : t(importingKey)}
          </p>
        </section>
      ) : null}

      {status === "error" ? (
        <section className="surface p-6 text-center">
          <p className="status-danger rounded-2xl px-4 py-3 text-sm font-bold">
            {t(errorKey)}
          </p>
        </section>
      ) : null}

      {rows.length > 0 ? (
        <section className="surface space-y-5 p-6 sm:p-8">
          <div>
            <p className="label">{t("admin.importPreviewEyebrow")}</p>
            <h2 className="text-strong mt-2 text-2xl font-black">
              {t(previewTitleKey)}
            </h2>
          </div>

          <ImportValidationSummary
            errorCount={invalidRows.length}
            validCount={validRows.length}
            warningCount={warningRows.length}
          />

          {invalidRows.length > 0 ? (
            <ImportMessages
              rows={invalidRows}
              title={t("admin.importErrorsTitle")}
              type="error"
            />
          ) : null}

          {warningRows.length > 0 ? (
            <ImportMessages
              rows={warningRows}
              title={t("admin.importWarningsTitle")}
              type="warning"
            />
          ) : null}

          <ImportPreviewTable
            renderRow={renderPreviewRow}
            rows={validRows}
            titleKey={validRowsTitleKey}
          />

          <button
            className="btn-primary w-full sm:w-auto"
            disabled={!canImport}
            onClick={handleImport}
            type="button"
          >
            {t(confirmKey)}
          </button>
        </section>
      ) : null}

      {status === "success" && result ? (
        <section className="surface p-6 sm:p-8">
          <p className="status-success rounded-2xl px-4 py-3 text-sm font-bold">
            {t(successKey)}: {t("admin.importCreated")} {result.created},{" "}
            {t("admin.importUpdated")} {result.updated}
          </p>
        </section>
      ) : null}
    </>
  );
}
