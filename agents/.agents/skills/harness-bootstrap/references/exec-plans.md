# ExecPlans Integration

Use this reference when a repository should support long-running implementation plans.

Primary source:
- https://developers.openai.com/cookbook/articles/codex_exec_plans

## Repository shape

When bootstrapping ExecPlans into a repository, prefer this layout:

- `AGENTS.md`
- `docs/PLANS.md`
- `docs/exec-plans/`
- `docs/exec-plans/todo/`
- `docs/exec-plans/active/`
- `docs/exec-plans/completed/`

Use the status directories to store one Markdown file per long-running task plan:

- `docs/exec-plans/todo/` for planned work that has not started
- `docs/exec-plans/active/` for work currently in progress
- `docs/exec-plans/completed/` for finished plans kept for history

For this skill, ExecPlans support is mandatory. Bootstrap the full layout unless the repository already has an equivalent structure.

## AGENTS.md guidance

Add a short `ExecPlans` section to `AGENTS.md` that tells agents to use an ExecPlan for complex features or significant refactors and points them to `docs/PLANS.md`.

Keep the section short. The long-form rules belong in `docs/PLANS.md`, not `AGENTS.md`.

Recommended snippet:

    # ExecPlans

    When writing complex features or significant refactors, use an ExecPlan (as described in `docs/PLANS.md`) from design to implementation.

    Store plans in `docs/exec-plans/` using `todo/`, `active/`, and `completed/` to reflect status.

## PLANS.md guidance

The user requested that `docs/PLANS.md` match the official OpenAI text exactly. This skill vendors that text in `assets/docs/exec-plans/PLAN.md`.

When bootstrapping a target repository:

- copy `assets/docs/exec-plans/PLAN.md` verbatim to `docs/PLANS.md`
- do not paraphrase or rewrite the document
- keep the target filename as `docs/PLANS.md`

## Usage guidance

- Create `docs/PLANS.md`.
- Create `docs/exec-plans/todo/`, `docs/exec-plans/active/`, and `docs/exec-plans/completed/` at the same time so the storage location is obvious.
- Reference `docs/PLANS.md` from `AGENTS.md`.
- Store each plan as a separate Markdown file under the status directory that matches its current state.
