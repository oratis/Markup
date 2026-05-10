import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type VaultFile, useAppStore } from "../store";
import { WikilinkPicker } from "./WikilinkPicker";

const files: VaultFile[] = [
  { path: "/v/foo.md", relPath: "foo.md", name: "foo.md", mtimeMs: 0, size: 0 },
  {
    path: "/v/notes/bar.md",
    relPath: "notes/bar.md",
    name: "bar.md",
    mtimeMs: 0,
    size: 0,
  },
];

beforeEach(() => {
  useAppStore.setState({ vaultRoot: "/v", vaultFiles: files });
});

describe("WikilinkPicker", () => {
  it("renders [[basename]] suggestions for vault files", () => {
    render(<WikilinkPicker onClose={() => {}} onInsert={() => {}} />);
    expect(screen.getByText("[[foo]]")).toBeInTheDocument();
    expect(screen.getByText("[[bar]]")).toBeInTheDocument();
  });

  it('default mode inserts "[[name]]"', () => {
    const inserts: string[] = [];
    render(
      <WikilinkPicker
        onClose={() => {}}
        onInsert={(s) => {
          inserts.push(s);
        }}
      />,
    );
    fireEvent.click(screen.getByText("[[foo]]"));
    expect(inserts).toEqual(["[[foo]]"]);
  });

  it('completion mode inserts "name]]" only', () => {
    const inserts: string[] = [];
    render(
      <WikilinkPicker
        mode="completion"
        onClose={() => {}}
        onInsert={(s) => {
          inserts.push(s);
        }}
      />,
    );
    fireEvent.click(screen.getByText("[[foo]]"));
    expect(inserts).toEqual(["foo]]"]);
  });

  it("Enter inserts the highlighted match and calls onClose", () => {
    const inserts: string[] = [];
    const onClose = vi.fn();
    render(
      <WikilinkPicker
        onClose={onClose}
        onInsert={(s) => {
          inserts.push(s);
        }}
      />,
    );
    const input = screen.getByPlaceholderText(/insert wikilink/i);
    fireEvent.change(input, { target: { value: "bar" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(inserts).toEqual(["[[bar]]"]);
    expect(onClose).toHaveBeenCalled();
  });

  it("Escape closes without inserting", () => {
    const inserts: string[] = [];
    const onClose = vi.fn();
    render(
      <WikilinkPicker
        onClose={onClose}
        onInsert={(s) => {
          inserts.push(s);
        }}
      />,
    );
    fireEvent.keyDown(screen.getByPlaceholderText(/insert wikilink/i), {
      key: "Escape",
    });
    expect(inserts).toEqual([]);
    expect(onClose).toHaveBeenCalled();
  });
});
