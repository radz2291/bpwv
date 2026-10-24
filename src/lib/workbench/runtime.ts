import { DatabaseSync } from 'node:sqlite';
import { randomUUID, createHash } from 'node:crypto';
import {
  mkdirSync,
  writeFileSync,
  renameSync,
  readFileSync,
  existsSync
} from 'node:fs';
import { resolve } from 'node:path';
import { inflateSync } from 'node:zlib';
import {
  defaultRegistry,
  definition,
  digest,
  inspectDocument,
  semanticHash,
  validateDocument,
  validateValue,
  type UniversalWorkflow,
  type WorkbenchRegistry,
  type ValueType
} from './contracts';

export type Artifact = {
  id: string;
  familyId: string;
  version: number;
  previousId?: string;
  type: ValueType;
  schemaRef?: string;
  value: unknown;
  contentHash: string;
  parents: { artifactId: string; role: 'value' }[];
  workflowId: string;
  revision: number;
  runId: string;
  attemptId: string;
  nodeId: string;
  outputPort: string;
  snapshotHash: string;
  provenance: 'local' | 'imported';
  createdAt: string;
  byteLength?: number;
  mime?: string;
};
export type UState = {
  status: 'running' | 'completed' | 'failed' | 'blocked' | 'interrupted';
  outputs: Record<string, Artifact>;
  error?: string;
};
export type Attempt = { id: string; nodeId: string; status: UState['status'] };
export type UniversalRun = {
  id: string;
  workflowId: string;
  revision: number;
  status: 'running' | 'completed' | 'failed' | 'interrupted';
  snapshot: UniversalWorkflow;
  snapshotHash: string;
  semanticHash: string;
  contracts: Record<string, string>;
  states: Record<string, UState>;
  attempts: Attempt[];
  createdAt: string;
  completedAt?: string;
};
export function initializeWorkbench(db: DatabaseSync, injectFailure = false) {
  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec(
      `CREATE TABLE IF NOT EXISTS wb_migrations(version INTEGER PRIMARY KEY,appliedAt TEXT NOT NULL);CREATE TABLE IF NOT EXISTS wb_artifacts(id TEXT PRIMARY KEY,familyId TEXT NOT NULL,version INTEGER NOT NULL,document TEXT NOT NULL,seal TEXT NOT NULL,UNIQUE(familyId,version));CREATE TABLE IF NOT EXISTS wb_runs(id TEXT PRIMARY KEY,workflowId TEXT NOT NULL,idempotencyKey TEXT NOT NULL,snapshotHash TEXT NOT NULL,document TEXT NOT NULL,seal TEXT NOT NULL,UNIQUE(workflowId,idempotencyKey));CREATE TABLE IF NOT EXISTS wb_execution_locks(workflowId TEXT PRIMARY KEY,runId TEXT NOT NULL);CREATE TABLE IF NOT EXISTS wb_run_owners(runId TEXT PRIMARY KEY,pid INTEGER NOT NULL);CREATE TABLE IF NOT EXISTS wb_attempts(id TEXT PRIMARY KEY,runId TEXT NOT NULL,nodeId TEXT NOT NULL,status TEXT NOT NULL,UNIQUE(runId,nodeId));`
    );
    if (injectFailure) throw Error('Injected migration failure');
    const future = db
      .prepare('SELECT version FROM wb_migrations WHERE version>1')
      .get();
    if (future) throw Error('Unsupported future storage migration');
    db.prepare('INSERT OR IGNORE INTO wb_migrations VALUES(1,?)').run(
      new Date().toISOString()
    );
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}
function bytesHash(bytes: Buffer) {
  return createHash('sha256').update(bytes).digest('hex');
}
function parse<T>(row: unknown): T {
  if (!row) throw Error('Not found');
  const r = row as { document: string; seal: string };
  const v = JSON.parse(r.document);
  if (digest(v) !== r.seal) throw Error('Stored record integrity mismatch');
  return v as T;
}
function png(bytes: Buffer) {
  if (
    bytes.length > 8 * 1024 * 1024 ||
    !bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))
  )
    throw Error('Expected PNG under 8MiB');
  let p = 8,
    width = 0,
    height = 0,
    bpp = 0,
    ended = false;
  const data: Buffer[] = [];
  while (p < bytes.length) {
    if (p + 12 > bytes.length) throw Error('Truncated PNG');
    const len = bytes.readUInt32BE(p),
      tag = bytes.toString('ascii', p + 4, p + 8);
    if (p + 12 + len > bytes.length) throw Error('Truncated PNG chunk');
    const body = bytes.subarray(p + 8, p + 8 + len);
    let crc = 0xffffffff;
    for (const n of bytes.subarray(p + 4, p + 8 + len)) {
      crc ^= n;
      for (let i = 0; i < 8; i++)
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    if ((crc ^ 0xffffffff) >>> 0 !== bytes.readUInt32BE(p + 8 + len))
      throw Error('PNG CRC mismatch');
    if (tag === 'IHDR') {
      if (p !== 8 || len !== 13) throw Error('Invalid PNG header');
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      const channels = ({ 0: 1, 2: 3, 4: 2, 6: 4 } as Record<number, number>)[
        body[9]
      ];
      if (
        !width ||
        !height ||
        width > 4096 ||
        height > 4096 ||
        body[8] !== 8 ||
        !channels ||
        body[10] !== 0 ||
        body[11] !== 0 ||
        body[12] !== 0
      )
        throw Error(
          'Supported PNG: 8-bit noninterlaced grayscale/RGB/RGBA, <=4096'
        );
      bpp = channels;
    } else if (tag === 'IDAT') data.push(body);
    else if (tag === 'IEND') {
      if (len !== 0 || p + 12 !== bytes.length) throw Error('Invalid PNG end');
      ended = true;
    } else if (tag[0] === tag[0].toUpperCase())
      throw Error('Unsupported critical PNG chunk');
    p += len + 12;
  }
  if (!ended || !bpp || !data.length) throw Error('Incomplete PNG');
  const raw = inflateSync(Buffer.concat(data), {
    maxOutputLength: 70 * 1024 * 1024
  });
  if (raw.length !== (width * bpp + 1) * height)
    throw Error('Invalid decoded PNG size');
  for (let y = 0; y < height; y++)
    if (raw[y * (width * bpp + 1)] > 4) throw Error('Invalid PNG filter');
  return { width, height };
}
export class WorkbenchRuntime {
  readonly registry: WorkbenchRegistry;
  readonly root: string;
  readonly allowLocal: boolean;
  constructor(
    readonly connection: DatabaseSync,
    root: string,
    options: { allowLocal?: boolean; registry?: WorkbenchRegistry } = {}
  ) {
    this.root = resolve(root);
    this.registry = options.registry ?? defaultRegistry;
    this.allowLocal = options.allowLocal === true;
    initializeWorkbench(connection);
    mkdirSync(resolve(this.root, 'workbench', 'blobs'), { recursive: true });
    this.recover();
  }
  private permit() {
    if (!this.allowLocal)
      throw Error('Managed local execution permission denied');
  }
  private transaction<T>(work: () => T): T {
    this.connection.exec('BEGIN IMMEDIATE');
    try {
      const result = work();
      this.connection.exec('COMMIT');
      return result;
    } catch (e) {
      this.connection.exec('ROLLBACK');
      throw e;
    }
  }
  private transitionAttempt(id: string, status: Attempt['status']) {
    const result = this.connection
      .prepare('UPDATE wb_attempts SET status=? WHERE id=? AND status=?')
      .run(status, id, 'running');
    if (result.changes !== 1)
      throw Error('Attempt terminal transition conflict');
  }
  private blobPath(hash: string) {
    if (!/^[a-f0-9]{64}$/.test(hash)) throw Error('Invalid blob locator');
    return resolve(this.root, 'workbench', 'blobs', `${hash}.png`);
  }
  private persistRun(run: UniversalRun) {
    const row = this.connection
      .prepare('SELECT document FROM wb_runs WHERE id=?')
      .get(run.id) as { document: string } | undefined;
    if (row && JSON.parse(row.document).status !== 'running')
      throw Error('Run already terminal');
    const updated = this.connection
      .prepare('UPDATE wb_runs SET document=?,seal=? WHERE id=? AND document=?')
      .run(JSON.stringify(run), digest(run), run.id, row!.document);
    if (updated.changes !== 1)
      throw Error('Concurrent run transition conflict');
  }
  private contentHash(type: ValueType, value: unknown) {
    if (type === 'image') {
      const v = value as { blob: string };
      return bytesHash(readFileSync(this.blobPath(v.blob)));
    }
    return digest({ type, value });
  }
  private storeArtifact(
    input: Omit<
      Artifact,
      'id' | 'version' | 'previousId' | 'createdAt' | 'contentHash'
    >
  ) {
    validateValue(input.type, input.value, input.schemaRef);
    const previous = this.connection
      .prepare(
        'SELECT document,seal FROM wb_artifacts WHERE familyId=? ORDER BY version DESC LIMIT 1'
      )
      .get(input.familyId);
    const old = previous ? parse<Artifact>(previous) : undefined;
    const artifact: Artifact = {
      ...input,
      id: randomUUID(),
      version: (old?.version ?? 0) + 1,
      ...(old ? { previousId: old.id } : {}),
      createdAt: new Date().toISOString(),
      contentHash: this.contentHash(input.type, input.value)
    };
    this.connection
      .prepare(
        'INSERT INTO wb_artifacts(id,familyId,version,document,seal) VALUES(?,?,?,?,?)'
      )
      .run(
        artifact.id,
        artifact.familyId,
        artifact.version,
        JSON.stringify(artifact),
        digest(artifact)
      );
    return artifact;
  }
  importImage({ base64, name }: { base64: string; name: string }) {
    this.permit();
    if (!/^[\w .()-]{1,160}$/.test(name) || name.includes('..'))
      throw Error('Invalid image name');
    if (
      base64.length > 12 * 1024 * 1024 ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
        base64
      )
    )
      throw Error('Invalid/oversize base64');
    const bytes = Buffer.from(base64, 'base64'),
      size = png(bytes),
      hash = bytesHash(bytes),
      target = this.blobPath(hash);
    if (!existsSync(target)) {
      const temp = `${target}.${randomUUID()}.tmp`;
      writeFileSync(temp, bytes, { flag: 'wx', flush: true });
      renameSync(temp, target);
    }
    return this.storeArtifact({
      familyId: `import:${randomUUID()}`,
      type: 'image',
      value: { blob: hash, ...size, name },
      parents: [],
      workflowId: '__imports',
      revision: 0,
      runId: 'import',
      attemptId: 'import',
      nodeId: 'import',
      outputPort: 'value',
      snapshotHash: digest({ hash, name }),
      provenance: 'imported',
      byteLength: bytes.length,
      mime: 'image/png'
    });
  }
  artifact(id: string, ancestry = new Set<string>()): Artifact {
    if (ancestry.has(id) || ancestry.size > 500)
      throw Error('Artifact lineage cycle/limit');
    ancestry.add(id);
    const row = this.connection
      .prepare(
        'SELECT document,seal,familyId,version FROM wb_artifacts WHERE id=?'
      )
      .get(id);
    const a = parse<Artifact>(row);
    if (row!.familyId !== a.familyId || row!.version !== a.version)
      throw Error('Artifact index identity mismatch');
    if (
      !['local', 'imported'].includes(a.provenance) ||
      !['text', 'number', 'boolean', 'record', 'image'].includes(a.type) ||
      !Array.isArray(a.parents) ||
      a.outputPort !== 'value'
    )
      throw Error('Invalid artifact contract');
    if (
      a.provenance === 'imported' &&
      (a.type !== 'image' ||
        a.workflowId !== '__imports' ||
        a.revision !== 0 ||
        a.runId !== 'import' ||
        a.attemptId !== 'import' ||
        a.nodeId !== 'import' ||
        a.parents.length ||
        a.version !== 1 ||
        a.previousId)
    )
      throw Error('Invalid import provenance');
    if (a.id !== id || a.contentHash !== this.contentHash(a.type, a.value))
      throw Error('Artifact digest mismatch');
    validateValue(a.type, a.value, a.schemaRef);
    if (a.type === 'image') {
      const bytes = readFileSync(
        this.blobPath((a.value as { blob: string }).blob)
      );
      const dimensions = png(bytes);
      if (
        bytesHash(bytes) !== (a.value as { blob: string }).blob ||
        bytes.length !== a.byteLength ||
        dimensions.width !== (a.value as { width: number }).width ||
        dimensions.height !== (a.value as { height: number }).height
      )
        throw Error('Image bytes/metadata mismatch');
    }
    if (a.provenance === 'local') {
      const run = parse<UniversalRun>(
        this.connection
          .prepare('SELECT document,seal FROM wb_runs WHERE id=?')
          .get(a.runId)
      );
      const attempt = run.attempts.find((t) => t.id === a.attemptId);
      const node = run.snapshot.nodes.find((n) => n.id === a.nodeId);
      if (
        run.snapshotHash !==
          digest({ graph: run.snapshot, contracts: run.contracts }) ||
        run.semanticHash !== semanticHash(run.snapshot) ||
        run.id !== a.runId
      )
        throw Error('Artifact frozen snapshot mismatch');
      const contract = JSON.parse(run.contracts[a.nodeId]) as {
        outputs: { id: string; type: ValueType; schemaRef?: string }[];
      };
      const output = contract.outputs.find((p) => p.id === a.outputPort);
      if (!output || output.type !== a.type || output.schemaRef !== a.schemaRef)
        throw Error('Artifact frozen output contract mismatch');
      if (
        !attempt ||
        attempt.nodeId !== a.nodeId ||
        !node ||
        a.workflowId !== run.workflowId ||
        a.revision !== run.revision ||
        a.snapshotHash !== run.snapshotHash ||
        a.outputPort !== 'value'
      )
        throw Error('Artifact producer/snapshot mismatch');
      const expected = run.snapshot.edges.filter((e) => e.target === a.nodeId);
      if (node.kind !== 'u.input' && a.parents.length !== expected.length)
        throw Error('Artifact parent count mismatch');
      if (
        node.kind === 'u.input' &&
        node.config.type === 'image' &&
        (a.parents.length !== 1 ||
          a.parents[0].artifactId !== node.config.artifactId)
      )
        throw Error('Imported input binding mismatch');
      if (
        node.kind === 'u.input' &&
        node.config.type !== 'image' &&
        (a.parents.length ||
          digest(a.value) !== digest(node.config.value) ||
          a.type !== node.config.type ||
          a.schemaRef !== node.config.schemaRef)
      )
        throw Error('Frozen input value mismatch');
      for (const parent of a.parents) {
        const p = this.artifact(parent.artifactId, new Set(ancestry));
        const source = run.snapshot.edges.find(
          (e) =>
            e.target === a.nodeId &&
            e.source === p.nodeId &&
            e.sourceHandle === p.outputPort
        );
        if (!source && node.kind !== 'u.input')
          throw Error('Artifact parent binding mismatch');
        if (
          source &&
          run.states[source.source]?.outputs[source.sourceHandle]?.id !== p.id
        )
          throw Error('Artifact parent version mismatch');
        if (parent.role !== 'value') throw Error('Artifact role mismatch');
      }
      const state = run.states[a.nodeId];
      if (
        state?.status !== 'completed' ||
        attempt?.status !== 'completed' ||
        digest(state.outputs.value) !== digest(a)
      )
        throw Error('Artifact not bound to producer output');
    }
    if (a.version < 1 || !Number.isInteger(a.version))
      throw Error('Invalid artifact version');
    if (a.previousId) {
      const previous = parse<Artifact>(
        this.connection
          .prepare('SELECT document,seal FROM wb_artifacts WHERE id=?')
          .get(a.previousId)
      );
      if (
        previous.familyId !== a.familyId ||
        previous.version !== a.version - 1
      )
        throw Error('Artifact version lineage mismatch');
    } else if (a.version !== 1)
      throw Error('Missing previous artifact version');
    return a;
  }
  content(id: string) {
    const a = this.artifact(id);
    if (a.type !== 'image') throw Error('Not an image');
    return readFileSync(this.blobPath((a.value as { blob: string }).blob));
  }
  getRun(id: string): UniversalRun {
    const run = parse<UniversalRun>(
      this.connection
        .prepare('SELECT document,seal FROM wb_runs WHERE id=?')
        .get(id)
    );
    if (
      run.id !== id ||
      run.snapshotHash !==
        digest({ graph: run.snapshot, contracts: run.contracts }) ||
      run.semanticHash !== semanticHash(run.snapshot) ||
      run.workflowId !== run.snapshot.id ||
      run.revision !== run.snapshot.revision
    )
      throw Error('Run frozen snapshot mismatch');
    const rows = this.connection
      .prepare('SELECT * FROM wb_attempts WHERE runId=?')
      .all(id) as { id: string; nodeId: string; status: string }[];
    if (
      rows.length !== run.attempts.length ||
      rows.some(
        (row) =>
          !run.attempts.some(
            (a) =>
              a.id === row.id &&
              a.nodeId === row.nodeId &&
              a.status === row.status
          )
      )
    )
      throw Error('Attempt identity mismatch');
    for (const [nodeId, state] of Object.entries(run.states)) {
      if (!run.snapshot.nodes.some((n) => n.id === nodeId))
        throw Error('Unknown state producer');
      if (
        !['running', 'completed', 'failed', 'blocked', 'interrupted'].includes(
          state.status
        )
      )
        throw Error('Unknown execution state');
      if (
        state.status === 'completed' &&
        (Object.keys(state.outputs).length !== 1 || !state.outputs.value)
      )
        throw Error('Missing completed output');
      if (state.status !== 'completed' && Object.keys(state.outputs).length)
        throw Error('Noncompleted state cannot expose output');
      if (
        state.status !== 'blocked' &&
        !run.attempts.some(
          (a) => a.nodeId === nodeId && a.status === state.status
        )
      )
        throw Error('State attempt mismatch');
      for (const artifact of Object.values(state.outputs)) {
        const actual = this.artifact(artifact.id);
        if (digest(actual) !== digest(artifact))
          throw Error('Run output differs from artifact');
        const contract = JSON.parse(run.contracts[nodeId]) as {
          outputs: { type: string; schemaRef?: string }[];
        };
        const output = contract.outputs[0];
        if (
          output.type !== actual.type ||
          output.schemaRef !== actual.schemaRef
        )
          throw Error('Output contract mismatch');
        const node = run.snapshot.nodes.find((n) => n.id === nodeId)!;
        if (node.kind === 'u.output') {
          const edge = run.snapshot.edges.find((e) => e.target === nodeId);
          if (
            !edge ||
            run.states[edge.source]?.outputs[edge.sourceHandle]?.id !==
              actual.id
          )
            throw Error('Output alias binding mismatch');
        } else if (actual.nodeId !== nodeId || actual.runId !== run.id)
          throw Error('Output producer identity mismatch');
      }
    }
    if (
      run.status === 'completed' &&
      (Object.keys(run.states).length !== run.snapshot.nodes.length ||
        Object.values(run.states).some((s) => s.status !== 'completed'))
    )
      throw Error('Invalid completed run');
    return run;
  }
  runs(workflowId: string) {
    return (
      this.connection
        .prepare(
          'SELECT id FROM wb_runs WHERE workflowId=? ORDER BY rowid DESC'
        )
        .all(workflowId) as { id: string }[]
    ).map((r) => this.getRun(r.id));
  }
  recover() {
    const rows = this.connection.prepare('SELECT id FROM wb_runs').all() as {
      id: string;
    }[];
    let interrupted = 0;
    for (const row of rows) {
      const run = this.getRun(row.id);
      if (run.status !== 'running') continue;
      const owner = this.connection
        .prepare('SELECT pid FROM wb_run_owners WHERE runId=?')
        .get(run.id) as { pid: number } | undefined;
      if (owner) {
        try {
          process.kill(owner.pid, 0);
          continue;
        } catch (e) {
          if ((e as NodeJS.ErrnoException).code !== 'ESRCH') continue;
        }
      }
      this.transaction(() => {
        for (const a of run.attempts)
          if (a.status === 'running') {
            a.status = 'interrupted';
            run.states[a.nodeId] = {
              status: 'interrupted',
              outputs: {},
              error: 'Process interrupted; new explicit execution required'
            };
            this.transitionAttempt(a.id, 'interrupted');
          }
        this.connection
          .prepare('DELETE FROM wb_execution_locks WHERE runId=?')
          .run(run.id);
        run.status = 'interrupted';
        run.completedAt = new Date().toISOString();
        this.persistRun(run);
      });
      interrupted++;
    }
    return { interrupted, replayed: 0 };
  }
  async execute(
    raw: UniversalWorkflow,
    { idempotencyKey }: { idempotencyKey: string }
  ) {
    this.permit();
    if (!/^[\w-]{1,160}$/.test(idempotencyKey))
      throw Error('Invalid idempotency key');
    const graph = validateDocument(raw, this.registry);
    const inspection = inspectDocument(graph, this.registry);
    if (!inspection.readyToExecute)
      throw Error(inspection.issues.map((i) => i.message).join('; '));
    const contracts: Record<string, string> = {};
    // Hash only published JSON contracts; functions are intentionally absent.
    for (const n of graph.nodes) {
      const d = definition(n, this.registry);
      contracts[n.id] = JSON.stringify({
        inputs: d.inputs,
        outputs: d.outputs,
        ...(d.manifestHash ? { manifestHash: d.manifestHash } : {}),
        config: n.config,
        settings: d.settings ?? {}
      });
    }
    const snapshotHash = digest({ graph, contracts });
    const existing = this.connection
      .prepare(
        'SELECT id,snapshotHash FROM wb_runs WHERE workflowId=? AND idempotencyKey=?'
      )
      .get(graph.id, idempotencyKey) as
      { id: string; snapshotHash: string } | undefined;
    if (existing) {
      if (existing.snapshotHash !== snapshotHash)
        throw Error('Idempotency key conflicts with revision/snapshot');
      return this.getRun(existing.id);
    }
    const active = this.connection
      .prepare('SELECT document FROM wb_runs WHERE workflowId=?')
      .all(graph.id) as { document: string }[];
    if (active.some((r) => JSON.parse(r.document).status === 'running'))
      throw Error('Workflow execution already running');
    const run: UniversalRun = {
      id: randomUUID(),
      workflowId: graph.id,
      revision: graph.revision,
      status: 'running',
      snapshot: structuredClone(graph),
      snapshotHash,
      semanticHash: semanticHash(graph),
      contracts,
      states: {},
      attempts: [],
      createdAt: new Date().toISOString()
    };
    this.connection.exec('BEGIN IMMEDIATE');
    try {
      this.connection
        .prepare('INSERT INTO wb_execution_locks VALUES(?,?)')
        .run(graph.id, run.id);
      this.connection
        .prepare(
          'INSERT INTO wb_runs(id,workflowId,idempotencyKey,snapshotHash,document,seal) VALUES(?,?,?,?,?,?)'
        )
        .run(
          run.id,
          graph.id,
          idempotencyKey,
          snapshotHash,
          JSON.stringify(run),
          digest(run)
        );
      this.connection
        .prepare('INSERT INTO wb_run_owners VALUES(?,?)')
        .run(run.id, process.pid);
      this.connection.exec('COMMIT');
    } catch (e) {
      this.connection.exec('ROLLBACK');
      const duplicate = this.connection
        .prepare(
          'SELECT id,snapshotHash FROM wb_runs WHERE workflowId=? AND idempotencyKey=?'
        )
        .get(graph.id, idempotencyKey) as
        { id: string; snapshotHash: string } | undefined;
      if (duplicate && duplicate.snapshotHash === snapshotHash)
        return this.getRun(duplicate.id);
      throw e;
    }
    const pending = new Set(graph.nodes.map((n) => n.id));
    while (pending.size) {
      const node = graph.nodes.find(
        (n) =>
          pending.has(n.id) &&
          graph.edges
            .filter((e) => e.target === n.id)
            .every((e) => !pending.has(e.source))
      );
      if (!node) throw Error('Unresolvable graph');
      pending.delete(node.id);
      const incoming = graph.edges.filter((e) => e.target === node.id),
        parents = incoming.map((e) => run.states[e.source]);
      if (parents.some((p) => p.status !== 'completed')) {
        run.states[node.id] = {
          status: 'blocked',
          outputs: {},
          error: 'Dependency failed'
        };
        this.persistRun(run);
        continue;
      }
      const attempt: Attempt = {
        id: randomUUID(),
        nodeId: node.id,
        status: 'running'
      };
      run.attempts.push(attempt);
      run.states[node.id] = { status: 'running', outputs: {} };
      this.transaction(() => {
        this.connection
          .prepare('INSERT INTO wb_attempts VALUES(?,?,?,?)')
          .run(attempt.id, run.id, node.id, 'running');
        this.persistRun(run);
      });
      try {
        const d = definition(node, this.registry),
          parent = d.source?.artifactId
            ? this.artifact(d.source.artifactId)
            : incoming[0]
              ? this.artifact(run.states[incoming[0].source].outputs.value.id)
              : undefined;
        if (
          d.blocked ||
          JSON.stringify({
            inputs: d.inputs,
            outputs: d.outputs,
            ...(d.manifestHash ? { manifestHash: d.manifestHash } : {}),
            config: node.config,
            settings: d.settings ?? {}
          }) !== contracts[node.id]
        )
          throw Error('Resolved contract changed/expired during execution');
        const value: unknown = d.handler
          ? await d.handler.execute(parent?.value, d.settings ?? {})
          : parent
            ? parent.value
            : d.source?.value;
        const p = d.outputs[0];
        validateValue(p.type, value, p.schemaRef);
        if (
          d.source?.artifactId &&
          p.type === 'image' &&
          parent?.type !== 'image'
        )
          throw Error('Input artifact type mismatch');
        let a: Artifact;
        this.connection.exec('BEGIN IMMEDIATE');
        try {
          a = d.alias
            ? parent!
            : this.storeArtifact({
                familyId: `${graph.id}:${node.id}:value`,
                type: p.type,
                ...(p.schemaRef ? { schemaRef: p.schemaRef } : {}),
                value,
                parents: parent
                  ? [{ artifactId: parent.id, role: 'value' }]
                  : [],
                workflowId: graph.id,
                revision: graph.revision,
                runId: run.id,
                attemptId: attempt.id,
                nodeId: node.id,
                outputPort: 'value',
                snapshotHash,
                provenance: 'local',
                ...(p.type === 'image'
                  ? {
                      byteLength: readFileSync(
                        this.blobPath((value as { blob: string }).blob)
                      ).length,
                      mime: 'image/png'
                    }
                  : {})
              });
          attempt.status = 'completed';
          run.states[node.id] = { status: 'completed', outputs: { value: a } };
          this.transitionAttempt(attempt.id, 'completed');
          this.persistRun(run);
          this.connection.exec('COMMIT');
        } catch (e) {
          this.connection.exec('ROLLBACK');
          throw e;
        }
      } catch (e) {
        attempt.status = 'failed';
        run.states[node.id] = {
          status: 'failed',
          outputs: {},
          error: e instanceof Error ? e.message : String(e)
        };
        this.transaction(() => {
          this.transitionAttempt(attempt.id, 'failed');
          this.persistRun(run);
        });
      }
    }
    run.status = Object.values(run.states).every(
      (s) => s.status === 'completed'
    )
      ? 'completed'
      : 'failed';
    run.completedAt = new Date().toISOString();
    this.transaction(() => {
      this.persistRun(run);
      this.connection
        .prepare('DELETE FROM wb_execution_locks WHERE runId=?')
        .run(run.id);
    });
    return this.getRun(run.id);
  }
}
