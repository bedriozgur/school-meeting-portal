import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type {
  SchoolClass,
  Student,
  StudentFormInput,
} from "../domain/models";
import { useT } from "../hooks/useT";
import type { TranslationKey } from "../i18n/i18n";
import { repositories } from "../repositories";

type LoadStatus = "loading" | "success" | "error";
type FormMode = "new" | "edit";

type StudentFormState = {
  schoolNumber: string;
  name: string;
  classId: string;
  isActive: boolean;
};

const emptyForm: StudentFormState = {
  schoolNumber: "",
  name: "",
  classId: "",
  isActive: true,
};

export function AdminStudentFormPage() {
  const { studentId } = useParams();
  const mode: FormMode = studentId ? "edit" : "new";
  const { t } = useT();
  const navigate = useNavigate();
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [student, setStudent] = useState<Student | null>(null);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [form, setForm] = useState<StudentFormState>(emptyForm);
  const [errorKeys, setErrorKeys] = useState<TranslationKey[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    let isCurrent = true;

    setStatus("loading");
    Promise.all([
      repositories.classRepository.listClasses(),
      mode === "edit" && studentId
        ? repositories.studentRepository.getStudentById(studentId)
        : Promise.resolve(null),
    ])
      .then(([nextClasses, nextStudent]) => {
        if (!isCurrent) {
          return;
        }

        setClasses(nextClasses);
        setStudent(nextStudent);
        setForm(
          nextStudent
            ? {
                schoolNumber: nextStudent.schoolNumber,
                name: nextStudent.name,
                classId: nextStudent.classId,
                isActive: nextStudent.isActive ?? true,
              }
            : emptyForm,
        );
        setStatus(mode === "edit" && !nextStudent ? "error" : "success");
      })
      .catch(() => {
        if (isCurrent) {
          setStatus("error");
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [mode, studentId]);

  async function handleSubmit(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    setSaveError("");

    const validationErrors = validateStudentForm(form);
    setErrorKeys(validationErrors);

    if (validationErrors.length > 0) {
      return;
    }

    setIsSaving(true);

    try {
      const input: StudentFormInput = {
        schoolNumber: form.schoolNumber.trim(),
        name: form.name.trim(),
        classId: form.classId,
        isActive: form.isActive,
      };
      const savedStudent =
        mode === "new"
          ? await repositories.studentRepository.createStudent(input)
          : await repositories.studentRepository.updateStudent(
              student?.id ?? studentId ?? "",
              input,
            );

      navigate(`/admin/students/${savedStudent.id}/edit`);
    } catch {
      setSaveError(t("admin.studentFormSaveError"));
    } finally {
      setIsSaving(false);
    }
  }

  if (status === "loading") {
    return (
      <section className="surface p-6 text-center">
        <p className="text-strong text-lg font-extrabold">
          {t("admin.studentFormLoading")}
        </p>
      </section>
    );
  }

  if (status === "error") {
    return (
      <section className="surface p-6 text-center">
        <p className="status-danger rounded-2xl px-4 py-3 text-sm font-bold">
          {t("admin.studentFormLoadError")}
        </p>
      </section>
    );
  }

  return (
    <form className="surface space-y-6 p-6 sm:p-8" onSubmit={handleSubmit}>
      <div>
        <p className="label">{t("admin.studentFormEyebrow")}</p>
        <h1 className="heading mt-3 font-display text-4xl font-black">
          {mode === "new"
            ? t("admin.studentFormNewTitle")
            : t("admin.studentFormEditTitle")}
        </h1>
        <p className="copy mt-3 text-base font-semibold leading-7">
          {t("admin.studentFormDescription")}
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

      <div className="grid gap-4 lg:grid-cols-2">
        <label className="block">
          <span className="label">{t("admin.studentSchoolNumber")}</span>
          <input
            className="input mt-2"
            onChange={(inputEvent) =>
              setForm((currentForm) => ({
                ...currentForm,
                schoolNumber: inputEvent.target.value,
              }))
            }
            value={form.schoolNumber}
          />
        </label>

        <label className="block">
          <span className="label">{t("admin.studentFullName")}</span>
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
      </div>

      <label className="block">
        <span className="label">{t("dashboard.className")}</span>
        <select
          className="input mt-2"
          onChange={(inputEvent) =>
            setForm((currentForm) => ({
              ...currentForm,
              classId: inputEvent.target.value,
            }))
          }
          value={form.classId}
        >
          <option value="">{t("admin.studentFormSelectClass")}</option>
          {classes.map((schoolClass) => (
            <option key={schoolClass.id} value={schoolClass.id}>
              {schoolClass.name}
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
        {t("admin.studentFormActiveStatus")}
      </label>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button className="btn-primary" disabled={isSaving} type="submit">
          {isSaving ? t("admin.studentFormSaving") : t("admin.studentFormSave")}
        </button>
        <Link className="btn-secondary" to="/admin/students">
          {t("admin.studentFormCancel")}
        </Link>
      </div>
    </form>
  );
}

function validateStudentForm(form: StudentFormState) {
  const errors: TranslationKey[] = [];

  if (!form.schoolNumber.trim()) {
    errors.push("admin.studentFormErrorSchoolNumberRequired");
  }

  if (!form.name.trim()) {
    errors.push("admin.studentFormErrorNameRequired");
  }

  if (!form.classId) {
    errors.push("admin.studentFormErrorClassRequired");
  }

  return errors;
}
