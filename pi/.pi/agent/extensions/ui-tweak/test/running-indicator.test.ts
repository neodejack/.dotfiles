import assert from "node:assert/strict";
import { test } from "node:test";
import { visibleWidth } from "@earendil-works/pi-tui";
import {
  advanceRunningIndicator,
  BLINK_BLANK_MS,
  BLINK_CYCLE_COUNT,
  BLINK_VISIBLE_MS,
  createRunningIndicator,
  createWorkingIndicatorFrames,
  JUMP_BLANK_MS,
  JUMP_GLYPHS,
  JUMP_VISIBLE_MS,
  LOOP_PAUSE_MS,
  RUNNING_INDICATOR_STEP_COUNT,
  runningIndicatorDuration,
  runningIndicatorGlyph,
  TRANSITION_PAUSE_MS,
  WORKING_INDICATOR_INTERVAL_MS,
} from "../src/running-indicator.js";

function repeatingRandom(values: readonly number[]): () => number {
  let index = 0;
  return () => {
    const value = values[index % values.length];
    index += 1;
    return value ?? 0;
  };
}

interface RenderedStep {
  glyph: string;
  durationMs: number;
}

function renderLoop(
  state = createRunningIndicator(() => 0),
): RenderedStep[] {
  const steps: RenderedStep[] = [];
  let current = state;
  for (let index = 0; index < RUNNING_INDICATOR_STEP_COUNT; index += 1) {
    steps.push({
      glyph: runningIndicatorGlyph(current),
      durationMs: runningIndicatorDuration(current),
    });
    current = advanceRunningIndicator(current, () => 0);
  }
  return steps;
}

test("renders four fast-blinking line and centered-square cycles", () => {
  const steps = renderLoop();
  const expectedCycle: RenderedStep[] = [
    { glyph: "▁", durationMs: BLINK_VISIBLE_MS },
    { glyph: " ", durationMs: BLINK_BLANK_MS },
    { glyph: "■", durationMs: BLINK_VISIBLE_MS },
    { glyph: " ", durationMs: BLINK_BLANK_MS },
  ];

  assert.deepEqual(
    steps.slice(0, expectedCycle.length * BLINK_CYCLE_COUNT),
    Array.from({ length: BLINK_CYCLE_COUNT }, () => expectedCycle).flat(),
  );
  assert.equal(steps[0]?.glyph, "▁");
});

test("preserves visible durations and shortens only ordinary blank steps", () => {
  const state = createRunningIndicator(
    repeatingRandom([0, 0.4, 0.9, 1]),
  );
  const steps = renderLoop(state);
  const jumpStart = BLINK_CYCLE_COUNT * 4 + 1;
  const jumpEnd = jumpStart + 8;

  assert.deepEqual(steps[jumpStart - 1], {
    glyph: " ",
    durationMs: TRANSITION_PAUSE_MS,
  });
  assert.deepEqual(steps.slice(jumpStart, jumpEnd), [
    { glyph: "▁", durationMs: JUMP_VISIBLE_MS },
    { glyph: " ", durationMs: JUMP_BLANK_MS },
    { glyph: "─", durationMs: JUMP_VISIBLE_MS },
    { glyph: " ", durationMs: JUMP_BLANK_MS },
    { glyph: "▔", durationMs: JUMP_VISIBLE_MS },
    { glyph: " ", durationMs: JUMP_BLANK_MS },
    { glyph: "▔", durationMs: JUMP_VISIBLE_MS },
    { glyph: " ", durationMs: JUMP_BLANK_MS },
  ]);
  assert.deepEqual(steps[jumpEnd], {
    glyph: " ",
    durationMs: LOOP_PAUSE_MS,
  });
  assert.equal(steps.length, RUNNING_INDICATOR_STEP_COUNT);
  assert.equal(RUNNING_INDICATOR_STEP_COUNT, 26);
  assert.equal(
    steps.reduce((total, step) => total + step.durationMs, 0),
    4_300,
  );
});

test("allows repeated random jump heights", () => {
  const state = createRunningIndicator(() => 0.5);

  assert.deepEqual(state.jumpGlyphs, ["─", "─", "─", "─"]);
});

test("samples a fresh set of four jump heights after each loop", () => {
  const random = repeatingRandom([
    0, 0, 0, 0,
    0.9, 0.9, 0.9, 0.9,
  ]);
  let state = createRunningIndicator(random);
  assert.deepEqual(state.jumpGlyphs, ["▁", "▁", "▁", "▁"]);

  for (let index = 0; index < RUNNING_INDICATOR_STEP_COUNT; index += 1) {
    state = advanceRunningIndicator(state, random);
  }

  assert.equal(state.step, 0);
  assert.deepEqual(state.jumpGlyphs, ["▔", "▔", "▔", "▔"]);
});

test("uses only single-code-point, one-cell visible animation glyphs", () => {
  const visibleGlyphs = new Set(["▁", "■", ...JUMP_GLYPHS]);

  for (const glyph of visibleGlyphs) {
    assert.equal([...glyph].length, 1);
    assert.equal(visibleWidth(glyph), 1);
  }
});

test("expands variable-duration steps into uniform working-indicator frames", () => {
  const frames = createWorkingIndicatorFrames(
    (glyph) => `<accent>${glyph}</accent>`,
    repeatingRandom([0, 0.4, 0.9, 1]),
    1,
  );

  assert.deepEqual(frames.slice(0, 14), [
    ...Array(6).fill("<accent>▁</accent>"),
    "<accent> </accent>",
    ...Array(6).fill("<accent>■</accent>"),
    "<accent> </accent>",
  ]);
  assert.equal(
    frames.length * WORKING_INDICATOR_INTERVAL_MS,
    4_300,
  );
});

test("precomputed working-indicator loops resample jump heights", () => {
  const frames = createWorkingIndicatorFrames(
    undefined,
    repeatingRandom([
      0, 0, 0, 0,
      0.9, 0.9, 0.9, 0.9,
    ]),
    2,
  );
  const framesPerLoop = 4_300 / WORKING_INDICATOR_INTERVAL_MS;
  const jumpOffset = (BLINK_CYCLE_COUNT * 700 + TRANSITION_PAUSE_MS)
    / WORKING_INDICATOR_INTERVAL_MS;

  assert.equal(frames[jumpOffset], "▁");
  assert.equal(frames[framesPerLoop + jumpOffset], "▔");
});
