import { describe, expect, it } from "vitest";
import { breadcrumbDirs } from "./breadcrumb";

describe("breadcrumbDirs", () => {
  it("returns the cumulative folder segments for a nested file", () => {
    expect(breadcrumbDirs("/vault/docs/guides/setup.md", "/vault")).toEqual([
      { name: "docs", path: "docs" },
      { name: "guides", path: "docs/guides" },
    ]);
  });

  it("is empty for a file at the vault root", () => {
    expect(breadcrumbDirs("/vault/readme.md", "/vault")).toEqual([]);
  });

  it("is empty for a file outside the vault", () => {
    expect(breadcrumbDirs("/elsewhere/notes/a.md", "/vault")).toEqual([]);
  });

  it("tolerates a trailing slash on the vault root", () => {
    expect(breadcrumbDirs("/vault/docs/a.md", "/vault/")).toEqual([
      { name: "docs", path: "docs" },
    ]);
  });

  it("returns [] for missing inputs", () => {
    expect(breadcrumbDirs(null, "/vault")).toEqual([]);
    expect(breadcrumbDirs("/vault/a.md", null)).toEqual([]);
    expect(breadcrumbDirs(undefined, undefined)).toEqual([]);
  });
});
