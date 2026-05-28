# Contributing to Markup

Thanks for your interest! Markup is a small, native, open-source macOS Markdown editor (Tauri + React). Issues, bug reports, and PRs are all welcome.

## Ground rules

- **Be kind and concise.** Bug reports with clear repro steps get fixed fastest — there's an [issue template](./.github/ISSUE_TEMPLATE/) for that.
- **macOS-only, pre-1.0.** The product is still moving; check the [roadmap](./docs/RELEASE-PLAN.md) before proposing large features.
- **Open an issue before a big PR.** For typos, small bug fixes, and docs, just send the PR.

## Dev setup

Requirements: macOS 12+, [Node 18+](https://nodejs.org/) with pnpm 8+, [Rust 1.77+](https://rustup.rs/), and Xcode Command Line Tools (`xcode-select --install`).

```bash
git clone https://github.com/oratis/Markup
cd Markup
pnpm install
pnpm tauri:dev      # first run compiles Rust deps — 5–10 min
```

## Before you push

Run the same checks CI runs — green locally means green in CI:

```bash
pnpm tsc --noEmit   # type-check
pnpm lint           # Biome (run `pnpm lint:fix` to auto-fix)
pnpm test           # Vitest (frontend)
pnpm test:rust      # cargo tests (backend)
pnpm build          # Vite frontend build
```

## PR workflow

1. Branch off `main` (`fix/...`, `feat/...`).
2. Keep the change focused; update or add tests where it makes sense.
3. Open a PR into `main`. Branch protection requires **two CI checks** to pass before merge:
   - **Frontend** — lint + `tsc` + build + tests
   - **Rust** — build + test
4. PRs land as a merge commit; the branch is deleted after merge.

Don't push feature work directly to `main`.

## Code style

- **Frontend:** TypeScript + React, formatted/linted by [Biome](https://biomejs.dev/) (`biome.json`). No separate Prettier/ESLint.
- **Rust:** standard `rustfmt`; keep `cargo clippy` clean.
- Match the surrounding code. Prefer small, readable functions over cleverness.

## Project layout

```
src/            React frontend (components, lib, store.ts)
src-tauri/      Rust backend (commands, vault, index, scanner, watcher)
docs/           design notes, ADRs, release & GTM plans
scripts/        DMG layout, MAS build, signing, fixtures
.github/        CI + release workflows, issue/PR templates
```

Design rationale lives in [`docs/`](./docs/README.md) — start with the ADRs and the redesign plan.

## Releases (maintainers)

Cutting a release is documented in [`docs/RELEASE-PLAN.md`](./docs/RELEASE-PLAN.md) §3 (bump three version files → tag `vX.Y.Z` → CI builds dual-arch DMGs). Signing setup is in [`docs/app-store/signing-setup.md`](./docs/app-store/signing-setup.md).

## License

By contributing, you agree your contributions are licensed under the project's [MIT License](./LICENSE).
