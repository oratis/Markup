import { afterEach, describe, expect, it } from "vitest";
import { _resetPinned, getPinnedPaths, persistPinnedPath } from "./pinned-paths";

afterEach(() => _resetPinned());

describe("pinned-paths", () => {
  it("getPinnedPaths returns an empty set when nothing is persisted", () => {
    expect([...getPinnedPaths()]).toEqual([]);
  });

  it("persistPinnedPath(path, true) adds the path", () => {
    persistPinnedPath("/notes/a.md", true);
    expect(getPinnedPaths().has("/notes/a.md")).toBe(true);
  });

  it("persistPinnedPath(path, false) removes the path", () => {
    persistPinnedPath("/notes/b.md", true);
    persistPinnedPath("/notes/b.md", false);
    expect(getPinnedPaths().has("/notes/b.md")).toBe(false);
  });

  it("ignores null paths (scratch tabs)", () => {
    persistPinnedPath(null, true);
    expect([...getPinnedPaths()]).toEqual([]);
  });

  it("survives across multiple round-trips", () => {
    persistPinnedPath("/x.md", true);
    persistPinnedPath("/y.md", true);
    persistPinnedPath("/x.md", false);
    expect([...getPinnedPaths()].sort()).toEqual(["/y.md"]);
  });
});
