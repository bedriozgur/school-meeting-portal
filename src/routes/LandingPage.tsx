import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SchoolHeader } from "../components/SchoolHeader";
import { useT } from "../hooks/useT";
import { useSessionStore } from "../store/sessionStore";

export function LandingPage() {
  const { t } = useT();
  const navigate = useNavigate();
  const savedMeetingCode = useSessionStore((state) => state.meetingCode);
  const setMeetingCode = useSessionStore((state) => state.setMeetingCode);
  const [meetingCode, setLocalMeetingCode] = useState(savedMeetingCode);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedCode = meetingCode.trim().toUpperCase();

    if (!normalizedCode) {
      return;
    }

    setMeetingCode(normalizedCode);
    navigate(`/meeting/${encodeURIComponent(normalizedCode)}`);
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-5xl flex-col gap-8">
      <SchoolHeader />
      <section className="grid flex-1 items-center gap-8 py-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <p className="label">{t("landing.welcomeEyebrow")}</p>
          <h1 className="font-display text-5xl font-black leading-[0.95] text-emerald-950 sm:text-6xl">
            {t("landing.title")}
          </h1>
          <p className="max-w-2xl text-lg font-semibold leading-8 text-stone-700">
            {t("landing.description")}
          </p>
        </div>

        <form className="surface p-5 sm:p-7" onSubmit={handleSubmit}>
          <div className="space-y-5">
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
            <p className="text-center text-sm font-bold text-stone-600">
              {t("landing.helper")}
            </p>
          </div>
        </form>
      </section>
    </div>
  );
}
