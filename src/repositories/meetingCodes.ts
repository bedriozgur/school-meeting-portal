const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const defaultMaxAttempts = 25;

export function generateMeetingCode(): string {
  const prefix = Array.from({ length: 3 }, () =>
    letters.charAt(Math.floor(Math.random() * letters.length)),
  ).join("");
  const suffix = String(Math.floor(Math.random() * 1000)).padStart(3, "0");

  return `${prefix}-${suffix}`;
}

export function normalizeMeetingCode(meetingCode: string): string {
  return meetingCode.trim().toUpperCase();
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
