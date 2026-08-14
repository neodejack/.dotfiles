import type { ModelRegistry } from "@earendil-works/pi-coding-agent";
import { providerCooldown } from "./cooldown";
import type {
  SubagentModelChoice,
  SubagentModelPreference,
  SubagentModelRanking,
  SubagentResolvedModel,
  SubagentSkippedModel,
} from "./types";

export interface RankModelsOptions {
  isCooled?: (provider: string) => boolean;
}

export function rankModels(
  registry: ModelRegistry,
  preferences: readonly SubagentModelPreference[],
  options: RankModelsOptions = {},
): SubagentModelRanking {
  const isCooled =
    options.isCooled ??
    ((provider: string) => providerCooldown.isCooled(provider));
  const skipped: SubagentSkippedModel[] = [];
  const usable: SubagentModelPreference[] = [];

  for (const preference of preferences) {
    const reason = usabilityReason(registry, preference);
    if (reason) {
      skipped.push({ preference: recordFor(preference), reason });
      continue;
    }
    usable.push(preference);
  }

  const eligible = applyCooldown(usable, isCooled, skipped);
  const candidates: SubagentModelChoice[] = [];
  for (const preference of rankPreferences(eligible)) {
    const model = registry.find(preference.provider, preference.model);
    if (!model) continue;
    candidates.push({
      model,
      thinking: preference.thinking,
      preference: recordFor(preference),
      skipped,
    });
  }
  return { candidates, skipped };
}

export function pickModel(
  registry: ModelRegistry,
  preferences: readonly SubagentModelPreference[],
  options: RankModelsOptions = {},
): SubagentModelChoice | null {
  return rankModels(registry, preferences, options).candidates[0] ?? null;
}

export function resolveModel(
  registry: ModelRegistry,
  preferences: readonly SubagentModelPreference[],
  pinned?: SubagentResolvedModel,
): SubagentModelChoice | null {
  if (pinned && !usabilityReason(registry, { ...pinned, weight: 1 })) {
    const model = registry.find(pinned.provider, pinned.model);
    if (model) {
      return {
        model,
        thinking: pinned.thinking,
        preference: pinned,
        skipped: [],
      };
    }
  }
  return pickModel(registry, preferences);
}

export function rankPreferences(
  entries: readonly SubagentModelPreference[],
  random: () => number = Math.random,
): SubagentModelPreference[] {
  const positive: { entry: SubagentModelPreference; key: number }[] = [];
  const fallbacks: SubagentModelPreference[] = [];
  for (const entry of entries) {
    if (entry.weight > 0) {
      positive.push({ entry, key: -Math.log(1 - random()) / entry.weight });
    } else {
      fallbacks.push(entry);
    }
  }
  positive.sort((a, b) => a.key - b.key);
  return [...positive.map((item) => item.entry), ...fallbacks];
}

function applyCooldown(
  usable: SubagentModelPreference[],
  isCooled: (provider: string) => boolean,
  skipped: SubagentSkippedModel[],
): SubagentModelPreference[] {
  const hot = usable.filter((entry) => !isCooled(entry.provider));
  if (hot.length === 0) return usable;
  for (const entry of usable) {
    if (isCooled(entry.provider)) {
      skipped.push({ preference: recordFor(entry), reason: "recently-failed" });
    }
  }
  return hot;
}

function usabilityReason(
  registry: ModelRegistry,
  preference: SubagentModelPreference,
): string | null {
  const model = registry.find(preference.provider, preference.model);
  if (!model) return "unknown-model";
  if (!registry.hasConfiguredAuth(model)) return "unauthed";
  return null;
}

function recordFor(preference: SubagentModelPreference): SubagentResolvedModel {
  return {
    provider: preference.provider,
    model: preference.model,
    thinking: preference.thinking,
  };
}
