import type { SubagentModelChoice } from "./models";
import { type ProviderCooldown, providerCooldown } from "./models";
import {
  type AttemptFailure,
  classifyAttempt,
  isSubagentAttemptError,
} from "./runtime";
import {
  isStartupTimeoutError,
  type StartupBudget,
  withStartupTimeout,
} from "./startup-timeout";

export interface FailoverAttemptArgs<Owned> {
  choice: SubagentModelChoice;
  signal: AbortSignal;
  started: () => void;
  own: (resource: Owned) => void;
}

export interface FailoverSettled<Owned> {
  choice: SubagentModelChoice;
  failure?: AttemptFailure;
  owned?: Owned;
}

export interface FailoverOptions<T, Owned = unknown> {
  label: string;
  candidates: readonly SubagentModelChoice[];
  budget: StartupBudget;
  signal?: AbortSignal;
  cooldown?: ProviderCooldown;
  notify: (message: string) => void;
  runAttempt: (args: FailoverAttemptArgs<Owned>) => Promise<T>;
  onSettled?: (settled: FailoverSettled<Owned>) => void;
}

export interface FailoverResult<T> {
  result: T;
  choice: SubagentModelChoice;
  attempted: string[];
}

export async function runWithFailover<T, Owned = unknown>(
  options: FailoverOptions<T, Owned>,
): Promise<FailoverResult<T>> {
  const cooldown = options.cooldown ?? providerCooldown;
  let remaining = [...options.candidates];
  const attempted: string[] = [];
  let firstError: unknown;
  let stopReason = "every candidate failed";

  while (remaining.length > 0) {
    options.signal?.throwIfAborted();
    const windowMs = options.budget.nextWindow();
    if (windowMs <= 0) {
      stopReason = "startup budget exhausted";
      break;
    }

    const choice = remaining[0] as SubagentModelChoice;
    remaining = remaining.slice(1);
    const label = modelLabel(choice);
    attempted.push(label);
    const abandon = new AbortController();
    const signal = options.signal
      ? AbortSignal.any([options.signal, abandon.signal])
      : abandon.signal;
    let owned: Owned | undefined;
    let settled: FailoverSettled<Owned> | undefined;
    const own = (resource: Owned) => {
      owned = resource;
      if (settled) options.onSettled?.({ ...settled, owned: resource });
    };
    const settle = (result: FailoverSettled<Owned>) => {
      settled = result;
      options.onSettled?.(result);
    };

    try {
      const result = await withStartupTimeout(
        (started) =>
          options.runAttempt({
            choice,
            signal,
            started: () => {
              options.budget.markStarted();
              started();
            },
            own,
          }),
        options.label,
        windowMs,
      );
      settle({ choice, owned });
      return { result, choice, attempted };
    } catch (error) {
      const failure = toAttemptFailure(error, choice);
      const classification = classifyAttempt(failure);
      settle({ choice, failure, owned });
      if (!failure.started) abandon.abort();
      firstError ??= error;
      if (classification.action === "fatal") throw error;
      if (classification.cooldown === "provider") {
        cooldown.record(choice.preference.provider);
        remaining = remaining.filter(
          (entry) => entry.preference.provider !== choice.preference.provider,
        );
      }
      const next = remaining[0];
      options.notify(
        next
          ? `[model] ${label} failed (${classification.reason}), trying ${modelLabel(next)}`
          : `[model] ${label} failed (${classification.reason}), no candidates left`,
      );
    }
  }

  throw new Error(
    `${options.label} subagent: ${stopReason} (tried ${attempted.join(", ")}). First error: ${errorMessage(firstError)}`,
  );
}

export function modelLabel(choice: SubagentModelChoice): string {
  return `${choice.preference.provider}/${choice.preference.model}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function toAttemptFailure(
  error: unknown,
  choice: SubagentModelChoice,
): AttemptFailure {
  if (isSubagentAttemptError(error)) return error.failure;
  const provider = choice.preference.provider;
  const model = choice.preference.model;
  if (isStartupTimeoutError(error)) {
    return {
      phase: "startup-timeout",
      started: false,
      aborted: false,
      cause: error,
      provider,
      model,
      message: error.message,
    };
  }
  return {
    phase: "setup",
    started: false,
    aborted: false,
    cause: error,
    provider,
    model,
    message: errorMessage(error),
  };
}
