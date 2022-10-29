const copy_svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
<rect x="5" y="5" width="32" height="32" rx="7" ry="7" fill="none" stroke="#333" stroke-width="3" />
<rect x="12" y="12" width="32" height="32" rx="7" ry="7" fill="#eee" stroke="#333" stroke-width="3" />
</svg>`;
class OutBox extends HTMLElement {
    constructor() {
        super();
        this.text = '';
        const wrapper = document.createElement("div");
        wrapper.setAttribute("class", "wrapper");
        const link = document.createElement("link");
        link.setAttribute("rel", "stylesheet");
        link.setAttribute("href", "./out-box.css");
        wrapper.appendChild(link);
        this.textual = document.createElement("div");
        this.textual.setAttribute("class", "text");
        wrapper.appendChild(this.textual);
        const btn = document.createElement("button");
        btn.innerHTML = copy_svg;
        btn.type = "button";
        btn.addEventListener("click", () => navigator.clipboard.writeText(this.text));
        wrapper.appendChild(btn);
        this.attachShadow({ mode: "closed" }).appendChild(wrapper);
    }
    connectedCallback() {
        if (this.getAttribute("break") != null)
            this.textual.classList.add("break");
    }
    setText(text) {
        this.textual.textContent = this.text = text;
    }
}
customElements.define("out-box", OutBox);
document.getElementById("start-receiving").addEventListener("click", async function () {
    this.nextElementSibling.classList.remove("hide");
    this.remove();
    let private;
    const decoder = new TextDecoder();
    const decrypted = document.getElementById("decrypted");
    const form = document.getElementById("form-receiver");
    const input = form.querySelector("input");
    form.addEventListener("submit", async function (ev) {
        ev.preventDefault();
        if (!private)
            return void (input.value = '');
        try {
            const buffer = base64ToArrayBuffer(input.value);
            const dec = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, private, buffer);
            decrypted.setText(decoder.decode(dec));
        }
        catch (err) {
            alert("Could not decrypt");
            console.log(err);
        }
        input.value = '';
    });
    const key = await crypto.subtle.generateKey({
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
        hash: "SHA-256"
    }, true, ["encrypt", "decrypt"]);
    const buffer = await crypto.subtle.exportKey("spki", key.publicKey);
    document.getElementById("gen-key").setText(arrayBufferToBase64(buffer));
    private = key.privateKey;
});
(function () {
    let key;
    const form_import = document.getElementById("import-key");
    const textarea_import = form_import.querySelector("textarea");
    const sender = form_import.nextElementSibling;
    form_import.addEventListener("submit", async function (ev) {
        ev.preventDefault();
        const buffer = base64ToArrayBuffer(textarea_import.value);
        try {
            key = await crypto.subtle.importKey("spki", buffer, {
                name: "RSA-OAEP", hash: "SHA-256"
            }, false, ["encrypt"]);
            sender.classList.remove("hide");
        }
        catch (err) {
            alert("Invalid key");
            console.log(err);
            textarea_import.value = '';
            key = null;
            sender.classList.add("hide");
        }
    });
    const encoder = new TextEncoder();
    const encrypted = sender.querySelector("out-box");
    const form_sender = sender.querySelector("form");
    const textarea_sender = form_sender.querySelector("textarea");
    form_sender.addEventListener("submit", async function (ev) {
        ev.preventDefault();
        if (!key)
            return;
        const buffer = encoder.encode(textarea_sender.value);
        const enc = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, key, buffer);
        encrypted.setText(arrayBufferToBase64(enc));
    });
})();
function arrayBufferToBase64(buffer) {
    var binary = '';
    var bytes = new Uint8Array(buffer);
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}
function base64ToArrayBuffer(base64) {
    var binary_string = window.atob(base64);
    var len = binary_string.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}
document.querySelectorAll("textarea").forEach(el => {
    adaptElementHeight(el);
    throttleEvent(el, "input", 100, adaptElementHeight);
});
function adaptElementHeight(el) {
    console.log("adapting");
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
}
function throttleEvent(element, event, ms, fn) {
    const data = { element, request: null, callback: fn };
    element.addEventListener(event, function () {
        if (!data.request)
            data.request = setTimeout(throttleEventExec, ms, data);
    });
}
function throttleEventExec(data) {
    data.callback(data.element);
    data.request = null;
}
