import { openUrl } from "@tauri-apps/plugin-opener";
import { useEffect, useState } from "react";
import { type LatestRelease, checkUpdateAgainstGithub } from "../lib/check-update";
import { useT } from "../lib/i18n";
import { getVersion } from "../lib/tauri";

interface Props {
  onClose: () => void;
}

const REPO_URL = "https://github.com/oratis/Markup";
const RELEASES_URL = `${REPO_URL}/releases`;
const BUNDLE_ID = "com.appkon.markup";

type UpdateState =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "upToDate" }
  | { kind: "available"; latest: LatestRelease }
  | { kind: "error" };

export function AboutDialog({ onClose }: Props) {
  const t = useT();
  const [version, setVersion] = useState<string>("…");
  const [update, setUpdate] = useState<UpdateState>({ kind: "idle" });

  useEffect(() => {
    getVersion()
      .then((v) => setVersion(v))
      .catch(() => setVersion("dev"));
  }, []);

  const openExternal = (url: string) => {
    openUrl(url).catch((e) => console.warn("about: failed to open url", e));
  };

  const checkUpdates = async () => {
    setUpdate({ kind: "checking" });
    const r = await checkUpdateAgainstGithub();
    if (!r.latest) setUpdate({ kind: "error" });
    else if (r.hasUpdate) setUpdate({ kind: "available", latest: r.latest });
    else setUpdate({ kind: "upToDate" });
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[360px] rounded-lg shadow-2xl bg-canvas-light dark:bg-canvas-dark border border-black/10 dark:border-white/15 p-6"
      >
        <div className="text-center">
          <div className="text-2xl font-semibold">Markup</div>
          <div className="text-xs opacity-60 mt-1">{t("about.tagline")}</div>
          <div className="mt-5 text-[11px] opacity-70 space-y-1">
            <div>
              {t("about.version")} <span className="font-mono">{version}</span>
            </div>
            <div className="font-mono">{BUNDLE_ID}</div>
          </div>

          {/* Update check + changelog */}
          <div className="mt-5 flex flex-col items-center gap-2 text-[12px]">
            {update.kind === "available" ? (
              <button
                onClick={() => openExternal(update.latest.htmlUrl)}
                className="px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-600"
              >
                {t("about.updateAvailable", update.latest.tagName)}
              </button>
            ) : (
              <button
                onClick={checkUpdates}
                disabled={update.kind === "checking"}
                className="px-3 py-1 rounded border border-black/10 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50"
              >
                {update.kind === "checking"
                  ? t("about.checking")
                  : t("about.checkUpdates")}
              </button>
            )}
            {update.kind === "upToDate" && (
              <div className="opacity-60">{t("about.upToDate")}</div>
            )}
            {update.kind === "error" && (
              <div className="opacity-60">{t("about.checkFailed")}</div>
            )}
            <button
              onClick={() => openExternal(RELEASES_URL)}
              className="underline opacity-70 hover:opacity-100"
            >
              {t("about.changelog")}
            </button>
          </div>

          <div className="mt-5 text-[11px]">
            <button
              onClick={() => openExternal(REPO_URL)}
              className="underline opacity-80 hover:opacity-100"
            >
              {REPO_URL}
            </button>
          </div>
          <button
            onClick={onClose}
            className="mt-6 px-4 py-1 text-[12px] rounded border border-black/10 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/10"
          >
            {t("about.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
