import type { Attachment } from "svelte/attachments";

export function whenInView(
    listener: () => void, 
    onstart?: (rect: DOMRectReadOnly) => void,
    margin?: "string"
): Attachment {
    return (element) => {
        const obs = new IntersectionObserver(entries => {
            const f = entries[0].isIntersecting;
            if(f) {
                if(onstart) onstart(entries[0].boundingClientRect);
                window.addEventListener("scroll", listener);
            }
            else window.removeEventListener("scroll", listener);
        });
        obs.observe(element);
        return () => {
            obs.disconnect();
            window.removeEventListener("scroll", listener);
        }
    }
}


export function frameThrottle(fn: () => void) {
    let req: number | null = null;
    const inner = () => { fn(); req = null; }
    return () => {
        if(req == null) req = requestAnimationFrame(inner);
    }
}
