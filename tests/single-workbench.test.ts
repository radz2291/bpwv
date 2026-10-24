import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { WorkflowService } from '../src/lib/server/workflow-service';
import { initializeDatabase } from '../src/lib/server/store';
test('new workflows default to universal; explicit legacy format remains inspectable without an editor', () => {
  const db = new DatabaseSync(':memory:');
  initializeDatabase(db);
  const s = new WorkflowService(db);
  assert.equal(s.create({ id: 'new', name: 'New' }).schemaVersion, 2);
  assert.equal(
    s.create({ id: 'legacy', name: 'Historical', schemaVersion: 1 })
      .schemaVersion,
    1
  );
  assert.equal(s.list().find((g) => g.id === 'new')?.schemaVersion, 2);
  db.close();
});
test('maintenance archive rejects stale batches atomically and retains revision/history rows', () => {
  const db = new DatabaseSync(':memory:');
  initializeDatabase(db);
  const s = new WorkflowService(db);
  s.create({ id: 'demo-a', name: 'Demo A' });
  s.create({ id: 'demo-b', name: 'Demo B' });
  db.prepare('INSERT INTO runs VALUES(?,?,?)').run(
    'history',
    'demo-a',
    '{"historical":true}'
  );
  assert.throws(
    () =>
      s.archiveWorkflows([
        { id: 'demo-a', expectedRevision: 1 },
        { id: 'demo-b', expectedRevision: 2 }
      ]),
    /revision/i
  );
  assert.equal(s.list().length, 2);
  const archived = s.archiveWorkflows([{ id: 'demo-a', expectedRevision: 1 }]);
  assert.equal(archived[0].id, 'demo-a');
  assert.equal(s.list().length, 1);
  assert.throws(() => s.get('demo-a'), /not found/i);
  assert.equal(
    db
      .prepare(
        'SELECT COUNT(*) AS n FROM workflow_revisions WHERE workflowId=?'
      )
      .get('demo-a')?.n,
    1
  );
  assert.equal(
    db.prepare('SELECT document FROM runs WHERE id=?').get('history')?.document,
    '{"historical":true}'
  );
  db.close();
});
