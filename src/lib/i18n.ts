import { useSyncExternalStore } from "react";
import { type Strings, en } from "./locales/en";
import { zh } from "./locales/zh";

export type Locale = "en" | "zh" | "auto";
export type Effective = "en" | "zh";

const dicts: Record<Effective, Strings> = { en, zh };

const STORAGE_KEY = "markup.locale";
let current: Locale = readStored();

const listeners = new Set<() => void>();

function readStored(): Locale {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "en" || v === "zh" || v === "auto") return v;
  } catch {
    /*ignore*/
  }
  return "auto";
}

function persist(v: Locale) {
  try {
    localStorage.setItem(STORAGE_KEY, v);
  } catch {
    /*ignore*/
  }
}

function detectSystem(): Effective {
  const lang = (typeof navigator !== "undefined" && navigator.language) || "en";
  return /^zh\b/i.test(lang) ? "zh" : "en";
}

export function effective(locale: Locale = current): Effective {
  return locale === "auto" ? detectSystem() : locale;
}

export function setLocale(v: Locale) {
  if (v === current) return;
  current = v;
  persist(v);
  for (const l of listeners) l();
}

export function getLocale(): Locale {
  return current;
}

export function t(key: keyof Strings, ...args: (string | number)[]): string {
  const dict = dicts[effective()];
  let s = dict[key] ?? en[key] ?? key;
  for (let i = 0; i < args.length; i++) {
    s = s.replace(`{${i}}`, String(args[i]));
  }
  return s;
}

/** React hook — re-renders when locale changes. */
export function useT(): typeof t {
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
    () => current,
  );
  return t;
}

export function useLocale(): [Locale, (v: Locale) => void] {
  return [
    useSyncExternalStore(
      (cb) => {
        listeners.add(cb);
        return () => listeners.delete(cb);
      },
      () => current,
      () => current,
    ),
    setLocale,
  ];
}
