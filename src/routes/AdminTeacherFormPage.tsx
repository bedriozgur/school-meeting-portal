import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type {
  SchoolClass,
  Teacher,
  TeacherFormInput,
  TeachingAssignment,
  TeachingAssignmentFormInput,
} from "../domain/models";
import { useT } from "../hooks/useT";
import type { TranslationKey } from "../i18n/i18n";
import { repositories } from "../repositories";

type LoadStatus = "loading" | "success" | "error";
type FormMode = "new" | "edit";

type TeacherFormState = {
  name: string;
  subject: string;
  isActive: boolean;
};

type TeachingAssignmentRowState = {
  rowId: string;
  assignmentId: string | null;
  schoolClass: SchoolClass;
  subject: string;
  subjectOverride: string | null;
  isDefaultSubject: boolean;
  isActive: boolean;
  isSaving: boolean;
};

const emptyForm: TeacherFormState = {
  name: "",
  subject: "",
  isActive: true,
};

export function AdminTeacherFormPage() {
  const { teacherId } = useParams();
  const mode: FormMode = teacherId ? "edit" : "new";
  const { t } = useT();
  const navigate = useNavigate();
  const [status, setStatus] = useState<LoadStatus>(
    mode === "edit" ? "loading" : "success",
  );
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [teachingAssignments, setTeachingAssignments] = useState<TeachingAssignment[]>([]);
  const [teachingRows, setTeachingRows] = useState<TeachingAssignmentRowState[]>([]);
  const [form, setForm] = useState<TeacherFormState>(emptyForm);
  const [errorKeys, setErrorKeys] = useState<TranslationKey[]>([]);
  const [loadWarningKeys, setLoadWarningKeys] = useState<TranslationKey[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [teachingSaveError, setTeachingSaveError] = useState("");

  useEffect(() => {
    if (mode !== "edit" || !teacherId) {
      return;
    }

    const currentTeacherId = teacherId;

    let isCurrent = true;

    setStatus("loading");
    setLoadWarningKeys([]);
    setTeachingSaveError("");

    async function loadPageData() {
      let nextTeacher: Teacher | null = null;
      let nextClasses: SchoolClass[] = [];
      let nextTeachingAssignments: TeachingAssignment[] = [];
      const warnings: TranslationKey[] = [];

      try {
        nextTeacher =
          await repositories.teacherRepository.getTeacherById(currentTeacherId);
      } catch (error) {
        console.error(`Failed to load teacher ${currentTeacherId}.`, error);
        if (isCurrent) {
          setStatus("error");
          setLoadWarningKeys(warnings);
        }
        return;
      }

      try {
        nextClasses = await repositories.classRepository.listClasses();
      } catch (error) {
        console.error("Failed to load teacher form classes.", error);
        warnings.push("admin.teachingAssignmentsRelatedDataWarning");
      }

      try {
        nextTeachingAssignments =
          await repositories.teachingAssignmentRepository.listTeachingAssignmentsForTeacher(
            currentTeacherId,
          );
      } catch (error) {
        console.error(
          `Failed to load teaching assignments for teacher ${currentTeacherId}.`,
          error,
        );
        warnings.push("admin.teachingAssignmentsRelatedDataWarning");
        nextTeachingAssignments = [];
      }

      if (!isCurrent) {
        return;
      }

      setTeacher(nextTeacher);
      setClasses(nextClasses);
      setTeachingAssignments(nextTeachingAssignments);
      setTeachingRows(buildTeachingRows(nextClasses, nextTeachingAssignments));
      setForm(
        nextTeacher
          ? {
              name: nextTeacher.name,
              subject: nextTeacher.subject,
              isActive: nextTeacher.isActive ?? true,
            }
          : emptyForm,
      );
      setLoadWarningKeys(warnings);
      setStatus(nextTeacher ? "success" : "error");
    }

    void loadPageData();

    return () => {
      isCurrent = false;
    };
  }, [mode, teacherId]);

  async function handleSubmit(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    setSaveError("");

    const validationErrors = validateTeacherForm(form);
    setErrorKeys(validationErrors);

    if (validationErrors.length > 0) {
      return;
    }

    setIsSaving(true);

    try {
      const input: TeacherFormInput = {
        name: form.name.trim(),
        subject: form.subject.trim(),
        isActive: form.isActive,
      };
      const savedTeacher =
        mode === "new"
          ? await repositories.teacherRepository.createTeacher(input)
          : await repositories.teacherRepository.updateTeacher(
              teacher?.id ?? teacherId ?? "",
              input,
            );

      navigate(`/admin/teachers/${savedTeacher.id}/edit`);
    } catch (error) {
      console.error("Failed to save teacher.", error);
      setSaveError(t("admin.teacherFormSaveError"));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTeachingRowSave(rowId: string) {
    setTeachingSaveError("");

    if (!teacher) {
      return;
    }

    const row = teachingRows.find((item) => item.rowId === rowId);
    if (!row) {
      return;
    }

    const validationErrors = validateTeachingAssignmentRow(row);
    if (validationErrors.length > 0) {
      setTeachingSaveError(t(validationErrors[0]));
      return;
    }

    setTeachingRows((currentRows) =>
      currentRows.map((currentRow) =>
        currentRow.rowId === rowId
          ? { ...currentRow, isSaving: true }
          : currentRow,
      ),
    );

    try {
      const defaultSubject = teacher.subject.trim();
      const legacySubject =
        row.isDefaultSubject && row.subject.trim() && row.subject.trim() !== defaultSubject
          ? row.subject.trim()
          : "";
      const input: TeachingAssignmentFormInput = {
        classId: row.schoolClass.id,
        teacherId: teacher.id,
        isActive: row.isActive,
        ...(row.isDefaultSubject
          ? {}
          : {
              subjectOverride: row.subject.trim(),
            }),
        ...(legacySubject ? { subject: legacySubject } : {}),
      };

      const savedAssignment = row.assignmentId
        ? await repositories.teachingAssignmentRepository.updateTeachingAssignment(
            row.assignmentId,
            input,
          )
        : await repositories.teachingAssignmentRepository.createTeachingAssignment(
            input,
          );

      setTeachingAssignments((currentAssignments) =>
        sortTeachingAssignments(
          row.assignmentId
            ? currentAssignments.map((assignment) =>
                assignment.id === savedAssignment.id ? savedAssignment : assignment,
              )
            : [...currentAssignments, savedAssignment],
        ),
      );
      setTeachingRows((currentRows) =>
        currentRows.map((currentRow) =>
          currentRow.rowId === rowId
            ? {
                rowId: currentRow.rowId,
                assignmentId: savedAssignment.id,
                schoolClass: currentRow.schoolClass,
                subject: savedAssignment.subject,
                subjectOverride: savedAssignment.subjectOverride ?? null,
                isDefaultSubject: !savedAssignment.subjectOverride?.trim(),
                isActive: savedAssignment.isActive,
                isSaving: false,
              }
            : currentRow,
        ),
      );
    } catch (error) {
      console.error(
        `Failed to save teaching assignment for class ${row.schoolClass.id}.`,
        error,
      );
      setTeachingSaveError(t("admin.assignmentsSaveError"));
    } finally {
      setTeachingRows((currentRows) =>
        currentRows.map((currentRow) =>
          currentRow.rowId === rowId
            ? { ...currentRow, isSaving: false }
            : currentRow,
        ),
      );
    }
  }

  function handleAddAnotherSubject(classId: string) {
    const schoolClass = classes.find((item) => item.id === classId);
    if (!schoolClass || !teacher) {
      return;
    }

    setTeachingRows((currentRows) => [
      ...currentRows,
      {
        rowId: `extra-${classId}-${Date.now()}`,
        assignmentId: null,
        schoolClass,
        subject: "",
        subjectOverride: null,
        isDefaultSubject: false,
        isActive: true,
        isSaving: false,
      },
    ]);
  }

  if (status === "loading") {
    return (
      <section className="surface p-6 text-center">
        <p className="text-strong text-lg font-extrabold">
          {t("admin.teacherFormLoading")}
        </p>
      </section>
    );
  }

  if (status === "error") {
    return (
      <section className="surface p-6 text-center">
        <p className="status-danger rounded-2xl px-4 py-3 text-sm font-bold">
          {t("admin.teacherFormLoadError")}
        </p>
      </section>
    );
  }

  return (
    <form className="surface space-y-6 p-6 sm:p-8" onSubmit={handleSubmit}>
      <div>
        <p className="label">{t("admin.teacherFormEyebrow")}</p>
        <h1 className="heading mt-3 font-display text-4xl font-black">
          {mode === "new"
            ? t("admin.teacherFormNewTitle")
            : t("admin.teacherFormEditTitle")}
        </h1>
        <p className="copy mt-3 text-base font-semibold leading-7">
          {t("admin.teacherFormDescription")}
        </p>
      </div>

      {errorKeys.length > 0 ? (
        <div className="status-danger rounded-2xl px-4 py-3 text-sm font-bold">
          {errorKeys.map((errorKey) => (
            <p key={errorKey}>{t(errorKey)}</p>
          ))}
        </div>
      ) : null}

      {saveError ? (
        <p className="status-danger rounded-2xl px-4 py-3 text-sm font-bold">
          {saveError}
        </p>
      ) : null}

      {loadWarningKeys.length > 0 ? (
        <div className="status-warning rounded-2xl px-4 py-3 text-sm font-bold">
          {loadWarningKeys.map((warningKey) => (
            <p key={warningKey}>{t(warningKey)}</p>
          ))}
        </div>
      ) : null}

      <label className="block">
        <span className="label">{t("admin.teacherFullName")}</span>
        <input
          className="input mt-2"
          onChange={(inputEvent) =>
            setForm((currentForm) => ({
              ...currentForm,
              name: inputEvent.target.value,
            }))
          }
          value={form.name}
        />
      </label>

      <label className="block">
        <span className="label">{t("admin.teacherDefaultSubject")}</span>
        <input
          className="input mt-2"
          onChange={(inputEvent) =>
            setForm((currentForm) => ({
              ...currentForm,
              subject: inputEvent.target.value,
            }))
          }
          value={form.subject}
        />
      </label>

      <label className="flex min-h-12 items-center gap-3 rounded-2xl border bg-white px-4 py-3 text-base font-extrabold [border-color:var(--color-border)]">
        <input
          checked={form.isActive}
          className="h-6 w-6 [accent-color:var(--color-primary)]"
          onChange={(inputEvent) =>
            setForm((currentForm) => ({
              ...currentForm,
              isActive: inputEvent.target.checked,
            }))
          }
          type="checkbox"
        />
        {t("admin.teacherFormActiveStatus")}
      </label>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button className="btn-primary" disabled={isSaving} type="submit">
          {isSaving ? t("admin.teacherFormSaving") : t("admin.teacherFormSave")}
        </button>
        <Link className="btn-secondary" to="/admin/teachers">
          {t("admin.teacherFormCancel")}
        </Link>
      </div>

      {mode === "new" ? (
        <section className="status-warning rounded-2xl px-4 py-3 text-sm font-bold">
          <p>{t("admin.teachingAssignmentsAvailableAfterTeacherSave")}</p>
        </section>
      ) : null}

      {teacher ? (
        <section className="surface space-y-4 p-5">
          <div>
            <p className="label">{t("admin.teachingAssignmentsEyebrow")}</p>
            <h2 className="text-strong mt-2 text-2xl font-black">
              {t("admin.teachingAssignmentsTitle")}
            </h2>
            <p className="copy mt-3 text-sm font-semibold leading-6">
              {t("admin.teachingAssignmentsTeacherDescription")}
            </p>
          </div>

          {teachingSaveError ? (
            <p className="status-danger rounded-2xl px-4 py-3 text-sm font-bold">
              {teachingSaveError}
            </p>
          ) : null}

          {classes.length === 0 ? (
            <section className="status-warning rounded-2xl px-4 py-3 text-sm font-bold">
              <p>{t("admin.teachingAssignmentsNoClasses")}</p>
            </section>
          ) : (
            <div className="grid gap-3">
              {teachingRows.map((row) => (
                <article
                  className="soft-panel grid gap-4 rounded-2xl p-4"
                  key={row.rowId}
                >
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.4fr)_auto]">
                    <div className="space-y-2">
                      <p className="label">{t("dashboard.className")}</p>
                      <p className="text-strong text-base font-black">
                        {row.schoolClass.name}
                      </p>
                      <p className="copy text-sm font-semibold">
                        {t("admin.teacherDefaultSubject")}:{" "}
                        {row.subject || teacher.subject || t("admin.masterDataMissingValue")}
                      </p>
                    </div>

                    {row.isDefaultSubject ? (
                      <div className="soft-panel rounded-2xl p-3">
                        <p className="label">{t("admin.assignmentSubject")}</p>
                        <p className="text-strong mt-1 text-base font-black">
                          {row.subject || teacher.subject || t("admin.masterDataMissingValue")}
                        </p>
                      </div>
                    ) : (
                      <label className="block">
                        <span className="label">{t("admin.assignmentSubject")}</span>
                        <input
                          className="input mt-2"
                          onChange={(inputEvent) =>
                            setTeachingRows((currentRows) =>
                              currentRows.map((currentRow) =>
                                currentRow.rowId === row.rowId
                                  ? {
                                      ...currentRow,
                                      subject: inputEvent.target.value,
                                    }
                                  : currentRow,
                              ),
                            )
                          }
                          placeholder={teacher.subject}
                          value={row.subject}
                        />
                      </label>
                    )}

                    <label className="flex min-h-12 items-center gap-3 self-end rounded-2xl border bg-white px-4 py-3 text-base font-extrabold [border-color:var(--color-border)]">
                      <input
                        checked={row.isActive}
                        className="h-6 w-6 [accent-color:var(--color-primary)]"
                        onChange={(inputEvent) =>
                          setTeachingRows((currentRows) =>
                            currentRows.map((currentRow) =>
                              currentRow.rowId === row.rowId
                                ? {
                                    ...currentRow,
                                    isActive: inputEvent.target.checked,
                                  }
                                : currentRow,
                            ),
                          )
                        }
                        type="checkbox"
                      />
                      {t("admin.statusActive")}
                    </label>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                    <button
                      className="btn-primary"
                      disabled={row.isSaving}
                      onClick={() => void handleTeachingRowSave(row.rowId)}
                      type="button"
                    >
                      {row.isSaving
                        ? t("admin.teachingAssignmentsSaving")
                        : t("admin.teachingAssignmentsSave")}
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => handleAddAnotherSubject(row.schoolClass.id)}
                      type="button"
                    >
                      {t("admin.teachingAssignmentAddAnotherSubject")}
                    </button>
                    <p className="copy text-sm font-semibold">
                      {row.assignmentId
                        ? row.isActive
                          ? t("admin.teachingAssignmentsActiveHint")
                          : t("admin.teachingAssignmentsInactiveHint")
                        : t("admin.teachingAssignmentsNewRowHint")}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </form>
  );
}

function validateTeacherForm(form: TeacherFormState) {
  const errors: TranslationKey[] = [];

  if (!form.name.trim()) {
    errors.push("admin.teacherFormErrorNameRequired");
  }

  return errors;
}

function validateTeachingAssignmentRow(form: {
  subject: string;
  isActive: boolean;
  isDefaultSubject?: boolean;
}) {
  const errors: TranslationKey[] = [];

  if (!form.isDefaultSubject && !form.subject.trim()) {
    errors.push("admin.assignmentsErrorSubjectRequired");
  }

  return errors;
}

function buildTeachingRows(
  classes: SchoolClass[],
  assignments: TeachingAssignment[],
): TeachingAssignmentRowState[] {
  const assignmentByClassId = new Map<string, TeachingAssignment[]>();

  assignments.forEach((assignment) => {
    assignmentByClassId.set(assignment.classId, [
      ...(assignmentByClassId.get(assignment.classId) ?? []),
      assignment,
    ]);
  });

  return [...classes]
    .sort((left, right) => left.name.localeCompare(right.name, "tr"))
    .flatMap((schoolClass): TeachingAssignmentRowState[] => {
      const classAssignments = assignmentByClassId.get(schoolClass.id) ?? [];

      if (classAssignments.length === 0) {
        return [
          {
            rowId: `default-${schoolClass.id}`,
            assignmentId: null,
            schoolClass,
            subject: "",
            subjectOverride: null,
            isDefaultSubject: true,
            isActive: true,
            isSaving: false,
          },
        ];
      }

      return classAssignments.map((assignment) => ({
        rowId: assignment.id,
        assignmentId: assignment.id,
        schoolClass,
        subject: assignment.subject,
        subjectOverride: assignment.subjectOverride ?? null,
        isDefaultSubject: !assignment.subjectOverride?.trim(),
        isActive: assignment.isActive,
        isSaving: false,
      }));
    });
}

function sortTeachingAssignments(assignments: TeachingAssignment[]) {
  return [...assignments].sort((left, right) => {
    const className = left.classId.localeCompare(right.classId, "tr");

    if (className !== 0) {
      return className;
    }

    const subject = left.subject.localeCompare(right.subject, "tr");

    if (subject !== 0) {
      return subject;
    }

    return left.id.localeCompare(right.id, "tr");
  });
}
