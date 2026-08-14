import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getAgentDir } from "@earendil-works/pi-coding-agent";
import type { SubagentModelPreference } from "./models";

export type SubagentModelsConfig = Record<string, SubagentModelPreference[]>;

const THINKING_LEVELS = new Set([
  "off",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
]);

export function getSubagentModelsConfigPath(): string {
  return join(getAgentDir(), "settings", "subagent-models.json");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPreference(value: unknown): value is SubagentModelPreference {
  return (
    isRecord(value) &&
    typeof value.provider === "string" &&
    typeof value.model === "string" &&
    typeof value.weight === "number" &&
    typeof value.thinking === "string" &&
    THINKING_LEVELS.has(value.thinking)
  );
}

let cache: Promise<SubagentModelsConfig | undefined> | undefined;

export function loadSubagentModels(): Promise<SubagentModelsConfig | undefined> {
  cache ??= (async () => {
    try {
      const parsed: unknown = JSON.parse(
        await readFile(getSubagentModelsConfigPath(), "utf8"),
      );
      if (!isRecord(parsed)) return undefined;
      const config: SubagentModelsConfig = {};
      for (const [name, roster] of Object.entries(parsed)) {
        if (!Array.isArray(roster) || !roster.every(isPreference)) {
          return undefined;
        }
        config[name] = roster;
      }
      return config;
    } catch {
      return undefined;
    }
  })();
  return cache;
}

export async function getSubagentModelPreferences(
  name: string,
): Promise<SubagentModelPreference[] | undefined> {
  return (await loadSubagentModels())?.[name];
}
