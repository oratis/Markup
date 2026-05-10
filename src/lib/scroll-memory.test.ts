import { afterEach, describe, expect, it } from "vitest";
import { _resetScrollCache, clearScroll, getScroll, setScroll } from "./scroll-memory";

afterEach(() => _resetScrollCache());

describe("scroll-memory", () => {
  it("returns 0 for an unknown id", () => {
    expect(getScroll("none")).toBe(0);
  });

  it("round-trips a saved offset", () => {
    setScroll("/a.md", 420);
    expect(getScroll("/a.md")).toBe(420);
  });

  it("clearScroll removes the entry, falling back to 0", () => {
    setScroll("/b.md", 99);
    clearScroll("/b.md");
    expect(getScroll("/b.md")).toBe(0);
  });

  it("entries are independent per id", () => {
    setScroll("/a.md", 100);
    setScroll("/b.md", 200);
    expect(getScroll("/a.md")).toBe(100);
    expect(getScroll("/b.md")).toBe(200);
  });
});
