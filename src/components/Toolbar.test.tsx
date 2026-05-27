import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "../store";
import { Toolbar } from "./Toolbar";

beforeEach(() => {
  useAppStore.setState({
    sourceMode: false,
    readMode: true,
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

  it("shows a dirty indicator when the active tab is dirty", () => {
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
    const { container } = render(<Toolbar />);
    expect(screen.getByText("d.md")).toBeInTheDocument();
    // The dirty dot is rendered as a span inside .mk-file-name.
    expect(container.querySelector(".mk-dirty")).not.toBeNull();
  });

  it("clicking the mode pill from Read enters Edit mode", () => {
    const { container } = render(<Toolbar />);
    // The pill carries .mk-mode-pill; the hint span also contains
    // "Read", so we target by class to avoid an ambiguous match.
    const pill = container.querySelector(".mk-mode-pill");
    expect(pill).not.toBeNull();
    fireEvent.click(pill!);
    expect(useAppStore.getState().readMode).toBe(false);
    expect(useAppStore.getState().sourceMode).toBe(false);
  });

  it("clicking the mode pill from Edit flips into Source", () => {
    useAppStore.setState({ readMode: false, sourceMode: false });
    const { container } = render(<Toolbar />);
    fireEvent.click(container.querySelector(".mk-mode-pill")!);
    expect(useAppStore.getState().sourceMode).toBe(true);
  });

  it("hides the format cluster in Read mode", () => {
    render(<Toolbar />);
    expect(screen.queryByLabelText(/bold/i)).toBeNull();
    expect(screen.queryByLabelText(/italic/i)).toBeNull();
  });

  it("renders the inline formatting cluster (B / I / Code / Link / HR) in Edit mode", () => {
    useAppStore.setState({ readMode: false, sourceMode: false });
    render(<Toolbar />);
    expect(screen.getByLabelText(/bold/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/italic/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/inline code/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/insert link/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/horizontal rule/i)).toBeInTheDocument();
  });

  it("link button calls the supplied onInsertLink prop", () => {
    useAppStore.setState({ readMode: false, sourceMode: false });
    const onInsertLink = vi.fn();
    render(<Toolbar onInsertLink={onInsertLink} />);
    fireEvent.click(screen.getByLabelText(/insert link/i));
    expect(onInsertLink).toHaveBeenCalledTimes(1);
  });
});
