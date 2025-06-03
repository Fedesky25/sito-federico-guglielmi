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
        background-color: currentColor;
        opacity: 0;
        transition: opacity 0.1s ease;
        transform: translateY(-50%) skewY(10deg);
    }
    a.selected::before { opacity: 0.25; }
</style>