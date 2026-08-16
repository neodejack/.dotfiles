# Running indicator implementation plan

Status: implemented; automated verification passed on 2026-08-16

## Objective

Use a deterministic two-phase, single-cell animation inspired by the supplied
reference video for Pi's streaming `Working...` row:

1. Four `▁`/blank/`■`/blank cycles using a centered square.
2. Four horizontal-line positions chosen independently at random, with a
   blank frame between positions.

The Working animation starts at frame one, uses `#F0E9E0`, and loops while Pi
streams. Tool rows use a separate, simpler square blink.

## Agreed visual contract

| Scope/state | Indicator |
| --- | --- |
| Working | Full `#F0E9E0` animation |
| Tool running | Independent `#F0E9E0` `■` for 300 ms, blank for 50 ms |
| Tool success | Static `#F0E9E0` `■` |
| Tool failure | Static theme-error red `■` |

Every animation glyph and tool blank occupies exactly one terminal cell, so
the native tool call remains aligned and does not move horizontally.

### One loop

The Working indicator expands each visual step into 50 ms frames:

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

`src/running-indicator.ts` is the pure Working animation state machine. It owns:

- named glyph and timing constants;
- the current animation-step index;
- the four sampled jump heights for the current loop;
- construction of fresh precomputed Working loops;
- advancing by one visual step;
- returning the glyph and duration for the current step.

Inject a `random: () => number` dependency into state creation and cycle reset.
Production uses `Math.random`; tests provide fixed generators. Map random
values into the three allowed line glyphs without de-duplicating consecutive
results.

Keep the simpler tool blink timer in `tool-renderer.ts`:

```text
render running tool
  start that row with a visible square
  schedule 300 ms visible and 50 ms blank timeouts
  when it fires
    toggle square visibility
    schedule the next timeout
    invalidate the row

render settled tool / shut down session
  stop and unregister the timeout
  render the static warm-white success or theme-red failure square
```

Every tool row owns an independent state. A tool that starts later begins with
its own visible `■` instead of joining another tool's blink phase.

## File changes

```diff
 src/
+├── colors.ts                # shared #F0E9E0 ANSI foreground
+├── index.ts                 # install the custom Working indicator
+├── running-indicator.ts     # full Working animation state machine
+└── tool-renderer.ts         # independent square blink and settled markers

 test/
+├── interceptor.test.ts      # Working indicator integration
+├── running-indicator.test.ts
+└── tool-renderer.test.ts

 README.md                    # describe the new running indicator
 IMPLEMENTATION_PLAN.md       # replace stale Braille/spinner terminology
```

No changes are needed in the tool interceptor, status-prefix component, theme
proxy, command palette, prompt chrome, or editor rendering.

## Implementation steps

1. Keep the pure full-animation state machine for the Working row.
2. Expand its variable durations into the 50 ms frames required by
   `ctx.ui.setWorkingIndicator`.
3. Apply the shared `#F0E9E0` foreground to every visible Working frame.
4. Replace each tool's full animation state with an independent square toggle.
5. Use the shared warm white for running and success, and theme error red for
   failure.
6. Update deterministic sequence, color, cadence, integration, and cleanup
   tests.
7. Update the README and implementation notes.

## Verification

### Automated

From `pi/.pi/agent/extensions/ui-tweak` run:

```sh
pnpm check
```

Tests must prove:

- the Working row begins at the first `▁` frame in `#F0E9E0`;
- exactly four complete line/blank/block/blank cycles occur before the
  transition;
- visible, blink, transition, and loop steps have their specified durations;
- exactly four random line heights appear, each held for 200 ms and followed
  by a 50 ms blank;
- random sampling permits identical adjacent heights;
- a new set of line heights is sampled after the loop resets;
- every visible frame is one Unicode code point and one terminal cell wide;
- separate tool rows start with independent visible squares;
- tool squares remain visible for 300 ms and blank for 50 ms;
- running and successful tools use `#F0E9E0`;
- failed tools use the theme's error red;
- only one timer is created per row;
- settlement and shutdown stop timers idempotently;
- native tool rendering and alignment remain unchanged.

### Manual smoke check

Start Pi with the extension, observe a Working row for longer than five
seconds, and run a tool long enough to blink:

```sh
pnpm smoke
```

Confirm visually that the Working indicator performs four
`▁`/blank/`■`/blank
cycles, pauses, shows four randomly positioned blinking lines, pauses, and
restarts from the first frame. Confirm that a running tool shows only a blinking
square and that success or failure immediately replaces it with the agreed
steady square.

## Acceptance criteria

The change is complete when:

- the Working indicator matches the agreed 4.3-second choreography;
- each tool starts with a visible square and blinks independently;
- four random Working line heights are generated per loop, with repeats
  allowed;
- no tool text shifts horizontally;
- successful tools settle to warm white and failed tools settle to theme red;
- timer cleanup, type checking, and the full automated suite pass;
- documentation no longer describes the running indicator as Braille.
