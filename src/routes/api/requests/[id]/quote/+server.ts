import { json } from '@sveltejs/kit';
import { requestService } from '$lib/server/request-service';
export async function POST({ params, request }) {
  try {
    return json(requestService.recordQuote(params.id, await request.json()));
  } catch (e) {
    return json({ error: String(e) }, { status: 400 });
  }
}
