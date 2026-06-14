import { describe, expect, it } from "vitest";
import type { VaultFile } from "../store";
import { adjacentDocs, parentDir, siblingDocs, sortVaultFiles } from "./vault-order";

function f(relPath: string, mtimeMs = 0): VaultFile {
  const name = relPath.slice(relPath.lastIndexOf("/") + 1);
  return { path: `/v/${relPath}`, relPath, name, mtimeMs, size: 0 } as VaultFile;
}

describe("sortVaultFiles", () => {
  it("sorts by relPath for name mode", () => {
    const out = sortVaultFiles([f("b.md"), f("a.md"), f("docs/c.md")], "name");
    expect(out.map((x) => x.relPath)).toEqual(["a.md", "b.md", "docs/c.md"]);
  });
  it("sorts by mtime descending for mtime mode", () => {
    const out = sortVaultFiles([f("a.md", 1), f("b.md", 3), f("c.md", 2)], "mtime");
    expect(out.map((x) => x.relPath)).toEqual(["b.md", "c.md", "a.md"]);
  });
  it("does not mutate the input", () => {
    const input = [f("b.md"), f("a.md")];
    sortVaultFiles(input, "name");
    expect(input.map((x) => x.relPath)).toEqual(["b.md", "a.md"]);
  });
});

describe("adjacentDocs", () => {
  const files = [f("intro.md"), f("guide.md"), f("zed.md"), f("notes.canvas")];

  it("returns the prev/next markdown docs in tree order", () => {
    // name order: guide.md, intro.md, zed.md (canvas excluded)
    const { prev, next } = adjacentDocs(files, "name", "/v/intro.md");
    expect(prev?.relPath).toBe("guide.md");
    expect(next?.relPath).toBe("zed.md");
  });

  it("has no prev at the first doc and no next at the last", () => {
    expect(adjacentDocs(files, "name", "/v/guide.md").prev).toBeNull();
    expect(adjacentDocs(files, "name", "/v/zed.md").next).toBeNull();
  });

  it("skips non-markdown entries when choosing neighbours", () => {
    // zed.md's next would be notes.canvas, but canvases are skipped → null
    expect(adjacentDocs(files, "name", "/v/zed.md").next).toBeNull();
  });

  it("yields nothing for an unknown or missing active path", () => {
    expect(adjacentDocs(files, "name", "/v/nope.md")).toEqual({ prev: null, next: null });
    expect(adjacentDocs(files, "name", null)).toEqual({ prev: null, next: null });
  });
});

describe("siblingDocs", () => {
  const files = [
    f("guide.md"),
    f("intro.md"),
    f("docs/a.md"),
    f("docs/b.md"),
    f("docs/pic.canvas"),
  ];

  it("lists markdown docs in the active file's folder, in order", () => {
    expect(siblingDocs(files, "name", "/v/docs/a.md").map((x) => x.relPath)).toEqual([
      "docs/a.md",
      "docs/b.md",
    ]);
  });

  it("lists root-level siblings for a root file", () => {
    expect(siblingDocs(files, "name", "/v/intro.md").map((x) => x.relPath)).toEqual([
      "guide.md",
      "intro.md",
    ]);
  });

  it("is empty without an active path", () => {
    expect(siblingDocs(files, "name", null)).toEqual([]);
  });
});

describe("parentDir", () => {
  it("returns the directory portion", () => {
    expect(parentDir("/v/docs/a.md")).toBe("/v/docs");
    expect(parentDir("a.md")).toBe("");
  });
});
