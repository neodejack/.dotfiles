import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  completeNamingModel,
  NAMING_SYSTEM_PROMPT,
  supportsReasoningEffort,
  type ModelRegistryLike,
} from "../model.ts";

function createRegistry(modelOverrides: Record<string, unknown> = {}) {
  const seen: { context?: any; options?: any; findCalls: number } = { findCalls: 0 };
  const model = {
    provider: "openai-codex",
    id: "gpt-5.6-luna",
    reasoning: true,
    thinkingLevelMap: {},
    ...modelOverrides,
  };
  const registry: ModelRegistryLike = {
    find(provider, modelId) {
      seen.findCalls += 1;
      return provider === model.provider && modelId === model.id ? model : undefined;
    },
    async getApiKeyAndHeaders() {
      return { ok: true, apiKey: "test-key" };
    },
    getProvider() {
      return {
        streamSimple(_model, context, options) {
          seen.context = context;
          seen.options = options;
          return {
            async result() {
              return { stopReason: "stop", content: [{ type: "text", text: "Naming work" }] };
            },
          };
        },
      };
    },
  };
  return { registry, seen, model };
}

describe("reasoning support", () => {
  it("recognizes standard and explicitly extended levels without clamping", () => {
    const { model } = createRegistry();
    assert.equal(supportsReasoningEffort(model, "low"), true);
    assert.equal(supportsReasoningEffort(model, "xhigh"), false);
    model.thinkingLevelMap.xhigh = "xhigh";
    assert.equal(supportsReasoningEffort(model, "xhigh"), true);
    model.thinkingLevelMap.low = null;
    assert.equal(supportsReasoningEffort(model, "low"), false);
  });

  it("passes configured low reasoning to the one model request", async () => {
    const { registry, seen } = createRegistry();
    const result = await completeNamingModel({
      modelName: "openai-codex/gpt-5.6-luna",
      reasoningEffort: "low",
      prompt: "Name this session",
      modelRegistry: registry,
      signal: new AbortController().signal,
    });
    assert.equal(result.ok, true);
    assert.equal(seen.findCalls, 1);
    assert.equal(seen.context.systemPrompt, NAMING_SYSTEM_PROMPT);
    assert.match(seen.context.systemPrompt, /concise English topic labels/);
    assert.match(seen.context.systemPrompt, /2-4 word name/);
    assert.match(seen.context.systemPrompt, /audit or investigate/);
    assert.doesNotMatch(seen.context.systemPrompt, /Cocoon|Windows|Redis|Firebase/);
    assert.equal(seen.options.reasoning, "low");
    assert.equal(seen.options.cacheRetention, "none");
  });

  it("fails before requesting when reasoning is unsupported", async () => {
    const { registry, seen } = createRegistry({ thinkingLevelMap: { low: null } });
    const result = await completeNamingModel({
      modelName: "openai-codex/gpt-5.6-luna",
      reasoningEffort: "low",
      prompt: "Name this session",
      modelRegistry: registry,
      signal: new AbortController().signal,
    });
    assert.deepEqual(result.ok ? undefined : result.code, "unsupported_reasoning");
    assert.equal(seen.options, undefined);
  });
});
