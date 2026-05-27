import { useT } from "../hooks/useT";
import { useSchoolBranding } from "../theme/useSchoolBranding";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { VersionBadge } from "./VersionBadge";

export function SchoolHeader() {
  const { t } = useT();
  const branding = useSchoolBranding();

  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        {branding.logoUrl ? (
          <img
            alt={t("app.logoAlt")}
            className="h-14 w-14 shrink-0 rounded-2xl object-cover shadow-soft"
            src={branding.logoUrl}
          />
        ) : (
          <div
            aria-label={t("app.logoAlt")}
            className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-xl font-black text-white shadow-soft"
            style={{ background: "var(--color-primary)" }}
          >
            {t(branding.logoInitials)}
          </div>
        )}
        <p className="text-strong truncate text-lg font-extrabold">
          {t(branding.schoolName)}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <LanguageSwitcher />
        <VersionBadge />
      </div>
    </header>
  );
}
