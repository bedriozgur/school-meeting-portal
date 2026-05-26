import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import type { MeetingEvent, Student } from "../domain/models";
import { useT } from "../hooks/useT";
import type { TranslationKey } from "../i18n/i18n";
import { repositories } from "../repositories";
import { QrCodeCard } from "../features/qr/QrCodeCard";
import { QrPrintCard } from "../features/qr/QrPrintCard";

type LoadStatus = "loading" | "ready" | "error";

type StudentSupportTarget = {
  eventId: string;
  meetingCode: string;
  schoolNumber: string;
};

export function AdminQrPage() {
  const { t } = useT();
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [events, setEvents] = useState<MeetingEvent[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedMeetingIds, setSelectedMeetingIds] = useState<string[]>([]);
  const [schoolNumber, setSchoolNumber] = useState("");
  const [generatedStudentTarget, setGeneratedStudentTarget] =
    useState<StudentSupportTarget | null>(null);

  useEffect(() => {
    let isCurrent = true;

    setStatus("loading");
    Promise.all([
      repositories.meetingRepository.listEvents(),
      repositories.studentRepository.listStudents(),
    ])
      .then(([nextEvents, nextStudents]) => {
        if (!isCurrent) {
          return;
        }

        setEvents(nextEvents);
        setStudents(nextStudents);
        setSelectedEventId((currentEventId) =>
          currentEventId || nextEvents[0]?.id || "",
        );
        setSelectedMeetingIds((currentIds) =>
          currentIds.filter((eventId) =>
            nextEvents.some((event) => event.id === eventId),
          ),
        );
        setStatus("ready");
      })
      .catch(() => {
        if (!isCurrent) {
          return;
        }

        setStatus("error");
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? null,
    [events, selectedEventId],
  );
  const printableEvents = useMemo(
    () => events.filter((event) => ["active", "draft"].includes(event.status)),
    [events],
  );
  const selectedMeetingEvents = useMemo(
    () =>
      events.filter((event) => selectedMeetingIds.includes(event.id)),
    [events, selectedMeetingIds],
  );

  const portalTargetUrl = buildAbsoluteUrl("/");
  const studentSupportUrl = generatedStudentTarget
    ? buildAbsoluteUrl(
        `/meeting/${generatedStudentTarget.meetingCode}/student/${generatedStudentTarget.schoolNumber}`,
      )
    : "";
  const supportStudentOptions = useMemo(
    () =>
      students
        .filter((student) =>
          selectedEvent ? selectedEvent.includedClasses.includes(student.classId) : true,
        )
        .map((student) => ({
          label: `${student.schoolNumber} - ${student.name}`,
          value: student.schoolNumber,
        })),
    [selectedEvent, students],
  );
  const allPrintableSelected =
    printableEvents.length > 0 &&
    printableEvents.every((event) => selectedMeetingIds.includes(event.id));

  function handleGenerateStudentQr() {
    if (!selectedEvent || !schoolNumber.trim()) {
      return;
    }

    setGeneratedStudentTarget({
      eventId: selectedEvent.id,
      meetingCode: selectedEvent.code,
      schoolNumber: schoolNumber.trim(),
    });
  }

  function toggleMeetingSelection(eventId: string) {
    setSelectedMeetingIds((currentIds) =>
      currentIds.includes(eventId)
        ? currentIds.filter((currentEventId) => currentEventId !== eventId)
        : [...currentIds, eventId],
    );
  }

  function handleSelectAllPrintable() {
    setSelectedMeetingIds(printableEvents.map((event) => event.id));
  }

  function handleClearSelection() {
    setSelectedMeetingIds([]);
  }

  function handlePrintSelected() {
    if (selectedMeetingEvents.length === 0) {
      return;
    }

    schedulePrint();
  }

  function handlePrintAllPrintable() {
    if (printableEvents.length === 0) {
      return;
    }

    setSelectedMeetingIds(printableEvents.map((event) => event.id));
    schedulePrint();
  }

  return (
    <div className="space-y-5 print:space-y-4">
      <section className="surface p-6 sm:p-8 print:shadow-none">
        <p className="label">{t("admin.qrEyebrow")}</p>
        <h1 className="heading mt-3 font-display text-4xl font-black">
          {t("admin.qrTitle")}
        </h1>
        <p className="copy mt-3 max-w-3xl text-base font-semibold leading-7">
          {t("admin.qrDescription")}
        </p>
      </section>

      {status === "loading" ? (
        <section className="surface p-6 text-center print:hidden">
          <p className="text-strong text-lg font-extrabold">{t("admin.qrLoading")}</p>
        </section>
      ) : null}

      {status === "error" ? (
        <section className="surface p-6 text-center print:hidden">
          <p className="status-danger rounded-2xl px-4 py-3 text-sm font-bold">
            {t("admin.qrLoadError")}
          </p>
        </section>
      ) : null}

      {status === "ready" ? (
        <>
          <section className="surface space-y-5 p-6 sm:p-8 print:hidden">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="label">{t("admin.qrBulkEyebrow")}</p>
                <h2 className="text-strong mt-2 text-2xl font-black">
                  {t("admin.qrBulkTitle")}
                </h2>
                <p className="copy mt-3 max-w-3xl text-base font-semibold leading-7">
                  {t("admin.qrBulkDescription")}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  className="btn-secondary w-full sm:w-auto"
                  onClick={handleSelectAllPrintable}
                  type="button"
                >
                  {t("admin.qrSelectPrintable")}
                </button>
                <button
                  className="btn-secondary w-full sm:w-auto"
                  onClick={handleClearSelection}
                  type="button"
                >
                  {t("admin.qrClearSelection")}
                </button>
                <button
                  className="btn-secondary w-full sm:w-auto"
                  onClick={handlePrintAllPrintable}
                  type="button"
                >
                  {t("admin.qrPrintAllActiveDraft")}
                </button>
                <button
                  className="btn-primary w-full sm:w-auto"
                  onClick={handlePrintSelected}
                  disabled={selectedMeetingEvents.length === 0}
                  type="button"
                >
                  {t("admin.qrPrintSelected")}
                </button>
              </div>
            </div>

            <p className="copy text-sm font-semibold">
              {allPrintableSelected
                ? t("admin.qrAllPrintableSelected")
                : t("admin.qrBulkHint")}
            </p>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {events.map((event) => {
                const isPrintable = ["active", "draft"].includes(event.status);
                const isSelected = selectedMeetingIds.includes(event.id);

                return (
                  <label
                    className={`flex cursor-pointer items-start gap-3 rounded-3xl border px-4 py-4 transition ${
                      isSelected
                        ? "border-[var(--color-primary)] bg-white"
                        : "border-[var(--color-border)] bg-white/70"
                    } ${!isPrintable ? "opacity-80" : ""}`}
                    key={event.id}
                  >
                    <input
                      checked={isSelected}
                      className="mt-1 h-5 w-5 accent-[var(--color-primary)]"
                      disabled={!isPrintable}
                      onChange={() => toggleMeetingSelection(event.id)}
                      type="checkbox"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-strong text-base font-black">{event.title}</p>
                      <p className="copy mt-1 text-sm font-semibold">
                        {event.code} · {t(statusKeys[event.status])}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <QrCodeCard
              downloadFileName="portal-qr.png"
              downloadLabelKey="admin.qrDownloadPng"
              heading={t("admin.qrPortalHeading")}
              labelKey="admin.qrPortalLabel"
              targetUrl={portalTargetUrl}
            />

            <article className="surface space-y-4 p-5 sm:p-6 print:shadow-none">
              <div>
                <p className="label">{t("admin.qrSupportEyebrow")}</p>
                <h2 className="text-strong mt-2 text-2xl font-black">
                  {t("admin.qrStudentSupportTitle")}
                </h2>
              </div>

              <div className="grid gap-4 print:hidden">
                <label className="block">
                  <span className="label">{t("admin.qrEventSelectLabel")}</span>
                  <select
                    className="input mt-2"
                    onChange={(event) => {
                      setSelectedEventId(event.target.value);
                      setGeneratedStudentTarget(null);
                    }}
                    value={selectedEventId}
                  >
                    {events.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.title} - {event.code}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="label">{t("admin.qrSchoolNumberLabel")}</span>
                  <input
                    className="input mt-2"
                    list="qr-student-school-numbers"
                    onChange={(event: ChangeEvent<HTMLInputElement>) => {
                      setSchoolNumber(event.target.value);
                      setGeneratedStudentTarget(null);
                    }}
                    placeholder={t("admin.qrSchoolNumberPlaceholder")}
                    value={schoolNumber}
                  />
                </label>

                <datalist id="qr-student-school-numbers">
                  {supportStudentOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </datalist>

                <button
                  className="btn-primary w-full sm:w-auto"
                  disabled={!selectedEvent || !schoolNumber.trim()}
                  onClick={handleGenerateStudentQr}
                  type="button"
                >
                  {t("admin.qrGenerateStudent")}
                </button>
              </div>

              {generatedStudentTarget ? (
                <QrCodeCard
                  downloadFileName={`student-qr-${generatedStudentTarget.schoolNumber}.png`}
                  downloadLabelKey="admin.qrDownloadPng"
                  heading={
                    selectedEvent
                      ? `${selectedEvent.title} - ${generatedStudentTarget.schoolNumber}`
                      : generatedStudentTarget.schoolNumber
                  }
                  labelKey="admin.qrStudentTargetLabel"
                  targetUrl={studentSupportUrl}
                />
              ) : (
                <div className="soft-panel rounded-3xl p-5">
                  <p className="copy text-sm font-semibold">
                    {t("admin.qrStudentSupportHint")}
                  </p>
                </div>
              )}
            </article>
          </section>

          <section className="surface p-6 sm:p-8 print:shadow-none">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between print:hidden">
              <div>
                <p className="label">{t("admin.qrMeetingsEyebrow")}</p>
                <h2 className="text-strong mt-2 text-2xl font-black">
                  {t("admin.qrMeetingsTitle")}
                </h2>
              </div>
              <p className="copy max-w-xl text-sm font-semibold">
                {t("admin.qrMeetingsDescription")}
              </p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {events.map((event) => (
                <QrCodeCard
                  downloadFileName={`meeting-qr-${event.code}.png`}
                  downloadLabelKey="admin.qrDownloadPng"
                  heading={`${event.title} - ${event.code}`}
                  labelKey="admin.qrMeetingLabel"
                  key={event.id}
                  targetUrl={buildAbsoluteUrl(`/meeting/${event.code}`)}
                />
              ))}
            </div>
          </section>

            <section className="hidden print:block print-sheet space-y-6">
              {selectedMeetingEvents.map((event) => (
                <QrPrintCard
                  event={event}
                  key={event.id}
                targetUrl={buildAbsoluteUrl(`/meeting/${event.code}`)}
              />
            ))}
          </section>
        </>
      ) : null}
    </div>
  );
}

const statusKeys: Record<MeetingEvent["status"], TranslationKey> = {
  draft: "admin.eventStatus.draft",
  active: "admin.eventStatus.active",
  old: "admin.eventStatus.old",
  archived: "admin.eventStatus.archived",
};

function buildAbsoluteUrl(pathname: string) {
  if (typeof window === "undefined") {
    return pathname;
  }

  return new URL(pathname, window.location.origin).toString();
}

function schedulePrint() {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      window.print();
    });
  });
}
