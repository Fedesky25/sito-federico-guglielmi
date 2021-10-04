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
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
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

    class Complex$1 {
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
            this.real = Math.sin(this.imag)*Math.cosh(this.real);
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
            this.imag /= m2;
            return this;
        }
        toString() {
            if(this.real == 0) return this.imag ? nf$1(this.imag)+'i' : '0';
            if(this.imag == 0) return nf$1(this.real);
            let r = ['(', nf$1(this.real)];
            if(this.imag > 0) {
                if(this.imag === 1) r.push('+i)');
                else r.push('+', nf$1(this.imag), 'i)');
            } else {
                if(this.imag === -1) r.push('-i)');
                else r.push(nf$1(this.imag), 'i)');
            }
            return r.join('');
        }
        static ReIm(real, imag) { return new Complex$1(real, imag) }
        static ModArg(mod, arg) { return new Complex$1(mod * Math.cos(arg), mod * Math.sin(arg)) }
    }
    window.Complex = Complex$1;
    function nf$1(n) { return Number.isInteger(n) ? n.toString() : n.toPrecision(4) }

    const canvas_width = 900;
    const canvas_height = 600;

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
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
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
            this.real = Math.sin(this.imag)*Math.cosh(this.real);
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
            this.imag /= m2;
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
    function nf(n) { return Number.isInteger(n) ? n.toString() : n.toPrecision(4) }

    var iv = Object.freeze({
        gap: .12,
        px_gap: 12,
        clr_num: 7,
        clr_factor: 4,
        x_min: -3,
        x_max: 3,
        y_min: -2,
        y_max: 2,
        dt: 250,
        life: 120,
    });

    const deg = writable(false);

    const av_frame_time = writable('0.000');

    /**
     * @param {Number} v 
     * @returns {import('svelte/store').Writable<Number>}
     */
    function writable_init(v) {
        const res = writable(v);
        Object.defineProperty(res, "initial", {value: v});
        return res;
    }

    const dt_e6 = writable_init(250);

    const particle_life = writable_init(4);

    const px_gap = writable_init(12);

    const clr_num = writable_init(7);
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
            // hue = i*240/(n-1);
            // hue = i*i * 240 / ((n-1)*(n-1));
            // hue = Math.pow(i/(n-1), 1.4) * 240;
            // hue = i*240/(n-1) * Math.sin(i*Math.PI / (2*n-2));
            hue = 240 * Math.pow(i/(n-1), .6) * Math.sin(i*Math.PI / (2*n-2));
            res[i] = `hsl(${hue},55%,55%)`;
        }
        return res;
    });


    function axis(i_min, i_max) {
        const value = {min: i_min, max: i_max};
        const { subscribe, set: _set } = writable(value);
        return {
            subscribe,
            reset() {
                value.min = i_min;
                value.max = i_max;
                _set(value);
            },
            set(min, max) {
                value.min = min;
                value.max = max;
                _set(value);
            },
            shift(delta) {
                value.min += delta;
                value.max += delta;
                _set(value);
            },
            multiply(factor) {
                value.min *= factor;
                value.max *= factor;
                _set(value);
            },
            get min() {return value.min},
            set min(v) {
                if(!Number.isFinite(v)) return;
                value.min = v;
                _set(value);
            },
            get max() {return value.max},
            set max(v) {
                if(!Number.isFinite(v)) return;
                value.max = v;
                _set(value);
            },
            initial: Object.freeze({min: i_min, max: i_max}),
        }
    }

    const xAxis = axis(iv.x_min, iv.x_max);
    const yAxis = axis(iv.y_min, iv.y_max);

    const scaleX = derived(xAxis, ({min, max}) => canvas_width / (max - min));
    const scaleY = derived(yAxis, ({min, max}) => canvas_height / (max - min));

    const initial_complexs = derived([px_gap, xAxis, yAxis], ([gap, x, y]) => {
        const numX = Math.floor(canvas_width/gap);
        const numY = Math.floor(canvas_height/gap);
        const res = new Array((numX+1)*(numY+1));
        console.log(`Particle number: ${numX+1}\xd7${numY+1} = ${(numX+1)*(numY+1)}`);
        let i, j;
        for(i=0; i<=numY; i++) 
            for(j=0; j<=numX; j++)
                res[i*(numX+1)+j] = new Complex( j/numX*(x.max-x.min) + x.min, i/numY*(y.max-y.min) + y.min );
        return res;
    });

    const z1 = Complex.ReIm(-1, 1);
    const z2 = Complex.ModArg(2, Math.PI/4);
    const z3 = new Complex();

    const otherVars = { r: .5, k: 0 };

    const complex_function = writable(c => Complex.ReIm(c.real, c.imag));

    function debouce(fn, delay) {
        let timer;
        function res() {
            clearTimeout(timer);
            timer = setTimeout(fn, delay);
        }
        res.cancel = () => clearTimeout(timer);
        return res;
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

    /**
     * @param {HTMLInputElement} node 
     * @param {Object} options
     * @param {Number} [options.min=1] 
     * @param {Number} options.max 
     * @param {*} options.store 
     * @param {Boolean} [options.mustBeInt=true]
     * @returns 
     */
    function forceBounds(node, options) {
        let v;
        const min = Number.isFinite(options.min) ? options.min : 1;
        if(!Number.isFinite(options.max)) throw Error("no valid max option");
        const max = options.max;
        if(!options.store) throw Error("No store");
        if(typeof options.store.initial !== "number") throw Error("No initial value on store");
        const store = options.store;
        const mustBeInt = options.mustBeInt == null ? false : Boolean(options.mustBeInt);
        node.min = min;
        node.max = max;
        node.value = store.initial;
        function change() {
            v = Number(node.value);
            if(Number.isNaN(v)) node.value = v = store.initial;
            else if(v < min) node.value = v = min;
            else if(v > max) node.value = v = max;
            else if(mustBeInt && !Number.isInteger(v)) node.value = v = Math.round(v);
            store.set(v);
        }
        node.addEventListener("change", change);
        return { destroy() { node.removeEventListener("change", change); } }
    }

    /**@type {(c: Complex) => Complex} */ let func;
    complex_function.subscribe(fn => func = fn);


    let frame_request = null, suspended = false, /**@type {CanvasRenderingContext2D} */ ctx;
    let i, t, time=0, counter = 0;


    let xMin, $scaleX, yMax, $scaleY;
    xAxis.subscribe(v => xMin = v.min);
    yAxis.subscribe(v => yMax = v.max);
    scaleX.subscribe(v => $scaleX = v);
    scaleY.subscribe(v => $scaleY = v);

    let $clr_thresholds = [], $clr_strings = [], $clr_num=10;
    clr_thresholds.subscribe(v => $clr_thresholds = v.map(t => t*t));
    clr_strings.subscribe(v => $clr_strings = v);
    clr_num.subscribe(v => $clr_num = v);

    let
        /**@type {Complex[]}*/initials,
        /**@type {Complex[]}*/currents, 
        /**@type {Number[]}*/speeds, 
        /**@type {Number[]}*/lives, 
        /**@type {Number}*/len = 0,
        /**@type {Number}*/maxLife=120;
    particle_life.subscribe(v => {
        v *= 30;
        for(i=0; i<len; i++) lives[i] = Math.round(lives[i]/maxLife * v);
        maxLife = v;
    });
    initial_complexs.subscribe(v => {
        initials = v;
        currents = v.map(c => new Complex$1().eq(c));
        speeds = new Array(v.length);
        len = v.length;
        lives = new Array(len);
        for(i=0; i<len; i++) lives[i] = Math.floor(Math.random()*maxLife);
        if(ctx) {
            ctx.fillStyle = 'hsl(240,6%,15%)';
            ctx.fillRect(0, 0, canvas_width, canvas_height);
        }
    });
    let dt; dt_e6.subscribe(v => dt = v * 1e-6);


    /**@param {HTMLCanvasElement} node */
    function setCanvas(node) {
        ctx = node.getContext('2d');
        ctx.fillStyle = 'hsl(240, 6%, 15%)';
        ctx.fillRect(0, 0, canvas_width, canvas_height);
    }

    /**@param {Complex} c */
    function draw(c) {
        ctx.fillRect(
            (c.real - xMin)*$scaleX - .5,
            (yMax - c.imag)*$scaleY - .5,
            1, 1,
        );
    }

    function frame() {
        var start = performance.now();
        if(++counter > 300) {
            av_frame_time.set((time/counter).toFixed(3));
            time = counter = 0;
        }
        ctx.fillStyle = 'hsla(240,6%,15%,.01)';
        ctx.fillRect(0, 0, canvas_width, canvas_height);
        var temp;
        for(i=0; i<len; i++) {
            lives[i]++;
            if(lives[i] > maxLife) {
                currents[i].eq(initials[i]);
                lives[i] = 0;
            }
            temp = func(currents[i]);
            speeds[i] = temp.real*temp.real + temp.imag*temp.imag;
            currents[i].add(temp.mul_r(dt));
        }
        var low, high;
        for(t=0; t<$clr_num; t++) {
            ctx.fillStyle = $clr_strings[t];
            low = $clr_thresholds[t+1];
            high = $clr_thresholds[t];
            for(i=0; i<len; i++) {
                if(speeds[i] < high && speeds[i] >= low)
                    draw(currents[i]);
            }
        }
        frame_request = requestAnimationFrame(frame);
        time += performance.now() - start;
    }

    function toggle() {
        if(suspended) return false;
        if(frame_request) {
            cancelAnimationFrame(frame_request);
            frame_request = null;
            return false;
        } else {
            if(!ctx) return false;
            frame_request = requestAnimationFrame(frame);
            return true;
        }
    } 


    const unsusped = debouce(function() {
        if(suspended && frame_request) frame_request = requestAnimationFrame(frame);
        suspended = false;
    }, 100);

    function suspend(flag) {
        if(flag) {
            unsusped.cancel();
            if(frame_request) cancelAnimationFrame(frame_request);
            suspended = true;
        } else if(suspended) unsusped();
    }

    /* svelte\Canvas.svelte generated by Svelte v3.43.0 */

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[17] = list[i];
    	return child_ctx;
    }

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[17] = list[i];
    	return child_ctx;
    }

    // (95:4) {#each xlabels as l}
    function create_each_block_1$1(ctx) {
    	let div;
    	let div_data_label_value;

    	return {
    		c() {
    			div = element("div");
    			attr(div, "data-label", div_data_label_value = /*l*/ ctx[17]);
    			attr(div, "class", "svelte-1wgwtn8");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*xlabels*/ 1 && div_data_label_value !== (div_data_label_value = /*l*/ ctx[17])) {
    				attr(div, "data-label", div_data_label_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (100:4) {#each ylabels as l}
    function create_each_block$2(ctx) {
    	let div;
    	let div_data_label_value;

    	return {
    		c() {
    			div = element("div");
    			attr(div, "data-label", div_data_label_value = /*l*/ ctx[17]);
    			attr(div, "class", "svelte-1wgwtn8");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*ylabels*/ 2 && div_data_label_value !== (div_data_label_value = /*l*/ ctx[17])) {
    				attr(div, "data-label", div_data_label_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    function create_fragment$6(ctx) {
    	let div2;
    	let canvas;
    	let t0;
    	let div0;
    	let div0_style_value;
    	let t1;
    	let div1;
    	let div1_style_value;
    	let t2;
    	let div3;
    	let t3;
    	let div4;
    	let mounted;
    	let dispose;
    	let each_value_1 = /*xlabels*/ ctx[0];
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
    	}

    	let each_value = /*ylabels*/ ctx[1];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	return {
    		c() {
    			div2 = element("div");
    			canvas = element("canvas");
    			t0 = space();
    			div0 = element("div");
    			t1 = space();
    			div1 = element("div");
    			t2 = space();
    			div3 = element("div");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t3 = space();
    			div4 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(canvas, "width", canvas_width);
    			attr(canvas, "height", canvas_height);
    			attr(canvas, "class", "svelte-1wgwtn8");
    			attr(div0, "class", "x-axis svelte-1wgwtn8");

    			attr(div0, "style", div0_style_value = /*xAxisTop*/ ctx[2] > 0 && /*xAxisTop*/ ctx[2] < canvas_height
    			? `top: ${/*xAxisTop*/ ctx[2]}px;`
    			: 'display: none');

    			attr(div1, "class", "y-axis svelte-1wgwtn8");

    			attr(div1, "style", div1_style_value = /*yAxisLeft*/ ctx[3] > 0 && /*yAxisLeft*/ ctx[3] < canvas_width
    			? `left: ${/*yAxisLeft*/ ctx[3]}px;`
    			: 'display: none');

    			attr(div2, "class", "canvas-container svelte-1wgwtn8");
    			attr(div3, "class", "x-labels svelte-1wgwtn8");
    			attr(div4, "class", "y-labels svelte-1wgwtn8");
    		},
    		m(target, anchor) {
    			insert(target, div2, anchor);
    			append(div2, canvas);
    			append(div2, t0);
    			append(div2, div0);
    			append(div2, t1);
    			append(div2, div1);
    			insert(target, t2, anchor);
    			insert(target, div3, anchor);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div3, null);
    			}

    			insert(target, t3, anchor);
    			insert(target, div4, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div4, null);
    			}

    			if (!mounted) {
    				dispose = [
    					action_destroyer(setCanvas.call(null, canvas)),
    					listen(div2, "mousedown", /*mousedown*/ ctx[4]),
    					listen(div2, "mouseup", /*mouseup*/ ctx[5]),
    					listen(div2, "mousewheel", /*mousewheel*/ ctx[6])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*xAxisTop*/ 4 && div0_style_value !== (div0_style_value = /*xAxisTop*/ ctx[2] > 0 && /*xAxisTop*/ ctx[2] < canvas_height
    			? `top: ${/*xAxisTop*/ ctx[2]}px;`
    			: 'display: none')) {
    				attr(div0, "style", div0_style_value);
    			}

    			if (dirty & /*yAxisLeft*/ 8 && div1_style_value !== (div1_style_value = /*yAxisLeft*/ ctx[3] > 0 && /*yAxisLeft*/ ctx[3] < canvas_width
    			? `left: ${/*yAxisLeft*/ ctx[3]}px;`
    			: 'display: none')) {
    				attr(div1, "style", div1_style_value);
    			}

    			if (dirty & /*xlabels*/ 1) {
    				each_value_1 = /*xlabels*/ ctx[0];
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1$1(child_ctx);
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
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
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
    			if (detaching) detach(div2);
    			if (detaching) detach(t2);
    			if (detaching) detach(div3);
    			destroy_each(each_blocks_1, detaching);
    			if (detaching) detach(t3);
    			if (detaching) detach(div4);
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

    function instance$6($$self, $$props, $$invalidate) {
    	let $scaleY;
    	let $scaleX;
    	let $xAxis;
    	let $yAxis;
    	component_subscribe($$self, scaleY, $$value => $$invalidate(13, $scaleY = $$value));
    	component_subscribe($$self, scaleX, $$value => $$invalidate(14, $scaleX = $$value));
    	component_subscribe($$self, xAxis, $$value => $$invalidate(7, $xAxis = $$value));
    	component_subscribe($$self, yAxis, $$value => $$invalidate(8, $yAxis = $$value));

    	let xlabels = [],
    		ylabels = [],
    		xAxisTop = canvas_height / 2,
    		yAxisLeft = canvas_width / 2;

    	let lastX = 0, lastY = 0, currentX = 0, currentY = 0;

    	const setDeltas = throttle(
    		function () {
    			suspend(true);
    			let deltaX = (currentX - lastX) / $scaleX;
    			let deltaY = (currentY - lastY) / $scaleY;
    			lastX = currentX;
    			lastY = currentY;

    			// console.log(`dx: ${deltaX.toFixed(3)}\ndy: ${deltaY.toFixed(3)}`);
    			xAxis.shift(-deltaX);

    			yAxis.shift(deltaY);
    			suspend(false);
    		},
    		50
    	);

    	/**@param {MouseEvent} e*/
    	function mousemove(e) {
    		currentX = e.clientX;
    		currentY = e.clientY;
    		setDeltas();
    	}

    	/**@param {MouseEvent} e*/
    	function mousedown(e) {
    		lastX = e.clientX;
    		lastY = e.clientY;
    		e.target.style.cursor = 'grabbing';
    		e.target.addEventListener('mousemove', mousemove);
    	}

    	/**@param {MouseEvent} e*/
    	function mouseup(e) {
    		e.target.style.cursor = 'grab';
    		e.target.removeEventListener('mousemove', mousemove);
    	}

    	// let fact = 1;
    	// const setMultiplier = throttle(function() {
    	//     suspend(true);
    	//     xAxis.multiply(fact);
    	//     yAxis.multiply(fact);
    	//     fact = 1;
    	//     suspend(false);
    	// })
    	/**@param {WheelEvent} e*/
    	function mousewheel(e) {
    		if (!e.altKey) return;
    		suspend(true);
    		let fact = e.deltaY > 0 ? 1.1 : 10 / 11;
    		xAxis.multiply(fact);
    		yAxis.multiply(fact);
    		suspend(false);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$xAxis*/ 128) {
    			$$invalidate(0, xlabels = calcLabels($xAxis.min, $xAxis.max, 9));
    		}

    		if ($$self.$$.dirty & /*$yAxis*/ 256) {
    			$$invalidate(1, ylabels = calcLabels($yAxis.min, $yAxis.max, 6));
    		}

    		if ($$self.$$.dirty & /*$yAxis*/ 256) {
    			$$invalidate(2, xAxisTop = $yAxis.max / ($yAxis.max - $yAxis.min) * canvas_height);
    		}

    		if ($$self.$$.dirty & /*$xAxis*/ 128) {
    			$$invalidate(3, yAxisLeft = -$xAxis.min / ($xAxis.max - $xAxis.min) * canvas_width);
    		}
    	};

    	return [
    		xlabels,
    		ylabels,
    		xAxisTop,
    		yAxisLeft,
    		mousedown,
    		mouseup,
    		mousewheel,
    		$xAxis,
    		$yAxis
    	];
    }

    class Canvas extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});
    	}
    }

    /* svelte\Colors.svelte generated by Svelte v3.43.0 */

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[2] = list[i];
    	return child_ctx;
    }

    // (24:8) {#each $clr_thresholds as t}
    function create_each_block$1(ctx) {
    	let div;
    	let div_data_num_value;

    	return {
    		c() {
    			div = element("div");
    			attr(div, "data-num", div_data_num_value = /*t*/ ctx[2].toPrecision(3));
    			attr(div, "class", "svelte-n0e2xn");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*$clr_thresholds*/ 2 && div_data_num_value !== (div_data_num_value = /*t*/ ctx[2].toPrecision(3))) {
    				attr(div, "data-num", div_data_num_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    function create_fragment$5(ctx) {
    	let div2;
    	let div0;
    	let t;
    	let div1;
    	let each_value = /*$clr_thresholds*/ ctx[1];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
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
    			attr(div0, "class", "labels svelte-n0e2xn");
    			attr(div1, "class", "bar svelte-n0e2xn");
    			set_style(div1, "background", "linear-gradient(to bottom, " + /*gradient*/ ctx[0] + ")");
    			attr(div2, "class", "container svelte-n0e2xn");
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
    			if (dirty & /*$clr_thresholds*/ 2) {
    				each_value = /*$clr_thresholds*/ ctx[1];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*gradient*/ 1) {
    				set_style(div1, "background", "linear-gradient(to bottom, " + /*gradient*/ ctx[0] + ")");
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

    function instance$5($$self, $$props, $$invalidate) {
    	let $clr_thresholds;
    	component_subscribe($$self, clr_thresholds, $$value => $$invalidate(1, $clr_thresholds = $$value));
    	let gradient = '';

    	clr_strings.subscribe(cs => {
    		let arr = [], perc;
    		const len = cs.length;

    		for (var t = 0; t < len - 1; t++) {
    			perc = (t + 1) * 100 / len;
    			arr.push(`${cs[t]} ${perc}%, ${cs[t + 1]} ${perc}%`);
    		}

    		$$invalidate(0, gradient = arr.join(', '));
    	});

    	return [gradient, $clr_thresholds];
    }

    class Colors extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});
    	}
    }

    /* svelte\SettingMenu.svelte generated by Svelte v3.43.0 */

    function create_fragment$4(ctx) {
    	let div12;
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
    	let t12;
    	let button0;
    	let t14;
    	let div11;
    	let h21;
    	let t16;
    	let div6;
    	let h33;
    	let t18;
    	let input5;
    	let t19;
    	let div7;
    	let h34;
    	let t23;
    	let input6;
    	let t24;
    	let div8;
    	let h35;
    	let t27;
    	let input7;
    	let t28;
    	let div9;
    	let h36;
    	let t30;
    	let input8;
    	let t31;
    	let div10;
    	let h37;
    	let t33;
    	let input9;
    	let t34;
    	let button1;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			div12 = element("div");
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

    			div4.innerHTML = `<h3 class="svelte-p3ubdq">Lock y axis</h3> 
            <input type="checkbox" class="svelte-p3ubdq"/>`;

    			t12 = space();
    			button0 = element("button");
    			button0.textContent = "Reset viewbox";
    			t14 = space();
    			div11 = element("div");
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
    			h34.innerHTML = `dt <i class="bracket left svelte-p3ubdq"></i>×10<sup>-6</sup><i class="bracket right svelte-p3ubdq"></i>`;
    			t23 = space();
    			input6 = element("input");
    			t24 = space();
    			div8 = element("div");
    			h35 = element("h3");
    			h35.innerHTML = `life <i class="bracket left svelte-p3ubdq"></i>×30 frames<i class="bracket right svelte-p3ubdq"></i>`;
    			t27 = space();
    			input7 = element("input");
    			t28 = space();
    			div9 = element("div");
    			h36 = element("h3");
    			h36.textContent = "Number of colors";
    			t30 = space();
    			input8 = element("input");
    			t31 = space();
    			div10 = element("div");
    			h37 = element("h3");
    			h37.textContent = "Color multiplier";
    			t33 = space();
    			input9 = element("input");
    			t34 = space();
    			button1 = element("button");
    			button1.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" class="svelte-p3ubdq"><use href="#settings-svg"></use></svg>`;
    			attr(h20, "class", "svelte-p3ubdq");
    			attr(h30, "class", "center svelte-p3ubdq");
    			attr(input0, "type", "number");
    			attr(input0, "class", "no-arrows svelte-p3ubdq");
    			input0.value = xAxis.initial.min;
    			attr(input1, "type", "number");
    			attr(input1, "class", "no-arrows svelte-p3ubdq");
    			input1.value = xAxis.initial.max;
    			attr(div1, "class", "spaced svelte-p3ubdq");
    			attr(h31, "class", "center svelte-p3ubdq");
    			attr(input2, "type", "number");
    			attr(input2, "class", "no-arrows svelte-p3ubdq");
    			input2.value = yAxis.initial.min;
    			attr(input3, "type", "number");
    			attr(input3, "class", "no-arrows svelte-p3ubdq");
    			input3.value = yAxis.initial.max;
    			attr(div3, "class", "spaced svelte-p3ubdq");
    			attr(div4, "class", "spaced svelte-p3ubdq");
    			attr(button0, "class", "reset svelte-p3ubdq");
    			attr(h21, "class", "svelte-p3ubdq");
    			attr(h33, "class", "svelte-p3ubdq");
    			attr(input5, "type", "number");
    			attr(input5, "class", "svelte-p3ubdq");
    			attr(div6, "class", "spaced svelte-p3ubdq");
    			attr(h34, "class", "svelte-p3ubdq");
    			attr(input6, "type", "number");
    			attr(input6, "class", "svelte-p3ubdq");
    			attr(div7, "class", "spaced svelte-p3ubdq");
    			attr(h35, "class", "svelte-p3ubdq");
    			attr(input7, "type", "number");
    			attr(input7, "class", "svelte-p3ubdq");
    			attr(div8, "class", "spaced svelte-p3ubdq");
    			attr(h36, "class", "svelte-p3ubdq");
    			attr(input8, "type", "number");
    			attr(input8, "class", "svelte-p3ubdq");
    			attr(div9, "class", "spaced svelte-p3ubdq");
    			attr(h37, "class", "svelte-p3ubdq");
    			attr(input9, "type", "number");
    			attr(input9, "class", "svelte-p3ubdq");
    			attr(div10, "class", "spaced svelte-p3ubdq");
    			attr(div12, "class", "container svelte-p3ubdq");
    			toggle_class(div12, "show", /*show*/ ctx[0]);
    			attr(button1, "class", "toggle-btn svelte-p3ubdq");
    			toggle_class(button1, "rotated", /*show*/ ctx[0]);
    		},
    		m(target, anchor) {
    			insert(target, div12, anchor);
    			append(div12, div5);
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
    			append(div5, t12);
    			append(div5, button0);
    			append(div12, t14);
    			append(div12, div11);
    			append(div11, h21);
    			append(div11, t16);
    			append(div11, div6);
    			append(div6, h33);
    			append(div6, t18);
    			append(div6, input5);
    			append(div11, t19);
    			append(div11, div7);
    			append(div7, h34);
    			append(div7, t23);
    			append(div7, input6);
    			append(div11, t24);
    			append(div11, div8);
    			append(div8, h35);
    			append(div8, t27);
    			append(div8, input7);
    			append(div11, t28);
    			append(div11, div9);
    			append(div9, h36);
    			append(div9, t30);
    			append(div9, input8);
    			append(div11, t31);
    			append(div11, div10);
    			append(div10, h37);
    			append(div10, t33);
    			append(div10, input9);
    			insert(target, t34, anchor);
    			insert(target, button1, anchor);

    			if (!mounted) {
    				dispose = [
    					listen(button0, "click", /*reset*/ ctx[1]),
    					action_destroyer(forceBounds.call(null, input5, { min: 2, max: 20, store: px_gap })),
    					action_destroyer(forceBounds.call(null, input6, { min: 1, max: 2000, store: dt_e6 })),
    					action_destroyer(forceBounds.call(null, input7, { min: 1, max: 40, store: particle_life })),
    					action_destroyer(forceBounds.call(null, input8, { min: 2, max: 20, store: clr_num })),
    					action_destroyer(forceBounds.call(null, input9, {
    						min: -10,
    						max: 10,
    						store: clr_factor,
    						mustBeInt: false
    					})),
    					listen(button1, "click", /*click_handler*/ ctx[2])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*show*/ 1) {
    				toggle_class(div12, "show", /*show*/ ctx[0]);
    			}

    			if (dirty & /*show*/ 1) {
    				toggle_class(button1, "rotated", /*show*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div12);
    			if (detaching) detach(t34);
    			if (detaching) detach(button1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let show = false;

    	function reset() {
    		suspend(true);
    		xAxis.reset();
    		yAxis.reset();
    		suspend(false);
    	}

    	const click_handler = () => $$invalidate(0, show = !show);
    	return [show, reset, click_handler];
    }

    class SettingMenu extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});
    	}
    }

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
                fn: c => tm[0].eq(c).mul_r(10).add(10),
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
                label: 'e<sup>x<sup>2</sup>+x</sup>',
                fn: c => tm[0].eq(c).mul(c).add(c).exponentiate(),
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
                fn: c => tm[0].eq(c).add(z1).intoSine(),
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
        ],
    };

    /* svelte\FunctionSelect.svelte generated by Svelte v3.43.0 */

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[9] = list[i];
    	return child_ctx;
    }

    // (27:12) {#each fns[key] as opt}
    function create_each_block_1(ctx) {
    	let div;
    	let raw_value = /*opt*/ ctx[9].label + "";
    	let mounted;
    	let dispose;

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[4](/*opt*/ ctx[9]);
    	}

    	return {
    		c() {
    			div = element("div");
    			attr(div, "class", "option svelte-ikpdpr");
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

    // (25:8) {#each Object.keys(fns) as key}
    function create_each_block(ctx) {
    	let h3;
    	let t0_value = /*key*/ ctx[6] + "";
    	let t0;
    	let t1;
    	let each_1_anchor;
    	let each_value_1 = fns[/*key*/ ctx[6]];
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
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
    			attr(h3, "class", "svelte-ikpdpr");
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
    			if (dirty & /*sel, fns, Object*/ 4) {
    				each_value_1 = fns[/*key*/ ctx[6]];
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
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

    function create_fragment$3(ctx) {
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
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
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
    			attr(button, "class", "svelte-ikpdpr");
    			attr(div0, "class", "options svelte-ikpdpr");
    			attr(div0, "tabindex", "0");
    			attr(div1, "class", "container svelte-ikpdpr");
    		},
    		m(target, anchor) {
    			insert(target, div1, anchor);
    			append(div1, button);
    			append(button, t0);
    			html_tag.m(/*label*/ ctx[1], button);
    			append(div1, t1);
    			append(div1, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			/*div0_binding*/ ctx[5](div0);

    			if (!mounted) {
    				dispose = listen(button, "click", /*click_handler*/ ctx[3]);
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*label*/ 2) html_tag.p(/*label*/ ctx[1]);

    			if (dirty & /*fns, Object, sel*/ 4) {
    				each_value = Object.keys(fns);
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
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div1);
    			destroy_each(each_blocks, detaching);
    			/*div0_binding*/ ctx[5](null);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let options;
    	let label = fns.polynomials[0].label;
    	complex_function.set(fns.polynomials[0].fn);

    	function sel(opt) {
    		suspend(true);
    		$$invalidate(1, label = opt.label);
    		complex_function.set(opt.fn);
    		setTimeout(() => options.blur(), 10);
    		suspend(false);
    	}

    	const click_handler = () => options.focus();
    	const click_handler_1 = opt => sel(opt);

    	function div0_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			options = $$value;
    			$$invalidate(0, options);
    		});
    	}

    	return [options, label, sel, click_handler, click_handler_1, div0_binding];
    }

    class FunctionSelect extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});
    	}
    }

    /* svelte\ComplexInput.svelte generated by Svelte v3.43.0 */

    function create_fragment$2(ctx) {
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
    	let t5_value = (/*$deg*/ ctx[2] ? '°' : 'π') + "";
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
    			t5 = text(t5_value);
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
    			input3.value = input3_value_value = Math.atan2(/*number*/ ctx[0].imag, /*number*/ ctx[0].real) * (/*$deg*/ ctx[2] ? 180 : 1) / Math.PI;
    			attr(input3, "class", "no-arrows svelte-17d3ii8");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t0);
    			append(div, input0);
    			/*input0_binding*/ ctx[5](input0);
    			append(div, t1);
    			append(div, input1);
    			/*input1_binding*/ ctx[6](input1);
    			append(div, t2);
    			append(div, br);
    			append(div, t3);
    			append(div, input2);
    			/*input2_binding*/ ctx[7](input2);
    			append(div, t4);
    			append(div, input3);
    			/*input3_binding*/ ctx[8](input3);
    			append(div, t5);

    			if (!mounted) {
    				dispose = [
    					listen(input0, "change", /*RIchange*/ ctx[3]),
    					listen(input1, "change", /*RIchange*/ ctx[3]),
    					listen(input2, "change", /*MAchange*/ ctx[4]),
    					listen(input3, "change", /*MAchange*/ ctx[4])
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

    			if (dirty & /*number, $deg*/ 5 && input3_value_value !== (input3_value_value = Math.atan2(/*number*/ ctx[0].imag, /*number*/ ctx[0].real) * (/*$deg*/ ctx[2] ? 180 : 1) / Math.PI)) {
    				input3.value = input3_value_value;
    			}

    			if (dirty & /*$deg*/ 4 && t5_value !== (t5_value = (/*$deg*/ ctx[2] ? '°' : 'π') + "")) set_data(t5, t5_value);
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    			/*input0_binding*/ ctx[5](null);
    			/*input1_binding*/ ctx[6](null);
    			/*input2_binding*/ ctx[7](null);
    			/*input3_binding*/ ctx[8](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let $deg;
    	component_subscribe($$self, deg, $$value => $$invalidate(2, $deg = $$value));
    	let { number = new Complex() } = $$props;

    	const inputs = {
    		real: null,
    		imag: null,
    		mod: null,
    		arg: null
    	};

    	deg.subscribe(d => {
    		if (!inputs.arg) return;
    		let arg = Math.atan2(number.imag, number.real);
    		$$invalidate(1, inputs.arg.value = (d ? arg * 180 : arg) / Math.PI, inputs);
    	});

    	function RIchange() {
    		suspend(true);
    		$$invalidate(0, number.real = Number(inputs.real.value) || 0, number);
    		$$invalidate(0, number.imag = Number(inputs.imag.value) || 0, number);
    		$$invalidate(1, inputs.mod.value = Math.sqrt(number.real * number.real + number.imag * number.imag), inputs);
    		let arg = Math.atan2(number.imag, number.real);
    		$$invalidate(1, inputs.arg.value = ($deg ? arg * 180 : arg) / Math.PI, inputs);
    		suspend(false);
    	}

    	function MAchange() {
    		suspend(true);
    		let mod = Number(inputs.mod.value);
    		let arg = Number(inputs.arg.value) * Math.PI;
    		if ($deg) arg /= 180;
    		$$invalidate(1, inputs.real.value = $$invalidate(0, number.real = mod * Math.cos(arg), number), inputs);
    		$$invalidate(1, inputs.imag.value = $$invalidate(0, number.imag = mod * Math.sin(arg), number), inputs);
    		suspend(false);
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
    		$deg,
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
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { number: 0 });
    	}
    }

    /* svelte\VarsMenu.svelte generated by Svelte v3.43.0 */

    function create_fragment$1(ctx) {
    	let div3;
    	let functionselect;
    	let t0;
    	let h20;
    	let t2;
    	let label;
    	let t3;
    	let input0;
    	let t4;
    	let div0;
    	let h30;
    	let t7;
    	let complexinput0;
    	let t8;
    	let h31;
    	let t11;
    	let complexinput1;
    	let t12;
    	let h32;
    	let t15;
    	let complexinput2;
    	let t16;
    	let h21;
    	let t18;
    	let div1;
    	let h33;
    	let t22;
    	let input1;
    	let input1_value_value;
    	let t23;
    	let h34;
    	let t27;
    	let input2;
    	let input2_value_value;
    	let t28;
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
    			label = element("label");
    			t3 = text("Degree angles: ");
    			input0 = element("input");
    			t4 = space();
    			div0 = element("div");
    			h30 = element("h3");
    			h30.innerHTML = `z<sub>1</sub>`;
    			t7 = space();
    			create_component(complexinput0.$$.fragment);
    			t8 = space();
    			h31 = element("h3");
    			h31.innerHTML = `z<sub>2</sub>`;
    			t11 = space();
    			create_component(complexinput1.$$.fragment);
    			t12 = space();
    			h32 = element("h3");
    			h32.innerHTML = `z<sub>3</sub>`;
    			t15 = space();
    			create_component(complexinput2.$$.fragment);
    			t16 = space();
    			h21 = element("h2");
    			h21.textContent = "Other numbers";
    			t18 = space();
    			div1 = element("div");
    			h33 = element("h3");
    			h33.innerHTML = `real <span class="bold svelte-bgzft3">r</span> =`;
    			t22 = space();
    			input1 = element("input");
    			t23 = space();
    			h34 = element("h3");
    			h34.innerHTML = `integer <span class="bold svelte-bgzft3">k</span> =`;
    			t27 = space();
    			input2 = element("input");
    			t28 = space();
    			div2 = element("div");
    			div2.innerHTML = `z<sub>k</sub>, k ∈ ℤ ⇒ z ≡ |z| ∠ (atan2(z) + 2πk)`;
    			attr(h20, "class", "svelte-bgzft3");
    			attr(input0, "type", "checkbox");
    			attr(h30, "class", "svelte-bgzft3");
    			attr(h31, "class", "svelte-bgzft3");
    			attr(h32, "class", "svelte-bgzft3");
    			attr(div0, "class", "centering-col svelte-bgzft3");
    			attr(h21, "class", "svelte-bgzft3");
    			attr(h33, "class", "svelte-bgzft3");
    			attr(input1, "type", "number");
    			input1.value = input1_value_value = /*otherVars*/ ctx[0].r;
    			attr(input1, "step", "0.01");
    			attr(input1, "class", "svelte-bgzft3");
    			attr(h34, "class", "svelte-bgzft3");
    			attr(input2, "type", "number");
    			input2.value = input2_value_value = /*otherVars*/ ctx[0].k;
    			attr(input2, "step", "1");
    			attr(input2, "class", "svelte-bgzft3");
    			attr(div1, "class", "aligned svelte-bgzft3");
    			attr(div2, "class", "expl svelte-bgzft3");
    			attr(div3, "class", "container svelte-bgzft3");
    			toggle_class(div3, "show", show);
    		},
    		m(target, anchor) {
    			insert(target, div3, anchor);
    			mount_component(functionselect, div3, null);
    			append(div3, t0);
    			append(div3, h20);
    			append(div3, t2);
    			append(div3, label);
    			append(label, t3);
    			append(label, input0);
    			append(div3, t4);
    			append(div3, div0);
    			append(div0, h30);
    			append(div0, t7);
    			mount_component(complexinput0, div0, null);
    			append(div0, t8);
    			append(div0, h31);
    			append(div0, t11);
    			mount_component(complexinput1, div0, null);
    			append(div0, t12);
    			append(div0, h32);
    			append(div0, t15);
    			mount_component(complexinput2, div0, null);
    			append(div3, t16);
    			append(div3, h21);
    			append(div3, t18);
    			append(div3, div1);
    			append(div1, h33);
    			append(div1, t22);
    			append(div1, input1);
    			append(div1, t23);
    			append(div1, h34);
    			append(div1, t27);
    			append(div1, input2);
    			append(div3, t28);
    			append(div3, div2);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen(input0, "change", /*change_handler*/ ctx[2]),
    					listen(input1, "change", /*change_handler_1*/ ctx[3]),
    					listen(input2, "change", /*change_k*/ ctx[1])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (!current || dirty & /*otherVars*/ 1 && input1_value_value !== (input1_value_value = /*otherVars*/ ctx[0].r)) {
    				input1.value = input1_value_value;
    			}

    			if (!current || dirty & /*otherVars*/ 1 && input2_value_value !== (input2_value_value = /*otherVars*/ ctx[0].k)) {
    				input2.value = input2_value_value;
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

    let show = false;

    function instance$1($$self, $$props, $$invalidate) {
    	function change_k(e) {
    		const t = e.target;
    		let v = Number(t.value);
    		if (Number.isNaN(v)) t.value = v = 0; else if (!Number.isInteger(v)) t.value = v = Math.round(v);
    		$$invalidate(0, otherVars.k = v, otherVars);
    	}

    	const change_handler = e => deg.set(e.target.checked);
    	const change_handler_1 = e => $$invalidate(0, otherVars.r = parseFloat(e.target.value), otherVars);
    	return [otherVars, change_k, change_handler, change_handler_1];
    }

    class VarsMenu extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});
    	}
    }

    /* svelte\App.svelte generated by Svelte v3.43.0 */

    function create_fragment(ctx) {
    	let canvas;
    	let t0;
    	let colors;
    	let t1;
    	let button;
    	let t3;
    	let varsmenu;
    	let t4;
    	let settingmenu;
    	let t5;
    	let div;
    	let t6;
    	let t7;
    	let current;
    	let mounted;
    	let dispose;
    	canvas = new Canvas({});
    	colors = new Colors({});
    	varsmenu = new VarsMenu({});
    	settingmenu = new SettingMenu({});

    	return {
    		c() {
    			create_component(canvas.$$.fragment);
    			t0 = space();
    			create_component(colors.$$.fragment);
    			t1 = space();
    			button = element("button");
    			button.textContent = "Play";
    			t3 = space();
    			create_component(varsmenu.$$.fragment);
    			t4 = space();
    			create_component(settingmenu.$$.fragment);
    			t5 = space();
    			div = element("div");
    			t6 = text(/*$av_frame_time*/ ctx[0]);
    			t7 = text(" ms");
    			attr(button, "class", "svelte-umd3kl");
    			attr(div, "class", "time svelte-umd3kl");
    		},
    		m(target, anchor) {
    			mount_component(canvas, target, anchor);
    			insert(target, t0, anchor);
    			mount_component(colors, target, anchor);
    			insert(target, t1, anchor);
    			insert(target, button, anchor);
    			insert(target, t3, anchor);
    			mount_component(varsmenu, target, anchor);
    			insert(target, t4, anchor);
    			mount_component(settingmenu, target, anchor);
    			insert(target, t5, anchor);
    			insert(target, div, anchor);
    			append(div, t6);
    			append(div, t7);
    			current = true;

    			if (!mounted) {
    				dispose = listen(button, "click", /*click_handler*/ ctx[1]);
    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (!current || dirty & /*$av_frame_time*/ 1) set_data(t6, /*$av_frame_time*/ ctx[0]);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(canvas.$$.fragment, local);
    			transition_in(colors.$$.fragment, local);
    			transition_in(varsmenu.$$.fragment, local);
    			transition_in(settingmenu.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(canvas.$$.fragment, local);
    			transition_out(colors.$$.fragment, local);
    			transition_out(varsmenu.$$.fragment, local);
    			transition_out(settingmenu.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(canvas, detaching);
    			if (detaching) detach(t0);
    			destroy_component(colors, detaching);
    			if (detaching) detach(t1);
    			if (detaching) detach(button);
    			if (detaching) detach(t3);
    			destroy_component(varsmenu, detaching);
    			if (detaching) detach(t4);
    			destroy_component(settingmenu, detaching);
    			if (detaching) detach(t5);
    			if (detaching) detach(div);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let $av_frame_time;
    	component_subscribe($$self, av_frame_time, $$value => $$invalidate(0, $av_frame_time = $$value));
    	const click_handler = e => e.target.textContent = toggle() ? 'Pause' : 'Play';
    	return [$av_frame_time, click_handler];
    }

    class App extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance, create_fragment, safe_not_equal, {});
    	}
    }

    var main = new App({ target: document.body });

    return main;

})();
