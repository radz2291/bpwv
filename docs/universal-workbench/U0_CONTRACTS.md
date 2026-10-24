# U0 contract candidate and executable boundary

24 October 2026. Experimental version 1; no production workflow schema change.

The machine-readable proposal is [U0_SCHEMAS.json](U0_SCHEMAS.json), generated from `src/lib/universal/contracts.ts` with `npx tsx scripts/u0-proof.ts`. Zod refinements and `spike.ts` checks add semantic constraints that JSON Schema alone cannot express. Consumers must not treat structural parsing as execution authorization.

## Implemented isolated proof

- Operation: stable identity, primitive/version, typed role-labelled input/output ports, declared effect, JSON configuration. Port collections have explicit ordered cardinality. No implicit conversion or JSON-supplied code.
- Recipe: schema version, stable identity, published version distinct from editable revision, operations and edges. Validation rejects duplicate IDs, cycles, unknown operation versions, multiple bindings and type/role/cardinality mismatches. Execution requires the exact expected revision.
- Artifact: immutable identity/version, typed value, content digest, access classification, parent IDs, origin attempt/run/operation/recipe revision and snapshot hash. External-reported origins require actual provider/job identity; parsing such metadata does not authenticate a provider result. Output(return) references upstream material rather than fabricating an artifact version.
- Manifest: pinned capability/version/adapter/model identity, fixture or external-dependent status, discovery interval/provenance, effect/quotation mechanism, input/output roles and cardinality, per-parameter type/range/enum constraints. Unknown settings and changed/expired contracts fail. No live model discovery is claimed by the synthetic fixture.
- Invocation plan: exact manifest/payload hashes, recipe revision, attempt/idempotency IDs, blocked state, zero external calls and no output artifacts. There is deliberately no provider executor. No approval, whether genuine or fabricated, can cause a paid call through this spike.
- Run: frozen recipe/hash, ordered events, artifacts and plans. Disk serialization and restoration in a new Node process demonstrate snapshot recovery without replay. This is not a durable scheduler or production event store.
- Extensibility: a trusted transform map supplies signatures and implementations. The reversal test registers a second transform without scheduler edits. Production registry and its seven legacy definitions are unchanged.

Run `npx tsx scripts/u0-proof.ts` for the deterministic uppercase example, blocked manifest plan, schema export and fresh-process restore. Run `npx tsx --test tests/universal.test.ts` for negative probes. All generated media metadata in this proof is explicitly fixture material; the proof does not fetch images, upload, infer, export files on behalf of recipes, or spend credits.

## Contract-only proposals and limits

`approvalSchema` describes subject/manifest/quote/cost/currency/actor/decision/expiry/revocation records. It is not a signed or authenticated approval service, and no execution path consumes it. Production authorization must additionally verify identity, current quote, destination, expiry and revocation transactionally. Existing Weave authority remains unchanged.

`iterationSchema` specifies item identity, bounds, concurrency, budget, aggregation and pinned child signature. `inspectIteration` only reports cancelled/blocked and never creates a child run. Budget zero grants no external permission. Branch, Approve, Subflow and general Iterate scheduling are not implemented. Their config/binding semantics remain proposed in the design pack and assessment.

The typed family names text, number, boolean, record, decision, file, image, audio, video, mask, timeline and homogeneous collections. Primitive scalar/media shape validation works in the spike; structured record/decision/timeline schemas require an explicit future resolver. Any `schemaRef` is rejected at execution in U0. The cross-domain fixtures validate graph vocabulary, not complete production domain schemas or runnable orchestration. The assessment supplies their concrete semantics and failure policies.

The spike uses sorted-key JSON SHA-256 for local semantic hashes; it does not declare an interoperable canonical JSON standard. U1 should pin a published canonicalization specification and digest scheme, size/resource limits, binary storage policy, role-to-parent bindings, provenance attestation and subflow interface resolution before persistence or cross-host approval. Artifact digest covers the represented value; a media URI digest does not prove remote binary bytes. Access classification is metadata, not an enforced storage permission.

No automatic conversion is provided. Existing Preview nodes and deterministic Refinement retain their old meaning. Future conversion creates a new identity with explicit mapping and dry-run parity, preserving source graphs/runs/bytes. The eventual universal service must extend the existing WorkflowService, not deploy this spike as an alternative graph authority.

## Provider adapter proposal for U1

A replaceable adapter should expose `discover(scope) → manifest`, `validate(manifestHash, payload) → resolvedPlan`, `quote(resolvedPlanHash) → expiringQuote`, `submit(authorizedAttempt, idempotencyKey) → externalJob`, `inspect(externalJob) → actualStatus/result` and optional `cancel(externalJob)`. Persist the attempt before submission; reconcile unknown outcomes before retrying. Capabilities lacking reliable reconciliation must block ambiguous retries. Upload and external publication require distinct scoped authority. None of these executor methods is implemented by U0.

The eight primitives remain sufficient for the four bounded domains examined. Streaming/event subscriptions and distributed compensation are unresolved future requirements, not hidden additions to Input or Transform. A requirement for those must reopen the primitive decision with an ADR and owner review.
