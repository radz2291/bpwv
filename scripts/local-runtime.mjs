// Optional machine-local configuration. Explicit isolated process environments win.
import { existsSync, readFileSync } from 'node:fs';
import { resolve, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
export function loadLocalRuntime(
  env = process.env,
  configPath = resolve(
    fileURLToPath(new URL('..', import.meta.url)),
    'data/local-runtime.json'
  )
) {
  if (env.CREATIVE_FLOW_DATA_DIR || !existsSync(configPath)) return;
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  if (
    typeof config.dataDirectory !== 'string' ||
    !isAbsolute(config.dataDirectory) ||
    !existsSync(resolve(config.dataDirectory, 'creative-flow.sqlite')) ||
    typeof config.allowLocalExecution !== 'boolean'
  )
    throw Error('Invalid local runtime configuration');
  const url = new URL(config.appUrl);
  if (
    url.protocol !== 'http:' ||
    url.hostname !== '127.0.0.1' ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  )
    throw Error('Local runtime requires a loopback application URL');
  if (
    config.mcpAuthFile &&
    (typeof config.mcpAuthFile !== 'string' ||
      !isAbsolute(config.mcpAuthFile) ||
      !existsSync(config.mcpAuthFile))
  )
    throw Error('Invalid MCP credential reference');
  // Validate everything before setting any process defaults; never infer a grant.
  env.CREATIVE_FLOW_DATA_DIR = config.dataDirectory;
  env.CREATIVE_FLOW_APP_URL ??= url.origin;
  env.CREATIVE_FLOW_ALLOW_LOCAL_EXECUTION ??= config.allowLocalExecution
    ? '1'
    : '0';
  if (config.mcpAuthFile)
    env.CREATIVE_FLOW_MCP_AUTH_FILE ??= config.mcpAuthFile;
}
