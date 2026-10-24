import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
export const dataDirectory = resolve(
  process.env.CREATIVE_FLOW_DATA_DIR ?? 'data'
);
mkdirSync(resolve(dataDirectory, 'assets'), { recursive: true });
export const db = new DatabaseSync(
  resolve(dataDirectory, 'creative-flow.sqlite')
);
export function initializeDatabase(connection: DatabaseSync) {
  connection.exec(
    `PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS workflows (id TEXT PRIMARY KEY, revision INTEGER NOT NULL, document TEXT NOT NULL); CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, workflowId TEXT, document TEXT NOT NULL); CREATE TABLE IF NOT EXISTS requests (id TEXT PRIMARY KEY, document TEXT NOT NULL); CREATE TABLE IF NOT EXISTS workflow_assets (workflowId TEXT NOT NULL,nodeId TEXT NOT NULL,assetId TEXT NOT NULL,document TEXT NOT NULL,PRIMARY KEY(workflowId,nodeId,assetId));`
  );
}
initializeDatabase(db);
