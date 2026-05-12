import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { _resetTagIndexStore, rebuildFromFiles } from "../lib/tag-index-store";
import { TagsPane } from "./TagsPane";

afterEach(() => _resetTagIndexStore());

describe("TagsPane", () => {
  it("renders the empty state when no tags", () => {
    render(<TagsPane />);
    expect(screen.getByText(/No tags/i)).toBeInTheDocument();
  });

  it("lists each indexed tag with file count", () => {
    rebuildFromFiles([
      { path: "/v/A.md", content: "#alpha #beta" },
      { path: "/v/B.md", content: "#alpha" },
    ]);
    render(<TagsPane />);
    expect(screen.getByText("#alpha")).toBeInTheDocument();
    expect(screen.getByText("#beta")).toBeInTheDocument();
    // Counts: 2 files carry #alpha (and 2 total tags in the header), 1 has #beta.
    expect(screen.getAllByText("2")).toHaveLength(2);
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("filters by substring (case-insensitive)", () => {
    rebuildFromFiles([{ path: "/v/A.md", content: "#alpha #beta #gamma" }]);
    render(<TagsPane />);
    const input = screen.getByPlaceholderText(/Filter tags/i);
    fireEvent.change(input, { target: { value: "BET" } });
    expect(screen.getByText("#beta")).toBeInTheDocument();
    expect(screen.queryByText("#alpha")).not.toBeInTheDocument();
    expect(screen.queryByText("#gamma")).not.toBeInTheDocument();
  });

  it("dispatches markup:open-search with the tag query on click", () => {
    rebuildFromFiles([{ path: "/v/A.md", content: "#review" }]);
    const handler = vi.fn();
    window.addEventListener("markup:open-search", handler);
    render(<TagsPane />);
    fireEvent.click(screen.getByText("#review"));
    expect(handler).toHaveBeenCalled();
    const event = handler.mock.calls[0][0] as CustomEvent;
    expect(event.detail).toEqual({ query: "#review" });
    window.removeEventListener("markup:open-search", handler);
  });

  it("shows total tag count in the header", () => {
    rebuildFromFiles([{ path: "/v/A.md", content: "#a #b #c" }]);
    render(<TagsPane />);
    // The header right-side text shows total tag count (3).
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});
