import { Navigate, Outlet } from "react-router-dom";
import { SchoolHeader } from "../components/SchoolHeader";
import { useT } from "../hooks/useT";
import { useStaffSessionStore } from "../store/staffSessionStore";

export function ProtectedStaffRoute() {
  const { t } = useT();
  const hasHydrated = useStaffSessionStore((state) => state.hasHydrated);
  const isAuthenticated = useStaffSessionStore((state) => state.isAuthenticated);

  if (!hasHydrated && !isAuthenticated) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-3xl flex-col gap-8">
        <SchoolHeader />
        <section className="surface my-auto p-6 text-center">
          <p className="text-strong text-lg font-extrabold">
            {t("staff.loading")}
          </p>
        </section>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate replace to="/staff/login" />;
  }

  return <Outlet />;
}
