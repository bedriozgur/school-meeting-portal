import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SchoolHeader } from "../components/SchoolHeader";
import { useAuth } from "../auth/useAuth";
import { useT } from "../hooks/useT";

export function AdminLoginPage() {
  const { isAdmin, isConfigured, isLoading, signInWithGoogle, signOut, user } =
    useAuth();
  const { t } = useT();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoading && user && isAdmin) {
      navigate("/admin", { replace: true });
    }
  }, [isAdmin, isLoading, navigate, user]);

  async function handleSignIn() {
    setError("");

    try {
      await signInWithGoogle();
    } catch {
      setError(t("admin.loginError"));
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-3xl flex-col gap-8">
      <SchoolHeader />
      <section className="surface my-auto space-y-6 p-6 sm:p-8">
        <div className="space-y-3">
          <p className="label">{t("admin.loginEyebrow")}</p>
          <h1 className="heading font-display text-4xl font-black sm:text-5xl">
            {t("admin.loginTitle")}
          </h1>
          <p className="copy text-base font-semibold leading-7">
            {t("admin.loginDescription")}
          </p>
        </div>

        {!isConfigured ? (
          <p className="status-warning rounded-2xl px-4 py-3 text-sm font-bold">
            {t("admin.authNotConfigured")}
          </p>
        ) : null}

        {user && !isAdmin ? (
          <div className="space-y-3 rounded-2xl border bg-white p-4 [border-color:var(--color-border)]">
            <p className="status-danger rounded-2xl px-4 py-3 text-sm font-bold">
              {t("admin.accessDeniedDescription")}
            </p>
            <p className="text-strong text-sm font-extrabold">{user.email}</p>
            <button className="btn-secondary w-full" onClick={signOut} type="button">
              {t("admin.signOut")}
            </button>
          </div>
        ) : null}

        {error ? (
          <p className="status-danger rounded-2xl px-4 py-3 text-sm font-bold">
            {error}
          </p>
        ) : null}

        <button
          className="btn-primary w-full"
          disabled={!isConfigured || isLoading}
          onClick={handleSignIn}
          type="button"
        >
          {isLoading ? t("admin.loading") : t("admin.googleSignIn")}
        </button>
      </section>
    </div>
  );
}
