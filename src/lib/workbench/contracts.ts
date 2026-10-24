import { z } from 'zod';
import { nodeSchema } from '../contract';
import { canonicalize } from 'json-canonicalize';
import { createHash } from 'node:crypto';
const identity = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[a-zA-Z0-9_-]+$/)
  .refine(
    (s) => !['__proto__', 'constructor', 'prototype'].includes(s),
    'Reserved identity'
  );

export const documentSchema = z
  .object({
    schemaVersion: z.literal(2),
    id: identity,
    name: z.string().min(1).max(1000),
    revision: z.number().int().nonnegative(),
    nodes: z
      .array(
        nodeSchema.strict().extend({
          id: identity,
          label: z.string().max(1000),
          position: z
            .object({ x: z.number().finite(), y: z.number().finite() })
            .strict()
        })
      )
      .max(500),
    edges: z
      .array(
        z
          .object({
            id: identity,
            source: z.string(),
            sourceHandle: z.string(),
            target: z.string(),
            targetHandle: z.string()
          })
          .strict()
      )
      .max(2000),
    groups: z
      .array(
        z
          .object({
            id: identity,
            name: z.string(),
            nodeIds: z.array(z.string()),
            version: z.number().int().positive()
          })
          .strict()
      )
      .max(500)
      .default([])
  })
  .strict();
export type UniversalWorkflow = z.infer<typeof documentSchema>;
export type UNode = UniversalWorkflow['nodes'][number];
export type ValueType = 'text' | 'number' | 'boolean' | 'record' | 'image';
export type UPort = {
  id: string;
  type: ValueType;
  schemaRef?: string;
  role: 'value';
  cardinality: 'single';
  required: boolean;
};
export const schemas: Record<string, z.ZodType> = {
  'cf.document@1': z
    .object({ title: z.string().max(10000), body: z.string().max(100000) })
    .strict(),
  'cf.document-statistics@1': z
    .object({
      characters: z.number().int().nonnegative(),
      words: z.number().int().nonnegative(),
      lines: z.number().int().nonnegative()
    })
    .strict()
};
export function jsonValue(value: unknown, depth = 0): void {
  if (depth > 32) throw Error('JSON nesting limit');
  if (typeof value === 'string') {
    if (
      /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(
        value
      )
    )
      throw Error('Invalid Unicode scalar');
    return;
  }
  if (value === null || typeof value === 'boolean') return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (Array.isArray(value)) {
    for (const v of value) jsonValue(v, depth + 1);
    return;
  }
  if (
    value &&
    typeof value === 'object' &&
    Object.getPrototypeOf(value) === Object.prototype
  ) {
    for (const [k, v] of Object.entries(value)) {
      jsonValue(k, depth + 1);
      jsonValue(v, depth + 1);
    }
    return;
  }
  throw Error('Unsupported JSON value');
}
export function digest(value: unknown) {
  jsonValue(value);
  return createHash('sha256')
    .update('creative-flow-jcs-v1\0')
    .update(canonicalize(value))
    .digest('hex');
}
export function semanticHash(graph: UniversalWorkflow) {
  return digest({
    schemaVersion: 2,
    nodes: graph.nodes
      .map((n) => ({
        id: n.id,
        kind: n.kind,
        version: n.version,
        config: n.config
      }))
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
    edges: [...graph.edges].sort((a, b) =>
      a.id < b.id ? -1 : a.id > b.id ? 1 : 0
    )
  });
}
export function validateValue(
  type: ValueType,
  value: unknown,
  schemaRef?: string
) {
  if (!['text', 'number', 'boolean', 'record', 'image'].includes(type))
    throw Error('Unsupported runtime value type');
  jsonValue(value);
  if (type === 'text' && (typeof value !== 'string' || value.length > 100000))
    throw Error('Expected bounded text');
  if (
    type === 'number' &&
    (typeof value !== 'number' || !Number.isFinite(value))
  )
    throw Error('Expected finite number');
  if (type === 'boolean' && typeof value !== 'boolean')
    throw Error('Expected boolean');
  if (type === 'record') {
    if (!schemaRef || !schemas[schemaRef]) throw Error('Unknown record schema');
    schemas[schemaRef].parse(value);
  }
  if (
    type === 'image' &&
    (typeof value !== 'object' ||
      value === null ||
      typeof (value as { blob?: unknown }).blob !== 'string')
  )
    throw Error('Expected managed image');
}
export type Handler = {
  id: string;
  version: number;
  input: ValueType;
  output: ValueType;
  inputSchema?: string;
  outputSchema?: string;
  settings: z.ZodType;
  execute: (
    value: unknown,
    settings: Record<string, unknown>
  ) => unknown | Promise<unknown>;
};
export type Capability = Handler & {
  adapter: string;
  status: 'implemented-local' | 'external-dependent';
  effects: string[];
  discoveredAt: string;
  expiresAt?: string;
};
export class WorkbenchRegistry {
  transforms = new Map<string, Handler>();
  capabilities = new Map<string, Capability>();
  registerTransform(def: Handler) {
    const key = `${def.id}@${def.version}`;
    if (this.transforms.has(key)) throw Error('Duplicate transform');
    this.transforms.set(key, def);
    return this;
  }
  registerCapability(def: Capability) {
    const key = `${def.id}@${def.version}`;
    if (this.capabilities.has(key)) throw Error('Duplicate capability');
    this.capabilities.set(key, def);
    return this;
  }
}
export function manifest(def: Capability) {
  return {
    id: def.id,
    version: def.version,
    adapter: def.adapter,
    status: def.status,
    effects: def.effects,
    discoveredAt: def.discoveredAt,
    ...(def.expiresAt ? { expiresAt: def.expiresAt } : {}),
    input: def.input,
    output: def.output,
    ...(def.inputSchema ? { inputSchema: def.inputSchema } : {}),
    ...(def.outputSchema ? { outputSchema: def.outputSchema } : {}),
    settingsSchema: z.toJSONSchema(def.settings)
  };
}
export function createRegistry() {
  const r = new WorkbenchRegistry(),
    empty = z.object({}).strict();
  r.registerTransform({
    id: 'text.normalize',
    version: 1,
    input: 'text',
    output: 'text',
    settings: empty,
    execute: (v) => (v as string).trim().replace(/\s+/g, ' ')
  });
  r.registerTransform({
    id: 'record.normalize',
    version: 1,
    input: 'record',
    output: 'record',
    inputSchema: 'cf.document@1',
    outputSchema: 'cf.document@1',
    settings: empty,
    execute: (v) => {
      const d = v as { title: string; body: string };
      return { title: d.title.trim(), body: d.body.trim() };
    }
  });
  r.registerTransform({
    id: 'record.text',
    version: 1,
    input: 'record',
    output: 'text',
    inputSchema: 'cf.document@1',
    settings: empty,
    execute: (v) => {
      const d = v as { title: string; body: string };
      return `${d.title}\n${d.body}`;
    }
  });
  r.registerTransform({
    id: 'image.identity',
    version: 1,
    input: 'image',
    output: 'image',
    settings: empty,
    execute: (v) => v
  });
  r.registerCapability({
    id: 'local.text-statistics',
    version: 1,
    adapter: 'local',
    status: 'implemented-local',
    effects: ['compute', 'managed-artifacts'],
    discoveredAt: '2026-10-24T00:00:00.000Z',
    input: 'text',
    output: 'record',
    outputSchema: 'cf.document-statistics@1',
    settings: empty,
    execute: (v) => {
      const s = v as string;
      return {
        characters: s.length,
        words: s.trim() ? s.trim().split(/\s+/u).length : 0,
        lines: s.split('\n').length
      };
    }
  });
  r.registerCapability({
    id: 'weave.plan',
    version: 1,
    adapter: 'weave',
    status: 'external-dependent',
    effects: ['network', 'spend'],
    discoveredAt: '2026-10-24T00:00:00.000Z',
    input: 'text',
    output: 'image',
    settings: empty,
    execute: () => {
      throw Error(
        'External execution unavailable; separate Weave quote/approval required'
      );
    }
  });
  return r;
}
export const defaultRegistry = createRegistry();
const supportedType = z.enum(['text', 'number', 'boolean', 'record', 'image']);
export const operationConfigSchemas = {
  'u.input': z
    .object({
      type: supportedType,
      value: z.unknown().optional(),
      artifactId: z.string().uuid().optional(),
      schemaRef: z.string().optional()
    })
    .strict(),
  'u.transform': z
    .object({
      transformId: z.string(),
      transformVersion: z.number().int().positive(),
      settings: z.record(z.string(), z.unknown()).default({})
    })
    .strict(),
  'u.invoke': z
    .object({
      capabilityId: z.string(),
      capabilityVersion: z.number().int().positive(),
      manifestHash: z.string().optional(),
      settings: z.record(z.string(), z.unknown()).default({})
    })
    .strict(),
  'u.output': z
    .object({
      mode: z.literal('return'),
      type: supportedType.default('text'),
      schemaRef: z.string().optional()
    })
    .strict()
};
const port = (id: string, type: ValueType, schemaRef?: string): UPort => ({
  id,
  type,
  ...(schemaRef ? { schemaRef } : {}),
  role: 'value',
  cardinality: 'single',
  required: true
});
export function definition(
  node: UNode,
  r = defaultRegistry
): {
  inputs: UPort[];
  outputs: UPort[];
  handler?: Handler;
  manifestHash?: string;
  blocked?: string;
  source?: { artifactId?: string; value?: unknown };
  alias?: boolean;
  settings?: Record<string, unknown>;
} {
  if (node.version !== 1) throw Error('Unknown operation version');
  if (node.kind === 'u.input') {
    const c = operationConfigSchemas['u.input'].parse(node.config);
    if (c.type !== 'record' && c.schemaRef)
      throw Error('Only record ports accept registered schemaRef');
    if (c.type === 'image') {
      if (!c.artifactId || c.value !== undefined)
        throw Error('Image Input requires managed artifactId');
    } else {
      if (c.artifactId) throw Error('Scalar cannot use artifactId');
      validateValue(c.type, c.value, c.schemaRef);
    }
    return {
      inputs: [],
      outputs: [port('value', c.type, c.schemaRef)],
      source:
        c.type === 'image' ? { artifactId: c.artifactId } : { value: c.value }
    };
  }
  if (node.kind === 'u.output') {
    if (node.config.type !== 'record' && node.config.schemaRef)
      throw Error('Only record ports accept registered schemaRef');
    if (
      node.config.type === 'record' &&
      (!node.config.schemaRef || !schemas[node.config.schemaRef as string])
    )
      throw Error('Unknown record schema');
    operationConfigSchemas['u.output'].parse(node.config);
    return {
      alias: true,
      inputs: [
        port(
          'input',
          (node.config.type ?? 'text') as ValueType,
          node.config.schemaRef as string | undefined
        )
      ],
      outputs: [
        port(
          'value',
          (node.config.type ?? 'text') as ValueType,
          node.config.schemaRef as string | undefined
        )
      ]
    };
  }
  if (node.kind === 'u.transform') {
    const c = operationConfigSchemas['u.transform'].parse(node.config);
    const h = r.transforms.get(`${c.transformId}@${c.transformVersion}`);
    if (!h) throw Error('Unknown transform');
    const settings = h.settings.parse(c.settings) as Record<string, unknown>;
    return {
      inputs: [port('input', h.input, h.inputSchema)],
      outputs: [port('value', h.output, h.outputSchema)],
      handler: h,
      settings
    };
  }
  if (node.kind === 'u.invoke') {
    const c = operationConfigSchemas['u.invoke'].parse(node.config);
    const h = r.capabilities.get(`${c.capabilityId}@${c.capabilityVersion}`);
    if (!h) throw Error('Unknown capability');
    const settings = h.settings.parse(c.settings) as Record<string, unknown>;
    const hash = digest(manifest(h));
    if (c.manifestHash && c.manifestHash !== hash)
      throw Error('Capability manifest changed');
    const blocked =
      h.status !== 'implemented-local'
        ? 'External capability requires separate approval/executor'
        : h.effects.some((e) => !['compute', 'managed-artifacts'].includes(e))
          ? 'Unsupported capability effects'
          : h.expiresAt && Date.parse(h.expiresAt) <= Date.now()
            ? 'Expired capability'
            : undefined;
    return {
      inputs: [port('input', h.input, h.inputSchema)],
      outputs: [port('value', h.output, h.outputSchema)],
      handler: h,
      settings,
      manifestHash: hash,
      blocked
    };
  }
  throw Error(`Unknown universal operation ${node.kind}`);
}
export function inspectDocument(raw: unknown, r = defaultRegistry) {
  const issues: { nodeId?: string; message: string }[] = [],
    parsed = documentSchema.safeParse(raw);
  if (!parsed.success)
    return {
      valid: false,
      readyToExecute: false,
      issues: [{ message: parsed.error.message }]
    };
  const g = parsed.data;
  let invalid = false;
  const fail = (message: string, nodeId?: string) => {
    invalid = true;
    issues.push({ ...(nodeId ? { nodeId } : {}), message });
  };
  const nodes = new Map<string, UNode>();
  for (const n of g.nodes)
    if (!Number.isFinite(n.position.x) || !Number.isFinite(n.position.y))
      fail('Position must be finite', n.id);
  const groups = new Set<string>();
  for (const group of g.groups) {
    if (groups.has(group.id)) fail('Duplicate group ID');
    groups.add(group.id);
    if (
      new Set(group.nodeIds).size !== group.nodeIds.length ||
      group.nodeIds.some((id) => !g.nodes.some((n) => n.id === id))
    )
      fail('Invalid group members');
  }
  const defs = new Map<string, ReturnType<typeof definition>>();
  for (const n of g.nodes) {
    if (nodes.has(n.id)) fail('Duplicate node ID', n.id);
    nodes.set(n.id, n);
    try {
      jsonValue(n.config);
      const d = definition(n, r);
      defs.set(n.id, d);
      if (d.blocked) issues.push({ nodeId: n.id, message: d.blocked });
    } catch (e) {
      fail(String(e), n.id);
    }
  }
  const ids = new Set<string>(),
    bound = new Set<string>();
  for (const e of g.edges) {
    if (ids.has(e.id)) fail('Duplicate edge ID');
    ids.add(e.id);
    const s = defs.get(e.source)?.outputs.find((p) => p.id === e.sourceHandle),
      t = defs.get(e.target)?.inputs.find((p) => p.id === e.targetHandle);
    if (!s || !t) fail('Unknown node or port', e.target);
    else if (
      s.type !== t.type ||
      s.schemaRef !== t.schemaRef ||
      s.role !== t.role ||
      s.cardinality !== t.cardinality
    )
      fail('Incompatible port type/schema/role/cardinality', e.target);
    const key = `${e.target}:${e.targetHandle}`;
    if (bound.has(key)) fail('Multiple bindings to single port', e.target);
    bound.add(key);
  }
  const visited = new Set<string>(),
    active = new Set<string>();
  const visit = (id: string) => {
    if (active.has(id)) {
      fail('Cycle detected', id);
      return;
    }
    if (visited.has(id)) return;
    active.add(id);
    for (const e of g.edges.filter((e) => e.source === id)) visit(e.target);
    active.delete(id);
    visited.add(id);
  };
  for (const n of g.nodes) visit(n.id);
  for (const n of g.nodes)
    for (const p of defs.get(n.id)?.inputs ?? [])
      if (p.required && !bound.has(`${n.id}:${p.id}`))
        issues.push({ nodeId: n.id, message: `Missing required port ${p.id}` });
  if (!g.nodes.length) issues.push({ message: 'Empty workflow' });
  return {
    valid: !invalid,
    readyToExecute: !invalid && !issues.length,
    issues
  };
}
export function validateDocument(raw: unknown, r = defaultRegistry) {
  jsonValue(raw);
  const result = inspectDocument(raw, r);
  if (!result.valid)
    throw Error(result.issues.map((i) => i.message).join('; '));
  return documentSchema.parse(raw);
}
export function catalog(r = defaultRegistry) {
  return {
    schemaVersion: 2,
    operations: [
      { kind: 'u.input', version: 1, defaults: { type: 'text', value: '' } },
      {
        kind: 'u.transform',
        version: 1,
        defaults: {
          transformId: 'text.normalize',
          transformVersion: 1,
          settings: {}
        }
      },
      {
        kind: 'u.invoke',
        version: 1,
        defaults: {
          capabilityId: 'local.text-statistics',
          capabilityVersion: 1,
          settings: {}
        }
      },
      {
        kind: 'u.output',
        version: 1,
        defaults: { mode: 'return', type: 'text' }
      }
    ],
    configSchemas: Object.fromEntries(
      Object.entries(operationConfigSchemas).map(([k, v]) => [
        k,
        z.toJSONSchema(v)
      ])
    ),
    portContract: {
      role: 'value',
      cardinality: 'single',
      output: 'value',
      input: 'input',
      resolution:
        'Input/Output config type+schemaRef; Transform/Invoke pinned registry manifest'
    },
    transforms: [...r.transforms.values()].map((h) => ({
      id: h.id,
      version: h.version,
      input: h.input,
      output: h.output,
      ...(h.inputSchema ? { inputSchema: h.inputSchema } : {}),
      ...(h.outputSchema ? { outputSchema: h.outputSchema } : {}),
      settingsSchema: z.toJSONSchema(h.settings)
    })),
    manifests: [...r.capabilities.values()].map((h) => ({
      ...manifest(h),
      hash: digest(manifest(h))
    })),
    schemas: Object.fromEntries(
      Object.entries(schemas).map(([k, s]) => [k, z.toJSONSchema(s)])
    ),
    recipes: [
      {
        id: 'local.document-analysis',
        version: 1,
        operations: ['u.input', 'u.transform', 'u.invoke', 'u.output']
      },
      {
        id: 'local.image-return',
        version: 1,
        operations: ['u.input', 'u.transform', 'u.output']
      }
    ]
  };
}
