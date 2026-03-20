---
name: create-product-specs
description: "Generate or refine repository-local product specification documents for proposed features through interactive discussion with the user. Use when a user describes a feature, workflow, or product behavior they want to build and Codex should ask clarifying questions, define scope, goals, user flows, requirements, and acceptance criteria, then save the result under `docs/product-specs/` such as `docs/product-specs/feature-name.md`. Also use when asked to spec out a feature, write a product spec, turn an idea into a spec, or update an existing product-spec doc."
---

# Product Specs

Turn a feature idea into a product-level specification that future humans and agents can implement against. Keep the discussion interactive, keep the document product-facing, and save the final artifact under `docs/product-specs/`.

## Workflow

1. Build context before drafting.
   - Read the user's request carefully.
   - Inspect the repository for existing product docs, naming conventions, and related specs when they are available.
   - Prefer extending an existing product-spec document when the request clearly belongs to one.
   - Do not infer important product behavior from code alone if the user has not confirmed it.

2. Clarify the feature interactively.
   - Ask only the minimum questions needed to remove ambiguity.
   - Prefer one to three concise questions at a time instead of a long questionnaire.
   - Focus on product questions:
     - who the user is
     - what problem is being solved
     - what success looks like
     - what the main workflow is
     - what is out of scope
     - important constraints, edge cases, or rollout assumptions
   - Keep asking until the behavior is specific enough that an implementation agent could build against the spec.

3. Choose the target file.
   - Save the document at `docs/product-specs/<product-spec-name>.md`.
   - Use a short, stable, hyphen-case file name.
   - Derive the name from the feature or workflow, for example `new-user-onboarding.md` or `team-invite-flow.md`.
   - If the repository already has a product-spec naming pattern, follow it.

4. Write a product specification, not an implementation plan.
   - Describe desired product behavior and user-facing outcomes.
   - Do not turn the document into architecture notes, task decomposition, or a coding checklist unless the repository already mixes those concerns.
   - Keep implementation detail out unless it is a real product constraint.

5. Make the spec implementation-ready.
   - Be explicit about behavior, state changes, and failure cases.
   - Call out non-goals so agents do not overbuild.
   - Include acceptance criteria that can later be converted into tests or verification steps.
   - Surface open questions if the user chose to defer them instead of guessing.

6. Save the document and report the result.
   - Create `docs/product-specs/` if it does not exist.
   - Write the final spec to the chosen path.
   - Summarize what was captured and what remains unresolved.

## Product Spec Template

Use this structure unless the repository already has a stronger convention:

```markdown
# <Feature Name>

## Summary
Brief description of the feature and the intended user outcome.

## Problem
What user or business problem this feature addresses.

## Goals
- Specific product outcomes this feature should achieve.

## Non-Goals
- What this feature will explicitly not cover.

## Target Users
- Primary users or roles affected.

## User Journey
Describe the main end-to-end flow in product terms.

## Functional Requirements
1. Concrete product behaviors the system must support.

## Edge Cases and Failure Handling
- Important boundary conditions, empty states, permissions issues, validation failures, or fallback behavior.

## Acceptance Criteria
- Verifiable statements of done from a product perspective.

## Success Signals
- Observable indicators that the feature is working as intended.

## Constraints
- Product, compliance, rollout, compatibility, or business constraints.

## Open Questions
- Remaining decisions or assumptions that still need confirmation.
```

## Writing Rules

- Write for future implementation by humans or agents.
- Prefer concrete statements over aspirational language.
- Name actors, triggers, and expected outcomes explicitly.
- Separate required behavior from nice-to-have ideas.
- Keep scope tight. If the user is really describing multiple features, split them into separate specs or call out phased scope.
- Preserve the user's terminology unless it conflicts with established repository language.
- If related docs exist, link to them with repository-relative paths.

## Guardrails

- Do not begin implementation unless the user explicitly asks for it.
- Do not invent requirements just to make the spec feel complete.
- Do not bury uncertainty. Put unresolved items in `Open Questions`.
- Do not overfit to internal architecture; this file is a product document first.
- Do not create a generic brainstorming note. Produce a durable spec that can guide later work.

## Output

At the end of the task, report:

- the file path written under `docs/product-specs/`
- whether this was a new spec or an update to an existing one
- the most important open questions or deferred decisions
