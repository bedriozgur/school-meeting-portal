import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { PageVersionFooter } from "../components/PageVersionFooter";
import { useT } from "../hooks/useT";
import { repositories } from "../repositories";
import { useSessionStore } from "../store/sessionStore";
import { useSchoolBranding } from "../theme/useSchoolBranding";

type LookupStatus = "idle" | "loading" | "success" | "error";

export function MeetingPage() {
  const { meetingCode = "" } = useParams();
  const decodedMeetingCode = decodeURIComponent(meetingCode);
  const { t } = useT();
  const branding = useSchoolBranding();
  const navigate = useNavigate();
  const setMeetingCode = useSessionStore((state) => state.setMeetingCode);
  const savedSchoolNumber = useSessionStore((state) => state.schoolNumber);
  const setSchoolNumber = useSessionStore((state) => state.setSchoolNumber);
  const [schoolNumber, setLocalSchoolNumber] = useState(savedSchoolNumber);
  const [meetingStatus, setMeetingStatus] = useState<LookupStatus>("loading");
  const [studentStatus, setStudentStatus] = useState<LookupStatus>("idle");
  const [errorKey, setErrorKey] = useState<
    "meeting.notFound" | "meeting.lookupError" | "meeting.studentNotFound" | null
  >(null);

  useEffect(() => {
    let isCurrent = true;

    setMeetingCode(decodedMeetingCode);
    setMeetingStatus("loading");
    setErrorKey(null);

    repositories.meetingRepository
      .findByCode(decodedMeetingCode)
      .then((meeting) => {
        if (!isCurrent) {
          return;
        }

        setMeetingStatus(meeting ? "success" : "error");
        setErrorKey(meeting ? null : "meeting.notFound");
      })
      .catch(() => {
        if (!isCurrent) {
          return;
        }

        setMeetingStatus("error");
        setErrorKey("meeting.lookupError");
      });

    return () => {
      isCurrent = false;
    };
  }, [decodedMeetingCode, setMeetingCode]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedSchoolNumber = schoolNumber.trim();

    if (!normalizedSchoolNumber || meetingStatus !== "success") {
      return;
    }

    setStudentStatus("loading");
    setErrorKey(null);

    try {
      const student = await repositories.studentRepository.findBySchoolNumber({
        meetingCode: decodedMeetingCode,
        schoolNumber: normalizedSchoolNumber,
      });

      if (!student) {
        setStudentStatus("error");
        setErrorKey("meeting.studentNotFound");
        return;
      }

      setSchoolNumber(normalizedSchoolNumber);
      setStudentStatus("success");
      navigate(
        `/meeting/${encodeURIComponent(decodedMeetingCode)}/student/${encodeURIComponent(normalizedSchoolNumber)}`,
      );
    } catch {
      setStudentStatus("error");
      setErrorKey("meeting.lookupError");
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-3xl flex-col gap-4 pb-1">
      <header className="flex items-start justify-between gap-3 pt-1">
        <div className="flex min-w-0 items-center gap-3">
          {branding.logoUrl ? (
            <img
              alt={t("app.logoAlt")}
              className="h-12 w-12 shrink-0 rounded-2xl border border-[color:var(--color-border)] bg-white object-contain p-1.5 shadow-soft sm:h-14 sm:w-14"
              src={branding.logoUrl}
            />
          ) : (
            <div
              aria-label={t("app.logoAlt")}
              className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[color:var(--color-border)] text-sm font-black text-white shadow-soft sm:h-14 sm:w-14 sm:text-base"
              style={{ background: "var(--color-primary)" }}
            >
              {t(branding.logoInitials)}
            </div>
          )}
          <p className="sr-only">{t(branding.schoolName)}</p>
        </div>
        <LanguageSwitcher compact className="shrink-0" />
      </header>

      <section className="surface px-4 py-4 sm:px-5 sm:py-5">
        <div className="space-y-2">
          <p className="text-strong text-lg font-black tracking-tight sm:text-xl">
            {t(branding.schoolName)}
          </p>
          <p className="label text-[9px] tracking-[0.24em]">
            {decodedMeetingCode}
          </p>
          <h1 className="text-strong text-xl font-black leading-tight sm:text-2xl">
            {t("meeting.title")}
          </h1>
          <p className="copy text-sm font-semibold leading-6">
            {t("meeting.description")}
          </p>
        </div>
      </section>

      {meetingStatus === "loading" ? (
        <p className="soft-panel rounded-2xl px-4 py-3 text-sm font-extrabold">
          {t("meeting.loading")}
        </p>
      ) : null}

      {errorKey ? (
        <p className="status-danger rounded-2xl px-4 py-3 text-sm font-extrabold">
          {t(errorKey)}
        </p>
      ) : null}

      <section className="surface p-4 sm:p-5">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="label">{t("meeting.schoolNumberLabel")}</span>
            <input
              className="input mt-2"
              inputMode="numeric"
              onChange={(event) => setLocalSchoolNumber(event.target.value)}
              placeholder={t("meeting.schoolNumberPlaceholder")}
              value={schoolNumber}
            />
          </label>
          <button
            className="btn-primary w-full"
            disabled={
              meetingStatus !== "success" || studentStatus === "loading"
            }
            type="submit"
          >
            {studentStatus === "loading"
              ? t("meeting.studentLoading")
              : t("meeting.continue")}
          </button>
        </form>
      </section>

      <Link className="btn-secondary w-full" to="/">
        {t("meeting.changeMeeting")}
      </Link>

      <PageVersionFooter />
    </div>
  );
}
