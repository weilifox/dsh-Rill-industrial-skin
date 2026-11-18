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

  // Harvest the palette picker from the same tree the counter walks, so a new
  // palette that never reaches the UI fails here instead of silently missing.
  const names = [];
  (function harvest(n) {
    if (n == null || n === false) return;
    if (Array.isArray(n)) return n.forEach(harvest);
    if (typeof n === 'object' && n.props) {
      if (n.props.className === 'rill-swatch__name') {
        const txt = (n.children || []).flat(4).filter((c) => typeof c === 'string' || typeof c === 'number');
        names.push(txt.join('') || '(empty)');
        return;
      }
      // Children live on the node (the stub passes them as extra args), so no
      // need to re-invoke function components — walking children already covers
      // what they rendered.
    }
    (n.children || []).forEach(harvest);
  })(tree);

  console.log('palettes in picker (' + names.length + '):', names.join(' / '));
  if (names.length !== 6) {
    console.log('MISMATCH: expected 6 palettes, got ' + names.length);
    process.exitCode = 1;
  } else {
    console.log('palette picker OK');
  }
} catch (e) {
  console.log('RENDER THREW:', e && e.message);
  console.log(e && e.stack && e.stack.split('\n').slice(0, 5).join('\n'));
}
