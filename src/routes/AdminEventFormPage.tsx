import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import type { EventFormInput, MeetingEvent, SchoolClass } from "../domain/models";
import { useT } from "../hooks/useT";
import type { TranslationKey } from "../i18n/i18n";
import { repositories } from "../repositories";
import { generateUniqueMeetingCode } from "../repositories/meetingCodes";

type FormMode = "new" | "edit" | "duplicate";
type LoadStatus = "loading" | "success" | "error";

type FormState = {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  includedClasses: string[];
};

const emptyForm: FormState = {
  title: "",
  date: "",
  startTime: "",
  endTime: "",
  includedClasses: [],
};

const statusKeys: Record<MeetingEvent["status"], TranslationKey> = {
  draft: "admin.eventStatus.draft",
  active: "admin.eventStatus.active",
  old: "admin.eventStatus.old",
  archived: "admin.eventStatus.archived",
};

export function AdminEventFormPage() {
  const { eventId } = useParams();
  const location = useLocation();
  const mode: FormMode = location.pathname.endsWith("/duplicate")
    ? "duplicate"
    : eventId
      ? "edit"
      : "new";
  const { t } = useT();
  const navigate = useNavigate();
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [isSaving, setIsSaving] = useState(false);
  const [event, setEvent] = useState<MeetingEvent | null>(null);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errorKeys, setErrorKeys] = useState<string[]>([]);
  const [saveError, setSaveError] = useState("");
  const [generatedMeetingCode, setGeneratedMeetingCode] = useState("");
  const displayStatus =
    mode === "new" || mode === "duplicate"
      ? t("admin.eventStatus.draft")
      : event
        ? t(statusKeys[event.status])
        : "";
  const displayMeetingCode =
    mode === "new" || mode === "duplicate"
      ? generatedMeetingCode || t("admin.eventFormCodeLoading")
      : event?.code ?? "";
  const title =
    mode === "new"
      ? t("admin.eventFormNewTitle")
      : mode === "duplicate"
        ? t("admin.eventFormDuplicateTitle")
        : t("admin.eventFormEditTitle");
  const description =
    mode === "duplicate"
      ? t("admin.eventFormDuplicateDescription")
      : t("admin.eventFormDescription");
  const canEdit = mode !== "edit" || event?.status !== "archived";

  useEffect(() => {
    let isCurrent = true;

    setStatus("loading");
    async function loadForm() {
      const [nextClasses, nextEvent] = await Promise.all([
        repositories.classRepository.listClasses(),
        eventId ? repositories.meetingRepository.getEventById(eventId) : Promise.resolve(null),
      ]);
      const needsGeneratedCode = mode === "new" || mode === "duplicate";
      const nextMeetingCode = needsGeneratedCode
        ? await generateUniqueMeetingCode((meetingCode) =>
            repositories.meetingRepository.isMeetingCodeAvailable(meetingCode),
          )
        : "";

      if (!isCurrent) {
        return;
      }

      setClasses(nextClasses);
      setEvent(nextEvent);
      setGeneratedMeetingCode(nextMeetingCode);
      setForm(getInitialForm(mode, nextEvent));
      setStatus(eventId && !nextEvent ? "error" : "success");
    }

    loadForm()
      .then(() => {
        if (!isCurrent) {
          return;
        }
      })
      .catch(() => {
        if (isCurrent) {
          setStatus("error");
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [eventId, mode]);

  const selectedClassSet = useMemo(
    () => new Set(form.includedClasses),
    [form.includedClasses],
  );

  async function handleSubmit(eventSubmit: FormEvent<HTMLFormElement>) {
    eventSubmit.preventDefault();
    setSaveError("");
    const validationErrors = validateForm(form);
    setErrorKeys(validationErrors);

    if (validationErrors.length > 0 || !canEdit) {
      return;
    }

    setIsSaving(true);

    try {
      const input: EventFormInput = {
        meetingCode:
          mode === "new" || mode === "duplicate"
            ? generatedMeetingCode
            : undefined,
        ...form,
      };
      const savedEvent = await saveEvent(mode, eventId ?? "", input);

      navigate(`/admin/events/${savedEvent.id}`);
    } catch {
      setSaveError(t("admin.eventFormSaveError"));
    } finally {
      setIsSaving(false);
    }
  }

  function toggleClass(classId: string) {
    setForm((current) => ({
      ...current,
      includedClasses: selectedClassSet.has(classId)
        ? current.includedClasses.filter((selectedClassId) => selectedClassId !== classId)
        : [...current.includedClasses, classId],
    }));
  }

  if (status === "loading") {
    return (
      <section className="surface p-6 text-center">
        <p className="text-strong text-lg font-extrabold">{t("admin.eventFormLoading")}</p>
      </section>
    );
  }

  if (status === "error") {
    return (
      <section className="surface p-6 text-center">
        <p className="status-danger rounded-2xl px-4 py-3 text-sm font-bold">
          {t("admin.eventFormLoadError")}
        </p>
      </section>
    );
  }

  return (
    <form className="surface space-y-6 p-6 sm:p-8" onSubmit={handleSubmit}>
      <div>
        <p className="label">{t("admin.eventFormEyebrow")}</p>
        <h1 className="heading mt-3 font-display text-4xl font-black">{title}</h1>
        <p className="copy mt-3 text-base font-semibold leading-7">
          {description}
        </p>
      </div>

      {!canEdit ? (
        <p className="status-warning rounded-2xl px-4 py-3 text-sm font-bold">
          {t("admin.eventFormArchivedNotice")}
        </p>
      ) : null}

      {errorKeys.length > 0 ? (
        <div className="status-danger rounded-2xl px-4 py-3 text-sm font-bold">
          {errorKeys.map((key) => (
            <p key={key}>{t(key as Parameters<typeof t>[0])}</p>
          ))}
        </div>
      ) : null}

      {saveError ? (
        <p className="status-danger rounded-2xl px-4 py-3 text-sm font-bold">{saveError}</p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <ReadOnlyField label={t("admin.eventStatusLabel")} value={displayStatus} />
        <ReadOnlyField label={t("admin.eventMeetingCode")} value={displayMeetingCode} />
      </div>

      <label className="block">
        <span className="label">{t("admin.eventFormName")}</span>
        <input
          className="input mt-2"
          disabled={!canEdit}
          onChange={(inputEvent) =>
            setForm((current) => ({ ...current, title: inputEvent.target.value }))
          }
          value={form.title}
        />
      </label>

      <div className="grid gap-4 lg:grid-cols-3">
        <label className="block">
          <span className="label">{t("admin.eventDate")}</span>
          <input
            className="input mt-2"
            disabled={!canEdit}
            onChange={(inputEvent) =>
              setForm((current) => ({ ...current, date: inputEvent.target.value }))
            }
            type="date"
            value={form.date}
          />
        </label>
        <label className="block">
          <span className="label">{t("admin.eventStartTime")}</span>
          <input
            className="input mt-2"
            disabled={!canEdit}
            onChange={(inputEvent) =>
              setForm((current) => ({ ...current, startTime: inputEvent.target.value }))
            }
            type="time"
            value={form.startTime}
          />
        </label>
        <label className="block">
          <span className="label">{t("admin.eventEndTime")}</span>
          <input
            className="input mt-2"
            disabled={!canEdit}
            onChange={(inputEvent) =>
              setForm((current) => ({ ...current, endTime: inputEvent.target.value }))
            }
            type="time"
            value={form.endTime}
          />
        </label>
      </div>

      <section>
        <p className="label">{t("admin.eventIncludedClasses")}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((schoolClass) => (
            <label
              className="soft-panel flex min-h-14 items-center gap-3 rounded-2xl p-4 text-sm font-extrabold"
              key={schoolClass.id}
            >
              <input
                checked={selectedClassSet.has(schoolClass.id)}
                className="h-5 w-5 [accent-color:var(--color-primary)]"
                disabled={!canEdit}
                onChange={() => toggleClass(schoolClass.id)}
                type="checkbox"
              />
              {schoolClass.name}
            </label>
          ))}
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          className="btn-primary"
          disabled={
            !canEdit ||
            isSaving ||
            ((mode === "new" || mode === "duplicate") && !generatedMeetingCode)
          }
          type="submit"
        >
          {isSaving ? t("admin.eventFormSaving") : t("admin.eventFormSave")}
        </button>
        <Link className="btn-secondary" to="/admin/events">
          {t("admin.eventFormCancel")}
        </Link>
      </div>
    </form>
  );
}

function getInitialForm(mode: FormMode, event: MeetingEvent | null): FormState {
  if (!event) {
    return emptyForm;
  }

  return {
    title: event.title,
    date: mode === "duplicate" ? "" : event.date,
    startTime: event.startTime,
    endTime: event.endTime,
    includedClasses: event.includedClasses,
  };
}

function saveEvent(mode: FormMode, eventId: string, input: EventFormInput) {
  if (mode === "new") {
    return repositories.meetingRepository.createEvent(input);
  }

  if (mode === "duplicate") {
    return repositories.meetingRepository.duplicateEvent(eventId, input);
  }

  return repositories.meetingRepository.updateEvent(eventId, input);
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="soft-panel rounded-2xl p-4">
      <p className="label">{label}</p>
      <p className="text-strong mt-2 text-lg font-black">{value}</p>
    </div>
  );
}

function validateForm(form: FormState) {
  const errors: string[] = [];

  if (!form.title.trim()) {
    errors.push("admin.eventFormErrorNameRequired");
  }

  if (!form.date) {
    errors.push("admin.eventFormErrorDateRequired");
  }

  if (!form.startTime || !form.endTime) {
    errors.push("admin.eventFormErrorTimeRequired");
  }

  if (form.startTime && form.endTime && form.endTime <= form.startTime) {
    errors.push("admin.eventFormErrorEndAfterStart");
  }

  if (form.includedClasses.length === 0) {
    errors.push("admin.eventFormErrorClassRequired");
  }

  return errors;
}
