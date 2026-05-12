import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { _resetLinkIndexStore, rebuildFromFiles } from "../lib/link-index-store";
import { useAppStore } from "../store";
import { BacklinksPanel } from "./BacklinksPanel";

function setActive(path: string | null) {
  useAppStore.setState({
    tabs: path
      ? [
          {
            id: path,
            path,
            name: path.split("/").pop() ?? path,
            content: "",
            mtimeMs: 1,
            status: "saved",
            errorMessage: null,
          },
        ]
      : [],
    activeTabId: path,
  });
}

beforeEach(() => {
  setActive(null);
});

afterEach(() => {
  _resetLinkIndexStore();
});

describe("BacklinksPanel", () => {
  it("renders the empty state when no backlinks", () => {
    setActive("/v/lonely.md");
    rebuildFromFiles([{ path: "/v/lonely.md", content: "" }]);
    render(<BacklinksPanel />);
    expect(screen.getByText(/No backlinks/i)).toBeInTheDocument();
  });

  it("renders the title header", () => {
    setActive("/v/x.md");
    render(<BacklinksPanel />);
    // Title uses exactly "Backlinks" with no other text; the empty-state
    // copy also contains the word, so match the exact title element.
    expect(screen.getByText("Backlinks")).toBeInTheDocument();
  });

  it("lists incoming references grouped by source file", () => {
    setActive("/v/Target.md");
    rebuildFromFiles([
      { path: "/v/A.md", content: "see [[Target]] here" },
      { path: "/v/B.md", content: "another [[Target]]" },
      { path: "/v/Target.md", content: "" },
    ]);
    render(<BacklinksPanel />);
    expect(screen.getByText("A.md")).toBeInTheDocument();
    expect(screen.getByText("B.md")).toBeInTheDocument();
    expect(screen.getByText(/see \[\[Target\]\] here/)).toBeInTheDocument();
    expect(screen.getByText(/another \[\[Target\]\]/)).toBeInTheDocument();
  });

  it("shows the line number prefix on each ref", () => {
    setActive("/v/Target.md");
    rebuildFromFiles([
      {
        path: "/v/A.md",
        content: "first line\nsecond line [[Target]]",
      },
      { path: "/v/Target.md", content: "" },
    ]);
    render(<BacklinksPanel />);
    expect(screen.getByText("L2")).toBeInTheDocument();
  });

  it("shows the count next to the title", () => {
    setActive("/v/Target.md");
    rebuildFromFiles([
      { path: "/v/A.md", content: "[[Target]] and [[Target]] again" },
      { path: "/v/Target.md", content: "" },
    ]);
    render(<BacklinksPanel />);
    // Count is rendered as its own element next to "Backlinks"
    expect(screen.getByText("2")).toBeInTheDocument();
  });
});
