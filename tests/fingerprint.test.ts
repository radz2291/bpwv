import { test } from 'node:test';
import assert from 'node:assert/strict';
import { executionSignature } from '../src/lib/workflow-fingerprint';
import { demo } from '../src/lib/demo';
test('execution identity survives cosmetic saves but rejects changed prompts/settings/wiring', () => {
  const graph = demo(),
    same = structuredClone(graph);
  same.revision++;
  same.name = 'New title';
  same.nodes[0].position.x += 50;
  same.nodes[0].label = 'Relabel';
  assert.equal(executionSignature(same), executionSignature(graph));
  const changed = structuredClone(same);
  changed.nodes[0].config.text = 'Different prompt';
  assert.notEqual(executionSignature(changed), executionSignature(graph));
  changed.nodes[0].config = graph.nodes[0].config;
  changed.edges.pop();
  assert.notEqual(executionSignature(changed), executionSignature(graph));
});
