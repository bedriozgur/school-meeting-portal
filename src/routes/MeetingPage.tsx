import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { SchoolHeader } from "../components/SchoolHeader";
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
    <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-3xl flex-col gap-8">
      <SchoolHeader />
      <section className="surface my-auto p-5 sm:p-8">
        <div className="space-y-5">
          <div>
            <p className="label">{decodedMeetingCode}</p>
            <h1 className="mt-3 font-display text-4xl font-black text-emerald-950 sm:text-5xl">
              {t("meeting.title")}
            </h1>
            <p className="mt-3 text-base font-semibold leading-7 text-stone-700">
              {t("meeting.description")}
            </p>
          </div>

          {meetingStatus === "loading" ? (
            <p className="rounded-2xl bg-stone-100 px-4 py-3 text-sm font-extrabold text-stone-700">
              {t("meeting.loading")}
            </p>
          ) : null}

          {errorKey ? (
            <p className="rounded-2xl bg-rose-100 px-4 py-3 text-sm font-extrabold text-rose-950">
              {t(errorKey)}
            </p>
          ) : null}

          <form className="space-y-5" onSubmit={handleSubmit}>
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
              className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
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

          <Link className="btn-secondary w-full" to="/">
            {t("meeting.changeMeeting")}
          </Link>
        </div>
      </section>
    </div>
  );
}
