import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const url = 'http://127.0.0.1:5174/mcp',
  keys = JSON.parse(readFileSync('data/mcp-auth.json', 'utf8'));
const inspector = resolve(
  'node_modules/@modelcontextprotocol/inspector/clients/launcher/build/index.js'
);
const transcript: unknown[] = [];
async function call(
  role: 'read' | 'write',
  method: string,
  name?: string,
  args?: unknown,
  expectError = false
) {
  const argv = [
    inspector,
    '--cli',
    url,
    '--transport',
    'http',
    '--method',
    method,
    '--format',
    'json',
    '--header',
    `Authorization: Bearer ${role === 'read' ? keys.readToken : keys.writeToken}`
  ];
  if (name)
    argv.push(
      '--tool-name',
      name,
      '--tool-args-json',
      JSON.stringify(args ?? {})
    );
  const r = await new Promise<{
    code: number | null;
    stdout: string;
    stderr: string;
  }>((resolve, reject) => {
    const p = spawn(process.execPath, argv, { windowsHide: true });
    let stdout = '',
      stderr = '';
    p.stdout.on('data', (d) => (stdout += d));
    p.stderr.on('data', (d) => (stderr += d));
    p.on('error', reject);
    p.on('close', (code) => resolve({ code, stdout, stderr }));
  });
  const parsed = r.stdout.trim() ? JSON.parse(r.stdout) : { error: r.stderr },
    v = parsed.result ?? parsed;
  transcript.push({
    role,
    method,
    name,
    exitCode: r.code,
    result: parsed,
    diagnostics: r.stderr
      .replaceAll(keys.readToken, '[redacted]')
      .replaceAll(keys.writeToken, '[redacted]')
  });
  if (expectError) assert.ok(v.isError || r.code !== 0);
  else {
    assert.equal(r.code, 0, r.stderr);
    assert.ok(!v.isError, JSON.stringify(v));
  }
  return v.structuredContent ?? v;
}
assert.equal(
  (
    await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}'
    })
  ).status,
  401
);
assert.equal(
  (
    await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: 'Bearer invalid'
      },
      body: '{}'
    })
  ).status,
  401
);
assert.equal(
  (
    await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${keys.writeToken}`,
        Origin: 'https://untrusted.example'
      },
      body: '{}'
    })
  ).status,
  403
);
const readonly = await call('read', 'tools/list');
assert.equal(readonly.tools.length, 6);
const write = await call('write', 'tools/list');
assert.equal(write.tools.length, 16);
await call('read', 'tools/call', 'create_workflow', { name: 'Denied' }, true);
const id = `mcp-http-${Date.now()}`;
const created = await call('write', 'tools/call', 'create_workflow', {
  id,
  name: 'Authenticated HTTP MCP proof'
});
const fetched = await call('read', 'tools/call', 'get_workflow', {
  workflowId: id
});
assert.deepEqual(fetched.workflow, created.workflow);
const list = await call('write', 'tools/list');
assert.ok(list.tools.every((t: any) => t.outputSchema && t.annotations));
writeFileSync(
  'evidence/mcp-http-proof.json',
  JSON.stringify(
    {
      verifiedAt: new Date().toISOString(),
      endpoint: url,
      transport: 'Streamable HTTP, stateless JSON responses',
      authorization:
        'independent read/write local bearer credentials; secrets excluded',
      checks: [
        'unauthenticated 401',
        'invalid token 401',
        'untrusted Origin 403',
        'read role discovers six read tools',
        'write role discovers sixteen tools',
        'read role cannot invoke writes',
        'write creates, read retrieves same workflow',
        'typed schemas and annotations advertised'
      ],
      transcript,
      creditsSpent: 0
    },
    null,
    2
  )
);
console.log('Official Inspector HTTP authorization proof PASS');
