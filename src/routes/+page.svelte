<script lang="ts">
    import "@fontsource/old-standard-tt";
    import TypeWriter from "$lib/TypeWriter.svelte";
    import Reveal from "$lib/Reveal.svelte";
    import Framed from "$lib/Framed.svelte";
    import FollowPointer from "$lib/FollowPointer.svelte";
    import { frameThrottle, whenInView } from "$lib";

    const birthday = Date.UTC(2001, 11, 25);
    const workout_start = Date.UTC(2018, 1, 1);
    const MS_PER_YEAR = 1000 * 60 * 60 * 24 * 365;
    const age = Math.floor((Date.now() - birthday) / MS_PER_YEAR);
    const workout_years = Math.floor(
        (Date.now() - workout_start) / MS_PER_YEAR,
    );

    let x = $state(0);
    let offsety = 0,
        height = 0;

    const movemottos = frameThrottle(() => {
        x = (window.scrollY - offsety) / height;
    });
    function onenterview(rect: DOMRectReadOnly) {
        height = rect.height;
        offsety =
            window.scrollY +
            rect.top -
            document.documentElement.clientHeight +
            height / 4;
        movemottos();
    }

    const transform = (x: number, y: number) =>
        `rotate3d(${-y},${x},0,${-5e-2 * Math.hypot(x, y)}deg)`;
</script>

<svelte:head>
    <title>Hello there! &mdash; F. Guglielmi</title>
</svelte:head>

<header>
    <h1><TypeWriter text="Hello there!" loop /></h1>
    <p class="enter">
        I am <span class="cursive">Federico</span> &mdash; welcome to my corner of
        the Internet
    </p>
    <div class="enter">
        <span class="sr-only">Some of my interests:</span>
        <ul class="tags">
            <li>Coding</li>
            <li>Web UI/UX</li>
            <li>Calisthenics</li>
            <li>Physics</li>
            <li>Quantum</li>
            <li>Computational EM</li>
        </ul>
    </div>
    <!-- <p class="enter">Welcome to my corner <br /> of the Internet</p> -->
</header>
<main>
    <section class="nutshell bpad">
        <Framed title="TL;DR">
            <p>
                I am a {age} years old young man currently pursuing a PhD degree at
                Politecnico di Torino in scientific computing applied to electromagnetic
                and quantum systems.
                <!-- <span class="quote">Quantum Engineering</span> -->
            </p>
            <p>
                I have a keen desire to create the new and refactor the old,
                which neatly mixes with my passion for coding and phyiscs.
            </p>
        </Framed>
    </section>

    <section
        style:--diameter="calc(16vw + 20vh)"
        {@attach whenInView(movemottos, onenterview)}
    >
        <Reveal>
            <div class="mottos" style:--x={x}>
                <span lang="la">Creo, ergo sum</span>
                <span lang="it">Creo, dunque sono</span>
                <span lang="en">I create, hence I am</span>
                <span lang="zh">我创造，故我在</span>
            </div>
        </Reveal>
    </section>

    <section class="bpad">
        <Framed title="About me">
            <ul class="traits">
                <li>Currently living and studying in Turin, Italy</li>
                <li>Admirer of the nature on the hills of Perinaldo</li>
                <li>
                    Grown up watching Captain Harlock, building (a lot of)
                    LEGOs, and playing Minecraft
                </li>
                <li>
                    Diligently working out three/four times a week for the past {workout_years}+
                    years (calisthenics-like)
                </li>
                <li>
                    Physics enthusiast of anything from general relativity to
                    quantum mechanics
                </li>
                <li>
                    Zealous coder: started from C++ and continued with Python,
                    JavaScript, Julia, ...
                </li>
                <li>
                    Started coding websites as a side quest; ended up really
                    liking creating web UIs
                </li>
                <li>Proud owner of a friendly cat (see below &darr;)</li>
            </ul>
        </Framed>
        <div class="oliver-images">
            <div style="--z: 1; --factor: 0.9; --rot: -15deg">
                <FollowPointer {transform}>
                    <img
                        src="/oliver/chad.jpg"
                        alt="Oliver on its pillows in a distinguished pose"
                        width="887"
                        height="887"
                    />
                </FollowPointer>
            </div>
            <div style="--z: 5; --factor: 1.1; --rot: -2deg; --offset: 2rem;">
                <FollowPointer {transform}>
                    <img
                        src="/oliver/sky-watching.jpg"
                        alt="Oliver looking up to the sky from a balcony"
                        loading="lazy"
                        width="721"
                        height="1081"
                    />
                </FollowPointer>
            </div>
            <div style="--z: 2; --rot: 5deg">
                <FollowPointer {transform}>
                    <img
                        src="/oliver/curious.jpg"
                        alt="Oliver on the couch with curious open pupils towards the camera"
                        loading="lazy"
                        width="1061"
                        height="849"
                    />
                </FollowPointer>
            </div>
            <div style="--z: 4; --rot: 10deg">
                <FollowPointer {transform}>
                    <img
                        src="/oliver/silly.jpg"
                        alt="Oliver lying down on my bed with the tip of the tongue out"
                        loading="lazy"
                        width="960"
                        height="1200"
                    />
                </FollowPointer>
            </div>
            <div style="--z: 3; --rot: -7deg; --offset: -1rem;">
                <FollowPointer {transform}>
                    <img
                        src="/oliver/playful.jpg"
                        alt="Oliver inside a box trying to catch the camera with its pawn"
                        loading="lazy"
                        width="1226"
                        height="817"
                    />
                </FollowPointer>
            </div>
        </div>
    </section>
    <!-- <section class="bpad">
        <h2>In detail</h2>
        <div>
            <p>Lorem ipsum, dolor sit amet consectetur adipisicing elit. Culpa ducimus eligendi nihil autem accusamus quam voluptatum, doloribus eos at mollitia, dicta ab molestiae non labore blanditiis consequuntur est cum? Labore?</p>
            <p>Lorem ipsum dolor sit, amet consectetur adipisicing elit. Architecto accusamus perspiciatis deserunt harum dicta optio odit neque asperiores totam, eos natus! Corporis reprehenderit quia rerum assumenda corrupti eveniet veritatis nulla.</p>
            <p>Lorem ipsum dolor sit amet, consectetur adipisicing elit. Eaque non in assumenda iusto beatae eos est. Explicabo architecto rerum nam? Vel et quos pariatur aut voluptatum deleniti dolorum cumque quasi.</p>
            <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Odio aliquid eos veniam ducimus repellat ullam ab inventore. Ab possimus dignissimos rem animi cum, laboriosam, natus blanditiis pariatur corrupti nobis ullam.</p>
        </div>
    </section> -->
</main>

<style>
    .cursive {
        font-family: "Allura", cursive;
        font-size: 1.2em;
    }
    .enter {
        animation-name: enter;
        animation-timing-function: ease-in;
        animation-duration: 0.2s;
        animation-fill-mode: backwards;
    }

    @keyframes enter {
        0% {
            opacity: 0;
            transform: translateY(-5px);
        }
        100% {
            opacity: 1;
            transform: translateY(0);
        }
    }

    header {
        --delay: 1.7s;
    }
    header p {
        font-size: 1.4em;
        text-align: center;
    }
    header :nth-child(2) {
        animation-delay: var(--delay);
    }
    header :nth-child(3) {
        animation-delay: calc(var(--delay) + 0.4s);
    }
    header :nth-child(4) {
        animation-delay: calc(var(--delay) + 0.8s);
    }

    .tags {
        margin-block: 1em;
        list-style: none;
        display: flex;
        justify-content: center;
        flex-wrap: wrap;
    }
    .tags li {
        margin: 0.2em;
        padding: 0.2em 0.5em;
        border-radius: 1em;
        background-color: #eee;
        color: var(--primary);
    }

    main p + p {
        margin-top: 1.5rem;
    }

    .quote::before {
        content: "\201C";
    }
    .quote::after {
        content: "\201D";
    }
    .quote::before,
    .quote::after {
        opacity: 0.7;
    }

    .mottos {
        display: flex;
        flex-direction: column;
        align-items: center;
        font-size: max(4rem, 10vw);
        text-align: center;
        line-height: 0.9;
        font-family: "Old Standard TT", serif;
        overflow-x: hidden;
    }
    .mottos span {
        margin: max(2rem, 5vh) 0;
        white-space: nowrap;
        will-change: transform;
        --shift: 50vw;
    }
    .mottos span:nth-child(1) {
        transform: translateX(calc(var(--shift) * (0.5 - var(--x))));
    }
    .mottos span:nth-child(2) {
        transform: translateX(calc(var(--shift) * (var(--x) - 0.75)));
    }
    .mottos span:nth-child(3) {
        transform: translateX(calc(var(--shift) * (1 - var(--x))));
    }
    .mottos span:nth-child(4) {
        transform: translateX(calc(var(--shift) * (var(--x) - 1.25)));
    }

    .traits {
        list-style-image: none;
        list-style-type: circle;
        list-style-position: inside;
    }
    .traits li + li {
        margin-top: 1.5rem;
    }
    .traits li::marker {
        content: "\00BB  ";
        color: var(--secondary);
        padding-right: 1rem;
        font-size: 1.5em;
        line-height: 0.65;
    }

    @media (min-width: 45rem) {
        .traits li + li {
            margin-top: 1rem;
        }
    }

    .oliver-images {
        max-width: 45rem;
        margin: 10rem auto;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-wrap: wrap;
    }
    .oliver-images > div {
        width: fit-content;
        z-index: var(--z);
        transform: rotate(var(--rot, 0));
    }

    @media (pointer: fine) {
        .oliver-images {
            perspective: 10000px;
            transform-style: preserve-3d;
        }
        .oliver-images > div {
            z-index: unset;
            transform: rotate(var(--rot, 0)) translateZ(calc(var(--z) * 1px));
            transition:
                transform 0.2s ease,
                filter 0.2s ease;
        }
        .oliver-images > div:hover {
            transition: transform 0.2s ease;
            transform: scale(1.2) translateZ(10px);
        }
        .oliver-images:has(> div:hover) > div:not(:hover) {
            filter: saturate(50%) blur(3px);
        }
    }

    .oliver-images img {
        --sz: calc(var(--factor, 1) * clamp(10rem, 55vw, 20rem));
        max-width: var(--sz);
        max-height: var(--sz);
        padding: clamp(0.5rem, 3vw, 1rem);
        margin: clamp(-2rem, -6vw, -1rem);
        background-color: #f4f4f4;
        border-radius: 0.2rem;
        box-shadow: 0 0 2rem rgb(0, 0, 0, 0.2);
        user-select: none;
    }

    @media (min-width: 32rem) {
        .oliver-images > div {
            position: relative;
            top: var(--offset, 0);
        }
    }
</style>
