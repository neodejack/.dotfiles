import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { test } from "node:test";
import type {
  Theme,
  ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import {
  createEditToolDefinition,
  initTheme,
} from "@earendil-works/pi-coding-agent";
import { Box, Text, type Component } from "@earendil-works/pi-tui";
import { StatusPrefixComponent } from "../src/status-component.js";
import {
  renderStatusIndicator,
  startIndicator,
  stopAllIndicators,
  stopIndicator,
  TOOL_BLINK_BLANK_MS,
  TOOL_BLINK_VISIBLE_MS,
  wrapToolDefinition,
  type TimerRegistry,
  type ToolRowState,
} from "../src/tool-renderer.js";

const ANSI_PATTERN = /\u001B(?:\[[0-?]*[ -/]*[@-~]|\][^\u0007\u001B]*(?:\u0007|\u001B\\))/g;

function plain(value: string): string {
  return value.replace(ANSI_PATTERN, "");
}

const theme = {
  fg(color: string, value: string) {
    const codes: Record<string, number> = {
      accent: 34,
      success: 32,
      error: 31,
      toolTitle: 37,
    };
    return `\u001b[${codes[color] ?? 0}m${value}\u001b[0m`;
  },
  bold(value: string) {
    return `\u001b[1m${value}\u001b[22m`;
  },
  bg(_color: string, value: string) {
    return `\u001b[49m${value}\u001b[49m`;
  },
} as Theme;

function renderFirstLine(component: Component, width = 80): string {
  return (component.render(width)[0] ?? "").trimEnd();
}

function context(
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    args: {},
    toolCallId: "call-1",
    invalidate() {},
    lastComponent: undefined,
    state: {},
    cwd: "/tmp",
    executionStarted: true,
    argsComplete: true,
    isPartial: true,
    expanded: false,
    showImages: true,
    isError: false,
    ...overrides,
  };
}

function fakeDefinition(
  name: "bash" | "read",
): ToolDefinition<any, any, any> {
  const execute = async () => ({
    content: [{ type: "text" as const, text: "native execution" }],
    details: { untouched: true },
  });

  return {
    name,
    label: name,
    description: `native ${name}`,
    parameters: {} as never,
    executionMode: "parallel",
    execute,
    renderCall(_args, _theme, renderContext) {
      const text = (renderContext.lastComponent as Text | undefined)
        ?? new Text("", 0, 0);
      text.setText(name === "bash" ? "$ echo native" : "read native.txt");
      return text;
    },
    renderResult(_result, _options, _theme, renderContext) {
      const text = (renderContext.lastComponent as Text | undefined)
        ?? new Text("", 0, 0);
      text.setText("native result");
      return text;
    },
  };
}

test("renders warm-white active markers and theme-red failures", () => {
  assert.match(
    renderStatusIndicator("succeeded", true, theme),
    /^\u001b\[38;2;240;233;224m■/,
  );
  assert.match(
    renderStatusIndicator("failed", true, theme),
    /^\u001b\[31m■/,
  );
  assert.match(
    renderStatusIndicator("running", true, theme),
    /^\u001b\[38;2;240;233;224m■/,
  );
  assert.equal(renderStatusIndicator("running", false, theme), " ");
});

test("uses the agreed fast-blank square blink cadence", () => {
  assert.equal(TOOL_BLINK_VISIBLE_MS, 300);
  assert.equal(TOOL_BLINK_BLANK_MS, 50);
});

test("prefix component replaces bash's native prompt and aligns continuation lines", () => {
  const inner: Component = {
    invalidate() {},
    render: () => [
      "\u001b[1m$ echo native\u001b[22m",
      "wrapped continuation",
    ],
  };
  const component = new StatusPrefixComponent(
    inner,
    () => "\u001b[31m$\u001b[0m",
    { stripFirstLinePrefix: "$ " },
  );
  const lines = component.render(80);

  assert.equal(plain(lines[0] ?? ""), "$ echo native");
  assert.equal(plain(lines[1] ?? ""), "  wrapped continuation");
});

test("prefix component compacts a self-rendered padded shell", () => {
  const inner = new Box(1, 1, (text) => `\u001b[42m${text}\u001b[49m`);
  inner.addChild(new Text("edit src/index.ts", 0, 0));
  const component = new StatusPrefixComponent(
    inner,
    () => "\u001b[32m■\u001b[0m",
    { compactPaddedShell: true },
  );

  assert.equal(
    plain(renderFirstLine(component)),
    "■ edit src/index.ts",
  );
});

test("bash uses the same blinking square and settled marker as other tools", () => {
  const timers: TimerRegistry = new Set();
  const wrapped = wrapToolDefinition(fakeDefinition("bash"), "bash", timers);
  const rendererState = {};
  const runningContext = context({ state: rendererState });

  const running = wrapped.renderCall?.({}, theme, runningContext as never);
  assert.ok(running);
  const runningText = plain(renderFirstLine(running));
  assert.match(runningText, /^■/);
  assert.match(runningText, /echo native$/);

  const settledContext = context({
    state: rendererState,
    isPartial: false,
    isError: false,
  });
  const settled = wrapped.renderCall?.({}, theme, settledContext as never);
  assert.ok(settled);
  assert.equal(plain(renderFirstLine(settled)), "■ echo native");
  assert.equal(timers.size, 0);
});

test("standard tools use a square colored by outcome", () => {
  const timers: TimerRegistry = new Set();
  const success = wrapToolDefinition(fakeDefinition("read"), "standard", timers);
  const successComponent = success.renderCall?.(
    {},
    theme,
    context({ isPartial: false, isError: false }) as never,
  );
  assert.ok(successComponent);
  assert.equal(
    plain(renderFirstLine(successComponent)),
    "■ read native.txt",
  );

  const failure = wrapToolDefinition(fakeDefinition("read"), "standard", timers);
  const failureComponent = failure.renderCall?.(
    {},
    theme,
    context({ isPartial: false, isError: true }) as never,
  );
  assert.ok(failureComponent);
  assert.equal(
    plain(renderFirstLine(failureComponent)),
    "■ read native.txt",
  );
});

test("built-in edit is compacted and receives the standard status styling", () => {
  const wrapped = wrapToolDefinition(
    createEditToolDefinition("/tmp"),
    "standard",
    new Set(),
  );
  const component = wrapped.renderCall?.(
    {
      path: "demo.txt",
      edits: [{ oldText: "before", newText: "after" }],
    },
    theme,
    context({
      cwd: "/tmp",
      isPartial: false,
      argsComplete: false,
    }) as never,
  );

  assert.ok(component);
  assert.equal(plain(renderFirstLine(component)), "■ edit demo.txt");
});

test("wrapper preserves execution metadata and delegates native result rendering", () => {
  const original = fakeDefinition("read");
  const timers: TimerRegistry = new Set();
  const wrapped = wrapToolDefinition(original, "standard", timers);
  const rendererContext = context({ isPartial: false });
  const result = {
    content: [{ type: "text" as const, text: "result" }],
    details: { untouched: true },
  };

  assert.equal(wrapped.execute, original.execute);
  assert.equal(wrapped.parameters, original.parameters);
  assert.equal(wrapped.description, original.description);
  assert.equal(wrapped.executionMode, original.executionMode);
  assert.equal(wrapped.renderShell, "self");

  const component = wrapped.renderResult?.(
    result,
    { expanded: false, isPartial: false },
    theme,
    rendererContext as never,
  );
  assert.ok(component);
  assert.equal(plain(renderFirstLine(component)), "native result");
});

test("wrapper preserves Pi's text-result fallback for tools without a result renderer", () => {
  const original = fakeDefinition("read");
  delete original.renderResult;
  const wrapped = wrapToolDefinition(original, "standard", new Set());
  const component = wrapped.renderResult?.(
    {
      content: [
        { type: "text" as const, text: "first" },
        { type: "text" as const, text: "second" },
      ],
      details: {},
    },
    { expanded: false, isPartial: false },
    theme,
    context({ isPartial: false }) as never,
  );

  assert.ok(component);
  assert.equal(plain(renderFirstLine(component)), "first");
  assert.equal(plain(component.render(80)[1] ?? "").trimEnd(), "second");
});

test("fallback renders numbered diff details from extension-provided edit tools", () => {
  initTheme("dark");
  const original = fakeDefinition("read");
  original.name = "edit";
  original.label = "edit";
  delete original.renderResult;
  const wrapped = wrapToolDefinition(original, "standard", new Set());
  const component = wrapped.renderResult?.(
    {
      content: [{ type: "text" as const, text: "Edited demo.txt." }],
      details: {
        diff: [
          " 9 unchanged",
          "-10 before",
          "+10 after",
          " 11 unchanged",
        ].join("\n"),
        firstChangedLine: 10,
      },
    },
    { expanded: false, isPartial: false },
    theme,
    context({
      args: { path: "demo.txt" },
      isPartial: false,
    }) as never,
  );

  assert.ok(component);
  const rendered = component.render(80).map((line) => plain(line).trimEnd());
  assert.deepEqual(rendered, [
    "Edited demo.txt.",
    "",
    " 9 unchanged",
    "-10 before",
    "+10 after",
    " 11 unchanged",
  ]);
});

test("indicator timer invalidates, stops, and is cleaned up idempotently", async () => {
  const timers: TimerRegistry = new Set();
  const state: ToolRowState = {
    phase: "running",
    indicatorVisible: true,
  };
  let invalidations = 0;

  startIndicator(state, () => {
    invalidations += 1;
  }, timers, 5);
  startIndicator(state, () => {
    invalidations += 100;
  }, timers, 5);

  await delay(22);
  assert.equal(timers.size, 1);
  assert.ok(invalidations >= 2);

  stopIndicator(state, timers);
  const stoppedAt = invalidations;
  await delay(12);
  assert.equal(invalidations, stoppedAt);
  assert.equal(timers.size, 0);

  stopIndicator(state, timers);
  stopAllIndicators(timers);
  assert.equal(timers.size, 0);
});
