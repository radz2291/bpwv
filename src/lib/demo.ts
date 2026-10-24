import type { Workflow } from './contract';
export function demo(): Workflow {
  return {
    schemaVersion: 1,
    id: 'first-light',
    name: 'First light · image study',
    revision: 0,
    groups: [],
    nodes: [
      {
        id: 'scene',
        kind: 'text',
        version: 1,
        label: 'Scene text',
        position: { x: 40, y: 50 },
        config: { text: 'A quiet mountain observatory at dawn.' }
      },
      {
        id: 'style',
        kind: 'text',
        version: 1,
        label: 'Style text',
        position: { x: 40, y: 290 },
        config: {
          text: 'Soft natural light, restrained colors, editorial photography.'
        }
      },
      {
        id: 'combine',
        kind: 'combine',
        version: 1,
        label: 'Combine prompt',
        position: { x: 370, y: 170 },
        config: { separator: '\n\n' }
      },
      {
        id: 'model',
        kind: 'weave',
        version: 1,
        label: 'Weave model',
        position: { x: 700, y: 170 },
        config: { modelId: '', params: {} }
      },
      {
        id: 'preview',
        kind: 'preview',
        version: 1,
        label: 'Image preview',
        position: { x: 1030, y: 170 },
        config: {}
      }
    ],
    edges: [
      {
        id: 'scene-combine',
        source: 'scene',
        sourceHandle: 'text',
        target: 'combine',
        targetHandle: 'scene'
      },
      {
        id: 'style-combine',
        source: 'style',
        sourceHandle: 'text',
        target: 'combine',
        targetHandle: 'style'
      },
      {
        id: 'prompt-model',
        source: 'combine',
        sourceHandle: 'text',
        target: 'model',
        targetHandle: 'prompt'
      },
      {
        id: 'model-preview',
        source: 'model',
        sourceHandle: 'asset',
        target: 'preview',
        targetHandle: 'asset'
      }
    ]
  };
}
