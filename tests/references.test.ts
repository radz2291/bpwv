import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registry } from '../src/lib/registry';
import { execute, validateGraph } from '../src/lib/engine';
import { projectMedia } from '../src/lib/media-view';
import type { Workflow } from '../src/lib/contract';
const node = (
  id: string,
  kind: string,
  config: Record<string, unknown> = {}
) => ({ id, kind, version: 1, label: id, position: { x: 0, y: 0 }, config });
function graph(): Workflow {
  return {
    schemaVersion: 1,
    id: 'refs-test',
    name: 'Reference test',
    revision: 1,
    groups: [],
    nodes: [
      node('a', 'asset', {
        uri: '/api/assets/approved',
        assetId: 'approved',
        mediaType: 'image',
        name: 'approved_B.png'
      }),
      node('set', 'reference_set'),
      node('model', 'weave', { modelId: 'test', params: {} }),
      node('preview', 'preview')
    ],
    edges: [
      {
        id: 'a-set',
        source: 'a',
        sourceHandle: 'asset',
        target: 'set',
        targetHandle: 'asset'
      },
      {
        id: 'set-model',
        source: 'set',
        sourceHandle: 'references',
        target: 'model',
        targetHandle: 'references'
      },
      {
        id: 'model-preview',
        source: 'model',
        sourceHandle: 'asset',
        target: 'preview',
        targetHandle: 'asset'
      }
    ]
  };
}
test('Reference Set wraps one asset, preserves identity/lineage and does not call a model', async () => {
  const g = graph();
  g.nodes = g.nodes.slice(0, 2);
  g.edges = g.edges.slice(0, 1);
  let calls = 0;
  const states = await execute(g, registry, async () => {
    calls++;
    throw Error('No generation');
  });
  assert.equal(calls, 0);
  const refs = states.set.outputs.references as any[];
  assert.equal(refs.length, 1);
  assert.equal(refs[0].id, 'approved');
  assert.equal(refs[0].sourceNodeId, 'a');
  assert.equal(refs[0].name, 'approved_B.png');
  assert.equal(states.set.status, 'completed');
});
test('Reference Set chaining preserves deterministic order beyond two references', async () => {
  const g = graph();
  g.nodes = g.nodes.slice(0, 2);
  g.edges = g.edges.slice(0, 1);
  for (let i = 2; i <= 4; i++) {
    g.nodes.push(
      node(`a${i}`, 'asset', {
        uri: `/api/assets/${i}`,
        assetId: `asset${i}`,
        mediaType: 'image'
      }),
      node(`s${i}`, 'reference_set')
    );
    g.edges.push(
      {
        id: `asset${i}`,
        source: `a${i}`,
        sourceHandle: 'asset',
        target: `s${i}`,
        targetHandle: 'asset'
      },
      {
        id: `existing${i}`,
        source: i === 2 ? 'set' : `s${i - 1}`,
        sourceHandle: 'references',
        target: `s${i}`,
        targetHandle: 'existing'
      }
    );
  }
  const states = await execute(g, registry, async () => {
    throw Error('No');
  });
  assert.deepEqual(
    (states.s4.outputs.references as any[]).map((a) => a.id),
    ['approved', 'asset2', 'asset3', 'asset4']
  );
});
test('typed ports reject direct asset to assets and missing required Reference Set input', async () => {
  const g = graph();
  assert.throws(
    () =>
      validateGraph(
        {
          ...g,
          edges: [
            {
              id: 'bad',
              source: 'a',
              sourceHandle: 'asset',
              target: 'model',
              targetHandle: 'references'
            }
          ]
        },
        registry
      ),
    /Incompatible/
  );
  g.edges = [];
  const states = await execute(g, registry, async () => {
    throw Error('No');
  });
  assert.equal(states.set.status, 'failed');
});
test('canvas projection works before execution, updates after replacement and never invents output', () => {
  const g = graph();
  const views = projectMedia(g, registry, {});
  assert.equal(views.a.assets[0].uri, '/api/assets/approved');
  assert.equal(views.set.assets[0].id, 'approved');
  assert.equal(views.model.assets.length, 0);
  assert.equal(views.preview.assets.length, 0);
  g.nodes[0].config.uri = '/api/assets/replacement';
  assert.equal(
    projectMedia(g, registry, {}).set.assets[0].uri,
    '/api/assets/replacement'
  );
  g.edges = g.edges.filter((e) => e.id !== 'a-set');
  assert.equal(projectMedia(g, registry, {}).set.assets.length, 0);
});
test('imported Preview is distinguished from model output; pending/running/failed never fabricate pixels', () => {
  const g = graph();
  g.edges = [
    {
      id: 'import-preview',
      source: 'a',
      sourceHandle: 'asset',
      target: 'preview',
      targetHandle: 'asset'
    }
  ];
  const views = projectMedia(g, registry, {});
  assert.equal(views.preview.source, 'imported');
  assert.equal(views.preview.assets[0].id, 'approved');
  for (const status of ['pending', 'running', 'failed'] as const) {
    const state = projectMedia(graph(), registry, {
      model: { status, outputs: {} }
    });
    assert.equal(state.model.assets.length, 0);
    assert.equal(state.preview.assets.length, 0);
  }
});
test('targeted preparation leaves a separate refinement generation idle', async () => {
  const g = graph();
  g.nodes.push(
    node('p', 'text', { text: 'Prompt' }),
    node('refined', 'weave', { modelId: 'test', params: {} })
  );
  g.edges.push(
    {
      id: 'prompt-initial',
      source: 'p',
      sourceHandle: 'text',
      target: 'model',
      targetHandle: 'prompt'
    },
    {
      id: 'prompt-refined',
      source: 'p',
      sourceHandle: 'text',
      target: 'refined',
      targetHandle: 'prompt'
    }
  );
  let calls = 0;
  const states = await execute(
    g,
    registry,
    async () => {
      calls++;
      return { status: 'pending', outputs: {} };
    },
    ['preview']
  );
  assert.equal(calls, 1);
  assert.equal(states.model.status, 'pending');
  assert.equal(states.refined.status, 'idle');
  assert.equal(states.preview.status, 'blocked');
});
