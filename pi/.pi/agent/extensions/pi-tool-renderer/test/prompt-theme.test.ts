import assert from "node:assert/strict";
import { test } from "node:test";
import type {
  ExtensionContext,
  Theme,
} from "@earendil-works/pi-coding-agent";
import {
  createAmpPromptTheme,
  ensureAmpPromptTheme,
  isAmpPromptTheme,
} from "../src/prompt-theme.js";

function fakeTheme(name = "dark"): Theme {
  return {
    name,
    fg(color: string, text: string) {
      return `${this.name}:fg:${color}:${text}`;
    },
    bg(color: string, text: string) {
      return `${this.name}:bg:${color}:${text}`;
    },
    getFgAnsi(color: string) {
      return `fg:${color}`;
    },
    getBgAnsi(color: string) {
      return `bg:${color}`;
    },
    bold(text: string) {
      return `${this.name}:bold:${text}`;
    },
  } as Theme;
}

test("removes submitted-prompt and tool-status backgrounds", () => {
  const base = fakeTheme();
  const wrapped = createAmpPromptTheme(base);

  assert.equal(
    wrapped.fg("userMessageText", "hello"),
    "\u001b[38;5;2mhello\u001b[39m",
  );
  assert.equal(
    wrapped.bg("userMessageBg", "hello"),
    "\u001b[49mhello\u001b[49m",
  );
  assert.equal(wrapped.getFgAnsi("userMessageText"), "\u001b[38;5;2m");
  assert.equal(wrapped.getBgAnsi("userMessageBg"), "\u001b[49m");

  for (const color of [
    "toolPendingBg",
    "toolSuccessBg",
    "toolErrorBg",
  ] as const) {
    assert.equal(
      wrapped.bg(color, "tool"),
      "\u001b[49mtool\u001b[49m",
    );
    assert.equal(wrapped.getBgAnsi(color), "\u001b[49m");
  }

  assert.equal(wrapped.fg("accent", "hello"), "dark:fg:accent:hello");
  assert.equal(wrapped.bg("selectedBg", "hello"), "dark:bg:selectedBg:hello");
  assert.equal(wrapped.bold("hello"), "dark:bold:hello");
  assert.ok(isAmpPromptTheme(wrapped));
  assert.ok(!isAmpPromptTheme(base));
});

test("installs once and preserves the registered active theme as its base", () => {
  const base = fakeTheme("custom-purple");
  let active = base;
  let setCalls = 0;

  const ui = {
    get theme() {
      return active;
    },
    getTheme(name: string) {
      return name === base.name ? base : undefined;
    },
    setTheme(next: Theme | string) {
      assert.notEqual(typeof next, "string");
      active = next as Theme;
      setCalls += 1;
      return { success: true };
    },
  };
  const ctx = { ui } as unknown as ExtensionContext;

  ensureAmpPromptTheme(ctx);
  ensureAmpPromptTheme(ctx);

  assert.equal(setCalls, 1);
  assert.ok(isAmpPromptTheme(active));
  assert.equal(active.fg("border", "x"), "custom-purple:fg:border:x");
});

test("leaves unnamed in-memory themes unchanged", () => {
  const base = fakeTheme("");
  let setCalls = 0;
  const ctx = {
    ui: {
      theme: base,
      getTheme() {
        return undefined;
      },
      setTheme() {
        setCalls += 1;
        return { success: true };
      },
    },
  } as unknown as ExtensionContext;

  ensureAmpPromptTheme(ctx);
  assert.equal(setCalls, 0);
});
