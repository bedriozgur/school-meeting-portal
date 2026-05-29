import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildMeetingCodeLookupCandidates,
  formatMeetingCodeInput,
  generateMeetingCode,
  normalizeMeetingCode,
} from "../src/repositories/meetingCodes";

describe("meeting codes", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("normalizes six letters to ABC-DEF", () => {
    expect(normalizeMeetingCode("tedbrs")).toBe("TED-BRS");
    expect(normalizeMeetingCode(" TED-BRS ")).toBe("TED-BRS");
  });

  it("formats meeting code input while preserving legacy lookup behavior", () => {
    expect(formatMeetingCodeInput("jta026")).toBe("JTA-026");
    expect(formatMeetingCodeInput("JTA-026")).toBe("JTA-026");
    expect(formatMeetingCodeInput("abc123")).toBe("ABC-123");
    expect(formatMeetingCodeInput("bahar2026")).toBe("BAHAR2026");
  });

  it("keeps legacy numeric codes intact", () => {
    expect(normalizeMeetingCode("bahar2026")).toBe("BAHAR2026");
    expect(normalizeMeetingCode("  123456  ")).toBe("123456");
  });

  it("builds lookup candidates for dashed and legacy codes", () => {
    expect(buildMeetingCodeLookupCandidates("TEDBRS")).toEqual(
      expect.arrayContaining(["TEDBRS", "TED-BRS"]),
    );
    expect(buildMeetingCodeLookupCandidates("TED-BRS")).toEqual(
      expect.arrayContaining(["TED-BRS", "TEDBRS"]),
    );
    expect(buildMeetingCodeLookupCandidates("JTA-026")).toEqual(
      expect.arrayContaining(["JTA-026", "JTA026"]),
    );
    expect(buildMeetingCodeLookupCandidates("BAHAR2026")).toEqual(
      expect.arrayContaining(["BAHAR2026"]),
    );
  });

  it("generates letter-only codes with a dash", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const code = generateMeetingCode();

    expect(code).toBe("AAA-AAA");
    expect(code).toMatch(/^[A-HJ-NPR-TV-Z]{3}-[A-HJ-NPR-TV-Z]{3}$/);
    expect(code).not.toMatch(/[IOQ]/);
  });
});
