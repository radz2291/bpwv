# Creative Flow

A local visual workflow studio for prompts, references, assets and reusable creative processes.

Direct AI-agent authoring is available through the same workflow service as the editor. See [MCP_SETUP.md](MCP_SETUP.md) for a ready local stdio profile, authenticated Streamable HTTP endpoint, tool contracts, official MCP Inspector verification and the supported future ChatGPT tunnel/HTTPS connection path. Authoring requires no Codex runtime or browser automation. Weave generation remains a separate cost-approved adapter.

## Run

Requires Node 22.22 or later in the Node 22 line (tested on 22.22.3), npm and Windows. SQLite uses Node's built-in `node:sqlite`, which emits an experimental warning on this runtime.

```powershell
npm ci
npm run build
npm start
```

Open [Creative Flow](http://127.0.0.1:5173/). The universal workbench is the only editor. Use **New workflow**, **Text recipe** or **Image recipe**, save explicitly, and select saved workflows in the same shell. **Run local workflow** requires the separate managed-local execution grant; its results and artifact versions persist across reopening and restarts. Only Input, Transform, local Invoke and Output are implemented for U1. No paid model execution is enabled by these actions.

On this review machine, ignored `data/local-runtime.json` selects the verified U1 store and preserves its previously authorized local execution grant. The production app, development server and MCP launchers share that selection. Explicit `CREATIVE_FLOW_DATA_DIR` environments take precedence for isolated tests. With no local configuration or explicit grant, local execution remains denied. Configuration stores paths and an explicit boolean, never credential contents. MCP HTTP can reuse an existing credential file using `CREATIVE_FLOW_MCP_AUTH_FILE`.

Use `npm run dev` for development after stopping the production process on 5173. Both use the same workbench; there is no second product editor on 5175. Stop a running production app before rebuilding. Keep data, media, credentials, tunnel profiles and the supplied reference ZIP local.

Legacy workflow documents remain readable through the service for history/compatibility. Their editor is retired; legacy or missing deep links stay inside the universal shell with an explanatory message. Identified disposable demos were archived with full backups; the real ChatGPT G8 workflow remains for review. See [single-workbench closure](docs/universal-workbench/SINGLE_WORKBENCH_CLOSURE_2026-10-25.md) for inventory, recovery and verification.

Follow [development guidelines](docs/DEVELOPMENT_GUIDELINES.md) for risk-based checks. The focused current product smoke is `node scripts/single-workbench-proof.mjs` (requires the built app running on 5173, installed Edge and a free scratch port 5178). It writes only a fresh isolated test store and reads the retained G8 workflow. Earlier `agent-proof`, legacy browser scripts and Stage 2 screenshots remain historical evidence for their original interfaces, not current-editor acceptance tests.
