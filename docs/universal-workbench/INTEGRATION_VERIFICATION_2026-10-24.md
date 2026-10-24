# Controlled integration verification — 24 October 2026

The owner explicitly approved merging PRs **#3 → #1 → #2 → #4** into main, preserving ancestry, checking each retargeted diff, then verifying the integrated baseline. U1 implementation was explicitly excluded.

## Exact integration identity

| Layer | Original head retained | New merge commit on main | Focused files |
| --- | --- | --- | --- |
| [PR #3 — Stage 2](https://github.com/radz2291/bpwv/pull/3) | `45c9096780df1e43c32f5a15a5bafb2ce2170728` | `bd57e751dfd65a1d140382defe91687e18d81c7a` | 64 |
| [PR #1 — architecture](https://github.com/radz2291/bpwv/pull/1) | `a4832d29da59265cd559b9b33a669da807590c75` | `a534f856d352bac43b0c82051bbf30860dca4da6` | 6 |
| [PR #2 — accepted U0](https://github.com/radz2291/bpwv/pull/2) | `5e70993033ca2f093a2f1e7e7b63813c7e8ea8b1` | `0ca33b64b88ceaafc83c346edf785770513cbd39` | 34 |
| [PR #4 — closure/preparation](https://github.com/radz2291/bpwv/pull/4) | `15ce42b73bb29c872fc70d1d8c44d33eb731f683` | `3391df4b28a7779d543ef54e47fe8303957261ad` | 7 |

The four-layer integrated baseline is **`3391df4b28a7779d543ef54e47fe8303957261ad`**. Each new merge has the previous main tip as its first parent and the original layer head as its second parent. The old remote main `b673887bd5555fca9a2ce67391254aa073f100ed` remains an ancestor. The accepted architecture tip `a939cbe8e82657fdd2782f8131b97813a37d5b70`, held U0 `fd646e9ba3a2c76460254533124dd968c2c46377`, repaired U0 `bea4c50857fa4805eafd899c8e8656040adb0216` and accepted U0 remain intact and reachable.

Each dependent PR was retargeted to main only after its prerequisite merged. Actual local diffs and GitHub metadata were checked again: six documentation files for #1, 34 isolated U0 files for #2, seven documentation files for #4. Merge calls pinned expected head SHAs and explicitly selected `merge`, never squash or rebase. No conflicts or unexpected changes occurred. Local main fast-forwarded safely from Stage 2 to the integrated baseline; no local work was overwritten and no branch was deleted.

`git diff --exit-code 15ce42b 3391df4` is empty: integration changed ancestry only, with **zero new tracked content** relative to the reviewed closure tip. The follow-up containing this report, state update and new integration evidence is additive documentation/evidence only. Its final commit SHA is reported in delivery and checked against the remote; the report records its parent baseline to avoid a self-referential hash claim.

## Fresh non-paid checks

| Check | Result |
| --- | --- |
| `npm test` | **35/35 PASS**; legacy engine/service/provider/approval and U0 negative restoration tests |
| `npm run check` | **0 errors, 0 warnings** |
| `npm run build` | **PASS**; existing upstream unused-import/annotation notices and Node SQLite experimental/external notices remain |
| Legacy agent and browser proof | **PASS** against isolated data on loopback 5175 |
| Official Inspector stdio | **PASS**: 16 tools, 7 node kinds, transactional authoring/save/reopen, stale revision rejection, local execution, read-only denial and HTTP/editor graph parity |
| Official Inspector HTTP authorization | **PASS**: absent/invalid credentials rejected, untrusted Origin rejected, six read-role tools versus sixteen write-role tools, read-role write denied; zero authorized writes to original data |
| Original editor after rebuild/restart | **PASS**, read-only: 11-node saved workflow, actual 941×1672 reference and historical 768×1376 output decode, no page errors |
| Existing private connected MCP | **PASS**: actual `node_types` and `get_workflow` calls, seven kinds and original workflow reopened; no reconnect/reconfiguration or write required |
| Fresh-process U0 restoration | **PASS**, no replay or executor call |
| Original data and authority | Exact SQLite row, managed-file byte and authorization-file preservation; see new preservation manifest |

The main application was stopped before rebuilding adapter files and restarted on loopback 5173 with its original data directory. Existing MCP on loopback 5174 and the private connection were preserved. Temporary writable proofs used an explicitly configured independent data root; Inspector's server config carries the isolated environment, addressing the earlier U0 harness finding. A temporary adaptation redirects old proof outputs to the new evidence folder instead of overwriting historical evidence. The temporary test server is stopped after verification.

The private snapshot was captured before writable verification, after Git-only merging: 13 workflows, 37 revisions, 31 runs, 13 requests and 5 associations. All rows compare exactly afterward, along with all 24 managed files. Runtime/tunnel/MCP credential values are never printed or committed; local preservation hashes are private. This task created no original-data fixture workflow. New evidence is under `evidence/integration-2026-10-24/`; all pre-existing evidence blobs remain unchanged.

The final strict preservation probe caught one temporary local fixture addition: the pre-existing upload route uses working-directory `data/assets` rather than `CREATIVE_FLOW_DATA_DIR`. Inspector's database was isolated correctly, but its local image upload created `f1f32653-b41b-4226-a294-b3d14a28c871` and its metadata beside original media. The fixture identity was verified against the new Inspector transcript, then both newly created files were relocated (not deleted) into the isolated regression media directory. No baseline file or row was altered. Strict comparison afterward passes with exactly the original 24 managed files and unchanged bytes. This is a documented pre-existing data-root isolation limitation, not an integration code change; no runtime repair was introduced. Future writable upload proofs must isolate their working directory as well as SQLite or explicitly repair unified data-root handling in an authorized milestone.

**Credits spent: 0. Provider generation calls: 0.** No external uploads, external submission, public ingress, deployment, workflow conversion, database migration, authorization-rule change or U1 implementation occurred. The local Inspector fixture upload is disclosed above. Pending generation is never counted as success; the on-screen generated image is the historical separately approved Stage 2 result.

## Independent audit and boundaries

A separate verifier independently checked actual merged PR states/timestamps, original merge parents and retained SHAs, exact local/remote main parity and full-tree equality at `3391df4`. Verdict: **PASS** for the controlled integration. The verifier did not modify data or rerun paid work. The final documentation follow-up is independently checked for evidence/documentation-only scope and remote parity before delivery; author-run runtime checks are distinguished from the independent history audit.

U0 remains owner-accepted **PASS WITH NON-BLOCKING FINDINGS** for its isolated foundation milestone. Experimental limits, earlier failed-candidate evidence and repaired successors remain documented. U1's handoff is ready, but no U1 production engine, durable universal-artifact runtime or new primitive has shipped. Existing single-user loopback/trusted-result and remote-media availability limitations remain unchanged. There are no integration blockers; U1 requires a separate explicit owner instruction.
