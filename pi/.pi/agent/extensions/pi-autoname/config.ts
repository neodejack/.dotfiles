export const REASONING_EFFORTS = [
  "off",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
] as const;

export type ReasoningEffort = (typeof REASONING_EFFORTS)[number];

export interface AutonameConfig {
  enabled: boolean;
  model: string;
  reasoningEffort: ReasoningEffort;
  debug: boolean;
}

export type ConfigResult =
  | { ok: true; config: AutonameConfig }
  | { ok: false; error: string };

const CONFIG_KEYS = new Set(["enabled", "model", "reasoningEffort", "debug"]);

export function parseConfig(input: unknown): ConfigResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "configuration must be a JSON object" };
  }

  const raw = input as Record<string, unknown>;
  const unknownKeys = Object.keys(raw).filter((key) => !CONFIG_KEYS.has(key));
  if (unknownKeys.length > 0) {
    return { ok: false, error: `unknown configuration fields: ${unknownKeys.join(", ")}` };
  }

  if (typeof raw.enabled !== "boolean") {
    return { ok: false, error: '"enabled" must be a boolean' };
  }
  if (typeof raw.model !== "string") {
    return { ok: false, error: '"model" must be a provider/model string' };
  }

  const model = raw.model.trim();
  const separator = model.indexOf("/");
  if (separator <= 0 || separator === model.length - 1) {
    return { ok: false, error: '"model" must use the form provider/modelId' };
  }

  if (
    typeof raw.reasoningEffort !== "string"
    || !REASONING_EFFORTS.includes(raw.reasoningEffort as ReasoningEffort)
  ) {
    return {
      ok: false,
      error: `"reasoningEffort" must be one of: ${REASONING_EFFORTS.join(", ")}`,
    };
  }
  if (typeof raw.debug !== "boolean") {
    return { ok: false, error: '"debug" must be a boolean' };
  }

  return {
    ok: true,
    config: {
      enabled: raw.enabled,
      model,
      reasoningEffort: raw.reasoningEffort as ReasoningEffort,
      debug: raw.debug,
    },
  };
}
