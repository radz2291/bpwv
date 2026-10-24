import { json } from '@sveltejs/kit';
import { workflowService } from '$lib/server/workflow-service';
export async function POST({ request }) {
  try {
    return json(await workflowService.executeDocument(await request.json()));
  } catch (e) {
    return json({ error: String(e) }, { status: 400 });
  }
}
