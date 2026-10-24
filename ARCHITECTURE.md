# Architecture

## Baseline: 24 October 2026

The initial folder contained only `BorderPoint_Weave_Setup_v1.zip`, with prompts, model notes, references and a workflow connection map. It is preserved byte-for-byte and is not loaded into engine logic. There was no Git repository or prior application. No VICT Studio code or dependencies were reused.

The application uses Svelte 5.57.2, SvelteKit 2.70.3, Svelte Flow 1.7.0, TypeScript 5.9.3, Vite 7.3.7, Zod 4.6.7 and adapter-node 5.5.7, with an npm lockfile. Node is 22.22.3. Registry metadata and installed peer dependencies were inspected. Svelte Flow 1.7 requires Svelte ^5.25; this combination passes type checking and production compilation. The newest SvelteKit 3 stack changes configuration and library aliases; this first milestone uses the established Kit 2 interfaces. `npm audit` reports three low severity findings in that dependency chain; this loopback-only milestone does not use enhanced form actions or prerendering. Reassess and migrate before deployment. No force-fix was applied.

## Boundaries

- `src/lib/contract.ts`: versioned workflow schema, node definition contract, typed ports, states and registry. JSON parsing is checked with Zod. Node configuration and runtime values are checked by definitions and the engine.
- `src/lib/registry.ts`: six initial node definitions. Definitions own configuration validation, input/output metadata, defaults and handlers. UI cards use this metadata. New handlers register through `NodeRegistry.register`; duplicate kind/version pairs fail. Registry plugins are trusted source modules, not arbitrary executable JSON imports.
- `src/lib/engine.ts`: graph validation and dependency execution. No initial-node-specific dispatch. Checks identity, ports, one incoming edge per port, cycles and group membership. Executes deterministic DAG dependencies once per run. Validates runtime port values and output types; failures block dependents but not unrelated branches. No loops, scheduler, parallel paid calls or automatic retries.
- `src/lib/server/provider.ts`: replaceable `ProviderAdapter` interface and the initial Codex/Weave request adapter. Engine receives a callback, independent of bridge transport. Switching providers requires registering/wiring an adapter at the server composition boundary, with no engine changes. Models are discovered snapshots, not universal hardcoded settings.
- `src/lib/server/store.ts`: SQLite workflow records with optimistic revisions, run snapshots and requests. WAL and transactions preserve updates. `data/assets/` contains local media; `data/requests/` contains reviewable initial pending request exports. SQLite is authoritative for later status updates.
- `src/routes/api`: local JSON authoring and execution surface, media upload/read, and result reporting. `src/routes/+page.svelte` projects the same workflow records into a Svelte Flow canvas. The browser is not the execution authority.

## Execution and provider boundary

Text, Combine, Asset Input, Preview and Refinement execute without models. Weave Model validates against its selected discovered contract, freezes the full prompt, parameter input, contract, hash, lineage and run context, then enters `pending`. Its Preview is `blocked` until actual output arrives. The application never fabricates success. Codex processes the request through its authenticated Figma MCP, obtains the actual quote and user approval, then reports the actual prediction and model ID. The local application cannot invoke that authenticated MCP independently. No API keys or independent Weave client are configured.

Model discovery from 24 October is preserved verbatim in `evidence/weave-discovery.json`. Flux 2 Pro accepts up to eight images; Flux 2 Dev LoRA has one image input plus LoRA fields. Settings and validation are generated from each contract. Snapshot data must be refreshed via Codex before a paid run. The UI labels cost as an estimate. The proof model choice is a structural fixture choice, not authorization to generate. No account-credit balance was asserted.

Input `assets` represents multiple references for ONE model call. It never means iterate or run a batch. Planned iterator nodes will use separate array ports, child-run identities, scheduling and approval/budget semantics. Asset Input currently outputs one asset; a general asset collector is planned and not exposed as an implemented node. Models with required fields outside the available prompt/reference flow must be configured with valid fields or execution fails; no silent input conversion.

## Reuse and refinement

Workflow groups are versioned templates referencing stable node IDs. The editor can capture a selection and insert copies with fresh node/edge identities and internal topology preserved. External connections are deliberately not copied. Nested groups, exposed group ports, a separately published group library and executable subgraphs are planned.

Every persisted run contains the whole graph and its configuration; every generation request contains an immutable prompt snapshot/input hash. Refinement consolidates human feedback into one deterministic prompt successor; it does not silently call an LLM or replace history. Planned review/LLM nodes can produce structured feedback for a later refinement pass. Branch/compare UI and formal feedback attribution remain planned.

## Limitations

This is a single-user loopback application, without authentication or remote access support. Save is explicit; last run status is restored on reopen when its saved workflow revision still matches. Source and local media remain on this computer. Asset metadata includes lineage identifiers; file uploads are size/type restricted, but media transcoding and content sniffing are future work. Browser preview does not verify a remote asset's contents. The request/result endpoint trusts the local Codex operator; it cannot independently authenticate that an asset was generated by Weave. Final Weave success remains unverified until an approved real run is inspected.

`tests/engine.test.ts` registers a separate test-only node to prove extension without engine edits. It is not a seventh product node or a simulated generation capability.
