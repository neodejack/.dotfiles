# Running indicator implementation plan

Status: implemented; automated verification passed on 2026-08-16

## Objective

Replace the running-state Braille spinner with a deterministic two-phase,
single-cell animation inspired by the supplied reference video:

1. Four `▁`/blank/`■`/blank cycles using a centered square.
2. Four horizontal-line positions chosen independently at random, with a
   blank frame between positions.

The animation starts at frame one for each tool, uses the active theme's
`accent` color, and loops until the tool settles. Success and failure markers
remain unchanged.

## Agreed visual contract

| State | Bash | Other tools |
| --- | --- | --- |
| Running | Accent animated indicator | Accent animated indicator |
| Success | Green `$` | Green `✓` |
| Failure | Red `$` | Red `×` |

Every animation glyph occupies exactly one terminal cell, so the native tool
call remains aligned and does not move horizontally.

### One loop

The renderer schedules each visual step for its own duration:

```text
blink cycle × 4             transition       random line blinks × 4     reset
▁ 300 ·50 ■ 300 ·50         · 300            ? 200 ·50                   · 200
└───── 700 ms each ─────┘   300 ms           250 ms each                 200 ms

? = independently sample one of ▁ (bottom), ─ (middle), or ▔ (top)
· = a blank one-cell frame
```

The complete loop lasts 4.3 seconds:

- 2.8 seconds of line/blank/block/blank cycles;
- 0.3 seconds of transition pause;
- 1.0 second of randomized line blinks;
- 0.2 seconds of loop pause.

Each bottom line and square remains visible for 300 ms. Each random line height
remains visible for 200 ms. Ordinary blanks last 50 ms, while the phase and
loop pauses remain 300 ms and 200 ms. Sampling does not exclude the current or
previous height, so adjacent line heights may intentionally repeat. A new set
of four heights is sampled for every loop.

Terminal cells cannot reproduce the reference video's continuous pixel-level
motion or opacity. Blank frames provide the portable, one-cell approximation
of its fade-out transitions.

## State-machine design

Create `src/running-indicator.ts` as a pure animation state machine. It owns:

- named glyph and timing constants;
- the current animation-step index;
- the four sampled jump heights for the current loop;
- construction of a fresh per-tool state;
- advancing by one visual step;
- returning the glyph and duration for the current step.

Inject a `random: () => number` dependency into state creation and cycle reset.
Production uses `Math.random`; tests provide fixed generators. Map random
values into the three allowed line glyphs without de-duplicating consecutive
results.

Keep timer ownership in `tool-renderer.ts`. Rename spinner-specific fields and
helpers to indicator terminology while preserving the current lifecycle:

```text
render running tool
  get or create that row's indicator state
  schedule one timeout using the current step's duration
  when it fires
    advance state
    schedule the next timeout
    invalidate the row

render settled tool / shut down session
  stop and unregister the timeout
  render the existing success or failure marker
```

Every tool row owns an independent state. A tool that starts later begins at
the first `▁` frame instead of joining another tool's position in the loop.

## File changes

```diff
 src/
-├── braille-spinner.ts       # randomized Braille cellular animation
+├── running-indicator.ts     # two-phase one-cell animation state machine
 └── tool-renderer.ts         # per-row timer, rendering, and settled markers

 test/
-├── braille-spinner.test.ts
+├── running-indicator.test.ts
 └── tool-renderer.test.ts

 README.md                    # describe the new running indicator
 IMPLEMENTATION_PLAN.md       # replace stale Braille/spinner terminology
```

No changes are needed in the tool interceptor, status-prefix component, theme
proxy, command palette, prompt chrome, or editor rendering.

## Implementation steps

1. Add the pure running-indicator state machine and constants.
2. Replace Braille state and glyph calls in `tool-renderer.ts`.
3. Rename `startSpinner`, `stopSpinner`, and `stopAllSpinners` to their
   indicator equivalents, including imports from `src/index.ts`.
4. Remove `braille-spinner.ts` after all production and test imports move to
   the new module.
5. Replace the Braille tests with deterministic sequence, timing, looping,
   randomness, and one-cell tests.
6. Update renderer timer tests and assertions for the new first frame.
7. Update the README and existing implementation notes.
8. Run automated checks and manually observe at least one tool that runs long
   enough to cross the loop boundary.

## Verification

### Automated

From `pi/.pi/agent/extensions/ui-tweak` run:

```sh
pnpm check
```

Tests must prove:

- a fresh state begins at the first `▁` frame;
- exactly four complete line/blank/block/blank cycles occur before the
  transition;
- visible, blink, transition, and loop steps have their specified durations;
- exactly four random line heights appear, each held for 200 ms and followed
  by a 50 ms blank;
- random sampling permits identical adjacent heights;
- a new set of line heights is sampled after the loop resets;
- every visible frame is one Unicode code point and one terminal cell wide;
- separate tool rows start from independent first-step states;
- only one timer is created per row;
- settlement and shutdown stop timers idempotently;
- running output uses `accent`, while settled markers retain existing colors
  and glyphs;
- native tool rendering and alignment remain unchanged.

### Manual smoke check

Start Pi with the extension and run a tool for longer than five seconds:

```sh
pnpm smoke
```

Confirm visually that the indicator performs four `▁`/blank/`■`/blank
cycles, pauses, shows four randomly positioned blinking lines, pauses, and
restarts from the first frame.
Also confirm that completing or failing the tool immediately replaces the
animation with its existing settled marker.

## Acceptance criteria

The change is complete when:

- the observed running indicator matches the agreed 4.3-second choreography;
- each tool starts at frame one and animates independently;
- four random line heights are generated per loop, with repeats allowed;
- no tool text shifts horizontally;
- settled-state behavior is unchanged;
- timer cleanup, type checking, and the full automated suite pass;
- documentation no longer describes the running indicator as Braille.
