import express from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createHash, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Access } from './server';
import { loadLocalRuntime } from '../../scripts/local-runtime.mjs';
loadLocalRuntime();
const { createAuthoringServer } = await import('./server');
const port = Number(process.env.CREATIVE_FLOW_MCP_PORT ?? 5174);
const authPath =
  process.env.CREATIVE_FLOW_MCP_AUTH_FILE ??
  resolve(process.env.CREATIVE_FLOW_DATA_DIR ?? 'data', 'mcp-auth.json');
const keys = JSON.parse(readFileSync(authPath, 'utf8'));
if (
  typeof keys.readToken !== 'string' ||
  typeof keys.writeToken !== 'string' ||
  keys.readToken.length < 32 ||
  keys.writeToken.length < 32 ||
  keys.readToken === keys.writeToken
)
  throw Error('Invalid MCP credentials. Run npm run mcp:setup.');
const hash = (s: string) => createHash('sha256').update(s).digest();
const matches = (a: string, b: string) => timingSafeEqual(hash(a), hash(b));
const origins = new Set(
  (
    process.env.CREATIVE_FLOW_MCP_ORIGINS ??
    'http://127.0.0.1:6274,http://localhost:6274'
  ).split(',')
);
const hosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  if (!hosts.has(req.headers.host ?? '')) {
    res.status(403).json({ error: 'Host not allowed' });
    return;
  }
  if (req.headers.origin && !origins.has(req.headers.origin)) {
    res.status(403).json({ error: 'Origin not allowed' });
    return;
  }
  const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  const access: Access | undefined =
    token && matches(token, keys.writeToken)
      ? 'write'
      : token && matches(token, keys.readToken)
        ? 'read'
        : undefined;
  if (!access) {
    res.setHeader('WWW-Authenticate', 'Bearer realm="creative-flow-local"');
    res.status(401).json({ error: 'Valid local MCP token required' });
    return;
  }
  res.locals.access = access;
  next();
});
app.use(express.json({ limit: '12mb' }));
app.post('/mcp', async (req, res) => {
  const server = createAuthoringServer(res.locals.access);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true
  });
  res.on('close', () => {
    void transport.close();
    void server.close();
  });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (e) {
    console.error(
      'MCP transport failed',
      e instanceof Error ? e.message : String(e)
    );
    if (!res.headersSent)
      res.status(500).json({ error: 'MCP transport failed' });
  }
});
app.all('/mcp', (_req, res) => {
  res.setHeader('Allow', 'POST');
  res.status(405).end();
});
app.listen(port, '127.0.0.1', () =>
  console.error(
    `Creative Flow authoring MCP listening on http://127.0.0.1:${port}/mcp (authenticated, local only)`
  )
);
