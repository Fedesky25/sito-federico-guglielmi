/**
* Smoothly scrolls to the target
* @param {HTMLElement} target target of the scrolling
* @param {Number} offset offset to apply
* @param {Number} duration duration of the scrolling
*/
function smoothScrollTo(target, offset, duration) {
    let start = window.scrollY, end = target.offsetTop - offset, delta, initialTime;
    console.log(end);
    if (end > document.body.scrollHeight - window.innerHeight) delta = document.body.scrollHeight - window.innerHeight - start;
    else if (end < 0) delta = - start; else delta = end - start;
    function animate(timeStamp) {
        if (initialTime === undefined) initialTime = timeStamp;
        const timeElapsed = timeStamp-initialTime;
        window.scrollTo(0, quadInOut(timeElapsed, start, delta, duration));
        if (timeElapsed < duration) window.requestAnimationFrame(animate);
    }
    window.requestAnimationFrame(animate)
}
function quadInOut (t, b, c, d) {t /= d/2; if (t < 1) return c/2*t*t + b; t--; return -c/2 * (t*(t-2) - 1) + b;};

document.querySelectorAll('a[href^="#"]').forEach(anchor=>{
    const target = document.getElementById(anchor.getAttribute('href').slice(1));
    if(!target) return;
    anchor.addEventListener('click', e=>{
        e.preventDefault();
        smoothScrollTo(target, 50, 350);
        anchor.blur();
        location.hash = target.id;
    })
});