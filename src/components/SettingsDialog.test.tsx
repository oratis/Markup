import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS, useAppStore } from "../store";
import { SettingsDialog } from "./SettingsDialog";

beforeEach(() => {
  useAppStore.setState({ ...DEFAULT_SETTINGS });
});

describe("SettingsDialog", () => {
  it("renders all four settings rows", () => {
    render(<SettingsDialog onClose={() => {}} />);
    expect(screen.getByText(/font size/i)).toBeInTheDocument();
    expect(screen.getByText(/prose width/i)).toBeInTheDocument();
    expect(screen.getByText(/autosave delay/i)).toBeInTheDocument();
    expect(screen.getByText(/image paste folder/i)).toBeInTheDocument();
  });

  it("changing image paste folder updates the store", () => {
    render(<SettingsDialog onClose={() => {}} />);
    const input = screen.getByPlaceholderText("assets") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "screenshots" } });
    expect(useAppStore.getState().imagePasteDir).toBe("screenshots");
  });

  it("Restore defaults resets settings", () => {
    useAppStore.getState().setSettings({ fontSize: 22, proseMaxWidth: 900 });
    render(<SettingsDialog onClose={() => {}} />);
    fireEvent.click(screen.getByText(/restore defaults/i));
    expect(useAppStore.getState().fontSize).toBe(16);
    expect(useAppStore.getState().proseMaxWidth).toBe(720);
  });

  it("Done button calls onClose", () => {
    const onClose = vi.fn();
    render(<SettingsDialog onClose={onClose} />);
    fireEvent.click(screen.getByText(/^done$/i));
    expect(onClose).toHaveBeenCalled();
  });
});
