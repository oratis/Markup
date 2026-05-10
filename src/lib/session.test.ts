import { afterEach, describe, expect, it } from "vitest";
import { _resetSession, readSession, writeSession } from "./session";

afterEach(() => _resetSession());

describe("session persistence", () => {
  it("returns an empty session by default", () => {
    expect(readSession()).toEqual({ open: [], active: null });
  });

  it("round-trips an open list and active path", () => {
    writeSession({ open: ["/a.md", "/b.md", "/c.md"], active: "/b.md" });
    expect(readSession()).toEqual({
      open: ["/a.md", "/b.md", "/c.md"],
      active: "/b.md",
    });
  });

  it("clears active when null is written", () => {
    writeSession({ open: ["/a.md"], active: null });
    expect(readSession().active).toBeNull();
  });

  it("rejects malformed entries", () => {
    localStorage.setItem(
      "markup.session",
      JSON.stringify({ open: ["/a.md", 42, null], active: 99 }),
    );
    expect(readSession()).toEqual({ open: ["/a.md"], active: null });
  });

  it("returns empty session on parse error", () => {
    localStorage.setItem("markup.session", "not json");
    expect(readSession()).toEqual({ open: [], active: null });
  });
});
