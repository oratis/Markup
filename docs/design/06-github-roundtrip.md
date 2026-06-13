# Desktop — GitHub round-trip (read a repo as a vault, propose changes as a PR)

> Status: **B301–B307 shipped** (2026-06, PRs #136–#142) — open a repo as a
> vault, pull latest, detect local edits, propose a PR. B-layer track 1 from
> [PRODUCT-DIRECTION.md](../PRODUCT-DIRECTION.md) — "桌面端 GitHub 双向化".
> Companion to the shipped iOS design
> ([ios/03-github-primary-vault.md](ios/03-github-primary-vault.md)).
>
> **Deferred** (not in B301–B307): fork-based PRs for repos without push
> access (B306 errors clearly instead); the site-style reading track (global
> TOC / breadcrumbs / cross-doc `#fragment` anchors, §B31x). **Needs manual
> verification** against a real pushable repo before the write path is trusted
> — the live commit/PR orchestration can't run in CI.

## 0. The ask, restated

Today the desktop can sign in (device flow), browse repos, and fetch a single
file into a scratch tab — read-only, one file at a time. The differentiation
bet is **"the native reader for GitHub-hosted Markdown"**, and on desktop that
must mean:

1. **Open a whole repo as a vault** — file tree, full-text search, wikilinks,
   backlinks, outline: the entire existing vault experience, pointed at a repo.
2. **Edit the local copy and send the change back** — as a branch + pull
   request (fork when you can't push). Not a git client; a "fix this doc"
   button.

## 1. Design principle — materialize, then it's local (same as iOS)

iOS proved the shape: download the repo to disk first, then run the existing
local pipeline unchanged. No "remote vault" mode, no second rendering path.
Desktop inherits this wholesale:

- Zipball download → extract → the existing `open_vault` indexes it (Tantivy,
  watcher, progress events from #127 — all free).
- A `.markup/manifest.json` inside the working copy pins the commit SHA and
  maps `path → blob SHA, size` (the refresh + edit-tracking base).
- Reading a GitHub vault is indistinguishable from reading a local folder —
  relative images, links, search all behave identically.

What desktop does NOT copy from iOS: the read-only rule. Desktop's working
copy is **editable from day one** — edits are exactly how a PR gets authored.

## 2. What already exists (build on, don't rebuild)

| Piece | Where | State |
|---|---|---|
| Device-flow OAuth, `scope=repo` (read + write) | `src-tauri/src/github.rs` | shipped (#95/#97) |
| Token in macOS Keychain | `token_store.rs` + `github-auth.ts` | shipped (#129) |
| Repo browse / URL parse / file fetch UI | `GitHubOpenDialog.tsx`, `github-link.ts` | shipped |
| Vault pipeline: scan, index, watch, progress | `vault.rs`, `index.rs`, `watcher.rs` | shipped (#127) |
| Write-path authorization guard | `authorized.rs` (`WriteScope`) | shipped (#126) |
| HTTP client (rustls) | `reqwest` in Cargo.toml | shipped |
| iOS reference implementation | `ios/MarkupKit` (manifest diff, zipball, asset plan) | shipped 0.2.x |

## 3. Architecture decisions

- **D1 — Repo-as-vault via materialization.** `github_open_repo_vault(owner,
  repo, ref)` downloads the zipball to
  `~/Library/Caches/markup/github/<owner>/<ref>/<repo>/`, extracts atomically
  (temp dir + rename), writes `.markup/manifest.json`, then the frontend calls
  the existing `open_vault` on that directory. Vault UI needs zero changes.
- **D2 — Write-back is the GitHub contents API, not git.** Single-file commits
  via `PUT /repos/{o}/{r}/contents/{path}` on a working branch created from
  the manifest's pinned SHA. No bundled git binary, no libgit2; the 90% case
  for docs is a one-to-few-file change.
- **D3 — Fork fallback.** If the user lacks push permission (probe via
  `GET /repos/{o}/{r}` `permissions.push`), `POST /repos/{o}/{r}/forks`, push
  the branch there, open a cross-repo PR. Same UI either way.
- **D4 — Edits tracked against the manifest.** A file is "changed" when its
  current content hash ≠ the manifest blob SHA (git blob SHA-1 over
  `blob <len>\0<content>`, already implemented on iOS — port the few lines to
  Rust). The dirty set drives the "Propose changes…" dialog.
- **D5 — Refresh = manifest diff.** "Pull latest" refetches the tree, diffs
  SHAs, downloads only changed/added files, deletes removed ones, re-indexes.
  Local edits win: a file that is both locally dirty and remotely changed is
  left alone and flagged (no merge engine — surface "rebase by re-opening").
- **D6 — Scope note.** Device flow already requests `repo` (covers private
  read + write). Post-1.0, offer a "read-only sign-in" (`public_repo`) toggle
  for users who never want write; not a blocker.

## 4. Batches (PR-sized, each lands green on its own)

- **B301 — `github_vault.rs`: zipball → working copy.** Rust: download
  (`codeload.github.com/{o}/{r}/zip/{ref}`), atomic extract (strip the
  `repo-sha/` wrapper dir), emit progress events (reuse the #127 channel),
  write the manifest (tree fetch → path/SHA/size). Pure-logic tests: zip
  fixture extraction, manifest shape, wrapper-strip, traversal-entry rejection
  (`../` names in zip).
- **B302 — "Open repo as vault" UI.** GitHubOpenDialog gains the action next
  to the existing single-file open; calls B301 then `open_vault`; recents
  remember `github:owner/repo@ref` sources. The indexing indicator (#127)
  covers perceived latency.
- **B303 — Refresh.** `github_refresh_vault`: tree re-fetch, SHA diff,
  selective download/delete, re-index, "n files updated" toast. Tests on the
  diff function (added/changed/removed/dirty-skip matrices).
- **B304 — Dirty tracking.** Rust `git_blob_sha` + `github_vault_status`
  returning `{path, state: clean|dirty|conflicted}[]`; StatusBar pill shows
  "n changed". Tests: SHA golden values (mirror iOS test vectors), CRLF/UTF-8
  cases.
- **B305 — Commit to branch.** `github_commit_files(branch, message,
  paths[])`: create ref from pinned SHA (409 → suffix `-2`), PUT each file
  (base64, blob SHA as `sha` param), handle 409/422 per file. Tests against
  recorded JSON fixtures (no live API in CI).
- **B306 — Propose changes UI.** Dialog: changed-file checklist, branch name
  (auto `markup/docs-<slug>`), commit message, PR title/body; fork fallback
  path; success → PR URL toast + open in browser.
- **B307 — Polish + docs.** Rate-limit surfaces (403 vs limit, reuse iOS
  copy), zipball size guard (warn > 200 MB), USAGE.md section, release-notes
  draft. Marketing beat: "open any repo's docs, fix a typo, PR in 60 seconds."

Sequencing: B301→B302 ship read-as-vault value alone (worth releasing as
0.8.0); B303–B307 complete the round-trip (0.9.0). The site-style reading
track (global TOC, breadcrumbs, `#fragment` cross-doc anchors — B31x) is a
separate doc when picked up.

## 5. Risks / open questions

- **Zipball size & binary assets** — a docs-heavy repo is fine; a 2 GB
  monorepo is not. B301 guards: HEAD the zipball `Content-Length` when
  available, confirm > 200 MB, and skip indexing binary blobs (scanner
  already extension-gates).
- **Token absence** — public repos work unauthenticated at 60 req/h; the
  zipball is one request, so read-as-vault works signed-out. Write requires
  sign-in (existing flow).
- **Conflict UX** — D5 deliberately avoids merging. The failure mode is
  "remote moved under my edit"; we flag and let the user re-open + re-apply.
  Acceptable for docs-sized changes; revisit only with real demand.
- **CI testability** — all GitHub API logic behind traits/fixtures (iOS used
  recorded JSON; same here). No network in `cargo test`.

## 6. Acceptance

- Paste `owner/repo` → full vault (tree/search/wikilinks) in < 10 s for a
  typical docs repo, signed-out.
- Edit two files, "Propose changes", and a correct PR exists on GitHub —
  fork-based when you can't push — without leaving the app.
- `cargo test` + vitest cover: extraction, manifest diff, blob SHA, commit
  payloads, and the dialog state machine, all offline.
