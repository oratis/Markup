import { describe, expect, it } from "vitest";
import { relTime } from "./rel-time";

describe("relTime", () => {
  const NOW = 1_000_000_000_000;

  it("formats seconds", () => {
    expect(relTime(NOW - 5_000, NOW)).toBe("5s ago");
    expect(relTime(NOW, NOW)).toBe("0s ago");
  });

  it("formats minutes", () => {
    expect(relTime(NOW - 120_000, NOW)).toBe("2m ago");
    expect(relTime(NOW - 60_000, NOW)).toBe("1m ago");
  });

  it("formats hours", () => {
    expect(relTime(NOW - 3 * 3600 * 1000, NOW)).toBe("3h ago");
  });

  it("formats days", () => {
    expect(relTime(NOW - 4 * 86400 * 1000, NOW)).toBe("4d ago");
  });

  it("clamps future timestamps to 0s", () => {
    expect(relTime(NOW + 5_000, NOW)).toBe("0s ago");
  });
});
