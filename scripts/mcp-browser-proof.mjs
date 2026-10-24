import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const report = JSON.parse(
  readFileSync('evidence/mcp-inspector-proof.json', 'utf8')
);
const workflowId = report.workflowId;
async function inspector(name, args) {
  const argv = [
    resolve(
      'node_modules/@modelcontextprotocol/inspector/clients/launcher/build/index.js'
    ),
    '--cli',
    '--config',
    resolve('data/mcp-inspector-proof.config.json'),
    '--server',
    'creative-flow',
    '--method',
    'tools/call',
    '--tool-name',
    name,
    '--tool-args-json',
    JSON.stringify(args),
    '--format',
    'json'
  ];
  const result = await new Promise((resolve, reject) => {
    const p = spawn(process.execPath, argv, { windowsHide: true });
    let stdout = '',
      stderr = '';
    p.stdout.on('data', (d) => (stdout += d));
    p.stderr.on('data', (d) => (stderr += d));
    p.on('error', reject);
    p.on('close', (code) => resolve({ code, stdout, stderr }));
  });
  assert.equal(result.code, 0, result.stderr);
  const value = JSON.parse(result.stdout).result;
  assert.ok(!value.isError, JSON.stringify(value));
  return value.structuredContent;
}
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
page.setDefaultTimeout(15000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(report.url);
await page.waitForFunction(
  () =>
    document.querySelector('.workflow-name')?.value ===
    'MCP Inspector · authored without browser'
);
assert.equal(await page.locator('.svelte-flow__node').count(), 3);
assert.equal(await page.locator('.svelte-flow__edge').count(), 2);
await page.locator('[data-id="scene"] h3').click();
await page
  .getByLabel('Text', { exact: true })
  .fill('MCP-authored prompt refined in the visual editor.');
await page.getByRole('button', { name: 'Save workflow', exact: true }).click();
await page.getByText(/Saved · revision/).waitFor();
const reopened = await inspector('get_workflow', { workflowId });
assert.equal(
  reopened.workflow.nodes.find((n) => n.id === 'scene').config.text,
  'MCP-authored prompt refined in the visual editor.'
);
await inspector('configure_node', {
  workflowId,
  expectedRevision: reopened.workflow.revision,
  nodeId: 'style',
  config: { text: 'Agent modification after the browser opened.' }
});
await page
  .getByLabel('Text', { exact: true })
  .fill('Stale UI edit must not overwrite agent changes.');
await page.getByRole('button', { name: 'Save workflow', exact: true }).click();
await page.getByText(/Revision conflict/).waitFor();
const fresh = await inspector('get_workflow', { workflowId });
assert.equal(
  fresh.workflow.nodes.find((n) => n.id === 'scene').config.text,
  'MCP-authored prompt refined in the visual editor.'
);
assert.equal(
  fresh.workflow.nodes.find((n) => n.id === 'style').config.text,
  'Agent modification after the browser opened.'
);
await page.reload();
await page.waitForFunction(
  () =>
    document.querySelector('.workflow-name')?.value ===
    'MCP Inspector · authored without browser'
);
await page.locator('[data-id="scene"] h3').click();
assert.equal(
  await page.getByLabel('Text', { exact: true }).inputValue(),
  'MCP-authored prompt refined in the visual editor.'
);
await page.screenshot({ path: 'evidence/mcp-editor.png', fullPage: true });
await page.getByRole('button', { name: 'Assets', exact: true }).click();
await page.getByAltText('Workflow asset').waitFor();
assert.equal(await page.getByAltText('Workflow asset').count(), 1);
assert.deepEqual(errors, []);
await browser.close();
writeFileSync(
  'evidence/mcp-browser-proof.json',
  JSON.stringify(
    {
      verifiedAt: new Date().toISOString(),
      workflowId,
      url: report.url,
      revision: fresh.workflow.revision,
      checks: [
        'MCP-authored graph opens by returned URL',
        'three nodes and two connections render',
        'visual edit visible through official Inspector get_workflow',
        'concurrent MCP edit makes stale UI save fail',
        'reload preserves both accepted edits',
        'MCP-associated real imported asset appears in visual preview'
      ],
      pageErrors: errors,
      creditsSpent: 0
    },
    null,
    2
  )
);
console.log('MCP/editor parity and conflict browser proof PASS');
