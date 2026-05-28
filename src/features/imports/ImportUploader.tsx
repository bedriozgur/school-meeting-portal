import type { ChangeEvent } from "react";
import { useT } from "../../hooks/useT";
import type { TranslationKey } from "../../i18n/i18n";

type ImportTemplateAction = {
  labelKey: TranslationKey;
  onDownload: () => void;
};

type ImportUploaderProps = {
  expectedColumnsKey: TranslationKey;
  fileName: string;
  templateActions?: ImportTemplateAction[];
  dataActions?: ImportTemplateAction[];
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  uploadTitleKey: TranslationKey;
};

export function ImportUploader({
  expectedColumnsKey,
  dataActions = [],
  fileName,
  templateActions = [],
  onFileChange,
  uploadTitleKey,
}: ImportUploaderProps) {
  const { t } = useT();

  return (
    <section className="surface space-y-4 p-6 sm:p-8">
      <div>
        <p className="label">{t("admin.importUploadEyebrow")}</p>
        <h2 className="text-strong mt-2 text-2xl font-black">
          {t(uploadTitleKey)}
        </h2>
      </div>
      {templateActions.length > 0 ? (
        <div className="space-y-2">
          <p className="label">{t("admin.importTemplateDownloadsLabel")}</p>
          <div className="flex flex-wrap gap-3">
            {templateActions.map((action) => (
              <button
                className="btn-secondary w-full sm:w-auto"
                key={action.labelKey}
                onClick={() => {
                  void action.onDownload();
                }}
                type="button"
              >
                {t(action.labelKey)}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {dataActions.length > 0 ? (
        <div className="space-y-2">
          <p className="label">{t("admin.importCurrentDataDownloadsLabel")}</p>
          <div className="flex flex-wrap gap-3">
            {dataActions.map((action) => (
              <button
                className="btn-secondary w-full sm:w-auto"
                key={action.labelKey}
                onClick={() => {
                  void action.onDownload();
                }}
                type="button"
              >
                {t(action.labelKey)}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <label className="block">
        <span className="label">{t("admin.importFileLabel")}</span>
        <input
          accept=".csv,.xlsx"
          className="input mt-2"
          onChange={onFileChange}
          type="file"
        />
      </label>
      <p className="copy text-sm font-bold">{t(expectedColumnsKey)}</p>
      {fileName ? (
        <p className="soft-panel rounded-2xl px-4 py-3 text-sm font-bold">
          {t("admin.importSelectedFile")}: {fileName}
        </p>
      ) : null}
    </section>
  );
}
