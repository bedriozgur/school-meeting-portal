import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { Teacher, TeacherFormInput } from "../domain/models";
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
  const [form, setForm] = useState<TeacherFormState>(emptyForm);
  const [errorKeys, setErrorKeys] = useState<TranslationKey[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (mode !== "edit" || !teacherId) {
      return;
    }

    let isCurrent = true;

    setStatus("loading");
    repositories.teacherRepository
      .getTeacherById(teacherId)
      .then((nextTeacher) => {
        if (!isCurrent) {
          return;
        }

        setTeacher(nextTeacher);
        setForm(
          nextTeacher
            ? {
                name: nextTeacher.name,
                subject: nextTeacher.subject,
                isActive: nextTeacher.isActive ?? true,
              }
            : emptyForm,
        );
        setStatus(nextTeacher ? "success" : "error");
      })
      .catch(() => {
        if (isCurrent) {
          setStatus("error");
        }
      });

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
    } catch {
      setSaveError(t("admin.teacherFormSaveError"));
    } finally {
      setIsSaving(false);
    }
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
