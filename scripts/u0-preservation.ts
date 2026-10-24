import { DatabaseSync } from 'node:sqlite';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const before = new DatabaseSync('data/u0/before.sqlite', { readOnly: true });
const after = new DatabaseSync('data/creative-flow.sqlite', { readOnly: true });
const hashes: Record<string, number> = {};
const addedRows: Record<string, number> = {};
for (const table of [
  'workflows',
  'workflow_revisions',
  'runs',
  'requests',
  'workflow_assets'
]) {
  const rows = before.prepare(`SELECT * FROM ${table}`).all();
  const current = after.prepare(`SELECT * FROM ${table}`).all();
  // Every baseline row must be retained byte-for-byte. Regression tests run in separate data directory.
  for (const row of rows)
    assert.ok(
      current.some(
        (candidate) => JSON.stringify(candidate) === JSON.stringify(row)
      ),
      `Original baseline row changed in ${table}`
    );
  hashes[table] = rows.length;
  addedRows[table] = current.length - rows.length;
}
const assets: { path: string; sha256: string }[] = [];
function scan(dir: string) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) scan(path);
    else
      assets.push({
        path,
        sha256: createHash('sha256').update(readFileSync(path)).digest('hex')
      });
  }
}
scan('data/assets');
const document = String(
  after
    .prepare('SELECT document FROM workflows WHERE id=?')
    .get('borderpoint-image-first-chatgpt')!.document
);
const response = await fetch(
  'http://127.0.0.1:5173/api/workflows/borderpoint-image-first-chatgpt'
);
assert.ok(response.ok);
const body = await response.json();
assert.deepEqual(body.workflow ?? body, JSON.parse(document));
writeFileSync(
  'evidence/u0/preservation.json',
  JSON.stringify(
    {
      verifiedAt: new Date().toISOString(),
      allBaselineTablesExactlyPreserved: true,
      counts: hashes,
      addedRows,
      additionalFixtureWorkflow:
        'mcp-proof-1792848649864; first Inspector attempt filtered inherited environment; preserved, no baseline rows modified',
      servedWorkflowMatchesSQLite: true,
      assetHashes: assets
    },
    null,
    2
  )
);
before.close();
after.close();
console.log(
  'All original workflows, revisions, requests, runs and associations exactly preserved'
);
