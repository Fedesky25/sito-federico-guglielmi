<script lang="ts">

    interface Props {
        progress?: number | null;
        size_hint: number;
        extend?: number;
        id: string;
        // steps: number;
    }

    let { id, size_hint: size, extend = 4, progress = null }: Props = $props();

    let width = $state(100), height = $state(100);
    const col_count = $derived(Math.round(width / size));
    const true_size = $derived(width / col_count);
    const row_count = $derived(Math.ceil(height / true_size));

    const rows = $derived.by(() => {
        const bin_size = 1 / (row_count + extend);
        const sample_size = bin_size * (1 + extend);
        const res = new Array<number[]>(row_count);
        for(let i=0; i<row_count; i++) {
            const offset = bin_size * i;
            res[i] = new Array<number>(col_count);
            for(let j=0; j<col_count; j++) res[i][j] = offset + sample_size*Math.random();
        }
        return res;
    });
</script>

<svelte:window bind:innerWidth={width} bind:innerHeight={height} />

<svg 
    width="0" height="0" 
    viewBox="0 0 {width} {height}" 
    xmlns="http://www.w3.org/2000/svg">
    <defs>
        <mask 
            {id} mask-type="alpha" 
            {width} {height} 
            style:--progress={progress}
            style:--factor={(row_count+extend)/(1+extend)}
        >
            {#each rows as row, i}
                {#each row as offset, j}
                    <rect 
                        x={true_size*j - 1}
                        y={true_size*i - 1}
                        width={true_size + 2} 
                        height={true_size + 2}
                        style="opacity: {+(progress! >= offset)};">
                    </rect>
                {/each}
            {/each}
        </mask>
    </defs>
</svg>

<style>
    svg {
        position: absolute;
        overflow: hidden;
    }
</style>