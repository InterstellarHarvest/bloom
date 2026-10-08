// BLOOM — the module seam (BLOOM-031): how the classic run-page / title-boot files load the game's ES modules, over http(s) AND over
// file://. docs/PORTABLE_RUNTIME_v1.md.
//
//   BLOOM.modules.load(url)    → Promise<module namespace>   url = the absolute URL of a source module (resolved from the caller's own URL)
//   BLOOM.modules.portable     true when the page is not served over http(s) (a double-clicked index.html: file://)
//   BLOOM.modules.ready()      → Promise<BLOOM_PORTABLE | null>: the portable runtime, loaded (portable only; null when served)
//
// SERVED (http / https: development, GitHub Pages): load(url) IS import(url) — the source modules and their module workers, exactly
// as before BLOOM-031. Nothing else is requested.
// PORTABLE (file://): browsers refuse ES modules and module workers there (Chromium: an opaque origin, no module fetch), so the SAME
// source modules are served from the generated portable runtime dist/portable/strange-bloom.portable.js — one classic script,
// injected on first use, built from this repository by `npm --prefix tools run build:portable` (tools/build-portable.mjs). It registers the source
// modules under their repository paths; load(url) maps the URL to that path and evaluates the bundled module (once per page, lazily,
// like a real import). Nothing is re-implemented here and nothing is fetched besides that one local file.
//
// Classic script, no dependencies; resolves everything from this file's own URL (repository root = two folders up), never from the
// document's folder, so the root title and demos/demo-run.html share it unchanged.
(function (root) {
  "use strict";
  const doc = root.document;
  const HERE = doc && doc.currentScript && doc.currentScript.src ? doc.currentScript.src : null;
  const REPO = HERE ? new URL("../../", HERE).href : null;
  const BUNDLE = "dist/portable/strange-bloom.portable.js";
  const served = !!(root.location && /^https?:$/.test(root.location.protocol));
  const portable = !served && !!REPO && !!doc;

  let bundle = null;
  /** The portable runtime (portable pages only): one classic <script>, loaded once. Rejects if the generated file is missing. */
  function ready() {
    if (!portable) return Promise.resolve(null);
    if (bundle) return bundle;
    bundle = new Promise((resolve, reject) => {
      if (root.BLOOM_PORTABLE) return resolve(root.BLOOM_PORTABLE);
      const s = doc.createElement("script"); s.src = new URL(BUNDLE, REPO).href;
      s.onload = () => (root.BLOOM_PORTABLE ? resolve(root.BLOOM_PORTABLE) : reject(new Error("the portable runtime did not register (" + BUNDLE + ")")));
      s.onerror = () => reject(new Error("the portable runtime is missing (" + BUNDLE + ")"));
      (doc.head || doc.documentElement).appendChild(s);
    });
    return bundle;
  }

  /** The repository path of a module URL ("resources/…/x.js"), or null when it is not inside this repository. */
  function pathOf(url) {
    if (!REPO) return null;
    let u; try { u = new URL(url, root.location.href); } catch (e) { return null; }
    u.search = ""; u.hash = "";
    return u.href.startsWith(REPO) ? decodeURIComponent(u.href.slice(REPO.length)) : null;
  }

  /** Load a source module by URL: import() when served; the portable runtime's copy of that very module otherwise. */
  function load(url) {
    if (!portable) return import(url);
    const p = pathOf(url);
    if (!p) return Promise.reject(new Error("BLOOM.modules.load: not a module of this game (" + url + ")"));
    return ready().then(B => B.load(p));
  }

  root.BLOOM = Object.assign(root.BLOOM || {}, { modules: Object.freeze({ version: 1, served, portable, repo: REPO, bundle: BUNDLE, load, ready, pathOf }) });
})(typeof window !== "undefined" ? window : globalThis);
