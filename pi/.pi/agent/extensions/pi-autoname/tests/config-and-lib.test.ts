import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseConfig } from "../config.ts";
import {
  MAX_NAME_LENGTH,
  blockText,
  buildNamingPrompt,
  detectDominantUserLanguage,
  extractCleanName,
  getInitialDialogue,
  inspectNameResponse,
  getNamingLanguageInstruction,
  getRecentDialogue,
  isFreshSession,
  isHighQualityName,
  redactSensitiveText,
} from "../lib.ts";

describe("configuration", () => {
  const valid = {
    enabled: true,
    model: "openai-codex/gpt-5.6-luna",
    reasoningEffort: "low",
    debug: false,
  };

  it("accepts the complete strict configuration", () => {
    assert.deepEqual(parseConfig(valid), { ok: true, config: valid });
  });

  it("rejects missing, obsolete, and invalid fields", () => {
    assert.equal(parseConfig({ ...valid, reasoningEffort: undefined }).ok, false);
    assert.equal(parseConfig({ ...valid, fallbackModels: [] }).ok, false);
    assert.equal(parseConfig({ ...valid, model: "luna" }).ok, false);
    assert.equal(parseConfig({ ...valid, reasoningEffort: "ultra" }).ok, false);
  });
});

describe("privacy and naming quality", () => {
  it("redacts common secrets without changing clean text", () => {
    assert.deepEqual(redactSensitiveText("hello"), { text: "hello", redacted: false });
    const result = redactSensitiveText("API_KEY=secret and Bearer abcdefghijklmnopqrstuvwxyz");
    assert.equal(result.redacted, true);
    assert.match(result.text, /API_KEY=\[REDACTED\]/);
    assert.match(result.text, /Bearer \[REDACTED\]/);
  });

  it("redacts private keys, AWS keys, and OpenAI-style keys", () => {
    const result = redactSensitiveText([
      "-----BEGIN RSA PRIVATE KEY-----\nsecret\n-----END RSA PRIVATE KEY-----",
      "AKIAIOSFODNN7EXAMPLE",
      "sk-abc123def456ghi789jklmno",
    ].join(" "));
    assert.equal(result.redacted, true);
    assert.doesNotMatch(result.text, /AKIAIOSFODNN7EXAMPLE|sk-abc123def456ghi789jklmno/);
  });

  it("accepts concise labels and rejects sentences", () => {
    assert.equal(isHighQualityName("API重构"), true);
    assert.equal(isHighQualityName("Session naming fix"), true);
    assert.equal(isHighQualityName("我想知道如何修复"), false);
    assert.equal(isHighQualityName("Good job!"), false);
    assert.equal(isHighQualityName("ab"), false);
    assert.equal(isHighQualityName("a".repeat(MAX_NAME_LENGTH + 1)), false);
  });

  it("extracts and validates model output", () => {
    assert.equal(extractCleanName({ content: [{ type: "text", text: "\"Naming Refactor\"" }] }), "Naming Refactor");
    assert.equal(extractCleanName({ content: [{ type: "text", text: "I need help fixing this bug" }] }), undefined);
  });

  it("accepts useful multi-word titles up to 60 characters", () => {
    const title = "Draft issue for fullscreen prompt replay bug";
    assert.equal(title.length, 44);
    assert.equal(extractCleanName({ content: [{ type: "text", text: title }] }), title);
  });

  it("reports privacy-safe rejection metadata without title text", () => {
    const title = "a".repeat(MAX_NAME_LENGTH + 1);
    const result = inspectNameResponse({
      stopReason: "stop",
      rawStopReason: "completed",
      content: [{ type: "text", text: title }],
    });

    assert.equal(result.name, undefined);
    assert.deepEqual(result.diagnostic, {
      stopReason: "stop",
      rawStopReason: "completed",
      contentTypes: ["text"],
      textChars: MAX_NAME_LENGTH + 1,
      thinkingChars: 0,
      cleanedChars: MAX_NAME_LENGTH + 1,
      rejection: "too_long",
    });
    assert.doesNotMatch(JSON.stringify(result.diagnostic), new RegExp(title));
  });
});

describe("language and prompt construction", () => {
  it("uses user-authored language rather than assistant language", () => {
    const parts = [
      { role: "user" as const, text: "请修复自动命名的语言" },
      { role: "assistant" as const, text: "I will return an English summary." },
    ];
    assert.equal(detectDominantUserLanguage(parts), "Chinese");
    assert.match(getNamingLanguageInstruction(parts), /Chinese/);
  });

  it("uses locale only when no natural-language user text exists", () => {
    assert.match(
      getNamingLanguageInstruction([{ role: "user", text: "const title = makeName();" }], "ja"),
      /Japanese/,
    );
  });

  it("redacts prompt content and requests a fresh label", () => {
    const built = buildNamingPrompt([{ role: "user", text: "API_KEY=secret fix naming" }]);
    assert.equal(built.redacted, true);
    assert.doesNotMatch(built.prompt, /API_KEY=secret/);
    assert.match(built.prompt, /afresh/);
    assert.match(built.prompt, /3-60 total characters/);
  });
});

describe("dialogue and freshness", () => {
  const branch = [
    { type: "message", message: { role: "user", content: "first request" } },
    { type: "message", message: { role: "assistant", content: [{ type: "text", text: "first reply" }] } },
    { type: "message", message: { role: "user", content: "current task" } },
    { type: "message", message: { role: "assistant", content: "current progress" } },
  ];

  it("extracts the first completed exchange and recent context", () => {
    assert.equal(blockText([{ type: "image" }, { type: "text", text: "hello" }]), "hello");
    assert.deepEqual(getInitialDialogue(branch), [
      { role: "user", text: "first request" },
      { role: "assistant", text: "first reply" },
    ]);
    assert.deepEqual(getRecentDialogue(branch, 2), [
      { role: "user", text: "current task" },
      { role: "assistant", text: "current progress" },
    ]);
  });

  it("considers only sessions without prior dialogue fresh", () => {
    assert.equal(isFreshSession([]), true);
    assert.equal(isFreshSession([{ type: "session", id: "x" }]), true);
    assert.equal(isFreshSession(branch), false);
    assert.equal(isFreshSession([{ type: "compaction", summary: "old" }]), false);
  });
});
