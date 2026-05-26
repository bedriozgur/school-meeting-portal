export type ThemePresetName =
  | "tedRed"
  | "modernBlue"
  | "academicGreen"
  | "navy"
  | "warmNeutral"
  | "burgundy";

export type ThemePreset = {
  primary: string;
  primaryHover: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  mutedText: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
};

export const themePresets: Record<ThemePresetName, ThemePreset> = {
  tedRed: {
    primary: "#b91c1c",
    primaryHover: "#991b1b",
    secondary: "#7f1d1d",
    background: "#f8f1ec",
    surface: "rgba(255, 255, 255, 0.82)",
    text: "#261b18",
    mutedText: "#6b5b55",
    border: "#e8d8d2",
    success: "#166534",
    warning: "#a16207",
    danger: "#b91c1c",
  },
  modernBlue: {
    primary: "#1d4ed8",
    primaryHover: "#1e40af",
    secondary: "#0f766e",
    background: "#eef5fb",
    surface: "rgba(255, 255, 255, 0.84)",
    text: "#172033",
    mutedText: "#5d6b82",
    border: "#d5e0ec",
    success: "#15803d",
    warning: "#b45309",
    danger: "#dc2626",
  },
  academicGreen: {
    primary: "#14532d",
    primaryHover: "#166534",
    secondary: "#4d7c0f",
    background: "#f2f5e9",
    surface: "rgba(255, 255, 255, 0.82)",
    text: "#243023",
    mutedText: "#63715e",
    border: "#dbe5cf",
    success: "#15803d",
    warning: "#a16207",
    danger: "#b91c1c",
  },
  navy: {
    primary: "#172554",
    primaryHover: "#1e3a8a",
    secondary: "#334155",
    background: "#eef2f6",
    surface: "rgba(255, 255, 255, 0.86)",
    text: "#111827",
    mutedText: "#5b6472",
    border: "#d7dee8",
    success: "#047857",
    warning: "#b45309",
    danger: "#be123c",
  },
  warmNeutral: {
    primary: "#6f4e37",
    primaryHover: "#5c4030",
    secondary: "#8a6f4d",
    background: "#f7f0e4",
    surface: "rgba(255, 255, 255, 0.8)",
    text: "#2d251e",
    mutedText: "#74675b",
    border: "#e5d7c5",
    success: "#3f7d20",
    warning: "#a16207",
    danger: "#b42318",
  },
  burgundy: {
    primary: "#7f1d1d",
    primaryHover: "#651616",
    secondary: "#9f1239",
    background: "#f7edf0",
    surface: "rgba(255, 255, 255, 0.84)",
    text: "#2b1720",
    mutedText: "#725966",
    border: "#ead4dc",
    success: "#166534",
    warning: "#a16207",
    danger: "#be123c",
  },
};
