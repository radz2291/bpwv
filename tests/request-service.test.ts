import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { initializeDatabase } from '../src/lib/server/store';
import { RequestService } from '../src/lib/server/request-service';
const hash = (v: unknown) =>
  createHash('sha256').update(JSON.stringify(v)).digest('hex');
function setup() {
  const db = new DatabaseSync(':memory:');
  initializeDatabase(db);
  const input = {
    prompt: 'Locked original prompt',
    images: [{ id: 'local-B', uri: '/api/assets/b.png', mediaType: 'image' }]
  };
  const request = {
    id: 'req',
    status: 'pending',
    input,
    inputHash: hash(input),
    providerInput: null,
    assetLineage: input.images,
    contract: {
      inputs: {
        prompt: { type: 'text' },
        images: { type: 'image', maxItems: 14 }
      }
    },
    cost: { approved: false }
  };
  db.prepare('INSERT INTO requests VALUES (?,?)').run(
    'req',
    JSON.stringify(request)
  );
  return { db, service: new RequestService(db), request };
}
const uploaded = {
  id: 'provider-B',
  url: 'https://example.com/uploaded-B.png',
  type: 'image',
  width: 941,
  height: 1672
};
test('media resolution requires exact immutable input and local identities, retaining provider media object', () => {
  const { db, service, request } = setup();
  assert.throws(
    () =>
      service.resolveMedia('req', {
        expectedInputHash: 'stale',
        resolutions: [{ assetId: 'local-B', providerAsset: uploaded }]
      }),
    /hash mismatch/
  );
  assert.throws(
    () =>
      service.resolveMedia('req', {
        expectedInputHash: request.inputHash,
        resolutions: [{ assetId: 'wrong', providerAsset: uploaded }]
      }),
    /identities/
  );
  assert.deepEqual(service.get('req'), request);
  const resolved = service.resolveMedia('req', {
    expectedInputHash: request.inputHash,
    resolutions: [{ assetId: 'local-B', providerAsset: uploaded }]
  });
  assert.deepEqual(resolved.input, request.input);
  assert.deepEqual(resolved.providerInput.images, [uploaded]);
  assert.equal(resolved.providerInputHash, hash(resolved.providerInput));
  assert.throws(
    () =>
      service.resolveMedia('req', {
        expectedInputHash: request.inputHash,
        resolutions: [{ assetId: 'local-B', providerAsset: uploaded }]
      }),
    /already resolved/
  );
  db.close();
});
test('quotation is tied to resolved inputs and never approves spend; five-credit boundary stops', () => {
  const { db, service, request } = setup();
  assert.throws(
    () =>
      service.recordQuote('req', {
        expectedProviderInputHash: 'stale',
        cost: 3.5,
        quotedAt: new Date().toISOString()
      }),
    /Resolve exact/
  );
  const resolved = service.resolveMedia('req', {
    expectedInputHash: request.inputHash,
    resolutions: [{ assetId: 'local-B', providerAsset: uploaded }]
  });
  const quote = (cost: number) =>
    service.recordQuote('req', {
      expectedProviderInputHash: resolved.providerInputHash,
      cost,
      quotedAt: new Date().toISOString()
    });
  assert.equal(quote(3.5).cost.status, 'awaiting_user_approval');
  assert.equal(quote(5).cost.status, 'limit_reached');
  assert.equal(quote(5).cost.approved, false);
  assert.deepEqual(service.get('req').input, request.input);
  db.close();
});
test('human decision audit requires the exact quoted inputs and cannot bypass the cost cap', () => {
  const { db, service, request } = setup();
  const resolved = service.resolveMedia('req', {
    expectedInputHash: request.inputHash,
    resolutions: [{ assetId: 'local-B', providerAsset: uploaded }]
  });
  const quote = (cost: number) =>
    service.recordQuote('req', {
      expectedProviderInputHash: resolved.providerInputHash,
      cost,
      quotedAt: new Date().toISOString()
    });
  const decision = {
    expectedProviderInputHash: resolved.providerInputHash,
    quotedCost: 3.5,
    decision: 'approve',
    decidedAt: new Date().toISOString(),
    evidence: 'Test fixture structured decision, never a model call'
  };
  assert.throws(
    () => service.recordApproval('req', decision),
    /exact current quote/
  );
  quote(3.5);
  assert.throws(
    () =>
      service.recordApproval('req', {
        ...decision,
        expectedProviderInputHash: 'changed'
      }),
    /exact current quote/
  );
  assert.equal(service.recordApproval('req', decision).cost.approved, true);
  quote(5);
  assert.throws(
    () => service.recordApproval('req', { ...decision, quotedCost: 5 }),
    /exact current quote/
  );
  db.close();
});
