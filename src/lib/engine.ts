import {
  workflowSchema,
  type Workflow,
  type NodeRegistry,
  type NodeState,
  type FlowNode,
  type ValueType
} from './contract';
function assertValue(value: unknown, type: ValueType) {
  if (type === 'assets' || type.startsWith('array:')) {
    if (!Array.isArray(value)) throw Error(`Expected ${type}`);
    for (const item of value)
      assertValue(
        item,
        type === 'assets' ? 'asset' : (type.slice(6) as ValueType)
      );
    return;
  }
  if (type === 'text' || type === 'number' || type === 'boolean') {
    if (
      typeof value !== (type === 'text' ? 'string' : type) ||
      (type === 'number' && !Number.isFinite(value))
    )
      throw Error(`Expected ${type}`);
    return;
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw Error(`Expected ${type} object`);
  if (type === 'asset') {
    const asset = value as Record<string, unknown>;
    if (
      typeof asset.id !== 'string' ||
      typeof asset.uri !== 'string' ||
      !['image', 'video', 'audio'].includes(String(asset.mediaType))
    )
      throw Error('Invalid asset value');
  }
}
export function validateGraph(raw: unknown, registry: NodeRegistry): Workflow {
  const graph = workflowSchema.parse(raw);
  const nodes = new Map(graph.nodes.map((n) => [n.id, n]));
  if (nodes.size !== graph.nodes.length)
    throw Error('Duplicate node identities');
  const ids = new Set<string>(),
    targets = new Set<string>();
  for (const n of graph.nodes) registry.get(n.kind, n.version);
  for (const e of graph.edges) {
    if (ids.has(e.id)) throw Error('Duplicate edge identity');
    ids.add(e.id);
    const a = nodes.get(e.source),
      b = nodes.get(e.target);
    if (!a || !b) throw Error('Dangling connection');
    const out = registry
        .get(a.kind, a.version)
        .outputs.find((p) => p.id === e.sourceHandle),
      input = registry
        .get(b.kind, b.version)
        .inputs.find((p) => p.id === e.targetHandle);
    if (!out || !input || out.type !== input.type)
      throw Error('Incompatible port types');
    const key = `${e.target}:${e.targetHandle}`;
    if (targets.has(key)) throw Error('Input already connected');
    targets.add(key);
  }
  const seen = new Set<string>(),
    active = new Set<string>();
  function visit(id: string) {
    if (active.has(id)) throw Error('Cycles are not supported');
    if (seen.has(id)) return;
    active.add(id);
    graph.edges.filter((e) => e.target === id).forEach((e) => visit(e.source));
    active.delete(id);
    seen.add(id);
  }
  graph.nodes.forEach((n) => visit(n.id));
  for (const g of graph.groups)
    if (g.nodeIds.some((id) => !nodes.has(id)))
      throw Error('Group references missing node');
  return graph;
}
export async function execute(
  graph: Workflow,
  registry: NodeRegistry,
  generate: (
    node: FlowNode,
    inputs: Record<string, unknown>
  ) => Promise<NodeState>
) {
  validateGraph(graph, registry);
  const states: Record<string, NodeState> = {};
  async function run(id: string): Promise<NodeState> {
    if (states[id]) return states[id];
    const node = graph.nodes.find((n) => n.id === id)!;
    const def = registry.get(node.kind, node.version);
    const inputs: Record<string, unknown> = {};
    for (const e of graph.edges.filter((e) => e.target === id)) {
      const upstream = await run(e.source);
      if (upstream.status !== 'completed')
        return (states[id] = {
          status: 'blocked',
          outputs: {},
          error: `Waiting for ${e.source}`
        });
      inputs[e.targetHandle] = upstream.outputs[e.sourceHandle];
    }
    try {
      def.validate(node.config);
      for (const p of def.inputs) {
        if (p.required && inputs[p.id] === undefined)
          throw Error(`Missing input ${p.id}`);
        if (inputs[p.id] !== undefined) assertValue(inputs[p.id], p.type);
      }
      states[id] = { status: 'running', outputs: {} };
      const result = await def.execute({ node, inputs, generate });
      if (result.status === 'completed')
        for (const p of def.outputs) assertValue(result.outputs[p.id], p.type);
      return (states[id] = result);
    } catch (e) {
      return (states[id] = {
        status: 'failed',
        outputs: {},
        error: String(e instanceof Error ? e.message : e)
      });
    }
  }
  for (const n of graph.nodes) await run(n.id);
  return states;
}
