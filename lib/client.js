/**
 * dsh-rill-industrial-skin — browser half.
 *
 * Industrial-electronics skin for DeepSeek Harness.
 *
 *   · workspace chrome : deep blue, fully rectilinear, adjustable opacity
 *   · type             : white, always — palettes never touch text colour
 *   · brand            : whale glyph + rectilinear DEEPSEEK wordmark, top-left
 *   · appearance       : follows the light / dark system preference
 *   · wallpaper        : user image, adjustable opacity and blur
 *   · conversation     : right-angle frosted glass, adjustable opacity
 *   · send key         : raised square button with a real pressed state
 *   · palettes         : 黛蓝 / 宋青 / 橙青 / 深蓝 / 粉霞 / 暮紫 (all desaturated)
 *
 * Everything is plain DOM + React: one injected <style>, a handful of CSS
 * variables, two slot registrations. Settings live in localStorage so the
 * bundle never couples to a particular DSH release's config plane.
 */
window.__ModuleLoader__.load({
  id: 'dsh-rill-industrial-skin',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    /* ────────────────────────────────────────────────────────────── constants */

    const PKG = 'dsh-rill-industrial-skin';
    const CSS_ID = 'skin';
    const ROOT_ATTR = 'data-rill-industrial';
    const WALL_ID = 'rill-industrial-wall';
  const CHROME_ATTR = 'data-rill-chrome';
    // 存储键故意不跟随包名：改名后老用户的主题/壁纸设置不会丢
    const STORE_KEY = 'rill-industrial-skin:settings:v1';
    const VERSION = '1.2.4';

    /**
     * Palettes are authored as RGB triples so every derived shade (hover,
     * edge, wash) can be computed instead of hand-tuned. `bg` is the workspace
     * field, `side` the rails, `surf`/`surf2` the raised panels.
     *
     * `light` is not a pale tint: the skin keeps white type in both
     * appearances, so the light appearance uses a mid-dark field (L≈45%) and
     * only lifts the surfaces — that is what keeps contrast above 4.5:1.
     */
    const THEMES = {
      indigo: {
        name: '黛蓝',
        en: 'Indigo',
        accent: { dark: [138, 168, 214], light: [178, 203, 238] },
        dark: { bg: [15, 22, 34], side: [11, 17, 27], surf: [24, 34, 48], surf2: [33, 45, 62] },
        light: { bg: [51, 68, 92], side: [43, 58, 80], surf: [62, 81, 108], surf2: [76, 97, 128] },
      },
      celadon: {
        name: '宋青',
        en: 'Celadon',
        accent: { dark: [124, 190, 176], light: [162, 214, 202] },
        dark: { bg: [12, 30, 33], side: [9, 23, 26], surf: [20, 42, 45], surf2: [28, 55, 59] },
        light: { bg: [42, 76, 78], side: [35, 65, 67], surf: [53, 92, 94], surf2: [66, 110, 112] },
      },
      tealorange: {
        name: '橙青',
        en: 'Teal & Orange',
        accent: { dark: [226, 158, 92], light: [240, 180, 118] },
        dark: { bg: [10, 30, 32], side: [8, 23, 25], surf: [18, 43, 45], surf2: [26, 56, 58] },
        light: { bg: [35, 78, 80], side: [29, 67, 69], surf: [45, 95, 97], surf2: [58, 113, 115] },
      },
      deepblue: {
        name: '深蓝',
        en: 'Deep Blue',
        accent: { dark: [116, 154, 226], light: [152, 184, 244] },
        dark: { bg: [9, 16, 30], side: [6, 12, 24], surf: [17, 27, 47], surf2: [25, 38, 62] },
        light: { bg: [38, 56, 92], side: [31, 47, 79], surf: [47, 68, 107], surf2: [60, 84, 127] },
      },
      rose: {
        name: '粉霞',
        en: 'Rose Haze',
        accent: { dark: [216, 150, 174], light: [236, 178, 198] },
        dark: { bg: [30, 18, 30], side: [23, 13, 23], surf: [44, 27, 43], surf2: [57, 36, 55] },
        light: { bg: [88, 54, 74], side: [76, 45, 64], surf: [104, 66, 88], surf2: [122, 80, 104] },
      },
      /* Sampled from the Wuthering Waves splash (indigo ground, lavender figure,
         teal call-to-action) then pulled to hue 252 so it reads violet rather
         than navy — 深蓝 sits at 210-216. accent2 is the teal: it only ever
         touches things you can click. */
      violet: {
        name: '暮紫',
        en: 'Dusk Violet',
        accent: { dark: [156, 141, 214], light: [196, 184, 238] },
        accent2: { dark: [108, 194, 188], light: [140, 208, 202] },
        dark: { bg: [32, 28, 62], side: [22, 19, 44], surf: [46, 40, 87], surf2: [62, 54, 114] },
        light: { bg: [56, 48, 98], side: [44, 37, 80], surf: [70, 60, 120], surf2: [90, 78, 148] },
      },
    };

    const THEME_ORDER = ['indigo', 'celadon', 'tealorange', 'deepblue', 'rose', 'violet'];

    const DEFAULTS = {
      theme: 'indigo',
      enabled: true,
      mode: 'auto', // auto | light | dark
      surfaceAlpha: 0.9, // legacy single dial (kept for stored settings)
      alphaSide: 0.9, // left rail
      alphaRight: 0.9, // right rail
      alphaBottom: 0.9, // bottom strip
      alphaHeader: 1, // conversation header strip
      glassAlpha: 0.55, // conversation card opacity
      glassBlur: 18, // conversation card blur (px)
      wallpaper: '', // data URL | http(s) URL | CSS gradient
      wallpaperOpacity: 0.6,
      wallpaperBlur: 6,
      scanlines: true,
    };

    /* ──────────────────────────────────────────────────────────── small utils */

    const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
    const tri = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;
    const triA = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
    const mix = (a, b, t) => [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t),
    ];
    const shade = (c, k) => [Math.round(c[0] * k), Math.round(c[1] * k), Math.round(c[2] * k)];

    function readStore() {
      try {
        const raw = window.localStorage.getItem(STORE_KEY);
        if (!raw) return { ...DEFAULTS };
        const parsed = JSON.parse(raw);
        return { ...DEFAULTS, ...(parsed && typeof parsed === 'object' ? parsed : {}) };
      } catch {
        return { ...DEFAULTS };
      }
    }

    function writeStore(patch) {
      const next = { ...readStore(), ...patch };
      try {
        window.localStorage.setItem(STORE_KEY, JSON.stringify(next));
      } catch {
        /* quota / private mode: keep the live look, drop persistence */
      }
      return next;
    }

    /** `auto` defers to the host marker; explicit values win over it. */
    function resolveMode(settings) {
      if (settings.mode === 'light' || settings.mode === 'dark') return settings.mode;
      const body = document.body;
      const html = document.documentElement;
      const isDark =
        body.hasAttribute('data-ds-dark-theme') ||
        html.hasAttribute('data-ds-dark-theme') ||
        body.classList.contains('dark') ||
        document.documentElement.getAttribute('data-theme') === 'dark';
      if (isDark) return 'dark';
      // No host marker at all: fall back to the OS preference.
      const bodyBg = getComputedStyle(body).backgroundColor;
      const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(bodyBg || '');
      if (m) {
        const lum = (0.2126 * +m[1] + 0.7152 * +m[2] + 0.0722 * +m[3]) / 255;
        return lum < 0.5 ? 'dark' : 'light';
      }
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches
        ? 'light'
        : 'dark';
    }

    /* ────────────────────────────────────────────────────────────── stylesheet */

    const CSS = `
/* ══════════════════════════════════════════════════════════════════════════
   dsh-rill-industrial-skin
   Every rule is gated on html[${ROOT_ATTR}="on"], so disabling the plugin
   (or a host that never loads it) leaves the stock theme untouched.
   ══════════════════════════════════════════════════════════════════════════ */

html[${ROOT_ATTR}="on"] {
  color-scheme: dark;
  background-color: var(--rill-canvas, var(--rill-bg)) !important;
  /* The canvas carries the wallpaper as well as the fixed layer: the canvas is
     painted first no matter what stacking context the shell builds, so a
     translucent chrome cannot hide the image from here. */


  /* ── type: constant white, never palette-derived ───────────────────── */
  --rill-ink: #ffffff;
  --rill-ink-2: rgba(255, 255, 255, 0.72);
  --rill-ink-3: rgba(255, 255, 255, 0.46);

  /* ── DSH alias tokens: structure ───────────────────────────────────── */
  --dsw-alias-bg-base: var(--rill-bg) !important;
  --dsw-alias-bg-layer-1: var(--rill-field) !important;
  --dsw-alias-bg-layer-2: var(--rill-surface) !important;
  --dsw-alias-bg-overlay: var(--rill-surface-2) !important;
  --dsw-alias-border-l1: var(--rill-line) !important;
  --dsw-alias-border-l2: var(--rill-line-strong) !important;
  --dsw-alias-brand-primary: var(--rill-accent) !important;
  --dsw-specific-sidebar-fill: var(--rill-side) !important;
  --dsw-specific-input-major: var(--rill-surface-2) !important;
  --dsw-input-solid: var(--rill-surface-2) !important;

  /* ── DSH alias tokens: text (pinned white) ─────────────────────────── */
  --dsw-alias-label-primary: var(--rill-ink) !important;
  --dsw-alias-label-secondary: var(--rill-ink-2) !important;
  --dsw-alias-label-tertiary: var(--rill-ink-3) !important;
  --dsw-alias-state-idle-primary: var(--rill-ink-3) !important;
  --dsw-alias-state-idle-secondary: var(--rill-ink-3) !important;

  /* ── DSH alias tokens: interaction ─────────────────────────────────── */
  --dsw-alias-button-primary-fill: var(--rill-accent) !important;
  --dsw-alias-button-primary-hover: var(--rill-accent-strong) !important;
  --dsw-alias-button-info-fill: var(--rill-surface-2) !important;
  --dsw-alias-button-info-hover: var(--rill-accent) !important;
  --dsw-alias-interactive-bg-hover: var(--rill-accent-wash, rgba(255, 255, 255, 0.09)) !important;
  --dsw-alias-interactive-bg-active: var(--rill-accent-soft, rgba(255, 255, 255, 0.16)) !important;
  --dsw-specific-sidebar-nav-item-active: var(--rill-accent-wash, rgba(255, 255, 255, 0.1)) !important;
}

/* The design platform declares every --dsw-alias-* token on **body**, not on
   :root. Declaring ours only on html therefore never wins: body re-declares the
   token and the whole subtree inherits body's value, which is why the palette
   silently did nothing. The mapping is applied on body as well, with the same
   !important, so html[data-rill-industrial] body outranks body[data-ds-dark-theme]. */
html[${ROOT_ATTR}="on"] body {
  --dsw-alias-bg-base: var(--rill-bg) !important;
  --dsw-alias-bg-layer-1: var(--rill-field) !important;
  --dsw-alias-bg-layer-2: var(--rill-surface) !important;
  --dsw-alias-bg-overlay: var(--rill-surface-2) !important;
  --dsw-alias-border-l1: var(--rill-line) !important;
  --dsw-alias-border-l2: var(--rill-line-strong) !important;
  --dsw-alias-brand-primary: var(--rill-accent) !important;
  --dsw-specific-sidebar-fill: var(--rill-side) !important;
  --dsw-specific-input-major: var(--rill-surface-2) !important;
  --dsw-input-solid: var(--rill-surface-2) !important;
  --dsw-alias-label-primary: var(--rill-ink) !important;
  --dsw-alias-label-secondary: var(--rill-ink-2) !important;
  --dsw-alias-label-tertiary: var(--rill-ink-3) !important;
  --dsw-alias-state-idle-primary: var(--rill-ink-3) !important;
  --dsw-alias-state-idle-secondary: var(--rill-ink-3) !important;
  --dsw-alias-button-primary-fill: var(--rill-accent) !important;
  --dsw-alias-button-primary-hover: var(--rill-accent-strong) !important;
  --dsw-alias-button-info-fill: var(--rill-surface-2) !important;
  --dsw-alias-button-info-hover: var(--rill-accent) !important;
  --dsw-alias-interactive-bg-hover: var(--rill-accent-wash, rgba(255, 255, 255, 0.09)) !important;
  --dsw-alias-interactive-bg-active: var(--rill-accent-soft, rgba(255, 255, 255, 0.16)) !important;
  --dsw-specific-sidebar-nav-item-active: var(--rill-accent-wash, rgba(255, 255, 255, 0.1)) !important;
}

/* ── right angles, everywhere ───────────────────────────────────────────
   Explicit reset instead of a blanket \`all: unset\`: the industrial look is
   about chrome, not about discarding the host's own layout engine. */
html[${ROOT_ATTR}="on"] *,
html[${ROOT_ATTR}="on"] *::before,
html[${ROOT_ATTR}="on"] *::after {
  border-radius: 0 !important;
}
html[${ROOT_ATTR}="on"] * {
  text-shadow: none !important;
}

/* ── wallpaper: its own fixed layer, independent of any host background ── */
html[${ROOT_ATTR}="on"] body {
  background-color: transparent !important;
  background-image: none !important;
}
/* The wallpaper is a real fixed element rather than a body pseudo-element:
   a negative-z pseudo can end up behind a stacking context the shell created,
   which is exactly how "I picked a wallpaper and nothing happened" happens.
   Sitting at z-index 1 with the app root lifted to 2 keeps it above the canvas
   and below every piece of chrome, whatever the shell paints. */
#${WALL_ID} {
  position: fixed;
  inset: -8px;
  z-index: 1;
  pointer-events: none;
  background-position: center center;
  background-size: cover;
  background-repeat: no-repeat;
  transition: opacity 240ms ease, filter 240ms ease;
}
html[${ROOT_ATTR}="on"] #root {
  position: relative;
  z-index: 2;
}
/* instrument-panel grain, painted into the wallpaper layer so it can never
   seal the image off */
#${WALL_ID}[data-grain="1"] {
  background-blend-mode: normal, overlay, normal;
}

/* ── rails ─────────────────────────────────────────────────────────────── */
html[${ROOT_ATTR}="on"] [data-slot="sidebar"] {
  background-color: var(--rill-a-side) !important;
  border-right: 1px solid var(--rill-line-strong) !important;
}
html[${ROOT_ATTR}="on"] [data-slot="rightbar"] {
  background-color: var(--rill-a-right) !important;
  border-left: 1px solid var(--rill-line-strong) !important;
}
html[${ROOT_ATTR}="on"] [data-slot="main"] {
  background-color: transparent !important;
}
/* The centre column is the only region the wallpaper slider drives. */
html[${ROOT_ATTR}="on"] [class*="centerCol"] {
  background-color: var(--rill-center) !important;
}
/* Rails and the bottom strip follow the workspace-opacity slider instead. */
html[${ROOT_ATTR}="on"] [class*="sidebarCol"] {
  background-color: var(--rill-a-side) !important;
}
html[${ROOT_ATTR}="on"] [class*="rightbarCol"] {
  background-color: var(--rill-a-right) !important;
}
/* The bottom strip spans every column (grid-column: 1 / -1), so it must never
   share a dial with the centre column — it has its own. */
html[${ROOT_ATTR}="on"] [class*="bottomRow"],
html[${ROOT_ATTR}="on"] [data-shell-bottom] {
  background-color: var(--rill-a-bottom) !important;
}
/* The strip's own content paints the stock bg-base fill on top of the row, so
   the dial looked dead; hand the fill back to the row. */
html[${ROOT_ATTR}="on"] [data-shell-bottom] > * {
  background-color: transparent !important;
}
/* Title bar (the Windows caption strip, drawn by the shell as .frame::before):
   always fully opaque and only following the palette. It must not inherit the
   sidebar token, or the sidebar would go opaque with it. */
html[${ROOT_ATTR}="on"][data-windows-titlebar] [class*="frame"]::before {
  background-color: var(--rill-title) !important;
  background-image: none !important;
}
/* The frame itself must stay clear: it sits in front of the wallpaper layer, so
   an opaque frame hides the image and flattens every region alpha into one
   colour — which reads as "the sliders do nothing". */
html[${ROOT_ATTR}="on"] [class*="frame"] {
  background-color: transparent !important;
}

/* Conversation header (session title + the view tabs). Only the element the
   marker picks — never a class-name wildcard, because _header_ also shows up
   on containers that hold the whole conversation body. */
html[${ROOT_ATTR}="on"] [${CHROME_ATTR}="1"],
html[${ROOT_ATTR}="on"] [data-slot="conversation.header"],
html[${ROOT_ATTR}="on"] [data-slot="conversation.session.header"],
/* The visible band is usually the child that carries the class, not the slot
   anchor above it — paint both, scoped so it can never reach the message list. */
html[${ROOT_ATTR}="on"] [${CHROME_ATTR}="1"] [class*="_header_"],
html[${ROOT_ATTR}="on"] [data-slot="conversation.header"] [class*="_header_"],
html[${ROOT_ATTR}="on"] [data-slot="conversation.session.header"] [class*="_header_"],
html[${ROOT_ATTR}="on"] [data-slot="conversation.header"] > *,
html[${ROOT_ATTR}="on"] [data-slot="conversation.session.header"] > * {
  background-color: var(--rill-a-header) !important;
}

/* ── sidebar rows: the palette reaches the buttons, the type stays white ── */
html[${ROOT_ATTR}="on"] [data-slot="sidebar"] button,
html[${ROOT_ATTR}="on"] [data-slot="sidebar"] a,
html[${ROOT_ATTR}="on"] [data-slot="sidebar"] [role="button"] {
  transition: background-color 140ms ease, box-shadow 140ms ease;
}
html[${ROOT_ATTR}="on"] [data-slot="sidebar"] button:hover,
html[${ROOT_ATTR}="on"] [data-slot="sidebar"] a:hover,
html[${ROOT_ATTR}="on"] [data-slot="sidebar"] [role="button"]:hover {
  background-color: var(--rill-accent-wash) !important;
}
html[${ROOT_ATTR}="on"] [data-slot="sidebar"] [aria-current="page"],
html[${ROOT_ATTR}="on"] [data-slot="sidebar"] [data-active="true"] {
  background-color: var(--rill-accent-wash) !important;
  box-shadow: inset 3px 0 0 0 var(--rill-accent) !important;
}
html[${ROOT_ATTR}="on"] [data-slot="sidebar"] svg {
  color: inherit;
}
/* work-area rows sit in the same rail; give them the accent edge too */
html[${ROOT_ATTR}="on"] [data-slot="sidebar"] [role="treeitem"]:hover,
html[${ROOT_ATTR}="on"] [data-slot="sidebar"] li:hover {
  background-color: var(--rill-accent-wash) !important;
}
/* CSS-module class names are hashed but keep their suffix, so a substring
   match reaches the shell's own row/footer wrappers without hard-coding a hash */
html[${ROOT_ATTR}="on"] [data-slot="sidebar"] [class*="panelEntry"]:hover,
html[${ROOT_ATTR}="on"] [data-slot="sidebar"] [class*="panelEntryActive"] {
  background-color: var(--rill-accent-wash) !important;
}
html[${ROOT_ATTR}="on"] [data-slot="sidebar"] [class*="footerActions"] {
  border-top: 1px solid var(--rill-line, rgba(255, 255, 255, 0.12));
}
html[${ROOT_ATTR}="on"] [data-slot="sidebar"] [class*="footerActions"] button:hover {
  background-color: var(--rill-accent-wash) !important;
}
html[${ROOT_ATTR}="on"] [data-conversation-content],
html[${ROOT_ATTR}="on"] [data-chat-flow] {
  background-color: transparent !important;
}

/* ── conversation stage: right-angle frosted glass ─────────────────────── */
html[${ROOT_ATTR}="on"] [data-composer-card] {
  background-color: rgba(var(--rill-glass-rgb, 20, 30, 44), var(--rill-glass-alpha, 0.55)) !important;
  -webkit-backdrop-filter: blur(var(--rill-glass-blur, 18px)) saturate(1.4);
  backdrop-filter: blur(var(--rill-glass-blur, 18px)) saturate(1.4);
  border: 1px solid var(--rill-line-strong) !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.09),
    0 14px 30px rgba(0, 0, 0, 0.44) !important;
  transition: background-color 200ms ease, border-color 200ms ease;
}
html[${ROOT_ATTR}="on"] [data-composer-input] {
  background-color: transparent !important;
}
html[${ROOT_ATTR}="on"] :is([role="dialog"], [role="menu"], [role="listbox"], [role="tooltip"]) {
  background-color: rgba(var(--rill-glass-rgb, 20, 30, 44), calc(var(--rill-glass-alpha, 0.55) + 0.2)) !important;
  -webkit-backdrop-filter: blur(var(--rill-glass-blur, 18px)) saturate(1.3);
  backdrop-filter: blur(var(--rill-glass-blur, 18px)) saturate(1.3);
  border: 1px solid var(--rill-line-strong) !important;
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.5) !important;
}

/* ── the send key: a raised square that physically presses in ──────────── */
html[${ROOT_ATTR}="on"] [data-composer-card] button[type="submit"],
html[${ROOT_ATTR}="on"] [data-slot="conversation.input.right"] > button,
html[${ROOT_ATTR}="on"] [data-composer-card] [class*="send" i],
html[${ROOT_ATTR}="on"] [data-composer-card] [aria-label*="发送"],
html[${ROOT_ATTR}="on"] [data-composer-card] button[aria-label*="Send" i],
html[${ROOT_ATTR}="on"] [data-rill-key="send"] {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  min-width: 30px !important;
  min-height: 30px !important;
  background-color: var(--rill-accent2) !important;
  background-image: linear-gradient(180deg, var(--rill-accent2-raise) 0%, var(--rill-accent2-strong) 100%) !important;
  color: var(--rill-key-ink, #ffffff) !important;
  border: 1px solid var(--rill-accent2-edge) !important;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.45),
    inset 0 -2px 0 rgba(0, 0, 0, 0.26),
    0 2px 0 var(--rill-accent2-edge),
    0 5px 11px rgba(0, 0, 0, 0.45) !important;
  transform: translateY(-1px);
  transition: transform 80ms ease, box-shadow 80ms ease, filter 140ms ease;
}
html[${ROOT_ATTR}="on"] [data-composer-card] button[type="submit"]:hover {
  filter: brightness(1.08);
  transform: translateY(-2px);
}
html[${ROOT_ATTR}="on"] [data-composer-card] button[type="submit"]:active,
html[${ROOT_ATTR}="on"] [data-rill-key="send"][data-pressed="1"] {
  transform: translateY(1px);
  filter: brightness(0.94);
  box-shadow:
    inset 0 2px 7px rgba(0, 0, 0, 0.55),
    0 0 0 var(--rill-accent2-edge) !important;
}
html[${ROOT_ATTR}="on"] [data-composer-card] button[type="submit"]:disabled {
  filter: grayscale(0.7) brightness(0.7);
  transform: none;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16), 0 1px 0 rgba(0, 0, 0, 0.4) !important;
}

/* ── form controls ─────────────────────────────────────────────────────── */
html[${ROOT_ATTR}="on"] :is(input, textarea, select) {
  color: var(--rill-ink) !important;
  -webkit-text-fill-color: var(--rill-ink) !important;
  caret-color: var(--rill-accent) !important;
  border-color: var(--rill-line-strong) !important;
  background-clip: padding-box;
}
html[${ROOT_ATTR}="on"] :is(input, textarea)::placeholder {
  color: var(--rill-ink-3) !important;
  -webkit-text-fill-color: var(--rill-ink-3) !important;
  opacity: 1;
}
html[${ROOT_ATTR}="on"] :focus-visible {
  outline: 2px solid var(--rill-accent2) !important;
  outline-offset: 2px;
}

/* ── scroll rails ──────────────────────────────────────────────────────── */
html[${ROOT_ATTR}="on"] ::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
html[${ROOT_ATTR}="on"] ::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.24);
}
html[${ROOT_ATTR}="on"] ::-webkit-scrollbar-thumb {
  background: var(--rill-accent-soft);
  border: 1px solid rgba(255, 255, 255, 0.16);
}

/* ══ brand: whale mark (own slot) + rectilinear wordmark (own slot) ══════
   The sidebar renders sidebar.brand.mark and sidebar.brand.name as two
   independent single slots, and the collapsed rail renders the mark slot
   alone — hence two components rather than one lockup. */
.rill-mark {
  display: block;
  color: var(--rill-accent, #8aa8d6);
}
.rill-mark svg {
  display: block;
  width: 100%;
  height: 100%;
}
/* brand lockup: glyph + two-line rectilinear wordmark, one unshrinkable unit */
.rill-brand {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  flex: none;
  min-width: max-content;
  max-width: none;
  user-select: none;
}
.rill-brand__glyph {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  color: var(--rill-accent, #8aa8d6);
}
.rill-brand__glyph > svg {
  display: block;
  width: 100%;
  height: 100%;
}
.rill-brand__word {
  font-family: Bahnschrift, "DIN Alternate", "DIN Condensed", "Segoe UI Semibold",
    ui-sans-serif, system-ui, sans-serif;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  white-space: nowrap;
  flex: none;
  min-width: max-content;
  color: var(--rill-ink, #fff);
}
.rill-brand__word em {
  font-style: normal;
  color: var(--rill-accent, #8aa8d6);
}
/* The collapsed rail only has room for the glyph. */
html[${ROOT_ATTR}="on"] [class*="collapsed"] .rill-brand__word,
html[${ROOT_ATTR}="on"] [data-collapsed] .rill-brand__word {
  display: none !important;
}
.rill-name-is-empty {
  display: none !important;
}

/* ── settings page bits ─────────────────────────────────────────────────── */

.rill-wall-preview {
  width: 74px;
  height: 46px;
  margin-top: 6px;
  background-color: rgba(0, 0, 0, 0.35);
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
  border: 1px solid var(--rill-line-strong, rgba(255, 255, 255, 0.2));
}
.rill-btn[data-on='1'] {
  background-color: var(--rill-accent-wash, rgba(120, 150, 200, 0.18));
  border-color: var(--rill-accent, #8aa8d6);
  color: var(--rill-ink, #fff);
}
.rill-btn[data-on='0'] {
  opacity: 0.72;
}

/* ══ settings page ═══════════════════════════════════════════════════════ */
.rill-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px 22px 28px;
  max-width: 780px;
  color: var(--rill-ink, #fff);
  font-family: Bahnschrift, "Segoe UI", ui-sans-serif, system-ui, sans-serif;
  font-size: 13px;
  line-height: 1.55;
}
.rill-page__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--rill-line, rgba(255, 255, 255, 0.14));
}
.rill-page__title {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.26em;
  text-transform: uppercase;
}
.rill-page__sub {
  margin-top: 5px;
  font-family: ui-monospace, Consolas, monospace;
  font-size: 10px;
  letter-spacing: 0.14em;
  color: var(--rill-ink-3, rgba(255, 255, 255, 0.46));
  text-transform: uppercase;
}
.rill-page__badge {
  flex: 0 0 auto;
  padding: 4px 8px;
  border: 1px solid var(--rill-accent, #8aa8d6);
  color: var(--rill-accent, #8aa8d6);
  font-family: ui-monospace, Consolas, monospace;
  font-size: 10px;
  letter-spacing: 0.14em;
}
.rill-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.rill-group__label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--rill-ink-2, rgba(255, 255, 255, 0.72));
}
.rill-group__label::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--rill-line, rgba(255, 255, 255, 0.14));
}

/* palette picker */
.rill-swatches {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(104px, 1fr));
  gap: 8px;
}
.rill-swatch {
  position: relative;
  display: block;
  padding: 7px;
  background: rgba(0, 0, 0, 0.24);
  border: 1px solid var(--rill-line, rgba(255, 255, 255, 0.14));
  color: var(--rill-ink-2, rgba(255, 255, 255, 0.72));
  font-size: 11px;
  letter-spacing: 0.08em;
  text-align: left;
  cursor: pointer;
  transition: border-color 150ms ease, background 150ms ease, color 150ms ease;
}
.rill-swatch:hover {
  border-color: var(--rill-accent, #8aa8d6);
}
.rill-swatch[data-on="1"] {
  border-color: var(--rill-accent, #8aa8d6);
  background: rgba(255, 255, 255, 0.09);
  color: var(--rill-ink, #fff);
}
.rill-swatch[data-on="1"]::after {
  content: "";
  position: absolute;
  top: 5px;
  right: 5px;
  width: 6px;
  height: 6px;
  background: var(--rill-accent, #8aa8d6);
}
.rill-swatch__bar {
  display: flex;
  height: 16px;
  margin-bottom: 6px;
  border: 1px solid rgba(255, 255, 255, 0.14);
}
.rill-swatch__bar i {
  flex: 1;
}
.rill-swatch__name {
  display: block;
  font-weight: 600;
}
.rill-swatch__en {
  display: block;
  font-family: ui-monospace, Consolas, monospace;
  font-size: 9px;
  letter-spacing: 0.1em;
  opacity: 0.6;
  text-transform: uppercase;
}

/* rows / sliders */
.rill-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.rill-row__name {
  flex: 0 0 116px;
  font-size: 11px;
  color: var(--rill-ink-2, rgba(255, 255, 255, 0.72));
}
.rill-row__val {
  flex: 0 0 52px;
  text-align: right;
  font-family: ui-monospace, Consolas, monospace;
  font-size: 11px;
  color: var(--rill-accent, #8aa8d6);
}
.rill-range {
  -webkit-appearance: none;
  appearance: none;
  flex: 1;
  min-width: 0;
  height: 16px;
  background: transparent;
  cursor: pointer;
}
.rill-range::-webkit-slider-runnable-track {
  height: 4px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid var(--rill-line, rgba(255, 255, 255, 0.14));
}
.rill-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 10px;
  height: 16px;
  margin-top: -7px;
  background: var(--rill-accent, #8aa8d6);
  border: 1px solid var(--rill-accent-edge, #5a6f90);
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.5);
}
.rill-range::-moz-range-track {
  height: 4px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid var(--rill-line, rgba(255, 255, 255, 0.14));
}
.rill-range::-moz-range-thumb {
  width: 10px;
  height: 16px;
  background: var(--rill-accent, #8aa8d6);
  border: 1px solid var(--rill-accent-edge, #5a6f90);
}

/* segmented control */
.rill-seg {
  display: flex;
  flex: 1;
  min-width: 0;
  border: 1px solid var(--rill-line, rgba(255, 255, 255, 0.14));
}
.rill-seg button {
  flex: 1;
  min-width: 0;
  padding: 6px 4px;
  background: transparent;
  border: 0;
  border-right: 1px solid var(--rill-line, rgba(255, 255, 255, 0.14));
  color: var(--rill-ink-2, rgba(255, 255, 255, 0.72));
  font-family: inherit;
  font-size: 11px;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: background 140ms ease, color 140ms ease;
}
.rill-seg button:last-child {
  border-right: 0;
}
.rill-seg button:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--rill-ink, #fff);
}
.rill-seg button[data-on="1"] {
  background: var(--rill-accent, #8aa8d6);
  color: #ffffff;
}

/* text + buttons */
.rill-text {
  flex: 1;
  min-width: 0;
  padding: 7px 9px;
  background: rgba(0, 0, 0, 0.38);
  border: 1px solid var(--rill-line, rgba(255, 255, 255, 0.14));
  color: #ffffff;
  font-family: ui-monospace, Consolas, monospace;
  font-size: 11px;
}
.rill-text::placeholder {
  color: var(--rill-ink-3, rgba(255, 255, 255, 0.46));
}
.rill-btn {
  flex: 0 0 auto;
  padding: 7px 13px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--rill-line-strong, rgba(255, 255, 255, 0.24));
  color: var(--rill-ink, #fff);
  font-family: inherit;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
  transition: border-color 140ms ease, background 140ms ease;
}
.rill-btn:hover {
  border-color: var(--rill-accent, #8aa8d6);
  background: rgba(255, 255, 255, 0.09);
}
.rill-btn:active {
  background: rgba(0, 0, 0, 0.5);
}
.rill-hint {
  font-family: ui-monospace, Consolas, monospace;
  font-size: 10px;
  line-height: 1.6;
  color: var(--rill-ink-3, rgba(255, 255, 255, 0.46));
}
.rill-hint[data-warn="1"] {
  color: #ffb27a;
}
`;

    function injectCss() {
      const existing = document.querySelector(`style[data-plugin="${PKG}"]`);
      if (existing) return;
      const tag = document.createElement('style');
      tag.dataset.plugin = PKG;
      tag.dataset.pluginCss = CSS_ID;
      tag.textContent = CSS;
      document.head.appendChild(tag);
    }

    /* ──────────────────────────────────────────────────────────────── painting */

    /**
     * Push one settings object into CSS variables on <html>.
     *
     * Deliberately narrow: only structure and interaction tokens are written.
     * No rule here sets `color` except the ones that pin it to white, which is
     * what keeps "palette never changes the type" true by construction.
     */
    function paint(settings) {
      const root = document.documentElement;
      const theme = THEMES[settings.theme] ? settings.theme : DEFAULTS.theme;
      const mode = resolveMode(settings);
      const palette = THEMES[theme];
      const tone = mode === 'light' ? palette.light : palette.dark;
      const accent = mode === 'light' ? palette.accent.light : palette.accent.dark;

      const alpha = clamp(Number(settings.surfaceAlpha) || 0, 0.25, 1);

      // Master switch: "off" hands the page back to the stock appearance.
      if (settings.enabled === false) {
        unpaint();
        return;
      }

      root.setAttribute(ROOT_ATTR, 'on');
      root.setAttribute(`${ROOT_ATTR}-theme`, theme);
      root.setAttribute(`${ROOT_ATTR}-mode`, mode);

      const set = (k, v) => root.style.setProperty(k, v);

      // Two independent dials, two independent regions:
      //   surfaceAlpha     → sidebar, right bar, bottom strip
      //   wallpaperOpacity → the centre column only, as "how much wallpaper
      //                      shows through the conversation field"
      // The title bar is always opaque and only follows the palette.
      const wall = String(settings.wallpaper || '').trim();
      const paper = clamp(Number(settings.wallpaperOpacity) || 0, 0, 1);
      const centerAlpha = clamp(1 - paper * 0.94, 0.08, 1);

      // The canvas must stay opaque (it is what shows through every translucent
      // chrome layer). `bg` is the chrome tint and follows the opacity slider, so
      // a wallpaper behind the shell is actually visible instead of being covered
      // by a solid paint on the frame.
      set('--rill-canvas', tri(shade(tone.bg, 0.58)));
      set('--rill-bg', triA(tone.bg, centerAlpha));
      set('--rill-center', triA(tone.bg, centerAlpha));
      const aSide = clamp(Number(settings.alphaSide ?? alpha) || 0, 0, 1);
      const aRight = clamp(Number(settings.alphaRight ?? alpha) || 0, 0, 1);
      const aBottom = clamp(Number(settings.alphaBottom ?? alpha) || 0, 0, 1);
      const aHeader = clamp(Number(settings.alphaHeader ?? 1) || 0, 0, 1);
      set('--rill-side', triA(tone.side, alpha));
      set('--rill-a-side', triA(tone.side, aSide));
      set('--rill-a-right', triA(tone.side, aRight));
      set('--rill-a-bottom', triA(tone.side, aBottom));
      set('--rill-a-header', triA(tone.side, aHeader));
      set('--rill-title', tri(tone.side));
      // Centre-column copies: the wallpaper slider owns the middle, so every
      // layer inside it must be derived from centreAlpha instead of the
      // workspace alpha — otherwise the workspace slider leaks into the centre.
      set('--rill-center-1', triA(mix(tone.surf, tone.bg, 0.45), centerAlpha));
      set('--rill-center-2', triA(tone.surf, centerAlpha));
      set('--rill-center-3', triA(tone.surf2, centerAlpha));
      set('--rill-field', triA(mix(tone.surf, tone.bg, 0.45), centerAlpha));
      set('--rill-surface', triA(tone.surf, centerAlpha));
      set('--rill-surface-2', triA(tone.surf2, centerAlpha));
      set('--rill-line', `rgba(255,255,255,${(0.1 + 0.1 * alpha).toFixed(3)})`);
      set('--rill-line-strong', `rgba(255,255,255,${(0.18 + 0.14 * alpha).toFixed(3)})`);

      // Accent family, derived so every palette keeps the same relationships.
      set('--rill-accent', tri(accent));
      set('--rill-accent-raise', tri(mix(accent, [255, 255, 255], 0.28)));
      set('--rill-accent-strong', tri(shade(accent, 0.8)));
      set('--rill-accent-edge', tri(shade(accent, 0.52)));
      set('--rill-accent-soft', triA(accent, 0.72));
      set('--rill-accent-wash', triA(accent, 0.18));

      // accent2 — the "you can press this" colour. Palettes that do not declare
      // one fall back to accent, so their look is byte-identical to before.
      const accent2 = palette.accent2
        ? (mode === 'light' ? palette.accent2.light : palette.accent2.dark)
        : accent;
      set('--rill-accent2', tri(accent2));
      set('--rill-accent2-raise', tri(mix(accent2, [255, 255, 255], 0.28)));
      set('--rill-accent2-strong', tri(shade(accent2, 0.8)));
      set('--rill-accent2-edge', tri(shade(accent2, 0.52)));
      // A declared accent2 is light enough to need dark glyphs on top.
      set('--rill-key-ink', palette.accent2 ? '#0d1420' : '#ffffff');

      // Frosted glass for the conversation card.
      set('--rill-glass-rgb', tone.surf.join(','));
      set('--rill-glass-alpha', String(clamp(Number(settings.glassAlpha) || 0, 0.08, 1)));
      set('--rill-glass-blur', `${clamp(Number(settings.glassBlur) || 0, 0, 40)}px`);

      // Wallpaper layer.
      paintWallpaper(wall, settings);
    }

    /**
     * The wallpaper lives in its own fixed element so nothing in the shell can
     * paint over it: z-index 1 with the app root lifted to 2 keeps it above the
     * canvas and below every piece of chrome.
     */
    function paintWallpaper(wall, settings) {
      if (!document.body) return;
      let node = document.getElementById(WALL_ID);
      if (!node) {
        node = document.createElement('div');
        node.id = WALL_ID;
        node.setAttribute('aria-hidden', 'true');
        document.body.appendChild(node);
      }
      const blur = clamp(Number(settings.wallpaperBlur) || 0, 0, 40);
      node.dataset.grain = settings.scanlines ? '1' : '0';
      if (!wall) {
        node.style.display = 'none';
        node.style.backgroundImage = 'none';
        return;
      }
      const grain = settings.scanlines
        ? 'repeating-linear-gradient(0deg, rgba(255,255,255,0.035) 0 1px, rgba(0,0,0,0) 1px 3px), repeating-linear-gradient(90deg, rgba(255,255,255,0.02) 0 1px, rgba(0,0,0,0) 1px 72px),'
        : '';
      node.style.display = 'block';
      node.style.backgroundImage = grain + ' url("' + String(wall).replace(/"/g, '%22') + '")';
      node.style.opacity = '1';
      // blur() is isotropic: X and Y soften together.
      node.style.filter = blur ? 'blur(' + blur + 'px)' : 'none';
    }

    /**
     * Tag the conversation header band (session title + the 对话/轨迹/上下文
     * tabs) so it can follow the workspace-opacity slider instead of the
     * wallpaper. It has no stable class, but the slot anchors inside it do.
     */
    function markChrome() {
      if (!document.body || typeof document.querySelectorAll !== 'function') return;
      let anchors;
      try {
        anchors = document.querySelectorAll(
          '[data-slot="conversation.header"], [data-slot="conversation.session.header"], [data-slot="main.conversation"]'
        );
      } catch (error) {
        return;
      }
      const chosen = [];
      for (let i = 0; i < anchors.length; i += 1) {
        const anchor = anchors[i];
        let best = null;
        let bestHeight = Infinity;
        const candidates = [anchor];
        if (typeof anchor.querySelectorAll === 'function') {
          const inner = anchor.querySelectorAll('[class*="_header_"]');
          for (let j = 0; j < inner.length; j += 1) candidates.push(inner[j]);
        }
        for (let k = 0; k < candidates.length; k += 1) {
          const el = candidates[k];
          const name = typeof el.className === 'string' ? el.className : '';
          if (!name || name.indexOf('_header_') === -1) continue;
          const rect = typeof el.getBoundingClientRect === 'function' ? el.getBoundingClientRect() : null;
          const height = rect ? rect.height : 0;
          // A band tall enough to hold the message list is a container, not the
          // header: ignore it and keep looking for the small one.
          if (height <= 0 || height > 100) continue;
          if (height < bestHeight) {
            best = el;
            bestHeight = height;
          }
        }
        if (!best && typeof anchor.closest === 'function') {
          const up = anchor.closest('[class*="_header_"]');
          if (up) {
            const rect = up.getBoundingClientRect();
            if (rect.height > 0 && rect.height <= 100) best = up;
          }
        }
        if (best) chosen.push(best);
      }
      if (typeof document.querySelectorAll === 'function') {
        const marked = document.querySelectorAll(`[${CHROME_ATTR}]`);
        for (let i = 0; i < marked.length; i += 1) {
          if (chosen.indexOf(marked[i]) === -1) marked[i].removeAttribute(CHROME_ATTR);
        }
      }
      for (let i = 0; i < chosen.length; i += 1) chosen[i].setAttribute(CHROME_ATTR, '1');
    }

    function unpaint() {
      const root = document.documentElement;
      root.removeAttribute(ROOT_ATTR);
      root.removeAttribute(`${ROOT_ATTR}-theme`);
      root.removeAttribute(`${ROOT_ATTR}-mode`);
      const wallNode = document.getElementById(WALL_ID);
      if (wallNode) wallNode.style.display = 'none';
    }

    /** Persist + repaint in one step; the single write path for every control. */
    function update(patch) {
      const next = writeStore(patch);
      paint(next);
      return next;
    }

    /* ────────────────────────────────────────────────────────────────── brand */

    /**
     * The official DeepSeek Harness mark, taken verbatim from the web frontend's
     * own favicon (dsh-web-frontend/dist/favicon.svg, viewBox 0 0 50 50) so the
     * brand cell shows the whale DeepSeek actually ships, not a look-alike.
     */
    const DSH_MARK_D =
      'M48.8354 10.0479C48.3232 9.79199 48.1025 10.2798 47.8032 10.5278C47.7007 10.6079 47.6143 10.7119 47.5273 10.8076C46.7793 11.624 45.9048 12.1597 44.7622 12.0957C43.0923 12 41.666 12.5356 40.4058 13.8398C40.1377 12.2319 39.2476 11.272 37.8926 10.6558C37.1836 10.3359 36.4668 10.0156 35.9702 9.31982C35.6235 8.82373 35.5293 8.27197 35.356 7.72754C35.2456 7.3999 35.1353 7.06396 34.7651 7.00781C34.3633 6.94385 34.2056 7.2876 34.0479 7.57568C33.418 8.75195 33.1733 10.0479 33.1973 11.3599C33.2524 14.312 34.4736 16.6641 36.8999 18.3359C37.1758 18.5278 37.2466 18.7197 37.1597 19C36.9946 19.5757 36.7974 20.1357 36.624 20.7119C36.5137 21.0801 36.3486 21.1597 35.9624 21C34.6309 20.4321 33.481 19.5918 32.4644 18.5757C30.7393 16.8721 29.1792 14.9917 27.2334 13.52C26.7764 13.1758 26.3193 12.856 25.8467 12.5518C23.8618 10.584 26.1069 8.96777 26.627 8.77588C27.1704 8.57568 26.8159 7.8877 25.0591 7.896C23.3022 7.90381 21.6953 8.50391 19.647 9.30371C19.3477 9.42383 19.0322 9.51172 18.7095 9.58398C16.8501 9.22363 14.9199 9.14355 12.9033 9.37598C9.10596 9.80762 6.07275 11.6396 3.84326 14.7681C1.16455 18.5278 0.53418 22.7998 1.30664 27.2559C2.11768 31.9521 4.46582 35.8398 8.07373 38.8799C11.8159 42.0322 16.1255 43.5762 21.041 43.2803C24.0269 43.104 27.3516 42.6963 31.1016 39.4561C32.0469 39.936 33.0396 40.1279 34.686 40.272C35.9546 40.3921 37.1758 40.208 38.1211 40.0078C39.6021 39.688 39.4995 38.2881 38.9639 38.0322C34.623 35.9678 35.5762 36.8081 34.71 36.1279C36.9155 33.4639 40.2402 30.6958 41.54 21.728C41.6426 21.0161 41.5557 20.5679 41.54 19.9917C41.5322 19.6396 41.6108 19.5039 42.0049 19.4639C43.0923 19.3359 44.1479 19.0317 45.1167 18.4878C47.9292 16.9199 49.064 14.3438 49.3315 11.2559C49.3711 10.7837 49.3237 10.2959 48.8354 10.0479ZM24.3262 37.8398C20.1196 34.4639 18.0791 33.3521 17.2358 33.3999C16.4482 33.4482 16.5898 34.3682 16.7632 34.9678C16.9443 35.5601 17.1812 35.9683 17.5117 36.4878C17.7402 36.832 17.8979 37.3442 17.2832 37.728C15.9282 38.584 13.5728 37.4399 13.4624 37.3838C10.7207 35.7358 8.42822 33.5601 6.81348 30.584C5.25342 27.7197 4.34766 24.6479 4.19775 21.3677C4.1582 20.5757 4.38672 20.2959 5.15869 20.1519C6.17529 19.96 7.22314 19.9199 8.23926 20.0718C12.5327 20.7119 16.1885 22.6719 19.2529 25.7759C21.002 27.5439 22.3252 29.6558 23.6885 31.7202C25.1377 33.9121 26.6978 36 28.6831 37.7119C29.3843 38.312 29.9434 38.7681 30.479 39.104C28.8643 39.2881 26.1699 39.3281 24.3262 37.8398ZM26.3433 24.6001C26.3433 24.248 26.6191 23.9678 26.9658 23.9678C27.0444 23.9678 27.1152 23.9839 27.1782 24.0078C27.2651 24.04 27.3438 24.0879 27.4067 24.1602C27.5171 24.272 27.5801 24.4321 27.5801 24.6001C27.5801 24.9521 27.3042 25.2319 26.9575 25.2319C26.6108 25.2319 26.3433 24.9521 26.3433 24.6001ZM32.6064 27.8799C32.2046 28.0479 31.8027 28.1919 31.4165 28.208C30.8179 28.2397 30.1641 27.9922 29.8096 27.688C29.2583 27.2158 28.8643 26.9521 28.6987 26.1279C28.6279 25.7759 28.6675 25.2319 28.7305 24.9199C28.8721 24.248 28.7144 23.8159 28.2495 23.4238C27.8716 23.104 27.3911 23.0161 26.8633 23.0161C26.666 23.0161 26.4849 22.9277 26.3511 22.856C26.1304 22.7441 25.9492 22.4639 26.1226 22.1201C26.1777 22.0078 26.4458 21.7358 26.5088 21.688C27.2256 21.272 28.0527 21.4077 28.8169 21.7197C29.5259 22.0161 30.0615 22.5601 30.834 23.3281C31.6216 24.2559 31.7632 24.5117 32.2124 25.208C32.5669 25.752 32.8901 26.312 33.1104 26.9521C33.2446 27.3521 33.0713 27.6802 32.6064 27.8799Z';

    function WhaleGlyph() {
      return h(
        'svg',
        {
          viewBox: '0 0 50 50',
          xmlns: 'http://www.w3.org/2000/svg',
          'aria-hidden': 'true',
          focusable: 'false',
          fill: 'currentColor',
        },
        h('path', { d: DSH_MARK_D, fill: 'currentColor', fillRule: 'nonzero' })
      );
    }

    /**
     * The mark occupant. `sidebar.brand.mark` is a `single` slot that supplies
     * `size` (requested square edge in px) and is also what the collapsed rail
     * renders, so this component is the whale alone and nothing else.
     */
    function WhaleMark(props) {
      const requested = Number(props && props.size);
      const size = Number.isFinite(requested) && requested > 0 ? requested : 22;
      /* The wordmark rides the mark occupant on purpose: `sidebar.brand.name`
         sits inside a flex row whose items are allowed to shrink to zero, so a
         name rendered there collapses in a narrow rail. The mark occupant is
         `flex: none`, so glyph + label stay one unshrinkable unit. */
      return h(
        'span',
        { className: 'rill-brand', title: `Rill Industrial Skin v${VERSION}` },
        h(
          'span',
          { className: 'rill-brand__glyph', style: { width: `${size}px`, height: `${size}px` } },
          h(WhaleGlyph)
        ),
        h(
          'span',
          { className: 'rill-brand__word' },
          'DEEPSEEK',
          h('em', null, ' HARNESS')
        )
      );
    }

    /**
     * The name occupant: rectilinear industrial face, tracked wide, split by a
     * rule under it. `DEEP` stays white and `SEEK` takes the accent so the
     * accent reads as the machine's own ink rather than decoration. The
     * occupant owns its own width, hence the container queries.
     */
    function BrandName() {
      /* Intentionally empty: the wordmark ships inside the mark occupant (see
         WhaleMark). Occupying the name slot only shadows the shell's own text so
         it cannot duplicate ours. */
      return h('span', { className: 'rill-name-is-empty' });
    }

    /* ─────────────────────────────────────────────────────────────── settings */

    function Row({ name, value, min, max, step, format, onChange }) {
      return h(
        'label',
        { className: 'rill-row' },
        h('span', { className: 'rill-row__name' }, name),
        h('input', {
          className: 'rill-range',
          type: 'range',
          min,
          max,
          step,
          value,
          onChange: (event) => onChange(Number(event.target.value)),
        }),
        h('span', { className: 'rill-row__val' }, format(value))
      );
    }

    function Group({ label, children }) {
      return h(
        'section',
        { className: 'rill-group' },
        h('div', { className: 'rill-group__label' }, label),
        children
      );
    }

    function SettingsPage() {
      const [settings, setSettings] = React.useState(() => readStore());
      const [notice, setNotice] = React.useState('');
      const fileRef = React.useRef(null);

      /** Single funnel: every control writes through `update` and re-reads. */
      const commit = React.useCallback((patch) => {
        setSettings(update(patch));
      }, []);

      /** Slider read-outs. They lived beside the diagnostics block that was
       *  removed in 1.0.9 — which took them with it and blanked the page. */
      const pct = (v) => `${Math.round(Number(v || 0) * 100)}%`;
      const px = (v) => `${Math.round(Number(v || 0))}px`;

      const pickWallpaper = (file) => {
        if (!file) return;
        if (!/^image\//.test(file.type)) {
          setNotice('只接受图片文件。');
          return;
        }
        setNotice('正在处理图片…');
        const finish = (dataUrl, note) => {
          const next = update({ wallpaper: dataUrl });
          setSettings(next);
          const persisted = window.localStorage.getItem(STORE_KEY) !== null;
          setNotice(
            persisted
              ? `${note} · 已保存`
              : `${note} · 但本地存储装不下，刷新后会丢（图再小一点）`
          );
        };
        const reader = new FileReader();
        reader.onerror = () => setNotice('读取图片失败。');
        reader.onload = () => {
          const src = String(reader.result || '');
          if (/^data:image\/svg/.test(src) && src.length < 900000) {
            finish(src, 'SVG 壁纸');
            return;
          }
          const img = new window.Image();
          img.onerror = () => finish(src, '无法解码，按原图使用');
          img.onload = () => {
            const maxEdge = 1920;
            const scale = Math.min(1, maxEdge / Math.max(img.width || 1, img.height || 1));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round((img.width || 1) * scale));
            canvas.height = Math.max(1, Math.round((img.height || 1) * scale));
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              finish(src, '无法压缩，按原图使用');
              return;
            }
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            let quality = 0.82;
            let out = canvas.toDataURL('image/jpeg', quality);
            while (out.length > 2500000 && quality > 0.42) {
              quality -= 0.12;
              out = canvas.toDataURL('image/jpeg', quality);
            }
            finish(out, `壁纸 ${canvas.width}×${canvas.height} · ${Math.round(out.length / 1024)} KB`);
          };
          img.src = src;
        };
        reader.readAsDataURL(file);
      };

      return h(
        'div',
        { className: 'rill-page' },
        h(
          'header',
          { className: 'rill-page__head' },
          h(
            'div',
            null,
            h('div', { className: 'rill-page__title' }, 'Rill Industrial'),
            h(
              'div',
              { className: 'rill-page__sub' },
              'industrial electronics · rectilinear · dual appearance'
            )
          ),
          h('span', { className: 'rill-page__badge' }, `v${VERSION}`)
        ),

        h(
          Group,
          { label: '开关 / switch' },
          h(
            'div',
            { className: 'rill-row' },
            h(
              'button',
              {
                className: 'rill-btn',
                type: 'button',
                'data-on': settings.enabled === false ? '0' : '1',
                onClick: () => commit({ enabled: settings.enabled === false }),
              },
              settings.enabled === false ? '皮肤已停用 · 点此启用' : '皮肤已启用 · 点此停用'
            ),
            settings.enabled === false
              ? h('span', { className: 'rill-hint' }, '当前是原生外观，设置仍保留。')
              : null
          )
        ),

        h(
          Group,
          { label: '主题配色 / palette' },
          h(
            'div',
            { className: 'rill-swatches' },
            THEME_ORDER.map((key) => {
              const t = THEMES[key];
              const d = t.dark;
              return h(
                'button',
                {
                  key,
                  type: 'button',
                  className: 'rill-swatch',
                  'data-on': settings.theme === key ? '1' : '0',
                  onClick: () => commit({ theme: key }),
                },
                h(
                  'span',
                  { className: 'rill-swatch__bar' },
                  h('i', { style: { background: tri(d.bg) } }),
                  h('i', { style: { background: tri(d.surf) } }),
                  h('i', { style: { background: tri(d.surf2) } }),
                  h('i', { style: { background: tri(t.accent.dark) } }),
                  // Fifth stripe only where the palette declares its own
                  // interaction colour, so the swatch shows what you get.
                  t.accent2 ? h('i', { style: { background: tri(t.accent2.dark) } }) : null
                ),
                h('span', { className: 'rill-swatch__name' }, t.name),
                h('span', { className: 'rill-swatch__en' }, t.en)
              );
            })
          ),
          h(
            'div',
            { className: 'rill-hint' },
            '配色只改写结构色与强调色，文字始终保持白色。'
          )
        ),

        h(
          Group,
          { label: '外观 / appearance' },
          h(
            'div',
            { className: 'rill-row' },
            h('span', { className: 'rill-row__name' }, '明暗跟随'),
            h(
              'div',
              { className: 'rill-seg' },
              [
                ['auto', '跟随系统'],
                ['light', '浅色'],
                ['dark', '深色'],
              ].map(([value, label]) =>
                h(
                  'button',
                  {
                    key: value,
                    type: 'button',
                    'data-on': settings.mode === value ? '1' : '0',
                    onClick: () => commit({ mode: value }),
                  },
                  label
                )
              )
            )
          ),
          h(Row, {
            name: '左侧栏不透明度',
            value: settings.alphaSide,
            min: 0,
            max: 1,
            step: 0.01,
            format: pct,
            onChange: (v) => commit({ alphaSide: v }),
          }),
          h(Row, {
            name: '右侧栏不透明度',
            value: settings.alphaRight,
            min: 0,
            max: 1,
            step: 0.01,
            format: pct,
            onChange: (v) => commit({ alphaRight: v }),
          }),
          h(Row, {
            name: '底栏不透明度',
            value: settings.alphaBottom,
            min: 0,
            max: 1,
            step: 0.01,
            format: pct,
            onChange: (v) => commit({ alphaBottom: v }),
          }),
          h(Row, {
            name: '会话标题条不透明度',
            value: settings.alphaHeader,
            min: 0,
            max: 1,
            step: 0.01,
            format: pct,
            onChange: (v) => commit({ alphaHeader: v }),
          }),
          h(Row, {
            name: '对话框透明度',
            value: settings.glassAlpha,
            min: 0.08,
            max: 1,
            step: 0.01,
            format: pct,
            onChange: (v) => commit({ glassAlpha: v }),
          }),
          h(Row, {
            name: '对话框模糊度',
            value: settings.glassBlur,
            min: 0,
            max: 40,
            step: 1,
            format: px,
            onChange: (v) => commit({ glassBlur: v }),
          }),
          h(
            'div',
            { className: 'rill-row' },
            h('span', { className: 'rill-row__name' }, '扫描质感'),
            h(
              'div',
              { className: 'rill-seg' },
              [
                [true, '开启'],
                [false, '关闭'],
              ].map(([value, label]) =>
                h(
                  'button',
                  {
                    key: String(value),
                    type: 'button',
                    'data-on': settings.scanlines === value ? '1' : '0',
                    onClick: () => commit({ scanlines: value }),
                  },
                  label
                )
              )
            )
          )
        ),

        h(
          Group,
          { label: '壁纸 / wallpaper' },
          h(
            'div',
            { className: 'rill-row' },
            h('input', {
              className: 'rill-text',
              type: 'text',
              spellCheck: false,
              placeholder: '粘贴图片地址，或选择本地文件',
              value: settings.wallpaper.startsWith('data:') ? '' : settings.wallpaper,
              onChange: (event) => commit({ wallpaper: event.target.value.trim() }),
            }),
            h(
              'button',
              {
                className: 'rill-btn',
                type: 'button',
                onClick: () => (fileRef.current ? fileRef.current.click() : null),
              },
              '选择文件'
            ),
            h('input', {
              ref: fileRef,
              type: 'file',
              accept: 'image/*',
              style: { display: 'none' },
              onChange: (event) => pickWallpaper(event.target.files && event.target.files[0]),
            }),
            h(
              'button',
              {
                className: 'rill-btn',
                type: 'button',
                onClick: () => {
                  commit({ wallpaper: '' });
                  setNotice('壁纸已清除。');
                },
              },
              '清除'
            )
          ),
          settings.wallpaper
            ? h('div', {
                className: 'rill-wall-preview',
                title: '当前壁纸预览',
                style: {
                  backgroundImage: `url("${String(settings.wallpaper).replace(/"/g, '%22')}")`,
                },
              })
            : h(
                'div',
                { className: 'rill-hint' },
                '还没有壁纸。选一张本地图片即可（会自动压缩后保存）。'
              ),
          h(Row, {
            name: '壁纸不透明度',
            value: 1 - Number(settings.wallpaperOpacity || 0),
            min: 0,
            max: 1,
            step: 0.01,
            format: pct,
            onChange: (v) => commit({ wallpaperOpacity: 1 - v }),
          }),
          h(Row, {
            name: '壁纸模糊度',
            value: settings.wallpaperBlur,
            min: 0,
            max: 40,
            step: 1,
            format: px,
            onChange: (v) => commit({ wallpaperBlur: v }),
          }),
          notice ? h('div', { className: 'rill-hint', 'data-warn': '1' }, notice) : null
        ),

        h(
          'div',
          { className: 'rill-row' },
          h(
            'button',
            {
              className: 'rill-btn',
              type: 'button',
              onClick: () => {
                commit({ ...DEFAULTS });
                setNotice('已恢复出厂设置。');
              },
            },
            '恢复默认'
          ),
          h(
            'div',
            { className: 'rill-hint' },
            '设置只存在本机，不上传。'
          )
        )
      );
    }

    /* ────────────────────────────────────────────────────────────────── apply */

    /**
     * A skin that installs but draws nothing is indistinguishable from one that
     * never loaded, and the browser half has no other reporting channel. So a
     * thrown error becomes a strip in the page (and window.__RILL_ERROR__)
     * instead of a silent no-op.
     */
    function reportFatal(error) {
      const text = String((error && error.stack) || error);
      window.__RILL_ERROR__ = text;
      console.error(`[${PKG}] apply failed`, error);
      try {
        const strip = document.createElement('div');
        strip.setAttribute('data-rill-fatal', '1');
        strip.textContent = `[${PKG} ${VERSION}] ${String((error && error.message) || error)} (click to dismiss)`;
        Object.assign(strip.style, {
          position: 'fixed',
          left: '0',
          right: '0',
          bottom: '0',
          zIndex: '2147483000',
          padding: '9px 14px',
          font: '12px/1.5 ui-monospace, Consolas, monospace',
          background: '#5a1420',
          color: '#fff',
          borderTop: '2px solid #ff5b6e',
          whiteSpace: 'pre-wrap',
          cursor: 'pointer',
        });
        strip.addEventListener('click', () => strip.remove());
        document.body.append(strip);
      } catch {
        /* the page is beyond help; console already carries the reason */
      }
    }

    /** Wires the skin into the running page. Called once by `apply`. */
    function attach(ctx) {
        /** ctx.effect keeps the teardown tied to the plugin's own lifetime. */
        ctx.effect(() => {
          injectCss();

          let settings = readStore();
          paint(settings);
          markChrome();

          // The chrome band carries no stable class of its own, so it is found
          // through the slot anchors it contains and tagged at runtime.
          let bridge = 0;
          let bridgeTimer = 0;
          const later =
            typeof window.setTimeout === 'function'
              ? (fn, ms) => window.setTimeout(fn, ms)
              : () => 0;
          const cancelLater =
            typeof window.clearTimeout === 'function'
              ? (id) => window.clearTimeout(id)
              : () => {};
          const stepBridge = () => {
            markChrome();
            if (++bridge >= 10) {
              cancelLater(bridgeTimer);
              return;
            }
            bridgeTimer = later(stepBridge, 250);
          };
          bridgeTimer = later(stepBridge, 250);

          // Host can flip light/dark at any time; so can the OS in `auto`.
          const repaint = () => {
            settings = readStore();
            paint(settings);
          };

          const observer = new MutationObserver(() => {
            markChrome();
            if (settings.mode === 'auto') repaint();
          });
          observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['data-ds-dark-theme', 'class', 'style', 'data-theme'],
          });
          observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-ds-dark-theme', 'class', 'data-theme'],
          });

          const mq =
            window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
          const onMq = () => {
            if (settings.mode === 'auto') repaint();
          };
          if (mq && mq.addEventListener) mq.addEventListener('change', onMq);

          // Cross-tab / same-tab writes from the settings page.
          const onStorage = (event) => {
            if (event.key === STORE_KEY) repaint();
          };
          window.addEventListener('storage', onStorage);
          window.addEventListener(`${PKG}:change`, repaint);

          return () => {
            cancelLater(bridgeTimer);
            observer.disconnect();
            if (mq && mq.removeEventListener) mq.removeEventListener('change', onMq);
            window.removeEventListener('storage', onStorage);
            window.removeEventListener(`${PKG}:change`, repaint);
            unpaint();
            const tag = document.querySelector(`style[data-plugin="${PKG}"]`);
            if (tag) tag.remove();
          };
        }, 'dsh-rill-industrial-skin:paint');

        // Brand row: the mark and the name are two independent single slots.
        // Registering either one replaces the shell's own fallback (fish mark /
        // build label) for that cell only.
        /* `name` is the SLOT KEY; `id` is our own registrant identity. The shell
           already occupies both brand slots at priority 0 with its fish
           fallback, and the lowest priority renders — so shadow it at -1. */

        ctx.slots.inject('sidebar.brand.mark', () =>
          ctx.slots.register(
            {
              name: 'sidebar.brand.mark',
              id: `${PKG}.brand.mark`,
              registrant: PKG,
              priority: -1,
            },
            WhaleMark
          )
        );

        ctx.slots.inject('sidebar.brand.name', () =>
          ctx.slots.register(
            {
              name: 'sidebar.brand.name',
              id: `${PKG}.brand.name`,
              registrant: PKG,
              priority: -1,
            },
            BrandName
          )
        );

        // Settings page. `name` is the slot key; a list slot needs `id` + label.
        ctx.slots.inject('settings.section', () =>
          ctx.slots.register(
            {
              name: 'settings.section',
              id: `${PKG}.settings`,
              registrant: PKG,
              order: 60,
              label: 'Rill工业风皮肤',
              inject: () => ({ layout: 'fill' }),
            },
            SettingsPage
          )
        );
    }

    return {
      /* `slots` is a cordis *service* name — the only thing inject accepts.
         Slot keys themselves are awaited by name inside `attach`, so no other
         inject is needed and none should be guessed from package names. */
      inject: ['slots'],

      apply(ctx) {
        console.info(`[${PKG}] client ${VERSION} apply`);
        try {
          attach(ctx);
        } catch (error) {
          reportFatal(error);
        }
      },
    };
  },
});
