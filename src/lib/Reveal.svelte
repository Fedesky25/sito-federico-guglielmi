<script lang="ts">
    import type { Snippet } from "svelte";
    import { Spring } from "svelte/motion";

    interface Props {
        children: Snippet;
    }

    let { children }: Props = $props();


    let x = $state(0), y = $state(0);
    let inside = $state(false);
    const s = new Spring([0,0]);

    function mouseenter(ev: MouseEvent) {
        inside = true;
        x = ev.clientX;
        y = ev.clientY;
        s.set([x, y], {instant: true});
    }

    function mousemove(ev: MouseEvent) {
        x = ev.clientX;
        y = ev.clientY;
        s.target = [x, y];
    }

    function mouseleave(ev: MouseEvent) {
        inside = false;
    }

    let shape_transform = $derived(`translate(${s.current[0]}px,${s.current[1]}px)`);
</script>

<div 
    class="wrapper" role="none" 
    class:show={inside}
    onmouseenter={mouseenter}
    onmouseleave={mouseleave} 
    onmousemove={mousemove}>
    
    <div class="mask" aria-hidden="true">
        {@render children()}
    </div>
    <div class="shapes">
        <div 
            class="shape shape--big"
            style:transform={shape_transform}
        ></div>
        <div 
            class="shape"
            style:transform={shape_transform}
        ></div>
    </div>
    <div class="content">
        {@render children()}
    </div>
    <div 
        class="cursor"
        style:transform="translate({x}px,{y}px)" ></div>
</div>

<style>
    .wrapper {
        position: relative;
        user-select: none;
        cursor: none;
    }
    .mask {
        z-index: 1;
        position: absolute;
        top: 0px;
        left: 0;
        width: 100%;
        height: 100%;
        color: #000;
    }
    .shapes {
        z-index: 2;
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        overflow: clip;
        background-color: #fff;
        mix-blend-mode: screen;
    }
    .content {
        z-index: 3;
        position: relative;
        user-select: none;
        color: transparent;
        opacity: 0.2;
        --ts: 1px var(--primary);
        -ms-text-stroke: var(--ts);
        -moz-text-stroke: var(--ts);
        -webkit-text-stroke: var(--ts);        
    }
    .cursor {
        z-index: 4;
        --size: 20px;
    }
    .shape { 
        --size: var(--diameter, 4rem);
    }
    .shape--big { --size: calc(var(--diameter, 4rem) * 1.5); }
    
    .cursor, 
    .shape {
        position: fixed;
        top: 0;
        left: 0;
        width: var(--size);
        height: var(--size);
        margin-top: calc(-0.5 * var(--size));
        margin-left: calc(-0.5 * var(--size));
        will-change: transform;
        pointer-events: none;
        user-select: none;
    }
    .cursor::after,
    .shape::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        transform: scale(0);
        transition: transform 0.05s ease;
    }

    .cursor::after {
        border: 2px solid black;
    }
    .show .cursor::after {
        transform: scale(1);
        transition: transform 0.2s cubic-bezier(0.6, -0.28, 0.735, 0.045);
    }

    .shape::after {
        /* background-color: var(--primary);  */
        background: radial-gradient(var(--primary) 35%, transparent 70%);
    }
    .shape--big::after {

        opacity: 0; 
    }
    .show .shape::after {
        transform: scale(1);
        transition-duration: 0.5s;
    }

    @media (pointer: coarse) {
        .cursor { display: none; }
        .content {
            user-select: auto;
            opacity: 0.4;
        }
    }
    @media (pointer: none) {
        .shapes { display: none; }
    }
    @media (min-width: 120rem) {
        .content {
            --ts: 2px var(--primary);        
        }
    }
</style>