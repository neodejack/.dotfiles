---
name: create-architecture-md
description: "Generate or refresh an `ARCHITECTURE.md` for the current repository. Use when the user asks to create, write, regenerate, or update repository architecture documentation, a code map, or a high-level structural guide that helps contributors answer \"where does X live?\"."
---

# Create ARCHITECTURE.md

Write a concise, durable `ARCHITECTURE.md` for the current repository. The goal is to give future contributors a mental map of the codebase, not to mirror every implementation detail.

Read `references/matklad-architecture-md.md` before drafting the document.

## Workflow

1. Build context from the repository first.
   - Inspect the repository root, `README`, existing docs, task runners, and the main source directories.
   - Check whether an `ARCHITECTURE.md` already exists. Update it in place if it does.
   - Identify the main subsystems, key entrypoints, important directories, and major data or control flow boundaries.
   - Prefer `rg --files`, targeted file reads, and existing docs over broad file-by-file exploration.

2. Choose the target path.
   - If the repository already has an `ARCHITECTURE.md`, update that file.
   - Otherwise create a root-level `ARCHITECTURE.md`.
   - Only use `docs/ARCHITECTURE.md` instead when the repository clearly already treats architecture docs as `docs/` content.

3. Draft the document in the reference shape.
   - Start with a bird's-eye overview of the problem the repository solves.
   - Add a coarse codemap that answers:
     - where does the thing that does X live?
     - what does this area generally do?
   - Name important files, modules, packages, services, types, or executables.
   - Call out important boundaries, invariants, and layering rules.
   - End with cross-cutting concerns that span multiple areas.

4. Keep the document stable and useful.
   - Keep it short enough that recurring contributors will actually read it.
   - Focus on structure that changes slowly.
   - Prefer naming important entities over linking deeply to paths that may move.
   - Do not turn the file into a README rewrite, onboarding checklist, or exhaustive file inventory.
   - Do not invent boundaries, invariants, or responsibilities that are not supported by the repository.

5. Verify before finishing.
   - Confirm that every named directory, file, module, or executable actually exists.
   - Make sure the document reflects the current repository rather than generic architecture advice.
   - Trim implementation detail until the file reads like a durable map instead of a transient status report.

## Recommended Structure

Use this structure unless the repository already has a stronger local convention:

```markdown
# Architecture

## Overview
Short description of the problem the repository solves and the major parts of the system.

## Codemap
High-level map of the main directories, modules, binaries, packages, or services.

## Key Boundaries and Invariants
Important rules, layering constraints, and absences that are easy to miss from code alone.

## Cross-Cutting Concerns
Concerns that affect multiple areas, such as configuration, state flow, background jobs, observability, caching, error handling, extension points, or deployment boundaries.
```

## Guardrails

- Do not dump a full `tree` output into the document.
- Do not describe low-level implementation details that belong in code comments or module docs.
- Do not hard-link every named path; prefer stable names that readers can search for.
- Do not guess at architecture when the repo does not support the claim. Read more code first.
- Do not let the codemap collapse into a list of unrelated directories. Explain how the parts relate.
- If the repository is small, keep the document proportionally small.

## Output

At the end of the task, report:

- which `ARCHITECTURE.md` file was created or updated
- the main subsystems or boundaries captured in the document
- any areas that remain unclear because the repository did not provide enough evidence

## Reference

- `references/matklad-architecture-md.md`
