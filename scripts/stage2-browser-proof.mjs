import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
const url = 'http://127.0.0.1:5173/?workflow=borderpoint-image-first-chatgpt';
const generated = process.argv.includes('--generated');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(url);
await page.locator('[data-id="approved_b_asset"] img').waitFor();
await page.getByRole('button', { name: 'Image path', exact: true }).click();
await page.waitForTimeout(350);
await page.locator('[data-id="image_initial"] h3').click();
if (generated) {
  await page.locator('[data-id="preview_initial"] img').waitFor();
  await page
    .locator('[data-id="preview_initial"] img')
    .evaluate((i) => i.decode());
}
await page.screenshot({ path: 'evidence/stage2-1440.png' });
for (const id of [
  'approved_b_asset',
  'approved_b_references',
  'preview_approved_reference'
]) {
  const image = page.locator(`[data-id="${id}"] img`).first();
  assert.equal(
    await image.evaluate(
      (i) => i.complete && i.naturalWidth === 941 && i.naturalHeight === 1672
    ),
    true
  );
}
assert.match(
  await page.locator('[data-id="approved_b_references"]').innerText(),
  /1 reference.*primary/
);
assert.match(
  await page.locator('[data-id="image_initial"]').innerText(),
  /Nano Banana 2.1/
);
if (generated) {
  for (const id of ['image_initial', 'preview_initial'])
    assert.equal(
      await page
        .locator(`[data-id="${id}"] img`)
        .evaluate(
          (i) =>
            i.complete && i.naturalWidth === 768 && i.naturalHeight === 1376
        ),
      true
    );
} else
  assert.equal(
    await page.locator('[data-id="preview_initial"] img').count(),
    0
  );
assert.equal(await page.locator('[data-id="image_refined"] img').count(), 0);
assert.equal(
  await page
    .locator('[data-id="approved_b_references"] .svelte-flow__handle')
    .count(),
  3
);
await page.locator('[data-id="approved_b_asset"] button').click();
await page.locator('dialog[open]').waitFor();
await page.screenshot({ path: 'evidence/stage2-lightbox.png' });
await page.keyboard.press('Escape');
await page.locator('dialog[open]').waitFor({ state: 'hidden' });
await page.getByRole('button', { name: 'Save workflow', exact: true }).click();
await page.getByText(/Saved · revision/).waitFor();
await page.reload();
await page.locator('[data-id="approved_b_asset"] img').waitFor();
if (generated) {
  await page.locator('[data-id="preview_initial"] img').waitFor();
  await page
    .locator('[data-id="preview_initial"] img')
    .evaluate((i) => i.decode());
  assert.match(
    await page.locator('[data-id="image_initial"] footer').innerText(),
    /completed/
  );
}
assert.equal(
  await page
    .locator('[data-id="approved_b_asset"] img')
    .evaluate((i) => i.complete && i.naturalWidth === 941),
  true
);
await page.setViewportSize({ width: 1920, height: 1080 });
await page.getByRole('button', { name: 'All nodes', exact: true }).click();
await page.waitForTimeout(350);
await page.locator('[data-id="approved_b_asset"] h3').click();
await page.screenshot({ path: 'evidence/stage2-wide.png' });
if (generated) {
  await page.locator('[data-id="image_initial"] h3').click();
  await page.getByLabel(/resolution/i).selectOption('2K');
  await page.waitForFunction(() =>
    document
      .querySelector('[data-id="image_initial"] footer')
      ?.textContent?.includes('idle')
  );
  assert.equal(await page.locator('[data-id="image_initial"] img').count(), 0);
  assert.equal(
    await page.locator('[data-id="preview_initial"] img').count(),
    0
  );
  assert.equal(
    await page.locator('[data-id="image_initial"] .dot.completed').count(),
    0
  );
  // Unsaved edit is discarded; it must not overwrite the approved settings or result.
  await page.reload();
  await page.locator('[data-id="preview_initial"] img').waitFor();
  await page.getByRole('button', { name: 'Image path', exact: true }).click();
  await page.waitForTimeout(250);
  await page.locator('[data-id="preview_initial"] button').click();
  await page.locator('dialog[open] img').evaluate((i) => i.decode());
  assert.equal(
    await page.locator('dialog[open] img').evaluate((i) => i.naturalWidth),
    768
  );
  await page.screenshot({ path: 'evidence/stage2-generated-lightbox.png' });
  await page.keyboard.press('Escape');
  await page.locator('[data-id="approved_b_asset"] h3').click();
  const oldSource = await page
    .locator('[data-id="approved_b_asset"] img')
    .getAttribute('src');
  await page
    .getByLabel('Upload local media', { exact: true })
    .setInputFiles(
      'data/stage2/source/BorderPoint_Weave_Setup_v1/references/approved_B.png'
    );
  await page.waitForFunction(
    (old) =>
      document
        .querySelector('[data-id="approved_b_asset"] img')
        ?.getAttribute('src') !== old,
    oldSource
  );
  await page
    .locator('[data-id="approved_b_references"] img')
    .evaluate((i) => i.decode());
  assert.equal(await page.locator('[data-id="image_initial"] img').count(), 0);
  await page.reload();
  await page.locator('[data-id="preview_initial"] img').waitFor();
  assert.equal(
    await page.locator('[data-id="approved_b_asset"] img').getAttribute('src'),
    oldSource
  );
}
assert.deepEqual(errors, []);
writeFileSync(
  'evidence/stage2-browser-proof.json',
  JSON.stringify(
    {
      verifiedAt: new Date().toISOString(),
      url,
      checks: [
        'actual approved B pixels in Asset, Reference Set and imported Preview',
        'typed handles intact',
        'configured Nano Banana 2.1',
        generated
          ? 'real authorized provider result in generation and Preview; refinement idle'
          : 'no fabricated generation or initial preview pixels',
        'lightbox open and keyboard Escape',
        'save and refresh retain managed reference and compatible execution outputs',
        ...(generated
          ? [
              'unsaved setting edit clears output and all state badges; reload restores saved result',
              'actual generated-image lightbox',
              'inspector replacement uploads full approved PNG, reprojects references and clears old output; unsaved replacement discarded on reopen'
            ]
          : []),
        '1440x900 and 1920x1080 screenshots'
      ],
      pageErrors: errors,
      creditsSpent: 0,
      generationAlreadyAuthorized: generated,
      automatedTestModelCalls: 0
    },
    null,
    2
  )
);
await browser.close();
console.log('Stage 2 real browser proof PASS');
