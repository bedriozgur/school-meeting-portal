import { useState } from "react";
import type { EventReadiness, MeetingEvent } from "../domain/models";
import {
  getValidLifecycleActions,
  type EventLifecycleAction,
} from "../repositories/eventLifecycle";
import { repositories } from "../repositories";
import { useT } from "../hooks/useT";
import type { TranslationKey } from "../i18n/i18n";

const actionLabels: Record<EventLifecycleAction, TranslationKey> = {
  activate: "admin.lifecycle.activate",
  archive: "admin.lifecycle.archive",
  markOld: "admin.lifecycle.markOld",
  restoreDraft: "admin.lifecycle.restoreDraft",
};

const confirmLabels: Record<EventLifecycleAction, TranslationKey> = {
  activate: "admin.lifecycle.confirmActivate",
  archive: "admin.lifecycle.confirmArchive",
  markOld: "admin.lifecycle.confirmMarkOld",
  restoreDraft: "admin.lifecycle.confirmRestoreDraft",
};

type EventLifecycleActionsProps = {
  event: MeetingEvent;
  onEventUpdated: (event: MeetingEvent) => void;
  readiness?: EventReadiness | null;
};

export function EventLifecycleActions({
  event,
  onEventUpdated,
  readiness,
}: EventLifecycleActionsProps) {
  const { t } = useT();
  const [runningAction, setRunningAction] = useState<EventLifecycleAction | null>(
    null,
  );
  const [messageKey, setMessageKey] = useState<TranslationKey | null>(null);
  const [messageType, setMessageType] = useState<"success" | "danger">(
    "success",
  );
  const actions = getValidLifecycleActions(event.status);

  async function runAction(action: EventLifecycleAction) {
    setMessageKey(null);

    if (!window.confirm(t(confirmLabels[action]))) {
      return;
    }

    setRunningAction(action);

    try {
      const updatedEvent = await callLifecycleAction(action, event.id);
      onEventUpdated(updatedEvent);
      setMessageType("success");
      setMessageKey("admin.lifecycle.success");
    } catch {
      setMessageType("danger");
      setMessageKey("admin.lifecycle.error");
    } finally {
      setRunningAction(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
        {actions.map((action) => (
          <button
            className="btn-secondary"
            disabled={
              runningAction !== null ||
              (action === "activate" && readiness?.isReady === false)
            }
            key={action}
            onClick={() => runAction(action)}
            type="button"
          >
            {runningAction === action
              ? t("admin.lifecycle.running")
              : t(actionLabels[action])}
          </button>
        ))}
      </div>
      {actions.includes("activate") && readiness?.isReady === false ? (
        <p className="status-danger rounded-2xl px-4 py-3 text-sm font-bold">
          {t("admin.lifecycle.activateBlocked")}
        </p>
      ) : null}
      {messageKey ? (
        <p
          className={`rounded-2xl px-4 py-3 text-sm font-bold ${
            messageType === "success" ? "status-success" : "status-danger"
          }`}
        >
          {t(messageKey)}
        </p>
      ) : null}
    </div>
  );
}

function callLifecycleAction(action: EventLifecycleAction, eventId: string) {
  switch (action) {
    case "activate":
      return repositories.meetingRepository.activateEvent(eventId);
    case "archive":
      return repositories.meetingRepository.archiveEvent(eventId);
    case "markOld":
      return repositories.meetingRepository.markEventOld(eventId);
    case "restoreDraft":
      return repositories.meetingRepository.restoreEventToDraft(eventId);
  }
}
