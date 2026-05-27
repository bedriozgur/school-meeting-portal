import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { VersionBadge } from "../components/VersionBadge";
import { useT } from "../hooks/useT";
import { normalizeMeetingCode } from "../repositories/meetingCodes";
import { useSessionStore } from "../store/sessionStore";
import { useSchoolBranding } from "../theme/useSchoolBranding";

export function LandingPage() {
  const { t } = useT();
  const navigate = useNavigate();
  const branding = useSchoolBranding();
  const savedMeetingCode = useSessionStore((state) => state.meetingCode);
  const setMeetingCode = useSessionStore((state) => state.setMeetingCode);
  const [meetingCode, setLocalMeetingCode] = useState(savedMeetingCode);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedCode = normalizeMeetingCode(meetingCode);

    if (!normalizedCode) {
      return;
    }

    setMeetingCode(normalizedCode);
    navigate(`/meeting/${encodeURIComponent(normalizedCode)}`);
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-3xl flex-col gap-4 sm:gap-6">
      <div className="flex justify-end pt-1 sm:pt-0">
        <div className="flex flex-col items-end gap-1">
          <LanguageSwitcher />
          <VersionBadge />
        </div>
      </div>

      <section className="flex flex-1 items-center">
        <div className="mx-auto w-full max-w-xl space-y-5 text-center">
          <div className="flex flex-col items-center gap-3 sm:gap-4">
            {branding.logoUrl ? (
              <img
                alt={t("app.logoAlt")}
                className="h-24 w-24 rounded-[2rem] border border-[color:var(--color-border)] bg-white object-contain p-3 shadow-soft sm:h-28 sm:w-28"
                src={branding.logoUrl}
              />
            ) : (
              <div
                aria-label={t("app.logoAlt")}
                className="grid h-24 w-24 place-items-center rounded-[2rem] border border-[color:var(--color-border)] text-2xl font-black text-white shadow-soft sm:h-28 sm:w-28"
                style={{ background: "var(--color-primary)" }}
              >
                {t(branding.logoInitials)}
              </div>
            )}
            <p className="text-strong text-lg font-extrabold tracking-tight sm:text-xl">
              {t(branding.schoolName)}
            </p>
          </div>

          <div className="space-y-3">
            <p className="label">{t("landing.welcomeEyebrow")}</p>
            <h1 className="heading text-balance text-3xl font-black leading-tight sm:text-4xl lg:text-[2.75rem]">
              {t(branding.welcomeTitle)}
            </h1>
          </div>

          <form className="surface p-5 text-left sm:p-6" onSubmit={handleSubmit}>
            <div className="space-y-4 sm:space-y-5">
              <label className="block">
                <span className="label">{t("landing.meetingCodeLabel")}</span>
                <input
                  className="input mt-2 uppercase"
                  onChange={(event) => setLocalMeetingCode(event.target.value)}
                  placeholder={t("landing.meetingCodePlaceholder")}
                  value={meetingCode}
                />
              </label>
              <button className="btn-primary w-full" type="submit">
                {t("landing.continue")}
              </button>
              <p className="copy text-center text-sm font-semibold leading-6">
                {t("landing.helper")}
              </p>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
