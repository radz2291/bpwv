import type { Workflow } from './contract';
/** Execution identity excludes cosmetic layout/labels and persistence revisions. */
export function executionSignature(graph: Workflow) {
  return JSON.stringify({
    nodes: graph.nodes.map((n) => ({
      id: n.id,
      kind: n.kind,
      version: n.version,
      config: n.config
    })),
    edges: graph.edges
  });
}
