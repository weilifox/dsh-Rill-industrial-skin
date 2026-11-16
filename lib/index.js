/**
 * rill-industrial-skin — host half.
 *
 * The skin itself is entirely a browser-side artefact: CSS variables, one
 * injected stylesheet, a whale wordmark in `sidebar.brand.mark` and one page in
 * `settings.section`. Nothing here touches tools, prompts or the agent loop, so
 * the host row exists only to give the bundle a loader identity (and therefore
 * an id the profile can disable or configure).
 *
 * Kept empty on purpose: a host half that allocates resources it never uses is
 * the usual source of "plugin applied but nothing visible".
 */

/** @param {import('@deepseek-ai/cordis').Context} _ctx */
export function apply(_ctx) {}

/** Declared so the loader can name the row in `plugins` diagnostics. */
export const name = 'rill-industrial-skin';
