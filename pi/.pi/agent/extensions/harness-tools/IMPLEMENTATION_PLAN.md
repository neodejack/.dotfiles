# Harness tools adoption plan

## Goal

Adopt a curated subset of `aliou/pi-harness` that initially provides:

- `find_sessions`
- `list_sessions`
- `read_session`

The implementation should also leave a stable `agent-kit` foundation for a
future `oracle` tool. It must not pull in unrelated pi-harness commands, hooks,
providers, or model-specific edit behavior.

## Target layout

```text
pi/.pi/agent/extensions/harness-tools/
├── AGENTS.md
├── IMPLEMENTATION_PLAN.md
├── UPSTREAM.md
├── package.json
├── index.ts
├── lib/
│   ├── agent-kit/
│   ├── models/
│   ├── session-store/
│   ├── session-tools/
│   └── utils/
├── tools/
│   ├── find-sessions/
│   ├── list-sessions/
│   └── read-session/
└── test/
```

`tools/oracle/` may be added later without replacing the framework.

## Phase 1: runtime and Sesame

1. Upgrade the mise-managed Node runtime from Node 24 to a pinned Node 26.
2. Reinstall global `pi` and `sai` packages under Node 26.
3. Install the standalone Sesame `0.11.0` release binary rather than the stale
   Homebrew `0.9.0` formula.
4. Configure Sesame to index `~/.pi/agent/sessions`.
5. Run `sesame watch` through launchd. Keep indexing external to Pi so multiple
   Pi processes share one writer and one SQLite index safely.

## Phase 2: reusable pi-harness foundation

1. Vendor `packages/agent-kit` and the model-family helpers required by its
   prompt compiler.
2. Convert `@harness/*` workspace imports to extension-local imports.
3. Remove Aperture/provider tracing and repository-relative assumptions.
4. Retain child Pi sessions, explicit tool allowlists, startup timeout,
   pre-output model failover, provider cooldown, resumable session records,
   nested usage accounting, and streaming rendering.
5. Fold the global `subagent-models.json` loader into the local framework.
6. Vendor only utility helpers used by the selected code.

The first model roster is:

```json
{
  "read_session": [
    {
      "provider": "openai-codex",
      "model": "gpt-5.6-luna",
      "thinking": "high",
      "weight": 1
    }
  ]
}
```

The same file can later add an `oracle` roster.

## Phase 3: session discovery

1. Vendor `packages/session-store` around `@aliou/sesame@0.11.0`.
2. Preserve the long-lived SQLite connection, BM25 search, relative date
   parsing, message counts, match provenance, UUID lookup, and cwd helpers.
3. Register `find_sessions` with query, cwd, date, and limit filters. Exclude
   the current session and expose the entry/type/timestamp that matched.
4. Register `list_sessions` with exact-cwd browsing and bounded child depth.
5. Close the SQLite connection on Pi session shutdown.
6. Keep search/list tools read-only and treat snippets as discovery metadata,
   never as complete evidence.

## Phase 4: bounded session reading

1. Vendor `packages/session-tools` for tree traversal, compact previews,
   checkpoints, labels, bounded entry reads, and in-session search.
2. Register `read_session({ targetSessionId, goal })` as a zero-shot
   specialist using the local `agent-kit`.
3. Give the child only the nine bounded session-query tools; do not give it
   bash, read, write, edit, apply_patch, generic subagents, or user prompts.
4. Require overview-first navigation, checkpoint-first handling for compacted
   sessions, main-branch preference, exact entry/checkpoint citations, and
   `not found` when evidence is absent.
5. Accept full UUIDs, unambiguous UUID prefixes, and validated Pi `.jsonl`
   paths.

## Phase 5: companion protections

1. Block `write`, `edit`, and `apply_patch` mutations under Pi's sessions
   directory.
2. Require confirmation for direct reads or shell access to session files.
3. Keep `find_sessions`, `list_sessions`, and `read_session` permitted.
4. Optionally add `@@` session autocomplete after the core tools stabilize.
   Use the actual `targetSessionId` parameter name in injected guidance.

## Phase 6: registration

Register one extension entry in `pi/.pi/agent/settings.json`:

```json
"./extensions/harness-tools/index.ts"
```

The framework itself does not register a generic subagent tool. Initially only
the three session tools are model-facing.

## Verification

- `PI_OFFLINE=1 pi --list-models gpt-5.6` loads the extension.
- Sesame reports an indexed session count and can find a known phrase.
- `find_sessions` excludes the current session and reports provenance.
- `list_sessions` distinguishes exact cwd, child depth, and sibling prefixes.
- `read_session` resolves UUIDs and extracts cited evidence from normal,
  compacted, and branched sessions.
- Missing evidence produces `not found` rather than inference.
- Session files are never modified.
- SQLite and child sessions dispose cleanly on shutdown/reload.
- `ui-tweak` decorates each tool result once while preserving native renderers.

## Suggested commits

1. `chore(pi): upgrade node runtime for sesame`
2. `chore(pi): install sesame session indexer`
3. `feat(pi): vendor harness subagent foundation`
4. `feat(pi): add session discovery tools`
5. `feat(pi): add bounded session reader`
6. `feat(pi): protect session history`
7. `feat(pi): add session reference autocomplete`

## Deferred

- Davis generic background subagents
- Oracle
- Claude/Codex external subagent backends
- cross-framework nesting
- embedded Sesame writers inside Pi processes
- session mutation or cleanup tools
- resumable `read_session`
