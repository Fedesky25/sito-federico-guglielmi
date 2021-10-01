function isElement(o){
    return (
        typeof HTMLElement === "object" ? o instanceof HTMLElement : //DOM2
        o && typeof o === "object" && o !== null && o.nodeType === 1 && typeof o.nodeName === "string"
    );
}
const TW_default_speeds = Object.freeze({
    fast: Object.freeze([
        Object.freeze([70, 110]),
        Object.freeze([10, 35]),
    ]),
    natural: Object.freeze([
        Object.freeze([120, 160]),
        Object.freeze([40, 80]),
    ]),
    slow: Object.freeze([
        Object.freeze([160, 200]),
        Object.freeze([80, 120]),
    ]),
});
function parseTWSpeed(s, erase=false) {
    switch(typeof s) {
        case "string":
            {
                s = s.trim();
                let res = TW_default_speeds[s];
                if(res) return erase ? res[1] : res[0];
                let r = s.split(/\s+/).map(v=>parseInt(v));
                if(!Number.isFinite(r[0]) || r[0] <= 0) throw Error('Speed string is neither numeric nor a valid name');
                if(Number.isFinite(r[1]) && r[1] > 0) return [r[0], r[1]];
                else return [r[0], r[0]];
            }
        case "object":
            {
                let a = s[0], b = s[1];
                if(Number.isFinite(a) && Number.isFinite(b) && a > 0 && b > 0) return [a, b];
                throw Error(`[${a}, ${b}] is not a valid range of values of speed`);
            }
        case "number":
            if(Number.isFinite(s) && s > 0) return [s, s];
            throw Error('Speed value must be positive finite number');
        default:
            throw Error('Invalid speed');
    }
}

Number.isPositiveInteger = v => Number.isInteger(v) && v > 0;
const TWEventType = Object.freeze({
    ADD: Symbol('add span'),
    // REM: Symbol('remove span'),
    TAB: Symbol('tab'),
    LINE: Symbol('newline'),
    PAUSE: Symbol('pause'),
    T_SPEED: Symbol('typing speed'),
    E_SPEED: Symbol('erasing speed'),
    APP_STYLE: Symbol('style application')
});
/**
 * Constructs a new TypeWriter event
 * @constructor
 * @param {TWEventType} type type of event
 * @param {*} value value of event
 */
function TWEvent(type, value) {this.type=type;this.value=value;}
const TWSK = Symbol('TypeWriter State Key'), TWOK = Symbol('TypeWriter Options Key'), TWFK = Symbol('TypeWriter private Functions key');
class TypeWriter {
    /**
     * @constructor
     * @param {HTMLElement|String} element DOM element or id of element
     * @param {Object} options optional initial settings for TypeWriter 
     * @param {String} [options.fg=#f6f6f4] default foreground color
     * @param {string} [options.bg=#282A36] background color
     * @param {Boolean} [options.loop=false] typing effect on loop 
     * @param {Boolean} [options.applyStyleAfter=false] wheter to apply styling after typing
     * @param {Number|String|[Number, Number]} [options.type_speed=natural] range of time to type a letter
     * @param {Number|String|[Number, Number]} [options.erase_speed=natural] range of time to erase a letter
     */
    constructor(element, options) {
        if(!element) throw Error('TypeWriter: element must be id of or HTMLElement');
        if(typeof element === "string") element = document.getElementById(element);
        if(!isElement(element)) throw TypeError("CodeTypeWriter: element or id provided is not valid");
        element.style.color = options?.fg ? options.fg : "#f6f6f4";
        element.style.backgroundColor = options?.bg ? options.bg : "#282A36";
        const firstline = document.createElement('div');
        firstline.classList.add('TW-active-typing');
        element.appendChild(firstline);
        const ts = options && options.type_speed ? parseTWSpeed(options.type_speed) : TW_default_speeds.natural[0];
        const es = options && options.erase_speed ? parseTWSpeed(options.erase_speed) : TW_default_speeds.natural[1];
        this[TWSK] = {
            /** @type {HTMLElement} Queue of events */
            container: element,
            /** @type {HTMLDivElement[]} List of lines elements */
            lines: [firstline],
            /** @type {Number} Index Current Line */
            iCurrLine: 0,
            /** @type {SpanTyper} */
            spanTask: (new SpanTyper())
                .applyStyleOnComplete(options && options.applyStyleAfter === true)
                .setTypingSpeed(...ts).setErasingSpeed(...es),
            /** @type {ArrayTasker} */
            eventTask: new ArrayTasker(
                (e, next) => {
                    switch(e.type) {
                        case TWEventType.ADD:
                            this[TWSK].lines[this[TWSK].iCurrLine].appendChild(e.value);
                            this[TWSK].spanTask.onEnd(next).setSpan(e.value).type();
                            return;
                        case TWEventType.LINE:
                            this[TWSK].lines[this[TWSK].iCurrLine].classList.remove('TW-active-typing');
                            this[TWSK].container.appendChild(e.value);
                            this[TWSK].lines.push(e.value);
                            this[TWSK].iCurrLine++;
                            e.value.classList.add('TW-active-typing');
                            break;
                        case TWEventType.TAB:
                            this[TWSK].lines[this[TWSK].iCurrLine].appendChild(e.value);
                            break;
                        case TWEventType.PAUSE:
                            setTimeout(next, e.value);
                            return;
                        case TWEventType.T_SPEED:
                            this[TWSK].spanTask.setTypingSpeed(...e.value);
                            break;
                        case TWEventType.APP_STYLE:
                            this[TWSK].spanTask.asoc = !this[TWSK].spanTask.asoc;
                            break;
                    }
                    next();
                },
                (e, prev) => {
                    switch(e.type) {
                        case TWEventType.ADD:
                            this[TWSK].spanTask.onEnd(()=>{
                                this[TWSK].lines[this[TWSK].iCurrLine].removeChild(e.value);
                                prev();
                            }).setSpan(e.value).erase();
                            return;
                        case TWEventType.LINE:
                            e.value.classList.remove('TW-active-typing');
                            this[TWSK].container.removeChild(e.value);
                            this[TWSK].lines.pop();
                            this[TWSK].iCurrLine--;
                            this[TWSK].lines[this[TWSK].iCurrLine].classList.add('TW-active-typing');
                            break;
                        case TWEventType.TAB:
                            this[TWSK].lines[this[TWSK].iCurrLine].removeChild(e.value);
                            break;
                        case TWEventType.E_SPEED:
                            this[TWSK].spanTask.setErasingSpeed(...e.value);
                            break;
                        case TWEventType.APP_STYLE:
                            this[TWSK].spanTask.asoc = !this[TWSK].spanTask.asoc;
                            break;
                    }
                    prev();
                },
                options && options.loop === true
            )
        }
        this[TWOK] = {
            apply_after: options && options.applyStyleAfter === true,
            initial_type_speed: ts,
            initial_erase_speed: es,
        }
    }
    /** Alternates the time of application of style (before / after) */
    alternateStyleTime() {
        this[TWSK].eventTask.push(new TWEvent(TWEventType.APP_STYLE, null));
        return this;
    }
    /** @param {String|Number|[Number, Number]} speed speed at which type a letter */
    setTypingSpeed(speed) {
        this[TWSK].eventTask.push(new TWEvent(TWEventType.T_SPEED, parseTWSpeed(speed)));
        return this;
    }
    /** @param {String|Number|[Number, Number]} speed speed at which erase a letter */
    setErasingSpeed(speed) {
        this[TWSK].eventTask.push(new TWEvent(TWEventType.E_SPEED, parseTWSpeed(speed, true)));
        return this;
    }
    pauseFor(ms=1500) {
        if(Number.isPositiveInteger(ms)) this[TWSK].eventTask.push(new TWEvent(TWEventType.PAUSE, ms));
        else throw Error(`TypeWriter::pauseFor -> ms must be positive integer`);
        return this;
    }
    remove(span_number=1) {
        if(Number.isPositiveInteger(span_number)) this[TWSK].eventTask.push(new TWEvent(TWEventType.REM, span_number));
        else throw Error(`TypeWriter::remove -> span_number must be positive integer`);
        return this;
    }
    line(tab=0) {
        const d = document.createElement('div');
        if(tab > 0) d.style.paddingLeft = `${tab*2}ch`;
        this[TWSK].eventTask.push(new TWEvent(TWEventType.LINE, d));
        return this;
    }
    space() {
        const s = document.createElement('span');
        s.textContent = '\u00A0';
        this[TWSK].eventTask.push(new TWEvent(TWEventType.ADD, s));
        return this;
    }
    tab(ch=2) {
        if(!Number.isFinite(ch) || ch < 0) throw Error(`TypeWriter::tab -> ch must be positive number`);
        const d = document.createElement('div');
        d.style.width = `${ch}ch`;
        d.style.display = 'inline-block';
        this[TWSK].eventTask.push(new TWEvent(TWEventType.TAB, d));
        return this;
    }
    /**
     * @typedef {Object} SpanOptions
     * @property {String} fg foreground color
     * @property {String} bg background color
     * @property {Boolean} em emphasis (italic)
     * @property {String} style string of inline css style - ovverrides fg, bg, em
     * @property {String} class string of css classes separated by spaces
     */
    /**
     * Creates and append a new span of text
     * @param {String} text 
     * @param {SpanOptions|String|null} options formatting options or string of classes
     */
    span(text, options) {
        const s = document.createElement('span');
        s.setAttribute('data-text', text);
        if(options) applyStyleToSpan(s, options);
        this[TWSK].eventTask.push(new TWEvent(TWEventType.ADD, s));
        return this;
    }
    /**
     * Parses a string
     * @param {String} text 
     * @param  {Object.<string, SpanOptions>} options one letter string key
     */
    parse(text, options) {
        if(typeof text !== 'string') throw Error('Text provided is not a string');
        /** @param {String} line */
        const parseLine = line => line.split('§').forEach( piece => {
            if(piece.length === 0) return;
            const value = piece.slice(1);
            switch(piece.charCodeAt(0)) {
                case 58:    // : = normal span
                    this.span(value);
                    break;
                case 33:    // ! = pause
                    try {this.pauseFor(parseInt(value))}
                    catch {console.warn(`TypeWriter::parse add -> §! must be followed by positive integer \n\tAt: ${piece}`)}
                    break;
                case 45:    // - = remove
                    try {this.remove(parseInt(value))}
                    catch {console.warn(`TypeWriter::parse remove -> §- must be followed by positive integer \n\tAt: ${piece}x`)}
                    break;
                case 47:    // / = alternate style application time
                    this.alternateStyleTime();
                    break;
                case 62:    // > = tab
                    try {this.tab(parseFloat(value))}
                    catch {console.warn(`TypeWriter::parse tab -> §> must be followed by positive number \n\tAt: ${piece}`)}
                    break;
                case 64:    // @ = speed
                    try {this.setTypingSpeed(value)}
                    catch {console.warn(`TypeWriter::parse speed -> §@ must be followed by ${Object.keys(TW_default_speeds).join}, 
                    or one or two positive numbers`)}
                    break;
                default:
                    this.span(value, options[piece[0]]); break;
            }
        });
        const lines = text.split('\n');
        parseLine(lines[0]);
        const N = lines.length;
        let w = 0;
        for(let i=1; i<N; i++) {
            for(w=0; lines[i].charCodeAt(w) === 32; w++); // count white spaces
            this.line(w/2);
            if(w > 0) parseLine(lines[i].slice(w));
            else parseLine(lines[i]);
        }
        return this;
    }
    get typingSpeed() {return [this[TWSK].spanTask.o.t_min, this[TWSK].spanTask.o.t_max]}
    set typingSpeed(s) {this[TWSK].spanTask.setTypingSpeed(...parseTWSpeed(s))}
    get erasingSpeed() {return [this[TWSK].spanTask.o.e_min, this[TWSK].spanTask.o.e_max]}
    set erasingSpeed(s) {this[TWSK].spanTask.setErasingSpeed(...parseTWSpeed(s, true))}
    get apply_style_after_span_end() {return this[TWOK].apply_after}
    set apply_style_after_span_end(bool) {this[TWOK].apply_after = bool === true}
    start() {
        if(this[TWSK].eventTask.isInMiddle) return;
        this[TWSK].eventTask.forward();
    }
    stop() {
        this[TWSK].spanTask.pause();
        this[TWSK].eventTask.pause();
    }
    resume() {
        this[TWSK].eventTask.resume();
        this[TWSK].spanTask.resume();
    }
    reset() {
        this[TWSK].spanTask.onEnd(null)
            .setTypingSpeed(...this[TWOK].initial_type_speed)
            .setErasingSpeed(...this[TWOK].initial_erase_speed);
        this[TWSK].eventTask.reset();
        this[TWSK].container.textContent = '';
        const firstline = document.createElement('div');
        firstline.classList.add('TW-active-typing');
        this[TWSK].container.appendChild(firstline);
        this[TWSK].lines = [firstline];
        this[TWSK].iCurrLine = 0;
        return this;
    }
}
/**
 * Applies style provided to span 
 * @param {HTMLSpanElement} s span element
 * @param {SpanOptions|String} o styling options
 */
function applyStyleToSpan(s, o) {
    if(!o) return;
    if(typeof o === 'string') {
        if(o.charCodeAt(0) === 35) s.style.color = o;
        else s.className = o; return;
    }
    if(o.class) s.className = o.class;
    if(o.style) s.style = o.style;
    else {
        if(o.fg) s.style.color = o.fg;
        if(o.bg) s.style.backgroundColor = o.bg;
        if(o.em) s.style.fontStyle = 'italic';
    }
}

const tw = new TypeWriter(document.querySelector('.code-container'), {
    applyStyleAfter: true,
    type_speed: 'fast',
    loop: true
});
tw.parse(
`kfunction§f smoothScrollTo§:(§atarget§:, §aoffset§:, §aduration§:) {
    klet§: start §k= §vwindow§:.scrollY, end §k= §atarget§:.offsetTop §k- §aoffset§:, delta, initialTime;
    vconsole§:.§flog§:(end);
    kif§: (end §k>§: §vdocument§:.§vbody§:.scrollHeight §k- §vwindow§:.innerHeight) delta §k= §vdocument§:.§vbody§:.scrollHeight §k- §vwindow§:.innerHeight §k-§: start;
    kelse if§: (end §k< §v0§:) delta §k= -§: start; §kelse§: delta §k=§: end §k-§: start;
    kfunction§f animate§:(§atimeStamp§:) {
        §kif§: (initialTime §k=== §vundefined§:) initialTime §k= §atimeStamp§:;
        §kconst §vtimeElapsed §k= §atimeStamp §k-§: initialTime;
        vwindow§:.§fscrollTo§:(§v0§:, §fquadInOut§:(timeElapsed, start, delta, §aduration§:));
        kif§: (timeElapsed §k< §aduration§:) §vwindow§:.§frequestAnimationFrame§:(§fanimate§:);
    :}
    vwindow§:.§frequestAnimationFrame§:(§fanimate§:);
:}§!2500`, {
    k: 'js-keyword',
    v: 'js-value',
    a: 'js-arg',
    f: 'js-fname'
}).start();
