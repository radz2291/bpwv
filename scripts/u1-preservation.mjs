import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const before = new DatabaseSync('data/u1/before.sqlite', { readOnly: true });
const after = new DatabaseSync('data/creative-flow.sqlite', { readOnly: true });
const tables = [
  'workflows',
  'workflow_revisions',
  'runs',
  'requests',
  'workflow_assets'
];
const counts = {};
for (const table of tables) {
  const a = before
    .prepare(`SELECT * FROM ${table}`)
    .all()
    .map(JSON.stringify)
    .sort();
  const b = after
    .prepare(`SELECT * FROM ${table}`)
    .all()
    .map(JSON.stringify)
    .sort();
  assert.deepEqual(b, a, `${table}: original rows changed`);
  counts[table] = a.length;
}
const hashes = JSON.parse(readFileSync('data/u1/before-files.json', 'utf8'));
for (const [path, hash] of Object.entries(hashes))
  assert.equal(
    createHash('sha256').update(readFileSync(path)).digest('hex'),
    hash,
    `Original bytes changed: ${path}`
  );
const current = [];
function scan(dir) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) scan(p);
    else current.push(p);
  }
}
scan(resolve('data/assets'));
assert.deepEqual(
  current.sort(),
  Object.keys(hashes)
    .filter((p) => p.startsWith(resolve('data/assets')))
    .sort(),
  'Original media root gained/lost files'
);
const originalId = 'borderpoint-image-first-chatgpt';
const expected = JSON.parse(
  String(
    after.prepare('SELECT document FROM workflows WHERE id=?').get(originalId)
      .document
  )
);
const response = await fetch(
  `http://127.0.0.1:5173/api/workflows/${originalId}`
);
assert.ok(response.ok);
assert.deepEqual(await response.json(), expected);
writeFileSync(
  'evidence/u1/preservation.json',
  JSON.stringify(
    {
      verifiedAt: new Date().toISOString(),
      status: 'PASS',
      counts,
      originalManagedFiles: current.length,
      allOriginalRowsExactlyEqual: true,
      allOriginalMediaAndAuthAndArchiveDigestsEqual: true,
      noAddedOriginalMedia: true,
      originalServedWorkflowEqualsSQLite: true,
      baseline: 'd3296549676e942ae402fcee7ea570d8fc51a16e',
      backup: 'data/u1/before.sqlite (private consistent VACUUM backup)',
      paidCalls: 0
    },
    null,
    2
  )
);
before.close();
after.close();
console.log(
  'Original SQLite rows, media, authorization and archive bytes exactly preserved.'
);
