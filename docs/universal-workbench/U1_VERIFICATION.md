# U1 verification and delivery record

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
| G9 independent exact-SHA review | Pending candidate challenge | Candidate commit and independent verdict are appended below, with any repaired successors retained. |

G8 missing action: restart/reconnect the existing private MCP tunnel server against the U1 candidate with **separately explicit** managed-local execution policy (`CREATIVE_FLOW_ALLOW_LOCAL_EXECUTION=1`) and write grant; refresh tools in the intended ChatGPT workspace. In an actual ChatGPT conversation ask for `universal_catalog` → `create_universal` / atomic graph edits and save → `execute_universal` → `get_artifact` and readback. Use only local text-statistics; no Weave execution. Open the returned local URL and retain workflow/run/revision IDs and ChatGPT-side tool evidence. Do not paste credentials. Inspector alone cannot close this gate. Overall owner acceptance remains held for review.

## Checks, failures and evidence lineage

Builder checks: 56 tests passing, Svelte check 0 errors/0 warnings, production build. Build retains existing dependency unused-import/annotation/experimental SQLite warnings. Five existing proof bodies pass in isolation: agent, browser, interaction, official Inspector, UI/MCP parity. Additive discovery counts are 22 write / 9 read tools; all previous tools remain.

Pre-candidate failures are retained: `inspector-transcript-initial-held.json` records legacy-only save schema rejection; `inspector-transcript-format-drift-held.json` records a scratch fixture created before the frozen-contract representation settled. Timestamped browser failure screenshots/text retain the key-order stale-state defect; repaired canonical comparison, guarded manifest lookup, viewport fitting and unavailable-state tests now pass. These are development transcripts, not independent committed-candidate verdicts or published migrations. No released user document was migrated.

New evidence is confined to `evidence/u1/`; historical Stage 2/U0/integration evidence and SHAs remain unchanged. Writable tests use explicit isolated database/media roots. `data/u1/before.sqlite` and file manifests are private/ignored. UI/HTTP/stdio all use the same service. Fixed legacy asset upload/download root isolation rather than relocating test files afterward.

Fault probes include SQLite trigger failures before artifact/attempt completion, rollback/no exposed partial output, retry, real process death, byte/digest/missing blob failures, resealed producer/parent/snapshot/type/alias/missing-output corruption, schema/cycle/binding/role/version/parameter/effect errors, read-only/author-only execution denials, concurrent keys and duplicate delivery. Content seals are corruption checks, not signed provider attestation.

## Remaining limits and recommendation

U1 is a bounded local foundation: no external universal executor, collections, later primitives, remote publication, nested subflows, distributed recovery or hostile-code sandbox. Managed media is the documented PNG subset. PID reuse may conservatively hold an interrupted run; no automatic replay. Existing historical remote Weave output remains externally dependent and is not silently downloaded. Original tunnel permissions and single-user loopback UI trust model are preserved.

Review the draft PR and close G8 with the actual ChatGPT-side sequence before owner acceptance. Recommend a separate U2 decision after U1 acceptance; do not start later primitives or merge automatically.
