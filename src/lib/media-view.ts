import type { Asset, Workflow, NodeRegistry, NodeState } from './contract';
export type NodeMedia = {
  assets: Asset[];
  status: NodeState['status'];
  caption: string;
  modelLabel?: string;
  estimate?: number;
  source: 'imported' | 'run-output' | 'none';
};
export function mediaFocusIds(graph: Workflow, registry: NodeRegistry) {
  const first = graph.nodes.find(
    (n) => registry.get(n.kind, n.version).provider === 'generative'
  );
  if (!first)
    return graph.nodes
      .filter((n) => ['asset', 'reference_set', 'preview'].includes(n.kind))
      .map((n) => n.id);
  const ids = new Set<string>();
  function visit(id: string) {
    if (ids.has(id)) return;
    ids.add(id);
    for (const e of graph.edges.filter((e) => e.target === id)) visit(e.source);
  }
  visit(first.id);
  for (const e of graph.edges.filter((e) => e.source === first.id))
    if (graph.nodes.find((n) => n.id === e.target)?.kind === 'preview')
      ids.add(e.target);
  return graph.nodes
    .filter(
      (n) =>
        ids.has(n.id) &&
        ['asset', 'reference_set', 'weave', 'preview'].includes(n.kind)
    )
    .map((n) => n.id);
}
/** Pure display projection. Only definitions' local project handlers or actual completed run outputs can supply media. Never executes a provider. */
export function projectMedia(
  graph: Workflow,
  registry: NodeRegistry,
  states: Record<string, NodeState>,
  models: { id: string; label: string; costEstimate: number }[] = []
): Record<string, NodeMedia> {
  const views: Record<string, NodeMedia> = {},
    outputs: Record<string, Record<string, unknown>> = {},
    active = new Set<string>();
  function visit(id: string): Record<string, unknown> {
    if (outputs[id]) return outputs[id];
    if (active.has(id)) return {};
    active.add(id);
    const node = graph.nodes.find((n) => n.id === id);
    if (!node) return {};
    const def = registry.get(node.kind, node.version);
    const input: Record<string, unknown> = {};
    let upstream: NodeState['status'] | undefined;
    for (const edge of graph.edges.filter((e) => e.target === id)) {
      input[edge.targetHandle] = visit(edge.source)[edge.sourceHandle];
      if (edge.targetHandle === 'asset') upstream = states[edge.source]?.status;
    }
    let output: Record<string, unknown> = {};
    const state = states[id];
    // Re-project configured local media so replacement/disconnection cannot retain an old reference image.
    if (def.project) {
      try {
        output = def.project({ node, inputs: input });
      } catch {
        output = {};
      }
    } else if (state?.status === 'completed') output = state.outputs;
    outputs[id] = output;
    active.delete(id);
    const candidates = (output.references ??
      (output.asset ? [output.asset] : [])) as Asset[];
    const assets = Array.isArray(candidates)
      ? candidates.filter(
          (a) => a && typeof a.uri === 'string' && a.mediaType === 'image'
        )
      : [];
    const model = models.find((m) => m.id === node.config.modelId);
    const status =
      state?.status ??
      (upstream === 'pending' || upstream === 'running'
        ? 'blocked'
        : upstream === 'failed'
          ? 'blocked'
          : 'idle');
    let caption = assets.length
      ? node.kind === 'reference_set'
        ? `${assets.length} reference${assets.length === 1 ? '' : 's'} · first is primary`
        : assets[0].provenance === 'imported'
          ? 'Imported image'
          : 'Provider-reported output'
      : status === 'failed'
        ? 'Execution failed'
        : upstream === 'failed'
          ? 'Upstream failed'
          : status === 'pending'
            ? 'Awaiting cost approval'
            : status === 'running'
              ? 'Generating…'
              : status === 'blocked'
                ? 'Waiting for upstream image'
                : 'No image yet';
    if (node.kind === 'weave' && state?.status !== 'completed')
      caption =
        status === 'pending'
          ? 'Pending · approval required'
          : status === 'running'
            ? 'Generating…'
            : status === 'failed'
              ? 'Generation failed'
              : 'No generation submitted';
    views[id] = {
      assets,
      status,
      caption,
      modelLabel: model?.label,
      estimate: model?.costEstimate,
      source: assets.length
        ? assets[0].provenance === 'imported'
          ? 'imported'
          : 'run-output'
        : 'none'
    };
    return output;
  }
  for (const node of graph.nodes) visit(node.id);
  return views;
}
