/** Offline maintenance. Dry-run by default; never exposed through HTTP/MCP. */
import { DatabaseSync } from 'node:sqlite';
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  cpSync,
  existsSync
} from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { z } from 'zod';

const manifestPath = process.argv[2];
if (!manifestPath)
  throw Error(
    'Usage: node --import tsx scripts/archive-workflow-demos.ts MANIFEST [--apply]'
  );
const manifest = z
  .object({
    dataDirectory: z.string().min(1),
    entries: z
      .array(
        z
          .object({
            id: z.string().min(1),
            expectedRevision: z.number().int().positive()
          })
          .strict()
      )
      .min(1)
  })
  .strict()
  .parse(JSON.parse(readFileSync(manifestPath, 'utf8')));
const root = resolve(manifest.dataDirectory);
assert.ok(
  existsSync(resolve(root, 'creative-flow.sqlite')),
  'Existing database required'
);
process.env.CREATIVE_FLOW_DATA_DIR = root;
const db = new DatabaseSync(resolve(root, 'creative-flow.sqlite'));
function snapshot(connection: DatabaseSync) {
  const tables = connection
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    )
    .all();
  return Object.fromEntries(
    tables.map(({ name }) => {
      const rows = connection
        .prepare(`SELECT * FROM "${String(name).replaceAll('"', '""')}"`)
        .all()
        .map((row) => JSON.stringify(row))
        .sort();
      return [
        String(name),
        {
          count: rows.length,
          hash: createHash('sha256').update(JSON.stringify(rows)).digest('hex')
        }
      ];
    })
  );
}
const workflows = db
  .prepare('SELECT id,revision,document FROM workflows')
  .all()
  .map((row) => ({
    id: String(row.id),
    revision: Number(row.revision),
    name: JSON.parse(String(row.document)).name,
    action: manifest.entries.some((e) => e.id === row.id)
      ? 'archive disposable fixture'
      : 'retain'
  }));
for (const entry of manifest.entries)
  assert.equal(
    workflows.find((w) => w.id === entry.id)?.revision,
    entry.expectedRevision,
    'Inventory changed; stop'
  );
if (!process.argv.includes('--apply')) {
  console.log(JSON.stringify({ dryRun: true, workflows }, null, 2));
  db.close();
} else {
  const backup = resolve('data/backups', `single-workbench-${Date.now()}`);
  mkdirSync(backup, { recursive: true });
  const before = snapshot(db);
  const backupDb = resolve(backup, 'creative-flow.sqlite');
  db.exec(`VACUUM INTO '${backupDb.replaceAll("'", "''")}'`);
  const copy = new DatabaseSync(backupDb, { readOnly: true });
  assert.equal(
    copy.prepare('PRAGMA integrity_check').get()?.integrity_check,
    'ok'
  );
  assert.deepEqual(snapshot(copy), before);
  copy.close();
  // Preserve all managed files, including immutable artifact blobs, without deleting originals.
  for (const directory of ['assets', 'workbench']) {
    if (existsSync(resolve(root, directory)))
      cpSync(resolve(root, directory), resolve(backup, directory), {
        recursive: true
      });
  }
  writeFileSync(
    resolve(backup, 'manifest.json'),
    JSON.stringify(
      { root, workflows, before, entries: manifest.entries },
      null,
      2
    )
  );
  const { WorkflowService } =
    await import('../src/lib/server/workflow-service');
  const service = new WorkflowService(db);
  const archived = service.archiveWorkflows(manifest.entries);
  const after = snapshot(db);
  for (const table of Object.keys(before))
    if (table !== 'workflows')
      assert.deepEqual(
        after[table],
        before[table],
        `History changed: ${table}`
      );
  assert.equal(after.workflows.count, before.workflows.count - archived.length);
  const report = {
    backup,
    root,
    workflows,
    archived: archived.map((g) => ({ id: g.id, revision: g.revision })),
    before,
    after,
    integrity: db.prepare('PRAGMA integrity_check').get()
  };
  writeFileSync(
    resolve(backup, 'result.json'),
    JSON.stringify(report, null, 2)
  );
  console.log(JSON.stringify(report, null, 2));
  db.close();
}
