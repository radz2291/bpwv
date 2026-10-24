import { json } from '@sveltejs/kit';
import { db } from '$lib/server/store';
export function GET({ params }) {
  const row = db.prepare('SELECT document FROM runs WHERE id=?').get(params.id);
  return row
    ? json(JSON.parse(String(row.document)))
    : json({ error: 'Not found' }, { status: 404 });
}
