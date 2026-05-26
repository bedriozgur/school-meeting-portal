import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { EventReadinessPanel } from "../components/EventReadinessPanel";
import type {
  Availability,
  EventAssignmentInput,
  EventAssignmentOverview,
  EventReadiness,
  MeetingEvent,
  SchoolClass,
  Teacher,
} from "../domain/models";
import { useT } from "../hooks/useT";
import type { TranslationKey } from "../i18n/i18n";
import { repositories } from "../repositories";

type LoadStatus = "loading" | "success" | "error";
type SaveStatus = "idle" | "saving" | "success" | "error";

type AssignmentFormState = {
  id: string | null;
  classId: string;
  teacherId: string;
  subject: string;
  building: string;
  floor: string;
  classroom: string;
  availability: Availability;
};

const emptyForm: AssignmentFormState = {
  id: null,
  classId: "",
  teacherId: "",
  subject: "",
  building: "",
  floor: "",
  classroom: "",
  availability: "available",
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
  const [assignments, setAssignments] = useState<EventAssignmentOverview[]>([]);
  const [form, setForm] = useState<AssignmentFormState>(emptyForm);
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

  useEffect(() => {
    let isCurrent = true;

    setLoadStatus("loading");
    Promise.all([
      repositories.meetingRepository.getEventById(eventId),
      repositories.classRepository.listClasses(),
      repositories.teacherRepository.listTeachers(),
      repositories.assignmentRepository.listEventAssignments(eventId),
      repositories.meetingRepository.validateEventReadiness(eventId),
    ])
      .then(([
        nextEvent,
        nextClasses,
        nextTeachers,
        nextAssignments,
        nextReadiness,
      ]) => {
        if (!isCurrent) {
          return;
        }

        setEvent(nextEvent);
        setClasses(nextClasses);
        setTeachers(nextTeachers);
        setAssignments(nextAssignments);
        setReadiness(nextReadiness);
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

    const validationErrors = validateAssignmentForm(form, assignments);
    setErrorKeys(validationErrors);

    if (validationErrors.length > 0) {
      return;
    }

    setSaveStatus("saving");

    try {
      const input = toAssignmentInput(event.id, form);
      const savedAssignment = form.id
        ? await repositories.assignmentRepository.updateEventAssignment(
            form.id,
            input,
          )
        : await repositories.assignmentRepository.createEventAssignment(input);

      setAssignments((currentAssignments) =>
        sortAssignments(
          form.id
            ? currentAssignments.map((assignment) =>
                assignment.id === savedAssignment.id
                  ? savedAssignment
                  : assignment,
              )
            : [...currentAssignments, savedAssignment],
        ),
      );
      const nextReadiness =
        await repositories.meetingRepository.validateEventReadiness(event.id);
      setReadiness(nextReadiness);
      setForm(emptyForm);
      setSaveStatus("success");
    } catch {
      setSaveStatus("error");
    }
  }

  async function handleDelete(assignmentId: string) {
    if (!isDraft || !window.confirm(t("admin.assignmentsConfirmDelete"))) {
      return;
    }

    setSaveStatus("saving");

    try {
      await repositories.assignmentRepository.deleteEventAssignment(assignmentId);
      setAssignments((currentAssignments) =>
        currentAssignments.filter((assignment) => assignment.id !== assignmentId),
      );
      const nextReadiness =
        await repositories.meetingRepository.validateEventReadiness(event.id);
      setReadiness(nextReadiness);
      setSaveStatus("success");
      if (form.id === assignmentId) {
        setForm(emptyForm);
      }
    } catch {
      setSaveStatus("error");
    }
  }

  async function toggleAvailability(assignment: EventAssignmentOverview) {
    if (!isDraft || !event) {
      return;
    }

    setSaveStatus("saving");

    try {
      const savedAssignment =
        await repositories.assignmentRepository.updateEventAssignment(
          assignment.id,
          {
            eventId: event.id,
            classId: assignment.classId,
            teacherId: assignment.teacher.id,
            subject: assignment.subject,
            building: assignment.building,
            floor: assignment.floor,
            classroom: assignment.classroom,
            availability:
              assignment.availability === "busy" ? "available" : "busy",
          },
        );
      setAssignments((currentAssignments) =>
        sortAssignments(
          currentAssignments.map((currentAssignment) =>
            currentAssignment.id === savedAssignment.id
              ? savedAssignment
              : currentAssignment,
          ),
        ),
      );
      const nextReadiness =
        await repositories.meetingRepository.validateEventReadiness(event.id);
      setReadiness(nextReadiness);
      setSaveStatus("success");
    } catch {
      setSaveStatus("error");
    }
  }

  function startEdit(assignment: EventAssignmentOverview) {
    setForm({
      id: assignment.id,
      classId: assignment.classId,
      teacherId: assignment.teacher.id,
      subject: assignment.subject,
      building: assignment.building,
      floor: String(assignment.floor),
      classroom: assignment.classroom,
      availability: assignment.availability,
    });
    setErrorKeys([]);
    setSaveStatus("idle");
  }

  function updateTeacher(teacherId: string) {
    const teacher = teachers.find((currentTeacher) => currentTeacher.id === teacherId);

    setForm((currentForm) => ({
      ...currentForm,
      teacherId,
      subject: currentForm.subject || teacher?.subject || "",
    }));
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
          <div className="grid gap-4 lg:grid-cols-3">
            <label>
              <span className="label">{t("admin.assignmentClass")}</span>
              <select
                className="input mt-2"
                disabled={!isDraft}
                onChange={(inputEvent) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    classId: inputEvent.target.value,
                  }))
                }
                value={form.classId}
              >
                <option value="">{t("admin.assignmentsSelectClass")}</option>
                {includedClasses.map((schoolClass) => (
                  <option key={schoolClass.id} value={schoolClass.id}>
                    {schoolClass.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="label">{t("admin.assignmentTeacher")}</span>
              <select
                className="input mt-2"
                disabled={!isDraft}
                onChange={(inputEvent) => updateTeacher(inputEvent.target.value)}
                value={form.teacherId}
              >
                <option value="">{t("admin.assignmentsSelectTeacher")}</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="label">{t("admin.assignmentSubject")}</span>
              <input
                className="input mt-2"
                disabled={!isDraft}
                onChange={(inputEvent) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    subject: inputEvent.target.value,
                  }))
                }
                value={form.subject}
              />
            </label>
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
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
            <label>
              <span className="label">{t("admin.assignmentAvailability")}</span>
              <select
                className="input mt-2"
                disabled={!isDraft}
                onChange={(inputEvent) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    availability: inputEvent.target.value as Availability,
                  }))
                }
                value={form.availability}
              >
                <option value="available">{t("dashboard.available")}</option>
                <option value="busy">{t("dashboard.busy")}</option>
              </select>
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
          {assignments.map((assignment) => (
            <AssignmentRow
              assignment={assignment}
              isDraft={isDraft}
              key={assignment.id}
              onDelete={handleDelete}
              onEdit={startEdit}
              onToggleAvailability={toggleAvailability}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function AssignmentRow({
  assignment,
  isDraft,
  onDelete,
  onEdit,
  onToggleAvailability,
}: {
  assignment: EventAssignmentOverview;
  isDraft: boolean;
  onDelete: (assignmentId: string) => void;
  onEdit: (assignment: EventAssignmentOverview) => void;
  onToggleAvailability: (assignment: EventAssignmentOverview) => void;
}) {
  const { t } = useT();

  return (
    <article className="soft-panel grid gap-3 rounded-2xl p-4 xl:grid-cols-[0.7fr_1fr_1fr_0.7fr_0.5fr_0.8fr_0.8fr_auto]">
      <RowCell label={t("admin.assignmentClass")} value={assignment.className} />
      <RowCell label={t("admin.assignmentTeacher")} value={assignment.teacher.name} />
      <RowCell label={t("admin.assignmentSubject")} value={assignment.subject} />
      <RowCell label={t("dashboard.building")} value={assignment.building} />
      <RowCell label={t("dashboard.floor")} value={String(assignment.floor)} />
      <RowCell label={t("dashboard.classroom")} value={assignment.classroom} />
      <RowCell
        label={t("admin.assignmentAvailability")}
        value={t(availabilityKeys[assignment.availability])}
      />
      <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
        <button
          className="btn-secondary"
          disabled={!isDraft}
          onClick={() => onEdit(assignment)}
          type="button"
        >
          {t("admin.assignmentsEdit")}
        </button>
        <button
          className="btn-secondary"
          disabled={!isDraft}
          onClick={() => onToggleAvailability(assignment)}
          type="button"
        >
          {t("admin.assignmentsToggleAvailability")}
        </button>
        <button
          className="btn-secondary"
          disabled={!isDraft}
          onClick={() => onDelete(assignment.id)}
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
      <dd className="text-strong mt-2 break-words text-sm font-black">
        {value}
      </dd>
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

function validateAssignmentForm(
  form: AssignmentFormState,
  assignments: EventAssignmentOverview[],
) {
  const errors: TranslationKey[] = [];

  if (!form.classId) {
    errors.push("admin.assignmentsErrorClassRequired");
  }

  if (!form.teacherId) {
    errors.push("admin.assignmentsErrorTeacherRequired");
  }

  if (!form.subject.trim()) {
    errors.push("admin.assignmentsErrorSubjectRequired");
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

  const duplicate = assignments.some(
    (assignment) =>
      assignment.id !== form.id &&
      assignment.classId === form.classId &&
      assignment.teacher.id === form.teacherId &&
      assignment.subject.trim().toLocaleLowerCase("tr") ===
        form.subject.trim().toLocaleLowerCase("tr"),
  );

  if (duplicate) {
    errors.push("admin.assignmentsErrorDuplicate");
  }

  return errors;
}

function toAssignmentInput(
  eventId: string,
  form: AssignmentFormState,
): EventAssignmentInput {
  return {
    eventId,
    classId: form.classId,
    teacherId: form.teacherId,
    subject: form.subject.trim(),
    building: form.building.trim(),
    floor: Number(form.floor),
    classroom: form.classroom.trim(),
    availability: form.availability,
  };
}

function sortAssignments(assignments: EventAssignmentOverview[]) {
  return [...assignments].sort((left, right) => {
    const className = left.className.localeCompare(right.className, "tr", {
      numeric: true,
    });

    if (className !== 0) {
      return className;
    }

    const building = left.building.localeCompare(right.building, "tr");

    if (building !== 0) {
      return building;
    }

    if (left.floor !== right.floor) {
      return left.floor - right.floor;
    }

    return left.classroom.localeCompare(right.classroom, "tr", {
      numeric: true,
    });
  });
}
