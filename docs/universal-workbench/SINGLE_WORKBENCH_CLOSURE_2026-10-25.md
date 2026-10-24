# Single Universal Workbench — U1 product review candidate

25 October 2026. Branch: `dev/u1-universal-execution`, PR #5. **Implementation and focused verification PASS; final owner product acceptance pending.** No merge, U2, deployment or paid call.

## Product change

The root route always renders the universal workbench. There is no legacy editor link, workflow-driven editor replacement or required `?workbench=1` entry mode. New workflows default to schema 2 through both WorkflowService and MCP `create_workflow`; explicit schema 1 remains available for backend compatibility/inspection only. Legacy and missing links show an explanation within the same universal shell. The saved list contains universal documents only.

Input, Transform, local Invoke and Output, typed contracts, immutable runs/artifacts, expected revisions and separate execution permission remain intact. No new primitive or task-specific engine node was added. Legacy component source/backend contracts remain historical compatibility code; no user-facing route imports that editor.

## One local application

Normal entry: **http://127.0.0.1:5173/**. The former isolated 5175 process is stopped. Port 5174 remains the authenticated MCP transport, not another editor. Temporary smoke port 5178 is stopped after testing.

The app, development config, stdio launcher and HTTP MCP load ignored `data/local-runtime.json` before opening the store. It selects the already verified U1 data directory `data/u1/proof/1792855102726`, returns URLs on 5173, references the original HTTP credential file, and retains the owner's explicit managed-local execution grant. No graph conversion or cross-database history merge occurred. An explicit `CREATIVE_FLOW_DATA_DIR` overrides this machine-local selection; an explicit denied execution policy remains denied. Without configuration/grants, defaults remain denied. This local configuration is not committed or automatically installed on another machine.

The existing `creative-flow` private tunnel profile and credential references are byte-identical to their previous backup. Its current daemon is running; health/ready checks and connected MCP `get_workflow`/`get_artifact` succeed with the 5173 URL and exact G8 value. CLI alias metadata still references the previous daemon PID and reports `process_running:false`; this bookkeeping discrepancy is recorded separately from the verified live process/connection. No new tunnel, key, public port or hosted deployment was created.

## Inventory and recoverable cleanup

Before cleanup, the selected U1 store contained ten workflows. Nine explicitly identified fixtures were archived from its **active `workflows` table only**, using a verified full SQLite snapshot, explicit IDs, expected revisions and a transaction. All other tables, including revisions, runs, requests, associations, attempts and immutable artifacts, are unchanged. Managed files are retained and backed up. No asset cascade or garbage collection was performed.

The remaining active workflow is the actual ChatGPT G8 proof `8d7c98f7-438a-4282-b74a-52d28fd62b1c`, revision 2. Its original run and artifact remain unchanged and were reopened without replay. It remains as the single saved review example; **New workflow** provides an empty starting state.

Archived IDs/revisions, table hashes and backup path are in `evidence/u1/single-workbench-2026-10-25/cleanup.json`. Full recoverable local snapshot and managed files: `data/backups/single-workbench-1792861053359`; use that manifest as authority. Its `RECOVERY.md` explains offline, non-overwriting restoration. The maintenance script `scripts/archive-workflow-demos.ts` is dry-run by default and requires an explicit local manifest plus `--apply`; it is not an HTTP/MCP operation.

The original primary `data/creative-flow.sqlite` contains 20 workflows and remains entirely unchanged, inactive and recoverable. It includes a newer unidentified `borderpoint-original-b-v2-draft`; its scope is unresolved, so it was not deleted. The complete original snapshot and managed media are retained in `data/backups/primary-before-single-workbench-2026-10-25`. No original row in any table changed. All 31 checked managed-media/auth/reference-archive file digests are unchanged. Credentials remain at their original paths and are neither printed nor committed.

## Focused verification

Evidence directory: `evidence/u1/single-workbench-2026-10-25/`.

- 15 focused service/runtime regressions pass, including schema defaults, explicit legacy inspection, atomic stale archive rejection, retained history, runtime-config isolation, explicit denial, revision and U1 artifact behavior.
- Type checks: zero errors/warnings. Production build passes. Development config selects the same active store.
- Official MCP Inspector discovers 22 tools and schema-2 creation default. SDK author/save/execute succeeds in a fresh isolated scratch store. HTTP independently returns 401 without credentials, nine tools for read, 22 for write, and refuses a read-client write attempt.
- Actual Edge smoke checks the normal entry, fresh workflow, text recipe, saved selection and MCP-authored four-operation result in the same shell. Real PNG previews decode in three cards and survive a process restart. Legacy/missing links stay in the universal shell; no legacy link/list entry remains. No browser errors.
- The actual ChatGPT-authored G8 workflow reopens on normal port 5173 with four completed cards and exact 28 characters / 4 words / 1 line. A connected tunnel artifact read verifies the same immutable artifact. These closure reads do not claim a new owner-operated ChatGPT write test; the original G8 evidence is preserved.
- Backup integrity and full-table equality verified before deletion. After cleanup, every non-active-workflow table matches its snapshot; original primary tables and 31 file digests match. Historical failed/repaired verification evidence is unchanged.

Two initial smoke attempts used an overly strict exact-text selector against a footer containing an additional status span. The visible UI had loaded normally with no browser errors. The harness selector was corrected; private scratch failure records remain under `data/single-workbench-smoke/`. No product repair or paid call resulted from those harness failures.

Risk-based verification follows the owner's new policy in `AGENTS.md` and `docs/DEVELOPMENT_GUIDELINES.md`. No repeated full suite or additional architectural review was needed for this bounded consolidation; existing deep execution/authorization evidence remains authoritative for unchanged runtime internals.

## Remaining owner review

Review the single editor, create a workflow, select the retained G8 example and inspect its results. U1's existing declared local-subset limitations remain: no production Branch/Iterate/Approve/Subflow or external paid Invoke, advanced layout/UX and hosted multi-user authorization. The original unidentified draft remains recoverable pending a later scope decision. Final U1 product acceptance and any main merge are owner decisions. **Stop here; do not start U2.**
