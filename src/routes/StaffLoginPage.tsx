import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { SchoolHeader } from "../components/SchoolHeader";
import { PageVersionFooter } from "../components/PageVersionFooter";
import { useT } from "../hooks/useT";
import { isStaffAccessCodeValid, useStaffSessionStore } from "../store/staffSessionStore";

export function StaffLoginPage() {
  const { t } = useT();
  const navigate = useNavigate();
  const hasHydrated = useStaffSessionStore((state) => state.hasHydrated);
  const isAuthenticated = useStaffSessionStore((state) => state.isAuthenticated);
  const signIn = useStaffSessionStore((state) => state.signIn);
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (hasHydrated && isAuthenticated) {
      navigate("/staff", { replace: true });
    }
  }, [hasHydrated, isAuthenticated, navigate]);

  if (!hasHydrated) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-3xl flex-col gap-8">
        <SchoolHeader />
        <section className="surface my-auto p-6 text-center">
          <p className="text-strong text-lg font-extrabold">{t("staff.loading")}</p>
        </section>
      </div>
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!isStaffAccessCodeValid(accessCode)) {
      setError(t("staff.loginError"));
      return;
    }

    setIsSubmitting(true);
    signIn();
    if (import.meta.env.DEV === true) {
      console.info(
        "[Staff portal] session accepted",
        JSON.stringify({
          accessCodeConfigured: Boolean(import.meta.env.VITE_STAFF_ACCESS_CODE?.trim()),
          fallbackUsed: !import.meta.env.VITE_STAFF_ACCESS_CODE?.trim(),
        }),
      );
    }
    setIsSubmitting(false);
    navigate("/staff", { replace: true });
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-3xl flex-col gap-8">
      <SchoolHeader />
      <section className="surface my-auto space-y-6 p-6 sm:p-8">
        <div className="space-y-3">
          <p className="label">{t("staff.loginEyebrow")}</p>
          <h1 className="heading font-display text-4xl font-black sm:text-5xl">
            {t("staff.loginTitle")}
          </h1>
          <p className="copy text-base font-semibold leading-7">
            {t("staff.loginDescription")}
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="label">{t("staff.accessCodeLabel")}</span>
            <input
              className="input mt-2"
              inputMode="text"
              onChange={(event) => setAccessCode(event.target.value)}
              placeholder={t("staff.accessCodePlaceholder")}
              type="password"
              value={accessCode}
            />
          </label>

          <p className="copy text-sm font-semibold">{t("staff.loginHelper")}</p>

          {error ? (
            <p className="status-danger rounded-2xl px-4 py-3 text-sm font-bold">
              {error}
            </p>
          ) : null}

          <button className="btn-primary w-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? t("staff.loading") : t("staff.loginButton")}
          </button>
        </form>
      </section>
      <PageVersionFooter />
    </div>
  );
}
