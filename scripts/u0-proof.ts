import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { z } from 'zod';
import * as schemas from '../src/lib/universal/contracts';
import {
  digest,
  planInvoke,
  restoreRun,
  runLocal,
  validateRecipe
} from '../src/lib/universal/spike';
import {
  fixtureManifest,
  fixturePayload,
  localRecipe,
  scenarios
} from '../src/lib/universal/fixtures';
mkdirSync('data/u0', { recursive: true });
mkdirSync('evidence/u0', { recursive: true });
if (process.argv.includes('--restore')) {
  const run = restoreRun(
    JSON.parse(readFileSync('data/u0/pending-run.json', 'utf8'))
  );
  assert.equal(run.status, 'pending-external');
  assert.equal(run.invocations[0].externalCalls, 0);
  console.log('Fresh-process restore PASS; no executor, no replay');
} else {
  const run = runLocal(localRecipe(), 0),
    manifest = fixtureManifest();
  const plan = planInvoke(
    manifest,
    fixturePayload(),
    {},
    0,
    '2026-10-24T00:00:00.000Z',
    digest(manifest)
  );
  const pending = { ...run, status: 'pending-external', invocations: [plan] };
  writeFileSync('data/u0/pending-run.json', JSON.stringify(pending));
  const restarted = execFileSync(
    process.execPath,
    ['--import', 'tsx', 'scripts/u0-proof.ts', '--restore'],
    { encoding: 'utf8' }
  ).trim();
  for (const scenario of scenarios()) validateRecipe(scenario.recipe, 0);
  const exported = Object.fromEntries(
    Object.entries(schemas)
      .filter(([name]) => name.endsWith('Schema'))
      .map(([name, schema]) => [name, z.toJSONSchema(schema as z.ZodType)])
  );
  writeFileSync(
    'docs/universal-workbench/U0_SCHEMAS.json',
    JSON.stringify(
      {
        status: 'experimental-U0; refinements and runtime checks also required',
        schemas: exported
      },
      null,
      2
    )
  );
  writeFileSync(
    'evidence/u0/proof.json',
    JSON.stringify(
      {
        verifiedAt: new Date().toISOString(),
        codeCommit: execFileSync('git', ['rev-parse', 'HEAD'], {
          encoding: 'utf8'
        }).trim(),
        status: 'non-paid isolated spike',
        paidCalls: 0,
        providerExecutors: 0,
        localRun: run,
        manifest,
        invokePlan: plan,
        restart: restarted,
        scenarios: scenarios()
      },
      null,
      2
    )
  );
  console.log(
    'U0 deterministic, manifest plan, schema export and fresh-process restore PASS'
  );
}
