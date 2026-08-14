# Upstream provenance

Vendored from [`aliou/pi-harness`](https://github.com/aliou/pi-harness), commit
`9072cea`.

Initial source directories:

- `packages/agent-kit/`
- `packages/models/`
- `packages/session-store/`
- `packages/session-tools/`
- `tools/find-sessions/`
- `tools/list-sessions/`
- `tools/read-session/`

Sesame search uses `@aliou/sesame@0.11.0`. The matching standalone CLI release
is installed separately for indexing because the current Homebrew formula is
older.

Local adaptations:

- Convert `@harness/*` workspace imports to extension-local imports.
- Remove Aperture/provider tracing and unrelated repository extension paths.
- Fold the required model-roster loader and utility helpers into this package.
- Keep only curated session tools initially; `oracle` remains deferred.

Review upstream changes before refreshing because extensions and subagents run
with the user's full process permissions.
