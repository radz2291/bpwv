import { json } from '@sveltejs/kit';
import { db } from '$lib/server/store';
import { z } from 'zod';
const result = z.object({
  status: z.enum(['running', 'completed', 'failed']),
  predictionId: z.string().min(1),
  actualModelId: z.string().min(1),
  error: z.string().optional(),
  assets: z
    .array(
      z.object({
        id: z.string(),
        uri: z.string().regex(/^(https:\/\/|\/api\/assets\/)/),
        mediaType: z.enum(['image', 'video', 'audio'])
      })
    )
    .default([])
});
export async function POST({ params, request }) {
  try {
    const row = db
      .prepare('SELECT document FROM requests WHERE id=?')
      .get(params.id);
    if (!row) throw Error('Request not found');
    const pending = JSON.parse(String(row.document)),
      body = result.parse(await request.json());
    if (['completed', 'failed'].includes(pending.status))
      throw Error('Request already terminal');
    if (body.actualModelId !== pending.model.modelId)
      throw Error('Model mismatch');
    if (body.status === 'completed' && !body.assets.length)
      throw Error('Completed generation needs actual assets');
    if (body.status === 'failed' && !body.error)
      throw Error('Failure requires error');
    const runRow = db
      .prepare('SELECT document FROM runs WHERE id=?')
      .get(pending.runId)!;
    const run = JSON.parse(String(runRow.document));
    run.states[pending.nodeId] = {
      status: body.status,
      outputs:
        body.status === 'completed'
          ? {
              asset: {
                ...body.assets[0],
                sourceNodeId: pending.nodeId,
                parentIds: pending.assetLineage.map((a: { id: string }) => a.id)
              }
            }
          : {},
      error: body.error,
      requestId: params.id
    };
    // Resume only deterministic descendants whose inputs are now complete; never launch another provider here.
    const { registry } = await import('$lib/registry');
    for (let i = 0; i < run.graphSnapshot.nodes.length; i++)
      for (const node of run.graphSnapshot.nodes) {
        if (run.states[node.id]?.status !== 'blocked') continue;
        const edges = run.graphSnapshot.edges.filter(
          (e: { target: string }) => e.target === node.id
        );
        if (
          !edges.every(
            (e: { source: string }) =>
              run.states[e.source]?.status === 'completed'
          )
        )
          continue;
        const def = registry.get(node.kind, node.version);
        if (def.provider !== 'local') continue;
        const inputs = Object.fromEntries(
          edges.map(
            (e: {
              source: string;
              sourceHandle: string;
              targetHandle: string;
            }) => [e.targetHandle, run.states[e.source].outputs[e.sourceHandle]]
          )
        );
        try {
          def.validate(node.config);
          run.states[node.id] = await def.execute({
            node,
            inputs,
            generate: async () => {
              throw Error('Provider unavailable');
            }
          });
        } catch (e) {
          run.states[node.id] = {
            status: 'failed',
            outputs: {},
            error: String(e)
          };
        }
      }
    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare('UPDATE requests SET document=? WHERE id=?').run(
        JSON.stringify({ ...pending, ...body }),
        params.id
      );
      db.prepare('UPDATE runs SET document=? WHERE id=?').run(
        JSON.stringify(run),
        pending.runId
      );
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    return json(run);
  } catch (e) {
    return json({ error: String(e) }, { status: 400 });
  }
}
