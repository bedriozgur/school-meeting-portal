import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type {
  ClassFormInput,
  SchoolClass,
  Teacher,
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
  const [form, setForm] = useState<ClassFormState>(emptyForm);
  const [errorKeys, setErrorKeys] = useState<TranslationKey[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    let isCurrent = true;

    setStatus("loading");
    Promise.all([
      repositories.teacherRepository.listTeachers(),
      mode === "edit" && classId
        ? repositories.classRepository.getClassById(classId)
        : Promise.resolve(null),
    ])
      .then(([nextTeachers, nextClass]) => {
        if (!isCurrent) {
          return;
        }

        setTeachers(nextTeachers);
        setSchoolClass(nextClass);
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
        setStatus(mode === "edit" && !nextClass ? "error" : "success");
      })
      .catch(() => {
        if (isCurrent) {
          setStatus("error");
        }
      });

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
    } catch {
      setSaveError(t("admin.classFormSaveError"));
    } finally {
      setIsSaving(false);
    }
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
