import { Navigate, Outlet } from "react-router-dom";
import { SchoolHeader } from "../components/SchoolHeader";
import { useAuth } from "../auth/useAuth";
import { useT } from "../hooks/useT";

export function ProtectedAdminRoute() {
  const { isAdmin, isLoading, signOut, user } = useAuth();
  const { t } = useT();

  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-3xl flex-col gap-8">
        <SchoolHeader />
        <section className="surface my-auto p-6 text-center">
          <p className="text-strong text-lg font-extrabold">
            {t("admin.loading")}
          </p>
        </section>
      </div>
    );
  }

  if (!user) {
    return <Navigate replace to="/admin/login" />;
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-3xl flex-col gap-8">
        <SchoolHeader />
        <section className="surface my-auto space-y-5 p-6 text-center sm:p-8">
          <p className="label">{t("admin.accessDeniedEyebrow")}</p>
          <h1 className="heading font-display text-4xl font-black">
            {t("admin.accessDeniedTitle")}
          </h1>
          <p className="copy text-base font-semibold leading-7">
            {t("admin.accessDeniedDescription")}
          </p>
          <p className="text-strong rounded-2xl bg-white px-4 py-3 text-sm font-extrabold">
            {user.email}
          </p>
          <button className="btn-secondary w-full" onClick={signOut} type="button">
            {t("admin.signOut")}
          </button>
        </section>
      </div>
    );
  }

  return <Outlet />;
}
