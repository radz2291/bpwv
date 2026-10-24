import { dataDirectory } from '$lib/server/store';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
export function GET({ params }) {
  if (!/^[a-f0-9-]{36}$/.test(params.id))
    return new Response('Invalid ID', { status: 400 });
  try {
    const meta = JSON.parse(
      readFileSync(
        resolve(dataDirectory, 'assets', `${params.id}.json`),
        'utf8'
      )
    );
    return new Response(
      readFileSync(resolve(dataDirectory, 'assets', params.id)),
      {
        headers: {
          'Content-Type': meta.type,
          'X-Content-Type-Options': 'nosniff'
        }
      }
    );
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
