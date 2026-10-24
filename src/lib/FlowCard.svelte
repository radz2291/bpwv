<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';
  import { registry } from './registry';
  import { getContext } from 'svelte';
  import MediaFrame from './MediaFrame.svelte';
  import type { MediaContext } from './media-context';
  let { data, selected = false } = $props();
  let def = $derived(registry.get(data.kind, data.version));
  const mediaContext = getContext<MediaContext | undefined>(
    'creative-flow-media'
  );
  let media = $derived(mediaContext?.view(data.id));
  let isMedia = $derived(
    ['asset', 'reference_set', 'weave', 'preview'].includes(data.kind)
  );
</script>

<div
  class:selected
  class="card"
  class:media={isMedia}
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
  {#if data.kind === 'weave'}<div class="model-label">
      {media?.modelLabel ??
        'Choose a discovered model'}{#if media?.estimate !== undefined}<small
          >~{media.estimate} credits · estimate</small
        >{/if}
    </div>{/if}
  {#if isMedia}
    <div class="visual">
      {#if media?.assets.length}
        {#if data.kind === 'reference_set' && media.assets.length > 1}<div
            class="gallery"
          >
            {#each media.assets as asset, index}<div>
                <MediaFrame
                  {asset}
                  compact
                  label={index === 0
                    ? 'Primary reference'
                    : `Reference ${index + 1}`}
                  onEnlarge={(a) => mediaContext?.enlarge(a, data.id)}
                /><small
                  >{index === 0
                    ? '01 · PRIMARY'
                    : String(index + 1).padStart(2, '0')}</small
                >
              </div>{/each}
          </div>
        {:else}<MediaFrame
            asset={media.assets[0]}
            label={data.kind === 'asset'
              ? 'Imported reference'
              : data.kind === 'reference_set'
                ? 'Primary reference'
                : data.kind === 'weave'
                  ? 'Generated output'
                  : 'Preview image'}
            onEnlarge={(a) => mediaContext?.enlarge(a, data.id)}
          />{/if}
        <div class="media-caption">{media.caption}</div>
        <div class="asset-name">
          {media.assets[0].name ?? media.assets[0].id}
        </div>
      {:else}<div class="image-empty">
          <span>▧</span><strong>{media?.caption ?? 'No image yet'}</strong
          ><small
            >{data.kind === 'asset'
              ? 'Upload an image in the inspector'
              : data.kind === 'reference_set'
                ? 'Connect an asset to begin'
                : 'Actual output only · no simulated imagery'}</small
          >
        </div>{/if}
    </div>
  {/if}
  <p class:hidden={isMedia}>
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
    <span
      >{data.kind === 'weave' && data.state?.status === 'running'
        ? 'generating'
        : (data.state?.status ?? media?.status ?? 'idle')}</span
    ><small
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
  .card.media {
    width: 286px;
  }
  .card.media:has(.image-empty) {
    min-height: 280px;
  }
  .card:hover {
    border-color: #71836a;
  }
  .model-label {
    padding: 0 17px 14px;
    font-size: 13px;
    color: #d5c9ff;
  }
  .model-label small {
    display: block;
    font-size: 10px;
    color: #9a978c;
    margin-top: 6px;
  }
  .visual {
    margin: 0 13px 14px;
  }
  .gallery {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    max-height: 250px;
    overflow: auto;
  }
  .gallery small {
    display: block;
    margin: 5px 1px;
    font-size: 9px;
    color: #c6d9b3;
  }
  .media-caption {
    font-size: 10px;
    color: #b8cbaa;
    margin-top: 10px;
  }
  .asset-name {
    font-size: 9px;
    color: #819174;
    margin-top: 5px;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
  }
  .image-empty {
    height: 156px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    border: 1px dashed #465440;
    border-radius: 8px;
    background: #171e16;
    color: #8fa17e;
    text-align: center;
    padding: 14px;
  }
  .image-empty > span {
    font-size: 28px;
    color: #5e7450;
  }
  .image-empty strong {
    font-size: 11px;
    font-weight: 500;
  }
  .image-empty small {
    font-size: 9px;
    line-height: 1.6;
  }
  .hidden {
    display: none;
  }
  .dot.running {
    background: #b8a6f2;
    box-shadow: 0 0 8px #baa6ff55;
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
