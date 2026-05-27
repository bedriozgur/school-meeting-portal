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
    <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-3xl flex-col px-0 sm:px-0">
      <div className="flex justify-end pt-1 sm:pt-0">
        <LanguageSwitcher compact />
      </div>

      <section className="flex flex-1 items-center justify-center py-2 sm:py-4">
        <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 text-center sm:gap-5">
          <div className="flex flex-col items-center gap-3 sm:gap-4">
            {branding.logoUrl ? (
              <img
                alt={t("app.logoAlt")}
                className="h-32 w-32 rounded-[2rem] border border-[color:var(--color-border)] bg-white object-contain p-4 shadow-soft sm:h-36 sm:w-36"
                src={branding.logoUrl}
              />
            ) : (
              <div
                aria-label={t("app.logoAlt")}
                className="grid h-32 w-32 place-items-center rounded-[2rem] border border-[color:var(--color-border)] text-3xl font-black text-white shadow-soft sm:h-36 sm:w-36"
                style={{ background: "var(--color-primary)" }}
              >
                {t(branding.logoInitials)}
              </div>
            )}
            <p className="text-strong text-xl font-black tracking-tight sm:text-2xl">
              {t(branding.schoolName)}
            </p>
          </div>

          <div className="space-y-2">
            <p className="label text-[10px] tracking-[0.24em]">
              {t("landing.welcomeEyebrow")}
            </p>
            <h1 className="heading text-balance text-2xl font-black leading-snug sm:text-3xl lg:text-[2.25rem]">
              {t(branding.welcomeTitle)}
            </h1>
          </div>

          <form className="surface w-full p-5 text-left sm:p-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
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

          <footer className="pt-1">
            <VersionBadge compact />
          </footer>
        </div>
      </section>
    </div>
  );
}
