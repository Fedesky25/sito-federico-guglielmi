<script lang="ts">
    let { open }: {open: boolean} = $props();
</script>

<div class="square" class:open aria-hidden="true">
    <div class="dot tl"></div>
    <div class="dot tc"></div>
    <div class="dot tr"></div>
    <div class="dot hc"></div>
    <div class="dot hr"></div>
    <div class="dot br"></div>
</div>

<style>
    .square {
        aspect-ratio: 1;
        position: relative;
        overflow: hidden;
        display: block;
        height: 100%;
    }

    .dot {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        transition: transform 0.2s ease;
    }
    .dot::after {
        content: '';
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background-color: var(--icon-clr, currentColor);
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        display: block;
        transition: background-color 0.2s ease;
    }


    .tl { transform: translate(-33%, -33%); }
    .tc { transform: translate(  0%, -33%); }
    .tr { transform: translate( 33%, -33%); }
    .hc { transform: translate(  0%,   0%); }
    .hr { transform: translate( 33%,   0%); }
    .br { transform: translate( 33%,  33%); }

    .open .tl { transform: translate(-25%, -25%); }
    .open .tc { transform: translate(  0%,   0%); }
    .open .tr { transform: translate( 25%, -25%); }
    .open .hc { transform: translate(-25%,  25%); }
    .open .hr { transform: translate(  0%,   0%); }
    .open .br { transform: translate( 25%,  25%); }


    .square::after, .square::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 68%;
        height: 4px;
        /* border-radius: 3px; */
        opacity: 0;
        transform: opacity 0.2s ease;
        background-color: var(--icon-clr);
    }
    .open::before, .open::after {
        opacity: 0.4;
    }

    .square::before {
        transform: translate(-50%,-50%) rotate(45deg);
    }
    .square::after {
        transform: translate(-50%,-50%) rotate(-45deg);
    }

    /* @supports not (aspect-ratio) {
        .square {
            padding-top: 100%;
            height: 0;
        }
    } */
</style>