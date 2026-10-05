// BLOOM — planet texture: authoritative planet data → the 2:1 texture PlanetSphereView wraps on its globe, and sphere UV →
// logical tile → region (BLOOM-027D production module; grown from the 027C spike's planet-projection.js).
//
// A VIEW of the authoritative planet model (gridWidth / gridHeight / sections / tilemap / topology from BLOOM.generatePlanet,
// BLOOM.generateFromArchetype / attemptPlanet, or an authored planet resolved by BLOOM.resolveLayout). It never edits the
// planet and never builds a second world model. The planet's own `topology` decides what the texture cut u = 0 ≡ 1 is:
// generated planets are cylinders ({ wrapX: true, wrapY: false }, BLOOM-027B), so column x = W − 1 and column x = 0 are
// ordinary neighbours; a planet without `topology` (First Bloom) is a rectangle and the cut is a real map edge.
//
// The base appearance is the 2D run map's (demos/demo-run.html barrenColor, water colours, dune and frost stipple;
// BLOOM-010/011), duplicated on purpose. It draws the starting sky (planet.globalClimate) and bare ground only — no plants,
// bubbles, fronts or overlays. One deliberate difference from the 2D map (BLOOM-027D): every stipple's x-period divides the
// grid width (stipplesFor), so on a cylinder the decoration runs straight through x = W − 1 → 0 instead of jumping phase there.
//
// Plain ES module: no Three.js, no DOM access except the canvas handed to drawPlanetTexture, so Node can import it
// (tools/sphere-texture-check.js).

export const DEFAULT_TEXTURE_WIDTH = 480; // 60×40 grid → 480×240, exactly 8×6 texture pixels per tile

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const gcd = (a, b) => (b ? gcd(b, a % b) : a);

// ---- palette (from demos/demo-run.html @ 6c0357b; keep in step by hand) ----
const TEMP_STOPS = [[-40, [44, 62, 104]], [-20, [78, 104, 140]], [0, [100, 126, 116]], [12, [92, 140, 88]], [25, [156, 146, 84]], [40, [182, 100, 60]], [60, [150, 58, 46]]];
function stops(v) {
  const S = TEMP_STOPS; if (v <= S[0][0]) return S[0][1].slice(); if (v >= S[S.length - 1][0]) return S[S.length - 1][1].slice();
  for (let i = 0; i < S.length - 1; i++) { const [a, ca] = S[i], [b, cb] = S[i + 1]; if (v >= a && v <= b) return mix(ca, cb, (v - a) / (b - a)); }
  return S[0][1].slice();
}
const FROST_BELOW = -8, coldWeight = t => clamp((4 - t) / 24, 0.12, 1);
export const WATER_DEFAULT = [24, 52, 92], WATER_ALT_DEFAULT = [30, 62, 104];

/**
 * The decorative stipples for a grid W tiles wide, each with an x-period that DIVIDES W, so stipple(x + W, y) = stipple(x, y):
 * on a cylinder the pattern is continuous across longitude zero exactly as it is across any interior column boundary.
 *
 * The 2D map's patterns have x-periods 7 (water stripes (x + y) % 7), 9 (dunes) and 32 (frost, through its (x >> 2) term);
 * none divides 60, so wrapped onto the globe each jumped phase at x = 59 → 0 (027C: a chevron in open water). Here each
 * modulus is the divisor of W nearest the 2D one (ties → the larger, sparser one), each x coefficient is coprime with its
 * modulus (so a·x mod m really has period m: no empty or doubled columns), and frost's irregularity term moves from x to y.
 * For W = 60: water (x + y) % 6 · dunes (7x + 13y + 3⌊y/2⌋) % 10 · frost (7x + 11y + 3⌊y/4⌋) % 10. Same look, wraps in x.
 * A width with no divisor near a pattern's period (e.g. a prime) gets a hashed stipple of the same density on x mod W instead
 * (period W, no regular rhythm to break).
 */
export function stipplesFor(W) {
  const near = p => { let best = 0; for (let d = Math.ceil(p / 2); d <= 2 * p; d++) if (W % d === 0 && (!best || Math.abs(d - p) < Math.abs(best - p) || (Math.abs(d - p) === Math.abs(best - p) && d > best))) best = d; return best; };
  const coprime = (a, m) => { while (gcd(a, m) !== 1) a++; return a; };
  const hashed = (p, salt) => (x, y) => { let h = Math.imul((((x % W) + W) % W) + 1, 0x9e3779b1) ^ Math.imul(y + salt, 0x85ebca6b); h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; return (h >>> 0) % p === 0; };
  const lattice = (p, a, g, salt) => { const m = near(p); if (!m) return [W, hashed(p, salt)]; const k = coprime(a, m); return [m, (x, y) => (k * x + g(y)) % m === 0]; };
  const [mw, water] = lattice(7, 1, y => y, 1), [md, dune] = lattice(9, 7, y => 13 * y + (y >> 1) * 3, 2), [mf, frost] = lattice(8, 5, y => 11 * y + (y >> 2) * 3, 3);
  return { periods: { water: mw, dune: md, frost: mf }, water, dune, frost };
}

/**
 * The planet as the texture reads it: { gridWidth, gridHeight, globalClimate, sections, tilemap, topology }.
 * A generated planet already carries its tilemap. An authored planet (First Bloom) has only section centres; its layout comes
 * from `layout` (BLOOM.resolveLayout(planet, config)) or, when the BLOOM classic scripts are loaded, is resolved here with the
 * game's own resolver — never re-derived by this module.
 */
export function texturePlanet(planet, layout = null) {
  if (!planet || !planet.gridWidth || !planet.gridHeight) throw new TypeError("planet-texture: not a BLOOM planet (gridWidth / gridHeight missing)");
  let L = layout || (planet.tilemap ? planet : null);
  if (!L) {
    const B = globalThis.BLOOM, D = globalThis.BLOOM_DATA;
    if (!B || typeof B.resolveLayout !== "function" || !D || !D.config)
      throw new Error(`planet-texture: planet "${planet.id}" has no tilemap; pass { layout: BLOOM.resolveLayout(planet, BLOOM_DATA.config) } or load resources/bloom-sim.js first`);
    L = B.resolveLayout(planet, D.config);
  }
  return { id: planet.id, name: planet.name, gridWidth: planet.gridWidth, gridHeight: planet.gridHeight, globalClimate: planet.globalClimate,
    sections: L.sections, tilemap: L.tilemap, topology: L.topology || planet.topology || null };
}

/** Texture size for a W×H grid: 2:1, a whole number of pixels per tile, the smallest such width ≥ `target`. */
export function textureSize(W, H, target = DEFAULT_TEXTURE_WIDTH) {
  const unit = W * 2 * H / gcd(W, 2 * H), width = unit * Math.max(1, Math.ceil(target / unit));
  return { width, height: width / 2 };
}

/**
 * A short hash of everything drawPlanetTexture reads (tilemap, section climate offsets, sky, render hints, diagnostics, size).
 * PlanetSphereView redraws and re-uploads the texture only when this changes.
 */
export function textureSignature(planet, { render = null, diag = null, width = 0 } = {}) {
  let h = 0x811c9dc5;
  const add = n => { h ^= n & 0xffff; h = Math.imul(h, 0x01000193); h ^= n >>> 16; h = Math.imul(h, 0x01000193); };
  const addStr = s => { for (let i = 0; i < s.length; i++) add(s.charCodeAt(i)); };
  add(planet.gridWidth); add(planet.gridHeight); add(width); add(wrapsX(planet) ? 1 : 0);
  for (let i = 0; i < planet.tilemap.length; i++) add(planet.tilemap[i] + 1);
  addStr(JSON.stringify([planet.globalClimate, planet.sections.map(s => [s.local.tempOffset, s.local.moistureOffset]), render, diag]));
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** Per-tile base colour (bare ground under the starting sky, or water), plus the stipple flags. Pure. */
export function baseTileColors(planet, render = null) {
  const W = planet.gridWidth, H = planet.gridHeight, T = planet.tilemap, SEC = planet.sections, ST = stipplesFor(W);
  const sky = planet.globalClimate, tintCold = !!(render && render.tintBy === "cold");
  const water = (render && render.water) || WATER_DEFAULT, waterAlt = (render && render.waterAlt) || WATER_ALT_DEFAULT;
  const secColor = SEC.map(s => { // demo-run barrenColor(i) with DRAW_T / DRAW_M = the starting sky
    const t = sky.temperature + s.local.tempOffset, m = sky.moisture + s.local.moistureOffset; let c = stops(t);
    if (m < 35) c = mix(c, [150, 138, 104], 0.4); else if (m > 68) c = mix(c, [64, 104, 104], 0.35);
    if (render && render.ground) c = mix(c, render.ground, render.groundMix * (tintCold ? coldWeight(t) : (m < 35 ? 1 : 0.5)));
    return mix(c, [10, 12, 18], 0.55);
  });
  const frosty = SEC.map(s => sky.temperature + s.local.tempOffset < FROST_BELOW);
  const out = new Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, s = T[i];
    if (s < 0) out[i] = { rgb: ST.water(x, y) ? waterAlt : water, water: true };
    else out[i] = { rgb: secColor[s], water: false,
      dune: !!(render && render.dunes) && ST.dune(x, y), frost: !!(render && render.frost) && frosty[s] && ST.frost(x, y) };
  }
  return out;
}

const css = c => `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;

/**
 * Draw the base planet into a 2:1 canvas from planet data (not from any gameplay canvas). `planet` must carry a tilemap
 * (see texturePlanet). Tile (x, y) covers texture pixels [x·tw, (x+1)·tw) × [y·th, (y+1)·th), tw = width / W, th = height / H.
 * Returns the geometry the UV mapping relies on.
 */
export function drawPlanetTexture(canvas, planet, { render = null, width = 0, height = 0, diag = null } = {}) {
  const W = planet.gridWidth, H = planet.gridHeight;
  if (!width) ({ width, height } = textureSize(W, H));
  if (width !== 2 * height) throw new Error(`planet texture must be 2:1 (got ${width}×${height})`);
  if (width % W || height % H) throw new Error(`texture ${width}×${height} is not a whole number of pixels per tile for a ${W}×${H} grid`);
  if (canvas.width !== width) canvas.width = width; if (canvas.height !== height) canvas.height = height;
  const ctx = canvas.getContext("2d"), tw = width / W, th = height / H, tiles = baseTileColors(planet, render);
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const t = tiles[y * W + x], X = x * tw, Y = y * th;
    ctx.fillStyle = css(t.rgb); ctx.fillRect(X, Y, tw, th); // exact integer footprints: no overlap, no seams between tiles
    if (t.dune) { ctx.fillStyle = css(mix(t.rgb, [236, 206, 150], 0.35)); ctx.fillRect(X + Math.round(tw * .15), Y + Math.round(th * .55), Math.max(1, Math.round(tw * .7)), Math.max(1, Math.round(th * .14))); }
    if (t.frost) { const gx = Math.max(1, Math.round(tw * .16)), gy = Math.max(1, Math.round(th * .16)); ctx.fillStyle = css(mix(t.rgb, [236, 244, 255], 0.6));
      ctx.fillRect(X + Math.round(tw * .3), Y + Math.round(th * .3), gx, gy); ctx.fillRect(X + Math.round(tw * .3) + gx, Y + Math.round(th * .3) + gy, gx, gy);
      ctx.fillRect(X + Math.round(tw * .62), Y + Math.round(th * .62), gx, gy); }
  }
  if (diag) drawDiagnostics(ctx, planet, tw, th, diag);
  return { width, height, tileW: tw, tileH: th, gridWidth: W, gridHeight: H, tiles };
}

/**
 * Developer diagnostics drawn INTO the texture (BLOOM-027C; redrawn + re-uploaded only when a toggle changes, never per frame):
 *   boundaries  — a line on every land|land edge between two different section ids. Neighbours come from the planet's own
 *                 topology, so on a cylinder the x = W − 1 | x = 0 pair gets exactly the treatment of an interior pair.
 *   seamColumns — tint the two texture-edge columns x = 0 and x = W − 1.
 *   meridian    — a magenta line on longitude zero (the last and first texture pixel columns).
 *   highlight   — overlay every tile of one section index.
 *   grid        — a faint line on every tile edge (the logical tile footprint).
 * Not product visuals; nothing is blurred or masked: the base tile colours are untouched underneath.
 */
function drawDiagnostics(ctx, planet, tw, th, { boundaries = false, seamColumns = false, meridian = false, highlight = null, grid = false } = {}) {
  const W = planet.gridWidth, H = planet.gridHeight, T = planet.tilemap, wrap = wrapsX(planet);
  if (grid) {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    for (let x = 0; x < W; x++) ctx.fillRect(x * tw, 0, 1, H * th);
    for (let y = 0; y < H; y++) ctx.fillRect(0, y * th, W * tw, 1);
  }
  if (highlight !== null && highlight >= 0) {
    ctx.fillStyle = "rgba(255,226,92,0.55)";
    for (let i = 0; i < W * H; i++) if (T[i] === highlight) ctx.fillRect((i % W) * tw, Math.floor(i / W) * th, tw, th);
  }
  if (seamColumns) {
    ctx.fillStyle = "rgba(255,79,216,0.38)";
    ctx.fillRect(0, 0, tw, H * th); ctx.fillRect((W - 1) * tw, 0, tw, H * th);
  }
  if (boundaries) {
    ctx.fillStyle = "rgb(250,250,250)";
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const a = T[y * W + x]; if (a < 0) continue;
      const ex = x + 1 < W ? x + 1 : wrap ? 0 : -1; // east neighbour under the planet's topology
      if (ex >= 0) { const b = T[y * W + ex]; if (b >= 0 && b !== a) { ctx.fillRect((x + 1) * tw - 1, y * th, 1, th); ctx.fillRect(ex * tw, y * th, 1, th); } }
      if (y + 1 < H) { const b = T[(y + 1) * W + x]; if (b >= 0 && b !== a) ctx.fillRect(x * tw, (y + 1) * th - 1, tw, 2); }
    }
  }
  if (meridian) { ctx.fillStyle = "rgb(255,79,216)"; ctx.fillRect(0, 0, 1, H * th); ctx.fillRect(W * tw - 1, 0, 1, H * th); }
}

/**
 * Sphere UV → logical tile. Three.js SphereGeometry: u runs 0 → 1 west → east around the full 360°, v runs 0 (south pole)
 * → 1 (north pole); CanvasTexture's default flipY puts canvas row 0 at v = 1. So tile x = ⌊u·W⌋, y = ⌊(1 − v)·H⌋.
 * Rows clamp (v = 0, the south pole, lands on the last row). Columns WRAP when the planet wraps in x (u = 1 is the same
 * meridian as u = 0, so it lands on column 0), and clamp otherwise (u = 1 lands on the last column of a rectangle).
 */
export function uvToTile(gridWidth, gridHeight, u, v, wrapX = false) {
  const fx = Math.floor(u * gridWidth), y = clamp(Math.floor((1 - v) * gridHeight), 0, gridHeight - 1);
  const x = wrapX ? ((fx % gridWidth) + gridWidth) % gridWidth : clamp(fx, 0, gridWidth - 1);
  return { x, y, index: y * gridWidth + x };
}
/** The planet's own x-wrap (absent topology = the legacy rectangle). */
export const wrapsX = planet => !!(planet.topology && planet.topology.wrapX);

/** Logical tile centre → sphere UV. */
export const tileCenterUV = (gridWidth, gridHeight, x, y) => ({ u: (x + 0.5) / gridWidth, v: 1 - (y + 0.5) / gridHeight });

/** UV → tile → the authoritative tilemap entry: water, or the existing BLOOM section. */
export function regionAtUV(planet, u, v) {
  const t = uvToTile(planet.gridWidth, planet.gridHeight, u, v, wrapsX(planet)), s = planet.tilemap[t.index];
  if (s < 0) return { ...t, water: true, sectionIndex: -1, sectionId: null, name: "Water (impassable)" };
  const sec = planet.sections[s];
  return { ...t, water: false, sectionIndex: s, sectionId: sec.id, name: sec.name, isOrigin: !!sec.isOrigin };
}

/** UV → longitude / latitude in degrees (map centre u = 0.5 is 0°, the cut u = 0 ≡ 1 is ±180°). */
export const uvToLonLat = (u, v) => ({ lon: u * 360 - 180, lat: v * 180 - 90 });

/**
 * What sits across the texture cut, measured on the data (developer readout): rows whose edge tiles (x = W − 1 | x = 0)
 * disagree on land vs water, rows where both are land but different sections, rows where ONE section id is on both sides,
 * and the mean colour step across the cut vs across interior column boundaries.
 */
export function seamStats(planet, tiles) {
  const W = planet.gridWidth, H = planet.gridHeight, T = planet.tilemap;
  let landVsWater = 0, sectionBreak = 0, sameSection = 0;
  const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  let seamDelta = 0, innerDelta = 0;
  for (let y = 0; y < H; y++) {
    const a = T[y * W], b = T[y * W + W - 1];
    if ((a < 0) !== (b < 0)) landVsWater++; else if (a >= 0) { if (a !== b) sectionBreak++; else sameSection++; }
    seamDelta += d(tiles[y * W].rgb, tiles[y * W + W - 1].rgb);
    for (let x = 0; x < W - 1; x++) innerDelta += d(tiles[y * W + x].rgb, tiles[y * W + x + 1].rgb);
  }
  return { rows: H, landVsWater, sectionBreak, sameSection,
    meanSeamColourStep: +(seamDelta / H).toFixed(1), meanInteriorColourStep: +(innerDelta / (H * (W - 1))).toFixed(1) };
}
