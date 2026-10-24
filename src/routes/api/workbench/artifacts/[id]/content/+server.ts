import { workflowService } from '$lib/server/workflow-service';
export function GET({ params }) {
  try {
    return new Response(
      new Uint8Array(workflowService.universalContent(params.id)),
      {
        headers: {
          'Content-Type': 'image/png',
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'no-store'
        }
      }
    );
  } catch (e) {
    return new Response(`Artifact unavailable: ${String(e)}`, { status: 404 });
  }
}
