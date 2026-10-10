// BLOOM — assemble the GitHub Pages site (BLOOM-031): the production game's static files, copied as they are, nothing built.
// docs/PORTABLE_RUNTIME_v1.md §Pages. Used by .github/workflows/pages.yml and by tools/portable-runtime-check.js (which serves the
// result under a /bloom/ project subpath, as https://<owner>.github.io/bloom/ will).
//
//   node tools/build-pages-site.mjs [outDir]          (default: _site, gitignored; replaced each time)
//
// The site is the served (HTTP) production path — (BLOOM-033) the ONE production document, the root index.html, and the content /
// planets / resources it loads by RELATIVE URLs — so the same game runs at / and under any subpath. No server code, no generated bundle
// (the portable runtime in dist/ is for file:// copies only), no developer pages (demos/demo-run.html is a developer harness since
// BLOOM-033; the demos/main-menu.html alias with it), docs, tools or evidence. Node built-ins only.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SITE = ["index.html", "content", "planets", "resources"];
const SKIP = /(^|\/)(\.DS_Store|Icon\r?|\._.*)$/;

export function buildSite(root, out) {
  fs.rmSync(out, { recursive: true, force: true });
  const files = [];
  const copy = rel => {
    const src = path.join(root, rel), st = fs.statSync(src);
    if (st.isDirectory()) { for (const n of fs.readdirSync(src).sort()) copy(path.posix.join(rel, n)); return; }
    if (SKIP.test(rel)) return;
    fs.mkdirSync(path.dirname(path.join(out, rel)), { recursive: true });
    fs.copyFileSync(src, path.join(out, rel)); files.push(rel);
  };
  for (const rel of SITE) copy(rel);
  return files;
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))) {   // (realpath: /var → /private/var on macOS)
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const out = path.resolve(root, process.argv[2] || "_site");
  const files = buildSite(root, out);
  const bytes = files.reduce((n, f) => n + fs.statSync(path.join(out, f)).size, 0);
  console.log(`${path.relative(root, out) || out}: ${files.length} files, ${bytes} B`);
}
