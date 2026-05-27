import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type {
  ClassFormInput,
  SchoolClass,
  Teacher,
  TeachingAssignment,
  TeachingAssignmentFormInput,
} from "../domain/models";
import { useT } from "../hooks/useT";
import type { TranslationKey } from "../i18n/i18n";
import { repositories } from "../repositories";

type LoadStatus = "loading" | "success" | "error";
type FormMode = "new" | "edit";

type ClassFormState = {
  name: string;
  grade: string;
  classTeacherId: string;
  isActive: boolean;
};

type TeachingAssignmentRowState = {
  rowId: string;
  assignmentId: string | null;
  teacher: Teacher;
  subject: string;
  subjectOverride: string | null;
  isDefaultSubject: boolean;
  isActive: boolean;
  isSaving: boolean;
};

const emptyForm: ClassFormState = {
  name: "",
  grade: "",
  classTeacherId: "",
  isActive: true,
};

export function AdminClassFormPage() {
  const { classId } = useParams();
  const mode: FormMode = classId ? "edit" : "new";
  const { t } = useT();
  const navigate = useNavigate();
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [schoolClass, setSchoolClass] = useState<SchoolClass | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teachingAssignments, setTeachingAssignments] = useState<TeachingAssignment[]>([]);
  const [teachingRows, setTeachingRows] = useState<TeachingAssignmentRowState[]>([]);
  const [form, setForm] = useState<ClassFormState>(emptyForm);
  const [errorKeys, setErrorKeys] = useState<TranslationKey[]>([]);
  const [loadWarningKeys, setLoadWarningKeys] = useState<TranslationKey[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [teachingSaveError, setTeachingSaveError] = useState("");

  useEffect(() => {
    let isCurrent = true;

    setStatus("loading");
    setLoadWarningKeys([]);
    setTeachingSaveError("");

    async function loadPageData() {
      let nextTeachers: Teacher[] = [];
      let nextClass: SchoolClass | null = null;
      let nextTeachingAssignments: TeachingAssignment[] = [];
      const warnings: TranslationKey[] = [];

      try {
        nextTeachers = await repositories.teacherRepository.listTeachers();
      } catch (error) {
        console.error("Failed to load class form teachers.", error);
        warnings.push("admin.classFormRelatedDataWarning");
      }

      if (mode === "edit" && classId) {
        try {
          nextClass = await repositories.classRepository.getClassById(classId);
        } catch (error) {
          console.error(`Failed to load class ${classId}.`, error);
          if (isCurrent) {
            setStatus("error");
            setLoadWarningKeys(warnings);
          }
          return;
        }

        try {
          nextTeachingAssignments =
            await repositories.teachingAssignmentRepository.listTeachingAssignmentsForClass(
              classId,
            );
        } catch (error) {
          console.error(
            `Failed to load teaching assignments for class ${classId}.`,
            error,
          );
          warnings.push("admin.classFormRelatedDataWarning");
          nextTeachingAssignments = [];
        }
      }

      if (!isCurrent) {
        return;
      }

      setTeachers(nextTeachers);
      setSchoolClass(nextClass);
      setTeachingAssignments(nextTeachingAssignments);
      setTeachingRows(buildTeachingRows(nextTeachers, nextTeachingAssignments));
      setForm(
        nextClass
          ? {
              name: nextClass.name,
              grade: nextClass.grade,
              classTeacherId: nextClass.classTeacherId,
              isActive: nextClass.isActive ?? true,
            }
          : emptyForm,
      );
      setLoadWarningKeys(warnings);
      setStatus("success");
    }

    void loadPageData();

    return () => {
      isCurrent = false;
    };
  }, [classId, mode]);

  async function handleSubmit(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    setSaveError("");

    const validationErrors = validateClassForm(form);
    setErrorKeys(validationErrors);

    if (validationErrors.length > 0) {
      return;
    }

    setIsSaving(true);

    try {
      const input: ClassFormInput = {
        name: form.name.trim(),
        grade: form.grade.trim(),
        classTeacherId: form.classTeacherId || null,
        isActive: form.isActive,
      };
      const savedClass =
        mode === "new"
          ? await repositories.classRepository.createClass(input)
          : await repositories.classRepository.updateClass(
              schoolClass?.id ?? classId ?? "",
              input,
            );

      navigate(`/admin/classes/${savedClass.id}/edit`);
    } catch (error) {
      console.error("Failed to save class.", error);
      setSaveError(t("admin.classFormSaveError"));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTeachingRowSave(rowId: string) {
    setTeachingSaveError("");

    if (!schoolClass) {
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
        currentRow.rowId === rowId ? { ...currentRow, isSaving: true } : currentRow,
      ),
    );

    try {
      const defaultSubject = row.teacher.subject.trim();
      const legacySubject =
        row.isDefaultSubject && row.subject.trim() && row.subject.trim() !== defaultSubject
          ? row.subject.trim()
          : "";
      const input: TeachingAssignmentFormInput = {
        classId: schoolClass.id,
        teacherId: row.teacher.id,
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
                teacher: currentRow.teacher,
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
      console.error(`Failed to save teaching assignment for teacher ${row.teacher.id}.`, error);
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

  function handleAddAnotherSubject(teacherId: string) {
    const teacher = teachers.find((item) => item.id === teacherId);

    if (!teacher || !schoolClass) {
      return;
    }

    setTeachingRows((currentRows) => [
      ...currentRows,
      {
        rowId: `extra-${teacherId}-${Date.now()}`,
        assignmentId: null,
        teacher,
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
          {t("admin.classFormLoading")}
        </p>
      </section>
    );
  }

  if (status === "error") {
    return (
      <section className="surface p-6 text-center">
        <p className="status-danger rounded-2xl px-4 py-3 text-sm font-bold">
          {t("admin.classFormLoadError")}
        </p>
      </section>
    );
  }

  return (
    <form className="surface space-y-6 p-6 sm:p-8" onSubmit={handleSubmit}>
      <div>
        <p className="label">{t("admin.classFormEyebrow")}</p>
        <h1 className="heading mt-3 font-display text-4xl font-black">
          {mode === "new"
            ? t("admin.classFormNewTitle")
            : t("admin.classFormEditTitle")}
        </h1>
        <p className="copy mt-3 text-base font-semibold leading-7">
          {t("admin.classFormDescription")}
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

      <div className="grid gap-4 lg:grid-cols-2">
        <label className="block">
          <span className="label">{t("admin.className")}</span>
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
          <span className="label">{t("dashboard.grade")}</span>
          <input
            className="input mt-2"
            onChange={(inputEvent) =>
              setForm((currentForm) => ({
                ...currentForm,
                grade: inputEvent.target.value,
              }))
            }
            value={form.grade}
          />
        </label>
      </div>

      <label className="block">
        <span className="label">{t("admin.classTeacher")}</span>
        <select
          className="input mt-2"
          onChange={(inputEvent) =>
            setForm((currentForm) => ({
              ...currentForm,
              classTeacherId: inputEvent.target.value,
            }))
          }
          value={form.classTeacherId}
        >
          <option value="">{t("admin.classFormNoClassTeacher")}</option>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.name}
            </option>
          ))}
        </select>
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
        {t("admin.classFormActiveStatus")}
      </label>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button className="btn-primary" disabled={isSaving} type="submit">
          {isSaving ? t("admin.classFormSaving") : t("admin.classFormSave")}
        </button>
        <Link className="btn-secondary" to="/admin/classes">
          {t("admin.classFormCancel")}
        </Link>
      </div>

      {mode === "new" ? (
        <section className="status-warning rounded-2xl px-4 py-3 text-sm font-bold">
          <p>{t("admin.teachingAssignmentsAvailableAfterClassSave")}</p>
        </section>
      ) : null}

      {schoolClass ? (
        <section className="surface space-y-4 p-5">
          <div>
            <p className="label">{t("admin.teachingAssignmentsEyebrow")}</p>
            <h2 className="text-strong mt-2 text-2xl font-black">
              {t("admin.teachingAssignmentsTitle")}
            </h2>
            <p className="copy mt-3 text-sm font-semibold leading-6">
              {t("admin.teachingAssignmentsDescription")}
            </p>
          </div>

          {teachingSaveError ? (
            <p className="status-danger rounded-2xl px-4 py-3 text-sm font-bold">
              {teachingSaveError}
            </p>
          ) : null}

          {teachers.length === 0 ? (
            <section className="status-warning rounded-2xl px-4 py-3 text-sm font-bold">
              <p>{t("admin.teachingAssignmentsNoTeachers")}</p>
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
                      <p className="label">{t("admin.assignmentTeacher")}</p>
                      <p className="text-strong text-base font-black">
                        {row.teacher.name}
                      </p>
                    </div>

                    {row.isDefaultSubject ? (
                      <div className="soft-panel rounded-2xl p-3">
                        <p className="label">{t("admin.assignmentSubject")}</p>
                        <p className="text-strong mt-1 text-base font-black">
                          {row.subject || row.teacher.subject || t("admin.masterDataMissingValue")}
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
                          placeholder={row.teacher.subject}
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
                      onClick={() => handleAddAnotherSubject(row.teacher.id)}
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

function validateClassForm(form: ClassFormState) {
  const errors: TranslationKey[] = [];

  if (!form.name.trim()) {
    errors.push("admin.classFormErrorNameRequired");
  }

  if (!form.grade.trim()) {
    errors.push("admin.classFormErrorGradeRequired");
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
  teachers: Teacher[],
  assignments: TeachingAssignment[],
): TeachingAssignmentRowState[] {
  const assignmentByTeacherId = new Map<string, TeachingAssignment[]>();

  assignments.forEach((assignment) => {
    assignmentByTeacherId.set(assignment.teacherId, [
      ...(assignmentByTeacherId.get(assignment.teacherId) ?? []),
      assignment,
    ]);
  });

  return [...teachers]
    .sort((left, right) => left.name.localeCompare(right.name, "tr"))
    .flatMap((teacher): TeachingAssignmentRowState[] => {
      const teacherAssignments = assignmentByTeacherId.get(teacher.id) ?? [];

      if (teacherAssignments.length === 0) {
        return [
          {
            rowId: `default-${teacher.id}`,
            assignmentId: null,
            teacher,
            subject: "",
            subjectOverride: null,
            isDefaultSubject: true,
            isActive: true,
            isSaving: false,
          },
        ];
      }

      return teacherAssignments.map((assignment) => ({
        rowId: assignment.id,
        assignmentId: assignment.id,
        teacher,
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
    const teacher = left.teacherId.localeCompare(right.teacherId, "tr");

    if (teacher !== 0) {
      return teacher;
    }

    const subject = left.subject.localeCompare(right.subject, "tr");

    if (subject !== 0) {
      return subject;
    }

    return left.id.localeCompare(right.id, "tr");
  });
}
