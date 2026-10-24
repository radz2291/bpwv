import { json } from '@sveltejs/kit';
import { workflowService, ServiceError } from '$lib/server/workflow-service';
export function GET({ params }) {
  try {
    return json(workflowService.assets(params.id));
  } catch (e) {
    return json({ error: String(e) }, { status: 404 });
  }
}
export async function POST({ params, request }) {
  try {
    const body = await request.json();
    return json(
      workflowService.associate(
        params.id,
        body.expectedRevision,
        body.nodeId,
        body.asset
      )
    );
  } catch (e) {
    return json(
      { error: String(e) },
      { status: e instanceof ServiceError && e.code === 'CONFLICT' ? 409 : 400 }
    );
  }
}
