import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  artifactSchema,
  approvalSchema,
  manifestSchema,
  operationSchema,
  recipeSchema,
  runSchema
} from '../src/lib/universal/contracts';
import {
  defaultTransforms,
  digest,
  inspectIteration,
  planInvoke,
  restoreRun,
  runLocal,
  textPort,
  validateRecipe
} from '../src/lib/universal/spike';
import {
  localRecipe,
  fixtureManifest,
  fixturePayload,
  iterationFixture,
  scenarios
} from '../src/lib/universal/fixtures';

test('U0 deterministic Input → registered Transform → Output retains immutable lineage', () => {
  const raw = localRecipe(),
    before = JSON.stringify(raw),
    run = runLocal(raw, 0);
  assert.equal(JSON.stringify(raw), before);
  assert.equal(run.artifacts.length, 2);
  assert.equal(run.artifacts[1].value, 'HELLO WORKBENCH');
  assert.deepEqual(run.artifacts[1].parentIds, [run.artifacts[0].id]);
  assert.ok(Object.isFrozen(run.artifacts[0].origin));
  raw.operations[0].config.values = { value: 'edited' };
  assert.equal(run.artifacts[0].value, 'hello workbench');
  assert.deepEqual(restoreRun(JSON.parse(JSON.stringify(run))), run);
});
test('U0 new trusted transform registers without scheduler changes', () => {
  const handlers = new Map(defaultTransforms());
  handlers.set('text.reverse@1', {
    inputs: [textPort('value')],
    outputs: [textPort('value')],
    apply: (v) => ({ value: [...String(v.value)].reverse().join('') })
  });
  const r = localRecipe();
  r.operations[1].config.transform = 'text.reverse@1';
  assert.equal(runLocal(r, 0, handlers).artifacts[1].value, 'hcnebkrow olleh');
  r.operations[1].config.transform = 'eval arbitrary code';
  assert.throws(() => runLocal(r, 0), /Unknown transform/);
});
test('U0 graph rejects incompatible types, roles, stale revisions and cycles', () => {
  const wrong = localRecipe();
  wrong.operations[1].inputs[0].type.kind = 'image';
  assert.throws(() => validateRecipe(wrong, 0), /Incompatible/);
  const role = localRecipe();
  role.operations[1].inputs[0].role = 'edit-target';
  assert.throws(() => validateRecipe(role, 0), /role/);
  assert.throws(() => validateRecipe(localRecipe(), 2), /Stale/);
  const cycle = localRecipe();
  cycle.operations[0].inputs = [textPort('value')];
  cycle.edges.push({
    id: 'cycle',
    source: 'out',
    output: 'value',
    target: 'in',
    input: 'value'
  });
  assert.throws(() => validateRecipe(cycle, 0), /Cycle/);
  const missing = localRecipe();
  missing.edges = [];
  assert.throws(() => runLocal(missing, 0), /Invalid text/);
});
test('U0 forbids hidden effects, unknown versions and unsupported production primitives', () => {
  const r = localRecipe();
  r.operations[1].effect = 'external-write';
  assert.throws(() => runLocal(r, 0), /Not executable/);
  const unknown = localRecipe();
  unknown.schemaVersion = 2 as 1;
  assert.throws(() => runLocal(unknown, 0));
  const version = localRecipe();
  version.operations[0].version = 2;
  assert.throws(() => runLocal(version, 0), /Unknown operation version/);
  for (const primitive of [
    'Branch',
    'Iterate',
    'Approve',
    'Subflow',
    'Invoke'
  ] as const) {
    const r = localRecipe();
    r.operations[1].primitive = primitive;
    assert.throws(() => runLocal(r, 0), /Not executable/);
  }
});
const now = '2026-10-24T00:00:00.000Z';
test('U0 fixture Invoke manifest plans truthfully with zero external success or spend', () => {
  const m = fixtureManifest(),
    plan = planInvoke(
      m,
      fixturePayload(),
      { quality: 'draft' },
      0,
      now,
      digest(m)
    );
  assert.equal(plan.status, 'blocked');
  assert.equal(plan.externalCalls, 0);
  assert.deepEqual(plan.outputs, []);
  assert.match(plan.reason, /fixture/);
});
test('U0 Invoke rejects wrong image role, media type and reference cardinality', () => {
  const m = fixtureManifest(),
    p = fixturePayload();
  p.images.role = 'edit-target';
  assert.throws(() => planInvoke(m, p, {}, 0, now, digest(m)), /role/);
  const q = fixturePayload();
  q.images.value[0].mediaType = 'video';
  assert.throws(() => planInvoke(m, q, {}, 0, now, digest(m)), /media/);
  const many = fixturePayload();
  many.images.value.push(...many.images.value, ...many.images.value);
  assert.throws(
    () => planInvoke(m, many, {}, 0, now, digest(m)),
    /cardinality/
  );
});
test('U0 rejects provider parameter drift, unknown contracts and expired discovery', () => {
  const m = fixtureManifest(),
    p = fixturePayload();
  assert.throws(
    () => planInvoke(m, p, { unsupported: true }, 0, now, digest(m)),
    /parameter/
  );
  assert.throws(
    () => planInvoke(m, p, { quality: 'premium' }, 0, now, digest(m)),
    /parameter/
  );
  const oldHash = digest(m);
  m.parameters.quality.choices = ['changed'];
  assert.throws(() => planInvoke(m, p, {}, 0, now, oldHash), /changed/);
  assert.throws(
    () => planInvoke(m, p, {}, 0, '2027-01-01T00:00:00.000Z', digest(m)),
    /Expired/
  );
  assert.throws(() => planInvoke({}, p, {}, 0, now, oldHash));
});
test('U0 unavailable capability and approval absence remain blocked after serialized restart', () => {
  const m = fixtureManifest();
  m.status = 'external-dependent';
  const plan = planInvoke(m, fixturePayload(), {}, 0, now, digest(m));
  assert.match(plan.reason, /no executor or spend authorization/);
  const run = structuredClone(runLocal(localRecipe(), 0));
  run.status = 'pending-external';
  run.invocations = [plan];
  const restored = restoreRun(JSON.parse(JSON.stringify(run)));
  assert.equal(restored.status, 'pending-external');
  assert.equal(restored.invocations[0].externalCalls, 0);
  const fake = structuredClone(run);
  fake.status = 'completed';
  assert.throws(() => restoreRun(fake), /cannot claim success/);
  const approval = {
    schemaVersion: 1,
    id: 'a',
    subjectHash: plan.payloadHash,
    manifestHash: plan.manifestHash,
    quoteId: 'fixture-only',
    quotedCost: 0,
    currency: 'fixture',
    authority: 'fixture-user',
    decision: 'approve',
    decidedAt: now,
    expiresAt: '2026-10-25T00:00:00.000Z',
    revoked: false
  };
  assert.ok(approvalSchema.safeParse(approval).success);
  // Parsing an approval record is not authority; no executor accepts it.
  assert.equal(
    planInvoke(m, fixturePayload(), {}, 0, now, digest(m)).status,
    'blocked'
  );
  assert.equal(
    approvalSchema.safeParse({ ...approval, decision: 'pending' }).success,
    false
  );
});
test('U0 cancellation, duplicate items and bound violations cannot schedule iteration', () => {
  assert.equal(
    inspectIteration({ ...iterationFixture(), cancelled: true }).status,
    'cancelled'
  );
  assert.deepEqual(inspectIteration(iterationFixture()).childRuns, []);
  assert.throws(() =>
    inspectIteration({ ...iterationFixture(), maxAttempts: 0 })
  );
  assert.throws(() =>
    inspectIteration({ ...iterationFixture(), itemIds: ['a', 'a'] })
  );
  assert.throws(() => inspectIteration({ ...iterationFixture(), maxItems: 1 }));
});
test('U0 artifact tampering and fictitious external provenance fail restore', () => {
  const r = structuredClone(runLocal(localRecipe(), 0));
  r.artifacts[0].value = 'tampered';
  assert.throws(() => restoreRun(r), /history/);
  const a = structuredClone(runLocal(localRecipe(), 0).artifacts[0]);
  a.origin.kind = 'external-reported';
  assert.equal(artifactSchema.safeParse(a).success, false);
  assert.equal(runSchema.safeParse({}).success, false);
  assert.equal(operationSchema.safeParse({}).success, false);
  assert.equal(recipeSchema.safeParse({}).success, false);
  assert.equal(manifestSchema.safeParse({}).success, false);
});
test('U0 restore rejects cyclic lineage, wrong value/type and reassigned producer output', () => {
  const base = () => structuredClone(runLocal(localRecipe(), 0));
  const cycle = base();
  cycle.artifacts[0].parentIds = [cycle.artifacts[1].id];
  assert.throws(() => restoreRun(cycle), /lineage/);
  const value = base();
  value.artifacts[0].value = false;
  value.artifacts[0].digest = digest(false);
  assert.throws(() => restoreRun(value), /Invalid text/);
  const type = base();
  type.artifacts[0].type.kind = 'image';
  assert.throws(() => restoreRun(type), /producer signature/);
  const producer = base();
  producer.artifacts[0].origin.operationId = 'out';
  assert.throws(() => restoreRun(producer), /producer signature/);
  const port = base();
  port.artifacts[0].origin.portId = 'missing';
  assert.throws(() => restoreRun(port), /producer signature|Missing parent/);
  const changedInput = base();
  changedInput.artifacts[0].value = 'forged';
  changedInput.artifacts[0].digest = digest('forged');
  assert.throws(() => restoreRun(changedInput), /snapshot value/);
});
test('U0 four cross-domain recipe fixtures validate without project primitives', () => {
  assert.equal(scenarios().length, 4);
  for (const s of scenarios()) {
    assert.ok(validateRecipe(s.recipe, 0));
    assert.ok(s.status === 'specification-fixture');
  }
});
test('U0 restored completion requires ordered producer/dependency events', () => {
  const base = () => structuredClone(runLocal(localRecipe(), 0));
  const missing = base();
  missing.events = [];
  assert.throws(() => restoreRun(missing), /completion event/);
  const incomplete = base();
  incomplete.events.pop();
  assert.throws(() => restoreRun(incomplete), /Incomplete/);
  const absent = base();
  absent.artifacts.pop();
  assert.throws(() => restoreRun(absent), /missing output/);
  const order = base();
  order.events.reverse();
  assert.throws(() => restoreRun(order), /completion event|dependency/);
  const duplicate = base();
  duplicate.events.push({ ...duplicate.events[0], sequence: 3 });
  assert.throws(() => restoreRun(duplicate), /completion event/);
});
