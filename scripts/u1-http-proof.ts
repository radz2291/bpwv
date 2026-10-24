import { spawn, type ChildProcess } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const root = resolve(`data/u1/http-proof/${Date.now()}`),
  out = resolve('evidence/u1/http-inspector-transcript.json');
mkdirSync(root, { recursive: true });
mkdirSync(resolve('evidence/u1'), { recursive: true });
const keys = {
  readToken: randomBytes(32).toString('hex'),
  writeToken: randomBytes(32).toString('hex')
};
writeFileSync(resolve(root, 'mcp-auth.json'), JSON.stringify(keys));
const url = 'http://127.0.0.1:5176/mcp',
  transcript: unknown[] = [];
const redact = (s: string) =>
  s
    .replaceAll(keys.readToken, '[redacted]')
    .replaceAll(keys.writeToken, '[redacted]');
let server: ChildProcess | undefined;
async function stop() {
  if (server && server.exitCode === null) {
    server.kill();
    await new Promise<void>((yes) => server!.once('close', () => yes()));
  }
  server = undefined;
}
async function start(allowed: boolean) {
  await stop();
  server = spawn(
    process.execPath,
    [resolve('node_modules/tsx/dist/cli.mjs'), resolve('src/mcp/http.ts')],
    {
      windowsHide: true,
      env: {
        ...process.env,
        CREATIVE_FLOW_DATA_DIR: root,
        CREATIVE_FLOW_MCP_PORT: '5176',
        CREATIVE_FLOW_ALLOW_LOCAL_EXECUTION: allowed ? '1' : '0'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    }
  );
  let diagnostics = '';
  server.stderr?.on('data', (d) => (diagnostics += d));
  const end = Date.now() + 15000;
  while (Date.now() < end) {
    if (server.exitCode !== null) throw Error(redact(diagnostics));
    try {
      if (
        (
          await fetch(url, {
            method: 'POST',
            body: '{}',
            headers: { 'content-type': 'application/json' }
          })
        ).status === 401
      )
        return;
    } catch {}
    await new Promise((yes) => setTimeout(yes, 100));
  }
  throw Error('Isolated HTTP server unavailable');
}
async function call(
  role: 'read' | 'write',
  method: string,
  name?: string,
  args: unknown = {},
  error = false
): Promise<any> {
  const argv = [
    resolve(
      'node_modules/@modelcontextprotocol/inspector/clients/launcher/build/index.js'
    ),
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
    argv.push('--tool-name', name, '--tool-args-json', JSON.stringify(args));
  const r = await new Promise<{
    code: number | null;
    stdout: string;
    stderr: string;
  }>((yes, no) => {
    const p = spawn(process.execPath, argv, {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '',
      stderr = '';
    p.stdout.on('data', (d) => (stdout += d));
    p.stderr.on('data', (d) => (stderr += d));
    p.on('error', no);
    p.on('close', (code) => yes({ code, stdout, stderr }));
  });
  let parsed: any;
  try {
    parsed = JSON.parse(redact(r.stdout.trim()));
  } catch {
    parsed = { error: redact(r.stderr) };
  }
  const v = parsed.result ?? parsed;
  transcript.push({
    role,
    method,
    name,
    args,
    exitCode: r.code,
    result: parsed,
    diagnostics: redact(r.stderr)
  });
  writeFileSync(out, JSON.stringify(transcript, null, 2));
  if (error) {
    assert.ok(v.isError || r.code !== 0);
    return v;
  }
  assert.equal(r.code, 0, redact(r.stderr));
  assert.ok(!v.isError, JSON.stringify(v));
  return v.structuredContent ?? v;
}
try {
  await start(true);
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
  await call('read', 'initialize');
  const read = await call('read', 'tools/list'),
    write = await call('write', 'tools/list');
  assert.ok(!read.tools.some((t: any) => t.name === 'execute_universal'));
  assert.ok(write.tools.some((t: any) => t.name === 'execute_universal'));
  await call(
    'read',
    'tools/call',
    'create_universal',
    { name: 'Denied' },
    true
  );
  const id = `u1-http-${Date.now()}`,
    created = await call('write', 'tools/call', 'create_universal', {
      id,
      name: 'Authenticated U1 HTTP local execution'
    });
  const configs = [
    ['u.input', { type: 'text', value: 'actual local result' }],
    ['u.output', { mode: 'return', type: 'text' }]
  ] as const;
  const nodes = configs.map(([kind, config], i) => ({
    id: `n${i}`,
    kind,
    config,
    version: 1,
    label: kind,
    position: { x: i * 260, y: 0 }
  }));
  const saved = await call('write', 'tools/call', 'save_workflow', {
    expectedRevision: created.workflow.revision,
    workflow: {
      ...created.workflow,
      nodes,
      edges: [
        {
          id: 'edge',
          source: 'n0',
          sourceHandle: 'value',
          target: 'n1',
          targetHandle: 'input'
        }
      ]
    }
  });
  const result = await call('write', 'tools/call', 'execute_universal', {
    workflowId: id,
    expectedRevision: saved.workflow.revision,
    idempotencyKey: 'http'
  });
  assert.equal(result.run.status, 'completed');
  assert.equal(result.run.states.n1.outputs.value.value, 'actual local result');
  assert.deepEqual(
    (await call('read', 'tools/call', 'get_workflow', { workflowId: id }))
      .workflow,
    saved.workflow
  );
  assert.equal(
    (
      await call('read', 'tools/call', 'get_artifact', {
        artifactId: result.run.states.n1.outputs.value.id
      })
    ).artifact.value,
    'actual local result'
  );
  await start(false);
  assert.equal(
    (await call('read', 'tools/call', 'universal_catalog')).allowLocalExecution,
    false
  );
  await call(
    'write',
    'tools/call',
    'execute_universal',
    {
      workflowId: id,
      expectedRevision: saved.workflow.revision,
      idempotencyKey: 'denied'
    },
    true
  );
  assert.equal(
    (
      await call('read', 'tools/call', 'list_universal_runs', {
        workflowId: id
      })
    ).runs.length,
    1
  );
  writeFileSync(
    resolve('evidence/u1/http-inspector-summary.json'),
    JSON.stringify(
      {
        status: 'PASS',
        scope:
          'Official Inspector authenticated Streamable HTTP isolated process; separate permission denial after restart',
        dataRoot: root,
        workflowId: id,
        actualChatGPTSide: false,
        paidCalls: 0
      },
      null,
      2
    )
  );
  console.log('U1 HTTP official Inspector PASS.');
} finally {
  await stop();
}
