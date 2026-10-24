import { json } from '@sveltejs/kit';
import { workflowService, ServiceError } from '$lib/server/workflow-service';
export function GET() {
  return json(workflowService.list());
}
export async function POST({ request }) {
  try {
    return json(workflowService.save(await request.json()));
  } catch (e) {
    return json(
      { error: String(e) },
      { status: e instanceof ServiceError && e.code === 'CONFLICT' ? 409 : 400 }
    );
  }
}
