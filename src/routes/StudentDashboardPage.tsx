import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageVersionFooter } from "../components/PageVersionFooter";
import { ParentHeader } from "../components/ParentHeader";
import { TeacherCard } from "../components/TeacherCard";
import type { ParentMeetingView } from "../domain/models";
import { useT } from "../hooks/useT";
import { repositories } from "../repositories";
import { useSessionStore } from "../store/sessionStore";
import { buildParentMeetingReport } from "../utils/share";
import { sortTeacherAssignmentsWithCompletion } from "../utils/teachers";

// Parent-facing pages should stay compact, task-oriented queues; avoid large decorative cards.
type TeacherProgressState = { visited?: boolean };

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
  const resetStudent = useSessionStore((state) => state.resetStudent);
  const teacherState = useSessionStore((state) => state.teacherState);
  const [status, setStatus] = useState<DashboardStatus>("loading");
  const [parentMeetingView, setParentMeetingView] =
    useState<ParentMeetingView | null>(null);
  const [recentlyCompletedIds, setRecentlyCompletedIds] = useState<Set<string>>(
    () => new Set(),
  );
  const previousVisitedRef = useRef<Record<string, TeacherProgressState>>({});

  useEffect(() => {
    const previousVisited = previousVisitedRef.current;
    const nextVisited = teacherState as Record<string, TeacherProgressState>;
    const newlyCompleted = Object.entries(nextVisited)
      .filter(
        ([teacherId, state]) => state?.visited && !previousVisited[teacherId]?.visited,
      )
      .map(([teacherId]) => teacherId);

    const noLongerCompleted = [...recentlyCompletedIds].filter(
      (teacherId) => !nextVisited[teacherId]?.visited,
    );

    if (newlyCompleted.length === 0 && noLongerCompleted.length === 0) {
      previousVisitedRef.current = nextVisited;
      return;
    }

    if (newlyCompleted.length > 0) {
      setRecentlyCompletedIds((current) => {
        const next = new Set(current);
        newlyCompleted.forEach((teacherId) => next.add(teacherId));
        return next;
      });
    }

    if (noLongerCompleted.length > 0) {
      setRecentlyCompletedIds((current) => {
        const next = new Set(current);
        noLongerCompleted.forEach((teacherId) => next.delete(teacherId));
        return next;
      });
    }

    const timer = window.setTimeout(() => {
      setRecentlyCompletedIds((current) => {
        const next = new Set(current);
        newlyCompleted.forEach((teacherId) => next.delete(teacherId));
        return next;
      });
    }, 350);

    previousVisitedRef.current = nextVisited;

    return () => window.clearTimeout(timer);
  }, [recentlyCompletedIds, teacherState]);

  const teacherAssignments = useMemo(
    () =>
      sortTeacherAssignmentsWithCompletion(
        parentMeetingView?.teacherAssignments ?? [],
        teacherState,
        recentlyCompletedIds,
      ),
    [parentMeetingView?.teacherAssignments, recentlyCompletedIds, teacherState],
  );

  useEffect(() => {
    let isCurrent = true;
    const debugEnabled = import.meta.env.DEV === true;
    const startedAt = performance.now();

    setMeetingCode(decodedMeetingCode);
    setSchoolNumber(decodedSchoolNumber);

    setStatus("loading");
    setParentMeetingView(null);

    if (debugEnabled) {
      console.info(
        "[Parent dashboard] load started",
        JSON.stringify({
          meetingCode: decodedMeetingCode,
          schoolNumber: decodedSchoolNumber,
        }),
      );
    }

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

        if (debugEnabled) {
          console.info(
            "[Parent dashboard] load resolved",
            JSON.stringify({
              meetingCode: decodedMeetingCode,
              schoolNumber: decodedSchoolNumber,
              found: Boolean(view),
              durationMs: Math.round(performance.now() - startedAt),
            }),
          );
        }
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

        if (debugEnabled) {
          console.error(
            "[Parent dashboard] load failed",
            JSON.stringify({
              meetingCode: decodedMeetingCode,
              schoolNumber: decodedSchoolNumber,
              durationMs: Math.round(performance.now() - startedAt),
            }),
          );
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [decodedMeetingCode, decodedSchoolNumber, setMeetingCode, setSchoolNumber]);

  const report = parentMeetingView
    ? buildParentMeetingReport({
        language,
        parentMeetingView,
        teacherState,
      })
    : null;

  function handleShare() {
    setShareMessage("");

    if (!parentMeetingView) {
      return;
    }

    if (navigator.share && report) {
      void navigator.share({
        title: report.subject,
        text: report.body,
      });
      return;
    }

    setShareMessage(t("dashboard.shareFallback"));
  }

  function handleEmail() {
    const subject = encodeURIComponent(report?.subject ?? t("dashboard.emailSubject"));
    const body = encodeURIComponent(report?.body ?? "");
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  function handleStartOver() {
    resetStudent();
    navigate(`/meeting/${encodeURIComponent(decodedMeetingCode)}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 pb-3 sm:gap-5">
      <ParentHeader />

      <section className="surface px-4 py-4 sm:px-5 sm:py-5">
        <div className="space-y-1.5 text-left">
          <div className="flex items-start justify-between gap-3">
            <p className="text-strong min-w-0 flex-1 text-xl font-black leading-tight sm:text-2xl">
              {parentMeetingView?.meetingEvent.title ?? t("meeting.title")}
            </p>
            <p className="label shrink-0 text-[9px] tracking-[0.24em] sm:text-[10px]">
              {decodedMeetingCode}
            </p>
          </div>
          <p className="text-strong text-lg font-bold leading-tight sm:text-[1.15rem]">
            {parentMeetingView
              ? `${parentMeetingView.student.name} · ${parentMeetingView.student.className} · ${parentMeetingView.student.schoolNumber}`
              : t("dashboard.unknownStudent")}
          </p>
          <p className="copy text-sm font-semibold sm:text-[15px]">
            {t("dashboard.classTeacher")}:{" "}
            {parentMeetingView?.classTeacher?.name ?? t("dashboard.unknownClass")}
          </p>
        </div>
      </section>

      {shareMessage ? (
        <p className="status-warning rounded-2xl px-4 py-3 text-sm font-bold">
          {shareMessage}
        </p>
      ) : null}

      {status === "loading" ? (
        <section className="surface p-5 text-center sm:p-6">
          <p className="text-strong text-base font-extrabold sm:text-lg">
            {t("dashboard.loading")}
          </p>
        </section>
      ) : null}

      {status === "success" && parentMeetingView ? (
        <section>
          <div className="grid gap-2.5 lg:grid-cols-2">
            {teacherAssignments.map((assignment) => (
              <TeacherCard key={assignment.id} assignment={assignment} />
            ))}
          </div>
        </section>
      ) : null}

      {status === "error" ? (
        <section className="surface p-5 text-center sm:p-6">
          <p className="text-strong text-base font-extrabold sm:text-lg">
            {t("dashboard.loadError")}
          </p>
          <button className="btn-primary mt-4 w-full sm:w-auto" onClick={handleStartOver} type="button">
            {t("dashboard.startOver")}
          </button>
        </section>
      ) : null}

      <section className="surface px-4 py-3 sm:px-5 sm:py-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            className="btn-primary py-2.5 text-sm font-black"
            disabled={!parentMeetingView}
            onClick={handleEmail}
            type="button"
          >
            {t("dashboard.emailSelf")}
          </button>
          <button className="btn-secondary py-2.5 text-sm font-bold" onClick={handleShare} type="button">
            {t("dashboard.shareSave")}
          </button>
        </div>
        <button
          className="mt-2 w-full rounded-2xl border border-[color:var(--color-border)] bg-transparent px-4 py-2.5 text-sm font-extrabold text-[color:var(--color-muted-text)] transition hover:bg-white"
          onClick={handleStartOver}
          type="button"
        >
          {t("dashboard.startOver")}
        </button>
      </section>

      <PageVersionFooter />
    </div>
  );
}
