import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../store";
import { serializeSettings } from "./settings-io";

describe("serializeSettings", () => {
  it("round-trips default settings unchanged", () => {
    const json = serializeSettings(DEFAULT_SETTINGS);
    const parsed = JSON.parse(json);
    expect(parsed).toEqual(DEFAULT_SETTINGS);
  });

  it("emits pretty-printed JSON", () => {
    const json = serializeSettings(DEFAULT_SETTINGS);
    expect(json).toContain("\n");
    expect(json).toContain("  ");
  });
});
