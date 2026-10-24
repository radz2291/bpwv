import { z } from 'zod';
export const nodeSchema = z.object({
  id: z.string().min(1),
  kind: z.string(),
  version: z.number().int().positive(),
  label: z.string(),
  position: z.object({ x: z.number(), y: z.number() }),
  config: z.record(z.string(), z.unknown())
});
export const workflowSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(/^[a-zA-Z0-9_-]+$/),
  name: z.string().min(1),
  revision: z.number().int().nonnegative(),
  nodes: z.array(nodeSchema).max(500),
  edges: z
    .array(
      z.object({
        id: z.string(),
        source: z.string(),
        sourceHandle: z.string(),
        target: z.string(),
        targetHandle: z.string()
      })
    )
    .max(2000),
  groups: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        nodeIds: z.array(z.string()),
        version: z.number().int().positive()
      })
    )
    .default([])
});
export type Workflow = z.infer<typeof workflowSchema>;
export type FlowNode = z.infer<typeof nodeSchema>;
export type ScalarType =
  'text' | 'asset' | 'number' | 'boolean' | 'mask' | 'timeline' | 'record';
export type ValueType = ScalarType | 'assets' | `array:${ScalarType}`;
export type Port = { id: string; type: ValueType; required?: boolean };
export type Asset = {
  id: string;
  uri: string;
  mediaType: 'image' | 'video' | 'audio';
  sourceNodeId?: string;
  parentIds?: string[];
};
export type NodeState = {
  status: 'idle' | 'running' | 'completed' | 'pending' | 'failed' | 'blocked';
  outputs: Record<string, unknown>;
  error?: string;
  requestId?: string;
};
export interface NodeDefinition {
  kind: string;
  version: number;
  label: string;
  category: string;
  provider: 'local' | 'generative';
  inputs: Port[];
  outputs: Port[];
  defaults: Record<string, unknown>;
  configSchema?: z.ZodType;
  validate: (config: Record<string, unknown>) => void;
  execute: (ctx: {
    node: FlowNode;
    inputs: Record<string, unknown>;
    generate: (
      node: FlowNode,
      input: Record<string, unknown>
    ) => Promise<NodeState>;
  }) => Promise<NodeState>;
}
export class NodeRegistry {
  private definitions = new Map<string, NodeDefinition>();
  register(def: NodeDefinition) {
    const key = `${def.kind}@${def.version}`;
    if (this.definitions.has(key)) throw Error(`Duplicate node ${key}`);
    this.definitions.set(key, def);
  }
  get(kind: string, version = 1) {
    const def = this.definitions.get(`${kind}@${version}`);
    if (!def) throw Error(`Unknown node ${kind}@${version}`);
    return def;
  }
  list() {
    return [...this.definitions.values()];
  }
}
