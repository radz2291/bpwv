import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { db } from '$lib/server/store';
import { weaveBridge } from '$lib/server/provider';
import { validateGraph, execute } from '$lib/engine';
import { registry } from '$lib/registry';
export async function POST({ request }) {
  try {
    const graph = validateGraph(await request.json(), registry),
      id = randomUUID();
    const states = await execute(graph, registry, (node, inputs) =>
      weaveBridge.prepare(node, inputs, { workflowId: graph.id, runId: id })
    );
    const run = {
      id,
      workflowId: graph.id,
      workflowRevision: graph.revision,
      graphSnapshot: graph,
      states,
      createdAt: new Date().toISOString()
    };
    db.prepare('INSERT INTO runs VALUES(?,?,?)').run(
      id,
      graph.id,
      JSON.stringify(run)
    );
    return json(run);
  } catch (e) {
    return json({ error: String(e) }, { status: 400 });
  }
}
