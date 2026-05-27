import {
  getBuildTimestampLabel,
  getVersionBadgeText,
  shouldShowVersionBadge,
} from "../buildInfo";

export function VersionBadge() {
  if (!shouldShowVersionBadge()) {
    return null;
  }

  const badgeText = getVersionBadgeText();
  const timestampLabel = getBuildTimestampLabel();

  return (
    <div
      aria-label={timestampLabel ? `${badgeText} ${timestampLabel}` : badgeText}
      className="flex flex-col items-end gap-0.5 text-right leading-tight text-[10px] font-semibold tracking-wide text-[color:var(--color-muted-text)]"
      title={timestampLabel ? `${badgeText} · ${timestampLabel}` : badgeText}
    >
      <span>{badgeText}</span>
      {timestampLabel ? <span>{timestampLabel}</span> : null}
    </div>
  );
}
