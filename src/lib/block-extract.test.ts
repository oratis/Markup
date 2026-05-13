import { describe, expect, it } from "vitest";
import { extractBlocks } from "./block-extract";

describe("extractBlocks", () => {
  it("returns empty for empty input", () => {
    expect(extractBlocks("")).toEqual([]);
  });

  it("finds a single marker at end of line", () => {
    const out = extractBlocks("first\nsecond line. ^abc\nthird");
    expect(out).toEqual([
      {
        id: "abc",
        line: 1,
        snippet: "second line.",
      },
    ]);
  });

  it("strips the marker from the snippet", () => {
    const out = extractBlocks("a paragraph. ^foo123");
    expect(out[0].snippet).toBe("a paragraph.");
  });

  it("skips markers inside fenced code blocks", () => {
    const md = ["text", "```", "fake ^skipme", "```", "real. ^keep"].join("\n");
    const ids = extractBlocks(md).map((b) => b.id);
    expect(ids).toEqual(["keep"]);
  });

  it("requires whitespace before the ^", () => {
    expect(extractBlocks("inline^foo")).toEqual([]);
  });

  it("rejects mid-line markers", () => {
    expect(extractBlocks("before ^foo after")).toEqual([]);
  });

  it("accepts marker at start of line (just the marker)", () => {
    const out = extractBlocks("^solo");
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ id: "solo", line: 0 });
  });

  it("handles multiple markers across the doc", () => {
    const md = "p1 ^a\n\np2 ^b\n\np3 ^c";
    const ids = extractBlocks(md).map((b) => b.id);
    expect(ids).toEqual(["a", "b", "c"]);
  });

  it("caps snippet length", () => {
    const long = `${"x".repeat(400)} ^id`;
    const out = extractBlocks(long);
    expect(out[0].snippet.length).toBeLessThanOrEqual(200);
  });
});
