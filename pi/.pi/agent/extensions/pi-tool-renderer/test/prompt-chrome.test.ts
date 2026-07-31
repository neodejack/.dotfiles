import assert from "node:assert/strict";
import { test } from "node:test";
import type {
  ExtensionContext,
  ReadonlyFooterDataProvider,
  Theme,
} from "@earendil-works/pi-coding-agent";
import type { TUI } from "@earendil-works/pi-tui";
import {
  StatusOnlyFooter,
  buildPromptBorderLabels,
  createPromptChromeState,
  formatCwd,
  formatTokens,
  getCurrentContextTokens,
  truncateLeftToWidth,
  updatePromptChromeContext,
} from "../src/prompt-chrome.js";

function fakeTheme(): Theme {
  return {
    fg(_color: string, text: string) {
      return text;
    },
  } as unknown as Theme;
}

function fakeContext(): ExtensionContext {
  const theme = fakeTheme();
  return {
    ui: { theme },
    model: { id: "gpt-5.6-sol", reasoning: true },
    thinkingLevel: "high",
    sessionManager: {
      getCwd: () => "/Users/zili/code/personal/.dotfiles",
    },
    getContextUsage: () => ({
      tokens: 5_500,
      contextWindow: 272_000,
      percent: 2,
    }),
  } as unknown as ExtensionContext;
}

test("reads the current context token count", () => {
  assert.equal(getCurrentContextTokens(fakeContext()), 5_500);
});

test("formats compact token counts and home-relative directories", () => {
  assert.equal(formatTokens(999), "999");
  assert.equal(formatTokens(5_500), "5.5k");
  assert.equal(formatTokens(31_000), "31k");
  assert.equal(formatTokens(1_500_000), "1.5M");
  assert.equal(
    formatCwd("/Users/zili/code/personal/.dotfiles", "/Users/zili"),
    "~/code/personal/.dotfiles",
  );
  assert.equal(formatCwd("/private/tmp/probe", "/Users/zili"), "/private/tmp/probe");
});

test("left-truncates paths so project and branch information survive", () => {
  assert.equal(truncateLeftToWidth("~/code/personal/.dotfiles (master)", 20), "...dotfiles (master)");
  assert.equal(truncateLeftToWidth("short", 20), "short");
  assert.equal(truncateLeftToWidth("abcdef", 3), "...");
});

test("builds full and responsive prompt-border labels", () => {
  const ctx = fakeContext();
  const state = createPromptChromeState();
  state.footerData = {
    getGitBranch: () => "master",
  } as ReadonlyFooterDataProvider;
  updatePromptChromeContext(state, ctx);

  const wide = buildPromptBorderLabels(state, 100);
  assert.equal(
    wide.top,
    "5.5k tok ─ gpt-5.6-sol • high",
  );
  assert.equal(wide.bottom, "~/code/personal/.dotfiles (master)");

  const medium = buildPromptBorderLabels(state, 27);
  assert.ok(medium.top);
  assert.match(medium.top, /^5\.5k tok/);
  assert.ok((medium.top?.length ?? 0) < (wide.top?.length ?? 0));

  const narrow = buildPromptBorderLabels(state, 10);
  assert.equal(narrow.top, undefined);
  assert.equal(narrow.bottom, undefined);
});

test("status-only footer preserves sorted extension statuses and branch updates", () => {
  let branchListener: (() => void) | undefined;
  let unsubscribed = false;
  let renders = 0;
  const footerData = {
    getGitBranch: () => "master",
    getExtensionStatuses: () => new Map([
      ["stash", "stash:2"],
      ["mcp", "MCP: 1 server enabled"],
    ]),
    getAvailableProviderCount: () => 1,
    onBranchChange(listener: () => void) {
      branchListener = listener;
      return () => {
        unsubscribed = true;
      };
    },
  } satisfies ReadonlyFooterDataProvider;
  const tui = {
    requestRender() {
      renders += 1;
    },
  } as unknown as TUI;
  const state = createPromptChromeState();
  const footer = new StatusOnlyFooter(state, footerData, fakeTheme(), tui);

  assert.deepEqual(footer.render(80), ["MCP: 1 server enabled stash:2"]);
  branchListener?.();
  assert.equal(renders, 1);

  footer.dispose();
  assert.ok(unsubscribed);
  assert.equal(state.footerData, undefined);
  assert.equal(state.requestRender, undefined);
});
