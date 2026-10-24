import { json } from '@sveltejs/kit';
import { getWorkflow } from '$lib/server/store';
export function GET({ params }) {
  const graph = getWorkflow(params.id);
  return graph ? json(graph) : json({ error: 'Not found' }, { status: 404 });
}
