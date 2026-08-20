import assert from "node:assert/strict";
import { test } from "node:test";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import fastModeExtension, {
  FAST_MODE_STATUS_KEY,
  FAST_MODE_STATUS_VALUE,
  isSupportedModel,
  loadDefaultEnabled,
  shouldApplyFastMode,
  withFastServiceTier,
} from "../src/index.js";

type RegisteredCommand = {
  handler: (args: string, ctx: any) => void | Promise<void>;
};

type EventHandler = (event: any, ctx: any) => unknown;

function fakePi() {
  const commands = new Map<string, RegisteredCommand>();
  const handlers = new Map<string, EventHandler>();
  const pi = {
    registerCommand(name: string, command: RegisteredCommand) {
      commands.set(name, command);
    },
    on(name: string, handler: EventHandler) {
      handlers.set(name, handler);
    },
  } as unknown as ExtensionAPI;
  return { pi, commands, handlers };
}

test("supports only configured Codex models and matching requests", () => {
  const model = { provider: "openai-codex", id: "gpt-5.6-sol" };
  assert.equal(isSupportedModel(model), true);
  assert.equal(isSupportedModel({ provider: "openai-codex", id: "gpt-5.5" }), true);
  assert.equal(isSupportedModel({ provider: "openai-codex", id: "gpt-5.6-luna" }), true);
  assert.equal(isSupportedModel({ provider: "openai-codex", id: "gpt-5.6-terra" }), true);
  assert.equal(isSupportedModel({ provider: "openai", id: "gpt-5.6-sol" }), false);
  assert.equal(isSupportedModel({ provider: "openai-codex", id: "gpt-5.6" }), false);
  assert.equal(isSupportedModel({ provider: "openai-codex", id: "gpt-5.3-codex-spark" }), false);
  assert.equal(shouldApplyFastMode(model, { model: "gpt-5.6-sol" }), true);
  assert.equal(shouldApplyFastMode(model, { model: "gpt-5.6-terra" }), false);
  assert.deepEqual(
    withFastServiceTier({ model: "gpt-5.6-sol", stream: true }),
    { model: "gpt-5.6-sol", stream: true, service_tier: "priority" },
  );
});

test("reads only the enabled default from settings", () => {
  assert.equal(loadDefaultEnabled(() => JSON.stringify({
    "pi-gpt-fast-mode": { enabled: true },
  })), true);
  assert.equal(loadDefaultEnabled(() => JSON.stringify({
    "pi-gpt-fast-mode": { enabled: false },
  })), false);
  assert.equal(loadDefaultEnabled(() => "invalid json"), false);
});

test("starts from settings, publishes toggles, and patches requests", async () => {
  const { pi, commands, handlers } = fakePi();
  fastModeExtension(pi, () => true);

  assert.ok(commands.has("fast"));

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
  assert.deepEqual(statuses, [[FAST_MODE_STATUS_KEY, FAST_MODE_STATUS_VALUE]]);

  const request = { payload: { model: "gpt-5.6-sol" } };
  assert.deepEqual(
    handlers.get("before_provider_request")?.(request, ctx),
    { model: "gpt-5.6-sol", service_tier: "priority" },
  );

  await commands.get("fast")?.handler("", ctx);
  assert.deepEqual(statuses.at(-1), [FAST_MODE_STATUS_KEY, undefined]);
  assert.match(notifications.at(-1) ?? "", /disabled/);
  assert.equal(handlers.get("before_provider_request")?.(request, ctx), undefined);
});
