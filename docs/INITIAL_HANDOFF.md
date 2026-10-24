# Creative Flow — Initial Development Handoff

You are the lead development agent for a new local application called Creative Flow.

The current folder is the project workspace. Inspect it before creating or modifying anything. Preserve existing work.

## Product objective

Build a reusable visual AI workflow application inspired by Figma Weave.

The application manages workflow graphs, prompts, references, refinements, assets, and execution state.

Figma Weave is our initial AI-generation provider. We already have a Weave account connected through the official Figma MCP in Codex.

We want to reuse that connection and its existing credits.

Do not introduce ComfyUI Cloud, another paid generation service, or an Enterprise-only Weave API dependency.

## Architecture

Recommended technology:

- SvelteKit with TypeScript.
- Svelte Flow (`@xyflow/svelte`) for the node canvas.
- SQLite for durable workflow records.
- Local filesystem for generated media.
- A typed workflow execution engine.
- A replaceable provider-adapter interface.
- Codex as the initial supported Weave MCP execution bridge.

Inspect current library compatibility before installation. Prefer existing mature libraries where appropriate.

Keep this application independent of the existing VICT Studio project. Selected VICT concepts or packages may be reused only after checking their actual compatibility and value.

## Stage 0 — Establish the project

1. Inspect the local folder, development environment, and Git state.
2. Initialize the project where needed.
3. Create AGENTS.md, ARCHITECTURE.md, WORKFLOW_CONTRACT.md, and STATE.md.
4. Establish development commands and a working local application.
5. Record the initial baseline and major architectural decisions.

Continue directly to Stage 1.

## Stage 1 — Working visual workflow foundation

Implement a usable node editor with:

- Node creation and deletion.
- Dragging and positioning.
- Typed input/output ports.
- Node connections and disconnections.
- Connection validation.
- Node configuration.
- Zoom and navigation.
- Save and reopen.
- Workflow JSON import/export.
- Visible node execution state.
- An asset preview area.

Initial node types:

1. Text
2. Combine
3. Asset Input
4. Weave Model
5. Preview
6. Refinement

Implement actual deterministic execution for local operations such as text combination.

Do not simulate a successful model generation.

## Stage 2 — Agent authoring

Codex must be able to create and modify a workflow through a defined, documented interface.

Use a versioned workflow schema with stable node IDs and typed connections.

Prove that Codex can:

1. Construct a graph programmatically.
2. Set node inputs.
3. Connect nodes.
4. Save the graph.
5. Open it in the visual editor.
6. Modify it and preserve the changes across reopening.

This is a core product requirement.

## Stage 3 — Weave execution bridge

Inspect the official Figma MCP tools actually available in Codex.

The current MCP can discover and run individual Weave models but does not create or edit Weave canvas workflows.

The application owns its workflow graph.

Implement a clear execution-request and result contract between our local application and the Codex agent.

For the initial integration, it is acceptable for the application to write structured pending-generation requests that Codex processes through the supported MCP connection.

Codex should return structured run status, actual model information, and generated asset references to the application.

Do not claim that the application can directly invoke the Figma MCP as an independent custom client unless that integration is explicitly supported and verified.

Every paid Weave run requires its actual cost quotation and the appropriate user approval. Model discovery and structural tests should be completed without spending credits.

## Stage 4 — First functional proof

Create this workflow:

Scene Text + Style Text → Combine → Weave Model → Preview

The test must demonstrate:

- Nodes and connections are saved correctly.
- The combined prompt is correct.
- Reopening preserves the workflow.
- Codex can modify the workflow without manual node editing.
- A generation request can be prepared using a real current Weave model contract.
- The application can represent pending, completed, and failed generation states.

Perform all non-paid verification first.

A paid image-generation test is a separate calibration step. Obtain the required actual cost approval before executing it.

## Development principles

- Prefer the smallest complete vertical implementation.
- Keep generation providers replaceable.
- Keep creative prompts and workflow definitions separate from application code.
- Preserve input values and asset lineage.
- Do not hardcode the BorderPoint visual style into the engine.
- Support deterministic local nodes and asynchronous generation nodes.
- Maintain explicit execution state and error handling.
- Do not create unsupported cyclic graph execution.
- Do not claim an end-to-end Weave integration until a real run has been completed and inspected.

## Completion requirements

Implement and verify the application through the non-paid functional proof.

Launch the local application and inspect its actual behavior using permitted development tools.

Return:

1. Local application URL.
2. Implemented features.
3. Actual screenshots or browser verification evidence.
4. Verification of workflow persistence.
5. Verification of programmatic agent authoring.
6. Weave MCP integration status.
7. Remaining limitations.
8. Credits spent.
9. Recommended next development stage.

Continue autonomously through implementation, testing, and repair. Do not stop at architecture documents or a proposed plan.

Do not push or deploy externally during this initial milestone.

The intended outcome is a working local application that I can open and interact with.
