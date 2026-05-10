import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { defaults, labels } from "../lib/shortcuts";
import { ShortcutsCheatsheet } from "./ShortcutsCheatsheet";

describe("ShortcutsCheatsheet", () => {
  it("renders a row for every registered shortcut", () => {
    render(<ShortcutsCheatsheet onClose={() => {}} />);
    for (const id of Object.keys(defaults) as Array<keyof typeof defaults>) {
      expect(screen.getByText(labels[id])).toBeInTheDocument();
    }
  });

  it("clicking the backdrop closes the dialog", () => {
    const onClose = vi.fn();
    const { container } = render(<ShortcutsCheatsheet onClose={onClose} />);
    fireEvent.click(container.firstChild as HTMLElement);
    expect(onClose).toHaveBeenCalled();
  });
});
