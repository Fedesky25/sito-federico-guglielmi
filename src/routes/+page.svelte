<script lang="ts">
    import "@fontsource/old-standard-tt";
    import TypeWriter from "$lib/TypeWriter.svelte";
    import Reveal from "$lib/Reveal.svelte";
    import Framed from "$lib/Framed.svelte";
    import { frameThrottle, whenInView } from "$lib";

    const birthday = Date.UTC(2001, 11, 25);
    const workout_start = Date.UTC(2018, 1, 1);
    const MS_PER_YEAR = 1000 * 60 * 60 * 24 * 365;
    const age = Math.floor((Date.now() - birthday) / MS_PER_YEAR);
    const workout_years = Math.floor((Date.now() - workout_start) / MS_PER_YEAR);

    let x = $state(0);
    let offsety = 0, height = 0;
    
    const movemottos = frameThrottle(() => {
        x = (window.scrollY - offsety) / (height);
    });
    function onenterview(rect: DOMRectReadOnly) {
        height = rect.height;
        offsety = window.scrollY + rect.top - window.innerHeight + height/4;
        movemottos(); 
    }
</script>

<svelte:head>
    <title>Hello there! &mdash; F. Guglielmi</title>
</svelte:head>

<header>
    <h1><TypeWriter text="Hello there!" loop /></h1>
    <p class="enter">I am Federico</p>
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
    <p class="enter">Welcome to my corner <br> of the Internet</p>
</header>
<main>
    <section class="nutshell bpad">
        <Framed title="TL;DR">
            <p>I am a {age} years old young man currently enrolled at Politecnico di Torino in the Master Degree <span class="quote">Quantum Engineering</span></p>
            <p>I have a keen desire to create the new and refactor the old, which neatly mixes with my passion for coding and phyiscs.</p>
        </Framed>
    </section>

    <section 
        style:--diameter="calc(16vw + 20vh)" 
        {@attach whenInView(movemottos, onenterview)}>
        <Reveal>
            <div class="mottos" style:--x="{x}">
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
                <li>Grown up watching Captain Harlock, building (a lot of) LEGOs, and playing Minecraft</li>
                <li>Diligently working out three/four times a week for the past {workout_years}+ years (calisthenics-like)</li>
                <li>Physics enthusiast of anything from general relativity to quantum mechanics</li>
                <li>Zealous coder: started from C++ and continued with Python, JavaScript, Julia, ...</li>
                <li>Started coding websites as a side quest; ended up really liking creating web UIs</li>
                <li>Proud owner of a friendly cat (see below)</li>
            </ul>
        </Framed>
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
    
    header { --delay: 1.7s; }
    header p {
        font-size: 1.4em;
        text-align: center;
    }
    header :nth-child(2) { animation-delay: var(--delay); }
    header :nth-child(3) { animation-delay: calc(var(--delay) + 0.4s); }
    header :nth-child(4) { animation-delay: calc(var(--delay) + 0.8s); }
    
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

    main p + p  {
        margin-top: 1.5rem;
    }

    .quote::before { content: '\201C'; }
    .quote::after { content: '\201D'; }
    .quote::before, .quote::after { opacity: 0.7; }

    .mottos {
        display: flex;
        flex-direction: column;
        align-items: center;
        font-size: max(4rem, 10vw);
        text-align: center;
        line-height: 0.9;
        font-family: 'Old Standard TT', serif;
        overflow-x: hidden;
    }
    .mottos span {
        margin: max(2rem, 5vh) 0;
        white-space: nowrap;
        will-change: transform;
        --shift: 50vw;
    }
    .mottos span:nth-child(1) { transform: translateX(calc(var(--shift) * (0.50 - var(--x)))); }
    .mottos span:nth-child(2) { transform: translateX(calc(var(--shift) * (var(--x) - 0.75))); }
    .mottos span:nth-child(3) { transform: translateX(calc(var(--shift) * (1.00 - var(--x)))); }
    .mottos span:nth-child(4) { transform: translateX(calc(var(--shift) * (var(--x) - 1.25))); }

    .traits {
        list-style-image: none;
        list-style-type: circle;
        list-style-position: inside;
    }
    .traits li + li {
        margin-top: 1.5rem;
    }
    .traits li::marker {
        content: '\00BB  ';
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
</style>