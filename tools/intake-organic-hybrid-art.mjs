// BLOOM — Organic Hybrid FINAL art intake (BLOOM-032B2): the PMO-approved Art Studio deliveries → the production art pack
// art/plant/packs/organic-hybrid/ (atlas.png + atlas.json) that tools/build-plant-art.mjs validates and bakes into the runtime atlas.
//
//   node tools/intake-organic-hybrid-art.mjs            assemble and write art/plant/packs/organic-hybrid/ + art/plant/intake/organic-hybrid/intake-map.json
//   node tools/intake-organic-hybrid-art.mjs --check    reassemble in memory; exit 1 unless the committed files match byte for byte
//
// INPUT (canonical, committed unchanged): art/plant/intake/organic-hybrid/
//   PMO_FINAL_ACCEPTANCE.json            the PMO's SHA-256 + byte size for each delivery
//   approved-deliveries/*.zip            batch1-base · batch2-cold-heat-corrected · batch3-drought · batch4-flood · batch5-salt-radiation ·
//                                        batch6-reproduction-dispersal · final-pack-metadata-closure
//
// MECHANICAL ONLY. Every delivery is verified against the PMO hashes first (any mismatch = exit 1, nothing written). The 55 approved
// component sprites and the 6 approved Base masks are copied into the atlas pixel for pixel: no resize, rotation, smoothing, recolour or
// redraw. What the tool MAY do (and all it does): place each sprite rect in the atlas with a 1-px transparent gutter, write the palette
// swatch, write the approved mask rects, and translate the studio's metadata (file names, LEAF_1… / "frost 0"… colour names, anchors, tip /
// margin points) into contract metadata (art/plant/contract.json). Transparent pixels are written as (0, 0, 0, 0); opaque pixels keep their
// exact RGB. Any approved pixel that is not an approved palette colour, any partial alpha, any size / anchor / point that breaks the contract
// is REPORTED (exit 1) — never repaired.
//
// MASKS (contract treatments, docs/PLANT_SPRITE_PIPELINE_v1.md § H12): the Art Studio authored pigment + toothed masks for the three Base
// leaves (Batch 5). Every other leaf drawing uses the contract's permitted defaults, not invented masks: pigment "auto" (every leaf / stem /
// core pixel takes the pigment ramp shade-for-shade), wax "auto" (Heat levels filter the shades), and NO toothed mask ("no mask = no teeth";
// toothed must be authored and none was approved for Heat / Drought / Flood leaf forms). Nothing else is masked.
//
// REPRODUCIBLE: no timestamp, no absolute path; the same deliveries always give the same bytes. Node built-ins only.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { decodePNG } from "./build-plant-art.mjs";

export const INTAKE = "art/plant/intake/organic-hybrid", PACK_DIR = "art/plant/packs/organic-hybrid";
export const OUT_PNG = `${PACK_DIR}/atlas.png`, OUT_JSON = `${PACK_DIR}/atlas.json`, OUT_MAP = `${INTAKE}/intake-map.json`;
const SELF = "tools/intake-organic-hybrid-art.mjs", CONTRACT = "art/plant/contract.json";
const sha256 = b => crypto.createHash("sha256").update(b).digest("hex");

/** The 55 approved component sprites, by delivery — the locked list (BLOOM-032B2 brief). Nothing else is ingested as a sprite. */
export const APPROVED = {
  "batch1-base.zip": ["leaf.base.low", "leaf.base.mid", "leaf.base.high", "bud", "bud.axil"],
  "batch2-cold-heat-corrected.zip": ["frost.hair.1", "frost.hair.2", "frost.hair.3", "frost.collar.2", "frost.collar.3", "leaf.base.heat.mid", "leaf.base.heat.high"],
  "batch3-drought.zip": [1, 2, 3].flatMap(t => ["low", "mid", "high"].map(a => `leaf.drought.${t}.${a}`))
    .concat([1, 2, 3].flatMap(t => ["mid", "high"].map(a => `leaf.drought.${t}.heat.${a}`)), ["root.storage.2", "root.storage.3"]),
  "batch4-flood.zip": [1, 2, 3].flatMap(t => ["low", "mid", "high"].map(a => `leaf.flood.${t}.${a}`))
    .concat([1, 2, 3].flatMap(t => ["mid", "high"].map(a => `leaf.flood.${t}.heat.${a}`)), ["root.aerial.1", "root.aerial.2", "root.aerial.3", "root.stilt"]),
  "batch5-salt-radiation.zip": ["salt.crystal", "salt.gland"],
  "batch6-reproduction-dispersal.zip": ["flower", "seedHead.small", "seedHead.large", "seed.drift", "pod"],
};
/** The 6 approved Base masks (Batch 5): treatment → the leaf drawing it belongs to. */
export const APPROVED_MASKS = ["low", "mid", "high"].flatMap(a => [`pigment.leaf.base.${a}`, `toothed.leaf.base.${a}`]);
const DELIVERIES = [...Object.keys(APPROVED), "final-pack-metadata-closure.zip"];
const MATERIAL = { INK: "ink", LEAF: "leaf", STEM: "stem", ROOT: "root", FROST: "frost", WAXLEAF: "waxLeaf", CORE: "core", TUBER: "tuber", SALT: "salt",
  pigLeaf: "pigLeaf", pigStem: "pigStem", pigCore: "pigCore", PETAL: "petal", CENTER: "center", PAPPUS: "pappus", SEED: "seed", POD: "pod" };

// ================================================================ ZIP reading (stored / deflate; CRC-checked)
export function readZip(buf) {
  let e = buf.length - 22; while (e >= 0 && buf.readUInt32LE(e) !== 0x06054b50) e--;
  if (e < 0) throw new Error("not a ZIP (no end-of-central-directory record)");
  const n = buf.readUInt16LE(e + 10), out = new Map(); let p = buf.readUInt32LE(e + 16);
  for (let k = 0; k < n; k++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("ZIP central directory corrupt");
    const method = buf.readUInt16LE(p + 10), crc = buf.readUInt32LE(p + 16), csize = buf.readUInt32LE(p + 20), usize = buf.readUInt32LE(p + 24);
    const nl = buf.readUInt16LE(p + 28), xl = buf.readUInt16LE(p + 30), cl = buf.readUInt16LE(p + 32), lo = buf.readUInt32LE(p + 42), name = buf.toString("utf8", p + 46, p + 46 + nl);
    p += 46 + nl + xl + cl;
    if (name.endsWith("/")) continue;
    const ds = lo + 30 + buf.readUInt16LE(lo + 26) + buf.readUInt16LE(lo + 28), raw = buf.subarray(ds, ds + csize);
    const data = method === 0 ? Buffer.from(raw) : method === 8 ? zlib.inflateRawSync(raw) : null;
    if (!data) throw new Error(`${name}: ZIP method ${method} unsupported`);
    if (data.length !== usize || (zlib.crc32(data) >>> 0) !== crc) throw new Error(`${name}: ZIP CRC / size mismatch`);
    out.set(name, data);
  }
  return out;
}
const byBase = (zip, base) => { const hits = [...zip.keys()].filter(k => k.split("/").pop() === base); if (hits.length !== 1) throw new Error(`${base}: ${hits.length} entries in delivery`); return [hits[0], zip.get(hits[0])]; };
const jsonIn = (zip, suffix) => { const hits = [...zip.keys()].filter(k => k.endsWith(suffix)); if (hits.length !== 1) throw new Error(`${suffix}: ${hits.length} entries`); return JSON.parse(zip.get(hits[0])); };

// ================================================================ PNG encoding (RGBA 8-bit, filter 0, no ancillary chunk — deterministic)
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t, "ascii"), d]), c = Buffer.alloc(4); c.writeUInt32BE(zlib.crc32(td) >>> 0); return Buffer.concat([l, td, c]); };
export function encodePNG(W, H, rgba) {
  const h = Buffer.alloc(13); h.writeUInt32BE(W, 0); h.writeUInt32BE(H, 4); h[8] = 8; h[9] = 6;
  const raw = Buffer.alloc((W * 4 + 1) * H); for (let y = 0; y < H; y++) Buffer.from(rgba.buffer, rgba.byteOffset + y * W * 4, W * 4).copy(raw, y * (W * 4 + 1) + 1);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", h), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

/** A sprite's pixel signature: the opaque/transparent matrix + the exact RGB of every opaque pixel (transparent RGB is irrelevant). */
export function signature(w, h, get) {
  const parts = []; let opaque = 0, partial = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [r, g, b, a] = get(x, y); if (a !== 0 && a !== 255) partial++;
    if (a) { opaque++; parts.push(`${x},${y}:${[r, g, b].map(v => v.toString(16).padStart(2, "0")).join("")}`); } }
  return { w, h, opaque, partial, sig: sha256(`${w}x${h}\n${parts.join("\n")}`) };
}

// ================================================================ assemble
export function assemble(root) {
  root = path.resolve(root);
  const errors = [], E = m => errors.push(m), read = rel => fs.readFileSync(path.join(root, rel));
  const C = JSON.parse(read(CONTRACT)), COMP = C.components;
  // 1 · the PMO hashes, first
  const acc = JSON.parse(read(`${INTAKE}/PMO_FINAL_ACCEPTANCE.json`)), zips = {}, hashes = [];
  if (acc.production_canvas.width !== C.canvas.w || acc.production_canvas.height !== C.canvas.h || acc.production_canvas.soil_y !== C.canvas.soilY) E("PMO canvas ≠ contract canvas");
  for (const f of DELIVERIES) {
    const want = acc.contents.find(c => c.file === f), buf = read(`${INTAKE}/approved-deliveries/${f}`), got = sha256(buf);
    hashes.push({ file: f, bytes: buf.length, sha256: got, pmoSha256: want && want.sha256, match: !!want && want.sha256 === got && want.bytes === buf.length });
    if (!want || want.sha256 !== got || want.bytes !== buf.length) E(`${f}: SHA-256 / size does not match PMO_FINAL_ACCEPTANCE.json (got ${got}, ${buf.length} B)`);
    else zips[f] = readZip(buf);
  }
  if (acc.contents.length !== DELIVERIES.length) E(`PMO package lists ${acc.contents.length} deliveries, expected ${DELIVERIES.length}`);
  if (errors.length) return { errors, hashes };
  const man = { b1: jsonIn(zips["batch1-base.zip"], "-base-authored-manifest.json"), b2: jsonIn(zips["batch2-cold-heat-corrected.zip"], "-batch2-manifest.json"),
    b3: jsonIn(zips["batch3-drought.zip"], "-batch3-manifest.json"), b4: jsonIn(zips["batch4-flood.zip"], "-batch4-manifest.json"),
    b5: jsonIn(zips["batch5-salt-radiation.zip"], "-batch5-manifest.json"), b6: jsonIn(zips["batch6-reproduction-dispersal.zip"], "-batch6-manifest.json"),
    closure: jsonIn(zips["final-pack-metadata-closure.zip"], "organic-hybrid-final-pack-metadata.json") };
  for (const [k, m] of Object.entries(man)) { const cv = m.logical_organism_canvas; if (cv && (cv.width !== C.canvas.w || cv.height !== C.canvas.h || cv.soil_y !== C.canvas.soilY || cv.crown[0] !== 42 || cv.crown[1] !== C.canvas.soilY)) E(`${k}: manifest canvas ≠ 84×98 / soil 68 / crown 42,68`); }

  // 2 · ONE palette from the six batches + the closure (studio names → contract material · shade); colours lower-case
  const palette = {}, source = {};
  const set = (mat, shade, hex, from) => { (palette[mat] = palette[mat] || [])[shade] = hex.toLowerCase(); source[hex.toLowerCase()] = { material: mat, shade, studio: from }; };
  for (const [name, hex] of Object.entries(man.b1.palette)) { const m = /^([A-Z]+)(?:_(\d))?$/.exec(name); if (!m || !MATERIAL[m[1]]) { E(`batch1 palette: unknown colour name ${name}`); continue; }
    set(MATERIAL[m[1]], m[2] ? +m[2] - 1 : 0, hex, `batch1 ${name}`); }
  for (const [b, m] of [["batch2", man.b2], ["batch3", man.b3], ["batch5", man.b5], ["batch6", man.b6]]) for (const [ramp, entries] of Object.entries(m.material_palette_additions || {})) {
    if (!MATERIAL[ramp]) { E(`${b}: unknown ramp ${ramp}`); continue; }
    if (entries.ordering !== "dark_to_light") E(`${b} ${ramp}: ordering ${entries.ordering}`);
    for (const [k, hex] of Object.entries(entries)) { const s = /^\S+ (\d)$/.exec(k); if (s) set(MATERIAL[ramp], +s[1], hex, `${b} ${ramp} "${k}"`); } }
  // Batch 2 repeats the Base LEAF ramp (base_leaf_material) — it must equal Batch 1's
  for (const [k, hex] of Object.entries(man.b2.base_leaf_material || {})) if (palette.leaf[+k.split("_")[1] - 1] !== hex.toLowerCase()) E(`batch2 base_leaf_material ${k} ≠ batch1`);
  if (!/dark_to_light/.test(man.closure.waxCore.ordering)) E("closure waxCore ordering");
  man.closure.waxCore.ramp.forEach((hex, s) => set("waxCore", s, hex, `closure waxCore[${s}]`));
  const orderedPalette = Object.fromEntries(C.materials.filter(m => palette[m.name]).map(m => [m.name, palette[m.name]]));
  for (const m of C.materials) { const r = palette[m.name]; if (!r || r.length !== m.shades || r.some(h => !h)) E(`palette: material ${m.name} needs ${m.shades} shade(s), approved art gives ${JSON.stringify(r)}`); }
  const allColours = Object.values(orderedPalette).flat();
  if (new Set(allColours).size !== allColours.length) E("palette: a colour is used by two materials");
  const env = man.closure.environment, environment = { sky: env.sky.map(h => h.toLowerCase()), soil: env.soil.map(h => h.toLowerCase()), turf: env.turf.toLowerCase() };
  for (const h of [...environment.sky, ...environment.soil, environment.turf]) if (source[h]) E(`environment colour ${h} is also a plant palette colour`);
  const render = { stemOutline: man.closure.render.stemOutline };

  // 3 · the 55 sprites: decode, check, read the studio metadata
  const studio = { "batch1-base.zip": man.b1.sprites, "batch2-cold-heat-corrected.zip": man.b2.sprites, "batch3-drought.zip": man.b3.sprites, "batch4-flood.zip": man.b4.sprites,
    "batch5-salt-radiation.zip": man.b5.sprites, "batch6-reproduction-dispersal.zip": man.b6.sprites };
  const items = [];
  for (const [zf, ids] of Object.entries(APPROVED)) {
    const extra = Object.keys(studio[zf]).filter(id => !ids.includes(id)); if (extra.length) E(`${zf}: manifest declares sprites outside the approved list: ${extra.join(", ")}`);
    for (const id of ids) {
      const md = studio[zf][id]; if (!md) { E(`${zf}: approved sprite ${id} missing from its manifest`); continue; }
      const [entry, png] = byBase(zips[zf], `${id}.png`); let img; try { img = decodePNG(png); } catch (e) { E(`${zf}:${entry}: ${e.message}`); continue; }
      const dims = md.size || md.dimensions; if (dims[0] !== img.w || dims[1] !== img.h) E(`${id}: PNG ${img.w}×${img.h} ≠ manifest ${dims.join("×")}`);
      const ang = /^(leaf\..+)\.(low|mid|high)$/.exec(id), component = ang ? ang[1] : id, angle = ang ? ang[2] : undefined;
      if (!COMP[component]) { E(`${id}: no contract component ${component}`); continue; }
      const margin = md.margins || md.margin_points;
      items.push({ id, component, angle, zf, entry, png, img, anchor: md.anchor, points: md.tip ? { tip: md.tip, margin } : null, materialsUsed: md.materials_used || null });
    }
  }
  const ids = items.map(i => i.id); if (ids.length !== 55 || new Set(ids).size !== 55) E(`expected 55 approved sprites, got ${ids.length}`);
  // masks (Batch 5 only)
  const masks = {};
  for (const [mk, md] of Object.entries(man.b5.masks || {})) {
    if (!APPROVED_MASKS.includes(mk)) { E(`batch5: unexpected mask ${mk}`); continue; }
    const [entry, png] = byBase(zips["batch5-salt-radiation.zip"], md.file), img = decodePNG(png), [t] = mk.split(".");
    masks[mk] = { treatment: t, sprite: md.source_sprite, entry, png, img };
  }
  if (Object.keys(masks).length !== APPROVED_MASKS.length) E(`expected ${APPROVED_MASKS.length} approved masks, got ${Object.keys(masks).length}`);
  if (errors.length) return { errors, hashes };

  // 4 · layout: swatch strip (one 2×2 block per colour; one column per material) then shelves, 1-px transparent gutters
  const ATLAS_W = 160, G = 1, sw = { x: 0, y: 0, w: C.materials.length * 2, h: 8 }, places = [];
  let x = 0, y = sw.h + G, shelfH = 0;
  const alloc = (w, h) => { if (x + w > ATLAS_W) { x = 0; y += shelfH + G; shelfH = 0; } const r = [x, y, w, h]; x += w + G; shelfH = Math.max(shelfH, h); return r; };
  for (const it of items) {
    it.rect = alloc(it.img.w, it.img.h); places.push({ rect: it.rect, img: it.img });
    it.masks = {};
    for (const [mk, m] of Object.entries(masks)) if (m.sprite === it.id) {
      if (m.img.w !== it.img.w || m.img.h !== it.img.h) { E(`mask ${mk}: ${m.img.w}×${m.img.h} ≠ ${it.id} ${it.img.w}×${it.img.h}`); continue; }
      m.rect = alloc(m.img.w, m.img.h); places.push({ rect: m.rect, img: m.img }); it.masks[m.treatment] = m; }
  }
  const ATLAS_H = y + shelfH, rgba = new Uint8Array(ATLAS_W * ATLAS_H * 4);
  C.materials.forEach((m, col) => palette[m.name].forEach((hex, s) => { for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
    const o = ((s * 2 + dy) * ATLAS_W + col * 2 + dx) * 4; rgba[o] = parseInt(hex.slice(1, 3), 16); rgba[o + 1] = parseInt(hex.slice(3, 5), 16); rgba[o + 2] = parseInt(hex.slice(5, 7), 16); rgba[o + 3] = 255; } }));
  for (const { rect: [rx, ry], img } of places) for (let yy = 0; yy < img.h; yy++) for (let xx = 0; xx < img.w; xx++) {
    const i = (yy * img.w + xx) * 4, o = ((ry + yy) * ATLAS_W + rx + xx) * 4; if (!img.rgba[i + 3]) continue;
    rgba[o] = img.rgba[i]; rgba[o + 1] = img.rgba[i + 1]; rgba[o + 2] = img.rgba[i + 2]; rgba[o + 3] = img.rgba[i + 3]; }

  // 5 · contract metadata
  const sprites = items.map(it => { const c = COMP[it.component], s = { id: it.id, component: it.component };
    if (it.angle) s.angle = it.angle;
    Object.assign(s, { rect: it.rect, anchor: it.anchor, attach: c.attach, layer: c.layer, order: 0, orientation: c.orientation, mirror: c.mirror, category: c.category, family: c.family, trait: c.trait, tier: c.tier });
    if (c.points) s.points = it.points;
    if (c.masks) { s.masks = {};
      s.masks.pigment = it.masks.pigment ? it.masks.pigment.rect.slice(0, 2) : "auto";
      s.masks.wax = "auto";
      if (it.masks.toothed) s.masks.toothed = it.masks.toothed.rect.slice(0, 2); }
    return s; });
  const atlas = { format: "bloom-plant-atlas@1", pack: "organic-hybrid", title: "Organic Hybrid — final art",
    status: "ORGANIC HYBRID — FINAL ART (PMO-approved; BLOOM-032B2 intake)",
    about: "The PMO-approved Organic Hybrid art (Art Studio Batches 1–6 + the final pack metadata closure), ingested mechanically by tools/intake-organic-hybrid-art.mjs from art/plant/intake/organic-hybrid/. Pixels are the approved pixels; only rects, the swatch and metadata were assembled. Not yet used by production (resources/run-ui/plant-specimen.js).",
    image: "atlas.png", swatch: [sw.x, sw.y, sw.w, sw.h], palette: orderedPalette, environment, render, sprites };

  // 6 · provenance: source → atlas, per sprite and mask
  const sigImg = img => signature(img.w, img.h, (xx, yy) => { const i = (yy * img.w + xx) * 4; return [img.rgba[i], img.rgba[i + 1], img.rgba[i + 2], img.rgba[i + 3]]; });
  const map = { format: "bloom-organic-hybrid-intake@1", milestone: "BLOOM-032B2", tool: SELF, pmoPackage: { status: acc.status, productionMain: acc.production_main, deliveries: hashes },
    atlas: { path: OUT_PNG, w: ATLAS_W, h: ATLAS_H, gutter: G, swatch: atlas.swatch },
    palette: { materials: Object.keys(orderedPalette).length, colours: allColours.length, source: Object.fromEntries(allColours.map(h => [h, source[h]])) }, environment, render,
    maskPolicy: { authored: "pigment + toothed for leaf.base.low / mid / high (Batch 5)", pigment: "auto on every other leaf drawing (contract default)", wax: "auto on every leaf drawing (contract default)", toothed: "none on Heat / Drought / Flood leaf drawings (no approved toothed mask; contract: no mask = no teeth)" },
    sprites: items.map(it => ({ id: it.id, delivery: it.zf, entry: it.entry, sourceSha256: sha256(it.png), size: [it.img.w, it.img.h], anchor: it.anchor, ...(it.points ? { points: it.points } : {}),
      materialsUsed: it.materialsUsed, rect: it.rect, ...sigImg(it.img), masks: Object.fromEntries(Object.entries(it.masks).map(([t, m]) => [t, m.rect.slice(0, 2)])) })),
    masks: Object.entries(masks).map(([mk, m]) => ({ id: mk, treatment: m.treatment, sprite: m.sprite, delivery: "batch5-salt-radiation.zip", entry: m.entry, sourceSha256: sha256(m.png), rect: m.rect, ...sigImg(m.img) })) };
  if (errors.length) return { errors, hashes };
  const pngBuf = encodePNG(ATLAS_W, ATLAS_H, rgba);
  return { errors: [], hashes, files: { [OUT_PNG]: pngBuf, [OUT_JSON]: Buffer.from(JSON.stringify(atlas, null, 1) + "\n"), [OUT_MAP]: Buffer.from(JSON.stringify(map, null, 1) + "\n") }, atlas, map, zips, items, masks };
}

// ================================================================ CLI
if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), r = assemble(root);
  if (r.errors.length) { console.error(`intake-organic-hybrid-art: ${r.errors.length} error(s) — nothing written\n  ` + r.errors.join("\n  ")); process.exit(1); }
  if (process.argv.includes("--check")) {
    const bad = Object.entries(r.files).filter(([p, b]) => { const f = path.join(root, p); return !fs.existsSync(f) || !fs.readFileSync(f).equals(b); }).map(([p]) => p);
    if (bad.length) { console.error(`intake check FAILED — committed files differ from a clean intake:\n  ${bad.join("\n  ")}`); process.exit(1); }
    console.log(`intake check OK — ${Object.keys(r.files).length} files match a clean intake of the 7 PMO-verified deliveries`);
  } else {
    for (const [p, b] of Object.entries(r.files)) { fs.mkdirSync(path.dirname(path.join(root, p)), { recursive: true }); fs.writeFileSync(path.join(root, p), b); }
    console.log(`intake — 7/7 deliveries match PMO hashes · ${r.map.sprites.length} sprites + ${r.map.masks.length} masks → ${OUT_PNG} (${r.map.atlas.w}×${r.map.atlas.h}, ${r.files[OUT_PNG].length} B) · ${r.map.palette.materials} materials / ${r.map.palette.colours} colours`);
  }
}
