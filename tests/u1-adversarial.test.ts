import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  existsSync,
  unlinkSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { deflateSync } from 'node:zlib';
import { setTimeout as delay } from 'node:timers/promises';
import { z } from 'zod';
import {
  WorkbenchRuntime,
  createRegistry,
  inspectDocument,
  manifest,
  digest,
  type UniversalWorkflow,
  type UniversalRun,
  type Artifact
} from '../src/lib/workbench';
const node = (id: string, kind: string, config: Record<string, unknown>) => ({
  id,
  kind,
  config,
  version: 1,
  label: id,
  position: { x: 0, y: 0 }
});
function graph(): UniversalWorkflow {
  return {
    schemaVersion: 2,
    id: 'adversarial',
    name: 'Adversarial fixture',
    revision: 1,
    groups: [],
    nodes: [
      node('input', 'u.input', { type: 'text', value: 'hello world' }),
      node('transform', 'u.transform', {
        transformId: 'text.normalize',
        transformVersion: 1
      }),
      node('invoke', 'u.invoke', {
        capabilityId: 'local.text-statistics',
        capabilityVersion: 1,
        settings: {}
      }),
      node('output', 'u.output', {
        mode: 'return',
        type: 'record',
        schemaRef: 'cf.document-statistics@1'
      })
    ],
    edges: ['input', 'transform', 'invoke'].map((source, i) => ({
      id: `e${i}`,
      source,
      sourceHandle: 'value',
      target: ['transform', 'invoke', 'output'][i],
      targetHandle: 'input'
    }))
  };
}
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'cf-u1-adversarial-')),
    db = new DatabaseSync(join(root, 'db.sqlite')),
    registry = createRegistry();
  return {
    root,
    db,
    registry,
    r: new WorkbenchRuntime(db, root, { allowLocal: true, registry })
  };
}
function reseal(
  db: DatabaseSync,
  table: 'wb_artifacts' | 'wb_runs',
  v: Artifact | UniversalRun
) {
  db.prepare(`UPDATE ${table} SET document=?,seal=? WHERE id=?`).run(
    JSON.stringify(v),
    digest(v),
    v.id
  );
}
function imageBytes() {
  const chunk = (tag: string, data: Buffer) => {
    const out = Buffer.alloc(data.length + 12);
    out.writeUInt32BE(data.length);
    out.write(tag, 4);
    data.copy(out, 8);
    let crc = 0xffffffff;
    for (const b of out.subarray(4, out.length - 4)) {
      crc ^= b;
      for (let i = 0; i < 8; i++)
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    out.writeUInt32BE((crc ^ 0xffffffff) >>> 0, out.length - 4);
    return out;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(1);
  header.writeUInt32BE(1, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.from([0, 255, 0, 0, 255]))),
    chunk('IEND', Buffer.alloc(0))
  ]);
}
test('contract discovery rejects changed, expired, nonlocal, unknown and invalid settings', async () => {
  for (const change of [
    'changed',
    'expired',
    'effects',
    'unknown',
    'settings'
  ] as const) {
    const { db, r, registry } = fixture(),
      g = graph(),
      cap = registry.capabilities.get('local.text-statistics@1')!;
    if (change === 'changed') g.nodes[2].config.manifestHash = '0'.repeat(64);
    if (change === 'expired') cap.expiresAt = '2020-01-01T00:00:00.000Z';
    if (change === 'effects') cap.effects.push('filesystem:anywhere');
    if (change === 'unknown') g.nodes[2].config.capabilityId = 'missing';
    if (change === 'settings')
      g.nodes[2].config.settings = { referenceImages: ['arbitrary'] };
    assert.equal(inspectDocument(g, registry).readyToExecute, false, change);
    await assert.rejects(r.execute(g, { idempotencyKey: change }));
    assert.equal(
      (db.prepare('SELECT count(*) n FROM wb_artifacts').get() as { n: number })
        .n,
      0
    );
    db.close();
  }
});
test('duplicate identities, cycles, role/cardinality and unsupported media are not executable', () => {
  const mutations: ((g: UniversalWorkflow) => void)[] = [
    (g) => g.nodes.push({ ...g.nodes[0] }),
    (g) => g.edges.push({ ...g.edges[0], id: 'another' }),
    (g) =>
      g.edges.push({
        id: 'cycle',
        source: 'output',
        sourceHandle: 'value',
        target: 'transform',
        targetHandle: 'input'
      }),
    (g) => {
      g.nodes[0].config = {
        type: 'record',
        schemaRef: 'https://untrusted/schema',
        value: {}
      };
    },
    (g) => {
      g.nodes[0].config = {
        type: 'video',
        value: 'https://external.invalid/video'
      };
    },
    (g) => {
      g.nodes[1].config = { transformId: 'unknown', transformVersion: 1 };
    },
    (g) => {
      g.nodes[0].id = '__proto__';
    },
    (g) => {
      g.nodes[0].version = 99;
    },
    (g) => {
      g.edges[0].sourceHandle = 'style-reference';
    },
    (g) => {
      g.nodes[0].config = { type: 'text', value: ['batch', 'array'] };
    }
  ];
  for (const change of mutations) {
    const g = graph();
    change(g);
    assert.equal(inspectDocument(g).readyToExecute, false);
  }
});
test('registered version two capability executes through unchanged scheduler', async () => {
  const { r, db, registry } = fixture();
  registry.registerCapability({
    id: 'extension.stats',
    version: 2,
    adapter: 'extension-local',
    status: 'implemented-local',
    effects: ['compute'],
    discoveredAt: '2026-10-24T00:00:00.000Z',
    input: 'text',
    output: 'record',
    outputSchema: 'cf.document-statistics@1',
    settings: z.object({ factor: z.number().default(2) }).strict(),
    execute: (v, s) => ({
      characters: (v as string).length * (s.factor as number),
      words: 2,
      lines: 1
    })
  });
  const g = graph();
  g.nodes[2].config = {
    capabilityId: 'extension.stats',
    capabilityVersion: 2,
    settings: {}
  };
  const run = await r.execute(g, { idempotencyKey: 'v2' });
  assert.equal(run.status, 'completed');
  assert.equal(
    (run.states.invoke.outputs.value.value as { characters: number })
      .characters,
    22
  );
  db.close();
});
test('resealed snapshot, parent, producer, type and output alias tampering rejected', async () => {
  for (const mode of [
    'snapshot',
    'parent',
    'producer',
    'type',
    'alias',
    'missing-output'
  ] as const) {
    const { r, db } = fixture(),
      g = graph(),
      first = await r.execute(g, { idempotencyKey: 'first' }),
      run = await r.execute(g, { idempotencyKey: 'second' });
    if (mode === 'snapshot') {
      run.snapshot.nodes[0].config.value = 'forged';
      reseal(db, 'wb_runs', run);
    } else if (mode === 'missing-output') {
      run.states.invoke.outputs = {};
      run.states.output.outputs = {};
      reseal(db, 'wb_runs', run);
    } else if (mode === 'alias') {
      run.states.output.outputs.value = first.states.invoke.outputs.value;
      reseal(db, 'wb_runs', run);
    } else {
      const a = structuredClone(run.states.invoke.outputs.value);
      if (mode === 'parent') a.parents = [];
      if (mode === 'producer') a.nodeId = 'input';
      if (mode === 'type') {
        a.type = 'text';
        a.schemaRef = undefined;
        delete a.schemaRef;
        a.value = 'forged';
        a.contentHash = digest({ type: a.type, value: a.value });
        run.states.invoke.outputs.value = a;
        run.states.output.outputs.value = a;
        reseal(db, 'wb_runs', run);
      }
      reseal(db, 'wb_artifacts', a);
    }
    assert.throws(() => r.getRun(run.id), { name: 'Error' }, mode);
    if (mode === 'type')
      assert.throws(
        () => r.artifact(run.states.invoke.outputs.value.id),
        /contract/
      );
    db.close();
  }
});
test('SQLite completion faults roll back output and produce truthful failed dependency states', async () => {
  for (const mode of ['artifact', 'attempt'] as const) {
    const { r, db } = fixture();
    if (mode === 'artifact')
      db.exec(
        "CREATE TRIGGER injected BEFORE INSERT ON wb_artifacts WHEN json_extract(NEW.document,'$.nodeId')='invoke' BEGIN SELECT RAISE(ABORT,'injected artifact failure');END;"
      );
    else
      db.exec(
        "CREATE TRIGGER injected BEFORE UPDATE ON wb_attempts WHEN NEW.nodeId='invoke' AND NEW.status='completed' BEGIN SELECT RAISE(ABORT,'injected completion failure');END;"
      );
    const run = await r.execute(graph(), { idempotencyKey: mode });
    assert.equal(run.status, 'failed');
    assert.equal(run.states.invoke.status, 'failed');
    assert.equal(run.states.output.status, 'blocked');
    assert.equal(
      (
        db
          .prepare(
            "SELECT count(*) n FROM wb_artifacts WHERE json_extract(document,'$.nodeId')='invoke'"
          )
          .get() as { n: number }
      ).n,
      0
    );
    assert.equal(
      (
        db.prepare('SELECT count(*) n FROM wb_execution_locks').get() as {
          n: number;
        }
      ).n,
      0
    );
    db.exec('DROP TRIGGER injected');
    assert.equal(
      (await r.execute(graph(), { idempotencyKey: 'retry' })).status,
      'completed'
    );
    db.close();
  }
});
test('missing media fails visibly and import never accepts remote locations or denied effects', () => {
  const { r, db, root } = fixture(),
    base64 = imageBytes().toString('base64'),
    a = r.importImage({ base64, name: 'local.png' });
  unlinkSync(
    join(
      root,
      'workbench',
      'blobs',
      `${(a.value as { blob: string }).blob}.png`
    )
  );
  assert.throws(() => r.content(a.id), /ENOENT/);
  assert.throws(
    () =>
      r.importImage({
        base64: 'https://external.invalid/file.png',
        name: 'remote.png'
      }),
    /base64/
  );
  assert.throws(
    () =>
      r.importImage({
        base64: 'A'.repeat(12 * 1024 * 1024 + 1),
        name: 'large.png'
      }),
    /oversize/
  );
  assert.throws(
    () =>
      new WorkbenchRuntime(db, root).importImage({
        base64,
        name: 'denied.png'
      }),
    /permission/
  );
  db.close();
});
test('real child process termination recovers interrupted attempt without replay', async () => {
  const root = mkdtempSync(join(tmpdir(), 'cf-u1-kill-')),
    moduleURL = pathToFileURL(resolve('src/lib/workbench/index.ts')).href,
    dbPath = join(root, 'db.sqlite'),
    started = join(root, 'started'),
    calls = join(root, 'calls');
  const program = `import {DatabaseSync} from 'node:sqlite';import {writeFileSync,appendFileSync} from 'node:fs';import {WorkbenchRuntime,createRegistry} from ${JSON.stringify(moduleURL)};const registry=createRegistry();registry.capabilities.get('local.text-statistics@1').execute=()=>{appendFileSync(${JSON.stringify(calls)},'called\\n');writeFileSync(${JSON.stringify(started)},'ready');setInterval(()=>{},1000);return new Promise(()=>{});};const r=new WorkbenchRuntime(new DatabaseSync(${JSON.stringify(dbPath)}),${JSON.stringify(root)},{allowLocal:true,registry});await r.execute(${JSON.stringify(graph())},{idempotencyKey:'killed'});`;
  const child = spawn(
    process.execPath,
    ['--import', 'tsx', '--input-type=module', '-e', program],
    {
      cwd: process.cwd(),
      stdio: ['ignore', 'ignore', 'pipe'],
      windowsHide: true
    }
  );
  let errors = '';
  child.stderr.on('data', (b) => {
    errors += b.toString();
  });
  try {
    for (
      let i = 0;
      i < 200 && !existsSync(started) && child.exitCode === null;
      i++
    )
      await delay(25);
    assert.equal(existsSync(started), true, errors);
    const exited = new Promise<void>((res) => child.once('exit', () => res()));
    child.kill('SIGKILL');
    await exited;
    const recoverProgram = `import {DatabaseSync} from 'node:sqlite';import {WorkbenchRuntime} from ${JSON.stringify(moduleURL)};const db=new DatabaseSync(${JSON.stringify(dbPath)});const r=new WorkbenchRuntime(db,${JSON.stringify(root)},{allowLocal:true});const runs=r.runs('adversarial');console.log(JSON.stringify({status:runs[0].status,attempt:runs[0].attempts.find(a=>a.nodeId==='invoke').status,count:runs.length}));db.close();`;
    const restored = spawn(
      process.execPath,
      ['--import', 'tsx', '--input-type=module', '-e', recoverProgram],
      {
        cwd: process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true
      }
    );
    let output = '',
      err = '';
    restored.stdout.on('data', (b) => {
      output += b.toString();
    });
    restored.stderr.on('data', (b) => {
      err += b.toString();
    });
    const exitCode = await new Promise<number | null>((res) =>
      restored.once('exit', res)
    );
    assert.equal(exitCode, 0, err);
    assert.deepEqual(JSON.parse(output), {
      status: 'interrupted',
      attempt: 'interrupted',
      count: 1
    });
    assert.equal(readFileSync(calls, 'utf8').trim().split('\n').length, 1);
  } finally {
    if (child.exitCode === null) child.kill('SIGKILL');
  }
});
