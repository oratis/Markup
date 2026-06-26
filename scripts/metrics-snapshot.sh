#!/usr/bin/env bash
#
# metrics-snapshot.sh — privacy-preserving growth snapshot for Markup.
#
# Records the numbers that matter for the GTM scale plan (docs/GTM-SCALE-PLAN.md
# §8) using ONLY data GitHub already exposes — no telemetry, no SDK, no PII:
#
#   • stars / forks                         — the headline GitHub goal
#   • updater pings (latest.json downloads) — every running app polls the
#       updater endpoint releases/latest/download/latest.json, and GitHub
#       counts that asset download. Cumulative since the latest release; the
#       day-over-day DELTA is a lower-bound proxy for active installs that
#       checked for updates that day. NOT exact DAU (cumulative, deduped per
#       request not per device, CDN cache may undercount) — a TREND signal.
#   • dmg downloads                         — install/acquisition proxy
#
# Prints a human summary to stderr and ONE CSV row to stdout.
# Optional:  --append FILE   also append the row to FILE (writing the header
#                            first if FILE doesn't exist yet).
#
# Needs: gh (authenticated, or GH_TOKEN in CI) + jq.
# Usage:
#   bash scripts/metrics-snapshot.sh                          # print row
#   bash scripts/metrics-snapshot.sh --append docs/metrics/snapshots.csv
#   REPO=owner/name bash scripts/metrics-snapshot.sh          # override repo

set -euo pipefail

REPO="${REPO:-oratis/Markup}"
HEADER="date,stars,forks,updater_pings,dmg_downloads,all_asset_downloads,latest_tag"

append_file=""
if [[ "${1:-}" == "--append" ]]; then
  append_file="${2:?--append needs a FILE path}"
fi

command -v gh >/dev/null || { echo "error: gh not found" >&2; exit 1; }
command -v jq >/dev/null || { echo "error: jq not found" >&2; exit 1; }

now="$(date -u +%FT%TZ)"

# Repo headline numbers.
repo_json="$(gh api "repos/${REPO}")"
stars="$(jq -r '.stargazers_count' <<<"$repo_json")"
forks="$(jq -r '.forks_count' <<<"$repo_json")"

# Updater pings = latest.json downloads on the *latest* release (0 if absent).
latest_json="$(gh api "repos/${REPO}/releases/latest" 2>/dev/null || echo '{}')"
latest_tag="$(jq -r '.tag_name // "none"' <<<"$latest_json")"
updater_pings="$(jq -r '[.assets[]? | select(.name=="latest.json") | .download_count] | add // 0' <<<"$latest_json")"

# Download proxies across ALL releases.
all_assets="$(gh api --paginate "repos/${REPO}/releases" --jq '.[].assets[]? | {name, download_count}' 2>/dev/null | jq -s '.')"
dmg_downloads="$(jq -r '[.[] | select(.name | endswith(".dmg")) | .download_count] | add // 0' <<<"$all_assets")"
all_downloads="$(jq -r '[.[].download_count] | add // 0' <<<"$all_assets")"

row="${now},${stars},${forks},${updater_pings},${dmg_downloads},${all_downloads},${latest_tag}"

# Human-readable summary → stderr (so stdout stays a clean CSV row).
{
  echo "── Markup metrics · ${now} · ${REPO} ──────────────────────"
  printf "  stars            %s\n" "$stars"
  printf "  forks            %s\n" "$forks"
  printf "  updater pings    %s   (latest.json on %s — active-check proxy)\n" "$updater_pings" "$latest_tag"
  printf "  dmg downloads    %s   (all releases)\n" "$dmg_downloads"
  printf "  all asset dls    %s   (all releases)\n" "$all_downloads"
  echo "────────────────────────────────────────────────────────────"
} >&2

if [[ -n "$append_file" ]]; then
  if [[ ! -f "$append_file" ]]; then
    mkdir -p "$(dirname "$append_file")"
    echo "$HEADER" > "$append_file"
  fi
  echo "$row" >> "$append_file"
  echo "appended → ${append_file}" >&2
fi

echo "$row"
