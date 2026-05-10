import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { type Command, CommandPalette } from "./CommandPalette";

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
});
