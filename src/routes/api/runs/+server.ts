import { json } from '@sveltejs/kit';
import { workflowService } from '$lib/server/workflow-service';
export function GET({ url }) {
  const id = url.searchParams.get('workflowId');
  if (!id) return json({ error: 'workflowId is required' }, { status: 400 });
  try {
    return json(workflowService.execution(id).run);
  } catch (e) {
    return json({ error: String(e) }, { status: 404 });
  }
}
