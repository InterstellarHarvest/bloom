// BLOOM — build the plant sprite runtime (BLOOM-032B1): art/plant/ (source PNG atlases + JSON metadata) → the generated runtime
// representation the renderer consumes. docs/PLANT_SPRITE_PIPELINE_v1.md.
//
//   npm --prefix tools run build:plant-art          (= node tools/build-plant-art.mjs)           write the generated files
//   npm --prefix tools run check:plant-art          (= node tools/build-plant-art.mjs --check)   rebuild in memory; exit 1 unless the committed files match
//   node tools/build-plant-art.mjs --root <dir> [--check] [--out <dir>]                      another checkout / another output directory
//
// INPUTS (the only things an artist edits):
//   art/plant/contract.json                  the fixed engine contract (canvas, materials, treatments, layers, orientations, components)
//   art/plant/body-plan.json                 where the skeleton puts every socket (data, not renderer code)
//   art/plant/packs/<pack>/atlas.png + atlas.json   one art pack: true pixel art + its metadata
// OUTPUTS (generated, committed, never edited by hand):
//   resources/plant-visual/generated/plant-atlas.js            a classic script: BLOOM.plantArt (works over file://, HTTP and any subpath;
//                                                              no fetch, no image decode, no canvas — synchronous, exact pixels)
//   resources/plant-visual/generated/plant-atlas-manifest.json what was built from what (hashes), coverage and the per-socket size budget
//
// VALIDATES (any failure = exit 1, nothing written): PNG decodes (8-bit, not interlaced); alpha is 0 or 255; every sprite / mask / swatch
// rect is inside the image and no two overlap; no stray opaque pixel outside a rect; every opaque sprite pixel is EXACTLY a declared palette
// colour; palette colours unique and ramps the contract's length; the swatch strip shows the palette; ids unique and = component[.angle];
// metadata (attach, layer, orientation, mirror, category, trait, tier) agrees with the contract's component registry; anchors and points lie
// inside their rects; masks are the sprite's size; every component × angle the renderer can ask for exists in every pack; and every sprite
// fits inside the canvas at every socket the body plan can put it on (the static no-clipping proof).
//
// REPRODUCIBLE: no timestamp, no absolute path, no machine name; keys sorted; the same inputs always give the same bytes. Node built-ins only.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

export const FORMAT = "bloom-plant-art/1";
export const OUT_JS = "resources/plant-visual/generated/plant-atlas.js";
export const OUT_MANIFEST = "resources/plant-visual/generated/plant-atlas-manifest.json";
const SELF = "tools/build-plant-art.mjs", CONTRACT = "art/plant/contract.json", BODY = "art/plant/body-plan.json", PACKS = "art/plant/packs";
const sha256 = b => crypto.createHash("sha256").update(b).digest("hex");

// ================================================================ PNG decoding (the subset pixel editors write: 8-bit, non-interlaced)
export function decodePNG(buf) {
  const SIG = [137, 80, 78, 71, 13, 10, 26, 10];
  if (buf.length < 8 || SIG.some((v, i) => buf[i] !== v)) throw new Error("not a PNG");
  let p = 8, ihdr = null, plte = null, trns = null; const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString("latin1", p + 4, p + 8), data = buf.subarray(p + 8, p + 8 + len); p += 12 + len;
    if (type === "IHDR") ihdr = { w: data.readUInt32BE(0), h: data.readUInt32BE(4), depth: data[8], color: data[9], interlace: data[12] };
    else if (type === "PLTE") plte = data; else if (type === "tRNS") trns = data; else if (type === "IDAT") idat.push(data); else if (type === "IEND") break;
  }
  if (!ihdr) throw new Error("PNG without IHDR");
  const { w, h, depth, color, interlace } = ihdr;
  if (interlace) throw new Error("interlaced PNG (save without interlacing)");
  const CH = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[color];
  if (!CH) throw new Error(`PNG colour type ${color} unsupported`);
  if (color === 3 ? ![1, 2, 4, 8].includes(depth) : depth !== 8) throw new Error(`PNG bit depth ${depth} unsupported for colour type ${color} (use 8-bit)`);
  const bpp = Math.max(1, (CH * depth) >> 3), stride = Math.ceil(w * CH * depth / 8), raw = zlib.inflateSync(Buffer.concat(idat));
  if (raw.length < (stride + 1) * h) throw new Error("PNG data truncated");
  const px = Buffer.alloc(stride * h), prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), out = px.subarray(y * stride, (y + 1) * stride), up = y ? px.subarray((y - 1) * stride, y * stride) : prev;
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? out[i - bpp] : 0, b = up[i], c = i >= bpp ? up[i - bpp] : 0;
      let v = line[i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      else if (f !== 0) throw new Error(`PNG filter ${f}`);
      out[i] = v & 255;
    }
  }
  const rgba = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = (y * w + x) * 4, row = y * stride;
    if (color === 6) { px.copy(Buffer.from(rgba.buffer), o, row + x * 4, row + x * 4 + 4); }
    else if (color === 2) { const i = row + x * 3; rgba[o] = px[i]; rgba[o + 1] = px[i + 1]; rgba[o + 2] = px[i + 2]; rgba[o + 3] = 255; }
    else if (color === 0) { const v = px[row + x]; rgba[o] = rgba[o + 1] = rgba[o + 2] = v; rgba[o + 3] = 255; }
    else if (color === 4) { const v = px[row + x * 2]; rgba[o] = rgba[o + 1] = rgba[o + 2] = v; rgba[o + 3] = px[row + x * 2 + 1]; }
    else { const bit = x * depth, idx = (px[row + (bit >> 3)] >> (8 - depth - (bit & 7))) & ((1 << depth) - 1);
      if (!plte || idx * 3 + 2 >= plte.length) throw new Error("PNG palette index out of range");
      rgba[o] = plte[idx * 3]; rgba[o + 1] = plte[idx * 3 + 1]; rgba[o + 2] = plte[idx * 3 + 2]; rgba[o + 3] = trns && idx < trns.length ? trns[idx] : 255; }
  }
  return { w, h, rgba };
}

// ================================================================ helpers
const hexOf = (r, g, b) => "#" + [r, g, b].map(v => v.toString(16).padStart(2, "0")).join("");
const isRect = r => Array.isArray(r) && r.length === 4 && r.every(Number.isInteger) && r[2] > 0 && r[3] > 0;
const isPt = p => Array.isArray(p) && p.length === 2 && p.every(Number.isInteger);
const overlap = (a, b) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];
/** Stable JSON: object keys sorted, so the output never depends on insertion order. */
function stable(v) { if (Array.isArray(v)) return v.map(stable); if (v && typeof v === "object") return Object.fromEntries(Object.keys(v).sort().map(k => [k, stable(v[k])])); return v; }

// ================================================================ the skeleton's socket geometry — ONE source of truth: the renderer's own skeleton
// (resources/plant-visual/plant-compositor.js, a classic script) is loaded here, so the static clip proof and the size budget use exactly
// the sockets the renderer will use.
const COMPOSITOR = "resources/plant-visual/plant-compositor.js";
function compositorOf(root) { const f = path.join(root, COMPOSITOR), g = {}; new Function("globalThis", "window", fs.readFileSync(f, "utf8"))(g, undefined); return g.BLOOM.plantCompositor; }
export const socketsOf = (root, body, canvas) => compositorOf(root).sockets(body, canvas);

// ================================================================ build
export function buildPlantArt(root) {
  root = path.resolve(root);
  const errors = [], read = rel => fs.readFileSync(path.join(root, rel)), rel = p => p.split(path.sep).join("/");
  const contractBuf = read(CONTRACT), bodyBuf = read(BODY), C = JSON.parse(contractBuf), B = JSON.parse(bodyBuf);
  if (C.format !== "bloom-plant-contract@1") errors.push(`${CONTRACT}: format ${C.format}`);
  if (B.format !== "bloom-plant-body-plan@1") errors.push(`${BODY}: format ${B.format}`);
  const MAT = C.materials.map(m => m.name), MID = Object.fromEntries(MAT.map((m, i) => [m, i + 1])), SHADES = Object.fromEntries(C.materials.map(m => [m.name, m.shades]));
  const LAYERS = C.layers, COMP = C.components, ANG = Object.keys(C.angles), ORI = Object.keys(C.orientations);
  const sockets = socketsOf(root, B, C.canvas);
  const inputs = [[CONTRACT, contractBuf], [BODY, bodyBuf], [COMPOSITOR, read(COMPOSITOR)]];
  const packIds = fs.readdirSync(path.join(root, PACKS)).filter(n => fs.statSync(path.join(root, PACKS, n)).isDirectory() && !n.startsWith(".")).sort();
  const packs = {}, coverage = {};
  for (const pid of packIds) {
    const dir = `${PACKS}/${pid}`, metaBuf = read(`${dir}/atlas.json`), M = JSON.parse(metaBuf), E = m => errors.push(`${dir}: ${m}`);
    if (M.format !== "bloom-plant-atlas@1") E(`format ${M.format}`);
    if (M.pack !== pid) E(`pack id "${M.pack}" ≠ folder "${pid}"`);
    if (!/^[a-z0-9][a-z0-9-]*$/.test(pid)) E("pack folder must be lower-case kebab");
    const imgRel = `${dir}/${M.image}`, imgBuf = read(imgRel); inputs.push([`${dir}/atlas.json`, metaBuf], [imgRel, imgBuf]);
    let img; try { img = decodePNG(imgBuf); } catch (e) { E(`${M.image}: ${e.message}`); continue; }
    // palette: colour → material·shade (exact, unique)
    const colour = new Map(), palette = {};
    for (const [m, ramp] of Object.entries(M.palette || {})) {
      if (!MID[m]) { E(`palette: unknown material "${m}"`); continue; }
      if (!Array.isArray(ramp) || ramp.length !== SHADES[m]) { E(`palette.${m}: needs exactly ${SHADES[m]} colour(s)`); continue; }
      palette[m] = ramp.map(h => { if (!/^#[0-9a-f]{6}$/.test(h)) E(`palette.${m}: "${h}" is not #rrggbb lower-case`); return h; });
      ramp.forEach((h, s) => { if (colour.has(h)) E(`palette colour ${h} used twice (${colour.get(h).m} and ${m})`); colour.set(h, { m, s }); });
    }
    for (const m of C.requiredMaterials) if (!palette[m]) E(`palette: required material "${m}" missing`);
    const env = M.environment || {}; if (!(Array.isArray(env.sky) && env.sky.length === 2 && Array.isArray(env.soil) && env.soil.length === 3 && typeof env.turf === "string")) E("environment: { sky [2], soil [3], turf } required");
    // rects
    const rects = [], owner = new Uint8Array(img.w * img.h);
    const claim = (r, what) => { if (!isRect(r)) { E(`${what}: rect must be [x, y, w, h] integers`); return false; }
      if (r[0] < 0 || r[1] < 0 || r[0] + r[2] > img.w || r[1] + r[3] > img.h) { E(`${what}: rect ${JSON.stringify(r)} outside the ${img.w}×${img.h} image`); return false; }
      for (const o of rects) if (overlap(o.r, r)) E(`${what}: rect overlaps ${o.what}`);
      rects.push({ r, what }); for (let y = r[1]; y < r[1] + r[3]; y++) for (let x = r[0]; x < r[0] + r[2]; x++) owner[y * img.w + x] = 1; return true; };
    const A = (x, y) => img.rgba[(y * img.w + x) * 4 + 3], RGB = (x, y) => { const i = (y * img.w + x) * 4; return hexOf(img.rgba[i], img.rgba[i + 1], img.rgba[i + 2]); };
    for (let i = 0; i < img.w * img.h; i++) { const a = img.rgba[i * 4 + 3]; if (a !== 0 && a !== 255) { E(`pixel (${i % img.w}, ${(i / img.w) | 0}) has partial alpha ${a} (only 0 or 255)`); break; } }
    if (M.swatch !== undefined && claim(M.swatch, "swatch")) {
      const seen = new Set(); for (let y = M.swatch[1]; y < M.swatch[1] + M.swatch[3]; y++) for (let x = M.swatch[0]; x < M.swatch[0] + M.swatch[2]; x++) if (A(x, y)) seen.add(RGB(x, y));
      const want = [...colour.keys()]; if (want.some(h => !seen.has(h)) || [...seen].some(h => !colour.has(h))) E("swatch strip does not show exactly the declared palette");
    }
    const sprites = {}, ids = new Set();
    for (const s of M.sprites || []) {
      const w = `sprite "${s.id}"`, c = COMP[s.component];
      if (ids.has(s.id)) E(`${w}: duplicate id`); ids.add(s.id);
      if (!c) { E(`${w}: unknown component "${s.component}"`); continue; }
      const wantId = c.angles ? `${s.component}.${s.angle}` : s.component;
      if (s.id !== wantId) E(`${w}: id must be "${wantId}" (component[.angle])`);
      if (c.angles ? !c.angles.includes(s.angle) : s.angle !== undefined) E(`${w}: angle "${s.angle}" not allowed (contract: ${JSON.stringify(c.angles)})`);
      for (const k of ["attach", "layer", "category", "trait", "tier"]) if (s[k] !== c[k]) E(`${w}: ${k} ${JSON.stringify(s[k])} ≠ contract ${JSON.stringify(c[k])}`);
      if (!ORI.includes(s.orientation)) E(`${w}: orientation "${s.orientation}" not one of ${ORI.join(" / ")}`);
      else if (s.orientation !== c.orientation && !(s.orientation === "left" && c.orientation === "right")) E(`${w}: orientation ${s.orientation} ≠ contract ${c.orientation}`);
      if (!!s.mirror !== !!c.mirror && s.orientation !== "left") E(`${w}: mirror ${!!s.mirror} ≠ contract ${!!c.mirror}`);
      if (!(s.layer in LAYERS)) E(`${w}: layer "${s.layer}"`);
      if (!Number.isInteger(s.order)) E(`${w}: order must be an integer`);
      if (!claim(s.rect, w)) continue;
      const [rx, ry, rw, rh] = s.rect;
      if (!isPt(s.anchor) || s.anchor[0] < 0 || s.anchor[1] < 0 || s.anchor[0] >= rw || s.anchor[1] >= rh) E(`${w}: anchor ${JSON.stringify(s.anchor)} outside its ${rw}×${rh} rect`);
      if (c.maxSize && (rw > c.maxSize[0] || rh > c.maxSize[1])) E(`${w}: ${rw}×${rh} exceeds the contract's max ${c.maxSize.join("×")} for ${s.component}`);
      const pts = s.points || {};
      if (c.points) for (const k of c.points) if (!(k in pts)) E(`${w}: points.${k} required (surface details attach there)`);
      const ptList = [...(pts.tip ? [pts.tip] : []), ...(pts.margin || [])];
      for (const p of ptList) if (!isPt(p) || p[0] < 0 || p[1] < 0 || p[0] >= rw || p[1] >= rh) E(`${w}: point ${JSON.stringify(p)} outside its rect`);
      const px = new Uint8Array(rw * rh); let opaque = 0;
      for (let y = 0; y < rh; y++) for (let x = 0; x < rw; x++) { if (!A(rx + x, ry + y)) continue; const h = RGB(rx + x, ry + y), cm = colour.get(h);
        if (!cm) { E(`${w}: pixel (${x}, ${y}) colour ${h} is not in the pack palette`); continue; }
        if (C.materials[MID[cm.m] - 1].treatmentOnly) E(`${w}: pixel (${x}, ${y}) uses treatment-only material ${cm.m}`);
        px[y * rw + x] = MID[cm.m] * 4 + cm.s; opaque++; }
      if (!opaque) E(`${w}: empty sprite`);
      for (const p of ptList) if (isPt(p) && p[0] >= 0 && p[1] >= 0 && p[0] < rw && p[1] < rh && !px[p[1] * rw + p[0]]) E(`${w}: point ${JSON.stringify(p)} is on a transparent pixel`);
      const masks = {};
      for (const [t, v] of Object.entries(s.masks || {})) {
        if (!C.treatments[t]) { E(`${w}: mask "${t}" is not a contract treatment (${Object.keys(C.treatments).join(" / ")})`); continue; }
        if (c.masks && !c.masks.includes(t)) E(`${w}: ${s.component} does not take a ${t} mask`);
        if (v === "auto") { masks[t] = "auto"; continue; }
        if (!isPt(v) || !claim([v[0], v[1], rw, rh], `${w} mask ${t}`)) { if (!isPt(v)) E(`${w}: mask ${t} must be "auto" or [x, y] (top-left of a ${rw}×${rh} mask rect)`); continue; }
        const bits = new Uint8Array(rw * rh); for (let y = 0; y < rh; y++) for (let x = 0; x < rw; x++) if (A(v[0] + x, v[1] + y)) bits[y * rw + x] = 1;
        masks[t] = Buffer.from(bits).toString("base64");
      }
      const one = { w: rw, h: rh, ax: s.anchor[0], ay: s.anchor[1], component: s.component, angle: s.angle || null, attach: s.attach, layer: s.layer, z: LAYERS[s.layer] * 100 + s.order,
        category: s.category, trait: s.trait, tier: s.tier, orientation: s.orientation, px: Buffer.from(px).toString("base64"), masks, points: { tip: pts.tip || null, margin: pts.margin || [] } };
      const key = `${s.id}@${s.orientation === "left" ? "left" : s.orientation === "right" ? "right" : s.orientation}`;
      sprites[key] = one;
      if (s.mirror && s.orientation === "right" && !(M.sprites || []).some(o => o.id === s.id && o.orientation === "left")) {
        const flip = b64 => { const a = Buffer.from(b64, "base64"), o = Buffer.alloc(a.length); for (let y = 0; y < rh; y++) for (let x = 0; x < rw; x++) o[y * rw + x] = a[y * rw + (rw - 1 - x)]; return o.toString("base64"); };
        sprites[`${s.id}@left`] = { ...one, ax: rw - 1 - one.ax, orientation: "left", baked: "mirror", px: flip(one.px),
          masks: Object.fromEntries(Object.entries(masks).map(([t, v]) => [t, v === "auto" ? v : flip(v)])),
          points: { tip: one.points.tip && [rw - 1 - one.points.tip[0], one.points.tip[1]], margin: one.points.margin.map(p => [rw - 1 - p[0], p[1]]) } };
      }
    }
    for (let i = 0; i < img.w * img.h; i++) if (img.rgba[i * 4 + 3] && !owner[i]) { E(`stray opaque pixel at (${i % img.w}, ${(i / img.w) | 0}) outside every declared rect`); break; }
    // coverage: everything the renderer can ask for
    const missing = [];
    for (const [cid, c] of Object.entries(COMP)) for (const ang of c.angles || [null]) { const base = ang ? `${cid}.${ang}` : cid;
      for (const side of c.orientation === "right" ? ["right", "left"] : [c.orientation]) if (!sprites[`${base}@${side}`]) missing.push(`${base}@${side}`); }
    if (missing.length) E(`missing sprites the renderer can ask for: ${missing.join(", ")}`);
    // static no-clipping proof: every sprite inside the canvas at every socket it can attach to (leaf-margin details: within their leaf's rect, at the leaf's socket)
    for (const [key, sp] of Object.entries(sprites)) {
      const side = key.endsWith("@left") ? -1 : key.endsWith("@right") ? 1 : 0;
      for (const so of sockets.filter(q => q.attach === sp.attach && (sp.attach !== "leafSocket" || q.side === side))) {
        const x0 = so.x - sp.ax, y0 = so.y - sp.ay;
        if (x0 < 0 || y0 < 0 || x0 + sp.w > C.canvas.w || y0 + sp.h > C.canvas.h) E(`clip: ${key} at ${so.layout}/${so.socket} (${so.x}, ${so.y}) leaves the ${C.canvas.w}×${C.canvas.h} canvas`);
      }
    }
    const render = { stemOutline: "self", ...(M.render || {}) };
    if (!["self", "ink", "none"].includes(render.stemOutline)) E(`render.stemOutline "${render.stemOutline}" (self / ink / none)`);
    for (const k of Object.keys(render)) if (k !== "stemOutline") E(`render.${k}: unknown render option`);
    packs[pid] = { title: M.title, status: M.status, about: M.about || "", palette, environment: env, render, sprites: stable(sprites) };
    coverage[pid] = { sprites: Object.keys(sprites).length, authored: (M.sprites || []).length, baked: Object.values(sprites).filter(s => s.baked).length, missing };
  }
  if (errors.length) return { errors };
  const listed = inputs.map(([p, b]) => ({ path: p, sha256: sha256(b) })).sort((a, b) => a.path < b.path ? -1 : 1);
  listed.push({ path: SELF, sha256: sha256(fs.readFileSync(path.join(root, SELF))) });
  const fingerprint = sha256(FORMAT + "\n" + listed.map(i => `${i.path} ${i.sha256}`).join("\n"));
  const runtime = stable({ format: FORMAT, fingerprint, materials: MAT, shades: SHADES, contract: { canvas: C.canvas, layers: C.layers, treatments: C.treatments, components: C.components, angles: Object.keys(C.angles), proceduralLayers: C.proceduralLayers },
    bodyPlan: B, packs, packOrder: packIds });
  const js = `// GENERATED by ${SELF} from art/plant/ — DO NOT EDIT. Rebuild: npm --prefix tools run build:plant-art (docs/PLANT_SPRITE_PIPELINE_v1.md).
// format ${FORMAT} · source fingerprint ${fingerprint}
// Sprite pixels: base64 bytes, one per pixel = material id × 4 + shade (0 = transparent); materials[id - 1] names the material.
(function (root) {
  "use strict";
  const ART = ${JSON.stringify(runtime)};
  root.BLOOM = Object.assign(root.BLOOM || {}, { plantArt: ART });
})(typeof window !== "undefined" ? window : globalThis);
`;
  const sizeBudget = sockets.map(s => ({ layout: s.layout, socket: s.socket, attach: s.attach, at: [s.x, s.y], side: s.side, ...(s.angle ? { angle: s.angle } : {}), room: s.room }));
  const manifest = stable({ format: FORMAT, fingerprint, inputs: listed, output: { path: OUT_JS, sha256: sha256(Buffer.from(js, "utf8")), bytes: Buffer.byteLength(js, "utf8") },
    canvas: C.canvas, packs: Object.fromEntries(packIds.map(p => [p, { title: packs[p].title, status: packs[p].status, ...coverage[p] }])), sockets: sizeBudget });
  return { errors: [], files: { [OUT_JS]: Buffer.from(js, "utf8"), [OUT_MANIFEST]: Buffer.from(JSON.stringify(manifest, null, 1) + "\n", "utf8") }, manifest, runtime };
}

// ================================================================ CLI
if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  const argv = process.argv.slice(2), opt = k => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
  const root = path.resolve(opt("--root") || path.join(path.dirname(fileURLToPath(import.meta.url)), "..")), out = path.resolve(opt("--out") || root);
  const r = buildPlantArt(root);
  if (r.errors.length) { console.error(`build-plant-art: ${r.errors.length} error(s)\n  ` + r.errors.join("\n  ")); process.exit(1); }
  if (argv.includes("--check")) {
    const bad = Object.entries(r.files).filter(([p, b]) => { const f = path.join(out, p); return !fs.existsSync(f) || !fs.readFileSync(f).equals(b); }).map(([p]) => p);
    if (bad.length) { console.error(`check:plant-art FAILED — the committed generated files differ from a clean rebuild:\n  ${bad.join("\n  ")}\nRun: npm --prefix tools run build:plant-art`); process.exit(1); }
    console.log(`check:plant-art OK — ${Object.keys(r.files).length} generated files match a clean rebuild (fingerprint ${r.manifest.fingerprint.slice(0, 12)})`);
  } else {
    for (const [p, b] of Object.entries(r.files)) { fs.mkdirSync(path.dirname(path.join(out, p)), { recursive: true }); fs.writeFileSync(path.join(out, p), b); }
    console.log(`build:plant-art — ${Object.entries(r.manifest.packs).map(([p, v]) => `${p} ${v.sprites} sprites`).join(" · ")} → ${OUT_JS} (${r.manifest.output.bytes} B), fingerprint ${r.manifest.fingerprint.slice(0, 12)}`);
  }
}
