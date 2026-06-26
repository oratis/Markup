# Metrics — privacy-preserving growth instrumentation

> Seeds the measurement layer for [GTM-SCALE-PLAN.md](../GTM-SCALE-PLAN.md) §8.
> The goal: make "10K★ + 10K DAU" **falsifiable** without breaking Markup's
> "no account, no telemetry, no tracking" promise.

## The idea

We never add tracking to the app. We only read numbers **GitHub already
collects**, plus (later) Apple's own App Store analytics. Two sources:

| Signal | Where it comes from | What it proxies |
|---|---|---|
| **stars / forks** | repo API | the headline GitHub goal |
| **updater pings** | downloads of `latest.json` on the **latest** release | active installs that checked for updates |
| **dmg downloads** | `.dmg` asset download counts | acquisition / new installs |

**Why `latest.json` downloads ≈ active installs.** The app's updater polls
`releases/latest/download/latest.json` (see
`src-tauri/tauri.conf.json` → `plugins.updater.endpoints`). Every poll is a
GitHub asset download, and GitHub counts it. So the **day-over-day delta** of
that count is a lower-bound proxy for "running installs that checked in today."

**Honest caveats** (so we don't fool ourselves):
- It's **cumulative since the latest release** — use deltas, not the raw total.
- It counts **requests, not unique devices** (an install checking twice counts
  twice; CDN caching can *under*count). It's a **trend signal, not exact DAU**.
- A fresh release resets the baseline to ~0 — annotate release dates when reading.

This is intentionally a **lower bound**. If the lower bound crosses into the
thousands, real DAU is at least that. For true unique daily actives, see
"Upgrade path" below — but that needs a hosting decision.

## How to read it

The daily series lives on the **`metrics-data`** branch (kept off `main` so the
auto-commit never fights branch protection): `snapshots.csv`, one row/day.
This folder carries the **baseline seed** + this methodology.

```bash
# one-off snapshot to your terminal (needs an authenticated gh + jq)
pnpm metrics                 # → scripts/metrics-snapshot.sh

# append today's row to a local file
bash scripts/metrics-snapshot.sh --append docs/metrics/snapshots.csv
```

`date,stars,forks,updater_pings,dmg_downloads,all_asset_downloads,latest_tag`

To chart it, diff `updater_pings` between consecutive rows on the same
`latest_tag` → daily active-check volume.

## Automation

[`.github/workflows/metrics.yml`](../../.github/workflows/metrics.yml) runs the
script daily (and on demand) and appends to `snapshots.csv` on the
`metrics-data` branch. No secrets — it uses the built-in `GITHUB_TOKEN`.

## Upgrade path (when we want more than a lower bound) — needs a decision

1. **Apple analytics (free, no SDK, no tracking)** — App Store Connect already
   reports *active devices* / installs / impressions for the iOS + Mac App Store
   builds. Add those numbers to the weekly review once the apps are live. This is
   the cleanest source of real mobile DAU.
2. **True unique desktop DAU** — put a tiny Cloudflare Worker (or similar) in
   front of the updater feed: it serves `latest.json` and counts **unique daily
   hits** (hash of IP+UA, no storage of PII), then the app keeps polling as
   today. Gives real daily-unique numbers while staying telemetry-free in the
   app. ⚠️ Requires hosting + a privacy-policy note — **owner's call** before we
   build it.
3. **Web render endpoint** (GTM plan, unlock 3) — if `markup.app/gh/<repo>/...`
   ships, its server logs are another free, opt-out usage signal.

## Weekly review dashboard (what to actually look at)

stars (+star-history chart) · updater-ping daily delta · dmg downloads/week ·
(once live) App Store Connect active devices · referrer sources
(GitHub Insights → Traffic). Review once a week; re-baseline the DAU target
against real numbers after the first month of data.
