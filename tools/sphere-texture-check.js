// BLOOM — planet-sphere texture checks (BLOOM-027D). Plain Node, production modules only; no browser, no GPU.
//
//   node tools/sphere-texture-check.js
//
// The globe's texture (resources/planet-sphere/planet-texture.js) must be periodic in x on a cylindrical planet: its
// decorative stipples (water stripes, dunes, frost glints) continue through longitude zero (x = W − 1 → 0) exactly as through
// any interior column boundary. Checked at the formula level for several grid widths, then PIXEL-EXACT on rasterised
// textures of uniform synthetic cylinders and of production worlds. A control run of the 027C renderer (git, if available)
// shows the same checks catch the old artifact. Also pins: only stipple placement changed (every base colour is 027C's),
// texture size / signature, UV → tile → region at the cut, and authored (First Bloom) layout resolution.
// BLOOM-029B: the texture is the canonical planet surface (resources/planet-surface/planet-surface.js), shared with the production
// gameplay map, so its colours are deliberately new (Concept 18). A2 / C2 / C3 follow the surface's model (wave marks are a flag,
// shallows are lighter water); D1 now pins the GEOGRAPHY to 027C (land / water per tile) instead of the old colours, and D2 / D3
// prove planet-texture.js keeps no palette or terrain algorithm of its own: it paints BLOOM.surface, pixel for pixel.
"use strict";
const path = require("path"), fs = require("fs"), { execSync } = require("child_process");
const ROOT = path.resolve(__dirname, "..");
for (const f of ["content/config.js", "content/traits.js", "content/archetypes.js", "planets/first_bloom.js",
  "resources/bloom-sim.js", "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js"])
  require(path.join(ROOT, f));
const { BLOOM, BLOOM_DATA } = globalThis, { config, traits, archetypes } = BLOOM_DATA;
const J = JSON.stringify;
let fails = 0; const t0 = Date.now();
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (!ok) fails++; };
const info = (name, detail) => console.log(`INFO  ${name}  — ${detail}`);

// ---- a tiny 2D-canvas rasteriser (fillRect + rgb()/rgba() fillStyle: all drawPlanetTexture uses), so textures are compared
// pixel for pixel without a browser
function rasterCanvas() {
  const cv = { width: 0, height: 0, px: null };
  const ctx = { imageSmoothingEnabled: true, fillStyle: "rgb(0,0,0)",
    fillRect(x, y, w, h) {
      if (!cv.px || cv.px.length !== cv.width * cv.height * 3) cv.px = new Uint8ClampedArray(cv.width * cv.height * 3);
      const m = /^rgba?\(([^)]+)\)$/.exec(this.fillStyle); if (!m) throw new Error("unparsed fillStyle " + this.fillStyle);
      const [r, g, b, a = 1] = m[1].split(",").map(Number);
      for (let j = Math.max(0, y); j < Math.min(cv.height, y + h); j++) for (let i = Math.max(0, x); i < Math.min(cv.width, x + w); i++) {
        const k = (j * cv.width + i) * 3; cv.px[k] = Math.round(r * a + cv.px[k] * (1 - a)); cv.px[k + 1] = Math.round(g * a + cv.px[k + 1] * (1 - a)); cv.px[k + 2] = Math.round(b * a + cv.px[k + 2] * (1 - a));
      } } };
  cv.getContext = () => ctx;
  return cv;
}
const raster = (P, planet, opts) => { const cv = rasterCanvas(); const g = P.drawPlanetTexture(cv, planet, opts); return { ...g, px: cv.px }; };
/** Pixels whose colour differs from the pixel `shift` columns further east, wrapping round x (0 = x-periodic with that period). */
function shiftMismatch(t, shift) {
  let bad = 0, firstX = -1; const w = t.width;
  for (let y = 0; y < t.height; y++) for (let x = 0; x < w; x++) {
    const a = (y * w + x) * 3, b = (y * w + (x + shift) % w) * 3;
    if (t.px[a] !== t.px[b] || t.px[a + 1] !== t.px[b + 1] || t.px[a + 2] !== t.px[b + 2]) { bad++; if (firstX < 0) firstX = x; } }
  return { bad, firstX };
}
// uniform synthetic cylinders: every tile water / one dune section / one frosty section
const GOOD = { tempOffset: 0, moistureOffset: 0, light: 70, ph: 6.8, salinity: 0, toxicity: 0, radiation: 8, nutrients: 60 };
const uniform = (kind, W = 60, H = 40) => ({ id: "u_" + kind, name: kind, gridWidth: W, gridHeight: H, topology: { wrapX: true, wrapY: false },
  globalClimate: { temperature: kind === "frost" ? -30 : 30, moisture: kind === "dune" ? 20 : 50 },
  sections: [{ id: "s0", name: "S0", local: GOOD }], tilemap: new Array(W * H).fill(kind === "water" ? -1 : 0) });
const RENDER = { water: null, dune: { dunes: true }, frost: { frost: true } };

(async () => {
  const P = await import(path.join(ROOT, "resources/planet-sphere/planet-texture.js"));

  // ---- A · formula level: every stipple is periodic in x with a period that divides W (several grid widths)
  { const rows = [];
    for (const W of [60, 30, 48, 64, 90, 59]) { const S = P.stipplesFor(W); let bad = 0, empty = 0;
      for (const k of ["water", "dune", "frost"]) {
        if (W % S.periods[k]) bad++;
        for (let y = 0; y < 40; y++) for (let x = 0; x < W; x++) if (S[k](x + W, y) !== S[k](x, y)) bad++;
        for (let x = 0; x < W; x++) { let hit = false; for (let y = 0; y < 40 && !hit; y++) hit = S[k](x, y); if (!hit) empty++; } // no dead columns
      }
      rows.push(`W=${W}: periods ${J(S.periods)}${bad ? ` ${bad} BAD` : ""}${empty ? ` ${empty} empty columns` : ""}`); }
    check(!rows.some(r => /BAD|empty/.test(r)), "A1 stipple(x + W, y) = stipple(x, y) for water / dunes / frost, every period divides W, no stipple-free column (W = 60, 30, 48, 64, 90, 59)", rows.join(" · ")); }
  { const S = P.stipplesFor(60);
    check(J(S.periods) === J({ water: 6, dune: 10, frost: 10, grain: 10 }), "A2 the 60-wide map uses periods water 6 · dunes 10 · frost 10 (the 2D map's 7 / 9 / 32 do not divide 60); the land grain repeats with the land stipples (10)", J(S.periods));
    const dens = k => { let n = 0; for (let y = 0; y < 40; y++) for (let x = 0; x < 60; x++) n += S[k](x, y) ? 1 : 0; return +(n / 2400).toFixed(4); };
    info("A2 stipple density (2D map: water 1/7 = .143, dunes 1/9 = .111, frost 1/8 = .125)", J({ water: dens("water"), dune: dens("dune"), frost: dens("frost") })); }

  // ---- B · pixel level, uniform cylinders: the rasterised texture is invariant under a circular x-shift by one stipple period,
  // i.e. the columns either side of the cut (x = W − 1 | 0) look exactly like an interior column pair at the same phase
  const control = await (async () => { try {
      const src = execSync("git show 3763641:demos/planet-sphere/planet-projection.js", { cwd: ROOT, stdio: ["ignore", "pipe", "ignore"] }).toString();
      return await import("data:text/javascript;base64," + Buffer.from(src).toString("base64")); } catch { return null; } })();
  { const res = [], ctl = [];
    for (const kind of ["water", "dune", "frost"]) {
      const p = uniform(kind), t = raster(P, p, { render: RENDER[kind] }), per = P.stipplesFor(60).periods[kind], m = shiftMismatch(t, per * t.tileW);
      res.push(`${kind}: period ${per} tiles = ${per * t.tileW} px, ${m.bad} mismatched px`);
      if (control) { // 027C: the 2D periods (7 / 9 / 32) cannot be circular — whatever shift is tried, the cut breaks it
        const c = rasterCanvas(); control.drawPlanetTexture(c, p, { render: RENDER[kind] }); const ct = { width: 480, height: 240, px: c.px };
        const oldPer = { water: 7, dune: 9, frost: 32 }[kind], cm = shiftMismatch(ct, oldPer * 8);
        ctl.push(`${kind}: shift ${oldPer} tiles → ${cm.bad} px differ, first at x = ${cm.firstX} (tile ${Math.floor(cm.firstX / 8)})`); }
    }
    check(res.every(r => / 0 mismatched/.test(r)), "B1 uniform water / dune / frost cylinders: texture(x + one period, y) = texture(x, y) for EVERY pixel, wrapping through the cut", res.join(" · "));
    if (control) check(ctl.every(r => !/→ 0 px/.test(r)), "B2 control: the 027C renderer fails the same test (the old stipple jumps phase at the cut) — the check detects the artifact", ctl.join(" · "));
    else info("B2 control skipped", "git history unavailable"); }

  // ---- C · production worlds: the decoration across the cut follows the same rule as every interior step, pixel-exact
  const W0 = [["ocean_archipelago", 6], ["ocean_archipelago", 40], ["desert_world", 5], ["desert_world", 25], ["frozen_world", 7], ["frozen_world", 25]];
  const worlds = W0.map(([a, s]) => { const A = archetypes.find(x => x.id === a); return { key: `${a}:${s}`, A, planet: BLOOM.generateFromArchetype(A, s, { config, traits }) }; });
  check(worlds.every(w => J(w.planet.topology) === J({ wrapX: true, wrapY: false }) && w.planet.gridWidth === 60 && w.planet.gridHeight === 40),
    "C1 production worlds (3 archetypes, 6 seeds) are 60×40 cylinders, drawn from their own tilemap", worlds.map(w => w.planet.name).join(" · "));
  { // every tile's stipple flag = the formula at its x; and the flag the cut "hands over" from x = W − 1 to x = 0 equals the
    // formula continued to x = W — the same relation as x → x + 1 anywhere else
    let tiles = 0, bad = 0, cutRows = 0, cutBad = 0; const ST = P.stipplesFor(60);
    for (const w of worlds) { const tl = P.baseTileColors(w.planet, w.A.render), T = w.planet.tilemap, R = w.A.render || {};
      for (let y = 0; y < 40; y++) for (let x = 0; x < 60; x++) { const t = tl[y * 60 + x], s = T[y * 60 + x]; tiles++;
        const want = s < 0 ? ST.water(x, y) : null, got = s < 0 ? t.wave : null; // (029B: a wave mark is a flag, painted over the water)
        if (s < 0 && want !== got) bad++;
        if (s >= 0 && R.dunes && t.dune !== ST.dune(x, y)) bad++;
        if (s >= 0 && !R.dunes && t.dune) bad++; }
      for (let y = 0; y < 40; y++) { cutRows++; for (const k of ["water", "dune", "frost"]) if (ST[k](60, y) !== ST[k](0, y)) cutBad++; } }
    check(!bad && !cutBad, "C2 every tile's stipple = the periodic formula at its column; across the cut the pattern continues as at x → x + 1",
      `${tiles} tiles, ${bad} off-formula · ${cutRows} cut rows, ${cutBad} breaks`); }
  { // pixel-exact on real worlds: for every row whose two cut tiles are both open water, the texture pixels of the cut pair
    // (x = 59 | 0) equal those of an interior water pair at the same stripe phase (x = 59 − 6k | 60 − 6k)
    let rows = 0, same = 0, ctlRows = 0, ctlDiff = 0;
    for (const w of worlds) { const t = raster(P, w.planet, { render: w.A.render }), T = w.planet.tilemap, tw = t.tileW, th = t.tileH, open = i => T[i] < 0 && !t.tiles[i].shallow;
      const block = (tx, ty, px) => { const out = []; for (let j = 0; j < th; j++) for (let i = 0; i < tw; i++) { const k = ((ty * th + j) * t.width + tx * tw + i) * 3; out.push(px[k], px[k + 1], px[k + 2]); } return out.join(); };
      const ct = control ? (() => { const c = rasterCanvas(); control.drawPlanetTexture(c, w.planet, { render: w.A.render }); return c.px; })() : null;
      for (let y = 0; y < 40; y++) { if (!open(y * 60 + 59) || !open(y * 60)) continue;
        for (let k = 1; k <= 9; k++) { const a = 59 - 6 * k, b = a + 1; if (!open(y * 60 + a) || !open(y * 60 + b)) continue; // an interior open-water pair, same phase
          rows++; if (block(59, y, t.px) + "|" + block(0, y, t.px) === block(a, y, t.px) + "|" + block(b, y, t.px)) same++;
          if (ct) { const oa = 59 - 7 * k, ob = oa + 1; if (oa >= 0 && T[y * 60 + oa] < 0 && T[y * 60 + ob] < 0) { ctlRows++;
            if (block(59, y, ct) + "|" + block(0, y, ct) !== block(oa, y, ct) + "|" + block(ob, y, ct)) ctlDiff++; } }
          break; } } }
    check(rows > 50 && same === rows, "C3 real worlds, pixel-exact: the cut water pair (59 | 0) is identical to an interior water pair at the same stripe phase",
      `${same}/${rows} rows` + (control ? ` · control 027C: ${ctlDiff}/${ctlRows} rows differ from their interior pair (the chevron)` : "")); }

  // ---- D · (029B) the texture is the canonical surface: geography is 027C's, the palette lives only in planet-surface.js
  if (control) { let tiles = 0, same = 0;
    for (const w of worlds) { const a = P.baseTileColors(w.planet, w.A.render), b = control.baseTileColors(w.planet, w.A.render);
      for (let i = 0; i < 2400; i++) { tiles++; if (a[i].water === b[i].water) same++; } }
    check(same === tiles, "D1 geography unchanged: every tile is land / water exactly as the 027C renderer drew it (the colours are the canonical 029B surface, deliberately new)",
      `${same}/${tiles} tiles`); }
  else info("D1 skipped", "git history unavailable");
  { await import(path.join(ROOT, "resources/planet-surface/planet-surface.js")); const SF = globalThis.BLOOM.surface; let px = 0, diff = 0, sig = 0;
    for (const w of worlds) { const t = raster(P, w.planet, { render: w.A.render }), cv = rasterCanvas(); cv.width = 480; cv.height = 240;
      SF.paintSurface(cv.getContext(), w.planet, { render: w.A.render, tileW: 8, tileH: 6 });
      for (let k = 0; k < t.px.length; k++) { px++; if (t.px[k] !== cv.px[k]) diff++; }
      if (SF.surfaceSignature(w.planet, { render: w.A.render }) === SF.surfaceSignature(P.texturePlanet(w.planet), { render: w.A.render })) sig++; }
    check(!diff && sig === worlds.length && Object.isFrozen(SF) && SF.version === 1, "D2 drawPlanetTexture = BLOOM.surface.paintSurface at 8×6 px per tile under the starting sky, pixel for pixel (6 worlds); texturePlanet keeps the surface identity",
      `${px} channel values, ${diff} differ · signatures ${sig}/${worlds.length}`); }
  { const src = fs.readFileSync(path.join(ROOT, "resources/planet-sphere/planet-texture.js"), "utf8").replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
    const triplets = (src.match(/\[\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\]/g) || []);
    const own = { tempStops: /TEMP_STOPS|tempStops/.test(src), barren: /barrenColor|coldWeight|mix\(/.test(src), colourTriplets: triplets.length > 0, fillPalette: /fillStyle\s*=\s*css\(/.test(src) };
    check(Object.values(own).every(v => !v) && /import "\.\.\/planet-surface\/planet-surface\.js"/.test(src) && /SURFACE\.paintSurface\(/.test(src),
      "D3 planet-texture.js has no palette and no terrain algorithm of its own (no colour stops, no colour triplets, no tint / mix logic): it imports and paints the canonical surface",
      Object.entries(own).filter(([, v]) => v).map(([k]) => k).join(", ") || "clean"); }

  // ---- E · texture size, signature, UV ↔ tile at the cut, authored layout
  check(J(P.textureSize(60, 40)) === J({ width: 480, height: 240 }) && J(P.textureSize(60, 40, 900)) === J({ width: 960, height: 480 }),
    "E1 textureSize: 60×40 → 480×240 (8×6 px per tile), 2:1 and whole pixels per tile at any target", J([P.textureSize(60, 40), P.textureSize(60, 40, 900)]));
  { const p = worlds[2].planet, r = worlds[2].A.render, s0 = P.textureSignature(p, { render: r, width: 480 }), s1 = P.textureSignature({ ...p }, { render: r, width: 480 });  // Desert 5: has render hints
    const tm = Array.from(p.tilemap); tm[777] = tm[777] < 0 ? 0 : -1;
    const s2 = P.textureSignature({ ...p, tilemap: tm }, { render: r, width: 480 }), s3 = P.textureSignature(p, { render: r, width: 480, diag: { grid: true } }), s4 = P.textureSignature(p, { render: null, width: 480 });
    check(s0 === s1 && new Set([s0, s2, s3, s4]).size === 4, "E2 textureSignature: equal content → equal signature (no re-upload); one tile, diagnostics or render hints → a new one", J([s0, s1, s2, s3, s4])); }
  { let rt = 0; for (let y = 0; y < 40; y++) for (let x = 0; x < 60; x++) { const c = P.tileCenterUV(60, 40, x, y), t = P.uvToTile(60, 40, c.u, c.v, true); if (t.x === x && t.y === y) rt++; }
    const e = [P.uvToTile(60, 40, 1, 0.5, true).x, P.uvToTile(60, 40, 1, 0.5, false).x, P.uvToTile(60, 40, 1 - 1e-9, 0.5, true).x, P.uvToTile(60, 40, 0, 0.5, true).x];
    let n5 = 0; for (const w of worlds) { const p = w.planet; for (let y = 0; y < 40; y++) { const v = 1 - (y + 0.5) / 40, L = P.regionAtUV(p, 1 - 1e-4, v), R = P.regionAtUV(p, 1e-4, v), tl = p.tilemap[y * 60 + 59], tr = p.tilemap[y * 60];
      if (L.x === 59 && R.x === 0 && L.sectionIndex === (tl < 0 ? -1 : tl) && R.sectionIndex === (tr < 0 ? -1 : tr) && (tl === tr) === (L.sectionId === R.sectionId)) n5++; } }
    check(rt === 2400 && J(e) === J([0, 59, 59, 0]) && n5 === worlds.length * 40, "E3 UV ↔ tile round-trips all 2400 tiles; u = 1 ≡ column 0 on a cylinder; regionAtUV either side of the cut = the tilemap's own region",
      `round-trip ${rt}/2400 · ${J(e)} · cut rows ${n5}/${worlds.length * 40}`); }
  { const fb = BLOOM_DATA.planets.first_bloom, tp = P.texturePlanet(fb), lay = BLOOM.resolveLayout(fb, config), t = raster(P, tp, {});
    let threw = null; try { const save = globalThis.BLOOM; globalThis.BLOOM = undefined; try { P.texturePlanet(fb); } finally { globalThis.BLOOM = save; } } catch (err) { threw = err.message; }
    check(tp.tilemap.length === 2400 && J(Array.from(tp.tilemap)) === J(Array.from(lay.tilemap)) && !P.wrapsX(tp) && t.width === 480 && /no tilemap/.test(threw || ""),
      "E4 authored First Bloom: layout from BLOOM.resolveLayout (the game's own), a legacy rectangle (no wrap), draws 480×240; without BLOOM loaded it asks for { layout }",
      `${tp.sections.length} sections · wrapX ${P.wrapsX(tp)} · error "${(threw || "").slice(0, 60)}…"`); }

  console.log(`\n${fails ? `${fails} check(s) FAILED` : "ALL CHECKS PASS"}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log("FAIL  crashed — " + e.stack); console.log("\n1 check(s) FAILED"); process.exit(1); });
