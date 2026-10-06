// BLOOM — planet texture: authoritative planet data → the 2:1 texture PlanetSphereView wraps on its globe, and sphere UV →
// logical tile → region (BLOOM-027D production module; grown from the 027C spike's planet-projection.js).
//
// A VIEW of the authoritative planet model (gridWidth / gridHeight / sections / tilemap / topology from BLOOM.generatePlanet,
// BLOOM.generateFromArchetype / attemptPlanet, or an authored planet resolved by BLOOM.resolveLayout). It never edits the
// planet and never builds a second world model. The planet's own `topology` decides what the texture cut u = 0 ≡ 1 is:
// generated planets are cylinders ({ wrapX: true, wrapY: false }, BLOOM-027B), so column x = W − 1 and column x = 0 are
// ordinary neighbours; a planet without `topology` (First Bloom) is a rectangle and the cut is a real map edge.
//
// BLOOM-029B: the texture IS the canonical planet surface (resources/planet-surface/planet-surface.js, BLOOM.surface), painted
// at the texture's tile size under the planet's starting sky (planet.globalClimate). The production gameplay map paints the SAME
// surface with the SAME function, so the globe and the flat map are two presentations of one rendered surface. This file keeps
// no palette and no terrain algorithm of its own (it used to duplicate the old 2D map's, "kept in step by hand"); it adds only
// the texture geometry (2:1, whole pixels per tile), the upload signature, the developer diagnostics and the UV ↔ tile mapping.
// Bare ground and water only — no plants, bubbles, fronts or overlays.
//
// Plain ES module: no Three.js, no DOM access except the canvas handed to drawPlanetTexture, so Node can import it
// (tools/sphere-texture-check.js). The canonical surface is a classic script imported for its side effect (BLOOM.surface).
import "../planet-surface/planet-surface.js";

const SURFACE = globalThis.BLOOM.surface;
export const DEFAULT_TEXTURE_WIDTH = 480; // 60×40 grid → 480×240, exactly 8×6 texture pixels per tile

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const gcd = (a, b) => (b ? gcd(b, a % b) : a);

/** The canonical surface's open-water colour and its shallows (the palette lives in planet-surface.js). */
export const WATER_DEFAULT = SURFACE.lightWater(null), WATER_ALT_DEFAULT = SURFACE.surfaceTiles(
  { gridWidth: 2, gridHeight: 1, globalClimate: { temperature: 0, moisture: 50 }, sections: [{ local: { tempOffset: 0, moistureOffset: 0 } }], tilemap: [0, -1], topology: null })[1].rgb;

/** The decorative stipples (wave marks, dunes, frost glints, land grain) for a grid W tiles wide: BLOOM.surface.stipplesFor. */
export const stipplesFor = W => SURFACE.stipplesFor(W);

/**
 * The planet as the texture reads it: { gridWidth, gridHeight, globalClimate, sections, tilemap, topology }.
 * A generated planet already carries its tilemap. An authored planet (First Bloom) has only section centres; its layout comes
 * from `layout` (BLOOM.resolveLayout(planet, config)) or, when the BLOOM classic scripts are loaded, is resolved here with the
 * game's own resolver — never re-derived by this module.
 */
export function texturePlanet(planet, layout = null) { return SURFACE.surfacePlanet(planet, layout); }

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
  return SURFACE.surfaceSignature(planet, { render, extra: { diag, width } });
}

/** Per-tile surface (canonical model: bare ground under the starting sky, or water, plus its decoration flags). Pure. */
export function baseTileColors(planet, render = null) { return SURFACE.surfaceTiles(planet, { render }); }

/**
 * Draw the base planet into a 2:1 canvas from planet data (not from any gameplay canvas): the canonical surface painted at
 * tileW × tileH = width / W × height / H under the planet's starting sky. `planet` must carry a tilemap (see texturePlanet).
 * Tile (x, y) covers texture pixels [x·tw, (x+1)·tw) × [y·th, (y+1)·th). Returns the geometry the UV mapping relies on.
 */
export function drawPlanetTexture(canvas, planet, { render = null, width = 0, height = 0, diag = null } = {}) {
  const W = planet.gridWidth, H = planet.gridHeight;
  if (!width) ({ width, height } = textureSize(W, H));
  if (width !== 2 * height) throw new Error(`planet texture must be 2:1 (got ${width}×${height})`);
  if (width % W || height % H) throw new Error(`texture ${width}×${height} is not a whole number of pixels per tile for a ${W}×${H} grid`);
  if (canvas.width !== width) canvas.width = width; if (canvas.height !== height) canvas.height = height;
  const ctx = canvas.getContext("2d"), tw = width / W, th = height / H;
  const { tiles } = SURFACE.paintSurface(ctx, planet, { render, tileW: tw, tileH: th });
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
