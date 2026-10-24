# Universal Workbench — migration and proof gates

Status: staged **implementation proposal** derived from the 24 October 2026 approved architecture direction. No implementation stage has been accepted merely by publishing this document.

## Verified baseline versus proposal

Repository: radz2291/bpwv, main at **b673887bd5555fca9a2ce67391254aa073f100ed** when this documentation branch was created. Existing tracked implementation includes Svelte Flow editor, versioned node registry, shared WorkflowService, SQLite persistence, transactional MCP authoring and Weave model request/approval bridge. Current root documents are historical implementation contracts.

At the time of proposal, the connected MCP registry exposed seven kinds: Text, Combine, Asset Input, Reference Set, Weave Model, Preview and Refinement. Some older root documentation says 'six initial' because Reference Set was added subsequently or documented separately; verify current source before treating counts as an invariant.

Real Weave generation and exact asset/prediction evidence belong to the user's running local environment; the GitHub baseline's earlier STATE.md cannot independently prove any later paid run. Never erase existing BorderPoint graphs or rewrite historical evidence during migration.

## Compatibility mapping

| Existing kind | Proposed representation | Migration concern |
| --- | --- | --- |
| Text | Input(text) | Preserve exact prompt content and ordering. |
| Combine | Transform(concatenate) | Preserve port ordering and separator byte-for-byte. |
| Asset Input | Input(imported artifact) | Preserve URI, content hash if available, media role and provenance. |
| Reference Set | Transform(collect references) | Preserve collection order and distinction between one-call conditioning versus iterations. |
| Weave Model | Invoke(discovered Weave capability) | Preserve selected provider model ID, exact contract, params, snapshot and approval boundary. |
| Preview | Artifact viewer UI | Existing edges/graph semantics still need a compatibility representation; do not delete legacy Preview nodes until round-trip parity is proved. |
| Refinement | Transform(feedback merge) or a versioned edit recipe | Existing v1 is deterministic text consolidation; do not silently reinterpret it as paid image editing. |

Retain the legacy registry, schema version and reader as required for saved graphs. Prefer explicit opt-in conversion producing a new recipe ID or revision with a dry-run diff and round-trip verification. Do not silently retype older nodes or invent output assets.

## Staged roadmap

### U0 — Foundation contract and reality audit (first proposed Codex handoff)

Outcome: independently reviewed design, actual implementation map, typed contracts, conversion plan and a small executable **non-paid** feasibility proof. This stage does not replace the running app or claim delivery of eight full primitives.

Scope:
- verify git/working-tree baseline, root AGENTS and current source/runtime contracts;
- challenge the eight-operation vocabulary against four cross-domain recipes and failure cases;
- define proposed artifact/role/manifest/recipe/run JSON schemas with explicit versioning and examples;
- prove one typed deterministic Input → Transform → Output path, and one manifest-driven Invoke shape with a **stub that cannot masquerade as external success**;
- demonstrate compatibility expectations for an existing saved workflow;
- record unresolved product choices before irreversible implementation.

Gate:
- U0-1 Every proposed data/operation/role contract validates both good and intentionally incompatible fixtures.
- U0-2 Four domain examples are expressible without creating domain-named node kinds.
- U0-3 A typed dependency/lineage test retains source IDs and detects invalid ports.
- U0-4 No paid provider calls, hidden publishing, graph deletion or unauthorized new service.
- U0-5 A reviewer independent of the candidate author challenges graph migration, permissions, approval gates, and legacy behavior at the exact commit.
- U0-6 Owner receives a walkthrough of the feasibility proof and explicit remaining forks; acceptance is not inferred.

Stop: if the eight primitives demonstrably cannot express a necessary behavior without semantic ambiguity; if current graphs cannot be preserved; if any provider integration requires unavailable rights; or if implementing U0 would require destructive schema changes.

### U1 — Universal execution core with legacy compatibility

Outcome: first usable engine slice (Input, Transform, Invoke, Output) and immutable artifacts; old workflows remain operable. Exact code scope and migration authorization must be separately accepted.

Gate: typed runtime, manifest-driven local/model adapter selection, actual persisted lineage, recoverable results, UI/MCP parity, no success fabrication, cost approval retention, legacy reopen and round-trip tests.

### U2 — Structured orchestration and governance

Outcome: Branch, bounded Iterate, durable Approve and versioned Subflow with resumable runs.

Gate: skips versus failures, bounded attempts, cancel/restart, subflow signature validation, per-item budget authority and no double spend under retries. No raw unbounded graph cycles.

### U3 — Agent + two synchronized workbench views

Outcome: Creative View and Engineering View edit one recipe model. Agent proposes typed revisioned diffs; user can inspect and accept them; live artifacts and comparisons are visible.

Gate: stale revision conflict, direct manual node edit, agent add/change/remove, preview accuracy, reversible authoring and editing of nested recipes.

### U4 — Project-agnostic product proof

Outcome: four real scenarios reconstructed through the same primitives: BorderPoint illustration/review/refine, multi-shot video workflow, research/report, and deterministic media processing.

Gate: no project-specific engine changes; real model calls only when separately quoted and approved; successful end-to-end execution recorded per candidate SHA; owner product walkthrough.

## Global acceptance criteria

1. **Node stability:** No Scene Director, Persian Miniature, Visual Reviewer, ECCO Shot, Client Report or model-specific core kind is introduced to handle an ordinary new task.
2. **Real media:** Actual generated assets show on-canvas thumbnails/playback and clickable version lineage; importing a URI cannot be mislabeled as generated.
3. **Provider agnosticism:** Swapping a compatible discovered provider changes configuration/manifest, not engine branching; incompatible ports are blocked visibly.
4. **Cost control:** No invocation consumes credits without payload-specific quotation and explicit approval; batch/loop counts are visible.
5. **State:** Every run and approval survives process restart; pending work is not silently re-executed.
6. **Agency:** Canvas, REST and MCP share one transactional authoritative service; conflict checks remain.
7. **Preservation:** All pre-migration workflows and artifacts can be reopened and compared against their frozen snapshots. No forced automatic conversion.
8. **Proof:** Tests and actual user-visible behavior must be distinguished; a stub or pending adapter is never counted as a real model success.

## Verification and ownership discipline

For each separately accepted stage: one stage owner integrates an exact candidate SHA, arranges fresh-context independent challenge where feasible, repairs in scope, reruns affected evidence and delivers the final PASS / PASS WITH NON-BLOCKING FINDINGS / HELD / FAIL / BLOCKED verdict. Record commands, tested SHA, negative probes, media previews and remaining unknowns. Builder self-report is not independent acceptance.

Root STATE.md remains the single live implementation-status record. On real stage execution, update it and relevant root architecture/contract files, retaining old versioned evidence. This design document is not a substitute for an implementation report.
