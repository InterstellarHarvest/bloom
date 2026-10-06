// BLOOM — Main Menu checks (BLOOM-028C; M7g / M7h 028C1). Plain Node, production modules only; no browser.
//
//   node tools/main-menu-check.js
//
// The opening title (resources/main-menu/) and the sector prefetch it relies on (resources/destination-survey/sector-pool.js).
// Checks: the twelve owner-painted backgrounds are present, untouched JPEGs of 1280 × 720 and exactly what the menu lists; the
// player-facing title is exactly "Strange Bloom" / "Unknown Soils" while the project stays BLOOM; the background rule (random,
// never the painting just shown); settings read / write never throw and reject junk; SectorPool builds the very sector
// survey-data's buildSector builds (same worlds, same objects it reported as confirmed), reports progress, caches, forgets and
// disposes; and the source rules — the menu knows nothing of the survey or the sphere, no worker or WebGL in the menu, no
// backdrop-filter / will-change in its stylesheet, the survey's worker and data modules are the accepted ones.
"use strict";
const path = require("path"), fs = require("fs");
const ROOT = path.resolve(__dirname, "..");
for (const f of ["content/config.js", "content/traits.js", "planets/first_bloom.js", "content/archetypes.js", "content/scenarios.js", "content/play.js",
  "resources/bloom-sim.js", "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js",
  "resources/bloom-scenario.js", "resources/bloom-play.js"])
  require(path.join(ROOT, f));
const J = JSON.stringify, read = f => fs.readFileSync(path.join(ROOT, f), "utf8");
let fails = 0; const t0 = Date.now();
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (!ok) fails++; };
const info = (name, detail) => console.log(`INFO  ${name}  — ${detail}`);

/** JPEG: SOI, then the first SOF0 / SOF1 / SOF2 frame header gives height × width. */
function jpegSize(buf) {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const m = buf[i + 1];
    if (m === 0xd8 || (m >= 0xd0 && m <= 0xd7) || m === 0x01 || m === 0xff) { i += 2; continue; }
    const len = buf.readUInt16BE(i + 2);
    if (m === 0xc0 || m === 0xc1 || m === 0xc2) return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7), progressive: m === 0xc2 };
    i += 2 + len;
  }
  return null;
}
const mulberry32 = a => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

(async () => {
  const M = await import(path.join(ROOT, "resources/main-menu/main-menu-data.js"));
  const S = await import(path.join(ROOT, "resources/destination-survey/survey-data.js"));
  const { SectorPool } = await import(path.join(ROOT, "resources/destination-survey/sector-pool.js"));

  // M1 the twelve backgrounds: exact paths, real JPEGs, 1280 × 720, untouched (no re-encode here: just what the owner delivered)
  { const want = Array.from({ length: 12 }, (_, i) => `resources/main-menu/backgrounds/menu-${String(i + 1).padStart(2, "0")}.jpg`), bad = [], sizes = [];
    for (const f of want) { const p = path.join(ROOT, f); if (!fs.existsSync(p)) { bad.push(`${f} missing`); continue; }
      const buf = fs.readFileSync(p), sz = jpegSize(buf); sizes.push(buf.length);
      if (!sz) bad.push(`${f} not a JPEG`); else if (sz.width !== 1280 || sz.height !== 720) bad.push(`${f} ${sz.width}×${sz.height}`);
      if (buf[buf.length - 2] !== 0xff || buf[buf.length - 1] !== 0xd9) bad.push(`${f} truncated (no EOI)`); }
    check(!bad.length && J(M.BACKGROUNDS) === J(want), "M1 twelve menu backgrounds menu-01 … menu-12.jpg: present, JPEG, 1280 × 720, complete; BACKGROUNDS lists exactly them",
      bad.join(", ") || `${sizes.length} files, ${Math.round(sizes.reduce((a, b) => a + b, 0) / 1024)} KB in all (${Math.min(...sizes) / 1000 | 0}–${Math.max(...sizes) / 1000 | 0} KB)`); }

  // M2 the displayed title
  check(M.TITLE === "Strange Bloom" && M.SUBTITLE === "Unknown Soils", "M2 player-facing title is exactly \"Strange Bloom\" / \"Unknown Soils\"", `${M.TITLE} · ${M.SUBTITLE}`);
  { const menu = read("resources/main-menu/main-menu.js"), page = read("demos/main-menu.html");
    const literal = /["'`](BLOOM|Bloom)(?! project| internally|_| classic|-0)/; // the menu's visible strings never call the game BLOOM; "A BLOOM project" (credits) is the one intended mention
    const visible = menu.split("\n").filter(l => /<h1|<h2|mm-sub|label:|<p>|<dt>|<dd>|lede/.test(l) && !/BLOOM project|BLOOM-0|Destination Survey/.test(l) && /BLOOM\b/.test(l));
    check(!visible.length && /<title>Strange Bloom — Unknown Soils<\/title>/.test(page) && menu.includes("TITLE") && menu.includes("SUBTITLE") && !/["']Strange Bloom["']/.test(menu),
      "M2b the menu renders TITLE / SUBTITLE from data (no other spelling), the entry page's <title> is the player title, no visible menu string names the game BLOOM (credits: \"A BLOOM project\")", visible.join(" | ").slice(0, 200) || "ok");
    void literal; }

  // M3 the background rule
  { const n = M.BACKGROUNDS.length, hits = new Map(), rng = mulberry32(7); let repeat = 0, outOfRange = 0;
    for (let prev = 0; prev < n; prev++) { const seen = new Set(); for (let k = 0; k < 3000; k++) { const i = M.pickBackground(prev, rng); if (i === prev) repeat++; if (!(i >= 0 && i < n)) outOfRange++; seen.add(i); } hits.set(prev, seen.size); }
    const firstSeen = new Set(); for (let k = 0; k < 3000; k++) firstSeen.add(M.pickBackground(null, rng));
    const every = [...hits.values()].every(v => v === n - 1);
    check(repeat === 0 && outOfRange === 0 && every && firstSeen.size === n && M.pickBackground(3, () => 0.999999, M.BACKGROUNDS) !== 3 && M.pickBackground(0, rng, ["a"]) === 0 && M.pickBackground(99, () => 0.5) === Math.floor(0.5 * n),
      "M3 pickBackground: never the painting just shown (36 000 draws), every other painting reachable from every previous one, a first show reaches all twelve, edge values safe, a one-entry list returns 0, an invalid previous is ignored",
      `repeats ${repeat}, reach ${[...hits.values()].join("/")}, first-show distinct ${firstSeen.size}`);
    // uniformity: each of the eleven others within ±25 % of its share
    const counts = new Array(n).fill(0); const r2 = mulberry32(99); for (let k = 0; k < 22000; k++) counts[M.pickBackground(5, r2)]++;
    const others = counts.filter((_, i) => i !== 5), lo = Math.min(...others), hi = Math.max(...others);
    check(counts[5] === 0 && lo > 2000 * 0.75 && hi < 2000 * 1.25, "M3b the pick is uniform over the other eleven (22 000 draws, each within ±25 % of 2 000)", `min ${lo}, max ${hi}`); }

  // M4 settings: tolerant of junk and throwing storage
  { const mem = new Map(), store = { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, v) };
    const d = M.readSettings(store), w = M.writeSettings(store, { motion: "reduced" }), r = M.readSettings(store);
    const junk = M.writeSettings(store, { motion: "sideways", extra: 1 }), raw = JSON.parse(mem.get(M.SETTINGS_KEY));
    mem.set(M.SETTINGS_KEY, "{not json"); const bad = M.readSettings(store);
    const boom = { getItem() { throw new Error("private mode"); }, setItem() { throw new Error("quota"); } };
    let threw = false; let b1, b2; try { b1 = M.readSettings(boom); b2 = M.writeSettings(boom, { motion: "full" }); } catch { threw = true; }
    check(d.motion === "system" && w.motion === "reduced" && r.motion === "reduced" && junk.motion === "reduced" && raw.extra === undefined && bad.motion === "system" && !threw && b1.motion === "system" && b2.motion === "full"
      && M.readSettings(null).motion === "system" && M.reducedMotionFor("reduced") === true && M.reducedMotionFor("full") === false && M.reducedMotionFor("system") === null,
      "M4 settings: defaults, round trip, unknown values and keys rejected, malformed JSON → defaults, a throwing Storage never throws (the choice still applies), no storage at all is fine; motion → reducedMotion mapping",
      J({ d, w, r, junk, bad, b1, b2 })); }

  // M5 SectorPool builds the accepted sector (Node: no Worker → the main-thread path), reports progress, hands out the same objects
  { const seed = 77, t = Date.now(), pool = new SectorPool({ worker: false }), prog = [];
    pool.onProgress = e => prog.push(e.found.reduce((a, b) => a + b, 0));
    pool.prefetch({ sectorSeed: seed });
    const p0 = pool.progress;
    const sector = await pool.ready, ms = Date.now() - t, p1 = pool.progress;
    const ref = S.buildSector(seed);
    const same = sector.cells.length === 9 && sector.cells.every((c, i) => c && ref.cells[i] && c.key === ref.cells[i].key && c.fingerprint === ref.cells[i].fingerprint && c.classId === ref.cells[i].classId);
    const e = pool.first.entry, shownObjs = e.shown.flat(), fromShown = sector.cells.every(c => shownObjs.includes(c) || e.cols.some(col => col.cells.includes(c)));
    const validated = sector.cells.every(c => c.authored || (c.planet.archetype && c.planet.archetype.winnabilityChecked && c.planet.archetype.validatedLayers.join() === "1,2,3,4,5,6,7,8"));
    check(same && fromShown && validated && p0.confirmed === 0 && !p0.ready && p1.confirmed === 9 && p1.ready && p1.total === 9 && prog.length >= 3 && prog.at(-1) === 9 && pool.stats.sectorTimes.length === 1 && pool.source === "main-thread" && pool.get(seed, false) === e,
      "M5 prefetch(): the pool's sector IS survey-data's buildSector for the seed (same worlds, same fingerprints, same classes), every world fully validated (layers 1–8), the assembled cells are the very objects reported as confirmed, progress 0 → 9 of 9, one sectorTimes entry",
      `${ms} ms (main-thread path in Node); progress seen ${J([...new Set(prog)])}`);
    // cache, forget, dispose
    const again = pool.sector(seed, false), e2 = pool.sector(seed, true);
    pool.forget(seed);
    const gone = pool.get(seed, false) === null && pool.get(seed, true) === null;
    pool.dispose(); let afterDispose = null; try { pool.sector(1, false); } catch (err) { afterDispose = err.message; }
    check(again === e && e2 !== e && e2.firstBloom === true && gone && pool.disposed && pool.entries.size === 0 && /disposed/.test(afterDispose) && (pool.dispose(), true),
      "M5b sector() caches by (seed, firstBloom), forget(seed) drops both, dispose() clears everything and refuses new work; idempotent", `${afterDispose}`);
    e2.promise.catch(() => {}); }

  // M6 halt semantics (no workers in Node, so only the queue path): halted → _viaPool rejects with halted, resume() lifts it
  { const pool = new SectorPool({ worker: true }); pool.halt();
    const r1 = await pool._viaPool({ type: "plan" }).then(() => "resolved", e => (e.halted ? "halted" : e.message));
    pool.resume(); const r2 = await pool._viaPool({ type: "plan" }).then(() => "resolved", e => e.message); pool.dispose();
    check(r1 === "halted" && /no worker|worker failed/.test(r2), "M6 halt(): pool work is refused as `halted` (never falls back to the main thread); resume() lifts it (Node has no Worker: the request then fails as \"no worker\", the fallback's cue)", `${r1} / ${r2}`); }

  // M7 source rules
  { const menu = read("resources/main-menu/main-menu.js"), data = read("resources/main-menu/main-menu-data.js"), entry = read("resources/main-menu/expedition-entry.js"), css = read("resources/main-menu/main-menu.css");
    const survey = read("resources/destination-survey/destination-survey.js"), pool = read("resources/destination-survey/sector-pool.js"), worker = read("resources/destination-survey/survey-worker.js");
    const imports = s => [...s.matchAll(/^import .* from "([^"]+)";?$/gm)].map(m => m[1]);
    const mi = imports(menu), di = imports(data), ei = imports(entry), code = s => s.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, ""); // (comments and copy may name the other screens; code may not touch them)
    check(mi.length === 1 && mi[0] === "./main-menu-data.js" && di.length === 0 && !/import\(|PlanetSphere|DestinationSurvey|AtmosphereTransition|SectorPool/.test(code(menu)) && !/new Worker|getContext|WebGL|createElement\("canvas"\)|<canvas/.test(code(menu) + code(data)),
      "M7 MainMenu imports only its data module and its code never touches the survey, sphere, transition, pool, workers, canvas or WebGL (the screen is plain HTML / CSS over one <img>)", J(mi));
    check(ei.includes("./main-menu.js") && ei.includes("../destination-survey/destination-survey.js") && ei.includes("../atmosphere-transition/atmosphere-transition.js") && !ei.some(i => /planet-sphere/.test(i)) && !/new Worker|new PlanetSphere/.test(entry),
      "M7b ExpeditionEntry composes menu + survey + transition and never touches the sphere or workers itself", J(ei));
    const rules = css.replace(/\/\*[\s\S]*?\*\//g, "");
    check(!/backdrop-filter|will-change/.test(rules) && !/@keyframes[^}]*filter/.test(rules) && !/transition:[^;]*filter/.test(rules), "M7c main-menu.css: no backdrop-filter, no will-change, no animated or transitioned filter (028B compositing lesson)");
    check(/new Worker\(new URL\("\.\/survey-worker\.js", import\.meta\.url\)/.test(pool) && !/new Worker/.test(survey) && /from "\.\/sector-pool\.js"/.test(survey) && /static prefetch\(/.test(survey),
      "M7d the one worker spawn point moved to sector-pool.js; destination-survey.js imports SectorPool and exposes static prefetch()");
    check(/type === "plan"/.test(worker) && /type === "validate"/.test(worker) && /columnCandidates\(sectorSeed, column, undefined, \{ firstBloom \}\)/.test(worker),
      "M7e survey-worker.js still serves the accepted plan / validate / column tasks (semantics untouched; byte identity is checked by the milestone's provenance QA)");
    check(/translate:/.test(css) && !/@keyframes mm-rise\{[^}]*transform/.test(css), "M7f entrances / recede animate the independent `translate` property, never the plaque's layout transform");
    // 028C1: menu ↔ survey is a plain fade through black owned by the entry; the AtmosphereTransition is only handed to the survey's departure
    const ec = code(entry);
    check(!/\.atx\.run\(|\.run\(\s*\{\s*preset/.test(ec) && /transition: this\.descent\.transition \|\| this\.atx/.test(ec) && /\.animate\(\[\{ opacity: to \? 0 : 1 \}, \{ opacity: to \}\]/.test(ec) && !/translate|scale|clip-path|filter/.test(ec.slice(ec.indexOf("_fade(to, rm) {"), ec.indexOf("_prefetchSector(first)"))),
      "M7g (028C1) menu ↔ survey is a fade through black: ExpeditionEntry never runs the AtmosphereTransition itself (it only hands it to the survey's dramatic departure); its fade animates opacity alone (no zoom, wipe, clouds)");
    check(/\.mm\.is-settled \.mm-plaque, \.mm\.is-settled \.mm-nav li, \.mm\.is-settled \.mm-status\{animation:none\}/.test(css) && /\.mm\.is-settled \.mm-art\{transition:none\}/.test(css) && /show\(\{ settled: true \}\)/.test(ec),
      "M7h (028C1) the return shows the menu `settled` under the black (no entrance replay, no painting fade), so the screen is complete before the black lifts"); }

  console.log(fails ? `\n${fails} check(s) FAILED (${Date.now() - t0} ms)` : `\nALL CHECKS PASS (${Date.now() - t0} ms)`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
