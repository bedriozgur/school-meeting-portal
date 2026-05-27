import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { EventReadinessPanel } from "../components/EventReadinessPanel";
import type {
  Availability,
  EventReadiness,
  EventTeacherSetupOverview,
  MeetingEvent,
  SchoolClass,
  Teacher,
  TeachingAssignment,
} from "../domain/models";
import { useT } from "../hooks/useT";
import type { TranslationKey } from "../i18n/i18n";
import { repositories } from "../repositories";

type LoadStatus = "loading" | "success" | "error";
type SaveStatus = "idle" | "saving" | "success" | "error";

type SetupFormState = {
  id: string | null;
  teacherId: string;
  building: string;
  floor: string;
  classroom: string;
  isAvailable: boolean;
};

const emptyForm: SetupFormState = {
  id: null,
  teacherId: "",
  building: "",
  floor: "",
  classroom: "",
  isAvailable: true,
};

const statusKeys: Record<MeetingEvent["status"], TranslationKey> = {
  draft: "admin.eventStatus.draft",
  active: "admin.eventStatus.active",
  old: "admin.eventStatus.old",
  archived: "admin.eventStatus.archived",
};

const availabilityKeys: Record<Availability, TranslationKey> = {
  available: "dashboard.available",
  busy: "dashboard.busy",
  limited: "dashboard.limited",
};

export function AdminEventAssignmentsPage() {
  const { eventId = "" } = useParams();
  const { t } = useT();
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [event, setEvent] = useState<MeetingEvent | null>(null);
  const [readiness, setReadiness] = useState<EventReadiness | null>(null);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teachingAssignments, setTeachingAssignments] = useState<TeachingAssignment[]>([]);
  const [setupRows, setSetupRows] = useState<EventTeacherSetupOverview[]>([]);
  const [form, setForm] = useState<SetupFormState>(emptyForm);
  const [errorKeys, setErrorKeys] = useState<TranslationKey[]>([]);
  const isDraft = event?.status === "draft";

  const includedClasses = useMemo(
    () =>
      event
        ? classes.filter((schoolClass) =>
            event.includedClasses.includes(schoolClass.id),
          )
        : [],
    [classes, event],
  );

  const includedClassIds = useMemo(() => new Set(includedClasses.map((item) => item.id)), [includedClasses]);

  const involvedTeachers = useMemo(() => {
    const teacherById = new Map(teachers.map((teacher) => [teacher.id, teacher] as const));
    const subjectByTeacherId = new Map<string, string>();

    teachingAssignments.forEach((assignment) => {
      if (!includedClassIds.has(assignment.classId)) {
        return;
      }

      if (!assignment.isActive) {
        return;
      }

      if (!subjectByTeacherId.has(assignment.teacherId)) {
        subjectByTeacherId.set(assignment.teacherId, assignment.subject);
      }
    });

    return [...subjectByTeacherId.entries()]
      .map(([teacherId, subject]) => {
        const teacher = teacherById.get(teacherId);

        if (!teacher) {
          return null;
        }

        return {
          teacher,
          subject,
        };
      })
      .filter((item): item is { teacher: Teacher; subject: string } => Boolean(item))
      .sort((left, right) => left.teacher.name.localeCompare(right.teacher.name, "tr"));
  }, [includedClassIds, teachers, teachingAssignments]);

  useEffect(() => {
    let isCurrent = true;

    setLoadStatus("loading");
    const teachingAssignmentsPromise = (async () => {
      const nextEvent = await repositories.meetingRepository.getEventById(eventId);
      if (!nextEvent) {
        return [] as TeachingAssignment[];
      }

      const rows = await Promise.all(
        nextEvent.includedClasses.map((classId) =>
          repositories.teachingAssignmentRepository.listTeachingAssignmentsForClass(
            classId,
          ),
        ),
      );

      return rows.flat().filter((assignment) => assignment.isActive);
    })();

    Promise.all([
      repositories.meetingRepository.getEventById(eventId),
      repositories.classRepository.listClasses(),
      repositories.teacherRepository.listTeachers(),
      repositories.meetingRepository.getEventAssignments(eventId),
      repositories.meetingRepository.validateEventReadiness(eventId),
      teachingAssignmentsPromise,
    ])
      .then(([
        nextEvent,
        nextClasses,
        nextTeachers,
        nextSetupRows,
        nextReadiness,
        nextTeachingAssignments,
      ]) => {
        if (!isCurrent) {
          return;
        }

        setEvent(nextEvent);
        setClasses(nextClasses);
        setTeachers(nextTeachers);
        setSetupRows(nextSetupRows);
        setReadiness(nextReadiness);
        setTeachingAssignments(nextTeachingAssignments);
        setLoadStatus(nextEvent ? "success" : "error");
      })
      .catch(() => {
        if (isCurrent) {
          setLoadStatus("error");
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [eventId]);

  async function handleSubmit(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();

    if (!event || !isDraft) {
      return;
    }

    const validationErrors = validateSetupForm(form, setupRows);
    setErrorKeys(validationErrors);

    if (validationErrors.length > 0) {
      return;
    }

    setSaveStatus("saving");

    try {
      const input = toSetupInput(event.id, form);
      const savedSetup = form.id
        ? await repositories.assignmentRepository.updateEventAssignment(form.id, input)
        : await repositories.assignmentRepository.createEventAssignment(input);

      setSetupRows((currentRows) =>
        sortSetups(
          form.id
            ? currentRows.map((row) => (row.id === savedSetup.id ? savedSetup : row))
            : [...currentRows, savedSetup],
        ),
      );
      const nextReadiness = await repositories.meetingRepository.validateEventReadiness(
        event.id,
      );
      setReadiness(nextReadiness);
      setForm(emptyForm);
      setSaveStatus("success");
    } catch {
      setSaveStatus("error");
    }
  }

  async function handleDelete(setupId: string) {
    if (!isDraft || !window.confirm(t("admin.assignmentsConfirmDelete"))) {
      return;
    }

    setSaveStatus("saving");

    try {
      await repositories.assignmentRepository.deleteEventAssignment(setupId);
      setSetupRows((currentRows) => currentRows.filter((row) => row.id !== setupId));
      const nextReadiness = await repositories.meetingRepository.validateEventReadiness(
        eventId,
      );
      setReadiness(nextReadiness);
      setSaveStatus("success");
      if (form.id === setupId) {
        setForm(emptyForm);
      }
    } catch {
      setSaveStatus("error");
    }
  }

  async function toggleAvailability(setup: EventTeacherSetupOverview) {
    if (!isDraft || !event) {
      return;
    }

    setSaveStatus("saving");

    try {
      const savedSetup = await repositories.assignmentRepository.updateEventAssignment(
        setup.id,
        {
          eventId: event.id,
          teacherId: setup.teacher.id,
          building: setup.building,
          floor: setup.floor,
          classroom: setup.classroom,
          isAvailable: setup.availability === "busy",
        },
      );

      setSetupRows((currentRows) =>
        sortSetups(
          currentRows.map((row) => (row.id === savedSetup.id ? savedSetup : row)),
        ),
      );
      const nextReadiness = await repositories.meetingRepository.validateEventReadiness(
        event.id,
      );
      setReadiness(nextReadiness);
      setSaveStatus("success");
    } catch {
      setSaveStatus("error");
    }
  }

  function startEdit(setup: EventTeacherSetupOverview) {
    setForm({
      id: setup.id.startsWith("missing-") ? null : setup.id,
      teacherId: setup.teacher.id,
      building: setup.building,
      floor: String(setup.floor),
      classroom: setup.classroom,
      isAvailable: setup.availability !== "busy",
    });
    setErrorKeys([]);
    setSaveStatus("idle");
  }

  if (loadStatus === "loading") {
    return (
      <section className="surface p-6 text-center">
        <p className="text-strong text-lg font-extrabold">
          {t("admin.assignmentsLoading")}
        </p>
      </section>
    );
  }

  if (!event) {
    return (
      <section className="surface p-6 text-center">
        <p className="status-danger rounded-2xl px-4 py-3 text-sm font-bold">
          {t("admin.assignmentsLoadError")}
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <section className="surface p-6 sm:p-8">
        <p className="label">{t("admin.assignmentsEyebrow")}</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="heading font-display text-4xl font-black">
              {t("admin.assignmentsTitle")}
            </h1>
            <p className="copy mt-3 max-w-3xl text-base font-semibold leading-7">
              {t("admin.assignmentsDescription")}
            </p>
          </div>
          <Link className="btn-secondary w-full sm:w-auto" to={`/admin/events/${event.id}`}>
            {t("admin.assignmentsBackToEvent")}
          </Link>
        </div>

        <dl className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Meta label={t("admin.eventDetails")} value={event.title} />
          <Meta label={t("admin.eventMeetingCode")} value={event.code} />
          <Meta label={t("admin.eventStatusLabel")} value={t(statusKeys[event.status])} />
          <Meta
            label={t("admin.eventIncludedClasses")}
            value={event.includedClassNames.join(", ")}
          />
        </dl>

        {!isDraft ? (
          <p className="status-warning mt-5 rounded-2xl px-4 py-3 text-sm font-bold">
            {t("admin.assignmentsReadOnlyNotice")}
          </p>
        ) : null}
      </section>

      <EventReadinessPanel readiness={readiness} />

      <section className="surface p-6 sm:p-8">
        <div className="mb-4">
          <p className="label">{t("admin.assignmentsFormEyebrow")}</p>
          <h2 className="text-strong mt-2 text-2xl font-black">
            {form.id
              ? t("admin.assignmentsEditTitle")
              : t("admin.assignmentsAddTitle")}
          </h2>
        </div>

        {errorKeys.length > 0 ? (
          <div className="status-danger mb-4 rounded-2xl px-4 py-3 text-sm font-bold">
            {errorKeys.map((errorKey) => (
              <p key={errorKey}>{t(errorKey)}</p>
            ))}
          </div>
        ) : null}

        {saveStatus === "success" ? (
          <p className="status-success mb-4 rounded-2xl px-4 py-3 text-sm font-bold">
            {t("admin.assignmentsSaveSuccess")}
          </p>
        ) : null}

        {saveStatus === "error" ? (
          <p className="status-danger mb-4 rounded-2xl px-4 py-3 text-sm font-bold">
            {t("admin.assignmentsSaveError")}
          </p>
        ) : null}

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 lg:grid-cols-2">
            <label>
              <span className="label">{t("admin.assignmentTeacher")}</span>
              <select
                className="input mt-2"
                disabled={!isDraft}
                onChange={(inputEvent) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    teacherId: inputEvent.target.value,
                  }))
                }
                value={form.teacherId}
              >
                <option value="">{t("admin.assignmentsSelectTeacher")}</option>
                {involvedTeachers.map(({ teacher, subject }) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name} · {subject}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="label">{t("admin.assignmentAvailability")}</span>
              <select
                className="input mt-2"
                disabled={!isDraft}
                onChange={(inputEvent) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    isAvailable: inputEvent.target.value === "available",
                  }))
                }
                value={form.isAvailable ? "available" : "busy"}
              >
                <option value="available">{t("dashboard.available")}</option>
                <option value="busy">{t("dashboard.busy")}</option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <label>
              <span className="label">{t("dashboard.building")}</span>
              <input
                className="input mt-2"
                disabled={!isDraft}
                onChange={(inputEvent) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    building: inputEvent.target.value,
                  }))
                }
                value={form.building}
              />
            </label>
            <label>
              <span className="label">{t("dashboard.floor")}</span>
              <input
                className="input mt-2"
                disabled={!isDraft}
                onChange={(inputEvent) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    floor: inputEvent.target.value,
                  }))
                }
                type="number"
                value={form.floor}
              />
            </label>
            <label>
              <span className="label">{t("dashboard.classroom")}</span>
              <input
                className="input mt-2"
                disabled={!isDraft}
                onChange={(inputEvent) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    classroom: inputEvent.target.value,
                  }))
                }
                value={form.classroom}
              />
            </label>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              className="btn-primary"
              disabled={!isDraft || saveStatus === "saving"}
              type="submit"
            >
              {saveStatus === "saving"
                ? t("admin.assignmentsSaving")
                : t("admin.assignmentsSave")}
            </button>
            <button
              className="btn-secondary"
              disabled={!isDraft}
              onClick={() => {
                setForm(emptyForm);
                setErrorKeys([]);
              }}
              type="button"
            >
              {t("admin.assignmentsClearForm")}
            </button>
          </div>
        </form>
      </section>

      <section className="surface p-6 sm:p-8">
        <div className="mb-4">
          <p className="label">{t("admin.assignmentOverviewEyebrow")}</p>
          <h2 className="text-strong mt-2 text-2xl font-black">
            {t("admin.assignmentOverviewTitle")}
          </h2>
        </div>
        <div className="grid gap-3">
          {setupRows.map((setup) => (
      <SetupRow
              key={setup.id}
              isDraft={isDraft}
              onDelete={handleDelete}
              onEdit={startEdit}
              onToggleAvailability={toggleAvailability}
              setup={setup}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function SetupRow({
  setup,
  isDraft,
  onDelete,
  onEdit,
  onToggleAvailability,
}: {
  setup: EventTeacherSetupOverview;
  isDraft: boolean;
  onDelete: (setupId: string) => void;
  onEdit: (setup: EventTeacherSetupOverview) => void;
  onToggleAvailability: (setup: EventTeacherSetupOverview) => void;
}) {
  const { t } = useT();

  return (
    <article className="soft-panel grid gap-3 rounded-2xl p-4 xl:grid-cols-[1fr_1fr_0.7fr_0.5fr_0.8fr_0.8fr_auto]">
      <RowCell label={t("admin.assignmentTeacher")} value={setup.teacher.name} />
      <RowCell label={t("admin.assignmentSubject")} value={setup.subject} />
      <RowCell label={t("dashboard.building")} value={setup.building || t("admin.masterDataMissingValue")} />
      <RowCell label={t("dashboard.floor")} value={setup.floor ? String(setup.floor) : t("admin.masterDataMissingValue")} />
      <RowCell label={t("dashboard.classroom")} value={setup.classroom || t("admin.masterDataMissingValue")} />
      <RowCell
        label={t("admin.assignmentAvailability")}
        value={t(availabilityKeys[setup.availability])}
      />
      <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
        <button
          className="btn-secondary"
          disabled={!isDraft}
          onClick={() => onEdit(setup)}
          type="button"
        >
          {t("admin.assignmentsEdit")}
        </button>
        <button
          className="btn-secondary"
          disabled={!isDraft || setup.id.startsWith("missing-")}
          onClick={() => onToggleAvailability(setup)}
          type="button"
        >
          {t("admin.assignmentsToggleAvailability")}
        </button>
        <button
          className="btn-secondary"
          disabled={!isDraft || setup.id.startsWith("missing-")}
          onClick={() => onDelete(setup.id)}
          type="button"
        >
          {t("admin.assignmentsRemove")}
        </button>
      </div>
    </article>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="soft-panel min-w-0 rounded-2xl p-3">
      <dt className="label">{label}</dt>
      <dd className="text-strong mt-2 break-words text-sm font-black">{value}</dd>
    </div>
  );
}

function RowCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="label">{label}</p>
      <p className="text-strong mt-1 text-sm font-black">{value}</p>
    </div>
  );
}

function validateSetupForm(
  form: SetupFormState,
  existingRows: EventTeacherSetupOverview[],
) {
  const errors: TranslationKey[] = [];

  if (!form.teacherId) {
    errors.push("admin.assignmentsErrorTeacherRequired");
  }

  if (!form.building.trim()) {
    errors.push("admin.assignmentsErrorBuildingRequired");
  }

  if (!form.floor.trim() || !Number.isFinite(Number(form.floor))) {
    errors.push("admin.assignmentsErrorFloorRequired");
  }

  if (!form.classroom.trim()) {
    errors.push("admin.assignmentsErrorClassroomRequired");
  }

  const duplicate = existingRows.some(
    (row) =>
      !row.id.startsWith("missing-") &&
      row.id !== form.id &&
      row.teacher.id === form.teacherId,
  );

  if (duplicate) {
    errors.push("admin.assignmentsErrorDuplicate");
  }

  return errors;
}

function toSetupInput(eventId: string, form: SetupFormState) {
  return {
    eventId,
    teacherId: form.teacherId,
    building: form.building.trim(),
    floor: Number(form.floor),
    classroom: form.classroom.trim(),
    isAvailable: form.isAvailable,
  };
}

function sortSetups(assignments: EventTeacherSetupOverview[]) {
  return [...assignments].sort((left, right) => {
    const building = left.building.localeCompare(right.building, "tr");
    if (building !== 0) return building;
    if (left.floor !== right.floor) return left.floor - right.floor;
    return left.classroom.localeCompare(right.classroom, "tr", { numeric: true });
  });
}
