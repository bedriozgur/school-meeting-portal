import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SchoolHeader } from "../components/SchoolHeader";
import { useAuth } from "../auth/useAuth";
import { useT } from "../hooks/useT";
import type { TranslationKey } from "../i18n/i18n";

export function AdminLoginPage() {
  const {
    isAdmin,
    isConfigured,
    isLoading,
    signInWithEmailAndPassword,
    signInWithGoogle,
    signOut,
    user,
  } = useAuth();
  const { t } = useT();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldError, setFieldError] = useState("");

  useEffect(() => {
    if (!isLoading && user && isAdmin) {
      navigate("/admin", { replace: true });
    }
  }, [isAdmin, isLoading, navigate, user]);

  async function handleSignIn() {
    setError("");
    setFieldError("");

    try {
      await signInWithGoogle();
    } catch (loginError) {
      setError(resolveAdminLoginError(loginError, t));
    }
  }

  async function handleEmailPasswordSubmit(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    setError("");
    setFieldError("");

    if (!email.trim() || !password.trim()) {
      setFieldError(t("admin.loginMissingCredentials"));
      return;
    }

    try {
      await signInWithEmailAndPassword(email.trim(), password);
    } catch (loginError) {
      setError(resolveAdminLoginError(loginError, t));
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
              {t("admin.unauthorizedUser")}
            </p>
            <p className="text-strong text-sm font-extrabold">{user.email}</p>
            <button className="btn-secondary w-full" onClick={signOut} type="button">
              {t("admin.signOut")}
            </button>
          </div>
        ) : null}

        <form className="space-y-4 rounded-2xl border bg-white p-4 [border-color:var(--color-border)]" onSubmit={handleEmailPasswordSubmit}>
          <div className="space-y-2">
            <p className="text-strong text-lg font-extrabold">{t("admin.emailSignInTitle")}</p>
            <p className="copy text-sm font-semibold leading-6">{t("admin.emailSignInDescription")}</p>
          </div>

          <label className="block">
            <span className="label">{t("admin.emailAddress")}</span>
            <input
              autoComplete="email"
              className="input mt-2"
              inputMode="email"
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              value={email}
            />
          </label>

          <label className="block">
            <span className="label">{t("admin.password")}</span>
            <input
              autoComplete="current-password"
              className="input mt-2"
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </label>

          {fieldError ? (
            <p className="status-warning rounded-2xl px-4 py-3 text-sm font-bold">
              {fieldError}
            </p>
          ) : null}

          <button
            className="btn-primary w-full"
            disabled={!isConfigured || isLoading}
            type="submit"
          >
            {isLoading ? t("admin.loading") : t("admin.emailSignIn")}
          </button>
        </form>

        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-[color:var(--color-border)]" />
          <span className="label">{t("admin.orDivider")}</span>
          <span className="h-px flex-1 bg-[color:var(--color-border)]" />
        </div>

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

function resolveAdminLoginError(
  error: unknown,
  t: (key: TranslationKey) => string,
) {
  if (error instanceof Error && error.message.includes("Firebase Auth is not configured")) {
    return t("admin.authNotConfigured");
  }

  const code = typeof error === "object" && error && "code" in error
    ? String((error as { code?: string }).code ?? "")
    : "";

  switch (code) {
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-email":
      return t("admin.invalidCredentials");
    case "auth/too-many-requests":
      return t("admin.loginRateLimited");
    case "auth/network-request-failed":
      return t("admin.loginNetworkError");
    default:
      return t("admin.genericLoginFailure");
  }
}
