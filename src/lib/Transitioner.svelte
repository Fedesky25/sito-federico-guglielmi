<script lang="ts">
    import {
        afterNavigate,
        beforeNavigate,
        disableScrollHandling,
        onNavigate,
        replaceState,
    } from "$app/navigation";
    import { page } from "$app/state";
    import { timeout } from "$lib";
    import { tick } from "svelte";

    const STRIP_ARRAY = [0, 1, 2, 3, 4];

    let hidden = $state(true);
    let sliding = $state(false);
    let strip_pos = $state(-1);
    let slide_dir = $state("");

    let nav_from_cover = false;
    let slide_promise: Promise<void> | null = null;

    async function reset() {
        console.debug(Date.now(), "Reset sliding");
        sliding = false;
        hidden = true;
        slide_dir = "";
        slide_promise = null;
        console.debug(Date.now(), "Transition ended");
    }

    async function onCoverChange(cover?: 0 | 1 | 2) {
        if (cover === 2) {
            console.debug(Date.now(), "Cover screen");
            hidden = false;
            strip_pos = -1;
            await tick();
            sliding = true;
            await tick();
            strip_pos = 0;
            await timeout(602);
        } else if (!cover && !nav_from_cover) {
            console.log(Date.now(), "Uncover screen");
            strip_pos = -1;
            await timeout(602);
            reset();
        }
        slide_promise = null;
    }

    $effect(() => {
        slide_promise = onCoverChange(page.state.cover_screen);
    });

    beforeNavigate(() => {
        if (page.state.cover_screen === 2) {
            console.debug(Date.now(), "Mark phantom state");
            replaceState("", { cover_screen: 1 });
            nav_from_cover = true;
        }
    });

    onNavigate(async (info) => {
        console.debug(Date.now(), "Navigation by", info.type);
        if (slide_promise) await slide_promise;
        if (nav_from_cover) {
            slide_promise = timeout(602).then(reset);
            strip_pos = 1;
        } else {
            slide_promise = timeout(1210).then(reset);
            const isPopState = info.type === "popstate";
            const start_pos = isPopState && info.delta < 0 ? 1 : -1;
            hidden = false;
            strip_pos = start_pos;
            await tick();
            sliding = true;
            await tick();
            strip_pos = 0;
            if (isPopState) slide_dir = info.delta < 0 ? "<" : ">";
            await timeout(602);
            strip_pos = 1 + ~start_pos;
        }
    });

    afterNavigate(() => {
        disableScrollHandling();
        nav_from_cover = false;
        if (page.state.cover_screen === 1) {
            console.debug(Date.now(), "Skip phantom state");
            history.back();
        }
    });
</script>

<div
    class="wrapper"
    class:hidden
    class:sliding
    style:--pos={strip_pos}
    data-dir={slide_dir}
>
    {#each STRIP_ARRAY as v}
        <div class="strip" style:--idx={v}></div>
    {/each}
</div>

<style>
    .wrapper {
        z-index: 480;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        max-width: 100vw;
        height: 100%;
        overflow-x: hidden;
        display: grid;
        grid-template-rows: repeat(5, 1fr);
        gap: 0px;
    }

    .hidden {
        transform: scale(0);
    }

    .strip {
        width: 150vw;
        height: 100%;
        background-color: var(--primary);
        box-shadow: 0 0 0 2px var(--primary);
        transform: translateX(calc(var(--pos) * 101%));
    }

    .sliding > .strip {
        transition-property: transform;
        transition-timing-function: ease;
        transition-duration: 300ms;
        transition-delay: calc(var(--idx) * 100ms);
    }

    .sliding > .strip {
        animation-name: strip-slide;
        animation-duration: 1s;
        animation-delay: calc(var(--idx) * 50ms);
        animation-timing-function: cubic-bezier(0.5, 0.9, 0.5, 0.1);
        animation-fill-mode: none;
    }

    .sliding::after {
        position: absolute;
        top: 50%;
        left: 50%;
        color: white;
        font-size: 9rem;

        animation-name: slide-fade;
        animation-delay: 150ms;
        animation-duration: 1s;
        animation-fill-mode: none;
        animation-timing-function: cubic-bezier(0.25, 1, 0.5, 1);
    }

    .sliding[data-dir=">"]::after {
        content: "\2192";
        --shift-start: -0.35em;
        --shift-end: 0.1em;
    }

    .sliding[data-dir="<"]::after {
        content: "\2190";
        --shift-start: 0.35em;
        --shift-end: -0.1em;
    }

    @keyframes slide-fade {
        0% {
            opacity: 0;
            transform: translate(calc(var(--shift-start) - 50%), -50%);
        }
        25% {
            opacity: 1;
        }
        55% {
            opacity: 1;
        }
        100% {
            opacity: 0;
            transform: translate(calc(var(--shift-end) - 50%), -50%);
        }
    }
</style>
