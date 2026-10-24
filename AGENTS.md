# Creative Flow

This is an independent local application. Preserve the supplied BorderPoint_Weave_Setup_v1.zip; it is reference material, not engine configuration. Do not push, deploy, or upload source/media without authorization.

Read ARCHITECTURE.md, WORKFLOW_CONTRACT.md, NODE_CATALOG.md and STATE.md before extending behavior. Run `npm run check`, `npm test`, `npm run build` for engine/API changes. With the dev server running, use `npm run proof` and `node scripts/browser-proof.mjs` for integration verification. Keep fixture and real-generation evidence distinct.

Register versioned node definitions in the registry. Never add per-node branches to the execution engine. Keep deterministic operations local; inject generation through provider adapters. Preserve stable node/edge IDs, asset lineage, prompt snapshots and revision conflict checks. Reject cycles, unknown versions and incompatible ports. Do not silently migrate graphs.

Weave execution uses the existing official Figma MCP in Codex. This application does not independently connect to that MCP. Discover current model contracts and parameters before execution. Quote every paid run without acknowledgedCost, show the actual quotation and obtain structured Approve/Cancel before any credit spend. A pending request is never user approval. Never simulate successful generation. Batch iteration and multi-reference conditioning are different contracts.

For work on a running Blender scene, use the official Blender Lab MCP server `blender`, v1.0.3, bridge 127.0.0.1:9876. Verify a read-only scene query before changes. Configuration authorizes connection, not unrelated scene changes. Do not replace it with the community PyPI package. Blender is outside this milestone.
