import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { workflowService } from '../src/lib/server/workflow-service';
import { requestService } from '../src/lib/server/request-service';
import { db } from '../src/lib/server/store';
const id = 'borderpoint-image-first-chatgpt';
let graph = workflowService.get(id);
if (graph.nodes.find((n) => n.id === 'approved_b_references')!.position.y < 560)
  graph = workflowService.apply({
    workflowId: id,
    expectedRevision: graph.revision,
    changes: [
      {
        op: 'configure_node',
        nodeId: 'approved_b_references',
        config: {},
        position: { x: 735, y: 565 }
      }
    ]
  });
const run = await workflowService.executeDocument(graph, {
  targetNodeIds: ['preview_initial']
});
assert.equal(run.states.image_initial.status, 'pending');
assert.equal(run.states.preview_initial.status, 'blocked');
assert.equal(run.states.image_refined.status, 'idle');
assert.equal(run.states.refinement_notes.status, 'idle');
const request = requestService.get(run.states.image_initial.requestId!);
assert.equal(request.workflowRevision, graph.revision);
assert.equal(
  request.workflowHash,
  createHash('sha256').update(JSON.stringify(graph)).digest('hex')
);
assert.equal(
  request.promptSnapshot,
  run.states.established_prompt.outputs.text
);
assert.equal(request.input.images.length, 1);
assert.equal(request.providerInput, null);
assert.equal(request.assetLineage[0].sourceNodeId, 'approved_b_asset');
const uploaded = JSON.parse(
  readFileSync('data/stage2/weave-uploaded-approved-b.json', 'utf8')
);
const resolved = requestService.resolveMedia(request.id, {
  expectedInputHash: request.inputHash,
  resolutions: [
    { assetId: request.assetLineage[0].id, providerAsset: uploaded }
  ]
});
assert.deepEqual(resolved.input, request.input);
assert.equal(resolved.providerInput.images[0].url, uploaded.url);
assert.equal(resolved.cost.approved, false);
writeFileSync(
  'data/stage2/resolved-request.json',
  JSON.stringify(resolved, null, 2)
);
writeFileSync(
  'evidence/stage2-request-proof.json',
  JSON.stringify(
    {
      verifiedAt: new Date().toISOString(),
      workflowId: id,
      workflowRevision: graph.revision,
      workflowHash: request.workflowHash,
      requestId: request.id,
      runId: run.id,
      inputHash: request.inputHash,
      providerInputHash: resolved.providerInputHash,
      promptMatchesFullEstablishedPrompt: true,
      referenceCount: 1,
      referenceLocalId: request.assetLineage[0].id,
      realProviderUploadResolved: true,
      refinementState: run.states.image_refined.status,
      model: request.model,
      settings: graph.nodes.find((n) => n.id === 'image_initial')!.config
        .params,
      actualQuote: null,
      generationSubmitted: false,
      creditsSpent: 0
    },
    null,
    2
  )
);
assert.ok(
  db
    .prepare(
      'SELECT document FROM workflow_revisions WHERE workflowId=? AND revision=2'
    )
    .get(id)
);
console.log(
  'Reference-aware request prepared and real upload resolved; refinement idle. No model execution.'
);
