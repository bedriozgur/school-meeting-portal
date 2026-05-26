import { useT } from "../../hooks/useT";
import type { MeetingEvent } from "../../domain/models";
import { useSchoolBranding } from "../../theme/useSchoolBranding";
import { useQrCodeDataUrl } from "./useQrCodeDataUrl";

type QrPrintCardProps = {
  event: MeetingEvent;
  targetUrl: string;
};

export function QrPrintCard({ event, targetUrl }: QrPrintCardProps) {
  const { t } = useT();
  const branding = useSchoolBranding();
  const { dataUrl } = useQrCodeDataUrl(targetUrl, 384);

  return (
    <article className="qr-print-card break-inside-avoid bg-white p-6 text-black print:break-after-page print:shadow-none">
      <div className="flex items-start justify-between gap-6">
        <div className="flex min-w-0 items-center gap-4">
          {branding.logoUrl ? (
            <img
              alt={t("app.logoAlt")}
              className="h-16 w-16 shrink-0 rounded-2xl object-cover"
              src={branding.logoUrl}
            />
          ) : (
            <div
              aria-label={t("app.logoAlt")}
              className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl text-2xl font-black text-white"
              style={{ background: "var(--color-primary)" }}
            >
              {t(branding.logoInitials)}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-black/60">
              {t("admin.qrPrintSchoolLabel")}
            </p>
            <p className="mt-1 truncate text-xl font-black">{t(branding.schoolName)}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-black/60">
            {t("admin.qrPrintMeetingLabel")}
          </p>
          <p className="mt-1 text-lg font-black">{event.code}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-black/60">
              {t("admin.qrPrintEventLabel")}
            </p>
            <h2 className="mt-1 text-3xl font-black leading-tight">{event.title}</h2>
          </div>

          <div className="space-y-2 text-sm font-semibold text-black/80">
            <p>
              <span className="font-extrabold text-black">{t("admin.qrPrintMeetingCode")}:</span>{" "}
              {event.code}
            </p>
            <p>
              <span className="font-extrabold text-black">{t("admin.qrPrintTargetLabel")}:</span>{" "}
              {targetUrl}
            </p>
            <p className="rounded-2xl bg-black/5 px-4 py-3">
              {t("admin.qrPrintInstruction")}
            </p>
          </div>
        </div>

        <div className="flex justify-center">
          {dataUrl ? (
            <img
              alt={`${event.title} ${event.code}`}
              className="h-auto w-full max-w-[20rem]"
              src={dataUrl}
            />
          ) : (
            <div className="grid h-[20rem] w-[20rem] place-items-center rounded-3xl border border-dashed border-black/20">
              <p className="text-sm font-bold text-black/60">{t("admin.qrLoading")}</p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
