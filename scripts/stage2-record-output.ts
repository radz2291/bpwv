import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { requestService } from '../src/lib/server/request-service';
const prepared = JSON.parse(
    readFileSync('data/stage2/resolved-request.json', 'utf8')
  ),
  receipt = JSON.parse(
    readFileSync('data/stage2/approved-generation.json', 'utf8')
  );
const predictionId = receipt.submission.predictionId;
assert.equal(receipt.submission.cost, 3.5);
assert.equal(receipt.output.runs[predictionId].status, 'COMPLETED');
requestService.recordApproval(prepared.id, receipt.approval);
const actual = receipt.output.runs[predictionId].outputs[0];
assert.equal(actual.type, 'image');
// Provider returned no asset ID: this is an explicitly local association identity.
const asset = {
  id: `local-${predictionId}-output-1`,
  uri: actual.url,
  mediaType: 'image'
};
const response = await fetch(
  `http://127.0.0.1:5173/api/requests/${prepared.id}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'completed',
      predictionId,
      actualModelId: prepared.model.modelId,
      assets: [asset]
    })
  }
);
assert.ok(response.ok, await response.clone().text());
const run = await response.json();
assert.equal(run.states.image_initial.status, 'completed');
assert.equal(run.states.preview_initial.status, 'completed');
assert.equal(run.states.image_refined.status, 'idle');
assert.deepEqual(run.states.image_initial.outputs.asset.parentIds, [
  prepared.assetLineage[0].id
]);
const proof = JSON.parse(
  readFileSync('evidence/stage2-request-proof.json', 'utf8')
);
Object.assign(proof, {
  generationSubmitted: true,
  creditsSpent: 3.5,
  actualQuote: requestService.get(prepared.id).cost,
  predictionId,
  actualOutput: { ...actual, localAssociationId: asset.id },
  initialState: 'completed',
  previewState: 'completed',
  refinementState: 'idle',
  structuredHumanApproval: true,
  submittedRunCount: 1
});
writeFileSync(
  'evidence/stage2-request-proof.json',
  JSON.stringify(proof, null, 2)
);
console.log(
  'Actual approved generation recorded; initial and Preview complete, refinement idle. Cost3.5, one run.'
);
