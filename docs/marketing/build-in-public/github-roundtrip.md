<!-- DRAFT — build-in-public article (GTM §7). Target: HN / Lobsters / dev.to /
     掘金. Owner ratifies voice + how much implementation detail to reveal before
     publishing. Tech claims trace to src-tauri/src/github_vault.rs +
     docs/design/06-github-roundtrip.md. -->

# Reading a GitHub repo as a local vault — and proposing edits as a PR — without a git library

One of [Markup](https://github.com/oratis/Markup)'s defining features is that it
opens **any GitHub repo as a vault**: browse the whole tree, full-text search,
follow wikilinks, read it offline — then fix a typo and send the change back as
a pull request. No `git` binary, no libgit2. Here's how it works, and the one
design decision that made the whole thing simple.

## The trap: a "remote vault" mode

The obvious design is a second code path — a "remote" vault that fetches files
from the GitHub API on demand, caches them, and renders them through some
special remote-aware pipeline. That means two of everything: two renderers, two
search indexes, two link resolvers. Every feature now ships twice and drifts.

## The decision: materialize, then it's local

We don't do remote vaults. We **download the repo to disk first**, and then the
*existing local pipeline runs unchanged*:

1. Fetch the repo's **zipball** (one request, the whole tree).
2. **Extract it atomically** into the app cache.
3. Point the normal `open_vault` at the folder — the same Tantivy indexer, file
   watcher, wikilink resolver, and backlink graph that a local folder uses.

Reading a GitHub vault becomes **indistinguishable** from reading a local
folder: relative images resolve, links work, search is instant — because it
*is* a local folder. Zero new rendering paths. iOS proved this shape first;
the desktop inherited it wholesale.

Two details that matter:

- **GitHub zipballs wrap everything in a single `repo-<sha>/` directory**, so
  extraction strips that prefix to land files at the vault root.
- **Extraction is atomic** — contents go into a partial directory and get
  renamed into place only on success, so a half-downloaded repo never appears
  as a corrupt vault.

## Knowing what changed — git's blob SHA, computed by hand

To send edits back, you have to know *which files the user changed* relative to
what they pulled. The temptation is to shell out to `git status`. We don't ship
git, so instead we record a tiny **manifest** when the vault is materialized:

```jsonc
// .markup/manifest.json
{
  "commit_sha": "…",          // the exact commit we pinned
  "entries": [
    { "path": "README.md", "sha": "<blob-sha>", "size": 1234 },
    …
  ]
}
```

The `sha` is **git's blob SHA-1** — the same identifier GitHub reports for every
blob. The trick: git's blob id isn't a hash of the file bytes, it's

```
SHA1("blob " + <byte-length> + "\0" + <contents>)
```

Compute that for a local file and you get **the exact id GitHub would give it**
— no git library required. So "did this file change?" is a one-line comparison:
hash the local file, check it against `entries[].sha`.

Pulling the latest is the mirror image: fetch the new tree, then diff the new
blob SHAs against the manifest into `added` / `changed` / `removed`, apply, and
rewrite the manifest. The same hash powers both "what did I change locally?" and
"what changed upstream?".

## Sending it back: a PR, not a git client

Markup is a "fix this doc" button, not a git GUI. So write-back is the minimal
GitHub API dance: create a branch, commit the changed blobs, open a pull
request. When you *can't* push to the repo, it forks first and opens a
cross-repo PR — and the UI doesn't change at all; the "propose changes" dialog
just works either way.

## Why this is the right shape

- **One pipeline.** Read, search, render, and link-resolve have a single
  implementation. A GitHub vault can't render differently from a local one
  because there's only one renderer.
- **Offline by default.** Once materialized, the repo is just files — read it on
  a plane.
- **No heavy dependencies.** A zip extractor and a SHA-1 function replace an
  embedded git. The binary stays small (it's a [Tauri](https://tauri.app) + Rust
  app — native, not Electron).

The lesson generalizes: when you're tempted to add a "remote mode," check
whether you can **make the remote thing local first** and reuse everything you
already built. Here it collapsed two pipelines into one and made the killer
feature — *read any repo's docs natively, then fix them* — almost fall out for
free.

---

*Markup is a free, open-source (MIT), native Markdown editor — reader-first,
with a vault, backlinks, graph, full-text search, and this GitHub round-trip.
macOS today; Windows & Linux coming. → [github.com/oratis/Markup](https://github.com/oratis/Markup)*
