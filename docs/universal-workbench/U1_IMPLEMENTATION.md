# U1 implementation and review candidate

Owner authorization: attached U1 brief, baseline `d3296549676e942ae402fcee7ea570d8fc51a16e`. Branch `dev/u1-universal-execution`. This document supersedes the preparation-only boundary of the handoff for this authorized milestone; all nine gates still apply. U2 and main merge remain unauthorized.

## Implemented surface

WorkflowService dispatches explicit schema 1/2 documents in the existing workflow/revision store. The original editor remains available; schema 2 opens the universal canvas at the same `?workflow=` URL, or enter `/?workbench=1`. Four generic operation kinds execute through one registry-driven serial DAG. No project or provider names occur in scheduler dispatch.

Input accepts bounded text, finite number, boolean, trusted `cf.document@1` records, or managed PNG artifact IDs. Transform selects registered text normalization, record normalization, record-to-text or image identity. Invoke selects a pinned local text-statistics manifest and computes actual characters/words/lines. Output returns its upstream artifact version without creating another version. Text/record cards and real local image bytes appear on canvas; history selects prior run results. Semantic edits mark results historical; cosmetic edits preserve compatibility. The inspector offers configuration editing, typed ports, capability selection and schema-derived parameter fields.

The shipped local capability is deterministic computation, not an LLM or simulated provider. `weave.plan` is an **external-dependent, blocked descriptor**, not current model discovery or an executor. U1 creates no generated image and makes no external model call. Legacy actual model discovery, reference limits, exact quotes, structured approvals and credit stops remain in their existing bridge. Universal adapter submission and collections/conditioning roles beyond the single `value` role are deferred; do not infer that model parameters are interchangeable.

Trusted registry extensions execute in the server process, not a sandbox. Workflow JSON cannot register code. The extension test adds a compatible local capability without editing the scheduler. Recipes are versioned catalog compositions in U1; nested executable groups and recipe publication/storage UI are later work. Existing reusable legacy groups remain intact.

## Contracts and persistence

Decision authority: `docs/decisions/2026-10-24-u1-execution.md`. Executable schemas/catalog: `src/lib/workbench/contracts.ts`, generated `evidence/u1/contracts.json`. Node kinds and operation version 1 are distinct from document schema 2, editable revisions, capability/transform versions, artifact versions, run UUIDs and attempt UUIDs.

Ports are required single values, explicitly typed and schema-resolved; unknown schemas, collections, mixed documents, later primitives and incompatible connections fail closed. Four config JSON schemas are discoverable through `universal_catalog`. No arbitrary schema fetch or implicit coercion. Missing values are absent and are not converted to null. Saved incomplete graphs have readiness diagnostics; invalid structure/configuration cannot persist.

WorkflowService pins the current manifest hash when saving a new Invoke configuration. A changed contract cannot silently reinterpret that saved operation. The canvas also compares frozen and current manifest hashes; changed/expired manifests make prior results historical. Compatible node/edge array reorder is normalized by stable ID in both visual and server semantic comparisons, as verified after the independent G3 repair.

SHA-256 uses pinned `json-canonicalize@2.0.0` RFC 8785, domain `creative-flow-jcs-v1` plus NUL, supported finite JSON with valid Unicode. Text retains exact Unicode/UTF-8 without normalization. Binary content hashes actual PNG bytes with SHA-256. Semantic graph identity excludes layout/name/labels/groups/revision, includes configs/edges/versions. Each run separately freezes the saved graph and resolved port/config/manifest/settings contracts and hashes that entire snapshot. Published manifest hashes pin capability metadata and settings schema; versioned trusted handler identity is the code contract, not a binary attestation.

Artifacts have immutable version UUID, logical family, sequential version/predecessor, digest, producer/run/attempt/snapshot, typed parent bindings and explicit local/imported provenance. Seals are corruption checks, **not authenticated signatures** against a privileged database editor. Reads verify content, producer, run output, lineage and bytes. Deleting current operations retains their run/artifact history.

PNG imports validate base64, name, signature, chunk CRCs, dimensions and inflated scanline bounds before persistence. Supported subset: 8-bit, non-interlaced grayscale/RGB/grayscale-alpha/RGBA, maximum 4096 per dimension and 8 MiB compressed bytes. Indexed PNG, other media formats and arbitrary destinations are unsupported. Content-addressed files are staged and atomically renamed before DB visibility; a pre-commit crash can leave an unreferenced blob/temp file. U1 retains such files; no destructive garbage collection. Missing/corrupt bytes fail visibly, never replaced silently. Both legacy asset routes now honor the configured root, fixing the prior test isolation defect.

Additive migration ledger/tables hold artifacts, runs, attempts, execution locks and owner PIDs. Existing tables/columns/documents are untouched. Migration is transactional, idempotent, rejects future ledger versions; injected failure rolls back. Backup was captured with SQLite VACUUM INTO, not a live WAL file copy. Rollback: stop processes, retain the U1 root and restore the verified pre-U1 backup with the baseline binary. Old binaries are not promised to render schema 2.

## Execution and authority

`CREATIVE_FLOW_ALLOW_LOCAL_EXECUTION=1` explicitly grants managed computation/import/artifact persistence. It defaults to disabled and is independent of MCP `--write` or HTTP write credentials. Read clients cannot execute/import/write. There is no network, arbitrary file-read/export, publish or spend grant. UI is the existing single-user loopback trust boundary, not hosted authentication.

Runs/attempts are persisted before handlers. Workflow-scoped idempotency keys bind the exact saved snapshot; repeat delivery returns the original run; changed revision with the same key conflicts. A cross-process workflow lock prevents different-key concurrent execution. Attempt starts, completions/failures and final lock release are transactional with compare-and-set. Dependencies fail closed; unrelated branches may proceed. Output cannot complete successfully after a failed dependency.

Restart never replays adapters. Live-owner executions remain running; a dead-owner run becomes interrupted and requires a new explicit key/run. Recovery is local maintenance and may persist interrupted status during the first read. PID reuse/permissions can conservatively leave a run held; manual inspection is required, never automatic replay. No distributed scheduler or exactly-once external effect guarantee is claimed.

## Verification and acceptance boundary

`evidence/u1/` retains preliminary failures and repaired proofs separately. Official Inspector scripts use explicit isolated database/media environments and exercise both transports/grants. Browser proof owns only its port 5175 process, verifies real previews and restart with nonlocal requests blocked. Legacy proof bodies use isolated endpoint/evidence substitutions plus the expected additive discovery counts (22 write / 9 read tools). No historical evidence is overwritten.

The final verification record supplies command outcomes, all nine gates and exact candidate lineage. Inspector/Codex calls are **not ChatGPT-side evidence**. Existing tunnel authorization/profile/credentials remain unchanged. G8 remains HELD unless an actual ChatGPT conversation performs discovery, author/save, separately permitted execution and artifact read against the U1 server, and opens the returned local URL. The precise manual action is to restart/reconnect the existing local tunnel server against the U1 candidate with an explicit local-execution grant, refresh ChatGPT tool discovery, then run that sequence and provide its workflow/run IDs. Do not paste credentials or authorize Weave generation.

Deliver as a draft PR for owner review. Do not merge or begin U2.
