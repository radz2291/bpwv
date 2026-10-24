# Independent U1 review — repaired candidate

Reviewed implementation: **`57bd8b968e1b990779d17f7f870027663160945d`**, branch `dev/u1-universal-execution`. Baseline: `d3296549676e942ae402fcee7ea570d8fc51a16e`. Exact HEAD rechecked after the final runtime and adversarial checks. This is an independent fresh-context challenge, including actual source, own isolated server/browser, new official Inspector calls and negative probes; it is not a recitation of builder conclusions.

**Engineering verdict: PASS WITH NON-BLOCKING LIMITATIONS for the implemented local U1 subset. Overall U1 acceptance: HELD at G8.** No outstanding material correctness defect was found after the ordinary G3 repair. Owner acceptance and main merge are separate; U2 remains unauthorized.

## Finding and repair lineage

Initial candidate `d9499a776fb16dd6bb5600a6c1ac59e47ef8b07a` was HELD for a reproduced P2 G3 defect: node/edge array-only reorder falsely made compatible results historical. Initial report and failed screenshots remain under this directory. The successor sorts those arrays by stable ID in the UI semantic comparison, matching the server definition. I inspected that focused source diff, then independently repeated the browser reproduction on the committed successor. All four cards now remain completed; artifacts and prior run remain unchanged. Evidence: `1792855746636/reorder-compatibility.png` and `summary.json`.

## Nine gates

| Gate | Independent assessment | Evidence and limits |
| --- | --- | --- |
| G1 one authority | PASS | Source inspection confirms sole WorkflowService authority and shared tables/expected revisions. Own HTTP/browser-created workflow was retrieved at the exact revision by fresh official Inspector; MCP atomic apply/save then execution used the same ID. Stale saves and invalid config leave the revision intact. `inspector-final-parity.json`. |
| G2 usable execution | PASS | Actual normalized text and local statistics rendered, with exact values 22 characters/3 words/1 line. MCP successor produced 21/3/1. Output aliases upstream artifact ID. Actual managed fixture PNG bytes decoded 2x1 in all three cards; screenshots visually inspected. `1792855746636/actual-text.png`, `actual-media.png`, Inspector transcript. |
| G3 durable versions | PASS after repair | Reorder regression independently reproduced and repaired. MCP semantic edit creates version 2 with predecessor version 1; the previous full run and artifact value compare unchanged. Output remains an alias. `inspector-final-parity.json`. |
| G4 restart | PASS for bounded local scope | Own 5177 production process stopped and restarted twice, same explicit isolated root. Text and PNG restore with browser nonlocal requests blocked; counters unchanged, 2 runs/7 attempts/6 artifacts before further Inspector successor execution. The full 56-test suite independently passed, including real child termination/recovery and call-counter no-replay proof. No distributed/external exactly-once claim. |
| G5 typed providers | PASS within declared subset | Runtime is registry driven; versioned schema/value checks and resolved contracts are explicit. Independently changed capability effects during an earlier awaited transform: Invoke handler was never called, its state failed, Output blocked, unrelated Input completed, lock released. Full suite covers compatible registered v2 capability/defaults and unknown/expired/changed manifests. Only required single `value` role is shipped; external Weave is a blocked descriptor, not current model discovery. |
| G6 protected effects | PASS within local trust boundary | Fresh official Inspector confirms read 9/write 22 tools, read mutation denied, author-only execute denied, explicit local policy discovery and external-dependent spend descriptor. Own negative tests reject undeclared config; suite covers paths/remote URIs/oversize/media/parameters, legacy approval failures and author policy. Source contains no universal external submission path. No generation, upload, publication or spend performed. |
| G7 preservation | PASS | Independently opened original and VACUUM baseline DBs read-only: exact rows compare for 13 workflows, 37 revisions, 31 runs, 13 requests, 5 associations. All 26 baseline file hashes match, including media/auth/archive checks without exposing contents. Legacy behavior preservation also covered by independent 56-test suite and inspected additive dispatch/migration. `adversarial.json`, `final-adversarial.txt`. |
| G8 agent connectivity | **HELD** | New official Inspector stdio parity/grant tests pass; existing official HTTP evidence and transport implementation were inspected. These are local Inspector calls. No actual ChatGPT-side U1 discover → author/save → separately permitted execute → artifact read evidence is available. Codex/Inspector cannot substitute for it. |
| G9 independent review | PASS | Exact committed predecessor challenged, material G3 finding reported promptly, failed candidate/evidence preserved, repair committed separately, focused diff inspected, final exact implementation SHA independently rechecked and runtime reproduction repeated. |

## Commands and evidence

- Independent `npm run check`: zero errors/warnings, both initial and repaired candidate (`check.txt`, `final-check.txt`).
- Independent `npm test`: 56/56 pass (`test.txt`). Repair changes only UI semantic sorting and its browser proof, so fresh targeted browser/restart checks and Svelte check validate that successor; runtime adversarial probes repeated after repair.
- Owned port 5177 browser tests: roots `data/u1/independent/1792855596477` (failed predecessor) and `data/u1/independent/1792855746636` (repaired successor). Both server processes stopped by the verifier. No original process was stopped or rebuilt by the verifier.
- New official Inspector: `inspector.json` (grant probes), `inspector-final-parity.json` (fresh committed-successor cross-transport author/execute/readback). Workflow `independent-text`, first successor run `6af478d4-efdf-46d2-ad1d-5f40552b9a08`; subsequent MCP run/artifact/revision IDs are in the final parity transcript. PNG run `5f13f113-650b-4ed0-9055-72941c3457b6`.
- Additional negative script: changed-during-execution effect contract, dependency failure/unrelated progress, released lock, resealed missing completed output, wrong producer attempt, exact original preservation. `adversarial.json`, `final-adversarial.txt`.

All writable tests were confined to explicitly configured isolated DB/media roots under `data/u1/independent`; test media is synthetic local fixture data. No paid calls/credits, external generation, source/media upload, credentials/config editing, main merge or U2 work occurred.

## Remaining limitations and recommendation

Complete G8 through the existing actual ChatGPT connection: explicitly restart/reconnect the intended U1 MCP server with both author grant and managed-local execution policy, refresh discovery, then perform local-only universal discovery, create/apply/save, execute, artifact read, and reopen the returned local URL. Preserve actual workflow/revision/run IDs and ChatGPT-origin tool evidence. Do not infer spend authorization from that policy.

The shipped slice has four primitives, single role/cardinality, trusted in-process handlers, text/record/basic scalar and the documented PNG subset. It has no universal external executor, current Weave model discovery, collections, later primitives, arbitrary destinations, sandbox, destructive GC or distributed scheduler. PID reuse can conservatively hold recovery; seal checks are corruption detection rather than authenticated attestation. These limits are accurately disclosed, not failed claims of broader functionality. A privileged local operator can alter the database; hosted multi-user security is outside this local trust boundary.

Recommend the repaired candidate for owner review with G8 explicitly HELD. Do not mark the entire nine-gate milestone accepted, merge main, or start U2 on the strength of this local engineering pass.
