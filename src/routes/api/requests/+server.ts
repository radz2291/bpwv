import { json } from '@sveltejs/kit';
import { db } from '$lib/server/store';
export function GET() {
  return json(
    db
      .prepare('SELECT document FROM requests')
      .all()
      .map((r) => JSON.parse(String(r.document)))
  );
}
