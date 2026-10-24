import { json } from '@sveltejs/kit';
import { workflowService, ServiceError } from '$lib/server/workflow-service';
export async function POST({ params, request }) {
  try {
    return json(
      workflowService.apply({
        ...(await request.json()),
        workflowId: params.id
      })
    );
  } catch (e) {
    return json(
      { error: String(e) },
      { status: e instanceof ServiceError && e.code === 'CONFLICT' ? 409 : 400 }
    );
  }
}
