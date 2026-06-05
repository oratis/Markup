import { describe, expect, it } from "vitest";
import { CALLOUT_TYPES, calloutMarker } from "./callout-deco";

describe("calloutMarker", () => {
  it("matches each known type case-insensitively and reports the marker span", () => {
    for (const type of CALLOUT_TYPES) {
      const line = `[!${type.toUpperCase()}] body`;
      const m = calloutMarker(line);
      expect(m?.type).toBe(type);
      expect(m?.start).toBe(0);
      // span covers exactly "[!TYPE]"
      expect(line.slice(m?.start, m?.end)).toBe(`[!${type.toUpperCase()}]`);
    }
  });

  it("accounts for leading whitespace in the marker span", () => {
    const m = calloutMarker("   [!warning]");
    expect(m?.type).toBe("warning");
    expect(m?.start).toBe(3);
    expect(m?.end).toBe(3 + "[!warning]".length);
  });

  it("rejects unknown types and plain blockquotes", () => {
    expect(calloutMarker("[!unknown] hi")).toBeNull();
    expect(calloutMarker("just a quote")).toBeNull();
    expect(calloutMarker("")).toBeNull();
    expect(calloutMarker("text [!note] not at start")).toBeNull();
  });
});
