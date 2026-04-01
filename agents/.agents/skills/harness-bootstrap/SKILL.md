---
name: harness-bootstrap
description: "Bootstrap or improve harness-engineering scaffolding for an existing software repository so agents can work safely and productively. Use when asked to make a repo more agent-friendly, adopt harness engineering, prepare a codebase for Codex or mixed human and agent coding, add or improve repo-local guidance such as `AGENTS.md` or `ARCHITECTURE.md`, establish canonical setup/lint/typecheck/test commands, or audit a repository for missing agent workflows and verification rails."
---

# Harness Bootstrap

Prepare an existing repository for mixed human and agent coding. Audit the repo, preserve its current conventions, and add only the smallest set of docs, commands, and workflow scaffolding needed to make agent work reliable.

## Workflow

1. Build context first.
   - Inspect root files, docs, CI config, task runners, and common scripts.
   - Identify existing agent-relevant artifacts such as `AGENTS.md`, `ARCHITECTURE.md`, `docs/`, `justfile`, `Makefile`, CI pipelines, and test helpers.
   - Read the current repo before proposing structure. Prefer extending what exists over introducing a parallel system.

2. Decide the minimum bootstrap set.
   - Create or update only what the repo is missing.
   - Bootstrap these artifacts unless the repo already has an equivalent:
     - Root `AGENTS.md` with canonical commands, docs navigation, verification expectations, and an `ExecPlans` section.
     - `docs/ARCHITECTURE.md` when the codebase has important structure or boundaries that are not obvious from code.
     - `docs/PLANS.md`, copied from this skill's `assets/docs/exec-plans/PLAN.md`.
     - `docs/exec-plans/` with `todo/`, `active/`, and `completed/` for storing long-running task plans by status.
     - Focused `docs/` pages for product rules and design decisions when the repo needs more than a short root guide.
     - Small automation in the repo's existing runner only when command discovery is poor.
   - Treat CI and scripts as enforcement layers, not prose. If a rule must never be skipped, encode it in automation instead of documenting it only in Markdown.

3. Write repo-local guidance.
   - Keep `AGENTS.md` short, operational, and concrete.
   - Do not put the repo map in `AGENTS.md`. Point agents to `docs/ARCHITECTURE.md` for the code map and structural orientation.
   - Include:
     - how to boot the project
     - how to run lint, typecheck, test, and focused verification
     - how to navigate `docs/`
     - what files the agent should read before editing
     - project-specific constraints that are not obvious from code
   - In `AGENTS.md`, describe `docs/` as following a Progressive Disclosure design principle: keep the root guide concise, reference deeper docs explicitly, and say when each linked file should be read so readers know the docs exist and when they matter.
   - In the docs navigation guidance, explain what each document is for and when to read it. At minimum cover:
     - `docs/ARCHITECTURE.md` for code structure, boundaries, and "where does X live?"
     - `docs/PLANS.md` for the ExecPlan format and rules
     - `docs/exec-plans/todo/`, `docs/exec-plans/active/`, and `docs/exec-plans/completed/` for long-running task plans by status
     - any additional `docs/` pages created for design decisions or product rules
   - Add an `ExecPlans` section to `AGENTS.md` that tells agents to use an ExecPlan for complex features or significant refactors, points them to `docs/PLANS.md`, and explains the `docs/exec-plans/` status directories.
   - Keep `docs/ARCHITECTURE.md` structural. When writing or revising it, read `references/architecture-md.md` first and follow that shape:
     - start with a bird's-eye overview of the problem and system
     - provide a coarse codemap that answers "where does X live?"
     - name important files, modules, and types without relying on brittle links
     - call out architectural invariants, boundaries, and cross-cutting concerns
     - keep it short and focused on stable structure rather than implementation detail
   - For ExecPlans:
     - ensure `docs/exec-plans/todo/`, `docs/exec-plans/active/`, and `docs/exec-plans/completed/` exist
     - copy this skill's `assets/docs/exec-plans/PLAN.md` verbatim to the target repo as `docs/PLANS.md`
     - store each long-running task plan as its own file under one of those status directories
   - Prefer repository-relative paths and real commands over abstract guidance.

4. Tighten the verification path.
   - Surface a smallest reliable command set for setup, lint, typecheck, tests, and app run.
   - If commands are fragmented, normalize them into the repo's existing runner instead of introducing a second workflow without a clear reason.
   - Call out missing enforcement separately, for example:
     - no canonical test command
     - missing typecheck or lint step
     - no boundary checks
     - stale or missing docs
   - If you add automation, keep it minimal and immediately runnable.

5. Close with explicit gaps.
   - Summarize what was created or updated.
   - List what is still missing and should become CI, scripts, or a follow-on skill.
   - Distinguish between repo-local knowledge, reusable workflow, and mechanical enforcement.

## Bootstrap Targets

Use this checklist to decide what to add:

- Root `AGENTS.md`
- `docs/ARCHITECTURE.md`
- `docs/PLANS.md`
- `docs/exec-plans/`
- `docs/exec-plans/todo/`
- `docs/exec-plans/active/`
- `docs/exec-plans/completed/`
- `docs/` pages for design decisions or execution-plan conventions
- Canonical dev commands in the existing task runner
- Clear verification commands for agent-authored changes
- Worktree or local sandbox notes if the repo supports parallel work
- Missing CI follow-ups captured as concrete gaps

## Guardrails

- Do not replace existing docs wholesale when a targeted update will do.
- Do not invent architecture, domain rules, or commands; derive them from the repo.
- Do not put hard requirements only in prose if they can be encoded in CI or scripts.
- Do not create a large documentation tree unless the repo complexity justifies it.
- Do not optimize only for agents; preserve human readability and the repo's current conventions.
- Prefer incremental bootstrap over framework-style reorganization.

## References

- For `docs/ARCHITECTURE.md`, read `references/architecture-md.md` before drafting or revising the document.
- For ExecPlans integration, read `references/exec-plans.md` and use this skill's `assets/docs/exec-plans/PLAN.md` as the source for the target repo's `docs/PLANS.md`.

## Output

At the end of the task, report:

- which files were created or updated
- which canonical commands were established or confirmed
- which risks or missing enforcement remain
- which follow-on skills are now easier to use, for example execution planning, verification, review, or doc gardening
