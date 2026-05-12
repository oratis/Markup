import { describe, expect, it } from "vitest";
import { parseQuery, pathMatches } from "./search-operators";

describe("parseQuery", () => {
  it("returns empty for empty input", () => {
    expect(parseQuery("")).toEqual({ tags: [], paths: [], text: "" });
  });

  it("passes plain text through untouched", () => {
    expect(parseQuery("hello world")).toEqual({
      tags: [],
      paths: [],
      text: "hello world",
    });
  });

  it("extracts a tag operator with leading #", () => {
    expect(parseQuery("tag:#foo")).toEqual({ tags: ["foo"], paths: [], text: "" });
  });

  it("extracts a tag operator without leading #", () => {
    expect(parseQuery("tag:foo")).toEqual({ tags: ["foo"], paths: [], text: "" });
  });

  it("supports nested tags with /", () => {
    expect(parseQuery("tag:projects/markup")).toEqual({
      tags: ["projects/markup"],
      paths: [],
      text: "",
    });
  });

  it("extracts a path operator", () => {
    expect(parseQuery("path:journal/")).toEqual({
      tags: [],
      paths: ["journal/"],
      text: "",
    });
  });

  it("combines multiple operators with text", () => {
    const r = parseQuery("tag:#todo path:journal/ buy milk");
    expect(r.tags).toEqual(["todo"]);
    expect(r.paths).toEqual(["journal/"]);
    expect(r.text).toBe("buy milk");
  });

  it("collects multiple values of the same kind", () => {
    const r = parseQuery("tag:a tag:b");
    expect(r.tags).toEqual(["a", "b"]);
  });

  it("ignores case on operator names", () => {
    const r = parseQuery("TAG:foo Path:bar");
    expect(r.tags).toEqual(["foo"]);
    expect(r.paths).toEqual(["bar"]);
  });
});

describe("pathMatches", () => {
  it("returns true when no path operators", () => {
    expect(pathMatches("/v/A.md", [])).toBe(true);
  });

  it("substring-matches case-insensitively", () => {
    expect(pathMatches("/v/Journal/Daily.md", ["journal"])).toBe(true);
    expect(pathMatches("/v/notes/x.md", ["journal"])).toBe(false);
  });

  it("requires ALL operators to match (AND)", () => {
    expect(pathMatches("/v/journal/daily/2026.md", ["journal", "daily"])).toBe(true);
    expect(pathMatches("/v/journal/2026.md", ["journal", "weekly"])).toBe(false);
  });
});
