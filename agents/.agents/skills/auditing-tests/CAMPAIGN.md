# Test-audit campaign

Campaign mode audits one production owner area's complete test surface as a
coherent change. The value bar, retention bar, evidence requirements, and
validation in [SKILL.md](SKILL.md) apply throughout.

Do not assume a specific branch, review, or merge strategy. Follow the target
repository's guidance and the user's requested delivery shape.

## 1. Baseline

Pin the starting revision. Record:

- in-scope test and support line counts;
- each in-scope suite's pass/fail state;
- owner-scoped coverage when practical and supported; and
- existing failures separately from audit candidates.

Use repository-native test and coverage commands. A failing baseline test may
indicate a product defect; do not classify it as stale until investigated.

Complete this stage when every in-scope suite has a recorded result and the
available owner evidence is reproducible.

## 2. Lanes and inventory

Split the surface along production ownership and behavioral contracts, not file
prefixes. Include cases for the owner that live in shared API, service,
integration, contract, platform, or end-to-end suites.

Complete this stage when every in-scope test declaration belongs to exactly one
lane. Treat a parameterized or table-driven declaration as one item unless its
cases protect materially different contracts.

## 3. Read-only ledger

Inspect each lane without editing. Parallelize independent lanes when useful
and supported, but do not duplicate investigation. Read complete tests, shared
setup, production owners, entry points, callers, dependencies, and relevant
history.

Mark every declaration:

- **R — retain:** name the contract and credible regression;
- **F — fix:** retain the contract but repair a weak or misleading assertion;
- **C — consolidate:** name the existing or planned owner that absorbs it;
- **D — delete:** name the stronger remaining proof or explain why no contract
  exists.

Judge tests by what their assertions can detect, not by names or apparent
intent. Complete this stage when each declaration has a mark and evidence.

## 4. Owner-boundary plan

Treat the ledger as input, not an edit list. Look for redundant layers: for
example adapter suites replaying shared base behavior, API tests repeating a
service contract, or unit tests duplicating a reliable integration boundary.

Name the keeper for each contract and prefer the strongest practical real
boundary over a mocked collaborator. Correct ledger mistakes when layer-level
analysis reveals them.

Complete this stage when the plan names retained owners, retired layers,
assertions that must move, and test-only production seams that can disappear.

## 5. Cutover

Edit lane by lane. Serialize changes to shared fixtures, factories, helpers,
snapshots, and harnesses through one owner. With each lane:

- move any unique contract into its keeper before deleting the old proof;
- remove test-only production seams the deletion unlocks;
- strengthen vacuous or misleading controls; and
- update stale references in guidance, docs, scripts, CI, manifests, and build
  configuration.

Complete this stage when every plan is applied, keeper suites pass, and searches
find no stale references to retired tests.

## 6. Preservation review

Review deleted coverage against keepers lane by lane. Look specifically for:

- contracts that lost their only proof;
- new assertions that cannot fail;
- negative cases that fail before reaching the intended path; and
- unexplained owner-coverage changes.

For restored or high-risk contracts, mutate or revert the owning production
behavior and confirm the keeper fails. Restore the production source exactly
after each check.

Complete this stage when each gap is restored or rejected with source evidence
and high-risk keepers have demonstrated failure sensitivity.

## 7. Product defects

A baseline failure that survives in the keeper may be a product bug. Separate
the product repair from test pruning when that improves reviewability. Prove the
repair with the same harness: failing control before the fix, passing candidate
after it.

Do not opportunistically fix unrelated discrepancies. Record them for follow-up.
Obtain required approval before tests that mutate shared systems, consume paid
resources, deploy, or operate on production data.

## 8. Reconcile and hand off

Campaigns may outlive changes to the target branch. Reconcile using the
repository's documented workflow. If upstream changed a retired test, preserve
any new contract by moving it into the keeper rather than restoring a redundant
layer. Rerun the broad relevant suite on the reconciled revision.

In addition to the standard handoff, report:

- baseline and final test/support lines, with production separate;
- baseline and final owner evidence or coverage;
- lanes, retired layers, and keepers;
- preservation gaps and failure-sensitivity checks; and
- product defects with control and candidate proof.
