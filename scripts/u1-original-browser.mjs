import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1000 }
  });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(
    'http://127.0.0.1:5173/?workflow=borderpoint-image-first-chatgpt'
  );
  await page.locator('.svelte-flow__node').first().waitFor();
  await page.waitForFunction(
    () => document.querySelectorAll('.svelte-flow__node').length === 11
  );
  assert.equal(await page.locator('.svelte-flow__node').count(), 11);
  await page.waitForFunction(() =>
    [...document.images].some(
      (img) => img.naturalWidth === 768 && img.naturalHeight === 1376
    )
  );
  const images = await page
    .locator('img')
    .evaluateAll((imgs) =>
      imgs
        .filter((i) => i.naturalWidth)
        .map((i) => ({
          src: i.getAttribute('src'),
          width: i.naturalWidth,
          height: i.naturalHeight
        }))
    );
  assert.ok(images.some((i) => i.width === 941 && i.height === 1672));
  assert.ok(images.some((i) => i.width === 768 && i.height === 1376));
  assert.deepEqual(errors, []);
  await page.screenshot({
    path: 'evidence/u1/legacy-workbench.png',
    fullPage: true
  });
  writeFileSync(
    'evidence/u1/live-browser.json',
    JSON.stringify(
      {
        verifiedAt: new Date().toISOString(),
        readOnly: true,
        workflowId: 'borderpoint-image-first-chatgpt',
        nodeCount: 11,
        images,
        pageErrors: errors,
        modelCalls: 0
      },
      null,
      2
    )
  );
  console.log(
    'Live preserved editor, actual reference and completed output PASS (read-only)'
  );
} finally {
  await browser.close();
}
