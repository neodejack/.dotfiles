import assert from "node:assert/strict";
import { test } from "node:test";
import type {
  ExtensionAPI,
  ExtensionContext,
  Theme,
} from "@earendil-works/pi-coding-agent";
import {
  visibleWidth,
  type EditorComponent,
  type KeybindingsManager,
  type TUI,
} from "@earendil-works/pi-tui";
import {
  applyCommandPaletteResult,
  BUILTIN_COMMANDS,
  commandPaletteItems,
  CommandPaletteOverlay,
  defaultCommandAction,
  registerCommandPaletteShortcut,
  registerPlannotatorLastShortcut,
  type CommandPaletteItem,
  type CommandPaletteResult,
} from "../src/command-palette.js";

function fakeTheme(): Theme {
  return {
    fg(_color: string, text: string) {
      return text;
    },
    bold(text: string) {
      return text;
    },
  } as Theme;
}

function fakeKeybindings(): KeybindingsManager {
  const bindings: Record<string, string[]> = {
    "tui.select.cancel": ["\x1b"],
    "tui.select.up": ["\x1b[A", "\x10"],
    "tui.select.down": ["\x1b[B", "\x0e"],
    "tui.select.pageUp": ["\x1b[5~"],
    "tui.select.pageDown": ["\x1b[6~"],
    "tui.select.confirm": ["\r"],
    "tui.input.tab": ["\t"],
    "tui.editor.deleteCharBackward": ["\x7f"],
    "tui.editor.deleteToLineStart": ["\x15"],
  };
  return {
    matches(data: string, action: string) {
      return (bindings[action] ?? []).includes(data);
    },
  } as KeybindingsManager;
}

function fakeEditor(): EditorComponent & {
  text: string;
  submitted: string[];
  submitValue(): void;
} {
  return {
    text: "",
    submitted: [],
    getText() {
      return this.text;
    },
    setText(text: string) {
      this.text = text;
    },
    submitValue() {
      this.submitted.push(this.text);
      this.text = "";
    },
    handleInput() {},
    invalidate() {},
    render() {
      return [];
    },
  };
}

test("includes built-ins, deduplicates conflicts, and excludes skills", () => {
  assert.ok(BUILTIN_COMMANDS.some((command) => command.name === "trust"));

  const pi = {
    getCommands: () => [
      {
        name: "review",
        description: "Review changes",
        source: "extension",
        sourceInfo: {},
      },
      {
        name: "model",
        description: "Conflicting dynamic command",
        source: "extension",
        sourceInfo: {},
      },
      {
        name: "skill:release",
        description: "Release workflow",
        source: "skill",
        sourceInfo: {},
      },
    ],
  } as unknown as ExtensionAPI;
  const items = commandPaletteItems(pi);

  assert.equal(items.filter((item) => item.name === "model").length, 1);
  assert.ok(items.some((item) => (
    item.name === "review" && item.source === "extension"
  )));
  assert.ok(!items.some((item) => item.name === "skill:release"));
});

test("uses native command-source semantics", () => {
  const item = (
    source: CommandPaletteItem["source"],
    name = "example",
  ): CommandPaletteItem => ({
    name,
    source,
  });

  assert.equal(defaultCommandAction(item("builtin")), "submit");
  assert.equal(defaultCommandAction(item("extension")), "submit");
  assert.equal(
    defaultCommandAction(item("extension", "fast")),
    "submit-preserving-prompt",
  );
  assert.equal(
    defaultCommandAction(item("extension", "plannotator-last")),
    "submit-preserving-prompt",
  );
  assert.equal(
    defaultCommandAction(item("extension", "plannotator-review")),
    "submit-preserving-prompt",
  );
  assert.equal(
    defaultCommandAction(item("prompt", "ship")),
    "submit-preserving-prompt",
  );
  assert.equal(
    defaultCommandAction(item("prompt", "ship-vm-service")),
    "submit-preserving-prompt",
  );
  assert.equal(defaultCommandAction(item("prompt")), "insert");
});

test("inserts editable commands and submits runnable commands", () => {
  const editor = fakeEditor();

  applyCommandPaletteResult(editor, {
    command: "release-notes",
    action: "insert",
  });
  assert.equal(editor.text, "/release-notes ");
  assert.deepEqual(editor.submitted, []);

  applyCommandPaletteResult(editor, { command: "settings", action: "submit" });
  assert.equal(editor.text, "");
  assert.deepEqual(editor.submitted, ["/settings"]);
});

test("runs prompt-preserving commands without replacing the current prompt", () => {
  for (const command of [
    "fast",
    "plannotator-last",
    "plannotator-review",
    "ship",
    "ship-vm-service",
  ]) {
    const editor = fakeEditor();
    const prompt = "Keep this long prompt\nincluding all of its details";
    editor.text = prompt;
    editor.onSubmit = (text) => {
      editor.submitted.push(text);
      editor.text = "";
    };

    applyCommandPaletteResult(editor, {
      command,
      action: "submit-preserving-prompt",
    });

    assert.deepEqual(editor.submitted, [`/${command}`]);
    assert.equal(editor.text, prompt);
  }
});

test("filters, uses configured Ctrl-N navigation, and returns the selection", () => {
  const results: Array<CommandPaletteResult | undefined> = [];
  let renders = 0;
  const overlay = new CommandPaletteOverlay(
    [
      { name: "alpha", source: "extension" },
      { name: "beta", source: "prompt" },
    ],
    "",
    { requestRender: () => { renders += 1; } } as TUI,
    fakeTheme(),
    fakeKeybindings(),
    (result) => results.push(result),
  );

  overlay.handleInput("b");
  overlay.handleInput("\r");
  assert.deepEqual(results, [{ command: "beta", action: "insert" }]);
  assert.ok(renders > 0);

  const navigated: Array<CommandPaletteResult | undefined> = [];
  const secondOverlay = new CommandPaletteOverlay(
    [
      { name: "alpha", source: "extension" },
      { name: "beta", source: "prompt" },
    ],
    "",
    { requestRender() {} } as TUI,
    fakeTheme(),
    fakeKeybindings(),
    (result) => navigated.push(result),
  );
  secondOverlay.handleInput("\x0e");
  secondOverlay.handleInput("\r");
  assert.deepEqual(navigated, [{ command: "beta", action: "insert" }]);
});

test("fuzzy-searches command names without matching descriptions or sources", () => {
  const items: CommandPaletteItem[] = [
    {
      name: "reload",
      description: "Refresh Pi resources",
      source: "builtin",
    },
    {
      name: "alpha",
      description: "Deploy to production",
      source: "extension",
    },
  ];
  const renderQuery = (query: string) => new CommandPaletteOverlay(
    items,
    query,
    { requestRender() {} } as TUI,
    fakeTheme(),
    fakeKeybindings(),
    () => {},
  ).render(72).join("\n");

  assert.match(renderQuery("rld"), /reload/);
  assert.match(renderQuery("production"), /No commands match/);
  assert.match(renderQuery("extension"), /No commands match/);
});

test("keeps multi-line descriptions inside fixed-width palette rows", () => {
  const overlay = new CommandPaletteOverlay(
    [{
      name: "review",
      description: "Review the diff\nwithout leaking into another row",
      source: "extension",
    }],
    "",
    { requestRender() {} } as TUI,
    fakeTheme(),
    fakeKeybindings(),
    () => {},
  );

  const lines = overlay.render(72);
  assert.ok(lines.every((line) => !line.includes("\n")));
  assert.ok(lines.every((line) => visibleWidth(line) === 72));
});

test("registers Ctrl-O and opens a centered overlay", async () => {
  let shortcut: {
    description?: string;
    handler: (ctx: ExtensionContext) => Promise<void> | void;
  } | undefined;
  let overlayOptions: {
    overlay: boolean;
    overlayOptions: unknown;
    onHandle: (handle: { focus(): void }) => void;
  } | undefined;
  const editor = fakeEditor();
  const pi = {
    registerShortcut(key: string, options: typeof shortcut) {
      assert.equal(key, "ctrl+o");
      shortcut = options;
    },
    getCommands: () => [],
  } as unknown as ExtensionAPI;

  registerCommandPaletteShortcut(pi, () => editor);
  assert.equal(shortcut?.description, "Open command palette");

  const ctx = {
    hasUI: true,
    ui: {
      async custom(
        _factory: unknown,
        options: typeof overlayOptions,
      ): Promise<CommandPaletteResult> {
        overlayOptions = options;
        return { command: "settings", action: "submit" };
      },
      notify() {},
    },
  } as unknown as ExtensionContext;

  await shortcut?.handler(ctx);

  assert.deepEqual(editor.submitted, ["/settings"]);
  assert.deepEqual(overlayOptions?.overlayOptions, {
    anchor: "center",
    width: "90%",
    minWidth: 42,
    maxHeight: "80%",
    margin: 1,
  });
  assert.equal(overlayOptions?.overlay, true);

  let focused = false;
  overlayOptions?.onHandle({ focus: () => { focused = true; } });
  assert.equal(focused, true);
});

test("registers Alt-L for plannotator-last and preserves the editor", () => {
  let shortcut: {
    description?: string;
    handler: (ctx: ExtensionContext) => Promise<void> | void;
  } | undefined;
  const editor = fakeEditor();
  editor.text = "Keep this draft";
  editor.onSubmit = (text) => {
    editor.submitted.push(text);
    editor.text = "";
  };
  const pi = {
    registerShortcut(key: string, options: typeof shortcut) {
      assert.equal(key, "alt+l");
      shortcut = options;
    },
  } as unknown as ExtensionAPI;

  registerPlannotatorLastShortcut(pi, () => editor);
  assert.equal(shortcut?.description, "Annotate the last assistant message");

  shortcut?.handler({
    hasUI: true,
    ui: { notify() {} },
  } as unknown as ExtensionContext);

  assert.deepEqual(editor.submitted, ["/plannotator-last"]);
  assert.equal(editor.text, "Keep this draft");
});
