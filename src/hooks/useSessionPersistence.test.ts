import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { _resetSession, readSession } from "../lib/session";
import { useSessionPersistence } from "./useSessionPersistence";

afterEach(() => {
  _resetSession();
  localStorage.clear();
});

describe("useSessionPersistence", () => {
  it("persists path-backed tabs and the active path", () => {
    renderHook(() =>
      useSessionPersistence(
        [{ path: "/v/a.md" }, { path: null }, { path: "/v/b.md" }],
        "/v/b.md",
      ),
    );
    const sess = readSession();
    expect(sess.open).toEqual(["/v/a.md", "/v/b.md"]);
    expect(sess.active).toBe("/v/b.md");
  });

  it("stores a null active path when none is provided", () => {
    renderHook(() => useSessionPersistence([{ path: "/v/a.md" }], undefined));
    expect(readSession().active).toBeNull();
  });

  it("rewrites the session when tabs change", () => {
    const { rerender } = renderHook(
      ({ tabs, active }) => useSessionPersistence(tabs, active),
      {
        initialProps: { tabs: [{ path: "/v/a.md" }], active: "/v/a.md" as string | null },
      },
    );
    expect(readSession().open).toEqual(["/v/a.md"]);
    rerender({ tabs: [{ path: "/v/a.md" }, { path: "/v/c.md" }], active: "/v/c.md" });
    expect(readSession().open).toEqual(["/v/a.md", "/v/c.md"]);
    expect(readSession().active).toBe("/v/c.md");
  });
});
