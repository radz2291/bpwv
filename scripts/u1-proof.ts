/** Official Inspector proof. All writes use an explicitly isolated database AND media root. */
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import assert from 'node:assert/strict';

const root = resolve(`data/u1/proof/${Date.now()}`),
  evidence = resolve('evidence/u1');
mkdirSync(root, { recursive: true });
mkdirSync(evidence, { recursive: true });
const configPath = resolve(root, 'inspector.json');
const profiles = Object.fromEntries(
  ['local-write', 'author-only', 'read'].map((profile) => [
    profile,
    {
      command: process.execPath,
      args: [
        resolve('node_modules/tsx/dist/cli.mjs'),
        resolve('src/mcp/stdio.ts'),
        ...(profile === 'read' ? [] : ['--write'])
      ],
      cwd: process.cwd(),
      env: {
        CREATIVE_FLOW_DATA_DIR: root,
        CREATIVE_FLOW_APP_URL: 'http://127.0.0.1:5175',
        CREATIVE_FLOW_ALLOW_LOCAL_EXECUTION:
          profile === 'local-write' ? '1' : '0'
      }
    }
  ])
);
writeFileSync(configPath, JSON.stringify({ mcpServers: profiles }, null, 2));
const transcript: unknown[] = [];
async function invoke(
  method: string,
  name?: string,
  args: unknown = {},
  profile = 'local-write',
  error = false
): Promise<any> {
  const argv = [
    resolve(
      'node_modules/@modelcontextprotocol/inspector/clients/launcher/build/index.js'
    ),
    '--cli',
    '--config',
    configPath,
    '--server',
    profile,
    '--method',
    method,
    '--format',
    'json'
  ];
  if (name)
    argv.push('--tool-name', name, '--tool-args-json', JSON.stringify(args));
  const result = await new Promise<{
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
    parsed = JSON.parse(result.stdout.trim());
  } catch {
    parsed = { error: result.stderr, stdout: result.stdout };
  }
  transcript.push({
    step: name ?? method,
    profile,
    args,
    exitCode: result.code,
    result: parsed,
    diagnostics: result.stderr
  });
  writeFileSync(
    resolve(evidence, 'inspector-transcript.json'),
    JSON.stringify(transcript, null, 2)
  );
  const v = parsed.result ?? parsed;
  if (error) {
    assert.ok(v.isError || result.code !== 0, `Expected refusal: ${name}`);
    return v;
  }
  assert.equal(result.code, 0, JSON.stringify(result));
  assert.ok(!v.isError, JSON.stringify(v));
  return v.structuredContent ?? v;
}
function nodes(spec: { kind: string; config: Record<string, unknown> }[]) {
  return spec.map((s, i) => ({
    ...s,
    id: `n${i}`,
    version: 1,
    label: s.kind,
    position: { x: i * 260, y: 0 }
  }));
}
function edges(count: number) {
  return Array.from({ length: count - 1 }, (_, i) => ({
    id: `e${i}`,
    source: `n${i}`,
    sourceHandle: 'value',
    target: `n${i + 1}`,
    targetHandle: 'input'
  }));
}
function png() {
  const chunk = (tag: string, body: Buffer) => {
    const t = Buffer.from(tag),
      data = Buffer.concat([t, body]);
    let crc = 0xffffffff;
    for (const n of data) {
      crc ^= n;
      for (let i = 0; i < 8; i++)
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    const b = Buffer.alloc(body.length + 12);
    b.writeUInt32BE(body.length);
    data.copy(b, 4);
    b.writeUInt32BE((crc ^ 0xffffffff) >>> 0, b.length - 4);
    return b;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(2);
  header.writeUInt32BE(2, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    chunk('IHDR', header),
    chunk(
      'IDAT',
      deflateSync(
        Buffer.from([
          0, 255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 0, 255, 255, 255, 255, 255,
          255
        ])
      )
    ),
    chunk('IEND', Buffer.alloc(0))
  ]);
}
await invoke('initialize');
const tools = await invoke('tools/list');
assert.ok(
  tools.tools.every(
    (t: any) => t.inputSchema && t.outputSchema && t.annotations
  )
);
for (const name of [
  'universal_catalog',
  'create_universal',
  'execute_universal',
  'import_image',
  'get_artifact',
  'list_universal_runs'
])
  assert.ok(tools.tools.some((t: any) => t.name === name));
const discovered = await invoke('tools/call', 'universal_catalog');
assert.equal(discovered.allowLocalExecution, true);
const readTools = await invoke('tools/list', undefined, {}, 'read');
assert.ok(!readTools.tools.some((t: any) => t.name === 'execute_universal'));
const id = `u1-inspector-${Date.now()}`;
let a = await invoke('tools/call', 'create_universal', {
  id,
  name: 'U1 A · actual local text analysis'
});
const aNodes = nodes([
  { kind: 'u.input', config: { type: 'text', value: '  One   two\nthree  ' } },
  {
    kind: 'u.transform',
    config: { transformId: 'text.normalize', transformVersion: 1, settings: {} }
  },
  {
    kind: 'u.invoke',
    config: {
      capabilityId: 'local.text-statistics',
      capabilityVersion: 1,
      settings: {}
    }
  },
  {
    kind: 'u.output',
    config: {
      mode: 'return',
      type: 'record',
      schemaRef: 'cf.document-statistics@1'
    }
  }
]);
a = await invoke('tools/call', 'apply_changes', {
  workflowId: id,
  expectedRevision: a.workflow.revision,
  changes: [
    ...aNodes.map((node) => ({ op: 'add_node', node })),
    ...edges(4).map((edge) => ({ op: 'connect', edge }))
  ]
});
await invoke(
  'tools/call',
  'execute_universal',
  {
    workflowId: id,
    expectedRevision: a.workflow.revision,
    idempotencyKey: 'denied'
  },
  'author-only',
  true
);
await invoke(
  'tools/call',
  'create_universal',
  { id: 'denied', name: 'denied' },
  'read',
  true
);
await invoke(
  'tools/call',
  'apply_changes',
  {
    workflowId: id,
    expectedRevision: 1,
    changes: [{ op: 'rename_workflow', name: 'stale' }]
  },
  'local-write',
  true
);
await invoke(
  'tools/call',
  'apply_changes',
  {
    workflowId: id,
    expectedRevision: a.workflow.revision,
    changes: [
      { op: 'rename_workflow', name: 'rollback' },
      {
        op: 'configure_node',
        nodeId: 'n0',
        config: { type: 'number', value: 7 }
      }
    ]
  },
  'local-write',
  true
);
assert.deepEqual(
  (await invoke('tools/call', 'get_workflow', { workflowId: id })).workflow,
  a.workflow
);
const first = await invoke('tools/call', 'execute_universal', {
  workflowId: id,
  expectedRevision: a.workflow.revision,
  idempotencyKey: 'first'
});
assert.equal(first.run.status, 'completed');
assert.deepEqual(first.run.states.n3.outputs.value.value, {
  characters: 13,
  words: 3,
  lines: 1
});
assert.equal(
  (
    await invoke(
      'tools/call',
      'get_execution',
      { workflowId: id, runId: first.run.id },
      'read'
    )
  ).run.id,
  first.run.id
);
assert.equal(
  (
    await invoke('tools/call', 'execute_universal', {
      workflowId: id,
      expectedRevision: a.workflow.revision,
      idempotencyKey: 'first'
    })
  ).run.id,
  first.run.id
);
assert.deepEqual(
  (
    await invoke(
      'tools/call',
      'get_artifact',
      { artifactId: first.run.states.n2.outputs.value.id },
      'read'
    )
  ).artifact.value,
  { characters: 13, words: 3, lines: 1 }
);
assert.equal(
  (
    await invoke(
      'tools/call',
      'list_universal_runs',
      { workflowId: id },
      'read'
    )
  ).runs.length,
  1
);
const imported = await invoke('tools/call', 'import_image', {
  base64: png().toString('base64'),
  name: 'u1-local.png'
});
await invoke(
  'tools/call',
  'import_image',
  { base64: png().toString('base64'), name: 'denied.png' },
  'author-only',
  true
);
const bId = `${id}-image`;
let b = await invoke('tools/call', 'create_universal', {
  id: bId,
  name: 'U1 B · managed image return'
});
const bNodes = nodes([
  {
    kind: 'u.input',
    config: { type: 'image', artifactId: imported.artifact.id }
  },
  {
    kind: 'u.transform',
    config: { transformId: 'image.identity', transformVersion: 1, settings: {} }
  },
  { kind: 'u.output', config: { mode: 'return', type: 'image' } }
]);
b = await invoke('tools/call', 'save_workflow', {
  workflow: { ...b.workflow, nodes: bNodes, edges: edges(3) },
  expectedRevision: b.workflow.revision
});
const imageRun = await invoke('tools/call', 'execute_universal', {
  workflowId: bId,
  expectedRevision: b.workflow.revision,
  idempotencyKey: 'image'
});
assert.equal(imageRun.run.status, 'completed');
const image = await invoke(
  'tools/call',
  'get_artifact',
  { artifactId: imageRun.run.states.n2.outputs.value.id },
  'read'
);
assert.equal(image.artifact.contentHash, imported.artifact.contentHash);
assert.deepEqual(
  (await invoke('tools/call', 'get_workflow', { workflowId: bId }, 'read'))
    .workflow,
  b.workflow
);
writeFileSync(
  resolve(evidence, 'inspector-summary.json'),
  JSON.stringify(
    {
      status: 'PASS',
      scope:
        'Official MCP Inspector stdio; each invocation starts a new server process; no visual app process needed; isolated DB and media',
      dataRoot: root,
      workflowA: id,
      workflowB: bId,
      urlA: a.url,
      urlB: b.url,
      runA: first.run.id,
      runB: imageRun.run.id,
      tools: tools.tools.length,
      actualChatGPTSide: false,
      paidCalls: 0
    },
    null,
    2
  )
);
console.log(
  'U1 official Inspector proof PASS: isolated authoring, execution, persistence, read grants and separate effect denials.'
);
