import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const linkRoot = vi.fn();
const linkPaths = vi.fn();
const tagRoot = vi.fn();
const tagPaths = vi.fn();
const headingRoot = vi.fn();
const headingPaths = vi.fn();
const blockRoot = vi.fn();
const blockPaths = vi.fn();

vi.mock("../lib/link-index-store", () => ({
  setVaultRoot: (r: string | null) => linkRoot(r),
  setVaultPaths: (p: string[]) => linkPaths(p),
}));
vi.mock("../lib/tag-index-store", () => ({
  setVaultRoot: (r: string | null) => tagRoot(r),
  setVaultPaths: (p: string[]) => tagPaths(p),
}));
vi.mock("../lib/heading-index-store", () => ({
  setVaultRoot: (r: string | null) => headingRoot(r),
  setVaultPaths: (p: string[]) => headingPaths(p),
}));
vi.mock("../lib/block-index-store", () => ({
  setVaultRoot: (r: string | null) => blockRoot(r),
  setVaultPaths: (p: string[]) => blockPaths(p),
}));

import { useIndexStoreSync } from "./useIndexStoreSync";

beforeEach(() => {
  for (const f of [
    linkRoot,
    linkPaths,
    tagRoot,
    tagPaths,
    headingRoot,
    headingPaths,
    blockRoot,
    blockPaths,
  ]) {
    f.mockClear();
  }
});

describe("useIndexStoreSync", () => {
  it("propagates the vault root to all four index stores", () => {
    renderHook(() => useIndexStoreSync("/vault", []));
    for (const f of [linkRoot, tagRoot, headingRoot, blockRoot]) {
      expect(f).toHaveBeenCalledWith("/vault");
    }
  });

  it("propagates the file path list to all four index stores", () => {
    renderHook(() =>
      useIndexStoreSync("/vault", [{ path: "/vault/a.md" }, { path: "/vault/b.md" }]),
    );
    for (const f of [linkPaths, tagPaths, headingPaths, blockPaths]) {
      expect(f).toHaveBeenCalledWith(["/vault/a.md", "/vault/b.md"]);
    }
  });

  it("re-syncs paths only when the file list changes", () => {
    const files = [{ path: "/vault/a.md" }];
    const { rerender } = renderHook(({ root, vf }) => useIndexStoreSync(root, vf), {
      initialProps: { root: "/vault", vf: files },
    });
    expect(linkPaths).toHaveBeenCalledTimes(1);
    // Same array reference → no re-run.
    rerender({ root: "/vault", vf: files });
    expect(linkPaths).toHaveBeenCalledTimes(1);
    // New list → re-run.
    rerender({ root: "/vault", vf: [{ path: "/vault/c.md" }] });
    expect(linkPaths).toHaveBeenCalledTimes(2);
    expect(linkPaths).toHaveBeenLastCalledWith(["/vault/c.md"]);
  });
});
