# U0 independent challenge

Initial reviewed candidate: `fd646e9ba3a2c76460254533124dd968c2c46377` on `dev/u0-universal-workbench`, 24 October 2026. Reviewer was separate from the candidate author. Scope was U0 only: source, tests, contracts, migration claims, negative probes and read-only preservation checks. No paid execution, uploads, generation, production mutations, U1 implementation or build over the live server was performed.

Initial verdict: **HELD** for the original candidate. The findings below were repaired and independently rechecked at exact candidate `bea4c50857fa4805eafd899c8e8656040adb0216`. Final technical U0 verdict: **PASS WITH NON-BLOCKING LIMITS**. Owner walkthrough/acceptance (U0-6) and U1 authority remain pending.

## Checks performed

- Read root AGENTS and the full Universal Workbench design pack, U0 assessment/contracts, source under `src/lib/universal`, tests and evidence/proof scripts.
- Confirmed exact HEAD and clean working tree before review.
- `npm test`: PASS, 33/33 tests.
- `npm run check`: PASS, zero errors and warnings.
- `node --import tsx scripts/u0-proof.ts --restore`: PASS in a fresh Node process, zero external calls and no executor replay.
- Diff against Stage 2 baseline `45c9096780df1e43c32f5a15a5bafb2ce2170728`: no production engine, registry, service, HTTP, MCP or editor changes from U0. Source inspection confirms no network/provider executor in the spike and no production import of it.
- Read-only SQLite comparison confirmed all original rows byte-for-byte: 12 workflows, 32 workflow revisions, 30 runs, 13 requests and 4 workflow-asset associations. Additional fixture rows are 1/5/1/0/1 respectively, consistent with the disclosed first Inspector harness attempt. No baseline deletion or alteration observed.
- GET of the live original `borderpoint-image-first-chatgpt` workflow matched current SQLite exactly.
- Historical build/browser/Inspector evidence was inspected but not independently rerun; original server remained live. Fixture demonstrations are explicitly labelled, and approval parsing grants no execution authority.

## Initial blocking findings and reproduction (resolved)

Each probe starts with `r = structuredClone(runLocal(localRecipe(), 0))` and calls `restoreRun(r)` after the described mutation. These are in-memory fixture changes only.

1. **Typed artifact history is not validated against the value or producer signature.** Set `r.artifacts[0].type = { kind: 'image', collection: false }` while leaving its text value and digest unchanged. Restoration accepts it. Separately, set its value to `false` and digest to `digest(false)` while retaining text type; restoration accepts it. Finally, `r.artifacts[0].origin.operationId = 'out'` is accepted even though Output returns existing artifacts and did not produce this one. Existence of an operation and a digest is insufficient to validate typed history. Reject incompatible values/types and require an output-producing operation with the correct declared signature. Include negative restart tests.
2. **Artifact lineage can become cyclic.** Set `r.artifacts[0].parentIds = [r.artifacts[1].id]`. The transform already parents the imported artifact, so this forms a two-artifact cycle; restoration accepts it. Check lineage acyclicity and producer/dependency consistency when recovering history. This is validation of the existing U0 representation, not a request for U1 persistence.

A further probe setting `r.events = []` is accepted for a completed run. Ordered/complete execution-event semantics should be either validated for the supported U0 slice or clearly left as contract-only metadata. This is secondary to the typed/lineage blockers.

## Non-blocking contract limits

The documented deferrals are honest: structured schema resolution, authenticated external provenance, role-to-parent bindings, durable scheduling, canonicalization interoperability and production approvals remain later work. Four domain examples are architectural/static demonstrations rather than runnable multimedia recipes. The original prose/fixture domain-list mismatch was corrected: illustration now matches the fourth structural fixture and financial reconciliation is an additional paper challenge.

No credit-spend or authorization bypass was found. `planInvoke` always returns blocked with zero external calls and empty outputs; adding arbitrary manifest versions does not dispatch anything. Required acceptance remains with the owner, and this review does not authorize U1.

## Independent repaired-candidate recheck

Exact reviewed SHA: `bea4c50857fa4805eafd899c8e8656040adb0216`. Inspected the repair diff independently. Artifact origins now pin producer output-port identity, value/type validation uses that declared port, Input values must match the frozen configuration, and parent identities must exactly match upstream recipe bindings. Output remains pass-through and cannot claim to produce an artifact. Completion-event sequence, dependency order, uniqueness, coverage and required producer outputs are checked for completed U0 runs.

- Independently reran `npm test`: **35/35 PASS**.
- Independently reran `npm run check`: **zero errors/warnings**.
- Repeated all original adversarial mutations; cyclic lineage, wrong value type with recomputed digest, changed declared artifact type, reassigned Output producer and erased events now reject.
- Additional independent probes: omitted transform parent, unknown output port and altered Input value with recomputed digest all reject. Eight negative probes total passed.
- Positive JSON round-trip restoration remains valid. A chained Output pass-through recipe restores with one original artifact, confirming the lineage repair does not fabricate versions or break that valid path.
- Both fixture and external-dependent Invoke manifests still yield blocked plans, zero external calls and empty outputs.
- Fresh-process `node --import tsx scripts/u0-proof.ts --restore` passes and does not replay work.

No unresolved U0 correctness blocker found after repair. This is independent source/test validation of the isolated feasibility slice, not acceptance of a production universal engine. General media/structured schemas, provenance authentication, role-to-parent persistence and production orchestration remain explicitly deferred. Manifest constraint consistency and version-policy hardening remain reasonable U1 work; the U0 planner cannot dispatch any capability. Build and browser/Inspector proofs remain author-run evidence; this reviewer did not rerun a build over the live server. The parent was instructed to rerun the production build separately after repair.
