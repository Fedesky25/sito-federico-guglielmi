<script lang="ts">
    import { Spring } from "svelte/motion";
    import type { Snippet } from "svelte";
    import type { AriaRole } from "svelte/elements";

    interface Props {
        children: Snippet;
        transform(x: number, y: number): string;
        role?: AriaRole;
        damping?: number;
        stiffness?: number;
    }
    const {
        children,
        transform,
        damping = 0.8,
        stiffness = 0.15,
        role = "presentation",
    }: Props = $props();

    let x = new Spring(0);
    let y = new Spring(0);

    $effect(() => {
        x.damping = damping;
        y.damping = damping;
    });

    $effect(() => {
        x.stiffness = stiffness;
        y.stiffness = stiffness;
    });

    function onmousemove(this: HTMLDivElement, ev: MouseEvent) {
        x.target = ev.offsetX - 0.5 * this.clientWidth;
        y.target = ev.offsetY - 0.5 * this.clientHeight;
    }

    function reset() {
        x.target = 0;
        y.target = 0;
    }
</script>

<div class="outer">
    <div
        {role}
        class="inner"
        style:--transform={transform(x.current, y.current)}
        {onmousemove}
        onmouseleave={reset}
    >
        {@render children()}
    </div>
</div>

<style>
    .outer {
        perspective: var(--perspective, 500px);
        width: fit-content;
    }
    .inner {
        width: fit-content;
    }
    @media (pointer: fine) {
        .inner {
            will-change: transform;
            transform: var(--transform);
        }
    }
</style>
