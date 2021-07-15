const getRandInt = (min, max) => Math.floor(Math.random() * (max-min+1))+min;
class SpanTyper {
    static fw = Symbol('forward');
    static bw = Symbol('backward');
    static pk = Symbol('Private key');
    constructor() {
        this.i = -1;    // index
        this.l = 0;     // lenght
        this.t = '';    // text
        this.p = false; // paused
        this.a = false; // apply style after text is complete
        this.timeoutId = null;
        this.c = null;  // callback
        /** @type {SpanTyper.fw | SpanTyper.bw | null} */
        this.d = null;
        /** @type {HTMLSpanElement} */
        this.s = null;
        this.o = {
            t_min: 120, t_max: 160,
            e_min: 40, e_max: 80,
        }
        this[SpanTyper.pk] = {
            forwardStep: (()=>{
                if(this.p || this.d !== SpanTyper.fw) return;
                this.s.textContent = this.t.slice(0, this.i); this.i++;
                if(this.i <= this.l) this.timeoutId = setTimeout(this[SpanTyper.pk].forwardStep, getRandInt(this.o.t_min, this.o.t_max));
                else {
                    this.i = this.l; this.d = null;
                    if(this.a) this.s.style.removeProperty('all');
                    if(this.c) this.c();
                }
            }).bind(this),
            backwardStep: (()=>{
                if(this.p || this.d !== SpanTyper.bw) return;
                this.s.textContent = this.t.slice(0, this.i); this.i--;
                if(this.i >= 0) this.timeoutId = setTimeout(this[SpanTyper.pk].backwardStep, getRandInt(this.o.e_min, this.o.e_max));
                else {
                    this.i = 0; this.d = null;
                    if(this.c) this.c();
                }
            }).bind(this)
        }
    }
    /**
     * @param {HTMLSpanElement} span 
     * @returns {SpanTyper}
     */
    setSpan(span) {
        this.s = span;
        this.t = span.getAttribute('data-text');
        this.l = this.t.length;
        return this
    }
    /** 
     * @param {Function} callback 
     * @returns {SpanTyper}
     */
    onEnd(callback) {
        if(callback instanceof Function) this.c = callback;
        else this.c = null;
        return this;
    }
    /** 
     * @param {Boolean} flag 
     * @returns {SpanTyper}
     */
    applyStyleOnComplete(flag) {
        this.a = flag;
        return this;
    }
    get asoc() {return this.a}
    set asoc(flag) {this.a = flag} 
    /**
     * Sets the time required to type one letter
     * @param {Number} min minimun ms
     * @param {Number} max maximum ms
     * @returns {SpanTyper}
     */
    setTypingSpeed(min, max) {
        this.o.t_min = min;
        this.o.t_max = max;
        return this;
    }
    /**
     * Sets the time required to erase one letter
     * @param {Number} min minimun ms
     * @param {Number} max maximum ms
     * @returns {SpanTyper}
     */
    setErasingSpeed(min, max) {
        this.o.e_min = min;
        this.o.e_max = max;
        return this;
    }
    type() {
        switch(this.d) {
            case null:
                this.i = 0;
                if(this.a) this.s.style.all = 'unset';
            case SpanTyper.bw:
                clearTimeout(this.timeoutId);
                this.d = SpanTyper.fw;
                this.p = false;
                this[SpanTyper.pk].forwardStep();
                return;
            default:
                if(!this.p) return; // already typing
                this.p = false;
                this[SpanTyper.pk].forwardStep();
        }
    }
    erase() {
        switch(this.d) {
            case null:
                this.i = this.l;
                if(this.a) this.s.style.all = 'unset';
            case SpanTyper.fw:
                clearTimeout(this.timeoutId);
                this.d = SpanTyper.bw;
                this.p = false;
                this[SpanTyper.pk].backwardStep();
                return;
            default:
                if(!this.p) return; // already erasing
                this.p = false;
                this[SpanTyper.pk].backwardStep();
        }
    }
    pause() {
        if(this.p) return;
        this.p = true;
        clearTimeout(this.timeoutId);
    }
    resume() {
        if(!this.p || !this.d) return;
        this.p = false;
        if(this.d === SpanTyper.fw) this[SpanTyper.pk].forwardStep();
        else this[SpanTyper.pk].backwardStep();
    }
    get isInMiddle() {return Boolean(this.d)}
    get isPaused() {return this.p}
    get willType() {return this.d === SpanTyper.fw}
    get willErase() {return this.d === SpanTyper.bw}
}
//const st = (new SpanTyper()).setSpan(document.getElementById('type-text')).onEnd(()=>{console.log('Type End')});