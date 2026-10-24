import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadLocalRuntime } from '../scripts/local-runtime.mjs';
test('local runtime respects explicit isolation and defaults to no grant without configuration', () => {
  const env = {
    CREATIVE_FLOW_DATA_DIR: 'isolated',
    CREATIVE_FLOW_ALLOW_LOCAL_EXECUTION: '0'
  };
  loadLocalRuntime(env, 'missing');
  assert.equal(env.CREATIVE_FLOW_ALLOW_LOCAL_EXECUTION, '0');
  const fresh = {};
  loadLocalRuntime(fresh, 'missing');
  assert.equal(fresh.CREATIVE_FLOW_ALLOW_LOCAL_EXECUTION, undefined);
});
test('machine-local runtime validates before mutation and preserves explicit denied policy', () => {
  const root = mkdtempSync(join(tmpdir(), 'cf-runtime-'));
  writeFileSync(join(root, 'creative-flow.sqlite'), 'fixture');
  const p = join(root, 'config.json');
  writeFileSync(
    p,
    JSON.stringify({
      dataDirectory: root,
      appUrl: 'https://remote.example',
      allowLocalExecution: true
    })
  );
  const env = {};
  assert.throws(() => loadLocalRuntime(env, p), /loopback/);
  assert.deepEqual(env, {});
  writeFileSync(
    p,
    JSON.stringify({
      dataDirectory: root,
      appUrl: 'http://127.0.0.1:5173',
      allowLocalExecution: true
    })
  );
  const denied = { CREATIVE_FLOW_ALLOW_LOCAL_EXECUTION: '0' };
  loadLocalRuntime(denied, p);
  assert.equal(denied.CREATIVE_FLOW_ALLOW_LOCAL_EXECUTION, '0');
  assert.equal(denied.CREATIVE_FLOW_DATA_DIR, root);
});
