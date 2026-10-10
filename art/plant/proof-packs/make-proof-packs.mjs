// BLOOM — generate the TEMPORARY PIPELINE PROOF packs of the BLOOM-035B-5 body plans (docs/SPECIES_BODY_PLANS_v1.md §4 step 1).
//
//   node art/plant/proof-packs/make-proof-packs.mjs            write art/plant/packs/proof-{cinder-rosette,woolly-candle,reed-spire}/
//   node art/plant/proof-packs/make-proof-packs.mjs --check    regenerate in memory; exit 1 unless the committed packs are pixel- and
//                                                              metadata-identical (PNG bytes may differ only by zlib version)
//
// TEMPORARY PIPELINE PROOF — NOT FINAL ART. These packs exist ONLY so every legal model of the rosette / candle / reed body plans renders and
// every pipeline check runs before any real species art exists. They are deliberately an ENGINEERING look: flat fills, a 1-px dark edge, and
// a black / yellow HAZARD CHECKER band across every drawing, so they can never pass for species art. Every drawing is drawn at its
// component's full contract maxSize with the contract's anchor convention, so the build's static clip proof is a worst-case proof.
// The drawings follow the plan contracts (art/plant/contracts/<plan>.json) and body plans (art/plant/body-plans/<plan>.json): a contract
// change regenerates the proof packs. Final art comes from the art studio per docs/species-art-briefs/ and replaces each pack.
// Deterministic: no randomness, no timestamp. Node built-ins only.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
export const PROOF_STATUS = "TEMPORARY PIPELINE PROOF — NOT FINAL ART";
export const PACKS = [
  { id: "proof-cinder-rosette", plan: "rosette", species: "Cinder Rosette", hue: { leaf: 32, stem: 18, core: 140 }, sky: ["#a9adb3", "#cfd1cf"], soil: ["#6d5a48", "#5e4d3d", "#8a7663"], turf: "#7a7a50" },
  { id: "proof-woolly-candle", plan: "candle", species: "Woolly Candle", hue: { leaf: 95, stem: 28, core: 165 }, sky: ["#9aa4b3", "#c9cfd6"], soil: ["#5f5650", "#524a44", "#7b726b"], turf: "#6c7562" },
  { id: "proof-reed-spire", plan: "reed", species: "Reed Spire", hue: { leaf: 168, stem: 75, core: 120 }, sky: ["#a3b0b0", "#cdd5d0"], soil: ["#4e4a3c", "#433f33", "#6a6450"], turf: "#5d6e4a", water: ["#5f8a99", "#86aebb"] },
];

// ---------------------------------------------------------------- palette (18 materials, shade 0 → 3 dark → light; every colour unique)
const hsl = (h, s, l) => { const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return "#" + [f(0), f(8), f(4)].map(v => Math.round(v * 255).toString(16).padStart(2, "0")).join(""); };
const LUM = [0.26, 0.4, 0.56, 0.74];
function paletteOf(pk) {
  const H = pk.hue, ramp = (h, s, lum = LUM) => lum.map(l => hsl(h, s, l));
  const P = { ink: ["#1c1b20"], leaf: ramp(H.leaf, 0.42), stem: ramp(H.stem, 0.36), root: ramp(36, 0.3), core: ramp(H.core, 0.38), petal: ramp(312, 0.45), center: ramp(52, 0.85, [0.3, 0.45, 0.6, 0.72]),
    pappus: ramp(48, 0.12), seed: ramp(24, 0.4), frost: ramp(205, 0.55), tuber: ramp(20, 0.55), salt: ramp(8, 0.3, [0.32, 0.5, 0.66, 0.84]), pod: ramp(238, 0.4),
    pigLeaf: ramp(325, 0.45, [0.2, 0.32, 0.46, 0.62]), pigStem: ramp(335, 0.4, [0.21, 0.33, 0.47, 0.63]), pigCore: ramp(300, 0.4, [0.22, 0.34, 0.5, 0.66]),
    waxLeaf: ramp(188, 0.22, [0.3, 0.46, 0.62, 0.8]), waxCore: ramp(196, 0.2, [0.32, 0.48, 0.64, 0.82]) };
  const seen = new Set(); for (const [m, r] of Object.entries(P)) for (const h of r) { if (seen.has(h)) throw new Error(`${pk.id}: palette colour ${h} (${m}) not unique`); seen.add(h); }
  return P;
}

// ---------------------------------------------------------------- tiny raster
const Img = (w, h) => ({ w, h, px: new Array(w * h).fill(null) });   // px = [material, shade] | null
const set = (I, x, y, m, s) => { if (x >= 0 && y >= 0 && x < I.w && y < I.h) I.px[y * I.w + x] = [m, s]; };
const get = (I, x, y) => (x >= 0 && y >= 0 && x < I.w && y < I.h) ? I.px[y * I.w + x] : null;
function edgeShade(I, m, s) { const o = I.px.slice(); for (let y = 0; y < I.h; y++) for (let x = 0; x < I.w; x++) { const v = get(I, x, y); if (!v) continue;
    if (!get(I, x - 1, y) || !get(I, x + 1, y) || !get(I, x, y - 1) || !get(I, x, y + 1)) o[y * I.w + x] = [m, s]; } I.px = o; }
/** The HAZARD CHECKER: alternate ink / centre-yellow pixels over a band — the proof marking on every drawing. */
function hazard(I, inBand) { for (let y = 0; y < I.h; y++) for (let x = 0; x < I.w; x++) if (get(I, x, y) && inBand(x, y)) I.px[y * I.w + x] = (x + y) % 2 ? ["ink", 0] : ["center", 3]; }
function disc(I, cx, cy, rx, ry, m, s) { for (let y = 0; y < I.h; y++) for (let x = 0; x < I.w; x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) set(I, x, y, m, s); }
function lineTo(I, x0, y0, x1, y1, m, s) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let k = 0; k <= n; k++) set(I, Math.round(x0 + (x1 - x0) * k / n), Math.round(y0 + (y1 - y0) * k / n), m, s); }

// ---------------------------------------------------------------- drawings by family (anchor conventions = the contract's / ARTIST_HANDOFF H6)
const ANG_DEG = { flat: 4, low: 16, mid: 40, high: 68 };
const STRUCT_W = { base: 4, "drought.1": 5, "drought.2": 6, "drought.3": 7, "flood.1": 3, "flood.2": 4, "flood.3": 5 };
function leafDrawing(cid, angle, [w, h]) {
  const heat = cid.endsWith(".heat"), struct = cid.replace(/^leaf\./, "").replace(/\.heat$/, ""), deg = ANG_DEG[angle] + (heat ? 10 : 0), th = deg * Math.PI / 180;
  const below = deg < 20 ? 3 : 2, ay = h - 1 - below, L = Math.min((w - 1) / Math.cos(th), th > 0.01 ? ay / Math.sin(th) : 1e9), ux = Math.cos(th), uy = -Math.sin(th);
  const wmax = Math.max(2, STRUCT_W[struct] - (heat ? 1 : 0)), I = Img(w, h), half = u => Math.max(0.6, wmax / 2 * Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, u / L)) * 0.92 + 0.12), 0.8));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const dx = x, dy = y - ay, u = dx * ux + dy * uy, v = -dx * uy + dy * ux;
    if (u < 0 || u > L) continue; if (Math.abs(v) <= half(u)) set(I, x, y, "leaf", v < 0 ? 2 : 1); }
  set(I, 0, ay, "leaf", 1);
  if (struct.startsWith("drought")) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const dx = x, dy = y - ay, u = dx * ux + dy * uy, v = -dx * uy + dy * ux; if (get(I, x, y) && u > 1 && Math.abs(v) < half(u) - 1.2) set(I, x, y, "core", v < 0 ? 2 : 1); }
  if (struct.startsWith("flood")) for (let k = 2; k < L - 1; k++) set(I, Math.round(k * ux), Math.round(ay + k * uy), "leaf", 0);
  edgeShade(I, "leaf", 0);
  hazard(I, (x, y) => { const u = x * ux + (y - ay) * uy; return u > 0.42 * L && u < 0.42 * L + 2.5; });
  // points: the tip (farthest opaque pixel along the axis) + 3 upper-margin points; toothed notches beside them
  let tip = null, tu = -1; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (get(I, x, y)) { const u = x * ux + (y - ay) * uy; if (u > tu) { tu = u; tip = [x, y]; } }
  const upper = f => { const u = f * L, cx = u * ux, cy = ay + u * uy; let best = null, bd = -1; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (get(I, x, y)) {
      const du = (x - cx) * ux + (y - cy) * uy, v = -(x - cx) * uy + (y - cy) * ux; if (Math.abs(du) <= 0.75 && -v > bd) { bd = -v; best = [x, y]; } } return best; };
  const margin = [0.3, 0.55, 0.76].map(upper), notches = [0.2, 0.66, 0.86].map(upper).filter(p => p && !margin.some(q => q[0] === p[0] && q[1] === p[1]) && !(tip[0] === p[0] && tip[1] === p[1]));
  return { I, anchor: [0, ay], points: { tip, margin }, toothed: notches };
}
function trunkDrawing([w, h], tw, k) {   // h = |top| + 1, anchor bottom-centre, tip top-centre
  const I = Img(w, h), cx = (w - 1) / 2;
  for (let y = 0; y < h; y++) { const f = y / (h - 1), half = (tw - 1) / 2 * (0.75 + 0.25 * f) + (f > 0.45 ? (f - 0.45) * (2 + k) : 0); for (let x = 0; x < w; x++) if (Math.abs(x - cx) <= half) set(I, x, y, "stem", Math.abs(x - cx) < half / 2 ? 2 : 1); }
  for (let y = Math.round(h * 0.45); y < h; y += 3) for (let x = 0; x < w; x++) if (get(I, x, y) && Math.abs(x - cx) > 1) set(I, x, y, "seed", 1);   // the dead-leaf skirt
  set(I, Math.round(cx), 0, "stem", 2);
  edgeShade(I, "stem", 0); hazard(I, (x, y) => y >= Math.round(h * 0.3) && y < Math.round(h * 0.3) + 2);
  return { I, anchor: [Math.round(cx), h - 1], points: { tip: [Math.round(cx), 0], margin: [] } };
}
function genericDrawing(cid, c, [w, h], plan) {
  const I = Img(w, h), cx = Math.floor((w - 1) / 2);
  if (cid.startsWith("root.storage")) { disc(I, cx, h / 2, (w - 1) / 2, (h - 1) / 2, "tuber", 2); set(I, cx, 0, "tuber", 2); edgeShade(I, "tuber", 0); hazard(I, (x, y) => y === Math.floor(h / 2)); return { I, anchor: [cx, 0] }; }
  if (cid.startsWith("root.aerial")) { for (let y = 0; y < h; y++) set(I, cx, y, "root", 2); for (let y = 0; y < Math.min(3, h); y++) for (let x = 0; x < w; x++) if (Math.abs(x - cx) <= 1 + (y === 1 ? 1 : 0)) set(I, x, y, "root", 3); set(I, cx, Math.floor(h / 2), "ink", 0); set(I, cx, Math.floor(h / 2) + 1, "center", 3); return { I, anchor: [cx, h - 1] }; }
  if (cid === "root.stilt") { for (let k = 0; k <= 40; k++) { const t = k / 40, x = Math.round(t * (w - 3)), y = Math.round((h - 1) * t * t); set(I, x, y, "root", 2); set(I, x + 1, y, "root", 1); } set(I, w - 2, h - 1, "ink", 0); set(I, w - 1, h - 1, "center", 3); return { I, anchor: [0, 0] }; }
  if (cid.startsWith("frost.hair")) { for (let x = 0; x < w; x += 2) lineTo(I, cx, h - 1, x, 0, "frost", x % 4 ? 3 : 2); set(I, cx, h - 1, "frost", 1); return { I, anchor: [cx, h - 1] }; }
  if (cid.startsWith("frost.collar")) { const cy = Math.floor((h - 1) / 2); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (Math.abs(y - cy) <= (x % 3 === 0 ? cy : cy - 1)) set(I, x, y, "frost", y < cy ? 3 : 2);
    hazard(I, (x, y) => y === cy && (x < 2 || x > w - 3)); set(I, cx, cy, "frost", 1); return { I, anchor: [cx, cy] }; }
  if (cid === "salt.crystal") { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (Math.abs(x - cx) + Math.abs(y - (h - 1) / 2) <= (w - 1) / 2) set(I, x, y, "salt", x < cx ? 3 : 1); set(I, cx, h - 1, "salt", 2); set(I, cx, Math.floor(h / 2), "ink", 0); return { I, anchor: [cx, h - 1] }; }
  if (cid === "salt.gland") { disc(I, cx, (h - 1) / 2, (w - 1) / 2, (h - 1) / 2, "salt", 2); set(I, cx, h - 1, "salt", 1); return { I, anchor: [cx, h - 1] }; }
  if (cid === "seed.drift") { set(I, cx, h - 1, "seed", 1); set(I, cx, h - 2, "seed", 2); for (let x = 0; x < w; x++) set(I, x, Math.max(0, h - 4 - Math.abs(x - cx)), "pappus", 3); set(I, cx, 0, "ink", 0); return { I, anchor: [cx, h - 1] }; }
  if (cid === "pod") { set(I, cx, 0, "stem", 1); set(I, cx, 1, "stem", 1); disc(I, cx, (h + 1) / 2, (w - 1) / 2, (h - 3) / 2, "pod", 2); edgeShade(I, "pod", 0); hazard(I, (x, y) => y === Math.round((h + 1) / 2)); return { I, anchor: [cx, 0] }; }
  // apex / flower / seed-head family: upright on its stalk, anchor = the stalk's bottom pixel
  const top = Math.max(2, Math.floor(h * 0.15)), stalkTop = Math.floor(h * 0.55);
  for (let y = stalkTop; y < h; y++) set(I, cx, y, "stem", 1);
  if (cid === "bud") {
    if (plan === "reed") { for (const [x1, y1] of [[0, 2], [w - 1, 2], [1, 0], [w - 2, 0], [cx, 0], [0, 5], [w - 1, 5]]) lineTo(I, cx, stalkTop, x1, y1, "leaf", 2); }
    else { disc(I, cx, (top + stalkTop) / 2, Math.max(1.5, (w - 1) / 2 - 1), (stalkTop - top) / 2 + 1, "leaf", 2); edgeShade(I, "leaf", 0); }
    hazard(I, (x, y) => y === stalkTop); return { I, anchor: [cx, h - 1] }; }
  if (cid === "flower") { disc(I, cx, stalkTop / 2 + 1, (w - 1) / 2, stalkTop / 2 + 0.5, "petal", 2); disc(I, cx, stalkTop / 2 + 1, Math.max(1, w / 6), Math.max(1, h / 8), "center", 2); edgeShade(I, "petal", 0); hazard(I, (x, y) => y === stalkTop); return { I, anchor: [cx, h - 1] }; }
  if (cid.startsWith("seedHead")) { disc(I, cx, stalkTop / 2 + 0.5, (w - 1) / 2, stalkTop / 2 + 0.5, "pappus", 3); disc(I, cx, stalkTop / 2 + 0.5, Math.max(1, w / 5), Math.max(1, h / 7), "seed", 1); edgeShade(I, "pappus", 1); hazard(I, (x, y) => y === stalkTop); return { I, anchor: [cx, h - 1] }; }
  throw new Error(`proof generator: no drawing for ${cid}`);
}

// ---------------------------------------------------------------- PNG
const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = b => { let c = 0xffffffff; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t, "ascii"), d]), c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
export function encodePNG(W, H, rgba) { const h = Buffer.alloc(13); h.writeUInt32BE(W, 0); h.writeUInt32BE(H, 4); h[8] = 8; h[9] = 6;
  const raw = Buffer.alloc((W * 4 + 1) * H); for (let y = 0; y < H; y++) Buffer.from(rgba.buffer, rgba.byteOffset + y * W * 4, W * 4).copy(raw, y * (W * 4 + 1) + 1);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", h), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]); }

// ---------------------------------------------------------------- one pack
export function makePack(root, pk) {
  const C = JSON.parse(fs.readFileSync(path.join(root, `art/plant/contracts/${pk.plan}.json`), "utf8")), Pl = JSON.parse(fs.readFileSync(path.join(root, `art/plant/body-plans/${pk.plan}.json`), "utf8"));
  const pal = paletteOf(pk), drawings = [];
  const trunkTop = {}; for (const a of Object.values(Pl.architectures)) for (const ax of a.axes) if (ax.kind === "sprite") trunkTop[ax.body] = ax.top;
  for (const [cid, c] of Object.entries(C.components)) for (const angle of c.angles || [null]) {
    let d;
    if (c.family === "leaf") d = leafDrawing(cid, angle, c.maxSize);
    else if (c.family === "body") { const top = trunkTop[cid], k = c.tier, h = -top[1] + 1, w = Math.min(c.maxSize[0], 9 + 2 * k + 2 * (k + 1)); d = trunkDrawing([w % 2 ? w : w - 1, h], 9 + 2 * k, k); }
    else d = genericDrawing(cid, c, c.maxSize, pk.plan);
    drawings.push({ cid, c, angle, ...d });
  }
  // shelf packing (1-px gutter): the swatch strip on top, then every drawing, then the toothed masks
  const SW = 2, swatchColours = Object.values(pal).flat(), swatch = [0, 0, swatchColours.length * SW, SW], items = [];
  for (const d of drawings) { items.push({ d, kind: "sprite", w: d.I.w, h: d.I.h }); if (d.toothed) items.push({ d, kind: "toothed", w: d.I.w, h: d.I.h }); }
  const WIDTH = 256; let x = 0, y = SW + 2, rowH = 0;
  for (const it of items) { if (x + it.w > WIDTH) { x = 0; y += rowH + 1; rowH = 0; } it.x = x; it.y = y; x += it.w + 1; rowH = Math.max(rowH, it.h); }
  const H = y + rowH, W = Math.max(WIDTH, swatch[2]), rgba = new Uint8Array(W * H * 4), hexRGB = h => [1, 3, 5].map(k => parseInt(h.slice(k, k + 2), 16));
  const paint = (px, py, h) => { const c = hexRGB(h), i = (py * W + px) * 4; rgba[i] = c[0]; rgba[i + 1] = c[1]; rgba[i + 2] = c[2]; rgba[i + 3] = 255; };
  swatchColours.forEach((h, k) => { for (let a = 0; a < SW; a++) for (let b = 0; b < SW; b++) paint(k * SW + a, b, h); });
  const sprites = [];
  for (const it of items) { const { d } = it;
    if (it.kind === "sprite") { for (let yy = 0; yy < d.I.h; yy++) for (let xx = 0; xx < d.I.w; xx++) { const v = d.I.px[yy * d.I.w + xx]; if (v) paint(it.x + xx, it.y + yy, pal[v[0]][v[1]]); }
      const c = d.c, e = { id: c.angles ? `${d.cid}.${d.angle}` : d.cid, component: d.cid, ...(c.angles ? { angle: d.angle } : {}), rect: [it.x, it.y, d.I.w, d.I.h], anchor: d.anchor,
        attach: c.attach, layer: c.layer, order: 0, orientation: c.orientation, mirror: c.mirror, category: c.category, family: c.family, trait: c.trait, tier: c.tier };
      if (c.points) e.points = d.points;
      if (c.masks) e.masks = Object.fromEntries(c.masks.filter(t => t !== "toothed" || d.toothed).map(t => [t, "auto"]));
      d.entry = e; sprites.push(e); }
    else { for (const [xx, yy] of d.toothed) paint(it.x + xx, it.y + yy, pal.ink[0]); d.entry.masks.toothed = [it.x, it.y]; } }
  const env = { sky: pk.sky, soil: pk.soil, turf: pk.turf, ...(pk.water ? { water: pk.water } : {}) };
  const atlas = { format: "bloom-plant-atlas@1", pack: pk.id, bodyPlan: `${Pl.id}@${Pl.version}`, title: `TEMPORARY PIPELINE PROOF — ${pk.species} (${Pl.id}@${Pl.version})`, status: PROOF_STATUS,
    about: `${PROOF_STATUS}. Generated by art/plant/proof-packs/make-proof-packs.mjs (BLOOM-035B-5) from art/plant/contracts/${pk.plan}.json and art/plant/body-plans/${pk.plan}.json, ONLY to prove that every legal model of body plan ${Pl.id}@${Pl.version} renders: flat engineering fills, a dark edge and a black / yellow hazard checker on every drawing, every drawing at its full contract maxSize. Never shown to players as a species; it is not species art and not an art candidate. The ${pk.species} art comes from the art studio per docs/species-art-briefs/ and replaces this pack.`,
    image: "atlas.png", swatch, palette: pal, environment: env, render: { stemOutline: "ink" }, sprites };
  const readme = `# ${pk.id} — ${PROOF_STATUS}\n\n**${PROOF_STATUS}.** Body plan \`${Pl.id}@${Pl.version}\` (${pk.species}). Generated, never hand-edited:\n\`node art/plant/proof-packs/make-proof-packs.mjs\` (\`--check\` proves this folder equals a clean regeneration).\n\nIt exists only so every legal ${pk.species} model renders through the pipeline and every check runs before real art exists\n(BLOOM-035B-5, docs/SPECIES_BODY_PLANS_v1.md §4). The engineering look — flat fills, a dark edge, a black / yellow hazard checker\nacross every drawing — is deliberate: this is NOT species art, NOT an art candidate, and must never be shown as a species. The\nreal pack is produced from \`docs/species-art-briefs/\` and replaces this folder.\n`;
  return { atlas, png: encodePNG(W, H, rgba), rgba, W, H, readme };
}

export function makeAll(root = ROOT) { return Object.fromEntries(PACKS.map(pk => [pk.id, makePack(root, pk)])); }

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  const check = process.argv.includes("--check"), all = makeAll(ROOT), bad = [];
  for (const [id, r] of Object.entries(all)) { const dir = path.join(ROOT, "art/plant/packs", id);
    if (check) { const B = await import(path.join(ROOT, "tools/build-plant-art.mjs")), j = path.join(dir, "atlas.json"), p = path.join(dir, "atlas.png"), md = path.join(dir, "README.md");
      if (!fs.existsSync(j) || fs.readFileSync(j, "utf8") !== JSON.stringify(r.atlas, null, 1) + "\n") bad.push(`${id}/atlas.json`);
      if (!fs.existsSync(md) || fs.readFileSync(md, "utf8") !== r.readme) bad.push(`${id}/README.md`);
      if (!fs.existsSync(p)) bad.push(`${id}/atlas.png`); else { const img = B.decodePNG(fs.readFileSync(p)); if (img.w !== r.W || img.h !== r.H || !Buffer.from(img.rgba).equals(Buffer.from(r.rgba))) bad.push(`${id}/atlas.png (pixels)`); } }
    else { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, "atlas.json"), JSON.stringify(r.atlas, null, 1) + "\n"); fs.writeFileSync(path.join(dir, "atlas.png"), r.png); fs.writeFileSync(path.join(dir, "README.md"), r.readme); } }
  if (check) { if (bad.length) { console.error(`make-proof-packs --check FAILED: ${bad.join(", ")}`); process.exit(1); } console.log(`make-proof-packs --check OK — ${Object.keys(all).length} proof packs equal a clean regeneration`); }
  else console.log(`make-proof-packs — ${Object.entries(all).map(([id, r]) => `${id} ${r.atlas.sprites.length} drawings ${r.W}×${r.H}`).join(" · ")}`);
}
