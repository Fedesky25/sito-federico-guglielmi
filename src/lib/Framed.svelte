<script lang="ts">
    import type { Snippet } from "svelte";

    interface Props {
        title: string;
        children: Snippet;
        nosmudge?: boolean;
    }
    let { title, nosmudge = false, children }: Props = $props();
</script>

<div class="container">
    <h2>{title}</h2>
    <div class="body">{@render children()}</div>
    {#if !nosmudge}
        <div class="smudge"></div>
    {/if}
</div>

<style>
    @media (min-width: 45rem) {
        .container {
            max-width: min-content;
            margin-left: auto;
            margin-right: auto;

            display: grid;
            row-gap: 2rem;
            column-gap: 2rem;
            grid-template-rows: auto 1fr;
            grid-template-columns: min-content var(--frame-body, 34ch);
        }
        h2 {
            writing-mode: vertical-lr;
            margin: 0;
        }
        .body {
            grid-column: 2;
            grid-row: 1/3;
        }
        .smudge {
            grid-row: 2;
            grid-column: 1;
            justify-self: center;

            opacity: 0.5;
            border-radius: 2px;
            width: 4px;
            height: 100%;
            background-color: var(--primary);
        }
    }
</style>
