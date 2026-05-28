import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { EventReadinessPanel } from "../components/EventReadinessPanel";
import {
  EventTeacherSetupGrid,
  type EditableEventTeacherSetupRow,
} from "../components/EventTeacherSetupGrid";
import { DEFAULT_SCHOOL_ID } from "../config/school";
import type {
  EventReadiness,
  EventTeacherSetupOverview,
  MeetingEvent,
  Teacher,
  TeachingAssignment,
} from "../domain/models";
import { useT } from "../hooks/useT";
import type { TranslationKey } from "../i18n/i18n";
import { repositories } from "../repositories";
import { logFirestoreCollectionFailure } from "../repositories/firestore/firestoreRepositoryLogging";
import { useAdminSchoolStore } from "../store/adminSchoolStore";

type LoadStatus = "loading" | "success" | "error";
type SaveStatus = "idle" | "saving" | "success" | "error";

const statusKeys: Record<MeetingEvent["status"], TranslationKey> = {
  draft: "admin.eventStatus.draft",
  active: "admin.eventStatus.active",
  old: "admin.eventStatus.old",
  archived: "admin.eventStatus.archived",
};

export function AdminEventAssignmentsPage() {
  const { eventId = "" } = useParams();
  const { t } = useT();
  const { currentSchoolId, hasHydrated } = useAdminSchoolStore();
  const selectedSchoolId = currentSchoolId.trim() || DEFAULT_SCHOOL_ID;
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [event, setEvent] = useState<MeetingEvent | null>(null);
  const [readiness, setReadiness] = useState<EventReadiness | null>(null);
  const [readinessWarning, setReadinessWarning] =
    useState<TranslationKey | null>(null);
  const [partialLoadWarning, setPartialLoadWarning] =
    useState<TranslationKey | null>(null);
  const [editableRows, setEditableRows] = useState<
    EditableEventTeacherSetupRow[]
  >([]);
  const [errorKeys, setErrorKeys] = useState<TranslationKey[]>([]);
  const isDraft = event?.status === "draft";

  useEffect(() => {
    let isCurrent = true;

    if (!hasHydrated) {
      return undefined;
    }

    setLoadStatus("loading");
    setReadinessWarning(null);
    setPartialLoadWarning(null);
    setErrorKeys([]);
    setEditableRows([]);

    (async () => {
      try {
        if (import.meta.env.DEV) {
          console.info("[Admin assignments] load started", {
            eventId,
            selectedSchoolId,
            currentSchoolId,
          });
        }

        const nextEvent = await repositories.meetingRepository.getEventById(eventId);

        if (!nextEvent) {
          await logFirestoreCollectionFailure({
            collectionName: "events",
            operation: "getEventById",
            schoolId: selectedSchoolId,
            context: {
              eventId,
              currentSchoolId,
              selectedSchoolId,
            },
            error: new Error(`Event not found: ${eventId}`),
          });

          if (isCurrent) {
            setLoadStatus("error");
          }

          return;
        }

        const resolvedSchoolId =
          nextEvent.schoolId?.trim() || selectedSchoolId;

        if (import.meta.env.DEV) {
          console.info("[Admin assignments] event resolved", {
            eventId: nextEvent.id,
            eventSchoolId: nextEvent.schoolId,
            resolvedSchoolId,
            selectedSchoolId,
            currentSchoolId,
          });
        }

        const [classesResult, teachersResult, assignmentsResult, setupsResult, readinessResult] =
          await Promise.allSettled([
            repositories.classRepository.listClasses(resolvedSchoolId),
            repositories.teacherRepository.listTeachers(resolvedSchoolId),
            Promise.all(
              nextEvent.includedClasses.map((classId) =>
                repositories.teachingAssignmentRepository.listTeachingAssignmentsForClass(
                  classId,
                  resolvedSchoolId,
                ),
              ),
            ).then((rows) => rows.flat().filter((assignment) => assignment.isActive)),
            repositories.assignmentRepository.listEventAssignments(eventId),
            repositories.meetingRepository.validateEventReadiness(eventId),
          ]);

        const nextClasses =
          classesResult.status === "fulfilled" ? classesResult.value : [];
        const nextTeachers =
          teachersResult.status === "fulfilled" ? teachersResult.value : [];
        const nextTeachingAssignments =
          assignmentsResult.status === "fulfilled" ? assignmentsResult.value : [];
        const nextSetupRows =
          setupsResult.status === "fulfilled" ? setupsResult.value : [];
        const nextReadiness =
          readinessResult.status === "fulfilled" ? readinessResult.value : null;

        if (import.meta.env.DEV) {
          console.info("[Admin assignments] load results", {
            eventId,
            resolvedSchoolId,
            classesCount: nextClasses.length,
            teachersCount: nextTeachers.length,
            teachingAssignmentsCount: nextTeachingAssignments.length,
            setupRowsCount: nextSetupRows.length,
            readinessLoaded: readinessResult.status === "fulfilled",
          });
        }

        if (classesResult.status === "rejected") {
          setPartialLoadWarning("admin.assignmentsPartialLoadWarning");
          await logFirestoreCollectionFailure({
            collectionName: "classes",
            operation: "listClasses",
            schoolId: resolvedSchoolId,
            context: {
              eventId,
              currentSchoolId,
              selectedSchoolId,
            },
            error: classesResult.reason,
          });
        }

        if (teachersResult.status === "rejected") {
          setPartialLoadWarning("admin.assignmentsPartialLoadWarning");
          await logFirestoreCollectionFailure({
            collectionName: "teachers",
            operation: "listTeachers",
            schoolId: resolvedSchoolId,
            context: {
              eventId,
              currentSchoolId,
              selectedSchoolId,
            },
            error: teachersResult.reason,
          });
        }

        if (assignmentsResult.status === "rejected") {
          setPartialLoadWarning("admin.assignmentsPartialLoadWarning");
          await logFirestoreCollectionFailure({
            collectionName: "teachingAssignments",
            operation: "listTeachingAssignmentsForClass",
            schoolId: resolvedSchoolId,
            context: {
              eventId,
              currentSchoolId,
              selectedSchoolId,
            },
            error: assignmentsResult.reason,
          });
        }

        if (setupsResult.status === "rejected") {
          setPartialLoadWarning("admin.assignmentsPartialLoadWarning");
          await logFirestoreCollectionFailure({
            collectionName: "eventTeacherSetups",
            operation: "listEventAssignments",
            schoolId: resolvedSchoolId,
            context: {
              eventId,
              currentSchoolId,
              selectedSchoolId,
            },
            error: setupsResult.reason,
          });
        }

        if (readinessResult.status === "rejected") {
          setReadinessWarning("admin.assignmentsReadinessLoadWarning");
          await logFirestoreCollectionFailure({
            collectionName: "eventTeacherSetups",
            operation: "validateEventReadiness",
            schoolId: resolvedSchoolId,
            context: {
              eventId,
              currentSchoolId,
              selectedSchoolId,
            },
            error: readinessResult.reason,
          });
        }

        if (!isCurrent) {
          return;
        }

        setEvent(nextEvent);
        setReadiness(nextReadiness);
        setEditableRows(
          buildEditableSetupRows({
            event: nextEvent,
            teachers: nextTeachers,
            teachingAssignments: nextTeachingAssignments,
            setupRows: nextSetupRows,
          }),
        );
        setLoadStatus("success");
      } catch (error) {
        await logFirestoreCollectionFailure({
          collectionName: "eventTeacherSetups",
          operation: "loadEventAssignmentsPage",
          schoolId: selectedSchoolId,
          context: {
            eventId,
            currentSchoolId,
            selectedSchoolId,
          },
          error,
        });

        if (import.meta.env.DEV) {
          console.error("[Admin assignments] load failed", {
            eventId,
            currentSchoolId,
            selectedSchoolId,
            error,
          });
        }

        if (isCurrent) {
          setLoadStatus("error");
        }
      }
    })();

    return () => {
      isCurrent = false;
    };
  }, [currentSchoolId, eventId, hasHydrated, selectedSchoolId]);

  function handleRowChange(
    rowId: string,
    patch: Partial<
      Pick<
        EditableEventTeacherSetupRow,
        "isAvailable" | "building" | "floor" | "classroom"
      >
    >,
  ) {
    setEditableRows((currentRows) =>
      currentRows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              ...patch,
            }
          : row,
      ),
    );
    setErrorKeys([]);
    setSaveStatus("idle");
  }

  function handleToggleDelete(rowId: string) {
    setEditableRows((currentRows) =>
      currentRows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              deleted: !row.deleted,
            }
          : row,
      ),
    );
    setErrorKeys([]);
    setSaveStatus("idle");
  }

  function handleMarkAllAvailable() {
    setEditableRows((currentRows) =>
      currentRows.map((row) =>
        row.deleted
          ? row
          : {
              ...row,
              isAvailable: true,
            },
      ),
    );
    setErrorKeys([]);
    setSaveStatus("idle");
  }

  function handleMarkAllUnavailable() {
    setEditableRows((currentRows) =>
      currentRows.map((row) =>
        row.deleted
          ? row
          : {
              ...row,
              isAvailable: false,
            },
      ),
    );
    setErrorKeys([]);
    setSaveStatus("idle");
  }

  async function handleSaveAll() {
    if (!event || !isDraft) {
      return;
    }

    const dirtyRows = editableRows.filter(isEditableSetupRowDirty);
    if (dirtyRows.length === 0) {
      return;
    }

    const validationErrors = validateEditableRows(dirtyRows);
    setErrorKeys(validationErrors);

    if (validationErrors.length > 0) {
      return;
    }

    setSaveStatus("saving");
    let nextRows = [...editableRows];

    try {
      for (const row of dirtyRows) {
        if (row.deleted) {
          if (row.persistedId) {
            await repositories.assignmentRepository.deleteEventAssignment(
              row.persistedId,
            );
          }

          nextRows = nextRows.filter((current) => current.id !== row.id);
          continue;
        }

        const savedSetup = row.persistedId
          ? await repositories.assignmentRepository.updateEventAssignment(
              row.persistedId,
              toSetupInput(event.id, row),
            )
          : await repositories.assignmentRepository.createEventAssignment(
              toSetupInput(event.id, row),
            );

        nextRows = nextRows.map((current) =>
          current.id === row.id ? toEditableRow(savedSetup) : current,
        );
      }

      setEditableRows(sortEditableRowList(nextRows));
      setSaveStatus("success");

      try {
        const nextReadiness =
          await repositories.meetingRepository.validateEventReadiness(event.id);
        setReadiness(nextReadiness);
        setReadinessWarning(null);
      } catch (error) {
        setReadinessWarning("admin.assignmentsReadinessLoadWarning");
        await logFirestoreCollectionFailure({
          collectionName: "eventTeacherSetups",
          operation: "validateEventReadiness",
          schoolId: event.schoolId,
          context: {
            eventId: event.id,
            currentSchoolId,
            selectedSchoolId,
          },
          error,
        });
      }
    } catch (error) {
      await logFirestoreCollectionFailure({
        collectionName: "eventTeacherSetups",
        operation: "saveAllEventAssignments",
        schoolId: event.schoolId,
        context: {
          eventId: event.id,
          currentSchoolId,
          selectedSchoolId,
        },
        error,
      });

      if (import.meta.env.DEV) {
        console.error("[Admin assignments] save all failed", {
          eventId: event.id,
          currentSchoolId,
          selectedSchoolId,
          error,
        });
      }

      setEditableRows(sortEditableRowList(nextRows));
      setSaveStatus("error");
    }
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
          <Link
            className="btn-secondary w-full sm:w-auto"
            to={`/admin/events/${event.id}`}
          >
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

      {partialLoadWarning ? (
        <section className="surface p-6 sm:p-8">
          <p className="status-warning rounded-2xl px-4 py-3 text-sm font-bold">
            {t(partialLoadWarning)}
          </p>
        </section>
      ) : null}

      {readiness ? (
        <EventReadinessPanel readiness={readiness} />
      ) : readinessWarning ? (
        <section className="surface p-6 sm:p-8">
          <p className="status-warning rounded-2xl px-4 py-3 text-sm font-bold">
            {t(readinessWarning)}
          </p>
        </section>
      ) : null}

      {errorKeys.length > 0 ? (
        <section className="surface p-6 sm:p-8">
          <div className="status-danger rounded-2xl px-4 py-3 text-sm font-bold">
            {errorKeys.map((errorKey) => (
              <p key={errorKey}>{t(errorKey)}</p>
            ))}
          </div>
        </section>
      ) : null}

      {saveStatus === "success" ? (
        <section className="surface p-6 sm:p-8">
          <p className="status-success rounded-2xl px-4 py-3 text-sm font-bold">
            {t("admin.assignmentsBulkSaveSuccess")}
          </p>
        </section>
      ) : null}

      {saveStatus === "error" ? (
        <section className="surface p-6 sm:p-8">
          <p className="status-danger rounded-2xl px-4 py-3 text-sm font-bold">
            {t("admin.assignmentsBulkSaveError")}
          </p>
        </section>
      ) : null}

      {/* Repetitive admin workflows should prefer compact table/matrix layouts. */}
      {/* Parent-facing mobile workflows should stay compact cards with clear task state. */}
      <EventTeacherSetupGrid
        isDraft={isDraft ?? false}
        isSaving={saveStatus === "saving"}
        onMarkAllAvailable={handleMarkAllAvailable}
        onMarkAllUnavailable={handleMarkAllUnavailable}
        onRowChange={handleRowChange}
        onSaveAll={handleSaveAll}
        onToggleDelete={handleToggleDelete}
        rows={editableRows}
      />
    </div>
  );
}

function buildEditableSetupRows(params: {
  event: MeetingEvent;
  teachers: Teacher[];
  teachingAssignments: TeachingAssignment[];
  setupRows: EventTeacherSetupOverview[];
}): EditableEventTeacherSetupRow[] {
  const teacherById = new Map(
    params.teachers.map((teacher) => [teacher.id, teacher] as const),
  );
  const subjectByTeacherId = new Map<string, string>();
  params.teachingAssignments.forEach((assignment) => {
    if (!assignment.isActive || subjectByTeacherId.has(assignment.teacherId)) {
      return;
    }

    subjectByTeacherId.set(assignment.teacherId, assignment.subject);
  });

  const setupByTeacherId = new Map(
    params.setupRows.map((setup) => [setup.teacher.id, setup] as const),
  );
  const teacherIds = new Set<string>();

  params.setupRows.forEach((setup) => {
    teacherIds.add(setup.teacher.id);
  });
  params.teachingAssignments.forEach((assignment) => {
    if (assignment.isActive) {
      teacherIds.add(assignment.teacherId);
    }
  });

  return [...teacherIds]
    .map((teacherId) => {
      const teacher = teacherById.get(teacherId);
      const setup = setupByTeacherId.get(teacherId);
      const subject =
        setup?.subject ??
        subjectByTeacherId.get(teacherId) ??
        teacher?.subject ??
        "";
      const building = setup?.building ?? "";
      const floor = setup ? String(setup.floor) : "";
      const classroom = setup?.classroom ?? "";
      const isAvailable = setup ? setup.availability !== "busy" : true;
      const persistedId =
        setup && !setup.id.startsWith("missing-") ? setup.id : null;

      return {
        id: setup?.id ?? `missing-${params.event.id}-${teacherId}`,
        persistedId,
        teacherId,
        teacherName: teacher?.name ?? setup?.teacher.name ?? teacherId,
        subject,
        isAvailable,
        building,
        floor,
        classroom,
        locationMissing:
          !setup ||
          setup.locationMissing === true ||
          setup.id.startsWith("missing-"),
        deleted: false,
        baseline: {
          isAvailable,
          building,
          floor,
          classroom,
          deleted: false,
        },
      } satisfies EditableEventTeacherSetupRow;
    })
    .sort(sortEditableRowComparator);
}

function sortEditableRowList(rows: EditableEventTeacherSetupRow[]) {
  return [...rows].sort(sortEditableRowComparator);
}

function sortEditableRowComparator(
  left: EditableEventTeacherSetupRow,
  right: EditableEventTeacherSetupRow,
) {
  if (left.deleted !== right.deleted) {
    return left.deleted ? 1 : -1;
  }

  const building = left.building.localeCompare(right.building, "tr");
  if (building !== 0) {
    return building;
  }

  const leftFloor = Number(left.floor);
  const rightFloor = Number(right.floor);
  if (Number.isFinite(leftFloor) && Number.isFinite(rightFloor) && leftFloor !== rightFloor) {
    return leftFloor - rightFloor;
  }

  const classroom = left.classroom.localeCompare(right.classroom, "tr", {
    numeric: true,
  });
  if (classroom !== 0) {
    return classroom;
  }

  return left.teacherName.localeCompare(right.teacherName, "tr");
}

function isEditableSetupRowDirty(row: EditableEventTeacherSetupRow) {
  return (
    row.isAvailable !== row.baseline.isAvailable ||
    row.building !== row.baseline.building ||
    row.floor !== row.baseline.floor ||
    row.classroom !== row.baseline.classroom ||
    row.deleted !== row.baseline.deleted
  );
}

function validateEditableRows(rows: EditableEventTeacherSetupRow[]) {
  const errors: TranslationKey[] = [];

  for (const row of rows) {
    if (row.deleted) {
      continue;
    }

    if (!row.building.trim()) {
      errors.push("admin.assignmentsErrorBuildingRequired");
    }

    if (!row.floor.trim() || !Number.isFinite(Number(row.floor))) {
      errors.push("admin.assignmentsErrorFloorRequired");
    }

    if (!row.classroom.trim()) {
      errors.push("admin.assignmentsErrorClassroomRequired");
    }
  }

  return [...new Set(errors)];
}

function toSetupInput(eventId: string, row: EditableEventTeacherSetupRow) {
  return {
    eventId,
    teacherId: row.teacherId,
    building: row.building.trim(),
    floor: Number(row.floor),
    classroom: row.classroom.trim(),
    isAvailable: row.isAvailable,
  };
}

function toEditableRow(
  setup: EventTeacherSetupOverview,
): EditableEventTeacherSetupRow {
  const isAvailable = setup.availability !== "busy";
  const floor = String(setup.floor);

  return {
    id: setup.id,
    persistedId: setup.id.startsWith("missing-") ? null : setup.id,
    teacherId: setup.teacher.id,
    teacherName: setup.teacher.name,
    subject: setup.subject,
    isAvailable,
    building: setup.building,
    floor,
    classroom: setup.classroom,
    locationMissing: setup.locationMissing ?? setup.id.startsWith("missing-"),
    deleted: false,
    baseline: {
      isAvailable,
      building: setup.building,
      floor,
      classroom: setup.classroom,
      deleted: false,
    },
  };
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
