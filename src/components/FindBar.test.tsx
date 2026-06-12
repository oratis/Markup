import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "../store";
import { FindBar } from "./FindBar";

function setActive(content: string) {
  useAppStore.setState({
    sourceMode: false,
    tabs: [
      {
        id: "/x.md",
        path: "/x.md",
        name: "x.md",
        content,
        mtimeMs: 1,
        status: "saved",
        errorMessage: null,
      },
    ],
    activeTabId: "/x.md",
  });
}

beforeEach(() => {
  setActive("");
});

describe("FindBar source-mode hint", () => {
  it("shows the CodeMirror hint instead of the find UI in source mode", () => {
    render(<FindBar sourceMode onClose={() => {}} />);
    expect(screen.getByText(/CodeMirror/)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Find…")).toBeNull();
  });

  it("the hint's close button calls onClose", () => {
    const onClose = vi.fn();
    render(<FindBar sourceMode onClose={onClose} />);
    fireEvent.click(screen.getByText("×"));
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe("FindBar matching and navigation", () => {
  it("shows the literal match count for the active tab", () => {
    setActive("foo bar foo baz foo");
    render(<FindBar sourceMode={false} onClose={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText("Find…"), {
      target: { value: "foo" },
    });
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("Enter steps through literal matches via window.find", () => {
    setActive("alpha beta alpha");
    const find = vi.fn(() => true);
    (window as unknown as { find: typeof find }).find = find;
    render(<FindBar sourceMode={false} onClose={() => {}} />);
    const input = screen.getByPlaceholderText("Find…");
    fireEvent.change(input, { target: { value: "alpha" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(find).toHaveBeenCalledWith("alpha", false, false, true);
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
    expect(find).toHaveBeenLastCalledWith("alpha", false, true, true);
  });

  it("disables step-through (↑/↓) in regex mode but keeps the count badge", () => {
    setActive("a1 b2 c3");
    render(<FindBar sourceMode={false} onClose={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText("Find…"), {
      target: { value: "[0-9]" },
    });
    fireEvent.click(screen.getByLabelText("Use regex"));
    expect(screen.getByLabelText("Previous")).toBeDisabled();
    expect(screen.getByLabelText("Next")).toBeDisabled();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("Escape in the find input calls onClose", () => {
    const onClose = vi.fn();
    render(<FindBar sourceMode={false} onClose={onClose} />);
    fireEvent.keyDown(screen.getByPlaceholderText("Find…"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe("FindBar replace", () => {
  it("Replace replaces the first literal match in the active tab", () => {
    setActive("one two one");
    render(<FindBar sourceMode={false} onClose={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText("Find…"), {
      target: { value: "one" },
    });
    fireEvent.change(screen.getByPlaceholderText("Replace…"), {
      target: { value: "1" },
    });
    fireEvent.click(screen.getByText("Replace"));
    expect(useAppStore.getState().tabs[0].content).toBe("1 two one");
  });

  it("Replace All in regex mode rewrites every match", () => {
    setActive("a1 b2 c3");
    render(<FindBar sourceMode={false} onClose={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText("Find…"), {
      target: { value: "[0-9]" },
    });
    fireEvent.click(screen.getByLabelText("Use regex"));
    fireEvent.change(screen.getByPlaceholderText("Replace…"), {
      target: { value: "#" },
    });
    fireEvent.click(screen.getByText("Replace All"));
    expect(useAppStore.getState().tabs[0].content).toBe("a# b# c#");
  });

  it("an invalid regex marks the query as missing instead of throwing", () => {
    setActive("anything");
    render(<FindBar sourceMode={false} onClose={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText("Find…"), {
      target: { value: "[" },
    });
    fireEvent.click(screen.getByLabelText("Use regex"));
    fireEvent.click(screen.getByText("Replace All"));
    expect(useAppStore.getState().tabs[0].content).toBe("anything");
  });
});
