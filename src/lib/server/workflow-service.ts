import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { db } from './store';
import { registry } from '../registry';
import { validateGraph, execute } from '../engine';
import {
  workflowSchema,
  nodeSchema,
  type Workflow,
  type NodeRegistry
} from '../contract';

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
      'http://127.0.0.1:5173'
  ) {}
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
    return this.nodes
      .list()
      .map((d) => ({
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
  get(id: string): Workflow {
    const row = this.connection
      .prepare('SELECT document FROM workflows WHERE id=?')
      .get(id);
    if (!row) throw new ServiceError('NOT_FOUND', `Workflow ${id} not found`);
    return JSON.parse(String(row.document));
  }
  validate(raw: unknown) {
    const graph = validateGraph(raw, this.nodes);
    for (const n of graph.nodes) {
      const d = this.nodes.get(n.kind, n.version);
      d.configSchema?.parse(n.config);
    }
    return graph;
  }
  inspect(raw: unknown) {
    const graph = this.validate(raw);
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
  private persist(graph: Workflow, exists: boolean) {
    const next = { ...graph, revision: graph.revision + 1 };
    if (exists) {
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
        .prepare('SELECT revision FROM workflows WHERE id=?')
        .get(graph.id);
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
          const def = this.nodes.get(c.node.kind, c.node.version);
          graph.nodes.push({
            ...c.node,
            config: { ...structuredClone(def.defaults), ...c.node.config }
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
  async executeDocument(raw: unknown) {
    const graph = this.validate(raw),
      id = randomUUID();
    const states = await execute(graph, this.nodes, async (node, inputs) => {
      const { weaveBridge } = await import('./provider');
      return weaveBridge.prepare(node, inputs, {
        workflowId: graph.id,
        runId: id
      });
    });
    const run = {
      id,
      workflowId: graph.id,
      workflowRevision: graph.revision,
      graphSnapshot: graph,
      states,
      createdAt: new Date().toISOString()
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
