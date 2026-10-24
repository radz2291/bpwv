import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const root = fileURLToPath(new URL('..', import.meta.url));
const child = spawn(
  process.execPath,
  [
    resolve(root, 'node_modules/tsx/dist/cli.mjs'),
    resolve(root, 'src/mcp/stdio.ts'),
    ...process.argv.slice(2)
  ],
  { cwd: root, stdio: 'inherit', windowsHide: true }
);
child.on('error', (error) => {
  console.error(error.message);
  process.exit(1);
});
child.on('exit', (code) => process.exit(code ?? 1));
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => child.kill(signal));
