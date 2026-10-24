# Universal Workbench — Option C

**Decision status:** Architectural direction approved by the owner on 24 October 2026. **Implementation status:** Proposed; these documents do not claim that the universal engine, new UI, or all eight primitives are implemented.

## Product intention

Creative Flow should accommodate new projects by composing existing operations, rather than requiring application changes whenever a project introduces a new role, style, medium, or task.

The agreed direction is **Option C: Universal Workbench**, consisting of three separate layers:

1. **Universal engine:** A small set of typed, reusable operations.
2. **Recipes:** Versioned workflows composed of those operations, containing task-specific prompts, rules, provider selections and assets.
3. **AI + visual workbench:** Conversational workflow construction synchronized with an inspectable, editable canvas.

The user must be able to describe an outcome, see what the agent proposes, modify the process, inspect actual media at each stage, and authorize consequential execution.

**Architectural rule: New task → new recipe, not new node kind.**

## Eight provisional primitives

| Primitive | Responsibility |
| --- | --- |
| Input | Introduce typed data, assets, settings or external events. |
| Transform | Deterministically map, join, parse or process typed values. |
| Invoke | Execute a discovered model, tool, service or controlled local capability. |
| Branch | Select an execution path from a typed predicate or decision. |
| Iterate | Apply a bounded procedure across items or revisions. |
| Approve | Pause for explicit human review or authorization. |
| Subflow | Call a reusable, versioned recipe with declared interfaces. |
| Output | Persist, return, export or publish a result under appropriate authority. |

These are a **starting vocabulary to validate**, not a mandate to force every future operation into exactly eight categories. Propose an additional primitive only when a genuinely new execution semantic cannot be expressed safely, clearly and observably through composition or an adapter.

## Artifacts are first-class

Images, prompts, video, audio, scene specifications, review reports and other outputs are typed artifacts with source references, immutable run lineage, versions and previews. Preview is an artifact presentation capability, not a necessary execution node. Content, style reference and image-edit target are separate input roles even when all are images.

## Documents

- [PRIMITIVES_AND_CONTRACTS.md](PRIMITIVES_AND_CONTRACTS.md) — runtime language, typed values, invocation capabilities, artifacts and safety semantics.
- [WORKBENCH_EXPERIENCE.md](WORKBENCH_EXPERIENCE.md) — synchronized creative/engineering views, agent authoring and review loop.
- [MIGRATION_AND_GATES.md](MIGRATION_AND_GATES.md) — current baseline, compatibility mapping, staged plan and acceptance tests.
- [CODEX_HANDOFF.md](CODEX_HANDOFF.md) — scoped first implementation/design-validation handoff for the separate local coding agent.

## Scope and authority

This architectural decision does **not** authorize deleting existing graphs, replacing the current local app, spending Weave credits, launching autonomous paid retries, deploying, or publishing anything. The current registry, service, SQLite persistence, MCP authoring and approved BorderPoint tests must remain available until an explicit migration is demonstrated.

The existing root [ARCHITECTURE.md](../../ARCHITECTURE.md), [WORKFLOW_CONTRACT.md](../../WORKFLOW_CONTRACT.md), [NODE_CATALOG.md](../../NODE_CATALOG.md) and [STATE.md](../../STATE.md) describe the **current implementation**. This pack documents the **approved future direction**. When implementation genuinely changes, update the root contracts and live state with evidence rather than representing this design as already delivered.
