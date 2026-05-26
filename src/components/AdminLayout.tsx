import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { useT } from "../hooks/useT";
import type { TranslationKey } from "../i18n/i18n";
import { SchoolHeader } from "./SchoolHeader";

type AdminNavItem = {
  to: string;
  label: TranslationKey;
  end?: boolean;
};

const navItems: AdminNavItem[] = [
  { to: "/admin", label: "admin.nav.dashboard", end: true },
  { to: "/admin/pilot-checklist", label: "admin.nav.pilotChecklist" },
  { to: "/admin/events", label: "admin.nav.events" },
  { to: "/admin/students", label: "admin.nav.students" },
  { to: "/admin/teachers", label: "admin.nav.teachers" },
  { to: "/admin/classes", label: "admin.nav.classes" },
  { to: "/admin/import", label: "admin.nav.import" },
  { to: "/admin/qr", label: "admin.nav.qr" },
  { to: "/admin/staff", label: "admin.nav.staff" },
] as const;

export function AdminLayout() {
  const { signOut, user } = useAuth();
  const { t } = useT();

  return (
    <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-7xl flex-col gap-6">
      <div className="print:hidden">
        <SchoolHeader />
      </div>
      <div className="grid gap-5 lg:grid-cols-[17rem_1fr]">
        <aside className="surface h-fit p-4 print:hidden">
          <div className="mb-4">
            <p className="label">{t("admin.shellTitle")}</p>
            <p className="copy mt-2 break-words text-sm font-bold">
              {user?.email}
            </p>
          </div>
          <nav className="grid gap-2">
            {navItems.map((item) => (
              <NavLink
                className={({ isActive }) =>
                  `rounded-2xl px-4 py-3 text-sm font-extrabold transition ${
                    isActive
                      ? "text-white"
                      : "copy hover:bg-white hover:text-[var(--color-primary)]"
                  }`
                }
                end={item.end ?? false}
                key={item.to}
                style={({ isActive }) =>
                  isActive ? { background: "var(--color-primary)" } : undefined
                }
                to={item.to}
              >
                {t(item.label)}
              </NavLink>
            ))}
          </nav>
          <button className="btn-secondary mt-4 w-full" onClick={signOut} type="button">
            {t("admin.signOut")}
          </button>
        </aside>
        <section className="min-w-0">
          <Outlet />
        </section>
      </div>
    </div>
  );
}
