import { openUrl } from "@tauri-apps/plugin-opener";
import { useEffect, useState } from "react";
import {
  type LatestRelease,
  checkUpdateAgainstGithub,
  dismissUpdate,
} from "../lib/check-update";

/**
 * Passive bottom-left pill that surfaces a new GitHub release.
 *
 * Behaviour
 *  - Single check on mount (~1 HTTP request to api.github.com). If
 *    nothing newer, banner stays hidden — no UI at all.
 *  - Re-check every 6h while the app is open.
 *  - "Dismiss" remembers the version in localStorage so we don't
 *    nag again for that release.
 *  - Click the body → opens the release page in the system browser
 *    via plugin-opener (user downloads the .dmg manually).
 *
 * Why not Tauri auto-updater? It requires a code-signed app + an
 * Ed25519 keypair we don't yet provision in CI. Manual download via
 * the release page is good enough for v0.3 and one-click.
 */
export function UpdateBanner() {
  const [latest, setLatest] = useState<LatestRelease | null>(null);
  const [current, setCurrent] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const r = await checkUpdateAgainstGithub();
      if (cancelled) return;
      setCurrent(r.current);
      if (r.hasUpdate && !r.dismissed) setLatest(r.latest);
      else setLatest(null);
    };
    void run();
    const id = window.setInterval(run, 6 * 60 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (!latest) return null;

  const onOpen = async () => {
    try {
      await openUrl(latest.htmlUrl);
    } catch (e) {
      console.warn("update banner: failed to open release page", e);
    }
  };

  const onDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    dismissUpdate(latest.version);
    setLatest(null);
  };

  return (
    <button
      type="button"
      onClick={onOpen}
      className="mk-update-banner"
      title={`${latest.name ?? latest.tagName} · published ${latest.publishedAt.slice(0, 10)}`}
      aria-label={`New version ${latest.tagName} available — click to open release page`}
    >
      <span className="mk-update-dot" aria-hidden />
      <span className="mk-update-text">
        <span className="mk-update-title">New version {latest.tagName}</span>
        <span className="mk-update-sub">
          {current} → {latest.version} · click to download
        </span>
      </span>
      <span
        className="mk-update-close"
        role="button"
        aria-label="Dismiss this update notification"
        onClick={onDismiss}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onDismiss(e as unknown as React.MouseEvent);
          }
        }}
      >
        ×
      </span>
    </button>
  );
}
