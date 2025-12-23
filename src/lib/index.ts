import type { Attachment } from "svelte/attachments";

export function whenInView(
    listener: () => void,
    onstart?: (rect: DOMRectReadOnly) => void,
    margin?: "string",
): Attachment {
    return (element) => {
        const onresize = onstart
            ? throttle(60, () => onstart(element.getBoundingClientRect()))
            : noop;
        const obs = new IntersectionObserver((entries) => {
            const f = entries[0].isIntersecting;
            if (f) {
                if (onstart) {
                    onstart(entries[0].boundingClientRect);
                    window.addEventListener("resize", onresize);
                }
                window.addEventListener("scroll", listener);
            } else {
                window.removeEventListener("scroll", listener);
                if (onstart) window.removeEventListener("resize", onresize);
            }
        });
        obs.observe(element);
        return () => {
            obs.disconnect();
            window.removeEventListener("scroll", listener);
            if (onstart) window.removeEventListener("resize", onresize);
        };
    };
}

export function frameThrottle(fn: () => void) {
    let req: number | null = null;
    const inner = () => {
        fn();
        req = null;
    };
    return () => {
        if (req == null) req = requestAnimationFrame(inner);
    };
}

export function throttle(ms: number, fn: () => void) {
    let req = -1;
    const inner = () => {
        (fn(), (req = -1));
    };
    return () => {
        req == -1 && (req = setTimeout(inner, ms));
    };
}

export function timeout(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function noop() {}
