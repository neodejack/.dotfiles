import assert from "node:assert/strict";
import { test } from "node:test";
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { visibleWidth, type EditorComponent } from "@earendil-works/pi-tui";
import {
  createRoundedEditorFactory,
  decorateEditorRender,
  frameEditorLines,
  installRoundedEditor,
  whiteBorder,
} from "../src/rounded-editor.js";

const ANSI_PATTERN = /\u001B\[[0-?]*[ -/]*[@-~]/g;

function plain(value: string): string {
  return value.replace(ANSI_PATTERN, "");
}

function purple(text: string): string {
  return `\u001b[35m${text}\u001b[39m`;
}

function fakeEditor(render: (width: number) => string[]): EditorComponent {
  return {
    borderColor: purple,
    getText: () => "",
    setText() {},
    handleInput() {},
    invalidate() {},
    render,
  };
}

test("adds rounded corners and vertical borders at the requested width", () => {
  const lines = frameEditorLines(
    [purple("────"), "hi  ", purple("────")],
    6,
    purple,
  );

  assert.deepEqual(lines.map(plain), [
    "╭────╮",
    "│hi  │",
    "╰────╯",
  ]);
  assert.ok(lines.every((line) => visibleWidth(line) === 6));
});

test("keeps autocomplete rows outside the frame and aligned with its content", () => {
  const lines = frameEditorLines(
    ["──────", "query ", "──────", "option"],
    8,
    purple,
  );

  assert.deepEqual(lines.map(plain), [
    "╭──────╮",
    "│query │",
    "╰──────╯",
    " option ",
  ]);
  assert.ok(lines.every((line) => visibleWidth(line) === 8));
});

test("embeds labels into the right side of white borders", () => {
  const lines = frameEditorLines(
    ["──────────────────", "content           ", "──────────────────"],
    20,
    whiteBorder,
    { top: "5k tok", bottom: "~/repo" },
  );

  assert.equal(plain(lines[0] ?? ""), "╭───────── 5k tok ─╮");
  assert.equal(plain(lines[2] ?? ""), "╰───────── ~/repo ─╯");
  assert.match(lines[0] ?? "", /\u001b\[38;5;15m╭/);
  assert.match(lines[2] ?? "", /\u001b\[38;5;15m╯/);
});

test("recognizes a scrolling bottom border", () => {
  const lines = frameEditorLines(
    ["────────────────", "visible content ", "─── ↓ 2 more ───", "suggestion      "],
    18,
    purple,
  );

  assert.equal(plain(lines[2] ?? "")[0], "╰");
  assert.equal(plain(lines[3] ?? "")[0], " ");
});

test("decorates the existing editor in place and reserves two columns", () => {
  const widths: number[] = [];
  const editor = fakeEditor((width) => {
    widths.push(width);
    return ["─".repeat(width), "x".padEnd(width), "─".repeat(width)];
  });

  const decorated = decorateEditorRender(editor, purple);
  const redecorated = decorateEditorRender(editor, purple);
  const lines = decorated.render(12);

  assert.equal(decorated, editor);
  assert.equal(redecorated, editor);
  assert.deepEqual(widths, [10]);
  assert.equal(plain(lines[0] ?? ""), "╭──────────╮");
  assert.equal(plain(lines[1] ?? ""), "│x         │");
  assert.equal(plain(lines[2] ?? ""), "╰──────────╯");
  assert.match(lines[0] ?? "", /\u001b\[38;5;15m╭/);
});

test("composes with a previous editor factory and installs idempotently", () => {
  const editor = fakeEditor((width) => [
    "─".repeat(width),
    "x".padEnd(width),
    "─".repeat(width),
  ]);
  let previousCalls = 0;
  const previous = (() => {
    previousCalls += 1;
    return editor;
  }) as NonNullable<ReturnType<ExtensionContext["ui"]["getEditorComponent"]>>;
  let current = previous;
  let setCalls = 0;
  const ctx = {
    ui: {
      getEditorComponent() {
        return current;
      },
      setEditorComponent(factory: typeof current) {
        current = factory;
        setCalls += 1;
      },
    },
  } as unknown as ExtensionContext;

  installRoundedEditor(ctx);
  installRoundedEditor(ctx);

  const factory = current ?? createRoundedEditorFactory(previous);
  const created = factory(
    {} as never,
    { borderColor: purple } as never,
    {} as never,
  );

  assert.equal(setCalls, 1);
  assert.equal(previousCalls, 1);
  assert.equal(created, editor);
  assert.equal(plain(created.render(8)[0] ?? ""), "╭──────╮");
});
