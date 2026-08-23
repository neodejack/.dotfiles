export type NamingMode = "initial" | "manual";

export type NamingOutcome =
  | { status: "renamed"; name: string }
  | { status: "failed"; reason: string }
  | { status: "disabled"; reason: string }
  | { status: "cancelled"; reason: string };

export type NamingMarker =
  | {
      event: "attempt";
      mode: NamingMode;
      outcome: "renamed" | "failed" | "disabled";
      timestamp: number;
      name?: string;
    }
  | { event: "external_name"; outcome: "suppressed"; timestamp: number; name: string };

export interface NamingRequest {
  mode: NamingMode;
  signal: AbortSignal;
}

export interface NamingControllerRuntime {
  now(): number;
  isInitialDialogueReady(): boolean;
  getCurrentName(): string | undefined;
  appendMarker(marker: NamingMarker): void;
  setSessionName(name: string): void;
  generateName(request: NamingRequest): Promise<NamingOutcome>;
  debug(message: string): void;
}

export interface NamingController {
  initialize(initialEligible: boolean): void;
  handleSessionNameChange(name: string | undefined): void;
  handleSettled(): Promise<void>;
  renameManually(): Promise<NamingOutcome>;
  shutdown(): void;
}

export function normalizeName(name: string | undefined): string | undefined {
  const normalized = name?.trim().replace(/\s+/g, " ");
  return normalized || undefined;
}

export function createNamingController(runtime: NamingControllerRuntime): NamingController {
  let initialState: "ineligible" | "pending" | "consumed" = "ineligible";
  let lastGeneratedName: string | undefined;
  let requestSequence = 0;
  let activeRequest: AbortController | undefined;

  const appendOutcome = (mode: NamingMode, outcome: NamingOutcome) => {
    if (outcome.status === "cancelled") return;
    runtime.appendMarker({
      event: "attempt",
      mode,
      outcome: outcome.status,
      timestamp: runtime.now(),
      ...(outcome.status === "renamed" ? { name: outcome.name } : {}),
    });
  };

  const rename = async (mode: NamingMode): Promise<NamingOutcome> => {
    activeRequest?.abort(new Error("Superseded by a newer naming request"));
    const controller = new AbortController();
    activeRequest = controller;
    const sequence = ++requestSequence;

    try {
      const outcome = await runtime.generateName({ mode, signal: controller.signal });
      if (sequence !== requestSequence) {
        return { status: "cancelled", reason: "Naming request was superseded" };
      }

      if (outcome.status !== "renamed") {
        appendOutcome(mode, outcome);
        return outcome;
      }

      const name = normalizeName(outcome.name);
      if (!name) {
        const failed: NamingOutcome = { status: "failed", reason: "Naming model returned an empty title" };
        appendOutcome(mode, failed);
        return failed;
      }

      const currentName = normalizeName(runtime.getCurrentName());
      lastGeneratedName = name;
      if (name !== currentName) runtime.setSessionName(name);
      const renamed: NamingOutcome = { status: "renamed", name };
      appendOutcome(mode, renamed);
      runtime.debug(`completed ${mode} naming attempt`);
      return renamed;
    } catch {
      if (sequence !== requestSequence || controller.signal.aborted) {
        return { status: "cancelled", reason: "Naming request was cancelled" };
      }
      const failed: NamingOutcome = { status: "failed", reason: "Naming request failed" };
      appendOutcome(mode, failed);
      return failed;
    } finally {
      if (activeRequest === controller) activeRequest = undefined;
    }
  };

  return {
    initialize(initialEligible) {
      requestSequence += 1;
      activeRequest?.abort(new Error("Naming controller was reinitialized"));
      activeRequest = undefined;
      lastGeneratedName = undefined;
      initialState = initialEligible ? "pending" : "ineligible";
    },

    handleSessionNameChange(name) {
      const normalized = normalizeName(name);
      if (!normalized || normalized === lastGeneratedName || initialState !== "pending") return;

      initialState = "consumed";
      requestSequence += 1;
      activeRequest?.abort(new Error("An external session name suppressed automatic naming"));
      activeRequest = undefined;
      runtime.appendMarker({
        event: "external_name",
        outcome: "suppressed",
        timestamp: runtime.now(),
        name: normalized,
      });
      runtime.debug("external session name suppressed initial naming");
    },

    async handleSettled() {
      if (initialState !== "pending" || !runtime.isInitialDialogueReady()) return;
      initialState = "consumed";
      await rename("initial");
    },

    renameManually() {
      if (initialState === "pending") initialState = "consumed";
      return rename("manual");
    },

    shutdown() {
      initialState = "ineligible";
      requestSequence += 1;
      activeRequest?.abort(new Error("Session shut down"));
      activeRequest = undefined;
    },
  };
}
