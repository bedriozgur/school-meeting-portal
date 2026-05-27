import { languages, type Language } from "../i18n/i18n";
import { useSessionStore } from "../store/sessionStore";
import { useT } from "../hooks/useT";

const languageLabels: Record<Language, "app.turkish" | "app.english"> = {
  tr: "app.turkish",
  en: "app.english",
};

type LanguageSwitcherProps = {
  compact?: boolean;
  className?: string;
};

export function LanguageSwitcher({
  compact = false,
  className = "",
}: LanguageSwitcherProps) {
  const activeLanguage = useSessionStore((state) => state.language);
  const setLanguage = useSessionStore((state) => state.setLanguage);
  const { t } = useT();

  return (
    <div
      className={`flex items-center gap-2 rounded-full border border-white/70 bg-white/70 p-1 shadow-sm ${className}`}
    >
      <span className="sr-only">{t("app.language")}</span>
      {languages.map((language) => (
        <button
          className={`rounded-full transition ${
            compact ? "px-2.5 py-1.5 text-[11px] font-bold" : "px-3 py-2 text-sm font-extrabold"
          } ${
            activeLanguage === language
              ? "text-white"
              : "copy hover:bg-white"
          }`}
          style={
            activeLanguage === language
              ? { background: "var(--color-primary)" }
              : undefined
          }
          key={language}
          onClick={() => setLanguage(language)}
          type="button"
        >
          {t(languageLabels[language])}
        </button>
      ))}
    </div>
  );
}
