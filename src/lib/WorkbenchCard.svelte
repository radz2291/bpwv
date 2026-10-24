<script lang="ts">
  import { Handle, Position, useSvelteFlow } from '@xyflow/svelte';
  import { onMount } from 'svelte';
  let { data, selected = false } = $props();
  let unavailableImage = $state('');
  const { fitView } = useSvelteFlow();
  // A loaded graph arrives after the empty canvas mounts. Fit its measured
  // cards once; ordinary dragging and cosmetic edits retain the user's view.
  onMount(() => {
    const timer = setTimeout(
      () => void fitView({ padding: 0.15, minZoom: 0.1, maxZoom: 1 }),
      300
    );
    return () => clearTimeout(timer);
  });
</script>

<article class:selected>
  <small>{data.kind.replace('u.', '')} · v{data.version}</small>
  <h3>{data.label}</h3>
  <p>{data.description}</p>
  {#if data.unavailable}<p class="unavailable" role="status">
      Artifact unavailable · {data.unavailable}
    </p>{/if}
  {#if data.artifact}
    {#if data.artifact.type === 'image'}
      {#if unavailableImage === data.artifact.id}<p
          class="unavailable"
          role="status"
        >
          Image bytes unavailable · reload after restoring the managed content.
        </p>{:else}
        <img
          class="nodrag"
          src={`/api/workbench/artifacts/${data.artifact.id}/content`}
          alt={data.artifact.name ?? 'Managed local image result'}
          onerror={() => (unavailableImage = data.artifact.id)}
        />
      {/if}
    {:else}<pre>{typeof data.artifact.value === 'string'
          ? data.artifact.value
          : JSON.stringify(data.artifact.value, null, 2)}</pre>{/if}
    <small
      >Artifact version {data.artifact.version} · {data.artifact.provenance ??
        'local'}</small
    >
  {/if}
  <div class="ports">
    {#each data.inputs ?? [] as port}<div class="port">
        <Handle type="target" id={port.id} position={Position.Left} />{port.id} ·
        {port.type}
      </div>{/each}
    {#each data.outputs ?? [] as port}<div class="port right">
        {port.id} · {port.type}<Handle
          type="source"
          id={port.id}
          position={Position.Right}
        />
      </div>{/each}
  </div>
  <footer>
    {data.unavailable || unavailableImage === data.artifact?.id
      ? 'unavailable'
      : data.stale
        ? 'Historical result · semantic edits'
        : (data.status ?? 'Not executed')}
  </footer>
</article>

<style>
  article {
    width: 245px;
    background: #202922;
    border: 1px solid #4b5b4d;
    border-radius: 12px;
    padding: 15px;
    color: #e5eee7;
    box-shadow: 0 8px 24px #0004;
  }
  .unavailable {
    color: #f1b09a;
    background: #3a2420;
    padding: 9px;
    border-radius: 5px;
    overflow-wrap: anywhere;
  }
  article.selected {
    border-color: #b6ddb9;
    box-shadow: 0 0 0 2px #9cbb9e44;
  }
  small {
    color: #a5c3ad;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  h3 {
    font-size: 16px;
    font-weight: 500;
    margin: 12px 0;
  }
  p {
    font-size: 11px;
    color: #a3b2a7;
    overflow-wrap: anywhere;
  }
  pre {
    font-size: 11px;
    white-space: pre-wrap;
    max-height: 165px;
    overflow: auto;
    background: #172019;
    padding: 9px;
    border-radius: 5px;
  }
  img {
    width: 100%;
    max-height: 210px;
    object-fit: contain;
    border-radius: 6px;
    background: #131914;
  }
  .ports {
    margin: 15px -15px 0;
    border-top: 1px solid #3c4a40;
    padding: 8px 0;
  }
  .port {
    position: relative;
    font-size: 10px;
    min-height: 24px;
    padding: 4px 14px;
    color: #adc0b0;
  }
  .right {
    text-align: right;
  }
  footer {
    font-size: 10px;
    color: #bed4c1;
    border-top: 1px solid #3c4a40;
    padding-top: 10px;
  }
</style>
