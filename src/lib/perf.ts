/**
 * Lightweight perf logger. Marks/measures via the Performance API and
 * mirrors numbers to console + (optionally) a Tauri command that appends to
 * ~/Library/Logs/markup/perf.log. Cheap to keep on in dev.
 */
import { invoke } from "@tauri-apps/api/core";

let perfEnabled = true;

export function setPerfEnabled(b: boolean) {
  perfEnabled = b;
}

export async function timed<T>(label: string, fn: () => Promise<T> | T): Promise<T> {
  if (!perfEnabled) return await fn();
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const dur = performance.now() - start;
    log(label, dur);
  }
}

export function log(label: string, ms: number) {
  if (!perfEnabled) return;
  // eslint-disable-next-line no-console
  console.log(`[perf] ${label}: ${ms.toFixed(2)}ms`);
  invoke("log_perf", { label, ms }).catch(() => {
    /* command may not yet be registered; ignore */
  });
}

/** Sample N input events: time from beforeinput → next animation frame. */
export function startInputLatencyProbe(
  target: HTMLElement,
  samples = 60,
): Promise<{
  samples: number[];
  median: number;
  p95: number;
  max: number;
}> {
  return new Promise((resolve) => {
    const observed: number[] = [];
    const onInput = () => {
      const t0 = performance.now();
      requestAnimationFrame(() => {
        observed.push(performance.now() - t0);
        if (observed.length >= samples) {
          target.removeEventListener("beforeinput", onInput);
          const sorted = [...observed].sort((a, b) => a - b);
          const median = sorted[Math.floor(sorted.length / 2)];
          const p95 = sorted[Math.floor(sorted.length * 0.95)];
          const max = sorted[sorted.length - 1];
          log(`input-latency-median`, median);
          log(`input-latency-p95`, p95);
          log(`input-latency-max`, max);
          resolve({ samples: observed, median, p95, max });
        }
      });
    };
    target.addEventListener("beforeinput", onInput);
  });
}
