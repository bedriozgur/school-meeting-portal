import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { SchoolClass, Teacher } from "../domain/models";
import { useT } from "../hooks/useT";
import { repositories } from "../repositories";
import { useAdminSchoolStore } from "../store/adminSchoolStore";

type LoadStatus = "loading" | "success" | "error";

export function AdminClassesPage() {
  const { t } = useT();
  const { currentSchoolId, hasHydrated } = useAdminSchoolStore();
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [search, setSearch] = useState("");
  const teacherNameById = useMemo(
    () =>
      new Map(
        teachers.map((teacher) => [teacher.id, teacher.name] as const),
      ),
    [teachers],
  );
  const filteredClasses = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("tr");

    if (!normalizedSearch) {
      return classes;
    }

    return classes.filter((schoolClass) =>
      `${schoolClass.name} ${schoolClass.grade} ${
        teacherNameById.get(schoolClass.classTeacherId) ?? ""
      }`
        .toLocaleLowerCase("tr")
        .includes(normalizedSearch),
    );
  }, [classes, search, teacherNameById]);

  useEffect(() => {
    let isCurrent = true;

    if (!hasHydrated) {
      return undefined;
    }

    setStatus("loading");
    Promise.all([
      repositories.classRepository.listClasses(currentSchoolId),
      repositories.teacherRepository.listTeachers(currentSchoolId),
    ])
      .then(([nextClasses, nextTeachers]) => {
        if (!isCurrent) {
          return;
        }

        setClasses(nextClasses);
        setTeachers(nextTeachers);
        setStatus("success");
      })
      .catch(() => {
        if (isCurrent) {
          setStatus("error");
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [currentSchoolId, hasHydrated]);

  return (
    <div className="space-y-5">
      <section className="surface p-6 sm:p-8">
        <p className="label">{t("admin.masterDataEyebrow")}</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="heading font-display text-4xl font-black">
              {t("admin.classesTitle")}
            </h1>
            <p className="copy mt-3 max-w-3xl text-base font-semibold leading-7">
              {t("admin.classesDescription")}
            </p>
          </div>
          <Link className="btn-primary w-full sm:w-auto" to="/admin/classes/new">
            {t("admin.masterDataNew")}
          </Link>
        </div>
        <SearchBox search={search} setSearch={setSearch} />
      </section>

      <MasterDataState status={status} />

      {status === "success" ? (
        <section className="grid gap-3">
          {filteredClasses.map((schoolClass) => (
            <article className="surface p-5" key={schoolClass.id}>
              <div className="grid gap-4 lg:grid-cols-[1fr_0.5fr_1fr_auto] lg:items-center">
                <DataCell label={t("admin.className")} value={schoolClass.name} />
                <DataCell label={t("dashboard.grade")} value={schoolClass.grade} />
                <DataCell
                  label={t("admin.classTeacher")}
                  value={
                    teacherNameById.get(schoolClass.classTeacherId) ??
                    t("admin.masterDataMissingValue")
                  }
                />
                <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
                  <StatusBadge isActive={schoolClass.isActive ?? true} />
                  <Link className="btn-secondary" to={`/admin/classes/${schoolClass.id}/edit`}>
                    {t("admin.masterDataEdit")}
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </div>
  );
}

function SearchBox({
  search,
  setSearch,
}: {
  search: string;
  setSearch: (search: string) => void;
}) {
  const { t } = useT();

  return (
    <label className="mt-5 block">
      <span className="label">{t("admin.masterDataSearch")}</span>
      <input
        className="input mt-2"
        onChange={(event) => setSearch(event.target.value)}
        placeholder={t("admin.masterDataSearchPlaceholder")}
        value={search}
      />
    </label>
  );
}

function MasterDataState({ status }: { status: LoadStatus }) {
  const { t } = useT();

  if (status === "loading") {
    return (
      <section className="surface p-6 text-center">
        <p className="text-strong text-lg font-extrabold">
          {t("admin.masterDataLoading")}
        </p>
      </section>
    );
  }

  if (status === "error") {
    return (
      <section className="surface p-6 text-center">
        <p className="status-danger rounded-2xl px-4 py-3 text-sm font-bold">
          {t("admin.masterDataLoadError")}
        </p>
      </section>
    );
  }

  return null;
}

function DataCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="label">{label}</p>
      <p className="text-strong mt-1 text-base font-black">{value}</p>
    </div>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  const { t } = useT();

  return (
    <span
      className={`inline-flex min-h-12 items-center justify-center rounded-2xl px-4 py-2 text-sm font-extrabold ${
        isActive ? "status-success" : "status-danger"
      }`}
    >
      {isActive ? t("admin.statusActive") : t("admin.statusInactive")}
    </span>
  );
}
