---
name: agents-md
description: "Creates and updates AGENTS.md instruction files for repositories. Use when asked how to write, place, audit, or improve agent guidance files such as AGENTS.md."
---

# Writing AGENTS.md

Use this skill to create, update, or review `AGENTS.md` files that help coding agents work safely and effectively in any repository.

The core rule: **remove guesswork**. `AGENTS.md` should tell an agent where it is, what commands and paths are canonical, how to verify work, where to debug failures, and what to avoid.

## Workflow

1. Identify the repository root and any existing `AGENTS.md` files.
2. Check whether Claude is already used in the repository by looking for an existing `CLAUDE.md` file.
3. Read enough project files to discover real commands and structure:
   - package/build config (`package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, etc.)
   - test/lint/typecheck config
   - dev-server or local-run scripts
   - deployment or infrastructure docs if relevant
   - existing README or architecture docs
4. Create or update the root `AGENTS.md` with global guidance.
5. Add nested `AGENTS.md` files only where a subdirectory has distinct commands, conventions, risks, or workflows.
6. If Claude was detected and you create a new `AGENTS.md`, create an accompanying `CLAUDE.md` beside it unless that `CLAUDE.md` already exists.
7. Keep instructions concrete, scoped, and operational. Prefer exact commands and paths over vague advice.
8. Do not include secrets, private credentials, or one developer's machine-specific setup in repo-level `AGENTS.md`.

## Placement Rules

Always prefer this structure:

```text
AGENTS.md                 # global repo guidance
server/AGENTS.md          # backend-specific guidance, if server/ exists
frontend/AGENTS.md        # frontend-specific guidance, if frontend/ exists
infra/AGENTS.md           # infrastructure safety, if infra/ exists
migrations/AGENTS.md      # database migration rules, if migrations/ exists
scripts/AGENTS.md         # automation/script rules, if scripts/ exists
tests/AGENTS.md           # test fixture/mocking rules, if tests/ exists
```

Use nested files when local guidance differs from the root. Do not create nested files just to repeat root instructions.

## Accompanying CLAUDE.md Files

When creating a new `AGENTS.md`, also create a sibling `CLAUDE.md` if both are true:

- the repository already has a `CLAUDE.md` somewhere, indicating Claude is in use
- the sibling `CLAUDE.md` does not already exist

The accompanying `CLAUDE.md` should contain only this include line:

```md
@./AGENTS.md
```

Do not overwrite or replace an existing `CLAUDE.md` unless the user explicitly asks. Existing Claude guidance may contain hand-written project-specific instructions.

Directory scope model:

```text
Root AGENTS.md
  +
subdirectory/AGENTS.md
  +
subdirectory/deeper/AGENTS.md
```

The deeper file should add narrower rules for the code beneath it.

## What the Root AGENTS.md Should Contain

Include sections like these, adapted to the actual repo:

````md
# Agent instructions

## Project overview

Briefly describe what this repository does.

## Important directories

- `server/` — backend/API code
- `frontend/` — frontend/UI code
- `scripts/` — automation scripts
- `docs/` — documentation
- `tests/` — tests and fixtures

## Setup

Install dependencies with:

```bash
<setup command>
```

## Development

Start the dev environment with:

```bash
<dev command>
```

Use URLs printed by the command or documented in `<path>`.

## Build, test, and lint

Use the narrowest relevant check:

```bash
<test command>
<typecheck command>
<lint command>
<format command>
```

## Logs and debugging

- `<path>` — dev server logs
- `<path>` — worker logs
- `<path>` — browser/client logs

Health check:

```bash
<health-check command>
```

## Code conventions

- Follow existing patterns before adding new abstractions.
- Prefer existing utilities over new helpers.
- Keep changes scoped to the requested task.
- Add or update tests for behavior changes.

## Continual updates to agents.md files

- When making an implementation plan, end the plan with a step to use the `agents-md` skill to evaluate whether any durable new information should be recorded in relevant `AGENTS.md` files.
- After writing new code, use the `agents-md` skill to update relevant `AGENTS.md` files when the change introduces new commands, workflows, conventions, setup steps, verification steps, safety rules, or gotchas.

## Safety rules

- Do not commit secrets.
- Do not edit generated files directly.
- Do not run destructive commands without confirmation.
- Do not change deployment state manually unless explicitly asked.

## Known gotchas

- Add short, specific warnings about common mistakes here.
````

## What Nested AGENTS.md Files Should Contain

Nested files should be short and local. They should not restate the whole repository guide.

### Backend example

````md
# Backend instructions

## Commands

Run backend tests with:

```bash
<backend test command>
```

Run type checks with:

```bash
<backend typecheck command>
```

## Conventions

- Put route handlers in the established routes directory.
- Put shared business logic in the established services directory.
- Put database access in the established data-access layer.
- Do not call external services directly from unit tests; use mocks or fixtures.

## Safety

- Do not change public API responses without updating tests and docs.
- Keep database-related changes backward-compatible unless the user explicitly asks otherwise.
````

### Frontend example

````md
# Frontend instructions

## Commands

Run frontend tests with:

```bash
<frontend test command>
```

Run the component explorer or visual development tool with:

```bash
<storybook-or-visual-dev command>
```

## Conventions

- Reuse existing components before creating new ones.
- Prefer accessible semantic HTML.
- Keep visible component changes covered by stories, screenshots, or visual checks.
- Avoid introducing global styles unless the existing pattern calls for it.
````

### Migration example

````md
# Database migration instructions

## Rules

- Never edit an already-applied migration.
- Add a new migration instead.
- Keep migrations compatible with the previously deployed version.
- For risky schema changes, use staged migrations.

## Verification

Run:

```bash
<migration test command>
```
````

### Infrastructure example

````md
# Infrastructure instructions

## Safety

- Do not apply infrastructure changes without explicit user confirmation.
- Always produce a plan before applying.
- Do not rotate, print, or commit secrets.
- Avoid manual production changes unless the user specifically asks.

## Verification

Run:

```bash
<format command>
<validate command>
<plan command>
```
````

## Writing Rules

### Be concrete

Avoid vague guidance like:

```md
Run tests before finishing.
```

Prefer exact commands:

````md
For backend changes, run:

```bash
<backend test command>
```

For type changes, run:

```bash
<typecheck command>
```
````

### Prefer paved paths

If setup, dev-server startup, or debugging has multiple steps, point agents to one reliable script:

````md
Start or reuse the dev environment with:

```bash
./scripts/ensure-dev-server.sh
```

This script reuses a healthy server, restarts a broken one, starts a fresh one if needed, and prints the URLs to use.
````

If no such script exists and the repo would benefit from one, mention it as a recommendation. Do not create new scripts unless the user asked for implementation or the change is clearly in scope.

### Include observability

Document log files, health checks, readiness checks, generated port metadata, and artifact directories when they exist:

````md
Logs:

- `logs/dev.log` — development server logs
- `logs/worker.log` — background worker logs

Health check:

```bash
curl http://localhost:<port>/health
```
````

### Include local authentication guidance

If the app has local seeded users or dev-only login shortcuts, document them. If production OAuth, SSO, passkeys, or 2FA should not be used locally, say so explicitly.

```md
In development, use the seeded test users and the dev login endpoint.
Do not use production OAuth for local testing.
```

### Include safety rules and gotchas

Known gotchas should be short, specific, actionable, and placed near the relevant code.

Good examples:

```md
- Do not edit generated files directly. Edit the schema source and regenerate.
- These tests share a global fixture; avoid running them in parallel.
- Do not rename these event fields without updating downstream consumers.
```

## What Not To Put In Repo AGENTS.md

Do not commit:

- secrets or tokens
- private credentials
- personal filesystem paths
- one developer's local-only setup
- private infrastructure access details
- stale command output or time-sensitive status

Use user-level or environment-level agent instructions for local machine notes when available.

## Review Checklist

Before finishing, check that each `AGENTS.md` is:

- scoped to the directory where it lives
- current and consistent with real project files
- concrete about commands and paths
- explicit about verification
- clear about logs/debugging when applicable
- clear about safety constraints
- free of secrets and private local details
- not duplicating nearby instructions unnecessarily

Final response should summarize created or changed `AGENTS.md` files and any verification performed. If commands could not be verified, say so directly.
