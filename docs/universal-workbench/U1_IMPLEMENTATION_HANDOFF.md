# U1 implementation handoff — Universal Execution Foundation

Prepared 24 October 2026. **Preparation only; U1 implementation has not begun and requires a separate owner instruction.** U0 is owner-accepted as PASS WITH NON-BLOCKING FINDINGS. Acceptance establishes the foundation, not a production universal engine. The eight primitives remain the approved vocabulary; this handoff scopes only Input, Transform, Invoke and Output.

## Purpose and authority

Deliver one usable, project-agnostic universal workflow slice inside the existing application. ChatGPT must discover, construct, validate, save, execute permitted local work and inspect results through MCP; the same workflow and real outputs must appear in the visual editor and survive full process restart. Codex remains optional for runtime authoring. Preserve existing graphs, assets, history, MCP grants and the separate Weave credit process.

This document recommends engineering defaults and review gates. It does not authorize code changes, migration of user graphs, paid generation, uploads, public ingress, deployment, main merges or implementation of later milestones. A future instruction to begin U1 should identify its approved baseline and any changes to these gates. No paid generation is needed or authorized by this handoff, including a zero-budget test that silently calls an external model.

## Read and establish reality first

Read root `AGENTS.md`, `STATE.md`, `ARCHITECTURE.md`, `WORKFLOW_CONTRACT.md`, `NODE_CATALOG.md`, `MCP_SETUP.md`; this design pack including the U0 assessment, contracts, schemas, verification and acceptance/integration records. Confirm GitHub integration status rather than assuming PR #1 or #2 has merged. Recover exact accepted implementation and evidence commits from the closure record; preserve the held and repaired U0 candidates.

Begin implementation from the resulting integrated SHA only after owner-approved merges, or from a separately documented owner-authorized branch exception. The proposed review order is Stage 2 product (PR #3), Option C documentation (PR #1), U0 foundation (PR #2), then closure/preparation documentation. Re-read their actual current bases and heads; PR retargeting is integration preparation, not a merge or permission to start U1.

Inspect these actual implementation boundaries before designing replacements:

| Location | Existing responsibility / U1 constraint |
| --- | --- |
| `src/lib/contract.ts`, `registry.ts`, `engine.ts` | Legacy schema v1, seven versioned definitions and generic DAG execution. Keep their meanings readable and operable. |
| `src/lib/server/workflow-service.ts` | Sole graph authority; injected DB/registry, transactional batches, expected revisions, execution and associations. Extend this service; do not install a universal service as a parallel graph authority. |
| `src/lib/server/store.ts` | SQLite WAL, workflows, workflow_revisions, runs, requests, workflow_assets. Add migrations rather than rewriting legacy rows. |
| `src/lib/server/provider.ts`, `request-service.ts` | Actual Weave snapshots, immutable pending inputs, upload mappings, quote/decision audit. Preserve the separate official-tool execution boundary and existing stop policy. |
| `src/mcp/server.ts`, `stdio.ts`, `http.ts` | Shared service, typed schemas/annotations, stdio read-only default and authenticated HTTP grants. New execution effects cannot inherit graph-edit authority implicitly. |
| `src/routes/+page.svelte`, `FlowCard.svelte`, `media-view.ts`, `MediaFrame.svelte`, `workflow-fingerprint.ts` | Existing graph projection, actual media and compatible run restoration. Reuse without adding an alternate editor model. |
| `src/lib/universal/` | Experimental U0 schemas/spike, NOT a drop-in production scheduler or durable repository. Retain its evidence and fix limits explicitly when promoting concepts. |

Before any U1 migration, capture a consistent SQLite backup through supported SQLite backup/VACUUM facilities, plus inventory/digests of original rows and managed media. Do not copy a live WAL database as an ordinary single file. Record branch, SHA, dirty state, source archive digest and process/data-directory configuration without printing secrets. Use an isolated database and media root for all writable proof fixtures. Prove both visual and MCP processes use that isolated root before running mutation tests; U0's first Inspector attempt demonstrated why inherited environment alone is insufficient.

## Scope and excluded work

In scope: four versioned primitives, reusable trusted transforms, one real local non-paid capability behind a replaceable Invoke adapter, honest Weave planning boundary, durable artifacts, minimal existing-editor integration, service/MCP parity, restart recovery and additive compatibility. A small generic text/record recipe and a local media recipe supply product proof. Adding a transform or compatible capability must require registration/configuration rather than scheduler edits.

Registering four generic, versioned core operation kinds is permitted by this proposed U1 scope; domain-named kinds are not. The adapter executes genuine local computation with truthful local provenance. No external service account, model permission or paid run is necessary for the execution proof.

Out of scope: production Branch, Iterate, Approve or Subflow; recursive/loop scheduling; Creative/Engineering view redesign; autonomous agents, streaming, distributed compensation; hosted authentication/deployment; arbitrary workflow-supplied code; arbitrary external publishing or filesystem destinations; task-specific nodes; automated Weave submission. Scene Director, Visual Reviewer, Persian Miniature, shot planning and refinement remain labels, recipes, prompts, roles or capabilities. A collection of conditioning images remains one invocation, not a batch executor.

## Contract decisions to finalize before production persistence

Record the selected choices in a U1 ADR and generated schemas before implementing storage. The defaults below are recommendations within U1, not new owner acceptance. Escalate alternatives that require destructive changes, new effect authority or broader scope.

### One graph authority and explicit format dispatch

Recommended: add an explicit universal document format/version accepted by WorkflowService, with stable workflow, operation, edge and port identities. A schema-version discriminator selects legacy versus universal validation/execution at the composition boundary. Keep one workflow listing, URL model, revision check and transactional authoring service. A new internal executor is permitted; a second authoritative graph store or transport-specific mutation implementation is not.

Keep legacy schema v1 readable and editable unchanged. Do not overload legacy `asset` or rewrite legacy node versions to mean universal artifact references. Prefer universal-only documents for this first slice; mixed legacy/universal edges are rejected with actionable diagnostics until a deliberate adapter contract exists. The canvas may display either format using explicit projection. A unified envelope versus a versioned schema union is an implementation choice: document the decision and prove both readers before writing new-format records. Workflow schema, primitive version, recipe publication version, editable revision, manifest version, artifact version and run identity are distinct.

### Operations, bindings and validation

- **Input:** configured typed scalar/record or explicit managed-artifact import/reference. Validate actual value/bytes and provenance. An imported image is not model generation. Filesystem paths from agent JSON do not confer file-read rights.
- **Transform:** pinned ID/version selects trusted registered pure code with typed inputs/outputs and resource limits. No JSON code, shell commands or network side effects. Joining text, normalizing a declared record and collecting ordered references are reusable examples. Computing new image bytes can be pure; writing a user destination is a distinct effect.
- **Invoke:** pinned capability/manifest resolves adapter, roles, schemas, cardinalities, parameters and effects. Run a real deterministic local capability in U1; external/paid capabilities remain blocked or pending through the preserved bridge. Never mark a planning fixture as an executed external provider.
- **Output:** return/select existing artifacts without inventing a new version; materialize newly computed content into managed local storage under declared scope. Arbitrary file export/publication remains disabled. Shared runtime artifact persistence is infrastructure, not an implicit permission for every operation to write any destination.

Ports declare stable IDs, scalar/media/schema types, semantic roles, required/optional status, single/collection shape, ordering and bounds. Connections validate type AND role/cardinality. Missing optional values differ from null and from empty collections; document those rules. Require explicit registered conversion; never infer media roles from names. Frozen role-to-parent-artifact bindings must explain exactly which image was style reference, content reference or edit target.

Resolve at least one bounded, versioned structured-record schema by a trusted registry; reject unknown/remote `schemaRef` values rather than fetching arbitrary schemas or accepting opaque JSON. Implement only types backed by value validators and serialization/preview contracts; advertise unsupported audio/video/mask/timeline operations as planned. Reject duplicate IDs, unknown operation versions, cycles, undeclared ports/settings, multiple bindings, incompatible roles, invalid runtime outputs, non-finite numbers and unsupported JSON values. Save may allow incomplete drafts only with explicit readiness diagnostics; execution must fail closed.

### Artifacts and durable bytes

Recommended artifact identity: immutable artifact-version ID plus stable logical lineage/family ID, positive version and optional predecessor version ID. Enforce uniqueness transactionally. Each materialized version records type/schema, content digest, byte length/MIME where relevant, storage locator, access policy, parents and role bindings, workflow revision/run/attempt/operation/output port, semantic snapshot hash, origin and timestamps. External origins retain actual adapter/model/job IDs and explicit attestation status. Declared provenance is not authenticated proof.

Use a published canonicalization scheme, recommended RFC 8785 JSON plus SHA-256 for supported structured payloads; reject values outside its supported representation. Pin UTF-8/text normalization policy and digest domain/version. For binary media hash actual bytes, not its URL. Snapshot hashing excludes cosmetic layout/labels but includes all semantic inputs, operation versions, schemas, manifests, role bindings and settings. Persist that exact definition; legacy historical hashes remain untouched.

Store managed binary content beneath the configured data root with generated locators and atomic temporary-file rename; immutable records point to immutable bytes. Coordinate blob staging with SQLite commits, define orphan cleanup and crash recovery, and never expose partial results as completed. Content-addressed deduplication may share bytes, but distinct provenance records must not collapse into one artifact identity. No destructive garbage collection in U1.

Remote-only results must be labelled remote-dependent. U1's durability gate requires locally available bytes for its local media proof after restart with network access disabled. Do not download the historical BorderPoint remote output automatically or claim its URL became durable; importing remote content requires separate scoped authorization and network/size policies. Preserve all historical URLs and association IDs exactly.

### Runs, attempts and recovery

Freeze the saved workflow revision, semantic graph, resolved inputs/artifact versions, contracts and settings before execution. Persist run and attempt identity before invoking a capability. Use compare-and-set transitions and idempotency keys to prevent duplicate attempts from concurrent UI/MCP requests. Preserve immutable terminal artifacts/events; never revise a historical run to reflect a newer workflow.

Recommended U1 execution: bounded serial DAG, no automatic external retries. Distinguish idle/ready/running/completed/failed/blocked/pending-external/awaiting-approval/cancelled; implement only transitions the slice actually uses and explicitly project them into legacy-compatible UI states. Failed dependencies block descendants while unrelated branches follow a documented policy. No successful Output if its dependency failed.

Restart reconstructs completed artifacts and pending attempts without replay. Interrupted pure/local attempts may become explicitly interrupted/blocked and require an authorized retry; automatic recovery is allowed only with proven local idempotency and documented atomicity. An unknown external outcome must remain unknown/pending and require reconciliation, never silent resubmission. A resume is not a new spend authorization. Do not claim a distributed durable scheduler or exactly-once external execution.

### Provider capability and authority boundary

Manifest: stable capability/version/adapter identity, implementation status (`implemented-local`, fixture, planned or external-dependent), provider model/tool identity where applicable, discovery provenance/time/expiry, typed role ports, parameter schema/defaults/constraints, output contracts, effect/scope and quotation/reconciliation policy. Pin exact hash per attempt. Reject changed/expired contracts, unknown parameters, unsupported reference roles/counts and incompatible provider switches visibly.

Adapter proposal: discover/resolve/validate and permitted execute/inspect, with quotation/submission methods only where independently authorized and implemented. No engine branches on provider or project names. A second compatible local adapter/transform must work through registration alone. Local capability success creates genuine locally computed artifacts with `local` provenance; it cannot fabricate provider IDs or billable results.

Preserve legacy MCP `execute_local` rejection of generative workflows. Prefer a separately typed universal local-execution operation, or an explicitly documented compatible extension that refuses any nonlocal effect anywhere in its selected closure. Authoring write grant alone does not authorize universal execution: require an explicit configured managed-local execution policy, disabled when not granted, in addition to the write grant. This policy never grants network, arbitrary filesystem, upload, publish or spend. Read-only clients cannot execute, mutate or submit results. Keep typed MCP inputs/outputs and truthful readOnly/destructive/idempotent/openWorld annotations; execution is not read-only or universally idempotent.

For Weave, current discovery remains model-specific. Preparing an Invoke may produce a durable unapproved request with exact payload/manifest hashes and lineage; it must not produce a generated artifact. Preserve actual-quote → exact structured Approve/Cancel → official acknowledged-cost call semantics and the existing >=5-credit stop rule. Existing quote/decision audit is not an authenticated universal Approve primitive. U1 tests use synthetic quote records only in clearly labelled isolated negative tests, never as actual provider quotations. No authoring tool gains an approval override or automatic paid submission. No paid call is authorized even if an old approval is present.

## Additive migration and compatibility plan

1. Capture inventory/backup and establish regression fixtures before modifying schemas. Test migrations on isolated clones first.
2. Add an explicit migration ledger/version and new artifact/attempt/event/manifest storage as needed; retain original tables/documents and IDs. Make migration idempotent and transactional where possible. Avoid positional `INSERT ... VALUES` assumptions when extending existing tables; current code uses them. Prefer additive new tables over incompatible column changes.
3. Test a fresh database, a legacy Stage 2/U0 database, migration rerun, failure rollback and restart. Fail closed on unsupported future formats. Define recovery/rollback as restoration of a verified backup with processes stopped if old binaries cannot read the new format; do not promise old-binary compatibility without testing it.
4. Keep legacy registry/schema/provider/result behavior available. Verify original workflows, revision history, run snapshots, request inputs, associations and media byte-for-byte. New universal artifacts do not rewrite legacy asset metadata. Deleting a current operation must not delete its historical artifacts.
5. No automatic conversion. Any demonstration conversion creates a new workflow identity with source mapping and dry-run diff; source remains untouched. Preserve Text content, Combine ordering/separator, asset identity, Reference Set order, Weave inputs/approvals, Preview semantics and deterministic Refinement v1. Conversion need not ship in U1; explicitly reject unsupported imports rather than coercing them.
6. Separate normal writable proof database from final read-only original-data preservation inspection. Record any authorized new test workflows; tests must not silently pollute production data.

## Development stages for a separately authorized U1

| Stage | Concrete output and gate before advancing |
| --- | --- |
| U1-A — contracts and baseline | Reality inventory, ADR choices, schema/version/hash/identity/effect policies, fixtures and preserved legacy baseline. No destructive migration requirement. |
| U1-B — persistence | Additive schema, managed content store, immutable artifacts, frozen runs/attempts, transition guards, crash-safe persistence and fresh/legacy migration tests. |
| U1-C — local execution | Register four primitives and trusted transforms, one actual local Invoke capability, typed validation, lineage and blocked external planning. Execute through WorkflowService; no transport graph logic. |
| U1-D — authoring parity | Service discovery/schema/runtime queries, typed authorized MCP and thin HTTP adapters; atomic graph edits and stale-revision handling for universal documents. Inspector proof without visual server. |
| U1-E — minimal editor | Render/edit four operations, manifest-derived Invoke ports/forms, actual text/record/image results, artifact lineage/version selection and truthful states. Preserve original editor; no full view redesign. |
| U1-F — recovery and challenge | Full-process restart/offline reopen, fault/negative tests, legacy regressions, connected ChatGPT author/run/read proof, independent exact-commit challenge and repairs. |

Do not advance to later primitives to make a test pass. If a required feature needs a Branch/Iterate/Approve/Subflow executor, redesign the bounded U1 example or report the scope conflict.

## Executable product proofs and acceptance gates

Use fresh isolated workflows composed only of the four primitives. Proof A: Input text/declared records → registered Transform → real local Invoke (for example bounded deterministic document statistics) → Output artifact. Proof B: Input managed image → registered metadata/byte transform or identity operation → Output managed artifact with an actual on-canvas preview. At least one workflow exercises a nontrivial Transform and real local Invoke; identity-only diagrams do not establish execution. Use a generated local test fixture image, not paid image generation. Add another generic recipe/configuration without changing engine code to demonstrate project agnosticism.

| Gate | Required observable evidence |
| --- | --- |
| G1 — one authority | UI/HTTP/MCP return the same workflow IDs/revisions/ports; agent creates/configures/connects/saves, editor opens returned URL; editor change appears in MCP; stale competing edit rejects and atomic invalid batch leaves no partial write. |
| G2 — usable execution | Authorized MCP local execution produces actual persisted text/record results and local capability output; UI shows exact artifacts and states. Real bytes decode for media; no pending plan shown as success. |
| G3 — durable versions | Execute, edit semantic input, execute again: two immutable run snapshots and distinct lineage versions, prior content/digests unchanged. Output return references an existing artifact rather than adding a fictitious version. Cosmetic save retains compatible display; semantic edit clears current-result badges without erasing history. |
| G4 — restart | Stop/restart visual and MCP processes with the same isolated data directory; a fresh process/client retrieves both runs and artifact versions and editor displays actual results. Local media still works with external network unavailable. No hidden re-execution, submission or paid calls; attempt counters prove it. |
| G5 — typed providers | Manifest-derived ports/parameter form, model-specific role/count validation and deterministic local adapter work. Register another compatible transform/capability without scheduler changes. Unsupported/expired/changed capability blocks with diagnostics. |
| G6 — protected effects | No paid calls, uploads, remote publication or arbitrary destination writes. Read-only and insufficient-effect grants deny execution. Paid Invoke planning stays unapproved and produces zero generated artifacts; legacy Weave approval/result semantics remain unchanged. |
| G7 — preservation | Original workflow/revision/run/request/association inventory and managed file hashes unchanged; legacy editor and MCP proofs pass. Historical real BorderPoint output remains historical external evidence, not a newly run U1 result. |
| G8 — agent connectivity | Official Inspector verifies both configured transports/grants and offline visual-server authoring. In the existing connected ChatGPT plugin, an actual discover → create/apply/save → permitted local execute → get/artifact read succeeds; reopen its returned local URL. Record tool/run/revision IDs and origin without credentials. An Inspector-only test does not prove ChatGPT-side success. If account access is unavailable, report this gate HELD and the exact manual action; do not invent a pass. |
| G9 — independent review | Fresh-context verifier challenges exact committed implementation SHA, contracts, authority, migration, recovery and actual browser results; findings repaired in new commits, targeted evidence rerun, final SHA independently rechecked. Owner acceptance is separate. |

Negative probes must include: duplicate/version/port/cycle errors; role or media type mismatch; too many references versus unsupported iteration; unknown transform/schema/manifest; unexpected parameter or invalid output; digest/bytes mismatch and missing blob; altered frozen snapshot/parent/producer/attempt identity; duplicate terminal completion; stale revisions and partial transaction rollback; concurrent execution/idempotency conflict; path traversal/oversize import and unauthorized remote URI; read-only write/execute denial; manifest changed after plan; forged/stale approval and quote mismatch; failure/interruption before and after artifact commit; pending external restart with no replay. Never use real external submission to probe approval failures.

For binary corruption/missing files, retrieval must fail visibly or mark unavailable; it must not produce a fresh substitute and call the prior artifact valid. Provenance/value/graph-lineage restoration probes must retain the repaired U0 negatives, not merely parse JSON structure. Local invocation retries must distinguish new explicit attempts from duplicate delivery.

## Verification procedure and evidence discipline

Run `npm run check`, `npm test`, `npm run build`; update/add meaningful tests for new contracts, persistence, service, adapter and recovery boundaries. Run existing `npm run proof`, browser/interaction proofs, official Inspector stdio/HTTP, offline-authoring and UI/MCP parity proofs against an explicitly configured isolated clone, adapting harnesses only with a recorded reason. Preserve old evidence rather than overwriting its meaning. Stop the serving production build before rebuilding its files; restart against the intended data root afterward.

Maintain `evidence/u1/` with tested SHAs, command outcomes, environment/data isolation, contract schemas/ADR, migration and preservation manifests, actual tool transcripts with secrets redacted, local invocation counters, restart/fault outcomes and screenshots of actual text/record/media results. Distinguish implemented-local, fixture, planned and externally dependent capabilities. Synthetic quotes are fixtures; previous Stage 2 paid results are historical; U1 spend must be zero. Do not commit source media, databases, credentials, tokens, tunnel profiles or ignored logs.

Commit the review candidate before independent verification. Preserve any held candidate and repaired successors; never rewrite shared history. If code changes after review, identify the new implementation SHA and have it independently reverified. Evidence-only commits must identify the implementation tree and final commit recheck without claiming a self-referential commit hash. Request the verifier inspect actual code/runtime and adversarial cases, not only builder reports. Record PASS, PASS WITH NON-BLOCKING FINDINGS, HELD, FAIL or BLOCKED with exact limitations; then deliver for owner review on a dedicated branch/PR, no automatic main merge.

## Stop conditions and completion report

Stop the affected work and report a concrete correction if: original data cannot be preserved; a proposed format requires destructive migration; implementation needs a new project-specific primitive or later scheduler; effect boundaries cannot prevent paid/network/file actions; a provider contract/permission is unavailable; unknown external outcomes would replay; tests cannot isolate writable data; or public deployment is required. Continue unrelated safe in-scope work where possible. Do not silently weaken a gate or count a fixture as real execution.

U1 delivery must state exact branch/commit/PR, architecture and contract decisions, implemented subset and deferred semantics, migration/recovery behavior, preservation counts/hashes, real ChatGPT-side proof status, screenshot URLs/paths, independent verdict and all remaining findings. Report zero paid calls/credits with adapter/call evidence. Recommend U2 only after U1 owner review; U1 completion never authorizes U2 automatically.

**Current stop boundary: this handoff is ready for review. No U1 code, schema migration, runtime integration or paid execution is authorized by preparing it.**
