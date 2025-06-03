<script lang="ts">
    import { onMount } from "svelte";

    interface Props {
        text: string;
        loop?: boolean
    }

    let { text, loop = false }: Props = $props();

    const length = $derived(text.length);
    let display = $state("");
    let i = 0, idle = $state(false);

    let request: number;
    function forward() {
        if(i < length) display = text.substring(0, ++i);
        else {
            clearInterval(request);
            if(loop) request = setTimeout(onIdleEnd, 8000);
            idle = true;
        }
    }
    function onIdleEnd() {
        request = setInterval(backwards, 50);
        idle = false;
    }
    function backwards() {
        if(i) display = text.substring(0, --i);
        else {
            clearInterval(request);
            request = setInterval(forward, 150);
        }
    }

    onMount(() => {
        request = setInterval(forward, 150);
        return () => {
            if(idle) clearTimeout(request); 
            else clearInterval(request);
        }
    })


</script>

<span class="wrapper">
    <span class="skeleton">{text}_</span>
    <span class="writing" aria-hidden="true">{display}<span class="underscore" class:blinking={idle}>_</span></span>
</span>

<style>
    .wrapper {
        display: inline-block;
        position: relative;
    }
    .skeleton {
        color: transparent;
    }
    .writing {
        position: absolute;
        top: 0;
        left: 0;
        z-index: 1;
    }
    .underscore {
        position: relative;
        display: inline-block;
        opacity: 0.9;
    }
    .underscore::after {
        content: '';
        position: absolute;
        bottom: 0.2em;
        left: 0;
        width: 100%;
        height: 0.35em;
        background-color: var(--primary);
    }
    .underscore.blinking {
        animation-name: blinking;
        animation-duration: 1s;
        animation-timing-function: linear;
        animation-iteration-count: infinite;
    }

    @keyframes blinking {
          0% { opacity: 1; }
         45% { opacity: 1; }
         50% { opacity: 0; }
         95% { opacity: 0; }
        100% { opacity: 1; }
    }
</style>