import { useT } from "../../hooks/useT";
import type { TranslationKey } from "../../i18n/i18n";
import { downloadQrDataUrl } from "./qrCode";
import { useQrCodeDataUrl } from "./useQrCodeDataUrl";

type QrCodeCardProps = {
  downloadFileName: string;
  downloadLabelKey: TranslationKey;
  heading: string;
  labelKey: TranslationKey;
  targetUrl: string;
};

export function QrCodeCard({
  downloadFileName,
  downloadLabelKey,
  heading,
  labelKey,
  targetUrl,
}: QrCodeCardProps) {
  const { t } = useT();
  const { dataUrl, loading } = useQrCodeDataUrl(targetUrl, 320);

  return (
    <article className="surface qr-card space-y-4 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="label">{t(labelKey)}</p>
          <h3 className="text-strong mt-2 text-2xl font-black">{heading}</h3>
          <p className="copy mt-1 break-all text-sm font-semibold">{targetUrl}</p>
        </div>
        <button
          className="btn-secondary print:hidden"
          disabled={loading || !dataUrl}
          onClick={() =>
            dataUrl &&
            downloadQrDataUrl({
              dataUrl,
              filename: downloadFileName,
            })
          }
          type="button"
        >
          {t(downloadLabelKey)}
        </button>
      </div>

      <div className="flex justify-center rounded-[1.5rem] bg-white p-4">
        {dataUrl ? (
          <img
            alt={heading}
            className="h-auto w-full max-w-[19rem]"
            src={dataUrl}
          />
        ) : (
          <div className="flex min-h-[19rem] w-full max-w-[19rem] items-center justify-center rounded-[1.25rem] bg-[color-mix(in_srgb,var(--color-border)_20%,white)]">
            <p className="copy text-sm font-bold">
              {loading ? t("admin.qrLoading") : t("admin.qrUnavailable")}
            </p>
          </div>
        )}
      </div>
    </article>
  );
}
