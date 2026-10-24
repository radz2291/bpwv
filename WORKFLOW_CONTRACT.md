# Workflow and agent contract v1

## Workflow JSON

`schemaVersion: 1`, safe `id`, `name`, nonnegative integer `revision`, `nodes`, `edges`, `groups`.

Node: stable `id`, registry `kind`, positive integer `version`, `label`, `{x,y}` position, JSON `config`. The initial node definitions are version 1. Unknown kinds/versions are rejected, never silently upgraded. Schema migration requires an explicit future migration function; node versions already resolve independently in the registry.

Edge: stable `id`, `source`, `sourceHandle`, `target`, `targetHandle`. Source output and target input types must match exactly. One edge per target port. Duplicate IDs, dangling edges and cycles fail validation. Unknown configuration is not executed as code. Nodes are bounded to 500 and edges to 2000 per graph.

Port contract: `{id,type,required?}`. Types include text, asset, assets, number, boolean, mask, timeline, record, and typed `array:<scalar>` values. `asset` contains `id`, `uri`, `mediaType` and optional source/parent lineage. `assets` is multi-reference conditioning. Array iteration must have a separate registered handler and scheduling contract; no implicit looping is allowed.

Definition: `{kind,version,label,category,provider,inputs,outputs,defaults,validate,execute}`. Register once per kind/version. Execution receives node/config, resolved typed inputs and an injected generation callback. Returns `{status,outputs,error?,requestId?}`. States: idle, running, completed, pending, failed, blocked. Only completed outputs unlock downstream nodes; pending outputs never masquerade as generated media. Error catches are visible per node.

Groups: `{id,name,nodeIds,version}` in workflow JSON. Insert creates fresh nodes/edges from referenced nodes and internal edges. Original IDs remain untouched. Prompt snapshots live in immutable run graph snapshots and generation requests; editing a workflow does not mutate an existing run's prompt.

## Local API

All calls target `http://127.0.0.1:5173`. No third-party clients or paid services are required.

| Method/path            | Behavior                                                                        |
| ---------------------- | ------------------------------------------------------------------------------- |
| GET /api/workflows     | List saved workflow IDs, names and revisions                                    |
| GET /api/workflows/:id | Load full graph                                                                 |
| POST /api/workflows    | Validate/save full JSON; return incremented revision; stale revision yields 409 |
| GET /api/models        | Discovered model snapshots with exact input/parameter/output metadata           |
| POST /api/run          | Execute provided graph; return immutable run ID, graph snapshot and node states |
| GET /api/runs/:id      | Fetch persisted run states                                                      |
| GET /api/runs?workflowId=:id | Fetch latest run; editor restores state when saved revisions match |
| GET /api/requests      | List generation requests and current statuses                                   |
| POST /api/requests/:id | Report actual external status/result and resume ready local descendants         |
| POST /api/assets       | multipart `file`; store supported local media up to 25 MiB                      |
| GET /api/assets/:id    | Read local media by generated UUID                                              |

Save checks structural validity, allowing incomplete draft configurations. Execute checks required ports and node configuration. It is valid to save an unconfigured model, but it fails visibly at execution. Save returns the latest document; retain its revision for the next edit. A stale import cannot overwrite newer work without reconciliation or a new workflow ID.

## Agent authoring

`scripts/agent-proof.ts` is the executable authoring example. It builds five nodes and four connections in code, selects a real discovered model contract, saves, modifies node text, saves again, reopens, checks exact equality, executes local dependencies and asserts the pending request's prompt and unapproved cost. It writes evidence under `evidence/`. Use the same API to add/remove nodes, modify configs and positions, connect/disconnect ports or create groups. Do not edit the SQLite file while the app is running.

## Codex bridge procedure

1. Read pending requests from GET /api/requests or `data/requests/<id>.json`. SQLite is authoritative for current status. Check workflow/run/node IDs and immutable `inputHash`.
2. Through the current official Figma MCP, rediscover/verify the intended model and its contract. Reconcile changed parameters explicitly; do not assume this app's cached contract is current forever. If discovery is ambiguous, resolve the intended model with the user before executing.
3. Resolve media: local `/api/assets/...` paths are not remote Weave assets. Use official `weave_upload_asset` only when uploading is authorized, or pass supported HTTPS media. Preserve uploaded asset mapping and lineage. Never treat batch elements as reference conditioning.
4. Call `weave_run_model` with model `id` and flat input **without** `acknowledgedCost` to get the actual quote. This spends no credits. The estimate in the request is not that quote.
5. Show the actual quote and obtain structured **Approve/Cancel** for this exact run. A prior run's approval, a pending request or a node selection never authorizes a new charge. The local application intentionally provides no independent approval override or automatic paid submission.
6. Only after approval, call the official tool with its quoted `acknowledgedCost`. Poll actual prediction IDs with `weave_get_model_run_output`. Report running/completed/failed status. For completion inspect real output and use its actual asset references; do not fabricate a model output or prediction ID.
7. POST the result to this app. For completed output the endpoint resumes ready deterministic downstream nodes (such as Preview); it never automatically starts another paid node.

Result JSON:

```json
{
  "status": "completed",
  "predictionId": "<actual MCP prediction ID>",
  "actualModelId": "<provider modelId from discovery>",
  "assets": [
    {
      "id": "<actual asset ID>",
      "uri": "https://<actual output URL>",
      "mediaType": "image"
    }
  ]
}
```

Failure uses `status: "failed"`, a real prediction ID/model ID and nonempty `error`. Running uses `status: "running"`. Terminal requests cannot be overwritten. Completed results without assets and results with mismatched model IDs are rejected. No result endpoint call can spend credits. Additional metadata can be documented in future schema versions, including authenticated result signatures and explicit quote/approval audit records. The current endpoint is trusted local operator input, not independent proof of external execution.
