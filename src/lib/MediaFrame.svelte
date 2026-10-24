<script lang="ts">
  import type { Asset } from './contract';
  let {
    asset,
    label = 'Image',
    onEnlarge,
    compact = false
  }: {
    asset: Asset;
    label?: string;
    onEnlarge?: (asset: Asset) => void;
    compact?: boolean;
  } = $props();
  let broken = $state(false);
  $effect(() => {
    asset.uri;
    broken = false;
  });
</script>

<div class="media-frame" class:compact>
  {#if broken}<div class="missing">
      Image unavailable<br /><small>{asset.name ?? asset.id}</small>
    </div>
  {:else if onEnlarge}<button
      class="nodrag nopan"
      aria-label={`Enlarge ${label}`}
      onclick={(e) => {
        e.stopPropagation();
        onEnlarge?.(asset);
      }}
      ><img
        src={asset.uri}
        alt={label}
        draggable="false"
        onerror={() => (broken = true)}
      /><span class="expand">↗</span></button
    >
  {:else}<img
      src={asset.uri}
      alt={label}
      draggable="false"
      onerror={() => (broken = true)}
    />{/if}
</div>

<style>
  .media-frame {
    background: #101611;
    border: 1px solid #394536;
    border-radius: 8px;
    overflow: hidden;
    height: 238px;
    display: grid;
    place-items: center;
    width: 100%;
  }
  .media-frame.compact {
    height: 104px;
  }
  button {
    position: relative;
    width: 100%;
    height: 100%;
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: zoom-in;
    color: #edf5e6;
  }
  button:focus-visible {
    outline: 3px solid #c8e6a7;
    outline-offset: -4px;
  }
  img {
    width: 100%;
    height: 100%;
    max-height: 238px;
    object-fit: contain;
    display: block;
  }
  .compact img {
    max-height: 104px;
  }
  .expand {
    position: absolute;
    right: 8px;
    bottom: 8px;
    border-radius: 4px;
    background: #102013cc;
    padding: 2px 6px;
    font-size: 13px;
  }
  .missing {
    text-align: center;
    color: #cfb99b;
    font-size: 12px;
    line-height: 1.7;
  }
  .missing small {
    font-size: 10px;
  }
</style>
