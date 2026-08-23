import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createNamingController,
  normalizeName,
  type NamingControllerRuntime,
  type NamingOutcome,
  type NamingRequest,
} from "../controller.ts";

function createRuntime(options: {
  initialReady?: boolean;
  name?: string;
  generated?: NamingOutcome;
  generate?: (request: NamingRequest) => Promise<NamingOutcome>;
} = {}) {
  let name = options.name;
  let initialReady = options.initialReady ?? true;
  const requests: NamingRequest[] = [];
  const markers: unknown[] = [];
  const setNames: string[] = [];
  const runtime: NamingControllerRuntime = {
    now: () => 1_000,
    isInitialDialogueReady: () => initialReady,
    getCurrentName: () => name,
    appendMarker: (marker) => markers.push(marker),
    setSessionName: (next) => {
      name = next;
      setNames.push(next);
    },
    generateName: async (request) => {
      requests.push(request);
      return options.generate
        ? options.generate(request)
        : (options.generated ?? { status: "renamed", name: "Semantic title" });
    },
    debug: () => {},
  };
  return {
    controller: createNamingController(runtime),
    requests,
    markers,
    setNames,
    get name() { return name; },
    setInitialReady(value: boolean) { initialReady = value; },
    renameExternally(next: string) { name = next; },
  };
}

describe("initial naming", () => {
  it("waits for the first completed exchange and attempts exactly once", async () => {
    const test = createRuntime({ initialReady: false });
    test.controller.initialize(true);
    await test.controller.handleSettled();
    assert.equal(test.requests.length, 0);

    test.setInitialReady(true);
    await test.controller.handleSettled();
    await test.controller.handleSettled();

    assert.deepEqual(test.requests.map((request) => request.mode), ["initial"]);
    assert.equal(test.name, "Semantic title");
  });

  it("never automatically names an ineligible existing session", async () => {
    const test = createRuntime();
    test.controller.initialize(false);
    await test.controller.handleSettled();
    await test.controller.handleSettled();
    assert.equal(test.requests.length, 0);
  });

  it("consumes a failed initial attempt without retrying", async () => {
    const test = createRuntime({ generated: { status: "failed", reason: "request failed" } });
    test.controller.initialize(true);
    await test.controller.handleSettled();
    await test.controller.handleSettled();
    assert.deepEqual(test.requests.map((request) => request.mode), ["initial"]);
    assert.equal(test.name, undefined);
    assert.deepEqual(test.markers.at(-1), {
      event: "attempt",
      mode: "initial",
      outcome: "failed",
      timestamp: 1_000,
    });
  });

  it("lets any external name suppress the pending attempt", async () => {
    const test = createRuntime();
    test.controller.initialize(true);
    test.renameExternally("Manual title");
    test.controller.handleSessionNameChange("Manual title");
    await test.controller.handleSettled();
    assert.equal(test.requests.length, 0);
    assert.equal(test.name, "Manual title");
    assert.deepEqual(test.markers.at(-1), {
      event: "external_name",
      outcome: "suppressed",
      timestamp: 1_000,
      name: "Manual title",
    });
  });
});

describe("manual naming", () => {
  it("works for existing sessions and after failed automatic naming", async () => {
    let attempt = 0;
    const test = createRuntime({
      generate: async () => ++attempt === 1
        ? { status: "failed", reason: "request failed" }
        : { status: "renamed", name: "Manual regeneration" },
    });
    test.controller.initialize(true);
    await test.controller.handleSettled();
    const result = await test.controller.renameManually();
    assert.deepEqual(result, { status: "renamed", name: "Manual regeneration" });
    assert.deepEqual(test.requests.map((request) => request.mode), ["initial", "manual"]);
  });

  it("consumes a pending initial attempt", async () => {
    const test = createRuntime();
    test.controller.initialize(true);
    await test.controller.renameManually();
    await test.controller.handleSettled();
    assert.deepEqual(test.requests.map((request) => request.mode), ["manual"]);
  });

  it("cancels a superseded request and ignores its late result", async () => {
    let resolveInitial: ((outcome: NamingOutcome) => void) | undefined;
    const test = createRuntime({
      generate: (request) => request.mode === "initial"
        ? new Promise((resolve) => { resolveInitial = resolve; })
        : Promise.resolve({ status: "renamed", name: "Manual title" }),
    });
    test.controller.initialize(true);
    const initial = test.controller.handleSettled();
    const manual = test.controller.renameManually();
    resolveInitial?.({ status: "renamed", name: "Stale title" });
    await Promise.all([initial, manual]);
    assert.equal(test.name, "Manual title");
  });

  it("cancels pending work on shutdown", async () => {
    let request: NamingRequest | undefined;
    const test = createRuntime({
      generate: async (candidate) => {
        request = candidate;
        await new Promise((resolve) => setTimeout(resolve, 0));
        return { status: "renamed", name: "Too late" };
      },
    });
    test.controller.initialize(false);
    const naming = test.controller.renameManually();
    test.controller.shutdown();
    await naming;
    assert.equal(request?.signal.aborted, true);
    assert.equal(test.name, undefined);
  });
});

describe("name normalization", () => {
  it("normalizes presentation-insignificant whitespace", () => {
    assert.equal(normalizeName("  API   refactor "), "API refactor");
    assert.equal(normalizeName("  "), undefined);
  });
});
