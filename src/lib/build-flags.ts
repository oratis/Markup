/**
 * Build-time flavor flags.
 *
 * `VITE_MARKUP_MAS=1` is set by the Mac App Store build (scripts/build-mas.sh).
 * The MAS build must NOT ship the GitHub "new version" banner or the
 * self-updater — App Review rejects apps that download executables or
 * steer users to outside distribution (Guidelines 2.4.5 / 3.2.2). The
 * App Store handles updates instead.
 *
 * The direct-download DMG build leaves this unset, keeping the banner.
 */
// Written as a direct `import.meta.env.X` read (typed via src/vite-env.d.ts)
// so Vite statically replaces it at build time — letting the MAS build
// dead-code-eliminate the update banner.
export const IS_MAS_BUILD = import.meta.env.VITE_MARKUP_MAS === "1";
