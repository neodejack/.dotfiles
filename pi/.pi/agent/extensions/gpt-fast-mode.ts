import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  getAgentDir,
  type ExtensionAPI,
  type ExtensionContext,
} from "@earendil-works/pi-coding-agent";

const SUPPORTED_MODELS = new Set([
  "openai-codex/gpt-5.5",
  "openai-codex/gpt-5.6-luna",
  "openai-codex/gpt-5.6-sol",
  "openai-codex/gpt-5.6-terra",
]);

type PiModel = { provider?: string; id?: string };

function modelKey(model: PiModel): string {
  return `${model.provider}/${model.id}`;
}

function isSupported(model: PiModel | undefined): boolean {
  return !!model?.provider && !!model.id && SUPPORTED_MODELS.has(modelKey(model));
}

function defaultEnabled(): boolean {
  try {
    const settings = JSON.parse(
      readFileSync(join(getAgentDir(), "settings.json"), "utf8"),
    ) as Record<string, unknown>;
    const config = settings["pi-gpt-fast-mode"];
    return !!config
      && typeof config === "object"
      && !Array.isArray(config)
      && (config as { enabled?: unknown }).enabled === true;
  } catch {
    return false;
  }
}

function publishStatus(ctx: ExtensionContext, enabled: boolean): void {
  ctx.ui.setStatus("gpt-fast-mode", enabled ? "enabled" : undefined);
}

export default function (pi: ExtensionAPI): void {
  let enabled = defaultEnabled();

  pi.registerCommand("fast", {
    description: "Toggle GPT Fast mode (service_tier: priority)",
    handler: async (_args, ctx) => {
      enabled = !enabled;
      publishStatus(ctx, enabled);

      if (!enabled) {
        ctx.ui.notify("GPT Fast mode disabled.");
      } else if (isSupported(ctx.model)) {
        ctx.ui.notify("GPT Fast mode enabled (service_tier: priority).");
      } else {
        const model = ctx.model;
        const label = model?.provider && model.id ? modelKey(model) : "unknown model";
        ctx.ui.notify(
          `GPT Fast mode enabled, but ${label} is not supported.`,
          "warning",
        );
      }
    },
  });

  pi.on("session_start", (_event, ctx) => {
    enabled = defaultEnabled();
    publishStatus(ctx, enabled);
  });

  pi.on("before_provider_request", (event, ctx) => {
    if (
      !enabled
      || !event.payload
      || typeof event.payload !== "object"
      || !isSupported(ctx.model)
      || (event.payload as Record<string, unknown>).model !== ctx.model?.id
    ) {
      return undefined;
    }
    return { ...event.payload, service_tier: "priority" };
  });
}
