import { themePresets } from "./presets";

export function ThemePreview() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Object.entries(themePresets).map(([name, preset]) => (
        <div
          className="rounded-2xl border p-4"
          key={name}
          style={{
            background: preset.surface,
            borderColor: preset.border,
            color: preset.text,
          }}
        >
          <div
            className="mb-3 h-10 rounded-xl"
            style={{ background: preset.primary }}
          />
          <p className="font-bold">{name}</p>
        </div>
      ))}
    </div>
  );
}
