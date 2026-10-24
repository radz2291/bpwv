import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync } from 'node:fs';
import { demo } from '../src/lib/demo';
const origin = process.env.CREATIVE_FLOW_URL ?? 'http://127.0.0.1:5173';
async function api(path: string, body?: unknown) {
  const r = await fetch(
    origin + path,
    body
      ? {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body)
        }
      : {}
  );
  const result = await r.json();
  if (!r.ok) throw Error(JSON.stringify(result));
  return result;
}
const models = await api('/api/models');
const graph = demo();
graph.id = 'agent-proof';
graph.name = 'Agent proof · first light';
graph.nodes.find((n) => n.id === 'model')!.config = {
  modelId: models.find((m: any) => m.label === 'Flux 2 Pro').id,
  params: { image_size: 'landscape_16_9' }
};
const existing = await fetch(origin + '/api/workflows/agent-proof');
if (existing.ok) graph.revision = (await existing.json()).revision;
let saved = await api('/api/workflows', graph);
assert.deepEqual((await api('/api/workflows/agent-proof')).nodes, saved.nodes);
saved.nodes.find((n: any) => n.id === 'scene').config.text =
  'A quiet mountain observatory at sunrise, with one illuminated window.';
saved = await api('/api/workflows', saved);
const reopened = await api('/api/workflows/agent-proof');
assert.deepEqual(saved, reopened);
const run = await api('/api/run', reopened);
assert.equal(run.states.model.status, 'pending');
assert.equal(run.states.preview.status, 'blocked');
assert.equal(
  run.states.combine.outputs.text,
  reopened.nodes[0].config.text + '\n\n' + reopened.nodes[1].config.text
);
const pending = (await api('/api/requests')).find(
  (r: any) => r.id === run.states.model.requestId
);
assert.equal(pending.input.prompt, run.states.combine.outputs.text);
assert.equal(pending.cost.approved, false);
mkdirSync('evidence', { recursive: true });
writeFileSync(
  'evidence/agent-proof-workflow.json',
  JSON.stringify(reopened, null, 2)
);
writeFileSync(
  'evidence/agent-proof.json',
  JSON.stringify(
    {
      verifiedAt: new Date().toISOString(),
      workflowId: reopened.id,
      revision: reopened.revision,
      nodes: reopened.nodes.length,
      edges: reopened.edges.length,
      persistence: 'exact roundtrip verified',
      programmaticModification: 'verified',
      runId: run.id,
      states: run.states,
      request: pending,
      creditsSpent: 0
    },
    null,
    2
  )
);
console.log(
  'PASS: programmatic create, connect, save, modify, reopen, prompt execution, real-model pending request. Credits spent: 0.'
);
