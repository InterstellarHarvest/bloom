// BLOOM — the canonical planet surface (BLOOM-029B). docs/PRODUCTION_PLANET_VIEW_v1.md §2.
//
// ONE rendered surface, TWO presentations. This file is the only place where BLOOM decides what bare ground and water look
// like: the terrain palette, the archetype treatment (ground tint, desert dunes, frost glints, water hue), the coast, the
// per-tile grain and the wave marks. Both production consumers draw the planet with it and with nothing else:
//   · PlanetSphereView (resources/planet-sphere/planet-texture.js → drawPlanetTexture) wraps it round the globe;
//   · the production gameplay map (resources/run-ui/run-map-renderer.js) shows it flat, under the live overlays.
// There is no second palette and no second terrain algorithm to keep in step.
//
// What the surface is: STATIC information that identifies the planet — its tilemap (water / land / which region), its regions'
// climate offsets, its archetype's render hints and the sky the ground is seen under. A view of the authoritative planet
// model (never edited, never regenerated, never re-derived from a seed). What it is NOT: anything the run changes from moment to
// moment (vegetation, dead stands, native plants, fronts, bubbles, selection, previews, labels, badges, haze): those are overlays
// the gameplay map draws above it.
//
// The sky is an input, not an overlay: the ground's colour is the region's temperature / moisture under a sky. The globe draws
// the planet's starting sky (planet.globalClimate). The gameplay map passes the sky the run's ground sees NOW (adapter
// hud().skyNow: Terraform, scenario drift, shocks) and repaints the same surface when it changes, exactly as the old map recoloured
// its ground; under the starting sky the two are the same image.
//
// Cylinders (BLOOM-027B, topology { wrapX: true }): every decoration's x-period divides the grid width and the coast is found
// with the planet's own neighbour rule, so the surface runs straight through x = W − 1 → 0 with no seam. Rectangles (First Bloom,
// Training Grounds) keep a real map edge.
//
// Pure: no DOM except the 2D context handed to paintSurface, which uses only fillRect and opaque rgb() fill styles (so Node can
// rasterise it: tools/sphere-texture-check.js). Classic script with no imports or exports: it boots over file:// in the run page
// (<script src>) and planet-texture.js imports it for its side effect (an ES module import of this file works the same). Either
// way it publishes ONE instance: BLOOM.surface.
(function (root) {
  "use strict";
  const VERSION = 1;
  if (root.BLOOM && root.BLOOM.surface && root.BLOOM.surface.version === VERSION) return; // loaded twice (classic + module): keep one

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  const css = c => `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;

  // ---------------------------------------------------------------- the palette (the ONLY terrain palette in production)
  // Concept 18 light, friendly-science ground: icy blue-white → stone → khaki → sand → peach → red rock by temperature; drier
  // ground leans to pale sand, wetter ground to a cool damp grey-green. Never plant green: living vegetation is drawn above it.
  const PALETTE = Object.freeze({
    tempStops: Object.freeze([[-40, [224, 235, 246]], [-20, [198, 214, 230]], [0, [192, 205, 194]], [12, [208, 206, 162]], [25, [236, 212, 152]], [40, [240, 180, 130]], [60, [222, 140, 110]]]),
    dry: [244, 222, 166], dryBelow: 35, dryMix: 0.38,
    wet: [164, 196, 190], wetAbove: 68, wetMix: 0.36,
    water: [159, 208, 236],         // open water (Concept 18 ocean); archetypes with their own water hue keep its hue (lightWater)
    shallowMix: 0.36,               // water touching land: lighter shallows
    waveMix: 0.55,                  // wave marks: water toward white
    coast: [47, 58, 44], coastMix: 0.62, coastWidth: 0.14, // the land's edge against water (Concept 18's dark land outline)
    grain: 0.045,                   // per-tile lightness variation (± toward white / toward the coast ink)
    dune: [255, 246, 218], duneMix: 0.62, duneShadow: [150, 104, 52], duneShadowMix: 0.3,
    frost: [255, 255, 255], frostMix: 0.75, frostBelow: -8,
  });
  const coldWeight = t => clamp((4 - t) / 24, 0.12, 1); // render.tintBy "cold": colder ground takes more of the tint (BLOOM-011)

  function tempColor(v) {
    const S = PALETTE.tempStops; if (v <= S[0][0]) return S[0][1].slice(); if (v >= S[S.length - 1][0]) return S[S.length - 1][1].slice();
    for (let i = 0; i < S.length - 1; i++) { const [a, ca] = S[i], [b, cb] = S[i + 1]; if (v >= a && v <= b) return mix(ca, cb, (v - a) / (b - a)); }
    return S[0][1].slice();
  }
  // an archetype's water colour (content render hints, authored for the old dark map) read for the light palette: its hue,
  // a moderate saturation, the palette's lightness. No render hint → the palette's own water.
  function lightWater(c) {
    if (!c) return PALETTE.water.slice();
    const r = c[0] / 255, g = c[1] / 255, b = c[2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0; if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360;
    const l0 = (mx + mn) / 2, s0 = d ? d / (1 - Math.abs(2 * l0 - 1)) : 0, s = clamp(s0 * 0.85, 0.42, 0.66), l = 0.75;
    const C = (1 - Math.abs(2 * l - 1)) * s, X = C * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - C / 2;
    const [r1, g1, b1] = h < 60 ? [C, X, 0] : h < 120 ? [X, C, 0] : h < 180 ? [0, C, X] : h < 240 ? [0, X, C] : h < 300 ? [X, 0, C] : [C, 0, X];
    return [Math.round((r1 + m) * 255), Math.round((g1 + m) * 255), Math.round((b1 + m) * 255)];
  }

  /**
   * The decorative stipples for a grid W tiles wide, each with an x-period that DIVIDES W, so stipple(x + W, y) = stipple(x, y):
   * on a cylinder the pattern is continuous across longitude zero exactly as it is across any interior column boundary (027D).
   * Each modulus is the divisor of W nearest the old 2D map's period (7 waves, 9 dunes, 8 frost; ties → the larger), each x
   * coefficient is coprime with its modulus, and frost's irregularity term is on y. For W = 60: waves (x + y) % 6 ·
   * dunes (7x + 13y + 3⌊y/2⌋) % 10 · frost (7x + 11y + 3⌊y/4⌋) % 10. A width with no divisor near a period gets a hashed
   * stipple of the same density on x mod W. `grain` is the per-tile lightness variation of land: a hash of (x mod m, y) with
   * m = the land stipples' common period, so it repeats exactly with them (and wraps with them).
   */
  function stipplesFor(W) {
    const near = p => { let best = 0; for (let d = Math.ceil(p / 2); d <= 2 * p; d++) if (W % d === 0 && (!best || Math.abs(d - p) < Math.abs(best - p) || (Math.abs(d - p) === Math.abs(best - p) && d > best))) best = d; return best; };
    const coprime = (a, m) => { while (gcd(a, m) !== 1) a++; return a; };
    const hashed = (p, salt) => (x, y) => { let h = Math.imul((((x % W) + W) % W) + 1, 0x9e3779b1) ^ Math.imul(y + salt, 0x85ebca6b); h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; return (h >>> 0) % p === 0; };
    const lattice = (p, a, g, salt) => { const m = near(p); if (!m) return [W, hashed(p, salt)]; const k = coprime(a, m); return [m, (x, y) => (k * x + g(y)) % m === 0]; };
    const [mw, water] = lattice(7, 1, y => y, 1), [md, dune] = lattice(9, 7, y => 13 * y + (y >> 1) * 3, 2), [mf, frost] = lattice(8, 5, y => 11 * y + (y >> 2) * 3, 3);
    const mg = gcd(md, mf);
    const grain = (x, y) => { let h = Math.imul((((x % mg) + mg) % mg) + 7, 0x27d4eb2d) ^ Math.imul(y + 11, 0x165667b1); h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 13; return ((h >>> 0) % 1000) / 999 * 2 - 1; };
    return { periods: { water: mw, dune: md, frost: mf, grain: mg }, water, dune, frost, grain };
  }

  /**
   * The planet as the surface reads it: { id, name, gridWidth, gridHeight, globalClimate, sections, tilemap, topology }.
   * A generated planet carries its tilemap. An authored planet (First Bloom) has only section centres: its layout comes from
   * `layout` (BLOOM.resolveLayout(planet, config), or the running sim's own resolved layout) or, when the BLOOM classic scripts are
   * loaded, is resolved here with the game's own resolver — never re-derived by this module.
   */
  function surfacePlanet(planet, layout = null) {
    if (!planet || !planet.gridWidth || !planet.gridHeight) throw new TypeError("planet-surface: not a BLOOM planet (gridWidth / gridHeight missing)");
    let L = layout || (planet.tilemap ? planet : null);
    if (!L) {
      const B = root.BLOOM, D = root.BLOOM_DATA;
      if (!B || typeof B.resolveLayout !== "function" || !D || !D.config)
        throw new Error(`planet-texture: planet "${planet.id}" has no tilemap; pass { layout: BLOOM.resolveLayout(planet, BLOOM_DATA.config) } or load resources/bloom-sim.js first`);
      L = B.resolveLayout(planet, D.config);
    }
    return { id: planet.id, name: planet.name, gridWidth: planet.gridWidth, gridHeight: planet.gridHeight, globalClimate: planet.globalClimate,
      sections: L.sections, tilemap: L.tilemap, topology: L.topology || planet.topology || null };
  }
  const wrapsX = sp => !!(sp.topology && sp.topology.wrapX);
  // the sky as { temperature, moisture } (the planet's globalClimate form); accepts the adapter's { temp, moist } too
  const skyOf = (sp, sky) => !sky ? sp.globalClimate : sky.temperature !== undefined ? sky : { temperature: sky.temp, moisture: sky.moist };

  /**
   * Per-tile surface model (pure): for every tile its fill colour and the decoration it carries.
   *   { rgb, water, shallow, wave, coast (bits N1 E2 S4 W8: land edges facing water), dune, frost }
   * `sky` defaults to the planet's starting sky (planet.globalClimate).
   */
  function surfaceTiles(sp, { render = null, sky = null } = {}) {
    const W = sp.gridWidth, H = sp.gridHeight, T = sp.tilemap, SEC = sp.sections, ST = stipplesFor(W), wrap = wrapsX(sp), P = PALETTE;
    const S = skyOf(sp, sky), tintCold = !!(render && render.tintBy === "cold");
    const water = lightWater(render && render.water), shallow = mix(water, [255, 255, 255], P.shallowMix);
    const secColor = SEC.map(s => {
      const t = S.temperature + s.local.tempOffset, m = S.moisture + s.local.moistureOffset; let c = tempColor(t);
      if (m < P.dryBelow) c = mix(c, P.dry, P.dryMix); else if (m > P.wetAbove) c = mix(c, P.wet, P.wetMix);
      if (render && render.ground) c = mix(c, render.ground, render.groundMix * (tintCold ? coldWeight(t) : (m < P.dryBelow ? 1 : 0.5)));
      return c;
    });
    const frosty = SEC.map(s => S.temperature + s.local.tempOffset < P.frostBelow);
    const isWater = (x, y) => { if (y < 0 || y >= H) return false; if (x < 0 || x >= W) { if (!wrap) return false; x = (x + W) % W; } return T[y * W + x] < 0; };
    const out = new Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, s = T[i];
      if (s < 0) {
        const sh = !isWater(x - 1, y) && (x > 0 || wrap) || !isWater(x + 1, y) && (x < W - 1 || wrap) || (y > 0 && !isWater(x, y - 1)) || (y < H - 1 && !isWater(x, y + 1));
        out[i] = { rgb: sh ? shallow : water, water: true, shallow: sh, wave: ST.water(x, y), coast: 0, dune: false, frost: false };
      } else {
        const g = ST.grain(x, y), base = secColor[s], rgb = g >= 0 ? mix(base, [255, 255, 255], g * P.grain) : mix(base, P.coast, -g * P.grain);
        const coast = (isWater(x, y - 1) ? 1 : 0) | (isWater(x + 1, y) ? 2 : 0) | (isWater(x, y + 1) ? 4 : 0) | (isWater(x - 1, y) ? 8 : 0);
        out[i] = { rgb, water: false, shallow: false, wave: false, coast,
          dune: !!(render && render.dunes) && ST.dune(x, y), frost: !!(render && render.frost) && frosty[s] && ST.frost(x, y) };
      }
    }
    return out;
  }

  /**
   * A short hash of everything paintSurface reads (version, grid, topology, tilemap, section climate offsets, sky, render hints,
   * extra). Equal signature = identical surface; consumers repaint / re-upload only when it changes.
   */
  function surfaceSignature(sp, { render = null, sky = null, extra = null } = {}) {
    let h = 0x811c9dc5;
    const add = n => { h ^= n & 0xffff; h = Math.imul(h, 0x01000193); h ^= n >>> 16; h = Math.imul(h, 0x01000193); };
    const addStr = s => { for (let i = 0; i < s.length; i++) add(s.charCodeAt(i)); };
    add(VERSION); add(sp.gridWidth); add(sp.gridHeight); add(wrapsX(sp) ? 1 : 0);
    for (let i = 0; i < sp.tilemap.length; i++) add(sp.tilemap[i] + 1);
    const S = skyOf(sp, sky);
    addStr(JSON.stringify([sp.globalClimate, [+S.temperature.toFixed(3), +S.moisture.toFixed(3)], sp.sections.map(s => [s.local.tempOffset, s.local.moistureOffset]), render, extra]));
    return (h >>> 0).toString(16).padStart(8, "0");
  }

  /**
   * Paint the whole surface into a 2D context at (0, 0): tile (x, y) covers [x·tileW, (x+1)·tileW) × [y·tileH, (y+1)·tileH).
   * tileW / tileH must be whole pixels (exact integer footprints: no overlap, no seams). Opaque rgb() fills only.
   * Returns { tileW, tileH, gridWidth, gridHeight, tiles }.
   */
  function paintSurface(ctx, sp, { render = null, sky = null, tileW, tileH, tiles = null } = {}) {
    const W = sp.gridWidth, H = sp.gridHeight, P = PALETTE, tw = tileW, th = tileH;
    if (!(Number.isInteger(tw) && Number.isInteger(th) && tw > 0 && th > 0)) throw new Error(`planet-surface: tile size must be whole pixels (got ${tw}×${th})`);
    const TL = tiles || surfaceTiles(sp, { render, sky }), R = Math.round, one = v => Math.max(1, R(v));
    const cw = one(tw * P.coastWidth), ch = one(th * P.coastWidth);
    ctx.imageSmoothingEnabled = false;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const t = TL[y * W + x], X = x * tw, Y = y * th;
      ctx.fillStyle = css(t.rgb); ctx.fillRect(X, Y, tw, th);
      if (t.water) {
        if (t.wave) { ctx.fillStyle = css(mix(t.rgb, [255, 255, 255], P.waveMix)); const h = one(th * 0.1);   // a small "~": two offset dashes
          ctx.fillRect(X + R(tw * 0.16), Y + R(th * 0.5), one(tw * 0.34), h); ctx.fillRect(X + R(tw * 0.5), Y + R(th * 0.5) - h, one(tw * 0.34), h); }
        continue;
      }
      if (t.dune) { const h = one(th * 0.14);                                                                       // a wind ripple with its shadow
        ctx.fillStyle = css(mix(t.rgb, P.dune, P.duneMix)); ctx.fillRect(X + R(tw * 0.15), Y + R(th * 0.5), one(tw * 0.7), h);
        ctx.fillStyle = css(mix(t.rgb, P.duneShadow, P.duneShadowMix)); ctx.fillRect(X + R(tw * 0.15), Y + R(th * 0.5) + h, one(tw * 0.7), h); }
      if (t.frost) { const gx = one(tw * 0.16), gy = one(th * 0.16); ctx.fillStyle = css(mix(t.rgb, P.frost, P.frostMix));          // a small ice glint
        ctx.fillRect(X + R(tw * 0.3), Y + R(th * 0.3), gx, gy); ctx.fillRect(X + R(tw * 0.3) + gx, Y + R(th * 0.3) + gy, gx, gy);
        ctx.fillRect(X + R(tw * 0.62), Y + R(th * 0.62), gx, gy); }
      if (t.coast) { ctx.fillStyle = css(mix(t.rgb, P.coast, P.coastMix));
        if (t.coast & 1) ctx.fillRect(X, Y, tw, ch); if (t.coast & 4) ctx.fillRect(X, Y + th - ch, tw, ch);
        if (t.coast & 8) ctx.fillRect(X, Y, cw, th); if (t.coast & 2) ctx.fillRect(X + tw - cw, Y, cw, th); }
    }
    return { tileW: tw, tileH: th, gridWidth: W, gridHeight: H, tiles: TL };
  }

  const API = { version: VERSION, palette: PALETTE, stipplesFor, surfacePlanet, surfaceTiles, surfaceSignature, paintSurface, lightWater, wrapsX, skyOf };
  root.BLOOM = Object.assign(root.BLOOM || {}, { surface: Object.freeze(API) });
})(typeof window !== "undefined" ? window : globalThis);
