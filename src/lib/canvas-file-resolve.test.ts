import { describe, expect, it } from "vitest";
import { resolveVaultPath } from "./canvas-file-resolve";

describe("resolveVaultPath", () => {
  it("joins vault root + vault-relative path", () => {
    expect(resolveVaultPath("/v", "Notes/Foo.md")).toBe("/v/Notes/Foo.md");
  });

  it("strips trailing slash on vault root", () => {
    expect(resolveVaultPath("/v/", "a.md")).toBe("/v/a.md");
    expect(resolveVaultPath("/v//", "a.md")).toBe("/v/a.md");
  });

  it("strips leading slash on relative path", () => {
    expect(resolveVaultPath("/v", "/a.md")).toBe("/v/a.md");
  });

  it("treats POSIX-style leading-slash paths as vault-relative", () => {
    // Obsidian's spec: node.file is always vault-relative. A stray
    // leading slash is benign — we strip it and join against the root.
    expect(resolveVaultPath("/v", "/Sub/abs.md")).toBe("/v/Sub/abs.md");
  });

  it("passes Windows drive-letter paths through unchanged", () => {
    expect(resolveVaultPath("/v", "C:/Win/path.md")).toBe("C:/Win/path.md");
  });

  it("returns null when no relative path", () => {
    expect(resolveVaultPath("/v", null)).toBeNull();
    expect(resolveVaultPath("/v", "")).toBeNull();
    expect(resolveVaultPath("/v", undefined)).toBeNull();
  });

  it("returns null when vault root is missing and path is relative", () => {
    expect(resolveVaultPath(null, "a.md")).toBeNull();
    expect(resolveVaultPath(undefined, "a.md")).toBeNull();
  });

  it("still resolves absolute paths even when vault root is missing", () => {
    expect(resolveVaultPath(null, "/a.md")).toBe("/a.md");
  });
});
