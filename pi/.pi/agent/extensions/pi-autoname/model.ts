import type { ReasoningEffort } from "./config.ts";

export const AI_TOTAL_BUDGET_MS = 30_000;
export const AI_ATTEMPT_TIMEOUT_MS = 12_000;
export const MAX_NAME_TOKENS = 64;

export type ModelFailureCode =
  | "invalid_model"
  | "model_unavailable"
  | "unsupported_reasoning"
  | "auth_unavailable"
  | "provider_unavailable"
  | "timed_out"
  | "aborted"
  | "request_failed";

export type ModelCompletionResult =
  | { ok: true; response: any }
  | { ok: false; code: ModelFailureCode; message: string };

export interface ModelRegistryLike {
  find(provider: string, modelId: string): any;
  getApiKeyAndHeaders(model: any): Promise<
    | { ok: true; apiKey?: string; headers?: Record<string, string>; baseUrl?: string; env?: Record<string, string> }
    | { ok: false; error: string }
  >;
  getProvider(provider: string): {
    streamSimple(model: any, context: any, options?: any): { result(): Promise<any> };
  } | undefined;
}

function failure(code: ModelFailureCode, message: string): ModelCompletionResult {
  return { ok: false, code, message };
}

export function supportsReasoningEffort(model: any, effort: ReasoningEffort): boolean {
  const mapped = model?.thinkingLevelMap?.[effort];
  if (mapped === null) return false;
  if (effort === "off") return true;
  if (!model?.reasoning) return false;
  if (effort === "xhigh" || effort === "max") return typeof mapped === "string";
  return true;
}

export function splitModelName(modelName: string): { provider: string; modelId: string } | undefined {
  const separator = modelName.indexOf("/");
  if (separator <= 0 || separator === modelName.length - 1) return undefined;
  return {
    provider: modelName.slice(0, separator),
    modelId: modelName.slice(separator + 1),
  };
}

export async function completeNamingModel(options: {
  modelName: string;
  reasoningEffort: ReasoningEffort;
  prompt: string;
  modelRegistry: ModelRegistryLike;
  signal: AbortSignal;
}): Promise<ModelCompletionResult> {
  const parsed = splitModelName(options.modelName);
  if (!parsed) return failure("invalid_model", "Configured naming model is invalid");

  const model = options.modelRegistry.find(parsed.provider, parsed.modelId);
  if (!model) return failure("model_unavailable", `Naming model is unavailable: ${options.modelName}`);
  if (!supportsReasoningEffort(model, options.reasoningEffort)) {
    return failure(
      "unsupported_reasoning",
      `${options.modelName} does not support reasoning effort ${options.reasoningEffort}`,
    );
  }

  const auth = await options.modelRegistry.getApiKeyAndHeaders(model);
  if (!auth.ok) return failure("auth_unavailable", `Authentication is unavailable for ${model.provider}`);
  const provider = options.modelRegistry.getProvider(model.provider);
  if (!provider) return failure("provider_unavailable", `Provider is unavailable: ${model.provider}`);
  if (options.signal.aborted) return failure("aborted", "Naming request was cancelled");

  const controller = new AbortController();
  let timedOut = false;
  const timeoutMs = Math.min(AI_ATTEMPT_TIMEOUT_MS, AI_TOTAL_BUDGET_MS);
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort(new Error("AI naming attempt timed out"));
  }, timeoutMs);
  const abort = () => controller.abort(options.signal.reason);
  options.signal.addEventListener("abort", abort, { once: true });

  try {
    const requestModel = auth.baseUrl ? { ...model, baseUrl: auth.baseUrl } : model;
    const stream = provider.streamSimple(
      requestModel,
      {
        systemPrompt: "You produce concise semantic labels for coding sessions.",
        messages: [{
          role: "user",
          content: [{ type: "text", text: options.prompt }],
          timestamp: Date.now(),
        }],
      },
      {
        apiKey: auth.apiKey,
        headers: auth.headers,
        env: auth.env,
        maxTokens: MAX_NAME_TOKENS,
        reasoning: options.reasoningEffort,
        cacheRetention: "none",
        signal: controller.signal,
      },
    );
    const response = await stream.result();
    if (response?.stopReason === "error" || response?.stopReason === "aborted") {
      return failure(response.stopReason === "aborted" ? "aborted" : "request_failed", "Naming model request failed");
    }
    return { ok: true, response };
  } catch {
    if (timedOut) return failure("timed_out", "Naming model request timed out");
    if (options.signal.aborted) return failure("aborted", "Naming request was cancelled");
    return failure("request_failed", "Naming model request failed");
  } finally {
    clearTimeout(timeout);
    options.signal.removeEventListener("abort", abort);
  }
}
