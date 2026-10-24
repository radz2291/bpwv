import { json } from '@sveltejs/kit';
import { z } from 'zod';
import {
  workflowService as service,
  ServiceError
} from '$lib/server/workflow-service';
const id = z.string().min(1);
const requestSchema = z.discriminatedUnion('action', [
  z
    .object({ action: z.literal('create'), id: id.optional(), name: id })
    .strict(),
  z.object({ action: z.literal('save'), workflow: z.unknown() }).strict(),
  z
    .object({
      action: z.literal('apply'),
      workflowId: id,
      expectedRevision: z.number().int().nonnegative(),
      changes: z.array(z.unknown())
    })
    .strict(),
  z
    .object({
      action: z.literal('execute'),
      workflowId: id,
      expectedRevision: z.number().int().nonnegative(),
      idempotencyKey: id.max(200)
    })
    .strict(),
  z
    .object({
      action: z.literal('import'),
      base64: z.string().max(12 * 1024 * 1024),
      name: id.max(255)
    })
    .strict()
]);
export async function POST({ request }) {
  try {
    const input = requestSchema.parse(await request.json());
    if (input.action === 'create') return json(service.createUniversal(input));
    if (input.action === 'save') return json(service.save(input.workflow));
    if (input.action === 'apply') return json(service.apply(input));
    if (input.action === 'import')
      return json(service.importUniversalImage(input));
    return json(
      await service.executeUniversal(
        input.workflowId,
        input.expectedRevision,
        input.idempotencyKey
      )
    );
  } catch (e) {
    return json(
      { error: String(e) },
      {
        status:
          e instanceof ServiceError && e.code === 'CONFLICT'
            ? 409
            : e instanceof ServiceError && e.code === 'FORBIDDEN'
              ? 403
              : 400
      }
    );
  }
}
export function GET({ url }) {
  try {
    switch (url.searchParams.get('action')) {
      case 'catalog':
        return json(service.universalCatalog());
      case 'permissions':
        return json({ allowLocalExecution: service.localAllowed() });
      case 'runs':
        return json(
          service.universalRuns(id.parse(url.searchParams.get('workflowId')))
        );
      case 'artifact':
        return json(
          service.universalArtifact(id.parse(url.searchParams.get('id')))
        );
      default:
        return json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (e) {
    return json({ error: String(e) }, { status: 400 });
  }
}
