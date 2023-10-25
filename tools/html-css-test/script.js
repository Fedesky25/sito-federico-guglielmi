
/**
 * @param {string} name 
 * @param {[min: number, max: number]} width
 * @param {[min: number, max: number]} height
 */
function variable_children(name, width, height) {
    const text = document.querySelector(`[data-${name}="text"]`);
    const range = document.querySelector(`[data-${name}="input"]`);
    const containers = document.querySelectorAll(`[data-${name}="container"]`);
    function populate() {
        const n = +range.value;
        text.textContent = n;

        const ws = new Array(n);
        const hs = new Array(n);
        for(var i=0; i<n; i++) {
            ws[i] = Math.random()*(width[1]-width[0])+width[0];
            hs[i] = Math.random()*(height[1]-height[0])+height[0];
        }

        containers.forEach(el => {
            el.textContent = '';
            for(var i=0; i<n; i++) {
                const rect = document.createElement("div");
                rect.classList.add("rect");
                rect.style.width = ws[i] + 'rem';
                rect.style.height = hs[i] + 'rem';
                el.appendChild(rect);
            }
        });
    }
    range.addEventListener("input", populate);
    populate();
}

variable_children("align", [1,6], [2,5]);
variable_children("responsive", [3,8], [2,5]);


document.querySelectorAll("style.code-block").forEach(el => el.addEventListener("keydown", function(e) {
    const tab = e.key === "Tab";
    if(!tab && e.key !== "Enter") return;
    e.preventDefault();
    const range = window.getSelection().getRangeAt(0);
    const node = document.createTextNode(tab ? "    ": "\n");
    range.deleteContents();
    range.insertNode(node);
    range.setStartAfter(node);
    range.setEndAfter(node);
    this.dispatchEvent(new Event("input", {bubbles: true}));
}));


const input = document.getElementById("test-4");
input.addEventListener("input", onInput);
const re = /[\D\s_\.\-]/g;

/**
 * @this {HTMLInputElement}
 * @param {Event} ev
 */
function onInput(ev) {
    let text = this.value;
    if(text.length === 0) return;
    const negative = text.startsWith('-');
    if(negative) text = text.slice(1);
    text = text.replace(re, '');
    if(text.length === 0) return void (this.value = negative ? '-' : '');
    const value = negative ? -text : +text;
    this.value = value.toLocaleString();
}