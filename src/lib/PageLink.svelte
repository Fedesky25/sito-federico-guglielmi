<script lang="ts">
    import "@fontsource/old-standard-tt";
    import { page } from "$app/state";

    let { display, link }: {display: string, link: string} = $props();
    const path = $derived(page.url.pathname);
</script>

<a href={link} class:selected={link == path}>{display}</a>

<style>
    a {
        font-family: 'Old Standard TT', serif;
        font-weight: 400;
        text-decoration: none;
        color: currentColor;
        position: relative;
    }
    a::before {
        content: '';
        position: absolute;
        left: -0.1em;
        top: 60%;
        height: 0.8em;
        width: 3em;
        background-color: var(--highlight-clr, currentColor);
        opacity: 0;
        transform: translateY(-50%) skewY(10deg) scaleY(0);
        transition: opacity 0.2s ease, transform 0.2s ease;
    }
    a.selected::before {
        opacity: 0.2;
        transform: translateY(-50%) skewY(10deg) scaleY(1);
    }
</style>