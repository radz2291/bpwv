import { randomUUID, createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
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
  contract: {
    inputs: Record<string, ModelField>;
    params: Record<string, ModelField>;
    outputs: Record<string, ModelField>;
  };
}
const discovery = JSON.parse(
  readFileSync('evidence/weave-discovery.json', 'utf8')
);
export const models: DiscoveredModel[] =
  discovery.response.structuredContent.candidates;
export interface ProviderAdapter {
  id: string;
  prepare: (
    node: FlowNode,
    inputs: Record<string, unknown>,
    context: { workflowId: string; runId: string }
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
      discoveredAt: discovery.discoveredAt,
      createdAt: new Date().toISOString(),
      cost: { estimate: model.costEstimate, quoted: null, approved: false },
      assetLineage: inputs.references ?? [],
      instructions:
        'Codex must refresh discovery before spending, obtain actual quote without acknowledgedCost, then structured Approve/Cancel. Never infer approval from this request.'
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
