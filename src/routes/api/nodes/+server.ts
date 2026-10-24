import { json } from '@sveltejs/kit';
import { workflowService } from '$lib/server/workflow-service';
export function GET() {
  return json(workflowService.catalog());
}
