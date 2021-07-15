const languages = {
    Javascript: {
        bg: "#282A36",
        fg: "#f6f6f4",
        syntax: [
            { r: /\b([0-9]+|null|undefined|false|true|document|window|location)\b/g, color: "#BF9EEE" },
            { r: /\b(var|let|const|if|else|function|return|throw|break|continue|constructor)\b|(=|<|>|!|:)+/g, color: "#F286C4" },
            { r: /\bthis\b/g, color: "#BF9EEE", italic: true },
            { r: /"(.)+"|'(.)+'|`(.)+`/g, color: "#E7EE98" },
            { r: /\b(console|animate|const|smoothScrollTo|animate|quadInOut|return|throw|break|continue|constructor)\b/g, color: "#62E884" }
        ]
    }
}
const code_container = document.querySelector('.code-container');
const typer = new Typewriter(code_container, {loop: true, delay: 40});
/**
 * @param {String} code
 * @param {Object} language
 * @param {String} language.fg
 * @param {String} language.bg
 * @param {Array<{r: RegExp, color: String, italic: String?}>} language.syntax
 * @param {{color: String, inline: String?, delimeters: String[]?}} language.comment
 */
function setCode(code, language) {
    if(typeof code !== "string") return;
    code_container.style.backgroundColor = language.bg;
    code_container.style.color = language.fg;
    typer.deleteAll();
    const subs = []
    let i = 0;
    language.syntax.forEach(s=>{
        if(s.italic)  code = code.replace(s.r, x=> {
            subs.push(`<span style="color: ${s.color}; font-style: italic;">${x}</span>`);
            return `§${i++}`;
        });
        else code = code.replace(s.r, x=> {
            subs.push(`<span style="color: ${s.color};">${x}</span>`);
            return `§${i++}`;
        });
    });
    code = code
        .replace(/\n[\s]+/g, x => `<br><div style="display:inline-block;width:${x.length-1}ch;"></div>`)
        .replace(/\n|\r/g, '<br>')
        .replace(/§[0-9]+/g, x => subs[parseInt(x.slice(1))]);
    console.log(code);
    typer.typeString(code).pauseFor(5000).start();
}

setCode(
`function smoothScrollTo(target, offset, duration) {
    let start = window.scrollY,
        end = target.offsetTop - offset,
        delta, initialTime;
    console.log(end);
    if (end > document.body.scrollHeight - window.innerHeight)
        delta = document.body.scrollHeight - window.innerHeight - start;
    else if (end < 0) delta = - start;
    else delta = end - start;
    function animate(timeStamp) {
        if (initialTime === undefined) initialTime = timeStamp;
        const timeElapsed = timeStamp-initialTime;
        window.scrollTo(0, quadInOut(timeElapsed, start, delta, duration));
        if (timeElapsed < duration)
            window.requestAnimationFrame(animate);
    }
    window.requestAnimationFrame(animate)
}
function quadInOut (t, b, c, d) {
    t /= d/2;
    if (t < 1) return c/2*t*t + b;
    t--; 
    return -c/2 * (t*(t-2) - 1) + b;
}
document.querySelectorAll('a[href^="#"]').forEach(anchor=>{
    const target = document.getElementById(anchor.getAttribute('href').slice(1));
    if(!target) return;
    anchor.addEventListener('click', e=>{
        e.preventDefault();
        smoothScrollTo(target, 50, 350);
        anchor.blur();
        location.hash = target.id;
    })
});`, languages.Javascript);
