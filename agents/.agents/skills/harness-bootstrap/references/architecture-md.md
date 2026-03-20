# ARCHITECTURE.md Reference

Use this reference when writing or revising `docs/ARCHITECTURE.md` in a repository.

Source:
- https://matklad.github.io/2021/02/06/ARCHITECTURE.md.html

## Purpose

An `ARCHITECTURE.md` helps contributors build a mental map of the codebase. The main value is not detailed documentation. The main value is reducing the time it takes to find where a change should happen.

## What to optimize for

- Keep it short enough that recurring contributors will actually read it.
- Describe structure that changes slowly.
- Do not try to mirror the full implementation.
- Revisit it occasionally instead of trying to keep every line synchronized with code.

## Recommended shape

1. Start with a bird's-eye overview.
   - State the problem the project solves.
   - Explain the major parts of the system at a high level.

2. Add a coarse codemap.
   - Describe the main modules or directories and how they relate.
   - Answer:
     - where does the thing that does X live?
     - what does this module or area generally do?
   - Keep the map coarse. It should feel like a country map, not a full atlas.

3. Name important entities.
   - Mention important files, modules, and types by name.
   - Prefer names over hard links so the document does not go stale quickly.
   - Encourage symbol search or file search to find the named entities.

4. Call out invariants and boundaries.
   - Document rules that are hard to infer from code.
   - Include important absences, for example layers that must not depend on each other.
   - Point out boundaries between systems or layers and explain what those boundaries protect.

5. End with cross-cutting concerns.
   - Capture concerns that affect multiple areas, such as error handling, state flow, caching, background jobs, observability, or extension points.

## What to avoid

- Low-level implementation details that belong in code or local module docs.
- Large API-by-API descriptions.
- Exhaustive file listings.
- Stale links to paths that will move.
- Restating the README instead of describing the physical layout of the code.

## Writing cues

Good prompts to answer in the document:

- What are the major parts of the system?
- Where should someone look to change behavior X?
- Which boundaries matter most?
- Which invariants are easy to break if they are not written down?
- What cross-cutting concerns affect several modules?
