import { test } from 'node:test';
import assert from 'node:assert/strict';
import { models, validateModelInput } from '../src/lib/server/provider';
test('discovered model reference limits and field roles stay distinct from batching', () => {
  const pro = models.find((m) => m.label === 'Flux 2 Pro')!,
    dev = models.find((m) => m.label === 'Flux 2 Dev LoRA')!;
  validateModelInput(pro, {
    prompt: 'Structural validation only',
    images: Array(8).fill('https://example.com/reference.png')
  });
  assert.throws(
    () =>
      validateModelInput(pro, {
        prompt: 'Test',
        images: Array(9).fill('https://example.com/reference.png')
      }),
    /cardinality/
  );
  assert.throws(
    () =>
      validateModelInput(dev, {
        prompt: 'Test',
        image_1: ['https://example.com/reference.png']
      }),
    /cardinality/
  );
  assert.throws(
    () => validateModelInput(dev, { prompt: 'Test', images: [] }),
    /Unsupported/
  );
});
test('reject unsupported parameters, missing prompts and invalid model-specific settings', () => {
  const pro = models.find((m) => m.label === 'Flux 2 Pro')!,
    dev = models.find((m) => m.label === 'Flux 2 Dev LoRA')!;
  assert.throws(() => validateModelInput(pro, {}), /Required/);
  assert.throws(
    () => validateModelInput(pro, { prompt: 'Test', strength: 0.8 }),
    /Unsupported/
  );
  assert.throws(
    () => validateModelInput(dev, { prompt: 'Test', strength: 2 }),
    /Invalid number/
  );
  assert.throws(
    () => validateModelInput(pro, { prompt: 'Test', image_size: '4K' }),
    /Invalid/
  );
  assert.throws(
    () => validateModelInput(pro, { prompt: 'Test', seed: 0.5 }),
    /Invalid number/
  );
});
