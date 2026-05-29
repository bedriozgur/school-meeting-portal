import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageVersionFooter } from "../components/PageVersionFooter";
import { ParentHeader } from "../components/ParentHeader";
import { useT } from "../hooks/useT";
import { repositories } from "../repositories";
import { useSessionStore } from "../store/sessionStore";

type LookupStatus = "idle" | "loading" | "success" | "error";

export function MeetingPage() {
  const { meetingCode = "" } = useParams();
  const decodedMeetingCode = decodeURIComponent(meetingCode);
  const { t } = useT();
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
    const debugEnabled = import.meta.env.DEV === true;
    const startedAt = performance.now();

    setMeetingCode(decodedMeetingCode);
    setMeetingStatus("loading");
    setErrorKey(null);

    if (debugEnabled) {
      console.info(
        "[Parent meeting] event lookup started",
        JSON.stringify({ meetingCode: decodedMeetingCode }),
      );
    }

    repositories.meetingRepository
      .findByCode(decodedMeetingCode)
      .then((meeting) => {
        if (!isCurrent) {
          return;
        }

        setMeetingStatus(meeting ? "success" : "error");
        setErrorKey(meeting ? null : "meeting.notFound");

        if (debugEnabled) {
          console.info(
            "[Parent meeting] event lookup resolved",
            JSON.stringify({
              meetingCode: decodedMeetingCode,
              found: Boolean(meeting),
              durationMs: Math.round(performance.now() - startedAt),
            }),
          );
        }
      })
      .catch(() => {
        if (!isCurrent) {
          return;
        }

        setMeetingStatus("error");
        setErrorKey("meeting.lookupError");

        if (debugEnabled) {
          console.error(
            "[Parent meeting] event lookup failed",
            JSON.stringify({
              meetingCode: decodedMeetingCode,
              durationMs: Math.round(performance.now() - startedAt),
            }),
          );
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [decodedMeetingCode, setMeetingCode]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedSchoolNumber = schoolNumber.trim();
    const debugEnabled = import.meta.env.DEV === true;
    const startedAt = performance.now();

    if (!normalizedSchoolNumber || meetingStatus !== "success") {
      return;
    }

    setStudentStatus("loading");
    setErrorKey(null);

    if (debugEnabled) {
      console.info(
        "[Parent meeting] student lookup started",
        JSON.stringify({
          meetingCode: decodedMeetingCode,
          schoolNumber: normalizedSchoolNumber,
        }),
      );
    }

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

      if (debugEnabled) {
        console.info(
          "[Parent meeting] student lookup resolved",
          JSON.stringify({
            meetingCode: decodedMeetingCode,
            schoolNumber: normalizedSchoolNumber,
            found: Boolean(student),
            durationMs: Math.round(performance.now() - startedAt),
          }),
        );
      }

      navigate(
        `/meeting/${encodeURIComponent(decodedMeetingCode)}/student/${encodeURIComponent(normalizedSchoolNumber)}`,
      );
    } catch {
      setStudentStatus("error");
      setErrorKey("meeting.lookupError");

      if (debugEnabled) {
        console.error(
          "[Parent meeting] student lookup failed",
          JSON.stringify({
            meetingCode: decodedMeetingCode,
            schoolNumber: normalizedSchoolNumber,
            durationMs: Math.round(performance.now() - startedAt),
          }),
        );
      }
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-3xl flex-col gap-4 pb-1">
      <ParentHeader />

      <section className="surface px-4 py-4 sm:px-5 sm:py-5">
        <div className="space-y-1.5">
          <h1 className="text-strong text-xl font-black leading-tight sm:text-2xl">
            {t("meeting.title")}
          </h1>
          <p className="copy whitespace-pre-line text-[15px] font-semibold leading-6 sm:text-base">
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
