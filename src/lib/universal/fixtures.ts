// Specifications and fixture manifests only, not production recipes or providers.
import { type Recipe, type Manifest, type Operation } from './contracts';
import { textPort } from './spike';
export function localRecipe(): Recipe {
  return {
    schemaVersion: 1,
    id: 'u0-local',
    version: 1,
    revision: 0,
    operations: [
      {
        schemaVersion: 1,
        id: 'in',
        primitive: 'Input',
        version: 1,
        effect: 'pure',
        inputs: [],
        outputs: [textPort('value')],
        config: { values: { value: 'hello workbench' } }
      },
      {
        schemaVersion: 1,
        id: 'transform',
        primitive: 'Transform',
        version: 1,
        effect: 'pure',
        inputs: [textPort('value')],
        outputs: [textPort('value')],
        config: { transform: 'text.uppercase@1' }
      },
      {
        schemaVersion: 1,
        id: 'out',
        primitive: 'Output',
        version: 1,
        effect: 'pure',
        inputs: [textPort('value')],
        outputs: [textPort('value')],
        config: {}
      }
    ],
    edges: [
      {
        id: 'a',
        source: 'in',
        output: 'value',
        target: 'transform',
        input: 'value'
      },
      {
        id: 'b',
        source: 'transform',
        output: 'value',
        target: 'out',
        input: 'value'
      }
    ]
  };
}
export function fixtureManifest(): Manifest {
  return {
    schemaVersion: 1,
    id: 'fixture.image-edit',
    version: 1,
    adapterId: 'fixture-no-executor',
    providerModelId: 'fixture-only',
    status: 'fixture',
    discoveredAt: '2026-10-23T00:00:00.000Z',
    expiresAt: '2026-10-25T00:00:00.000Z',
    provenance: 'U0 synthetic shape fixture; no model discovery claim',
    effect: 'paid',
    quoteMechanism: 'actual-provider-quote',
    inputs: [
      {
        id: 'images',
        type: { kind: 'image', collection: true },
        role: 'style-reference',
        required: true,
        minItems: 1,
        maxItems: 2,
        ordered: true
      }
    ],
    outputs: [
      {
        id: 'image',
        type: { kind: 'image', collection: false },
        role: 'candidate',
        required: true,
        minItems: 1,
        maxItems: 1,
        ordered: true
      }
    ],
    parameters: {
      quality: { type: 'string', required: false, choices: ['draft', 'final'] }
    }
  };
}
export function fixturePayload() {
  return {
    images: {
      role: 'style-reference',
      value: [{ mediaType: 'image', uri: '/api/assets/fixture-only' }]
    }
  };
}
export function iterationFixture() {
  return {
    schemaVersion: 1,
    itemIds: ['shot-1', 'shot-2'],
    maxItems: 2,
    maxAttempts: 3,
    concurrency: 1,
    budget: 0,
    cancelled: false,
    aggregation: 'all',
    childRecipe: {
      id: 'fixture-child',
      version: 1,
      signatureHash: '0'.repeat(64)
    }
  };
}
export function scenarios() {
  const domains: [string, Operation['primitive'][]][] = [
    [
      'illustration-review-refine',
      [
        'Input',
        'Transform',
        'Invoke',
        'Invoke',
        'Branch',
        'Approve',
        'Iterate',
        'Output'
      ]
    ],
    [
      'cinematic-production',
      ['Input', 'Transform', 'Iterate', 'Approve', 'Subflow', 'Output']
    ],
    [
      'research-report',
      ['Input', 'Invoke', 'Transform', 'Branch', 'Approve', 'Output']
    ],
    ['deterministic-media', ['Input', 'Transform', 'Branch', 'Output']]
  ];
  return domains.map(([id, primitives]) => ({
    status: 'specification-fixture' as const,
    recipe: {
      schemaVersion: 1 as const,
      id,
      version: 1,
      revision: 0,
      operations: primitives.map((primitive, i) => ({
        schemaVersion: 1 as const,
        id: `step-${i}`,
        primitive,
        version: 1,
        effect: 'pure' as const,
        inputs: i ? [textPort('value')] : [],
        outputs: [textPort('value')],
        config: {
          note: 'Structural vocabulary fixture only; domain semantics documented in U0 assessment'
        }
      })),
      edges: primitives
        .slice(1)
        .map((_, i) => ({
          id: `edge-${i}`,
          source: `step-${i}`,
          output: 'value',
          target: `step-${i + 1}`,
          input: 'value'
        }))
    }
  }));
}
