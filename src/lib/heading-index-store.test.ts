import { afterEach, describe, expect, it } from "vitest";
import {
  _resetHeadingIndexStore,
  getAllHeadings,
  headingStats,
  onFileRemoved,
  onFileSaved,
  rebuildFromFiles,
  setVaultPaths,
  setVaultRoot,
  subscribe,
} from "./heading-index-store";

afterEach(() => _resetHeadingIndexStore());

describe("heading-index-store", () => {
  it("starts empty", () => {
    expect(getAllHeadings()).toEqual([]);
  });

  it("indexes headings from multiple files", () => {
    rebuildFromFiles([
      { path: "/v/A.md", content: "# Top\n## Sub" },
      { path: "/v/B.md", content: "# Other" },
    ]);
    const all = getAllHeadings();
    expect(all.length).toBe(3);
    expect(all.map((h) => h.text)).toEqual(["Top", "Sub", "Other"]);
  });

  it("sorts by path then line", () => {
    rebuildFromFiles([
      { path: "/v/Z.md", content: "# Z1" },
      { path: "/v/A.md", content: "# A1\n## A2" },
    ]);
    const out = getAllHeadings().map((h) => h.path);
    expect(out).toEqual(["/v/A.md", "/v/A.md", "/v/Z.md"]);
  });

  it("re-indexes a single file on save", () => {
    rebuildFromFiles([{ path: "/v/A.md", content: "# Old" }]);
    expect(getAllHeadings().map((h) => h.text)).toEqual(["Old"]);
    onFileSaved("/v/A.md", "# New\n## Sub");
    expect(getAllHeadings().map((h) => h.text)).toEqual(["New", "Sub"]);
  });

  it("removes a file from the index on save with no headings", () => {
    rebuildFromFiles([{ path: "/v/A.md", content: "# X" }]);
    onFileSaved("/v/A.md", "no headings here");
    expect(getAllHeadings()).toEqual([]);
  });

  it("drops headings from removed paths via setVaultPaths", () => {
    rebuildFromFiles([
      { path: "/v/A.md", content: "# A" },
      { path: "/v/B.md", content: "# B" },
    ]);
    setVaultPaths(["/v/A.md"]);
    expect(getAllHeadings().map((h) => h.text)).toEqual(["A"]);
  });

  it("forgets a removed file via onFileRemoved", () => {
    rebuildFromFiles([{ path: "/v/A.md", content: "# A\n## A2" }]);
    onFileRemoved("/v/A.md");
    expect(getAllHeadings()).toEqual([]);
  });

  it("notifies subscribers on every mutation", () => {
    let calls = 0;
    const unsub = subscribe(() => {
      calls++;
    });
    rebuildFromFiles([{ path: "/v/A.md", content: "# A" }]);
    onFileSaved("/v/A.md", "# B");
    onFileRemoved("/v/A.md");
    expect(calls).toBe(3);
    unsub();
  });

  it("restores from localStorage on matching vault root", () => {
    setVaultRoot("/v");
    rebuildFromFiles([{ path: "/v/A.md", content: "# Cached" }]);
    setVaultRoot(null);
    expect(getAllHeadings()).toEqual([]);
    setVaultRoot("/v");
    expect(getAllHeadings().map((h) => h.text)).toEqual(["Cached"]);
  });

  it("reports stats", () => {
    rebuildFromFiles([
      { path: "/v/A.md", content: "# A\n# A2" },
      { path: "/v/B.md", content: "# B" },
    ]);
    expect(headingStats()).toEqual({ headings: 3, files: 2 });
  });
});
