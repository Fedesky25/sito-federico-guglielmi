<script>
    import "@fontsource/old-standard-tt";
    import TypeWriter from "$lib/TypeWriter.svelte";
    import Reveal from "$lib/Reveal.svelte";

    const birthday = Date.UTC(2001, 11, 25);
    const MS_PER_YEAR = 1000 * 60 * 60 * 24 * 365;
    const age = Math.floor((Date.now() - birthday) / MS_PER_YEAR);
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
    <section class="nutshell">
        <h2>In a nutshell</h2>
        <div>
            <p>I am a {age} years old young man currently enrolled at Politecnico di Torino in the Master Degree <span class="quote">Quantum Engineering</span></p>
            <p>I have a keen desire to create the new and refactor the old, which neatly mixes with my passion for coding and phyiscs.</p>
        </div>
    </section>

    <section style:--diameter="calc(16vw + 20vh)">
        <Reveal>
            <div class="mottos">
                <span lang="la">Creo, ergo sum</span>
                <span lang="it">Creo, dunque sono</span>
                <span lang="en">I create, therefore I am</span>
                <span lang="zh">我创造，故我在</span>
            </div>
        </Reveal>
    </section>

    <!-- <section>
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
        font-size: 1.4rem;
        text-align: center;
    }
    header :nth-child(2) { animation-delay: var(--delay); }
    header :nth-child(3) { animation-delay: calc(var(--delay) + 0.4s); }
    header :nth-child(4) { animation-delay: calc(var(--delay) + 0.8s); }
    
    .tags {
        margin-block: 1rem;
        list-style: none;
        display: flex;
        justify-content: center;
        flex-wrap: wrap;
    }
    .tags li {
        margin: 0.2rem;
        padding: 0.2rem 0.5rem;
        border-radius: 1rem;
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
        font-size: max(4rem, 8vw);
        text-align: center;
        line-height: 0.9;
        font-family: 'Old Standard TT', serif;
    }
    .mottos span {
        margin: max(2rem, 5vh) 0;
    }

    @media (min-width: 45rem) {
        .nutshell {
            display: grid;
            column-gap: 4rem;
            grid-template-columns: 2fr 3fr;
            max-width: 65ch;
            margin-left: auto;
            margin-right: auto;
        }
        .nutshell h2 {
            justify-self: right;
        }
    }
</style>