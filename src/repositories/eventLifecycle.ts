import type { MeetingEvent } from "../domain/models";

export type EventLifecycleAction =
  | "activate"
  | "archive"
  | "markOld"
  | "restoreDraft";

const validTransitions: Record<MeetingEvent["status"], MeetingEvent["status"][]> =
  {
    draft: ["active", "archived"],
    active: ["old", "archived"],
    old: ["archived"],
    archived: ["draft"],
  };

export function assertValidEventTransition(
  currentStatus: MeetingEvent["status"],
  nextStatus: MeetingEvent["status"],
) {
  if (!validTransitions[currentStatus].includes(nextStatus)) {
    throw new Error(`Invalid event status transition: ${currentStatus} -> ${nextStatus}`);
  }
}

export function getNextStatusForAction(
  action: EventLifecycleAction,
): MeetingEvent["status"] {
  switch (action) {
    case "activate":
      return "active";
    case "archive":
      return "archived";
    case "markOld":
      return "old";
    case "restoreDraft":
      return "draft";
  }
}

export function getValidLifecycleActions(
  status: MeetingEvent["status"],
): EventLifecycleAction[] {
  return validTransitions[status].map((nextStatus) => {
    switch (nextStatus) {
      case "active":
        return "activate";
      case "archived":
        return "archive";
      case "old":
        return "markOld";
      case "draft":
        return "restoreDraft";
    }
  });
}
