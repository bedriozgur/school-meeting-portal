import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { SchoolHeader } from "../components/SchoolHeader";
import { TeacherCard } from "../components/TeacherCard";
import type { ParentMeetingView } from "../domain/models";
import { useT } from "../hooks/useT";
import { repositories } from "../repositories";
import { useSessionStore } from "../store/sessionStore";
import { buildNotesSummary } from "../utils/share";
import { sortTeacherAssignmentsWithCompletion } from "../utils/teachers";

type DashboardStatus = "loading" | "success" | "error";

export function StudentDashboardPage() {
  const { meetingCode = "", schoolNumber = "" } = useParams();
  const decodedMeetingCode = decodeURIComponent(meetingCode);
  const decodedSchoolNumber = decodeURIComponent(schoolNumber);
  const { language, t } = useT();
  const navigate = useNavigate();
  const [shareMessage, setShareMessage] = useState("");
  const setMeetingCode = useSessionStore((state) => state.setMeetingCode);
  const setSchoolNumber = useSessionStore((state) => state.setSchoolNumber);
  const resetSession = useSessionStore((state) => state.resetSession);
  const resetStudent = useSessionStore((state) => state.resetStudent);
  const resetMeeting = useSessionStore((state) => state.resetMeeting);
  const teacherState = useSessionStore((state) => state.teacherState);
  const [status, setStatus] = useState<DashboardStatus>("loading");
  const [parentMeetingView, setParentMeetingView] =
    useState<ParentMeetingView | null>(null);
  const teacherAssignments = useMemo(
    () =>
      sortTeacherAssignmentsWithCompletion(
        parentMeetingView?.teacherAssignments ?? [],
        teacherState,
      ),
    [parentMeetingView?.teacherAssignments, teacherState],
  );

  useEffect(() => {
    let isCurrent = true;

    setMeetingCode(decodedMeetingCode);
    setSchoolNumber(decodedSchoolNumber);

    setStatus("loading");
    setParentMeetingView(null);

    repositories.parentMeetingRepository
      .getParentMeetingView({
        meetingCode: decodedMeetingCode,
        schoolNumber: decodedSchoolNumber,
      })
      .then((view) => {
        if (!isCurrent) {
          return;
        }

        setParentMeetingView(view);
        setStatus(view ? "success" : "error");
      })
      .catch((error) => {
        if (!isCurrent) {
          return;
        }

        console.error("Failed to load student dashboard.", {
          meetingCode: decodedMeetingCode,
          schoolNumber: decodedSchoolNumber,
          error,
        });
        setStatus("error");
      });

    return () => {
      isCurrent = false;
    };
  }, [decodedMeetingCode, decodedSchoolNumber, setMeetingCode, setSchoolNumber]);

  const summary = parentMeetingView
    ? buildNotesSummary({
        language,
        parentMeetingView,
        teacherState,
      })
    : "";

  async function handleShare() {
    setShareMessage("");

    if (!parentMeetingView) {
      return;
    }

    if (navigator.share) {
      await navigator.share({
        title: t("dashboard.shareTitle"),
        text: summary,
      });
      return;
    }

    setShareMessage(t("dashboard.shareFallback"));
  }

  function handleEmail() {
    const subject = encodeURIComponent(t("dashboard.emailSubject"));
    const body = encodeURIComponent(summary);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  function handleResetSession() {
    resetSession();
    navigate("/");
  }

  function handleChangeStudent() {
    resetStudent();
    navigate(`/meeting/${encodeURIComponent(decodedMeetingCode)}`);
  }

  function handleChangeMeeting() {
    resetMeeting();
    navigate("/");
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <SchoolHeader />

      <section className="surface p-5 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="label">{decodedMeetingCode}</p>
            <h1 className="heading mt-3 font-display text-4xl font-black sm:text-5xl">
              {t("dashboard.title")}
            </h1>
            <p className="copy mt-3 max-w-2xl text-base font-semibold leading-7">
              {t("dashboard.description")}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-80 lg:grid-cols-1">
            <button
              className="btn-primary"
              disabled={!parentMeetingView}
              onClick={handleShare}
              type="button"
            >
              {t("dashboard.shareSave")}
            </button>
            <button
              className="btn-secondary"
              disabled={!parentMeetingView}
              onClick={handleEmail}
              type="button"
            >
              {t("dashboard.emailSelf")}
            </button>
          </div>
        </div>

        {shareMessage ? (
          <p className="status-warning mt-4 rounded-2xl px-4 py-3 text-sm font-bold">
            {shareMessage}
          </p>
        ) : null}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard
          label={t("dashboard.studentName")}
          value={
            status === "loading"
              ? t("dashboard.loadingValue")
              : parentMeetingView?.student.name ?? t("dashboard.unknownStudent")
          }
        />
        <InfoCard
          label={t("dashboard.className")}
          value={parentMeetingView?.student.className ?? t("dashboard.unknownClass")}
        />
        <InfoCard
          label={t("dashboard.grade")}
          value={parentMeetingView?.student.grade ?? t("dashboard.unknownClass")}
        />
        <InfoCard
          label={t("dashboard.classTeacher")}
          value={
            parentMeetingView?.classTeacher?.name ?? t("dashboard.unknownClass")
          }
        />
      </section>

      <section className="surface p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <button className="btn-secondary" onClick={handleResetSession} type="button">
            {t("dashboard.resetSession")}
          </button>
          <button className="btn-secondary" onClick={handleChangeStudent} type="button">
            {t("dashboard.changeStudent")}
          </button>
          <button className="btn-secondary" onClick={handleChangeMeeting} type="button">
            {t("dashboard.changeMeeting")}
          </button>
        </div>
        <p className="copy mt-3 text-center text-sm font-bold">
          {t("dashboard.sessionHint")}
        </p>
      </section>

      {status === "loading" ? (
        <section className="surface p-6 text-center">
          <p className="text-strong text-lg font-extrabold">
            {t("dashboard.loading")}
          </p>
        </section>
      ) : null}

      {status === "success" && parentMeetingView ? (
        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <h2 className="heading font-display text-3xl font-black">
              {t("dashboard.teachers")}
            </h2>
            <p className="label">{teacherAssignments.length}</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {teacherAssignments.map((assignment) => (
              <TeacherCard key={assignment.id} assignment={assignment} />
            ))}
          </div>
        </section>
      ) : null}

      {status === "error" ? (
        <section className="surface p-6 text-center">
          <p className="text-strong text-lg font-extrabold">
            {t("dashboard.loadError")}
          </p>
          <Link
            className="btn-primary mt-4 w-full sm:w-auto"
            to={`/meeting/${encodeURIComponent(decodedMeetingCode)}`}
          >
            {t("dashboard.changeStudent")}
          </Link>
        </section>
      ) : null}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface p-4">
      <p className="label">{label}</p>
      <p className="text-strong mt-2 text-xl font-black">{value}</p>
    </div>
  );
}
