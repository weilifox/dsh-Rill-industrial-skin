const fs = require('fs');
const path = require('path').join(__dirname, '..', 'lib', 'client.js');
const code = fs.readFileSync(path, 'utf8');

const store = {};
const localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
};
const win = {
  localStorage, innerWidth: 1400, innerHeight: 900,
  matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }),
  addEventListener() {}, removeEventListener() {},
  setTimeout: (f, m) => 0, clearTimeout: () => {},
  Image: function () {},
  __RILL_ERROR__: null,
};
const bodyEl = { attributes: {}, hasAttribute: () => false, getAttribute: () => null, setAttribute() {}, removeAttribute() {}, appendChild() {}, style: {}, classList: { contains: () => false } };
const headEl = { appendChild() {}, };
const doc = {
  documentElement: { setAttribute() {}, removeAttribute() {}, hasAttribute: () => true, style: { setProperty() {} }, getAttribute: () => null, classList: { contains: () => false } },
  body: bodyEl, head: headEl,
  createElement: () => ({ dataset: {}, style: {}, setAttribute() {}, appendChild() {} }),
  querySelector: () => null, querySelectorAll: () => [],
  getElementById: () => null,
};

// minimal React that actually runs function components
const React = {
  createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
  useState: (init) => [typeof init === 'function' ? init() : init, () => {}],
  useRef: (v) => ({ current: v }),
  useCallback: (fn) => fn,
  useMemo: (fn) => fn(),
  useEffect: () => {},
  Fragment: 'Fragment',
};

global.MutationObserver = class { observe(){} disconnect(){} };
let reg = null;
global.window = win; global.document = doc;
win.__ModuleLoader__ = { load: (r) => { reg = r; } };
new Function('window', 'document', code)(win, doc);
const mod = reg.factory((id) => (id === 'react' ? React : {}));
const slots = [];
const ctx = {
  effect: (fn) => { fn(); return () => {}; },
  slots: { inject: (k, cb) => cb(), register: (spec, comp) => { slots.push({ spec, comp }); return () => {}; } },
  on: () => {}, emit: () => {}, logger: console,
};
mod.apply(ctx);
const target = slots.find((s) => s.spec.name === 'settings.section');
if (!target) { console.log('NO SETTINGS SLOT', slots.map(s=>s.spec.name)); process.exit(1); }
try {
  const tree = target.comp({});
  // walk and count
  let nodes = 0;
  (function walk(n) {
    if (n == null || n === false) return;
    nodes += 1;
    if (Array.isArray(n)) return n.forEach(walk);
    if (typeof n.type === 'function') { walk(n.type(n.props)); return; }
    (n.children || []).forEach(walk);
  })(tree);
  console.log('RENDER OK, nodes =', nodes);
  console.log('top class:', tree.props && tree.props.className);
  console.log('children count:', (tree.children||[]).length);
} catch (e) {
  console.log('RENDER THREW:', e && e.message);
  console.log(e && e.stack && e.stack.split('\n').slice(0, 5).join('\n'));
}
