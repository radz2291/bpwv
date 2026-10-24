import { json } from '@sveltejs/kit';
import { models } from '$lib/server/provider';
export function GET() {
  return json(models);
}
