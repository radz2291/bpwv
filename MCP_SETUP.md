## U1 review candidate

The U1 server version 1.2 adds six tools: universal_catalog, create_universal, list_universal_runs, get_artifact, import_image, execute_universal. Existing get/save/apply/validate author both document formats. Discovery totals are 22 for write clients and 9 for read clients. Universal execution/import require explicit CREATIVE_FLOW_ALLOW_LOCAL_EXECUTION=1 in the server process environment AND a write grant. Default remains denied; existing tunnel/auth files are unchanged. For Inspector, put both CREATIVE_FLOW_DATA_DIR and this effect policy explicitly in the server config env; inherited environment may be filtered. Streamable HTTP bounds JSON at 12 MiB; managed PNG bytes at 8 MiB. No external paid execution is added.

Run npx tsx scripts/u1-proof.ts and npx tsx scripts/u1-http-proof.ts for isolated official Inspector proofs; node scripts/u1-browser-proof.mjs --legacy verifies the built editor and restart. These do not substitute for the held actual ChatGPT U1 gate. See docs/universal-workbench/U1_IMPLEMENTATION.md for the exact missing manual connection action.

# MCP authoring — local setup and ChatGPT connection

Creative Flow exposes a real MCP server for direct agent authoring. It does not need Codex, an LLM API key, browser automation, the visual editor process, or Weave credentials to discover/create/edit/save/reopen workflows. Its shared SQLite service is also used by the editor's HTTP routes. Node, installed dependencies and filesystem access to this workspace are required. The proof scripts use the editor's media upload endpoint only to obtain an actual imported screenshot; workflow authoring itself does not depend on that endpoint.

## Local stdio

From this directory, run `npm ci`, then configure an MCP host with:

```json
{
  "mcpServers": {
    "creative-flow": {
      "command": "node",
      "args": [
        "C:/Users/RZ1/Desktop/RZ/261024-Borderpoint/scripts/mcp-launch.mjs",
        "--write"
      ]
    }
  }
}
```

The launcher resolves the project directory regardless of the host's working directory. Omit `--write` for a read-only profile. `npm run mcp:stdio` is read-only by default; `npm run mcp:stdio -- --write` grants authoring. Local process-launch/OS permissions authorize stdio access. No credentials or account links are silently installed into any agent's configuration. Do not treat the read-only option as a sandbox against an operator who already has shell/OS access.

The current implementation uses official `@modelcontextprotocol/sdk` 1.32.2, the supported maintenance line implementing MCP 2025-11-25, and official MCP Inspector 2.12.0. Inspector successfully negotiates the legacy protocol. It is standards-compatible; MCP 2026-07-28 support through the v2 SDK is a separate future upgrade, not an implemented claim.

## Local Streamable HTTP

```powershell
npm run mcp:setup
npm run mcp:http
```

Endpoint: `http://127.0.0.1:5174/mcp`. Setup generates independent random read/write bearer credentials in ignored `data/mcp-auth.json` without printing them and retains existing credentials on rerun. Protect that file using the computer's user/file permissions; rotate it by replacing the tokens and restarting the MCP process. Requests must send `Authorization: Bearer <readToken-or-writeToken>`. The server validates authorization independently on every request, binds only to loopback, rejects unexpected Host/Origin headers, and limits JSON bodies to 2 MiB. It uses stateless Streamable HTTP JSON responses. Read credentials cannot list or invoke write tools. Tokens are never returned as MCP tool results or stored in committed test evidence.

This is a local shared-secret transport profile, **not** a hosted OAuth server. Do not expose the editor's port 5173 or this HTTP process publicly. The HTTP facade is deliberately separate from the unauthenticated single-user visual editor and its local REST routes. A future public HTTPS deployment must add TLS and a proper MCP OAuth resource-server boundary, scoped identity/ownership, credential rotation, rate limiting, deployment hardening and audit policy before becoming reachable. The current private OpenAI tunnel connects the stdio launcher, not these local HTTP ports; the user completed ChatGPT plugin registration. No public endpoint or hosted deployment has been created.

Optional process environment:

| Variable                    | Purpose                                                                                         |
| --------------------------- | ----------------------------------------------------------------------------------------------- |
| `CREATIVE_FLOW_APP_URL`     | Base URL returned in workflow links; default `http://127.0.0.1:5173`                            |
| `CREATIVE_FLOW_DATA_DIR`    | Absolute shared data directory; defaults to workspace `data/`                                   |
| `CREATIVE_FLOW_MCP_PORT`    | Loopback MCP port, default 5174                                                                 |
| `CREATIVE_FLOW_MCP_ORIGINS` | Comma-separated explicit browser origins; default Inspector origins on localhost/127.0.0.1:6274 |

The UI and MCP must use the same data directory to share records. The existing generation/media paths still assume workspace `data/`; keep the default for this combined local application. The environment option supports isolated authoring service deployments, not a fully relocated generation/media stack. No `.env` file is automatically loaded by the standalone launcher; set process environment explicitly.

## Tools and permissions

All tools advertise typed JSON input/output schemas, structured results, `readOnlyHint`, `destructiveHint`, `idempotentHint` and `openWorldHint`. Those hints describe behavior; authorization is enforced separately. Operations are closed-world (local records); URLs are metadata and are not fetched by authoring tools. Typed configuration schemas and exact named ports are returned by `node_types`. Incomplete drafts can be saved; `validate_workflow` reports missing execution inputs/configuration without invoking a provider.

| Tool                | Access | Behavior                                                                    |
| ------------------- | ------ | --------------------------------------------------------------------------- |
| `node_types`        | Read   | Discover registry contracts, capabilities, defaults and workflow schema     |
| `list_workflows`    | Read   | IDs, revisions, names, URLs                                                 |
| `get_workflow`      | Read   | Reopen full graph and URL                                                   |
| `validate_workflow` | Read   | Types, identities, dependencies, cycles, groups and readiness               |
| `get_execution`     | Read   | Latest run, node states, workflow revision, assets                          |
| `get_assets`        | Read   | Origin-node associations and declared provenance                            |
| `create_workflow`   | Write  | Create an empty durable graph, reject existing ID                           |
| `apply_changes`     | Write  | Validate and atomically save ordered graph changes                          |
| `save_workflow`     | Write  | Replace a graph only at explicit expected revision                          |
| `add_node`          | Write  | Add stable ID/kind/version/configuration                                    |
| `configure_node`    | Write  | Merge configuration, rename or reposition                                   |
| `remove_node`       | Write  | Remove node, incident edges, group membership and asset associations        |
| `connect_nodes`     | Write  | Connect named, exactly compatible ports                                     |
| `disconnect_nodes`  | Write  | Remove stable edge ID                                                       |
| `associate_asset`   | Write  | Link an imported or externally reported actual asset to its origin node/run |
| `execute_local`     | Write  | Execute an entirely deterministic graph; reject any generative node         |

Every mutation of an existing graph requires its expected revision. Creation starts at revision 1; every successful authoring write increments once. `apply_changes` supports add/configure/remove/connect/disconnect, workflow rename and group updates. All operations validate the resulting graph under one SQLite `BEGIN IMMEDIATE`; failure rolls back graph and asset deletions. Conflicts return a typed `CONFLICT` tool error. Re-fetch/reconcile; do not blindly retry a full replacement. Media/run metadata retains historical provenance without claiming independent verification of an external model result. Authoring asset associations do not change provider request status or approve a paid run.

Example atomic authoring call:

```json
{
  "workflowId": "my-workflow",
  "expectedRevision": 1,
  "changes": [
    {
      "op": "add_node",
      "node": {
        "id": "scene",
        "kind": "text",
        "version": 1,
        "label": "Scene",
        "position": { "x": 30, "y": 40 },
        "config": { "text": "A mountain observatory at dawn." }
      }
    }
  ]
}
```

## Official Inspector verification

```powershell
npm run mcp:proof
npx tsx scripts/mcp-http-proof.ts
node scripts/mcp-browser-proof.mjs
```

`mcp:proof` launches the official Inspector CLI for every initialize/list/call, creating separate stdio connections. It discovers contracts, creates nodes/connections atomically, proves invalid-batch rollback and stale-edit rejection, configures/saves/reopens, runs deterministic text combination, associates a real imported screenshot with a node, retrieves execution state, and proves read-only write rejection. The local editor must be running for its one media upload and final HTTP parity assertion. No paid/provider call is made.

The HTTP proof requires `npm run mcp:http`; it uses official Inspector against the real authenticated endpoint and checks 401/403 responses and independent read/write permissions. The browser proof opens the Inspector-authored URL, edits through the UI, re-reads through Inspector, rejects a stale UI save after a competing MCP change, reloads accepted edits and previews the imported asset. Browser automation is used only to verify the visual projection, not to author the original graph.

Evidence: `evidence/mcp-inspector-proof.json`, `evidence/mcp-http-proof.json`, `evidence/mcp-browser-proof.json`, `evidence/mcp-editor.png`. Inspector reports zero schema-portability errors; warnings reflect open JSON configuration fields used by extensible nodes. Those fields are checked against discovered per-node configuration schemas by the service.

`scripts/mcp-offline-proof.ts` additionally verifies get/configure/save/reopen/local execution through the official Inspector while the visual server is stopped. It launches the stdio wrapper from a different working directory. Run this only during an intentional UI-server shutdown; `evidence/mcp-offline-proof.json` records the completed verification. Restart the visual server afterward.

## ChatGPT connection

Stage 2 registry refresh: the existing tunnel/profile was reused and restarted with the same explicit `--write` stdio grant. Connected `node_types` exposes seven kinds including `reference_set@1`, while the MCP tool count remains sixteen. A separate live connected proof created Asset + Reference Set, connected typed ports transactionally, executed locally and reopened the exact saved workflow. See `evidence/stage2-connected-mcp.json`; no generation request or credits were involved. BorderPoint's one approved paid generation is separately recorded in `evidence/stage2-request-proof.json` and does not grant these authoring tools inference access.

OpenAI documents [Secure MCP Tunnel](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels) for private servers and [custom MCP connections](https://developers.openai.com/api/docs/guides/custom-mcp-server) in ChatGPT. A supported private tunnel can forward to the local stdio profile or MCP HTTP endpoint; a public server needs a stable HTTPS endpoint with suitable authentication. Availability and authoring permissions depend on the user's account/workspace and must be verified during connection setup.

For the private route, obtain the current official `tunnel-client` from the Platform tunnel settings/public release, inspect `tunnel-client help quickstart`, configure its local destination to the stdio launcher above (with intentional write access), and connect the tunnel in ChatGPT developer-mode settings. The customer-run tunnel client needs its own runtime credentials and organization/workspace setup. The existing tunnel was reused; no duplicate tunnel was created. Credentials are referenced from external local files and are not included in this repository.

Current verified status (24 October 2026): official tunnel-client 0.0.18 was downloaded from the OpenAI release and its Windows archive SHA256 checked against the release checksum file. Profile creative-flow uses the existing stdio launcher with explicit --write and an external file reference for its runtime API key. doctor --explain passed. Native runtimes connect/status reported process_running, healthy and ready, with no remote error. A read-only metadata lookup confirmed access to the existing tunnel. The user handled ChatGPT account/workspace selection and registration. The creative_flow_local connector now exposes sixteen tools, and node_types, list_workflows and get_workflow succeeded through the live connector. See evidence/chatgpt-tunnel-connection.json.

A ChatGPT-authored write/save/reopen has not yet been independently recorded; the absence of a connection-check workflow is documented rather than treated as a successful write. Earlier local Inspector write tests remain separate. The tunnel runtime is managed through tunnel-client runtimes; its profile is under %APPDATA%/tunnel-client/creative-flow.yaml, and local status/logs are under the operator's tunnel-client state directory. Use tunnel-client runtimes status creative-flow --json to check it. Do not publish runtime configuration, logs, tunnel identifiers or credentials. The workstation and runtime must remain running for ChatGPT tool access.

Codex remains optional for development and for the current separate manual Weave generation bridge. Every paid Weave run still needs fresh model-contract verification, its actual quotation and structured user approval; none of these MCP authoring tools can bypass that boundary. No generation was requested and zero credits were spent.
