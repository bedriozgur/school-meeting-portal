import {
  getBuildTimestampLabel,
  getVersionBadgeText,
  shouldShowVersionBadge,
} from "../buildInfo";

type VersionBadgeProps = {
  compact?: boolean;
  className?: string;
};

export function VersionBadge({ compact = false, className = "" }: VersionBadgeProps) {
  if (!shouldShowVersionBadge()) {
    return null;
  }

  const badgeText = getVersionBadgeText();
  const timestampLabel = getBuildTimestampLabel();

  if (compact) {
    return (
      <div
        aria-label={timestampLabel ? `${badgeText} ${timestampLabel}` : badgeText}
        className={`text-center text-[9px] font-medium leading-4 tracking-wide text-[color:var(--color-muted-text)] ${className}`}
        title={timestampLabel ? `${badgeText} · ${timestampLabel}` : badgeText}
      >
        <span>{badgeText}</span>
        {timestampLabel ? <span>{` · ${timestampLabel}`}</span> : null}
      </div>
    );
  }

  return (
    <div
      aria-label={timestampLabel ? `${badgeText} ${timestampLabel}` : badgeText}
      className={`flex flex-col items-end gap-0.5 text-right leading-tight text-[10px] font-semibold tracking-wide text-[color:var(--color-muted-text)] ${className}`}
      title={timestampLabel ? `${badgeText} · ${timestampLabel}` : badgeText}
    >
      <span>{badgeText}</span>
      {timestampLabel ? <span>{timestampLabel}</span> : null}
    </div>
  );
}
