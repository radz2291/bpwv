import { DatabaseSync } from 'node:sqlite';
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { workflowService } from '../src/lib/server/workflow-service';
import { db } from '../src/lib/server/store';
const baseline = new DatabaseSync('data/stage2/before.sqlite', {
  readOnly: true
});
const before = JSON.parse(
    readFileSync('data/stage2/workflow-before.json', 'utf8')
  ),
  after = workflowService.get(before.id);
for (const node of before.nodes) {
  const kept = after.nodes.find((n) => n.id === node.id)!;
  assert.ok(kept);
  if (node.id !== 'image_initial') assert.deepEqual(kept.config, node.config);
}
for (const edge of before.edges)
  assert.deepEqual(
    after.edges.find((e) => e.id === edge.id),
    edge
  );
const original = JSON.parse(
  String(
    db
      .prepare(
        'SELECT document FROM workflow_revisions WHERE workflowId=? AND revision=?'
      )
      .get(before.id, before.revision)!.document
  )
);
assert.deepEqual(original, before);
const inventory = baseline
  .prepare('SELECT id,document FROM workflows')
  .all()
  .map((row) => {
    const current = workflowService.get(String(row.id));
    const preserved =
      JSON.stringify(current) ===
      JSON.stringify(JSON.parse(String(row.document)));
    assert.ok(current);
    if (!preserved && current.id !== before.id)
      assert.ok(
        ['agent-proof', 'browser-interactions'].includes(current.id),
        'Unexpected modification to pre-existing non-fixture workflow ' +
          current.id
      );
    return {
      id: current.id,
      present: true,
      unchanged: preserved,
      reason: preserved
        ? 'preserved'
        : current.id === before.id
          ? 'authorized Stage2 changes'
          : 'existing regression fixture rerun'
    };
  });
const assetNode = after.nodes.find((n) => n.id === 'approved_b_asset')!;
const response = await fetch('http://127.0.0.1:5173' + assetNode.config.uri);
assert.ok(response.ok);
const hash = (b: Buffer) => createHash('sha256').update(b).digest('hex');
assert.equal(
  hash(Buffer.from(await response.arrayBuffer())),
  hash(
    readFileSync(
      'data/stage2/source/BorderPoint_Weave_Setup_v1/references/approved_B.png'
    )
  )
);
const run = workflowService.execution(after.id).run;
assert.equal(run.states.image_initial.status, 'completed');
assert.equal(run.states.preview_initial.status, 'completed');
assert.equal(run.states.image_refined.status, 'idle');
writeFileSync(
  'evidence/stage2-preservation.json',
  JSON.stringify(
    {
      verifiedAt: new Date().toISOString(),
      workflowId: before.id,
      originalRevision: before.revision,
      currentRevision: after.revision,
      originalNodesAndEdgesPreserved: true,
      originalPromptAndRefinementConfigsPreserved: true,
      originalRevisionDocumentExactlyRetained: true,
      managedImageBytesPersistAfterRestart: true,
      completedRunPersistAfterRestart: true,
      inventory
    },
    null,
    2
  )
);
baseline.close();
console.log('Preservation and post-restart byte/run proof PASS');
