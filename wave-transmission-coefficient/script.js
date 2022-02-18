var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
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
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function get_all_dirty_from_scope($$scope) {
        if ($$scope.ctx.length > 32) {
            const dirty = [];
            const length = $$scope.ctx.length / 32;
            for (let i = 0; i < length; i++) {
                dirty[i] = -1;
            }
            return dirty;
        }
        return -1;
    }
    function action_destroyer(action_result) {
        return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function get_root_for_style(node) {
        if (!node)
            return document;
        const root = node.getRootNode ? node.getRootNode() : node.ownerDocument;
        if (root && root.host) {
            return root;
        }
        return node.ownerDocument;
    }
    function append_empty_stylesheet(node) {
        const style_element = element('style');
        append_stylesheet(get_root_for_style(node), style_element);
        return style_element.sheet;
    }
    function append_stylesheet(node, style) {
        append(node.head || node, style);
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
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
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
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.wholeText !== data)
            text.data = data;
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function select_option(select, value) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
        select.selectedIndex = -1; // no option should be selected
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked') || select.options[0];
        return selected_option && selected_option.__value;
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    // we need to store the information for multiple documents because a Svelte application could also contain iframes
    // https://github.com/sveltejs/svelte/issues/3624
    const managed_styles = new Map();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_style_information(doc, node) {
        const info = { stylesheet: append_empty_stylesheet(node), rules: {} };
        managed_styles.set(doc, info);
        return info;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = get_root_for_style(node);
        const { stylesheet, rules } = managed_styles.get(doc) || create_style_information(doc, node);
        if (!rules[name]) {
            rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            managed_styles.forEach(info => {
                const { stylesheet } = info;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                info.rules = {};
            });
            managed_styles.clear();
        });
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
    function setContext(key, context) {
        get_current_component().$$.context.set(key, context);
    }
    function getContext(key) {
        return get_current_component().$$.context.get(key);
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
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
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
        seen_callbacks.clear();
        set_current_component(saved_component);
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

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
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
    const null_transition = { duration: 0 };
    function create_in_transition(node, fn, params) {
        let config = fn(node, params);
        let running = false;
        let animation_name;
        let task;
        let uid = 0;
        function cleanup() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
            tick(0, 1);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            if (task)
                task.abort();
            running = true;
            add_render_callback(() => dispatch(node, true, 'start'));
            task = loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(1, 0);
                        dispatch(node, true, 'end');
                        cleanup();
                        return running = false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(t, 1 - t);
                    }
                }
                return running;
            });
        }
        let started = false;
        return {
            start() {
                if (started)
                    return;
                started = true;
                delete_rule(node);
                if (is_function(config)) {
                    config = config();
                    wait().then(go);
                }
                else {
                    go();
                }
            },
            invalidate() {
                started = false;
            },
            end() {
                if (running) {
                    cleanup();
                    running = false;
                }
            }
        };
    }
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = (program.b - t);
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program || pending_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
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

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function fade(node, { delay = 0, duration = 400, easing = identity } = {}) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }

    /**
     * @typedef {{
     * (value: number) => number, 
     * domain: (min: number, max: number) => linearScale,
     * range: (min: number, max: number) => linearScale
     * }} linearScale
     */
    /**
     * Constructs a new linear scale
     * @returns {linearScale}
     */
    function linearScale() {
        var from_min = 0;
        var from_dim = 1;
        var to_min = 0;
        var to_dim = 1;
        const compute = v => (v-from_min)/from_dim*to_dim + to_min;
        compute.domain = (min, max) => {
            from_min = min;
            from_dim = max-min;
            return compute;
        };
        compute.range = (min, max) => {
            to_min = min;
            to_dim = max-min;
            return compute;
        };
        return compute;
    }

    /**
     * Creates an array array with equispaced values such that
     * they divide in equal spaces the range between min and max
     * @param {number} min minimum range value (included)
     * @param {number} max maximum range value (included)
     * @param {number} spaces number of equal spaces
     * @returns {number[]} threshold values of each equispaced interval (spaces+1 long)
     */
    function linearSpace(min, max, spaces) {
        const res = new Array(spaces+1);
        const span = (max-min)/spaces;
        for(var i=0; i<=spaces; i++) res[i] = span*i + min;
        return res;
    }


    class LinearSpace extends Array {
        /**
         * Constructs an array with equispaced values between a min and a max
         * @constructor
         * @param {number} min starting value
         * @param {number} max ending values
         * @param {number} points number of points taken
         * @param {boolean} [excludeMin] whether to exclude the min value
         * @param {boolean} [excludeMax] whether to exclude the max value
         */
        constructor(min, max, points, excludeMin=false, excludeMax=false) {
            super(points);
            this.min = min;
            this.span = (max-min)/(points-1);
            for(var i=0; i<points; i++) this[i] = this.span*i + min;
            if(excludeMin) this[0] += this.span*0.05;
            if(excludeMax) this[points-1] -= this.span*0.05;
        }
        /**
         * Returns the index of the occurrence of a value in a linear space, or -1 if it is not present. \
         * Works correctly only if the array value is not modified. \
         * Has order of complexity O(1)
         * @param {number} x value to search
         * @returns {number} index of the value or -1
         */
        indexOf(x) {
            const i = Math.round((x-this.min)/this.span);
            if(i >= 0 && i < this.length && Math.abs(this[i]-x) < this.span*0.05) return i;
            else return -1;
        }
        /**
         * Determines whether an linear space includes a certain value. \
         * Works correctly only if the array value is not modified. 
         * @param {number} x value to search for
         * @returns {boolean}
         */
        includes(x) {return this.indexOf(x) !== -1}
    }
    if(typeof window !== "undefined") Object.defineProperty(window, "LinearSpace", {value: LinearSpace});


    // function LinearSpace2(min, max, points) {
    //     const res = new Array(points);
    //     const span = (max-min)/(points-1);
    //     for(var i=0; i<points; i++) res[i] = span*i + min;
    //     res.span = span;
    //     res.min = min;
    //     Object.setPrototypeOf(res, LinearSpace2.prototype);
    //     return res;
    // }
    // LinearSpace2.prototype.indexOf = function(x) {
    //     const i = Math.round((x-this.min)/this.span);
    //     if(Math.abs((this[i]-x)/this[i]) < this.span*0.05) return i;
    //     else return -1;
    // }
    // LinearSpace2.prototype.includes = function(x) { return this.indexOf(x) !== -1 }

    const eV2Ry = 0.0734986176;
    const A2au = 1.8897259886;

    class Complex {
        constructor(real=0, imag=0) {
            this.real = real;
            this.imag = imag;
        }
        /**
         * Equivalent to: z = real + imag*i
         * @param {number} real 
         * @param {number} imag 
         * @returns 
         */
        becomes(real=0, imag=0) {
            this.real = real;
            this.imag = imag;
            return this;
        }
        /**
         * Assignment: z = c
         * @param {Complex} c
         * @returns
         */
        eq(c) {
            this.real = c.real;
            this.imag = c.imag;
            return this;
        }
        /**
         * Addition: z = z+c
         * @param {Complex} c 
         * @returns
         */
        add(c) {
            this.real += c.real;
            this.imag += c.imag;
            return this;
        }
        /**
         * Subtraction: z = z-c
         * @param {Complex} c 
         * @returns
         */
        sub(c) {
            this.real -= c.real;
            this.imag -= c.imag;
            return this;
        }
        /**
         * Multiplication: z = z*c
         * @param {Complex} c 
         * @returns
         */
        mul(c) {
            var i = this.imag*c.real + this.real*c.imag;
            this.real = this.real*c.real - this.imag*c.imag;
            this.imag = i;
            return this;
        }
        /**
         * Multiplication by a real: z = z*r
         * @param {Number} r 
         */
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
        /**
         * Division: z = z/c
         * @param {Complex} c 
         * @returns
         */
        div(c) {
            var m2 = c.real*c.real + c.imag*c.imag;
            var r = (this.real*c.real + this.imag*c.imag) / m2;
            var i = (this.imag*c.real - this.real*c.imag) / m2;
            this.real = r;
            this.imag = i;
            return this;
        }
        /**
         * Exponentiation: z = z^c
         * @param {Complex} c complex power
         * @param {Number} [k=0] determines angle
         */
        pow(c, k=0) { return this.intoLog(k).mul(c).intoExp(); }
        /**
         * Exponentiation: z = z^r
         * @param {Complex} r real power
         * @param {Number} [k=0] determines angle
         */
        pow_r(r, k=0) {
            var mod = Math.pow(this.real*this.real + this.imag*this.imag, r/2); 
            var arg = Math.atan2(this.imag, this.real) + k*2*Math.PI;
            this.real = mod * Math.cos(r * arg);
            this.imag = mod * Math.sin(r * arg);
            return this;
        }
        /**@param {Number} n integer power */
        pow_n(n) {
            if(n == 0) return this.toOne();
            const real = this.real;
            const imag = this.imag;
            var end = n;
            var t;
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
        intoExp() {
            var mod = Math.exp(this.real);
            this.real = mod * Math.cos(this.imag);
            this.imag = mod * Math.sin(this.imag);
            return this;
        }
        intoLog(k=0) {
            var r = Math.log(this.real*this.real + this.imag*this.imag);
            var i = Math.atan2(this.imag, this.real) + k*2*Math.PI;
            this.real = r * .5;
            this.imag = i;
            return this;
        }
        intoSin() {
            var i = Math.cos(this.real)*Math.sinh(this.imag);
            this.real = Math.sin(this.real)*Math.cosh(this.imag);
            this.imag = i;
            return this;
        }
        intoCos() {
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
            let r = this.real;
            this.real = 1/(r + this.imag/r*this.imag);
            this.imag = -1/(this.imag + r/this.imag*r);
            return this;
        }
        toOpposite() {
            this.real = -this.real;
            this.imag = -this.imag;
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
        get squareModulus() { return this.real*this.real + this.imag*this.imag }
        /**
         * Copies a complex number into a new one
         * @param {Complex} z 
         * @returns 
         */
        static copy(z) {return new Complex(z.real, z.imag) }
        /**
         * Creates a new complex number
         * @param {number} real real part
         * @param {number} imag imaginary part
         * @returns 
         */
        static ReIm(real, imag) { return new Complex(real, imag) }
        /**
         * Creates a new complex number
         * @param {number} mod modulus
         * @param {number} arg argument
         * @returns 
         */
        static ModArg(mod, arg) { return new Complex(mod * Math.cos(arg), mod * Math.sin(arg)) }
        /**
         * Finds the all the n-th roots of a complex number
         * @param {Complex} c complex numbers
         * @param {number} n integer root
         */
        static roots(c, n) {
            var mod = Math.pow(this.real*this.real + this.imag*this.imag, r/2); 
            var arg = Math.atan2(this.imag, this.real);
            const res = new Array(n);
            for(var i=0; i<n; i++) res[i] = Complex.ModArg(mod, arg+2*Math.PI*i); 
            return res;
        }
    }
    function nf(n) { return Number.isInteger(n) ? n.toString() : n.toPrecision(3) } 
    if(typeof window !== "undefined") Object.defineProperty(window, "Complex", {value: Complex});

    class Matrix2x2 {
        /**
         * Constructs a new 2x2 complex matrix of the form [a, b; c, d]
         * @constructor
         */
        constructor() {
            this.a = new Complex();
            this.b = new Complex();
            this.c = new Complex();
            this.d = new Complex();
        }
        /**
         * Multiplies matrix on the left by overwriting itself
         * @param {Matrix2x2} m 
         * @returns
         */
        mul_right(m) {
            this.z1.eq(this.b).mul(m.c);  // b*c'
            this.z2.eq(this.a).mul(m.b);  // a*b'
            this.a.mul(m.a).add(this.z1); // a*a' + b*c'
            this.b.mul(m.d).add(this.z2); // b*d' + a*b'

            this.z1.eq(this.d).mul(m.c);  // d*c'
            this.z2.eq(this.c).mul(m.b);  // c*b'
            this.c.mul(m.a).add(this.z1); // c*a' + d*c'
            this.d.mul(m.d).add(this.z2); // d*d' + c*b'

            return this;
        }
        /**
         * Multiplies matrix on the left by overwriting itself
         * @param {Matrix2x2} m 
         * @returns
         */
        mul_left(m) {
            this.z1.eq(m.b).mul(this.c);
            this.z2.eq(m.c).mul(this.a);
            this.a.mul(m.a).add(this.z1);
            this.c.mul(m.d).add(this.z2);

            this.z1.eq(m.b).mul(this.d);
            this.z2.eq(m.c).mul(this.b);
            this.b.mul(m.a).add(this.z1);
            this.d.mul(m.d).add(this.z2);

            return this;
        }
        /**
         * Transforms the matrix into its inverse
         * @returns 
         */
        toInverse() {
            this.z1.eq(this.b).mul(this.c);
            this.z2.eq(this.a).mul(this.d).sub(this.z1); // determinant

            var t = this.a.div(this.z2);
            this.a = this.d.div(this.z2);
            this.d = t;
            this.b.toOpposite().div(this.z2);
            this.c.toOpposite().div(this.z2);

            return this;
        }
    }
    /**
     * Utility complex number: do not use.\
     * Defined inside prototype to save marginal lookup time
     */
    Matrix2x2.prototype.z1 = new Complex();
    /**
     * Utility complex number: do not use.\
     * Defined inside prototype to save marginal lookup time
     */
    Matrix2x2.prototype.z2 = new Complex();

    if(typeof window !== "undefined") Object.defineProperty(window, 'Matrix2x2', {value: Matrix2x2});

    const M = [new Matrix2x2, new Matrix2x2, new Matrix2x2, new Matrix2x2];
    const k = new Complex;
    const b = new Complex;

    /**
     * Computes the matrix products, with the current M, b, and k
     * @param {number} l 
     * @returns {number}
     */
    function compute(l) {
        // M1 = [1, 1; k, -k]
        M[0].a.toOne();
        M[0].b.toOne();
        M[0].c.eq(k);
        M[0].d.eq(k).toOpposite();

        // M2 = [1, 1; b, -b]
        M[1].a.toOne();
        M[1].b.toOne();
        M[1].c.eq(b);
        M[1].d.eq(b).toOpposite();
        
        // M3 = [exp(b*l), exp(-b*l); b*exp(b*l), -b*exp(-b*l)]
        M[2].a.eq(b).mul_r(l).intoExp();
        M[2].b.eq(M[2].a).toReciprocal();
        M[2].c.eq(M[2].a).mul(b);
        M[2].d.eq(M[2].b).mul(b).toOpposite();

        // M4 = [exp(k*l), exp(-k*l); k*exp(k*l), -k*exp(-k*l)]
        M[3].a.eq(k).mul_r(l).intoExp();
        M[3].b.eq(M[3].a).toReciprocal();
        M[3].c.eq(M[3].a).mul(k);
        M[3].d.eq(M[3].b).mul(k).toOpposite();

        // inv(M1)*M2*inv(M3)*M4
        M[0].toInverse().mul_right(M[1]).mul_right(M[2].toInverse()).mul_right(M[3]);
        return 1/M[0].a.squareModulus;
    }

    /**
     * Computes the transmission coefficient (when E != V0)
     * @param {number} E energy [Ry]
     * @param {number} V0 potential [Ry]
     * @param {number} l barrier width [a.u.]
     * @param {number} m particle mass [electrom masses]
     * @returns {number} transmission coefficient
     */
    function transmission(E, V0, l, m) {
        k.becomes(-m*E,0).pow_r(.5);     // k^2 = -E 2m/h^2 
        b.becomes(m*(V0-E),0).pow_r(.5);   // beta^2 = (V0-E) 2m/h^2
        return compute(l);
    }

    /**
     * Computes the transmission coefficient when the energy equals the potential
     * @param {number} E energy or potential [Ry]
     * @param {number} l barrier width [a.u.]
     * @param {number} m particle mass [electrom masses]
     * @returns {number}
     */
    function transmission_pot(E, l, m) {
        k.becomes(-m*E,0).pow_r(.5);
        // M1 = [1, 1; k, -k]
        M[0].a.toOne();
        M[0].b.toOne();
        M[0].c.eq(k);
        M[0].d.eq(k).toOpposite();
        // M2 = [1, -l; 0, 1]
        M[1].a.toOne();
        M[1].b.becomes(-l,0);
        M[1].c.toZero();
        M[1].d.toOne();
        // M4 = [exp(k*l), exp(-k*l); k*exp(k*l), -k*exp(-k*l)]
        M[3].a.eq(k).mul_r(l).intoExp();
        M[3].b.eq(M[3].a).toReciprocal();
        M[3].c.eq(M[3].a).mul(k);
        M[3].d.eq(M[3].b).mul(k).toOpposite();

        M[0].toInverse().mul_right(M[1]).mul_right(M[3]);
        return 1/M[0].a.squareModulus;
    }

    function randomColor() {
        return "#" + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0').toUpperCase();
    }

    const subscriber_queue = [];
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

    /* components\Axis.svelte generated by Svelte v3.46.3 */

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[24] = list[i];
    	return child_ctx;
    }

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[24] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[24] = list[i];
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[24] = list[i];
    	return child_ctx;
    }

    // (68:4) {#each yTicks as tick}
    function create_each_block_3(ctx) {
    	let div;
    	let t_value = /*tick*/ ctx[24].toFixed(2) + "";
    	let t;

    	return {
    		c() {
    			div = element("div");
    			t = text(t_value);
    			attr(div, "class", "y-tick svelte-1q0x7nj");
    			set_style(div, "--t", /*yScale*/ ctx[6](/*tick*/ ctx[24]) + "px");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*yTicks*/ 8 && t_value !== (t_value = /*tick*/ ctx[24].toFixed(2) + "")) set_data(t, t_value);

    			if (dirty[0] & /*yTicks*/ 8) {
    				set_style(div, "--t", /*yScale*/ ctx[6](/*tick*/ ctx[24]) + "px");
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (71:4) {#each xTicks as tick}
    function create_each_block_2(ctx) {
    	let div;
    	let t_value = /*tick*/ ctx[24].toPrecision(3) + "";
    	let t;

    	return {
    		c() {
    			div = element("div");
    			t = text(t_value);
    			attr(div, "class", "x-tick svelte-1q0x7nj");
    			set_style(div, "--t", /*xScale*/ ctx[5](/*tick*/ ctx[24]) + "px");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, t);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*xTicks*/ 16 && t_value !== (t_value = /*tick*/ ctx[24].toPrecision(3) + "")) set_data(t, t_value);

    			if (dirty[0] & /*xTicks*/ 16) {
    				set_style(div, "--t", /*xScale*/ ctx[5](/*tick*/ ctx[24]) + "px");
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (76:12) {#each yTicks as tick}
    function create_each_block_1$1(ctx) {
    	let line;
    	let line_x__value;
    	let line_transform_value;

    	return {
    		c() {
    			line = svg_element("line");
    			attr(line, "x1", pad);
    			attr(line, "x2", line_x__value = /*width*/ ctx[0] - pad);
    			attr(line, "transform", line_transform_value = "translate(0, " + /*yScale*/ ctx[6](/*tick*/ ctx[24]) + ")");
    			attr(line, "class", "svelte-1q0x7nj");
    		},
    		m(target, anchor) {
    			insert(target, line, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*width*/ 1 && line_x__value !== (line_x__value = /*width*/ ctx[0] - pad)) {
    				attr(line, "x2", line_x__value);
    			}

    			if (dirty[0] & /*yTicks*/ 8 && line_transform_value !== (line_transform_value = "translate(0, " + /*yScale*/ ctx[6](/*tick*/ ctx[24]) + ")")) {
    				attr(line, "transform", line_transform_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(line);
    		}
    	};
    }

    // (81:12) {#each xTicks as tick}
    function create_each_block$1(ctx) {
    	let line;
    	let line_y__value;
    	let line_transform_value;

    	return {
    		c() {
    			line = svg_element("line");
    			attr(line, "y1", pad);
    			attr(line, "y2", line_y__value = /*height*/ ctx[1] - pad);
    			attr(line, "transform", line_transform_value = "translate(" + /*xScale*/ ctx[5](/*tick*/ ctx[24]) + ", 0)");
    			attr(line, "class", "svelte-1q0x7nj");
    		},
    		m(target, anchor) {
    			insert(target, line, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*height*/ 2 && line_y__value !== (line_y__value = /*height*/ ctx[1] - pad)) {
    				attr(line, "y2", line_y__value);
    			}

    			if (dirty[0] & /*xTicks*/ 16 && line_transform_value !== (line_transform_value = "translate(" + /*xScale*/ ctx[5](/*tick*/ ctx[24]) + ", 0)")) {
    				attr(line, "transform", line_transform_value);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(line);
    		}
    	};
    }

    function create_fragment$2(ctx) {
    	let div;
    	let t0;
    	let t1;
    	let svg_1;
    	let g0;
    	let g1;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value_3 = /*yTicks*/ ctx[3];
    	let each_blocks_3 = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks_3[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	let each_value_2 = /*xTicks*/ ctx[4];
    	let each_blocks_2 = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_2[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	let each_value_1 = /*yTicks*/ ctx[3];
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
    	}

    	let each_value = /*xTicks*/ ctx[4];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const default_slot_template = /*#slots*/ ctx[16].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[15], null);

    	return {
    		c() {
    			div = element("div");

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				each_blocks_3[i].c();
    			}

    			t0 = space();

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			t1 = space();
    			svg_1 = svg_element("svg");
    			g0 = svg_element("g");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			g1 = svg_element("g");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			if (default_slot) default_slot.c();
    			attr(svg_1, "class", "svelte-1q0x7nj");
    			attr(div, "class", "axis svelte-1q0x7nj");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				each_blocks_3[i].m(div, null);
    			}

    			append(div, t0);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].m(div, null);
    			}

    			append(div, t1);
    			append(div, svg_1);
    			append(svg_1, g0);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(g0, null);
    			}

    			append(svg_1, g1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(g1, null);
    			}

    			if (default_slot) {
    				default_slot.m(svg_1, null);
    			}

    			/*svg_1_binding*/ ctx[17](svg_1);
    			current = true;

    			if (!mounted) {
    				dispose = listen(window, "resize", /*resize*/ ctx[7]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty[0] & /*yScale, yTicks*/ 72) {
    				each_value_3 = /*yTicks*/ ctx[3];
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3(ctx, each_value_3, i);

    					if (each_blocks_3[i]) {
    						each_blocks_3[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_3[i] = create_each_block_3(child_ctx);
    						each_blocks_3[i].c();
    						each_blocks_3[i].m(div, t0);
    					}
    				}

    				for (; i < each_blocks_3.length; i += 1) {
    					each_blocks_3[i].d(1);
    				}

    				each_blocks_3.length = each_value_3.length;
    			}

    			if (dirty[0] & /*xScale, xTicks*/ 48) {
    				each_value_2 = /*xTicks*/ ctx[4];
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks_2[i]) {
    						each_blocks_2[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_2[i] = create_each_block_2(child_ctx);
    						each_blocks_2[i].c();
    						each_blocks_2[i].m(div, t1);
    					}
    				}

    				for (; i < each_blocks_2.length; i += 1) {
    					each_blocks_2[i].d(1);
    				}

    				each_blocks_2.length = each_value_2.length;
    			}

    			if (dirty[0] & /*width, yScale, yTicks*/ 73) {
    				each_value_1 = /*yTicks*/ ctx[3];
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1$1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(g0, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty[0] & /*height, xScale, xTicks*/ 50) {
    				each_value = /*xTicks*/ ctx[4];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(g1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (default_slot) {
    				if (default_slot.p && (!current || dirty[0] & /*$$scope*/ 32768)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[15],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[15])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[15], dirty, null),
    						null
    					);
    				}
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_each(each_blocks_3, detaching);
    			destroy_each(each_blocks_2, detaching);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			if (default_slot) default_slot.d(detaching);
    			/*svg_1_binding*/ ctx[17](null);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    const pad = 2;

    function instance$2($$self, $$props, $$invalidate) {
    	let xTicks;
    	let yTicks;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	let { min_x = 0 } = $$props;
    	let { max_x = 1 } = $$props;
    	let { min_y = 0 } = $$props;
    	let { max_y = 1 } = $$props;
    	let { density = 140 } = $$props;
    	let width = 800;
    	let height = 400;
    	const xScale = linearScale();
    	const xs_store = writable(xScale);
    	setContext("xScale", xs_store.subscribe);
    	const yScale = linearScale();
    	const ys_store = writable(yScale);
    	setContext("yScale", ys_store.subscribe);
    	const xPixels = writable(width - 2 * pad);
    	setContext("xPixels", xPixels.subscribe);

    	function getXPixels() {
    		return xPixels.subscribe;
    	}

    	const yPixels = writable(height - 2 * pad);
    	setContext("yPixels", yPixels.subscribe);

    	function getYPixels() {
    		return yPixels.subscribe;
    	}

    	const xRange = writable([min_x, max_x]);
    	setContext("xRange", xRange.subscribe);
    	const yRange = writable([min_y, max_y]);
    	setContext("yRange", yRange.subscribe);

    	/**@type {HTMLSvgElement}*/
    	let svg;

    	const resize = (function () {
    		let waiting = false;

    		function exec() {
    			$$invalidate(0, { width, height } = svg.getBoundingClientRect(), width, $$invalidate(1, height));
    			waiting = false;
    		}

    		return function () {
    			if (waiting) return;
    			waiting = true;
    			requestAnimationFrame(exec);
    		};
    	})();

    	onMount(resize);

    	function svg_1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			svg = $$value;
    			$$invalidate(2, svg);
    		});
    	}

    	$$self.$$set = $$props => {
    		if ('min_x' in $$props) $$invalidate(8, min_x = $$props.min_x);
    		if ('max_x' in $$props) $$invalidate(9, max_x = $$props.max_x);
    		if ('min_y' in $$props) $$invalidate(10, min_y = $$props.min_y);
    		if ('max_y' in $$props) $$invalidate(11, max_y = $$props.max_y);
    		if ('density' in $$props) $$invalidate(12, density = $$props.density);
    		if ('$$scope' in $$props) $$invalidate(15, $$scope = $$props.$$scope);
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*min_x, max_x, width*/ 769) {
    			xs_store.set(xScale.domain(min_x, max_x).range(pad, width - pad));
    		}

    		if ($$self.$$.dirty[0] & /*min_y, max_y, height*/ 3074) {
    			ys_store.set(yScale.domain(min_y, max_y).range(height - pad, pad));
    		}

    		if ($$self.$$.dirty[0] & /*width*/ 1) {
    			xPixels.set(width - 2 * pad);
    		}

    		if ($$self.$$.dirty[0] & /*height*/ 2) {
    			yPixels.set(height - 2 * pad);
    		}

    		if ($$self.$$.dirty[0] & /*min_x, max_x*/ 768) {
    			xRange.set([min_x, max_x]);
    		}

    		if ($$self.$$.dirty[0] & /*min_y, max_y*/ 3072) {
    			yRange.set([min_y, max_y]);
    		}

    		if ($$self.$$.dirty[0] & /*min_x, max_x, width, density*/ 4865) {
    			$$invalidate(4, xTicks = linearSpace(min_x, max_x, Math.ceil(width / density)));
    		}

    		if ($$self.$$.dirty[0] & /*min_y, max_y, height, density*/ 7170) {
    			$$invalidate(3, yTicks = linearSpace(min_y, max_y, Math.ceil(height / density)));
    		}
    	};

    	return [
    		width,
    		height,
    		svg,
    		yTicks,
    		xTicks,
    		xScale,
    		yScale,
    		resize,
    		min_x,
    		max_x,
    		min_y,
    		max_y,
    		density,
    		getXPixels,
    		getYPixels,
    		$$scope,
    		slots,
    		svg_1_binding
    	];
    }

    class Axis extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(
    			this,
    			options,
    			instance$2,
    			create_fragment$2,
    			safe_not_equal,
    			{
    				min_x: 8,
    				max_x: 9,
    				min_y: 10,
    				max_y: 11,
    				density: 12,
    				getXPixels: 13,
    				getYPixels: 14
    			},
    			null,
    			[-1, -1]
    		);
    	}

    	get getXPixels() {
    		return this.$$.ctx[13];
    	}

    	get getYPixels() {
    		return this.$$.ctx[14];
    	}
    }

    /* components\DataPlot.svelte generated by Svelte v3.46.3 */

    function create_fragment$1(ctx) {
    	let path;
    	let path_d_value;
    	let path_transition;
    	let current;

    	return {
    		c() {
    			path = svg_element("path");
    			attr(path, "d", path_d_value = joinIntoPath(/*x*/ ctx[0], /*y*/ ctx[1], /*xScale*/ ctx[5], /*yScale*/ ctx[6]));
    			attr(path, "stroke", /*color*/ ctx[2]);
    			attr(path, "stroke-width", /*thickness*/ ctx[3]);
    			attr(path, "stroke-dasharray", /*dash*/ ctx[4]);
    			attr(path, "fill", "none");
    		},
    		m(target, anchor) {
    			insert(target, path, anchor);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (!current || dirty & /*x, y, xScale, yScale*/ 99 && path_d_value !== (path_d_value = joinIntoPath(/*x*/ ctx[0], /*y*/ ctx[1], /*xScale*/ ctx[5], /*yScale*/ ctx[6]))) {
    				attr(path, "d", path_d_value);
    			}

    			if (!current || dirty & /*color*/ 4) {
    				attr(path, "stroke", /*color*/ ctx[2]);
    			}

    			if (!current || dirty & /*thickness*/ 8) {
    				attr(path, "stroke-width", /*thickness*/ ctx[3]);
    			}

    			if (!current || dirty & /*dash*/ 16) {
    				attr(path, "stroke-dasharray", /*dash*/ ctx[4]);
    			}
    		},
    		i(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!path_transition) path_transition = create_bidirectional_transition(path, fade, { duration: 150 }, true);
    				path_transition.run(1);
    			});

    			current = true;
    		},
    		o(local) {
    			if (!path_transition) path_transition = create_bidirectional_transition(path, fade, { duration: 150 }, false);
    			path_transition.run(0);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(path);
    			if (detaching && path_transition) path_transition.end();
    		}
    	};
    }

    function joinIntoPath(x, y, xScale, yScale) {
    	const g = [`M${xScale(x[0])},${yScale(y[0])}`];
    	const LEN = Math.min(x.length, y.length);
    	for (var i = 1; i < LEN; i++) g.push(`L${xScale(x[i])},${yScale(y[i])}`);
    	return g.join(' ');
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { x = [] } = $$props;
    	let { y = [] } = $$props;
    	let { color = "black" } = $$props;
    	let { thickness = 2 } = $$props;
    	let { dash } = $$props;
    	let xScale;
    	let yScale;
    	getContext("xScale")(v => $$invalidate(5, xScale = v));
    	getContext("yScale")(v => $$invalidate(6, yScale = v));

    	$$self.$$set = $$props => {
    		if ('x' in $$props) $$invalidate(0, x = $$props.x);
    		if ('y' in $$props) $$invalidate(1, y = $$props.y);
    		if ('color' in $$props) $$invalidate(2, color = $$props.color);
    		if ('thickness' in $$props) $$invalidate(3, thickness = $$props.thickness);
    		if ('dash' in $$props) $$invalidate(4, dash = $$props.dash);
    	};

    	return [x, y, color, thickness, dash, xScale, yScale];
    }

    class DataPlot extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {
    			x: 0,
    			y: 1,
    			color: 2,
    			thickness: 3,
    			dash: 4
    		});
    	}
    }

    /* components\App.svelte generated by Svelte v3.46.3 */

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[24] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[24] = list[i];
    	child_ctx[27] = list;
    	child_ctx[28] = i;
    	return child_ctx;
    }

    // (124:1) {#if mode !== 0}
    function create_if_block_5(ctx) {
    	let h3;
    	let t1;
    	let input;
    	let t2;
    	let t3;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			h3 = element("h3");
    			h3.textContent = "Barrier length [Å]";
    			t1 = space();
    			input = element("input");
    			t2 = space();
    			t3 = text(/*global_length*/ ctx[2]);
    			attr(h3, "class", "svelte-5n98na");
    			attr(input, "type", "range");
    			attr(input, "min", "0.025");
    			attr(input, "max", "10");
    			attr(input, "step", "0.025");
    			attr(input, "class", "svelte-5n98na");
    		},
    		m(target, anchor) {
    			insert(target, h3, anchor);
    			insert(target, t1, anchor);
    			insert(target, input, anchor);
    			set_input_value(input, /*global_length*/ ctx[2]);
    			insert(target, t2, anchor);
    			insert(target, t3, anchor);

    			if (!mounted) {
    				dispose = [
    					listen(input, "change", /*input_change_input_handler*/ ctx[15]),
    					listen(input, "input", /*input_change_input_handler*/ ctx[15])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty & /*global_length*/ 4) {
    				set_input_value(input, /*global_length*/ ctx[2]);
    			}

    			if (dirty & /*global_length*/ 4) set_data(t3, /*global_length*/ ctx[2]);
    		},
    		d(detaching) {
    			if (detaching) detach(h3);
    			if (detaching) detach(t1);
    			if (detaching) detach(input);
    			if (detaching) detach(t2);
    			if (detaching) detach(t3);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    // (129:1) {#if mode !== 1}
    function create_if_block_4(ctx) {
    	let h3;
    	let t1;
    	let input;
    	let t2;
    	let t3;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			h3 = element("h3");
    			h3.textContent = "Barrier potential [eV]";
    			t1 = space();
    			input = element("input");
    			t2 = space();
    			t3 = text(/*global_potential*/ ctx[3]);
    			attr(h3, "class", "svelte-5n98na");
    			attr(input, "type", "range");
    			attr(input, "min", "0.05");
    			attr(input, "max", "20");
    			attr(input, "step", "0.05");
    			attr(input, "class", "svelte-5n98na");
    		},
    		m(target, anchor) {
    			insert(target, h3, anchor);
    			insert(target, t1, anchor);
    			insert(target, input, anchor);
    			set_input_value(input, /*global_potential*/ ctx[3]);
    			insert(target, t2, anchor);
    			insert(target, t3, anchor);

    			if (!mounted) {
    				dispose = [
    					listen(input, "change", /*input_change_input_handler_1*/ ctx[16]),
    					listen(input, "input", /*input_change_input_handler_1*/ ctx[16])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty & /*global_potential*/ 8) {
    				set_input_value(input, /*global_potential*/ ctx[3]);
    			}

    			if (dirty & /*global_potential*/ 8) set_data(t3, /*global_potential*/ ctx[3]);
    		},
    		d(detaching) {
    			if (detaching) detach(h3);
    			if (detaching) detach(t1);
    			if (detaching) detach(input);
    			if (detaching) detach(t2);
    			if (detaching) detach(t3);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    // (134:1) {#if mode !== 2}
    function create_if_block_3(ctx) {
    	let h3;
    	let t1;
    	let select;
    	let optgroup0;
    	let option0;
    	let option0_value_value;
    	let option1;
    	let option1_value_value;
    	let option2;
    	let option2_value_value;
    	let optgroup1;
    	let option3;
    	let option3_value_value;
    	let option4;
    	let option4_value_value;
    	let option5;
    	let option5_value_value;
    	let option6;
    	let option6_value_value;
    	let option7;
    	let option7_value_value;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			h3 = element("h3");
    			h3.textContent = "Particle mass";
    			t1 = space();
    			select = element("select");
    			optgroup0 = element("optgroup");
    			option0 = element("option");
    			option0.textContent = "electron";
    			option1 = element("option");
    			option1.textContent = "muon";
    			option2 = element("option");
    			option2.textContent = "proton";
    			optgroup1 = element("optgroup");
    			option3 = element("option");
    			option3.textContent = "electron neutrino";
    			option4 = element("option");
    			option4.textContent = "muon neutrino";
    			option5 = element("option");
    			option5.textContent = "quark up";
    			option6 = element("option");
    			option6.textContent = "quark down";
    			option7 = element("option");
    			option7.textContent = "tau neutrino";
    			attr(h3, "class", "svelte-5n98na");
    			option0.__value = option0_value_value = 1;
    			option0.value = option0.__value;
    			option1.__value = option1_value_value = 206.77;
    			option1.value = option1.__value;
    			option2.__value = option2_value_value = 1836.1;
    			option2.value = option2.__value;
    			attr(optgroup0, "label", "Precise");
    			attr(optgroup0, "class", "svelte-5n98na");
    			option3.__value = option3_value_value = 2e-3;
    			option3.value = option3.__value;
    			option4.__value = option4_value_value = 0.33;
    			option4.value = option4.__value;
    			option5.__value = option5_value_value = 3.9;
    			option5.value = option5.__value;
    			option6.__value = option6_value_value = 9.4;
    			option6.value = option6.__value;
    			option7.__value = option7_value_value = 35.6;
    			option7.value = option7.__value;
    			attr(optgroup1, "label", "Upperbound");
    			attr(optgroup1, "class", "svelte-5n98na");
    			attr(select, "class", "svelte-5n98na");
    			if (/*global_mass*/ ctx[4] === void 0) add_render_callback(() => /*select_change_handler_1*/ ctx[17].call(select));
    		},
    		m(target, anchor) {
    			insert(target, h3, anchor);
    			insert(target, t1, anchor);
    			insert(target, select, anchor);
    			append(select, optgroup0);
    			append(optgroup0, option0);
    			append(optgroup0, option1);
    			append(optgroup0, option2);
    			append(select, optgroup1);
    			append(optgroup1, option3);
    			append(optgroup1, option4);
    			append(optgroup1, option5);
    			append(optgroup1, option6);
    			append(optgroup1, option7);
    			select_option(select, /*global_mass*/ ctx[4]);

    			if (!mounted) {
    				dispose = listen(select, "change", /*select_change_handler_1*/ ctx[17]);
    				mounted = true;
    			}
    		},
    		p(ctx, dirty) {
    			if (dirty & /*global_mass*/ 16) {
    				select_option(select, /*global_mass*/ ctx[4]);
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(h3);
    			if (detaching) detach(t1);
    			if (detaching) detach(select);
    			mounted = false;
    			dispose();
    		}
    	};
    }

    // (152:82) {:else}
    function create_else_block(ctx) {
    	let t0;
    	let sub;
    	let t2;

    	return {
    		c() {
    			t0 = text("Masses [m");
    			sub = element("sub");
    			sub.textContent = "e";
    			t2 = text("]");
    		},
    		m(target, anchor) {
    			insert(target, t0, anchor);
    			insert(target, sub, anchor);
    			insert(target, t2, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t0);
    			if (detaching) detach(sub);
    			if (detaching) detach(t2);
    		}
    	};
    }

    // (152:67) 
    function create_if_block_2(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Potentials [eV]");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (152:5) {#if mode === 0}
    function create_if_block_1(ctx) {
    	let t;

    	return {
    		c() {
    			t = text("Barrier lengths [Å]");
    		},
    		m(target, anchor) {
    			insert(target, t, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(t);
    		}
    	};
    }

    // (156:2) {#each graphs as g, i}
    function create_each_block_1(ctx) {
    	let div;
    	let input;
    	let t0;
    	let span;
    	let t1_value = /*g*/ ctx[24].value.toPrecision(3) + "";
    	let t1;
    	let t2;
    	let button;
    	let button_data_index_value;
    	let t3;
    	let div_intro;
    	let mounted;
    	let dispose;

    	function input_input_handler() {
    		/*input_input_handler*/ ctx[19].call(input, /*each_value_1*/ ctx[27], /*i*/ ctx[28]);
    	}

    	return {
    		c() {
    			div = element("div");
    			input = element("input");
    			t0 = space();
    			span = element("span");
    			t1 = text(t1_value);
    			t2 = space();
    			button = element("button");
    			t3 = space();
    			attr(input, "type", "color");
    			attr(input, "class", "svelte-5n98na");
    			attr(button, "class", "remove svelte-5n98na");
    			attr(button, "data-index", button_data_index_value = /*i*/ ctx[28]);
    			attr(button, "title", "Remove graph");
    			attr(div, "class", "graph-info svelte-5n98na");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, input);
    			set_input_value(input, /*g*/ ctx[24].color);
    			append(div, t0);
    			append(div, span);
    			append(span, t1);
    			append(div, t2);
    			append(div, button);
    			append(div, t3);

    			if (!mounted) {
    				dispose = [
    					listen(input, "input", input_input_handler),
    					listen(button, "click", /*removeGraph*/ ctx[9])
    				];

    				mounted = true;
    			}
    		},
    		p(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*graphs*/ 128) {
    				set_input_value(input, /*g*/ ctx[24].color);
    			}

    			if (dirty & /*graphs*/ 128 && t1_value !== (t1_value = /*g*/ ctx[24].value.toPrecision(3) + "")) set_data(t1, t1_value);
    		},
    		i(local) {
    			if (!div_intro) {
    				add_render_callback(() => {
    					div_intro = create_in_transition(div, fade, { duration: 250, easing: cubicOut });
    					div_intro.start();
    				});
    			}
    		},
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    // (167:1) {#if mode != 1 && global_potential > minE && global_potential < maxE}
    function create_if_block(ctx) {
    	let dataplot;
    	let current;

    	dataplot = new DataPlot({
    			props: {
    				x: [
    					0,
    					/*global_potential*/ ctx[3],
    					/*global_potential*/ ctx[3],
    					/*maxE*/ ctx[1]
    				],
    				y: [0, 0, 1, 1],
    				color: "#999",
    				dash: "10"
    			}
    		});

    	return {
    		c() {
    			create_component(dataplot.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(dataplot, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const dataplot_changes = {};

    			if (dirty & /*global_potential, maxE*/ 10) dataplot_changes.x = [
    				0,
    				/*global_potential*/ ctx[3],
    				/*global_potential*/ ctx[3],
    				/*maxE*/ ctx[1]
    			];

    			dataplot.$set(dataplot_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(dataplot.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(dataplot.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(dataplot, detaching);
    		}
    	};
    }

    // (170:1) {#each graphs as g}
    function create_each_block(ctx) {
    	let dataplot;
    	let current;

    	dataplot = new DataPlot({
    			props: {
    				x: /*xs*/ ctx[6],
    				y: /*g*/ ctx[24].transmissions,
    				color: /*g*/ ctx[24].color
    			}
    		});

    	return {
    		c() {
    			create_component(dataplot.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(dataplot, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const dataplot_changes = {};
    			if (dirty & /*xs*/ 64) dataplot_changes.x = /*xs*/ ctx[6];
    			if (dirty & /*graphs*/ 128) dataplot_changes.y = /*g*/ ctx[24].transmissions;
    			if (dirty & /*graphs*/ 128) dataplot_changes.color = /*g*/ ctx[24].color;
    			dataplot.$set(dataplot_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(dataplot.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(dataplot.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(dataplot, detaching);
    		}
    	};
    }

    // (166:0) <Axis min_x={minE} max_x={maxE} min_y={0} max_y={1}>
    function create_default_slot(ctx) {
    	let t;
    	let each_1_anchor;
    	let current;
    	let if_block = /*mode*/ ctx[5] != 1 && /*global_potential*/ ctx[3] > /*minE*/ ctx[0] && /*global_potential*/ ctx[3] < /*maxE*/ ctx[1] && create_if_block(ctx);
    	let each_value = /*graphs*/ ctx[7];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			if (if_block) if_block.c();
    			t = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert(target, t, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if (/*mode*/ ctx[5] != 1 && /*global_potential*/ ctx[3] > /*minE*/ ctx[0] && /*global_potential*/ ctx[3] < /*maxE*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*mode, global_potential, minE, maxE*/ 43) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(t.parentNode, t);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if (dirty & /*xs, graphs*/ 192) {
    				each_value = /*graphs*/ ctx[7];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(t);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(each_1_anchor);
    		}
    	};
    }

    function create_fragment(ctx) {
    	let div2;
    	let h30;
    	let t1;
    	let div0;
    	let label0;
    	let t3;
    	let input0;
    	let input0_max_value;
    	let t4;
    	let label1;
    	let t6;
    	let input1;
    	let input1_min_value;
    	let t7;
    	let h31;
    	let t9;
    	let select;
    	let option0;
    	let option1;
    	let option2;
    	let t13;
    	let t14;
    	let t15;
    	let t16;
    	let h32;
    	let t17;
    	let input2;
    	let t18;
    	let button;
    	let t19;
    	let div1;
    	let t20;
    	let axis;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block0 = /*mode*/ ctx[5] !== 0 && create_if_block_5(ctx);
    	let if_block1 = /*mode*/ ctx[5] !== 1 && create_if_block_4(ctx);
    	let if_block2 = /*mode*/ ctx[5] !== 2 && create_if_block_3(ctx);

    	function select_block_type(ctx, dirty) {
    		if (/*mode*/ ctx[5] === 0) return create_if_block_1;
    		if (/*mode*/ ctx[5] === 1) return create_if_block_2;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block3 = current_block_type(ctx);
    	let each_value_1 = /*graphs*/ ctx[7];
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	axis = new Axis({
    			props: {
    				min_x: /*minE*/ ctx[0],
    				max_x: /*maxE*/ ctx[1],
    				min_y: 0,
    				max_y: 1,
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			}
    		});

    	return {
    		c() {
    			div2 = element("div");
    			h30 = element("h3");
    			h30.textContent = "Energy values [eV]";
    			t1 = space();
    			div0 = element("div");
    			label0 = element("label");
    			label0.textContent = "Minimum:";
    			t3 = space();
    			input0 = element("input");
    			t4 = space();
    			label1 = element("label");
    			label1.textContent = "Maximum:";
    			t6 = space();
    			input1 = element("input");
    			t7 = space();
    			h31 = element("h3");
    			h31.textContent = "Mode selection";
    			t9 = space();
    			select = element("select");
    			option0 = element("option");
    			option0.textContent = "Multiple barrier widths";
    			option1 = element("option");
    			option1.textContent = "Multiple barrier potentials";
    			option2 = element("option");
    			option2.textContent = "Multiple particle masses";
    			t13 = space();
    			if (if_block0) if_block0.c();
    			t14 = space();
    			if (if_block1) if_block1.c();
    			t15 = space();
    			if (if_block2) if_block2.c();
    			t16 = space();
    			h32 = element("h3");
    			if_block3.c();
    			t17 = space();
    			input2 = element("input");
    			t18 = space();
    			button = element("button");
    			t19 = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t20 = space();
    			create_component(axis.$$.fragment);
    			attr(h30, "class", "svelte-5n98na");
    			attr(label0, "for", "#minE");
    			attr(input0, "type", "number");
    			attr(input0, "id", "minE");
    			attr(input0, "min", "0");
    			input0.value = "0";
    			attr(input0, "max", input0_max_value = /*maxE*/ ctx[1] - .01);
    			attr(input0, "class", "svelte-5n98na");
    			attr(label1, "for", "#maxE");
    			attr(input1, "type", "number");
    			attr(input1, "id", "maxE");
    			attr(input1, "min", input1_min_value = /*minE*/ ctx[0] + .01);
    			input1.value = "15";
    			attr(input1, "class", "svelte-5n98na");
    			attr(div0, "class", "grid2by2 svelte-5n98na");
    			attr(h31, "class", "svelte-5n98na");
    			option0.__value = 0;
    			option0.value = option0.__value;
    			option1.__value = 1;
    			option1.value = option1.__value;
    			option2.__value = 2;
    			option2.value = option2.__value;
    			attr(select, "class", "svelte-5n98na");
    			if (/*mode*/ ctx[5] === void 0) add_render_callback(() => /*select_change_handler*/ ctx[14].call(select));
    			attr(h32, "class", "svelte-5n98na");
    			attr(input2, "type", "number");
    			attr(input2, "min", "0");
    			attr(input2, "class", "svelte-5n98na");
    			attr(button, "class", "add svelte-5n98na");
    			attr(div1, "class", "legends svelte-5n98na");
    			attr(div2, "class", "inputs svelte-5n98na");
    		},
    		m(target, anchor) {
    			insert(target, div2, anchor);
    			append(div2, h30);
    			append(div2, t1);
    			append(div2, div0);
    			append(div0, label0);
    			append(div0, t3);
    			append(div0, input0);
    			append(div0, t4);
    			append(div0, label1);
    			append(div0, t6);
    			append(div0, input1);
    			append(div2, t7);
    			append(div2, h31);
    			append(div2, t9);
    			append(div2, select);
    			append(select, option0);
    			append(select, option1);
    			append(select, option2);
    			select_option(select, /*mode*/ ctx[5]);
    			append(div2, t13);
    			if (if_block0) if_block0.m(div2, null);
    			append(div2, t14);
    			if (if_block1) if_block1.m(div2, null);
    			append(div2, t15);
    			if (if_block2) if_block2.m(div2, null);
    			append(div2, t16);
    			append(div2, h32);
    			if_block3.m(h32, null);
    			append(div2, t17);
    			append(div2, input2);
    			/*input2_binding*/ ctx[18](input2);
    			append(div2, t18);
    			append(div2, button);
    			append(div2, t19);
    			append(div2, div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			insert(target, t20, anchor);
    			mount_component(axis, target, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					action_destroyer(forceBounds.call(null, input0)),
    					listen(input0, "safe-change", /*safe_change_handler*/ ctx[12]),
    					action_destroyer(forceBounds.call(null, input1)),
    					listen(input1, "safe-change", /*safe_change_handler_1*/ ctx[13]),
    					listen(select, "change", /*select_change_handler*/ ctx[14]),
    					listen(input2, "keydown", /*onEnter*/ ctx[11]),
    					listen(button, "click", /*add*/ ctx[10])
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (!current || dirty & /*maxE*/ 2 && input0_max_value !== (input0_max_value = /*maxE*/ ctx[1] - .01)) {
    				attr(input0, "max", input0_max_value);
    			}

    			if (!current || dirty & /*minE*/ 1 && input1_min_value !== (input1_min_value = /*minE*/ ctx[0] + .01)) {
    				attr(input1, "min", input1_min_value);
    			}

    			if (dirty & /*mode*/ 32) {
    				select_option(select, /*mode*/ ctx[5]);
    			}

    			if (/*mode*/ ctx[5] !== 0) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_5(ctx);
    					if_block0.c();
    					if_block0.m(div2, t14);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*mode*/ ctx[5] !== 1) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_4(ctx);
    					if_block1.c();
    					if_block1.m(div2, t15);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*mode*/ ctx[5] !== 2) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_3(ctx);
    					if_block2.c();
    					if_block2.m(div2, t16);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if_block3.d(1);
    				if_block3 = current_block_type(ctx);

    				if (if_block3) {
    					if_block3.c();
    					if_block3.m(h32, null);
    				}
    			}

    			if (dirty & /*removeGraph, graphs*/ 640) {
    				each_value_1 = /*graphs*/ ctx[7];
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}

    			const axis_changes = {};
    			if (dirty & /*minE*/ 1) axis_changes.min_x = /*minE*/ ctx[0];
    			if (dirty & /*maxE*/ 2) axis_changes.max_x = /*maxE*/ ctx[1];

    			if (dirty & /*$$scope, graphs, xs, global_potential, maxE, mode, minE*/ 536871147) {
    				axis_changes.$$scope = { dirty, ctx };
    			}

    			axis.$set(axis_changes);
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			transition_in(axis.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(axis.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div2);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if_block3.d();
    			/*input2_binding*/ ctx[18](null);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(t20);
    			destroy_component(axis, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    function forceBounds(node) {
    	function change(e) {
    		const t = e.target;
    		var v = +t.value;
    		if (v < +t.min) t.value = v = +t.min; else if (t.max && v > +t.max) t.value = v = +t.max;
    		t.dispatchEvent(new CustomEvent("safe-change", { detail: v }));
    	}

    	node.addEventListener("change", change);

    	return {
    		destroy() {
    			node.removeEventListener("change", change);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let xs;
    	let minE = 0;

    	/** maximum Energy [eV] */
    	let maxE = 15;

    	/** barrier width [A]*/
    	let global_length = 3;

    	/** barrier poential [eV] */
    	let global_potential = 5;

    	/** particle mass in terms of electron mass */
    	let global_mass = 1;

    	/**
     * Input mode: \
     * 0 - fixed V0 and m \
     * 1 - fixed l and m \
     * 2 - fixed l and V0
     */
    	let mode = 0;

    	/**@type {{color: string, value: number, transmissions: number[]}[]}*/
    	let graphs = [];

    	/**
     * @param {number} pot barrier potential
     * @param {number} length
     * @param {number} mass
     * @param {number[]} arr
     * @returns {number[]}
     */
    	function calculate(pot, length, mass, arr) {
    		if (!arr) arr = new Array(500);
    		pot *= eV2Ry;
    		length *= A2au;
    		var i = 0;
    		const pot_index = xs.indexOf(pot);

    		if (pot_index !== -1) {
    			for (; i < pot_index; i++) arr[i] = transmission(xs[i] * eV2Ry, pot, length, mass);
    			arr[pot_index] = transmission_pot(pot, length, mass);
    			i = pot_index + 1;
    		}

    		for (; i < 500; i++) arr[i] = transmission(xs[i] * eV2Ry, pot, length, mass);
    		return arr;
    	}

    	const evaluators = [
    		(len, arr) => calculate(global_potential, len, global_mass, arr),
    		(pot, arr) => calculate(pot, global_length, global_mass, arr),
    		(mass, arr) => calculate(global_potential, global_length, mass, arr)
    	];

    	function removeGraph(e) {
    		const i = +e.target.getAttribute('data-index');
    		graphs.splice(i, 1);
    		($$invalidate(7, graphs), $$invalidate(5, mode));
    	}

    	function updateGraphs() {
    		const LEN = graphs.length;
    		for (var i = 0; i < LEN; i++) $$invalidate(7, graphs[i].transmissions = evaluators[mode](graphs[i].value, graphs[i].transmissions), graphs);
    	}

    	function addGraph(v) {
    		graphs.push({
    			value: v,
    			transmissions: evaluators[mode](v),
    			color: randomColor()
    		});

    		($$invalidate(7, graphs), $$invalidate(5, mode));
    	}

    	let currentInput;

    	function add() {
    		const v = +currentInput.value;
    		$$invalidate(8, currentInput.value = '', currentInput);
    		if (v > 0) addGraph(v);
    	}

    	/**@param {KeyboardEvent} e*/
    	function onEnter(e) {
    		if (e.key === "Enter") add();
    	}

    	const safe_change_handler = e => $$invalidate(0, minE = e.detail);
    	const safe_change_handler_1 = e => $$invalidate(1, maxE = e.detail);

    	function select_change_handler() {
    		mode = select_value(this);
    		$$invalidate(5, mode);
    	}

    	function input_change_input_handler() {
    		global_length = to_number(this.value);
    		$$invalidate(2, global_length);
    	}

    	function input_change_input_handler_1() {
    		global_potential = to_number(this.value);
    		$$invalidate(3, global_potential);
    	}

    	function select_change_handler_1() {
    		global_mass = select_value(this);
    		$$invalidate(4, global_mass);
    	}

    	function input2_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			currentInput = $$value;
    			$$invalidate(8, currentInput);
    		});
    	}

    	function input_input_handler(each_value_1, i) {
    		each_value_1[i].color = this.value;
    		($$invalidate(7, graphs), $$invalidate(5, mode));
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*mode*/ 32) {
    			mode + 1 && $$invalidate(7, graphs = []);
    		}

    		if ($$self.$$.dirty & /*minE, maxE*/ 3) {
    			$$invalidate(6, xs = new LinearSpace(minE, maxE, 500, minE == 0));
    		}

    		if ($$self.$$.dirty & /*xs, global_length, global_potential, global_mass*/ 92) {
    			(xs || global_length || global_potential || global_mass) && updateGraphs();
    		}
    	};

    	return [
    		minE,
    		maxE,
    		global_length,
    		global_potential,
    		global_mass,
    		mode,
    		xs,
    		graphs,
    		currentInput,
    		removeGraph,
    		add,
    		onEnter,
    		safe_change_handler,
    		safe_change_handler_1,
    		select_change_handler,
    		input_change_input_handler,
    		input_change_input_handler_1,
    		select_change_handler_1,
    		input2_binding,
    		input_input_handler
    	];
    }

    class App$1 extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance, create_fragment, safe_not_equal, {});
    	}
    }

    var App = new App$1({target: document.body});

    return App;

})();
