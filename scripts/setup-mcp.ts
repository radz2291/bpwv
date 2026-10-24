import { randomBytes } from 'node:crypto';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const directory = resolve(process.env.CREATIVE_FLOW_DATA_DIR ?? 'data');
mkdirSync(directory, { recursive: true });
const path = resolve(directory, 'mcp-auth.json');
if (existsSync(path)) console.log('Existing local MCP credentials retained.');
else {
  writeFileSync(
    path,
    JSON.stringify(
      {
        readToken: randomBytes(32).toString('hex'),
        writeToken: randomBytes(32).toString('hex')
      },
      null,
      2
    ),
    { mode: 0o600 }
  );
  console.log(
    'Local MCP credentials created in ignored data/mcp-auth.json. Tokens are not printed.'
  );
}
