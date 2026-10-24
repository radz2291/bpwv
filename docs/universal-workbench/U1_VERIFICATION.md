# U1 verification and delivery record

## Current product closure — 25 October 2026

The Single Universal Workbench follow-up is implemented and focused verification passes. Normal entry 5173, fresh/saved/MCP workflows and actual results use one editor; default creation is universal. Nine demos are recoverably archived, history/media/credentials retained, and the original database remains inactive and unchanged. Final owner product acceptance is pending. See [dated closure and evidence](SINGLE_WORKBENCH_CLOSURE_2026-10-25.md). No merge or U2.

## Historical G8 closure — 25 October 2026

**Open owner product finding: the dual-editor experience is confusing and must be consolidated.** The owner requires one universal workbench, closure of the legacy editor, and permits removal of existing old/demo/test workflows because there are no real production workflows to migrate. See [owner direction](../decisions/2026-10-25-single-workbench-owner-direction.md). This is recorded feedback, not an implemented repair. Technical gate passage below does not imply owner acceptance of the current interface.

**G8 PASS. All nine U1 verification gates now pass for the declared local subset; owner acceptance and merge remain pending.** The actual ChatGPT-side result supplied by the owner was corroborated through read-only service/artifact retrieval and actual editor reopen. Exact workflow/run/artifact IDs, statistics, provenance, preservation caveat and screenshot are recorded in [G8_CLOSURE_2026-10-25.md](G8_CLOSURE_2026-10-25.md). No execution was repeated. The HELD assessments below are retained as historical pre-closure evidence. The owner authorized publication of this documentation/evidence follow-up to the existing U1 review branch on 25 October 2026; runtime code and merge authorization are unchanged.

Baseline: `d3296549676e942ae402fcee7ea570d8fc51a16e`. Branch: `dev/u1-universal-execution`. Owner authorized U1 only; no paid generation, main merge or U2.

## Gate assessment before independent challenge

| Gate | Result | Observable evidence |
| --- | --- | --- |
| G1 one authority | PASS | Official Inspector creates/applies/saves schema 2; browser opens same IDs/URLs; UI-authored graph and both runs read by fresh Inspector; atomic invalid batch/stale revision denials. `inspector-transcript.json`, `ui-mcp-readback.json`, browser summary. |
| G2 usable execution | PASS | Actual normalized text/local statistics, persisted artifact values and on-canvas previews; actual local PNG bytes decoded; explicit unavailable badges tested for metadata/content failures. No plan shown as external success. |
| G3 durable versions | PASS | Two executions after semantic change retain old snapshots/content and sequential artifact versions. Output aliases upstream version. Cosmetic save remains compatible, semantic edits visibly historical. Source now pins Invoke manifest hashes on authoring and detects manifest drift. |
| G4 restart | PASS | Full owned visual process restart, new Inspector process on every call, nonlocal browser requests blocked. Before/after counters identical: 5 runs, 18 attempts, 15 artifacts in the bounded browser fixture. Separate actual SIGKILL test recovers interrupted Invoke with one call/no replay. |
| G5 typed providers | PASS within U1 subset | Registered capability v2 with parameter defaults executes without scheduler change; unknown/changed/expired/effect-incompatible manifests reject. Ports/types/schema/settings validated. Single `value` role only in U1; legacy model-specific references retain their tested separate contracts. `weave.plan` is blocked, not real model discovery. |
| G6 protected effects | PASS | Official Inspector read/write/policy denials both transports; invalid imports, remote URIs, arbitrary paths and external Invoke reject. Original quotation/approval tests pass. U1 paid/model calls/credits: 0. |
| G7 preservation | PASS | Exact original counts: 13 workflows, 37 revisions, 31 runs, 13 requests, 5 associations; all rows equal pre-U1 VACUUM backup. 24 original media files plus auth/archive digests unchanged. Real baseline clone migration and rerun retain all original rows. Original BorderPoint editor shows actual 941×1672 reference and historical 768×1376 output. Existing connected plugin read still succeeds. |
| G8 agent connectivity | **HELD** | Official Inspector stdio/HTTP/offline visual-server authoring PASS. Connected plugin compatibility read PASS via Codex; this is not a ChatGPT-side U1 call. Cached connected plugin still exposes previous tools; tunnel/auth configuration deliberately unchanged. No real ChatGPT U1 discover/create/save/execute/artifact-read proof is available. |
| G9 independent exact-SHA review | PASS after repair | Fresh-context verifier challenged d9499a7, reported G3, independently checked repaired 57bd8b9 source and repeated actual browser/MCP/adversarial/restart/preservation proofs. Final independent report linked below. |

G8 missing action: restart/reconnect the existing private MCP tunnel server against the U1 candidate with **separately explicit** managed-local execution policy (`CREATIVE_FLOW_ALLOW_LOCAL_EXECUTION=1`) and write grant; refresh tools in the intended ChatGPT workspace. In an actual ChatGPT conversation ask for `universal_catalog` → `create_universal` / atomic graph edits and save → `execute_universal` → `get_artifact` and readback. Use only local text-statistics; no Weave execution. Open the returned local URL and retain workflow/run/revision IDs and ChatGPT-side tool evidence. Do not paste credentials. Inspector alone cannot close this gate. Overall owner acceptance remains held for review.

## Checks, failures and evidence lineage

Builder checks: 56 tests passing, Svelte check 0 errors/0 warnings, production build. Build retains existing dependency unused-import/annotation/experimental SQLite warnings. Five existing proof bodies pass in isolation: agent, browser, interaction, official Inspector, UI/MCP parity. Additive discovery counts are 22 write / 9 read tools; all previous tools remain.

Pre-candidate failures are retained: `inspector-transcript-initial-held.json` records legacy-only save schema rejection; `inspector-transcript-format-drift-held.json` records a scratch fixture created before the frozen-contract representation settled. Timestamped browser failure screenshots/text retain the key-order stale-state defect; repaired canonical comparison, guarded manifest lookup, viewport fitting and unavailable-state tests now pass. These are development transcripts, not independent committed-candidate verdicts or published migrations. No released user document was migrated.

New evidence is confined to `evidence/u1/`; historical Stage 2/U0/integration evidence and SHAs remain unchanged. Writable tests use explicit isolated database/media roots. `data/u1/before.sqlite` and file manifests are private/ignored. UI/HTTP/stdio all use the same service. Fixed legacy asset upload/download root isolation rather than relocating test files afterward.

Fault probes include SQLite trigger failures before artifact/attempt completion, rollback/no exposed partial output, retry, real process death, byte/digest/missing blob failures, resealed producer/parent/snapshot/type/alias/missing-output corruption, schema/cycle/binding/role/version/parameter/effect errors, read-only/author-only execution denials, concurrent keys and duplicate delivery. Content seals are corruption checks, not signed provider attestation.

## Remaining limits and recommendation

U1 is a bounded local foundation: no external universal executor, collections, later primitives, remote publication, nested subflows, distributed recovery or hostile-code sandbox. Managed media is the documented PNG subset. PID reuse may conservatively hold an interrupted run; no automatic replay. Existing historical remote Weave output remains externally dependent and is not silently downloaded. Original tunnel permissions and single-user loopback UI trust model are preserved.

Review the draft PR and close G8 with the actual ChatGPT-side sequence before owner acceptance. Recommend a separate U2 decision after U1 acceptance; do not start later primitives or merge automatically.

## Committed candidate lineage

- `d9499a776fb16dd6bb5600a6c1ac59e47ef8b07a`: first committed implementation. Independent fresh-context challenge **HELD for G3 repair**: array-only node/edge reordering incorrectly marked compatible results historical. Actual independent browser/runtime evidence and report are retained in `evidence/u1/independent/initial-d9499a7-review.md` and its timestamped fixture directory.
- Repaired successor: sorts visual semantic nodes/edges by stable ID with the same code-point comparison as the runtime. The browser proof now explicitly reverses both arrays, saves/reopens, verifies all four completed badges and checks the original immutable run remains identical. This is a focused compatibility repair, not a schema/data migration. Exact successor SHA and independent recheck follow in the delivery record.

## Final review delivery

Exact repaired implementation: **`57bd8b968e1b990779d17f7f870027663160945d`**. Independent verdict: **PASS WITH NON-BLOCKING LIMITATIONS for the local engineering subset; overall U1 acceptance HELD at G8**. Report: `evidence/u1/independent/final-57bd8b9-review.md`. The predecessor remains in ancestry. The following delivery commit changes documentation/evidence only, and must retain identical application/test/dependency trees to this reviewed implementation.

Final builder browser recheck includes the independent reorder regression and unavailable states (`evidence/u1/browser/1792855740835/`). Counters before/after restart are identical at **8 runs / 29 attempts / 24 artifacts**, including earlier retained fixtures. Independent fresh fixtures separately remain 2/7/6 before its later MCP successor run; these are different isolated roots, not conflicting counts. All 56 tests, production build and zero-error/warning Svelte checks pass. Official Inspector reports zero schema-portability errors with warnings for deliberately open JSON/schema fields. Old evidence remains dated and unchanged.

For review, the isolated local demo root is `C:\Users\RZ1\Desktop\RZ\261024-Borderpoint\data\u1\proof\1792855102726`, served at `http://127.0.0.1:5175`. The original application remains at port 5173 with its original data and default-denied U1 execution policy. Do not point writable acceptance tests at original data.

The owned proof server was stopped after verification. An optional persistent review-server launch was subsequently rejected by automatic approval review with only “blocked by policy”; it was not retried. **Port 5175 is not left running.** Screenshots/reports and the isolated data remain available. Starting that isolated application process is therefore also required before the manual ChatGPT reopen test. The original port 5173 process remains running.

To close G8 safely, configure the **test** tunnel server process with that explicit `CREATIVE_FLOW_DATA_DIR`, `CREATIVE_FLOW_APP_URL=http://127.0.0.1:5175` and `CREATIVE_FLOW_ALLOW_LOCAL_EXECUTION=1`, plus the existing explicit `--write` grant, then perform the actual ChatGPT sequence above. Reuse existing account/tunnel credentials securely; none were changed for this task. A manual connection confirmation or account restriction must remain visible rather than counted as success.
