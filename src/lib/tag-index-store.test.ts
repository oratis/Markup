import { afterEach, describe, expect, it } from "vitest";
import {
  _resetTagIndexStore,
  allTagsWithCounts,
  filesForTag,
  onFileRemoved,
  onFileSaved,
  rebuildFromFiles,
  setVaultPaths,
  setVaultRoot,
  subscribe,
  tagStats,
} from "./tag-index-store";

afterEach(() => _resetTagIndexStore());

describe("tag-index-store rebuild", () => {
  it("indexes inline tags from multiple files", () => {
    rebuildFromFiles([
      { path: "/v/A.md", content: "body #foo #bar" },
      { path: "/v/B.md", content: "body #foo" },
    ]);
    expect(filesForTag("foo")).toEqual(["/v/A.md", "/v/B.md"]);
    expect(filesForTag("bar")).toEqual(["/v/A.md"]);
  });

  it("indexes frontmatter tags", () => {
    rebuildFromFiles([
      { path: "/v/A.md", content: "---\ntags: [yaml]\n---\n" },
      { path: "/v/B.md", content: "body #yaml" },
    ]);
    expect(filesForTag("yaml")).toEqual(["/v/A.md", "/v/B.md"]);
  });

  it("returns sorted tags with counts", () => {
    rebuildFromFiles([
      { path: "/v/A.md", content: "#beta #alpha" },
      { path: "/v/B.md", content: "#alpha" },
    ]);
    expect(allTagsWithCounts()).toEqual([
      { tag: "alpha", count: 2 },
      { tag: "beta", count: 1 },
    ]);
  });

  it("reports stats", () => {
    rebuildFromFiles([
      { path: "/v/A.md", content: "#foo #bar" },
      { path: "/v/B.md", content: "no tags here" },
    ]);
    expect(tagStats()).toEqual({ tags: 2, files: 1 });
  });
});

describe("tag-index-store onFileSaved", () => {
  it("re-indexes a single file's tags", () => {
    rebuildFromFiles([
      { path: "/v/A.md", content: "#foo" },
      { path: "/v/B.md", content: "" },
    ]);
    expect(filesForTag("foo")).toEqual(["/v/A.md"]);

    onFileSaved("/v/A.md", "#bar instead");
    expect(filesForTag("foo")).toEqual([]);
    expect(filesForTag("bar")).toEqual(["/v/A.md"]);
  });

  it("deletes an empty tag bucket when the last file loses the tag", () => {
    rebuildFromFiles([{ path: "/v/A.md", content: "#solo" }]);
    expect(allTagsWithCounts().map((t) => t.tag)).toContain("solo");
    onFileSaved("/v/A.md", "no tags");
    expect(allTagsWithCounts().map((t) => t.tag)).not.toContain("solo");
  });

  it("auto-tracks a new file on first save", () => {
    rebuildFromFiles([]);
    onFileSaved("/v/new.md", "#hello");
    expect(filesForTag("hello")).toEqual(["/v/new.md"]);
  });
});

describe("tag-index-store path lifecycle", () => {
  it("removes deleted files from all tag buckets via setVaultPaths", () => {
    rebuildFromFiles([
      { path: "/v/A.md", content: "#x" },
      { path: "/v/B.md", content: "#x" },
    ]);
    expect(filesForTag("x")).toEqual(["/v/A.md", "/v/B.md"]);
    setVaultPaths(["/v/A.md"]); // B was deleted
    expect(filesForTag("x")).toEqual(["/v/A.md"]);
  });

  it("forgets a removed file's tags via onFileRemoved", () => {
    rebuildFromFiles([{ path: "/v/A.md", content: "#gone" }]);
    onFileRemoved("/v/A.md");
    expect(filesForTag("gone")).toEqual([]);
  });
});

describe("tag-index-store subscribe + persistence", () => {
  it("notifies subscribers on rebuild", () => {
    let calls = 0;
    const unsub = subscribe(() => {
      calls++;
    });
    rebuildFromFiles([{ path: "/v/A.md", content: "#foo" }]);
    expect(calls).toBeGreaterThanOrEqual(1);
    unsub();
  });

  it("restores the index on matching setVaultRoot after relaunch", () => {
    setVaultRoot("/v");
    rebuildFromFiles([{ path: "/v/A.md", content: "#cached" }]);

    setVaultRoot(null);
    expect(filesForTag("cached")).toEqual([]);

    setVaultRoot("/v");
    expect(filesForTag("cached")).toEqual(["/v/A.md"]);
  });

  it("clears the index when switching to a different vault root", () => {
    setVaultRoot("/v1");
    rebuildFromFiles([{ path: "/v1/A.md", content: "#x" }]);
    expect(filesForTag("x")).toEqual(["/v1/A.md"]);

    setVaultRoot("/v2");
    expect(filesForTag("x")).toEqual([]);
  });
});
