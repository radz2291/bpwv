import { json } from '@sveltejs/kit';
import { workflowService } from '$lib/server/workflow-service';
export function GET({ params }) {
  try {
    return json(workflowService.get(params.id));
  } catch (e) {
    return json({ error: String(e) }, { status: 404 });
  }
}
