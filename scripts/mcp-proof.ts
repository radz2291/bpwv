import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const inspector = resolve(
  'node_modules/@modelcontextprotocol/inspector/clients/launcher/build/index.js'
);
mkdirSync('data', { recursive: true });
mkdirSync('evidence', { recursive: true });
const configPath = resolve('data/mcp-inspector-proof.config.json');
writeFileSync(
  configPath,
  JSON.stringify(
    {
      mcpServers: {
        'creative-flow': {
          command: process.execPath,
          args: [
            resolve('node_modules/tsx/dist/cli.mjs'),
            resolve('src/mcp/stdio.ts'),
            '--write'
          ],
          cwd: process.cwd()
        },
        'creative-flow-read': {
          command: process.execPath,
          args: [
            resolve('node_modules/tsx/dist/cli.mjs'),
            resolve('src/mcp/stdio.ts')
          ],
          cwd: process.cwd()
        }
      }
    },
    null,
    2
  )
);
const transcript: {
  step: string;
  exitCode: number | null;
  result: unknown;
  diagnostics: string;
}[] = [];
async function invoke(
  method: string,
  name?: string,
  args?: unknown,
  readOnly = false,
  expectedError = false
) {
  const argv = [
    inspector,
    '--cli',
    '--config',
    configPath,
    '--server',
    readOnly ? 'creative-flow-read' : 'creative-flow',
    '--method',
    method,
    '--format',
    'json'
  ];
  if (name)
    argv.push(
      '--tool-name',
      name,
      '--tool-args-json',
      JSON.stringify(args ?? {})
    );
  const result = await new Promise<{
    stdout: string;
    stderr: string;
    code: number | null;
  }>((resolve, reject) => {
    const p = spawn(process.execPath, argv, {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '',
      stderr = '';
    p.stdout.on('data', (d) => (stdout += d));
    p.stderr.on('data', (d) => (stderr += d));
    p.on('error', reject);
    p.on('close', (code) => resolve({ stdout, stderr, code }));
  });
  const parsed = result.stdout.trim()
    ? JSON.parse(result.stdout)
    : { error: result.stderr };
  transcript.push({
    step: name ?? method,
    exitCode: result.code,
    result: parsed,
    diagnostics: result.stderr
  });
  const value = parsed.result ?? parsed;
  if (expectedError) {
    assert.ok(value.isError || result.code !== 0, `Expected error for ${name}`);
    return value;
  }
  assert.equal(result.code, 0, `${name}: ${result.stderr}\n${result.stdout}`);
  assert.ok(!value.isError, JSON.stringify(value));
  return value.structuredContent ?? value;
}
const initialized = await invoke('initialize');
const tools = await invoke('tools/list');
assert.equal(tools.tools.length, 16);
assert.ok(
  tools.tools.every(
    (t: any) => t.inputSchema && t.outputSchema && t.annotations
  )
);
const catalog = await invoke('tools/call', 'node_types');
assert.equal(catalog.nodes.length, 6);
const id = `mcp-proof-${Date.now()}`;
let result = await invoke('tools/call', 'create_workflow', {
  id,
  name: 'MCP Inspector · authored without browser'
});
let graph = result.workflow;
const node = (
  id: string,
  kind: string,
  config: Record<string, unknown>,
  x: number,
  y: number
) => ({ id, kind, version: 1, label: id, config, position: { x, y } });
const nodes = [
  node(
    'scene',
    'text',
    { text: 'A quiet mountain observatory at dawn.' },
    30,
    40
  ),
  node('style', 'text', { text: 'Soft light and restrained colors.' }, 30, 290),
  node('combine', 'combine', { separator: '\n\n' }, 360, 160)
];
const edges = [
  {
    id: 'scene-combine',
    source: 'scene',
    sourceHandle: 'text',
    target: 'combine',
    targetHandle: 'scene'
  },
  {
    id: 'style-combine',
    source: 'style',
    sourceHandle: 'text',
    target: 'combine',
    targetHandle: 'style'
  }
];
result = await invoke('tools/call', 'apply_changes', {
  workflowId: id,
  expectedRevision: graph.revision,
  changes: [
    ...nodes.map((node) => ({ op: 'add_node', node })),
    ...edges.map((edge) => ({ op: 'connect', edge }))
  ]
});
graph = result.workflow;
assert.equal(graph.revision, 2);
const snapshot = structuredClone(graph);
await invoke(
  'tools/call',
  'apply_changes',
  {
    workflowId: id,
    expectedRevision: 2,
    changes: [
      {
        op: 'configure_node',
        nodeId: 'scene',
        config: { text: 'Must roll back' }
      },
      { op: 'connect', edge: { ...edges[0], id: 'bad', targetHandle: 'wrong' } }
    ]
  },
  false,
  true
);
assert.deepEqual(
  (await invoke('tools/call', 'get_workflow', { workflowId: id })).workflow,
  snapshot
);
await invoke(
  'tools/call',
  'configure_node',
  {
    workflowId: id,
    expectedRevision: 1,
    nodeId: 'scene',
    config: { text: 'Stale edit' }
  },
  false,
  true
);
result = await invoke('tools/call', 'configure_node', {
  workflowId: id,
  expectedRevision: 2,
  nodeId: 'scene',
  config: { text: 'A quiet mountain observatory at sunrise.' }
});
graph = result.workflow;
result = await invoke('tools/call', 'save_workflow', {
  workflow: graph,
  expectedRevision: graph.revision
});
graph = result.workflow;
const local = await invoke('tools/call', 'execute_local', {
  workflowId: id,
  expectedRevision: graph.revision
});
assert.equal(
  local.run.states.combine.outputs.text,
  'A quiet mountain observatory at sunrise.\n\nSoft light and restrained colors.'
);
const validation = await invoke('tools/call', 'validate_workflow', {
  workflow: graph
});
assert.equal(validation.readyToExecute, true);
// Associate a real pre-existing local screenshot as imported media, never as a generated model output.
const form = new FormData();
form.set(
  'file',
  new Blob([readFileSync('evidence/editor.png')], { type: 'image/png' }),
  'editor.png'
);
const response = await fetch('http://127.0.0.1:5173/api/assets', {
  method: 'POST',
  headers: { Origin: 'http://127.0.0.1:5173' },
  body: form
});
assert.ok(response.ok);
const imported = await response.json();
result = await invoke('tools/call', 'associate_asset', {
  workflowId: id,
  expectedRevision: graph.revision,
  nodeId: 'scene',
  asset: {
    ...imported,
    provenance: 'imported',
    runId: local.run.id,
    parentIds: []
  }
});
graph = result.workflow;
const assets = await invoke('tools/call', 'get_assets', { workflowId: id });
assert.equal(assets.assets[0].sourceNodeId, 'scene');
assert.equal(assets.assets[0].provenance, 'imported');
const states = await invoke('tools/call', 'get_execution', { workflowId: id });
assert.equal(states.run.id, local.run.id);
const readonlyTools = await invoke('tools/list', undefined, undefined, true);
assert.equal(readonlyTools.tools.length, 6);
assert.ok(readonlyTools.tools.every((t: any) => t.annotations.readOnlyHint));
await invoke(
  'tools/call',
  'create_workflow',
  { name: 'unauthorized' },
  true,
  true
);
const reopened = await invoke(
  'tools/call',
  'get_workflow',
  { workflowId: id },
  true
);
assert.deepEqual(reopened.workflow, graph);
const visual = await fetch(`http://127.0.0.1:5173/api/workflows/${id}`);
assert.deepEqual(await visual.json(), graph);
const report = {
  verifiedAt: new Date().toISOString(),
  inspectorVersion: JSON.parse(
    readFileSync(
      'node_modules/@modelcontextprotocol/inspector/package.json',
      'utf8'
    )
  ).version,
  sdkVersion: JSON.parse(
    readFileSync('node_modules/@modelcontextprotocol/sdk/package.json', 'utf8')
  ).version,
  initialized,
  workflowId: id,
  url: reopened.url,
  revision: graph.revision,
  checks: [
    'typed contract discovery',
    'create workflow',
    'atomic add/connect batch',
    'invalid batch rollback',
    'stale edit rejection',
    'configure and save',
    'local execution without model calls',
    'validate',
    'origin asset association',
    'execution retrieval',
    'read-only write denied',
    'separate MCP sessions reopen same workflow',
    'editor HTTP and MCP graph parity'
  ],
  creditsSpent: 0,
  transcript
};
writeFileSync(
  'evidence/mcp-inspector-proof.json',
  JSON.stringify(report, null, 2)
);
writeFileSync(
  'evidence/mcp-authoring-workflow.json',
  JSON.stringify(graph, null, 2)
);
console.log(`Official MCP Inspector proof PASS: ${reopened.url}`);
