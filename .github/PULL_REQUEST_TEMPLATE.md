<!-- Keep the description short. Link any issues. -->

## Summary

<!-- 1-3 bullets on what changed and why. -->

-

## How to verify

<!-- Concrete steps a reviewer can run, including any sample doc / vault. -->

```bash
pnpm install
pnpm tauri:dev
```

## Checks

- [ ] `pnpm tsc --noEmit` clean
- [ ] `pnpm lint` clean
- [ ] `pnpm test --run` green
- [ ] `cd src-tauri && cargo test` green
- [ ] Tested manually on macOS (note version):
- [ ] Performance budget unchanged (open 5MB doc, input <16ms)
- [ ] No new dependencies added without rationale

## Notes for the reviewer

<!-- Anything unusual: trade-offs, follow-ups, known issues. -->
