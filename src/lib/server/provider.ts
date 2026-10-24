import { randomUUID, createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { db } from './store';
import type { FlowNode, NodeState } from '../contract';
export interface ModelField {
  type: string;
  required?: boolean;
  options?: unknown[];
  default?: unknown;
  maxItems?: number;
  min?: number;
  max?: number;
}
export interface DiscoveredModel {
  id: string;
  label: string;
  modelId: string;
  costEstimate: number;
  discoveredAt?: string;
  discoverySource?: string;
  snapshotFile?: string;
  contract: {
    inputs: Record<string, ModelField>;
    params: Record<string, ModelField>;
    outputs: Record<string, ModelField>;
  };
}
const snapshots: string[] = existsSync('evidence/weave-model-catalog.json')
  ? JSON.parse(readFileSync('evidence/weave-model-catalog.json', 'utf8'))
      .snapshots
  : ['weave-discovery.json'];
const catalog = new Map<string, DiscoveredModel>();
for (const file of snapshots) {
  if (!/^[a-zA-Z0-9_.-]+\.json$/.test(file))
    throw Error('Invalid discovery snapshot path');
  const snapshot = JSON.parse(readFileSync(`evidence/${file}`, 'utf8'));
  const content = snapshot.response.structuredContent;
  for (const model of content.model
    ? [content.model]
    : (content.candidates ?? []))
    catalog.set(model.id, {
      ...model,
      discoveredAt: snapshot.discoveredAt,
      discoverySource: snapshot.source,
      snapshotFile: file
    });
}
export const models = [...catalog.values()];
export interface ProviderAdapter {
  id: string;
  prepare: (
    node: FlowNode,
    inputs: Record<string, unknown>,
    context: {
      workflowId: string;
      runId: string;
      workflowRevision?: number;
      workflowHash?: string;
    }
  ) => Promise<NodeState>;
}
export function validateModelInput(
  model: DiscoveredModel,
  input: Record<string, unknown>
) {
  const fields = { ...model.contract.inputs, ...model.contract.params };
  for (const key of Object.keys(input))
    if (!fields[key]) throw Error(`Unsupported model field ${key}`);
  for (const [key, field] of Object.entries(fields)) {
    const value = input[key];
    if (value === undefined) {
      if (field.required) throw Error(`Required model field ${key}`);
      continue;
    }
    if (field.options && !field.options.includes(value))
      throw Error(`Invalid ${key}`);
    const values = Array.isArray(value) ? value : [value];
    if (
      Array.isArray(value) &&
      (!field.maxItems || value.length > field.maxItems)
    )
      throw Error(`Invalid reference cardinality ${key}`);
    for (const v of values) {
      if (
        ['text', 'enum', 'fal_image_size', 'lora'].includes(field.type) &&
        typeof v !== 'string'
      )
        throw Error(`Expected string ${key}`);
      if (
        ['number', 'integer', 'seed'].includes(field.type) &&
        (typeof v !== 'number' ||
          !Number.isFinite(v) ||
          (field.type !== 'number' && !Number.isInteger(v)) ||
          (field.min !== undefined && v < field.min) ||
          (field.max !== undefined && v > field.max))
      )
        throw Error(`Invalid number ${key}`);
      if (field.type === 'boolean' && typeof v !== 'boolean')
        throw Error(`Invalid boolean ${key}`);
      if (
        ['image', 'video', 'audio'].includes(field.type) &&
        !(typeof v === 'string' && v.startsWith('https://')) &&
        !(typeof v === 'object' && v !== null && 'uri' in v)
      )
        throw Error(`Invalid media ${key}`);
    }
  }
}
export const weaveBridge: ProviderAdapter = {
  id: 'weave-codex',
  async prepare(node, inputs, context) {
    const model = models.find((m) => m.id === node.config.modelId);
    if (!model) throw Error('Model not in discovered catalog');
    const input: Record<string, unknown> = {
      ...(node.config.params as Record<string, unknown>),
      prompt: inputs.prompt
    };
    if (inputs.references) {
      const field = Object.entries(model.contract.inputs).find(
        ([, f]) => f.type === 'image'
      );
      if (!field) throw Error('Model does not accept image references');
      if (
        (inputs.references as import('../contract').Asset[]).some(
          (a) => a.mediaType !== 'image'
        )
      )
        throw Error('This model reference input accepts images only');
      input[field[0]] = field[1].maxItems
        ? inputs.references
        : (inputs.references as unknown[])[0];
      if (!field[1].maxItems && (inputs.references as unknown[]).length > 1)
        throw Error('Model accepts one reference');
    }
    validateModelInput(model, input);
    const id = randomUUID();
    const document = {
      schemaVersion: 1,
      id,
      ...context,
      nodeId: node.id,
      status: 'pending',
      provider: this.id,
      model: { id: model.id, label: model.label, modelId: model.modelId },
      contract: model.contract,
      input,
      promptSnapshot: inputs.prompt,
      inputHash: createHash('sha256')
        .update(JSON.stringify(input))
        .digest('hex'),
      discoveredAt: model.discoveredAt,
      discoverySource: model.discoverySource,
      discoverySnapshot: model.snapshotFile,
      createdAt: new Date().toISOString(),
      cost: { estimate: model.costEstimate, quoted: null, approved: false },
      assetLineage: inputs.references ?? [],
      providerInput: (
        inputs.references as import('../contract').Asset[] | undefined
      )?.some((a) => a.uri.startsWith('/api/assets/'))
        ? null
        : Object.fromEntries(
            Object.entries(input).map(([k, v]) => [
              k,
              k in model.contract.inputs &&
              model.contract.inputs[k].type === 'image'
                ? Array.isArray(v)
                  ? v.map((a) =>
                      typeof a === 'object' && a !== null && 'uri' in a
                        ? a.uri
                        : a
                    )
                  : typeof v === 'object' && v !== null && 'uri' in v
                    ? v.uri
                    : v
                : v
            ])
          ),
      mediaResolution: {
        status: (
          inputs.references as import('../contract').Asset[] | undefined
        )?.some((a) => a.uri.startsWith('/api/assets/'))
          ? 'upload_required'
          : 'ready',
        mappings: []
      },
      costPolicy: {
        stopAtOrAbove: 5,
        requiresFreshQuote: true,
        requiresStructuredUserApproval: true
      },
      nodeSnapshot: node,
      instructions:
        'Resolve/upload local media through the official Figma Weave upload mechanism before quoting. Never pass /api/assets paths as Weave URLs. Refresh discovery, quote without acknowledgedCost, stop if actual quote >= 5 credits, then obtain structured Approve/Cancel before ONE submitted run. Refinement is separate. Never infer approval from this request.'
    };
    db.prepare('INSERT INTO requests VALUES(?,?)').run(
      id,
      JSON.stringify(document)
    );
    mkdirSync('data/requests', { recursive: true });
    writeFileSync(
      `data/requests/${id}.json`,
      JSON.stringify(document, null, 2)
    );
    return { status: 'pending', outputs: {}, requestId: id };
  }
};
