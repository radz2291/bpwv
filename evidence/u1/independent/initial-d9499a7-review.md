# Independent challenge of d9499a7

Exact committed candidate: `d9499a776fb16dd6bb5600a6c1ac59e47ef8b07a`, branch `dev/u1-universal-execution`, clean tracked state at review start. Baseline `d3296549676e942ae402fcee7ea570d8fc51a16e`.

Verdict: **HELD for repair of G3**. Owner acceptance is separate and G8 remains HELD for an actual ChatGPT-side author/execute/read sequence. Independent review used source inspection, a fresh check/test run, and its own isolated runtime/browser fixtures rather than accepting builder reports.

## Finding

P2: `src/lib/Workbench.svelte` semantic comparison retains node and edge array order, whereas the runtime semantic hash sorts both by ID. Reverse only those arrays after executing, keep IDs/configuration/positions/edges identical, save, reload: all four cards incorrectly say `Historical result · semantic edits`. This breaks the compatible-result promise for semantically identical documents. The run and artifacts remain intact; no data loss or false generation was observed. Repair should compare the same normalized semantic representation as the server.

Reproduction on owned port 5177, root `data/u1/independent/1792855596477`: HTTP create/save/execute real local statistics; reverse arrays; save; browser reopen. Actual footers and screenshots: `1792855596477/summary.json`, `1792855596477/reorder-compatibility.png`. The failed candidate and evidence are preserved.

## Checks completed

- `npm run check`: 0 errors, 0 warnings; `npm test`: all 56 pass. Logs `check.txt` and `test.txt`.
- Actual text normalization and registered local Invoke produce 22 characters, 3 words, 1 line; Output aliases the Invoke artifact ID. Actual browser result visually inspected in `1792855596477/actual-text.png`.
- Explicit idempotency replay returns the original run. Stale revision and undeclared configuration reject without revision changes.
- Real local 2x1 fixture PNG bytes import and decode in Input, Transform, Output cards. This is synthetic local test media, not external generation. Actual screenshot visually inspected in `1792855596477/actual-media.png`.
- Owned visual process fully restarted twice. Restored text and PNG render with nonlocal browser requests blocked. Counts stay unchanged: 2 runs, 7 attempts, 6 artifacts after the bounded suite. No replay.
- All writable fixtures use explicit isolated database/media root. Independent 5177 process stopped. Original data/processes/configuration untouched.

Further negative, authority and preservation checks continue before a repaired-candidate verdict.
