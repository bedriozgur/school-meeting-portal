import { useT } from "../hooks/useT";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function SchoolHeader() {
  const { t } = useT();

  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <div
          aria-label={t("app.logoAlt")}
          className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-emerald-900 text-xl font-black text-white shadow-soft"
        >
          {t("app.logoInitials")}
        </div>
        <p className="truncate text-lg font-extrabold text-stone-900">
          {t("app.schoolName")}
        </p>
      </div>
      <LanguageSwitcher />
    </header>
  );
}
