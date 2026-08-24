import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { existsSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { type ConfigResult, parseConfig } from "./config.ts";
import {
  createNamingController,
  type NamingMode,
  type NamingOutcome,
} from "./controller.ts";
import {
  buildNamingPrompt,
  getInitialDialogue,
  getRecentDialogue,
  inspectNameResponse,
  isFreshSession,
} from "./lib.ts";
import { completeNamingModel } from "./model.ts";

const CONFIG_PATH = join(homedir(), ".pi", "agent", "pi-autoname.json");
const STATE_ENTRY_TYPE = "local-pi-autoname-state";

let cachedConfig: { mtimeMs: number; result: ConfigResult } | undefined;
let debugEnabled = false;
let lastReportedConfigError: string | undefined;

function safeJson(value: unknown): string {
  try {
    return value instanceof Error ? value.message : JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function debugLog(...args: unknown[]): void {
  if (!debugEnabled) return;
  const time = new Date().toISOString().split("T")[1]?.replace("Z", "") ?? "";
  console.error(`[local pi-autoname ${time}] ${args.map((arg) => typeof arg === "string" ? arg : safeJson(arg)).join(" ")}`);
}

function invalidConfig(error: string): ConfigResult {
  debugEnabled = false;
  if (lastReportedConfigError !== error) {
    console.error(`[local pi-autoname] naming disabled: ${error}`);
    lastReportedConfigError = error;
  }
  return { ok: false, error };
}

function loadConfig(): ConfigResult {
  try {
    if (!existsSync(CONFIG_PATH)) return invalidConfig(`configuration file is missing: ${CONFIG_PATH}`);
    const mtimeMs = statSync(CONFIG_PATH).mtimeMs;
    if (cachedConfig?.mtimeMs === mtimeMs) return cachedConfig.result;

    let input: unknown;
    try {
      input = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
    } catch {
      const result = invalidConfig(`configuration is not valid JSON: ${CONFIG_PATH}`);
      cachedConfig = { mtimeMs, result };
      return result;
    }

    const parsed = parseConfig(input);
    if (!parsed.ok) {
      const result = invalidConfig(`${parsed.error} (${CONFIG_PATH})`);
      cachedConfig = { mtimeMs, result };
      return result;
    }
    const result = parsed;
    cachedConfig = { mtimeMs, result };
    debugEnabled = result.config.debug;
    lastReportedConfigError = undefined;
    return result;
  } catch {
    return invalidConfig(`configuration could not be read: ${CONFIG_PATH}`);
  }
}

function notifyInvalidConfig(ctx: ExtensionContext, result: ConfigResult): void {
  if (!result.ok && ctx.hasUI) ctx.ui.notify(`pi-autoname disabled: ${result.error}`, "warning");
}

function getI18nLocale(pi: ExtensionAPI): string | undefined {
  let locale: string | undefined;
  try {
    pi.events.emit("pi-core/i18n/requestApi", {
      reply: (api: { getLocale?: () => unknown }) => {
        const value = api?.getLocale?.();
        if (typeof value === "string" && value.trim()) locale = value;
      },
    });
  } catch {
    // pi-di18n is optional.
  }
  return locale;
}

function hasLocalStateMarker(branch: any[]): boolean {
  return branch.some((entry) => entry?.type === "custom" && entry.customType === STATE_ENTRY_TYPE);
}

async function generateName(
  pi: ExtensionAPI,
  ctx: ExtensionContext,
  mode: NamingMode,
  signal: AbortSignal,
): Promise<NamingOutcome> {
  const configResult = loadConfig();
  if (!configResult.ok) {
    notifyInvalidConfig(ctx, configResult);
    return { status: "disabled", reason: configResult.error };
  }
  const config = configResult.config;
  if (!config.enabled) return { status: "disabled", reason: "pi-autoname is disabled in configuration" };

  const branch = ctx.sessionManager.getBranch();
  const parts = mode === "initial" ? getInitialDialogue(branch) : getRecentDialogue(branch);
  if (parts.length === 0) return { status: "failed", reason: "No conversation text is available to name" };

  const built = buildNamingPrompt(parts, getI18nLocale(pi));
  if (built.redacted) debugLog("redacted sensitive content before naming request");
  const completion = await completeNamingModel({
    modelName: config.model,
    reasoningEffort: config.reasoningEffort,
    prompt: built.prompt,
    modelRegistry: ctx.modelRegistry,
    signal,
  });
  if (!completion.ok) {
    debugLog(`naming model failed: ${completion.code}`);
    return { status: "failed", reason: completion.message };
  }

  const extraction = inspectNameResponse(completion.response);
  if (!extraction.name) {
    debugLog("naming response rejected", extraction.diagnostic);
    return { status: "failed", reason: "Naming model returned no valid session name" };
  }
  const name = extraction.name;
  return { status: "renamed", name };
}

export default function extension(pi: ExtensionAPI): void {
  let controller: ReturnType<typeof createNamingController> | undefined;

  const requireController = () => {
    if (!controller) throw new Error("pi-autoname session has not started");
    return controller;
  };

  pi.on("session_start", async (_event, ctx) => {
    controller?.shutdown();
    const branch = ctx.sessionManager.getBranch();
    const initialEligible = isFreshSession(branch)
      && !hasLocalStateMarker(branch)
      && !pi.getSessionName();

    controller = createNamingController({
      now: Date.now,
      isInitialDialogueReady: () => getInitialDialogue(ctx.sessionManager.getBranch()).length === 2,
      getCurrentName: () => pi.getSessionName(),
      appendMarker: (marker) => pi.appendEntry(STATE_ENTRY_TYPE, marker),
      setSessionName: (name) => pi.setSessionName(name),
      generateName: ({ mode, signal }) => generateName(pi, ctx, mode, signal),
      debug: debugLog,
    });
    controller.initialize(initialEligible);
    notifyInvalidConfig(ctx, loadConfig());
    debugLog(`session started; initial naming ${initialEligible ? "pending" : "ineligible"}`);
  });

  pi.on("session_info_changed", async (event) => {
    controller?.handleSessionNameChange(event.name);
  });

  pi.on("agent_settled", () => {
    void controller?.handleSettled();
  });

  pi.on("session_shutdown", async () => {
    controller?.shutdown();
    controller = undefined;
  });

  pi.registerCommand("autoname", {
    description: "AI-generate a fresh session name from recent conversation context",
    handler: async (_args, ctx) => {
      const result = await requireController().renameManually();
      if (result.status === "renamed") {
        ctx.ui.notify(`Session renamed: ${result.name}`, "info");
        return;
      }
      ctx.ui.notify(`pi-autoname: ${result.reason}`, "warning");
    },
  });
}
