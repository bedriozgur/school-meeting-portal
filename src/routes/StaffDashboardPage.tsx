import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SchoolHeader } from "../components/SchoolHeader";
import { DEFAULT_SCHOOL_ID } from "../config/school";
import type { MeetingEvent, Student } from "../domain/models";
import { QrCodeCard } from "../features/qr/QrCodeCard";
import { useT } from "../hooks/useT";
import type { TranslationKey } from "../i18n/i18n";
import { repositories } from "../repositories";
import { useAdminSchoolStore } from "../store/adminSchoolStore";
import { useStaffSessionStore } from "../store/staffSessionStore";

type LoadStatus = "loading" | "ready" | "error";

type StudentSearchStatus = "idle" | "loading" | "success" | "error";

const statusKeys: Record<MeetingEvent["status"], TranslationKey> = {
  draft: "admin.eventStatus.draft",
  active: "admin.eventStatus.active",
  old: "admin.eventStatus.old",
  archived: "admin.eventStatus.archived",
};

const printableStatuses: MeetingEvent["status"][] = ["active", "draft"];

type StaffLoadErrorKey =
  | "staff.loadError"
  | "staff.schoolLoadError"
  | "staff.eventsLoadError";

export function StaffDashboardPage() {
  const { t } = useT();
  const navigate = useNavigate();
  const signOut = useStaffSessionStore((state) => state.signOut);
  const adminSchoolId = useAdminSchoolStore((state) => state.currentSchoolId);
  const adminSchoolHydrated = useAdminSchoolStore((state) => state.hasHydrated);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [loadErrorKey, setLoadErrorKey] =
    useState<StaffLoadErrorKey>("staff.loadError");
  const [resolvedSchoolId, setResolvedSchoolId] = useState(DEFAULT_SCHOOL_ID);
  const [events, setEvents] = useState<MeetingEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [eventSearch, setEventSearch] = useState("");
  const [schoolNumber, setSchoolNumber] = useState("");
  const [studentSearchStatus, setStudentSearchStatus] =
    useState<StudentSearchStatus>("idle");
  const [studentSearchError, setStudentSearchError] = useState("");
  const [student, setStudent] = useState<Student | null>(null);

  useEffect(() => {
    let isCurrent = true;
    const debugEnabled = import.meta.env.DEV === true;
    const selectedSchoolCandidate = adminSchoolHydrated
      ? adminSchoolId.trim() || DEFAULT_SCHOOL_ID
      : DEFAULT_SCHOOL_ID;

    setStatus("loading");
    setLoadErrorKey("staff.loadError");
    setEvents([]);
    setSelectedEventId("");
    setStudent(null);
    setStudentSearchStatus("idle");
    setStudentSearchError("");

    async function loadDashboard() {
      if (debugEnabled) {
        console.info(
          "[Staff dashboard] school resolution started",
          JSON.stringify({
            selectedSchoolCandidate,
            adminSchoolHydrated,
            hasPersistedSelection: Boolean(adminSchoolId.trim()),
          }),
        );
      }

      let schoolIdToUse = selectedSchoolCandidate;

      try {
        const resolvedSchool = await repositories.schoolRepository.getSchoolById(
          selectedSchoolCandidate,
        );

        if (resolvedSchool) {
          schoolIdToUse = resolvedSchool.id;
          if (debugEnabled) {
            console.info(
              "[Staff dashboard] school resolution resolved",
              JSON.stringify({
                selectedSchoolCandidate,
                schoolId: schoolIdToUse,
                resolvedSchoolName: resolvedSchool.name,
              }),
            );
          }
        } else if (selectedSchoolCandidate !== DEFAULT_SCHOOL_ID) {
          if (debugEnabled) {
            console.info(
              "[Staff dashboard] school resolution fallback",
              JSON.stringify({
                selectedSchoolCandidate,
                fallbackSchoolId: DEFAULT_SCHOOL_ID,
              }),
            );
          }

          const fallbackSchool = await repositories.schoolRepository.getSchoolById(
            DEFAULT_SCHOOL_ID,
          );

          if (fallbackSchool) {
            schoolIdToUse = fallbackSchool.id;
            if (debugEnabled) {
              console.info(
                "[Staff dashboard] school resolution resolved",
                JSON.stringify({
                  selectedSchoolCandidate,
                  schoolId: schoolIdToUse,
                  resolvedSchoolName: fallbackSchool.name,
                  source: "default-fallback",
                }),
              );
            }
          } else {
            if (debugEnabled) {
              console.error(
                "[Staff dashboard] school resolution failed",
                JSON.stringify({
                  selectedSchoolCandidate,
                  fallbackSchoolId: DEFAULT_SCHOOL_ID,
                  reason: "default-school-not-found",
                }),
              );
            }

            if (!isCurrent) {
              return;
            }

            setLoadErrorKey("staff.schoolLoadError");
            setStatus("error");
            return;
          }
        } else {
          if (debugEnabled) {
            console.info(
              "[Staff dashboard] school resolution resolved",
              JSON.stringify({
                selectedSchoolCandidate,
                schoolId: schoolIdToUse,
                source: "default",
              }),
            );
          }
        }
      } catch (error) {
        if (debugEnabled) {
          console.error(
            "[Staff dashboard] school resolution failed",
            JSON.stringify({
              selectedSchoolCandidate,
              schoolId: schoolIdToUse,
              errorMessage: error instanceof Error ? error.message : String(error),
            }),
          );
        }

        if (!isCurrent) {
          return;
        }

        setLoadErrorKey("staff.schoolLoadError");
        setStatus("error");
        return;
      }

      if (!isCurrent) {
        return;
      }

      setResolvedSchoolId(schoolIdToUse);

      if (debugEnabled) {
        console.info(
          "[Staff dashboard] events query started",
          JSON.stringify({ schoolId: schoolIdToUse }),
        );
      }

      try {
        const nextEvents =
          await repositories.meetingRepository.listActiveDraftEvents(
          schoolIdToUse,
        );

        if (!isCurrent) {
          return;
        }

        const printableEvents = nextEvents.filter((event) =>
          printableStatuses.includes(event.status),
        );

        setEvents(printableEvents);
        setSelectedEventId((currentEventId) =>
          currentEventId || printableEvents[0]?.id || "",
        );
        setStatus("ready");

        if (debugEnabled) {
          console.info(
            "[Staff dashboard] events query resolved",
            JSON.stringify({
              schoolId: schoolIdToUse,
              eventsCount: nextEvents.length,
              printableEventsCount: printableEvents.length,
            }),
          );
        }
      } catch (error) {
        if (!isCurrent) {
          return;
        }

        if (debugEnabled) {
          console.error(
            "[Staff dashboard] events query failed",
            JSON.stringify({
              schoolId: schoolIdToUse,
              errorMessage: error instanceof Error ? error.message : String(error),
            }),
          );
        }

        setLoadErrorKey("staff.eventsLoadError");
        setStatus("error");
      }
    }

    void loadDashboard();

    return () => {
      isCurrent = false;
    };
  }, [adminSchoolHydrated, adminSchoolId]);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? null,
    [events, selectedEventId],
  );

  const filteredEvents = useMemo(() => {
    const query = eventSearch.trim().toLowerCase();

    if (!query) {
      return events;
    }

    return events.filter((event) =>
      [event.title, event.code, event.date, event.includedClassNames.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [eventSearch, events]);

  const meetingTargetUrl = selectedEvent
    ? buildAbsoluteUrl(`/meeting/${selectedEvent.code}`)
    : "";
  const studentSupportTargetUrl =
    selectedEvent && student
      ? buildAbsoluteUrl(
          `/meeting/${selectedEvent.code}/student/${student.schoolNumber}`,
        )
      : "";
  const meetingQrHeading = selectedEvent
    ? `${selectedEvent.title} - ${selectedEvent.code}`
    : t("staff.meetingQrEmptyHeading");
  const studentQrHeading =
    selectedEvent && student
      ? `${student.name} - ${student.schoolNumber}`
      : t("staff.studentQrEmptyHeading");

  useEffect(() => {
    setStudent(null);
    setStudentSearchStatus("idle");
    setStudentSearchError("");
  }, [selectedEventId]);

  async function handleStudentSearch() {
    setStudentSearchError("");

    if (!selectedEvent) {
      setStudentSearchStatus("error");
      setStudentSearchError(t("staff.studentSearchRequiresEvent"));
      return;
    }

    const normalizedSchoolNumber = schoolNumber.trim();
    if (!normalizedSchoolNumber) {
      setStudentSearchStatus("error");
      setStudentSearchError(t("staff.studentSearchRequiresSchoolNumber"));
      return;
    }

    setStudentSearchStatus("loading");
    try {
      if (import.meta.env.DEV === true) {
        console.info(
          "[Staff dashboard] student lookup started",
          JSON.stringify({
            schoolId: resolvedSchoolId,
            meetingCode: selectedEvent.code,
            schoolNumber: normalizedSchoolNumber,
          }),
        );
      }

      const foundStudent = await repositories.studentRepository.findBySchoolNumber({
        meetingCode: selectedEvent.code,
        schoolNumber: normalizedSchoolNumber,
      });

      if (!foundStudent) {
        if (import.meta.env.DEV === true) {
          console.info(
            "[Staff dashboard] student lookup resolved",
            JSON.stringify({
              schoolId: resolvedSchoolId,
              meetingCode: selectedEvent.code,
              schoolNumber: normalizedSchoolNumber,
              found: false,
            }),
          );
        }

        setStudent(null);
        setStudentSearchStatus("error");
        setStudentSearchError(t("staff.studentNotFound"));
        return;
      }

      if (import.meta.env.DEV === true) {
        console.info(
          "[Staff dashboard] student lookup resolved",
          JSON.stringify({
            schoolId: resolvedSchoolId,
            meetingCode: selectedEvent.code,
            schoolNumber: normalizedSchoolNumber,
            found: true,
            studentId: foundStudent.id,
            studentSchoolId: foundStudent.schoolId,
            classId: foundStudent.classId,
          }),
        );
      }

      setStudent(foundStudent);
      setStudentSearchStatus("success");
    } catch (error) {
      if (import.meta.env.DEV === true) {
        console.error(
          "[Staff dashboard] student lookup failed",
          JSON.stringify({
            schoolId: resolvedSchoolId,
            meetingCode: selectedEvent.code,
            schoolNumber: normalizedSchoolNumber,
            errorMessage: error instanceof Error ? error.message : String(error),
          }),
        );
      }

      setStudent(null);
      setStudentSearchStatus("error");
      setStudentSearchError(t("staff.studentSearchError"));
    }
  }

  function handleSignOut() {
    signOut();
    navigate("/staff/login", { replace: true });
  }

  if (status === "loading") {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-5xl flex-col gap-8">
        <SchoolHeader />
        <section className="surface my-auto p-6 text-center">
          <p className="text-strong text-lg font-extrabold">{t("staff.loading")}</p>
        </section>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-5xl flex-col gap-8">
        <SchoolHeader />
        <section className="surface my-auto p-6 text-center">
          <p className="status-danger rounded-2xl px-4 py-3 text-sm font-bold">
            {t(loadErrorKey)}
          </p>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <SchoolHeader />

      <section className="surface p-5 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="label">{t("staff.dashboardEyebrow")}</p>
            <h1 className="heading mt-3 font-display text-4xl font-black sm:text-5xl">
              {t("staff.dashboardTitle")}
            </h1>
            <p className="copy mt-3 max-w-2xl text-base font-semibold leading-7">
              {t("staff.dashboardDescription")}
            </p>
          </div>
          <button className="btn-secondary w-full sm:w-auto" onClick={handleSignOut} type="button">
            {t("staff.signOut")}
          </button>
        </div>
      </section>

      <section className="surface space-y-4 p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="label">{t("staff.eventsEyebrow")}</p>
            <h2 className="text-strong mt-2 text-2xl font-black">
              {t("staff.eventsTitle")}
            </h2>
            <p className="copy mt-2 text-sm font-semibold leading-6">
              {t("staff.eventsDescription")}
            </p>
          </div>
          <label className="block w-full sm:max-w-xs">
            <span className="label">{t("staff.eventsSearchLabel")}</span>
            <input
              className="input mt-2"
              onChange={(event) => setEventSearch(event.target.value)}
              placeholder={t("staff.eventsSearchPlaceholder")}
              value={eventSearch}
            />
          </label>
        </div>

        <div className="grid gap-3">
          {filteredEvents.length > 0 ? (
            filteredEvents.map((event) => {
              const isSelected = event.id === selectedEventId;

              return (
                <button
                  className={`rounded-3xl border p-4 text-left transition ${
                    isSelected
                      ? "border-[var(--color-primary)] bg-white shadow-soft"
                      : "border-[var(--color-border)] bg-white/80 hover:bg-white"
                  }`}
                  key={event.id}
                  onClick={() => setSelectedEventId(event.id)}
                  type="button"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <p className="text-strong text-lg font-black">{event.title}</p>
                      <p className="copy text-sm font-semibold">
                        {event.code} · {event.date} · {event.startTime} - {event.endTime}
                      </p>
                      <p className="copy text-sm font-semibold">
                        {event.includedClassNames.join(", ")}
                      </p>
                    </div>
                    <span
                      className={`w-fit rounded-full px-3 py-1 text-xs font-extrabold ${
                        event.status === "active"
                          ? "status-success"
                          : "status-warning"
                      }`}
                    >
                      {t(statusKeys[event.status])}
                    </span>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <span className="btn-secondary pointer-events-none">
                      {isSelected ? t("staff.selectedEvent") : t("staff.selectEvent")}
                    </span>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="soft-panel rounded-3xl p-5">
              <p className="copy text-sm font-semibold">{t("staff.eventsEmpty")}</p>
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {selectedEvent ? (
          <QrCodeCard
            downloadFileName={`meeting-qr-${selectedEvent.code}.png`}
            downloadLabelKey="admin.qrDownloadPng"
            heading={meetingQrHeading}
            labelKey="staff.meetingQrLabel"
            targetUrl={meetingTargetUrl}
          />
        ) : (
          <article className="surface space-y-4 p-5 sm:p-6">
            <div>
              <p className="label">{t("staff.meetingQrLabel")}</p>
              <h2 className="text-strong mt-2 text-2xl font-black">
                {t("staff.meetingQrEmptyHeading")}
              </h2>
              <p className="copy mt-2 text-sm font-semibold leading-6">
                {t("staff.meetingQrHint")}
              </p>
            </div>
          </article>
        )}

        <article className="surface space-y-5 p-5 sm:p-6">
          <div>
            <p className="label">{t("staff.studentSupportEyebrow")}</p>
            <h2 className="text-strong mt-2 text-2xl font-black">
              {t("staff.studentSupportTitle")}
            </h2>
            <p className="copy mt-2 text-sm font-semibold leading-6">
              {t("staff.studentSupportDescription")}
            </p>
          </div>

          <div className="grid gap-4">
            <label className="block">
              <span className="label">{t("staff.studentSchoolNumberLabel")}</span>
              <input
                className="input mt-2"
                inputMode="numeric"
                onChange={(event) => {
                  setSchoolNumber(event.target.value);
                  setStudent(null);
                  setStudentSearchStatus("idle");
                  setStudentSearchError("");
                }}
                placeholder={t("staff.studentSchoolNumberPlaceholder")}
                value={schoolNumber}
              />
            </label>

            <button
              className="btn-primary w-full"
              disabled={!selectedEvent || !schoolNumber.trim() || studentSearchStatus === "loading"}
              onClick={handleStudentSearch}
              type="button"
            >
              {studentSearchStatus === "loading"
                ? t("staff.loading")
                : t("staff.studentSearchButton")}
            </button>
          </div>

          {studentSearchError ? (
            <p className="status-danger rounded-2xl px-4 py-3 text-sm font-bold">
              {studentSearchError}
            </p>
          ) : null}

          {student && selectedEvent ? (
            <div className="soft-panel rounded-3xl p-4">
              <p className="label">{t("staff.studentFound")}</p>
              <div className="mt-3 grid gap-2 text-sm font-semibold">
                <p>
                  {t("dashboard.studentName")}: <span className="text-strong font-black">{student.name}</span>
                </p>
                <p>
                  {t("dashboard.className")}: <span className="text-strong font-black">{student.className}</span>
                </p>
                <p>
                  {t("dashboard.grade")}: <span className="text-strong font-black">{student.grade}</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="soft-panel rounded-3xl p-4">
              <p className="copy text-sm font-semibold">{t("staff.studentSupportHint")}</p>
            </div>
          )}

          {student && selectedEvent ? (
            <QrCodeCard
              downloadFileName={`student-qr-${selectedEvent.code}-${student.schoolNumber}.png`}
              downloadLabelKey="admin.qrDownloadPng"
              heading={studentQrHeading}
              labelKey="staff.studentSupportQrLabel"
              targetUrl={studentSupportTargetUrl}
            />
          ) : null}
        </article>
      </section>
    </div>
  );
}

function buildAbsoluteUrl(pathname: string) {
  if (typeof window === "undefined") {
    return pathname;
  }

  return new URL(pathname, window.location.origin).toString();
}
