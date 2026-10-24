import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, mkdtempSync } from 'node:fs';
import { resolve } from 'node:path';
import { WorkflowService } from '../src/lib/server/workflow-service';
import { initializeDatabase } from '../src/lib/server/store';
import type { UniversalWorkflow } from '../src/lib/workbench/contracts';
import { defaultRegistry } from '../src/lib/workbench/contracts';

test('U1 saves pin manifests; contract drift blocks execution while historical runs stay readable', async () => {
  const { db, service } = setup();
  const capability = defaultRegistry.capabilities.get(
    'local.text-statistics@1'
  )!;
  const before = capability.discoveredAt;
  try {
    const graph = service.save(fixture('u1-pinned-manifest'));
    assert.equal(typeof graph.nodes[2].config.manifestHash, 'string');
    const run = await service.executeUniversal(
      graph.id,
      graph.revision,
      'before-drift'
    );
    capability.discoveredAt = '2026-10-25T00:00:00.000Z';
    await assert.rejects(
      service.executeUniversal(graph.id, graph.revision, 'after-drift'),
      /manifest changed/i
    );
    assert.deepEqual(service.universalRuns(graph.id), [run]);
  } finally {
    capability.discoveredAt = before;
    db.close();
  }
});
import { demo } from '../src/lib/demo';

function setup(allowed = true) {
  mkdirSync(resolve('data/u1/tests'), { recursive: true });
  const root = mkdtempSync(resolve('data/u1/tests/service-'));
  const db = new DatabaseSync(resolve(root, 'test.sqlite'));
  initializeDatabase(db);
  return {
    db,
    root,
    service: new WorkflowService(db, undefined, 'http://127.0.0.1:5173', {
      dataDirectory: root,
      allowLocalExecution: allowed
    })
  };
}
function fixture(id = 'u1-service'): UniversalWorkflow {
  const configs = [
    ['u.input', { type: 'text', value: '  One   two\nthree  ' }],
    [
      'u.transform',
      { transformId: 'text.normalize', transformVersion: 1, settings: {} }
    ],
    [
      'u.invoke',
      {
        capabilityId: 'local.text-statistics',
        capabilityVersion: 1,
        settings: {}
      }
    ],
    [
      'u.output',
      { mode: 'return', type: 'record', schemaRef: 'cf.document-statistics@1' }
    ]
  ] as const;
  const nodes = configs.map(([kind, config], i) => ({
    id: `n${i}`,
    kind,
    version: 1,
    label: kind,
    position: { x: i * 260, y: 0 },
    config
  }));
  return {
    schemaVersion: 2,
    id,
    name: 'Local generic analysis',
    revision: 0,
    nodes,
    edges: nodes.slice(1).map((n, i) => ({
      id: `e${i}`,
      source: `n${i}`,
      sourceHandle: 'value',
      target: n.id,
      targetHandle: 'input'
    })),
    groups: []
  };
}
test('U1 shared service executes real local capability; artifacts and idempotency survive a new service', async () => {
  const { db, root, service } = setup();
  try {
    const graph = service.save(fixture());
    assert.equal(service.inspect(graph).readyToExecute, true);
    const run = await service.executeUniversal(
      graph.id,
      graph.revision,
      'first'
    );
    assert.equal(run.status, 'completed');
    assert.deepEqual(run.states.n3.outputs.value.value, {
      characters: 13,
      words: 3,
      lines: 1
    });
    assert.equal(
      (await service.executeUniversal(graph.id, graph.revision, 'first')).id,
      run.id
    );
    const restored = new WorkflowService(db, undefined, undefined, {
      dataDirectory: root,
      allowLocalExecution: true
    });
    assert.deepEqual(restored.get(graph.id), graph);
    assert.deepEqual(restored.universalRuns(graph.id), [run]);
    assert.deepEqual(
      restored.universalArtifact(run.states.n2.outputs.value.id).value,
      { characters: 13, words: 3, lines: 1 }
    );
    const second = await restored.executeUniversal(
      graph.id,
      graph.revision,
      'second'
    );
    assert.equal(second.states.n2.outputs.value.version, 2);
    assert.equal(
      second.states.n2.outputs.value.previousId,
      run.states.n2.outputs.value.id
    );
    assert.deepEqual(
      restored.universalArtifact(run.states.n2.outputs.value.id),
      run.states.n2.outputs.value
    );
  } finally {
    db.close();
  }
});
test('U1 authoring permission does not grant execution or import, and denied operations leave no run', async () => {
  const { db, service } = setup(false);
  try {
    const graph = service.save(fixture('u1-denied'));
    await assert.rejects(
      service.executeUniversal(graph.id, graph.revision, 'denied'),
      /disabled|permission/i
    );
    assert.throws(
      () => service.importUniversalImage({ base64: '', name: 'x.png' }),
      /disabled|permission/i
    );
    assert.deepEqual(service.universalRuns(graph.id), []);
    assert.equal(service.get(graph.id).revision, 1);
  } finally {
    db.close();
  }
});
test('U1 stale writes/execution and invalid typed atomic batches cannot alter a graph', async () => {
  const { db, service } = setup();
  try {
    const graph = service.save(fixture('u1-atomic'));
    assert.throws(
      () =>
        service.apply({
          workflowId: graph.id,
          expectedRevision: graph.revision,
          changes: [
            { op: 'rename_workflow', name: 'Must roll back' },
            {
              op: 'configure_node',
              nodeId: 'n0',
              config: { type: 'number', value: 42 }
            }
          ]
        }),
      /Incompatible/
    );
    assert.deepEqual(service.get(graph.id), graph);
    const changed = service.apply({
      workflowId: graph.id,
      expectedRevision: 1,
      changes: [{ op: 'rename_workflow', name: 'New name' }]
    });
    assert.throws(() => service.save(graph), /conflict/i);
    await assert.rejects(
      service.executeUniversal(graph.id, 1, 'stale'),
      /conflict/i
    );
    assert.deepEqual(service.get(graph.id), changed);
    assert.equal(service.universalRuns(graph.id).length, 0);
  } finally {
    db.close();
  }
});
test('U1 changing semantic configuration produces new immutable results and keeps historical snapshots', async () => {
  const { db, service } = setup();
  try {
    const graph = service.save(fixture('u1-history'));
    const first = await service.executeUniversal(graph.id, 1, 'v1');
    const changed = service.apply({
      workflowId: graph.id,
      expectedRevision: 1,
      changes: [
        { op: 'configure_node', nodeId: 'n0', config: { value: 'Hello' } }
      ]
    });
    await assert.rejects(
      service.executeUniversal(graph.id, changed.revision, 'v1'),
      /Idempotency/
    );
    const second = await service.executeUniversal(
      graph.id,
      changed.revision,
      'v2'
    );
    assert.notEqual(first.semanticHash, second.semanticHash);
    assert.equal(first.snapshot.nodes[0].config.value, '  One   two\nthree  ');
    assert.deepEqual(second.states.n3.outputs.value.value, {
      characters: 5,
      words: 1,
      lines: 1
    });
    assert.equal(service.universalRuns(graph.id).length, 2);
  } finally {
    db.close();
  }
});
test('U1 saving cannot reinterpret existing legacy graph identity as a universal schema', () => {
  const { db, service } = setup();
  try {
    const legacy = service.save(demo());
    const replacement = { ...fixture(legacy.id), revision: legacy.revision };
    assert.throws(() => service.save(replacement), /format cannot change/i);
    assert.deepEqual(service.get(legacy.id), legacy);
  } finally {
    db.close();
  }
});
