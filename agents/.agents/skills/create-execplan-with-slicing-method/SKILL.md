---
name: create-execplan-with-slicing-method
description: "Create a repository-local ExecPlan from an explicitly requested purpose using the bundled PLANS.md guidance, with explicit dependency-graph and vertical-slicing rules applied to milestone decomposition. Use only when the user explicitly invokes this skill with phrasing like `use create-execplan-with-slicing-method for ...` or `use the create-execplan-with-slicing-method skill ...`; do not use implicitly for general planning, task breakdown, product specs, or implementation requests."
---

# Create ExecPlan

Create a self-contained ExecPlan for a requested repository-local change. This skill writes the plan only; it does not implement the plan.

## Source of Truth

Read `references/PLANS.md` in full before drafting or revising an ExecPlan. Treat it as the required format and quality bar.

If the target repository has its own `docs/PLANS.md` or `PLANS.md`, read it too and follow the repository-local version when it conflicts with the bundled reference.

## Workflow

1. Confirm explicit invocation.
   - Continue only when the user explicitly invoked this skill by name.
   - Treat the text after `for`, `to`, or equivalent wording as the requested purpose.
   - If the purpose is missing or too vague to research, ask one concise clarifying question.

2. Build repository context.
   - Inspect the current repository before writing.
   - Read relevant docs, existing product specs, existing ExecPlans, code paths, tests, and command runners such as `justfile`, `package.json`, `Makefile`, or project-specific scripts.
   - If the user names a source artifact, such as a product spec or issue, read that artifact first and use it as the feature source.

3. Choose the plan path.
   - Save new plans under `docs/exec-plans/todo/<purpose-slug>.md` unless the user provides a different path or the repository has a clear existing convention.
   - Use a short hyphen-case slug derived from the purpose.
   - Create `docs/exec-plans/todo/` if needed.
   - If a matching plan already exists, update it only when the user's request clearly asks for revision; otherwise stop and report the existing path.

4. Draft the ExecPlan.
   - Follow `references/PLANS.md` exactly.
   - Make the plan fully self-contained for a novice who has only the repository working tree and the plan file.
   - Include and maintain all required living sections: `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective`.
   - Include concrete repository-relative paths, commands, validation steps, expected observations, idempotence notes, and acceptance criteria.
   - Resolve reasonable implementation ambiguities in the plan and record important choices in `Decision Log`.
   - Do not wrap the saved Markdown file in triple backticks; the file content itself is the ExecPlan.

5. Validate the plan before finishing.
   - Re-read the generated plan against `references/PLANS.md`.
   - Check that the plan includes enough context for a stateless agent to implement it without chat history.
   - Ensure validation commands are project-specific and executable in the repository.
   - Do not start implementation unless the user separately asks for that.

## Guardrails

- Do not use this skill implicitly.
- Do not create a PRD, brainstorm note, or generic task list instead of an ExecPlan.
- Do not skip repository research. The plan must name real files, commands, and verification paths.
- Do not invent product requirements when the purpose is underspecified; ask a focused question or record explicit assumptions.
- Do not leave placeholders such as `TBD`, `TODO`, or `<fill in>`.
- Do not make the plan depend on external chat context.

## Output

At the end of the task, report:

- the ExecPlan path created or updated
- the source material used
- any assumptions or open questions recorded in the plan
- confirmation that implementation was not started
