import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { db, dataDirectory } from './store';
import {
  WorkbenchRuntime,
  documentSchema as universalDocumentSchema,
  validateDocument,
  inspectDocument,
  definition as universalDefinition,
  catalog as workbenchCatalog,
  type UniversalWorkflow
} from '../workbench';
import { registry } from '../registry';
import { validateGraph, execute } from '../engine';
import {
  workflowSchema,
  nodeSchema,
  type Workflow,
  type NodeRegistry
} from '../contract';

export const anyWorkflowSchema = z.union([
  workflowSchema,
  universalDocumentSchema
]);
export type AnyWorkflow = Workflow | UniversalWorkflow;
export class ServiceError extends Error {
  constructor(
    public code: 'NOT_FOUND' | 'CONFLICT' | 'INVALID' | 'FORBIDDEN',
    message: string
  ) {
    super(message);
  }
}
export const edgeSchema = workflowSchema.shape.edges.element;
export const assetAssociationSchema = z.object({
  id: z.string().min(1),
  uri: z.string().regex(/^(https:\/\/|\/api\/assets\/)/),
  mediaType: z.enum(['image', 'video', 'audio']),
  parentIds: z.array(z.string()).default([]),
  runId: z.string().optional(),
  provenance: z.enum(['external-reported', 'imported']),
  predictionId: z.string().optional()
});
export const changeSchema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('add_node'), node: nodeSchema }),
  z.object({
    op: z.literal('configure_node'),
    nodeId: z.string(),
    config: z.record(z.string(), z.unknown()),
    label: z.string().optional(),
    position: z.object({ x: z.number(), y: z.number() }).optional()
  }),
  z.object({ op: z.literal('remove_node'), nodeId: z.string() }),
  z.object({ op: z.literal('connect'), edge: edgeSchema }),
  z.object({ op: z.literal('disconnect'), edgeId: z.string() }),
  z.object({ op: z.literal('rename_workflow'), name: z.string().min(1) }),
  z.object({ op: z.literal('set_groups'), groups: workflowSchema.shape.groups })
]);
export const transactionSchema = z.object({
  workflowId: z.string(),
  expectedRevision: z.number().int().nonnegative(),
  changes: z.array(changeSchema).min(1).max(1000)
});
export type Change = z.infer<typeof changeSchema>;
export class WorkflowService {
  constructor(
    private connection: DatabaseSync = db,
    private nodes: NodeRegistry = registry,
    private baseUrl = process.env.CREATIVE_FLOW_APP_URL ??
      'http://127.0.0.1:5173',
    private localPolicy: {
      dataDirectory?: string;
      allowLocalExecution?: boolean;
    } = {}
  ) {}
  private runtimeInstance?: WorkbenchRuntime;
  private runtime() {
    return (this.runtimeInstance ??= new WorkbenchRuntime(
      this.connection,
      this.localPolicy.dataDirectory ?? dataDirectory,
      { allowLocal: this.localAllowed() }
    ));
  }
  localAllowed() {
    return (
      this.localPolicy.allowLocalExecution ??
      process.env.CREATIVE_FLOW_ALLOW_LOCAL_EXECUTION === '1'
    );
  }
  universalCatalog() {
    return workbenchCatalog();
  }
  universalRuns(id: string) {
    this.get(id);
    return this.runtime().runs(id);
  }
  universalArtifact(id: string) {
    return this.runtime().artifact(id);
  }
  universalContent(id: string) {
    return this.runtime().content(id);
  }
  importUniversalImage(input: { base64: string; name: string }) {
    if (!this.localAllowed())
      throw new ServiceError(
        'FORBIDDEN',
        'Managed-local execution policy is disabled'
      );
    return this.runtime().importImage(input);
  }
  createUniversal(input: { id?: string; name: string }) {
    return this.save({
      schemaVersion: 2,
      id: input.id ?? randomUUID(),
      name: input.name,
      revision: 0,
      nodes: [],
      edges: [],
      groups: []
    });
  }
  async executeUniversal(id: string, revision: number, idempotencyKey: string) {
    if (!this.localAllowed())
      throw new ServiceError(
        'FORBIDDEN',
        'Managed-local execution policy is disabled'
      );
    const graph = this.get(id);
    if (graph.schemaVersion !== 2)
      throw new ServiceError('INVALID', 'Universal schemaVersion 2 required');
    if (graph.revision !== revision)
      throw new ServiceError('CONFLICT', 'Revision conflict');
    return this.runtime().execute(graph, { idempotencyKey });
  }
  url(id: string) {
    return `${this.baseUrl.replace(/\/$/, '')}/?workflow=${encodeURIComponent(id)}`;
  }
  list() {
    return this.connection
      .prepare('SELECT document FROM workflows ORDER BY id')
      .all()
      .map((r) => {
        const g = JSON.parse(String(r.document));
        return {
          id: g.id,
          name: g.name,
          revision: g.revision,
          url: this.url(g.id)
        };
      });
  }
  catalog() {
    return this.nodes.list().map((d) => ({
      kind: d.kind,
      version: d.version,
      label: d.label,
      category: d.category,
      provider: d.provider,
      inputs: d.inputs,
      outputs: d.outputs,
      defaults: d.defaults,
      configSchema: d.configSchema
        ? z.toJSONSchema(d.configSchema)
        : { type: 'object' },
      capability:
        d.provider === 'local' ? 'implemented-local' : 'external-dependent'
    }));
  }
  get(id: string): AnyWorkflow {
    const row = this.connection
      .prepare('SELECT document FROM workflows WHERE id=?')
      .get(id);
    if (!row) throw new ServiceError('NOT_FOUND', `Workflow ${id} not found`);
    return anyWorkflowSchema.parse(JSON.parse(String(row.document)));
  }
  validate(raw: unknown): AnyWorkflow {
    if ((raw as { schemaVersion?: number })?.schemaVersion === 2) {
      const graph = validateDocument(raw);
      // Pin the discovered contract when authoring; later drift cannot silently
      // reinterpret a saved Invoke under the same capability identity.
      for (const node of graph.nodes) {
        const contract = universalDefinition(node);
        if (contract.manifestHash)
          node.config.manifestHash = contract.manifestHash;
      }
      return graph;
    }
    const graph = validateGraph(raw, this.nodes);
    for (const n of graph.nodes) {
      const d = this.nodes.get(n.kind, n.version);
      d.configSchema?.parse(n.config);
    }
    return graph;
  }
  inspect(raw: unknown) {
    if ((raw as { schemaVersion?: number })?.schemaVersion === 2)
      return inspectDocument(raw);
    const graph = validateGraph(raw, this.nodes);
    const issues: { nodeId: string; message: string }[] = [];
    for (const n of graph.nodes) {
      const d = this.nodes.get(n.kind, n.version);
      try {
        d.validate(n.config);
      } catch (e) {
        issues.push({
          nodeId: n.id,
          message: String(e instanceof Error ? e.message : e)
        });
      }
      for (const p of d.inputs)
        if (
          p.required &&
          !graph.edges.some((e) => e.target === n.id && e.targetHandle === p.id)
        )
          issues.push({ nodeId: n.id, message: `Missing input ${p.id}` });
    }
    return { valid: true, readyToExecute: issues.length === 0, issues };
  }
  private atomic<T>(fn: () => T): T {
    this.connection.exec('BEGIN IMMEDIATE');
    try {
      const value = fn();
      this.connection.exec('COMMIT');
      return value;
    } catch (e) {
      this.connection.exec('ROLLBACK');
      throw e;
    }
  }
  private persist(graph: AnyWorkflow, exists: boolean) {
    const next = { ...graph, revision: graph.revision + 1 };
    if (exists) {
      this.connection
        .prepare(
          'INSERT OR IGNORE INTO workflow_revisions SELECT id,revision,document,? FROM workflows WHERE id=?'
        )
        .run(new Date().toISOString(), graph.id);
      this.connection
        .prepare('UPDATE workflows SET revision=?,document=? WHERE id=?')
        .run(next.revision, JSON.stringify(next), next.id);
      const ids = new Set(graph.nodes.map((n) => n.id));
      for (const row of this.connection
        .prepare(
          'SELECT DISTINCT nodeId FROM workflow_assets WHERE workflowId=?'
        )
        .all(graph.id))
        if (!ids.has(String(row.nodeId)))
          this.connection
            .prepare(
              'DELETE FROM workflow_assets WHERE workflowId=? AND nodeId=?'
            )
            .run(graph.id, String(row.nodeId));
    } else
      this.connection
        .prepare('INSERT INTO workflows VALUES(?,?,?)')
        .run(next.id, next.revision, JSON.stringify(next));
    this.connection
      .prepare('INSERT OR IGNORE INTO workflow_revisions VALUES(?,?,?,?)')
      .run(
        next.id,
        next.revision,
        JSON.stringify(next),
        new Date().toISOString()
      );
    return next;
  }
  create(input: { id?: string; name: string }) {
    const graph = this.validate({
      schemaVersion: 1,
      id: input.id ?? randomUUID(),
      name: input.name,
      revision: 0,
      nodes: [],
      edges: [],
      groups: []
    });
    return this.atomic(() => {
      if (
        this.connection
          .prepare('SELECT id FROM workflows WHERE id=?')
          .get(graph.id)
      )
        throw new ServiceError('CONFLICT', 'Workflow already exists');
      return this.persist(graph, false);
    });
  }
  save(raw: unknown) {
    const graph = this.validate(raw);
    return this.atomic(() => {
      const row = this.connection
        .prepare('SELECT revision,document FROM workflows WHERE id=?')
        .get(graph.id);
      if (
        row &&
        JSON.parse(String(row.document)).schemaVersion !== graph.schemaVersion
      )
        throw new ServiceError(
          'INVALID',
          'Document format cannot change in place; create a new workflow identity'
        );
      if (
        (row && row.revision !== graph.revision) ||
        (!row && graph.revision !== 0)
      )
        throw new ServiceError(
          'CONFLICT',
          'Revision conflict: reload before saving'
        );
      return this.persist(graph, !!row);
    });
  }
  apply(raw: unknown) {
    const input = transactionSchema.parse(raw);
    return this.atomic(() => {
      const graph = this.get(input.workflowId);
      if (graph.revision !== input.expectedRevision)
        throw new ServiceError(
          'CONFLICT',
          `Revision conflict: expected ${input.expectedRevision}, current ${graph.revision}`
        );
      for (const c of input.changes) {
        if (c.op === 'add_node') {
          if (graph.nodes.some((n) => n.id === c.node.id))
            throw new ServiceError('INVALID', 'Duplicate node identity');
          const def =
            graph.schemaVersion === 1
              ? this.nodes.get(c.node.kind, c.node.version)
              : undefined;
          graph.nodes.push({
            ...c.node,
            config: {
              ...structuredClone(def?.defaults ?? {}),
              ...c.node.config
            }
          });
        } else if (c.op === 'configure_node') {
          const node = graph.nodes.find((n) => n.id === c.nodeId);
          if (!node) throw new ServiceError('NOT_FOUND', 'Node not found');
          node.config = { ...node.config, ...c.config };
          if (c.label !== undefined) node.label = c.label;
          if (c.position) node.position = c.position;
        } else if (c.op === 'remove_node') {
          if (!graph.nodes.some((n) => n.id === c.nodeId))
            throw new ServiceError('NOT_FOUND', 'Node not found');
          graph.nodes = graph.nodes.filter((n) => n.id !== c.nodeId);
          graph.edges = graph.edges.filter(
            (e) => e.source !== c.nodeId && e.target !== c.nodeId
          );
          graph.groups = graph.groups
            .map((g) => ({
              ...g,
              nodeIds: g.nodeIds.filter((id) => id !== c.nodeId)
            }))
            .filter((g) => g.nodeIds.length);
          this.connection
            .prepare(
              'DELETE FROM workflow_assets WHERE workflowId=? AND nodeId=?'
            )
            .run(graph.id, c.nodeId);
        } else if (c.op === 'connect') graph.edges.push(c.edge);
        else if (c.op === 'disconnect') {
          if (!graph.edges.some((e) => e.id === c.edgeId))
            throw new ServiceError('NOT_FOUND', 'Edge not found');
          graph.edges = graph.edges.filter((e) => e.id !== c.edgeId);
        } else if (c.op === 'rename_workflow') graph.name = c.name;
        else if (c.op === 'set_groups') graph.groups = c.groups;
      }
      return this.persist(this.validate(graph), true);
    });
  }
  execution(id: string) {
    const graph = this.get(id);
    if (graph.schemaVersion === 2) {
      const runs = this.universalRuns(id);
      return {
        workflowId: id,
        revision: graph.revision,
        url: this.url(id),
        run: runs[0] ?? null,
        assets: []
      };
    }
    const row = this.connection
      .prepare(
        'SELECT document FROM runs WHERE workflowId=? ORDER BY rowid DESC LIMIT 1'
      )
      .get(id);
    const run = row ? JSON.parse(String(row.document)) : null;
    return {
      workflowId: id,
      revision: graph.revision,
      url: this.url(id),
      run,
      assets: this.assets(id)
    };
  }
  run(id: string) {
    const row = this.connection
      .prepare('SELECT document FROM runs WHERE id=?')
      .get(id);
    if (!row) throw new ServiceError('NOT_FOUND', 'Run not found');
    return JSON.parse(String(row.document));
  }
  async executeDocument(raw: unknown, options?: { targetNodeIds?: string[] }) {
    const graph = this.validate(raw);
    if (graph.schemaVersion !== 1)
      throw new ServiceError(
        'FORBIDDEN',
        'Use authorized universal execution at a saved revision'
      );
    const id = randomUUID();
    const states = await execute(
      graph,
      this.nodes,
      async (node, inputs) => {
        const { weaveBridge } = await import('./provider');
        return weaveBridge.prepare(node, inputs, {
          workflowId: graph.id,
          runId: id,
          workflowRevision: graph.revision,
          workflowHash: (await import('node:crypto'))
            .createHash('sha256')
            .update(JSON.stringify(graph))
            .digest('hex')
        });
      },
      options?.targetNodeIds
    );
    const run = {
      id,
      workflowId: graph.id,
      workflowRevision: graph.revision,
      graphSnapshot: graph,
      states,
      createdAt: new Date().toISOString(),
      targetNodeIds: options?.targetNodeIds ?? graph.nodes.map((n) => n.id)
    };
    this.connection
      .prepare('INSERT INTO runs VALUES(?,?,?)')
      .run(id, graph.id, JSON.stringify(run));
    return run;
  }
  async executeLocal(id: string, revision: number) {
    const graph = this.get(id);
    if (graph.revision !== revision)
      throw new ServiceError('CONFLICT', 'Revision conflict');
    if (graph.schemaVersion !== 1)
      throw new ServiceError(
        'FORBIDDEN',
        'Use execute_universal with separate execution permission'
      );
    if (
      graph.nodes.some(
        (n) => this.nodes.get(n.kind, n.version).provider !== 'local'
      )
    )
      throw new ServiceError(
        'FORBIDDEN',
        'Authoring MCP can execute only all-local workflows. Use the separate generation adapter for Weave requests.'
      );
    return this.executeDocument(graph);
  }
  assets(id: string) {
    this.get(id);
    return this.connection
      .prepare(
        'SELECT document FROM workflow_assets WHERE workflowId=? ORDER BY nodeId,assetId'
      )
      .all(id)
      .map((r) => JSON.parse(String(r.document)));
  }
  recordRunAssets(
    runId: string,
    nodeId: string,
    assets: unknown[],
    predictionId: string
  ) {
    const run = this.run(runId),
      graph = this.get(run.workflowId);
    if (!graph.nodes.some((n) => n.id === nodeId)) return;
    for (const raw of assets) {
      const asset = assetAssociationSchema.parse({
        ...(raw as object),
        runId,
        predictionId,
        provenance: 'external-reported'
      });
      const value = {
        ...asset,
        workflowId: graph.id,
        sourceNodeId: nodeId,
        associatedAt: new Date().toISOString()
      };
      this.connection
        .prepare('INSERT OR REPLACE INTO workflow_assets VALUES(?,?,?,?)')
        .run(graph.id, nodeId, asset.id, JSON.stringify(value));
    }
  }
  associate(id: string, revision: number, nodeId: string, raw: unknown) {
    const asset = assetAssociationSchema.parse(raw);
    return this.atomic(() => {
      const graph = this.get(id);
      if (graph.revision !== revision)
        throw new ServiceError('CONFLICT', 'Revision conflict');
      if (!graph.nodes.some((n) => n.id === nodeId))
        throw new ServiceError('NOT_FOUND', 'Originating node not found');
      if (asset.runId) {
        const run = this.run(asset.runId);
        if (
          run.workflowId !== id ||
          !run.graphSnapshot.nodes.some((n: { id: string }) => n.id === nodeId)
        )
          throw new ServiceError('INVALID', 'Asset run/node mismatch');
      }
      const value = {
        ...asset,
        workflowId: id,
        sourceNodeId: nodeId,
        associatedAt: new Date().toISOString()
      };
      this.connection
        .prepare('INSERT OR REPLACE INTO workflow_assets VALUES(?,?,?,?)')
        .run(id, nodeId, asset.id, JSON.stringify(value));
      const saved = this.persist(graph, true);
      return { workflow: saved, asset: value };
    });
  }
}
export const workflowService = new WorkflowService();
