import { describe, expect, it } from "vitest";
import { firstHeadingText, slugifyForFilename } from "./slugify";

describe("slugifyForFilename", () => {
  it("strips leading hash markers and trims", () => {
    expect(slugifyForFilename("# Hello World ")).toBe("Hello World");
    expect(slugifyForFilename("###  Triple")).toBe("Triple");
  });

  it("replaces filesystem-unsafe chars with -", () => {
    expect(slugifyForFilename('foo/bar:baz*qux?"<>|')).toBe("foo-bar-baz-qux-----");
  });

  it("caps length at max", () => {
    expect(slugifyForFilename("a".repeat(200), 10)).toHaveLength(10);
  });

  it("returns empty for blank input", () => {
    expect(slugifyForFilename("   ")).toBe("");
  });
});

describe("firstHeadingText", () => {
  it("returns the first H1 content", () => {
    expect(firstHeadingText("# Foo\nbody")).toBe("Foo");
  });

  it("ignores deeper headings", () => {
    expect(firstHeadingText("intro\n## Sub\n# Top\nbody")).toBe("Top");
  });

  it("returns null when no H1 in first 200 lines", () => {
    expect(firstHeadingText("plain prose\nno hash")).toBeNull();
  });

  it("ignores `#foo` without a following space", () => {
    expect(firstHeadingText("#foo bar")).toBeNull();
  });
});
