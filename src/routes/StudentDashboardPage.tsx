import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { TeacherCard } from "../components/TeacherCard";
import { VersionBadge } from "../components/VersionBadge";
import type { ParentMeetingView } from "../domain/models";
import { useT } from "../hooks/useT";
import { repositories } from "../repositories";
import { useSessionStore } from "../store/sessionStore";
import { useSchoolBranding } from "../theme/useSchoolBranding";
import { buildNotesSummary } from "../utils/share";
import { sortTeacherAssignmentsWithCompletion } from "../utils/teachers";

// Parent-facing pages should stay compact, task-oriented queues; avoid large decorative cards.
type TeacherProgressState = { visited?: boolean };

type DashboardStatus = "loading" | "success" | "error";

export function StudentDashboardPage() {
  const { meetingCode = "", schoolNumber = "" } = useParams();
  const decodedMeetingCode = decodeURIComponent(meetingCode);
  const decodedSchoolNumber = decodeURIComponent(schoolNumber);
  const { language, t } = useT();
  const branding = useSchoolBranding();
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

  function handleShare() {
    setShareMessage("");

    if (!parentMeetingView) {
      return;
    }

    if (navigator.share) {
      void navigator.share({
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

  function handleStartOver() {
    resetStudent();
    navigate(`/meeting/${encodeURIComponent(decodedMeetingCode)}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 pb-3 sm:gap-5">
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
        </div>
        <LanguageSwitcher compact className="shrink-0" />
      </header>

      <section className="surface px-4 py-3 sm:px-5 sm:py-4">
        <div className="space-y-2 text-left">
          <p className="text-strong text-lg font-black tracking-tight sm:text-xl">
            {t(branding.schoolName)}
          </p>
          <p className="label text-[9px] tracking-[0.24em]">
            {decodedMeetingCode}
          </p>
          <p className="text-strong text-sm font-bold sm:text-base">
            {parentMeetingView
              ? `${parentMeetingView.student.name} · ${parentMeetingView.student.className}`
              : t("dashboard.unknownStudent")}
          </p>
          <p className="copy text-xs font-semibold sm:text-sm">
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
          <div className="grid gap-3 lg:grid-cols-2">
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
        <div className="grid gap-2 sm:grid-cols-3">
          <button className="btn-primary py-2.5 text-sm" onClick={handleStartOver} type="button">
            {t("dashboard.startOver")}
          </button>
          <button
            className="btn-secondary py-2.5 text-sm"
            disabled={!parentMeetingView}
            onClick={handleShare}
            type="button"
          >
            {t("dashboard.shareSave")}
          </button>
          <button
            className="btn-secondary py-2.5 text-sm"
            disabled={!parentMeetingView}
            onClick={handleEmail}
            type="button"
          >
            {t("dashboard.emailSelf")}
          </button>
        </div>
      </section>

      <footer className="pb-1 text-center">
        <VersionBadge compact />
      </footer>
    </div>
  );
}
