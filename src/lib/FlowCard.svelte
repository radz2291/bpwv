<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';
  import { registry } from './registry';
  let { data, selected = false } = $props();
  let def = $derived(registry.get(data.kind, data.version));
</script>

<div
  class:selected
  class="card"
  style={`--accent:${data.kind === 'weave' ? '#b4a0ff' : data.kind === 'text' ? '#95cdb5' : '#e6c18a'}`}
>
  <div class="card-top">
    <span
      >{data.kind === 'text'
        ? 'T'
        : data.kind === 'weave'
          ? '✦'
          : data.kind === 'preview'
            ? '▧'
            : data.kind === 'combine'
              ? '⋈'
              : '◇'}</span
    ><small>{def.label}</small><span class="dot {data.state?.status ?? 'idle'}"
    ></span>
  </div>
  <h3>{data.label}</h3>
  <p>
    {data.kind === 'text'
      ? data.config.text
      : data.kind === 'weave'
        ? 'Model contract · Codex bridge'
        : data.kind === 'combine'
          ? 'Scene + style → one prompt'
          : data.kind === 'preview'
            ? 'Generated assets appear here'
            : data.kind === 'refinement'
              ? 'Consolidate feedback into a prompt'
              : data.config.uri || 'Choose a local asset'}
  </p>
  <div class="ports">
    <div>
      {#each def.inputs as port}<div class="port">
          <Handle type="target" id={port.id} position={Position.Left} /><span
            >{port.id} <em>{port.type}</em></span
          >
        </div>{/each}
    </div>
    <div>
      {#each def.outputs as port}<div class="port output">
          <span>{port.id} <em>{port.type}</em></span><Handle
            type="source"
            id={port.id}
            position={Position.Right}
          />
        </div>{/each}
    </div>
  </div>
  <footer>
    <span>{data.state?.status ?? 'idle'}</span><small
      >{def.provider === 'local'
        ? 'Local · no credits'
        : 'External · approval required'}</small
    >
  </footer>
  {#if data.state?.error}<div class="error">{data.state.error}</div>{/if}
</div>

<style>
  .card {
    width: 242px;
    background: #202321;
    border: 1px solid #3a403b;
    border-radius: 12px;
    color: #ebeee9;
    box-shadow: 0 8px 28px #0003;
    overflow: visible;
  }
  .card.selected {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px #b9d4bd22;
  }
  .card-top {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 15px 17px 0;
    color: var(--accent);
  }
  .card-top > span:first-child {
    font-size: 19px;
  }
  .card-top small {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
  }
  .dot {
    margin-left: auto;
    width: 6px;
    height: 6px;
    background: #707772;
    border-radius: 50%;
  }
  .dot.completed {
    background: #9ad8aa;
  }
  .dot.failed {
    background: #ef9984;
  }
  .dot.pending {
    background: #e7c48a;
  }
  h3 {
    font-size: 15px;
    margin: 12px 17px 8px;
    font-weight: 500;
  }
  p {
    font-size: 12px;
    line-height: 1.6;
    color: #a2aaa3;
    margin: 0 17px 18px;
    max-height: 57px;
    overflow: hidden;
    white-space: pre-wrap;
  }
  .ports {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    border-top: 1px solid #343a35;
    padding: 10px 0;
  }
  .port {
    position: relative;
    min-height: 26px;
    font-size: 10px;
    padding: 0 14px;
    display: flex;
    align-items: center;
  }
  .port em {
    font-style: normal;
    color: #727d73;
    font-size: 9px;
    margin-left: 4px;
  }
  .output {
    text-align: right;
    justify-content: flex-end;
  }
  footer {
    display: flex;
    justify-content: space-between;
    padding: 10px 14px;
    background: #191d1a;
    border-radius: 0 0 12px 12px;
    font-size: 10px;
    color: #b9c6ba;
  }
  footer small {
    font-size: 9px;
    color: #7f8c81;
  }
  .error {
    padding: 10px;
    color: #f2ab91;
    font-size: 11px;
  }
</style>
