// BLOOM-038 design audit — CONTACT SHEETS for the visual atlas (READ-ONLY research tooling).
//
//   NODE_PATH="$(npm root -g)" node tools/research/design-audit/contact-sheet.js
//
// Reads docs/evidence/bloom-038/visual-atlas-index.json (+ run1024.json, surplus2560.json) and writes
//   visual-atlas/contact/by-ui-state.html · by-phase.html · by-viewport.html · by-run.html · run1024.html · surplus2560.html
// (thumbnail grids with each capture's key metrics; click a thumbnail for the full image), plus composite JPEG grids
//   visual-atlas/contact/grid-*.jpg (a page of thumbnails screenshotted with Chromium) for quick scanning.
// The contact-sheet list is written back into the index (contactSheets).
"use strict";
const path = require("path"), fs = require("fs");
const ROOT = path.resolve(__dirname, "../../.."), EVD = path.join(ROOT, "docs/evidence/bloom-038"), CD = path.join(EVD, "visual-atlas/contact"), INDEX = path.join(EVD, "visual-atlas-index.json");
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const rel = f => "../../" + f; // index paths are relative to docs/evidence/bloom-038; sheets live in visual-atlas/contact/

const idx = JSON.parse(fs.readFileSync(INDEX, "utf8"));
const extra = [];
for (const f of ["run1024.json", "surplus2560.json"]) { const p = path.join(EVD, f); if (!fs.existsSync(p)) continue; const j = JSON.parse(fs.readFileSync(p, "utf8"));
  const shots = j.shots || (j.runs || []).flatMap(r => r.shots || []); for (const s of shots) extra.push({ ...s, uiState: s.uiState, phase: s.phase, scene: s.scene }); }
const all = idx.shots.concat(extra);
const kv = s => { const m = s.metrics || {}; const bits = [];
  if (m.map) bits.push(`world ${Math.round(m.map.worldShareOfViewport * 100)}% of vp`, `visible ${Math.round(m.map.worldUnobscuredShare * 100)}%`, `tile ${m.map.tilePx}px`);
  if (m.labels) bits.push(`labels ${m.labels.count} (${m.labels.fontPx}px, ${m.labels.overlaps} ovl)`);
  if (m.whitespace) bits.push(`bare ${Math.round(m.whitespace.bareShare * 100)}%`);
  if (m.prose) bits.push(`max ${m.prose.maxLineChars} ch/line`);
  if (s.coverage != null) bits.push(`cov ${Math.round(s.coverage * 100)}%`); return bits.join(" · "); };
const css = `body{margin:0;font:13px/1.35 system-ui,sans-serif;background:#14171a;color:#e8e4da}h1{font-size:18px;margin:16px}h2{font-size:15px;margin:22px 16px 8px;color:#f2c76e;position:sticky;top:0;background:#14171a;padding:6px 0;z-index:1}
.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;padding:0 16px}figure{margin:0;background:#1f2328;border-radius:6px;overflow:hidden}figure img{width:100%;display:block;aspect-ratio:16/10;object-fit:contain;background:#000}
figcaption{padding:6px 8px}figcaption b{display:block;font-size:12px;word-break:break-all}figcaption small{color:#aab;display:block}nav{margin:0 16px}nav a{color:#9cf;margin-right:12px}`;
const NAV = `<nav><a href="by-ui-state.html">by UI state</a><a href="by-phase.html">by phase</a><a href="by-viewport.html">by viewport</a><a href="by-run.html">by run</a><a href="run1024.html">1024 full runs</a><a href="surplus2560.html">2560 traversal</a></nav>`;
function page(title, groups, file) {
  const body = Object.entries(groups).map(([g, list]) => `<h2>${esc(g)} <small>(${list.length})</small></h2><div class="g">` + list.map(s => `<figure><a href="${esc(rel(s.file))}"><img loading="lazy" src="${esc(rel(s.file))}" alt=""></a><figcaption><b>${esc(s.id)}</b><small>${esc([s.route, s.species, s.archetype, s.seed != null ? "seed " + s.seed : null, s.challenge, s.launchSeed != null ? "launch " + s.launchSeed : null, s.phase, s.uiState, s.viewport].filter(Boolean).join(" · "))}</small><small>${esc(kv(s))}</small></figcaption></figure>`).join("") + `</div>`).join("");
  fs.writeFileSync(path.join(CD, file), `<!doctype html><meta charset="utf-8"><title>${esc(title)}</title><style>${css}</style><h1>${esc(title)}</h1>${NAV}${body}`); return `visual-atlas/contact/${file}`;
}
const group = (list, key) => { const g = {}; for (const s of list) { const k = typeof key === "function" ? key(s) : s[key] || "—"; (g[k] = g[k] || []).push(s); } return Object.fromEntries(Object.entries(g).sort()); };
fs.mkdirSync(CD, { recursive: true });
const sheets = [];
sheets.push(page("BLOOM-038 visual atlas — by UI state", group(idx.shots, "uiState"), "by-ui-state.html"));
sheets.push(page("BLOOM-038 visual atlas — by phase", group(idx.shots, "phase"), "by-phase.html"));
sheets.push(page("BLOOM-038 visual atlas — by viewport", group(idx.shots, "viewport"), "by-viewport.html"));
sheets.push(page("BLOOM-038 visual atlas — by run", group(idx.shots, s => s.runId + " " + [s.route, s.species, s.archetype, s.seed, s.challenge].filter(x => x != null).join(" ")), "by-run.html"));
sheets.push(page("BLOOM-038 — 1024×768 full runs", group(extra.filter(s => /run1024/.test(s.runId)), "runId"), "run1024.html"));
sheets.push(page("BLOOM-038 — 2560×1440 traversal", group(extra.filter(s => /surplus2560/.test(s.runId)), "runId"), "surplus2560.html"));

// composite grids: thumbnails laid out on a page, screenshotted (JPEG)
const GRIDS = [
  ["grid-base-1440", "Base map at 1440×900, every run and phase", s => s.uiState === "base" && s.viewport === "1440x900"],
  ["grid-base-1024", "Base map at 1024×768, every run and phase", s => s.uiState === "base" && s.viewport === "1024x768"],
  ["grid-selected-1024", "Selected region (banner) at 1024×768", s => /^selected/.test(s.uiState) && s.viewport === "1024x768"],
  ["grid-rooms-1024", "Decision rooms at 1024×768", s => /^(regions|adapt|spread|terraform)/.test(s.uiState) && s.viewport === "1024x768"],
  ["grid-rooms-2560", "Decision rooms at 2560×1440", s => /^(regions|adapt|spread|terraform)/.test(s.uiState) && s.viewport === "2560x1440"],
  ["grid-overlays", "Map View lenses, previews, scenario details, climate (1440)", s => /^(mapview|lens|home|banner|scenario|climate)/.test(s.uiState) && s.viewport === "1440x900"],
  ["grid-reports", "Reports (all viewports)", s => s.uiState === "report"],
  ["grid-planning-390", "Planning screens at 390×844", s => s.viewport === "390x844"],
  ["grid-planning-2560", "Planning screens at 2560×1440", s => s.gameplay === false && s.viewport === "2560x1440"],
  ["grid-training", "Training coach", s => s.runId === "TR"],
];
(async () => {
  let pw = null; try { pw = require("playwright"); } catch (e) { console.log("playwright not available: skipping composite grids"); }
  if (pw) { const b = await pw.chromium.launch(); const c = await b.newContext({ viewport: { width: 2000, height: 1000 }, deviceScaleFactor: 1 }); const p = await c.newPage();
    for (const [name, title, f] of GRIDS) { const list = idx.shots.filter(f); if (!list.length) continue; const cols = list.length > 16 ? 5 : 4;
      const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#111;color:#eee;font:14px system-ui}h1{font-size:20px;margin:12px}.g{display:grid;grid-template-columns:repeat(${cols},1fr);gap:8px;padding:0 12px 12px}figure{margin:0}img{width:100%;display:block;background:#000}figcaption{font-size:11px;padding:2px 0;word-break:break-all}</style><h1>${esc(title)} (${list.length})</h1><div class="g">` +
        list.map(s => `<figure><img src="${"file://" + path.join(EVD, s.file).split("/").map(encodeURIComponent).join("/")}"><figcaption>${esc(s.id)}</figcaption></figure>`).join("") + "</div>";
      const tmp = path.join(CD, `.${name}.html`); fs.writeFileSync(tmp, html); await p.goto("file://" + tmp.split("/").map(encodeURIComponent).join("/")); await p.waitForTimeout(400);
      await p.evaluate(() => Promise.all([...document.images].map(i => i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r; }))));
      await p.screenshot({ path: path.join(CD, name + ".jpg"), type: "jpeg", quality: 70, fullPage: true }); fs.unlinkSync(tmp); sheets.push(`visual-atlas/contact/${name}.jpg`); console.log("grid", name, list.length); }
    await b.close(); }
  idx.contactSheets = sheets; fs.writeFileSync(INDEX, JSON.stringify(idx)); console.log(sheets.join("\n"));
})();
