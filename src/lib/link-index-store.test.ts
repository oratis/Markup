import { afterEach, describe, expect, it } from "vitest";
import {
  _resetLinkIndexStore,
  getBacklinksFor,
  indexStats,
  onFileRemoved,
  onFileSaved,
  rebuildFromFiles,
  setVaultPaths,
  setVaultRoot,
  subscribe,
} from "./link-index-store";

afterEach(() => _resetLinkIndexStore());

describe("link-index-store rebuild + lookup", () => {
  it("builds an index from the given files and serves backlinks", () => {
    rebuildFromFiles([
      { path: "/v/A.md", content: "see [[B]]" },
      { path: "/v/B.md", content: "" },
    ]);
    expect(getBacklinksFor("/v/B.md")).toHaveLength(1);
    expect(getBacklinksFor("/v/B.md")[0].sourcePath).toBe("/v/A.md");
  });

  it("reports stats after rebuild", () => {
    rebuildFromFiles([
      { path: "/v/A.md", content: "[[B]] and [[C]]" },
      { path: "/v/B.md", content: "" },
      { path: "/v/C.md", content: "" },
    ]);
    expect(indexStats()).toEqual({ targets: 2, refs: 2 });
  });
});

describe("link-index-store onFileSaved", () => {
  it("re-indexes a single file's links", () => {
    rebuildFromFiles([
      { path: "/v/A.md", content: "[[B]]" },
      { path: "/v/B.md", content: "" },
      { path: "/v/C.md", content: "" },
    ]);
    expect(getBacklinksFor("/v/B.md")).toHaveLength(1);
    expect(getBacklinksFor("/v/C.md")).toHaveLength(0);

    // Edit A to point at C instead.
    onFileSaved("/v/A.md", "[[C]]");

    expect(getBacklinksFor("/v/B.md")).toHaveLength(0);
    expect(getBacklinksFor("/v/C.md")).toHaveLength(1);
  });

  it("auto-tracks a brand-new file path on first save", () => {
    rebuildFromFiles([{ path: "/v/B.md", content: "" }]);
    // /v/A.md isn't in allPaths yet
    onFileSaved("/v/A.md", "[[B]]");
    expect(getBacklinksFor("/v/B.md")).toHaveLength(1);
  });
});

describe("link-index-store setVaultPaths / onFileRemoved", () => {
  it("drops backlinks pointing at a file no longer in the vault", () => {
    rebuildFromFiles([
      { path: "/v/A.md", content: "[[B]]" },
      { path: "/v/B.md", content: "" },
    ]);
    setVaultPaths(["/v/A.md"]); // B was deleted from disk
    expect(getBacklinksFor("/v/B.md")).toHaveLength(0);
  });

  it("forgets refs originating from a removed file", () => {
    rebuildFromFiles([
      { path: "/v/A.md", content: "[[B]]" },
      { path: "/v/B.md", content: "" },
    ]);
    onFileRemoved("/v/A.md");
    expect(getBacklinksFor("/v/B.md")).toHaveLength(0);
  });
});

describe("link-index-store subscribe + persistence", () => {
  it("notifies subscribers on rebuild", () => {
    let calls = 0;
    const unsub = subscribe(() => {
      calls++;
    });
    rebuildFromFiles([{ path: "/v/A.md", content: "" }]);
    expect(calls).toBeGreaterThanOrEqual(1);
    unsub();
  });

  it("does NOT notify after unsubscribe", () => {
    let calls = 0;
    const unsub = subscribe(() => {
      calls++;
    });
    unsub();
    rebuildFromFiles([{ path: "/v/A.md", content: "" }]);
    expect(calls).toBe(0);
  });

  it("setVaultRoot to the same root as the cache restores the index", () => {
    setVaultRoot("/v");
    rebuildFromFiles([
      { path: "/v/A.md", content: "[[B]]" },
      { path: "/v/B.md", content: "" },
    ]);
    // Simulate a relaunch: reset in-memory state, then re-init with same root.
    // The persisted cache should restore the index.
    const cached = localStorage.getItem("markup.linkIndex");
    expect(cached).toBeTruthy();

    // Force-reset just the in-memory state without clearing localStorage.
    setVaultRoot(null);
    expect(getBacklinksFor("/v/B.md")).toHaveLength(0);

    setVaultRoot("/v");
    expect(getBacklinksFor("/v/B.md")).toHaveLength(1);
  });

  it("setVaultRoot to a DIFFERENT root clears the index", () => {
    setVaultRoot("/v1");
    rebuildFromFiles([
      { path: "/v1/A.md", content: "[[B]]" },
      { path: "/v1/B.md", content: "" },
    ]);
    expect(getBacklinksFor("/v1/B.md")).toHaveLength(1);

    setVaultRoot("/v2");
    expect(getBacklinksFor("/v1/B.md")).toHaveLength(0);
  });
});
