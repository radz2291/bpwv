import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  WorkbenchRuntime,
  createRegistry,
  digest,
  initializeWorkbench,
  inspectDocument,
  semanticHash,
  type UniversalWorkflow
} from '../src/lib/workbench';
import { z } from 'zod';
import { deflateSync } from 'node:zlib';
function pngFixture() {
  const chunk = (tag: string, body: Buffer) => {
    const b = Buffer.alloc(12 + body.length);
    b.writeUInt32BE(body.length);
    b.write(tag, 4);
    body.copy(b, 8);
    let crc = 0xffffffff;
    for (const n of b.subarray(4, 8 + body.length)) {
      crc ^= n;
      for (let i = 0; i < 8; i++)
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    b.writeUInt32BE((crc ^ 0xffffffff) >>> 0, 8 + body.length);
    return b;
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(2);
  ihdr.writeUInt32BE(1, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    chunk('IHDR', ihdr),
    chunk(
      'IDAT',
      deflateSync(Buffer.from([0, 255, 0, 0, 255, 0, 255, 0, 255]))
    ),
    chunk('IEND', Buffer.alloc(0))
  ]);
}
function graph(): UniversalWorkflow {
  return {
    schemaVersion: 2,
    id: 'test',
    name: 'Proof',
    revision: 1,
    groups: [],
    nodes: [
      {
        id: 'in',
        kind: 'u.input',
        version: 1,
        label: 'Input',
        position: { x: 0, y: 0 },
        config: { type: 'text', value: '  Hello   world  ' }
      },
      {
        id: 'normalize',
        kind: 'u.transform',
        version: 1,
        label: 'Normalize',
        position: { x: 1, y: 0 },
        config: { transformId: 'text.normalize', transformVersion: 1 }
      },
      {
        id: 'stats',
        kind: 'u.invoke',
        version: 1,
        label: 'Statistics',
        position: { x: 2, y: 0 },
        config: {
          capabilityId: 'local.text-statistics',
          capabilityVersion: 1,
          settings: {}
        }
      },
      {
        id: 'out',
        kind: 'u.output',
        version: 1,
        label: 'Output',
        position: { x: 3, y: 0 },
        config: {
          mode: 'return',
          type: 'record',
          schemaRef: 'cf.document-statistics@1'
        }
      }
    ],
    edges: [
      {
        id: 'a',
        source: 'in',
        sourceHandle: 'value',
        target: 'normalize',
        targetHandle: 'input'
      },
      {
        id: 'b',
        source: 'normalize',
        sourceHandle: 'value',
        target: 'stats',
        targetHandle: 'input'
      },
      {
        id: 'c',
        source: 'stats',
        sourceHandle: 'value',
        target: 'out',
        targetHandle: 'input'
      }
    ]
  };
}
function runtime() {
  const root = mkdtempSync(join(tmpdir(), 'cf-u1-'));
  const db = new DatabaseSync(join(root, 'test.sqlite'));
  return { root, db, r: new WorkbenchRuntime(db, root, { allowLocal: true }) };
}
test('real local invoke, immutable versions, alias, restart, scoped idempotency', async () => {
  const { r, db, root } = runtime(),
    g = graph();
  const a = await r.execute(g, { idempotencyKey: 'one' });
  assert.equal(a.status, 'completed');
  assert.deepEqual(a.states.stats.outputs.value.value, {
    characters: 11,
    words: 2,
    lines: 1
  });
  assert.equal(a.states.out.outputs.value.id, a.states.stats.outputs.value.id);
  assert.equal((await r.execute(g, { idempotencyKey: 'one' })).id, a.id);
  g.revision++;
  g.nodes[0].config.value = 'Changed';
  await assert.rejects(r.execute(g, { idempotencyKey: 'one' }), /conflicts/);
  const b = await r.execute(g, { idempotencyKey: 'two' });
  assert.equal(b.states.in.outputs.value.version, 2);
  assert.equal(
    b.states.in.outputs.value.previousId,
    a.states.in.outputs.value.id
  );
  assert.equal(
    r.artifact(a.states.in.outputs.value.id).value,
    '  Hello   world  '
  );
  const reopened = new WorkbenchRuntime(db, root, { allowLocal: true });
  assert.equal(reopened.runs(g.id).length, 2);
  assert.deepEqual(reopened.recover(), { interrupted: 0, replayed: 0 });
  db.close();
});
test('permission, drafts, type/cycle/settings/schema negatives', async () => {
  const { r, root, db } = runtime();
  await assert.rejects(
    new WorkbenchRuntime(db, root).execute(graph(), { idempotencyKey: 'no' }),
    /permission/
  );
  const g = graph();
  g.nodes[3].config.schemaRef = 'remote:schema';
  assert.equal(inspectDocument(g).valid, false);
  g.nodes[3].config.schemaRef = 'cf.document-statistics@1';
  g.edges[1].targetHandle = 'unknown';
  assert.equal(inspectDocument(g).valid, false);
  g.edges.splice(1, 1);
  assert.equal(inspectDocument(g).valid, true);
  assert.equal(inspectDocument(g).readyToExecute, false);
  await assert.rejects(
    r.execute(g, { idempotencyKey: 'incomplete' }),
    /Missing/
  );
  g.nodes[2].config.settings = { shell: 'echo bad' };
  assert.equal(inspectDocument(g).valid, false);
  db.close();
});
test('registry extension executes without scheduler change; invalid outputs fail descendants', async () => {
  const { db, root } = runtime(),
    registry = createRegistry();
  registry.registerCapability({
    id: 'extension',
    version: 1,
    adapter: 'extension-local',
    status: 'implemented-local',
    effects: ['compute'],
    discoveredAt: '2026-10-24',
    input: 'text',
    output: 'record',
    outputSchema: 'cf.document-statistics@1',
    settings: z.object({}).strict(),
    execute: () => ({ characters: 2, words: 3, lines: 4 })
  });
  const r = new WorkbenchRuntime(db, root, { allowLocal: true, registry }),
    g = graph();
  g.nodes[2].config.capabilityId = 'extension';
  assert.equal(
    (await r.execute(g, { idempotencyKey: 'ext' })).status,
    'completed'
  );
  registry.capabilities.get('extension@1')!.execute = () => ({ bad: true });
  const failed = await r.execute(g, { idempotencyKey: 'bad' });
  assert.equal(failed.states.stats.status, 'failed');
  assert.equal(failed.states.out.status, 'blocked');
  db.close();
});
test('external planning is blocked with no attempts or synthetic assets', async () => {
  const { r, db } = runtime(),
    g = graph();
  g.nodes[2].config.capabilityId = 'weave.plan';
  g.nodes[3].config = { mode: 'return', type: 'image' };
  assert.equal(inspectDocument(g).valid, true);
  assert.equal(inspectDocument(g).readyToExecute, false);
  await assert.rejects(r.execute(g, { idempotencyKey: 'paid' }), /External/);
  assert.equal(
    (db.prepare('SELECT count(*) n FROM wb_artifacts').get() as { n: number })
      .n,
    0
  );
  db.close();
});
test('migration injected failure rollback and rerun preserve legacy rows', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(
    "CREATE TABLE workflows(id TEXT PRIMARY KEY,document TEXT);INSERT INTO workflows VALUES ('legacy','untouched')"
  );
  assert.throws(() => initializeWorkbench(db, true), /Injected/);
  assert.equal(
    db.prepare("SELECT name FROM sqlite_master WHERE name='wb_runs'").get(),
    undefined
  );
  initializeWorkbench(db);
  initializeWorkbench(db);
  assert.equal(
    (db.prepare('SELECT document FROM workflows').get() as { document: string })
      .document,
    'untouched'
  );
  db.close();
});
test('corruption, resealed identity tampering, cosmetic semantic hashes', async () => {
  const { r, db } = runtime(),
    g = graph();
  const hash = semanticHash(g);
  g.name = 'Cosmetic';
  g.nodes[0].position.x = 400;
  assert.equal(semanticHash(g), hash);
  g.nodes[0].config.value = 'Semantic';
  assert.notEqual(semanticHash(g), hash);
  const run = await r.execute(g, { idempotencyKey: 'integrity' });
  const a = run.states.stats.outputs.value;
  a.attemptId = 'forged';
  db.prepare('UPDATE wb_artifacts SET document=?,seal=? WHERE id=?').run(
    JSON.stringify(a),
    digest(a),
    a.id
  );
  assert.throws(() => r.artifact(a.id), /producer/);
  assert.throws(() => digest('\ud800'), /Unicode/);
  db.close();
});
test('managed PNG actual bytes restart, lineage, corruption and bounded import', async () => {
  const { r, db, root } = runtime(),
    bytes = pngFixture(),
    a = r.importImage({
      base64: bytes.toString('base64'),
      name: 'fixture.png'
    });
  assert.deepEqual(r.content(a.id), bytes);
  const g = graph();
  g.nodes = [g.nodes[0], g.nodes[1], g.nodes[3]];
  g.nodes[0].config = { type: 'image', artifactId: a.id };
  g.nodes[1].config = { transformId: 'image.identity', transformVersion: 1 };
  g.nodes[2].config = { mode: 'return', type: 'image' };
  g.edges = [
    g.edges[0],
    {
      id: 'output',
      source: 'normalize',
      sourceHandle: 'value',
      target: 'out',
      targetHandle: 'input'
    }
  ];
  const run = await r.execute(g, { idempotencyKey: 'image' });
  assert.equal(run.status, 'completed');
  const reopened = new WorkbenchRuntime(db, root, { allowLocal: true });
  assert.deepEqual(reopened.content(run.states.out.outputs.value.id), bytes);
  assert.throws(
    () =>
      r.importImage({
        base64: bytes.toString('base64'),
        name: '../escape.png'
      }),
    /name/
  );
  const broken = Buffer.from(bytes);
  broken[45] ^= 1;
  assert.throws(
    () => r.importImage({ base64: broken.toString('base64'), name: 'bad.png' }),
    /CRC/
  );
  writeFileSync(
    join(
      root,
      'workbench',
      'blobs',
      `${(a.value as { blob: string }).blob}.png`
    ),
    broken
  );
  assert.throws(() => reopened.content(a.id), /digest/);
  db.close();
});
test('in-flight duplicate is reused, different key denied, recovery never invokes adapter', async () => {
  const { db, root } = runtime(),
    registry = createRegistry();
  let calls = 0;
  registry.capabilities.get('local.text-statistics@1')!.execute = () => {
    calls++;
    return new Promise(() => {});
  };
  const r = new WorkbenchRuntime(db, root, { allowLocal: true, registry }),
    g = graph();
  void r.execute(g, { idempotencyKey: 'inflight' });
  await new Promise((resolve) => setTimeout(resolve, 20));
  const duplicate = await r.execute(g, { idempotencyKey: 'inflight' });
  assert.equal(duplicate.status, 'running');
  await assert.rejects(
    r.execute(g, { idempotencyKey: 'other' }),
    /already running/
  );
  assert.deepEqual(r.recover(), { interrupted: 0, replayed: 0 });
  db.prepare('DELETE FROM wb_run_owners WHERE runId=?').run(duplicate.id);
  assert.deepEqual(r.recover(), { interrupted: 1, replayed: 0 });
  assert.equal(r.getRun(duplicate.id).status, 'interrupted');
  assert.equal(calls, 1);
  db.close();
});
