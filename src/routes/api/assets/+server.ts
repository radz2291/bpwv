import { json } from '@sveltejs/kit';
import { writeFileSync, mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
mkdirSync('data/assets', { recursive: true });
export async function POST({ request }) {
  const form = await request.formData(),
    file = form.get('file');
  if (
    !(file instanceof File) ||
    ![
      'image/png',
      'image/jpeg',
      'image/webp',
      'video/mp4',
      'audio/mpeg',
      'audio/wav'
    ].includes(file.type) ||
    file.size > 25 * 1024 * 1024
  )
    return json(
      { error: 'Use PNG, JPEG, WebP, MP4, MP3, WAV up to 25 MB' },
      { status: 400 }
    );
  const id = randomUUID();
  writeFileSync(`data/assets/${id}`, Buffer.from(await file.arrayBuffer()));
  writeFileSync(
    `data/assets/${id}.json`,
    JSON.stringify({ type: file.type, name: file.name })
  );
  return json({
    id,
    uri: `/api/assets/${id}`,
    mediaType: file.type.split('/')[0],
    name: file.name
  });
}
