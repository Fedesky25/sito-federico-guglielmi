class ArrayTasker {
    static fw = Symbol('forward');
    static bw = Symbol('backward');
    static pk = Symbol('Private key');
    constructor(fwFunc, bwFunc, loop) {
        this.i = -1;    // index
        this.l = 0;     // lenght
        this.a = [];    // array
        this.p = false; // paused
        this.f = false; // failed
        /** @type {ArrayTasker.fw | ArrayTasker.bw | null} */
        this.d = null;
        this[ArrayTasker.pk] = {
            forwardStep: () => {
                if(this.p || this.d !== ArrayTasker.fw) return this.f = true;
                if(this.i < this.l - 1) {
                    this.i++;
                    return fwFunc(this.a[this.i], this[ArrayTasker.pk].forwardStep);
                }
                if(loop) {
                    this.p = false; this.i = this.l;
                    this.d = ArrayTasker.bw;
                    this[ArrayTasker.pk].backwardStep();
                } else this.d = null;
            },
            backwardStep: () => {
                if(this.p || this.d !== ArrayTasker.bw) return this.f = true;
                if(this.i > 0) {
                    this.i--;
                    return bwFunc(this.a[this.i], this[ArrayTasker.pk].backwardStep);
                }
                if(loop) {
                    this.p = false; this.i = -1;
                    this.d = ArrayTasker.fw;
                    this[ArrayTasker.pk].forwardStep();
                } else this.d = null;
            }
        };
    }
    /**
     * Resets the arrayTasker and returns the array
     * @returns {Array}
     */
    reset() {
        var old_a = this.a;
        this.i = -1;    // index
        this.l = 0;     // lenght
        this.a = [];    // array
        this.p = false; // paused
        this.f = false; // failed
        /** @type {ArrayTasker.fw | ArrayTasker.bw | null} */
        this.d = null;
        return old_a;
    }
    push(element) {
        this.a.push(element);
        this.l++;
        return this;
    }
    pushMultiple(...elements){
        this.a.push(...elements);
        this.l += elements.length;
        return this;
    }
    forward() {
        switch(this.d) {
            case null:
                this.i = -1;
            case ArrayTasker.bw:
                this.p = false;
                this.d = ArrayTasker.fw;
                this[ArrayTasker.pk].forwardStep();
                return;
            default:
                if(!this.p) return;
                this.p = false;
                if(!this.f) return;
                this.f = false;
                this[ArrayTasker.pk].forwardStep();
        }
    }
    backward() {
        switch(this.d) {
            case null:
                this.i = this.l;
            case ArrayTasker.fw:
                this.p = false;
                this.d = ArrayTasker.bw;
                this[ArrayTasker.pk].backwardStep();
                return;
            default:
                if(!this.p) return;
                this.p = false;
                if(!this.f) return;
                this.f = false;
                this[ArrayTasker.pk].backwardStep();
        }
    }
    pause() {this.p = true;}
    resume() {
        if(!this.p || !this.d) return;
        this.p = false;
        if(!this.f) return;
        this.f = false;
        if(this.d === ArrayTasker.fw) this[ArrayTasker.pk].forwardStep();
        else this[ArrayTasker.pk].backwardStep();
    }
    get isPaused() {return this.p}
    get currentElement() {return this.d ? this.a[this.i] : null;}
    get isInMiddle() {return Boolean(this.d)}
}