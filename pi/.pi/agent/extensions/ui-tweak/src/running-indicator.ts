export const BLINK_CYCLE_COUNT = 4;
export const JUMP_COUNT = 4;

export const BLINK_VISIBLE_MS = 300;
export const BLINK_BLANK_MS = 50;
export const TRANSITION_PAUSE_MS = 300;
export const JUMP_VISIBLE_MS = 200;
export const JUMP_BLANK_MS = 50;
export const LOOP_PAUSE_MS = 200;

export const JUMP_GLYPHS = ["▁", "─", "▔"] as const;
export type JumpGlyph = (typeof JUMP_GLYPHS)[number];

const BLINK_CYCLE_STEPS = 4;
const BLINK_PHASE_STEPS = BLINK_CYCLE_STEPS * BLINK_CYCLE_COUNT;
const TRANSITION_STEP = BLINK_PHASE_STEPS;
const JUMP_PHASE_START = TRANSITION_STEP + 1;
const JUMP_SLOT_STEPS = 2;
const JUMP_PHASE_STEPS = JUMP_COUNT * JUMP_SLOT_STEPS;
const LOOP_PAUSE_STEP = JUMP_PHASE_START + JUMP_PHASE_STEPS;

export const RUNNING_INDICATOR_STEP_COUNT = LOOP_PAUSE_STEP + 1;

export interface RunningIndicatorState {
  step: number;
  jumpGlyphs: JumpGlyph[];
}

function sampleJumpGlyph(random: () => number): JumpGlyph {
  const sample = random();
  const index = Math.max(
    0,
    Math.min(JUMP_GLYPHS.length - 1, Math.floor(sample * JUMP_GLYPHS.length)),
  );
  return JUMP_GLYPHS[index] ?? JUMP_GLYPHS[0];
}

function sampleJumpGlyphs(random: () => number): JumpGlyph[] {
  return Array.from({ length: JUMP_COUNT }, () => sampleJumpGlyph(random));
}

export function createRunningIndicator(
  random: () => number = Math.random,
): RunningIndicatorState {
  return {
    step: 0,
    jumpGlyphs: sampleJumpGlyphs(random),
  };
}

export function advanceRunningIndicator(
  state: RunningIndicatorState,
  random: () => number = Math.random,
): RunningIndicatorState {
  const step = (state.step + 1) % RUNNING_INDICATOR_STEP_COUNT;
  return {
    step,
    jumpGlyphs: step === 0 ? sampleJumpGlyphs(random) : state.jumpGlyphs,
  };
}

export function runningIndicatorGlyph(state: RunningIndicatorState): string {
  if (state.step < BLINK_PHASE_STEPS) {
    const cycleStep = state.step % BLINK_CYCLE_STEPS;
    if (cycleStep === 0) return "▁";
    if (cycleStep === 2) return "■";
    return " ";
  }

  if (state.step === TRANSITION_STEP) {
    return " ";
  }

  const jumpStep = state.step - JUMP_PHASE_START;
  if (jumpStep < JUMP_PHASE_STEPS) {
    if (jumpStep % JUMP_SLOT_STEPS === 1) {
      return " ";
    }
    const jumpIndex = Math.floor(jumpStep / JUMP_SLOT_STEPS);
    return state.jumpGlyphs[jumpIndex] ?? JUMP_GLYPHS[0];
  }

  return " ";
}

export function runningIndicatorDuration(state: RunningIndicatorState): number {
  if (state.step < BLINK_PHASE_STEPS) {
    return state.step % BLINK_CYCLE_STEPS % 2 === 0
      ? BLINK_VISIBLE_MS
      : BLINK_BLANK_MS;
  }

  if (state.step === TRANSITION_STEP) {
    return TRANSITION_PAUSE_MS;
  }

  const jumpStep = state.step - JUMP_PHASE_START;
  if (jumpStep < JUMP_PHASE_STEPS) {
    return jumpStep % JUMP_SLOT_STEPS === 0
      ? JUMP_VISIBLE_MS
      : JUMP_BLANK_MS;
  }

  return LOOP_PAUSE_MS;
}
