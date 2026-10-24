# Creative Flow

A local visual workflow studio for prompts, references, assets and reusable creative processes.

## Run

Requires Node 22.22 or later in the Node 22 line (tested on 22.22.3), npm and Windows. SQLite uses Node's built-in `node:sqlite`, which emits an experimental warning on this runtime.

```powershell
npm ci
npm run dev
```

Open http://127.0.0.1:5173. Choose **Agent proof · first light** in the workflow library for the saved proof. Create nodes using the library, select them to configure, drag handles to compatible ports, and select an edge then press Delete to disconnect. Pan, zoom or use the minimap. Save explicitly before leaving; workflows are durable SQLite records, not browser storage. Export/import workflow JSON for portability. Import does not overwrite an existing saved revision silently.

**Run local steps** saves and executes the graph. A configured Weave node creates a pending request; it does not spend credits. Inspect the Execution tab for prompt snapshots/status and the Assets tab for actual media. A missing model selection produces a visible error. Choose a discovered model in its inspector to prepare a request.

Shift-select multiple nodes and use **Reusable groups** in the inspector to save a group. Insert duplicates its nodes and internal connections with fresh IDs. Refinement combines the incoming prompt and consolidated feedback locally.

```powershell
npm run check
npm test
npm run build
npm run proof
node scripts/browser-proof.mjs
```

The last two commands require a running dev server; browser verification uses installed Microsoft Edge in headless mode. `npm run proof` creates/updates the `agent-proof` workflow and adds pending requests, with zero paid calls. Evidence is in `evidence/`. For a production local process, `npm run build`, set `HOST=127.0.0.1`, `PORT=5173`, `ORIGIN=http://127.0.0.1:5173`, then `npm start` from this project directory. The server expects `evidence/weave-discovery.json` and the writable `data/` directory relative to this directory.

See WORKFLOW_CONTRACT.md for agent authoring and the manual Codex bridge; NODE_CATALOG.md for capability status. No external deployment or paid generation has been performed.
