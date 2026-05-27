import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Student } from "../domain/models";
import { useT } from "../hooks/useT";
import { repositories } from "../repositories";
import { useAdminSchoolStore } from "../store/adminSchoolStore";

type LoadStatus = "loading" | "success" | "error";

export function AdminStudentsPage() {
  const { t } = useT();
  const { currentSchoolId, hasHydrated } = useAdminSchoolStore();
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState("");
  const filteredStudents = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("tr");

    if (!normalizedSearch) {
      return students;
    }

    return students.filter((student) =>
      `${student.schoolNumber} ${student.name} ${student.className}`
        .toLocaleLowerCase("tr")
        .includes(normalizedSearch),
    );
  }, [search, students]);

  useEffect(() => {
    let isCurrent = true;

    if (!hasHydrated) {
      return undefined;
    }

    setStatus("loading");
    repositories.studentRepository
      .listStudents(currentSchoolId)
      .then((nextStudents) => {
        if (!isCurrent) {
          return;
        }

        setStudents(nextStudents);
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
              {t("admin.studentsTitle")}
            </h1>
            <p className="copy mt-3 max-w-3xl text-base font-semibold leading-7">
              {t("admin.studentsDescription")}
            </p>
          </div>
          <Link className="btn-primary w-full sm:w-auto" to="/admin/students/new">
            {t("admin.masterDataNew")}
          </Link>
        </div>
        <SearchBox search={search} setSearch={setSearch} />
      </section>

      <MasterDataState status={status} />

      {status === "success" ? (
        <section className="grid gap-3">
          {filteredStudents.map((student) => (
            <article className="surface p-5" key={student.id}>
              <div className="grid gap-4 lg:grid-cols-[0.7fr_1fr_0.7fr_auto] lg:items-center">
                <DataCell
                  label={t("admin.studentSchoolNumber")}
                  value={student.schoolNumber}
                />
                <DataCell label={t("admin.studentFullName")} value={student.name} />
                <DataCell label={t("dashboard.className")} value={student.className} />
                <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
                  <StatusBadge isActive={student.isActive ?? true} />
                  <Link className="btn-secondary" to={`/admin/students/${student.id}/edit`}>
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
