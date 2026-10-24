import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NodeRegistry } from '../src/lib/contract';
import { registry } from '../src/lib/registry';
import { execute, validateGraph } from '../src/lib/engine';
import { demo } from '../src/lib/demo';
test('deterministic combination, pending generation and blocked preview', async () => {
  const graph = demo();
  graph.nodes.find((n) => n.id === 'model')!.config.modelId = 'discovered';
  let calls = 0;
  const states = await execute(graph, registry, async () => {
    calls++;
    return { status: 'pending', outputs: {}, requestId: 'proof' };
  });
  assert.equal(
    states.combine.outputs.text,
    'A quiet mountain observatory at dawn.\n\nSoft natural light, restrained colors, editorial photography.'
  );
  assert.equal(calls, 1);
  assert.equal(states.model.status, 'pending');
  assert.equal(states.preview.status, 'blocked');
});
test('local graph never calls generation adapter', async () => {
  const graph = demo();
  graph.nodes = graph.nodes.slice(0, 3);
  graph.edges = graph.edges.slice(0, 2);
  const states = await execute(graph, registry, async () => {
    throw Error('Must not call model');
  });
  assert.equal(states.combine.status, 'completed');
});
test('reject incompatible, duplicate, cyclic and unsupported graphs', () => {
  const g = demo();
  assert.throws(
    () =>
      validateGraph(
        {
          ...g,
          edges: [
            ...g.edges,
            {
              id: 'bad',
              source: 'scene',
              sourceHandle: 'text',
              target: 'preview',
              targetHandle: 'asset'
            }
          ]
        },
        registry
      ),
    /Incompatible/
  );
  assert.throws(
    () => validateGraph({ ...g, nodes: [...g.nodes, g.nodes[0]] }, registry),
    /Duplicate/
  );
  assert.throws(
    () =>
      validateGraph(
        { ...g, edges: [...g.edges, { ...g.edges[0], id: 'duplicate' }] },
        registry
      ),
    /already connected/
  );
  const local = {
    ...g,
    nodes: g.nodes.filter((n) => n.id === 'combine'),
    edges: [
      {
        id: 'cycle',
        source: 'combine',
        sourceHandle: 'text',
        target: 'combine',
        targetHandle: 'scene'
      }
    ]
  };
  assert.throws(() => validateGraph(local, registry), /Cycles/);
  assert.throws(() => validateGraph({ ...g, schemaVersion: 2 }, registry));
});
test('new typed node registers and executes without engine changes', async () => {
  const r = new NodeRegistry();
  registry.list().forEach((d) => r.register(d));
  r.register({
    kind: 'test.uppercase',
    version: 2,
    label: 'Extension proof',
    category: 'Text',
    provider: 'local',
    inputs: [{ id: 'input', type: 'text', required: true }],
    outputs: [{ id: 'text', type: 'text' }],
    defaults: {},
    validate: () => {},
    execute: async ({ inputs }) => ({
      status: 'completed',
      outputs: { text: String(inputs.input).toUpperCase() }
    })
  });
  const g = demo();
  g.nodes = [
    g.nodes[0],
    {
      id: 'extension',
      kind: 'test.uppercase',
      version: 2,
      label: 'Extension',
      config: {},
      position: { x: 0, y: 0 }
    }
  ];
  g.edges = [
    {
      id: 'ext',
      source: 'scene',
      sourceHandle: 'text',
      target: 'extension',
      targetHandle: 'input'
    }
  ];
  const states = await execute(g, r, async () => {
    throw Error('No model');
  });
  assert.equal(
    states.extension.outputs.text,
    'A QUIET MOUNTAIN OBSERVATORY AT DAWN.'
  );
  assert.throws(() => r.register(r.get('text')), /Duplicate/);
});
test('missing inputs and local refinement are explicit', async () => {
  const g = demo();
  g.nodes = [
    g.nodes[0],
    {
      id: 'r',
      kind: 'refinement',
      version: 1,
      label: 'Refine',
      config: { notes: 'Use warm light. Keep the composition.' },
      position: { x: 0, y: 0 }
    }
  ];
  g.edges = [
    {
      id: 'r',
      source: 'scene',
      sourceHandle: 'text',
      target: 'r',
      targetHandle: 'prompt'
    }
  ];
  let state = await execute(g, registry, async () => {
    throw Error('No');
  });
  assert.match(String(state.r.outputs.text), /Refinement:\nUse warm light/);
  g.edges = [];
  state = await execute(g, registry, async () => {
    throw Error('No');
  });
  assert.equal(state.r.status, 'failed');
});
