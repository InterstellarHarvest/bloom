// BLOOM-027B evidence: flat-map captures of generated worlds, drawn twice — as the engine's 0…W−1 strip and rotated by half a
// turn (columns 30…59,0…29) so the former left/right edge sits in the middle of the picture. Section colours are fixed per id,
// water is blue, a thin dark line marks longitude zero in both views, and the right-hand panel draws the two seam columns
// (x = W−1 | x = 0) side by side. Pure Node (zlib PNG writer), no browser.
//   node docs/evidence/bloom-027b/render-flat-maps.js <bloom-root> <out-dir> <archetype:seed|gen:seed:water>...
"use strict";
const fs = require("fs"), path = require("path"), zlib = require("zlib");
const [ROOT, OUT, ...SPECS] = process.argv.slice(2);
for (const f of ["content/config.js", "content/traits.js", "content/archetypes.js", "resources/bloom-sim.js", "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js"]) require(path.join(path.resolve(ROOT), f));
const { BLOOM, BLOOM_DATA } = globalThis, { config, traits, archetypes } = BLOOM_DATA;
function png(width, height, rgb) { // rgb: Uint8Array width*height*3
  const raw = Buffer.alloc((width * 3 + 1) * height); for (let y = 0; y < height; y++) { raw[y * (width * 3 + 1)] = 0; rgb.copy ? rgb.copy(raw, y * (width * 3 + 1) + 1, y * width * 3, (y + 1) * width * 3) : raw.set(rgb.subarray(y * width * 3, (y + 1) * width * 3), y * (width * 3 + 1) + 1); }
  const crcT = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c; }
  const crc = b => { let c = -1; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
const PAL = [[230, 97, 90], [95, 170, 95], [240, 180, 60], [120, 120, 230], [220, 120, 200], [90, 200, 200], [200, 140, 90], [150, 200, 90], [240, 130, 130], [130, 170, 240], [190, 190, 80], [170, 110, 170], [100, 200, 150], [230, 160, 100], [160, 160, 160], [210, 90, 150], [90, 150, 210], [150, 210, 90], [210, 150, 90], [90, 210, 150], [200, 200, 200], [120, 80, 80], [80, 120, 80], [80, 80, 120]];
function draw(planet, title) {
  const W = planet.gridWidth, H = planet.gridHeight, tm = planet.tilemap, S = 8, gap = 12, panelW = 2 * S + 4;
  const width = W * S * 2 + gap * 3 + panelW, height = H * S + 2 * gap, img = Buffer.alloc(width * height * 3, 24);
  const px = (x, y, c) => { if (x < 0 || y < 0 || x >= width || y >= height) return; const i = (y * width + x) * 3; img[i] = c[0]; img[i + 1] = c[1]; img[i + 2] = c[2]; };
  const col = (t) => { const v = tm[t]; if (v < 0) { const d = planet.waterDepth ? planet.waterDepth[t] : 0; return [40, 70 + 40 * (1 - d), 150 + 60 * (1 - d)].map(Math.round); } return PAL[v % PAL.length]; };
  const strip = (ox, shift) => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const sx = (x + shift) % W, c = col(y * W + sx);
    for (let dy = 0; dy < S; dy++) for (let dx = 0; dx < S; dx++) px(ox + x * S + dx, gap + y * S + dy, c);
    // tile borders where the owner changes (east / south), cylindrical east neighbour
    const e = y * W + (sx + 1) % W, s = y + 1 < H ? (y + 1) * W + sx : -1;
    if (tm[e] !== tm[y * W + sx]) for (let dy = 0; dy < S; dy++) px(ox + x * S + S - 1, gap + y * S + dy, [10, 10, 10]);
    if (s >= 0 && tm[s] !== tm[y * W + sx]) for (let dx = 0; dx < S; dx++) px(ox + x * S + dx, gap + y * S + S - 1, [10, 10, 10]); }
    // longitude zero marker (x = 0 column's west edge), dotted
    const zx = ((W - shift) % W) * S; for (let y = 0; y < H * S; y += 2) px(ox + zx, gap + y, [255, 255, 255]); };
  strip(gap, 0); strip(gap * 2 + W * S, W / 2 | 0);
  // panel: the two seam columns, x = W−1 then x = 0
  const po = gap * 3 + W * S * 2; for (let y = 0; y < H; y++) { const a = col(y * W + W - 1), b = col(y * W); for (let dy = 0; dy < S; dy++) { for (let dx = 0; dx < S; dx++) { px(po + dx, gap + y * S + dy, a); px(po + S + 4 + dx, gap + y * S + dy, b); } } }
  return { buf: png(width, height, img), note: title };
}
fs.mkdirSync(OUT, { recursive: true }); const index = [];
for (const spec of SPECS) {
  const [kind, a, b] = spec.split(":"); let planet, title;
  if (kind === "gen") { planet = BLOOM.generatePlanet({ seed: +a, waterPct: +b, sections: 14, maxCrossingGap: config.crossing.maxGap }); title = `generatePlanet seed ${a} water ${b}%`; }
  else { planet = BLOOM.generateFromArchetype(archetypes.find(x => x.id === kind), +a, { config, traits }); title = `${kind} public seed ${a} → attempt ${planet.archetype.attempt} ${planet.name}`; }
  const W = planet.gridWidth, H = planet.gridHeight; let same = 0, landBoth = 0, one = 0; for (let y = 0; y < H; y++) { const l = planet.tilemap[y * W + W - 1], r = planet.tilemap[y * W]; if (l >= 0 && r >= 0) { landBoth++; if (l === r) same++; } else if (l >= 0 || r >= 0) one++; }
  const file = `${spec.replace(/[:]/g, "-")}.png`; fs.writeFileSync(path.join(OUT, file), draw(planet, title).buf);
  index.push({ file, title, topology: planet.topology, seamRows: { landBothSides: landBoth, sameSectionBothSides: same, coastCrossesCut: one, waterBothSides: H - landBoth - one }, sectionsSpanningCut: new Set(Array.from({ length: H }, (_, y) => planet.tilemap[y * W]).filter((v, y) => v >= 0 && v === planet.tilemap[y * W + W - 1])).size });
  console.log(file, JSON.stringify(index[index.length - 1].seamRows), "sections spanning the cut", index[index.length - 1].sectionsSpanningCut);
}
fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify({ legend: "left: engine strip x = 0…W−1 · right: the same world rotated half a turn (x = 30…59, 0…29) so the former side edges meet in the middle · dotted white line = longitude zero · far right: the two seam columns x = W−1 | x = 0 side by side · black = section borders (cylindrical east/south neighbour)", maps: index }, null, 1));
