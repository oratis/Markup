// Minimal ambient types for the Vite env vars we read. We deliberately
// don't `/// <reference types="vite/client" />` the whole client surface;
// just declaring the keys we use lets `import.meta.env.VITE_MARKUP_MAS`
// type-check AND be statically replaced by Vite (so the MAS build can
// tree-shake the update banner out entirely).
interface ImportMetaEnv {
  readonly VITE_MARKUP_MAS?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
