# Universal runtime contract — design v0.1

Status: **Proposed contract for validation**, not a shipped schema or registry migration. Owner approved the Option C direction and starting eight primitives; detailed interfaces remain subject to implementation experiments.

## Vocabulary and boundaries

- **Artifact:** Immutable, typed material or structured output usable as an input to other work, with stable identity, accessible preview, parent links and provenance.
- **Operation:** A universal execution behavior with declared typed inputs, outputs, configuration, effect class and failure semantics.
- **Recipe:** A versioned composition of operations, configurations, roles and connections. A recipe is project- or task-specific; an operation is not.
- **Run:** A frozen recipe revision plus resolved inputs, operation attempts, approvals, events and produced artifacts.
- **Capability manifest:** An adapter-advertised description of available model/tool actions, input constraints, media roles, settings, estimated prices and output types.
- **Provider adapter:** A separately replaceable executor for one capability family. Adding a new model or service normally adds or updates a manifest/adapter, not a node kind.
- **View:** A projection of a recipe and run; never a second source of truth for graph state.

The same recipe engine must be addressable by canvas, REST/MCP and an AI author. No transport-specific graph store or hidden agent-only execution rules.

## Primitive behavior

| Operation | Contract and boundary |
| --- | --- |
| **Input** | Emits a validated typed value or imported artifact. Sources include user text, files, configured values and future externally authorized events. Import is not proof of external model generation. |
| **Transform** | Pure, typed and preferably deterministic mapping/formatting/collection/media processing. A transform may select an implementation from a registered catalog. Untrusted arbitrary code embedded in workflow JSON must not execute implicitly. |
| **Invoke** | Runs an explicitly selected and discovered capability: language model, vision model, image/video/audio generator or editor, MCP/API/local tool. Its visible ports and settings derive from the manifest, including role-specific image references. Side effects and cost are declared before invocation. |
| **Branch** | Evaluates a typed decision or predicate and schedules only the selected paths. Unchosen paths are skipped, not treated as failed or completed outputs. |
| **Iterate** | Applies a sub-recipe to a typed collection or a bounded revision sequence. It requires explicit item identity, maximum attempts/items, concurrency, cancellation, budgets and aggregation behavior. A list of image references passed to one model call is not an iteration. |
| **Approve** | Durable, resumable human gate with specified subject (artifact, plan, external action, spend), user identity/authority where applicable, explicit Approve/Reject/Revise result, expiry/revocation policy, and immutable audit record. Pending is never consent. |
| **Subflow** | Invokes a pinned, versioned recipe with explicit public input/output types. Call boundaries are inspectable. Recursive calls require termination rules and depth limits; circular raw graph edges do not become silently valid. |
| **Output** | Materializes or returns typed artifacts. Local persistence and external publishing are different effect classes. Non-idempotent destinations require authorization, safe retry handling and destination identity. |

The engine may use acyclic dependencies internally even for iterated behavior: loops live inside bounded structured operations/subflows rather than permitting arbitrary uncontrolled cycles.

## Typed value and port model

Define a stable versioned family including: text, boolean, number, structured record/JSON, decision, file, image, audio, video, mask, timeline and homogeneous collection<T>. Each value has a validated schema and serialization policy. Media types are not interchangeable merely because they share a URI.

Each port advertises:
- stable name and type;
- required/optional status, single/multiple cardinality and ordering;
- semantic role (for example content reference, style reference, edit target, mask, first frame, last frame);
- allowed type conversion, if any, through explicit registered transforms;
- visibility and provenance in the inspector.

A generated candidate image, approved style exemplar and optional historical exemplar are three distinguishable artifacts/roles; an editing operation must receive the candidate as **edit target**. Never flatten a role-specific media input into generic text or an unlabelled array if the provider distinguishes roles.

## Dynamic Invoke behavior

One Invoke primitive supports text generation, structured analysis, visual critique, image generation/editing, video generation and conventional tools. Capability manifests define the actual UI form and typed runtime ports. Changing providers must validate compatibility and highlight fields that no longer map.

At minimum a manifest records: capability ID and version, adapter ID, provider-side model/tool ID, supported input and output media, roles and cardinality, parameter constraints/defaults, cost quotation mechanism, declared effect class and discovery provenance/time. Contract expiry or unsupported parameters block execution instead of silently guessing.

No claim is made that the connected Figma Weave MCP exposes all these capabilities. Implement only the verified subset through its official tools; other capabilities require separately discovered, authorized adapters.

## Artifact record and immutability

Each generated/imported artifact should have an immutable identity and enough metadata to reconstruct lineage:

- media/data type, metadata, digest where practical, storage URI and access scope;
- origin kind (imported, local transform, external reported), actual execution/run/operation attempt;
- parent artifact IDs, role mapping, recipe revision and relevant prompt/config snapshot hashes;
- provider/adapter/model identity and reported external prediction/job IDs when applicable;
- creation time, errors/status, cost quotation and actual debit if independently available;
- human feedback, decisions and a version relationship to earlier candidates.

Never mutate old binary outputs in place as a 'refinement'. A later version points to its predecessor and to correction instructions. A preview is a viewer for an artifact, and must not manufacture a new artifact or consume credits.

## Execution and authorization

A run freezes recipe revision and inputs. States should distinguish at least ready, running, pending-external, awaiting-approval, completed, failed, skipped, cancelled and blocked. Terminal results and approvals are immutable historical evidence; workflow edits do not rewrite them.

- Deterministic local steps may run without a paid provider.
- Before a paid invocation, discover/validate the exact current model contract, resolve uploads with explicit authority, obtain an **actual quote**, then pause at an explicit user approval gate for that exact payload. A prior ceiling or earlier approval is not a blanket authorization.
- Per-item calls in Iterate require budgets and approvals appropriate to their actual number. Reference conditioning and batching must be differentiated.
- External calls carry attempt and idempotency identifiers; state resumes after restart without falsely repeating spend or reporting success.
- Tool execution must be limited to configured scopes, permissions and approved destinations. Graph-authoring permission does not imply permission to spend, publish or read arbitrary local files.
- Existing optimistic revision checks, atomic authoring batches, auditability and local MCP authorization remain requirements.

## Extensibility test

Before proposing another primitive, ask in order:
1. Is it just another recipe or subflow?
2. Is it a different configuration of Invoke, with a capability manifest?
3. Is it a deterministic Transform implementation?
4. Is it a typed value, role or UI inspector treatment?
5. Does it require genuinely new scheduling, ownership, authorization or effect semantics?

Only the fifth category plausibly justifies a new primitive, and it needs an ADR, compatibility plan and independent execution proof.
