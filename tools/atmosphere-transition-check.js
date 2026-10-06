// BLOOM — AtmosphereTransition static / contract checks (BLOOM-028B). Plain Node; no browser (the behaviour is covered by
// docs/evidence/bloom-028b/qa-atmosphere-transition.js in Chromium and Firefox).
//
//   node tools/atmosphere-transition-check.js
//
// resources/atmosphere-transition/atmosphere-transition.js is the reusable cloud / atmosphere screen transition. Contract: it is
// screen-agnostic (no planet, survey, sphere, tutorial or gameplay knowledge, no imports), it draws with DOM / SVG / CSS only
// (no canvas, no WebGL), it ships a DRAMATIC preset (full concealment) and a SUBDUED preset (~200–300 ms light mist), each with a
// reduced-motion configuration, and the Destination Survey consumes it without growing a second renderer or calling the
// generator from its departure.
"use strict";
const path = require("path"), fs = require("fs");
const ROOT = path.resolve(__dirname, "..");
let fails = 0; const t0 = Date.now();
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (!ok) fails++; };
const info = (name, detail) => console.log(`INFO  ${name}  — ${detail}`);
const read = f => fs.readFileSync(path.join(ROOT, f), "utf8");
const code = src => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1"); // strip comments (no URLs in these files)

(async () => {
  const FILE = "resources/atmosphere-transition/atmosphere-transition.js";
  const src = read(FILE), body = code(src);
  const M = await import(path.join(ROOT, FILE)); // importable without a DOM: nothing touches document at module level
  const P = M.ATMOSPHERE_PRESETS;

  // 1. exports
  check(typeof M.AtmosphereTransition === "function" && P && Object.isFrozen(P), "A1 exports AtmosphereTransition and a frozen ATMOSPHERE_PRESETS; importing the module needs no DOM");

  // 2. screen-agnostic
  { const banned = /\b(planets?|survey|sphere|globes?|three|tutorials?|adapt|spread|terraform|regions?|dossier|expedition|menus?|gameplay)\b|\bBLOOM(_DATA)?\b|PlanetSphere/i;
    // (word boundaries: "AtmosphereTransition", "contextmenu" and the repo-style id "bloom-atx-style" are not screen knowledge)
    const hits = body.replace(/bloom-atx-style/g, "").split("\n").filter(l => banned.test(l)).map(l => l.trim().slice(0, 80));
    check(!hits.length && !/^\s*import\s/m.test(body) && !/\bimport\(/.test(body), "A2 screen-agnostic: no imports and no planet / survey / sphere / menu / tutorial / gameplay vocabulary in the code", hits.join(" | ") || "clean"); }

  // 3. no WebGL / canvas / per-frame JS
  { const ctxs = [...body.matchAll(/getContext\(\s*["']([^"']+)["']/g)].map(m => m[1]);
    check(ctxs.length === 1 && ctxs[0] === "2d" && !/webgl|WebGLRenderer|<canvas|appendChild\(c\)/i.test(body) && /toDataURL/.test(body) && /<img /.test(body),
      "A3 no WebGL: the clouds are <img> elements of bitmaps drawn once with an off-screen 2D canvas (never put in the page)", `contexts ${JSON.stringify(ctxs)}`); }
  { const raf = (body.match(/requestAnimationFrame/g) || []).length, setInt = /setInterval/.test(body);
    check(raf === 1 && !setInt && /\.animate\(/.test(body) && /@keyframes atx-drift/.test(body), "A4 motion = Web Animations + CSS keyframes (transform / opacity); no setInterval; rAF only in the one-frame settle helper", `rAF uses ${raf}`); }

  // 4. presets
  const d = P.dramatic, s = P.subdued;
  check(d && d.conceal === "full" && d.peak === 1 && d.concealMs >= 900 && d.revealMs >= 600 && d.clouds.length >= 9 && new Set(d.clouds.map(c => c[1])).size === 3,
    "A5 DRAMATIC preset: full concealment (veil peak 1), a long build and reveal, several cloud layers (far / mid / near)", `conceal ${d.concealMs} + min covered ${d.minCoveredMs} + reveal ${d.revealMs} ms, ${d.clouds.length} clouds`);
  { const total = s.concealMs + s.minCoveredMs + s.revealMs;
    check(s && s.conceal === "partial" && s.peak < 0.9 && total >= 200 && total <= 300 && s.clouds.length <= 4,
      "A6 SUBDUED preset: ~200–300 ms in total, light mist (partial peak), few elements", `${s.concealMs} + ${s.minCoveredMs} + ${s.revealMs} = ${total} ms, peak ${s.peak}, ${s.clouds.length} wisps`); }
  check([d, s].every(p => p.reduced && p.reduced.concealMs > 0 && p.reduced.revealMs > 0 && p.reduced.concealMs <= p.concealMs)
    && /\.rm \.atx-drift/.test(body) && /reducedMotion/.test(body) && /prefers-reduced-motion: reduce/.test(body),
    "A7 reduced motion is handled inside the component: each preset has a reduced configuration, the media query is read per run, drift / breathing animations are off under .rm");
  check(/onCovered/.test(body) && /AtmosphereTransitionBusy/.test(body) && /AbortError/.test(body) && /coveredTimeoutMs/.test(body) && /finally\(/.test(body),
    "A8 lifecycle surface: async onCovered, busy rejection, abort on dispose, optional covered timeout, teardown in finally");
  check(/aria-hidden/.test(body) && !/tabindex|tabIndex/.test(body) && /pointer-events:auto/.test(body), "A9 decorative overlay: aria-hidden, nothing focusable, blocks pointer input while up");

  // 4b. not a canned animation: seeded layouts
  { const { layoutClouds } = M, sig = l => JSON.stringify(l.clouds.map(c => [c.shape, c.x.toFixed(4), c.y.toFixed(4), c.w.toFixed(4), c.flip, c.drift.dur, c.stagger]));
    const seeds = Array.from({ length: 200 }, (_, i) => (i * 2654435761) >>> 0), Ls = seeds.map(s => layoutClouds(d, s));
    const distinct = new Set(Ls.map(sig)).size, mirrored = Ls.filter(l => l.mirror).length, again = sig(layoutClouds(d, seeds[7])) === sig(Ls[7]);
    const V = M.LAYOUT_VARIATION, nearN = d.clouds.filter(c => c[1] === "near").length, counts = new Set(Ls.map(l => l.clouds.length));
    const inBounds = Ls.every(l => l.clouds.filter(c => c.layer === "near").length === nearN && l.clouds.every(c => { const [, layer, x, y, w] = d.clouds[c.k], j = V.jitter[layer], bx = l.mirror ? 1 - x : x;
      return c.layer === layer && Math.abs(c.x - bx) <= j + 1e-9 && Math.abs(c.y - y) <= j + 1e-9 && c.w >= w * V.size[0] - 1e-9 && c.w <= w * V.size[1] + 1e-9 && ["heap", "puff", "bank"].includes(c.shape); }));
    const shapes = new Set(Ls.flatMap(l => l.clouds.map(c => c.shape))), wisps = layoutClouds(s, 99).clouds.every(c => c.shape === "wisp");
    check(typeof layoutClouds === "function" && distinct === 200 && again && mirrored > 60 && mirrored < 140 && inBounds && shapes.size === 3 && wisps && counts.size >= 4,
      "A13 not a canned animation: layoutClouds(preset, seed) gives 200 different layouts for 200 seeds (about half mirrored, cloud counts varying), the same layout for the same seed, every cloud within its LAYOUT_VARIATION bounds and layer, every near (edge) cloud always present, cumulus silhouettes varied, wisps kept",
      `${distinct} distinct, ${mirrored} mirrored, cloud counts ${[...counts].sort((a, b) => a - b)}, shapes ${[...shapes]}`);
    check(/seed == null \? \(Math\.random\(\)/.test(body) && /seed: run\.seed/.test(body), "A14 run() picks a fresh random seed unless one is passed, and reports the seed it used"); }

  // 5. the consumer: one renderer, no generation in the departure
  { const ds = code(read("resources/destination-survey/destination-survey.js"));
    const renderers = (ds.match(/new PlanetSphereRenderer\(/g) || []).length, views = (ds.match(/new PlanetSphereView\(/g) || []).length;
    const depart = ds.slice(ds.indexOf("async _depart("), ds.indexOf("dispose() {", ds.indexOf("async _depart(")));
    check(renderers === 1 && views === 1 && /new AtmosphereTransition\(/.test(ds), "A10 Destination Survey: still exactly one PlanetSphereRenderer and one view-construction site (the nine views); it invokes AtmosphereTransition", `renderers ${renderers}, view sites ${views}`);
    check(depart.length > 500 && !/generate|attemptPlanet|runSearch|searchWorld|columnCandidates|setPlanet|setYaw|lookAt|new PlanetSphere|setAutoRotate/.test(depart),
      "A11 the departure code never generates, re-plans, re-creates or re-orients a planet (no generator / setPlanet / setYaw / lookAt / setAutoRotate / new view; only the public setDistance camera dolly)", `${depart.length} chars checked`); }

  // 6. the sphere component and the generator are not touched by this milestone (028B: 80a39ce → its final commit d036ea3 —
  //    pinned to that range in 028D1, so later milestones that work in these paths do not trip 028B's provenance claim)
  { const { spawnSync } = require("child_process");
    const r = spawnSync("git", ["diff", "--name-only", "80a39ce", "d036ea3", "--", "resources/planet-sphere", "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js",
      "resources/bloom-archetype.js", "resources/bloom-play.js", "resources/bloom-play-worker.js", "resources/bloom-sim.js", "resources/bloom-scenario.js",
      "content", "planets"], { cwd: ROOT });
    if (r.status !== 0) info("A12", "git unavailable or 80a39ce / d036ea3 not in history: skipped");
    else check(!r.stdout.toString().trim(), "A12 028B (80a39ce → d036ea3): PlanetSphereView / renderer / texture, the generator, validators, witness, play flow, content and planets are unchanged", r.stdout.toString().trim() || "none changed"); }

  console.log(fails ? `\n${fails} check(s) FAILED  (${((Date.now() - t0) / 1000).toFixed(1)} s)` : `\nALL CHECKS PASS  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
