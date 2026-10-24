// Isolated U0 feasibility proof: no transport, database, network or provider executor.
import { createHash, randomUUID } from 'node:crypto';
import {
  artifactSchema,
  recipeSchema,
  manifestSchema,
  invocationSchema,
  runSchema,
  iterationSchema,
  type Recipe,
  type Port,
  type Artifact,
  type Manifest,
  type Run,
  type Operation
} from './contracts';
export function digest(value: unknown): string {
  const canonical = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(canonical)
      : v !== null && typeof v === 'object'
        ? Object.fromEntries(
            Object.entries(v)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, x]) => [k, canonical(x)])
          )
        : v;
  return createHash('sha256')
    .update(JSON.stringify(canonical(value)))
    .digest('hex');
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
export function sameType(a: Port['type'], b: Port['type']) {
  return digest(a) === digest(b);
}
export function assertValue(value: unknown, port: Port) {
  const values = port.type.collection ? value : [value];
  if (
    !Array.isArray(values) ||
    values.length < port.minItems ||
    values.length > port.maxItems
  )
    throw Error('Invalid cardinality');
  for (const v of values) {
    const k = port.type.kind;
    if (
      k === 'text'
        ? typeof v !== 'string'
        : k === 'number'
          ? typeof v !== 'number' || !Number.isFinite(v)
          : k === 'boolean'
            ? typeof v !== 'boolean'
            : !v || typeof v !== 'object' || Array.isArray(v)
    )
      throw Error(`Invalid ${k} value`);
    if (['image', 'video', 'audio', 'file', 'mask'].includes(k)) {
      const media = v as Record<string, unknown>;
      if (
        media.mediaType !== k ||
        typeof media.uri !== 'string' ||
        !/^(https:\/\/|\/api\/assets\/)/.test(media.uri)
      )
        throw Error('Invalid typed media');
    }
    // Rich structured schemas must be registered; U0 does not silently accept an unknown schema.
    if (port.type.schemaRef)
      throw Error('Structured schema resolver unavailable in U0');
  }
}
export function validateRecipe(raw: unknown, expectedRevision: number): Recipe {
  const r = recipeSchema.parse(raw);
  if (r.revision !== expectedRevision) throw Error('Stale recipe revision');
  const nodes = new Map(r.operations.map((op) => [op.id, op]));
  if (nodes.size !== r.operations.length) throw Error('Duplicate operation');
  const ids = new Set(),
    targets = new Set();
  for (const op of r.operations)
    if (op.version !== 1) throw Error('Unknown operation version');
  for (const e of r.edges) {
    if (ids.has(e.id)) throw Error('Duplicate edge');
    ids.add(e.id);
    const a = nodes.get(e.source)?.outputs.find((p) => p.id === e.output),
      b = nodes.get(e.target)?.inputs.find((p) => p.id === e.input);
    if (
      !a ||
      !b ||
      !sameType(a.type, b.type) ||
      a.role !== b.role ||
      a.minItems < b.minItems ||
      a.maxItems > b.maxItems
    )
      throw Error('Incompatible typed port or role');
    const target = JSON.stringify([e.target, e.input]);
    if (targets.has(target)) throw Error('Duplicate input connection');
    targets.add(target);
  }
  const active = new Set(),
    seen = new Set();
  const visit = (id: string) => {
    if (active.has(id)) throw Error('Cycle rejected');
    if (seen.has(id)) return;
    active.add(id);
    r.edges.filter((e) => e.target === id).forEach((e) => visit(e.source));
    active.delete(id);
    seen.add(id);
  };
  r.operations.forEach((op) => visit(op.id));
  return r;
}
export type Transform = {
  inputs: Port[];
  outputs: Port[];
  apply: (
    values: Record<string, unknown>,
    config: Operation['config']
  ) => Record<string, unknown>;
};
export const textPort = (id: string): Port => ({
  id,
  type: { kind: 'text', collection: false },
  role: 'content',
  required: true,
  minItems: 1,
  maxItems: 1,
  ordered: true
});
export function defaultTransforms(): ReadonlyMap<string, Transform> {
  return new Map([
    [
      'text.uppercase@1',
      {
        inputs: [textPort('value')],
        outputs: [textPort('value')],
        apply: (v: Record<string, unknown>) => ({
          value: String(v.value).toUpperCase()
        })
      }
    ]
  ]);
}
export function runLocal(
  raw: unknown,
  expectedRevision: number,
  transforms = defaultTransforms()
): Run {
  const recipe = validateRecipe(raw, expectedRevision),
    snapshotHash = digest(recipe),
    runId = randomUUID();
  const artifacts: Artifact[] = [],
    results = new Map<string, Record<string, Artifact>>(),
    events: Run['events'] = [];
  function run(op: Operation): Record<string, Artifact> {
    if (results.has(op.id)) return results.get(op.id)!;
    if (
      !['Input', 'Transform', 'Output'].includes(op.primitive) ||
      op.effect !== 'pure'
    )
      throw Error('Not executable in U0 local spike');
    const inputs: Record<string, unknown> = {},
      parents: Artifact[] = [];
    for (const edge of recipe.edges.filter((e) => e.target === op.id)) {
      const parent = run(recipe.operations.find((n) => n.id === edge.source)!)[
        edge.output
      ];
      parents.push(parent);
      inputs[edge.input] = parent.value;
    }
    for (const p of op.inputs) {
      if (inputs[p.id] === undefined && !p.required) continue;
      assertValue(inputs[p.id], p);
    }
    let values: Record<string, unknown>;
    if (op.primitive === 'Input') {
      if (op.inputs.length) throw Error('Input cannot consume dependencies');
      values = op.config.values as Record<string, unknown>;
    } else if (op.primitive === 'Output') {
      if (
        op.inputs.length !== op.outputs.length ||
        op.inputs.some(
          (p) =>
            !op.outputs.some(
              (o) =>
                o.id === p.id && sameType(o.type, p.type) && o.role === p.role
            )
        )
      )
        throw Error('Output return signature mismatch');
      // Returning material is a view of existing immutable artifacts; do not fabricate output versions.
      const returned = Object.fromEntries(
        recipe.edges
          .filter((e) => e.target === op.id)
          .map((e) => [e.input, results.get(e.source)![e.output]])
      );
      results.set(op.id, returned);
      events.push({
        sequence: events.length,
        operationId: op.id,
        status: 'completed'
      });
      return returned;
    } else {
      const handler = transforms.get(String(op.config.transform));
      if (
        !handler ||
        digest(handler.inputs) !== digest(op.inputs) ||
        digest(handler.outputs) !== digest(op.outputs)
      )
        throw Error('Unknown transform or mismatched signature');
      values = handler.apply(
        freeze(structuredClone(inputs)),
        freeze(structuredClone(op.config))
      );
    }
    if (
      !values ||
      Object.keys(values).some((k) => !op.outputs.some((p) => p.id === k))
    )
      throw Error('Invalid declared outputs');
    const out: Record<string, Artifact> = {};
    const attemptId = randomUUID();
    for (const p of op.outputs) {
      assertValue(values[p.id], p);
      const value = structuredClone(values[p.id]);
      const a = artifactSchema.parse({
        schemaVersion: 1,
        id: randomUUID(),
        version: 1,
        type: p.type,
        value,
        digest: digest(value),
        access: 'local',
        parentIds: parents.map((p) => p.id),
        createdAt: new Date().toISOString(),
        origin: {
          kind: op.primitive === 'Input' ? 'imported' : 'local-transform',
          runId,
          operationId: op.id,
          portId: p.id,
          attemptId,
          recipeRevision: recipe.revision,
          snapshotHash
        }
      });
      out[p.id] = a;
      artifacts.push(a);
    }
    results.set(op.id, out);
    events.push({
      sequence: events.length,
      operationId: op.id,
      status: 'completed'
    });
    return out;
  }
  recipe.operations.forEach(run);
  return freeze(
    runSchema.parse({
      schemaVersion: 1,
      id: runId,
      recipe,
      snapshotHash,
      status: 'completed',
      artifacts,
      invocations: [],
      events
    })
  );
}
// A manifest-driven PLAN, deliberately no adapter dispatch even when approval exists.
export function planInvoke(
  rawManifest: unknown,
  rawPayload: Record<string, { role: string; value: unknown }>,
  params: Record<string, unknown>,
  recipeRevision: number,
  now: string,
  expectedManifestHash: string
) {
  const m = manifestSchema.parse(rawManifest),
    time = Date.parse(now);
  if (
    !Number.isFinite(time) ||
    time < Date.parse(m.discoveredAt) ||
    time >= Date.parse(m.expiresAt) ||
    digest(m) !== expectedManifestHash
  )
    throw Error('Expired or changed capability contract');
  for (const key of Object.keys(rawPayload))
    if (!m.inputs.some((p) => p.id === key)) throw Error('Unknown input');
  for (const p of m.inputs) {
    const v = rawPayload[p.id];
    if (!v && !p.required) continue;
    if (!v || v.role !== p.role) throw Error('Wrong or missing input role');
    assertValue(v.value, p);
  }
  for (const [key, value] of Object.entries(params)) {
    const spec = m.parameters[key];
    if (
      !spec ||
      typeof value !== spec.type ||
      (typeof value === 'number' &&
        (!Number.isFinite(value) ||
          (spec.minimum !== undefined && value < spec.minimum) ||
          (spec.maximum !== undefined && value > spec.maximum))) ||
      (spec.choices && !spec.choices.some((c) => digest(c) === digest(value)))
    )
      throw Error('Unknown or invalid provider parameter');
  }
  for (const [key, spec] of Object.entries(m.parameters))
    if (spec.required && params[key] === undefined)
      throw Error('Missing parameter');
  return freeze(
    invocationSchema.parse({
      schemaVersion: 1,
      id: randomUUID(),
      attemptId: randomUUID(),
      idempotencyKey: randomUUID(),
      manifestHash: digest(m),
      recipeRevision,
      payloadHash: digest({ inputs: rawPayload, params }),
      status: 'blocked',
      externalCalls: 0,
      outputs: [],
      reason:
        m.status === 'fixture'
          ? 'fixture-plan-only; no executor'
          : 'external-dependent; no executor or spend authorization'
    })
  );
}
// Resume validates frozen history only; never replays pending work.
export function restoreRun(raw: unknown): Run {
  const run = runSchema.parse(raw);
  validateRecipe(run.recipe, run.recipe.revision);
  if (digest(run.recipe) !== run.snapshotHash)
    throw Error('Run snapshot mismatch');
  const ids = new Set(run.artifacts.map((a) => a.id));
  if (ids.size !== run.artifacts.length)
    throw Error('Duplicate artifact identity');
  const produced = new Map<string, Artifact>();
  const key = (operationId: string, portId: string) =>
    JSON.stringify([operationId, portId]);
  for (const a of run.artifacts) {
    const k = key(a.origin.operationId, a.origin.portId);
    if (produced.has(k)) throw Error('Duplicate producer output');
    produced.set(k, a);
  }
  function upstream(operationId: string, portId: string): Artifact {
    const op = run.recipe.operations.find((op) => op.id === operationId)!;
    if (op.primitive === 'Output') {
      const edge = run.recipe.edges.find(
        (e) => e.target === operationId && e.input === portId
      );
      if (!edge) throw Error('Missing pass-through binding');
      return upstream(edge.source, edge.output);
    }
    const artifact = produced.get(key(operationId, portId));
    if (!artifact) throw Error('Missing parent output');
    return artifact;
  }
  for (const a of run.artifacts)
    if (
      digest(a.value) !== a.digest ||
      a.origin.runId !== run.id ||
      a.origin.recipeRevision !== run.recipe.revision ||
      a.origin.snapshotHash !== run.snapshotHash ||
      !run.recipe.operations.some((op) => op.id === a.origin.operationId) ||
      a.parentIds.some((id) => !ids.has(id))
    )
      throw Error('Invalid artifact history');
  for (const a of run.artifacts) {
    const op = run.recipe.operations.find(
      (op) => op.id === a.origin.operationId
    )!;
    const port = op.outputs.find((p) => p.id === a.origin.portId);
    if (
      !port ||
      !sameType(port.type, a.type) ||
      !['Input', 'Transform'].includes(op.primitive) ||
      op.effect !== 'pure' ||
      a.origin.kind !==
        (op.primitive === 'Input' ? 'imported' : 'local-transform')
    )
      throw Error('Invalid artifact producer signature');
    assertValue(a.value, port);
    const parentIds = run.recipe.edges
      .filter((e) => e.target === op.id)
      .map((e) => upstream(e.source, e.output).id);
    if (digest(parentIds) !== digest(a.parentIds))
      throw Error('Invalid artifact lineage binding');
    if (
      op.primitive === 'Input' &&
      (op.inputs.length ||
        digest(a.value) !==
          digest((op.config.values as Record<string, unknown>)?.[port.id]))
    )
      throw Error('Input snapshot value mismatch');
  }
  if (run.invocations.some((i) => i.recipeRevision !== run.recipe.revision))
    throw Error('Invocation revision mismatch');
  const eventIds = new Set<string>();
  for (const [index, event] of run.events.entries()) {
    if (
      event.sequence !== index ||
      eventIds.has(event.operationId) ||
      event.status !== 'completed' ||
      !run.recipe.operations.some((op) => op.id === event.operationId)
    )
      throw Error('Invalid U0 completion event');
    for (const edge of run.recipe.edges.filter(
      (e) => e.target === event.operationId
    ))
      if (!eventIds.has(edge.source))
        throw Error('Completion before dependency');
    eventIds.add(event.operationId);
  }
  if (run.artifacts.some((a) => !eventIds.has(a.origin.operationId)))
    throw Error('Artifact missing producer completion event');
  if (
    run.status === 'completed' &&
    (eventIds.size !== run.recipe.operations.length ||
      run.recipe.operations.some(
        (op) =>
          !['Input', 'Transform', 'Output'].includes(op.primitive) ||
          op.effect !== 'pure'
      ))
  )
    throw Error('Incomplete or unsupported completed run');
  if (run.status === 'completed')
    for (const op of run.recipe.operations)
      if (
        op.primitive !== 'Output' &&
        op.outputs.some((p) => !produced.has(key(op.id, p.id)))
      )
        throw Error('Completed producer missing output');
  if (run.status === 'completed' && run.invocations.length)
    throw Error('Blocked invocation cannot claim success');
  return freeze(run);
}
export function inspectIteration(raw: unknown) {
  const i = iterationSchema.parse(raw);
  return freeze({
    status: i.cancelled ? 'cancelled' : 'blocked',
    childRuns: [],
    externalCalls: 0,
    reason: 'Iteration scheduling is specification only in U0'
  });
}
