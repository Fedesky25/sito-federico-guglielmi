var app = (function () {
    'use strict';

    function noop() { }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function subscribe$1(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe$1(store, callback));
    }
    function action_destroyer(action_result) {
        return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.wholeText !== data)
            text.data = data;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    class HtmlTag {
        constructor() {
            this.e = this.n = null;
        }
        c(html) {
            this.h(html);
        }
        m(html, target, anchor = null) {
            if (!this.e) {
                this.e = element(target.nodeName);
                this.t = target;
                this.c(html);
            }
            this.i(anchor);
        }
        h(html) {
            this.e.innerHTML = html;
            this.n = Array.from(this.e.childNodes);
        }
        i(anchor) {
            for (let i = 0; i < this.n.length; i += 1) {
                insert(this.t, this.n[i], anchor);
            }
        }
        p(html) {
            this.d();
            this.h(html);
            this.i(this.a);
        }
        d() {
            this.n.forEach(detach);
        }
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe$1(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    class Complex {
        constructor(real=0, imag=0) {
            this.real = real;
            this.imag = imag;
        }
        becomes(real=0, imag=0) {
            this.real = real;
            this.imag = imag;
            return this;
        }
        /**@param {Complex} c */
        eq(c) {
            this.real = c.real;
            this.imag = c.imag;
            return this;
        }
        /**@param {Complex} c */
        add(c) {
            this.real += c.real;
            this.imag += c.imag;
            return this;
        }
        /**@param {...Complex} cs*/
        add$(...cs) {
            for(var i=cs.length-1; i>=0; i--) {
                this.real += cs[i].real;
                this.imag += cs[i].imag;
            }
            return this;
        }
        /**@param {Complex} c */
        sub(c) {
            this.real -= c.real;
            this.imag -= c.imag;
            return this;
        }
        /**@param {Complex} c */
        mul(c) {
            var i = this.imag*c.real + this.real*c.imag;
            this.real = this.real*c.real - this.imag*c.imag;
            this.imag = i;
            return this;
        }
        mul_i() {
            var t = this.real;
            this.real = -this.imag;
            this.imag = t;
            return this;
        }
        /**@param {Number} r */
        mul_r(r) {
            this.real *= r;
            this.imag *= r;
            return this;
        }
        /**@param {...Complex} cs*/
        mul$(...cs) {
            var t;
            for(var i=cs.length-1; i>=0; i--) {
                t = this.imag*cs[i].real + this.real*cs[i].imag;
                this.real = this.real*cs[i].real - this.imag*cs[i].imag;
                this.imag = t;
            }
            return this;
        }
        /**@param {Complex} c */
        div(c) {
            var m2 = c.real*c.real + c.imag*c.imag;
            var r = (this.real*c.real + this.imag*c.imag) / m2;
            var i = (this.imag*c.real - this.real*c.imag) / m2;
            this.real = r;
            this.imag = i;
            return this;
        }
        /**
         * @param {Complex} c complex power
         * @param {Number} [k=0] determines angle
         */
        exp(c, k=0) {
            return this.logarize(k).mul(c).exponentiate();
        }
        /**
         * @param {Complex} r real power
         * @param {Number} [k=0] determines angle
         */
        exp_r(r, k=0) {
            var mod = Math.pow(this.real*this.real + this.imag*this.imag, r/2); 
            var arg = Math.atan2(this.imag, this.real) + k*2*Math.PI;
            this.real = mod * Math.cos(r * arg);
            this.imag = mod * Math.sin(r * arg);
            return this;
        }
        /**@param {Number} n integer power */
        exp_n(n) {
            if(n == 0) return this.becomes(1, 0);
            const real = this.real, imag = this.imag;
            var end = n, t;
            if(n<0) {
                end = -n;
                this.toReciprocal();
            }
            for(var i=0; i<end; i++) {
                t = this.imag*real + this.real*imag;
                this.real = this.real*real - this.imag*imag;
                this.imag = t;
            }
            return this;
        }
        exponentiate() {
            var mod = Math.exp(this.real);
            this.real = mod * Math.cos(this.imag);
            this.imag = mod * Math.sin(this.imag);
            return this;
        }
        logarize(k=0) {
            var r = Math.log(this.real*this.real + this.imag*this.imag);
            var i = Math.atan2(this.imag, this.real) + k*2*Math.PI;
            this.real = r * .5;
            this.imag = i;
            return this;
        }
        intoSine() {
            var i = Math.cos(this.real)*Math.sinh(this.imag);
            this.real = Math.sin(this.real)*Math.cosh(this.imag);
            this.imag = i;
            return this;
        }
        intoCosine() {
            var i = -Math.sin(this.real)*Math.sinh(this.imag);
            this.real = Math.cos(this.real)*Math.cosh(this.imag);
            this.imag = i;
            return this;
        }
        toOne() {
            this.real = 1;
            this.imag = 0;
            return this;
        }
        toZero() {
            this.real = 0;
            this.imag = 0;
            return this;
        }
        toConjugate() {
            this.imag = -this.imag;
            return this;
        }
        toReciprocal() {
            var m2 = this.real*this.real + this.imag*this.imag;
            this.real /= m2;
            this.imag = -this.imag/m2;
            return this;
        }
        toString() {
            if(this.real == 0) return this.imag ? nf(this.imag)+'i' : '0';
            if(this.imag == 0) return nf(this.real);
            let r = ['(', nf(this.real)];
            if(this.imag > 0) {
                if(this.imag === 1) r.push('+i)');
                else r.push('+', nf(this.imag), 'i)');
            } else {
                if(this.imag === -1) r.push('-i)');
                else r.push(nf(this.imag), 'i)');
            }
            return r.join('');
        }
        static ReIm(real, imag) { return new Complex(real, imag) }
        static ModArg(mod, arg) { return new Complex(mod * Math.cos(arg), mod * Math.sin(arg)) }
    }
    window.Complex = Complex;
    function nf(n) { return Number.isInteger(n) ? n.toString() : n.toPrecision(3) }

    const axis = (function(){
        let lock = true;
        const value = {
            xMin: -3,
            xMax: 3,
            yMin: -2,
            yMax: 2,
        };
        const { subscribe, set } = writable(value);
        return Object.freeze({
            subscribe,
            shift(xShift, yShift) {
                value.xMin += xShift;
                value.xMax += xShift;
                value.yMin += yShift;
                value.yMax += yShift;
                set(value);
            },
            scale(factor) {
                const xMiddle = (value.xMin + value.xMax) / 2;
                const xDelta = (value.xMax - xMiddle) * factor;
                value.xMin = xMiddle - xDelta;
                value.xMax = xMiddle + xDelta;
                const yMiddle = (value.yMin + value.yMax) / 2;
                const yDelta = (value.yMax - yMiddle) * factor;
                value.yMin = yMiddle - yDelta;
                value.yMax = yMiddle + yDelta;
                set(value);
            },
            reset() {
                value.xMin = -3;
                value.xMax = 3;
                value.yMin = -2;
                value.yMax = 2;
                set(value);
            },
            get xMin() {return value.xMin},
            set xMin(v) {
                if(lock) value.yMin += (v-value.xMin) * 2/3;
                value.xMin=v;
                set(value);
            },
            get xMax() {return value.xMax},
            set xMax(v) {
                if(lock) value.yMax += (v-value.xMin) * 2/3;
                value.xMax=v;
                set(value);
            },
            get yMin() {return value.yMin},
            set yMin(v) {
                if(lock) value.xMin += (v-value.yMin) * 1.5;
                value.yMin=v;
                set(value);
            },
            get yMax() {return value.yMax},
            set yMax(v) {
                if(lock) value.xMax += (v-value.yMax) * 1.5;
                value.yMax=v;
                set(value);
            },
            get locked() {return lock},
            set locked(v) {
                lock = v;
                if(v) {
                    const xMiddle = (value.xMax+value.xMin)/2;
                    const yMiddle = (value.yMax+value.yMin)/2;
                    const average = (Math.abs(value.xMax-xMiddle)*3 + Math.abs(value.yMax-yMiddle)*2) / 5;
                    // * 3 / mean(2,3) = 1.2
                    value.xMin = xMiddle - average*1.2;
                    value.xMax = xMiddle + average*1.2;
                    // * 2 / mean(2,3) = 0.8;
                    value.yMin = yMiddle - average*0.8;
                    value.yMax = yMiddle + average*0.8;
                    set(value);
                }
            },
        });
    })();

    derived(axis, a => ({x: 900/(a.xMax - a.xMin), y: 600/(a.yMax - a.yMin)}));

    /**@param {Number} v*/
    function writable_init(v) {
        const res = writable(v);
        Object.defineProperty(res, 'initial', {value: v});
        return res;
    }

    const px_gap = writable_init(12);
    const life = writable_init(4);

    const clr_num = writable_init(8);
    const clr_factor = writable_init(0);
    const clr_thresholds = derived([clr_num, clr_factor], ([n, f]) => {
        const res = new Array(n+1), mul = Math.pow(100, f/10);
        for(var i=n; i >= 0; i--) res[i] = ( n / i - 1) * mul;
        return res;
    });
    const clr_strings = derived(clr_num, n => {
        const res = new Array(n);
        let hue;
        for(var i=0; i<n; i++) {
            hue = 240 * Math.pow(i/(n-1), .6) * Math.sin(i*Math.PI / (2*n-2));
            res[i] = `hsl(${hue},55%,55%)`;
        }
        return res;
    });
    const clr_all = derived(
        [clr_thresholds, clr_strings, clr_num, clr_factor],
        ([t, s, n, f]) => ({number: n, factor: f, strings: s, thresholds: t})
    );
    const color = Object.freeze({
        number: clr_num,
        factor: clr_factor,
        strings: clr_strings,
        thresholds: clr_thresholds,
        all: clr_all,
    });

    const info = Object.freeze({
        computation: writable(""),
        particles: writable(""),
        frame: writable(""), 
    });

    const complexFunction = writable(c => new Complex(c.real, c.imag));

    /**
     * @param {Function} fn 
     * @param {Number} delay 
     * @returns 
     */
    function debounce(fn, delay) {
        let timer;
        function res() {
            clearTimeout(timer);
            timer = setTimeout(fn, delay);
        }
        res.cancel = () => clearTimeout(timer);
        return res;
    }

    /**@type {{x: Number, y: Number, s: Number}[][][]} */
    let frames$1 = [], clrs$1 = [];
    const { subscribe, set } = writable({clrs: clrs$1, frames: frames$1});

    const settings = {
        axis: {
            xMin: -3, xMax: 3,
            yMin: -2, yMax: 2,
        },
        gap: 12,
        life: 120,
        func: null,
    };

    var thresholds = [];
    function clr_index(speed) {
        var i = 1;
        while(speed < thresholds[i]) i++;
        return i-1;
    }
    function logistic(s) { return 1/(1 + 3*Math.exp(-.1*s)) }

    async function cf() {
        const start = performance.now();
        const numX = Math.floor(900/settings.gap);
        const numY = Math.floor(600/settings.gap);
        var i, z, w, shift;
        const life = settings.life;
        const axis = settings.axis;
        const deltaX = axis.xMax - axis.xMin;
        const deltaY = axis.yMax - axis.yMin;
        const avScale = (deltaX/900 + deltaY/600)/2;
        const f = new Array(life);
        const clr_num = clrs$1.length;
        for(var j=0; j<life; j++) {
            f[j] = new Array(clr_num);
            for(i=0; i<clr_num; i++) f[j][i] = [];
        }
        function particle() {
            w = settings.func(z);
            var speed = Math.sqrt(w.real*w.real + w.imag*w.imag);
            f[i][clr_index(speed)].push({
                x: (z.real - axis.xMin)*900/deltaX,
                y: (axis.yMax - z.imag)*600/deltaY,
                s: speed,
            });
            z.add(w.mul_r( avScale * logistic(speed) / speed ));
        }
        var ix, iy;
        for(ix=0; ix<=numX; ix++) {
            for(iy=0; iy<=numY; iy++) {
                z = new Complex(
                    ix/numX*deltaX + axis.xMin,
                    iy/numY*deltaY + axis.yMin,
                );
                shift = Math.round(Math.random()*life);
                for(i=shift; i<life; i++) particle();
                for(i=0; i<shift; i++) particle();
            }
        }
        frames$1 = f;
        info.computation.set(`Comp. ${(performance.now()-start).toPrecision(3)} ms`);
        info.particles.set(`Part. ${numX+1}\xd7${numY+1}`);
        set({clrs: clrs$1, frames: frames$1});
    }
    const computeFrames = debounce(cf, 100);
    axis.subscribe(v => {settings.axis = v; computeFrames();});
    px_gap.subscribe(v => {settings.gap = v; computeFrames();});
    life.subscribe(v => {settings.life = v*30; computeFrames();});
    complexFunction.subscribe(v => {settings.func = v; computeFrames();});

    color.all.subscribe(({number: n, thresholds: t, strings: s}) => {
        var c, i;
        thresholds = t;
        frames$1 = frames$1.map(f => {
            const r = new Array(n);
            for(c=0; c<n; c++) r[c] = [];
            var ci;
            for(c=f.length-1; c>=0; c--) {
                for(i=f[c].length-1; i>=0; i--) {
                    ci = clr_index(f[c][i].s);
                    if(ci >= n) console.log(c, i, f[c][i], ci);
                    r[ci].push(f[c][i]);
                }
            }
            return r;
        });
        clrs$1 = s;
        set({clrs: clrs$1, frames: frames$1});
    });


    var plotFrames = { subscribe, computeFrames };

    const z1 = Complex.ReIm(-1, 1);
    const z2 = Complex.ModArg(2, Math.PI/4);
    const z3 = new Complex(0, -1);
    const otherVars = { r: .5, k: 0 };

    const tm = [new Complex(), new Complex(), new Complex(), new Complex()];

    /**@type {Object.<string, {label: string, fn: Function}[]>} */
    var fns = {
        polynomials: [
            {
                label: 'z<sub>1</sub>x + z<sub>2</sub>',
                fn: c => tm[0].eq(c).mul(z1).add(z2),
            },
            {
                label: 'z<sub>1</sub>x<sup>2</sup> + z<sub>2</sub>x + z<sub>3</sub>',
                fn: c => tm[0].toZero().add$(
                    tm[1].eq(c).mul$(c, z1),
                    tm[2].eq(c).mul(z2),
                    z3
                ),
            },
            {
                label: 'z<sub>1</sub>x<sup>3</sup> + z<sub>2</sub>x + z<sub>3</sub>',
                fn: c => tm[0].toZero().add$(
                    tm[1].eq(c).mul$(c, c, z1),
                    tm[2].eq(c).mul(z2),
                    z3
                ),
            },
            {
                label: '(x - z<sub>1</sub>)(x - z<sub>2</sub>)(x - z<sub>3</sub>)',
                fn: c => tm[0].toOne().mul$(
                    tm[1].eq(c).sub(z1),
                    tm[2].eq(c).sub(z2),
                    tm[3].eq(c).sub(z3)
                ),
            }, 
        ],
        powers: [
            {
                label: 'x<sup>k</sup>',
                fn: c => tm[0].eq(c).exp_n(otherVars.k),
            },
            {
                label: '(x<sub>k</sub>)<sup>r</sup>',
                fn: c => tm[0].eq(c).exp_r(otherVars.r, otherVars.k),
            },
            {
                label: '(x<sub>k</sub>)<sup>z<sub>1</sub></sup>',
                fn: c => tm[0].eq(c).exp(z1, otherVars.k),
            },
        ],
        exponentials: [
            {
                label: 'e<sup>x</sup>',
                fn: c => tm[0].eq(c).exponentiate(),
            },
            {
                label: 'e<sup>z<sub>1</sub>x</sup>',
                fn: c => tm[0].eq(c).mul(z1).exponentiate(),
            },
            {
                label: 'e<sup>x<sup>2</sup></sup>',
                fn: c => tm[0].eq(c).mul(c).exponentiate(),
            },
            {
                label: 'e<sup>(x<sub>k</sub>)<sup>r</sup></sup>',
                fn: c => tm[0].eq(c).exp_r(otherVars.r, otherVars.k).exponentiate(),
            },
            {
                label: '(z<sub>1, k</sub>)<sup>x</sup>',
                fn: c => tm[0].eq(z1).exp(c, otherVars.k),
            },
            {
                label: 'x<sup>3</sup>e<sup>x</sup>',
                fn: c => tm[0].eq(c).exponentiate().mul$(c, c, c),
            },
            {
                label: 'x<sup>r</sup>e<sup>x</sup>',
                fn: c => tm[0].eq(c).exponentiate().mul(tm[1].eq(c).exp_r(otherVars.r)),
            },
        ],
        logarithms: [
            {
                label: 'z<sub>1</sub>ln(x)<sub>k</sub>',
                fn: c => tm[0].eq(c).logarize(otherVars.k).mul(z1),
            },
            {
                label: 'x ln(x)<sub>k</sub>',
                fn: c => tm[0].eq(c).logarize(otherVars.k).mul(c),
            },
            {
                label: 'ln(x + z<sub>1</sub>)<sub>k</sub>',
                fn: c => tm[0].eq(c).add(z1).logarize(otherVars.k),
            },
        ],
        trigonometry: [
            {
                label: 'sin(x)',
                fn: c => tm[0].eq(c).intoSine(),
            },
            {
                label: 'cos(x)',
                fn: c => tm[0].eq(c).intoCosine(),
            },
            {
                label: 'sin(x + z<sub>1</sub>)',
                fn: c => tm[0].eq(c).add(z1).intoSine(),
            },
            {
                label: 'sin(z<sub>1</sub>x)',
                fn: c => tm[0].eq(c).mul(z1).intoSine(),
            },
            {
                label: 'cos(z<sub>1</sub>x)',
                fn: c => tm[0].eq(c).mul(z1).intoCosine(),
            },
            {
                label: 'z<sub>1</sub>sin(z<sub>2</sub>x)',
                fn: c => tm[0].eq(c).mul(z2).intoSine().mul(z1),
            },
        ],
        miscellaneous: [
            {
                label: '<span class="overline">x</span>i',
                fn: c => tm[0].eq(c).toConjugate().mul_i(),
            },
            {
                label: '<span class="overline">x</span>z<sub>1</sub>',
                fn: c => tm[0].eq(c).toConjugate().mul(z1),
            },
            {
                label: `(x<sup>2</sup> - z<sub>1</sub>) (x - z<sub>2</sub>)<sup>2</sup> / (x<sup>2</sup> + z<sub>3</sub>)`,
                fn: c => tm[0].toOne().mul$(
                    tm[1].eq(c).mul(c).sub(z1),
                    tm[2].eq(c).sub(z2).exp_r(2),
                    tm[3].eq(c).mul(c).add(z3).toReciprocal()
                ),
            },
            {
                title: 'Binet function (Fibonacci)',
                label: '<em>F</em><sub>x</sub>',
                fn: binet,
            },
            {
                title: 'Gamma function (through Lanczos approximation)',
                label: '&Gamma;(x)',
                fn: gamma,
            },
            // {
            //     title: 'Riemann zeta function (through Riemann–Siegel formula)',
            //     label: '&zeta;(x)',
            //     fn: zeta,
            // },
        ],
    };


    const sqrt5 = Math.sqrt(5);
    const ln_phi = Math.log((1 + sqrt5)/2);
    function binet(z) {
        tm[0].eq(z).mul_r(ln_phi).exponentiate();
        tm[1].becomes(0, Math.PI).mul(z).exponentiate().div(tm[0]);
        tm[0].sub(tm[1]).mul_r(1/sqrt5);
        if(Math.abs(tm[0].imag) < Number.EPSILON) tm[0].imag = 0;
        return tm[0];
    }


    const p = [
        676.5203681218851,
        -1259.1392167224028,
        771.32342877765313,
        -176.61502916214059,
        12.507343278686905,
        -0.13857109526572012,
        9.9843695780195716e-6,
        1.5056327351493116e-7
    ];
    const sqrt2PI = Math.sqrt(2 * Math.PI);

    /**@param {Complex} z*/
    function _gamma_pos(z) {
        tm[3].becomes(z.real-1, z.imag);
        tm[0].becomes(0.99999999999980993, 0);
        for(var i=0; i<8; i++) 
            tm[0].add( tm[1].becomes(1+i,0).add(tm[3]).toReciprocal().mul_r(p[i]) );
        tm[1].becomes(8 - .5, 0).add(tm[3]);
        tm[2].eq(tm[1]);
        tm[3].real += .5;
        tm[0].mul_r(sqrt2PI).mul$( tm[1].exp(tm[3]), tm[2].mul_r(-1).exponentiate() );
        if(Math.abs(tm[0].imag) < 1e-10) tm[0].imag = 0;
        return tm[0];
    }
    /**@param {Complex} z*/
    function gamma(z) {
        if(z.real < .5) {
            _gamma_pos(tm[3].becomes(1-z.real, -z.imag));
            tm[1].eq(z).mul_r(Math.PI).intoSine().mul(tm[0]).toReciprocal().mul_r(Math.PI);
            if(Math.abs(tm[1].imag) < 1e-10) tm[1].imag = 0;
            return tm[1];
        } else return _gamma_pos(z);
    }

    const ln2pi = Math.log(2*Math.PI);
    const logs_n = [1,2,3,4,5,6,7,8,9,10].map(n => Math.log(n));

    /**@param {Complex} z*/
    function zeta(z) {
        const M = Math.floor(Math.sqrt(Math.abs(z.imag)*.5/Math.PI));
        // calculates gamma first since gamma uses tm
        tm[3].becomes(1-z.real, -z.imag);
        tm[3].eq(gamma(tm[3]));
        // first summation
        tm[0].toZero();
        for(var i=0; i<M; i++) tm[0].add( tm[1].eq(z).mul_r(-logs_n[i]).exponentiate() );
        // things of second term
        tm[1].eq(z).mul_r(ln2pi).exponentiate();
        tm[2].eq(z).mul_r(Math.PI/2).intoSine();
        tm[3].mul(tm[1]).mul(tm[2]).mul_r(1/Math.PI);
        // second summation
        tm[1].toZero();
        for(var i=0; i<M; i++) tm[1].add( tm[2].becomes(z.real-1, z.imag).mul_r(logs_n[i]).exponentiate() );
        // all together
        return tm[3].mul(tm[1]).add(tm[0]);
    }

    window.binet = binet;
    window.gamma = gamma;
    window.zeta = zeta;

    /* v2\components\FunctionSelect.svelte generated by Svelte v3.43.0 */

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[7] = list[i];
    	return child_ctx;
    }

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[10] = list[i];
    	return child_ctx;
    }

    // (29:12) {#each fns[key] as opt}
    function create_each_block_1$1(ctx) {
    	let div;
    	let raw_value = /*opt*/ ctx[10].label + "";
    	let div_title_value;
    	let mounted;
    	let dispose;

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[5](/*opt*/ ctx[10]);
    	}

    	return {
    		c() {
    			div = element("div");
    			attr(div, "class", "option svelte-jkhb7x");
    			attr(div, "title", div_title_value = /*opt*/ ctx[10].title);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			div.innerHTML = raw_value;

    			if (!mounted) {
    				dispose = listen(div, "click", click_handler_1);
    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (27:8) {#each Object.keys(fns) as key}
    function create_each_block$2(ctx) {
    	let h3;
    	let t0_value = /*key*/ ctx[7] + "";
    	let t0;
    	let t1;
    	let each_1_anchor;
    	let each_value_1 = fns[/*key*/ ctx[7]];
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
    	}

    	return {
    		c() {
    			h3 = element("h3");
    			t0 = text(t0_value);
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			attr(h3, "class", "svelte-jkhb7x");
    		},
    		m(target, anchor) {
    			insert(target, h3, anchor);
    			append(h3, t0);
    			insert(target, t1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*fns, Object, sel*/ 8) {
    				each_value_1 = fns[/*key*/ ctx[7]];
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(h3);
    			if (detaching) detach(t1);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(each_1_anchor);
    		}
    	};
    }

    function create_fragment$6(ctx) {
    	let div1;
    	let button;
    	let t0;
    	let html_tag;
    	let t1;
    	let div0;
    	let mounted;
    	let dispose;
    	let each_value = Object.keys(fns);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	return {
    		c() {
    			div1 = element("div");
    			button = element("button");
    			t0 = text("f(x) = ");
    			html_tag = new HtmlTag();
    			t1 = space();
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			html_tag.a = null;
    			attr(button, "class", "svelte-jkhb7x");
    			attr(div0, "class", "options svelte-jkhb7x");
    			attr(div0, "tabindex", "0");
    			attr(div1, "class", "container svelte-jkhb7x");
    		},
    		m(target, anchor) {
    			insert(target, div1, anchor);
    			append(div1, button);
    			append(button, t0);
    			html_tag.m(/*label*/ ctx[2], button);
    			append(div1, t1);
    			append(div1, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			/*div0_binding*/ ctx[6](div0);

    			if (!mounted) {
    				dispose = listen(button, "click", /*click_handler*/ ctx[4]);
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*label*/ 4) html_tag.p(/*label*/ ctx[2]);

    			if (dirty & /*fns, Object, sel*/ 8) {
    				each_value = Object.keys(fns);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div1);
    			destroy_each(each_blocks, detaching);
    			/*div0_binding*/ ctx[6](null);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let options, onFocus = false;
    	let label = fns.polynomials[0].label;
    	complexFunction.set(fns.polynomials[0].fn);

    	function sel(opt) {
    		$$invalidate(2, label = opt.label);
    		complexFunction.set(opt.fn);
    		setTimeout(() => $$invalidate(1, onFocus = false), 10);
    		plotFrames.computeFrames();
    	}

    	const click_handler = () => $$invalidate(1, onFocus = !onFocus);
    	const click_handler_1 = opt => sel(opt);

    	function div0_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			options = $$value;
    			$$invalidate(0, options);
    		});
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*options, onFocus*/ 3) {
    			if (options) {
    				if (onFocus) options.focus(); else options.blur();
    			}
    		}
    	};

    	return [options, onFocus, label, sel, click_handler, click_handler_1, div0_binding];
    }

    class FunctionSelect extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});
    	}
    }

    /* v2\components\ComplexInput.svelte generated by Svelte v3.43.0 */

    function create_fragment$5(ctx) {
    	let div;
    	let t0;
    	let input0;
    	let input0_value_value;
    	let t1;
    	let input1;
    	let input1_value_value;
    	let t2;
    	let br;
    	let t3;
    	let input2;
    	let input2_value_value;
    	let t4;
    	let input3;
    	let input3_value_value;
    	let t5;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			div = element("div");
    			t0 = text("=\r\n    ");
    			input0 = element("input");
    			t1 = text("\r\n\t+\r\n    ");
    			input1 = element("input");
    			t2 = text("i");
    			br = element("br");
    			t3 = text("\r\n\t=\r\n    ");
    			input2 = element("input");
    			t4 = text("\r\n\t∠\r\n    ");
    			input3 = element("input");
    			t5 = text("°");
    			attr(input0, "type", "number");
    			input0.value = input0_value_value = /*number*/ ctx[0].real;
    			attr(input0, "class", "no-arrows svelte-17d3ii8");
    			attr(input1, "type", "number");
    			input1.value = input1_value_value = /*number*/ ctx[0].imag;
    			attr(input1, "class", "no-arrows svelte-17d3ii8");
    			attr(input2, "type", "number");
    			input2.value = input2_value_value = Math.sqrt(/*number*/ ctx[0].real * /*number*/ ctx[0].real + /*number*/ ctx[0].imag * /*number*/ ctx[0].imag);
    			attr(input2, "class", "no-arrows svelte-17d3ii8");
    			attr(input3, "type", "number");
    			input3.value = input3_value_value = Math.atan2(/*number*/ ctx[0].imag, /*number*/ ctx[0].real) * 180 / Math.PI;
    			attr(input3, "class", "no-arrows svelte-17d3ii8");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t0);
    			append(div, input0);
    			/*input0_binding*/ ctx[4](input0);
    			append(div, t1);
    			append(div, input1);
    			/*input1_binding*/ ctx[5](input1);
    			append(div, t2);
    			append(div, br);
    			append(div, t3);
    			append(div, input2);
    			/*input2_binding*/ ctx[6](input2);
    			append(div, t4);
    			append(div, input3);
    			/*input3_binding*/ ctx[7](input3);
    			append(div, t5);

    			if (!mounted) {
    				dispose = [
    					listen(input0, "change", /*RIchange*/ ctx[2]),
    					listen(input1, "change", /*RIchange*/ ctx[2]),
    					listen(input2, "change", /*MAchange*/ ctx[3]),
    					listen(input3, "change", /*MAchange*/ ctx[3])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*number*/ 1 && input0_value_value !== (input0_value_value = /*number*/ ctx[0].real)) {
    				input0.value = input0_value_value;
    			}

    			if (dirty & /*number*/ 1 && input1_value_value !== (input1_value_value = /*number*/ ctx[0].imag)) {
    				input1.value = input1_value_value;
    			}

    			if (dirty & /*number*/ 1 && input2_value_value !== (input2_value_value = Math.sqrt(/*number*/ ctx[0].real * /*number*/ ctx[0].real + /*number*/ ctx[0].imag * /*number*/ ctx[0].imag))) {
    				input2.value = input2_value_value;
    			}

    			if (dirty & /*number*/ 1 && input3_value_value !== (input3_value_value = Math.atan2(/*number*/ ctx[0].imag, /*number*/ ctx[0].real) * 180 / Math.PI)) {
    				input3.value = input3_value_value;
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    			/*input0_binding*/ ctx[4](null);
    			/*input1_binding*/ ctx[5](null);
    			/*input2_binding*/ ctx[6](null);
    			/*input3_binding*/ ctx[7](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { number = new Complex() } = $$props;

    	const inputs = {
    		real: null,
    		imag: null,
    		mod: null,
    		arg: null
    	};

    	function RIchange() {
    		$$invalidate(0, number.real = Number(inputs.real.value) || 0, number);
    		$$invalidate(0, number.imag = Number(inputs.imag.value) || 0, number);
    		$$invalidate(1, inputs.mod.value = Math.sqrt(number.real * number.real + number.imag * number.imag), inputs);
    		$$invalidate(1, inputs.arg.value = Math.atan2(number.imag, number.real) * 180 / Math.PI, inputs);
    		plotFrames.computeFrames();
    	}

    	function MAchange() {
    		let mod = Number(inputs.mod.value);
    		let arg = Number(inputs.arg.value) * Math.PI / 180;
    		$$invalidate(1, inputs.real.value = $$invalidate(0, number.real = mod * Math.cos(arg), number), inputs);
    		$$invalidate(1, inputs.imag.value = $$invalidate(0, number.imag = mod * Math.sin(arg), number), inputs);
    		plotFrames.computeFrames();
    	}

    	function input0_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			inputs.real = $$value;
    			$$invalidate(1, inputs);
    		});
    	}

    	function input1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			inputs.imag = $$value;
    			$$invalidate(1, inputs);
    		});
    	}

    	function input2_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			inputs.mod = $$value;
    			$$invalidate(1, inputs);
    		});
    	}

    	function input3_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			inputs.arg = $$value;
    			$$invalidate(1, inputs);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ('number' in $$props) $$invalidate(0, number = $$props.number);
    	};

    	return [
    		number,
    		inputs,
    		RIchange,
    		MAchange,
    		input0_binding,
    		input1_binding,
    		input2_binding,
    		input3_binding
    	];
    }

    class ComplexInput extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { number: 0 });
    	}
    }

    /* v2\components\VarsMenu.svelte generated by Svelte v3.43.0 */

    function create_fragment$4(ctx) {
    	let div3;
    	let functionselect;
    	let t0;
    	let h20;
    	let t2;
    	let div0;
    	let h30;
    	let t5;
    	let complexinput0;
    	let t6;
    	let h31;
    	let t9;
    	let complexinput1;
    	let t10;
    	let h32;
    	let t13;
    	let complexinput2;
    	let t14;
    	let h21;
    	let t16;
    	let div1;
    	let h33;
    	let t20;
    	let input0;
    	let input0_value_value;
    	let t21;
    	let h34;
    	let t25;
    	let input1;
    	let input1_value_value;
    	let t26;
    	let div2;
    	let current;
    	let mounted;
    	let dispose;
    	functionselect = new FunctionSelect({});
    	complexinput0 = new ComplexInput({ props: { number: z1 } });
    	complexinput1 = new ComplexInput({ props: { number: z2 } });
    	complexinput2 = new ComplexInput({ props: { number: z3 } });

    	return {
    		c() {
    			div3 = element("div");
    			create_component(functionselect.$$.fragment);
    			t0 = space();
    			h20 = element("h2");
    			h20.textContent = "Complex numbers";
    			t2 = space();
    			div0 = element("div");
    			h30 = element("h3");
    			h30.innerHTML = `z<sub>1</sub>`;
    			t5 = space();
    			create_component(complexinput0.$$.fragment);
    			t6 = space();
    			h31 = element("h3");
    			h31.innerHTML = `z<sub>2</sub>`;
    			t9 = space();
    			create_component(complexinput1.$$.fragment);
    			t10 = space();
    			h32 = element("h3");
    			h32.innerHTML = `z<sub>3</sub>`;
    			t13 = space();
    			create_component(complexinput2.$$.fragment);
    			t14 = space();
    			h21 = element("h2");
    			h21.textContent = "Other numbers";
    			t16 = space();
    			div1 = element("div");
    			h33 = element("h3");
    			h33.innerHTML = `real <span class="bold svelte-bgzft3">r</span> =`;
    			t20 = space();
    			input0 = element("input");
    			t21 = space();
    			h34 = element("h3");
    			h34.innerHTML = `integer <span class="bold svelte-bgzft3">k</span> =`;
    			t25 = space();
    			input1 = element("input");
    			t26 = space();
    			div2 = element("div");
    			div2.innerHTML = `z<sub>k</sub>, k ∈ ℤ ⇒ z ≡ |z| ∠ (atan2(z) + 2πk)`;
    			attr(h20, "class", "svelte-bgzft3");
    			attr(h30, "class", "svelte-bgzft3");
    			attr(h31, "class", "svelte-bgzft3");
    			attr(h32, "class", "svelte-bgzft3");
    			attr(div0, "class", "centering-col svelte-bgzft3");
    			attr(h21, "class", "svelte-bgzft3");
    			attr(h33, "class", "svelte-bgzft3");
    			attr(input0, "type", "number");
    			input0.value = input0_value_value = /*otherVars*/ ctx[0].r;
    			attr(input0, "step", "0.1");
    			attr(input0, "class", "svelte-bgzft3");
    			attr(h34, "class", "svelte-bgzft3");
    			attr(input1, "type", "number");
    			input1.value = input1_value_value = /*otherVars*/ ctx[0].k;
    			attr(input1, "step", "1");
    			attr(input1, "class", "svelte-bgzft3");
    			attr(div1, "class", "aligned svelte-bgzft3");
    			attr(div2, "class", "expl svelte-bgzft3");
    			attr(div3, "class", "container svelte-bgzft3");
    		},
    		m(target, anchor) {
    			insert(target, div3, anchor);
    			mount_component(functionselect, div3, null);
    			append(div3, t0);
    			append(div3, h20);
    			append(div3, t2);
    			append(div3, div0);
    			append(div0, h30);
    			append(div0, t5);
    			mount_component(complexinput0, div0, null);
    			append(div0, t6);
    			append(div0, h31);
    			append(div0, t9);
    			mount_component(complexinput1, div0, null);
    			append(div0, t10);
    			append(div0, h32);
    			append(div0, t13);
    			mount_component(complexinput2, div0, null);
    			append(div3, t14);
    			append(div3, h21);
    			append(div3, t16);
    			append(div3, div1);
    			append(div1, h33);
    			append(div1, t20);
    			append(div1, input0);
    			append(div1, t21);
    			append(div1, h34);
    			append(div1, t25);
    			append(div1, input1);
    			append(div3, t26);
    			append(div3, div2);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(input0, "change", /*change_r*/ ctx[1]),
    					listen(input1, "change", /*change_k*/ ctx[2])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (!current || dirty & /*otherVars*/ 1 && input0_value_value !== (input0_value_value = /*otherVars*/ ctx[0].r)) {
    				input0.value = input0_value_value;
    			}

    			if (!current || dirty & /*otherVars*/ 1 && input1_value_value !== (input1_value_value = /*otherVars*/ ctx[0].k)) {
    				input1.value = input1_value_value;
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(functionselect.$$.fragment, local);
    			transition_in(complexinput0.$$.fragment, local);
    			transition_in(complexinput1.$$.fragment, local);
    			transition_in(complexinput2.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(functionselect.$$.fragment, local);
    			transition_out(complexinput0.$$.fragment, local);
    			transition_out(complexinput1.$$.fragment, local);
    			transition_out(complexinput2.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div3);
    			destroy_component(functionselect);
    			destroy_component(complexinput0);
    			destroy_component(complexinput1);
    			destroy_component(complexinput2);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$4($$self, $$props, $$invalidate) {
    	function change_r(e) {
    		$$invalidate(0, otherVars.r = parseFloat(e.target.value), otherVars);
    		plotFrames.computeFrames();
    	}

    	/**@param {Event} e*/
    	function change_k(e) {
    		const t = e.target;
    		let v = Number(t.value);
    		if (Number.isNaN(v)) t.value = v = 0; else if (!Number.isInteger(v)) t.value = v = Math.round(v);
    		$$invalidate(0, otherVars.k = v, otherVars);
    		plotFrames.computeFrames();
    	}

    	return [otherVars, change_r, change_k];
    }

    class VarsMenu extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});
    	}
    }

    /**
     * @param {Function} fn
     * @param {Number} delay
     */
    function throttle(fn, delay) {
        let waiting = false;
        return () => {
            if(waiting) return;
            waiting = true;
            setTimeout(() => {
                fn();
                waiting = false;
            }, delay);
        }
    }

    var frame_request = null, /**@type {CanvasRenderingContext2D} */ ctx;
    var frame_index=0, time=0, counter = 0;

    var clrs = [], frames = [];
    plotFrames.subscribe(v => {
        clrs = v.clrs;
        frames = v.frames;
    });


    /**@param {HTMLCanvasElement} node */
    function setCanvas(node) {
        ctx = node.getContext('2d');
        ctx.fillStyle = 'hsl(240, 6%, 15%)';
        ctx.fillRect(0, 0, 900, 600);
    }

    function draw() {
        const start = performance.now();
        if(++counter > 240) {
            info.frame.set(`${(time/counter).toFixed(3)} ms`);
            time = counter = 0;
        }
        ctx.fillStyle = 'hsla(240,6%,15%,.01)';
        ctx.fillRect(0, 0, 900, 600);
        if(frame_index >= frames.length) frame_index=0;
        const frame = frames[frame_index];
        var i, c;
        for(c=frame.length-1; c>=0; c--) {
            ctx.fillStyle = clrs[c];
            for(i=frame[c].length-1; i>=0; i--) {
                ctx.fillRect(frame[c][i].x-.5, frame[c][i].y-.5, 1, 1);
            }
        }
        frame_index++;
        frame_request = requestAnimationFrame(draw);
        time += performance.now() - start;
    }

    function toggle() {
        if(frame_request) {
            cancelAnimationFrame(frame_request);
            frame_request = null;
            return false;
        } else {
            frame_request = requestAnimationFrame(draw);
            return true;
        }
    }

    /* v2\components\Canvas.svelte generated by Svelte v3.43.0 */

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[22] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[22] = list[i];
    	return child_ctx;
    }

    // (97:8) {#each xlabels as l}
    function create_each_block_1(ctx) {
    	let div;
    	let div_data_label_value;

    	return {
    		c() {
    			div = element("div");
    			attr(div, "data-label", div_data_label_value = /*l*/ ctx[22]);
    			attr(div, "class", "svelte-1gev0ra");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*xlabels*/ 1 && div_data_label_value !== (div_data_label_value = /*l*/ ctx[22])) {
    				attr(div, "data-label", div_data_label_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (102:8) {#each ylabels as l}
    function create_each_block$1(ctx) {
    	let div;
    	let div_data_label_value;

    	return {
    		c() {
    			div = element("div");
    			attr(div, "data-label", div_data_label_value = /*l*/ ctx[22]);
    			attr(div, "class", "svelte-1gev0ra");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*ylabels*/ 2 && div_data_label_value !== (div_data_label_value = /*l*/ ctx[22])) {
    				attr(div, "data-label", div_data_label_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    function create_fragment$3(ctx) {
    	let div5;
    	let canvas;
    	let t0;
    	let div0;
    	let t1;
    	let t2;
    	let div1;
    	let div1_style_value;
    	let t3;
    	let div2;
    	let div2_style_value;
    	let t4;
    	let div3;
    	let t5;
    	let div4;
    	let mounted;
    	let dispose;
    	let each_value_1 = /*xlabels*/ ctx[0];
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let each_value = /*ylabels*/ ctx[1];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	return {
    		c() {
    			div5 = element("div");
    			canvas = element("canvas");
    			t0 = space();
    			div0 = element("div");
    			t1 = text(/*pos*/ ctx[4]);
    			t2 = space();
    			div1 = element("div");
    			t3 = space();
    			div2 = element("div");
    			t4 = space();
    			div3 = element("div");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t5 = space();
    			div4 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(canvas, "width", "900");
    			attr(canvas, "height", "600");
    			attr(canvas, "class", "svelte-1gev0ra");
    			attr(div0, "class", "position svelte-1gev0ra");
    			toggle_class(div0, "show", /*showPos*/ ctx[5]);
    			attr(div1, "class", "x-axis svelte-1gev0ra");

    			attr(div1, "style", div1_style_value = /*xAxisTop*/ ctx[2] > 0 && /*xAxisTop*/ ctx[2] < 600
    			? `top: ${/*xAxisTop*/ ctx[2]}px;`
    			: 'display: none');

    			attr(div2, "class", "y-axis svelte-1gev0ra");

    			attr(div2, "style", div2_style_value = /*yAxisLeft*/ ctx[3] > 0 && /*yAxisLeft*/ ctx[3] < 900
    			? `left: ${/*yAxisLeft*/ ctx[3]}px;`
    			: 'display: none');

    			attr(div3, "class", "x-label svelte-1gev0ra");
    			attr(div4, "class", "y-label svelte-1gev0ra");
    			attr(div5, "class", "container svelte-1gev0ra");
    		},
    		m(target, anchor) {
    			insert(target, div5, anchor);
    			append(div5, canvas);
    			append(div5, t0);
    			append(div5, div0);
    			append(div0, t1);
    			append(div5, t2);
    			append(div5, div1);
    			append(div5, t3);
    			append(div5, div2);
    			append(div5, t4);
    			append(div5, div3);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div3, null);
    			}

    			append(div5, t5);
    			append(div5, div4);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div4, null);
    			}

    			if (!mounted) {
    				dispose = [
    					listen(canvas, "mousedown", /*mousedown*/ ctx[7]),
    					listen(canvas, "mouseup", /*mouseup*/ ctx[8]),
    					listen(canvas, "mousemove", /*mousemove*/ ctx[6]),
    					listen(canvas, "mousewheel", /*mousewheel*/ ctx[9]),
    					action_destroyer(setCanvas.call(null, canvas))
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*pos*/ 16) set_data(t1, /*pos*/ ctx[4]);

    			if (dirty & /*showPos*/ 32) {
    				toggle_class(div0, "show", /*showPos*/ ctx[5]);
    			}

    			if (dirty & /*xAxisTop*/ 4 && div1_style_value !== (div1_style_value = /*xAxisTop*/ ctx[2] > 0 && /*xAxisTop*/ ctx[2] < 600
    			? `top: ${/*xAxisTop*/ ctx[2]}px;`
    			: 'display: none')) {
    				attr(div1, "style", div1_style_value);
    			}

    			if (dirty & /*yAxisLeft*/ 8 && div2_style_value !== (div2_style_value = /*yAxisLeft*/ ctx[3] > 0 && /*yAxisLeft*/ ctx[3] < 900
    			? `left: ${/*yAxisLeft*/ ctx[3]}px;`
    			: 'display: none')) {
    				attr(div2, "style", div2_style_value);
    			}

    			if (dirty & /*xlabels*/ 1) {
    				each_value_1 = /*xlabels*/ ctx[0];
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(div3, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty & /*ylabels*/ 2) {
    				each_value = /*ylabels*/ ctx[1];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div4, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div5);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function calcLabels(min, max, num) {
    	const res = new Array(num);
    	for (var i = 0; i <= num; i++) res[i] = (i / num * (max - min) + min).toFixed(2);
    	return res;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let $complexFunction;
    	component_subscribe($$self, complexFunction, $$value => $$invalidate(17, $complexFunction = $$value));

    	let scaleX = 0,
    		scaleY = 0,
    		xlabels = [],
    		ylabels = [],
    		xAxisTop = 300,
    		yAxisLeft = 450;

    	axis.subscribe(a => {
    		scaleX = (a.xMax - a.xMin) / 900;
    		scaleY = (a.yMax - a.yMin) / 600;
    		$$invalidate(2, xAxisTop = a.yMax / (a.yMax - a.yMin) * 600);
    		$$invalidate(3, yAxisLeft = a.xMin / (a.xMin - a.xMax) * 900);
    		$$invalidate(0, xlabels = calcLabels(a.xMin, a.xMax, 9));
    		$$invalidate(1, ylabels = calcLabels(a.yMin, a.yMax, 6));
    	});

    	let lastX = 0,
    		lastY = 0,
    		currentX = 0,
    		currentY = 0,
    		moving = false,
    		pos = '',
    		showPos = false;

    	const z = new Complex();
    	const hidePos = debounce(() => $$invalidate(5, showPos = false), 3000);

    	const calcPos = throttle(
    		function () {
    			$$invalidate(5, showPos = true);
    			var x = currentX * scaleX + axis.xMin;
    			var y = axis.yMax - currentY * scaleY;
    			z.becomes(x, y);
    			$$invalidate(4, pos = `${z} → ${$complexFunction(z)}`);
    			hidePos();
    		},
    		50
    	);

    	const setDeltas = throttle(
    		function () {
    			var deltaX = (currentX - lastX) * scaleX;
    			var deltaY = (currentY - lastY) * scaleY;
    			lastX = currentX;
    			lastY = currentY;
    			axis.shift(-deltaX, deltaY);
    		},
    		50
    	);

    	/**@param {MouseEvent} e*/
    	function mousemove(e) {
    		currentX = e.offsetX;
    		currentY = e.offsetY;
    		if (moving) setDeltas(); else calcPos();
    	}

    	/**@param {MouseEvent} e*/
    	function mousedown(e) {
    		lastX = e.offsetX;
    		lastY = e.offsetY;
    		e.target.style.cursor = 'grabbing';
    		moving = true;
    	}

    	/**@param {MouseEvent} e*/
    	function mouseup(e) {
    		e.target.style.cursor = 'crosshair';
    		moving = false;
    	}

    	/**@param {WheelEvent} e*/
    	function mousewheel(e) {
    		if (!e.altKey) return;
    		let fact = e.deltaY > 0 ? 1.1 : 10 / 11;
    		axis.scale(fact);
    	}

    	return [
    		xlabels,
    		ylabels,
    		xAxisTop,
    		yAxisLeft,
    		pos,
    		showPos,
    		mousemove,
    		mousedown,
    		mouseup,
    		mousewheel
    	];
    }

    class Canvas extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});
    	}
    }

    /* v2\components\SettingsMenu.svelte generated by Svelte v3.43.0 */

    function create_fragment$2(ctx) {
    	let div11;
    	let div5;
    	let h20;
    	let t1;
    	let div1;
    	let h30;
    	let t3;
    	let div0;
    	let input0;
    	let t4;
    	let input1;
    	let t5;
    	let div3;
    	let h31;
    	let t7;
    	let div2;
    	let input2;
    	let t8;
    	let input3;
    	let t9;
    	let div4;
    	let h32;
    	let t11;
    	let input4;
    	let input4_checked_value;
    	let t12;
    	let button0;
    	let t14;
    	let div10;
    	let h21;
    	let t16;
    	let div6;
    	let h33;
    	let t18;
    	let input5;
    	let t19;
    	let div7;
    	let h34;
    	let t22;
    	let input6;
    	let t23;
    	let div8;
    	let h35;
    	let t25;
    	let input7;
    	let t26;
    	let div9;
    	let h36;
    	let t28;
    	let input8;
    	let t29;
    	let button1;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			div11 = element("div");
    			div5 = element("div");
    			h20 = element("h2");
    			h20.textContent = "ViewBox";
    			t1 = space();
    			div1 = element("div");
    			h30 = element("h3");
    			h30.textContent = "x axis";
    			t3 = space();
    			div0 = element("div");
    			input0 = element("input");
    			t4 = space();
    			input1 = element("input");
    			t5 = space();
    			div3 = element("div");
    			h31 = element("h3");
    			h31.textContent = "y axis";
    			t7 = space();
    			div2 = element("div");
    			input2 = element("input");
    			t8 = space();
    			input3 = element("input");
    			t9 = space();
    			div4 = element("div");
    			h32 = element("h3");
    			h32.textContent = "Lock axis";
    			t11 = space();
    			input4 = element("input");
    			t12 = space();
    			button0 = element("button");
    			button0.textContent = "Reset viewbox";
    			t14 = space();
    			div10 = element("div");
    			h21 = element("h2");
    			h21.textContent = "Generic";
    			t16 = space();
    			div6 = element("div");
    			h33 = element("h3");
    			h33.textContent = "pixel gap";
    			t18 = space();
    			input5 = element("input");
    			t19 = space();
    			div7 = element("div");
    			h34 = element("h3");
    			h34.innerHTML = `life <i class="bracket left svelte-qrqd3e"></i>×30 frames<i class="bracket right svelte-qrqd3e"></i>`;
    			t22 = space();
    			input6 = element("input");
    			t23 = space();
    			div8 = element("div");
    			h35 = element("h3");
    			h35.textContent = "Number of colors";
    			t25 = space();
    			input7 = element("input");
    			t26 = space();
    			div9 = element("div");
    			h36 = element("h3");
    			h36.textContent = "Color multiplier";
    			t28 = space();
    			input8 = element("input");
    			t29 = space();
    			button1 = element("button");
    			button1.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" class="svelte-qrqd3e"><use href="#settings-svg"></use></svg>`;
    			attr(h20, "class", "svelte-qrqd3e");
    			attr(h30, "class", "center svelte-qrqd3e");
    			attr(input0, "type", "number");
    			attr(input0, "class", "no-arrows svelte-qrqd3e");
    			attr(input1, "type", "number");
    			attr(input1, "class", "no-arrows svelte-qrqd3e");
    			attr(div0, "class", "range svelte-qrqd3e");
    			attr(div1, "class", "spaced svelte-qrqd3e");
    			attr(h31, "class", "center svelte-qrqd3e");
    			attr(input2, "type", "number");
    			attr(input2, "class", "no-arrows svelte-qrqd3e");
    			attr(input3, "type", "number");
    			attr(input3, "class", "no-arrows svelte-qrqd3e");
    			attr(div2, "class", "range svelte-qrqd3e");
    			attr(div3, "class", "spaced svelte-qrqd3e");
    			attr(h32, "class", "svelte-qrqd3e");
    			attr(input4, "type", "checkbox");
    			input4.checked = input4_checked_value = /*axis*/ ctx[0].locked;
    			attr(input4, "class", "svelte-qrqd3e");
    			attr(div4, "class", "spaced svelte-qrqd3e");
    			attr(button0, "class", "reset svelte-qrqd3e");
    			attr(h21, "class", "svelte-qrqd3e");
    			attr(h33, "class", "svelte-qrqd3e");
    			attr(input5, "type", "number");
    			attr(input5, "class", "svelte-qrqd3e");
    			attr(div6, "class", "spaced svelte-qrqd3e");
    			attr(h34, "class", "svelte-qrqd3e");
    			attr(input6, "type", "number");
    			attr(input6, "class", "svelte-qrqd3e");
    			attr(div7, "class", "spaced svelte-qrqd3e");
    			attr(h35, "class", "svelte-qrqd3e");
    			attr(input7, "type", "number");
    			attr(input7, "class", "svelte-qrqd3e");
    			attr(div8, "class", "spaced svelte-qrqd3e");
    			attr(h36, "class", "svelte-qrqd3e");
    			attr(input8, "type", "number");
    			attr(input8, "class", "svelte-qrqd3e");
    			attr(div9, "class", "spaced svelte-qrqd3e");
    			attr(div11, "class", "container svelte-qrqd3e");
    			toggle_class(div11, "show", /*show*/ ctx[1]);
    			attr(button1, "class", "toggle-btn svelte-qrqd3e");
    			toggle_class(button1, "rotated", /*show*/ ctx[1]);
    		},
    		m(target, anchor) {
    			insert(target, div11, anchor);
    			append(div11, div5);
    			append(div5, h20);
    			append(div5, t1);
    			append(div5, div1);
    			append(div1, h30);
    			append(div1, t3);
    			append(div1, div0);
    			append(div0, input0);
    			append(div0, t4);
    			append(div0, input1);
    			append(div5, t5);
    			append(div5, div3);
    			append(div3, h31);
    			append(div3, t7);
    			append(div3, div2);
    			append(div2, input2);
    			append(div2, t8);
    			append(div2, input3);
    			append(div5, t9);
    			append(div5, div4);
    			append(div4, h32);
    			append(div4, t11);
    			append(div4, input4);
    			append(div5, t12);
    			append(div5, button0);
    			append(div11, t14);
    			append(div11, div10);
    			append(div10, h21);
    			append(div10, t16);
    			append(div10, div6);
    			append(div6, h33);
    			append(div6, t18);
    			append(div6, input5);
    			append(div10, t19);
    			append(div10, div7);
    			append(div7, h34);
    			append(div7, t22);
    			append(div7, input6);
    			append(div10, t23);
    			append(div10, div8);
    			append(div8, h35);
    			append(div8, t25);
    			append(div8, input7);
    			append(div10, t26);
    			append(div10, div9);
    			append(div9, h36);
    			append(div9, t28);
    			append(div9, input8);
    			insert(target, t29, anchor);
    			insert(target, button1, anchor);

    			if (!mounted) {
    				dispose = [
    					action_destroyer(/*prep*/ ctx[2].call(null, input0, "xMin")),
    					action_destroyer(/*prep*/ ctx[2].call(null, input1, "xMax")),
    					action_destroyer(/*prep*/ ctx[2].call(null, input2, "yMin")),
    					action_destroyer(/*prep*/ ctx[2].call(null, input3, "yMax")),
    					listen(input4, "change", /*change_handler*/ ctx[3]),
    					listen(button0, "click", function () {
    						if (is_function(/*axis*/ ctx[0].reset)) /*axis*/ ctx[0].reset.apply(this, arguments);
    					}),
    					action_destroyer(bounds.call(null, input5, { min: 2, max: 20, store: px_gap })),
    					action_destroyer(bounds.call(null, input6, { min: 1, max: 40, store: life })),
    					action_destroyer(bounds.call(null, input7, { min: 2, max: 20, store: color.number })),
    					action_destroyer(bounds.call(null, input8, {
    						min: -10,
    						max: 10,
    						store: color.factor,
    						mustBeInt: false
    					})),
    					listen(button1, "click", /*click_handler*/ ctx[4])
    				];

    				mounted = true;
    			}
    		},
    		p(new_ctx, [dirty]) {
    			ctx = new_ctx;

    			if (dirty & /*axis*/ 1 && input4_checked_value !== (input4_checked_value = /*axis*/ ctx[0].locked)) {
    				input4.checked = input4_checked_value;
    			}

    			if (dirty & /*show*/ 2) {
    				toggle_class(div11, "show", /*show*/ ctx[1]);
    			}

    			if (dirty & /*show*/ 2) {
    				toggle_class(button1, "rotated", /*show*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div11);
    			if (detaching) detach(t29);
    			if (detaching) detach(button1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function bounds(node, options) {
    	node.value = options.store.initial;

    	function change() {
    		var v = Number(node.value);
    		if (Number.isNaN(v)) node.value = v = options.store.initial; else if (v < options.min) node.value = v = options.min; else if (v > options.max) node.value = v = options.max; else if (!options.allowFloat && !Number.isInteger(v)) node.value = v = Math.round(v);
    		options.store.set(v);
    	}

    	node.addEventListener("change", change);

    	return {
    		destroy() {
    			node.removeEventListener("change", change);
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let show = false;

    	const axisInputs = {
    		xMin: null,
    		xMax: null,
    		yMin: null,
    		yMax: null
    	};

    	function prep(node, key) {
    		node.value = axis[key];
    		axisInputs[key] = node;

    		function change(e) {
    			$$invalidate(0, axis[key] = +e.target.value, axis);
    		}

    		node.addEventListener("change", change);

    		return {
    			destroy() {
    				node.removeEventListener("change", change);
    			}
    		};
    	}

    	onMount(() => {
    		axis.subscribe(v => {
    			for (var key in v) axisInputs[key].value = v[key];
    		});
    	});

    	const change_handler = e => $$invalidate(0, axis.locked = e.target.checked, axis);
    	const click_handler = () => $$invalidate(1, show = !show);
    	return [axis, show, prep, change_handler, click_handler];
    }

    class SettingsMenu extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});
    	}
    }

    /* v2\components\Colors.svelte generated by Svelte v3.43.0 */

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[2] = list[i];
    	return child_ctx;
    }

    // (20:8) {#each nums as t}
    function create_each_block(ctx) {
    	let div;
    	let div_data_num_value;

    	return {
    		c() {
    			div = element("div");
    			attr(div, "data-num", div_data_num_value = /*t*/ ctx[2].toPrecision(3));
    			attr(div, "class", "svelte-1ke7fka");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*nums*/ 1 && div_data_num_value !== (div_data_num_value = /*t*/ ctx[2].toPrecision(3))) {
    				attr(div, "data-num", div_data_num_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    function create_fragment$1(ctx) {
    	let div2;
    	let div0;
    	let t;
    	let div1;
    	let each_value = /*nums*/ ctx[0];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	return {
    		c() {
    			div2 = element("div");
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			div1 = element("div");
    			attr(div0, "class", "labels svelte-1ke7fka");
    			attr(div1, "class", "bar svelte-1ke7fka");
    			set_style(div1, "background", "linear-gradient(to bottom, " + /*gradient*/ ctx[1] + ")");
    			attr(div2, "class", "container svelte-1ke7fka");
    		},
    		m(target, anchor) {
    			insert(target, div2, anchor);
    			append(div2, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			append(div2, t);
    			append(div2, div1);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*nums*/ 1) {
    				each_value = /*nums*/ ctx[0];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*gradient*/ 2) {
    				set_style(div1, "background", "linear-gradient(to bottom, " + /*gradient*/ ctx[1] + ")");
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div2);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let nums = [], gradient = "red";
    	color.thresholds.subscribe(v => $$invalidate(0, nums = v));

    	color.strings.subscribe(cs => {
    		let arr = [], perc;
    		const len = cs.length;

    		for (var t = 0; t < len - 1; t++) {
    			perc = (t + 1) * 100 / len;
    			arr.push(`${cs[t]} ${perc}%, ${cs[t + 1]} ${perc}%`);
    		}

    		$$invalidate(1, gradient = arr.join(', '));
    	});

    	return [nums, gradient];
    }

    class Colors extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});
    	}
    }

    /* v2\components\App.svelte generated by Svelte v3.43.0 */

    function create_fragment(ctx) {
    	let button;
    	let t1;
    	let varsmenu;
    	let t2;
    	let canvas;
    	let t3;
    	let settingsmenu;
    	let t4;
    	let colors;
    	let t5;
    	let div;
    	let t6;
    	let br0;
    	let t7;
    	let t8;
    	let br1;
    	let t9;
    	let t10;
    	let br2;
    	let current;
    	let mounted;
    	let dispose;
    	varsmenu = new VarsMenu({});
    	canvas = new Canvas({});
    	settingsmenu = new SettingsMenu({});
    	colors = new Colors({});

    	return {
    		c() {
    			button = element("button");
    			button.textContent = "Play";
    			t1 = space();
    			create_component(varsmenu.$$.fragment);
    			t2 = space();
    			create_component(canvas.$$.fragment);
    			t3 = space();
    			create_component(settingsmenu.$$.fragment);
    			t4 = space();
    			create_component(colors.$$.fragment);
    			t5 = space();
    			div = element("div");
    			t6 = text(/*frame*/ ctx[0]);
    			br0 = element("br");
    			t7 = space();
    			t8 = text(/*particles*/ ctx[1]);
    			br1 = element("br");
    			t9 = space();
    			t10 = text(/*computation*/ ctx[2]);
    			br2 = element("br");
    			attr(button, "class", "svelte-3v93ht");
    			attr(div, "class", "info svelte-3v93ht");
    		},
    		m(target, anchor) {
    			insert(target, button, anchor);
    			insert(target, t1, anchor);
    			mount_component(varsmenu, target, anchor);
    			insert(target, t2, anchor);
    			mount_component(canvas, target, anchor);
    			insert(target, t3, anchor);
    			mount_component(settingsmenu, target, anchor);
    			insert(target, t4, anchor);
    			mount_component(colors, target, anchor);
    			insert(target, t5, anchor);
    			insert(target, div, anchor);
    			append(div, t6);
    			append(div, br0);
    			append(div, t7);
    			append(div, t8);
    			append(div, br1);
    			append(div, t9);
    			append(div, t10);
    			append(div, br2);
    			current = true;

    			if (!mounted) {
    				dispose = listen(button, "click", /*click_handler*/ ctx[3]);
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (!current || dirty & /*frame*/ 1) set_data(t6, /*frame*/ ctx[0]);
    			if (!current || dirty & /*particles*/ 2) set_data(t8, /*particles*/ ctx[1]);
    			if (!current || dirty & /*computation*/ 4) set_data(t10, /*computation*/ ctx[2]);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(varsmenu.$$.fragment, local);
    			transition_in(canvas.$$.fragment, local);
    			transition_in(settingsmenu.$$.fragment, local);
    			transition_in(colors.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(varsmenu.$$.fragment, local);
    			transition_out(canvas.$$.fragment, local);
    			transition_out(settingsmenu.$$.fragment, local);
    			transition_out(colors.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(button);
    			if (detaching) detach(t1);
    			destroy_component(varsmenu, detaching);
    			if (detaching) detach(t2);
    			destroy_component(canvas, detaching);
    			if (detaching) detach(t3);
    			destroy_component(settingsmenu, detaching);
    			if (detaching) detach(t4);
    			destroy_component(colors, detaching);
    			if (detaching) detach(t5);
    			if (detaching) detach(div);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	var frame, particles, computation;
    	info.frame.subscribe(v => $$invalidate(0, frame = v));
    	info.particles.subscribe(v => $$invalidate(1, particles = v));
    	info.computation.subscribe(v => $$invalidate(2, computation = v));
    	const click_handler = e => e.target.textContent = toggle() ? 'Pause' : 'Play';
    	return [frame, particles, computation, click_handler];
    }

    class App extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance, create_fragment, safe_not_equal, {});
    	}
    }

    const app = new App({target: document.body});

    return app;

})();
