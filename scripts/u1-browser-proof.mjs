/** Actual browser/restart proof. Writes only the explicitly isolated Inspector fixture root. */
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { resolve, relative, isAbsolute } from 'node:path';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import assert from 'node:assert/strict';

const proof = JSON.parse(
  readFileSync('evidence/u1/inspector-summary.json', 'utf8')
);
const root = resolve(proof.dataRoot),
  expected = resolve('data/u1/proof');
const inside = relative(expected, root);
assert.ok(
  inside && !inside.startsWith('..') && !isAbsolute(inside),
  'Explicit isolated Inspector root required'
);
const origin = 'http://127.0.0.1:5175';
const output = resolve(`evidence/u1/browser/${Date.now()}`);
mkdirSync(output, { recursive: true });
let app,
  appLog = '',
  browser;
async function api(path, body) {
  const response = await fetch(
    origin + path,
    body === undefined
      ? {}
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }
  );
  const data = await response.json();
  assert.ok(response.ok, JSON.stringify(data));
  return data;
}
async function start() {
  try {
    await fetch(origin, { signal: AbortSignal.timeout(500) });
    throw Error(
      'Port5175 already occupied; refusing to stop an unowned process'
    );
  } catch (error) {
    if (error.message.includes('already occupied')) throw error;
  }
  app = spawn(process.execPath, ['scripts/start-local.mjs'], {
    cwd: process.cwd(),
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      HOST: '127.0.0.1',
      PORT: '5175',
      ORIGIN: origin,
      CREATIVE_FLOW_DATA_DIR: root,
      CREATIVE_FLOW_APP_URL: origin,
      CREATIVE_FLOW_ALLOW_LOCAL_EXECUTION: '1'
    }
  });
  app.stdout.on('data', (chunk) => (appLog += chunk));
  app.stderr.on('data', (chunk) => (appLog += chunk));
  for (let n = 0; n < 120; n++) {
    if (app.exitCode !== null) throw Error(appLog);
    try {
      const r = await fetch(origin + '/api/workbench?action=permissions');
      if (r.ok) {
        assert.equal((await r.json()).allowLocalExecution, true);
        return;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw Error('Owned test application failed to start: ' + appLog);
}
async function stop() {
  if (!app || app.exitCode !== null) return;
  const child = app;
  await new Promise((done) => {
    child.once('exit', done);
    child.kill();
  });
  app = null;
}
function counts() {
  const db = new DatabaseSync(resolve(root, 'creative-flow.sqlite'), {
    readOnly: true
  });
  try {
    return {
      runs: db.prepare('SELECT count(*) n FROM wb_runs').get().n,
      attempts: db.prepare('SELECT count(*) n FROM wb_attempts').get().n,
      artifacts: db.prepare('SELECT count(*) n FROM wb_artifacts').get().n
    };
  } finally {
    db.close();
  }
}
const checks = [],
  errors = [];
try {
  await start();
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1800, height: 1100 }
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  page.on('pageerror', (error) => errors.push(error.message));
  const canvas = page.locator('.canvas');
  const footer = page.locator('.workbench > footer');
  async function framed() {
    await page.waitForFunction(() => {
      const canvas = document.querySelector('.canvas')?.getBoundingClientRect();
      return (
        canvas &&
        [...document.querySelectorAll('.svelte-flow__node')].every((node) => {
          const r = node.getBoundingClientRect();
          return (
            r.left >= canvas.left - 2 &&
            r.right <= canvas.right + 2 &&
            r.top >= canvas.top - 2 &&
            r.bottom <= canvas.bottom + 2
          );
        })
      );
    });
  }
  async function open(id) {
    await page.goto(`${origin}/?workflow=${id}`);
    await page.getByRole('heading', { name: 'Operation inspector' }).waitFor();
    await page.locator('.svelte-flow__node').first().waitFor();
    await page.waitForFunction(
      () =>
        document
          .querySelector('.canvas article footer')
          ?.textContent?.trim() === 'completed'
    );
  }
  await open(proof.workflowA);
  const originalA = await api('/api/workflows/' + proof.workflowA);
  const runA = (
    await api('/api/workbench?action=runs&workflowId=' + proof.workflowA)
  ).find((r) => r.id === proof.runA);
  assert.equal(await page.locator('.svelte-flow__node').count(), 4);
  assert.match(await canvas.innerText(), /"words": 3/);
  await framed();
  await page.screenshot({
    path: resolve(output, 'mcp-text.png'),
    fullPage: true
  });
  await page
    .getByLabel('Universal workflow name')
    .fill(originalA.name + ' · cosmetic browser edit');
  await page
    .getByRole('button', { name: 'Save workflow', exact: true })
    .click();
  await footer.getByText(/Saved · revision/).waitFor();
  assert.equal(
    await page
      .locator('.canvas article footer')
      .filter({ hasText: 'completed' })
      .count(),
    4
  );
  assert.equal(await page.locator('.status').textContent(), 'Run completed');
  assert.deepEqual(
    (
      await api('/api/workbench?action=runs&workflowId=' + proof.workflowA)
    ).find((r) => r.id === proof.runA),
    runA
  );
  checks.push(
    'MCP-authored A exact local statistics visible; cosmetic UI save retains compatible results and immutable run'
  );
  await open(proof.workflowB);
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('.canvas img')].length === 3 &&
      [...document.querySelectorAll('.canvas img')].every(
        (image) =>
          image.complete &&
          image.naturalWidth === 2 &&
          image.naturalHeight === 2
      )
  );
  await framed();
  await page.screenshot({
    path: resolve(output, 'mcp-image.png'),
    fullPage: true
  });
  checks.push('MCP-authored B three actual managed PNG previews decoded');
  const imageRunForNegative = (
    await api('/api/workbench?action=runs&workflowId=' + proof.workflowB)
  )[0];
  const missingArtifact = imageRunForNegative.states.n1.outputs.value.id;
  const metadataRoute = (url) =>
    url.pathname === '/api/workbench' &&
    url.searchParams.get('action') === 'artifact' &&
    url.searchParams.get('id') === missingArtifact;
  await page.route(metadataRoute, (route) =>
    route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'Isolated browser fixture: unavailable artifact'
      })
    })
  );
  await open(proof.workflowB);
  await page
    .locator('.canvas .unavailable')
    .filter({ hasText: 'Artifact unavailable' })
    .first()
    .waitFor();
  assert.equal(
    await page
      .locator('.canvas article footer')
      .filter({ hasText: 'unavailable' })
      .count(),
    2
  );
  await page.unroute(metadataRoute);
  const contentRoute =
    origin + '/api/workbench/artifacts/' + missingArtifact + '/content';
  await page.route(contentRoute, (route) =>
    route.fulfill({
      status: 404,
      body: 'Isolated browser fixture: missing bytes'
    })
  );
  await open(proof.workflowB);
  await page
    .locator('.canvas .unavailable')
    .filter({ hasText: 'Image bytes unavailable' })
    .first()
    .waitFor();
  assert.equal(
    await page
      .locator('.canvas article footer')
      .filter({ hasText: 'unavailable' })
      .count(),
    2
  );
  await framed();
  await page.screenshot({
    path: resolve(output, 'unavailable-negative.png'),
    fullPage: true
  });
  await page.unroute(contentRoute);
  await open(proof.workflowB);
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('.canvas img')].length === 3 &&
      [...document.querySelectorAll('.canvas img')].every(
        (image) => image.complete && image.naturalWidth === 2
      )
  );
  checks.push(
    'Isolated browser response faults: missing artifact metadata and missing image bytes show persistent unavailable card badges; restored route plus reload recovers actual previews without execution'
  );

  await page.getByRole('button', { name: 'Text recipe', exact: true }).click();
  await footer.getByText(/Recipe saved/).waitFor();
  const uiId = new URL(page.url()).searchParams.get('workflow');
  assert.ok(uiId);
  await page.getByLabel('Operation configuration').fill(
    JSON.stringify({
      type: 'text',
      value: '  Browser authored   reusable document.  '
    })
  );
  await page
    .getByRole('button', { name: 'Apply configuration', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Run local workflow', exact: true })
    .click();
  await footer.getByText(/Local execution completed/).waitFor();
  assert.match(await canvas.innerText(), /"words": 4/);
  const firstUiRun = (
    await api('/api/workbench?action=runs&workflowId=' + uiId)
  )[0];
  await framed();
  await page.screenshot({
    path: resolve(output, 'ui-authored.png'),
    fullPage: true
  });
  const uiGraph = await api('/api/workflows/' + uiId);
  const inputId = uiGraph.nodes.find((n) => n.kind === 'u.input').id;
  await page.locator(`.svelte-flow__node[data-id="${inputId}"]`).click();
  await page
    .getByLabel('Operation configuration')
    .fill(
      JSON.stringify({ type: 'text', value: 'Semantic update has five words.' })
    );
  await page
    .getByRole('button', { name: 'Apply configuration', exact: true })
    .click();
  await page
    .getByText('Historical results · semantic graph differs', { exact: true })
    .waitFor();
  assert.equal(
    await page
      .locator('.canvas article footer')
      .filter({ hasText: 'completed' })
      .count(),
    0
  );
  await page
    .getByRole('button', { name: 'Run local workflow', exact: true })
    .click();
  await footer.getByText(/Local execution completed/).waitFor();
  const uiRuns = await api('/api/workbench?action=runs&workflowId=' + uiId);
  assert.equal(uiRuns.length, 2);
  assert.deepEqual(
    uiRuns.find((r) => r.id === firstUiRun.id),
    firstUiRun
  );
  assert.notEqual(
    uiRuns[0].states[inputId].outputs.value.id,
    firstUiRun.states[inputId].outputs.value.id
  );
  assert.equal(uiRuns[0].states[inputId].outputs.value.version, 2);
  checks.push(
    'UI-authored recipe config/save/execute produces actual local statistics; semantic edit marks historical; second execution preserves prior run and creates version2'
  );

  const fresh = await api('/api/workflows/' + uiId);
  await api('/api/workbench', {
    action: 'save',
    workflow: { ...fresh, name: fresh.name + ' · concurrent writer' }
  });
  await page
    .getByLabel('Universal workflow name')
    .fill('stale browser revision');
  await page
    .getByRole('button', { name: 'Save workflow', exact: true })
    .click();
  await footer.getByText(/conflict/i).waitFor();
  assert.notEqual(
    (await api('/api/workflows/' + uiId)).name,
    'stale browser revision'
  );
  await page.reload();
  await page.getByRole('heading', { name: 'Operation inspector' }).waitFor();
  await page.waitForFunction(
    () =>
      document.querySelector('.canvas article footer')?.textContent?.trim() ===
      'completed'
  );
  checks.push(
    'Competing browser stale save rejected without overwriting concurrent revision; reload restores authoritative graph and compatible results'
  );
  const imageFixture = (
    await api('/api/workbench?action=runs&workflowId=' + proof.workflowB)
  )[0].states.n0.outputs.value;
  const png = Buffer.from(
    await (
      await fetch(
        origin + '/api/workbench/artifacts/' + imageFixture.id + '/content'
      )
    ).arrayBuffer()
  );
  await page.getByRole('button', { name: 'Image recipe', exact: true }).click();
  await footer.getByText(/Image recipe prepared/).waitFor();
  const uiImageId = new URL(page.url()).searchParams.get('workflow');
  await page.getByLabel('Import local PNG').setInputFiles({
    name: 'browser-local.png',
    mimeType: 'image/png',
    buffer: png
  });
  await footer.getByText(/Local PNG imported/).waitFor();
  await page
    .getByRole('button', { name: 'Run local workflow', exact: true })
    .click();
  await footer.getByText(/Local execution completed/).waitFor();
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('.canvas img')].length === 3 &&
      [...document.querySelectorAll('.canvas img')].every(
        (image) => image.complete && image.naturalWidth === 2
      )
  );
  await framed();
  await page.screenshot({
    path: resolve(output, 'ui-image.png'),
    fullPage: true
  });
  checks.push(
    'UI-authored image recipe imports actual local PNG bytes, saves and executes three-operation managed image workflow'
  );
  const beforeRestart = counts();
  await stop();
  await start();
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    return ['http:', 'https:'].includes(url.protocol) &&
      url.hostname !== '127.0.0.1' &&
      url.hostname !== 'localhost'
      ? route.abort()
      : route.continue();
  });
  await open(proof.workflowB);
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('.canvas img')].length === 3 &&
      [...document.querySelectorAll('.canvas img')].every(
        (image) => image.complete && image.naturalWidth === 2
      )
  );
  await framed();
  await page.screenshot({
    path: resolve(output, 'offline-restart-image.png'),
    fullPage: true
  });
  await open(proof.workflowA);
  assert.match(await canvas.innerText(), /"words": 3/);
  await open(uiId);
  assert.match(await canvas.innerText(), /"words": 5/);
  const afterRestart = counts();
  assert.deepEqual(afterRestart, beforeRestart);
  assert.deepEqual(errors, []);
  checks.push(
    'Full owned app stop/start with same root, browser external requests blocked: managed images/text remain visible; run/attempt/artifact counters unchanged; no replay'
  );
  if (process.argv.includes('--legacy')) {
    await new Promise((done, fail) => {
      const child = spawn(process.execPath, ['scripts/u1-legacy-proof.mjs'], {
        cwd: process.cwd(),
        windowsHide: true,
        stdio: 'inherit',
        env: {
          ...process.env,
          CREATIVE_FLOW_DATA_DIR: root,
          CREATIVE_FLOW_URL: origin,
          CREATIVE_FLOW_APP_URL: origin
        }
      });
      child.once('error', fail);
      child.once('exit', (code) =>
        code === 0 ? done() : fail(Error('Legacy proof failed: ' + code))
      );
    });
    checks.push(
      'Existing legacy regression wrapper passed against the owned isolated server'
    );
  }
  const summary = {
    status: 'PASS',
    verifiedAt: new Date().toISOString(),
    dataRoot: root,
    workflowA: proof.workflowA,
    workflowB: proof.workflowB,
    uiWorkflow: uiId,
    uiImageWorkflow: uiImageId,
    uiRunIds: uiRuns.map((r) => r.id),
    checks,
    beforeRestart,
    afterRestart,
    pageErrors: errors,
    externalNetworkBlocked: true,
    paidCalls: 0,
    actualChatGPTSide: false,
    evidenceDirectory: output
  };
  writeFileSync(
    resolve(output, 'summary.json'),
    JSON.stringify(summary, null, 2)
  );
  writeFileSync(
    'evidence/u1/browser-summary.json',
    JSON.stringify(summary, null, 2)
  );
  console.log('U1 browser/restart proof PASS: ' + uiId);
} catch (error) {
  const failedPage = browser?.contexts()[0]?.pages()[0];
  if (failedPage) {
    await failedPage.screenshot({
      path: resolve(output, 'failure.png'),
      fullPage: true
    });
    writeFileSync(
      resolve(output, 'failure-page.txt'),
      await failedPage.locator('body').innerText()
    );
  }
  writeFileSync(
    resolve(output, 'failure.json'),
    JSON.stringify(
      {
        error: String(error),
        stack: error.stack,
        checks,
        pageErrors: errors,
        appLog
      },
      null,
      2
    )
  );
  throw error;
} finally {
  await browser?.close();
  await stop();
}
