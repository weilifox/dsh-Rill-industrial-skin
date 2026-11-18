#!/usr/bin/env node
/**
 * Palette verifier — paints every palette in both appearances and prints the
 * colour variables that actually reach <html>.
 *
 * tools/harness.cjs proves variables *exist*; this proves their *values*, and
 * specifically that a palette which does not declare `accent2` still gets
 * exactly the accent-derived send-key colour it had before (so adding a new
 * palette cannot drift the existing five).
 *
 *   node tools/verify-palettes.cjs
 *
 * Exit code 1 on any value mismatch or if a palette throws while painting.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const CLIENT = path.join(__dirname, '..', 'lib', 'client.js');
const PKG = path.join(__dirname, '..', 'package.json');
const code = fs.readFileSync(CLIENT, 'utf8');
const version = JSON.parse(fs.readFileSync(PKG, 'utf8')).version;

const STORE_KEY = 'rill-industrial-skin:settings:v1';
const THEMES = ['indigo', 'celadon', 'tealorange', 'deepblue', 'rose', 'violet'];
const MODES = ['dark', 'light'];

/** Run client.js in a fresh stub world with one settings object, return the vars. */
function paintWorld(theme, mode) {
  const vars = {};
  const styleTags = [];
  const wallNodes = [];
  const store = { [STORE_KEY]: JSON.stringify({ theme, mode, enabled: true }) };

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
    style: { setProperty: (k, v) => { vars[k] = v; } },
    appendChild: (n) => { wallNodes.push(n); return n; },
    setAttribute(k, v) { this._attrs[k] = v; },
    removeAttribute(k) { delete this._attrs[k]; },
    hasAttribute(k) { return k in this._attrs; },
    classList: { contains: () => false },
  };
  const win = {
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
    },
    matchMedia: () => ({ matches: mode === 'dark', addEventListener() {}, removeEventListener() {} }),
    addEventListener() {}, removeEventListener() {},
  };
  const doc = {
    documentElement: html,
    body,
    head: { appendChild: (t) => styleTags.push(t) },
    querySelector(sel) {
      if (sel.startsWith('style[data-plugin=')) {
        const p = sel.slice('style[data-plugin="'.length, -2);
        return styleTags.find((t) => t.dataset.plugin === p) || null;
      }
      return null;
    },
    querySelectorAll: () => [],
    createElement() {
      return { dataset: {}, textContent: '', style: {}, setAttribute() {}, remove() {}, appendChild() {} };
    },
    getElementById: (id) => wallNodes.find((n) => n.id === id) || null,
    createTextNode: (t) => ({ text: t }),
  };

  const React = {
    createElement: (type, props, ...children) => ({ type, props, children }),
    useState: (i) => [typeof i === 'function' ? i() : i, () => {}],
    useRef: () => ({ current: null }),
    useCallback: (f) => f,
    useEffect: () => {},
    useMemo: (f) => (typeof f === 'function' ? f() : f),
  };

  let registration = null;
  win.__ModuleLoader__ = { load: (def) => { registration = def; } };

  // Isolated function scope: every call gets its own copy of the module state.
  new Function('window', 'document', 'MutationObserver', 'getComputedStyle', 'FileReader', 'Image', code)(
    win, doc,
    class { constructor() {} observe() {} disconnect() {} },
    () => ({ backgroundColor: 'rgb(20, 24, 32)' }),
    class {},
    function () { this.onload = null; this.onerror = null; },
  );
  if (!registration) throw new Error('client.js did not register (theme=' + theme + ')');

  const mod = registration.factory((name) => {
    if (name === 'react') return React;
    if (name.startsWith('@deepseek-ai/') || name === 'cordis') return {};
    throw new Error('unexpected require: ' + name);
  });

  const slots = [];
  let teardown = null;
  mod.apply({
    effect(fn) { teardown = fn(); },
    slots: { inject(slot, thunk) { slots.push([slot, thunk]); }, register(def) { return { def }; } },
  });
  // Snapshot BEFORE teardown: unpaint clears the root attributes by design.
  const snapshot = { vars: { ...vars }, attrs: { ...html._attrs } };
  if (teardown) { try { teardown(); } catch {} }
  return { ...snapshot, slots, version: mod.version || version };
}

const hex = (v) => {
  if (!v) return '—';
  const m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/.exec(v);
  if (!m) return String(v).slice(0, 24);
  return '#' + [1, 2, 3].map((i) => Math.round(+m[i]).toString(16).padStart(2, '0')).join('').toUpperCase();
};

const COLS = [
  ['--rill-bg', 'bg'], ['--rill-side', 'side'], ['--rill-surface', 'surf'],
  ['--rill-surface-2', 'surf2'], ['--rill-accent', 'accent'],
  ['--rill-accent2', 'accent2'], ['--rill-key-ink', 'keyInk'],
];

console.log('client version: ' + version);
let failures = 0;

for (const mode of MODES) {
  console.log('\n=== ' + mode + ' ===');
  console.log('palette'.padEnd(12) + COLS.map(([, l]) => l.padEnd(9)).join(''));
  for (const theme of THEMES) {
    let r;
    try {
      r = paintWorld(theme, mode);
    } catch (e) {
      console.log(theme.padEnd(12) + 'THREW: ' + e.message);
      failures++;
      continue;
    }
    const v = r.vars;
    console.log(theme.padEnd(12) + COLS.map(([k]) => hex(v[k]).padEnd(9)).join(''));
    // the theme actually reached the root attribute
    if (r.attrs['data-rill-industrial-theme'] !== theme) {
      console.log('  ! root theme attr is', r.attrs['data-rill-industrial-theme']);
      failures++;
    }
    // accent2 must fall back to accent exactly where it was not declared
    const declared = theme === 'violet';
    const same = v['--rill-accent2'] === v['--rill-accent'];
    const inkOk = declared ? hex(v['--rill-key-ink']).toUpperCase() === '#0D1420'
                           : hex(v['--rill-key-ink']).toUpperCase() === '#FFFFFF';
    if (declared === same) {
      console.log('  ! accent2 should ' + (declared ? 'differ from' : 'equal') + ' accent — got ' +
                  hex(v['--rill-accent2']) + ' vs ' + hex(v['--rill-accent']));
      failures++;
    }
    if (!inkOk) { console.log('  ! key ink unexpected:', hex(v['--rill-key-ink'])); failures++; }
  }
}

if (failures) { console.log('\nFAILED — ' + failures + ' problem(s)'); process.exit(1); }
console.log('\nOK — six palettes x two appearances painted; accent2 falls back to accent wherever not declared');
