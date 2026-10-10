// BLOOM — build the plant sprite runtime (BLOOM-032B1): art/plant/ (source PNG atlases + JSON metadata) → the generated runtime
// representation the renderer consumes. docs/PLANT_SPRITE_PIPELINE_v1.md.
//
//   npm --prefix tools run build:plant-art          (= node tools/build-plant-art.mjs)           write the generated files
//   npm --prefix tools run check:plant-art          (= node tools/build-plant-art.mjs --check)   rebuild in memory; exit 1 unless the committed files match
//   node tools/build-plant-art.mjs --root <dir> [--check] [--out <dir>]                      another checkout / another output directory
//   node tools/build-plant-art.mjs --briefs [--check]                                          (035B-5) write / verify docs/species-art-briefs/
//
// INPUTS (the only things an artist edits are the packs):
//   art/plant/contract.json                  the fixed engine contract (canvas, materials, treatments, layers, orientations, components) — SHARED
//                                            materials / treatments / pixel rules of every plan + the Organic Hybrid (oh-stem) registry
//   art/plant/body-plan.json                 Organic Hybrid's socket geometry (body-plan@2), referenced by art/plant/body-plans/oh-stem.json
//   art/plant/body-plans/<plan>.json         (BLOOM-035B-5) one body plan @3 per plan: canvas, ground, crown, axes / architectures, roots, local
//                                            colony layer, anchors; its contract + grammar
//   art/plant/contracts/<plan>.json          (BLOOM-035B-5) a plan's component registry (shared parts by reference)
//   resources/plant-visual/grammars/<plan>.js (BLOOM-035B-5) each plan's grammar (trait → look), bundled below
//   art/plant/packs/<pack>/atlas.png + atlas.json   one art pack: true pixel art + its metadata; atlas.json "bodyPlan": "<plan>@<version>"
// OUTPUTS (generated, committed, never edited by hand):
//   resources/plant-visual/generated/plant-atlas.js            a classic script: BLOOM.plantArt (works over file://, HTTP and any subpath;
//                                                              no fetch, no image decode, no canvas — synchronous, exact pixels); per plan:
//                                                              bodyPlans, contracts; per pack: its bodyPlan
//   resources/plant-visual/generated/plant-atlas-manifest.json what was built from what (hashes), coverage, the per-socket size budget
//                                                              (`sockets` = Organic Hybrid's, `bodyPlans.<plan>.sockets` per plan)
//   resources/plant-visual/plant-components.js                 (BLOOM-035B-5) the GRAMMAR BUNDLE: every grammars/<plan>.js, concatenated, at the
//                                                              path every existing page already loads (BLOOM.plantVisual.grammars + .components)
//
// VALIDATES (any failure = exit 1, nothing written): PNG decodes (8-bit, not interlaced); alpha is 0 or 255; every sprite / mask / swatch
// rect is inside the image and no two overlap; no stray opaque pixel outside a rect; every opaque sprite pixel is EXACTLY a declared palette
// colour; palette colours unique and ramps the contract's length; the swatch strip shows the palette; ids unique and = component[.angle];
// metadata (attach, layer, orientation, mirror, category, trait, tier) agrees with the contract's component registry; anchors and points lie
// inside their rects; masks are the sprite's size; every component × angle the renderer can ask for exists in every pack; and every sprite
// fits inside the canvas at every socket the body plan can put it on (the static no-clipping proof). (BLOOM-035B-5) All of it PER BODY
// PLAN: each pack is validated against its own plan's contract, coverage and sockets; a sprite body's points.tip must be its plan's crown point.
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
export const OUT_GRAMMARS = "resources/plant-visual/plant-components.js";
const SELF = "tools/build-plant-art.mjs", CONTRACT = "art/plant/contract.json", BODY = "art/plant/body-plan.json", PACKS = "art/plant/packs";
const PLANS = "art/plant/body-plans", GRAMMARS = "resources/plant-visual/grammars";
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
  const errors = [], read = rel => fs.readFileSync(path.join(root, rel)), rel = p => p.split(path.sep).join("/"), json = (f, buf) => { try { return JSON.parse(buf); } catch (e) { errors.push(`${f}: ${e.message}`); return null; } };
  const contractBuf = read(CONTRACT), bodyBuf = read(BODY), C = JSON.parse(contractBuf), B = JSON.parse(bodyBuf);
  if (C.format !== "bloom-plant-contract@1") errors.push(`${CONTRACT}: format ${C.format}`);
  if (B.format !== "bloom-plant-body-plan@2") errors.push(`${BODY}: format ${B.format}`);
  const MAT = C.materials.map(m => m.name), MID = Object.fromEntries(MAT.map((m, i) => [m, i + 1])), SHADES = Object.fromEntries(C.materials.map(m => [m.name, m.shades]));
  const ORI = Object.keys(C.orientations), compositor = compositorOf(root);
  const inputs = [[CONTRACT, contractBuf], [BODY, bodyBuf], [COMPOSITOR, read(COMPOSITOR)]];

  // ---- body plans (art/plant/body-plans/<plan>.json @3) + their contracts (shared parts by reference) + grammars
  const plans = {};
  for (const f of fs.readdirSync(path.join(root, PLANS)).filter(n => n.endsWith(".json")).sort()) {
    const file = `${PLANS}/${f}`, buf = read(file), Pl = json(file, buf), E = m => errors.push(`${file}: ${m}`); if (!Pl) continue; inputs.push([file, buf]);
    if (Pl.format !== "bloom-plant-body-plan@3") { E(`format ${Pl.format} (bloom-plant-body-plan@3)`); continue; }
    if (Pl.id !== f.replace(/\.json$/, "")) E(`id "${Pl.id}" ≠ file name`);
    if (!Number.isInteger(Pl.version) || Pl.version < 1) E(`version ${Pl.version}`);
    if (!Pl.canvas || Pl.canvas.w !== C.canvas.w || Pl.canvas.h !== C.canvas.h) E(`canvas must be the canonical ${C.canvas.w}×${C.canvas.h} (one specimen box for every species in v1)`);
    if (!Pl.ground || Pl.ground.y !== C.canvas.soilY || !["soil", "waterlogged"].includes(Pl.ground.kind)) E(`ground { y: ${C.canvas.soilY}, kind: soil | waterlogged } required`);
    if (!Array.isArray(Pl.crown) || Pl.crown[1] !== C.canvas.soilY) E("crown [x, soil row] required");
    const grammarFile = `${GRAMMARS}/${Pl.grammar}.js`; if (!fs.existsSync(path.join(root, grammarFile))) E(`grammar ${grammarFile} does not exist`);
    // the plan's contract: the shared contract itself (Organic Hybrid), or a plan contract whose sharedKeys come from it
    let PC_, contractFile = Pl.contract;
    if (contractFile === CONTRACT) PC_ = C;
    else { const cbuf = fs.existsSync(path.join(root, contractFile || "")) ? read(contractFile) : null; if (!cbuf) { E(`contract ${contractFile} does not exist`); continue; }
      const K = json(contractFile, cbuf); if (!K) continue; inputs.push([contractFile, cbuf]);
      if (K.format !== "bloom-plant-plan-contract@1" || K.plan !== Pl.id) errors.push(`${contractFile}: format bloom-plant-plan-contract@1 for plan "${Pl.id}" required`);
      if (K.shared !== CONTRACT) errors.push(`${contractFile}: shared must be ${CONTRACT}`);
      PC_ = { ...Object.fromEntries((K.sharedKeys || []).map(k => [k, C[k]])), angles: K.angles, layers: K.layers, proceduralLayers: K.proceduralLayers, attach: K.attach, components: K.components, families: K.families, visualCap: K.visualCap };
      for (const k of ["canvas", "materials", "requiredMaterials", "treatments", "orientations"]) if (!PC_[k]) errors.push(`${contractFile}: sharedKeys must include ${k}`); }
    const angs = Object.keys(PC_.angles || {});
    if (JSON.stringify(Pl.angles) !== JSON.stringify(angs)) E(`angles ${JSON.stringify(Pl.angles)} ≠ the contract's ${JSON.stringify(angs)} (same order: lowest → highest)`);
    for (const [cid, c] of Object.entries(PC_.components)) { if (c.angles && c.angles.some(a => !angs.includes(a))) E(`component ${cid}: angle not one of the plan's ${angs.join(" / ")}`);
      if (!(c.layer in PC_.layers)) E(`component ${cid}: layer ${c.layer} not in the contract's layers`); if (PC_.attach && !(c.attach in PC_.attach)) E(`component ${cid}: attach ${c.attach} not in the contract's attach kinds`); }
    // the plan's skeleton: Organic Hybrid's accepted body-plan@2 (referenced), or the plan's own axes
    let geometry = null, sockets = [];
    if (Pl.skeleton) { if (Pl.skeleton.kind !== "stem@2" || Pl.skeleton.source !== BODY) E(`skeleton { kind: "stem@2", source: "${BODY}" } is the only referenced skeleton`); else { geometry = B; sockets = compositor.sockets(B, C.canvas); } }
    else { try { sockets = compositor.sockets(Pl, PC_.canvas); } catch (e) { E(e.message); }
      for (const [aid, A] of Object.entries(Pl.architectures || {})) for (const ax of A.axes) { if (ax.kind === "sprite" && !(PC_.components[ax.body] && PC_.components[ax.body].attach === "body")) E(`${aid}/${ax.id}: body "${ax.body}" is not a body component of the contract`);
        for (const [set, idx] of Object.entries(A.leafSets || {})) if (!Array.isArray(idx) || idx.some(i => !Number.isInteger(i))) E(`${aid}: leafSets.${set} must be leaf indices`); } }
    for (const s of sockets) if (s.x < 0 || s.y < 0 || s.x >= C.canvas.w || s.y >= C.canvas.h) E(`socket ${s.layout}/${s.socket} (${s.x}, ${s.y}) is outside the canvas`);
    const kinds = new Set(sockets.map(s => s.attach)); for (const [cid, c] of Object.entries(PC_.components)) if (c.attach !== "leafPoint" && !kinds.has(c.attach)) E(`component ${cid}: no socket of attach kind ${c.attach} in this plan`);
    inputs.push([grammarFile, fs.existsSync(path.join(root, grammarFile)) ? read(grammarFile) : Buffer.alloc(0)]);
    plans[Pl.id] = { Pl, C: PC_, ref: `${Pl.id}@${Pl.version}`, contractFile, grammarFile, geometry, sockets, packs: [] };
  }
  if (!plans["oh-stem"]) errors.push(`${PLANS}/oh-stem.json (Organic Hybrid's plan) is required`);
  const planOfRef = ref => Object.values(plans).find(q => q.ref === ref) || null;

  const packIds = fs.readdirSync(path.join(root, PACKS)).filter(n => fs.statSync(path.join(root, PACKS, n)).isDirectory() && !n.startsWith(".")).sort();
  const packs = {}, coverage = {};
  for (const pid of packIds) {
    const dir = `${PACKS}/${pid}`, metaBuf = read(`${dir}/atlas.json`), M = JSON.parse(metaBuf), E = m => errors.push(`${dir}: ${m}`);
    if (M.format !== "bloom-plant-atlas@1") E(`format ${M.format}`);
    if (M.pack !== pid) E(`pack id "${M.pack}" ≠ folder "${pid}"`);
    if (!/^[a-z0-9][a-z0-9-]*$/.test(pid)) E("pack folder must be lower-case kebab");
    // (035B-5) the pack's body plan: its declaration, or — for a PMO-locked pack whose atlas.json the intake owns — a plan's lockedPacks list
    const locked = Object.values(plans).filter(q => (q.Pl.lockedPacks || []).includes(pid));
    if (M.bodyPlan === undefined && locked.length !== 1) { E(`atlas.json must declare "bodyPlan": "<plan>@<version>" (${Object.values(plans).map(q => q.ref).join(" / ")})`); continue; }
    if (M.bodyPlan !== undefined && locked.length) E(`declares bodyPlan although ${locked[0].ref} lists it in lockedPacks`);
    const plan = M.bodyPlan !== undefined ? planOfRef(M.bodyPlan) : locked[0];
    if (!plan) { E(`bodyPlan "${M.bodyPlan}" is not a body plan in ${PLANS}/ (${Object.values(plans).map(q => q.ref).join(" / ")})`); continue; }
    plan.packs.push(pid);
    const PCt = plan.C, LAYERS = PCt.layers, COMP = PCt.components, sockets = plan.sockets;
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
    if (env.water !== undefined && !(Array.isArray(env.water) && env.water.length === 2 && env.water.every(h => /^#[0-9a-f]{6}$/.test(h)))) E("environment.water: [2] #rrggbb colours");
    if (plan.Pl.ground.kind === "waterlogged" && !env.water) E(`environment.water [2] required: body plan ${plan.ref} stands on waterlogged ground`);
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
      if (!c) { E(`${w}: unknown component "${s.component}"${plan.ref !== "oh-stem@1" ? ` (body plan ${plan.ref})` : ""}`); continue; }
      const wantId = c.angles ? `${s.component}.${s.angle}` : s.component;
      if (s.id !== wantId) E(`${w}: id must be "${wantId}" (component[.angle])`);
      if (c.angles ? !c.angles.includes(s.angle) : s.angle !== undefined) E(`${w}: angle "${s.angle}" not allowed (contract: ${JSON.stringify(c.angles)})`);
      for (const k of ["attach", "layer", "category", "family", "trait", "tier"]) if (s[k] !== c[k]) E(`${w}: ${k} ${JSON.stringify(s[k])} ≠ contract ${JSON.stringify(c[k])}`);
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
        if (v === "auto") { if (C.treatments[t].masksOnly) E(`${w}: mask ${t} must be an authored rect [x, y] ("auto" is meaningless for a ${C.treatments[t].kind} treatment)`); else masks[t] = "auto"; continue; }
        if (!isPt(v) || !claim([v[0], v[1], rw, rh], `${w} mask ${t}`)) { if (!isPt(v)) E(`${w}: mask ${t} must be "auto" or [x, y] (top-left of a ${rw}×${rh} mask rect)`); continue; }
        const bits = new Uint8Array(rw * rh); for (let y = 0; y < rh; y++) for (let x = 0; x < rw; x++) if (A(v[0] + x, v[1] + y)) bits[y * rw + x] = 1;
        masks[t] = Buffer.from(bits).toString("base64");
      }
      const one = { w: rw, h: rh, ax: s.anchor[0], ay: s.anchor[1], component: s.component, angle: s.angle || null, attach: s.attach, layer: s.layer, z: LAYERS[s.layer] * 100 + s.order,
        category: s.category, family: s.family, trait: s.trait, tier: s.tier, orientation: s.orientation, px: Buffer.from(px).toString("base64"), masks, points: { tip: pts.tip || null, margin: pts.margin || [] } };
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
    // coverage: everything the renderer can ask for (this plan's contract)
    const missing = [];
    for (const [cid, c] of Object.entries(COMP)) for (const ang of c.angles || [null]) { const base = ang ? `${cid}.${ang}` : cid;
      for (const side of c.orientation === "right" ? ["right", "left"] : [c.orientation]) if (!sprites[`${base}@${side}`]) missing.push(`${base}@${side}`); }
    if (missing.length) E(`missing sprites the renderer can ask for: ${missing.join(", ")}`);
    // (035B-5) a sprite BODY's crown point: points.tip = anchor + the plan's `top` for the architecture that names it (the rosette crown sits there)
    if (!plan.geometry) for (const [aid, Ar] of Object.entries(plan.Pl.architectures)) for (const ax of Ar.axes) if (ax.kind === "sprite") { const sp = sprites[`${ax.body}@up`];
      if (sp && !(sp.points.tip && sp.points.tip[0] - sp.ax === ax.top[0] && sp.points.tip[1] - sp.ay === ax.top[1])) E(`sprite "${ax.body}": points.tip must be the anchor + [${ax.top}] (the ${aid} crown point of body plan ${plan.ref})`); }
    // static no-clipping proof: every sprite inside the canvas at EVERY socket it can attach to (a left / right sprite only at sockets of its
    // side); leaf-point details (attach leafPoint) at every tip / margin point of EVERY leaf drawing at every leaf socket that drawing can take
    const sideOf = key => key.endsWith("@left") ? -1 : key.endsWith("@right") ? 1 : 0;
    const fits = (sp, x, y) => { const x0 = x - sp.ax, y0 = y - sp.ay; return x0 >= 0 && y0 >= 0 && x0 + sp.w <= C.canvas.w && y0 + sp.h <= C.canvas.h; };
    let placementsProven = 0;
    const pointSprites = Object.entries(sprites).filter(([, sp]) => sp.attach === "leafPoint"), LEAFY = new Set(["leafSocket", "radialLeaf"]);
    for (const [key, sp] of Object.entries(sprites)) {
      if (sp.attach === "leafPoint") continue;
      const side = sideOf(key);
      for (const so of sockets.filter(q => q.attach === sp.attach && (!side || q.side === side))) {
        placementsProven++;
        if (!fits(sp, so.x, so.y)) E(`clip: ${key} at ${so.layout}/${so.socket} (${so.x}, ${so.y}) leaves the ${C.canvas.w}×${C.canvas.h} canvas`);
        if (!LEAFY.has(sp.attach)) continue;
        const x0 = so.x - sp.ax, y0 = so.y - sp.ay;
        for (const pt of [sp.points.tip, ...sp.points.margin].filter(Boolean)) for (const [pk, ps] of pointSprites) { placementsProven++;
          if (!fits(ps, x0 + pt[0], y0 + pt[1])) E(`clip: ${pk} on ${key}'s point (${pt}) at ${so.layout}/${so.socket} leaves the ${C.canvas.w}×${C.canvas.h} canvas`); }
      }
    }
    const render = { stemOutline: "self", ...(M.render || {}) };
    if (!["self", "ink", "none"].includes(render.stemOutline)) E(`render.stemOutline "${render.stemOutline}" (self / ink / none)`);
    for (const k of Object.keys(render)) if (k !== "stemOutline") E(`render.${k}: unknown render option`);
    packs[pid] = { title: M.title, status: M.status, about: M.about || "", palette, environment: env, render, sprites: stable(sprites), ...(M.bodyPlan !== undefined ? { bodyPlan: M.bodyPlan } : {}) };
    coverage[pid] = { sprites: Object.keys(sprites).length, authored: (M.sprites || []).length, baked: Object.values(sprites).filter(s => s.baked).length, missing, placementsProven, bodyPlan: plan.ref };
  }
  // the grammar bundle: every plan's grammar at the path existing pages load (plant-components.js); Organic Hybrid's first
  const gOrder = Object.values(plans).map(q => q.grammarFile).sort((a, b) => (a.endsWith("/oh-stem.js") ? -1 : b.endsWith("/oh-stem.js") ? 1 : a < b ? -1 : 1));
  if (errors.length) return { errors };
  const listed = inputs.map(([p, b]) => ({ path: p, sha256: sha256(b) })).sort((a, b) => a.path < b.path ? -1 : 1);
  listed.push({ path: SELF, sha256: sha256(fs.readFileSync(path.join(root, SELF))) });
  const fingerprint = sha256(FORMAT + "\n" + listed.map(i => `${i.path} ${i.sha256}`).join("\n"));
  const contractRT = K => ({ canvas: K.canvas, layers: K.layers, treatments: K.treatments, components: K.components, families: K.families, visualCap: K.visualCap, angles: Object.keys(K.angles), proceduralLayers: K.proceduralLayers });
  const planRT = q => { const P = { ...q.Pl }; delete P.format; delete P.about; delete P.skeleton; delete P.lockedPacks;
    return { ...P, ref: q.ref, contract: q.Pl.id, ...(q.geometry ? { skeleton: "stem@2", stem2: q.geometry } : { skeleton: "axes" }), packs: q.packs.slice() }; };
  const runtime = stable({ format: FORMAT, fingerprint, materials: MAT, shades: SHADES, contract: contractRT(C), bodyPlan: B,
    bodyPlans: Object.fromEntries(Object.values(plans).map(q => [q.Pl.id, planRT(q)])), contracts: Object.fromEntries(Object.values(plans).map(q => [q.Pl.id, contractRT(q.C)])),
    packs, packOrder: packIds });
  const js = `// GENERATED by ${SELF} from art/plant/ — DO NOT EDIT. Rebuild: npm --prefix tools run build:plant-art (docs/PLANT_SPRITE_PIPELINE_v1.md).
// format ${FORMAT} · source fingerprint ${fingerprint}
// Sprite pixels: base64 bytes, one per pixel = material id × 4 + shade (0 = transparent); materials[id - 1] names the material.
(function (root) {
  "use strict";
  const ART = ${JSON.stringify(runtime)};
  root.BLOOM = Object.assign(root.BLOOM || {}, { plantArt: ART });
})(typeof window !== "undefined" ? window : globalThis);
`;
  const grammars = `// GENERATED by ${SELF} — DO NOT EDIT. The plant GRAMMAR BUNDLE (BLOOM-035B-5, docs/SPECIES_BODY_PLANS_v1.md §2.3): every body plan's
// grammar from ${GRAMMARS}/<plan>.js, concatenated unchanged, at the path every existing page and tool already loads
// (BLOOM.plantVisual.grammars[<plan>]; BLOOM.plantVisual.components = the Organic Hybrid "oh-stem" grammar, as before 035B).
// Edit the grammar files, then: npm --prefix tools run build:plant-art.  Sources: ${gOrder.map(f => f.split("/").pop()).join(" · ")}
` + gOrder.map(f => `\n// ---------------------------------------------------------------- ${f}\n` + read(f).toString("utf8")).join("");
  const sizeBudget = so => so.map(s => ({ layout: s.layout, socket: s.socket, attach: s.attach, at: [s.x, s.y], side: s.side, ...(s.angle ? { angle: s.angle } : {}), room: s.room }));
  const files = { [OUT_JS]: Buffer.from(js, "utf8"), [OUT_GRAMMARS]: Buffer.from(grammars, "utf8") };
  const manifest = stable({ format: FORMAT, fingerprint, inputs: listed, output: { path: OUT_JS, sha256: sha256(files[OUT_JS]), bytes: files[OUT_JS].length },
    grammars: { path: OUT_GRAMMARS, sha256: sha256(files[OUT_GRAMMARS]), bytes: files[OUT_GRAMMARS].length, sources: gOrder },
    canvas: C.canvas, packs: Object.fromEntries(packIds.map(p => [p, { title: packs[p].title, status: packs[p].status, ...coverage[p] }])), sockets: sizeBudget(plans["oh-stem"].sockets),
    bodyPlans: Object.fromEntries(Object.values(plans).map(q => [q.Pl.id, { ref: q.ref, contract: q.contractFile, grammar: q.grammarFile, skeleton: q.geometry ? "stem@2 (" + BODY + ")" : "axes",
      packs: q.packs, components: Object.keys(q.C.components).length, socketCount: q.sockets.length, sockets: sizeBudget(q.sockets) }])) });
  files[OUT_MANIFEST] = Buffer.from(JSON.stringify(manifest, null, 1) + "\n", "utf8");
  return { errors: [], files, manifest, runtime };
}

// ================================================================ art briefs (BLOOM-035B-5): docs/species-art-briefs/<SPECIES>_ART_BRIEF_v1.{md,json}
// Generated from the plan manifests, contracts, the build's socket tables and the plan grammars — the numbers cannot drift from the engine.
export const BRIEFS_DIR = "docs/species-art-briefs";
const BRIEF = {
  rosette: { file: "CINDER_ROSETTE_ART_BRIEF_v1", species: "cinder_rosette", name: "Cinder Rosette", role: "dry / heat specialist (concept B1)", proof: "proof-cinder-rosette", pack: "cinder-rosette",
    silhouette: "a low, wide star of thick, upward-curving leaves pressed to the ground; when it flowers, ONE tall, narrow spike far above the rosette — a strong \"low mass + one vertical line\" read, nothing like Organic Hybrid's leafy upright stem.",
    anatomy: "ground rosette (radial leaves around a short caudex), thick fleshy leaves with toothed margins and a pale waxy bloom, a shallow wide root fan; reproduction only on the spike (Early Maturity / Seed Output / Waterborne Seeds).",
    inspiration: "agave and aloe rosettes, Haworthia windows, Welwitschia's ground-hugging habit (inspiration only — never copied).",
    innate: "A dry specialist is ALREADY succulent at tier 0: `leaf.base` is a thick fleshy rosette leaf. Buying Drought deepens what it has (fatter leaves, translucent window tips, a deeper caudex tuber); buying Flood is drawn too (softer, longer, channelled leaves and breathing roots at the crown).",
    traits: { cold: "the rosette closes: open → cupped → closed (two-point wool fringe) → ball (three-point fringe); frost hairs on the leaves", heat: "more wax, a steeper leaf angle; Heat T3 swaps in each structure's `.heat` drawing (narrower, upright)", drought: "fatter leaves, a translucent window tip, a deeper caudex (storage tuber T2 / T3); T3 uses the architecture's six-leaf set", flood: "softer, longer, channelled leaves; adventitious breathing roots at the crown (2 / 3 / 4)", salt: "crystals in the leaf channels (tip) + a gland on margin point 1 + authored toothed notches", rad: "the pigment treatment (recolour through the pigment mask; the caudex and spike take it too)", seedOut: "the spike grows: T1 a capsule at its tip; T2 a large capsule + two small ones on spike branches + drifting winged seeds", earlyMat: "the spike grows and blooms (on its tip, or its flower branch when a capsule holds the tip)", waterSeeds: "the spike grows with two corky, buoyant capsules on low stalks" } },
  candle: { file: "WOOLLY_CANDLE_ART_BRIEF_v1", species: "woolly_candle", name: "Woolly Candle", role: "cold specialist (+ radiation, latent) (concept C1)", proof: "proof-woolly-candle", pack: "woolly-candle",
    silhouette: "a stout, upright woolly trunk wearing a skirt of dead leaves, topped by a tight rosette of silver-haired leaves; a tall candle-like flower column when it flowers — tall, vertical and soft-edged, the opposite of the dry rosette.",
    anatomy: "an authored TRUNK sprite (wool + marcescent skirt, one drawing per Cold architecture) + a radial CROWN rosette on the trunk top + a procedural inflorescence COLUMN for reproduction; a taproot.",
    inspiration: "Andean frailejón (Espeletia), East-African giant groundsels and lobelias (inspiration only — never copied).",
    innate: "A cold specialist is ALREADY insulated at tier 0: `body.trunk.0` already carries wool and a light skirt; its leaves are already silver-haired and it carries a dark-red pigment tint in its BASE palette (radiation is a latent strength). Buying Cold thickens the skirt and folds the crown; buying Heat is drawn too (lifted, waxed leaves).",
    traits: { cold: "a thicker skirt per architecture (`body.trunk.1–3`), wool bands on the trunk (T2: two, T3: three), the crown leaves fold up into a night-closed bud; frost hairs", heat: "lifted leaf angles + wax; Heat T3 swaps in each structure's `.heat` drawing (open, pale)", drought: "leaves narrow and silver; a storage root (T2 / T3)", flood: "breathing roots (2 / 3 / 4) and, at T3, stilt-like roots from the trunk base", salt: "crystals on the leaf tips + glands at the leaf bases (margin 1) + toothed notches", rad: "deeper pigment (leaf + trunk + column through the pigment masks)", seedOut: "the column grows: T1 a plumed head at its top; T2 a large head + two small ones + drifting plumed seeds", earlyMat: "the column grows and opens early (flower at its top, or its flower branch)", waterSeeds: "the column grows with two floating plumed achene bundles on low stalks" } },
  reed: { file: "REED_SPIRE_ART_BRIEF_v1", species: "reed_spire", name: "Reed Spire", role: "wet / flood specialist (+ salt) (concept D1)", proof: "proof-reed-spire", pack: "reed-spire",
    silhouette: "a clump of tall, thin, upright culms each ending in a starburst umbel — a vertical fountain, the tallest silhouette of the four, with a visible horizontal rhizome in the soil cutaway, standing in shallow water.",
    anatomy: "3–5 procedural CULMS from a rhizome (the engine draws culms, rhizome and rootlets); the authored parts are the leaves (two sheathing culm leaves per culm, the same drawing on both), the umbels (closed bract umbel = bud, flowering umbel, seed umbels), roots and surface details; ground is waterlogged.",
    inspiration: "papyrus and sedges (umbels), reeds (Phragmites) and rice (aerenchyma), mangrove salt glands (inspiration only — never copied).",
    innate: "A wet specialist ALREADY stands in water at tier 0 (the plan's waterlogged ground; three tall culms). Buying Flood adds culms and aerenchyma-banded sheaths; buying Drought is drawn too (three short culms, hardened sheaths, a storage node on the rhizome).",
    traits: { cold: "the culms bunch (open → dense → bunched → tight); frost hairs on the sheaths and frost collars on every culm node (T2 / T3)", heat: "lifted sheaths + wax; Heat T3 swaps in each structure's `.heat` drawing", drought: "three SHORT culms (s0–s2) instead of the tall ones, hardened sheaths, a storage node on the rhizome (T2 / T3)", flood: "more culms (T1–T2: four, T3: five), aerenchyma-banded sheaths, a deeper rhizome, breathing roots (2 / 3 / 4)", salt: "crystals on the sheath tips + glands (margin 1) + toothed notches", rad: "the pigment treatment (sheaths + culms)", seedOut: "umbels swell to seed heads: T1 the first culm; T2 a large head on the first, small heads on the next two, drifting seeds", earlyMat: "a flowering umbel on the first free culm (else the second culm's flower branch)", waterSeeds: "two floating seed bundles on low stalks (culms 1 and 2)" } } };
const ANCHOR = { radialLeaf: "the leaf base: the one pixel touching the rosette heart (drawn facing right; leftmost column)", leafSocket: "the sheath base: the pixel touching the culm's edge (drawn facing right)",
  leafPoint: "the pixel that sits ON the leaf's tip / margin point (usually bottom-centre)", body: "its BOTTOM-CENTRE pixel, on the soil row (68); points.tip = the plan's crown point for that architecture (exact, checked)",
  stemNode: "its centre pixel (on the trunk / culm / rosette-rim point)", stiltRoot: "its top-left pixel on the trunk's edge 8 rows above the soil (it must reach the soil)", primaryRoot: "its top-centre pixel (hangs from the root socket)",
  aerialRoot: "its BOTTOM pixel, buried one row into the soil (row 69); it rises upward", apex: "the bottom pixel of its stalk (sits on the apex)", flower: "the bottom pixel of its stalk", seedHead: "the bottom pixel of its stalk", pod: "its stalk's top pixel (the pod hangs below)", drift: "the seed pixel" };
export function artBriefs(root, built) {
  root = path.resolve(root);
  const g = {}, run = f => new Function("globalThis", "window", fs.readFileSync(path.join(root, f), "utf8"))(g, undefined);
  for (const f of ["content/config.js", "content/traits.js", "resources/plant-visual/plant-visual-model.js", OUT_GRAMMARS]) run(f);
  const PV = g.BLOOM.plantVisual, RULES = PV.model.rules(g.BLOOM_DATA), C0 = JSON.parse(fs.readFileSync(path.join(root, CONTRACT), "utf8")), M = built.manifest, out = {};
  for (const [plan, T] of Object.entries(BRIEF)) {
    const Pl = JSON.parse(fs.readFileSync(path.join(root, `${PLANS}/${plan}.json`), "utf8")), K = JSON.parse(fs.readFileSync(path.join(root, Pl.contract), "utf8")), so = M.bodyPlans[plan].sockets, gr = PV.grammars[plan];
    const sel = t => gr.select(PV.model.normalize({ traits: t }, RULES)), S0 = sel({});
    const room = (c) => { if (c.attach === "leafPoint") return null; const ss = so.filter(s => s.attach === c.attach), min = k => Math.min(...ss.map(s => s.room[k]));
      if (c.orientation === "right") { const back = Math.min(...ss.map(s => s.side < 0 ? s.room.right : s.room.left)), outw = Math.min(...ss.map(s => s.side < 0 ? s.room.left : s.room.right)); return { back, out: outw, up: min("up"), down: min("down") }; }
      return { left: min("left"), right: min("right"), up: min("up"), down: min("down") }; };
    const comps = Object.entries(K.components).map(([id, c]) => ({ id, family: c.family, category: c.category, attach: c.attach, layer: c.layer, orientation: c.orientation, mirror: c.mirror, angles: c.angles, trait: c.trait, tier: c.tier,
      ...(c.variantOf ? { variantOf: c.variantOf } : {}), maxSize: c.maxSize, points: c.points || null, masks: c.masks || null, anchor: ANCHOR[c.attach], drawings: (c.angles || [null]).length, tightestRoom: room(c) }));
    const trunkTops = []; for (const [aid, A] of Object.entries(Pl.architectures)) for (const ax of A.axes) if (ax.kind === "sprite") trunkTops.push({ architecture: aid, body: ax.body, top: ax.top });
    const AX = { cold: [1, 2, 3], heat: [1, 2, 3], drought: [1, 2, 3], flood: [1, 2, 3], salt: [1], rad: [1], seedOut: [1, 2], earlyMat: [1], waterSeeds: [1] }, adapt = [];
    const placeStr = S => S.place.map(p => `${p.component} @ ${[].concat(p.sockets).join(", ")}${p.count !== undefined ? ` (×${p.count})` : ""}`);
    for (const [id, tiers] of Object.entries(AX)) for (const n of tiers) { const S = sel({ [id]: n }), base = new Set(placeStr(S0));
      adapt.push({ trait: id, tier: n, architecture: S.architecture, axes: S.axes, leaf: S.leaf.component, leafAngle: S.leaf.angle, leafPoints: S.leafPoints.map(p => `${p.component} @ ${p.at}`), adds: placeStr(S).filter(x => !base.has(x)), treatments: S.treatments, components: S.components, drawn: T.traits[id] }); }
    const batches = [
      ["1 · base body", c => (c.family === "leaf" && c.trait === null) || c.id === "bud" || (c.family === "body" && c.tier === 0)],
      ["2 · cold + heat", c => c.family === "frost" || c.id === "leaf.base.heat" || (c.family === "body" && c.tier > 0)],
      ["3 · drought", c => /^leaf\.drought\./.test(c.id) || /^root\.storage\./.test(c.id)],
      ["4 · flood", c => /^leaf\.flood\./.test(c.id) || /^root\.(aerial|stilt)/.test(c.id)],
      ["5 · salt + radiation", c => c.family === "salt"],
      ["6 · reproduction + dispersal", c => ["flower", "seedHead", "pod"].includes(c.family)]].map(([name, f]) => { const list = comps.filter(f); return { batch: name, components: list.map(c => c.id), drawings: list.reduce((n, c) => n + c.drawings, 0) }; });
    batches.push({ batch: "5 · salt + radiation (masks)", components: comps.filter(c => c.masks).map(c => c.id), drawings: 0, note: "every leaf drawing: a `toothed` notch mask (authored rect, required to show Salt notches) and optionally an authored `pigment` / `wax` mask (default \"auto\")" });
    batches.push({ batch: "7 · metadata closure", components: [], drawings: 0, note: "atlas.json: bodyPlan, palette (18 ramps), environment (sky 2 · soil 3 · turf" + (Pl.ground.kind === "waterlogged" ? " · water 2" : "") + "), render.stemOutline, swatch; every anchor / point" });
    const J_ = { format: "bloom-species-art-brief@1", generatedBy: `${SELF} --briefs`, species: T.species, name: T.name, role: T.role, bodyPlan: `${Pl.id}@${Pl.version}`, plan: `${PLANS}/${plan}.json`, contract: Pl.contract, grammar: `${GRAMMARS}/${Pl.grammar}.js`,
      replacesPack: T.proof, newPack: T.pack, canvas: { w: Pl.canvas.w, h: Pl.canvas.h, soilY: C0.canvas.soilY }, ground: Pl.ground, crown: Pl.crown, angles: Pl.angles, partLabels: Pl.partLabels || {},
      architectures: Object.fromEntries(Object.entries(Pl.architectures).map(([aid, A]) => [aid, { about: A.about, axes: A.axes.map(a => ({ id: a.id, kind: a.kind, from: a.from || "the soil crown", at: a.at || [0, 0], part: a.part, ...(a.height ? { height: a.height } : {}), ...(a.body ? { body: a.body, top: a.top } : {}), ...(a.caudex ? { caudex: a.caudex } : {}), sockets: Object.fromEntries(Object.entries(a.sockets || {}).map(([k, v]) => [k, v.length])) })), leafSets: A.leafSets || {} }])),
      bodyTops: trunkTops, sockets: so, components: comps, drawings: comps.reduce((n, c) => n + c.drawings, 0), unmutated: { architecture: S0.architecture, axes: S0.axes, leaf: S0.leaf.component, place: placeStr(S0) }, adaptations: adapt, batches,
      materials: C0.materials, requiredMaterials: C0.requiredMaterials, treatments: C0.treatments, pixel: C0.pixel, layers: K.layers, clipProof: { proofPack: T.proof, placementsProven: M.packs[T.proof].placementsProven, sockets: so.length } };
    out[plan] = { json: J_, md: briefMd(J_, T, Pl, K) };
  }
  out.index = indexMd(out);
  return out;
}
const tbl = (head, rows) => `| ${head.join(" | ")} |\n|${head.map(() => "---").join("|")}|\n` + rows.map(r => `| ${r.join(" | ")} |`).join("\n") + "\n";
function briefMd(B, T, Pl, K) {
  const L = [], p = s => L.push(s);
  p(`# ${B.name} — production art brief v1 (body plan \`${B.bodyPlan}\`)\n`);
  p(`**Status: BRIEF for the next phase (species art production). No final art exists yet.** The pack in production today is \`${B.replacesPack}\` — **TEMPORARY PIPELINE PROOF — NOT FINAL ART** (flat engineering fills + a hazard checker); it only proves that every legal model renders. Your delivery replaces it as \`art/plant/packs/${B.newPack}/\` (or the id the PMO assigns), declaring \`"bodyPlan": "${B.bodyPlan}"\`.\n`);
  p(`GENERATED by \`node tools/build-plant-art.mjs --briefs\` from \`${B.plan}\`, \`${B.contract}\`, the build's socket table and the plan grammar \`${B.grammar}\` — every number below is the engine's own; the machine-readable twin is \`${T.file}.json\`. Do not redesign the plan: if a number does not work for the drawing, ask for an engine change (a plan / contract change is reviewed separately). Companion documents: \`docs/SPECIES_BODY_PLANS_v1.md\` (§${{ rosette: "3.1", candle: "3.2", reed: "3.3" }[Pl.id]} concept, §2 architecture), \`docs/PLANT_SPRITE_PIPELINE_v1.md\` § ARTIST_HANDOFF (the shared pixel contract every pack follows), \`art/plant/README.md\`.\n`);
  p(`## 1. The species\n\n- **Role:** ${B.role}. Species id \`${B.species}\` → \`{ bodyPlan: "${B.bodyPlan}", pack: "${B.newPack}" }\` once accepted.\n- **Silhouette:** ${T.silhouette}\n- **Anatomy:** ${T.anatomy}\n- **Inspiration:** ${T.inspiration}\n- **Innate strength in the base body:** ${T.innate}\n${Object.keys(B.partLabels).length ? `- **Room part labels** (the rooms keep the seven logical parts; this plan renames): ${Object.entries(B.partLabels).map(([k, v]) => `\`${k}\` → "${v}"`).join(", ")}.\n` : ""}`);
  p(`## 2. Canvas, soil, crown\n\n**${B.canvas.w} × ${B.canvas.h} logical pixels**, y down — the ONE canonical specimen canvas of every species (no per-species size). Soil row **${B.canvas.soilY}** (rows 0–${B.canvas.soilY - 1} sky, ${B.canvas.soilY}–${B.canvas.h - 1} soil cutaway); crown **(${B.crown[0]}, ${B.crown[1]})**; ground \`${B.ground.kind}\`${B.ground.kind === "waterlogged" ? " — the specimen box paints a 3-row standing-water band (rows 65–67) from your `environment.water` colours; culms rise through it" : ""}. Shown at whole-number nearest-neighbour scales only (rooms 2× / 3×, journal 3×). 1 logical pixel = 1 art pixel.\n`);
  p(`## 3. Plan axes per architecture (Cold selects the architecture)\n\nThe engine draws the procedural parts (stems / caudex / culms / column / spike, stalks to branch sockets, ${Pl.roots.kind === "rhizome" ? "the rhizome, its risers and rootlets" : "the taproot and lateral roots"}) from your \`stem\` / \`root\` colours; you author every sprite. Angles authored for this plan, lowest → highest: ${B.angles.map(a => `\`${a}\` (${K.angles[a]})`).join(" · ")}.\n`);
  p(tbl(["Architecture", "About", "Axes (kind · origin · size · sockets)"], Object.entries(B.architectures).map(([id, A]) => [`\`${id}\``, A.about, A.axes.map(a => `**${a.id}** ${a.kind} from ${a.from}${a.at[0] || a.at[1] ? ` +[${a.at}]` : ""}${a.height ? ` h ${a.height}` : ""}${a.body ? ` body \`${a.body}\` top [${a.top}]` : ""}${a.caudex ? ` caudex h ${a.caudex.height}` : ""} — ${Object.entries(a.sockets).map(([k, v]) => `${k} ${v}`).join(", ") || "no sockets"}`).join("<br>")])));
  if (B.bodyTops.length) p(`\n**Sprite body crown points (exact, checked by the build):** ${B.bodyTops.map(t => `\`${t.body}\` (${t.architecture}): points.tip = anchor + [${t.top}]`).join(" · ")}. The crown rosette is placed on that pixel, so the trunk's top must end exactly there.\n`);
  p(`\n## 4. Socket table (${B.sockets.length} sockets; x, y on the canvas; room = free pixels to each edge)\n`);
  p(tbl(["Arch.", "Socket", "Attach", "x, y", "Side", "Angle", "Room L · R · U · D"], B.sockets.map(s => [s.layout, `\`${s.socket}\``, s.attach, `${s.at[0]}, ${s.at[1]}`, s.side || "", s.angle || "", `${s.room.left} · ${s.room.right} · ${s.room.up} · ${s.room.down}`])));
  p(`\n## 5. Component inventory (${B.components.length} components, ${B.drawings} drawings + masks)\n\nEvery pack of this plan must provide every component × angle (drawn facing right where \`orientation: right\`; the build bakes the mirrored left twin unless you author one). Max extent = the tightest room from the anchor across every socket the component can take (right-facing: back = toward the plant, out = away). The build's static clip proof places your exact sprites at every socket (the proof pack: ${B.clipProof.placementsProven} placements).\n`);
  p(tbl(["Component", "Family · category", "Attach · layer", "Orient. · mirror", "Angles", "Trait / tier", "maxSize", "Points · masks", "Anchor pixel", "Max extent from the anchor"], B.components.map(c => [`\`${c.id}\``, `${c.family} · ${c.category}`, `${c.attach} · ${c.layer}`, `${c.orientation} · ${c.mirror}`, c.angles ? c.angles.join(" / ") : "—", c.trait ? `${c.trait} ${c.tier}` : "base", `${c.maxSize[0]}×${c.maxSize[1]}`, `${c.points ? c.points.join("+") : "—"} · ${c.masks ? c.masks.join(", ") : "—"}`, c.anchor,
    c.tightestRoom ? (c.tightestRoom.back !== undefined ? `back ${c.tightestRoom.back} · out ${c.tightestRoom.out} · up ${c.tightestRoom.up} · down ${c.tightestRoom.down}` : `${c.tightestRoom.left} · ${c.tightestRoom.right} · ${c.tightestRoom.up} · ${c.tightestRoom.down}`) : "rides on leaf points — proven per drawing"])));
  p(`\nLeaf drawings declare \`points.tip\` + exactly 3 \`points.margin\` (on opaque pixels): frost hairs and salt details ride on them (Salt: crystal on the tip + gland on margin 1; with Cold too, hairs move to margins 0 and 2). \`toothed\` is an authored notch mask (pixels CLEARED for Salt); \`pigment\` / \`wax\` default to "auto".\n`);
  p(`## 6. Adaptation variants — what each trait tier draws on this plan\n\n(from the plan grammar; "adds" = placements beyond the unmutated plant. Unmutated: architecture \`${B.unmutated.architecture}\`, axes ${B.unmutated.axes.join(", ")}, leaf \`${B.unmutated.leaf}\`, ${B.unmutated.place.join("; ")}.)\n`);
  p(tbl(["Trait · tier", "What is drawn", "Architecture · axes", "Leaf drawing", "Adds", "Treatments"], B.adaptations.map(a => [`${a.trait} T${a.tier}`, a.drawn, `${a.architecture} · ${a.axes.join(", ")}`, `\`${a.leaf}\` (shift ${a.leafAngle.shift}, cap ${a.leafAngle.cap})`, [...a.leafPoints.map(x => `${x} (leaf points)`), ...a.adds].join("<br>") || "—", a.treatments.map(t => `${t.id} ${t.level}`).join(", ") || "—"])));
  p(`\nGameplay Drought / Flood tiers above 3 draw EXACTLY the T3 drawings (no T4+ asset is ever requested). Strained colonies step every leaf one authored angle lower and get the shared stress tint; no extra drawing.\n`);
  p(`## 7. Spread / reproduction components\n\n${B.components.filter(c => c.category === "reproductive").map(c => `- \`${c.id}\` (${c.maxSize[0]}×${c.maxSize[1]}, ${c.attach}): ${c.family === "bud" ? "BASE — closed, never an open flower" : c.trait === "earlyMat" ? "Early Maturity" : c.trait === "seedOut" ? `Seed Output T${c.tier}` : "Waterborne Seeds"}`).join("\n")}\n`);
  p(`## 8. Palette, pixels, mirrors\n\n- **18 materials** in the shared contract order (\`art/plant/contract.json\`): ${B.materials.map(m => `\`${m.name}\`${m.treatmentOnly ? "*" : ""} (${m.shades})`).join(", ")} — * = treatment target only, NEVER drawn. Shade 0 → 3 runs dark → light (treatments map shade for shade; Heat T1 wax touches shades 2–3). Every colour unique across the pack, \`#rrggbb\` lower-case; required: ${B.requiredMaterials.join(", ")}.\n- **Environment** (specimen box, separate from the plant palette): sky [top, bottom], soil [stratum A, stratum B, pebble], turf${B.ground.kind === "waterlogged" ? ", **water [deep, light] (required: waterlogged ground)**" : ""}; optional \`render.stemOutline\` self / ink / none for the procedural parts.\n- **Alpha:** ${B.pixel.alpha}\n- **Palette:** ${B.pixel.palette}\n- **Strays / masks:** ${B.pixel.strays}; ${B.pixel.mask}\n- **Mirrors:** right-facing components are drawn facing right; the build bakes the left twin (anchor x and points mirrored) unless an explicit \`orientation: "left"\` drawing of the same id exists. No rotation ever happens at runtime; every angle is a drawing.\n`);
  p(`## 9. Delivery batches (independent per species — review this pack on its own)\n\n${B.batches.map(b => `- **Batch ${b.batch}** — ${b.drawings ? `${b.drawings} drawings: ` : ""}${b.components.map(c => `\`${c}\``).join(", ") || ""}${b.note ? ` ${b.note}` : ""}`).join("\n")}\n\nRecommended species order (packs are independent): Cinder Rosette → Woolly Candle → Reed Spire, or the PMO's priority.\n`);
  p(`## 10. Acceptance\n\n1. Each batch: PNG(s) + per-sprite metadata (rect, anchor, points, masks) + a preview, reviewed by the PMO.\n2. Final: \`PMO_FINAL_ACCEPTANCE.json\` (SHA-256 + bytes of every approved delivery ZIP), kept unchanged with the ZIPs under \`art/plant/intake/${B.newPack}/\`, as for Organic Hybrid; intake assembles \`art/plant/packs/${B.newPack}/atlas.{png,json}\` mechanically (a generalized \`tools/intake-plant-art.mjs --pack <id>\` is planned — design §2.6; not built in 035B-5).\n3. \`npm --prefix tools run build:plant-art\` passes: palette exact, binary alpha, no strays, metadata == \`${B.contract}\`, every component × angle × side present, the body crown points exact, and the static clip proof of every sprite at every socket inside ${B.canvas.w}×${B.canvas.h}; \`check:plant-art\` passes.\n4. \`tools/body-plan-check.js\` P1–P4 with the real pack: every legal model renders unclipped (≥ 1 px margin), every §2.4 axis visibly distinct, every specimen part anchor on the anatomy; then the species is switched from the proof pack to the real pack (one line in \`content/species.js\`) and the integration suites run with it.\n`);
  return L.join("\n");
}
function indexMd(out) {
  return `# Species art briefs (BLOOM-035B-5)\n\nProduction art briefs for the three accepted species body plans, GENERATED from the engine (\`node tools/build-plant-art.mjs --briefs\`; \`--briefs --check\` proves they match). Each Markdown brief has a machine-readable JSON twin with the same numbers. **No final art exists yet**: the packs in use are TEMPORARY PIPELINE PROOF — NOT FINAL ART. Commission and review each species as an independent pack.\n\n` +
    tbl(["Species", "Body plan", "Brief", "Drawings", "Sockets", "Replaces the proof pack"], ["rosette", "candle", "reed"].map(k => { const B = out[k].json; return [`${B.name} (${B.role})`, `\`${B.bodyPlan}\``, `[${BRIEF[k].file}.md](${BRIEF[k].file}.md) · [json](${BRIEF[k].file}.json)`, `${B.drawings} (+ masks)`, `${B.sockets.length}`, `\`${B.replacesPack}\``]; })) +
    `\nShared rules for every pack: \`docs/PLANT_SPRITE_PIPELINE_v1.md\` § ARTIST_HANDOFF (pixel format, palette, anchors, masks). Organic Hybrid's art is final and LOCKED (\`art/plant/intake/organic-hybrid/\`); it has no brief here.\n`;
}
export function briefFiles(root, built) { const b = artBriefs(root, built), files = {};
  for (const k of ["rosette", "candle", "reed"]) { files[`${BRIEFS_DIR}/${BRIEF[k].file}.md`] = Buffer.from(b[k].md, "utf8"); files[`${BRIEFS_DIR}/${BRIEF[k].file}.json`] = Buffer.from(JSON.stringify(b[k].json, null, 1) + "\n", "utf8"); }
  files[`${BRIEFS_DIR}/README.md`] = Buffer.from(b.index, "utf8"); return files; }

// ================================================================ CLI
if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  const argv = process.argv.slice(2), opt = k => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
  const root = path.resolve(opt("--root") || path.join(path.dirname(fileURLToPath(import.meta.url)), "..")), out = path.resolve(opt("--out") || root);
  const r = buildPlantArt(root);
  if (r.errors.length) { console.error(`build-plant-art: ${r.errors.length} error(s)\n  ` + r.errors.join("\n  ")); process.exit(1); }
  if (argv.includes("--briefs")) {   // (035B-5) docs/species-art-briefs/ from the plans, contracts, socket tables and grammars
    const files = briefFiles(root, r), check = argv.includes("--check");
    const bad = Object.entries(files).filter(([p, b]) => { const f = path.join(out, p); return !fs.existsSync(f) || !fs.readFileSync(f).equals(b); }).map(([p]) => p);
    if (check) { if (bad.length) { console.error(`briefs --check FAILED — regenerate: node tools/build-plant-art.mjs --briefs\n  ${bad.join("\n  ")}`); process.exit(1); } console.log(`briefs --check OK — ${Object.keys(files).length} brief files match the engine`); }
    else { for (const [p, b] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(out, p)), { recursive: true }); fs.writeFileSync(path.join(out, p), b); } console.log(`briefs — ${Object.keys(files).join(" · ")}`); }
  } else if (argv.includes("--check")) {
    const bad = Object.entries(r.files).filter(([p, b]) => { const f = path.join(out, p); return !fs.existsSync(f) || !fs.readFileSync(f).equals(b); }).map(([p]) => p);
    if (bad.length) { console.error(`check:plant-art FAILED — the committed generated files differ from a clean rebuild:\n  ${bad.join("\n  ")}\nRun: npm --prefix tools run build:plant-art`); process.exit(1); }
    console.log(`check:plant-art OK — ${Object.keys(r.files).length} generated files match a clean rebuild (fingerprint ${r.manifest.fingerprint.slice(0, 12)})`);
  } else {
    for (const [p, b] of Object.entries(r.files)) { fs.mkdirSync(path.dirname(path.join(out, p)), { recursive: true }); fs.writeFileSync(path.join(out, p), b); }
    console.log(`build:plant-art — ${Object.entries(r.manifest.packs).map(([p, v]) => `${p} ${v.sprites} sprites`).join(" · ")} → ${OUT_JS} (${r.manifest.output.bytes} B), fingerprint ${r.manifest.fingerprint.slice(0, 12)}`);
  }
}
