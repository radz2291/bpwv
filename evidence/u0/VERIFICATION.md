# U0 verification and gate ledger

Date: 24 October 2026. Development branch `dev/u0-universal-workbench`.

## Identity and preservation

- Clean initial working tree at Stage 2 `45c9096780df1e43c32f5a15a5bafb2ce2170728` on main.
- PR #1 confirmed draft/open/unmerged. Approved documentation `a939cbe8e82657fdd2782f8131b97813a37d5b70` incorporated by merge on the development branch; no existing source or uncommitted work overwritten.
- Initial U0 candidate `fd646e9ba3a2c76460254533124dd968c2c46377` was independently held for recovered artifact validation defects.
- Repaired implementation candidate `bea4c50857fa4805eafd899c8e8656040adb0216`. Later evidence/report commits retain the same implementation; the reviewer also checks final commit identity before delivery.
- All 12 original workflows, 32 revisions, 30 runs, 13 requests and 4 associations are retained byte-for-byte against ignored `data/u0/before.sqlite`. No data migrations, production registry changes or production runtime imports of the spike.
- First Inspector isolation harness attempt filtered inherited environment, adding one harmless fixture workflow with its revisions/run/association to original data. No original row changed. Harness repaired with explicit server-config environment; successful subsequent proofs use isolated `data/u0/regression` and loopback port 5175. Temporary test server stopped after verification. Original app 5173 and MCP 5174 remain loopback-only.

## Fresh checks

| Check | Observed outcome | Evidence |
| --- | --- | --- |
| `npm test` | 35 passing tests: 22 legacy + 13 U0 | Tests include independent-review reproductions |
| `npm run check` | Zero errors, zero warnings | Builder and independent reviewer |
| `npm run build` | PASS, rerun after repair | Existing upstream unused-import/pure-annotation warnings and Node SQLite external/experimental notices; no new compile errors |
| `npm run u0:proof` | PASS | `proof.json`; deterministic local execution, blocked fixture plan, generated schemas, fresh-process pending restore |
| `node scripts/u0-compat.mjs` | PASS | Isolated legacy agent, browser and official MCP Inspector proof outputs in this directory |
| Official MCP Inspector | All 16 tools; 7 production node contracts; typed discovery, author/configure/save/reopen, rollback, stale revisions, local run, read-only denial and UI HTTP parity | `mcp-inspector-proof.json` |
| `node scripts/u0-live-browser.mjs` | PASS, read-only original editor | `live-browser.json`, `legacy-workbench.png`: 11 nodes, real 941×1672 reference and 768×1376 historical generated image |
| `npx tsx scripts/u0-preservation.ts` | All baseline rows unchanged, served workflow matches SQLite after app restart | `preservation.json` |
| Secret scan | Tracked files checked against local runtime/tunnel/MCP credentials and API-key pattern; no matches | Values never printed or stored in evidence |

Compatibility proofs were run against the production build before the isolated restore repair. The repair changes only the experimental module/tests/contracts, which are absent from production bundles. The production build, original editor and data preservation were rechecked afterward. No change required another paid run or production write.

## Gate interpretation

- **U0-1:** Executable schemas and semantic checks cover good/invalid recipe, operation/version, artifact/value/producer, port/role/cardinality and manifest/parameter cases. Approval and iteration are contract-only records with negative decision/bounds tests; there is no production scheduling/authority claim. Rich structured schemas remain fail-closed until a resolver exists.
- **U0-2:** Four labelled static domain recipes use the same vocabulary; assessment adds financial reconciliation as an extra paper challenge. These demonstrate expressibility, not completed domain integrations.
- **U0-3:** Deterministic path, registered extension, immutable snapshots/IDs and exact graph-derived lineage pass. Reviewer-discovered artifact type, value, producer and cyclic lineage acceptance repaired, with negative restoration tests. Completion events now require dependency order/coverage and producer output presence.
- **U0-4:** Zero provider calls, uploads, paid credits or deployment. No original graph deletion or conversion. This explicitly authorized source/evidence branch push is the only publication.
- **U0-5:** Independent challenge and repaired-candidate verdict are in `independent-review.md`; final commit recheck is reported with delivery.
- **U0-6:** Owner review remains pending. This deliverable recommends U1 but does not begin it or declare owner acceptance.

## Remaining limits

No eight-primitive production engine, new views, automatic migration, durable event scheduler, general provider adapter executor or authenticated approval service is delivered. Access labels and externally reported provenance are metadata. Sorted-key hashing is a local proposal, not a cross-host canonicalization standard. Manifest, scope and typed structured schema resolution need U1 decisions; Branch/Iterate/Approve/Subflow semantics need U2 proof. Streaming and distributed compensation remain explicit architectural limits.
