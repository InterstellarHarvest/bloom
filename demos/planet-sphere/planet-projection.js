// BLOOM — planet-sphere spike: planet data → 2:1 texture, and sphere UV → logical tile → region. PROTOTYPE ONLY.
//
// A VIEW of the authoritative planet model (gridWidth / gridHeight / sections / tilemap from BLOOM.generatePlanet or
// BLOOM.generateFromArchetype). It never edits the planet, never builds a second world model and never wraps the grid:
// column x = 0 and column x = W − 1 stay hard edges in the data; on the sphere they meet at the texture seam (u = 0 ≡ 1).
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
export function drawPlanetTexture(canvas, planet, { render = null, width = DEFAULT_TEXTURE.width, height = DEFAULT_TEXTURE.height } = {}) {
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
  return { width, height, tileW: tw, tileH: th, gridWidth: W, gridHeight: H, tiles };
}

/**
 * Sphere UV → logical tile. Three.js SphereGeometry: u runs 0 → 1 west → east around the full 360°, v runs 0 (south pole)
 * → 1 (north pole); CanvasTexture's default flipY puts canvas row 0 at v = 1. So tile x = ⌊u·W⌋, y = ⌊(1 − v)·H⌋, clamped
 * so u = 1 (the seam's far side) and v = 0 (the south pole) land on the last column / row rather than off the grid.
 */
export function uvToTile(gridWidth, gridHeight, u, v) {
  const x = clamp(Math.floor(u * gridWidth), 0, gridWidth - 1), y = clamp(Math.floor((1 - v) * gridHeight), 0, gridHeight - 1);
  return { x, y, index: y * gridWidth + x };
}

/** Logical tile centre → sphere UV (the inverse used by QA and by the "look at" buttons). */
export const tileCenterUV = (gridWidth, gridHeight, x, y) => ({ u: (x + 0.5) / gridWidth, v: 1 - (y + 0.5) / gridHeight });

/** UV → tile → the authoritative tilemap entry: water, or the existing BLOOM section. */
export function regionAtUV(planet, u, v) {
  const t = uvToTile(planet.gridWidth, planet.gridHeight, u, v), s = planet.tilemap[t.index];
  if (s < 0) return { ...t, water: true, sectionIndex: -1, sectionId: null, name: "Water (impassable)" };
  const sec = planet.sections[s];
  return { ...t, water: false, sectionIndex: s, sectionId: sec.id, name: sec.name, isOrigin: !!sec.isOrigin };
}

/** UV → longitude / latitude in degrees (map centre u = 0.5 is 0°, the seam u = 0 ≡ 1 is ±180°). */
export const uvToLonLat = (u, v) => ({ lon: u * 360 - 180, lat: v * 180 - 90 });

/**
 * How visible the non-wrapping seam is, measured on the data: rows whose left and right edge tiles disagree on land vs
 * water, rows where both are land but different sections (no section ever spans both edges, because the grid does not
 * wrap), and the mean colour step across the seam vs across interior column boundaries.
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
