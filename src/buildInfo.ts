import packageJson from "../package.json";

export function getAppVersion() {
  return `v${packageJson.version}`;
}

export function getBuildShortHash() {
  const hash = __BUILD_GIT_HASH__.trim();

  return hash || "";
}

export function getBuildTimestamp() {
  return __BUILD_TIMESTAMP__;
}

export function getBuildTimestampLabel() {
  const timestamp = new Date(getBuildTimestamp());

  if (Number.isNaN(timestamp.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(timestamp) + " UTC";
}

export function shouldShowVersionBadge() {
  const raw = import.meta.env.VITE_SHOW_VERSION_BADGE?.trim().toLowerCase();

  if (!raw) {
    return true;
  }

  return ["1", "true", "yes", "on"].includes(raw);
}

export function getVersionBadgeText() {
  const version = getAppVersion();
  const hash = getBuildShortHash();

  return hash ? `${version} · ${hash}` : version;
}
