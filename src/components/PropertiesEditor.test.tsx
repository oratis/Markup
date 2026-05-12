import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "../store";
import { PropertiesEditor } from "./PropertiesEditor";

function setActive(content: string) {
  useAppStore.setState({
    tabs: [
      {
        id: "/v/a.md",
        path: "/v/a.md",
        name: "a.md",
        content,
        mtimeMs: 1,
        status: "saved",
        errorMessage: null,
      },
    ],
    activeTabId: "/v/a.md",
  });
}

function getContent(): string {
  const st = useAppStore.getState();
  const t = st.tabs.find((tx) => tx.id === st.activeTabId);
  return t?.content ?? "";
}

beforeEach(() => {
  useAppStore.setState({ tabs: [], activeTabId: null });
});

describe("PropertiesEditor", () => {
  it("renders nothing when the doc has no frontmatter", () => {
    setActive("just body");
    const { container } = render(<PropertiesEditor />);
    expect(container.firstChild).toBeNull();
  });

  it("renders a row per property", () => {
    setActive("---\ntitle: Hello\ndraft: true\ncount: 3\n---\n\nbody");
    render(<PropertiesEditor />);
    expect(screen.getByText("title")).toBeInTheDocument();
    expect(screen.getByText("draft")).toBeInTheDocument();
    expect(screen.getByText("count")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Hello")).toBeInTheDocument();
    // Number row uses input[type=number] holding 3
    expect(screen.getByDisplayValue("3")).toBeInTheDocument();
  });

  it("edits a text property and serialises back to content", () => {
    setActive("---\ntitle: Hello\n---\n\nbody");
    render(<PropertiesEditor />);
    const input = screen.getByDisplayValue("Hello") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "World" } });
    expect(getContent()).toContain("title: World");
  });

  it("toggles a boolean property", () => {
    setActive("---\ndraft: true\n---\n\nbody");
    render(<PropertiesEditor />);
    const cb = screen.getByRole("checkbox") as HTMLInputElement;
    expect(cb.checked).toBe(true);
    fireEvent.click(cb);
    expect(getContent()).toContain("draft: false");
  });

  it("edits a list as comma-separated", () => {
    setActive("---\ntags: [a, b]\n---\n\nbody");
    render(<PropertiesEditor />);
    const input = screen.getByDisplayValue("a, b") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "x, y, z" } });
    const out = getContent();
    expect(out).toContain("  - x");
    expect(out).toContain("  - y");
    expect(out).toContain("  - z");
  });

  it("removes a property when × is clicked", () => {
    setActive("---\ntitle: Hello\ndraft: true\n---\n\nbody");
    render(<PropertiesEditor />);
    const removeButtons = screen.getAllByLabelText(/Remove property/i);
    expect(removeButtons.length).toBe(2);
    fireEvent.click(removeButtons[0]); // remove "title"
    expect(getContent()).not.toContain("title:");
    expect(getContent()).toContain("draft: true");
  });

  it("adds a new property via the add-key input", () => {
    setActive("---\ntitle: Hello\n---\n\nbody");
    render(<PropertiesEditor />);
    const addInput = screen.getByPlaceholderText(/Add property/i) as HTMLInputElement;
    fireEvent.change(addInput, { target: { value: "author" } });
    fireEvent.submit(addInput);
    expect(getContent()).toMatch(/author:/);
  });
});
