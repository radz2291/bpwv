import { json } from '@sveltejs/kit';
import { db, save } from '$lib/server/store';
import { validateGraph } from '$lib/engine';
import { registry } from '$lib/registry';
export function GET() {
  return json(
    db
      .prepare('SELECT id,revision,document FROM workflows')
      .all()
      .map((r) => ({
        id: r.id,
        revision: r.revision,
        name: JSON.parse(String(r.document)).name
      }))
  );
}
export async function POST({ request }) {
  try {
    return json(save(validateGraph(await request.json(), registry)));
  } catch (e) {
    return json(
      { error: String(e) },
      { status: String(e).includes('conflict') ? 409 : 400 }
    );
  }
}
