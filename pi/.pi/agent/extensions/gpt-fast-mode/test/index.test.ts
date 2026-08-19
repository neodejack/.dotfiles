import assert from "node:assert/strict";
import { test } from "node:test";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import fastModeExtension, {
  FAST_MODE_STATUS_KEY,
  FAST_MODE_STATUS_VALUE,
  isSupportedModel,
  loadDefaultEnabled,
  loadShortcuts,
  normalizeShortcutSetting,
  shouldApplyFastMode,
  withFastServiceTier,
} from "../src/index.js";

type RegisteredCommand = {
  handler: (args: string, ctx: unknown) => Promise<void>;
};

type RegisteredShortcut = {
  handler: (ctx: unknown) => Promise<void>;
};

type EventHandler = (event: any, ctx: any) => unknown;

function fakePi() {
  const commands = new Map<string, RegisteredCommand>();
  const shortcuts = new Map<string, RegisteredShortcut>();
  const handlers = new Map<string, EventHandler>();
  const pi = {
    registerCommand(name: string, command: RegisteredCommand) {
      commands.set(name, command);
    },
    registerShortcut(name: string, shortcut: RegisteredShortcut) {
      shortcuts.set(name, shortcut);
    },
    on(name: string, handler: EventHandler) {
      handlers.set(name, handler);
    },
  } as unknown as ExtensionAPI;
  return { pi, commands, shortcuts, handlers };
}

function configOptions(config: Record<string, unknown>) {
  return {
    env: { PI_CODING_AGENT_DIR: "/config" },
    readFile: (path: string) => {
      if (path.endsWith("settings.json")) {
        return JSON.stringify(config.settings ?? {});
      }
      return JSON.stringify(config.keybindings ?? {});
    },
  };
}

test("recognizes supported models and patches only matching requests", () => {
  const model = { provider: "openai-codex", id: "gpt-5.6-sol" };
  assert.equal(isSupportedModel(model), true);
  assert.equal(isSupportedModel({ provider: "openai-codex", id: "gpt-5.3-codex-spark" }), false);
  assert.equal(shouldApplyFastMode(model, { model: "gpt-5.6-sol" }), true);
  assert.equal(shouldApplyFastMode(model, { model: "gpt-5.6-terra" }), false);
  assert.deepEqual(
    withFastServiceTier({ model: "gpt-5.6-sol", stream: true }),
    { model: "gpt-5.6-sol", stream: true, service_tier: "priority" },
  );
});

test("loads default state and configurable shortcuts", () => {
  const options = configOptions({
    settings: { "pi-gpt-fast-mode": { enabled: true } },
    keybindings: { "pi-gpt-fast-mode": ["ctrl+g", "enter", " "] },
  });
  assert.equal(loadDefaultEnabled(options), true);
  assert.deepEqual(loadShortcuts(options), ["ctrl+g"]);
  assert.deepEqual(normalizeShortcutSetting(undefined), ["ctrl+alt+m"]);
  assert.deepEqual(normalizeShortcutSetting(false), []);
});

test("publishes toggle state and applies it to subsequent requests", async () => {
  const { pi, commands, shortcuts, handlers } = fakePi();
  fastModeExtension(pi, configOptions({ settings: {}, keybindings: {} }));

  assert.ok(commands.has("fast"));
  assert.ok(shortcuts.has("ctrl+alt+m"));

  const statuses: Array<[string, string | undefined]> = [];
  const notifications: string[] = [];
  const ctx = {
    model: { provider: "openai-codex", id: "gpt-5.6-sol" },
    ui: {
      setStatus(key: string, value: string | undefined) {
        statuses.push([key, value]);
      },
      notify(message: string) {
        notifications.push(message);
      },
    },
  };

  handlers.get("session_start")?.({}, ctx);
  assert.deepEqual(statuses, [[FAST_MODE_STATUS_KEY, undefined]]);

  const request = { payload: { model: "gpt-5.6-sol" } };
  assert.equal(handlers.get("before_provider_request")?.(request, ctx), undefined);

  await commands.get("fast")?.handler("", ctx);
  assert.deepEqual(statuses.at(-1), [FAST_MODE_STATUS_KEY, FAST_MODE_STATUS_VALUE]);
  assert.match(notifications.at(-1) ?? "", /enabled/);
  assert.deepEqual(
    handlers.get("before_provider_request")?.(request, ctx),
    { model: "gpt-5.6-sol", service_tier: "priority" },
  );

  await shortcuts.get("ctrl+alt+m")?.handler(ctx);
  assert.deepEqual(statuses.at(-1), [FAST_MODE_STATUS_KEY, undefined]);
  assert.equal(handlers.get("before_provider_request")?.(request, ctx), undefined);
});
