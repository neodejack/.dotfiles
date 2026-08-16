import type {
  Theme,
  ToolDefinition,
  ToolRenderResultOptions,
} from "@earendil-works/pi-coding-agent";
import { renderDiff } from "@earendil-works/pi-coding-agent";
import {
  Container,
  Spacer,
  Text,
  type Component,
} from "@earendil-works/pi-tui";
import {
  advanceRunningIndicator,
  createRunningIndicator,
  runningIndicatorDuration,
  runningIndicatorGlyph,
  type RunningIndicatorState,
} from "./running-indicator.js";
import { StatusPrefixComponent } from "./status-component.js";

export type ToolFamily = "bash" | "standard";
export type ToolPhase = "running" | "succeeded" | "failed";
export type TimerRegistry = Set<ReturnType<typeof setTimeout>>;

export interface ToolRowState {
  phase: ToolPhase;
  indicator: RunningIndicatorState;
  timer?: ReturnType<typeof setTimeout>;
  nativeCallComponent?: Component;
  nativeResultComponent?: Component;
  wrappedCallComponent?: StatusPrefixComponent;
}

const ROW_STATE = Symbol("ui-tweak.tool-renderer-row-state");

type SharedRendererState = Record<PropertyKey, unknown> & {
  [ROW_STATE]?: ToolRowState;
};

type AnyToolDefinition = ToolDefinition<any, any, any>;
type RenderContext = Parameters<NonNullable<AnyToolDefinition["renderCall"]>>[2];

function getRowState(state: SharedRendererState): ToolRowState {
  state[ROW_STATE] ??= {
    phase: "running",
    indicator: createRunningIndicator(),
  };
  return state[ROW_STATE];
}

function nativeContext(
  context: RenderContext,
  lastComponent: Component | undefined,
): RenderContext {
  return {
    ...context,
    lastComponent,
  };
}

export function renderStatusIndicator(
  family: ToolFamily,
  phase: ToolPhase,
  glyph: string,
  theme: Theme,
): string {
  if (phase === "running") {
    return theme.fg("accent", glyph);
  }

  const marker = family === "bash" ? "$" : phase === "succeeded" ? "✓" : "×";
  return theme.fg(phase === "succeeded" ? "success" : "error", marker);
}

export function startIndicator(
  state: ToolRowState,
  invalidate: () => void,
  timers: TimerRegistry,
  durationOverrideMs?: number,
): void {
  if (state.timer) {
    return;
  }

  const durationMs = durationOverrideMs ?? runningIndicatorDuration(state.indicator);
  const timer = setTimeout(() => {
    timers.delete(timer);
    state.timer = undefined;
    state.indicator = advanceRunningIndicator(state.indicator);
    startIndicator(state, invalidate, timers, durationOverrideMs);
    invalidate();
  }, durationMs);
  timer.unref?.();
  state.timer = timer;
  timers.add(timer);
}

export function stopIndicator(
  state: ToolRowState,
  timers: TimerRegistry,
): void {
  if (!state.timer) {
    return;
  }

  clearTimeout(state.timer);
  timers.delete(state.timer);
  state.timer = undefined;
}

export function settleRow(
  state: ToolRowState,
  isError: boolean,
  timers: TimerRegistry,
): void {
  state.phase = isError ? "failed" : "succeeded";
  stopIndicator(state, timers);
}

export function stopAllIndicators(timers: TimerRegistry): void {
  for (const timer of timers) {
    clearTimeout(timer);
  }
  timers.clear();
}

function syncRowPhase(
  row: ToolRowState,
  context: RenderContext,
  timers: TimerRegistry,
): void {
  if (context.isPartial) {
    row.phase = "running";
    startIndicator(row, context.invalidate, timers);
    return;
  }

  settleRow(row, context.isError, timers);
}

function callNativeRenderer(
  original: AnyToolDefinition,
  args: unknown,
  theme: Theme,
  context: RenderContext,
  row: ToolRowState,
): Component {
  if (!original.renderCall) {
    return new Text(theme.fg("toolTitle", theme.bold(original.label)), 0, 0);
  }

  const component = original.renderCall(
    args,
    theme,
    nativeContext(context, row.nativeCallComponent),
  );
  row.nativeCallComponent = component;
  return component;
}

function callNativeResultRenderer(
  original: AnyToolDefinition,
  result: Parameters<NonNullable<AnyToolDefinition["renderResult"]>>[0],
  options: ToolRenderResultOptions,
  theme: Theme,
  context: RenderContext,
  row: ToolRowState,
): Component {
  if (!original.renderResult) {
    const output = result.content
      .filter((item) => item.type === "text")
      .map((item) => item.text)
      .join("\n");
    const details = result.details;
    const diff = details && typeof details === "object" && "diff" in details
      && typeof details.diff === "string" && details.diff.trim()
      ? details.diff
      : undefined;

    if (!diff) {
      return output
        ? new Text(theme.fg("toolOutput", output), 0, 0)
        : new Container();
    }

    const component = new Container();
    if (output) {
      component.addChild(new Text(theme.fg("toolOutput", output), 0, 0));
      component.addChild(new Spacer(1));
    }
    const args = context.args as Record<string, unknown> | undefined;
    const filePath = typeof args?.path === "string" ? args.path : undefined;
    component.addChild(new Text(renderDiff(diff, { filePath }), 0, 0));
    return component;
  }

  const component = original.renderResult(
    result,
    options,
    theme,
    nativeContext(context, row.nativeResultComponent),
  );
  row.nativeResultComponent = component;
  return component;
}

export function wrapToolDefinition(
  original: AnyToolDefinition,
  family: ToolFamily,
  timers: TimerRegistry,
): ToolDefinition<any, any, SharedRendererState> {
  return {
    ...original,
    renderShell: "self",
    renderCall(args, theme, context) {
      const row = getRowState(context.state);
      syncRowPhase(row, context, timers);
      const nativeComponent = callNativeRenderer(original, args, theme, context, row);
      const getPrefix = () =>
        renderStatusIndicator(
          family,
          row.phase,
          runningIndicatorGlyph(row.indicator),
          theme,
        );

      if (!row.wrappedCallComponent) {
        row.wrappedCallComponent = new StatusPrefixComponent(
          nativeComponent,
          getPrefix,
          family === "bash"
            ? { stripFirstLinePrefix: "$ " }
            : { compactPaddedShell: original.renderShell === "self" },
        );
      } else {
        row.wrappedCallComponent.setInner(nativeComponent);
      }

      return row.wrappedCallComponent;
    },
    renderResult(result, options, theme, context) {
      const row = getRowState(context.state);
      if (!options.isPartial) {
        settleRow(row, context.isError, timers);
      }
      return callNativeResultRenderer(
        original,
        result,
        options,
        theme,
        context,
        row,
      );
    },
  };
}
