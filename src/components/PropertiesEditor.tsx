import { useMemo, useState } from "react";
import {
  type FrontmatterScalar,
  type FrontmatterValue,
  parseFrontmatter,
  serializeFrontmatter,
} from "../lib/frontmatter";
import { useT } from "../lib/i18n";
import { getActiveTab, useAppStore } from "../store";

/** Discriminated row kind. Drives which input we render. */
type RowKind = "text" | "number" | "boolean" | "list" | "null";

function inferKind(value: FrontmatterValue): RowKind {
  if (value === null) return "null";
  if (Array.isArray(value)) return "list";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "text";
}

function joinList(value: FrontmatterScalar[]): string {
  return value.map((v) => (v === null ? "" : String(v))).join(", ");
}

function splitList(raw: string): FrontmatterScalar[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Frontmatter property table rendered above the editor body. Reads
 *  the active tab's content, presents typed rows per key, writes back
 *  through updateActiveContent on every edit (re-serialises FM + body).
 *  Hidden when the doc has no frontmatter (we don't auto-create one). */
export function PropertiesEditor() {
  const t = useT();
  const tab = useAppStore(getActiveTab);
  const updateActiveContent = useAppStore((s) => s.updateActiveContent);
  const [newKey, setNewKey] = useState("");

  const parsed = useMemo(() => {
    if (!tab) return null;
    return parseFrontmatter(tab.content);
  }, [tab?.content]);

  if (!tab || !parsed || !parsed.hadFrontmatter) return null;

  function patch(updater: (props: Record<string, FrontmatterValue>) => void) {
    if (!parsed || !tab) return;
    const next: Record<string, FrontmatterValue> = { ...parsed.properties };
    updater(next);
    updateActiveContent(serializeFrontmatter(next, parsed.body));
  }

  function setValue(key: string, value: FrontmatterValue) {
    patch((p) => {
      p[key] = value;
    });
  }

  function removeKey(key: string) {
    patch((p) => {
      delete p[key];
    });
  }

  function addKey() {
    const k = newKey.trim();
    if (!k) return;
    if (parsed && k in parsed.properties) return;
    patch((p) => {
      p[k] = "";
    });
    setNewKey("");
  }

  const entries = Object.entries(parsed.properties);

  return (
    <div className="border-b border-black/5 dark:border-white/10 bg-canvas-light dark:bg-canvas-dark">
      <div className="px-4 py-2 text-[11px] uppercase tracking-wide opacity-60">
        {t("properties.title")}
      </div>
      <table className="w-full text-[12px]">
        <tbody>
          {entries.map(([key, value]) => {
            const kind = inferKind(value);
            return (
              <tr key={key} className="border-t border-black/5 dark:border-white/10">
                <td className="px-4 py-1 opacity-70 align-top w-[160px]">{key}</td>
                <td className="px-4 py-1">
                  {kind === "text" && (
                    <input
                      type="text"
                      value={String(value)}
                      onChange={(e) => setValue(key, e.target.value)}
                      className="w-full px-1 py-0.5 bg-transparent outline-none border-b border-transparent focus:border-blue-500"
                    />
                  )}
                  {kind === "number" && (
                    <input
                      type="number"
                      value={value as number}
                      onChange={(e) => {
                        const n = Number.parseFloat(e.target.value);
                        setValue(key, Number.isFinite(n) ? n : 0);
                      }}
                      className="w-full px-1 py-0.5 bg-transparent outline-none border-b border-transparent focus:border-blue-500"
                    />
                  )}
                  {kind === "boolean" && (
                    <input
                      type="checkbox"
                      checked={value as boolean}
                      onChange={(e) => setValue(key, e.target.checked)}
                    />
                  )}
                  {kind === "list" && (
                    <input
                      type="text"
                      value={joinList(value as FrontmatterScalar[])}
                      onChange={(e) => setValue(key, splitList(e.target.value))}
                      placeholder="a, b, c"
                      className="w-full px-1 py-0.5 bg-transparent outline-none border-b border-transparent focus:border-blue-500"
                    />
                  )}
                  {kind === "null" && (
                    <input
                      type="text"
                      value=""
                      onChange={(e) => setValue(key, e.target.value)}
                      placeholder={t("properties.empty")}
                      className="w-full px-1 py-0.5 bg-transparent outline-none border-b border-transparent focus:border-blue-500"
                    />
                  )}
                </td>
                <td className="pr-4 py-1 w-8 text-right">
                  <button
                    type="button"
                    onClick={() => removeKey(key)}
                    title={t("properties.remove")}
                    aria-label={t("properties.remove")}
                    className="opacity-40 hover:opacity-100 text-[11px]"
                  >
                    ×
                  </button>
                </td>
              </tr>
            );
          })}
          <tr className="border-t border-black/5 dark:border-white/10">
            <td colSpan={3} className="px-4 py-1">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addKey();
                }}
              >
                <input
                  type="text"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder={t("properties.addKey")}
                  className="w-full px-1 py-0.5 bg-transparent outline-none text-[11px] opacity-70 focus:opacity-100"
                />
              </form>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
