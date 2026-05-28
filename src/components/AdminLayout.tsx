import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { repositories } from "../repositories";
import { useAdminSchoolStore } from "../store/adminSchoolStore";
import { useT } from "../hooks/useT";
import type { TranslationKey } from "../i18n/i18n";
import { SchoolHeader } from "./SchoolHeader";
import type { School } from "../domain/models";

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
  const { signOut, user, isSuperAdmin } = useAuth();
  const { t } = useT();
  const { currentSchoolId, hasHydrated, setCurrentSchoolId } =
    useAdminSchoolStore();
  const [schools, setSchools] = useState<School[]>([]);
  const [currentSchool, setCurrentSchool] = useState<School | null>(null);
  const activeSchools = useMemo(
    () => schools.filter((school) => school.isActive !== false),
    [schools],
  );
  const canSwitchSchool = isSuperAdmin && activeSchools.length > 1;

  const schoolName = useMemo(
    () => currentSchool?.name ?? currentSchoolId,
    [currentSchool, currentSchoolId],
  );
  const selectableSchools = useMemo(() => {
    if (!currentSchool) {
      return activeSchools;
    }

    if (activeSchools.some((school) => school.id === currentSchool.id)) {
      return activeSchools;
    }

    return [currentSchool, ...activeSchools];
  }, [activeSchools, currentSchool]);

  useEffect(() => {
    let isCurrent = true;

    if (!hasHydrated) {
      return undefined;
    }

    async function loadSchools() {
      try {
        const nextSchools = await repositories.schoolRepository.listSchools();
        if (!isCurrent) {
          return;
        }

        setSchools(nextSchools);

        const activeSchoolList = nextSchools.filter(
          (school) => school.isActive !== false,
        );
        const nextCurrentSchool =
          nextSchools.find((school) => school.id === currentSchoolId) ??
          activeSchoolList[0] ??
          nextSchools[0] ??
          null;

        setCurrentSchool(nextCurrentSchool);

        if (nextCurrentSchool && nextCurrentSchool.id !== currentSchoolId) {
          setCurrentSchoolId(nextCurrentSchool.id);
        }
      } catch (error) {
        if (!isCurrent) {
          return;
        }

        console.error("[Admin layout] failed to load school selector data", {
          error,
          currentSchoolId,
        });
      }
    }

    void loadSchools();

    return () => {
      isCurrent = false;
    };
  }, [currentSchoolId, hasHydrated, setCurrentSchoolId]);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-7xl flex-col gap-6">
      <div className="print:hidden flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <SchoolHeader />
        <div className="surface w-full max-w-xs p-4 sm:w-80">
          <p className="label">{t("admin.currentSchoolLabel")}</p>
          {canSwitchSchool ? (
            <label className="mt-2 block">
              <span className="sr-only">{t("admin.currentSchoolSelector")}</span>
              <select
                className="input"
                onChange={(event) => setCurrentSchoolId(event.target.value)}
                value={currentSchoolId}
              >
                {selectableSchools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="text-strong mt-2 break-words text-base font-black">
              {schoolName}
            </p>
          )}
          <p className="copy mt-2 text-xs font-semibold leading-5">
            {currentSchool?.id ?? currentSchoolId}
          </p>
        </div>
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
          {/* School user management returns after the pilot. */}
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
