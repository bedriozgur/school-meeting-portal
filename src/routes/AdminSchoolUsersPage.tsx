import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/useAuth";
import type { SchoolUser, SchoolUserRole } from "../domain/models";
import { useT } from "../hooks/useT";
import { repositories } from "../repositories";
import { useAdminSchoolStore } from "../store/adminSchoolStore";

type LoadStatus = "loading" | "ready" | "error";

type FormState = {
  uid: string;
  email: string;
  role: SchoolUserRole;
  isActive: boolean;
};

const emptyFormState: FormState = {
  uid: "",
  email: "",
  role: "schoolAdmin",
  isActive: true,
};

export function AdminSchoolUsersPage() {
  const { t } = useT();
  const { user, isSuperAdmin, isLegacyAdmin } = useAuth();
  const { currentSchoolId, hasHydrated } = useAdminSchoolStore();
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [schoolUsers, setSchoolUsers] = useState<SchoolUser[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [formState, setFormState] = useState<FormState>(emptyFormState);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    if (!hasHydrated) {
      return undefined;
    }

    setStatus("loading");
    const loadSchoolUsers = isSuperAdmin || isLegacyAdmin
      ? repositories.schoolUserRepository.listSchoolUsers(currentSchoolId)
      : user
        ? repositories.schoolUserRepository.getUserSchoolRoles(user.uid)
        : Promise.resolve([]);

    loadSchoolUsers
      .then((nextSchoolUsers) => {
        if (!isCurrent) {
          return;
        }

        setSchoolUsers(nextSchoolUsers);
        setStatus("ready");
      })
      .catch((loadError) => {
        if (!isCurrent) {
          return;
        }

        console.error("[Admin school users] failed to load school users", loadError);
        setError(t("admin.schoolUsersLoadError"));
        setStatus("error");
      });

    return () => {
      isCurrent = false;
    };
  }, [currentSchoolId, hasHydrated, isLegacyAdmin, isSuperAdmin, t, user]);

  const sortedSchoolUsers = useMemo(
    () =>
      [...schoolUsers].sort((left, right) => {
        const email = left.email.localeCompare(right.email, "tr");

        if (email !== 0) {
          return email;
        }

        return left.uid.localeCompare(right.uid, "tr");
      }),
    [schoolUsers],
  );

  function handleEdit(schoolUser: SchoolUser) {
    setFormState({
      uid: schoolUser.uid,
      email: schoolUser.email,
      role: schoolUser.role,
      isActive: schoolUser.isActive,
    });
    setMessage(t("admin.schoolUsersEditLoaded"));
  }

  function resetForm() {
    setFormState(emptyFormState);
    setMessage("");
    setError("");
  }

  async function handleSubmit(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    setError("");
    setMessage("");

    if (!formState.uid.trim() || !formState.email.trim()) {
      setError(t("admin.schoolUsersValidationRequired"));
      return;
    }

    setSaving(true);
    try {
      const schoolUser = await repositories.schoolUserRepository.upsertSchoolUserRole({
        schoolId: currentSchoolId,
        uid: formState.uid.trim(),
        email: formState.email.trim(),
        role: formState.role,
        isActive: formState.isActive,
      });

      setSchoolUsers((currentSchoolUsers) => {
        const nextSchoolUsers = currentSchoolUsers.filter(
          (currentSchoolUser) => currentSchoolUser.id !== schoolUser.id,
        );

        nextSchoolUsers.push(schoolUser);

        return nextSchoolUsers;
      });
      resetForm();
      setMessage(t("admin.schoolUsersSaved"));
      setStatus("ready");
    } catch (saveError) {
      console.error("[Admin school users] failed to save school user", {
        error: saveError,
        formState,
      });
      setError(t("admin.schoolUsersSaveError"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(schoolUserId: string) {
    setError("");
    setMessage("");

    try {
      const schoolUser = await repositories.schoolUserRepository.deactivateSchoolUserRole(
        schoolUserId,
      );

      setSchoolUsers((currentSchoolUsers) =>
        currentSchoolUsers.map((currentSchoolUser) =>
          currentSchoolUser.id === schoolUser.id ? schoolUser : currentSchoolUser,
        ),
      );
      setMessage(t("admin.schoolUsersDeactivated"));
    } catch (deactivateError) {
      console.error("[Admin school users] failed to deactivate school user", {
        error: deactivateError,
        schoolUserId,
      });
      setError(t("admin.schoolUsersDeactivateError"));
    }
  }

  if (status === "loading") {
    return (
      <section className="surface p-6 sm:p-8">
        <p className="text-strong text-lg font-extrabold">
          {t("admin.schoolUsersLoading")}
        </p>
      </section>
    );
  }

  if (status === "error") {
    return (
      <section className="surface p-6 sm:p-8">
        <p className="status-danger rounded-2xl px-4 py-3 text-sm font-bold">
          {error}
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="surface p-6 sm:p-8">
        <p className="label">{t("admin.schoolUsersEyebrow")}</p>
        <h1 className="heading mt-3 font-display text-4xl font-black">
          {t("admin.schoolUsersTitle")}
        </h1>
        <p className="copy mt-3 max-w-3xl text-base font-semibold leading-7">
          {t("admin.schoolUsersDescription")}
        </p>
      </div>

      {message ? (
        <p className="status-success rounded-2xl px-4 py-3 text-sm font-bold">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="status-danger rounded-2xl px-4 py-3 text-sm font-bold">
          {error}
        </p>
      ) : null}

      <section className="surface space-y-4 p-6 sm:p-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="label">{t("admin.schoolUsersFormEyebrow")}</p>
            <h2 className="text-strong mt-2 text-2xl font-black">
              {t("admin.schoolUsersFormTitle")}
            </h2>
          </div>
          <button className="btn-secondary w-full sm:w-auto" onClick={resetForm} type="button">
            {t("admin.schoolUsersReset")}
          </button>
        </div>

        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="block">
            <span className="label">{t("admin.schoolUsersUid")}</span>
            <input
              className="input mt-2"
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  uid: event.target.value,
                }))
              }
              value={formState.uid}
            />
          </label>
          <label className="block">
            <span className="label">{t("admin.schoolUsersEmail")}</span>
            <input
              autoComplete="email"
              className="input mt-2"
              inputMode="email"
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  email: event.target.value,
                }))
              }
              value={formState.email}
            />
          </label>
          <label className="block">
            <span className="label">{t("admin.schoolUsersRole")}</span>
            <select
              className="input mt-2"
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  role: event.target.value as SchoolUserRole,
                }))
              }
              value={formState.role}
            >
              <option value="schoolAdmin">{t("admin.schoolUsersRoleSchoolAdmin")}</option>
              <option value="staff">{t("admin.schoolUsersRoleStaff")}</option>
            </select>
          </label>
          <label className="flex items-center gap-3 rounded-2xl border px-4 py-4 [border-color:var(--color-border)]">
            <input
              checked={formState.isActive}
              className="h-5 w-5 accent-[var(--color-primary)]"
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  isActive: event.target.checked,
                }))
              }
              type="checkbox"
            />
            <span className="label">{t("admin.schoolUsersActive")}</span>
          </label>
          <div className="md:col-span-2">
            <button className="btn-primary w-full sm:w-auto" disabled={saving} type="submit">
              {saving ? t("admin.loading") : t("admin.schoolUsersSave")}
            </button>
          </div>
        </form>
      </section>

      <section className="surface p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="label">{t("admin.schoolUsersTableEyebrow")}</p>
            <h2 className="text-strong mt-2 text-2xl font-black">
              {t("admin.schoolUsersTableTitle")}
            </h2>
          </div>
          <p className="copy text-sm font-semibold">{t("admin.schoolUsersCurrentSchool")}</p>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[48rem] border-separate border-spacing-0">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.2em] text-[color:var(--color-muted-text)]">
                <th className="px-3 py-2">{t("admin.schoolUsersEmail")}</th>
                <th className="px-3 py-2">{t("admin.schoolUsersUid")}</th>
                <th className="px-3 py-2">{t("admin.schoolUsersRole")}</th>
                <th className="px-3 py-2">{t("admin.schoolUsersStatus")}</th>
                <th className="px-3 py-2">{t("admin.schoolUsersActions")}</th>
              </tr>
            </thead>
            <tbody>
              {sortedSchoolUsers.map((schoolUser) => (
                <tr key={schoolUser.id} className="border-t border-[color:var(--color-border)]">
                  <td className="px-3 py-4 text-sm font-semibold">{schoolUser.email}</td>
                  <td className="px-3 py-4 text-sm font-semibold">{schoolUser.uid}</td>
                  <td className="px-3 py-4 text-sm font-semibold">
                    {schoolUser.role === "schoolAdmin"
                      ? t("admin.schoolUsersRoleSchoolAdmin")
                      : t("admin.schoolUsersRoleStaff")}
                  </td>
                  <td className="px-3 py-4 text-sm font-semibold">
                    {schoolUser.isActive
                      ? t("admin.schoolUsersActiveValue")
                      : t("admin.schoolUsersInactiveValue")}
                  </td>
                  <td className="px-3 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="btn-secondary"
                        onClick={() => handleEdit(schoolUser)}
                        type="button"
                      >
                        {t("admin.schoolUsersEdit")}
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => handleDeactivate(schoolUser.id)}
                        type="button"
                      >
                        {t("admin.schoolUsersDeactivate")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {sortedSchoolUsers.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-sm font-semibold" colSpan={5}>
                    {t("admin.schoolUsersEmpty")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
