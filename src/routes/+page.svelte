<script>
    import "@fontsource/old-standard-tt";
    import TypeWriter from "$lib/TypeWriter.svelte";

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
    <h2>In a nutshell</h2>
    <p>I am a {age} years old young man currently enrolled at Politecnico di Torino in the Master Degree <span class="quote">Quantum Engineering</span></p>
    <p>I have a keen desire to create the new and refactor the old, which neatly mixes with my passion for coding and phyiscs.</p>

    <h2>In detail</h2>
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
            transform: translateY(-0.1rem);
        }
        100% {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    header { --delay: 2.3s; }
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

    main p  {
        margin-top: 1.5rem;
    }

    .quote::before { content: '\201C'; }
    .quote::after { content: '\201D'; }
    .quote::before, .quote::after { opacity: 0.7; }
</style>