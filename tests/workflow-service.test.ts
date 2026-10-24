import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { WorkflowService } from '../src/lib/server/workflow-service';
import { initializeDatabase } from '../src/lib/server/store';
import { demo } from '../src/lib/demo';
function setup() {
  const db = new DatabaseSync(':memory:');
  initializeDatabase(db);
  return { db, service: new WorkflowService(db) };
}
test('service discovers contracts and atomically creates/configures/connects/reopens nodes', () => {
  const { db, service } = setup();
  assert.equal(service.catalog().length, 7);
  assert.ok(service.catalog().every((n) => n.configSchema));
  const created = service.create({
    id: 'test',
    name: 'MCP graph',
    schemaVersion: 1
  });
  const graph = demo();
  const result = service.apply({
    workflowId: created.id,
    expectedRevision: 1,
    changes: [
      ...graph.nodes.map((node) => ({ op: 'add_node', node })),
      ...graph.edges.map((edge) => ({ op: 'connect', edge }))
    ]
  });
  assert.equal(result.revision, 2);
  assert.deepEqual(result, service.get('test'));
  assert.match(service.url('test'), /\?workflow=test$/);
  assert.equal(service.inspect(result).readyToExecute, false);
  db.close();
});
test('invalid batch rolls back earlier node and asset removals; stale revision conflicts', () => {
  const { db, service } = setup();
  const graph = service.save(demo());
  const associated = service.associate(graph.id, graph.revision, 'scene', {
    id: 'real-asset',
    uri: 'https://example.com/actual.png',
    mediaType: 'image',
    provenance: 'external-reported'
  });
  assert.equal(associated.workflow.revision, 2);
  const before = service.get(graph.id);
  assert.throws(
    () =>
      service.apply({
        workflowId: graph.id,
        expectedRevision: 2,
        changes: [
          { op: 'remove_node', nodeId: 'scene' },
          {
            op: 'connect',
            edge: {
              id: 'bad',
              source: 'missing',
              sourceHandle: 'text',
              target: 'combine',
              targetHandle: 'scene'
            }
          }
        ]
      }),
    /Dangling/
  );
  assert.deepEqual(service.get(graph.id), before);
  assert.equal(service.assets(graph.id).length, 1);
  assert.throws(
    () =>
      service.apply({
        workflowId: graph.id,
        expectedRevision: 1,
        changes: [{ op: 'rename_workflow', name: 'Stale' }]
      }),
    /Revision conflict/
  );
  assert.deepEqual(service.get(graph.id), before);
  db.close();
});
test('save rejects nonexistent revision and invalid configuration; no partial save', () => {
  const { db, service } = setup();
  assert.throws(() => service.save({ ...demo(), revision: 5 }), /conflict/);
  const g = demo();
  g.nodes[0].config.text = 7;
  assert.throws(() => service.save(g));
  assert.equal(service.list().length, 0);
  db.close();
});
test('concurrent writers cannot overwrite and local authoring refuses generative execution', async () => {
  const { db, service } = setup();
  const graph = service.save(demo());
  const a = service.apply({
    workflowId: graph.id,
    expectedRevision: 1,
    changes: [
      { op: 'configure_node', nodeId: 'scene', config: { text: 'Writer A' } }
    ]
  });
  assert.throws(
    () =>
      service.apply({
        workflowId: graph.id,
        expectedRevision: 1,
        changes: [
          {
            op: 'configure_node',
            nodeId: 'scene',
            config: { text: 'Writer B' }
          }
        ]
      }),
    /conflict/
  );
  assert.equal(service.get(graph.id).nodes[0].config.text, 'Writer A');
  await assert.rejects(
    service.executeLocal(a.id, a.revision),
    /only all-local/
  );
  db.close();
});
test('local execution and asset origin metadata persist without changing external generation state', async () => {
  const { db, service } = setup();
  const g = demo();
  g.nodes = g.nodes.slice(0, 3);
  g.edges = g.edges.slice(0, 2);
  const saved = service.save(g),
    run = await service.executeLocal(saved.id, saved.revision);
  assert.equal(run.states.combine.status, 'completed');
  assert.equal(service.execution(saved.id).run.id, run.id);
  const result = service.associate(saved.id, 1, 'scene', {
    id: 'image',
    uri: 'https://example.com/image.png',
    mediaType: 'image',
    runId: run.id,
    provenance: 'external-reported',
    predictionId: 'declared-provenance'
  });
  assert.equal(result.asset.sourceNodeId, 'scene');
  assert.equal(result.workflow.revision, 2);
  assert.equal(
    service.execution(saved.id).run.states.combine.status,
    'completed'
  );
  db.close();
});
