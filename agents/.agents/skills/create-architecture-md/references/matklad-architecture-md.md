# Matklad `ARCHITECTURE.md` Guideline

Source:
- https://matklad.github.io/2021/02/06/ARCHITECTURE.md.html

Fetched:
- 2026-03-26

This file is a repository-local reference derived from the source article above. Use it to shape `ARCHITECTURE.md` documents in a way that matches the article's intent.

## Core Idea

The main benefit of an `ARCHITECTURE.md` is helping contributors build a mental map of the codebase. The hard part in an unfamiliar repository is often not changing code, but finding where the right change belongs.

## What the document should optimize for

- Keep it short.
- Focus on structure that changes slowly.
- Revisit it occasionally instead of trying to synchronize every detail with the code.
- Help readers jump to the right area quickly.

## Recommended shape from the article

1. Start with a bird's-eye overview.
   - Explain the problem the project solves.
   - Describe the major parts of the system at a high level.

2. Add a coarse codemap.
   - Describe the main modules or directories and how they relate.
   - The codemap should answer:
     - where is the thing that does X?
     - what does the thing I am looking at generally do?
   - Keep the map coarse rather than exhaustive.

3. Name important entities.
   - Mention important files, modules, and types by name.
   - Prefer names over fragile links so the document ages better.
   - Encourage search by symbol or file name.

4. Call out invariants and boundaries.
   - Write down rules that are hard to infer from the code alone.
   - Mention important absences, such as layers that intentionally do not depend on each other.
   - Explain boundaries between layers or systems and why those boundaries matter.

5. End with cross-cutting concerns.
   - Capture concerns that affect multiple parts of the codebase.

## Practical writing cues

Questions worth answering in the final `ARCHITECTURE.md`:

- What are the major parts of the system?
- Where should someone look to change behavior X?
- Which boundaries matter most?
- Which invariants are easy to break if they are not written down?
- Which concerns cut across multiple modules?

## Useful line to keep in mind

> A codemap is a map of a country, not an atlas of maps of its states.

## What to avoid

- Low-level implementation detail
- Exhaustive file listings
- API-by-API walkthroughs
- Restating the `README` instead of describing the physical layout of the code
- Stale deep links that will need constant maintenance
