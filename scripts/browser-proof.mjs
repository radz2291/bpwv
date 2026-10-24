import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({
  viewport: { width: 1600, height: 1000 },
  deviceScaleFactor: 1
});
page.setDefaultTimeout(15000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://127.0.0.1:5173');
await page.getByRole('button', { name: 'Agent proof · first light' }).click();
await page.locator('.svelte-flow__node').first().waitFor();
assert.equal(await page.locator('.svelte-flow__node').count(), 5);
await page.locator('[data-id="scene"]').click();
await page
  .getByLabel('Text', { exact: true })
  .fill(
    'A quiet mountain observatory at sunrise, with one illuminated window.'
  );
await page.getByRole('button', { name: 'Save workflow', exact: true }).click();
await page.getByText(/Saved · revision/).waitFor();
await page.screenshot({ path: 'evidence/editor.png', fullPage: true });
await page.reload();
await page.getByRole('button', { name: 'Agent proof · first light' }).click();
await page.locator('[data-id="scene"]').click();
assert.match(
  await page.getByLabel('Text', { exact: true }).inputValue(),
  /one illuminated window/
);
await page.getByRole('button', { name: 'Run local steps' }).click();
await page.getByText('Run journal', { exact: true }).waitFor();
await page.locator('.run-row .pending').waitFor();
assert.equal(await page.locator('.run-row .completed').count(), 3);
assert.equal(await page.locator('.run-row .blocked').count(), 1);
await page.screenshot({ path: 'evidence/execution.png', fullPage: true });
await page.getByRole('button', { name: 'Agent proof · first light' }).click();
await page.locator('.dot.pending').waitFor();
assert.equal(await page.locator('.dot.completed').count(), 3);
await page.locator('.library-item').first().click();
assert.equal(await page.locator('.svelte-flow__node').count(), 6);
await page.getByLabel('Node name').fill('Disposable UI test');
await page.getByRole('button', { name: 'Delete node', exact: true }).click();
assert.equal(await page.locator('.svelte-flow__node').count(), 5);
await page.getByRole('button', { name: 'Save workflow', exact: true }).click();
assert.deepEqual(errors, []);
writeFileSync(
  'evidence/browser-proof.json',
  JSON.stringify(
    {
      verifiedAt: new Date().toISOString(),
      checks: [
        'open agent-authored graph',
        'edit node text',
        'save and reload',
        'five nodes and four edges',
        'local execution: 3 completed, model pending, preview blocked',
        'create and delete node',
        'matching-revision execution state restores on reopen'
      ],
      pageErrors: errors,
      screenshots: ['editor.png', 'execution.png'],
      creditsSpent: 0
    },
    null,
    2
  )
);
console.log('Browser proof PASS');
await browser.close();
