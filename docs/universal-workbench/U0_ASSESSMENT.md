# U0 architecture assessment and compatibility decision

Date: 24 October 2026. Scope: foundation audit and isolated non-paid feasibility proof. This assessment validates an architectural direction; it does not accept U0 on the owner's behalf or authorize U1.

## Authority and observed baseline

The approved design pack is documentation commit `a939cbe8e82657fdd2782f8131b97813a37d5b70` from `docs/universal-workbench-foundation` / PR #1. The U0 branch incorporates the documents explicitly rather than assuming PR #1 was merged. The Stage 2 implementation baseline is `45c9096780df1e43c32f5a15a5bafb2ce2170728`; the pack's reference to main `b673887...` predates that local implementation.

Source was inspected rather than inferring behavior from the pack: `contract.ts`, `registry.ts`, `engine.ts`, `workflow-service.ts`, `store.ts`, `provider.ts`, `request-service.ts`, MCP registration, legacy tests and Stage 2 evidence. The source contains seven production definitions and sixteen MCP tools. The current workflow JSON remains schema version 1. Historical Stage 2 evidence records 22 passing tests, a single separately approved 3.5-credit run and real media; these historical results are not U0 verification results. The U0 report records fresh checks separately.

## Reuse map and gaps

| Boundary | Existing behavior worth preserving | Universal extension needed later |
| --- | --- | --- |
| `WorkflowService` | Sole graph authoring authority; structural validation, atomic batches, optimistic revisions, URLs, execution and origin associations | Version-dispatched recipe authoring through this same service, with compatible REST/MCP signatures; no parallel universal store |
| Versioned `NodeRegistry` | Trusted source handlers; duplicate kind/version rejection; typed ports and configuration schemas | Primitive definitions plus registered transform implementations and manifest-resolved Invoke signatures; keep legacy definitions available |
| DAG executor | Generic dependency traversal, input/output validation, failure blocking, target dependency closure; no domain dispatch | Structured scheduling for skipped paths, bounded child runs, approval suspension, cancellation and recovery; current recursion alone cannot implement these correctly |
| SQLite | Workflows, additive workflow revision history, full run graph snapshots, requests and asset associations | Additive recipe/artifact/attempt/event structures only after a separate U1 design; transaction and restart semantics need proof |
| Provider boundary | Injected generation callback and replaceable request adapter; discovered model contract snapshots; immutable request input/prompt hashes | General capability manifests, role-specific ports, contract expiry, scoped tool effects and idempotency; no model-independent settings assumptions |
| Request bridge | Exact uploaded asset mapping, provider-input hash, actual quotation audit, separate human decision audit and actual result reporting | Durable authorization service and authenticated completion evidence for production universal execution; bridge audit metadata alone is not independent authority |
| Media projection | Pure registry projection and actual completed outputs; truthful image previews and aspect-preserving enlargement | Artifact viewer by type; no execution prerequisite for preview; retain legacy Preview pass-through semantics |
| UI/MCP | Both operate on the same persisted workflow; revision conflicts and separate read/write grants; local execution rejects generative graphs | Both must discover the same eventual recipe contracts and view one revision; authoring grants must continue to exclude spend and publishing |
| Reusable groups | Selection templates with fresh IDs and copied internal topology | Pinned executable Subflow signatures, boundary bindings, nested runs and recursion policy; present groups are not executable subflows |

The existing asset record is a useful compatibility payload, not the proposed universal artifact contract: it carries a URI, coarse media type and optional lineage but cannot express every typed record, digest, version, access scope or role. Current `asset` port compatibility does not distinguish image from audio or style reference from edit target. Future role checking belongs to manifest binding plus typed artifact validation, not inferred filenames or graph labels.

Current `provider: local | generative` is intentionally coarse. A network read, free external tool, local filesystem write and paid model call have different effect/authority boundaries even when none charges credits. Universal contracts must express these distinctions without changing the meaning of legacy providers.

Run snapshots preserve historical graph/configuration identity, while pending request completion updates the stored run state. This is not yet an append-only attempt/event log. Do not claim event-sourced recovery, exactly-once spend, or production durable Approve from the current implementation.

## Contract decisions for U0

The companion executable contracts and exported JSON schemas are the concrete U0 proposal. They remain isolated from production graph loading. These semantic decisions constrain later implementation:

1. Separate document schema version, primitive version, recipe revision, capability version and artifact version. A version change never silently upgrades another identity. New incompatible contracts require explicit migration and preservation of the source.
2. Keep typed values and artifact identities distinct. An artifact describes immutable material and lineage; a role is the meaning of a particular binding. The same image may be a style exemplar in one invocation and an edit target in another without changing its identity.
3. An Invoke resolves its exact capability version and manifest signature before connecting or executing. Its inputs, roles, cardinality, settings and output types come from that manifest. A provider switch requires revalidation and an explicit diff; settings cannot silently carry across incompatible models.
4. Transform is a registered pure computation. JSON cannot install code. A local crop may compute new bytes deterministically; writing them to a destination is Output with a local-write effect, or a scoped Invoke tool. The word "deterministic" does not make a write pure.
5. Output returning a value differs from persisting locally or publishing externally. Declare destinations and effects. A reusable recipe must not acquire filesystem/network authority merely by containing an Output operation.
6. Freeze resolved recipe, inputs, capability contracts and configuration for each run. Produce successor artifacts rather than overwriting candidates. Preserve source IDs and role bindings through lineage. Compare canonical semantic content for hashes; object property insertion order must not redefine the authorized payload.
7. Authoring revision permission is separate from execution, upload, filesystem and spend permission. Approval binds exact subject/input/capability/destination/quote as applicable. A pending request, estimate, stale quote or fabricated approval record never authorizes execution.
8. Fixture Invoke is a blocked or pending shape demonstration with explicit fixture provenance, no generated artifact and no completed external result. Reporting "completed" plus a made-up image would falsify the feasibility claim.

The spike exercises only a deterministic Input → Transform → Output slice and manifest-driven Invoke planning. Schemas for future scheduling states are contracts, not implementations of Branch, Iterate, Approve or Subflow.

## Four cross-domain challenges

These are static architecture demonstrations for U0. External capabilities in these examples are requirements, not claims of available connectors, model rights or completed execution.

### 1. Cinematic production

Input(script text, narration audio, shot settings) → Transform(segment and validate shot records) → Iterate(pinned shot recipe, stable shot IDs, bounded items/concurrency) → Invoke(discovered image/video capability per shot) → Approve(candidate artifacts) → Transform(typed timeline assembly) → Output(local deliverable and manifest).

Use `collection<record>` for shots, separate image/audio/video artifacts, rational timeline timebase and role-labelled first/last-frame inputs where the capability supports them. One shot with three references is one Invoke; three shots are three child invocations. Missing codecs/capabilities block the affected item. Cancellation preserves completed shot artifacts, cancels scheduling of new items and never automatically resubmits an unknown external job. This scenario requires no "Shot" or film-specific primitive.

### 2. Research and report

Input(question, authorized files) → Invoke(scoped retrieval capability) → Transform(normalize cited evidence records) → Invoke(structured summary capability, if separately available/authorized) → Branch(evidence sufficient?) → Approve(report/destination) → Output(local report or separately authorized publish).

Evidence records need source locator, retrieval time and supported-claim links. Missing support follows the selected remediation branch; it is not a successful report with invented citations. Retrieval permissions do not grant arbitrary local file reads or external posting. The public report is an artifact version with parents pointing to the evidence set. This needs no "Researcher" or "Client Report" primitive.

### 3. Deterministic media preparation

Input(imported images, crop settings) → Transform(validate dimensions and generate ordered crop plan) → Iterate(bounded local processing recipe) → Transform(registered crop/metadata operation) → Branch(validation result) → Output(return artifact, or scoped local destination).

All operations can remain local and use zero model calls. Retain original bytes and identity; each crop is a successor artifact with parent ID, coordinate/color metadata and content digest when available. A bad dimension fails validation before writing. Filename collision, unauthorized destination and partial output failure require explicit policies. A collection is work items here; it is not a model's reference-conditioning input. No "BorderPoint Crop" primitive is needed.

### 4. Illustration, review and refinement

The `illustration-review-refine` structural fixture corresponds to the design pack's BorderPoint reference recipe: Input(scene request, style exemplar) → Transform(prompt preparation) → Invoke(discovered image capability) → Invoke(review capability) → Branch(recommendation) → Approve → Iterate(bounded correction recipe) → Output(selected candidate). Roles keep style reference separate from edit target; only explicitly selected candidates become successors. Missing review/image-edit capability blocks that stage. No provider availability or paid result is asserted by this static example.

### Additional paper challenge: financial data reconciliation

Input(two CSV datasets and an approved mapping) → Transform(parse, normalize and join keyed records) → Branch(totals and unmatched rows pass?) → Approve(exception report or export plan) → Output(reconciliation record and optional authorized CSV).

Use typed numbers with explicit currency/decimal policy and records with stable row IDs. A missing key or inconsistent currency blocks export or selects the exception branch, rather than coercing data silently. No retrieval, generation or credit spend is inherent. Source rows remain parents of derived reconciliation artifacts. External bookkeeping submission would be a separately scoped Invoke with idempotency/destination and approval, not a hidden side effect in parsing. No accounting-specific primitive is required.

BorderPoint is an additional compatibility example: Scene Director and Visual Reviewer become prompt/manifest selections; Persian Miniature becomes style configuration and role-labelled reference bindings; Refinement becomes a correction recipe that uses the actual candidate as edit target. The existing deterministic Refinement v1 must retain its text-only meaning.

## Completeness challenge and scheduling decisions

The eight primitives cover these examples when the following semantics are explicit. There is no demonstrated need for a ninth primitive in U0; this is bounded evidence, not a proof of universality.

| Challenge | Composition or required semantic rule | Status |
| --- | --- | --- |
| Conditional merge after Branch | Registered selection Transform consumes an explicit selected-path result; it cannot require both mutually exclusive outputs. Scheduler distinguishes absent/skipped from failed. | Contract decision; production scheduling deferred |
| Fork/join parallel work | Ordinary DAG dependency fan-out/join, with bounded scheduler concurrency; no extra project node | Existing DAG ordering is serial; concurrency deferred |
| Evaluation and revision | Invoke or deterministic Transform produces typed decision/report; Approve and bounded Iterate control another candidate | Proposed; no automatic paid retry |
| Collection references versus work | Role/cardinality collection passed to one Invoke versus Iterate's child-run item identities | Required distinction; legacy reference order retained |
| Retry after ambiguous external completion | Persist attempt/idempotency key before submission; resume by reconciliation/query; block if outcome cannot be established | Requires adapter support and durable scheduler; no exactly-once claim |
| Compensation/rollback of effects | Recipe-level explicit compensation capability with separate authority; failed export does not undo an already published result automatically | Open future product policy; transactional graph edits do not imply distributed transactions |
| Long-lived events and streaming | Input may represent a frozen authorized event; continuous subscriptions, watermarking and stream backpressure are outside the bounded-run hypothesis | Deferred; reopen primitive decision if required |
| Human approval | Durable pending gate, actor/subject/expiry binding, decision history and resumable continuation | Proposed; existing quote bridge remains separate |
| Subflow recursion | Pinned interface and child-run ancestry; reject recursion by default or require explicit depth/termination policy | Proposed; raw graph cycles remain invalid |

No fundamental weakness was demonstrated for the current bounded workflow target. Continuous real-time streaming and cross-service compensation are the strongest limits of the hypothesis. U1 should not promise either implicitly.

## Safe migration and compatibility plan

No U0 migration is performed. The production schema, registry, authoring tools, SQLite records, old edges and node identities remain authoritative for current workflows.

| Legacy kind/version | Future representation | Exact preservation requirement |
| --- | --- | --- |
| `text@1` | Input(text) | Exact Unicode prompt and whitespace; stable source mapping |
| `combine@1` | Transform(concatenate) | `scene`, then `style`, with configured separator byte-for-byte; no generalized unordered join |
| `asset@1` | Input(imported artifact) | Actual asset ID, URI, media type, source/parents and declared imported provenance; a URI alone is not generated evidence |
| `reference_set@1` | Transform(ordered collect) | Existing collection first, new asset last; duplicates/identity/order unchanged; no item iteration |
| `weave@1` | Invoke(pinned discovered capability) | Model/provider IDs, exact params and contract, prompt/input hashes, lineage, actual pending/completed state and separate cost gates |
| `preview@1` | Legacy pass-through compatibility operation plus artifact viewer | Preserve its graph identity and downstream edges until explicit conversion proves parity; do not delete it merely because new artifacts have viewers |
| `refinement@1` | Transform(consolidate feedback) | Exact `\n\nRefinement:\n` joining/filter behavior; do not reinterpret as image-edit execution |
| Group template | Retained template or explicitly converted Subflow recipe | Current clone semantics/fresh identities; only promote after exposed-port and pinned-version mapping is defined |

Future conversion must be opt-in and create a new recipe identity, retain source workflow/revision/hash and an old-to-new ID/port map, show a dry-run diff and fail closed on unsupported data. Keep original graph JSON, asset bytes, requests and historical runs unchanged. Never reclassify an externally reported URI as a verified generated artifact during conversion.

Round-trip compatibility means deterministic output parity, preserved ordered input strings/assets, valid types/roles, revision-conflict behavior and unchanged source data. It does not require manufacturing identical new execution IDs. Paid graph conversion should compare frozen plans only; no replay is permitted to demonstrate parity. Quotes and approvals stay tied to their original exact payload and do not transfer to a converted recipe.

Use version dispatch at the existing WorkflowService boundary in a separately approved implementation. Unknown future recipe versions must be rejected, not opportunistically parsed as legacy v1. Preserve existing MCP tool names/authorization and add discoverable support deliberately; an isolated spike is not a second deployed authoring API.

## U1 recommendation and owner decisions

Recommend a separately authorized U1 limited to Input, registered Transform, manifest-driven Invoke planning/execution boundary and Output(return/local artifact), with additive immutable artifact persistence and explicit legacy version dispatch through WorkflowService. First prove one deterministic recipe through the same UI/REST/MCP service and restart it without data loss. Keep paid Weave execution behind its existing separate approval process; do not require a new paid run to prove U1.

Before U1, decide the durable typed-artifact storage model, canonical hash format, recipe identity/version dispatch and exact authority model for local file materialization. Before U2, approve skipped-aware branch merging, iteration failure/aggregation policy, approval expiry/revocation, subflow recursion policy and ambiguous external-job reconciliation. Before hosting, address identity/ownership, authenticated result reporting and storage access scope. These are explicit future choices, not silent U0 implementation assumptions.

U0 does not deliver eight production primitives, migration, new Creative/Engineering UI, a general provider runtime, durable event sourcing or owner product acceptance. Its executable proof, independent candidate review and current compatibility checks are recorded separately in the U0 evidence and live `STATE.md`.
