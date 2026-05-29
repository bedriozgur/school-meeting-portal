import { Navigate, Outlet } from "react-router-dom";
import { SchoolHeader } from "../components/SchoolHeader";
import { PageVersionFooter } from "../components/PageVersionFooter";
import { useAuth } from "../auth/useAuth";
import { useSchoolAuthorization } from "../auth/useSchoolAuthorization";
import { useT } from "../hooks/useT";
import { useAdminSchoolStore } from "../store/adminSchoolStore";

export function ProtectedAdminRoute() {
  const { signOut, user } = useAuth();
  const { currentSchoolId, hasHydrated } = useAdminSchoolStore();
  const { canManageSchool, isLoading } = useSchoolAuthorization(currentSchoolId);
  const { t } = useT();

  if (isLoading || !hasHydrated) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-3xl flex-col gap-8">
        <SchoolHeader />
        <section className="surface my-auto p-6 text-center">
          <p className="text-strong text-lg font-extrabold">
            {t("admin.loading")}
          </p>
        </section>
        <PageVersionFooter />
      </div>
    );
  }

  if (!user) {
    return <Navigate replace to="/admin/login" />;
  }

  if (!canManageSchool) {
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
        <PageVersionFooter />
      </div>
    );
  }

  return <Outlet />;
}
