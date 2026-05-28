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
// The project doesn't pull in `vite/client` ambient types, so access
// import.meta.env through a local cast. Vite still statically replaces
// this at build time.
const viteEnv = (import.meta as unknown as { env?: Record<string, string | undefined> })
  .env;
export const IS_MAS_BUILD = viteEnv?.VITE_MARKUP_MAS === "1";
