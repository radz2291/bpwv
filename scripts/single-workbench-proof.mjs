/** Focused product smoke. Writes only to a new isolated scratch store. */
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';

const output = resolve('evidence/u1/single-workbench-2026-10-25');
const root = resolve(`data/single-workbench-smoke/${Date.now()}`);
mkdirSync(root, { recursive: true });
mkdirSync(output, { recursive: true });
const origin = 'http://127.0.0.1:5178';
const env = {
  ...process.env,
  CREATIVE_FLOW_DATA_DIR: root,
  CREATIVE_FLOW_APP_URL: origin,
  CREATIVE_FLOW_ALLOW_LOCAL_EXECUTION: '1',
  HOST: '127.0.0.1',
  PORT: '5178',
  ORIGIN: origin
};
const checks = [],
  errors = [];
let app, browser, transport;
let log = '';
async function api(path, body) {
  const r = await fetch(
    origin + path,
    body === undefined
      ? {}
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }
  );
  const d = await r.json();
  assert.ok(r.ok, JSON.stringify(d));
  return d;
}
async function start() {
  app = spawn(process.execPath, ['scripts/start-local.mjs'], {
    windowsHide: true,
    env,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  app.stdout.on('data', (d) => (log += d));
  app.stderr.on('data', (d) => (log += d));
  for (let i = 0; i < 100; i++) {
    assert.equal(app.exitCode, null, log);
    try {
      if ((await fetch(origin)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw Error(log);
}
async function stop() {
  if (app && app.exitCode === null) {
    const p = app;
    await new Promise((r) => {
      p.once('exit', r);
      p.kill();
    });
  }
  app = null;
}
try {
  try {
    await fetch(origin, { signal: AbortSignal.timeout(500) });
    throw Error('Refusing occupied scratch port');
  } catch (e) {
    if (e.message.includes('occupied')) throw e;
  }
  await start();
  transport = new StdioClientTransport({
    command: process.execPath,
    args: [resolve('scripts/mcp-launch.mjs'), '--write'],
    env,
    stderr: 'pipe'
  });
  const client = new Client({ name: 'single-workbench-smoke', version: '1' });
  await client.connect(transport);
  async function tool(name, args = {}) {
    const r = await client.callTool({ name, arguments: args });
    assert.ok(!r.isError, JSON.stringify(r));
    return r.structuredContent;
  }
  const listed = await client.listTools();
  assert.equal(listed.tools.length, 22);
  const made = await tool('create_workflow', {
    name: 'MCP default universal proof'
  });
  assert.equal(made.workflow.schemaVersion, 2);
  // Reuse the exact already verified G8 document contracts, never replay its run.
  const g8 = await (
    await fetch(
      'http://127.0.0.1:5173/api/workflows/8d7c98f7-438a-4282-b74a-52d28fd62b1c'
    )
  ).json();
  const graph = { ...made.workflow, nodes: g8.nodes, edges: g8.edges };
  const saved = await tool('save_workflow', {
    workflow: graph,
    expectedRevision: graph.revision
  });
  const { run } = await tool('execute_universal', {
    workflowId: graph.id,
    expectedRevision: saved.workflow.revision,
    idempotencyKey: 'single-workbench-local-proof'
  });
  assert.equal(run.status, 'completed');
  checks.push(
    '22 MCP tools; create_workflow defaults to schema 2; saved local four-primitive execution succeeds'
  );
  const inspectorConfig = resolve(root, 'inspector.json');
  writeFileSync(
    inspectorConfig,
    JSON.stringify({
      mcpServers: {
        proof: {
          command: process.execPath,
          args: [resolve('scripts/mcp-launch.mjs'), '--write'],
          env: {
            CREATIVE_FLOW_DATA_DIR: root,
            CREATIVE_FLOW_APP_URL: origin,
            CREATIVE_FLOW_ALLOW_LOCAL_EXECUTION: '1'
          }
        }
      }
    })
  );
  const inspector = await promisify(execFile)(
    process.execPath,
    [
      resolve(
        'node_modules/@modelcontextprotocol/inspector/clients/launcher/build/index.js'
      ),
      '--cli',
      '--config',
      inspectorConfig,
      '--server',
      'proof',
      '--method',
      'tools/list',
      '--format',
      'json'
    ],
    { windowsHide: true, maxBuffer: 2e6 }
  );
  const official = JSON.parse(inspector.stdout);
  const tools = (official.result ?? official).tools;
  assert.equal(tools.length, 22);
  assert.equal(
    tools.find((t) => t.name === 'create_workflow').inputSchema.properties
      .schemaVersion.default,
    2
  );
  writeFileSync(resolve(output, 'inspector-discovery.json'), inspector.stdout);
  checks.push(
    'Official MCP Inspector discovers universal tools and schema-2 creation default'
  );
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({
    viewport: { width: 1800, height: 1100 }
  });
  page.on('pageerror', (e) => errors.push(e.message));
  page.setDefaultTimeout(15000);
  async function shell() {
    await page
      .getByRole('heading', { name: 'Operation inspector', exact: true })
      .waitFor();
    assert.equal(
      await page.locator('header strong').innerText(),
      'Universal workbench'
    );
    assert.equal(await page.getByRole('link', { name: /legacy/i }).count(), 0);
  }
  await page.goto(origin);
  await shell();
  await page
    .getByText('Ready · create or select a workflow', { exact: false })
    .waitFor();
  await page.getByRole('button', { name: 'New workflow', exact: true }).click();
  await page.waitForURL(/workflow=/);
  const freshId = new URL(page.url()).searchParams.get('workflow');
  assert.equal((await api('/api/workflows/' + freshId)).schemaVersion, 2);
  await shell();
  await page.getByRole('button', { name: 'Text recipe', exact: true }).click();
  await page
    .getByText('Recipe saved · run when local execution is granted', {
      exact: false
    })
    .waitFor();
  await page
    .getByRole('button', { name: 'Run local workflow', exact: true })
    .click();
  await page.locator('.status').filter({ hasText: 'Run completed' }).waitFor();
  assert.match(await page.locator('.canvas').innerText(), /"words": 3/);
  checks.push(
    'Normal entry, new universal workflow, text recipe and actual deterministic result use one shell'
  );
  await page
    .locator('.library button')
    .filter({ hasText: 'MCP default universal proof' })
    .click();
  await shell();
  await page.waitForFunction(
    () =>
      document.querySelectorAll('.canvas article footer').length === 4 &&
      [...document.querySelectorAll('.canvas article footer')].every(
        (e) => e.textContent.trim() === 'completed'
      )
  );
  assert.match(await page.locator('.canvas').innerText(), /"characters": 28/);
  await page.screenshot({
    path: resolve(output, 'mcp-same-editor.png'),
    fullPage: true
  });
  checks.push(
    'Saved selection and MCP-authored workflow show four completed cards and verified record preview in the same editor'
  );
  await page.getByRole('button', { name: 'Image recipe', exact: true }).click();
  await page
    .getByText(
      'Image recipe prepared · import a local PNG into Input, then save',
      { exact: false }
    )
    .waitFor();
  const blobs = resolve('data/u1/proof/1792855102726/workbench/blobs');
  const png = readdirSync(blobs)
    .map((n) => readFileSync(resolve(blobs, n)))
    .find((b) =>
      b.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))
    );
  assert.ok(png, 'Existing local fixture PNG required');
  await page
    .getByLabel('Import local PNG')
    .setInputFiles({
      name: 'local-fixture.png',
      mimeType: 'image/png',
      buffer: png
    });
  await page
    .getByText('Local PNG imported · save workflow to bind artifact', {
      exact: false
    })
    .waitFor();
  await page
    .getByRole('button', { name: 'Run local workflow', exact: true })
    .click();
  await page.waitForFunction(
    () =>
      document.querySelectorAll('.canvas img').length === 3 &&
      [...document.querySelectorAll('.canvas img')].every(
        (i) => i.complete && i.naturalWidth === 2
      )
  );
  await page.screenshot({
    path: resolve(output, 'local-image-preview.png'),
    fullPage: true
  });
  const imageUrl = page.url();
  await stop();
  await start();
  await page.goto(imageUrl);
  await shell();
  await page.waitForFunction(
    () =>
      document.querySelectorAll('.canvas img').length === 3 &&
      [...document.querySelectorAll('.canvas img')].every(
        (i) => i.complete && i.naturalWidth === 2
      )
  );
  checks.push(
    'Actual PNG previews decode in all three cards and survive application restart'
  );
  await tool('create_workflow', {
    id: 'retired-legacy',
    name: 'Legacy compatibility',
    schemaVersion: 1
  });
  await page.goto(origin + '/?workflow=retired-legacy');
  await shell();
  await page
    .getByText(
      'This legacy workflow is retired. Create or select a universal workflow.',
      { exact: false }
    )
    .waitFor();
  assert.equal(
    await page
      .locator('.library button')
      .filter({ hasText: 'Legacy compatibility' })
      .count(),
    0
  );
  await page.goto(origin + '/?workflow=missing-demo');
  await shell();
  await page
    .getByText(
      'Workflow unavailable or archived. Create or select a universal workflow.',
      { exact: false }
    )
    .waitFor();
  checks.push(
    'Legacy and missing deep links remain in the universal shell; legacy drafts are absent from its list'
  );
  await page.goto(
    'http://127.0.0.1:5173/?workflow=8d7c98f7-438a-4282-b74a-52d28fd62b1c'
  );
  await shell();
  await page.waitForFunction(
    () =>
      document.querySelectorAll('.canvas article footer').length === 4 &&
      [...document.querySelectorAll('.canvas article footer')].every(
        (e) => e.textContent.trim() === 'completed'
      )
  );
  assert.match(await page.locator('.canvas').innerText(), /"words": 4/);
  await page.screenshot({
    path: resolve(output, 'chatgpt-workflow-normal-entry.png'),
    fullPage: true
  });
  checks.push(
    'Original real ChatGPT G8 workflow reopens read-only on normal port 5173 with completed artifacts; no replay'
  );
  assert.deepEqual(errors, []);
  writeFileSync(
    resolve(output, 'smoke.json'),
    JSON.stringify(
      {
        status: 'PASS',
        root,
        checks,
        errors,
        scratchWorkflow: graph.id,
        scratchRun: run.id,
        paidCalls: 0
      },
      null,
      2
    )
  );
  console.log(JSON.stringify({ status: 'PASS', checks }, null, 2));
} catch (error) {
  if (browser) {
    const page = browser.contexts()[0]?.pages()[0];
    if (page) {
      await page.screenshot({
        path: resolve(root, 'failure.png'),
        fullPage: true
      });
      writeFileSync(
        resolve(root, 'failure.txt'),
        await page.locator('body').innerText()
      );
    }
  }
  writeFileSync(resolve(root, 'failure-errors.json'), JSON.stringify(errors));
  console.error('Failed scratch evidence:', root);
  throw error;
} finally {
  await browser?.close();
  await transport?.close();
  await stop();
  writeFileSync(resolve(root, 'app.log'), log);
}
