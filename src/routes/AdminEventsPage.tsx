import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { EventLifecycleActions } from "../components/EventLifecycleActions";
import type { MeetingEvent } from "../domain/models";
import { useT } from "../hooks/useT";
import type { TranslationKey } from "../i18n/i18n";
import { repositories } from "../repositories";
import { useAdminSchoolStore } from "../store/adminSchoolStore";

type EventStatus = "idle" | "loading" | "success" | "error";

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

export function AdminEventsPage() {
  const { t } = useT();
  const { currentSchoolId, hasHydrated } = useAdminSchoolStore();
  const [status, setStatus] = useState<EventStatus>("loading");
  const [events, setEvents] = useState<MeetingEvent[]>([]);
  const sortedEvents = useMemo(
    () =>
      [...events].sort((left, right) => right.date.localeCompare(left.date)),
    [events],
  );

  function handleEventUpdated(updatedEvent: MeetingEvent) {
    setEvents((currentEvents) =>
      currentEvents.map((event) =>
        event.id === updatedEvent.id ? updatedEvent : event,
      ),
    );
  }

  useEffect(() => {
    let isCurrent = true;

    if (!hasHydrated) {
      return undefined;
    }

    setStatus("loading");
    repositories.meetingRepository
      .listEvents(currentSchoolId)
      .then((nextEvents) => {
        if (!isCurrent) {
          return;
        }

        setEvents(nextEvents);
        setStatus("success");
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
  }, [currentSchoolId, hasHydrated]);

  return (
    <div className="space-y-5">
      <section className="surface p-6 sm:p-8">
        <p className="label">{t("admin.eventsEyebrow")}</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="heading font-display text-4xl font-black">
              {t("admin.eventsTitle")}
            </h1>
            <p className="copy mt-3 max-w-3xl text-base font-semibold leading-7">
              {t("admin.eventsDescription")}
            </p>
          </div>
          <Link className="btn-primary w-full sm:w-auto" to="/admin/events/new">
            {t("admin.eventsCreate")}
          </Link>
        </div>
      </section>

      {status === "loading" ? (
        <section className="surface p-6 text-center">
          <p className="text-strong text-lg font-extrabold">
            {t("admin.eventsLoading")}
          </p>
        </section>
      ) : null}

      {status === "error" ? (
        <section className="surface p-6 text-center">
          <p className="status-danger rounded-2xl px-4 py-3 text-sm font-bold">
            {t("admin.eventsLoadError")}
          </p>
        </section>
      ) : null}

      {status === "success" ? (
        <section className="grid gap-4">
          {sortedEvents.map((event) => (
            <EventCard
              event={event}
              key={event.id}
              onEventUpdated={handleEventUpdated}
            />
          ))}
        </section>
      ) : null}
    </div>
  );
}

function EventCard({
  event,
  onEventUpdated,
}: {
  event: MeetingEvent;
  onEventUpdated: (event: MeetingEvent) => void;
}) {
  const { t } = useT();

  return (
    <article className="surface p-5">
      <div className="grid gap-5 xl:grid-cols-[1fr_auto]">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-strong text-2xl font-black">{event.title}</h2>
              <p className="copy mt-1 text-sm font-bold">{event.code}</p>
            </div>
            <span
              className={`w-fit rounded-full px-3 py-1 text-xs font-extrabold ${statusClasses[event.status]}`}
            >
              {t(statusKeys[event.status])}
            </span>
          </div>

          <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <EventMeta label={t("admin.eventDate")} value={event.date} />
            <EventMeta label={t("admin.eventStartTime")} value={event.startTime} />
            <EventMeta label={t("admin.eventEndTime")} value={event.endTime} />
            <EventMeta
              label={t("admin.eventIncludedClasses")}
              value={event.includedClassNames.join(", ")}
            />
          </dl>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:w-56 xl:grid-cols-1">
          <Link className="btn-secondary" to={`/admin/events/${event.id}`}>
            {t("admin.eventDetails")}
          </Link>
          {event.status !== "archived" ? (
            <Link className="btn-secondary" to={`/admin/events/${event.id}/edit`}>
              {t("admin.eventEdit")}
            </Link>
          ) : (
            <button className="btn-secondary" disabled type="button">
              {t("admin.eventEditRestoreFirst")}
            </button>
          )}
          <Link className="btn-secondary" to={`/admin/events/${event.id}/duplicate`}>
            {t("admin.eventDuplicate")}
          </Link>
          <Link className="btn-secondary" to={`/admin/events/${event.id}/assignments`}>
            {t("admin.eventAssignments")}
          </Link>
          <EventLifecycleActions
            event={event}
            onEventUpdated={onEventUpdated}
          />
        </div>
      </div>
    </article>
  );
}

function EventMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="soft-panel rounded-2xl p-3">
      <dt className="label">{label}</dt>
      <dd className="text-strong mt-2 text-sm font-black">{value}</dd>
    </div>
  );
}
