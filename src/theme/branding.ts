import type { TranslationKey } from "../i18n/i18n";
import type { ThemePresetName } from "./presets";
import tedBursaLogo from "../assets/ted-bursa-logo.png";

export type SchoolBrandingConfig = {
  schoolName: TranslationKey;
  schoolShortName: TranslationKey;
  logoUrl?: string;
  logoInitials: TranslationKey;
  welcomeTitle: TranslationKey;
  welcomeSubtitle: TranslationKey;
  themePreset: ThemePresetName;
  primaryAccent?: string;
};

export const defaultSchoolBranding: SchoolBrandingConfig = {
  schoolName: "app.schoolName",
  schoolShortName: "app.schoolShortName",
  logoUrl: tedBursaLogo,
  logoInitials: "app.logoInitials",
  welcomeTitle: "landing.title",
  welcomeSubtitle: "landing.description",
  themePreset: "tedBursa",
};
