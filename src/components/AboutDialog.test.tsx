import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as tauri from "../lib/tauri";
import { AboutDialog } from "./AboutDialog";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AboutDialog", () => {
  it("shows the bundle id and renders the version once getVersion resolves", async () => {
    vi.spyOn(tauri, "getVersion").mockResolvedValue("0.9.9");
    render(<AboutDialog onClose={() => {}} />);

    expect(screen.getByText("Markup")).toBeInTheDocument();
    expect(screen.getByText("com.appkon.markup")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("0.9.9")).toBeInTheDocument();
    });
  });

  it('falls back to "dev" when getVersion rejects', async () => {
    vi.spyOn(tauri, "getVersion").mockRejectedValue(new Error("nope"));
    render(<AboutDialog onClose={() => {}} />);
    await waitFor(() => {
      expect(screen.getByText("dev")).toBeInTheDocument();
    });
  });

  it("clicking Close calls onClose", async () => {
    vi.spyOn(tauri, "getVersion").mockResolvedValue("0.0.0");
    const onClose = vi.fn();
    render(<AboutDialog onClose={onClose} />);
    fireEvent.click(screen.getByText(/^close$/i));
    expect(onClose).toHaveBeenCalled();
  });
});
