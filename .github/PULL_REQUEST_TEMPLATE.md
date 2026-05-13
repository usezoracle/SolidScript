## What this changes

<!-- One or two sentences describing the change. -->

## Why

<!-- The motivation. Link the issue if there is one (Closes #N). -->

## How to verify

<!-- Steps a reviewer can run to confirm the change works. -->

```bash
bun test
bun run cli build examples
# or your specific repro
```

## Checklist

- [ ] Tests added or updated
- [ ] `bun run typecheck` passes
- [ ] `bun test` passes
- [ ] `bun run build` succeeds
- [ ] If user-facing: `README.md` / `docs/details.md` updated
- [ ] If new dependency: justified in description (we avoid bundling native binaries — use lazy-fetch or Docker fallback)
- [ ] Commit message explains *why*, not just *what*

## Notes for the reviewer

<!-- Optional: anything tricky, edge cases worth flagging, future follow-ups. -->
