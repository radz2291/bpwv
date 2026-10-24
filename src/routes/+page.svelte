<script lang="ts">
  import { onMount, setContext } from 'svelte';
  import {
    SvelteFlow,
    Background,
    Controls,
    MiniMap,
    addEdge,
    type Node,
    type Edge,
    type Connection
  } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';
  import FlowCard from '$lib/FlowCard.svelte';
  import MediaFrame from '$lib/MediaFrame.svelte';
  import CanvasNavigation from '$lib/CanvasNavigation.svelte';
  import { projectMedia, mediaFocusIds } from '$lib/media-view';
  import { executionSignature } from '$lib/workflow-fingerprint';
  import type { MediaContext } from '$lib/media-context';
  import { registry } from '$lib/registry';
  import { demo } from '$lib/demo';
  import { validateGraph } from '$lib/engine';
  import type { Workflow, NodeState, Asset } from '$lib/contract';
  type CanvasNode = Node<{
    kind: string;
    label: string;
    config: Record<string, any>;
    state?: NodeState;
    [key: string]: unknown;
  }>;
  let graph = $state<Workflow>(demo()),
    nodes = $state.raw<CanvasNode[]>([]),
    edges = $state.raw<Edge[]>([]),
    states = $state<Record<string, NodeState>>({}),
    associatedAssets = $state<(Asset & { provenance?: string })[]>([]),
    models = $state<any[]>([]),
    workflows = $state<any[]>([]),
    selected = $state('scene'),
    message = $state('Ready to create'),
    busy = $state(false),
    runId = $state(''),
    tab = $state('configure'),
    groupName = $state('Reusable study'),
    dirty = $state(false);
  let lightbox = $state<Asset | null>(null),
    dialog: HTMLDialogElement;
  let runSignature = $state('');
  let editableSignature = $derived(executionSignature(document()));
  $effect(() => {
    if (runSignature && runSignature !== editableSignature) {
      states = {};
      nodes = nodes.map((node) => ({
        ...node,
        data: { ...node.data, state: undefined }
      }));
      runId = '';
      runSignature = '';
    }
  });
  $effect(() => {
    if (dialog) {
      if (lightbox && !dialog.open) dialog.showModal();
      else if (!lightbox && dialog.open) dialog.close();
    }
  });
  let mediaViews = $derived(projectMedia(document(), registry, states, models));
  let imagePathIds = $derived(mediaFocusIds(document(), registry));
  setContext<MediaContext>('creative-flow-media', {
    view: (id) => mediaViews[id],
    enlarge: (asset, id) => {
      selected = id;
      lightbox = asset;
    }
  });
  const nodeTypes = { creative: FlowCard };
  let current = $derived(nodes.find((n) => n.id === selected));
  let currentMedia = $derived(current ? mediaViews[current.id] : undefined);
  let model = $derived(
    models.find((m) => m.id === current?.data.config.modelId)
  );
  let previews = $derived([
    ...new Map(
      [
        ...associatedAssets,
        ...Object.values(states).flatMap((s) =>
          s.outputs.asset ? [s.outputs.asset as Asset] : []
        )
      ].map((a) => [a.id, a])
    ).values()
  ]);
  function sync(g: Workflow) {
    graph = g;
    nodes = g.nodes.map((n) => ({
      id: n.id,
      type: 'creative',
      position: n.position,
      data: { ...n, state: states[n.id] }
    }));
    edges = g.edges.map((e) => ({ ...e }));
    dirty = false;
  }
  function document(): Workflow {
    return {
      ...graph,
      nodes: nodes.map((n) => ({
        id: n.id,
        kind: n.data.kind as string,
        version: n.data.version as number,
        label: n.data.label as string,
        position: n.position,
        config: n.data.config as Record<string, unknown>
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle!,
        targetHandle: e.targetHandle!
      }))
    };
  }
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
  async function list() {
    workflows = await api('/api/workflows');
  }
  async function save() {
    try {
      sync(await api('/api/workflows', document()));
      await list();
      message = `Saved · revision ${graph.revision}`;
      return true;
    } catch (e) {
      message = String(e);
      return false;
    }
  }
  async function open(id: string) {
    try {
      states = {};
      runId = '';
      associatedAssets = [];
      sync(await api(`/api/workflows/${id}`));
      associatedAssets = await api(`/api/workflows/${id}/assets`);
      const previous = await api(
        `/api/runs?workflowId=${encodeURIComponent(id)}`
      );
      if (
        previous &&
        executionSignature(previous.graphSnapshot) === executionSignature(graph)
      ) {
        runId = previous.id;
        applyStates(previous.states);
      }
      message = 'Workflow reopened from SQLite';
    } catch (e) {
      message = String(e);
    }
  }
  async function run(targetId?: string) {
    busy = true;
    try {
      if (!(await save())) return;
      const first = targetId ?? nodes.find((n) => n.data.kind === 'weave')?.id;
      const targets = first
        ? [
            first,
            ...edges
              .filter(
                (e) =>
                  e.source === first &&
                  nodes.find((n) => n.id === e.target)?.data.kind === 'preview'
              )
              .map((e) => e.target)
          ]
        : undefined;
      const result = await api('/api/run', {
        ...document(),
        targetNodeIds: targets
      });
      runId = result.id;
      applyStates(result.states);
      message =
        'Local execution finished · generation requires your cost approval';
      tab = 'execution';
    } catch (e) {
      message = String(e);
    } finally {
      busy = false;
    }
  }
  function applyStates(next: Record<string, NodeState>) {
    runSignature = editableSignature;
    states = next;
    nodes = nodes.map((n) => ({
      ...n,
      data: { ...n.data, state: states[n.id] }
    }));
  }
  async function refresh() {
    if (runId) {
      const r = await api(`/api/runs/${runId}`);
      applyStates(r.states);
    }
  }
  function change(key: string, value: unknown) {
    nodes = nodes.map((n) =>
      n.id === selected
        ? {
            ...n,
            data: { ...n.data, config: { ...n.data.config, [key]: value } }
          }
        : n
    );
    dirty = true;
  }
  function connect(c: Connection) {
    const candidate = addEdge({ ...c, id: crypto.randomUUID() }, edges);
    try {
      validateGraph({ ...document(), edges: candidate }, registry);
      edges = candidate;
      dirty = true;
    } catch (e) {
      message = String(e);
    }
  }
  function valid(c: Edge | Connection) {
    try {
      validateGraph(
        { ...document(), edges: [...edges, { ...c, id: 'candidate' }] },
        registry
      );
      return true;
    } catch {
      return false;
    }
  }
  function create(kind: string, version = 1) {
    const d = registry.get(kind, version),
      id = crypto.randomUUID();
    nodes = [
      ...nodes,
      {
        id,
        type: 'creative',
        position: { x: 150 + nodes.length * 35, y: 100 + nodes.length * 25 },
        data: {
          id,
          kind,
          version: d.version,
          label: d.label,
          config: structuredClone(d.defaults)
        }
      }
    ];
    selected = id;
    tab = 'configure';
    dirty = true;
  }
  function remove() {
    nodes = nodes.filter((n) => n.id !== selected);
    edges = edges.filter((e) => e.source !== selected && e.target !== selected);
    selected = '';
    dirty = true;
  }
  function exportGraph() {
    const blob = new Blob([JSON.stringify(document(), null, 2)], {
        type: 'application/json'
      }),
      url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${graph.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  async function importGraph(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file)
      try {
        sync(validateGraph(JSON.parse(await file.text()), registry));
        dirty = true;
        message = 'Imported · save to persist';
      } catch (e) {
        message = String(e);
      }
  }
  async function upload(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const form = new FormData();
      form.set('file', file);
      const r = await fetch('/api/assets', { method: 'POST', body: form }),
        a = await r.json();
      if (!r.ok) throw Error(a.error);
      change('uri', a.uri);
      change('assetId', a.id);
      change('mediaType', a.mediaType);
      change('name', file.name);
      message = 'Asset stored locally';
    } catch (e) {
      message = String(e);
    }
  }
  function group() {
    const ids = nodes.filter((n) => n.selected).map((n) => n.id);
    if (!ids.length && selected) ids.push(selected);
    if (!ids.length) return;
    graph = {
      ...graph,
      groups: [
        ...graph.groups,
        { id: crypto.randomUUID(), version: 1, name: groupName, nodeIds: ids }
      ]
    };
    dirty = true;
    message = `Group saved with ${ids.length} nodes`;
  }
  function instantiate(id: string) {
    const g = graph.groups.find((g) => g.id === id);
    if (!g) return;
    const map = new Map(g.nodeIds.map((id) => [id, crypto.randomUUID()]));
    const copies = nodes
      .filter((n) => map.has(n.id))
      .map((n) => ({
        ...n,
        id: map.get(n.id)!,
        selected: false,
        position: { x: n.position.x + 80, y: n.position.y + 420 },
        data: {
          ...structuredClone(n.data),
          id: map.get(n.id)!,
          state: undefined
        }
      }));
    const links = edges
      .filter((e) => map.has(e.source) && map.has(e.target))
      .map((e) => ({
        ...e,
        id: crypto.randomUUID(),
        source: map.get(e.source)!,
        target: map.get(e.target)!
      }));
    nodes = [...nodes, ...copies];
    edges = [...edges, ...links];
    dirty = true;
  }
  onMount(() => {
    sync(graph);
    Promise.all([api('/api/models'), list()])
      .then(([m]) => {
        models = m;
        const workflowId = new URL(window.location.href).searchParams.get(
          'workflow'
        );
        if (workflowId) return open(workflowId);
      })
      .catch((e) => (message = String(e)));
    const timer = setInterval(() => {
      if (runId) refresh().catch(() => {});
    }, 4000);
    return () => clearInterval(timer);
  });
</script>

<svelte:head
  ><title>Creative Flow — workflow studio</title><meta
    name="description"
    content="A local visual workspace for prompts, references and creative workflows."
  /></svelte:head
>
<div class="app">
  <aside class="rail">
    <a class="mark" href="/" aria-label="Creative Flow home">cf<span>·</span></a
    >
    <div class="rail-icon active">⌘</div>
    <div class="rail-icon">▧</div>
    <div class="rail-bottom">01</div>
  </aside>
  <div class="workspace">
    <header>
      <div class="breadcrumb">
        PERSONAL WORKSPACE <span>/</span> CREATIVE FLOW
      </div>
      <div class="local"><i></i> Local workspace</div>
    </header>
    <div class="titlebar">
      <div>
        <div class="eyebrow">WORKFLOW STUDIO <span> / MILESTONE 01</span></div>
        <input
          class="workflow-name"
          aria-label="Workflow name"
          bind:value={graph.name}
        />
        <div class="subtitle">Connect an idea. Shape the possibilities.</div>
      </div>
      <div class="actions">
        <button onclick={exportGraph}>Export ↗</button><button onclick={save}
          >Save workflow</button
        ><button class="primary" onclick={() => run()} disabled={busy}
          >{busy ? 'Preparing…' : '▶ Run local steps'}</button
        >
      </div>
    </div>
    <main>
      <nav class="library">
        <div class="section-label">
          NODE LIBRARY <span
            >{String(registry.list().length).padStart(2, '0')}</span
          >
        </div>
        <p class="muted">Build with a few good blocks.</p>
        {#each registry.list() as def}<button
            class="library-item"
            onclick={() => create(def.kind, def.version)}
            ><span class="symbol"
              >{def.kind === 'weave'
                ? '✦'
                : def.kind === 'text'
                  ? 'T'
                  : def.kind === 'combine'
                    ? '⋈'
                    : def.kind === 'preview'
                      ? '▧'
                      : '◇'}</span
            ><span
              >{def.label}<small
                >{def.provider === 'local'
                  ? 'Local operation'
                  : 'Codex / Weave'}</small
              ></span
            ><b>+</b></button
          >{/each}
        <div class="section-label spaced">
          WORKFLOWS <button
            class="tiny"
            onclick={list}
            aria-label="Refresh workflows">↻</button
          >
        </div>
        {#each workflows as w}<button class="saved" onclick={() => open(w.id)}
            >{w.name}<small>Revision {w.revision} ↗</small></button
          >{/each}<button
          class="new"
          onclick={() => {
            states = {};
            runId = '';
            associatedAssets = [];
            sync({
              ...demo(),
              id: crypto.randomUUID(),
              name: 'Untitled workflow'
            });
          }}>+ New workflow</button
        ><label class="import"
          >Import workflow JSON<input
            type="file"
            accept=".json"
            onchange={importGraph}
          /></label
        >
        <div class="library-note">
          <span>MADE TO GROW</span>
          <p>Six starting points.<br />An extensible node library.</p>
          <small>More node families are planned.</small>
        </div>
      </nav>
      <section class="canvas" aria-label="Workflow canvas">
        <div class="canvas-label">
          <i></i>
          {nodes.length} NODES <span>·</span>
          {edges.length} CONNECTIONS
        </div>
        <SvelteFlow
          bind:nodes
          bind:edges
          {nodeTypes}
          onconnect={connect}
          isValidConnection={valid}
          onnodeclick={({ node }) => {
            selected = node.id;
            tab = 'configure';
          }}
          fitView
          minZoom={0.2}
          maxZoom={1.7}
          colorMode="dark"
          deleteKey={['Backspace', 'Delete']}
          fitViewOptions={{ padding: 0.12 }}
          ><Background gap={22} /><Controls /><MiniMap
            pannable
            zoomable
            nodeColor="#8b9f8f"
          /><CanvasNavigation imageIds={imagePathIds} /></SvelteFlow
        >
        <div class="canvas-hint">
          Drag to arrange <span>·</span> Connect matching ports <span>·</span> Select
          + Delete to remove
        </div>
      </section>
      <aside class="inspector">
        <div class="tabs">
          <button
            class:chosen={tab === 'configure'}
            onclick={() => (tab = 'configure')}>Configure</button
          ><button
            class:chosen={tab === 'execution'}
            onclick={() => (tab = 'execution')}>Execution</button
          ><button
            class:chosen={tab === 'assets'}
            onclick={() => (tab = 'assets')}>Assets</button
          >
        </div>
        {#if tab === 'configure' && current}
          <div class="eyebrow detail">
            {registry.get(
              current.data.kind as string,
              Number(current.data.version)
            ).category}
          </div>
          <h2>{current.data.label}</h2>
          {#if currentMedia?.assets.length}<div class="inspector-media">
              <MediaFrame
                asset={currentMedia.assets[0]}
                label="Selected image"
                onEnlarge={(a) => (lightbox = a)}
              />
              <p class="help">
                {currentMedia.caption}<br />{currentMedia.assets[0].name ??
                  currentMedia.assets[0].id}
              </p>
            </div>{/if}
          <label
            >Node name<input
              value={String(current.data.label)}
              oninput={(e) => {
                nodes = nodes.map((n) =>
                  n.id === selected
                    ? {
                        ...n,
                        data: { ...n.data, label: e.currentTarget.value }
                      }
                    : n
                );
                dirty = true;
              }}
            /></label
          >
          {#if current.data.kind === 'text'}<label
              >Text<textarea
                rows="7"
                value={String(current.data.config.text)}
                oninput={(e) => change('text', e.currentTarget.value)}
              ></textarea></label
            >
          {:else if current.data.kind === 'combine'}<label
              >Separator<select
                value={String(current.data.config.separator)}
                onchange={(e) => change('separator', e.currentTarget.value)}
                ><option value={'\n\n'}>Paragraph break</option><option
                  value=" ">Space</option
                ><option value={'\n'}>Line break</option></select
              ></label
            >
            <p class="help">
              Scene and style stay separate until this step. Execution creates a
              prompt snapshot.
            </p>
          {:else if current.data.kind === 'weave'}<label
              >Discovered model<select
                value={String(current.data.config.modelId)}
                onchange={(e) => {
                  change('modelId', e.currentTarget.value);
                  change('params', {});
                }}
                ><option value="">Choose a model</option
                >{#each models as m}<option value={m.id}>{m.label}</option
                  >{/each}</select
              ></label
            >{#if model}<p class="help">
                Discovery snapshot · 24 Oct 2026<br />~{model.costEstimate} credits
                estimate. Actual quote and approval required for each run.
              </p>
              {#each Object.entries(model.contract.params) as [key, raw]}{@const f =
                  raw as any}<label
                  >{f.title ?? key}{#if f.options}<select
                      value={current.data.config.params?.[key] ?? ''}
                      onchange={(e) =>
                        change('params', {
                          ...current?.data.config.params,
                          [key]: e.currentTarget.value
                        })}
                      ><option value="" disabled>Provider default</option
                      >{#each f.options as opt}<option value={opt}>{opt}</option
                        >{/each}</select
                    >{:else if f.type === 'boolean'}<input
                      type="checkbox"
                      checked={Boolean(
                        current.data.config.params?.[key] ?? f.default ?? false
                      )}
                      onchange={(e) =>
                        change('params', {
                          ...current?.data.config.params,
                          [key]: e.currentTarget.checked
                        })}
                    />{:else}<input
                      type="number"
                      min={f.min}
                      max={f.max}
                      value={current.data.config.params?.[key] ?? ''}
                      onchange={(e) => {
                        const p = { ...current?.data.config.params };
                        if (e.currentTarget.value === '') delete p[key];
                        else p[key] = Number(e.currentTarget.value);
                        change('params', p);
                      }}
                    />{/if}</label
                >{/each}
              <div class="callout">
                Reference conditioning uses this model’s input contract. Batch
                iteration is a separate planned operation.
              </div>{/if}
            <button
              class="primary"
              disabled={busy}
              onclick={() => run(current?.id)}>Prepare this generation</button
            >
            <p class="help">
              Prepares this node and its preview only. No model call or charge.
              Refinement requires its own explicit action.
            </p>
          {:else if current.data.kind === 'reference_set'}<p class="help">
              One generation, {currentMedia?.assets.length ?? 0} references. Existing
              references stay first; the new asset is appended. The first image is
              the primary style anchor. This is not a batch iterator.
            </p>
          {:else if current.data.kind === 'asset'}<label
              >Upload local media<input
                type="file"
                accept="image/png,image/jpeg,image/webp,video/mp4,audio/mpeg,audio/wav"
                onchange={upload}
              /></label
            ><label
              >Asset URL<input
                value={String(current.data.config.uri)}
                oninput={(e) => change('uri', e.currentTarget.value)}
              /></label
            ><label
              >Media type<select
                value={String(current.data.config.mediaType)}
                onchange={(e) => change('mediaType', e.currentTarget.value)}
                ><option>image</option><option>video</option><option
                  >audio</option
                ></select
              ></label
            >
          {:else if current.data.kind === 'refinement'}<label
              >Consolidated feedback<textarea
                rows="7"
                value={String(current.data.config.notes)}
                oninput={(e) => change('notes', e.currentTarget.value)}
              ></textarea></label
            >
            <p class="help">
              Adds all feedback to the incoming prompt in one deterministic
              step. No model call.
            </p>
          {:else}<p class="help">
              Connect an asset output to preview actual media.
            </p>{/if}
          <div class="identity">
            {current.id}<br />Contract v1 · {registry.get(
              current.data.kind as string,
              Number(current.data.version)
            ).provider}
          </div>
          <button class="danger" onclick={remove}>Delete node</button>
          <details>
            <summary>Reusable groups</summary><label
              >Group name<input bind:value={groupName} /></label
            ><button onclick={group}>Group selected nodes</button
            >{#each graph.groups as g}<button
                class="saved"
                onclick={() => instantiate(g.id)}>Insert {g.name} ↗</button
              >{/each}
            <p class="help">
              Shift-select nodes, then save a group. Insert creates new
              identities and internal connections.
            </p>
          </details>
        {:else if tab === 'execution'}<h2>Run journal</h2>
          <p class="help">
            Local operations run here. Weave requests wait for the Codex bridge
            and cost approval.
          </p>
          <button onclick={refresh}>Refresh status ↻</button
          >{#each Object.entries(states) as [id, state]}<div class="run-row">
              <span>{nodes.find((n) => n.id === id)?.data.label ?? id}</span><b
                class={state.status}>{state.status}</b
              >{#if state.error}<p>
                  {state.error}
                </p>{/if}{#if state.outputs.text}<pre>{String(
                    state.outputs.text
                  )}</pre>{/if}{#if state.requestId}<small
                  >Request: {state.requestId}</small
                >{/if}
            </div>{/each}{#if !runId}<div class="empty">
              No run yet.<br />Run the local steps to begin.
            </div>{/if}
        {:else if tab === 'assets'}<h2>Asset preview</h2>
          {#each previews as asset}{#if asset.mediaType === 'image'}<img
                src={asset.uri}
                alt="Workflow asset"
              />{:else if asset.mediaType === 'video'}<video
                src={asset.uri}
                controls><track kind="captions" /></video
              >{:else}<audio src={asset.uri} controls></audio>{/if}
            <p class="help">{asset.id}</p>{/each}{#if !previews.length}<div
              class="empty"
            >
              <span>▧</span>
              <h3>A place for possibilities</h3>
              <p>
                Actual imported and generated assets appear here after
                execution.
              </p>
              <small>No simulated generation</small>
            </div>{/if}
        {:else}<div class="empty">Select a node to configure it.</div>{/if}
      </aside>
    </main>
    <footer class="statusbar">
      <span><i></i>{message}</span><span
        >{dirty ? 'Edited · save to persist' : `Revision ${graph.revision}`}
        <span class="divider">│</span>
        SQLite storage <span class="divider">│</span> 0 credits spent by local steps</span
      >
    </footer>
  </div>
</div>

<dialog
  bind:this={dialog}
  class="image-dialog"
  oncancel={() => (lightbox = null)}
  aria-label="Enlarged image"
>
  {#if lightbox}<header>
      <span>{lightbox.name ?? lightbox.id}</span><button
        onclick={() => (lightbox = null)}
        aria-label="Close enlarged image">Close ×</button
      >
    </header>
    <img src={lightbox.uri} alt="Enlarged artwork" />
    <p>
      {lightbox.provenance === 'imported'
        ? 'Imported reference'
        : 'Actual run output'} · {lightbox.id}
    </p>{/if}
</dialog>

<style>
  .image-dialog {
    background: #141c12;
    color: #e5efdc;
    border: 1px solid #7d916a;
    border-radius: 12px;
    max-width: 94vw;
    max-height: 94vh;
    width: 950px;
    padding: 18px;
  }
  .image-dialog::backdrop {
    background: #080d08dc;
  }
  .image-dialog header {
    height: auto;
    padding: 0 0 14px;
    gap: 20px;
    display: flex;
    justify-content: space-between;
  }
  .image-dialog img {
    display: block;
    width: 100%;
    height: 74vh;
    object-fit: contain;
    margin: 0;
  }
  .image-dialog p {
    font-size: 11px;
    color: #a3b594;
    overflow-wrap: anywhere;
  }
  .inspector-media {
    margin: 0 0 20px;
  }
  :global(*) {
    box-sizing: border-box;
  }
  :global(body) {
    margin: 0;
    background: #151916;
    color: #e6ebe4;
    font-family:
      Inter,
      Segoe UI,
      sans-serif;
    font-size: 13px;
  }
  :global(button),
  :global(input),
  :global(select),
  :global(textarea) {
    font: inherit;
  }
  :global(button) {
    cursor: pointer;
  }
  :global(button:disabled) {
    opacity: 0.5;
    cursor: wait;
  }
  .app {
    display: flex;
    height: 100vh;
    min-height: 660px;
  }
  .rail {
    width: 68px;
    flex-shrink: 0;
    background: #111512;
    border-right: 1px solid #303830;
    display: flex;
    align-items: center;
    flex-direction: column;
    gap: 20px;
  }
  .mark {
    color: #e2e9de;
    text-decoration: none;
    font-size: 26px;
    font-weight: 600;
    letter-spacing: -3px;
    margin: 26px 0;
  }
  .mark span {
    color: #d0e6ac;
  }
  .rail-icon {
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    font-size: 20px;
    color: #778575;
  }
  .rail-icon.active {
    background: #2a3526;
    border: 1px solid #4b6042;
    color: #d6e7c0;
    border-radius: 9px;
  }
  .rail-bottom {
    margin-top: auto;
    margin-bottom: 22px;
    color: #74836f;
    font-size: 11px;
  }
  .workspace {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  header {
    height: 58px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 28px;
    border-bottom: 1px solid #303830;
  }
  .breadcrumb {
    font-size: 10px;
    letter-spacing: 1.6px;
    color: #a2ad9d;
  }
  .breadcrumb span {
    padding: 0 17px;
    color: #53664d;
  }
  .local {
    font-size: 11px;
    color: #a7b49f;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  i {
    display: inline-block;
    width: 6px;
    height: 6px;
    background: #b5d397;
    border-radius: 50%;
  }
  .titlebar {
    padding: 25px 28px 27px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #303830;
  }
  .eyebrow {
    font-size: 9px;
    letter-spacing: 1.9px;
    color: #c9dab9;
  }
  .eyebrow span {
    color: #74806d;
    margin-left: 5px;
  }
  .workflow-name {
    display: block;
    background: transparent !important;
    border: none !important;
    padding: 7px 0 !important;
    font-size: 25px !important;
    letter-spacing: -0.6px;
    color: #eef1e8 !important;
    width: 430px;
  }
  .subtitle {
    font-size: 12px;
    color: #899782;
  }
  .actions {
    display: flex;
    gap: 9px;
  }
  button {
    border: 1px solid #3c4836;
    border-radius: 6px;
    background: #242d21;
    color: #cbd6c2;
    padding: 9px 12px;
    font-size: 11px;
  }
  button:hover {
    border-color: #94aa7f;
    background: #303d29;
  }
  .primary {
    background: #d0e6ad;
    color: #202b18;
    border-color: #d0e6ad;
    font-weight: 600;
  }
  .primary:hover {
    background: #e1edce;
  }
  main {
    display: flex;
    flex: 1;
    min-height: 0;
  }
  .library {
    width: 210px;
    flex-shrink: 0;
    padding: 24px 16px;
    border-right: 1px solid #303830;
    overflow: auto;
  }
  .section-label {
    font-size: 9px;
    letter-spacing: 1.5px;
    color: #b3c0a9;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .section-label > span {
    color: #6e8066;
  }
  .muted {
    font-size: 11px;
    color: #77876d;
    margin: 10px 0 23px;
  }
  .library-item {
    display: flex;
    align-items: center;
    text-align: left;
    width: 100%;
    padding: 12px 8px;
    margin-bottom: 5px;
    background: transparent;
    border: 1px solid transparent;
    gap: 12px;
  }
  .symbol {
    display: grid;
    place-items: center;
    width: 29px;
    height: 31px;
    border-radius: 6px;
    background: #2b3526;
    color: #cadcb9;
    font-size: 18px;
  }
  .library-item small {
    display: block;
    font-size: 9px;
    color: #7f9173;
    margin-top: 4px;
  }
  .library-item b {
    margin-left: auto;
    font-weight: 400;
    color: #7c9070;
  }
  .spaced {
    margin-top: 27px;
    border-top: 1px solid #303830;
    padding-top: 20px;
  }
  .tiny {
    padding: 0;
    border: 0;
    background: none;
  }
  .saved {
    display: block;
    width: 100%;
    text-align: left;
    background: none;
    border: 0;
    border-bottom: 1px solid #303830;
    border-radius: 0;
    padding: 12px 0;
    line-height: 1.5;
  }
  .saved small {
    display: block;
    font-size: 9px;
    color: #7c8b74;
  }
  .new {
    margin-top: 12px;
    width: 100%;
  }
  .import {
    font-size: 10px !important;
    color: #91a384 !important;
    cursor: pointer;
    text-align: center;
    margin-top: 12px !important;
  }
  .import input {
    display: none;
  }
  .library-note {
    margin-top: 38px;
    border: 1px solid #364331;
    border-radius: 8px;
    padding: 15px;
    background: linear-gradient(140deg, #263021, #1b2318);
  }
  .library-note span {
    font-size: 8px;
    letter-spacing: 1.5px;
    color: #b2c4a1;
  }
  .library-note p {
    line-height: 1.65;
    color: #b1bfa5;
    font-size: 12px;
  }
  .library-note small {
    font-size: 9px;
    color: #778a6a;
  }
  .canvas {
    flex: 1;
    position: relative;
    min-width: 250px;
    background: #191e1a;
  }
  .canvas-label {
    position: absolute;
    z-index: 4;
    top: 20px;
    left: 22px;
    display: flex;
    gap: 8px;
    align-items: center;
    font-size: 8px;
    letter-spacing: 1.5px;
    color: #95a38d;
  }
  .canvas-label span {
    color: #677c5c;
  }
  .canvas-hint {
    position: absolute;
    bottom: 21px;
    left: 70px;
    z-index: 4;
    font-size: 9px;
    color: #7d8d75;
    pointer-events: none;
  }
  .canvas-hint span {
    padding: 0 9px;
  }
  .inspector {
    width: 286px;
    flex-shrink: 0;
    border-left: 1px solid #303830;
    background: #191f17;
    padding: 0 20px 20px;
    overflow: auto;
  }
  .tabs {
    display: flex;
    border-bottom: 1px solid #36412f;
    margin: 0 -20px 22px;
    padding: 0 13px;
  }
  .tabs button {
    background: none;
    border: 0;
    border-radius: 0;
    color: #7e9072;
    padding: 17px 10px 14px;
    font-size: 11px;
  }
  .tabs .chosen {
    color: #d5e3c6;
    border-bottom: 2px solid #c5dda5;
  }
  .detail {
    font-size: 8px;
    color: #8fa37e;
    margin-top: 24px;
  }
  h2 {
    font-size: 19px;
    font-weight: 500;
    margin: 10px 0 25px;
    letter-spacing: -0.4px;
  }
  label {
    display: block;
    color: #a9ba9b;
    font-size: 10px;
    margin: 19px 0;
  }
  input,
  select,
  textarea {
    display: block;
    width: 100%;
    background: #10170f;
    border: 1px solid #394832;
    color: #d1dec6;
    border-radius: 5px;
    padding: 10px;
    margin-top: 9px;
    font-size: 11px;
    outline: none;
  }
  input:focus,
  textarea:focus,
  select:focus {
    border-color: #abc98f;
  }
  textarea {
    resize: vertical;
    line-height: 1.8;
  }
  .help {
    font-size: 11px;
    line-height: 1.8;
    color: #879b78;
  }
  .identity {
    border-top: 1px solid #323f2b;
    padding-top: 18px;
    margin-top: 24px;
    font-size: 9px;
    line-height: 1.9;
    color: #687d5b;
    overflow-wrap: anywhere;
  }
  .danger {
    margin-top: 17px;
    background: none;
    color: #c99d89;
    border-color: #5b4335;
    width: 100%;
  }
  details {
    margin-top: 25px;
    border-top: 1px solid #323f2b;
    padding-top: 20px;
  }
  summary {
    color: #91a580;
    font-size: 11px;
    cursor: pointer;
  }
  .callout {
    padding: 12px;
    background: #293222;
    border: 1px solid #415036;
    border-radius: 6px;
    font-size: 10px;
    line-height: 1.8;
    color: #b9c9aa;
  }
  .statusbar {
    height: 36px;
    border-top: 1px solid #303830;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 18px;
    font-size: 9px;
    color: #8a9d7c;
    gap: 20px;
  }
  .statusbar > span:first-child {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .divider {
    padding: 0 11px;
    color: #3b4d31;
  }
  .run-row {
    padding: 15px 0;
    border-bottom: 1px solid #35422d;
    font-size: 11px;
    overflow-wrap: anywhere;
  }
  .run-row b {
    float: right;
    font-size: 9px;
    color: #b7c7aa;
    font-weight: 400;
  }
  .run-row p,
  .run-row small {
    font-size: 10px;
    color: #bd9f7e;
    line-height: 1.7;
  }
  .run-row pre {
    white-space: pre-wrap;
    font-size: 10px;
    line-height: 1.7;
    color: #a9be99;
    background: #11180e;
    padding: 12px;
    border-radius: 6px;
  }
  .run-row .pending {
    color: #d9bc7f;
  }
  .run-row .failed {
    color: #ec9a87;
  }
  .run-row .completed {
    color: #b4d39b;
  }
  .empty {
    text-align: center;
    margin-top: 80px;
    color: #7f9470;
    font-size: 11px;
    line-height: 1.8;
  }
  .empty > span {
    font-size: 38px;
    color: #526b43;
  }
  .empty h3 {
    font-size: 13px;
    color: #b9c9aa;
    font-weight: 400;
  }
  .empty small {
    font-size: 9px;
    color: #637c53;
  }
  img,
  video,
  audio {
    width: 100%;
    border-radius: 8px;
    margin-top: 15px;
  }
  :global(.svelte-flow__controls button) {
    background: #263021;
    border-color: #435236;
    fill: #afc39e;
  }
  :global(.svelte-flow__edge-path) {
    stroke: #819777;
    stroke-width: 1.5;
  }
  :global(.svelte-flow__handle) {
    background: #c0d5aa;
    border: 2px solid #202820;
    width: 9px;
    height: 9px;
  }
  :global(.svelte-flow__minimap) {
    background: #20291b;
    border: 1px solid #3c4b31;
    border-radius: 8px;
  }
  :global(.svelte-flow__attribution) {
    font-size: 7px;
    background: #1b2516;
    color: #7c9270;
  }
  @media (max-width: 1150px) {
    .library {
      width: 175px;
    }
    .inspector {
      width: 250px;
    }
    .titlebar {
      padding: 20px;
    }
    .workflow-name {
      width: 320px;
      font-size: 21px !important;
    }
    .actions {
      gap: 5px;
    }
    .actions button {
      padding: 9px;
      font-size: 10px;
    }
    .canvas-hint {
      display: none;
    }
    .statusbar > span:last-child {
      display: none;
    }
  }
  @media (max-width: 800px) {
    .rail {
      display: none;
    }
    .library {
      width: 145px;
    }
    .inspector {
      width: 230px;
    }
    .titlebar {
      align-items: flex-start;
      gap: 12px;
      flex-direction: column;
    }
    .workflow-name {
      width: 100%;
    }
  }
</style>
