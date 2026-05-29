const letters = "ABCDEFGHJKLMNPRSTUVWXYZ";
const defaultMaxAttempts = 25;

export function generateMeetingCode(): string {
  const prefix = Array.from({ length: 3 }, () =>
    letters.charAt(Math.floor(Math.random() * letters.length)),
  ).join("");

  const suffix = Array.from({ length: 3 }, () =>
    letters.charAt(Math.floor(Math.random() * letters.length)),
  ).join("");

  return `${prefix}-${suffix}`;
}

export function normalizeMeetingCode(meetingCode: string): string {
  const cleaned = meetingCode
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  if (/^[A-Z]{6}$/.test(cleaned)) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  }

  return cleaned;
}

export function formatMeetingCodeInput(meetingCode: string): string {
  const cleaned = meetingCode
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  if (cleaned.length === 6) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  }

  return cleaned;
}

export function buildMeetingCodeLookupCandidates(
  meetingCode: string,
): string[] {
  const trimmed = meetingCode.trim().toUpperCase();

  if (!trimmed) {
    return [];
  }

  const cleaned = trimmed.replace(/[^A-Z0-9]/g, "");
  const normalized = normalizeMeetingCode(trimmed);
  const candidates = new Set<string>();

  [trimmed, cleaned, normalized].forEach((candidate) => {
    if (candidate) {
      candidates.add(candidate);
    }
  });

  if (cleaned.length === 6) {
    candidates.add(`${cleaned.slice(0, 3)}-${cleaned.slice(3)}`);
  }

  return [...candidates];
}

export async function generateUniqueMeetingCode(
  isAvailable: (meetingCode: string) => Promise<boolean>,
  maxAttempts = defaultMaxAttempts,
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const code = generateMeetingCode();

    if (await isAvailable(code)) {
      return code;
    }
  }

  throw new Error("Could not generate a unique meeting code.");
}
