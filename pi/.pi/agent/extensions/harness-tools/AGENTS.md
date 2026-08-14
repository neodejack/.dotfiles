# harness-tools extension

This is a curated vendoring of pi-harness specialist infrastructure. It is not
a mirror of the full repository.

## Current scope

- `find_sessions`: indexed discovery by topic, date, checkpoint, and cwd.
- `list_sessions`: recent-session browsing by exact cwd or bounded child depth.
- Local `agent-kit` foundation for the next `read_session` phase and a future
  Oracle tool.

## Invariants

- Session discovery is read-only. Sesame's external indexer owns DB writes.
- Search snippets are discovery metadata, not evidence; use `read_session`
  before making claims about historical session contents.
- Keep the SQLite connection process-local and close it on session shutdown.
- Preserve match provenance (`matchedType`, entry id, and timestamp).
- Exclude the current session from `find_sessions` results.
- Resolve cwd paths before comparing directory depth.
- Do not restore removed pi-harness tracing, synthetic providers, or unrelated
  extension paths.
- Keep all vendored `@harness/*` imports local to this package.
- `ui-tweak` may decorate tool rows but must continue delegating to each tool's
  own call and result renderers.

## Verification

```sh
pnpm check
PI_OFFLINE=1 pi --list-models gpt-5.6
sesame status
```

See `IMPLEMENTATION_PLAN.md` for phase boundaries and `UPSTREAM.md` for source
provenance.
