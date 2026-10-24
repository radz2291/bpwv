// Run unchanged legacy proof bodies with only endpoint/evidence-path substitution.
// Isolated server must run at 127.0.0.1:5175 with data/u0/regression.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
mkdirSync('evidence/u0', { recursive: true });
const env = {
  ...process.env,
  CREATIVE_FLOW_DATA_DIR: resolve('data/u0/regression'),
  CREATIVE_FLOW_URL: 'http://127.0.0.1:5175'
};
for (const file of ['agent-proof.ts', 'browser-proof.mjs', 'mcp-proof.ts']) {
  const temp = `scripts/.u0-compat-${file}`;
  const body = readFileSync(`scripts/${file}`, 'utf8')
    .replaceAll('http://127.0.0.1:5173', 'http://127.0.0.1:5175')
    .replaceAll('evidence/', 'evidence/u0/')
    .replaceAll(
      'data/mcp-inspector-proof.config.json',
      'data/u0/mcp-inspector-proof.config.json'
    )
    .replaceAll(
      'cwd: process.cwd()',
      `cwd: process.cwd(), env: ${JSON.stringify({ CREATIVE_FLOW_DATA_DIR: env.CREATIVE_FLOW_DATA_DIR, CREATIVE_FLOW_APP_URL: env.CREATIVE_FLOW_URL })}`
    );
  writeFileSync(temp, body);
  try {
    const args = file.endsWith('.ts') ? ['--import', 'tsx', temp] : [temp];
    const output = execFileSync(process.execPath, args, {
      env,
      encoding: 'utf8',
      timeout: 180000
    });
    writeFileSync(`evidence/u0/${file}.log.txt`, output);
    console.log(`${file}: PASS (isolated data/port)`);
  } finally {
    unlinkSync(temp);
  }
}
