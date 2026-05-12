import { afterEach, describe, expect, it } from "vitest";
import {
  _resetBookmarks,
  addBookmark,
  getBookmarks,
  isBookmarked,
  removeBookmark,
  subscribe,
  toggleBookmark,
} from "./bookmarks";

afterEach(() => _resetBookmarks());

describe("bookmarks", () => {
  it("starts empty", () => {
    expect(getBookmarks()).toEqual([]);
    expect(isBookmarked("/v/x.md")).toBe(false);
  });

  it("addBookmark adds a path and persists", () => {
    addBookmark("/v/a.md");
    expect(isBookmarked("/v/a.md")).toBe(true);
    expect(getBookmarks()).toContain("/v/a.md");
    const raw = localStorage.getItem("markup.bookmarks");
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw as string)).toContain("/v/a.md");
  });

  it("addBookmark is idempotent", () => {
    addBookmark("/v/a.md");
    addBookmark("/v/a.md");
    expect(getBookmarks().filter((p) => p === "/v/a.md").length).toBe(1);
  });

  it("removeBookmark removes the entry", () => {
    addBookmark("/v/a.md");
    removeBookmark("/v/a.md");
    expect(isBookmarked("/v/a.md")).toBe(false);
  });

  it("toggleBookmark switches state and returns the new value", () => {
    expect(toggleBookmark("/v/a.md")).toBe(true);
    expect(isBookmarked("/v/a.md")).toBe(true);
    expect(toggleBookmark("/v/a.md")).toBe(false);
    expect(isBookmarked("/v/a.md")).toBe(false);
  });

  it("preserves insertion order", () => {
    addBookmark("/v/c.md");
    addBookmark("/v/a.md");
    addBookmark("/v/b.md");
    expect(getBookmarks()).toEqual(["/v/c.md", "/v/a.md", "/v/b.md"]);
  });

  it("notifies subscribers on mutation", () => {
    let calls = 0;
    const unsub = subscribe(() => {
      calls++;
    });
    addBookmark("/v/a.md");
    addBookmark("/v/b.md");
    removeBookmark("/v/a.md");
    toggleBookmark("/v/c.md");
    expect(calls).toBe(4);
    unsub();
  });

  it("does NOT notify after unsubscribe", () => {
    let calls = 0;
    const unsub = subscribe(() => {
      calls++;
    });
    unsub();
    addBookmark("/v/a.md");
    expect(calls).toBe(0);
  });
});
