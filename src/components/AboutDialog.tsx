import { useEffect, useState } from "react";
import { useT } from "../lib/i18n";
import { getVersion } from "../lib/tauri";

interface Props {
  onClose: () => void;
}

const REPO_URL = "https://github.com/oratis/Markup";
const BUNDLE_ID = "com.appkon.markup";

export function AboutDialog({ onClose }: Props) {
  const t = useT();
  const [version, setVersion] = useState<string>("…");

  useEffect(() => {
    getVersion()
      .then((v) => setVersion(v))
      .catch(() => setVersion("dev"));
  }, []);

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
          <div className="mt-5 text-[11px]">
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="underline opacity-80 hover:opacity-100"
            >
              {REPO_URL}
            </a>
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
