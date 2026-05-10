import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "../store";
import { Toolbar } from "./Toolbar";

beforeEach(() => {
  useAppStore.setState({
    sourceMode: false,
    sidebarOpen: false,
  });
});

describe("Toolbar", () => {
  it("renders the active tab name", () => {
    useAppStore.setState({
      tabs: [
        {
          id: "/n.md",
          path: "/n.md",
          name: "n.md",
          content: "x",
          mtimeMs: 1,
          status: "saved",
          errorMessage: null,
        },
      ],
      activeTabId: "/n.md",
    });
    render(<Toolbar />);
    expect(screen.getByText("n.md")).toBeInTheDocument();
  });

  it("shows a leading dot when the active tab is dirty", () => {
    useAppStore.setState({
      tabs: [
        {
          id: "/d.md",
          path: "/d.md",
          name: "d.md",
          content: "x",
          mtimeMs: 1,
          status: "dirty",
          errorMessage: null,
        },
      ],
      activeTabId: "/d.md",
    });
    render(<Toolbar />);
    // The dirty indicator + filename render in a single span; just match
    // the substring via regex on the textContent.
    expect(screen.getByText(/●\s*d\.md/)).toBeInTheDocument();
  });

  it("clicking the source-mode toggle flips store.sourceMode", () => {
    render(<Toolbar />);
    fireEvent.click(screen.getByText(/wysiwyg/i));
    expect(useAppStore.getState().sourceMode).toBe(true);
  });

  it("clicking the sidebar toggle flips store.sidebarOpen", () => {
    render(<Toolbar />);
    const btn = screen.getByTitle(/show sidebar/i);
    fireEvent.click(btn);
    expect(useAppStore.getState().sidebarOpen).toBe(true);
  });
});
