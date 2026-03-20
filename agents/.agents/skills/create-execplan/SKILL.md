---
name: create-execplan
description: "Create an ExecPlan from an existing repository-local product specification. Use when the user explicitly asks to create an exec-plan for a named product spec, for example `create a exec-plan product-spec-name`, and the corresponding spec lives under `docs/product-specs/`. Read `docs/product-specs/<product-spec-name>.md`, follow the repository's ExecPlan instructions in `docs/PLANS.md`, and write the resulting plan to `docs/exec-plans/todo/<product-spec-name>.md`. Use this skill for planning only, not for beginning implementation."
---

# Execution Plan

Turn a repository-local product spec into an implementation-ready ExecPlan. This skill is for the planning step that sits between product specification and coding.

## Workflow

1. Resolve the requested product spec.
   - Expect the user to invoke the agent with a request like `create a exec-plan product-spec-name`.
   - Treat `product-spec-name` as the basename of a file under `docs/product-specs/`.
   - Prefer an exact match at `docs/product-specs/<product-spec-name>.md`.
   - If there is no exact match, search `docs/product-specs/` for the closest repository-local match and use it only when the intended target is clear from filenames or nearby context.
   - If the target spec is still ambiguous or missing, stop and report that instead of guessing.

2. Verify the planning prerequisites.
   - Read `docs/PLANS.md` and treat it as the source of truth for ExecPlan structure and process.
   - Confirm that `docs/exec-plans/todo/` exists or create it if the repository already uses the `docs/exec-plans/` layout.
   - If `docs/PLANS.md` is missing, do not invent a replacement. Tell the user the repository is missing ExecPlan guidance and suggest bootstrapping it first.
   - If `docs/product-specs/` is missing or the product spec does not exist, stop and say so.

3. Build enough context to plan well.
   - Read the product spec in full before drafting.
   - Read any repository-local docs that the product spec directly references.
   - Inspect the repository only as much as needed to map the spec onto the current codebase, constraints, and likely integration points.
   - Do not start implementation. The output of this skill is the plan file.

4. Write the ExecPlan.
   - Follow `docs/PLANS.md` closely for structure, level of detail, and lifecycle expectations.
   - Write a plan that covers the work from design through implementation, not just a task list.
   - Translate product requirements into:
     - concrete scope
     - architecture or design approach when needed
     - ordered milestones
     - affected systems or files when they are clear
     - verification strategy
     - assumptions, unknowns, and risks
   - Keep the plan implementation-ready for a later human or agent, but do not include speculative code diffs.

5. Choose the target file and save it.
   - Write the plan to `docs/exec-plans/todo/<product-spec-name>.md`.
   - Reuse the product spec basename for the plan filename unless the repository already uses a different naming convention.
   - If a matching plan file already exists in `docs/exec-plans/todo/`, update it in place instead of creating a duplicate.
   - Do not move the plan to `active/` or `completed/` unless the user explicitly asks.

## Guardrails

- Do not implement the feature as part of this skill.
- Do not create a product spec here; this skill assumes the spec already exists under `docs/product-specs/`.
- Do not invent repository structure or commands that are not present.
- Do not paraphrase away important requirements from the source product spec.
- Do not guess when multiple product specs could match the user's request.
- Do not store the plan outside `docs/exec-plans/todo/` unless the user asks for a different status.

## Output

At the end of the task, report:

- the product spec file used under `docs/product-specs/`
- the ExecPlan file written under `docs/exec-plans/todo/`
- whether the plan was newly created or updated
- any important unresolved assumptions or blockers discovered while planning
