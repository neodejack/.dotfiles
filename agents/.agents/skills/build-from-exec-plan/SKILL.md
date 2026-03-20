---
name: build-from-exec-plan
description: "Build a repository-local feature by executing an existing ExecPlan. Use when the user explicitly asks to build a named plan, for example `use the build-from-exec-plan skill to build multi-cluster-profiles`. Resolve the plan by basename under `docs/exec-plans/`, treat the plan file and `docs/PLANS.md` as the source of truth, move the plan to `docs/exec-plans/active/` before implementation if needed, execute it milestone by milestone with verification, create a git commit after each completed milestone, and move the plan to `docs/exec-plans/completed/` when all milestones are finished."
---

# Build From Exec Plan

Execute an existing repository-local ExecPlan from start to finish. This skill is for implementation, not planning. The plan is the working spec and must stay current as work proceeds.

## Workflow

1. Resolve the target plan.
   - Expect requests like `use the build-from-exec-plan skill to build <plan_name>`.
   - Treat `<plan_name>` as the basename of a Markdown file under `docs/exec-plans/`.
   - Prefer an exact match in this order:
     - `docs/exec-plans/active/<plan_name>.md`
     - `docs/exec-plans/todo/<plan_name>.md`
     - `docs/exec-plans/completed/<plan_name>.md`
   - If the only match is under `completed/`, stop and report that the plan is already completed unless the user explicitly asks to reopen it.
   - If the target is missing or ambiguous, stop and report that instead of guessing.

2. Read the implementation sources of truth.
   - Read `docs/PLANS.md` in full and follow it to the letter.
   - Read the target ExecPlan in full before making changes.
   - Read the repository-local docs and code that the plan directly references.
   - Treat the ExecPlan as authoritative for scope, order, and validation unless the user explicitly changes it.

3. Activate the plan lifecycle.
   - If the plan is in `docs/exec-plans/todo/`, move it to `docs/exec-plans/active/` before implementation starts.
   - Keep the filename unchanged when moving between status directories.
   - If the plan is already in `active/`, keep working there.
   - Do not move a plan into `completed/` until all milestones and acceptance criteria are satisfied.

4. Execute the plan milestone by milestone.
   - Follow the plan's milestone order unless the plan itself is revised.
   - Before each milestone, identify the files, commands, and acceptance signals the plan calls for.
   - Implement only the current milestone's scope, keeping changes coherent and incremental.
   - Update the plan as a living document while working. At minimum keep these sections accurate:
     - `Progress`
     - `Surprises & Discoveries`
     - `Decision Log`
     - `Outcomes & Retrospective`
   - If implementation reality diverges from the plan, update the plan first or as part of the same change. Record the reason in `Decision Log` and ensure the rest of the document stays self-consistent.

5. Verify each milestone before declaring it done.
   - Run the focused commands, tests, or manual checks named in the plan for that milestone.
   - If the plan names broader validation gates, run them when the milestone requires them.
   - Do not mark a milestone complete only because code was written. The milestone is complete only when the expected behavior or verification evidence exists.
   - If verification is blocked by an external dependency, unavailable credential, or environment gap, record the blocker in the plan and report it clearly instead of silently skipping validation.

6. Commit after every completed milestone.
   - Create a git commit immediately after each milestone is completed and verified.
   - Prefer one commit per completed milestone. Splitting a milestone into more than one commit is acceptable when the repo benefits from smaller commits, but do not batch multiple completed milestones into a single commit.
   - Include the relevant plan updates in the same commit as the milestone work so the checked-in plan matches the code at that point in history.
   - If the plan move from `todo/` to `active/` happens at the start of the first milestone, include that move in the first milestone commit unless a separate activation commit is necessary to preserve accurate status.

7. Finish and archive the plan.
   - When the full plan is complete, update `Outcomes & Retrospective` to summarize what was achieved, remaining gaps, and any notable lessons.
   - Move the plan from `docs/exec-plans/active/` to `docs/exec-plans/completed/`.
   - Ensure the final commit includes the last plan updates and the move to `completed/`, unless the repository needs a distinct completion commit for clarity.

## Guardrails

- Do not create or rewrite an ExecPlan from scratch here; this skill assumes the plan already exists.
- Do not treat a product spec, issue description, or chat message as a replacement for the ExecPlan once implementation begins.
- Do not skip `docs/PLANS.md`, even if the target plan looks familiar.
- Do not reorder milestones, widen scope, or invent acceptance criteria unless the plan is updated to reflect the change.
- Do not move a plan to `completed/` while milestone work or acceptance remains unfinished.
- Do not claim success with uncommitted milestone work.
- Do not guess when the intended plan file is unclear.

## Output

At the end of the task, report:

- the plan file that was used
- whether it was moved from `todo/` to `active/` and later to `completed/`
- which milestones were completed
- the verification that was run
- the git commits created
- any remaining blockers, deferred work, or validation gaps
