---
name: auditing-tests
description: "Audits tests for behavioral value, duplication, implementation coupling, weak assertions, and test-only production seams. Use when writing, changing, reviewing, consolidating, or pruning tests in any repository or programming language."
---

# Auditing Tests

Apply one value bar in three modes:

- **Authoring:** gate every new or changed test at write time.
- **Audit:** inspect a focused area for low-value, duplicative, or
  implementation-coupled tests.
- **Campaign:** audit one production owner area's complete test surface. Read
  [CAMPAIGN.md](CAMPAIGN.md) before starting this mode.

Optimize for confidence, not deletion count. Keep broad audits in separate,
coherent changes unless the user asks for a larger campaign.

## Establish repository context

Do not assume a language, framework, directory layout, or test level. Before
judging tests:

1. Read applicable repository guidance files.
2. Identify the requested scope: unit, component, integration, contract, end to
   end, or a specific owner area.
3. Discover test frameworks, test directories, shared fixtures, test utilities,
   canonical commands, and CI behavior from configuration, build files, package
   scripts, and workflows.
4. Identify the production owner and the strongest practical boundary at which
   its behavior can be observed.
5. Identify slower or external suites that may provide stronger proof, and
   verify that they actually run in CI or another enforced workflow before
   treating them as replacement coverage.

Prefer repository-native commands and conventions. Examples in this skill are
conceptual, not defaults to impose on a repository.

## Authoring gate

Before adding a test, answer four questions. If one has no answer, do not add
the test yet:

1. What observable behavior, invariant, or independent contract does it
   protect?
2. What credible regression makes it fail?
3. Why does existing coverage not already catch that failure? Give each
   contract one primary owner at the strongest practical boundary. A second
   layer needs a distinct risk the primary owner cannot exercise.
4. Does the test require a production hook, flag, wrapper, injection parameter,
   reset function, visibility change, or other seam that no production caller
   needs? If so, first try testing through the real boundary.

Prefer extending an existing parameterized or table-driven test over adding a
near duplicate. Reuse or improve the repository's shared fixtures, factories,
and test utilities rather than copying setup.

A test that fails under behavior-preserving refactoring is probably asserting
implementation rather than behavior. Rewrite it at the owning boundary unless
it independently protects a structural contract.

For a bug regression, prove that the test fails on the pre-fix behavior for the
intended reason and passes after the owner-boundary repair. Do not replay the
same regression at every layer it crosses unless each layer contributes a
distinct failure mode.

## Junk patterns

Use this checklist both to gate new tests and to find audit candidates:

- assertion-free coverage probes, including tests that only assert that a mock
  or spy was called;
- self-comparisons, identity copiers, and tautological assertions;
- copied fixtures, manifests, inventories, schemas, or constant lists that have
  no independent source of truth;
- exact source, import, generated-output, snapshot, or string checks that merely
  restate implementation;
- private-helper tests duplicated at a real boundary;
- repeated invocations of the same contract across layers, implementations, or
  providers without a distinct risk;
- call-by-call mock or spy assertions that transcribe the implementation rather
  than verify resulting state or an externally meaningful interaction;
- tests whose only purpose is preserving test-only production seams;
- production code whose only callers are tests and which protects no contract;
- expected values produced by the same helper, parser, serializer, renderer, or
  algorithm under test;
- fakes or mocks that implement the behavior being asserted;
- patching the function under test, or patching the owner responsible for
  producing the asserted result;
- persistence asserted against a fake or patched store when a practical real,
  temporary, in-memory, or emulated store is the stronger boundary;
- capability or configuration tests that restate declarations without
  exercising the behavior they gate;
- negative controls that pass for an unrelated reason or never reach the path
  they claim to test;
- names, fixtures, or data that promise more than the input exercises;
- broad snapshots whose meaningful contract is unclear or whose churn hides
  regressions.

A match makes a test suspect, not automatically deletable. Apply the retention
bar before changing it.

## Value and retention bar

Keep a test when it independently protects observable behavior, a credible
regression, or a meaningful contract such as:

- a public API, protocol, schema, file format, command-line interface, or wire
  representation;
- authentication, authorization, privacy, security, or safety behavior;
- persistence, transaction, migration, ordering, idempotency, or concurrency
  invariants;
- documented defaults, configuration keys, environment behavior, routing, or
  resource ownership;
- cross-platform, cross-runtime, dependency, or compatibility behavior;
- build, packaging, deployment, generated-artifact, or architecture contracts
  consumed outside the implementation;
- a user-visible regression with a credible failure mode.

Call ordering is worth retaining when order is observable behavior. Source or
artifact inspection can be valid when it is the cheapest independent guard for
a literal key, byte, path, symbol, or generated shape consumed elsewhere.

Static, slow, mocked, or implementation-adjacent is not by itself a deletion
reason. Determine what the test can detect and whether stronger proof remains.

## Investigate before editing

Keep discovery read-only and report evidence before making broad edits. For
each candidate, read:

- the complete test, including parameterized rows and inherited/shared setup;
- its production owner, entry point, callers, and relevant callees;
- sibling implementations and tests that may overlap;
- applicable guidance, documentation, CI, and build configuration;
- relevant history and blame for both test and production code;
- dependency source or authoritative documentation when the contract depends
  on a library or platform behavior.

For broad scope, split discovery by production ownership or behavior, not
filename prefix. Infer lanes from the repository architecture: for example API,
domain/service logic, persistence, providers/adapters, jobs, transports,
platform code, or build tooling. Outside campaign mode, prefer a few
high-confidence candidates over a speculative inventory.

## Candidate evidence

Record this evidence before deleting or consolidating a test:

- the framework-native test identifier or exact file and declaration;
- the behavior or failure it can actually detect;
- non-test callers of any covered production or support seam;
- stronger remaining owner-boundary proof, or why no proof is needed;
- relevant history and why the test or seam exists;
- production or test-support deletion unlocked;
- owner-scoped coverage with and without the test, when practical and supported;
- risk and the focused validation command.

Coverage is supporting evidence, not proof of behavior. An unexplained drop in
owner coverage contradicts a claim that equivalent execution remains; inspect
it before deleting. When useful coverage tooling is unavailable, use stronger
behavioral evidence rather than manufacturing a metric.

## Edit shape

Choose one coherent owner-boundary batch. Prefer these transformations:

- retain one clear contract owner and remove weaker duplicates;
- move retained regressions to the suite that owns the behavior;
- consolidate repeated cases into the framework's parameterized or table-driven
  form;
- strengthen assertions that currently pass for unrelated reasons;
- delete obsolete test-only hooks, wrappers, globals, and dead production paths
  instead of preserving aliases.

Do not add replacement tests that restate the same implementation. Do not turn
uncertain candidates into cleanup merely to increase deletion counts.

When tests move, rename, or disappear, search all guidance, documentation,
scripts, CI configuration, manifests, and build files for stale references.

## Validation

Use the repository's canonical setup and commands discovered earlier:

1. Run the smallest affected test declarations and their closest sibling or
   owner suite.
2. Exercise the real owner command, entry point, renderer, build, or integration
   check when removing source inspections, snapshots, manifests, or generated
   artifact assertions.
3. Run configured formatting, linting, type-checking, and diff/whitespace checks
   for changed files.
4. Run the broadest relevant enforced suite, ideally the same command CI uses.
5. Compare owner-scoped coverage when it is useful and available.
6. Inspect the final diff and report production/support changes separately from
   test changes.

Do not claim a deleted test was redundant until focused validation proves the
retained owner test exercises the contract. For high-risk consolidations,
deliberately mutate or revert the relevant production behavior and confirm the
retained test fails, then restore the source exactly.

External systems, paid resources, production data, deployments, and other
shared side effects still require the approvals defined by the active agent and
repository instructions.

## Handoff

Report only what helps review the result:

- low-value categories removed or repaired;
- owner-boundary proof retained;
- production and test-support simplifications;
- notable candidates retained and why;
- focused and broad validation actually run;
- coverage evidence, where meaningful;
- production/support versus test line changes;
- references updated; and
- remaining delivery state or follow-up work.
