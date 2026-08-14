export const STARTUP_TIMEOUT_MS = 30_000;
export const STARTUP_ATTEMPT_MIN_MS = 3_000;

export class StartupTimeoutError extends Error {
  constructor(label: string, timeoutMs: number) {
    super(`${label} subagent produced no output within ${timeoutMs}ms`);
    this.name = "StartupTimeoutError";
  }
}

export function isStartupTimeoutError(
  error: unknown,
): error is StartupTimeoutError {
  return error instanceof StartupTimeoutError;
}

export interface StartupBudget {
  nextWindow(): number;
  markStarted(): void;
}

export function createStartupBudget(
  totalMs = STARTUP_TIMEOUT_MS,
  now: () => number = () => Date.now(),
): StartupBudget {
  const deadline = now() + totalMs;
  let started = false;
  return {
    nextWindow() {
      if (started) return totalMs;
      return Math.max(0, deadline - now());
    },
    markStarted() {
      started = true;
    },
  };
}

export async function withStartupTimeout<T>(
  operation: (started: () => void) => Promise<T>,
  label: string,
  timeoutMs = STARTUP_TIMEOUT_MS,
): Promise<T> {
  let started = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      if (!started) reject(new StartupTimeoutError(label, timeoutMs));
    }, Math.max(STARTUP_ATTEMPT_MIN_MS, timeoutMs));
  });
  try {
    return await Promise.race([
      operation(() => {
        started = true;
        if (timer) clearTimeout(timer);
      }),
      timeout,
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
