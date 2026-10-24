import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import type { Workflow } from '../contract';
mkdirSync('data/assets', { recursive: true });
export const db = new DatabaseSync('data/creative-flow.sqlite');
db.exec(
  `PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS workflows (id TEXT PRIMARY KEY, revision INTEGER NOT NULL, document TEXT NOT NULL); CREATE TABLE IF NOT EXISTS runs (id TEXT PRIMARY KEY, workflowId TEXT, document TEXT NOT NULL); CREATE TABLE IF NOT EXISTS requests (id TEXT PRIMARY KEY, document TEXT NOT NULL);`
);
export function save(graph: Workflow) {
  return saveAtomic(graph);
}
function saveAtomic(graph: Workflow) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const existing = db
      .prepare('SELECT revision FROM workflows WHERE id=?')
      .get(graph.id) as { revision: number } | undefined;
    if (existing && existing.revision !== graph.revision)
      throw Error('Revision conflict: reload before saving');
    const next = { ...graph, revision: (existing?.revision ?? 0) + 1 };
    db.prepare('INSERT OR REPLACE INTO workflows VALUES(?,?,?)').run(
      next.id,
      next.revision,
      JSON.stringify(next)
    );
    db.exec('COMMIT');
    return next;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}
export function getWorkflow(id: string): Workflow | undefined {
  const row = db
    .prepare('SELECT document FROM workflows WHERE id=?')
    .get(id) as { document: string } | undefined;
  return row ? JSON.parse(row.document) : undefined;
}
