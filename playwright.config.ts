import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config. The app is a Tauri desktop app, but the React frontend runs
 * unchanged in a plain browser once the Tauri IPC is stubbed (see
 * e2e/tauri-mock.ts). We drive the Vite dev server — the same one
 * `pnpm tauri:dev` points the webview at — on its fixed port 1420.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:1420",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm vite --port 1420 --strictPort",
    url: "http://localhost:1420",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
