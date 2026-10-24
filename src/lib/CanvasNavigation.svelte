<script lang="ts">
  import { Panel, useSvelteFlow } from '@xyflow/svelte';
  let { imageIds = [] }: { imageIds?: string[] } = $props();
  const { fitView, setZoom } = useSvelteFlow();
</script>

<Panel position="top-right"
  ><div class="navigation">
    <button onclick={() => fitView({ padding: 0.12, duration: 200 })}
      >All nodes</button
    >{#if imageIds.length}<button
        onclick={() =>
          fitView({
            nodes: imageIds.map((id) => ({ id })),
            padding: 0.12,
            duration: 200
          })}>Image path</button
      >{/if}<button onclick={() => setZoom(1, { duration: 200 })}>100%</button>
  </div></Panel
>

<style>
  .navigation {
    display: flex;
    gap: 5px;
  }
  .navigation button {
    font: inherit;
    font-size: 10px;
    color: #c8d6bd;
    background: #263021;
    border: 1px solid #46543b;
    border-radius: 5px;
    padding: 7px 10px;
    cursor: pointer;
  }
  .navigation button:hover {
    border-color: #c6dda9;
  }
</style>
