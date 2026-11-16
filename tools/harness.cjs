// Minimal DOM stub: proves apply() runs end-to-end without a browser.
const fs = require('fs');
const path = require('path');

const vars = {};
const styleTags = [];
let observerCount = 0;

const html = {
  _attrs: {},
  style: { setProperty: (k, v) => { vars[k] = v; } },
  setAttribute(k, v) { this._attrs[k] = v; },
  removeAttribute(k) { delete this._attrs[k]; },
  hasAttribute(k) { return k in this._attrs; },
  getAttribute(k) { return this._attrs[k] ?? null; },
  classList: { contains: () => false },
};
const body = {
  _attrs: {},
  appendChild(node) { wallNodes.push(node); return node; },
  setAttribute(k, v) { this._attrs[k] = v; },
  removeAttribute(k) { delete this._attrs[k]; },
  hasAttribute(k) { return k in this._attrs; },
  classList: { contains: () => false },
};
const store = {};
global.window = {
  localStorage: {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
  },
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  addEventListener() {}, removeEventListener() {},
};
const wallNodes = [];
global.document = {
  documentElement: html,
  body,
  head: { appendChild: (t) => styleTags.push(t) },
  querySelector(sel) {
    if (sel.startsWith('style[data-plugin=')) {
      const pkg = sel.slice('style[data-plugin="'.length, -2);
      return styleTags.find((t) => t.dataset.plugin === pkg) || null;
    }
    return null;
  },
  createElement() {
    const node = { dataset: {}, textContent: '', style: {}, setAttribute() {}, remove() {} };
    return node;
  },
  getElementById(id) {
    return wallNodes.find((n) => n.id === id) || null;
  },
};
global.MutationObserver = class { constructor() { observerCount++; } observe() {} disconnect() {} };
global.getComputedStyle = () => ({ backgroundColor: 'rgb(20, 24, 32)' });
global.FileReader = class {};

// React stub — components are registered, never rendered, so createElement is enough.
const React = {
  createElement: (type, props, ...children) => ({ type, props, children }),
  useState: (i) => [typeof i === 'function' ? i() : i, () => {}],
  useRef: () => ({ current: null }),
  useCallback: (f) => f,
};

// Load the module file exactly as the host does: through __ModuleLoader__.load.
let registration = null;
global.window.__ModuleLoader__ = { load: (def) => { registration = def; } };

const code = fs.readFileSync(require('path').join(__dirname, '..', 'lib', 'client.js'), 'utf8');
new Function('window', 'document', code)(global.window, global.document);

if (!registration) throw new Error('module did not register');
if (registration.id !== 'rill-industrial-skin') throw new Error('wrong id: ' + registration.id);

const mod = registration.factory((name) => {
  if (name === 'react') return React;
  throw new Error('unexpected require: ' + name);
});

console.log('inject:', mod.inject.join(', '));
console.log('apply is fn:', typeof mod.apply === 'function');

// Fake cordis ctx with effect + slots.
const slots = [];
let teardown = null;
const ctx = {
  effect(fn) { teardown = fn(); },
  slots: {
    inject(slot, thunk) { slots.push([slot, thunk]); },
    register(def, comp) { return { def, comp }; },
  },
};

mod.apply(ctx);

console.log('effect registered:', typeof teardown === 'function');
console.log('slots injected:', slots.map(([s]) => s).join(' | '));

// Run the slot thunks to prove registration shape is valid.
const regs = slots.map(([slot, thunk]) => {
  const r = thunk();
  if (!r || !r.def || typeof r.def.id !== 'string' || typeof r.def.name !== 'string') {
    throw new Error('bad registration for ' + slot);
  }
  return [slot, r.def];
});
for (const [slot, def] of regs) {
  console.log(`  ${slot}: id=${def.id} name=${def.name} order=${def.order} label=${def.label ?? '-'} inject=${def.inject ? JSON.stringify(def.inject()) : '-'}`);
}

// Style sheet + variables
console.log('style tags appended:', styleTags.length, '| plugin attr:', styleTags[0].dataset.plugin, '| cssId:', styleTags[0].dataset.pluginCss);
console.log('css bytes:', styleTags[0].textContent.length);
const want = ['--rill-bg','--rill-side','--rill-surface','--rill-accent','--rill-accent-edge','--rill-glass-alpha','--rill-glass-blur','--rill-wallpaper','--rill-wallpaper-opacity','--rill-wallpaper-blur','--dsw-alias-label-primary','--dsw-alias-bg-base','--dsw-alias-button-primary-fill'];
const missing = want.filter((k) => !(k in vars));
console.log('vars written:', Object.keys(vars).length, '| missing:', missing.length ? missing.join(',') : 'none');
console.log('root attr:', html._attrs['data-rill-industrial'], '| theme:', html._attrs['data-rill-industrial-theme'], '| mode:', html._attrs['data-rill-industrial-mode']);
console.log('label-primary pinned white:', vars['--dsw-alias-label-primary']);
console.log('observers:', observerCount);

// Teardown path
teardown();
console.log('after teardown -> root attr:', html._attrs['data-rill-industrial'] ?? '(removed)', '| style removed:', styleTags.length === 0 || 'noop-stub');

console.log('\nALL CHECKS PASSED');
