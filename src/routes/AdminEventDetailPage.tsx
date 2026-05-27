import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { EventLifecycleActions } from "../components/EventLifecycleActions";
import { EventReadinessPanel } from "../components/EventReadinessPanel";
import type {
  EventReadiness,
  MeetingEvent,
  EventTeacherSetupOverview,
} from "../domain/models";
import { useT } from "../hooks/useT";
import type { TranslationKey } from "../i18n/i18n";
import { repositories } from "../repositories";

type DetailStatus = "loading" | "success" | "error";
type DeleteStatus = "idle" | "loading" | "error";

const statusKeys: Record<MeetingEvent["status"], TranslationKey> = {
  draft: "admin.eventStatus.draft",
  active: "admin.eventStatus.active",
  old: "admin.eventStatus.old",
  archived: "admin.eventStatus.archived",
};

const statusClasses: Record<MeetingEvent["status"], string> = {
  draft: "status-warning",
  active: "status-success",
  old: "soft-panel copy",
  archived: "status-danger",
};

const availabilityKeys = {
  available: "dashboard.available",
  busy: "dashboard.busy",
  limited: "dashboard.limited",
} as const;

export function AdminEventDetailPage() {
  const { eventId = "" } = useParams();
  const { t } = useT();
  const navigate = useNavigate();
  const [status, setStatus] = useState<DetailStatus>("loading");
  const [deleteStatus, setDeleteStatus] = useState<DeleteStatus>("idle");
  const [event, setEvent] = useState<MeetingEvent | null>(null);
  const [readiness, setReadiness] = useState<EventReadiness | null>(null);
  const [assignments, setAssignments] = useState<EventTeacherSetupOverview[]>([]);
  const parentTarget = event ? `/meeting/${encodeURIComponent(event.code)}` : "";
  const absoluteParentTarget = useMemo(() => {
    if (!event) {
      return "";
    }

    return `${window.location.origin}${parentTarget}`;
  }, [event, parentTarget]);

  async function handleDelete() {
    if (!event || event.status !== "draft") {
      return;
    }

    if (!window.confirm(t("admin.eventDeleteConfirm"))) {
      return;
    }

    setDeleteStatus("loading");

    try {
      await repositories.meetingRepository.deleteDraftEvent(event.id);
      navigate("/admin/events", {
        replace: true,
        state: { messageKey: "admin.eventDeleteSuccess" },
      });
    } catch {
      setDeleteStatus("error");
    }
  }

  useEffect(() => {
    let isCurrent = true;

    setStatus("loading");
    Promise.all([
      repositories.meetingRepository.getEventById(eventId),
      repositories.meetingRepository.getEventAssignments(eventId),
      repositories.meetingRepository.validateEventReadiness(eventId),
    ])
      .then(([nextEvent, nextAssignments, nextReadiness]) => {
        if (!isCurrent) {
          return;
        }

        setEvent(nextEvent);
        setAssignments(nextAssignments);
        setReadiness(nextReadiness);
        setStatus(nextEvent ? "success" : "error");
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
  }, [eventId]);

  if (status === "loading") {
    return (
      <section className="surface p-6 text-center">
        <p className="text-strong text-lg font-extrabold">
          {t("admin.eventDetailLoading")}
        </p>
      </section>
    );
  }

  if (!event) {
    return (
      <section className="surface p-6 text-center">
        <p className="status-danger rounded-2xl px-4 py-3 text-sm font-bold">
          {t("admin.eventDetailLoadError")}
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <section className="surface p-6 sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="label">{t("admin.eventDetailEyebrow")}</p>
            <h1 className="heading mt-3 font-display text-4xl font-black">
              {event.title}
            </h1>
            <p className="copy mt-2 text-sm font-bold">{event.code}</p>
          </div>
          <span
            className={`w-fit rounded-full px-3 py-1 text-xs font-extrabold ${statusClasses[event.status]}`}
          >
            {t(statusKeys[event.status])}
          </span>
        </div>

        <dl className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Meta label={t("admin.eventDate")} value={event.date} />
          <Meta label={t("admin.eventStartTime")} value={event.startTime} />
          <Meta label={t("admin.eventEndTime")} value={event.endTime} />
          <Meta
            label={t("admin.eventIncludedClasses")}
            value={event.includedClassNames.join(", ")}
          />
        </dl>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          {event.status !== "archived" ? (
            <Link className="btn-secondary w-full sm:w-auto" to={`/admin/events/${event.id}/edit`}>
              {t("admin.eventEdit")}
            </Link>
          ) : (
            <p className="status-warning rounded-2xl px-4 py-3 text-sm font-bold">
              {t("admin.eventEditRestoreFirst")}
            </p>
          )}
          <Link className="btn-secondary w-full sm:w-auto" to={`/admin/events/${event.id}/duplicate`}>
            {t("admin.eventDuplicate")}
          </Link>
          <Link className="btn-secondary w-full sm:w-auto" to={`/admin/events/${event.id}/assignments`}>
            {t("admin.eventAssignments")}
          </Link>
          {event.status === "draft" ? (
            <button
              className="btn-secondary border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
              disabled={deleteStatus === "loading"}
              onClick={handleDelete}
              type="button"
            >
              {deleteStatus === "loading"
                ? t("admin.eventDeleteRunning")
                : t("admin.eventDelete")}
            </button>
          ) : null}
        </div>
        {deleteStatus === "error" ? (
          <p className="status-danger mt-4 rounded-2xl px-4 py-3 text-sm font-bold">
            {t("admin.eventDeleteError")}
          </p>
        ) : null}
      </section>

      <section className="surface space-y-4 p-6 sm:p-8">
        <div>
          <p className="label">{t("admin.lifecycle.section")}</p>
          <h2 className="text-strong mt-2 text-2xl font-black">
            {t("admin.lifecycle.title")}
          </h2>
        </div>
        <EventLifecycleActions
          event={event}
          onEventUpdated={setEvent}
          readiness={readiness}
        />
      </section>

      <EventReadinessPanel readiness={readiness} />

      <section className="surface space-y-4 p-6 sm:p-8">
        <div>
          <p className="label">{t("admin.eventPreviewSection")}</p>
          <h2 className="text-strong mt-2 text-2xl font-black">
            {t("admin.eventPreviewTitle")}
          </h2>
        </div>
        <dl className="grid gap-3 lg:grid-cols-3">
          <Meta label={t("admin.parentMeetingUrl")} value={absoluteParentTarget} />
          <Meta label={t("admin.previewLinkTarget")} value={parentTarget} />
          <Meta label={t("admin.qrTargetText")} value={absoluteParentTarget} />
        </dl>
        <Link className="btn-primary w-full sm:w-auto" to={parentTarget}>
          {t("admin.openParentPreview")}
        </Link>
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
            <AssignmentRow assignment={assignment} key={assignment.id} />
          ))}
        </div>
      </section>
    </div>
  );
}

function AssignmentRow({
  assignment,
}: {
  assignment: EventTeacherSetupOverview;
}) {
  const { t } = useT();

  return (
    <article className="soft-panel grid gap-3 rounded-2xl p-4 lg:grid-cols-[1fr_1fr_1fr_0.8fr_0.6fr_0.8fr_1fr]">
      <RowCell label={t("admin.assignmentTeacher")} value={assignment.teacher.name} />
      <RowCell label={t("admin.assignmentSubject")} value={assignment.subject} />
      <RowCell label={t("dashboard.building")} value={assignment.building || t("admin.masterDataMissingValue")} />
      <RowCell label={t("dashboard.floor")} value={assignment.floor ? String(assignment.floor) : t("admin.masterDataMissingValue")} />
      <RowCell label={t("dashboard.classroom")} value={assignment.classroom || t("admin.masterDataMissingValue")} />
      <RowCell
        label={t("admin.assignmentAvailability")}
        value={t(availabilityKeys[assignment.availability])}
      />
      <div>
        <p className="label">{t("admin.assignmentTeacherSetupStatus")}</p>
        <p className="text-strong mt-1 text-sm font-black">
          {assignment.locationMissing
            ? t("admin.assignmentTeacherSetupMissing")
            : t("admin.assignmentTeacherSetupComplete")}
        </p>
        {assignment.locationMissing ? (
          <p className="copy mt-1 text-xs font-semibold">
            {t("admin.assignmentTeacherSetupMissingHint")}
          </p>
        ) : null}
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
