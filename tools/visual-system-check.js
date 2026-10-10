// BLOOM — Visual-system convergence check (BLOOM-034): ONE shared visual-token system (resources/ui/bloom-theme.css) for the whole game;
// the title / menu and the Destination Survey restyled in the gameplay language on a darker, outer-space ground; gameplay itself unchanged.
// docs/VISUAL_SYSTEM_v1.md.
//
//   NODE_PATH="$(npm root -g)" node tools/visual-system-check.js [--browsers chromium,firefox] [--evidence]
//
// Node (V1–V10): the theme file (tokens + two neutral primitives; no element rule, no web font, no external URL, no backdrop-filter); every
// host document loads it FIRST; every gameplay token that moved into it keeps its BLOOM-033 value exactly (79f5540, parsed, value by value);
// the planning screens read their font and colours from it (no serif, no gold-plaque tokens, no ornamental corner marks); the planning
// icon family is gameplay's (identical path data for every shared glyph; no text arrows, no emoji); WCAG contrast of the night tokens;
// scope (engine, generator, survey data / worker / pool, sphere, transition, plant art, the twelve paintings, gameplay code: byte-identical
// to 79f5540); the portable runtime is current and carries the shared icon module; the current docs record the milestone honestly.
// Browser (Chromium AND Firefox; a static server for this tree and one for the 79f5540 tree):
//   T · the title: the gameplay font on every interface element, EXPEDITION = the gameplay leaf button, icon + word entries, the dark planning
//       card; all twelve paintings load untouched and the title text stays readable over every one of them (measured on the paintings' pixels)
//   D · dialogs (Settings, Credits, the first-run recommendation): the same font / night card; their buttons' words unchanged
//   S · the Destination Survey: the gameplay font; the class columns = the gameplay statuses (icon + word); focus → the dossier's category rows,
//       habitability key, Begin expedition in view and unobscured at 1024×768 … 2560×1440
//   G · gameplay unchanged: the run (HUD, map banner), the Adapt room, the report and the training coach have IDENTICAL computed styles on
//       this tree and on 79f5540 (every element, colour / font / border / radius / shadow / spacing)
//   L · layout: no horizontal scroll, the card / dossier inside the viewport, at 390×844, 1024×768, 1280×720, 1440×900, 1920×1080, 2560×1440
//   A · accessibility: keyboard focus rings (3 px, the night focus colour), arrow navigation, reduced motion (no entrance, no hover travel)
//   P · file:// (the double-clicked index.html, offline): the restyled title and survey come from the portable runtime
//   no console error, no unhandled rejection, every request local.
// --evidence writes docs/evidence/bloom-034/ (the screenshot matrix + visual-system-proof.json). Exits 1 on any failure.
"use strict";
const path = require("path"), fs = require("fs"), http = require("http"), cp = require("child_process"), crypto = require("crypto"), os = require("os");
const ROOT = path.resolve(__dirname, "..");
const argv = process.argv, argOf = k => { const i = argv.indexOf(k); return i > 0 ? argv[i + 1] : null; };
const BROWSERS = (argOf("--browsers") || "chromium,firefox").split(","), EVIDENCE = argv.includes("--evidence");
const EVD = path.join(ROOT, "docs/evidence/bloom-034");
const BASE_SHA = "79f554060bb2c4a3e2e8bcc2628de1486e5ff902";   // the accepted start (BLOOM-033 closeout, main)
let fails = 0, passes = 0; const t0 = Date.now();
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (ok) passes++; else fails++; return ok; };
const info = (name, detail) => console.log(`INFO  ${name}  — ${detail}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const J = JSON.stringify, read = f => fs.readFileSync(path.join(ROOT, f), "utf8");
const sha256 = b => crypto.createHash("sha256").update(b).digest("hex");
const git = a => cp.execSync(`git ${a}`, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 256 << 20 }).trim();
const atBase = f => git(`show ${BASE_SHA}:"${f}"`);
// (BLOOM-035B) V7's scope is BLOOM-034's OWN range: 79f5540 → its integrated end (455b51b, the corrected review tip) — later milestones that
// legitimately work elsewhere (e.g. BLOOM-035B's species engine and survey) never trip it; with no later commit the working tree is used
const END_034 = "455b51b";
const LATER = (() => { try { return git(`rev-list --count ${END_034}..HEAD`) !== "0"; } catch (e) { return false; } })();
const V7_DIFF = LATER ? `${BASE_SHA} ${END_034}` : BASE_SHA, hashV7 = f => LATER ? git(`rev-parse ${END_034}:"${f}"`) : git(`hash-object "${f}"`);
const stripCss = s => s.replace(/\/\*[\s\S]*?\*\//g, "");
const PROOF = { milestone: "BLOOM-034", base: BASE_SHA, head: null, node: {}, browsers: {} };
try { PROOF.head = git("rev-parse HEAD"); } catch (e) { /* not a checkout */ }

// ---- colour helpers (WCAG 2.x)
const hex = h => { h = h.replace("#", ""); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
const lum = ([r, g, b]) => { const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

/** :root custom properties of a stylesheet (name → raw value). */
function rootTokens(css) { const m = stripCss(css).match(/:root\s*\{([\s\S]*?)\n\}/); const out = {}; if (!m) return out;
  for (const d of m[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[d[1]] = d[2].trim(); return out; }
/** custom properties declared in the first rule whose selector is exactly `sel` (name → raw value). */
function ruleTokens(css, sel) { const c = stripCss(css), i = c.indexOf(sel + "{"); if (i < 0) return null; const body = c.slice(i + sel.length + 1, c.indexOf("}", i));
  const out = {}; for (const d of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+?)\s*(?:;|$)/g)) out[d[1]] = d[2].trim(); return out; }

(async () => {
  // ================================================================================================ NODE
  console.log("# V · the shared token system, its consumers, the icon family, contrast, scope, the portable runtime, the docs");
  const THEME = read("resources/ui/bloom-theme.css"), T = rootTokens(THEME);
  const { ICONS: ICONS_SRC } = await import("file://" + path.join(ROOT, "resources/ui/bloom-icons.js"));
  // (as a browser serializes them: <path …/> → <path …></path>)
  const ICONS = Object.fromEntries(Object.entries(ICONS_SRC).map(([k, v]) => [k, v.replace(/<(\w+)([^>]*?)\/>/g, "<$1$2></$1>")]));
  const tv = v => { const m = /^var\((--bloom-[\w-]+)\)$/.exec(v); return m ? T[m[1]] : null; };
  // V1 · the theme file
  { const rules = stripCss(THEME).replace(/:root\s*\{[\s\S]*?\n\}/, ""), sels = [...rules.matchAll(/([^{}]+)\{[^}]*\}/g)].map(m => m[1].trim());
    const need = ["--bloom-font", "--bloom-r-lg", "--bloom-r-md", "--bloom-r-btn", "--bloom-leaf", "--bloom-bloom", "--bloom-sky", "--bloom-gold", "--bloom-pressure", "--bloom-ok", "--bloom-warn", "--bloom-bad",
      "--bloom-card", "--bloom-ink", "--bloom-night-card", "--bloom-night-ink", "--bloom-space-0", "--bloom-ok-night", "--bloom-warn-night", "--bloom-bad-night", "--bloom-focus-night", "--bloom-cat-temperature", "--bloom-cat-hazard-night"];
    const missing = need.filter(k => !T[k]);
    check(!missing.length && J(sels) === J([".bloom-ic", ".bloom-sr-only"]) && !/url\(|@import|https?:|@font-face|backdrop-filter/.test(stripCss(THEME)) && /ui-rounded/.test(T["--bloom-font"]) && !/serif"?\s*,|Palatino|Georgia/.test(T["--bloom-font"].replace(/sans-serif/, "")),
      "V1 · resources/ui/bloom-theme.css is the shared visual-token system: :root tokens for type (the gameplay rounded family, system fonts only), shape (the irregular rounded-corner family, chunky control sizes), the gameplay semantic hues (leaf · bloom · sky · Biomass gold · pressure · OK / warning / blocked), the category identity, the LIGHT gameplay surfaces and their NIGHT planning counterparts — plus only two neutral primitives (.bloom-ic, .bloom-sr-only); no element rule, no web font, no url(), no @import, no backdrop-filter",
      `${Object.keys(T).length} tokens · rules ${J(sels)} · missing ${J(missing)}`); }
  // V2 · every host document loads it first
  { const hosts = ["index.html", "demos/main-menu.html", "demos/demo-run.html", "demos/destination-survey.html", "demos/expedition-descent.html"];
    const bad = hosts.filter(f => { const links = [...read(f).replace(/<!--[\s\S]*?-->/g, "").matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].map(m => m[1]); return !links.length || !/(^|\/)resources\/ui\/bloom-theme\.css$/.test(links[0]); });
    const anyOther = git("ls-files -- '*.html'").split("\n").filter(f => f && !f.startsWith("docs/") && /(planet-view|destination-survey|main-menu|decision-rooms|run-report)\.css/.test(read(f)) && !hosts.includes(f));
    check(!bad.length && !anyOther.length, "V2 · every document that styles a player-facing surface loads bloom-theme.css as its FIRST stylesheet (index.html and the developer harnesses demos/main-menu.html · demo-run.html · destination-survey.html · expedition-descent.html); the training coach's stylesheet is only ever added inside those documents",
      `missing / not first ${J(bad)} · unlisted hosts ${J(anyOther)}`); }
  // V3 · the gameplay tokens moved into the theme with their exact BLOOM-033 values
  { const rows = [], groups = [["resources/run-ui/planet-view.css", ".pv"], ["resources/run-ui/run-report.css", null], ["resources/training/training-coach.css", ".tc-layer"]];
    for (const [f, sel] of groups) {
      const now = read(f), old = atBase(f);
      const pairs = sel ? [[ruleTokens(now, sel), ruleTokens(old, sel)]] : [[ruleTokens(now, ".rr"), ruleTokens(old, ".rr")]];
      for (const [n, o] of pairs) for (const [k, v] of Object.entries(n)) { if (!/^var\(--bloom-/.test(v)) continue; rows.push({ f, k, base: o[k], theme: tv(v), via: v }); }
    }
    for (const c of ["Temperature", "Water", "Soil", "Hazard"]) { const sel = `.bc[data-cat="${c}"]`, n = ruleTokens(read("resources/run-ui/planet-view.css"), sel), o = ruleTokens(atBase("resources/run-ui/planet-view.css"), sel);
      for (const [k, v] of Object.entries(n)) rows.push({ f: "planet-view.css " + sel, k, base: o[k], theme: tv(v), via: v }); }
    // the skip dialog's literals → theme tokens
    const skipOld = stripCss(atBase("resources/training/training-coach.css")), skipNew = stripCss(read("resources/training/training-coach.css"));
    const lit = (src, sel, prop) => { const i = src.indexOf(sel + "{"); const body = src.slice(i, src.indexOf("}", i)); const m = new RegExp(`(?:^|[;{\\s])${prop}:([^;}]+)`).exec(body); return m && m[1].trim(); };
    for (const [sel, prop] of [[".tsk-card", "background"], [".tsk-card", "border-radius"], [".tsk-card p", "color"], [".tsk-btn", "background"], [".tsk-btn", "color"], [".tsk-btn", "border-radius"]]) {
      const v = lit(skipNew, sel, prop); rows.push({ f: "training-coach.css " + sel, k: prop, base: lit(skipOld, sel, prop), theme: tv(v), via: v }); }
    const norm = s => (s || "").replace(/\s+/g, " ").trim();
    const off = rows.filter(r => norm(r.base) !== norm(r.theme));
    PROOF.node.gameplayTokens = { compared: rows.length, differing: off };
    check(rows.length >= 45 && !off.length, "V3 · gameplay reads the SAME values from the theme: every gameplay token now written var(--bloom-…) (the Planet View's palette, radii, shadow and font; the four category identities; the run report's card tokens; the training coach's and its Skip dialog's colours) resolves to exactly the value it had on 79f5540 — one source, no gameplay colour changed",
      `${rows.length} tokens compared · differing ${J(off.slice(0, 4))}`); }
  // V4 · the planning screens read the theme; the serif / gold-plaque language is retired
  { const mm = stripCss(read("resources/main-menu/main-menu.css")), ds = stripCss(read("resources/destination-survey/destination-survey.css")), mmjs = read("resources/main-menu/main-menu.js"), boot = read("resources/main-menu/title-boot.js");
    const fonts = [...(mm + ds).matchAll(/font-family:([^;}]+)/g)].map(m => m[1].trim()).filter(v => v !== "var(--bloom-font)" && v !== "var(--font)");
    const serif = /Palatino|Georgia|Book Antiqua|Hoefler|Iowan|Times New Roman|(?<!sans-)serif/.test(mm + ds + boot.replace(/sans-serif/g, ""));
    const plaque = /--gold-line|--plaque|--serif|mm-corner/.test(mm + mmjs), dsFont = /--font:var\(--bloom-font\)/.test(ds), mmFont = /font-family:var\(--bloom-font\)/.test(mm);
    const classes = /--favorable:var\(--bloom-ok-night\); --precarious:var\(--bloom-warn-night\); --extreme:var\(--bloom-bad-night\)/.test(ds);
    const hexes = s => (s.match(/#[0-9a-fA-F]{3,8}\b/g) || []).filter(h => !/^#fff(fff)?$/i.test(h));   // (white: gameplay's label on a coloured button)
    check(!fonts.length && !serif && !plaque && dsFont && mmFont && classes && hexes(mm).length <= 2 && hexes(ds).length <= 2,
      "V4 · the title / menu and the Destination Survey read their font and colours from the theme: the gameplay font family only (no serif anywhere — the boot notice included), no gold-plaque tokens, no ornamental corner marks; the survey classes ARE the gameplay statuses (Favorable = OK, Precarious = warning, Extreme = blocked, on-night values); at most a couple of literal colours left in either stylesheet (gradient stops of the title)",
      J({ fonts, serif, plaque, hexMenu: hexes(mm), hexSurvey: hexes(ds) })); }
  // V5 · the icon family
  { const { ico } = await import("file://" + path.join(ROOT, "resources/ui/bloom-icons.js"));
    const tableOf = f => { const src = read(f), i = src.indexOf("const I = {"), body = src.slice(i, src.indexOf("\n  };", i)); const o = {};
      for (const m of body.matchAll(/(\w+): '([^']*)'/g)) o[m[1]] = m[2]; return o; };
    const ICONS = ICONS_SRC, G = Object.assign({}, tableOf("resources/run-ui/run-report.js"), tableOf("resources/run-ui/decision-rooms.js"), tableOf("resources/run-ui/planet-view.js"));
    const shared = Object.keys(ICONS).filter(k => G[k]), differ = shared.filter(k => G[k] !== ICONS[k]), fresh = Object.keys(ICONS).filter(k => !G[k]);
    const plan = ["resources/main-menu/main-menu.js", "resources/destination-survey/destination-survey.js"].map(read).join("\n");
    const code = plan.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, ""), rawSvg = (code.match(/<svg/g) || []).length, arrows = /←|→/.test(code), emoji = /\p{Extended_Pictographic}/u.test(plan + read("resources/ui/bloom-icons.js"));
    const sample = ico("world"), shape = /^<svg class="ic bloom-ic" viewBox="0 0 24 24" aria-hidden="true" focusable="false">/.test(sample) && !/<title|<text/.test(Object.values(ICONS).join(""));
    const imports = /import \{ ico \} from "\.\.\/ui\/bloom-icons\.js";/.test(read("resources/main-menu/main-menu.js")) && /import \{ ico \} from "\.\.\/ui\/bloom-icons\.js";/.test(read("resources/destination-survey/destination-survey.js"));
    PROOF.node.icons = { shared, fresh };
    check(shared.length >= 15 && !differ.length && J(fresh.sort()) === J(["scan", "settings"]) && !rawSvg && !arrows && !emoji && shape && imports,
      "V5 · the planning screens speak the gameplay icon language: resources/ui/bloom-icons.js (imported by the menu and the survey) carries every glyph gameplay already has with IDENTICAL path data, plus two new ones on the same 24-grid stroke (settings, scan); decorative (aria-hidden) beside a real word; no inline SVG of their own, no text arrows, no emoji",
      `${shared.length} shared (identical) · new ${J(fresh)} · differing ${J(differ)}`); }
  // V6 · contrast of the night tokens (WCAG 2.x)
  { const bgs = { card: hex(T["--bloom-night-card-solid"]), space: hex(T["--bloom-space-1"]), raised: hex(T["--bloom-night-paper"]) }, rows = [];
    const text = ["--bloom-night-ink", "--bloom-night-ink-soft", "--bloom-night-ink-faint", "--bloom-leaf-night", "--bloom-bloom-night", "--bloom-sky-night", "--bloom-gold-night", "--bloom-pressure-night",
      "--bloom-ok-night", "--bloom-warn-night", "--bloom-bad-night", "--bloom-cat-temperature-night", "--bloom-cat-water-night", "--bloom-cat-soil-night", "--bloom-cat-hazard-night"];
    for (const k of text) for (const [b, c] of Object.entries(bgs)) rows.push({ k, on: b, ratio: +contrast(hex(T[k]), c).toFixed(2) });
    const focus = Object.entries(bgs).map(([b, c]) => ({ on: b, ratio: +contrast(hex(T["--bloom-focus-night"]), c).toFixed(2) }));
    const white = Object.fromEntries(["--bloom-leaf-btn-night", "--bloom-leaf-btn-night-hover", "--bloom-sky-btn-night", "--bloom-sky-btn-night-hover"].map(k => [k.slice(8), +contrast([255, 255, 255], hex(T[k])).toFixed(2)]));
    const gameplayPair = { leaf: +contrast([255, 255, 255], hex(T["--bloom-leaf"])).toFixed(2), sky: +contrast([255, 255, 255], hex(T["--bloom-sky"])).toFixed(2) };   // (gameplay's own buttons: unchanged, reported)
    PROOF.node.contrast = { text: rows, focus, whiteOnPlanningButtons: white, gameplayButtonsUnchanged: gameplayPair };
    const low = rows.filter(r => r.ratio < 4.5), inkMin = Math.min(...rows.filter(r => r.k === "--bloom-night-ink").map(r => r.ratio));
    check(!low.length && inkMin >= 12 && focus.every(f => f.ratio >= 3) && Object.values(white).every(r => r >= 4.5),
      "V6 · night text tokens meet WCAG AA (≥ 4.5 : 1) on every night surface (the solid card, deep space, a raised control) — ink ≥ 12 : 1 — and the night focus ring ≥ 3 : 1 (non-text); the planning leaf / sky button shades carry a white word at ≥ 4.5 : 1 at rest and under the pointer / pressed (gameplay's own leaf / sky buttons are not changed)",
      `min ${Math.min(...rows.map(r => r.ratio))} : 1 · ink ≥ ${inkMin} · focus ${focus.map(f => f.ratio).join(" / ")} · white on ${Object.entries(white).map(([k, v]) => k + " " + v).join(", ")} · (gameplay leaf ${gameplayPair.leaf} / sky ${gameplayPair.sky}, unchanged)${low.length ? " · LOW " + J(low) : ""}`); }
  // V7 · scope: what this milestone may touch, and what stays byte-identical
  { const changed = [...new Set([...git(`diff --name-only ${V7_DIFF}`).split("\n"), ...(LATER ? [] : git("ls-files --others --exclude-standard").split("\n"))].filter(Boolean))];
    const ALLOWED = p => /^(resources\/ui\/|tools\/|docs\/)/.test(p) || ["index.html", "README.md", "GAME_BIBLE.md", "demos/main-menu.html", "demos/demo-run.html", "demos/destination-survey.html", "demos/expedition-descent.html",
      "resources/main-menu/main-menu.css", "resources/main-menu/main-menu.js", "resources/main-menu/title-boot.js", "resources/destination-survey/destination-survey.css", "resources/destination-survey/destination-survey.js",
      "resources/run-ui/planet-view.css", "resources/run-ui/run-report.css", "resources/training/training-coach.css", "dist/portable/strange-bloom.portable.js", "dist/portable/manifest.json"].includes(p);
    const outside = changed.filter(p => !ALLOWED(p));
    const PROTECTED = git(`ls-tree -r --name-only ${BASE_SHA} -- content planets resources/bloom-sim.js resources/bloom-gen.js resources/bloom-validate.js resources/bloom-witness.js resources/bloom-archetype.js resources/bloom-scenario.js resources/bloom-play.js resources/bloom-play-worker.js resources/planet-sphere resources/planet-surface resources/atmosphere-transition resources/plant-visual resources/main-menu/backgrounds resources/destination-survey/survey-data.js resources/destination-survey/survey-worker.js resources/destination-survey/sector-pool.js resources/main-menu/main-menu-data.js resources/main-menu/expedition-entry.js resources/main-menu/black-fade.js resources/app resources/run resources/training/training-run.js resources/training/training-coach.js resources/training/training-director.js resources/training/training-steps.js resources/training/training-store.js resources/run-ui/planet-view.js resources/run-ui/decision-rooms.js resources/run-ui/decision-rooms.css resources/run-ui/run-report.js resources/run-ui/run-ui-adapter.js resources/run-ui/run-map-renderer.js resources/run-ui/plant-specimen.js resources/run-ui/terraform-globe.js resources/run-ui/gameplay-transition.js art`).split("\n").filter(Boolean);
    const differ = PROTECTED.filter(f => git(`rev-parse ${BASE_SHA}:"${f}"`) !== hashV7(f));
    const paintings = PROTECTED.filter(f => /backgrounds\/menu-\d\d\.jpg$/.test(f));
    PROOF.node.scope = { changed: changed.filter(p => !p.startsWith("docs/evidence/")), protectedFiles: PROTECTED.length, paintings: paintings.map(f => ({ f, sha256: sha256(fs.readFileSync(path.join(ROOT, f))) })) };
    check(!outside.length && !differ.length && paintings.length === 12,
      `V7 · scope: only the theme / icon module, the title + survey presentation, the gameplay stylesheets' token wiring, the host documents' theme link, the regenerated portable bundle, tools and docs changed; ${PROTECTED.length} files are byte-identical to 79f5540 — engine, generator, validators, content, planets, the survey's data / worker / pool, the sphere, surface, transition, the Organic Hybrid art + plant pipeline, the app / session / training code, every gameplay script and the rooms' stylesheet — and the TWELVE hand-painted backgrounds`,
      outside.join(", ") || differ.join(", ") || `${changed.length} files changed`); }
  // V8 · the portable runtime is current and carries the shared icon module
  { const { buildPortable, BUNDLE } = await import("file://" + path.join(ROOT, "tools/build-portable.mjs"));
    const a = await buildPortable(ROOT), cur = Object.entries(a.files).every(([k, v]) => fs.existsSync(path.join(ROOT, k)) && fs.readFileSync(path.join(ROOT, k)).equals(v));
    PROOF.node.portable = { fingerprint: a.manifest.fingerprint, modules: a.manifest.modules };
    check(cur && a.manifest.inputs.some(i => i.path === "resources/ui/bloom-icons.js") && /bloom-ic/.test(a.files[BUNDLE].toString("utf8")),
      "V8 · the committed portable runtime (dist/portable/, what a double-clicked index.html runs) equals a fresh build of this tree and bundles the shared icon module (the stylesheets are linked by index.html itself)",
      `fingerprint ${a.manifest.fingerprint.slice(0, 16)}… · ${a.manifest.modules.length} modules`); }
  // V9 · main-menu-check's M7 rule still holds in spirit: the menu imports its data module and the shared icon module only
  { const imp = [...read("resources/main-menu/main-menu.js").matchAll(/^import .* from "([^"]+)";?/gm)].map(m => m[1]);
    check(J(imp) === J(["./main-menu-data.js", "../ui/bloom-icons.js"]), "V9 · MainMenu imports exactly its data module and the shared icon module (still nothing of the survey, sphere, transition, pool, workers or canvas)", J(imp)); }
  // V10 · docs
  { const pd = read("docs/PRODUCT_DIRECTION_CURRENT.md"), vs = fs.existsSync(path.join(ROOT, "docs/VISUAL_SYSTEM_v1.md")) ? read("docs/VISUAL_SYSTEM_v1.md") : "";
    const honest = !/Species (exist|are implemented)|Challenges (exist|are implemented)|BLOOM-035 (has begun|is in progress)|BLOOM-036 (has begun|is in progress)/i.test(pd);
    check(/bloom-theme\.css/.test(pd) && /VISUAL_SYSTEM_v1\.md/.test(pd) && /bloom-theme\.css/.test(vs) && /BLOOM-034/.test(vs) && honest && /CHALLENGES: PLANNED/.test(pd),
      "V10 · docs: docs/VISUAL_SYSTEM_v1.md records the token system, the night counterparts and the planning-screen language; docs/PRODUCT_DIRECTION_CURRENT.md records BLOOM-034's state honestly (Species, Challenges still PLANNED)"); }

  // ================================================================================================ BROWSER
  let pw; try { pw = require("playwright"); } catch (e) { check(false, "playwright", "not installed: NODE_PATH=\"$(npm root -g)\""); return done(); }
  const BASE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "bloom034-base-"));
  cp.execSync(`git archive ${BASE_SHA} | tar -x -C "${BASE_DIR}"`, { cwd: ROOT, shell: "/bin/sh" });
  const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml" };
  const serve = dir => new Promise(r => { const s = http.createServer((req, res) => { const u = new URL(req.url, "http://x"); let p = decodeURIComponent(u.pathname); if (p.endsWith("/")) p += "index.html";
    const f = path.join(dir, p); if (!f.startsWith(dir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-store" }); fs.createReadStream(f).pipe(res); });
    s.listen(0, "127.0.0.1", () => r(s)); });
  const srvHead = await serve(ROOT), srvBase = await serve(BASE_DIR);
  const HEAD_O = `http://127.0.0.1:${srvHead.address().port}`, BASE_O = `http://127.0.0.1:${srvBase.address().port}`;
  const Q = "?sector=77&workers=3&bg=3";
  if (EVIDENCE) fs.mkdirSync(EVD, { recursive: true });

  for (const bn of BROWSERS) {
    const browser = await pw[bn].launch(); const ver = browser.version(); console.log(`\n# ${bn} ${ver}`); const B = PROOF.browsers[bn] = { version: ver };
    const shotOn = bn === "chromium";
    try {
      const context = async ({ w = 1440, h = 900, trained = true, reducedMotion = null, offline = false } = {}) => {
        const c = await browser.newContext({ viewport: { width: w, height: h }, ...(reducedMotion ? { reducedMotion } : {}) });
        if (offline) await c.setOffline(true);
        await c.addInitScript(t => { try { if (t) localStorage.setItem("strange-bloom.training", '{"v":1,"status":"completed","at":1}'); } catch (e) { /* none */ } }, trained);
        return c; };
      const page = async c => { const p = await c.newPage(); p.errs = []; p.reqs = [];
        p.on("pageerror", e => p.errs.push("pageerror: " + e.message)); p.on("console", m => { if (m.type() === "error") p.errs.push("console: " + m.text()); }); p.on("request", r => p.reqs.push(r.url())); return p; };
      const menuReady = p => p.waitForFunction(() => window.MENU_DEV && MENU_DEV.ready && MENU_DEV.entry.state === "menu", null, { timeout: 60000, polling: 100 });
      const surveyReady = p => p.waitForFunction(() => { const s = MENU_DEV.entry.survey; return s && s.state === "survey" && s.cells.every(Boolean); }, null, { timeout: 180000, polling: 100 });
      const focusOn = async (p, i) => { await p.evaluate(i => MENU_DEV.entry.survey.select(i), i); await p.waitForFunction(() => MENU_DEV.entry.survey.state === "focus", null, { timeout: 20000, polling: 50 }); await sleep(1100); };
      const runReady = p => p.waitForFunction(() => window.BLOOM_APP && BLOOM_APP.session && !BLOOM_APP.busy && !document.querySelector(".atx") && MENU_DEV.entry.state === "away" && document.getElementById("pv"), null, { timeout: 90000, polling: 50 });
      const shot = async (p, name, opts = {}) => { if (EVIDENCE && shotOn) await p.screenshot({ path: path.join(EVD, name), ...(name.endsWith(".jpg") ? { type: "jpeg", quality: 90 } : {}), ...opts }); };   // (stills over a painting: JPEG — the paintings are JPEG themselves)
      const local = (p, o) => p.reqs.filter(u => !(u.startsWith(o) || u.startsWith("data:") || u.startsWith("blob:") || u.startsWith("file:")));
      const css = (p, sel, props) => p.evaluate(([sel, props]) => { const e = document.querySelector(sel); if (!e) return null; const s = getComputedStyle(e); return Object.fromEntries(props.map(k => [k, s.getPropertyValue(k)])); }, [sel, props]);
      const tokenRgb = (p, name) => p.evaluate(n => { const d = document.createElement("i"); d.style.color = `var(${n})`; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; }, name);

      // ------------------------------------------------------------------ T · the title
      { const c = await context(), p = await page(c); await p.goto(HEAD_O + "/" + Q); await menuReady(p); await sleep(2600);
        const gameFont = await p.evaluate(() => { const d = document.createElement("i"); d.style.fontFamily = "var(--bloom-font)"; document.body.append(d); const f = getComputedStyle(d).fontFamily; d.remove(); return f; });   // the gameplay family, as the browser resolves it
        const els = await p.evaluate(() => [".mm", "#mm-title", ".mm-sub", ".mm-item", ".mm-status", ".mm-dialog"].map(s => { const e = document.querySelector(s); return [s, e && getComputedStyle(e).fontFamily]; }));
        const leaf = await tokenRgb(p, "--bloom-leaf-btn-night"), prim = await css(p, ".mm-item.primary", ["background-color", "color", "border-top-left-radius", "min-height"]);
        const items = await p.evaluate(() => [...document.querySelectorAll(".mm-item")].map(b => ({ text: b.innerText.trim(), icon: !!b.querySelector(".mm-ico svg.bloom-ic"), h: b.getBoundingClientRect().height })));
        const card = await css(p, ".mm-plaque", ["border-top-left-radius", "border-top-right-radius", "font-family"]);
        const normF = s => (s || "").replace(/\s+/g, "").replace(/'/g, '"');
        const allGame = els.every(([, f]) => normF(f) === normF(gameFont));
        B.title = { gameFont, els, prim, items, card };
        check(allGame && prim["background-color"] === leaf && prim.color === "rgb(255, 255, 255)" && J(items.map(i => i.text)) === J(["EXPEDITION", "TRAINING", "SETTINGS", "CREDITS"])
          && items.every(i => i.icon && i.h >= 44) && card["border-top-left-radius"] === "22px" && card["border-top-right-radius"] === "18px" && !p.errs.length,
          `[${bn}] T1 · the title speaks the gameplay language: every interface element (title, subtitle, menu, status, dialogs) in the gameplay font family; EXPEDITION is the leaf button in its planning shade (white word on --bloom-leaf-btn-night, ≥ 4.5 : 1); four chunky icon + word entries (≥ 44 px), the labels unchanged; one dark planning card with the gameplay's irregular corners`,
          `${els.map(([s, f]) => s + "=" + (normF(f) === normF(gameFont) ? "game" : f)).join(" ")} · ${prim["background-color"]} · ${items.map(i => `${i.text} ${Math.round(i.h)}px`).join(" · ")}`);
        await shot(p, "01-title-1440x900.jpg");
        // T2 · every painting loads untouched and the title stays readable over it
        const paint = await p.evaluate(async () => {
          const urls = Array.from({ length: 12 }, (_, i) => `resources/main-menu/backgrounds/menu-${String(i + 1).padStart(2, "0")}.jpg`);
          const plaque = document.querySelector(".mm-plaque").getBoundingClientRect(), W = innerWidth, H = innerHeight;
          const tok = n => { const d = document.createElement("i"); d.style.color = `var(${n})`; document.body.append(d); const m = getComputedStyle(d).color.match(/\d+/g).map(Number); d.remove(); return m.slice(0, 3); };
          const L = ([r, g, b]) => { const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
          const C = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
          const inks = { title: tok("--bloom-night-ink"), bloom: tok("--bloom-bloom-night"), subtitle: tok("--bloom-leaf-night") }, card = [12, 18, 33], alpha = 0.84;   // the card's least opaque stop
          const out = [];
          for (const u of urls) {
            const img = new Image(); img.src = u; await img.decode();
            const cv = document.createElement("canvas"); cv.width = img.naturalWidth; cv.height = img.naturalHeight; const g = cv.getContext("2d"); g.drawImage(img, 0, 0);
            // object-fit: cover, object-position 35% 50% → the painting pixels under the card
            const s = Math.max(W / img.naturalWidth, H / img.naturalHeight), dw = img.naturalWidth * s, dh = img.naturalHeight * s, ox = (W - dw) * 0.35, oy = (H - dh) * 0.5;
            const x0 = Math.max(0, Math.floor((plaque.left - ox) / s)), y0 = Math.max(0, Math.floor((plaque.top - oy) / s)), x1 = Math.min(img.naturalWidth, Math.ceil((plaque.right - ox) / s)), y1 = Math.min(img.naturalHeight, Math.ceil((plaque.bottom - oy) / s));
            const d = g.getImageData(x0, y0, x1 - x0, y1 - y0).data, lums = [];
            let worst = Infinity;
            for (let i = 0; i < d.length; i += 4 * 7) { const comp = [0, 1, 2].map(k => d[i + k] * (1 - alpha) + card[k] * alpha); lums.push(L(comp)); for (const ink of Object.values(inks)) worst = Math.min(worst, C(ink, comp)); }
            out.push({ u: u.slice(-11), w: img.naturalWidth, h: img.naturalHeight, worst: +worst.toFixed(2) });
          }
          return out; });
        B.paintings = paint;
        check(paint.length === 12 && paint.every(x => x.w === 1280 && x.h === 720) && paint.every(x => x.worst >= 4.5),
          `[${bn}] T2 · all TWELVE hand-painted backgrounds load untouched (1280 × 720) and the title's own text (cream STRANGE, bloom-pink BLOOM, leaf-green UNKNOWN SOILS) stays readable over every one: worst contrast through the card's least opaque stop, measured on the paintings' own pixels under the card, ≥ 4.5 : 1 (the menu entries sit on opaque controls)`,
          paint.map(x => `${x.u.slice(5, 7)}:${x.worst}`).join(" "));
        // D · dialogs
        const dlg = {};
        for (const [name, act] of [["settings", "settings"], ["credits", "credits"]]) { await p.click(`.mm-item[data-act="${act}"]`); await sleep(350);
          dlg[name] = await p.evaluate(n => { const d = document.querySelector(`[data-dialog="${n}"]`), s = getComputedStyle(d); return { open: d.open, font: s.fontFamily, radius: s.borderTopLeftRadius, bg: s.backgroundColor, h2: getComputedStyle(d.querySelector("h2")).fontFamily, btns: [...d.querySelectorAll(".mm-btn")].map(b => b.textContent) }; }, name);
          await shot(p, `02-${name}-1440x900.jpg`); await p.keyboard.press("Escape"); await sleep(200); }
        const solid = await tokenRgb(p, "--bloom-night-card-solid");
        check(Object.values(dlg).every(d => d.open && normF(d.font) === normF(gameFont) && normF(d.h2) === normF(gameFont) && d.radius === "22px" && d.bg === solid) && J(dlg.settings.btns) === J(["Done"]) && J(dlg.credits.btns) === J(["Back to menu"]),
          `[${bn}] D1 · Settings and Credits are the night card (solid, the gameplay corners), in the gameplay font; their buttons keep their words (icons beside them, not in them)`, J(Object.fromEntries(Object.entries(dlg).map(([k, d]) => [k, d.btns]))));
        // A · keyboard focus + arrows
        await p.focus('.mm-item[data-act="begin"]'); await p.keyboard.press("ArrowDown"); await sleep(60);
        const kb = await p.evaluate(() => { const a = document.activeElement, s = getComputedStyle(a); return { act: a.dataset.act, outline: `${s.outlineStyle} ${s.outlineWidth}`, color: s.outlineColor }; });
        const fcol = await tokenRgb(p, "--bloom-focus-night");
        await shot(p, "08-title-keyboard-focus-1440x900.jpg");
        check(kb.act === "training" && kb.outline === "solid 3px" && kb.color === fcol, `[${bn}] A1 · keyboard: ↓ moves along the menu and the focused entry shows the gameplay's 3 px focus ring in the night focus colour`, J(kb));
        check(!p.errs.length && !local(p, HEAD_O).length, `[${bn}] T3 · the title: no console error, no unhandled rejection, every request local`, J(p.errs.slice(0, 3)));
        await c.close(); }
      // the first-run recommendation (untrained)
      { const c = await context({ trained: false }), p = await page(c); await p.goto(HEAD_O + "/" + Q); await menuReady(p); await sleep(1500);
        const tag = await p.evaluate(() => { const t = document.querySelector(".mm-tag"); return { shown: !t.hidden, text: t.textContent, name: document.querySelector('.mm-item[data-act="training"]').textContent.replace(/\s+/g, " ").trim() }; });
        await p.click('.mm-item[data-act="begin"]'); await sleep(500);
        const d = await p.evaluate(() => { const d = document.querySelector('[data-dialog="recommend"]'); return { open: d.open, btns: [...d.querySelectorAll(".mm-btn")].map(b => b.textContent), primary: getComputedStyle(d.querySelector(".mm-btn.primary")).backgroundColor }; });
        const leaf = await tokenRgb(p, "--bloom-leaf-btn-night"); await shot(p, "03-recommend-1440x900.jpg");
        check(tag.shown && tag.text === "Recommended" && tag.name === "Training Recommended" && d.open && J(d.btns) === J(["Go to Expedition", "Start Training (~5 min)"]) && d.primary === leaf,
          `[${bn}] D2 · the first-run recommendation: TRAINING's Biomass-gold "Recommended" tag (a word), the dialog's two buttons with their exact words, Start Training the leaf primary`, J({ tag, btns: d.btns }));
        await c.close(); }

      // ------------------------------------------------------------------ S · the Destination Survey + L · layout at the review resolutions
      const VPS = [[1440, 900], [390, 844], [1024, 768], [1280, 720], [1920, 1080], [2560, 1440]];
      for (const [w, h] of VPS) {
        const c = await context({ w, h }), p = await page(c), tag = `${w}x${h}`; await p.goto(HEAD_O + "/" + Q); await menuReady(p); await sleep(2600);
        const hs = () => p.evaluate(() => ({ sx: document.documentElement.scrollWidth > innerWidth + 0.5 || document.body.scrollWidth > innerWidth + 0.5 }));
        const title = await p.evaluate(() => { const r = document.querySelector(".mm-plaque").getBoundingClientRect(); return { inside: r.left >= 0 && r.top >= 0 && r.right <= innerWidth + .5 && r.bottom <= innerHeight + .5,
          items: [...document.querySelectorAll(".mm-item")].every(b => { const q = b.getBoundingClientRect(); return q.bottom <= innerHeight && q.right <= innerWidth && q.height >= 44; }) }; });
        const t1 = await hs(); if (w !== 1440) await shot(p, `01-title-${tag}.jpg`);
        await p.click('.mm-item[data-act="begin"]'); await surveyReady(p); await sleep(1200);
        const sv = await p.evaluate(() => { const g = (() => { const d = document.createElement("i"); d.style.fontFamily = "var(--bloom-font)"; document.body.append(d); const f = getComputedStyle(d).fontFamily.replace(/\s+/g, ""); d.remove(); return f; })(), f = s => getComputedStyle(document.querySelector(s)).fontFamily.replace(/\s+/g, "");
          const tok = n => { const d = document.createElement("i"); d.style.color = `var(${n})`; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; };
          const heads = [...document.querySelectorAll(".ds-colhead b")].map(b => ({ text: b.textContent.trim(), icon: !!b.querySelector(".ds-st-i svg.bloom-ic"), color: getComputedStyle(b).color, glyph: (b.querySelector(".ds-st-i svg") || {}).innerHTML }));
          return { fonts: [".ds", ".ds-title h1", ".ds-name", ".ds-btn.scan"].every(s => f(s) === g), heads, want: [tok("--bloom-ok-night"), tok("--bloom-warn-night"), tok("--bloom-bad-night")],
            scanBg: getComputedStyle(document.querySelector(".ds-btn.scan")).backgroundColor, sky: tok("--bloom-sky-btn-night"), exitIcon: !!document.querySelector(".ds-exit svg.bloom-ic"), arrows: /←/.test(document.querySelector(".ds").innerText) }; });
        const t2 = await hs(); if (tag === "1440x900") await p.hover('.ds-cand[data-index="4"]'), await sleep(350);
        await shot(p, `04-survey-${tag}.png`); await p.mouse.move(1, 1);
        if (tag === "1440x900") await shot(p, "13-survey-class-headings-1440x900.png", { clip: await p.evaluate(() => { const r = document.querySelector(".ds-cols").getBoundingClientRect(); return { x: Math.max(0, r.left - 24), y: Math.max(0, r.top - 10), width: r.width + 48, height: r.height + 20 }; }) });
        await focusOn(p, 1);
        const fo = await p.evaluate(() => { const go = document.querySelector(".ds-btn.go"), r = go.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          const rows = [...document.querySelectorAll(".ds-row")].map(x => ({ cat: x.dataset.cat || null, icon: !!x.querySelector(".ds-row-i svg"), label: x.querySelector("dt").textContent }));
          const d = document.querySelector(".ds-dossier").getBoundingClientRect();
          // dossier readability: in each row the primary descriptor and the secondary explanation are separate, distinguishable parts
          const sep = [...document.querySelectorAll(".ds-row")].map(x => { const b = x.querySelector("dd > b"), v = x.querySelector("dd > .ds-row-v"); if (!b || !v) return { ok: false };
            const rb = b.getBoundingClientRect(), rv = v.getBoundingClientRect(), sb = getComputedStyle(b), sv = getComputedStyle(v);
            const apart = rv.left >= rb.right - 0.5 || rv.top >= rb.bottom - 0.5;
            return { ok: apart && sb.color !== sv.color && +sb.fontWeight > +sv.fontWeight && parseFloat(sb.fontSize) > parseFloat(sv.fontSize), side: rv.left >= rb.right - 0.5 ? "beside" : "below", word: b.textContent, value: v.textContent }; });
          const dz = document.querySelector(".ds-dossier"), fits = dz.scrollHeight <= dz.clientHeight + 1;
          return { visible: r.top >= 0 && r.bottom <= innerHeight + .5 && r.left >= 0 && r.right <= innerWidth + .5, hit: !!hit && go.contains(hit), rows, sep, fits, key: document.querySelector(".ds-bar-key").textContent.replace(/\s+/g, " ").trim(),
            chip: document.querySelector(".ds-chip").textContent, chipIcon: !!document.querySelector(".ds-chip svg.bloom-ic"), dossierX: d.left >= -0.5 && d.right <= innerWidth + .5, goText: go.textContent }; });
        const t3 = await hs(); await shot(p, `05-focus-${tag}.png`);
        if (tag === "1440x900") {
          check(sv.fonts && J(sv.heads.map(x => x.text)) === J(["Favorable", "Precarious", "Extreme"]) && sv.heads.every(x => x.icon) && J(sv.heads.map(x => x.color)) === J(sv.want) && sv.scanBg === sv.sky && sv.exitIcon && !sv.arrows
            && J(sv.heads.map(x => x.glyph)) === J([ICONS.check, ICONS.alert, ICONS.hazard]) && !sv.heads.some(x => x.glyph === ICONS.x),
            `[${bn}] S1 · the Destination Survey in the gameplay language: the gameplay font; FAVORABLE · PRECARIOUS · EXTREME carry the gameplay status colours on night (OK leaf, warning amber, severe bloom red) with an icon and a word — Extreme, a PLAYABLE class, shows the severe-warning hazard sign, never the blocked cross; Scan new sector is the planning sky button; the back control is the gameplay back icon (no text arrows)`,
            `${sv.heads.map(x => `${x.text}:${x.color}:${Object.keys(ICONS).find(k => ICONS[k] === x.glyph)}`).join(" · ")}`);
          check(J(fo.rows.map(r => r.cat)) === J(["temperature", "water", "soil", null, "hazard"]) && fo.rows.every(r => r.icon) && /^Suits \d+%\s*Marginal \d+%\s*Hostile \d+%$/.test(fo.key) && fo.chipIcon && /^(Favorable|Precarious|Extreme)$/.test(fo.chip) && fo.goText === "Begin expedition",
            `[${bn}] S2 · the dossier: the class chip is a status pill (icon + word); habitability on arrival has its key in words (Suits · Marginal · Hostile, with shares — never colour alone); the five condition rows carry the gameplay category identity (Climate = Temperature, Water, Soil, Atmosphere neutral, Solar exposure = Hazard) with their icons; Begin expedition keeps its word`,
            `${fo.chip} · ${fo.key} · ${fo.rows.map(r => r.label + ":" + r.cat).join(" ")}`);
          // the Extreme dossier (a playable high-risk world) and the separate row parts
          await p.evaluate(() => MENU_DEV.entry.survey.returnToSurvey()); await p.waitForFunction(() => MENU_DEV.entry.survey.state === "survey", null, { timeout: 20000, polling: 50 }); await sleep(900);
          await focusOn(p, 2);
          const ex = await p.evaluate(() => ({ chip: document.querySelector(".ds-chip").textContent, glyph: (document.querySelector(".ds-chip .ds-st-i svg") || {}).innerHTML, cls: document.querySelector(".ds-dossier").dataset.class,
            go: !document.querySelector(".ds-btn.go").disabled, key: (document.querySelector(".ds-bar-key .bad svg") || {}).innerHTML }));
          await shot(p, "05b-focus-extreme-1440x900.png");
          check(ex.chip === "Extreme" && ex.cls === "extreme" && ex.glyph === ICONS.hazard && ex.go && ex.key === ICONS.x,
            `[${bn}] S3 · the Extreme dossier communicates HIGH RISK, not prohibition: its chip carries the hazard sign (the cross stays only on the habitability key's Hostile ground) and Begin expedition is available`, J({ chip: ex.chip, go: ex.go }));
          check(fo.sep.length === 5 && fo.sep.every(r => r.ok) && fo.fits,
            `[${bn}] S4 · dossier readability: every condition row shows its primary descriptor and its secondary explanation as two separate parts (bold, larger, ink — beside a rule — lighter, smaller, soft), and at 1440×900 the whole dossier fits without scrolling`,
            fo.sep.map(r => `${r.word} | ${r.value} (${r.side})`).join(" · ") + ` · fits ${fo.fits}`);
        }
        if (tag === "1024x768") check(fo.sep.every(r => r.ok) && fo.visible && fo.hit, `[${bn}] S5 · 1024×768: the two-part rows hold and Begin expedition stays visible in the dossier's action bar`, J({ sides: fo.sep.map(r => r.side) }));
        const L = { title, t1: t1.sx, t2: t2.sx, t3: t3.sx, go: fo.visible && fo.hit, dossierX: fo.dossierX };
        (B.layout = B.layout || {})[tag] = L;
        const phone = w < 600;   // (a phone stacks the planet over the dossier, which then scrolls with the page: Begin is reached by scrolling)
        check(title.inside && title.items && !L.t1 && !L.t2 && !L.t3 && fo.dossierX && (phone || L.go) && !p.errs.length,
          `[${bn}] L · ${tag}: no horizontal scroll on the title, the survey or the dossier; the title card and every menu entry (≥ 44 px) inside the viewport; ${phone ? "the stacked dossier inside the width" : "Begin expedition visible and unobscured (the dossier's action bar stays in view)"}`, J(L));
        await c.close();
      }

      // ------------------------------------------------------------------ G · gameplay unchanged (computed styles, this tree vs 79f5540)
      { const STYLE = ["color", "background-color", "background-image", "border-top-color", "border-left-color", "border-top-width", "border-left-width", "border-top-left-radius", "border-bottom-right-radius",
          "font-family", "font-size", "font-weight", "letter-spacing", "line-height", "box-shadow", "padding-top", "padding-left", "outline-color", "opacity", "fill", "stroke"];
        const snap = (p, root) => p.evaluate(([root, STYLE]) => { const out = {}, r = document.querySelector(root); if (!r) return null;
          const key = e => { const parts = []; for (let x = e; x && x !== r.parentElement; x = x.parentElement) { const i = x.parentElement ? [...x.parentElement.children].indexOf(x) : 0; parts.unshift(`${x.tagName.toLowerCase()}${x.id ? "#" + x.id : ""}${typeof x.className === "string" && x.className ? "." + x.className.trim().split(/\s+/).sort().join(".") : ""}[${i}]`); } return parts.join(">"); };
          for (const e of [r, ...r.querySelectorAll("*")]) { if (e.closest("canvas")) continue; const s = getComputedStyle(e); out[key(e)] = STYLE.map(k => s.getPropertyValue(k)).join("|"); }
          return out; }, [root, STYLE]);
        const gameplay = async origin => { const c = await context({ reducedMotion: "reduce" }), p = await page(c), res = {};
          await p.goto(origin + "/" + Q); await menuReady(p); await p.click('.mm-item[data-act="begin"]'); await surveyReady(p); await focusOn(p, 1); await p.click(".ds-btn.go"); await runReady(p); await sleep(800);
          await p.evaluate(() => { if (BLOOM_API.state().running) document.getElementById("pvPause").click(); }); await sleep(300);
          res.run = await snap(p, "#pv"); if (origin === HEAD_O) await shot(p, "06-run-unchanged-1440x900.png");
          await p.click('.pv-tool[data-tool="adapt"]'); await sleep(700); res.adapt = await snap(p, "#pv");
          res.miniMap = await p.evaluate(() => { const m = document.querySelector("#dr .dr-room:not([hidden]) .z-map .mm"), cv = m && m.querySelector(".mm-cv"), s = m && getComputedStyle(m), k = m && m.querySelector(".mm-k");
            const ref = (() => { const d = document.createElement("i"); d.style.fontFamily = "var(--bloom-font)"; d.style.color = "var(--bloom-ink-soft)"; document.getElementById("pv").append(d); const r = getComputedStyle(d); const o = { font: r.fontFamily, soft: r.color }; d.remove(); return o; })();
            return m && { roomEm: getComputedStyle(document.getElementById("dr")).fontSize, h: Math.round(m.getBoundingClientRect().height), canvasH: cv ? Math.round(cv.getBoundingClientRect().height) : 0, font: s.fontFamily, gameFont: ref.font, container: s.containerType, kicker: k && getComputedStyle(k).color, soft: ref.soft }; }); if (origin === HEAD_O) await shot(p, "07-adapt-minimap-repaired-1440x900.png");
          await p.keyboard.press("Escape"); await sleep(500);
          await p.evaluate(() => { const s = BLOOM_API.sim; BLOOM_API.advance(40); s.won = true; s.onWin(s.coverage()); });
          await p.waitForFunction(() => BLOOM.runReport.instance && BLOOM.runReport.instance.state().open && !BLOOM.runReport.instance.state().busy, null, { timeout: 20000, polling: 30 }); await sleep(400);
          res.report = await snap(p, "#rr"); if (origin === HEAD_O) await shot(p, "09-report-unchanged-1440x900.png");
          res.errs = p.errs.slice(); await c.close();
          const t = await context({ reducedMotion: "reduce" }), q = await page(t); await q.goto(origin + "/" + Q); await menuReady(q); await q.click('.mm-item[data-act="training"]');
          await q.waitForFunction(() => window.BLOOM_TRAINING_UI && BLOOM_TRAINING_UI.stats.liftedAt && BLOOM_TRAINING_UI.guide.mounted && document.querySelector(".tc-card:not([hidden])"), null, { timeout: 60000, polling: 50 }); await sleep(600);
          res.coach = await snap(q, ".tc-layer"); res.trainingRun = await snap(q, "#pv .pv-hud"); if (origin === HEAD_O) await shot(q, "10-training-unchanged-1440x900.png");
          res.errs.push(...q.errs); await t.close(); return res; };
        const head = await gameplay(HEAD_O), base = await gameplay(BASE_O), rows = {};
        for (const k of ["run", "adapt", "report", "coach", "trainingRun"]) { const a = head[k] || {}, b = base[k] || {}, common = Object.keys(a).filter(x => x in b);
          // (the rooms' mini-map card — div.mm under #dr — is the one gameplay subtree this milestone deliberately repairs: G2)
          // (the room's scale, --room-em, is measured by a probe that contains that same card, so in the Adapt room the em-based sizes legitimately
          // follow the repair: there the scale-independent properties are compared — colour, background, borders' colours, typeface, weight, opacity, fill, stroke)
          const fixed = x => /#dr[^>]*>.*>div\.mm\[\d+\]/.test(x), cmp = common.filter(x => !fixed(x));
          const SCALE_FREE = ["color", "background-color", "background-image", "border-top-color", "border-left-color", "font-family", "font-weight", "opacity", "fill", "stroke"].map(p => STYLE.indexOf(p));
          const pick = v => k === "adapt" ? SCALE_FREE.map(i => v.split("|")[i]).join("|").replace(/-?\d+(\.\d+)?px/g, "#px") : v;   // (gradient stops in px scale with the room too)
          rows[k] = { elements: cmp.length, repaired: common.length - cmp.length, onlyHead: Object.keys(a).length - common.length, onlyBase: Object.keys(b).length - common.length, differ: cmp.filter(x => pick(a[x]) !== pick(b[x])).map(x => ({ x, head: a[x], base: b[x] })) }; }
        B.gameplayIdentity = Object.fromEntries(Object.entries(rows).map(([k, v]) => [k, { elements: v.elements, onlyHead: v.onlyHead, onlyBase: v.onlyBase, differ: v.differ.length, first: v.differ.slice(0, 2) }]));
        check(Object.values(rows).every(r => r.elements >= 15 && !r.differ.length) && !head.errs.length && !base.errs.length,
          `[${bn}] G1 · gameplay is otherwise UNCHANGED: on this tree and on 79f5540, the same run (the same planet) — the Planet View with its region banner, the Bloom report, and the training coach over its run — EVERY element's computed colour, background, borders, radii, font, size, weight, spacing, shadow, fill and stroke are identical (the theme carries gameplay's exact values); in the Adapt room (whose scale follows the repaired mini-map card, G2) every element's colours, typeface, weight, opacity, fill and stroke are identical`,
          Object.entries(rows).map(([k, v]) => `${k} ${v.elements} el / ${v.differ.length} differ${v.differ[0] ? " e.g. " + v.differ[0].x.slice(-60) + " " + v.differ[0].head + " ≠ " + v.differ[0].base : ""}`).join(" · ") + (head.errs.length || base.errs.length ? ` · errors ${J({ head: head.errs.slice(0, 2), base: base.errs.slice(0, 2) })}` : ""));
        const mh = head.miniMap, mb = base.miniMap; B.miniMapRepair = { head: mh, base: mb };
        check(mh && mb && mh.container === "normal" && mh.font === mh.gameFont && mh.kicker === mh.soft && mh.h >= 150 && mh.canvasH >= 60 && mb.container === "size" && mb.h < 60,
          `[${bn}] G2 · REPAIRED (a BLOOM-033 one-document regression): on 79f5540 the menu's root rule also hit the decision rooms' mini-map card (".mm"): container-type:size collapsed it to a ${mb && mb.h} px strip (its planet map and region strip invisible), in the menu's serif and cream ink; now the menu's root rules select only its own root (.mm-screen) and the card is gameplay's again (as accepted in BLOOM-032C) — the gameplay font and ink, ${mh && mh.h} px tall, its map canvas ${mh && mh.canvasH} px; the room's scale probe, which measures that card, gives the room em ${mh && mh.roomEm} again (${mb && mb.roomEm} while collapsed)`,
          J({ head: mh, base: mb })); }

      // ------------------------------------------------------------------ C · planning button contrast (computed styles, every state)
      { const CONTRAST = sel => { const e = document.querySelector(sel); if (!e) return null;
          const parse = c => { const m = c.match(/[\d.]+/g).map(Number); return [m[0], m[1], m[2], m.length > 3 ? m[3] : 1]; };
          const layers = []; for (let x = e; x; x = x.parentElement) { const b = parse(getComputedStyle(x).backgroundColor); if (b[3] > 0) layers.push(b); if (b[3] >= 1) break; }
          let bg = [3, 5, 11]; for (const l of layers.reverse()) bg = bg.map((v, i) => l[i] * l[3] + v * (1 - l[3]));
          const fg0 = parse(getComputedStyle(e).color), fg = fg0.slice(0, 3).map((v, i) => v * fg0[3] + bg[i] * (1 - fg0[3]));
          const L = ([r, g, b]) => { const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
          const a = L(fg), b = L(bg); return { ratio: Math.round((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) * 100) / 100, bg: bg.map(Math.round).join(","), size: getComputedStyle(e).fontSize, fv: e.matches(":focus-visible"), act: e.matches(":active") }; };
        const states = async (p, sel) => { const out = {}, el = p.locator(sel).first();
          await p.mouse.move(1, 1); await p.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur()); await sleep(120); out.normal = await p.evaluate(CONTRAST, sel);
          await el.hover(); await sleep(120); out.hover = await p.evaluate(CONTRAST, sel); await p.mouse.move(1, 1);
          await p.evaluate(s => document.querySelector(s).focus({ focusVisible: true }), sel); await sleep(120); out.focus = await p.evaluate(CONTRAST, sel);
          await p.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
          const bx = await el.boundingBox(); await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await p.mouse.down(); await sleep(120); out.active = await p.evaluate(CONTRAST, sel);
          await p.mouse.move(1, 1); await p.mouse.up(); await sleep(60); return out; };
        const rows = {};
        { const c = await context({ reducedMotion: "reduce" }), p = await page(c); await p.goto(HEAD_O + "/" + Q); await menuReady(p); await sleep(600);
          rows["EXPEDITION (title primary)"] = await states(p, ".mm-item.primary"); rows["TRAINING (title entry)"] = await states(p, '.mm-item[data-act="training"]');
          await shot(p, "14-title-primary-button-1440x900.png", { clip: await p.evaluate(() => { const r = document.querySelector(".mm-plaque").getBoundingClientRect(); return { x: r.left - 12, y: r.top - 12, width: r.width + 24, height: r.height + 24 }; }) });
          await p.click('.mm-item[data-act="settings"]'); await sleep(200); rows["Done (dialog)"] = await states(p, '[data-dialog="settings"] .mm-btn'); await p.keyboard.press("Escape"); await sleep(150);
          await p.click('.mm-item[data-act="begin"]'); await surveyReady(p); await sleep(600);
          rows["Scan new sector"] = await states(p, ".ds-btn.scan"); rows["Main menu (ghost)"] = await states(p, ".ds-exit");
          await focusOn(p, 1); rows["Begin expedition"] = await states(p, ".ds-btn.go"); rows["Return to survey (ghost)"] = await states(p, '.ds-btn[data-act="return"]');
          await c.close(); }
        { const c = await context({ reducedMotion: "reduce", trained: false }), p = await page(c); await p.goto(HEAD_O + "/" + Q); await menuReady(p); await sleep(600);
          await p.click('.mm-item[data-act="begin"]'); await sleep(400);
          rows["Start Training (dialog primary)"] = await states(p, '[data-dialog="recommend"] .mm-btn.primary'); rows["Go to Expedition (dialog)"] = await states(p, '[data-act="recommend-expedition"]');
          await c.close(); }
        B.buttonContrast = rows;
        const all = Object.entries(rows).flatMap(([k, v]) => Object.entries(v).map(([st, r]) => ({ k, st, ...(r || { ratio: 0 }) })));
        const low = all.filter(r => r.ratio < 4.5), fvOk = Object.values(rows).every(v => v.focus && v.focus.fv), actOk = Object.values(rows).every(v => v.active && v.active.act);
        check(all.length === 36 && !low.length && fvOk && actOk,
          `[${bn}] C1 · every planning button's word has ≥ 4.5 : 1 contrast against its own computed surface in all four states — at rest, under the pointer, keyboard-focused (:focus-visible) and pressed (:active) — the leaf / sky primaries on their planning shades, the raised and ghost controls on the night card (gameplay's own buttons unchanged)`,
          Object.entries(rows).map(([k, v]) => `${k} ${["normal", "hover", "focus", "active"].map(s => v[s] && v[s].ratio).join("/")}`).join(" · ") + (low.length ? ` · LOW ${J(low)}` : "") + (fvOk && actOk ? "" : ` · states not reached ${J(all.filter(r => (r.st === "focus" && !r.fv) || (r.st === "active" && !r.act)).map(r => r.k + ":" + r.st))}`)); }

      // ------------------------------------------------------------------ A · reduced motion
      { const c = await context({ reducedMotion: "reduce" }), p = await page(c); await p.goto(HEAD_O + "/" + Q); await menuReady(p); await sleep(400);
        const rm = await p.evaluate(() => { const a = document.querySelector(".mm-plaque").getAnimations().map(x => x.effect.getTiming().duration); return { durations: a, item: getComputedStyle(document.querySelector(".mm-item")).transitionDuration }; });
        await p.hover('.mm-item[data-act="training"]'); await sleep(100);
        const tf = await p.evaluate(() => getComputedStyle(document.querySelector('.mm-item[data-act="training"]')).transform);
        check(rm.durations.every(d => d <= 10) && /^0\.01s|^0s/.test(rm.item) && (tf === "none" || tf === "matrix(1, 0, 0, 1, 0, 0)") && !p.errs.length,
          `[${bn}] A2 · reduced motion (the OS setting): the card's entrance is immediate, the entries' transitions are instant and nothing travels on hover; nothing is disabled`, J({ ...rm, hover: tf }));
        await c.close(); }

      // ------------------------------------------------------------------ P · file:// offline (the portable runtime)
      { const c = await context({ offline: true }), p = await page(c); await p.goto("file://" + encodeURI(path.join(ROOT, "index.html")) + Q); await menuReady(p); await sleep(1500);
        const r = await p.evaluate(() => ({ boot: BLOOM_TITLE_BOOT.portable, prim: getComputedStyle(document.querySelector(".mm-item.primary")).backgroundColor, icons: document.querySelectorAll(".mm-item .mm-ico svg.bloom-ic").length,
          font: (() => { const d = document.createElement("i"); d.style.fontFamily = "var(--bloom-font)"; document.body.append(d); const f = getComputedStyle(d).fontFamily; d.remove(); return getComputedStyle(document.querySelector(".mm-item")).fontFamily === f; })() }));
        await p.click('.mm-item[data-act="begin"]'); await surveyReady(p); await focusOn(p, 0);
        const s = await p.evaluate(() => ({ rows: document.querySelectorAll(".ds-row[data-cat]").length, heads: document.querySelectorAll(".ds-colhead svg.bloom-ic").length }));
        const leaf = await tokenRgb(p, "--bloom-leaf-btn-night");
        check(r.boot && r.prim === leaf && r.icons === 4 && r.font && s.rows === 4 && s.heads === 3 && !p.errs.length,
          `[${bn}] P1 · file:// offline (the portable runtime): the restyled title (gameplay font, leaf EXPEDITION, four icons) and the restyled survey (status heads, category rows) — the theme stylesheet and the shared icon module work without a server`, J({ ...r, ...s }));
        await c.close(); }
    } catch (e) { check(false, `[${bn}] browser run`, e && e.stack || String(e)); }
    await browser.close();
  }
  // Firefox at the owner's display size (logical 2560 × 1440): the title and the dossier
  if (EVIDENCE && BROWSERS.includes("firefox")) {
    const browser = await pw.firefox.launch(); const c = await browser.newContext({ viewport: { width: 2560, height: 1440 } });
    await c.addInitScript(() => { try { localStorage.setItem("strange-bloom.training", '{"v":1,"status":"completed","at":1}'); } catch (e) { /* none */ } });
    const p = await c.newPage(); await p.goto(HEAD_O + "/" + Q); await p.waitForFunction(() => window.MENU_DEV && MENU_DEV.ready && MENU_DEV.entry.state === "menu", null, { timeout: 60000 }); await sleep(2600);
    await p.screenshot({ path: path.join(EVD, "11-firefox-title-2560x1440.jpg"), type: "jpeg", quality: 90 });
    await p.click('.mm-item[data-act="begin"]'); await p.waitForFunction(() => { const s = MENU_DEV.entry.survey; return s && s.state === "survey" && s.cells.every(Boolean); }, null, { timeout: 180000 }); await sleep(1200);
    await p.evaluate(() => MENU_DEV.entry.survey.select(1)); await p.waitForFunction(() => MENU_DEV.entry.survey.state === "focus", null, { timeout: 20000 }); await sleep(1200);
    await p.screenshot({ path: path.join(EVD, "12-firefox-focus-2560x1440.png") }); await browser.close();
  }
  // the twelve paintings under the new title (JPEG contact frames; the paintings themselves are byte-identical — V7)
  if (EVIDENCE) {
    const browser = await pw.chromium.launch(); const c = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await c.addInitScript(() => { try { localStorage.setItem("strange-bloom.training", '{"v":1,"status":"completed","at":1}'); } catch (e) { /* none */ } });
    fs.mkdirSync(path.join(EVD, "paintings"), { recursive: true });
    for (let i = 0; i < 12; i++) { const p = await c.newPage(); await p.goto(`${HEAD_O}/?sector=77&workers=1&bg=${i}`); await p.waitForFunction(() => window.MENU_DEV && MENU_DEV.ready && MENU_DEV.entry.state === "menu", null, { timeout: 60000 }); await sleep(2400);
      await p.evaluate(() => document.querySelector(".mm-status").textContent = ""); await p.screenshot({ path: path.join(EVD, `paintings/title-painting-${String(i + 1).padStart(2, "0")}.jpg`), type: "jpeg", quality: 82 }); await p.close(); }
    await browser.close();
  }
  srvHead.close(); srvBase.close(); fs.rmSync(BASE_DIR, { recursive: true, force: true });
  return done();

  function done() {
    PROOF.result = { passes, fails, seconds: Math.round((Date.now() - t0) / 1000) };
    if (EVIDENCE) fs.writeFileSync(path.join(EVD, "visual-system-proof.json"), JSON.stringify(PROOF, null, 1) + "\n");
    console.log(fails ? `\n${fails} check(s) FAILED, ${passes} passed (${Math.round((Date.now() - t0) / 1000)} s)` : `\nOK — ${passes}/${passes} checks passed (${Math.round((Date.now() - t0) / 1000)} s)`);
    process.exit(fails ? 1 : 0);
  }
})().catch(e => { console.error(e); process.exit(1); });
