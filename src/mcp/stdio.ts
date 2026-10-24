import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createAuthoringServer } from './server';
// Process launch/OS access is the authorization boundary. Read-only unless explicitly granted.
const server = createAuthoringServer(
  process.argv.includes('--write') ? 'write' : 'read'
);
await server.connect(new StdioServerTransport());
