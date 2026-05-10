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

  it("persists path-keyed entries to localStorage", () => {
    setScroll("/persist.md", 777);
    const raw = localStorage.getItem("markup.scrollMemory");
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw as string);
    expect(parsed["/persist.md"]).toBe(777);
  });

  it("does NOT persist scratch ids (no leading slash)", () => {
    setScroll("scratch:welcome", 500);
    // The cache has it, but localStorage shouldn't.
    expect(getScroll("scratch:welcome")).toBe(500);
    const raw = localStorage.getItem("markup.scrollMemory");
    if (raw) {
      const parsed = JSON.parse(raw);
      expect(parsed["scratch:welcome"]).toBeUndefined();
    }
  });
});
