import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../store";
import { parseSettings, serializeSettings } from "./settings-io";

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

  it("round-trips a custom CSS snippet", () => {
    const css = ".milkdown .editor h1 { color: teal; }";
    const parsed = parseSettings(
      JSON.parse(serializeSettings({ ...DEFAULT_SETTINGS, customCss: css })),
    );
    expect(parsed?.customCss).toBe(css);
  });
});

describe("parseSettings", () => {
  it("returns null for non-objects", () => {
    expect(parseSettings(null)).toBeNull();
    expect(parseSettings(undefined)).toBeNull();
    expect(parseSettings("string")).toBeNull();
    expect(parseSettings(42)).toBeNull();
    expect(parseSettings([1, 2, 3])).toBeNull();
  });

  it("accepts the full default object verbatim", () => {
    expect(parseSettings(DEFAULT_SETTINGS)).toEqual(DEFAULT_SETTINGS);
  });

  it("round-trips through serialize", () => {
    const json = serializeSettings(DEFAULT_SETTINGS);
    expect(parseSettings(JSON.parse(json))).toEqual(DEFAULT_SETTINGS);
  });

  it("drops fields with wrong types", () => {
    expect(
      parseSettings({
        fontSize: "huge",
        proseMaxWidth: 800,
        spellcheck: "yes",
        lineWrap: false,
      }),
    ).toEqual({ proseMaxWidth: 800, lineWrap: false });
  });

  it("drops unknown keys", () => {
    expect(parseSettings({ fontSize: 18, bogus: 1, evil: "x" })).toEqual({
      fontSize: 18,
    });
  });

  it("rejects invalid enum values", () => {
    expect(parseSettings({ exportTheme: "neon", vaultSort: "alpha" })).toEqual({});
    expect(parseSettings({ exportTheme: "tufte", vaultSort: "mtime" })).toEqual({
      exportTheme: "tufte",
      vaultSort: "mtime",
    });
  });

  it("rejects non-finite numbers", () => {
    expect(
      parseSettings({ fontSize: Number.NaN, proseMaxWidth: Number.POSITIVE_INFINITY }),
    ).toEqual({});
  });

  it("returns empty object for empty input (no fields to apply)", () => {
    expect(parseSettings({})).toEqual({});
  });
});
