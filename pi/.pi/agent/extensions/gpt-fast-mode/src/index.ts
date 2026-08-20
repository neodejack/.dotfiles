import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  getAgentDir,
  type ExtensionAPI,
  type ExtensionContext,
} from "@earendil-works/pi-coding-agent";

export const SUPPORTED_MODELS = new Set([
  "openai-codex/gpt-5.5",
  "openai-codex/gpt-5.6-luna",
  "openai-codex/gpt-5.6-sol",
  "openai-codex/gpt-5.6-terra",
]);
export const FAST_SERVICE_TIER = "priority";
export const CONFIG_FIELD = "pi-gpt-fast-mode";
export const FAST_MODE_STATUS_KEY = "gpt-fast-mode";
export const FAST_MODE_STATUS_VALUE = "enabled";

type PiModel = { provider?: string; id?: string };
type ProviderPayload = Record<string, unknown>;
type ReadTextFile = (path: string, encoding: "utf8") => string;

export function modelKey(model: PiModel): string {
  return `${model.provider}/${model.id}`;
}

export function isSupportedModel(model: PiModel | undefined): boolean {
  if (!model?.provider || !model.id) {
    return false;
  }
  return SUPPORTED_MODELS.has(modelKey(model));
}

export function shouldApplyFastMode(
  model: PiModel | undefined,
  payload: unknown,
): boolean {
  if (!payload || typeof payload !== "object") {
    return false;
  }
  const requestModel = (payload as ProviderPayload).model;
  return isSupportedModel(model) && requestModel === model?.id;
}

export function withFastServiceTier(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") {
    return payload;
  }
  return {
    ...(payload as ProviderPayload),
    service_tier: FAST_SERVICE_TIER,
  };
}

export function loadDefaultEnabled(
  readFile: ReadTextFile = readFileSync,
): boolean {
  try {
    const settings = JSON.parse(
      readFile(join(getAgentDir(), "settings.json"), "utf8"),
    ) as Record<string, unknown>;
    const config = settings[CONFIG_FIELD];
    return !!config
      && typeof config === "object"
      && !Array.isArray(config)
      && (config as { enabled?: unknown }).enabled === true;
  } catch {
    return false;
  }
}

function publishStatus(ctx: ExtensionContext, enabled: boolean): void {
  ctx.ui.setStatus(
    FAST_MODE_STATUS_KEY,
    enabled ? FAST_MODE_STATUS_VALUE : undefined,
  );
}

function announceState(ctx: ExtensionContext, enabled: boolean): void {
  if (!enabled) {
    ctx.ui.notify("GPT Fast mode disabled.");
    return;
  }

  if (isSupportedModel(ctx.model)) {
    ctx.ui.notify(
      `GPT Fast mode enabled (service_tier: ${FAST_SERVICE_TIER}).`,
    );
    return;
  }

  const model = ctx.model;
  const modelLabel = model?.provider && model.id
    ? modelKey(model)
    : "unknown model";
  ctx.ui.notify(
    `GPT Fast mode enabled, but ${modelLabel} is not supported.`,
    "warning",
  );
}

export default function fastModeExtension(
  pi: ExtensionAPI,
  getDefaultEnabled: () => boolean = loadDefaultEnabled,
): void {
  let enabled = getDefaultEnabled();

  function toggle(ctx: ExtensionContext): void {
    enabled = !enabled;
    publishStatus(ctx, enabled);
    announceState(ctx, enabled);
  }

  pi.registerCommand("fast", {
    description: "Toggle GPT Fast mode (service_tier: priority)",
    handler: async (_args, ctx) => {
      toggle(ctx);
    },
  });

  pi.on("session_start", (_event, ctx) => {
    enabled = getDefaultEnabled();
    publishStatus(ctx, enabled);
  });

  pi.on("before_provider_request", (event, ctx) => {
    if (!enabled || !shouldApplyFastMode(ctx.model, event.payload)) {
      return undefined;
    }
    return withFastServiceTier(event.payload);
  });
}
