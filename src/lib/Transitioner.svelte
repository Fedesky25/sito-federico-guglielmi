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

<div class="wrapper" class:hidden class:sliding style:--pos={strip_pos}>
    {#each STRIP_ARRAY as v}
        <div class="strip" style:--idx={v}></div>
    {/each}
    <svg
        id="transition-arrow"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 -10 20 20"
        data-dir={slide_dir}
    >
        <g fill="white">
            <circle cx="8" cy="6" r="0.19" />
            <circle cx="8" cy="-6" r="0.19" />
            <ellipse cx="18" cy="0" rx="0.25" ry="0.48" />
            <g stroke="white">
                <path stroke-width="1" d="M4,0 L18,0" />
                <path
                    stroke-width="0.4"
                    d="M8,-6 Q5,-1,2,0 Q5,1,8,6 Q6,2,4.5,0 Q6,-2,8,-6"
                />
            </g>
        </g>
    </svg>
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

    svg {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 6rem;
        height: 6rem;
        display: none;

        animation-delay: 150ms;
        animation-duration: 1s;
        animation-fill-mode: none;
        animation-timing-function: cubic-bezier(0.25, 1, 0.5, 1);
    }

    [data-dir=">"],
    [data-dir="<"] {
        display: block;
        animation-name: slide-fade;
    }

    [data-dir="<"] {
        --shift-start: 3.5rem;
        --shift-end: -2rem;
    }

    [data-dir=">"] {
        --shift-start: -3.5rem;
        --shift-end: 2rem;
    }

    [data-dir=">"] > g {
        transform: scale(-1, 1);
        transform-origin: center;
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
