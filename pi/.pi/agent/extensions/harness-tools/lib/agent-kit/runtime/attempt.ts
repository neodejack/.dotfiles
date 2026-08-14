import {
  type AssistantMessage,
  isContextOverflow,
  isRetryableAssistantError,
} from "@earendil-works/pi-ai";

export type AttemptPhase =
  | "setup"
  | "build-prompt"
  | "before-execute"
  | "prompt"
  | "blank-response"
  | "startup-timeout";

export interface AttemptFailure {
  phase: AttemptPhase;
  started: boolean;
  aborted: boolean;
  cause: unknown;
  assistant?: AssistantMessage;
  provider: string;
  model: string;
  message: string;
}

export class SubagentAttemptError extends Error {
  readonly failure: AttemptFailure;

  constructor(failure: AttemptFailure) {
    super(`${failure.provider}/${failure.model}: ${failure.message}`);
    this.name = "SubagentAttemptError";
    this.failure = failure;
  }
}

export function isSubagentAttemptError(
  error: unknown,
): error is SubagentAttemptError {
  return error instanceof SubagentAttemptError;
}

export interface AttemptClassification {
  action: "fatal" | "next-entry";
  cooldown: "none" | "provider";
  reason: string;
}

const QUOTA_PATTERN =
  /\b402\b|payment required|insufficient[_ ]quota|insufficient (?:credit|balance|funds)|out of budget|quota exceeded|usage limit|billing|credits? (?:exhausted|remaining)/i;

export function classifyAttempt(
  failure: AttemptFailure,
): AttemptClassification {
  if (failure.aborted) {
    return { action: "fatal", cooldown: "none", reason: "aborted" };
  }
  if (failure.started) {
    return { action: "fatal", cooldown: "none", reason: "failed-after-start" };
  }
  if (failure.phase === "startup-timeout") {
    return { action: "next-entry", cooldown: "provider", reason: "no output" };
  }
  if (
    failure.phase === "setup" ||
    failure.phase === "build-prompt" ||
    failure.phase === "before-execute"
  ) {
    return { action: "fatal", cooldown: "none", reason: failure.phase };
  }
  const assistant = failure.assistant;
  if (!assistant) {
    return {
      action: "fatal",
      cooldown: "none",
      reason: "no provider response",
    };
  }
  if (assistant.stopReason === "aborted") {
    return { action: "fatal", cooldown: "none", reason: "aborted" };
  }
  if (isContextOverflow(assistant)) {
    return { action: "fatal", cooldown: "none", reason: "context overflow" };
  }
  if (assistant.stopReason !== "error") {
    return { action: "fatal", cooldown: "none", reason: "blank response" };
  }
  if (QUOTA_PATTERN.test(assistant.errorMessage ?? "")) {
    return { action: "next-entry", cooldown: "provider", reason: "quota" };
  }
  if (isRetryableAssistantError(assistant)) {
    return { action: "next-entry", cooldown: "provider", reason: "transient" };
  }
  return { action: "next-entry", cooldown: "none", reason: "provider error" };
}
