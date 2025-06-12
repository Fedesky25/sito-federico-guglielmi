<script lang="ts">
    import "@fontsource-variable/outfit";
    import "@fontsource/allura";
    import "./global.css";

    import MenuIcon from "$lib/menu-icon.svelte";
    import PageLink from "$lib/PageLink.svelte";

    import { afterNavigate, disableScrollHandling } from "$app/navigation";

    import { fade } from "svelte/transition";
    import { cubicOut } from "svelte/easing";

    let { children, data } = $props();

    let open_nav = $state(false);

    afterNavigate(() => {
        disableScrollHandling()
        open_nav = false;
    })

    function applyTextTransition(this: HTMLElement, event: Event) {
        if(event.target !== this) return;
        this.classList.add("scale-text");
    }
    function scrollToTop() {
        window.scrollTo(0,0);
    }
</script>

<div class="nav-wrapper" class:fix-sticky={open_nav}>
    <div class="head glass glass-transition" class:glass-dark={open_nav}>
        <a class="signature" href="/">F. Guglielmi</a>
        <nav class="desktop-nav">
            <ul>
                <li><PageLink link="/" display="Who am I" /></li>
                <li><PageLink link="/projects" display="Projects" /></li>
                <li><PageLink link="/career" display="Career" /></li>
                <li><PageLink link="/education" display="Education" /></li>
            </ul>
        </nav>
        <button 
            class="mobile-menu-btn"
            aria-expanded={open_nav} 
            aria-controls="mobile-nav" 
            aria-label="Mobile navigation"
            onclick={() => open_nav = !open_nav}
        >
            <MenuIcon open={open_nav} />
        </button>
    </div>
</div>
<nav class="mobile-nav" class:open={open_nav} id="mobile-nav" aria-label="Mobile navigation">
    <div class="strips">
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
    </div>
    <img src="/night-sky.jpg" alt="Night sky">
    <ul>
        <li><PageLink link="/" display="Who am I" /></li>
        <li><PageLink link="/projects" display="Projects" /></li>
        <li><PageLink link="/career" display="Career" /></li>
        <li><PageLink link="/education" display="Education" /></li>
    </ul>
</nav>
<div class="body">
    {#key data.pathname}
        <div 
            class="inner-body" 
            onoutroend={scrollToTop}
            onoutrostart={applyTextTransition}
            out:fade={{duration: 400, easing: cubicOut}}
            in:fade={{duration: 10, delay: 400}}
        >
            {@render children()}
        </div>
    {/key}
</div>
<footer>
    <div class="watermark" aria-hidden="true">&para;</div>
    <div class="footer-body">
        <h2>Contacts</h2>
        <p>Wow...<br> I'm honored you scrolled this far down<br>Social networks are not really my thing, but I guess you deserve at least to know the few accounts I do have:</p>
        <ul>
            <li>
                <img src="/icons/linkedin.svg" alt="LinkedIn">
                <a href="https://www.linkedin.com/in/fedesky25/" target="_blank" rel="noreferrer">Fedesky25</a>
            </li>
            <li>
                <img src="/icons/github.svg" alt="GitHub">
                <a href="https://github.com/Fedesky25" target="_blank" rel="noreferrer">Fedesky25</a>
            </li>
        </ul>
    </div>
</footer>



<style>
    :global(body) {
        font-family: 'Outfit Variable', sans-serif;
        line-height: 1.4;
        word-spacing: 0.1ch;
    }
    .nav-wrapper {
        top: 0;
        z-index: 520;
        position: sticky;
        background: transparent;
        padding: 0.5rem 2.5rem;
        margin: 2rem 0;
        transition: top 0.4s ease;
    }
    .nav-wrapper.fix-sticky {
        top: 2rem;
    }

    .head {
        border-radius: 7px;
        padding: 0.5rem;
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
    }
    .signature {
        font-family: 'Allura', cursive;
        text-decoration: none;
        font-size: 1.5em;
        color: var(--primary);
    }
    button {
        position: relative;
        background-color: transparent;
        border: 0;
        aspect-ratio: 1;
        display: block;
        height: 100%;
        grid-column: 3;
        --icon-clr: var(--primary);
    }
    .glass-dark > .signature { color: #eee; }
    .glass-dark > button { --icon-clr: #eee; }


    .mobile-nav {
        z-index: 500;
        position: fixed;
        top: 0;
        left: 0;
        height: 100%;
        width: 100%;
        background-color: transparent;
        color: white;
        padding: 15vh 2rem;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;

        transform: translateX(-100%);
        transition: transform 0s;
        transition-delay: 0.71s;
    }
    .mobile-nav.open {
        transform: translateX(0%);
        transition-delay: 0s;
    }

    ul { list-style: none; }
    .desktop-nav ul { display: none; }
    .mobile-nav ul {
        z-index: 2;
    }
    .mobile-nav li {
        font-size: 2.5rem;
        font-weight: 300;
        margin-top: 1.5rem;
        opacity: 0;
        transform: translateY(-0.6rem);
        transition: opacity 0.5s ease, transform 0.5s ease;

        font-variation-settings: "wdth" 100;
    }
    .mobile-nav.open li {
        opacity: 1;
        transform: translateY(0);
        transition-delay: 0.45s, 0.45s;
    }

    .strips {
        z-index: 1;
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        overflow-x: hidden;
        display: grid;
        grid-template-rows: repeat(5, 1fr);
    }
    .strips > div {
        height: 100%;
        width: 100%;
        background-color: var(--primary);
        transition: transform 0.3s ease;
        transform: translate(-100%);
    }
    .open .strips > div { transform: translate(0%);}

    .strips > div:nth-child(2) { transition-delay: 0.1s; }
    .strips > div:nth-child(3) { transition-delay: 0.2s; }
    .strips > div:nth-child(4) { transition-delay: 0.3s; }
    .strips > div:nth-child(5) { transition-delay: 0.4s; }

    .mobile-nav img {
        z-index: 2;
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: auto;
        mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 30%, rgba(0,0,0,0));
        opacity: 0;
        transition: opacity 0.3s ease;
        transition-delay: 0s;
    }
    .open img {
        opacity: 1;
        transition-delay: 0.2s;
    }

    .body {
        z-index: 10;
        padding-bottom: 5rem;
        background-color: white;
        box-shadow: 0px 10px 9px -10px black;
        position: relative;
    }

    footer {
        z-index: 5;
        position: sticky;
        bottom: 0;
        background-color: var(--primary);
        padding: 5rem 1.25rem;
        color: white;
    }
    footer p {
        line-height: 1.5;
        margin-bottom: 0.8rem;
    }
    footer .watermark {
        user-select: none;
        position: absolute;
        bottom: 0;
        right: 1rem;
        opacity: 0.1;
        font-size: 20rem;
        font-family: 'Old Standard TT', serif;
    }
    footer li {
        margin-top: 0.6rem;
        display: flex;
        align-items: center;
    }
    footer img {
        height: 1.4rem;
        width: 1.4rem;
    }
    footer a {
        color: white;
        text-decoration-color: gray;
        margin-left: 1ch;
        cursor: pointer;
    }

    @media (min-width: 740px) {
        .nav-wrapper { top: max(2rem, 4vh); }
        .head {
            max-width: 57ch;
            margin: 0rem auto;
        }

        .mobile-nav, button { display: none; }
        .desktop-nav { grid-column: 3; }
        .desktop-nav ul {
            display: flex;
            flex-direction: row;
            font-size: 1.2em;
            --highlight-clr: var(--primary);
        }
        .desktop-nav li {
            margin-left: 1.2ch;
            margin-right: 0.8ch;
            position: relative;
        }
        .desktop-nav li + li::before {
            content: '|';
            position: absolute;
            left: -1ch;
            opacity: 0.2;
            color: var(--primary);
        }
        .footer-body {
            margin: 7vh 0;
            display: flex;
            justify-content: center;
        }
        .footer-body p {
            max-width: 40ch;
            margin-inline: 4rem;
        }
        .footer-body ul {
            margin-top: auto;
        }
        footer .watermark {
            right: 25%;
        }
    }
</style>