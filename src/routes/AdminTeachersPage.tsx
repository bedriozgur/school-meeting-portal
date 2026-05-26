import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Teacher } from "../domain/models";
import { useT } from "../hooks/useT";
import { repositories } from "../repositories";

type LoadStatus = "loading" | "success" | "error";

export function AdminTeachersPage() {
  const { t } = useT();
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [search, setSearch] = useState("");
  const filteredTeachers = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("tr");

    if (!normalizedSearch) {
      return teachers;
    }

    return teachers.filter((teacher) =>
      `${teacher.name} ${teacher.subject}`
        .toLocaleLowerCase("tr")
        .includes(normalizedSearch),
    );
  }, [search, teachers]);

  useEffect(() => {
    let isCurrent = true;

    setStatus("loading");
    repositories.teacherRepository
      .listTeachers()
      .then((nextTeachers) => {
        if (!isCurrent) {
          return;
        }

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
  }, []);

  return (
    <div className="space-y-5">
      <section className="surface p-6 sm:p-8">
        <p className="label">{t("admin.masterDataEyebrow")}</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="heading font-display text-4xl font-black">
              {t("admin.teachersTitle")}
            </h1>
            <p className="copy mt-3 max-w-3xl text-base font-semibold leading-7">
              {t("admin.teachersDescription")}
            </p>
          </div>
          <Link className="btn-primary w-full sm:w-auto" to="/admin/teachers/new">
            {t("admin.masterDataNew")}
          </Link>
        </div>
        <SearchBox search={search} setSearch={setSearch} />
      </section>

      <MasterDataState status={status} />

      {status === "success" ? (
        <section className="grid gap-3">
          {filteredTeachers.map((teacher) => (
            <article className="surface p-5" key={teacher.id}>
              <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-center">
                <DataCell label={t("admin.teacherFullName")} value={teacher.name} />
                <DataCell
                  label={t("admin.teacherDefaultSubject")}
                  value={teacher.subject}
                />
                <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
                  <StatusBadge isActive={teacher.isActive ?? true} />
                  <Link className="btn-secondary" to={`/admin/teachers/${teacher.id}/edit`}>
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
