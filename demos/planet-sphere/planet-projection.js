// BLOOM — planet-sphere spike: planet data → 2:1 texture, and sphere UV → logical tile → region. PROTOTYPE ONLY.
//
// A VIEW of the authoritative planet model (gridWidth / gridHeight / sections / tilemap / topology from BLOOM.generatePlanet
// or BLOOM.generateFromArchetype). It never edits the planet and never builds a second world model.
// BLOOM-027C: the planet's own `topology` decides what the texture cut u = 0 ≡ 1 is. Generated planets (BLOOM-027B) are
// cylinders ({ wrapX: true, wrapY: false }): column x = W − 1 and column x = 0 are ordinary neighbours, so the cut is an
// interior boundary like any other. A planet without `topology` (First Bloom) is a rectangle and the cut is a hard edge.
//
// The base-appearance palette below is DUPLICATED from demos/demo-run.html (TEMP_STOPS, barrenColor, water colours, dune
// and frost stipple; BLOOM-010/011) on purpose: extracting a shared renderer would churn production files for a spike.
// It draws the starting sky (planet.globalClimate) and bare ground only — no plants, bubbles, fronts or overlays.
//
// Plain ES module with no DOM access except the canvas context handed to drawPlanetTexture, so Node can import it.

export const DEFAULT_TEXTURE = { width: 480, height: 240 }; // 60×40 grid → exactly 8×6 texture pixels per tile

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

// ---- palette (copied from demos/demo-run.html @ 6c0357b; keep in step by hand while this is a spike) ----
const TEMP_STOPS = [[-40, [44, 62, 104]], [-20, [78, 104, 140]], [0, [100, 126, 116]], [12, [92, 140, 88]], [25, [156, 146, 84]], [40, [182, 100, 60]], [60, [150, 58, 46]]];
function stops(v) {
  const S = TEMP_STOPS; if (v <= S[0][0]) return S[0][1].slice(); if (v >= S[S.length - 1][0]) return S[S.length - 1][1].slice();
  for (let i = 0; i < S.length - 1; i++) { const [a, ca] = S[i], [b, cb] = S[i + 1]; if (v >= a && v <= b) return mix(ca, cb, (v - a) / (b - a)); }
  return S[0][1].slice();
}
const FROST_BELOW = -8, coldWeight = t => clamp((4 - t) / 24, 0.12, 1);
const duneAt = (x, y) => (x * 7 + y * 13 + ((y >> 1) * 3)) % 9 === 0;
const frostAt = (x, y) => (x * 5 + y * 11 + ((x >> 2) * 3)) % 8 === 0;
export const WATER_DEFAULT = [24, 52, 92], WATER_ALT_DEFAULT = [30, 62, 104];

/** Per-tile base colour (bare ground under the starting sky, or water), plus the stipple flags. Pure. */
export function baseTileColors(planet, render = null) {
  const W = planet.gridWidth, H = planet.gridHeight, T = planet.tilemap, SEC = planet.sections;
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
    if (s < 0) out[i] = { rgb: ((x + y) % 7 === 0) ? waterAlt : water, water: true };
    else out[i] = { rgb: secColor[s], water: false,
      dune: !!(render && render.dunes) && duneAt(x, y), frost: !!(render && render.frost) && frosty[s] && frostAt(x, y) };
  }
  return out;
}

const css = c => `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;

/**
 * Draw the base planet into a 2:1 canvas from planet data (not from any gameplay canvas).
 * Tile (x, y) covers texture pixels [x·tw, (x+1)·tw) × [y·th, (y+1)·th), tw = width / W, th = height / H.
 * Returns the geometry the UV mapping relies on.
 */
export function drawPlanetTexture(canvas, planet, { render = null, width = DEFAULT_TEXTURE.width, height = DEFAULT_TEXTURE.height, diag = null } = {}) {
  if (width !== 2 * height) throw new Error(`planet texture must be 2:1 (got ${width}×${height})`);
  const W = planet.gridWidth, H = planet.gridHeight;
  if (width % W || height % H) throw new Error(`texture ${width}×${height} is not a whole number of pixels per tile for a ${W}×${H} grid`);
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true }), tw = width / W, th = height / H, tiles = baseTileColors(planet, render);
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
 * BLOOM-027C developer diagnostics drawn INTO the texture (redrawn + re-uploaded only when a toggle changes, never per frame):
 *   boundaries — a line on every land|land edge between two different section ids. Neighbours come from the planet's own
 *                topology, so on a cylinder the x = W − 1 | x = 0 pair gets exactly the treatment of an interior pair (half
 *                the line on the last texture column, half on the first) and on a rectangle it gets none.
 *   seamColumns — tint the two texture-edge columns x = 0 and x = W − 1.
 *   highlight  — overlay every tile of one section index.
 *   grid       — a faint line on every tile edge (shows the logical tile footprint: 8×6 texture px at 480×240).
 * These are not product visuals and nothing here is blurred or masked: the base tile colours are untouched underneath.
 */
function drawDiagnostics(ctx, planet, tw, th, { boundaries = false, seamColumns = false, highlight = null, grid = false } = {}) {
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

/** Logical tile centre → sphere UV (the inverse used by QA and by the "look at" buttons). */
export const tileCenterUV = (gridWidth, gridHeight, x, y) => ({ u: (x + 0.5) / gridWidth, v: 1 - (y + 0.5) / gridHeight });

/** UV → tile → the authoritative tilemap entry: water, or the existing BLOOM section. */
export function regionAtUV(planet, u, v) {
  const t = uvToTile(planet.gridWidth, planet.gridHeight, u, v, wrapsX(planet)), s = planet.tilemap[t.index];
  if (s < 0) return { ...t, water: true, sectionIndex: -1, sectionId: null, name: "Water (impassable)" };
  const sec = planet.sections[s];
  return { ...t, water: false, sectionIndex: s, sectionId: sec.id, name: sec.name, isOrigin: !!sec.isOrigin };
}

/** UV → longitude / latitude in degrees (map centre u = 0.5 is 0°, the seam u = 0 ≡ 1 is ±180°). */
export const uvToLonLat = (u, v) => ({ lon: u * 360 - 180, lat: v * 180 - 90 });

/**
 * What sits across the texture cut, measured on the data: rows whose edge tiles (x = W − 1 | x = 0) disagree on land vs
 * water, rows where both are land but different sections, rows where ONE section id is on both sides (only possible when
 * the generator grew it across a wrapping cut), and the mean colour step across the cut vs across interior column boundaries.
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
