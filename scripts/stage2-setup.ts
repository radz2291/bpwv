import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { workflowService } from '../src/lib/server/workflow-service';
import { models } from '../src/lib/server/provider';
const id = 'borderpoint-image-first-chatgpt',
  origin = 'http://127.0.0.1:5173';
const before = workflowService.get(id);
assert.ok(
  !before.nodes.some((n) => n.id === 'approved_b_asset'),
  'Stage 2 setup already applied; inspect current revision instead of overwriting.'
);
const source =
  'data/stage2/source/BorderPoint_Weave_Setup_v1/references/approved_B.png';
const bytes = readFileSync(source);
const form = new FormData();
form.set('file', new Blob([bytes], { type: 'image/png' }), 'approved_B.png');
const response = await fetch(origin + '/api/assets', {
  method: 'POST',
  headers: { Origin: origin },
  body: form
});
assert.ok(response.ok, await response.clone().text());
const asset = await response.json();
assert.equal(
  createHash('sha256')
    .update(readFileSync(`data/assets/${asset.id}`))
    .digest('hex'),
  createHash('sha256').update(bytes).digest('hex')
);
const model = models.find((m) => m.label === 'Nano Banana 2.1')!;
assert.ok(model);
const config = {
  modelId: model.id,
  params: {
    model: 'Nano Banana 2.1',
    resolution: '1K',
    aspect_ratio: '9:16',
    thinking_level: 'Minimal',
    output_format: 'png',
    enable_web_search: false
  }
};
const changes: any[] = [
  {
    op: 'add_node',
    node: {
      id: 'approved_b_asset',
      kind: 'asset',
      version: 1,
      label: 'Approved B · primary style anchor',
      position: { x: 735, y: 60 },
      config: {
        ...asset,
        assetId: asset.id,
        name: 'approved_B.png',
        mediaType: 'image',
        provenance: 'imported'
      }
    }
  },
  {
    op: 'add_node',
    node: {
      id: 'approved_b_references',
      kind: 'reference_set',
      version: 1,
      label: 'Reference Set · approved B first',
      position: { x: 735, y: 565 },
      config: {}
    }
  },
  {
    op: 'add_node',
    node: {
      id: 'preview_approved_reference',
      kind: 'preview',
      version: 1,
      label: 'Reference check · imported B',
      position: { x: 390, y: 655 },
      config: {}
    }
  },
  {
    op: 'configure_node',
    nodeId: 'image_initial',
    config,
    label: '04 · Nano Banana 2.1 · initial',
    position: { x: 1080, y: 60 }
  },
  {
    op: 'configure_node',
    nodeId: 'preview_initial',
    config: {},
    position: { x: 1425, y: 60 }
  },
  {
    op: 'configure_node',
    nodeId: 'refinement_notes',
    config: {},
    position: { x: 1080, y: 655 }
  },
  {
    op: 'configure_node',
    nodeId: 'image_refined',
    config: {},
    position: { x: 1425, y: 655 }
  },
  {
    op: 'configure_node',
    nodeId: 'preview_refined',
    config: {},
    position: { x: 1770, y: 655 }
  },
  {
    op: 'connect',
    edge: {
      id: 'approved-b-to-set',
      source: 'approved_b_asset',
      sourceHandle: 'asset',
      target: 'approved_b_references',
      targetHandle: 'asset'
    }
  },
  {
    op: 'connect',
    edge: {
      id: 'reference-set-to-initial',
      source: 'approved_b_references',
      sourceHandle: 'references',
      target: 'image_initial',
      targetHandle: 'references'
    }
  },
  {
    op: 'connect',
    edge: {
      id: 'approved-b-to-reference-preview',
      source: 'approved_b_asset',
      sourceHandle: 'asset',
      target: 'preview_approved_reference',
      targetHandle: 'asset'
    }
  }
];
const after = workflowService.apply({
  workflowId: id,
  expectedRevision: before.revision,
  changes
});
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
assert.equal(after.id, before.id);
writeFileSync(
  'data/stage2/workflow-after.json',
  JSON.stringify(after, null, 2)
);
writeFileSync(
  'evidence/stage2-reference-import.json',
  JSON.stringify(
    {
      importedAt: new Date().toISOString(),
      workflowId: id,
      beforeRevision: before.revision,
      afterRevision: after.revision,
      originalNodesPreserved: before.nodes.map((n) => n.id),
      originalEdgesPreserved: before.edges.map((e) => e.id),
      sourceArchive: 'BorderPoint_Weave_Setup_v1.zip',
      sourceEntry: 'BorderPoint_Weave_Setup_v1/references/approved_B.png',
      assetId: asset.id,
      uri: asset.uri,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      originalArchiveSha256: createHash('sha256')
        .update(readFileSync('BorderPoint_Weave_Setup_v1.zip'))
        .digest('hex'),
      sourceMatchesImportedBytes: true,
      supportingReference:
        'tabriz_historical_reference.jpg retained locally; not conditioned or uploaded',
      model: {
        id: model.id,
        label: model.label,
        providerModel: model.modelId,
        params: config.params
      },
      generationSubmitted: false,
      creditsSpent: 0
    },
    null,
    2
  )
);
console.log(
  `Stage 2 imported approved B and preserved original graph; revision ${before.revision} → ${after.revision}`
);
