import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type Command, CommandPalette } from "./CommandPalette";

beforeEach(() => {
  // The palette persists MRU to localStorage; reset between tests so
  // ordering is deterministic.
  try {
    localStorage.removeItem("markup.cmdMRU");
  } catch {
    /* ignore */
  }
});

function makeCommands(): { commands: Command[]; runs: string[] } {
  const runs: string[] = [];
  const commands: Command[] = [
    {
      id: "save",
      label: "Save",
      run: () => {
        runs.push("save");
      },
    },
    {
      id: "open_recent",
      label: "Open Recent",
      run: () => {
        runs.push("open_recent");
      },
    },
    {
      id: "toggle_focus",
      label: "Toggle Focus Mode",
      run: () => {
        runs.push("toggle_focus");
      },
    },
  ];
  return { commands, runs };
}

describe("CommandPalette", () => {
  it("renders all commands when query is empty", () => {
    const { commands } = makeCommands();
    render(<CommandPalette commands={commands} onClose={() => {}} />);
    expect(screen.getByText("Save")).toBeInTheDocument();
    expect(screen.getByText("Open Recent")).toBeInTheDocument();
    expect(screen.getByText("Toggle Focus Mode")).toBeInTheDocument();
  });

  it("filters by case-insensitive substring", () => {
    const { commands } = makeCommands();
    render(<CommandPalette commands={commands} onClose={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText(/Run a command/i), {
      target: { value: "FOCUS" },
    });
    expect(screen.queryByText("Save")).toBeNull();
    expect(screen.getByText("Toggle Focus Mode")).toBeInTheDocument();
  });

  it("Enter runs the selected command and closes", () => {
    const { commands, runs } = makeCommands();
    const onClose = vi.fn();
    render(<CommandPalette commands={commands} onClose={onClose} />);
    const input = screen.getByPlaceholderText(/Run a command/i);
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onClose).toHaveBeenCalledOnce();
    return new Promise<void>((resolve) => {
      // Run is dispatched via setTimeout; wait one tick.
      setTimeout(() => {
        expect(runs).toEqual(["open_recent"]);
        resolve();
      }, 0);
    });
  });

  it('shows "No commands." when nothing matches', () => {
    const { commands } = makeCommands();
    render(<CommandPalette commands={commands} onClose={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText(/Run a command/i), {
      target: { value: "zzzzzzz" },
    });
    expect(screen.getByText(/No commands/i)).toBeInTheDocument();
  });

  it("Escape calls onClose", () => {
    const { commands } = makeCommands();
    const onClose = vi.fn();
    render(<CommandPalette commands={commands} onClose={onClose} />);
    fireEvent.keyDown(screen.getByPlaceholderText(/Run a command/i), {
      key: "Escape",
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("recently-used commands surface at the top of the empty-query list", () => {
    const { commands } = makeCommands();
    // Seed MRU with two recent commands; freshest first.
    localStorage.setItem("markup.cmdMRU", JSON.stringify(["toggle_focus", "save"]));
    const { container } = render(
      <CommandPalette commands={commands} onClose={() => {}} />,
    );
    const labels = Array.from(container.querySelectorAll("button")).map((b) =>
      b.textContent?.trim(),
    );
    expect(labels.slice(0, 3)).toEqual(["Toggle Focus Mode", "Save", "Open Recent"]);
  });
});
