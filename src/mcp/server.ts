import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { nodeSchema } from '../lib/contract';
import {
  workflowService,
  WorkflowService,
  ServiceError,
  transactionSchema,
  edgeSchema,
  assetAssociationSchema,
  anyWorkflowSchema,
  type AnyWorkflow
} from '../lib/server/workflow-service';
export type Access = 'read' | 'write';
const id = z.string().min(1),
  revision = z.number().int().nonnegative();
const selection = z.object({ workflowId: id });
const edit = selection.extend({ expectedRevision: revision });
const workflowOutput = z.object({
  workflow: anyWorkflowSchema,
  url: z.string().url()
});
const stateSchema = z.object({
  status: z.enum([
    'idle',
    'running',
    'completed',
    'pending',
    'failed',
    'blocked'
  ]),
  outputs: z.record(z.string(), z.unknown()),
  error: z.string().optional(),
  requestId: z.string().optional()
});
export const runSchema = z.object({
  id,
  workflowId: id,
  workflowRevision: revision,
  graphSnapshot: anyWorkflowSchema,
  states: z.record(z.string(), stateSchema),
  createdAt: z.string()
});
const associatedAsset = assetAssociationSchema.extend({
  workflowId: id,
  sourceNodeId: id,
  associatedAt: z.string()
});
const valueType = z.enum(['text', 'number', 'boolean', 'record', 'image']);
const handlerDescriptor = z.object({
  id: z.string(),
  version: z.number().int().positive(),
  input: valueType,
  output: valueType,
  inputSchema: z.string().optional(),
  outputSchema: z.string().optional(),
  settingsSchema: z.record(z.string(), z.unknown())
});
const catalogSchema = z.object({
  schemaVersion: z.literal(2),
  configSchemas: z.record(z.string(), z.record(z.string(), z.unknown())),
  portContract: z.object({
    role: z.literal('value'),
    cardinality: z.literal('single'),
    output: z.literal('value'),
    input: z.literal('input'),
    resolution: z.string()
  }),
  operations: z.array(
    z
      .object({
        kind: z.string(),
        version: z.number().int().positive(),
        defaults: z.record(z.string(), z.unknown()),
        configSchema: z.record(z.string(), z.unknown()).optional()
      })
      .passthrough()
  ),
  transforms: z.array(handlerDescriptor),
  manifests: z.array(
    handlerDescriptor.extend({
      adapter: z.string(),
      status: z.enum(['implemented-local', 'external-dependent']),
      effects: z.array(z.string()),
      discoveredAt: z.string(),
      expiresAt: z.string().optional(),
      hash: z.string()
    })
  ),
  schemas: z.record(z.string(), z.record(z.string(), z.unknown())),
  recipes: z.array(
    z.object({
      id: z.string(),
      version: z.number().int().positive(),
      operations: z.array(z.string())
    })
  )
});

const artifactSchema = z
  .object({
    id: z.string(),
    familyId: z.string(),
    version: z.number().int().positive(),
    previousId: z.string().optional(),
    type: z.enum(['text', 'number', 'boolean', 'record', 'image']),
    schemaRef: z.string().optional(),
    value: z.unknown(),
    contentHash: z.string(),
    parents: z.array(z.object({ artifactId: z.string(), role: z.string() })),
    workflowId: z.string(),
    revision: z.number(),
    runId: z.string(),
    attemptId: z.string(),
    nodeId: z.string(),
    outputPort: z.string(),
    snapshotHash: z.string(),
    provenance: z.string(),
    createdAt: z.string(),
    byteLength: z.number().optional(),
    mime: z.string().optional()
  })
  .passthrough();
const universalRunSchema = z
  .object({
    id: z.string(),
    workflowId: z.string(),
    revision: z.number(),
    status: z.string(),
    snapshot: anyWorkflowSchema,
    snapshotHash: z.string(),
    semanticHash: z.string(),
    contracts: z.record(z.string(), z.string()),
    states: z.record(
      z.string(),
      z
        .object({
          status: z.string(),
          outputs: z.record(z.string(), artifactSchema),
          error: z.string().optional()
        })
        .passthrough()
    ),
    attempts: z.array(
      z
        .object({ id: z.string(), nodeId: z.string(), status: z.string() })
        .passthrough()
    ),
    createdAt: z.string(),
    completedAt: z.string().optional()
  })
  .passthrough();

export function createAuthoringServer(
  access: Access = 'read',
  service: WorkflowService = workflowService
) {
  const server = new McpServer(
    { name: 'creative-flow-authoring', version: '1.2.0' },
    {
      instructions:
        'Author Creative Flow graphs directly. Discover universal_catalog first. New workflows default to schemaVersion 2 in the single universal workbench. node_types is retained for legacy contract inspection. Universal local execution additionally requires an explicit process effect policy. Reuse stable IDs and current revisions. apply_changes atomically persists a batch. Never overwrite a conflict: retrieve and reconcile. Authoring needs no Codex, browser, model credentials or model calls. Asset association records provenance metadata, never proves generation. Weave generation remains a separate approved provider process. execute_local refuses any generative node.'
    }
  );
  function tool<I extends z.ZodRawShape, O extends z.ZodRawShape>(
    name: string,
    description: string,
    input: z.ZodObject<I>,
    output: z.ZodObject<O>,
    write: boolean,
    fn: (args: z.infer<z.ZodObject<I>>) => unknown | Promise<unknown>,
    destructive = false
  ) {
    if (write && access !== 'write') return;
    server.registerTool<z.ZodObject<O>, z.ZodObject<I>>(
      name,
      {
        description,
        inputSchema: input,
        outputSchema: output,
        annotations: {
          readOnlyHint: !write,
          destructiveHint: destructive,
          idempotentHint: !write,
          openWorldHint: false
        }
      },
      async (args) => {
        try {
          if (write && access !== 'write')
            throw new ServiceError('FORBIDDEN', 'Write permission required');
          const parsed = output.parse(await fn(input.parse(args)));
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(parsed) }],
            structuredContent: parsed
          };
        } catch (e) {
          return {
            isError: true,
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({
                  code: e instanceof ServiceError ? e.code : 'INVALID',
                  message: e instanceof Error ? e.message : String(e)
                })
              }
            ]
          };
        }
      }
    );
  }
  const packed = (workflow: AnyWorkflow) => ({
    workflow,
    url: service.url(workflow.id)
  });
  tool(
    'node_types',
    'Discover versioned node kinds, typed ports, defaults, JSON configuration schemas and capability status. Draft model settings do not authorize a run.',
    z.object({}),
    z.object({
      nodes: z.array(
        z.object({
          kind: id,
          version: z.number().int().positive(),
          label: z.string(),
          category: z.string(),
          provider: z.enum(['local', 'generative']),
          inputs: z.array(
            z.object({ id, type: z.string(), required: z.boolean().optional() })
          ),
          outputs: z.array(
            z.object({ id, type: z.string(), required: z.boolean().optional() })
          ),
          defaults: z.record(z.string(), z.unknown()),
          configSchema: z.record(z.string(), z.unknown()),
          capability: z.string()
        })
      ),
      workflowSchema: z.record(z.string(), z.unknown())
    }),
    false,
    () => ({
      nodes: service.catalog(),
      workflowSchema: z.toJSONSchema(anyWorkflowSchema)
    })
  );
  tool(
    'list_workflows',
    'List durable workflows with current revisions and editor URLs.',
    z.object({}),
    z.object({
      workflows: z.array(
        z.object({ id, name: z.string(), revision, url: z.string().url() })
      )
    }),
    false,
    () => ({ workflows: service.list() })
  );
  tool(
    'get_workflow',
    'Retrieve/reopen the complete persisted graph and its visual editor URL.',
    selection,
    workflowOutput,
    false,
    (a) => packed(service.get(a.workflowId))
  );
  tool(
    'validate_workflow',
    'Validate identities, typed ports, dependencies, cycles, configurations and groups without saving or executing. Incomplete drafts have readiness issues.',
    z.object({ workflow: anyWorkflowSchema }),
    z.object({
      valid: z.boolean(),
      readyToExecute: z.boolean(),
      issues: z.array(z.object({ nodeId: id.optional(), message: z.string() }))
    }),
    false,
    (a) => service.inspect(a.workflow)
  );
  tool(
    'get_execution',
    'Retrieve latest persisted run, node states and originating asset associations. Authoring does not call a model.',
    selection,
    z.object({
      workflowId: id,
      revision,
      url: z.string().url(),
      run: z.union([runSchema, universalRunSchema]).nullable(),
      assets: z.array(associatedAsset)
    }),
    false,
    (a) => service.execution(a.workflowId)
  );
  tool(
    'get_assets',
    'Retrieve durable asset associations and their originating nodes, run IDs and declared provenance.',
    selection,
    z.object({ assets: z.array(associatedAsset) }),
    false,
    (a) => ({ assets: service.assets(a.workflowId) })
  );
  tool(
    'create_workflow',
    'Create and save a universal schemaVersion 2 workflow by default. Explicit schemaVersion 1 is reserved for legacy compatibility tests/imports; the legacy editor is retired. Existing IDs fail.',
    z.object({
      id: id.regex(/^[a-zA-Z0-9_-]+$/).optional(),
      name: z.string().min(1),
      schemaVersion: z.union([z.literal(1), z.literal(2)]).default(2)
    }),
    workflowOutput,
    true,
    (a) => packed(service.create(a))
  );
  tool(
    'apply_changes',
    'Atomically apply and save an ordered graph-change batch with one revision increment. Any validation error or conflict rolls back all graph and asset changes. Supports add/configure/remove/connect/disconnect, rename and groups.',
    transactionSchema,
    workflowOutput,
    true,
    (a) => packed(service.apply(a)),
    true
  );
  tool(
    'save_workflow',
    'Save a complete graph with explicit expectedRevision. Retrieve before replacing a graph. Cannot overwrite a newer revision.',
    z.object({ workflow: anyWorkflowSchema, expectedRevision: revision }),
    workflowOutput,
    true,
    (a) => {
      if (a.expectedRevision !== a.workflow.revision)
        throw new ServiceError(
          'CONFLICT',
          'expectedRevision must match workflow.revision'
        );
      return packed(service.save(a.workflow));
    },
    true
  );
  tool(
    'add_node',
    'Add and persist one stable node ID using a discovered kind/version. Defaults fill missing configuration.',
    edit.extend({ node: nodeSchema }),
    workflowOutput,
    true,
    (a) =>
      packed(
        service.apply({ ...a, changes: [{ op: 'add_node', node: a.node }] })
      )
  );
  tool(
    'configure_node',
    'Merge configuration, optionally rename/reposition, then save at expectedRevision. Use apply_changes for atomic multi-node edits.',
    edit.extend({
      nodeId: id,
      config: z.record(z.string(), z.unknown()),
      label: z.string().optional(),
      position: z.object({ x: z.number(), y: z.number() }).optional()
    }),
    workflowOutput,
    true,
    (a) =>
      packed(service.apply({ ...a, changes: [{ ...a, op: 'configure_node' }] }))
  );
  tool(
    'remove_node',
    'Remove a node, its edges, group membership and asset associations transactionally. Existing run snapshots remain historical.',
    edit.extend({ nodeId: id }),
    workflowOutput,
    true,
    (a) =>
      packed(
        service.apply({
          ...a,
          changes: [{ op: 'remove_node', nodeId: a.nodeId }]
        })
      ),
    true
  );
  tool(
    'connect_nodes',
    'Persist one typed edge. Reject incompatible ports, duplicate input connections and cycles.',
    edit.extend({ edge: edgeSchema }),
    workflowOutput,
    true,
    (a) =>
      packed(
        service.apply({ ...a, changes: [{ op: 'connect', edge: a.edge }] })
      )
  );
  tool(
    'disconnect_nodes',
    'Remove an existing connection by stable edge ID and save at expectedRevision.',
    edit.extend({ edgeId: id }),
    workflowOutput,
    true,
    (a) =>
      packed(
        service.apply({
          ...a,
          changes: [{ op: 'disconnect', edgeId: a.edgeId }]
        })
      ),
    true
  );
  tool(
    'associate_asset',
    'Associate a real imported or externally reported asset with an originating node and optional run. Preserves declared provenance; never marks a model run completed or spends credits.',
    edit.extend({ nodeId: id, asset: assetAssociationSchema }),
    z.object({ workflow: anyWorkflowSchema, asset: associatedAsset }),
    true,
    (a) =>
      service.associate(a.workflowId, a.expectedRevision, a.nodeId, a.asset)
  );
  tool(
    'execute_local',
    'Execute and persist a wholly deterministic local workflow at an exact revision. Refuses graphs containing any generative node. No Weave generation request or model call is made.',
    edit,
    z.object({ run: runSchema }),
    true,
    async (a) => ({
      run: await service.executeLocal(a.workflowId, a.expectedRevision)
    })
  );

  tool(
    'universal_catalog',
    'Discover U1 versioned universal operations, trusted schemas, transform contracts, capability manifests and reusable recipes. External plans cannot execute.',
    z.object({}),
    z.object({
      catalog: catalogSchema,
      allowLocalExecution: z.boolean()
    }),
    false,
    () => ({
      catalog: service.universalCatalog(),
      allowLocalExecution: service.localAllowed()
    })
  );
  tool(
    'create_universal',
    'Create a schemaVersion 2 workflow in the same authoritative workflow store. No automatic conversion.',
    z.object({ id: id.regex(/^[a-zA-Z0-9_-]+$/).optional(), name: id }),
    workflowOutput,
    true,
    (a) => packed(service.createUniversal(a))
  );
  tool(
    'list_universal_runs',
    'Read durable universal run snapshots, attempts and versioned artifact outputs; no replay.',
    selection,
    z.object({ runs: z.array(universalRunSchema) }),
    false,
    (a) => ({ runs: service.universalRuns(a.workflowId) })
  );
  tool(
    'get_artifact',
    'Read and verify an immutable artifact version and its lineage. Corrupt or missing bytes fail visibly.',
    z.object({ artifactId: id }),
    z.object({ artifact: artifactSchema }),
    false,
    (a) => ({ artifact: service.universalArtifact(a.artifactId) })
  );
  tool(
    'import_image',
    'Import bounded base64 PNG bytes into managed local storage. Requires write AND separate managed-local execution policy; no paths or remote URLs.',
    z.object({ base64: z.string().max(12 * 1024 * 1024), name: id.max(255) }),
    z.object({ artifact: artifactSchema }),
    true,
    (a) => ({ artifact: service.importUniversalImage(a) })
  );
  tool(
    'execute_universal',
    'Execute a saved universal workflow under the separately configured managed-local policy and write grant. No network, arbitrary file export or paid generation. Idempotency key binds an exact saved revision.',
    edit.extend({ idempotencyKey: id.max(200) }),
    z.object({ run: universalRunSchema }),
    true,
    async (a) => ({
      run: await service.executeUniversal(
        a.workflowId,
        a.expectedRevision,
        a.idempotencyKey
      )
    })
  );
  return server;
}
