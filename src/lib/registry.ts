import { NodeRegistry, type NodeDefinition, type Asset } from './contract';
import { z } from 'zod';
const complete = (outputs: Record<string, unknown>) => ({
  status: 'completed' as const,
  outputs
});
const text = (v: unknown) => {
  if (typeof v !== 'string') throw Error('Expected text');
  return v;
};
const importedAsset = (node: import('./contract').FlowNode): Asset => ({
  id: String(node.config.assetId || node.config.id || node.id),
  uri: String(node.config.uri),
  mediaType: node.config.mediaType as Asset['mediaType'],
  sourceNodeId: node.id,
  parentIds: [],
  name: String(node.config.name || node.config.assetId || node.id),
  provenance: 'imported'
});
const referenceOutputs = (inputs: Record<string, unknown>) => ({
  references: [
    ...((inputs.existing as Asset[] | undefined) ?? []),
    inputs.asset as Asset
  ]
});
export const registry = new NodeRegistry();
const definitions: NodeDefinition[] = [
  {
    kind: 'text',
    version: 1,
    label: 'Text',
    category: 'Text & LLM',
    provider: 'local',
    inputs: [],
    outputs: [{ id: 'text', type: 'text' }],
    defaults: { text: '' },
    validate: (c) => {
      text(c.text);
    },
    execute: async ({ node }) => complete({ text: text(node.config.text) })
  },
  {
    kind: 'combine',
    version: 1,
    label: 'Combine',
    category: 'Text & LLM',
    provider: 'local',
    inputs: [
      { id: 'scene', type: 'text', required: true },
      { id: 'style', type: 'text', required: true }
    ],
    outputs: [{ id: 'text', type: 'text' }],
    defaults: { separator: '\n\n' },
    validate: (c) => {
      text(c.separator);
    },
    execute: async ({ node, inputs }) =>
      complete({
        text: [text(inputs.scene), text(inputs.style)].join(
          text(node.config.separator)
        )
      })
  },
  {
    kind: 'asset',
    version: 1,
    label: 'Asset Input',
    category: 'Import & export',
    provider: 'local',
    inputs: [],
    outputs: [{ id: 'asset', type: 'asset' }],
    defaults: { uri: '', mediaType: 'image' },
    project: ({ node }) =>
      node.config.uri ? { asset: importedAsset(node) } : {},
    validate: (c) => {
      if (!['image', 'video', 'audio'].includes(String(c.mediaType)))
        throw Error('Invalid media type');
      if (
        typeof c.uri !== 'string' ||
        !/^(https:\/\/|\/api\/assets\/)/.test(c.uri)
      )
        throw Error('Upload a local asset or provide an HTTPS URL');
    },
    execute: async ({ node }) => complete({ asset: importedAsset(node) })
  },
  {
    kind: 'reference_set',
    version: 1,
    label: 'Reference Set',
    category: 'Import & export',
    provider: 'local',
    inputs: [
      { id: 'asset', type: 'asset', required: true },
      { id: 'existing', type: 'assets' }
    ],
    outputs: [{ id: 'references', type: 'assets' }],
    defaults: {},
    validate: () => {},
    project: ({ inputs }) => (inputs.asset ? referenceOutputs(inputs) : {}),
    execute: async ({ inputs }) => complete(referenceOutputs(inputs))
  },
  {
    kind: 'weave',
    version: 1,
    label: 'Weave Model',
    category: 'AI generation',
    provider: 'generative',
    inputs: [
      { id: 'prompt', type: 'text', required: true },
      { id: 'references', type: 'assets' }
    ],
    outputs: [{ id: 'asset', type: 'asset' }],
    defaults: { modelId: '', params: {} },
    validate: (c) => {
      if (!c.modelId) throw Error('Choose a discovered model');
    },
    execute: async ({ node, inputs, generate }) => generate(node, inputs)
  },
  {
    kind: 'preview',
    version: 1,
    label: 'Preview',
    category: 'Import & export',
    provider: 'local',
    inputs: [{ id: 'asset', type: 'asset', required: true }],
    outputs: [{ id: 'asset', type: 'asset' }],
    defaults: {},
    validate: () => {},
    project: ({ inputs }) => (inputs.asset ? { asset: inputs.asset } : {}),
    execute: async ({ inputs }) => complete({ asset: inputs.asset })
  },
  {
    kind: 'refinement',
    version: 1,
    label: 'Refinement',
    category: 'Text & LLM',
    provider: 'local',
    inputs: [{ id: 'prompt', type: 'text', required: true }],
    outputs: [{ id: 'text', type: 'text' }],
    defaults: { notes: '' },
    validate: (c) => {
      text(c.notes);
    },
    execute: async ({ node, inputs }) =>
      complete({
        text: [text(inputs.prompt), text(node.config.notes)]
          .filter(Boolean)
          .join('\n\nRefinement:\n')
      })
  }
];
const configSchemas: Record<string, z.ZodType> = {
  text: z.object({ text: z.string() }).passthrough(),
  combine: z.object({ separator: z.string() }).passthrough(),
  asset: z
    .object({
      uri: z.string(),
      mediaType: z.enum(['image', 'video', 'audio']),
      assetId: z.string().optional()
    })
    .passthrough(),
  weave: z
    .object({ modelId: z.string(), params: z.record(z.string(), z.unknown()) })
    .passthrough(),
  preview: z.object({}).passthrough(),
  reference_set: z.object({}).passthrough(),
  refinement: z.object({ notes: z.string() }).passthrough()
};
definitions.forEach((d) =>
  registry.register({ ...d, configSchema: configSchemas[d.kind] })
);
