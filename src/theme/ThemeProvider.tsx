import type { CSSProperties, ReactNode } from "react";
import { defaultSchoolBranding } from "./branding";
import { themePresets } from "./presets";

type ThemeProviderProps = {
  children: ReactNode;
};

type ThemeStyle = CSSProperties & {
  "--color-primary": string;
  "--color-primary-hover": string;
  "--color-secondary": string;
  "--color-background": string;
  "--color-surface": string;
  "--color-text": string;
  "--color-muted-text": string;
  "--color-border": string;
  "--color-success": string;
  "--color-warning": string;
  "--color-danger": string;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const preset = themePresets[defaultSchoolBranding.themePreset];
  const primary = defaultSchoolBranding.primaryAccent ?? preset.primary;
  const style: ThemeStyle = {
    "--color-primary": primary,
    "--color-primary-hover": preset.primaryHover,
    "--color-secondary": preset.secondary,
    "--color-background": preset.background,
    "--color-surface": preset.surface,
    "--color-text": preset.text,
    "--color-muted-text": preset.mutedText,
    "--color-border": preset.border,
    "--color-success": preset.success,
    "--color-warning": preset.warning,
    "--color-danger": preset.danger,
  };

  return <div style={style}>{children}</div>;
}
