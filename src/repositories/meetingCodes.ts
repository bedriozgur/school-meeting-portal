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
