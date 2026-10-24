<script lang="ts">
  import { onMount } from 'svelte';
  import { canonicalize } from 'json-canonicalize';
  import {
    SvelteFlow,
    Background,
    Controls,
    type Node,
    type Edge,
    type Connection
  } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import WorkbenchCard from './WorkbenchCard.svelte';
  let { initialWorkflow = null }: { initialWorkflow?: any } = $props();
  let workflow = $state<any>(null),
    nodes = $state.raw<Node[]>([]),
    edges = $state.raw<Edge[]>([]);
  let catalog = $state<any>({}),
    saved = $state<any[]>([]),
    runs = $state<any[]>([]),
    artifacts = $state<Record<string, any>>({}),
    unavailableArtifacts = $state<Record<string, string>>({});
  let selected = $state(''),
    selectedRun = $state(''),
    message = $state('Loading workbench…'),
    busy = $state(false),
    allowExecution = $state(false);
  let configText = $state(''),
    draftLabel = $state(''),
    sourceId = $state(''),
    targetId = $state('');
  const nodeTypes = { universal: WorkbenchCard };
  let current = $derived(nodes.find((n) => n.id === selected));
  let currentRun = $derived(runs.find((r) => r.id === selectedRun));
  let selectedArtifacts = $derived(
    Object.values(artifacts)
      .filter(
        (a: any) =>
          a.nodeId === selected ||
          runs.some((r) =>
            Object.values(r.states?.[selected]?.outputs ?? {}).some(
              (v: any) => v?.id === a.id
            )
          )
      )
      .sort((a: any, b: any) => b.version - a.version)
  );
  function document() {
    return workflow
      ? {
          ...workflow,
          nodes: nodes.map((n) => ({
            id: n.id,
            kind: n.data.kind,
            version: n.data.version,
            label: n.data.label,
            position: n.position,
            config: n.data.config
          })),
          edges: edges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle ?? 'value',
            targetHandle: e.targetHandle ?? 'input'
          }))
        }
      : null;
  }
  function semantic(g: any) {
    return canonicalize({
      nodes: g?.nodes
        ?.map((n: any) => ({
          id: n.id,
          kind: n.kind,
          version: n.version,
          config: n.config
        }))
        .sort((a: any, b: any) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
      edges: [...(g?.edges ?? [])].sort((a: any, b: any) =>
        a.id < b.id ? -1 : a.id > b.id ? 1 : 0
      )
    });
  }
  function contractChanged() {
    return (
      currentRun?.snapshot?.nodes?.some((node: any) => {
        if (node.kind !== 'u.invoke') return false;
        const current = (catalog.manifests ?? []).find(
          (m: any) =>
            m.id === node.config.capabilityId &&
            m.version === node.config.capabilityVersion
        );
        const frozen = JSON.parse(currentRun.contracts[node.id]);
        return (
          !current ||
          current.hash !== frozen.manifestHash ||
          (current.expiresAt && Date.parse(current.expiresAt) <= Date.now())
        );
      }) ?? false
    );
  }
  let stale = $derived(
    !!currentRun &&
      (contractChanged() ||
        semantic(
          currentRun.graphSnapshot ?? currentRun.snapshot ?? currentRun.workflow
        ) !== semantic(document()))
  );
  async function api(url: string, body?: unknown) {
    const r = await fetch(
      url,
      body === undefined
        ? {}
        : {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          }
    );
    const d = await r.json();
    if (!r.ok) throw Error(d.error ?? 'Request failed');
    return d;
  }
  async function command(body: unknown) {
    return api('/api/workbench', body);
  }
  function ports(n: any) {
    const definitions = catalog.operations ?? catalog.nodes ?? [];
    const def = definitions.find((d: any) => d.kind === n.kind);
    const manifest = (catalog.manifests ?? []).find(
      (d: any) =>
        n.kind === 'u.invoke' &&
        (d.id === n.config?.capabilityId ||
          d.capabilityId === n.config?.capabilityId)
    );
    const transform = (catalog.transforms ?? []).find(
      (d: any) => d.id === n.config?.transformId
    );
    const type = n.config?.type ?? transform?.output?.type ?? 'typed';
    return {
      inputs:
        n.kind === 'u.input'
          ? []
          : manifest
            ? [
                {
                  id: 'input',
                  type: manifest.input,
                  schemaRef: manifest.inputSchema,
                  role: 'value',
                  cardinality: 'single'
                }
              ]
            : transform
              ? [
                  {
                    id: 'input',
                    type: transform.input,
                    schemaRef: transform.inputSchema,
                    role: 'value',
                    cardinality: 'single'
                  }
                ]
              : (def?.inputs ?? [
                  {
                    id: 'input',
                    type: n.config?.type ?? 'typed',
                    schemaRef: n.config?.schemaRef,
                    role: 'value',
                    cardinality: 'single'
                  }
                ]),
      outputs: [
        {
          id: 'value',
          type: manifest?.output ?? transform?.output ?? n.config?.type ?? type,
          schemaRef:
            manifest?.outputSchema ??
            transform?.outputSchema ??
            n.config?.schemaRef,
          role: 'value',
          cardinality: 'single'
        }
      ]
    };
  }
  function sync(g: any) {
    workflow = g;
    nodes = g.nodes.map((n: any) => ({
      id: n.id,
      type: 'universal',
      position: n.position,
      data: { ...n, ...ports(n) }
    }));
    edges = g.edges.map((e: any) => ({ ...e }));
    select(g.nodes[0]?.id ?? '');
  }
  function select(id: string) {
    selected = id;
    const n = nodes.find((n) => n.id === id);
    if (n) {
      configText = JSON.stringify(n.data.config, null, 2);
      draftLabel = String(n.data.label);
    }
  }
  function decorate() {
    nodes = nodes.map((n) => {
      const state =
        currentRun?.states?.[n.id] ?? currentRun?.operations?.[n.id];
      const output = state?.outputs?.value;
      const id =
        typeof output === 'string'
          ? output
          : (output?.id ?? output?.artifactId);
      const artifact =
        artifacts[id] ??
        Object.values(artifacts).find(
          (a: any) =>
            (a.operationId === n.id || a.producer?.operationId === n.id) &&
            a.runId === selectedRun
        );
      return {
        ...n,
        data: {
          ...n.data,
          status: unavailableArtifacts[id] ? 'unavailable' : state?.status,
          unavailable: unavailableArtifacts[id],
          artifact,
          stale,
          description:
            n.data.kind === 'u.invoke'
              ? (n.data.config as any)?.capabilityId
              : n.data.kind === 'u.transform'
                ? (n.data.config as any)?.transformId
                : 'Typed local operation'
        }
      };
    });
  }
  async function refreshList() {
    saved = (await api('/api/workflows')).filter(
      (g: any) => g.schemaVersion === 2
    );
  }
  async function history() {
    if (!workflow) return;
    runs = await api(
      `/api/workbench?action=runs&workflowId=${encodeURIComponent(workflow.id)}`
    );
    selectedRun = runs[0]?.id ?? '';
    await loadArtifacts();
  }
  async function loadArtifacts() {
    const ids = new Set<string>();
    for (const run of runs) {
      for (const state of Object.values(run.states ?? {}) as any[]) {
        for (const a of Object.values(state.outputs ?? {}) as any[]) {
          if (a?.id) ids.add(a.id);
        }
      }
    }
    const loaded: Record<string, any> = {};
    const unavailable: Record<string, string> = {};
    await Promise.all(
      [...ids].map(async (id) => {
        try {
          const a = await api(
            '/api/workbench?action=artifact&id=' + encodeURIComponent(id)
          );
          loaded[a.id] = a;
        } catch (e) {
          unavailable[id] = String(e);
          message = 'Artifact unavailable: ' + String(e);
        }
      })
    );
    artifacts = loaded;
    unavailableArtifacts = unavailable;
    decorate();
  }
  async function open(id: string) {
    try {
      const g = await api(`/api/workflows/${id}`);
      if (g.schemaVersion !== 2) {
        workflow = null;
        nodes = [];
        edges = [];
        runs = [];
        artifacts = {};
        selectedRun = '';
        selected = '';
        message =
          'This legacy workflow is retired. Create or select a universal workflow.';
        window.history.replaceState({}, '', '/');
        return;
      }
      sync(g);
      window.history.replaceState(
        {},
        '',
        `/?workflow=${encodeURIComponent(id)}`
      );
      await history();
      message = `Reopened · revision ${g.revision}`;
    } catch (e) {
      workflow = null;
      nodes = [];
      edges = [];
      runs = [];
      artifacts = {};
      selectedRun = '';
      selected = '';
      window.history.replaceState({}, '', '/');
      message =
        'Workflow unavailable or archived. Create or select a universal workflow.';
    }
  }
  async function save() {
    try {
      sync(await command({ action: 'save', workflow: document() }));
      await refreshList();
      message = `Saved · revision ${workflow.revision}`;
      decorate();
      return true;
    } catch (e) {
      message = String(e);
      return false;
    }
  }
  async function create() {
    const g = await command({ action: 'create', name: 'Universal workflow' });
    sync(g);
    runs = [];
    artifacts = {};
    selectedRun = '';
    window.history.replaceState({}, '', `/?workflow=${g.id}`);
    await refreshList();
    return g;
  }
  function defaults(kind: string) {
    return kind === 'u.input'
      ? { type: 'text', value: '  A reusable idea.  ' }
      : kind === 'u.transform'
        ? { transformId: 'text.normalize', transformVersion: 1 }
        : kind === 'u.invoke'
          ? {
              capabilityId: 'local.text-statistics',
              capabilityVersion: 1,
              settings: {}
            }
          : { mode: 'return', type: 'text' };
  }
  function add(kind: string) {
    if (!workflow) return;
    const id = crypto.randomUUID();
    const n = {
      id,
      kind,
      version: 1,
      label: kind.replace('u.', ''),
      position: { x: 80 + nodes.length * 305, y: 120 },
      config: defaults(kind)
    };
    nodes = [
      ...nodes,
      {
        id,
        type: 'universal',
        position: n.position,
        data: { ...n, ...ports(n) }
      }
    ];
    select(id);
    message = 'Draft edited · save to persist';
  }
  function connect(c: Connection) {
    edges = [...edges, { ...c, id: crypto.randomUUID() }];
    message = 'Connection drafted · validated on save';
  }
  function connectForm() {
    if (sourceId && targetId && sourceId !== targetId)
      connect({
        source: sourceId,
        target: targetId,
        sourceHandle: 'value',
        targetHandle: 'input'
      });
  }
  function applyConfig() {
    try {
      const config = JSON.parse(configText);
      nodes = nodes.map((n) =>
        n.id === selected
          ? {
              ...n,
              data: {
                ...n.data,
                label: draftLabel,
                config,
                ...ports({ ...n.data, config })
              }
            }
          : n
      );
      message = 'Configuration drafted · save to validate';
      decorate();
    } catch (e) {
      message = String(e);
    }
  }
  function remove() {
    nodes = nodes.filter((n) => n.id !== selected);
    edges = edges.filter((e) => e.source !== selected && e.target !== selected);
    select(nodes[0]?.id ?? '');
  }
  async function execute() {
    busy = true;
    try {
      if (!(await save())) return;
      const run = await command({
        action: 'execute',
        workflowId: workflow.id,
        expectedRevision: workflow.revision,
        idempotencyKey: crypto.randomUUID()
      });
      await history();
      selectedRun = run.id;
      await loadArtifacts();
      message = `Local execution ${run.status} · ${run.id}`;
    } catch (e) {
      message = String(e);
    } finally {
      busy = false;
    }
  }
  async function recipe(image = false) {
    busy = true;
    try {
      await create();
      workflow.name = image
        ? 'Local image recipe'
        : 'Document statistics recipe';
      add('u.input');
      add('u.transform');
      if (!image) add('u.invoke');
      add('u.output');
      if (image) {
        nodes = nodes.map((n, i) => ({
          ...n,
          data: {
            ...n.data,
            config:
              i === 0
                ? { type: 'image', artifactId: '' }
                : i === 1
                  ? { transformId: 'image.identity', transformVersion: 1 }
                  : { mode: 'return', type: 'image' }
          }
        }));
      }
      if (!image)
        nodes = nodes.map((n) =>
          n.data.kind === 'u.output'
            ? {
                ...n,
                data: {
                  ...n.data,
                  config: {
                    mode: 'return',
                    type: 'record',
                    schemaRef: 'cf.document-statistics@1'
                  }
                }
              }
            : n
        );
      edges = nodes.slice(1).map((n, i) => ({
        id: crypto.randomUUID(),
        source: nodes[i].id,
        target: n.id,
        sourceHandle: 'value',
        targetHandle: 'input'
      }));
      select(nodes[0].id);
      if (!image) await save();
      message = image
        ? 'Image recipe prepared · import a local PNG into Input, then save'
        : 'Recipe saved · run when local execution is granted';
    } catch (e) {
      message = String(e);
    } finally {
      busy = false;
    }
  }
  function setSetting(key: string, value: unknown) {
    try {
      const config = JSON.parse(configText);
      config.settings = { ...config.settings, [key]: value };
      configText = JSON.stringify(config, null, 2);
      applyConfig();
    } catch (e) {
      message = String(e);
    }
  }
  function chooseCapability(id: string) {
    const m = (catalog.manifests ?? []).find((m: any) => m.id === id);
    if (!m) return;
    configText = JSON.stringify(
      {
        capabilityId: m.id,
        capabilityVersion: m.version,
        manifestHash: m.hash,
        settings: {}
      },
      null,
      2
    );
    applyConfig();
  }
  async function importImage(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    busy = true;
    try {
      if (file.size > 8 * 1024 * 1024)
        throw Error('PNG exceeds the 8 MiB editor import limit');
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = '';
      for (let i = 0; i < bytes.length; i++)
        binary += String.fromCharCode(bytes[i]);
      const artifact = await command({
        action: 'import',
        base64: btoa(binary),
        name: file.name
      });
      artifacts = { ...artifacts, [artifact.id]: artifact };
      configText = JSON.stringify(
        { type: 'image', artifactId: artifact.id },
        null,
        2
      );
      applyConfig();
      message = 'Local PNG imported · save workflow to bind artifact';
    } catch (e) {
      message = String(e);
    } finally {
      busy = false;
    }
  }
  onMount(() => {
    Promise.all([
      api('/api/workbench?action=catalog'),
      api('/api/workbench?action=permissions'),
      refreshList()
    ])
      .then(async ([c, p]) => {
        catalog = c;
        allowExecution = !!p.allowLocalExecution;
        const id = new URL(window.location.href).searchParams.get('workflow');
        if (initialWorkflow) {
          sync(initialWorkflow);
          await history();
        } else if (id) await open(id);
        if (!id && !initialWorkflow)
          message = 'Ready · create or select a workflow';
      })
      .catch((e) => (message = String(e)));
  });
</script>

<div class="workbench">
  <header>
    <a href="/">cf·</a><strong>Universal workbench</strong><span
      >Input · Transform · Invoke · Output</span
    ><span class="workspace-label">Creative Flow · Local workspace</span>
  </header>
  <div class="toolbar">
    <input
      aria-label="Universal workflow name"
      value={workflow?.name ?? ''}
      placeholder="Create or open a workflow"
      oninput={(e) => {
        if (workflow) workflow.name = e.currentTarget.value;
      }}
    /><button onclick={() => create().catch((e) => (message = String(e)))}
      >New workflow</button
    ><button onclick={() => recipe(false)} disabled={busy}>Text recipe</button
    ><button onclick={() => recipe(true)} disabled={busy}>Image recipe</button
    ><button onclick={save} disabled={!workflow || busy}>Save workflow</button
    ><button
      class="primary"
      onclick={execute}
      disabled={!workflow || busy || !allowExecution}>Run local workflow</button
    >
  </div>
  <main>
    <aside class="library">
      <h2>Operations</h2>
      {#each ['u.input', 'u.transform', 'u.invoke', 'u.output'] as kind}<button
          onclick={() => add(kind)}
          disabled={!workflow}>+ {kind.replace('u.', '')}</button
        >{/each}
      <p>
        Managed local execution {allowExecution ? 'granted' : 'disabled'}. No
        model calls.
      </p>
      <h2>Saved workflows</h2>
      {#each saved as g}<button onclick={() => open(g.id)}
          >{g.name}<small>revision {g.revision}</small></button
        >{/each}
    </aside>
    <section class="canvas" aria-label="Universal workflow canvas">
      <SvelteFlow
        bind:nodes
        bind:edges
        {nodeTypes}
        fitView
        onconnect={connect}
        onnodeclick={({ node }) => select(node.id)}
        ><Background /><Controls /></SvelteFlow
      >{#if !workflow}<div class="welcome">
          <h1>Reusable operations. Durable results.</h1>
          <p>Start with a recipe or create an empty workflow.</p>
        </div>{/if}
    </section>
    <aside class="inspector">
      <h2>Operation inspector</h2>
      {#if current}<label>Label<input bind:value={draftLabel} /></label><label
          >Typed configuration<textarea
            aria-label="Operation configuration"
            bind:value={configText}
            rows="9"
            spellcheck="false"></textarea></label
        >{#if current.data.kind === 'u.invoke'}<label
            >Capability<select
              value={(current.data.config as any)?.capabilityId}
              onchange={(e) => chooseCapability(e.currentTarget.value)}
              >{#each catalog.manifests ?? [] as m}<option value={m.id}
                  >{m.id} · {m.status}</option
                >{/each}</select
            ></label
          >{@const manifest = (catalog.manifests ?? []).find(
            (m: any) => m.id === (current?.data.config as any)?.capabilityId
          )}{#each Object.entries(manifest?.settingsSchema?.properties ?? {}) as [key, schema]}<label
              >{key}{#if (schema as any).type === 'boolean'}<input
                  type="checkbox"
                  checked={!!(current.data.config as any)?.settings?.[key]}
                  onchange={(e) => setSetting(key, e.currentTarget.checked)}
                />{:else if (schema as any).enum}<select
                  value={(current.data.config as any)?.settings?.[key] ?? ''}
                  onchange={(e) => setSetting(key, e.currentTarget.value)}
                  >{#each (schema as any).enum as value}<option {value}
                      >{value}</option
                    >{/each}</select
                >{:else}<input
                  type={(schema as any).type === 'number' ? 'number' : 'text'}
                  value={(current.data.config as any)?.settings?.[key] ?? ''}
                  onchange={(e) =>
                    setSetting(
                      key,
                      (schema as any).type === 'number'
                        ? Number(e.currentTarget.value)
                        : e.currentTarget.value
                    )}
                />{/if}</label
            >{/each}
          <h3>Capability manifest</h3>
          <pre>{JSON.stringify(
              (catalog.manifests ?? []).find(
                (c: any) =>
                  c.id === (current?.data.config as any)?.capabilityId ||
                  c.capabilityId === (current?.data.config as any)?.capabilityId
              ),
              null,
              2
            )}</pre>{/if}{#if current.data.kind === 'u.input'}<label
            >Import local PNG<input
              type="file"
              accept="image/png"
              disabled={!allowExecution || busy}
              onchange={importImage}
            /></label
          >{/if}<button onclick={applyConfig}>Apply configuration</button
        ><button onclick={remove}>Remove operation</button>
        <h3>Typed ports</h3>
        <pre>{JSON.stringify(ports(current.data), null, 2)}</pre>{/if}
      <h2>Connect operations</h2>
      <label
        >From<select bind:value={sourceId}
          ><option value="">Select source</option>{#each nodes as n}<option
              value={n.id}>{n.data.label}</option
            >{/each}</select
        ></label
      ><label
        >To<select bind:value={targetId}
          ><option value="">Select target</option>{#each nodes as n}<option
              value={n.id}>{n.data.label}</option
            >{/each}</select
        ></label
      ><button onclick={connectForm}>Connect value → input</button
      >{#each edges as edge}<div class="edge-row">
          <small
            >{nodes.find((n) => n.id === edge.source)?.data.label} → {nodes.find(
              (n) => n.id === edge.target
            )?.data.label}</small
          ><button
            aria-label="Remove connection"
            onclick={() => (edges = edges.filter((e) => e.id !== edge.id))}
            >Remove</button
          >
        </div>{/each}
      <h2>Run history</h2>
      <select
        aria-label="Run version"
        bind:value={selectedRun}
        onchange={() => loadArtifacts()}
        ><option value="">No execution selected</option
        >{#each runs as run}<option value={run.id}
            >{run.status} · revision {run.workflowRevision ??
              run.revision ??
              '?'} · {run.id}</option
          >{/each}</select
      >{#if currentRun}<p class="status">
          {stale
            ? 'Historical results · semantic graph differs'
            : `Run ${currentRun.status}`}
        </p>{/if}
      <h3>Artifact versions</h3>
      {#each selectedArtifacts as artifact}<details>
          <summary
            >v{artifact.version} · {artifact.type} · {artifact.id}</summary
          >{#if artifact.type === 'image'}<img
              src={`/api/workbench/artifacts/${artifact.id}/content`}
              alt="Stored local artifact version"
            />{/if}
          <pre>{JSON.stringify(artifact, null, 2)}</pre>
        </details>{/each}
    </aside>
  </main>
  <footer aria-live="polite">
    {message}<span
      >{workflow
        ? `${workflow.id} · revision ${workflow.revision}`
        : 'No workflow selected'}</span
    >
  </footer>
</div>

<style>
  .workbench {
    height: 100vh;
    background: #141c17;
    color: #e5eee7;
    font: 13px system-ui;
    display: flex;
    flex-direction: column;
  }
  header {
    display: flex;
    align-items: center;
    gap: 24px;
    padding: 18px 24px;
    border-bottom: 1px solid #34453a;
  }
  header > a:first-child {
    font-size: 26px;
    font-weight: bold;
  }
  header a {
    color: #c0d9c6;
    text-decoration: none;
  }
  header > a:last-child {
    margin-left: auto;
  }
  header span {
    color: #92a897;
    font-size: 11px;
  }
  .toolbar {
    display: flex;
    gap: 8px;
    padding: 15px 20px;
    border-bottom: 1px solid #34453a;
  }
  .toolbar > input {
    flex: 1;
    min-width: 160px;
    font-size: 17px;
  }
  input,
  textarea,
  select {
    background: #111a14;
    color: #e0eee3;
    border: 1px solid #425749;
    border-radius: 5px;
    padding: 9px;
    box-sizing: border-box;
    width: 100%;
  }
  button {
    background: #26392b;
    color: #d3e7d8;
    border: 1px solid #435e4b;
    border-radius: 5px;
    padding: 9px 12px;
    cursor: pointer;
  }
  button:hover {
    background: #354f3c;
  }
  button:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .primary {
    background: #a9c9b0;
    color: #14291b;
  }
  main {
    display: grid;
    grid-template-columns: 200px 1fr 310px;
    flex: 1;
    min-height: 0;
  }
  aside {
    padding: 18px;
    overflow: auto;
    background: #1b261f;
  }
  aside button {
    display: block;
    width: 100%;
    text-align: left;
    margin: 7px 0;
  }
  h2 {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1.4px;
    color: #a3c4ad;
    margin: 12px 0;
  }
  h3 {
    font-size: 11px;
    margin-top: 20px;
  }
  p,
  small {
    font-size: 11px;
    color: #93aa9b;
    line-height: 1.6;
  }
  small {
    display: block;
  }
  .canvas {
    position: relative;
    min-width: 0;
    background: #131b16;
  }
  .welcome {
    position: absolute;
    top: 35%;
    left: 12%;
    pointer-events: none;
  }
  h1 {
    font-size: 25px;
    font-weight: 400;
  }
  label {
    display: block;
    font-size: 11px;
    margin: 12px 0;
  }
  label input,
  label textarea,
  label select {
    margin-top: 7px;
  }
  pre {
    font-size: 10px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    max-height: 240px;
    overflow: auto;
    background: #111a14;
    padding: 9px;
  }
  details {
    font-size: 10px;
    padding: 10px 0;
    border-bottom: 1px solid #344a3a;
    overflow-wrap: anywhere;
  }
  .inspector img {
    max-width: 100%;
    max-height: 240px;
    object-fit: contain;
  }
  .status {
    color: #cee2b8;
  }
  footer {
    padding: 12px 22px;
    border-top: 1px solid #34453a;
    font-size: 11px;
    display: flex;
    justify-content: space-between;
    gap: 16px;
  }
  footer span {
    color: #8ca895;
  }
  @media (max-width: 1000px) {
    main {
      grid-template-columns: 160px 1fr 260px;
    }
    .toolbar {
      flex-wrap: wrap;
    }
    header span {
      display: none;
    }
  }
</style>
