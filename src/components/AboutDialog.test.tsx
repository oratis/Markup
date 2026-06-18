import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as checkUpdate from "../lib/check-update";
import * as tauri from "../lib/tauri";
import { AboutDialog } from "./AboutDialog";

afterEach(() => {
  vi.restoreAllMocks();
});

const release = (version: string) => ({
  tagName: `v${version}`,
  version,
  htmlUrl: `https://github.com/oratis/Markup/releases/tag/v${version}`,
  publishedAt: "2026-01-01T00:00:00Z",
  name: null,
  body: null,
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

  it("Check for Updates reports when you're on the latest version", async () => {
    vi.spyOn(tauri, "getVersion").mockResolvedValue("1.0.0");
    vi.spyOn(checkUpdate, "checkUpdateAgainstGithub").mockResolvedValue({
      hasUpdate: false,
      current: "1.0.0",
      latest: release("1.0.0"),
      dismissed: false,
    });
    render(<AboutDialog onClose={() => {}} />);
    fireEvent.click(screen.getByText("Check for Updates"));
    await waitFor(() =>
      expect(screen.getByText("You're on the latest version")).toBeInTheDocument(),
    );
  });

  it("Check for Updates surfaces a newer release as a Get button", async () => {
    vi.spyOn(tauri, "getVersion").mockResolvedValue("1.0.0");
    vi.spyOn(checkUpdate, "checkUpdateAgainstGithub").mockResolvedValue({
      hasUpdate: true,
      current: "1.0.0",
      latest: release("1.1.0"),
      dismissed: false,
    });
    render(<AboutDialog onClose={() => {}} />);
    fireEvent.click(screen.getByText("Check for Updates"));
    await waitFor(() => expect(screen.getByText("Get v1.1.0")).toBeInTheDocument());
  });

  it("always offers a Changelog link", () => {
    vi.spyOn(tauri, "getVersion").mockResolvedValue("1.0.0");
    render(<AboutDialog onClose={() => {}} />);
    expect(screen.getByText("Changelog")).toBeInTheDocument();
  });
});
