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
    target: process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "safari13",
    minify: !process.env.TAURI_ENV_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split heavy editor stacks into their own chunks so the React
          // shell can paint while these stream in parallel.
          milkdown: [
            "@milkdown/core",
            "@milkdown/ctx",
            "@milkdown/kit",
            "@milkdown/preset-commonmark",
            "@milkdown/preset-gfm",
            "@milkdown/prose",
            "@milkdown/react",
            "@milkdown/theme-nord",
            "@milkdown/transformer",
            "@milkdown/utils",
            "@milkdown/plugin-clipboard",
            "@milkdown/plugin-cursor",
            "@milkdown/plugin-history",
            "@milkdown/plugin-indent",
            "@milkdown/plugin-listener",
          ],
          codemirror: [
            "@codemirror/commands",
            "@codemirror/lang-markdown",
            "@codemirror/language",
            "@codemirror/search",
            "@codemirror/state",
            "@codemirror/theme-one-dark",
            "@codemirror/view",
          ],
          katex: ["katex"],
          mermaid: ["mermaid"],
        },
      },
    },
  },
});
