/// <reference types="node" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [react()],

  // Tauri expects a fixed port; fail if it's not available
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? { protocol: "ws", host, port: 1421 }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },

  envPrefix: ["VITE_", "TAURI_ENV_*"],
  build: {
    // safari15 (not Tauri's legacy safari13 default): vite 8 / Rolldown can't
    // downlevel some destructuring in the outline web worker to safari13, and
    // the macOS system WebView this ships against is modern WebKit anyway.
    target: process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "safari15",
    minify: !process.env.TAURI_ENV_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        // Split heavy editor stacks into their own chunks so the React shell
        // can paint while these stream in parallel. Function form (vite 8 /
        // rollup typed `manualChunks` as a function); groups each stack with
        // its transitive deps (prosemirror under milkdown, lezer under cm).
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("@milkdown") || id.includes("prosemirror")) return "milkdown";
          if (id.includes("@codemirror") || id.includes("@lezer")) return "codemirror";
          if (id.includes("katex")) return "katex";
          if (id.includes("mermaid")) return "mermaid";
          return undefined;
        },
      },
    },
  },
});
