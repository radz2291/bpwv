import { json } from '@sveltejs/kit';
import { workflowService } from '$lib/server/workflow-service';
import { z } from 'zod';
export async function POST({ request }) {
  try {
    const body = await request.json();
    const targetNodeIds = z
      .array(z.string())
      .min(1)
      .max(500)
      .optional()
      .parse(body.targetNodeIds);
    return json(await workflowService.executeDocument(body, { targetNodeIds }));
  } catch (e) {
    return json({ error: String(e) }, { status: 400 });
  }
}
