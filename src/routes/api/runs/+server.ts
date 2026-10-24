import { json } from '@sveltejs/kit';
import { db } from '$lib/server/store';
export function GET({ url }) {
  const id = url.searchParams.get('workflowId');
  if (!id) return json({ error: 'workflowId is required' }, { status: 400 });
  const row = db
    .prepare(
      'SELECT document FROM runs WHERE workflowId=? ORDER BY rowid DESC LIMIT 1'
    )
    .get(id);
  return json(row ? JSON.parse(String(row.document)) : null);
}
