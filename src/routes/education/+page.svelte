<script lang="ts">
    import TypeWriter from "$lib/TypeWriter.svelte";
    import ScreenMask from "$lib/ScreenMask.svelte";
    let scrollY = $state(0);
    let height = $state(0);

    const progress = $derived(scrollY / height);
</script>

<svelte:head>
    <title>Education &mdash; F. Guglielmi</title>
</svelte:head>

<svelte:window bind:scrollY bind:innerHeight={height} />

<ScreenMask
    id="pixelator"
    size_hint={64}
    extend={6}
    progress={1 - progress + Math.floor(progress)}
/>

<div class="wrapper">
    <header
        class:noselect={progress > 0.5}
        class={progress < 1 ? "masked" : "hidden"}
    >
        <h1><TypeWriter text="Education" /></h1>
    </header>
    <section
        class:noselect={progress > 1.5}
        class={[
            "bpad",
            progress < 1 ? null : progress < 2 ? "masked" : "hidden",
        ]}
    >
        <img
            src="/poli-duca.jpg"
            alt="Politecnico di Torino, entrance Corso Duca Degli Abruzzi"
        />
        <div class="text">
            <span class="subtle">Master's degree</span>
            <h2>Quantum Engineering</h2>
            <p>
                Degree program designed for the next generation of engineers at
                the frontier of quantum computing, communications, and sensing.
                It delves into advanced topics such as quantum information,
                quantum photonics, quantum condensed matter physics, and design
                of quantum devices and systems.
            </p>
            <ul>
                <li>Politecnico di Torino, Italy</li>
                <li>
                    <time datetime="2023-10">October 2023</time> &mdash; present
                </li>
                <li>Average mark: 28.6</li>
            </ul>
        </div>
    </section>
    <section
        class:noselect={progress > 2.5}
        class={[
            "bpad",
            progress < 2 ? null : progress < 3 ? "masked" : "hidden",
        ]}
    >
        <img
            src="/poli-auleI.jpg"
            alt="Rooms 'I' with their garden at Politecnico di Torino"
        />
        <div class="text">
            <span class="subtle">Bachelor's degree</span>
            <h2>Physical Engineering</h2>
            <p>
                Multidisciplinary program which combines traits from electronic
                engineering and applied physics. It delves into many advanced
                topics such as quantum mechanics, solid-state physics, and
                electronic devices.
            </p>
            <ul>
                <li>Politecnico di Torino, Italy</li>
                <li>
                    <time datetime="2020-9">September 2020</time> &mdash;
                    <time datetime="2023-9">Semptember 2023</time>
                </li>
                <li>Final grade: 110/110 <i>cum laude</i></li>
            </ul>
        </div>
    </section>
    <section class="bpad">
        <img src="/catta.jpg" alt="Entrance of the High School" />
        <div class="text">
            <span class="subtle">High school diploma</span>
            <h2>Applied Sciences</h2>
            <p>
                Scientific high school program with greater focus on science,
                mathematics, and informatics. Thanks to its energetic
                enviroment, much of my passion for coding and physics stems from
                this lovely high school.
            </p>
            <ul>
                <li>L. S. S. Carlo Cattaneo, Italy</li>
                <li>
                    <time datetime="2015-9">September 2015</time> &mdash;
                    <time datetime="2020-7">July 2020</time>
                </li>
                <li>Final grade: 100/100 <i>cum laude</i></li>
            </ul>
        </div>
    </section>
</div>

<!-- <input type="range" min={0} max={1} step={0.1} bind:value={progress}> -->

<style>
    :global(body > div > .body) {
        padding-bottom: 0;
    }
    .wrapper {
        position: relative;
        margin-bottom: -5rem;
        display: grid;
        height: 400vh;
        height: 400lvh;
    }
    header,
    section {
        grid-row: 1;
        grid-column: 1;
        position: sticky;
        top: 0;
        height: 100vh;
        height: 100lvh;
        margin: 0;
    }
    .masked {
        mask-image: url(#pixelator);
        mask-mode: alpha;
        mask-size: 100% 100%;
        mask-origin: border-box;
        mask-clip: border-box;
        mask-position: bottom;
    }
    .hidden {
        clip-path: inset(0 0 100% 0);
    }
    .noselect {
        user-select: none;
        pointer-events: none;
    }

    header {
        z-index: 8;
        background-color: white;
    }
    section {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        --clr-low: rgba(0, 0, 0, 0.6);
        --cg-pos: 65% 30%;
    }
    section:nth-of-type(1) {
        z-index: 7;
        background-image: conic-gradient(
            from -45deg at var(--cg-pos),
            #58508d,
            #003f5c,
            #58508d
        );
        color: white;
        --clr-low: rgba(255, 255, 255, 0.7);
    }
    section:nth-of-type(2) {
        z-index: 6;
        background-image: conic-gradient(
            from 70deg at var(--cg-pos),
            #1982c4,
            #95b8d1,
            #1982c4
        );
    }
    section:nth-of-type(3) {
        z-index: 5;
        background-image: conic-gradient(
            from -60deg at var(--cg-pos),
            #4c956c,
            #9dad7f,
            #4c956c
        );
    }

    img {
        max-width: 100%;
        margin-bottom: 3.7em;
        object-fit: cover;
        border-radius: 2px;
        box-shadow: 0px 0px 10px #444;
        /* filter: saturate(80%) blur(3px) brightness(40%); */
    }

    .subtle {
        display: block;
        color: var(--clr-low);
        font-size: 1.1em;
        margin-bottom: -0.3em;
    }

    p {
        color: var(--clr-low);
    }

    ul {
        list-style: none;
        margin-top: 2em;
    }

    @media (max-width: 60rem) {
        img,
        .text {
            width: 100%;
            max-width: 29em;
        }
    }

    @media (min-width: 60rem) {
        section {
            display: grid;
            grid-template-columns: 34vw auto;
            column-gap: 5vw;
            align-items: center;
            justify-content: center;
            --cg-pos: center;
        }
        .text {
            grid-row: 1;
            grid-column: 1;
            text-align: right;
        }
        img {
            grid-row: 1;
            grid-column: 2;
            width: 48vw;
            height: 27vw;
            margin-bottom: 0;
        }
    }
</style>
