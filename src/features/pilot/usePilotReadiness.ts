import { useEffect, useMemo, useState } from "react";
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

export type PilotReadinessData = {
  firebaseConfigured: boolean;
  dataSource: "mock" | "firestore";
  activeEventsCount: number;
  activeEvents: MeetingEvent[];
  draftEvents: MeetingEvent[];
  readinessWarningCount: number;
  teachersCount: number;
  classesCount: number;
  studentsCount: number;
  assignmentsCount: number;
  staffPortalConfigured: boolean;
  adminAuthConfigured: boolean;
  activeDraftReadiness: PilotEventReadiness[];
};

type PilotReadinessState = {
  status: LoadStatus;
  data: PilotReadinessData | null;
};

export function usePilotReadiness() {
  const { hasAdminClaim, isAllowlistedAdmin } = useAuth();
  const [state, setState] = useState<PilotReadinessState>({
    status: "loading",
    data: null,
  });

  useEffect(() => {
    let isCurrent = true;

    setState({ status: "loading", data: null });
    Promise.all([
      repositories.meetingRepository.listEvents(),
      repositories.teacherRepository.listTeachers(),
      repositories.classRepository.listClasses(),
      repositories.studentRepository.listStudents(),
    ])
      .then(async ([events, teachers, classes, students]) => {
        const assignmentsByClass = await Promise.all(
          classes.map((schoolClass) =>
            repositories.teachingAssignmentRepository.listTeachingAssignmentsForClass(
              schoolClass.id,
            ),
          ),
        );

        if (!isCurrent) {
          return;
        }

        const activeEvents = events.filter((event) => event.status === "active");
        const draftEvents = events.filter((event) => event.status === "draft");
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
            teachersCount: teachers.length,
            classesCount: classes.length,
            studentsCount: students.length,
            assignmentsCount: assignmentsByClass.flat().length,
            staffPortalConfigured: isStaffPortalConfigured(),
            adminAuthConfigured: isAllowlistedAdmin || hasAdminClaim,
            activeDraftReadiness,
          },
        });
      })
      .catch(() => {
        if (!isCurrent) {
          return;
        }

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
