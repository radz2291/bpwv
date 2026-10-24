import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';
const root = process.cwd(),
  report = JSON.parse(
    readFileSync('evidence/mcp-inspector-proof.json', 'utf8')
  );
let appReachable = false;
try {
  appReachable = (await fetch('http://127.0.0.1:5173')).ok;
} catch {}
assert.equal(appReachable, false, 'Stop the visual app before this test.');
const config = resolve('data/mcp-offline-proof.config.json');
writeFileSync(
  config,
  JSON.stringify({
    mcpServers: {
      offline: {
        command: process.execPath,
        args: [resolve('scripts/mcp-launch.mjs'), '--write']
      }
    }
  })
);
const transcript: unknown[] = [];
async function call(name: string, args: unknown) {
  const argv = [
    resolve(
      'node_modules/@modelcontextprotocol/inspector/clients/launcher/build/index.js'
    ),
    '--cli',
    '--config',
    config,
    '--server',
    'offline',
    '--method',
    'tools/call',
    '--tool-name',
    name,
    '--tool-args-json',
    JSON.stringify(args),
    '--format',
    'json'
  ];
  const r = await new Promise<{
    code: number | null;
    stdout: string;
    stderr: string;
  }>((resolve, reject) => {
    const p = spawn(process.execPath, argv, {
      cwd: tmpdir(),
      windowsHide: true
    });
    let stdout = '',
      stderr = '';
    p.stdout.on('data', (d) => (stdout += d));
    p.stderr.on('data', (d) => (stderr += d));
    p.on('error', reject);
    p.on('close', (code) => resolve({ code, stdout, stderr }));
  });
  assert.equal(r.code, 0, r.stderr);
  const result = JSON.parse(r.stdout).result;
  assert.ok(!result.isError, JSON.stringify(result));
  transcript.push({ name, result });
  return result.structuredContent;
}
const before = await call('get_workflow', { workflowId: report.workflowId });
const changed = await call('configure_node', {
  workflowId: report.workflowId,
  expectedRevision: before.workflow.revision,
  nodeId: 'scene',
  config: {
    text: 'Authored by standalone MCP while the visual app was stopped.'
  }
});
const reopened = await call('get_workflow', { workflowId: report.workflowId });
assert.deepEqual(reopened.workflow, changed.workflow);
const local = await call('execute_local', {
  workflowId: report.workflowId,
  expectedRevision: changed.workflow.revision
});
assert.equal(local.run.states.combine.status, 'completed');
writeFileSync(
  resolve(root, 'evidence/mcp-offline-proof.json'),
  JSON.stringify(
    {
      verifiedAt: new Date().toISOString(),
      workflowId: report.workflowId,
      revision: changed.workflow.revision,
      visualAppWasStopped: true,
      launcherWorkedFromForeignCwd: true,
      checks: [
        'retrieve with editor offline',
        'configure/save with editor offline',
        'reopen across independent Inspector sessions',
        'execute local DAG without UI or Codex runtime'
      ],
      transcript,
      creditsSpent: 0
    },
    null,
    2
  )
);
console.log(
  'Standalone authoring with visual app OFFLINE: official Inspector PASS'
);
