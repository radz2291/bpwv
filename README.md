# Creative Flow

A local visual workflow studio for prompts, references, assets and reusable creative processes.

Direct AI-agent authoring is available through the same workflow service as the editor. See [MCP_SETUP.md](MCP_SETUP.md) for a ready local stdio profile, authenticated Streamable HTTP endpoint, tool contracts, official MCP Inspector verification and the supported future ChatGPT tunnel/HTTPS connection path. Authoring requires no Codex runtime or browser automation. Weave generation remains a separate cost-approved adapter.

## Run

Requires Node 22.22 or later in the Node 22 line (tested on 22.22.3), npm and Windows. SQLite uses Node's built-in `node:sqlite`, which emits an experimental warning on this runtime.

```powershell
npm ci
npm run dev
```

Open http://127.0.0.1:5173. Choose **Agent proof · first light** in the workflow library for the saved proof. Create nodes using the library, select them to configure, drag handles to compatible ports, and select an edge then press Delete to disconnect. Pan, zoom or use the minimap. Save explicitly before leaving; workflows are durable SQLite records, not browser storage. Export/import workflow JSON for portability. Import does not overwrite an existing saved revision silently.

**Run local steps** saves and prepares the first generation branch and its Preview, leaving refinement idle. A configured Weave node creates a pending request; it does not spend credits. Use **Prepare this generation** to explicitly prepare a different selected generation. Local-only graphs execute fully. Inspect the Execution tab for prompt snapshots/status and the Assets tab for actual media. A missing model selection produces a visible error.

Shift-select multiple nodes and use **Reusable groups** in the inspector to save a group. Insert duplicates its nodes and internal connections with fresh IDs. Refinement combines the incoming prompt and consolidated feedback locally.

```powershell
npm run check
npm test
npm run build
npm run proof
node scripts/browser-proof.mjs
```

The last two commands require a running dev server; browser verification uses installed Microsoft Edge in headless mode. `npm run proof` creates/updates the `agent-proof` workflow and adds pending requests, with zero paid calls. Evidence is in `evidence/`. For a production local process, `npm run build`, set `HOST=127.0.0.1`, `PORT=5173`, `ORIGIN=http://127.0.0.1:5173`, then `npm start` from this project directory. The server expects `evidence/weave-discovery.json` and the writable `data/` directory relative to this directory.

Stage 2 adds Reference Set v1, real canvas thumbnails/galleries, model identity/state, inspector/lightbox enlargement and durable imported references. Open `http://127.0.0.1:5173/?workflow=borderpoint-image-first-chatgpt` for the existing BorderPoint workflow. Its actual approved B reference and one user-approved Nano Banana 2.1 result are visible; refinement is separate. The one approved real generation cost 3.5 Weave credits. No deployment was performed.

`npm start` defaults to loopback and permits multipart overhead above the API's enforced 25 MiB per-file limit. Stop the running production process before rebuilding its files, then restart it. Model snapshots are listed in `evidence/weave-model-catalog.json`. Keep all `data/`, credentials and runtime profiles local.

See WORKFLOW_CONTRACT.md for agent authoring and the separate manual Weave bridge; NODE_CATALOG.md for capability status. Stage 2 evidence is in `evidence/stage2-*`.
