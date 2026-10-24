# Codex handoff — U0 Universal Workbench foundation

**Status:** Ready as a proposed agent handoff. The owner's 24 October 2026 approval selects the **Option C architectural direction**; it does not, by itself, authorize all implementation stages. When the owner explicitly asks Codex to begin U0, use this brief as its scoped authority. Do not proceed to U1 without new acceptance.

## Repository and anchors

- Repository: https://github.com/radz2291/bpwv
- Documentation branch: docs/universal-workbench-foundation (merge/accept before treating it as project baseline).
- Inspected main baseline: b673887bd5555fca9a2ce67391254aa073f100ed.
- Read root AGENTS.md, ARCHITECTURE.md, WORKFLOW_CONTRACT.md, NODE_CATALOG.md, STATE.md, MCP_SETUP.md and this complete design pack.
- Inspect the actual local working tree and current branch before changing anything; local Codex work can be ahead of tracked GitHub.

## Outcome

Prove an extensible, project-agnostic execution design rather than implementing another batch of BorderPoint-specific features. The core vocabulary starts with Input, Transform, Invoke, Branch, Iterate, Approve, Subflow and Output; task-specific behavior belongs to versioned recipes, prompt configurations, capability manifests and provider adapters. Media is represented as typed, versioned artifacts with provenance.

U0 is a controlled **contract-and-spike milestone**. Produce a coherent, reviewable proposal and minimal non-paid proof. Do not replace the running application.

## Stage-manager responsibilities

1. Reconstruct actual code and evidence; document discrepancies between tracked state and current local runtime. Do not overwrite a dirty worktree.
2. Map the existing node kinds and workflows to proposed operations; keep old graph JSON and IDs untouched.
3. Specify typed artifact, role, capability manifest, recipe, run and operation interfaces with explicit schema/version migration rules.
4. Implement an isolated testable spike or feature-flagged prototype showing typed Input → Transform → Output, a manifest-driven Invoke plan and real error paths. A fake provider may demonstrate shape only if visibly identified as fixture; it must never report a successful external generation.
5. Falsify the abstractions with the four reference scenarios and adversarial probes: wrong image role, invalid typed port, provider parameter drift, unavailable external capability, stale revision, cancelled iteration, cost approval absence, restart after pending.
6. Have a fresh verifier challenge the exact candidate independently where practical. Keep findings, repair in-scope defects, re-verify and report the tested SHA and gate verdict.
7. Update project docs and STATE.md only to reflect observed U0 results; propose any contract forks to the owner with concrete examples.

## Scope exclusions

- No automatic paid calls, video batch runs or inferred Weave subscriptions/API rights.
- No destructive migration, dropping legacy nodes, overwriting BorderPoint candidate images, or replacing SQLite schemas in place.
- No external deployment, publishing, unrelated Blender operations, credential disclosure or broad file-system access.
- No implementation of all eight production primitives, agent autonomy layer or full UI redesign in U0.
- No per-task nodes such as 'Scene Director', 'Visual Reviewer', 'Persian Miniature' or 'Refinement Image Edit'.

## Required evidence

- Clean and dirty-tree handling record and base/candidate SHAs.
- Written compatibility matrix and proposed versioned schemas.
- Executable deterministic spike tests, including typed port rejection and immutable lineage.
- Four cross-domain recipe demonstrations (can be static/fixture in U0, correctly labelled).
- Explicit negative tests for approvals, unknown model contracts and cycle/iteration boundaries.
- Check/type/test/build results for touched code, plus UI/MCP/restart proof only where U0 changes affect those behaviors.
- Independent challenge report, corrected candidate and final verdict.

## Owner-facing exit

Show what the user can inspect, what remains a specification, what was actually implemented, and the smallest safe choice for U1. Pause if a new primitive appears necessary or if preserving existing workflows requires a material product decision. Do not self-accept U0 or initiate U1 without the owner.

Use [MIGRATION_AND_GATES.md](MIGRATION_AND_GATES.md) for criterion IDs and [PRIMITIVES_AND_CONTRACTS.md](PRIMITIVES_AND_CONTRACTS.md) as a design hypothesis, not immutable truth.
