// U0 experimental contracts. NOT imported by production registry, API or MCP.
import { z } from 'zod';
const id = z.string().min(1).max(200);
const version = z.number().int().positive();
const hash = z.string().regex(/^[a-f0-9]{64}$/);
export const primitiveSchema = z.enum([
  'Input',
  'Transform',
  'Invoke',
  'Branch',
  'Iterate',
  'Approve',
  'Subflow',
  'Output'
]);
export const scalarSchema = z.enum([
  'text',
  'number',
  'boolean',
  'record',
  'decision',
  'file',
  'image',
  'audio',
  'video',
  'mask',
  'timeline'
]);
export const typeSchema = z
  .object({
    kind: scalarSchema,
    collection: z.boolean().default(false),
    schemaRef: id.optional()
  })
  .strict();
export const portSchema = z
  .object({
    id,
    type: typeSchema,
    role: id,
    required: z.boolean(),
    minItems: z.number().int().nonnegative().default(1),
    maxItems: z.number().int().positive().default(1),
    ordered: z.boolean().default(true)
  })
  .strict()
  .refine(
    (p) => p.minItems <= p.maxItems && (p.type.collection || p.maxItems === 1),
    'Invalid cardinality'
  );
export const effectSchema = z.enum([
  'pure',
  'local-write',
  'external-read',
  'external-write',
  'paid'
]);
const json = z.json();
export const operationSchema = z
  .object({
    schemaVersion: z.literal(1),
    id,
    primitive: primitiveSchema,
    version,
    effect: effectSchema,
    inputs: z.array(portSchema),
    outputs: z.array(portSchema),
    config: z.record(z.string(), json)
  })
  .strict()
  .superRefine((op, ctx) => {
    for (const ports of [op.inputs, op.outputs])
      if (new Set(ports.map((p) => p.id)).size !== ports.length)
        ctx.addIssue({ code: 'custom', message: 'Duplicate port' });
  });
export const recipeSchema = z
  .object({
    schemaVersion: z.literal(1),
    id,
    version,
    revision: z.number().int().nonnegative(),
    operations: z.array(operationSchema).max(500),
    edges: z
      .array(
        z.object({ id, source: id, output: id, target: id, input: id }).strict()
      )
      .max(2000)
  })
  .strict();
export const artifactSchema = z
  .object({
    schemaVersion: z.literal(1),
    id,
    version,
    type: typeSchema,
    value: json,
    digest: hash,
    access: z.enum(['local', 'private', 'public']),
    parentIds: z.array(id),
    createdAt: z.iso.datetime(),
    origin: z
      .object({
        kind: z.enum(['imported', 'local-transform', 'external-reported']),
        runId: id,
        operationId: id,
        portId: id,
        attemptId: id,
        recipeRevision: z.number().int().nonnegative(),
        snapshotHash: hash,
        providerId: id.optional(),
        predictionId: id.optional()
      })
      .strict(),
    supersedes: id.optional()
  })
  .strict()
  .superRefine((a, ctx) => {
    if (
      a.origin.kind === 'external-reported' &&
      (!a.origin.providerId || !a.origin.predictionId)
    )
      ctx.addIssue({
        code: 'custom',
        message: 'External origin needs provider and actual job identity'
      });
    if (a.parentIds.includes(a.id))
      ctx.addIssue({
        code: 'custom',
        message: 'Artifact cannot parent itself'
      });
  });
export const parameterSchema = z
  .object({
    type: z.enum(['string', 'number', 'boolean']),
    required: z.boolean(),
    choices: z.array(json).optional(),
    minimum: z.number().optional(),
    maximum: z.number().optional()
  })
  .strict();
export const manifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    id,
    version,
    adapterId: id,
    providerModelId: id,
    status: z.enum(['fixture', 'external-dependent']),
    discoveredAt: z.iso.datetime(),
    expiresAt: z.iso.datetime(),
    provenance: id,
    effect: effectSchema,
    quoteMechanism: z.enum(['none', 'actual-provider-quote']),
    inputs: z.array(portSchema),
    outputs: z.array(portSchema),
    parameters: z.record(z.string(), parameterSchema)
  })
  .strict()
  .superRefine((m, ctx) => {
    if (Date.parse(m.expiresAt) <= Date.parse(m.discoveredAt))
      ctx.addIssue({ code: 'custom', message: 'Invalid discovery interval' });
    if (m.effect === 'paid' && m.quoteMechanism !== 'actual-provider-quote')
      ctx.addIssue({
        code: 'custom',
        message: 'Paid capability requires actual quotation'
      });
    for (const ports of [m.inputs, m.outputs])
      if (new Set(ports.map((p) => p.id)).size !== ports.length)
        ctx.addIssue({ code: 'custom', message: 'Duplicate manifest port' });
  });
export const invocationSchema = z
  .object({
    schemaVersion: z.literal(1),
    id,
    attemptId: id,
    idempotencyKey: id,
    manifestHash: hash,
    recipeRevision: z.number().int().nonnegative(),
    payloadHash: hash,
    status: z.enum(['blocked', 'awaiting-approval', 'pending-external']),
    externalCalls: z.literal(0),
    outputs: z.array(artifactSchema).length(0),
    reason: id
  })
  .strict();
export const approvalSchema = z
  .object({
    schemaVersion: z.literal(1),
    id,
    subjectHash: hash,
    manifestHash: hash,
    quoteId: id,
    quotedCost: z.number().nonnegative(),
    currency: id,
    authority: id,
    decision: z.enum(['approve', 'reject', 'revise']),
    decidedAt: z.iso.datetime(),
    expiresAt: z.iso.datetime(),
    revoked: z.boolean()
  })
  .strict();
export const iterationSchema = z
  .object({
    schemaVersion: z.literal(1),
    itemIds: z.array(id),
    maxItems: z.number().int().positive(),
    maxAttempts: z.number().int().positive(),
    concurrency: z.number().int().positive(),
    budget: z.number().nonnegative(),
    cancelled: z.boolean(),
    aggregation: z.enum(['all', 'partial']),
    childRecipe: z.object({ id, version, signatureHash: hash }).strict()
  })
  .strict()
  .refine(
    (i) =>
      new Set(i.itemIds).size === i.itemIds.length &&
      i.itemIds.length <= i.maxItems &&
      i.concurrency <= i.maxItems,
    'Invalid iteration bounds/identity'
  );
export const runSchema = z
  .object({
    schemaVersion: z.literal(1),
    id,
    recipe: recipeSchema,
    snapshotHash: hash,
    status: z.enum([
      'ready',
      'running',
      'pending-external',
      'awaiting-approval',
      'completed',
      'failed',
      'skipped',
      'cancelled',
      'blocked'
    ]),
    artifacts: z.array(artifactSchema),
    invocations: z.array(invocationSchema),
    events: z.array(
      z
        .object({
          sequence: z.number().int().nonnegative(),
          operationId: id,
          status: id
        })
        .strict()
    )
  })
  .strict();
export type Recipe = z.infer<typeof recipeSchema>;
export type Operation = z.infer<typeof operationSchema>;
export type Port = z.infer<typeof portSchema>;
export type Artifact = z.infer<typeof artifactSchema>;
export type Manifest = z.infer<typeof manifestSchema>;
export type Run = z.infer<typeof runSchema>;
