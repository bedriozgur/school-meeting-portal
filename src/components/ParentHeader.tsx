import { useT } from "../hooks/useT";
import { useSchoolBranding } from "../theme/useSchoolBranding";
import { LanguageSwitcher } from "./LanguageSwitcher";

type ParentHeaderProps = {
  className?: string;
};

export function ParentHeader({ className = "" }: ParentHeaderProps) {
  const { t } = useT();
  const branding = useSchoolBranding();

  return (
    <header
      className={`flex items-center justify-between gap-3 pt-1 print:hidden ${className}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        {branding.logoUrl ? (
          <img
            alt={t("app.logoAlt")}
            className="h-12 w-12 shrink-0 rounded-2xl border border-[color:var(--color-border)] bg-white object-contain p-1.5 shadow-soft sm:h-14 sm:w-14"
            src={branding.logoUrl}
          />
        ) : (
          <div
            aria-label={t("app.logoAlt")}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[color:var(--color-border)] text-sm font-black text-white shadow-soft sm:h-14 sm:w-14 sm:text-base"
            style={{ background: "var(--color-primary)" }}
          >
            {t(branding.logoInitials)}
          </div>
        )}
        <p className="text-strong min-w-0 truncate text-lg font-black tracking-tight sm:text-xl">
          {t(branding.schoolName)}
        </p>
      </div>

      <LanguageSwitcher compact className="shrink-0" />
    </header>
  );
}
