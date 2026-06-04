export default {
  plugins: {
    // Tailwind v4 ships its PostCSS plugin as a separate package and folds
    // vendor-prefixing in (via Lightning CSS), so the standalone `tailwindcss`
    // plugin and `autoprefixer` entries are gone.
    "@tailwindcss/postcss": {},
  },
};
