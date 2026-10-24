import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
const origin = 'http://127.0.0.1:5173';
const checks = [];
async function api(path, body) {
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
  const value = await r.json();
  if (!r.ok) throw Error(JSON.stringify(value));
  return value;
}
let graph = JSON.parse(
  readFileSync('evidence/agent-proof-workflow.json', 'utf8')
);
graph.id = 'browser-interactions';
graph.name = 'Browser interaction proof';
graph.revision = 0;
const existing = await fetch(origin + '/api/workflows/' + graph.id);
if (existing.ok) graph.revision = (await existing.json()).revision;
graph = await api('/api/workflows', graph);
const stale = await fetch(origin + '/api/workflows', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ ...graph, revision: graph.revision - 1 })
});
assert.equal(stale.status, 409);
checks.push('stale revision conflict rejected');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
page.setDefaultTimeout(12000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(origin);
await page.getByRole('button', { name: 'Browser interaction proof' }).click();
await page.locator('[data-id="scene"]').waitFor();
const before = (await api('/api/workflows/' + graph.id)).nodes[0].position;
const box = await page.locator('[data-id="scene"] h3').boundingBox();
await page.mouse.move(box.x + 30, box.y + 7);
await page.mouse.down();
await page.mouse.move(box.x + 80, box.y + 42, { steps: 8 });
await page.mouse.up();
await page.getByRole('button', { name: 'Save workflow', exact: true }).click();
await page.getByText(/Saved · revision/).waitFor();
const after = (await api('/api/workflows/' + graph.id)).nodes[0].position;
assert.notDeepEqual(after, before);
checks.push('canvas dragging persists coordinates');
await page
  .locator('.svelte-flow__edge-interaction')
  .first()
  .click({ force: true });
await page.keyboard.press('Delete');
assert.equal(await page.locator('.svelte-flow__edge').count(), 3);
const source = await page
    .locator('[data-id="scene"] [data-handleid="text"]')
    .boundingBox(),
  target = await page
    .locator('[data-id="combine"] [data-handleid="scene"]')
    .boundingBox();
await page.mouse.move(
  source.x + source.width / 2,
  source.y + source.height / 2
);
await page.mouse.down();
await page.mouse.move(
  target.x + target.width / 2,
  target.y + target.height / 2,
  { steps: 12 }
);
await page.mouse.up();
assert.equal(await page.locator('.svelte-flow__edge').count(), 4);
checks.push('disconnect and reconnect typed handles');
await page.locator('[data-id="scene"] h3').click();
await page.locator('summary').click();
await page.getByLabel('Group name').fill('Reusable scene');
await page.getByRole('button', { name: 'Group selected nodes' }).click();
await page.getByRole('button', { name: 'Insert Reusable scene' }).click();
assert.equal(await page.locator('.svelte-flow__node').count(), 6);
checks.push('capture and insert reusable group with fresh ID');
const downloadEvent = page.waitForEvent('download');
await page.getByRole('button', { name: 'Export ↗' }).click();
const download = await downloadEvent;
await download.saveAs('evidence/browser-export.json');
const exported = JSON.parse(
  readFileSync('evidence/browser-export.json', 'utf8')
);
assert.equal(exported.nodes.length, 6);
assert.equal(exported.groups.length, 1);
await page
  .locator('.import input')
  .setInputFiles('evidence/browser-export.json');
await page.getByText('Imported · save to persist').waitFor();
assert.equal(await page.locator('.svelte-flow__node').count(), 6);
checks.push('workflow JSON download and reimport');
await browser.close();
assert.deepEqual(errors, []);
const form = new FormData();
form.set(
  'file',
  new Blob([readFileSync('evidence/editor.png')], { type: 'image/png' }),
  'editor.png'
);
const uploaded = await fetch(origin + '/api/assets', {
  method: 'POST',
  body: form,
  headers: { Origin: origin }
});
assert.equal(uploaded.status, 200);
const asset = await uploaded.json();
assert.equal(
  (await fetch(origin + asset.uri)).headers.get('content-type'),
  'image/png'
);
const local = {
  schemaVersion: 1,
  id: 'local-preview-test',
  name: 'Local asset preview test',
  revision: 0,
  groups: [],
  nodes: [
    {
      id: 'file',
      kind: 'asset',
      version: 1,
      label: 'Actual local screenshot',
      position: { x: 0, y: 0 },
      config: asset
    },
    {
      id: 'preview',
      kind: 'preview',
      version: 1,
      label: 'Preview',
      position: { x: 300, y: 0 },
      config: {}
    }
  ],
  edges: [
    {
      id: 'preview',
      source: 'file',
      sourceHandle: 'asset',
      target: 'preview',
      targetHandle: 'asset'
    }
  ]
};
const localRun = await api('/api/run', local);
assert.equal(localRun.states.preview.status, 'completed');
assert.equal(localRun.states.preview.outputs.asset.uri, asset.uri);
checks.push(
  'actual local upload, byte serving, deterministic Preview completion'
);
const invalid = {
  ...graph,
  nodes: graph.nodes.map((n) =>
    n.kind === 'weave' ? { ...n, config: { modelId: '', params: {} } } : n
  )
};
const failure = await api('/api/run', invalid);
assert.equal(failure.states.model.status, 'failed');
assert.equal(failure.states.preview.status, 'blocked');
checks.push('unconfigured generation fails visibly without model call');
const pending = (await api('/api/requests')).find(
  (r) => r.workflowId === 'agent-proof' && r.status === 'pending'
);
const rejected = await fetch(origin + '/api/requests/' + pending.id, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    status: 'completed',
    actualModelId: pending.model.modelId,
    predictionId: 'validation-only-never-submitted',
    assets: []
  })
});
assert.equal(rejected.status, 400);
checks.push(
  'completed provider result without actual assets rejected; no result inserted'
);
writeFileSync(
  'evidence/interaction-proof.json',
  JSON.stringify(
    {
      verifiedAt: new Date().toISOString(),
      checks,
      pageErrors: errors,
      creditsSpent: 0,
      externalResultsSubmitted: 0
    },
    null,
    2
  )
);
console.log('Interaction/API proof PASS:', checks.join('; '));
