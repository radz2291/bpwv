// Existing proof bodies, isolated endpoint/data/evidence substitutions only.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const summary = JSON.parse(
  readFileSync('evidence/u1/inspector-summary.json', 'utf8')
);
const root = summary.dataRoot;
const out = 'evidence/u1/legacy/';
mkdirSync(out, { recursive: true });
const env = {
  ...process.env,
  CREATIVE_FLOW_DATA_DIR: root,
  CREATIVE_FLOW_URL: 'http://127.0.0.1:5175',
  CREATIVE_FLOW_APP_URL: 'http://127.0.0.1:5175',
  CREATIVE_FLOW_ALLOW_LOCAL_EXECUTION: '0'
};
for (const file of [
  'agent-proof.ts',
  'browser-proof.mjs',
  'interaction-proof.mjs',
  'mcp-proof.ts',
  'mcp-browser-proof.mjs'
]) {
  const temp = `scripts/.u1-legacy-${file}`;
  const body = readFileSync(`scripts/${file}`, 'utf8')
    .replaceAll('http://127.0.0.1:5173', 'http://127.0.0.1:5175')
    .replaceAll('evidence/', out)
    .replaceAll(
      'data/mcp-inspector-proof.config.json',
      resolve(root, 'legacy-inspector.json').replaceAll('\\', '/')
    )
    .replaceAll(
      'cwd: process.cwd()',
      `cwd: process.cwd(), env: ${JSON.stringify({ CREATIVE_FLOW_DATA_DIR: root, CREATIVE_FLOW_APP_URL: env.CREATIVE_FLOW_URL, CREATIVE_FLOW_ALLOW_LOCAL_EXECUTION: '0' })}`
    )
    // Discovery adds six U1 tools, three read tools. Existing sixteen remain.
    .replace(
      'assert.equal(tools.tools.length, 16)',
      'assert.equal(tools.tools.length, 22)'
    )
    .replace(
      'assert.equal(readonlyTools.tools.length, 6)',
      'assert.equal(readonlyTools.tools.length, 9)'
    );
  writeFileSync(temp, body);
  try {
    const args = file.endsWith('.ts') ? ['--import', 'tsx', temp] : [temp];
    const result = execFileSync(process.execPath, args, {
      env,
      encoding: 'utf8',
      timeout: 240000,
      windowsHide: true
    });
    writeFileSync(`${out}${file}.log.txt`, result);
    console.log(`${file}: PASS`);
  } finally {
    unlinkSync(temp);
  }
}
