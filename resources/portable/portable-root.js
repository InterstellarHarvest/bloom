// BLOOM — where the repository is, as the portable runtime sees it (BLOOM-031). docs/PORTABLE_RUNTIME_v1.md.
//
// A source module that reads `import.meta.url` (its own address: main-menu.js for the paintings, training-run.js for the coach's
// stylesheet, sector-pool.js for its worker) has no such value inside a classic bundle. The build (tools/build-portable.mjs) rewrites
// each `import.meta.url` in a bundled source module to sourceUrl("<that module's repository path>") — the URL the module would have
// had if it were loaded directly — so every relative address it builds resolves to the same local file as on the served site.
//
// Evaluated while the bundle itself is being evaluated (the portable entry imports it first), so document.currentScript is the bundle
// (dist/portable/…: the repository root is two folders up). BLOOM.modules.repo (resources/portable/module-loader.js) is the fallback.
const script = typeof document !== "undefined" ? document.currentScript : null;
export const PORTABLE_ROOT = script && script.src ? new URL("../../", script.src).href
  : (globalThis.BLOOM && globalThis.BLOOM.modules && globalThis.BLOOM.modules.repo) || null;

/** The URL of a repository file (e.g. "resources/main-menu/main-menu.js") under the portable root. */
export const sourceUrl = path => new URL(path, PORTABLE_ROOT).href;
