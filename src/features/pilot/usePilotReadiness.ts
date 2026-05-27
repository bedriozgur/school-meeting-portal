import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../auth/useAuth";
import type { EventReadiness, MeetingEvent } from "../../domain/models";
import { dataSource, repositories } from "../../repositories";
import { getFirebaseApp, missingFirebaseEnvKeys } from "../../lib/firebase";
import { STAFF_ACCESS_CODE_FALLBACK } from "../../store/staffSessionStore";

type LoadStatus = "loading" | "ready" | "error";

type PilotEventReadiness = {
  event: MeetingEvent;
  readiness: EventReadiness;
};

export type PilotReadinessSummaryData = {
  firebaseConfigured: boolean;
  dataSource: "mock" | "firestore";
  activeEventsCount: number;
  readinessWarningCount: number;
  teachersCount: number;
  classesCount: number;
  studentsCount: number;
  assignmentsCount: number;
  staffPortalConfigured: boolean;
  adminAuthConfigured: boolean;
};

export type PilotReadinessData = PilotReadinessSummaryData & {
  activeEvents: MeetingEvent[];
  draftEvents: MeetingEvent[];
  activeDraftReadiness: PilotEventReadiness[];
};

type PilotReadinessState<T> = {
  status: LoadStatus;
  data: T | null;
};

export function usePilotReadinessSummary() {
  const { hasAdminClaim, isAllowlistedAdmin } = useAuth();
  const loadIdRef = useRef(0);
  const [state, setState] = useState<PilotReadinessState<PilotReadinessSummaryData>>({
    status: "loading",
    data: null,
  });

  useEffect(() => {
    let isCurrent = true;
    const loadId = ++loadIdRef.current;
    const logger = createPilotReadinessLogger("summary", loadId);

    logger.step("load started");
    setState({ status: "loading", data: null });

    Promise.all([
      repositories.meetingRepository.listEvents(),
      repositories.teacherRepository.countTeachers(),
      repositories.classRepository.countClasses(),
      repositories.studentRepository.countStudents(),
      repositories.teachingAssignmentRepository.countTeachingAssignments(),
    ])
      .then(([events, teachersCount, classesCount, studentsCount, assignmentsCount]) => {
        if (!isCurrent) {
          return;
        }

        const activeEvents = events.filter((event) => event.status === "active");
        const draftEvents = events.filter((event) => event.status === "draft");
        logger.step("lightweight reads resolved", {
          eventsCount: events.length,
          activeEventsCount: activeEvents.length,
          draftEventsCount: draftEvents.length,
          teachersCount,
          classesCount,
          studentsCount,
          assignmentsCount,
        });

        setState({
          status: "ready",
          data: {
            firebaseConfigured:
              Boolean(getFirebaseApp()) && missingFirebaseEnvKeys.length === 0,
            dataSource,
            activeEventsCount: activeEvents.length,
            readinessWarningCount: draftEvents.length,
            teachersCount,
            classesCount,
            studentsCount,
            assignmentsCount,
            staffPortalConfigured: isStaffPortalConfigured(),
            adminAuthConfigured: isAllowlistedAdmin || hasAdminClaim,
          },
        });

        logger.step("load completed", {
          activeEventsCount: activeEvents.length,
          readinessWarningCount: draftEvents.length,
        });
      })
      .catch((error) => {
        if (!isCurrent) {
          return;
        }

        logger.error("load failed", error);
        setState({ status: "error", data: null });
      });

    return () => {
      isCurrent = false;
    };
  }, [hasAdminClaim, isAllowlistedAdmin]);

  return useMemo(
    () => ({
      status: state.status,
      data: state.data,
    }),
    [state.data, state.status],
  );
}

export function usePilotReadiness() {
  const { hasAdminClaim, isAllowlistedAdmin } = useAuth();
  const loadIdRef = useRef(0);
  const [state, setState] = useState<PilotReadinessState<PilotReadinessData>>({
    status: "loading",
    data: null,
  });

  useEffect(() => {
    let isCurrent = true;
    const loadId = ++loadIdRef.current;
    const logger = createPilotReadinessLogger("checklist", loadId);

    logger.step("load started");
    setState({ status: "loading", data: null });

    Promise.all([
      repositories.meetingRepository.listEvents(),
      repositories.teacherRepository.countTeachers(),
      repositories.classRepository.countClasses(),
      repositories.studentRepository.countStudents(),
      repositories.teachingAssignmentRepository.countTeachingAssignments(),
    ])
      .then(async ([events, teachersCount, classesCount, studentsCount, assignmentsCount]) => {
        const activeEvents = events.filter((event) => event.status === "active");
        const draftEvents = events.filter((event) => event.status === "draft");

        logger.step("baseline reads resolved", {
          eventsCount: events.length,
          activeEventsCount: activeEvents.length,
          draftEventsCount: draftEvents.length,
          teachersCount,
          classesCount,
          studentsCount,
          assignmentsCount,
        });

        logger.step("readiness validation started", {
          eventCount: activeEvents.length + draftEvents.length,
        });
        const activeDraftReadiness = await Promise.all(
          [...activeEvents, ...draftEvents].map(async (event) => ({
            event,
            readiness: await repositories.meetingRepository.validateEventReadiness(
              event.id,
            ),
          })),
        );

        if (!isCurrent) {
          return;
        }

        logger.step("readiness validation resolved", {
          eventCount: activeDraftReadiness.length,
          warningCount: activeDraftReadiness.reduce(
            (count, item) => count + item.readiness.warnings.length,
            0,
          ),
        });

        setState({
          status: "ready",
          data: {
            firebaseConfigured:
              Boolean(getFirebaseApp()) && missingFirebaseEnvKeys.length === 0,
            dataSource,
            activeEventsCount: activeEvents.length,
            activeEvents,
            draftEvents,
            readinessWarningCount: activeDraftReadiness.reduce(
              (count, item) => count + item.readiness.warnings.length,
              0,
            ),
            teachersCount,
            classesCount,
            studentsCount,
            assignmentsCount,
            staffPortalConfigured: isStaffPortalConfigured(),
            adminAuthConfigured: isAllowlistedAdmin || hasAdminClaim,
            activeDraftReadiness,
          },
        });
      })
      .catch((error) => {
        if (!isCurrent) {
          return;
        }

        logger.error("load failed", error);
        setState({ status: "error", data: null });
      });

    return () => {
      isCurrent = false;
    };
  }, [hasAdminClaim, isAllowlistedAdmin]);

  return useMemo(
    () => ({
      status: state.status,
      data: state.data,
    }),
    [state.data, state.status],
  );
}

function isStaffPortalConfigured() {
  const configuredValue = import.meta.env.VITE_STAFF_ACCESS_CODE?.trim() ?? "";

  return configuredValue.length > 0 && configuredValue !== STAFF_ACCESS_CODE_FALLBACK;
}

function createPilotReadinessLogger(
  scope: "summary" | "checklist",
  loadId: number,
) {
  const startedAt = performance.now();

  return {
    step(step: string, details?: Record<string, unknown>) {
      if (!isDevelopmentEnvironment()) {
        return;
      }

      console.info(`[Pilot readiness:${scope}] ${step}`, {
        loadId,
        elapsedMs: Math.round(performance.now() - startedAt),
        ...(details ? safeDetails(details) : {}),
      });
    },
    error(step: string, error: unknown, details?: Record<string, unknown>) {
      if (!isDevelopmentEnvironment()) {
        return;
      }

      console.error(`[Pilot readiness:${scope}] ${step}`, {
        loadId,
        elapsedMs: Math.round(performance.now() - startedAt),
        errorMessage: getErrorMessage(error),
        errorCode: getErrorCode(error),
        error: safeValue(error),
        ...(details ? safeDetails(details) : {}),
      });
    },
  };
}

function isDevelopmentEnvironment() {
  return import.meta.env.DEV === true;
}

function safeDetails(details: Record<string, unknown>) {
  return safeValue(details) as Record<string, unknown>;
}

function safeValue(value: unknown) {
  try {
    return JSON.parse(
      JSON.stringify(value, (_key, nestedValue) => {
        if (nestedValue instanceof Error) {
          return {
            name: nestedValue.name,
            message: nestedValue.message,
            code: getErrorCode(nestedValue),
          };
        }

        if (typeof nestedValue === "bigint") {
          return nestedValue.toString();
        }

        if (typeof nestedValue === "function") {
          return "[Function]";
        }

        return nestedValue;
      }),
    ) as unknown;
  } catch {
    return {
      serializationFailed: true,
      value: String(value),
    };
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function getErrorCode(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    return (error as { code: string }).code;
  }

  return undefined;
}
