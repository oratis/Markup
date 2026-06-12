/// <reference types="node" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    // Restore vi.spyOn/vi.fn spies to their originals before each test. vitest
    // 4 no longer resets a re-spied method's call history on its own, so without
    // this a spy set up in one test leaks its calls into the next.
    restoreMocks: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/main.tsx",
        "src/test/**",
        "src/**/*.test.{ts,tsx}",
        "src/**/*.spec.{ts,tsx}",
        "src/lib/locales/**",
      ],
      // Regression floor, set just under the measured baseline (2026-06:
      // 49.7 / 46.3 / 46.7 / 50.4). Raise as coverage grows; never lower
      // to make a PR pass.
      thresholds: {
        statements: 48,
        branches: 44,
        functions: 45,
        lines: 48,
      },
    },
  },
});
