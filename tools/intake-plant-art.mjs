// BLOOM — generalized species art intake (BLOOM-035C0): a species lane's PMO-approved Art Studio deliveries → its production art pack
// art/plant/packs/<pack>/ (atlas.png + atlas.json), which tools/build-plant-art.mjs then validates and bakes like every other pack.
//
//   node tools/intake-plant-art.mjs --pack <pack-id>             assemble, prove it with the plant-art build (in a scratch copy), then write
//                                                                art/plant/packs/<pack>/atlas.{png,json} + art/plant/intake/<pack>/intake-map.json
//   node tools/intake-plant-art.mjs --pack <pack-id> --dry-run   the same proof; write nothing
//   node tools/intake-plant-art.mjs --pack <pack-id> --check     reassemble in memory; exit 1 unless the committed files match byte for byte
//   node tools/intake-plant-art.mjs --list                       every species lane and whether its deliveries are in
//   [--root <dir>]                                               another checkout (the QA suite runs on scratch trees)
//
// LANES (data, not code): one per generated art brief docs/species-art-briefs/*_ART_BRIEF_v1.json (format bloom-species-art-brief@1) —
// today cinder-rosette (rosette@1), woolly-candle (candle@1), reed-spire (reed@1). The brief names the pack id, the body plan and its
// contract; the CONTRACT is the authority for the drawings (every component × angle) and their metadata; the brief's batch table says which
// delivery batch each drawing belongs to (and is checked against the contract, so a stale brief is refused). Organic Hybrid is NOT a lane:
// its locked delivery stays with tools/intake-organic-hybrid-art.mjs (this tool only imports that tool's ZIP / PNG helpers).
//
// INPUT, per lane (canonical, committed unchanged): art/plant/intake/<pack>/
//   PMO_FINAL_ACCEPTANCE.json      format bloom-plant-art-acceptance@1: pack, species, bodyPlan, status "FINAL PMO-APPROVED ART INTAKE" and one
//                                  { file, batch, bytes, sha256 } per accepted delivery
//   approved-deliveries/*.zip      exactly the accepted deliveries; each carries ONE delivery.json (format bloom-plant-art-delivery@1: pack,
//                                  bodyPlan, batch, sprites [{ id, file, anchor, points?, size? }], masks [{ sprite, treatment, file }],
//                                 , palette, environment, render, attachments [paths never ingested, e.g. previews])
// Schemas and the full rule list: docs/PLANT_SPRITE_PIPELINE_v1.md § SPECIES_ART_INTAKE.
//
// REFUSES (exit 1, nothing written): a missing / unaccepted / unexpected delivery file, a SHA-256 or byte-count mismatch, a delivery or
// acceptance for another pack or body plan, a drawing outside the contract or outside its brief batch, a duplicate drawing or mask, an
// undeclared file in a ZIP, a missing drawing (incomplete component × angle coverage), a missing batch, partial alpha, an opaque pixel that
// is not an exact palette colour (or is a treatment-only colour), maxSize exceeded, an anchor outside the sprite / on a transparent pixel /
// off the contract's anchor edge, a missing or transparent tip / margin point, a mask of the wrong size or outside its sprite, a drawing
// that is not in the contract's orientation (mirror policy: the build bakes left twins), any unknown metadata key (e.g. a rotation — every angle is a drawing), an incomplete palette, environment colours
// that do not match the plan's ground, and any render option other than render.stemOutline. An image is never assembled merely because it
// exists on disk: only files a hash-verified delivery.json declares are read.
//
// MECHANICAL ONLY: approved pixels are copied 1:1 (transparent → (0, 0, 0, 0), opaque keeps its exact RGB); the tool places rects (1-px
// gutter), writes the palette swatch and translates delivery metadata into contract metadata. REPRODUCIBLE: no timestamp, no absolute
// path; the same deliveries always give the same bytes. Node built-ins only.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { decodePNG, buildPlantArt } from "./build-plant-art.mjs";
import { readZip, encodePNG, signature } from "./intake-organic-hybrid-art.mjs";

export const FORMAT = { brief: "bloom-species-art-brief@1", acceptance: "bloom-plant-art-acceptance@1", delivery: "bloom-plant-art-delivery@1", map: "bloom-plant-art-intake@1" };
export const ACCEPTED_STATUS = "FINAL PMO-APPROVED ART INTAKE";
export const BRIEFS = "docs/species-art-briefs", INTAKE = "art/plant/intake", PACKS = "art/plant/packs", LOCKED = { "organic-hybrid": "tools/intake-organic-hybrid-art.mjs" };
const SELF = "tools/intake-plant-art.mjs", CONTRACT = "art/plant/contract.json";
const sha256 = b => crypto.createHash("sha256").update(b).digest("hex");
const HEX = /^#[0-9a-f]{6}$/, isPt = p => Array.isArray(p) && p.length === 2 && p.every(Number.isInteger), J = JSON.stringify;
const ACCEPTANCE_KEYS = ["format", "project", "pack", "species", "bodyPlan", "status", "production_main", "deliveries", "integration_rule", "notes"];
const DELIVERY_KEYS = ["format", "pack", "bodyPlan", "batch", "sprites", "masks", "palette", "environment", "render", "attachments", "notes"];
const SPRITE_KEYS = ["id", "file", "anchor", "points", "size", "orientation", "notes"], MASK_KEYS = ["sprite", "treatment", "file", "notes"];
/** OS litter that is never a delivery, never a ZIP entry worth reading. */
const litter = name => name.split("/").some(s => s === "__MACOSX" || s === ".DS_Store") || path.basename(name).startsWith("._");
/** The contract's anchor conventions (docs/PLANT_SPRITE_PIPELINE_v1.md ARTIST_HANDOFF H6; each brief's "Anchor pixel" column), by attach kind:
 *  start = the column touching the plant (x 0: drawings face right) · top / bottom = the first / last row · centre = the middle
 *  column (± ½ px). Attach kinds not listed (leafPoint, stemNode, drift, rootCrown) only need an opaque anchor pixel. */
export const ANCHOR_EDGE = { radialLeaf: ["start"], leafSocket: ["start"], stiltRoot: ["start", "top"], primaryRoot: ["top", "centre"], pod: ["top"],
  aerialRoot: ["bottom"], apex: ["bottom"], flower: ["bottom"], seedHead: ["bottom"], body: ["bottom", "centre"] };

// ================================================================ lanes
const readJSON = (root, rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
/** Every species lane: one per generated art brief. */
export function lanes(root) {
  root = path.resolve(root);
  return fs.readdirSync(path.join(root, BRIEFS)).filter(f => /_ART_BRIEF_v\d+\.json$/.test(f)).sort().map(f => { const B = readJSON(root, `${BRIEFS}/${f}`);
    return { pack: B.newPack, species: B.species, name: B.name, bodyPlan: B.bodyPlan, brief: `${BRIEFS}/${f}`, proofPack: B.replacesPack }; })
    .filter(l => l.pack).sort((a, b) => a.pack < b.pack ? -1 : 1);
}
/** One lane, resolved and cross-checked: brief ↔ body plan ↔ plan contract ↔ shared contract. Throws on a pack that is not a lane. */
export function lane(root, pack) {
  root = path.resolve(root);
  if (LOCKED[pack]) throw new Error(`${pack} is the PMO-locked Organic Hybrid delivery — it is ingested only by ${LOCKED[pack]}`);
  const L = lanes(root).find(l => l.pack === pack);
  if (!L) throw new Error(`no species lane "${pack}" (lanes: ${lanes(root).map(l => l.pack).join(", ")}; a lane is a ${BRIEFS}/*_ART_BRIEF_v1.json)`);
  const errors = [], B = readJSON(root, L.brief), C0 = readJSON(root, CONTRACT);
  if (B.format !== FORMAT.brief) errors.push(`${L.brief}: format ${B.format}`);
  const Pl = readJSON(root, B.plan), K = readJSON(root, B.contract), ref = `${Pl.id}@${Pl.version}`;
  if (ref !== B.bodyPlan || Pl.contract !== B.contract) errors.push(`${L.brief}: bodyPlan ${B.bodyPlan} / contract ${B.contract} ≠ ${B.plan} (${ref}, ${Pl.contract})`);
  if (K.plan !== Pl.id || K.shared !== CONTRACT) errors.push(`${B.contract}: not the contract of plan ${Pl.id}`);
  // the brief's component table must be the contract's (a stale brief is refused: regenerate it with node tools/build-plant-art.mjs --briefs)
  const KEYS = ["family", "category", "attach", "layer", "orientation", "mirror", "angles", "trait", "tier", "maxSize", "points", "masks"];
  const want = Object.entries(K.components).map(([id, c]) => J([id, ...KEYS.map(k => c[k] === undefined ? null : c[k])])), got = (B.components || []).map(c => J([c.id, ...KEYS.map(k => c[k] === undefined ? null : c[k])]));
  if (J(want) !== J(got)) errors.push(`${L.brief}: component table ≠ ${B.contract} — regenerate the brief (node tools/build-plant-art.mjs --briefs)`);
  // drawings = every component × angle, in contract order
  const drawings = []; for (const [cid, c] of Object.entries(K.components)) for (const a of c.angles || [null]) drawings.push({ id: a ? `${cid}.${a}` : cid, component: cid, angle: a, c });
  // batches from the brief: "<n> · <name>" — drawing batches, the "(masks)" batch, the metadata closure
  const batches = {}, batchOf = {}, maskBatch = { n: null, components: new Set() }; let closure = null;
  for (const b of B.batches || []) { const m = /^(\d+) · (.+)$/.exec(b.batch || ""); if (!m) { errors.push(`${L.brief}: batch "${b.batch}" is not "<n> · <name>"`); continue; } const n = +m[1];
    if (/\(masks\)$/.test(m[2])) { maskBatch.n = n; b.components.forEach(c => maskBatch.components.add(c)); continue; }
    if (!b.components.length && !b.drawings) { if (closure !== null) errors.push(`${L.brief}: two metadata-closure batches`); closure = n; batches[n] = { n, name: m[2], closure: true, components: [], drawings: 0 }; continue; }
    if (batches[n]) errors.push(`${L.brief}: batch ${n} listed twice`);
    batches[n] = { n, name: m[2], closure: false, components: b.components.slice(), drawings: b.drawings };
    for (const c of b.components) { if (batchOf[c] !== undefined) errors.push(`${L.brief}: component ${c} in batches ${batchOf[c]} and ${n}`); batchOf[c] = n; if (!K.components[c]) errors.push(`${L.brief}: batch ${n} names ${c}, not a ${B.contract} component`); } }
  for (const cid of Object.keys(K.components)) if (batchOf[cid] === undefined) errors.push(`${L.brief}: component ${cid} is in no delivery batch`);
  for (const b of Object.values(batches)) if (!b.closure && b.drawings !== drawings.filter(d => batchOf[d.component] === b.n).length) errors.push(`${L.brief}: batch ${b.n} drawing count ${b.drawings} ≠ contract`);
  if (closure === null) errors.push(`${L.brief}: no metadata-closure batch`);
  for (const c of maskBatch.components) if (!(K.components[c] && K.components[c].masks)) errors.push(`${L.brief}: mask batch names ${c}, which takes no mask`);
  if (B.drawings !== drawings.length) errors.push(`${L.brief}: ${B.drawings} drawings ≠ the contract's ${drawings.length}`);
  return { ...L, B, Pl, K, C0, ref, drawings, batches, batchOf, maskBatch, closure, errors, dir: `${INTAKE}/${pack}`, packDir: `${PACKS}/${pack}` };
}

// ================================================================ assemble
/** Assemble a lane's pack from its accepted deliveries. Pure: reads root, returns { errors } or { errors: [], files, atlas, map }. */
export function assemble(root, pack) {
  root = path.resolve(root);
  let Ln; try { Ln = lane(root, pack); } catch (e) { return { errors: [e.message] }; }
  const errors = [...Ln.errors], E = m => errors.push(m), { K, C0, B } = Ln; if (errors.length) return { errors };
  const ACC = `${Ln.dir}/PMO_FINAL_ACCEPTANCE.json`, DEL = `${Ln.dir}/approved-deliveries`;

  // 1 · the PMO acceptance record — first, and alone, decides what may be read
  if (!fs.existsSync(path.join(root, ACC))) return { errors: [`${ACC}: missing — lane ${pack} has no PMO-accepted deliveries yet (nothing to ingest)`], awaiting: true };
  const accBuf = fs.readFileSync(path.join(root, ACC)); let acc; try { acc = JSON.parse(accBuf); } catch (e) { return { errors: [`${ACC}: ${e.message}`] }; }
  for (const k of Object.keys(acc)) if (!ACCEPTANCE_KEYS.includes(k)) E(`${ACC}: unknown key "${k}"`);
  if (acc.format !== FORMAT.acceptance) E(`${ACC}: format ${J(acc.format)} (${FORMAT.acceptance})`);
  if (acc.pack !== pack) E(`${ACC}: wrong pack id ${J(acc.pack)} — this lane is "${pack}"`);
  if (acc.species !== B.species) E(`${ACC}: species ${J(acc.species)} ≠ "${B.species}"`);
  if (acc.bodyPlan !== Ln.ref) E(`${ACC}: wrong bodyPlan ${J(acc.bodyPlan)} — lane ${pack} is ${Ln.ref}`);
  if (acc.status !== ACCEPTED_STATUS) E(`${ACC}: status ${J(acc.status)} — only "${ACCEPTED_STATUS}" is ingested`);
  const listed = Array.isArray(acc.deliveries) ? acc.deliveries : (E(`${ACC}: deliveries [] required`), []);
  if (Array.isArray(acc.deliveries) && !listed.length) E(`${ACC}: no deliveries`);
  const seenFile = new Set();
  for (const d of listed) { const w = `${ACC}: delivery ${J(d && d.file)}`;
    if (!d || typeof d !== "object" || J(Object.keys(d).sort()) !== J(["batch", "bytes", "file", "sha256"])) { E(`${w}: must be exactly { file, batch, bytes, sha256 }`); continue; }
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*\.zip$/.test(d.file)) E(`${w}: file must be a plain *.zip name`);
    if (seenFile.has(d.file)) E(`${w}: listed twice`); seenFile.add(d.file);
    if (!/^[0-9a-f]{64}$/.test(d.sha256)) E(`${w}: sha256 must be 64 lower-case hex`);
    if (!Number.isInteger(d.bytes) || d.bytes <= 0) E(`${w}: bytes must be a positive integer`);
    if (!Ln.batches[d.batch]) E(`${w}: batch ${J(d.batch)} is not a batch of ${Ln.brief} (${Object.keys(Ln.batches).join(", ")})`); }
  if (errors.length) return { errors };

  // 2 · the files on disk: exactly the accepted ones, each byte-for-byte the accepted bytes
  const onDisk = fs.existsSync(path.join(root, DEL)) ? fs.readdirSync(path.join(root, DEL)).filter(f => !f.startsWith(".")).sort() : [];
  for (const f of onDisk) if (!seenFile.has(f)) E(`${DEL}/${f}: unexpected delivery — not in PMO_FINAL_ACCEPTANCE.json (remove it, or have the PMO accept it)`);
  const hashes = [], zips = {};
  for (const d of listed) { const p = path.join(root, DEL, d.file);
    if (!fs.existsSync(p)) { E(`${DEL}/${d.file}: accepted delivery missing`); continue; }
    const buf = fs.readFileSync(p), got = sha256(buf);
    hashes.push({ file: d.file, batch: d.batch, bytes: buf.length, sha256: got, match: got === d.sha256 && buf.length === d.bytes });
    if (got !== d.sha256) E(`${d.file}: SHA-256 mismatch — accepted ${d.sha256}, on disk ${got}`);
    if (buf.length !== d.bytes) E(`${d.file}: byte count mismatch — accepted ${d.bytes} B, on disk ${buf.length} B`);
    if (got === d.sha256 && buf.length === d.bytes) zips[d.file] = buf; }
  if (errors.length) return { errors, hashes };

  // 3 · the deliveries: ONE delivery.json each; every other entry is a declared sprite, mask or attachment
  const deliveries = [];
  for (const d of listed) { const w = d.file; let zip;
    try { zip = readZip(zips[w]); } catch (e) { E(`${w}: ${e.message}`); continue; }
    const names = [...zip.keys()].filter(n => !litter(n)), manifests = names.filter(n => path.posix.basename(n) === "delivery.json");
    if (manifests.length !== 1) { E(`${w}: ${manifests.length} delivery.json files (exactly 1 required)`); continue; }
    const base = path.posix.dirname(manifests[0]) === "." ? "" : path.posix.dirname(manifests[0]) + "/"; let M;
    try { M = JSON.parse(zip.get(manifests[0])); } catch (e) { E(`${w}: delivery.json: ${e.message}`); continue; }
    for (const k of Object.keys(M)) if (!DELIVERY_KEYS.includes(k)) E(`${w}: delivery.json: unknown key "${k}"`);
    if (M.format !== FORMAT.delivery) E(`${w}: delivery.json format ${J(M.format)} (${FORMAT.delivery})`);
    if (M.pack !== pack) E(`${w}: wrong pack id ${J(M.pack)} in delivery.json — this lane is "${pack}"`);
    if (M.bodyPlan !== Ln.ref) E(`${w}: wrong bodyPlan ${J(M.bodyPlan)} in delivery.json — lane ${pack} is ${Ln.ref}`);
    if (M.batch !== d.batch) E(`${w}: delivery.json says batch ${J(M.batch)}, the PMO accepted it as batch ${d.batch}`);
    const used = new Map([[manifests[0], "delivery.json"]]), entry = (f, what) => { const n = base + f;
      if (typeof f !== "string" || !f || f.includes("..") || f.startsWith("/")) { E(`${w}: ${what}: file ${J(f)} must be a relative path in the ZIP`); return null; }
      if (!zip.has(n)) { E(`${w}: ${what}: ${f} is not in the ZIP`); return null; }
      if (used.has(n)) { E(`${w}: ${what}: ${f} is already used by ${used.get(n)}`); return null; }
      used.set(n, what); return { name: n, buf: zip.get(n) }; };
    const sprites = [], masks = [];
    for (const s of Array.isArray(M.sprites) ? M.sprites : M.sprites === undefined ? [] : (E(`${w}: sprites must be an array`), [])) { const id = s && s.id, sw = `${w}: sprite ${J(id)}`;
      for (const k of Object.keys(s || {})) if (!SPRITE_KEYS.includes(k)) E(`${sw}: unknown key "${k}"${/rot|flip|turn|angle/i.test(k) ? " (no runtime rotation / flip: every angle is its own drawing; mirrored twins are baked by the build)" : ""}`);
      const f = entry(s && s.file, `sprite ${id}`); if (f) sprites.push({ ...s, f }); }
    for (const m of Array.isArray(M.masks) ? M.masks : M.masks === undefined ? [] : (E(`${w}: masks must be an array`), [])) { const mw = `${w}: mask ${J(m && m.treatment)} of ${J(m && m.sprite)}`;
      for (const k of Object.keys(m || {})) if (!MASK_KEYS.includes(k)) E(`${mw}: unknown key "${k}"`);
      const f = entry(m && m.file, `mask ${m && m.treatment} of ${m && m.sprite}`); if (f) masks.push({ ...m, f }); }
    const att = M.attachments === undefined ? [] : Array.isArray(M.attachments) ? M.attachments : (E(`${w}: attachments must be an array of paths`), []);
    for (const a of att) entry(a, "attachment");
    for (const n of names) if (!used.has(n)) E(`${w}: undeclared file ${n.slice(base.length)} — every file in a delivery must be a declared sprite, mask or attachment`);
    deliveries.push({ file: w, batch: d.batch, M, sprites, masks, attachments: att.slice() }); }
  if (errors.length) return { errors, hashes };

  // 4 · palette (any delivery may declare ramps; all declarations agree; the result is all 18 ramps), environment + render (closure only)
  const MAT = C0.materials, palette = {}, from = {};
  for (const d of deliveries) for (const [m, ramp] of Object.entries(d.M.palette || {})) { const mat = MAT.find(x => x.name === m);
    if (!mat) { E(`${d.file}: palette: "${m}" is not a contract material`); continue; }
    if (!Array.isArray(ramp) || ramp.length !== mat.shades || ramp.some(h => typeof h !== "string" || !HEX.test(h))) { E(`${d.file}: palette.${m}: ${mat.shades} lower-case #rrggbb colour(s), dark → light`); continue; }
    if (palette[m] && J(palette[m]) !== J(ramp)) E(`${d.file}: palette.${m} ${J(ramp)} contradicts ${from[m]} ${J(palette[m])}`); else { palette[m] = ramp.slice(); from[m] = d.file; } }
  for (const m of MAT) if (!palette[m.name]) E(`palette: material "${m.name}" missing — the pack needs all ${MAT.length} ramps`);
  const colour = new Map(); for (const m of MAT) (palette[m.name] || []).forEach((h, s) => { if (colour.has(h)) E(`palette: ${h} is both ${colour.get(h).m} and ${m.name}`); colour.set(h, { m: m.name, s, treatmentOnly: !!m.treatmentOnly }); });
  const closures = deliveries.filter(d => d.batch === Ln.closure);
  for (const d of deliveries) if (d.batch !== Ln.closure) for (const k of ["environment", "render"]) if (d.M[k] !== undefined) E(`${d.file}: ${k} belongs in the metadata closure (batch ${Ln.closure})`);
  let environment = null, render = null;
  if (closures.length === 1) { const d = closures[0], env = d.M.environment, waterlogged = Ln.Pl.ground.kind === "waterlogged";
    const envKeys = ["sky", "soil", "turf", ...(waterlogged ? ["water"] : [])];
    if (!env || typeof env !== "object") E(`${d.file}: environment { ${envKeys.join(", ")} } required`);
    else { for (const k of Object.keys(env)) if (!envKeys.includes(k)) E(`${d.file}: environment.${k}: not part of ${Ln.ref}${k === "water" ? ` (ground "${Ln.Pl.ground.kind}" shows no water)` : ""}`);
      const list = (k, n) => { const v = env[k]; if (!(Array.isArray(v) && v.length === n && v.every(h => typeof h === "string" && HEX.test(h)))) { E(`${d.file}: environment.${k}: ${n} lower-case #rrggbb colours${k === "water" ? ` (required: ${Ln.ref} stands on waterlogged ground)` : ""}`); return null; } return v.slice(); };
      environment = { sky: list("sky", 2), soil: list("soil", 3), turf: typeof env.turf === "string" && HEX.test(env.turf) ? env.turf : (E(`${d.file}: environment.turf: one lower-case #rrggbb colour`), null), ...(waterlogged ? { water: list("water", 2) } : {}) };
      for (const h of Object.values(environment).flat()) if (h && colour.has(h)) E(`${d.file}: environment colour ${h} is also the plant colour ${colour.get(h).m}`); }
    const r = d.M.render;
    if (!r || typeof r !== "object" || J(Object.keys(r)) !== J(["stemOutline"]) || !["self", "ink", "none"].includes(r.stemOutline))
      E(`${d.file}: render must be exactly { stemOutline: "self" | "ink" | "none" } (the shared stress treatment and every other render behaviour are engine defaults in v1)`);
    else render = { stemOutline: r.stemOutline };
    if (d.sprites.length || d.masks.length) E(`${d.file}: the metadata closure carries no drawings`); }

  // 5 · sprites: the contract's drawings, each once, in its brief batch, pixel- and metadata-checked
  const byId = new Map(Ln.drawings.map(x => [x.id, x])), got = new Map();
  const imgOf = (buf, what) => { try { return decodePNG(buf); } catch (e) { E(`${what}: ${e.message}`); return null; } };
  for (const d of deliveries) for (const s of d.sprites) {
    const dr = byId.get(s.id), sw = `${d.file}: sprite "${s.id}"`;
    if (!dr) { E(`${sw}: not a drawing of ${Ln.ref} (${B.contract}) — unexpected drawing`); continue; }
    const c = dr.c;
    if (s.orientation !== undefined && s.orientation !== c.orientation) { E(`${sw}: orientation ${J(s.orientation)} — mirror policy: ${dr.component} is drawn facing ${c.orientation}${c.mirror ? "; the build bakes its mirrored left twin (an authored left drawing is not part of the v1 atlas)" : ", never mirrored"}`); continue; }
    if (Ln.batchOf[dr.component] !== d.batch) { E(`${sw}: belongs to batch ${Ln.batchOf[dr.component]} (${Ln.batches[Ln.batchOf[dr.component]].name}), not batch ${d.batch}`); continue; }
    const key = `${s.id}@${c.orientation}`;
    if (got.has(key)) { E(`${sw}: duplicate — ${key} already delivered by ${got.get(key).delivery}`); continue; }
    const img = imgOf(s.f.buf, sw); if (!img) continue;
    const it = { key, id: s.id, side: c.orientation, dr, c, img, delivery: d.file, entry: s.f.name, png: s.f.buf, anchor: s.anchor, points: s.points, masks: {} };
    got.set(key, it);
    const { w, h, rgba } = img, A = (x, y) => rgba[(y * w + x) * 4 + 3];
    if (s.size !== undefined && !(isPt(s.size) && s.size[0] === w && s.size[1] === h)) E(`${sw}: PNG is ${w}×${h}, delivery.json says ${J(s.size)}`);
    if (c.maxSize && (w > c.maxSize[0] || h > c.maxSize[1])) E(`${sw}: ${w}×${h} exceeds the contract's maxSize ${c.maxSize.join("×")}`);
    let opaque = 0, partial = null, off = null, tOnly = null;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4, a = rgba[i + 3]; if (!a) continue; if (a !== 255) { partial = partial || [x, y, a]; continue; } opaque++;
      const hx = "#" + [rgba[i], rgba[i + 1], rgba[i + 2]].map(v => v.toString(16).padStart(2, "0")).join(""), cm = colour.get(hx);
      if (!cm) off = off || [x, y, hx]; else if (cm.treatmentOnly) tOnly = tOnly || [x, y, cm.m]; }
    if (partial) E(`${sw}: pixel (${partial[0]}, ${partial[1]}) has partial alpha ${partial[2]} — alpha must be exactly 0 or 255`);
    if (off) E(`${sw}: pixel (${off[0]}, ${off[1]}) colour ${off[2]} is not a declared palette colour`);
    if (tOnly) E(`${sw}: pixel (${tOnly[0]}, ${tOnly[1]}) uses treatment-only material ${tOnly[2]} (treatments recolour; never draw with them)`);
    if (!opaque) E(`${sw}: empty drawing`);
    const solid = p => isPt(p) && p[0] >= 0 && p[1] >= 0 && p[0] < w && p[1] < h && A(p[0], p[1]) === 255;
    if (!isPt(s.anchor) || s.anchor[0] < 0 || s.anchor[1] < 0 || s.anchor[0] >= w || s.anchor[1] >= h) E(`${sw}: anchor ${J(s.anchor)} is outside the ${w}×${h} drawing`);
    else { if (!solid(s.anchor)) E(`${sw}: anchor ${J(s.anchor)} is on a transparent pixel`);
      for (const rule of ANCHOR_EDGE[c.attach] || []) { const [ax, ay] = s.anchor, ok = rule === "start" ? ax === 0 : rule === "top" ? ay === 0 : rule === "bottom" ? ay === h - 1 : Math.abs(ax - (w - 1) / 2) <= 0.5;
        if (!ok) E(`${sw}: anchor ${J(s.anchor)} breaks the ${c.attach} convention (${rule === "start" ? "the leftmost column" : rule === "centre" ? "the centre column" : `the ${rule} row`})`); } }
    const P = s.points;
    if (!c.points) { if (P !== undefined) E(`${sw}: ${dr.component} takes no points`); }
    else if (!P || typeof P !== "object") E(`${sw}: points { ${c.points.join(", ")} } required (surface details attach there)`);
    else { for (const k of Object.keys(P)) if (!c.points.includes(k)) E(`${sw}: points.${k} is not a contract point of ${dr.component}`);
      if (c.points.includes("tip") && !solid(P.tip)) E(`${sw}: points.tip ${J(P.tip)} must be an opaque pixel of the drawing`);
      if (c.points.includes("margin")) { if (!(Array.isArray(P.margin) && P.margin.length === 3)) E(`${sw}: points.margin must be exactly 3 points`); else P.margin.forEach((p, k) => { if (!solid(p)) E(`${sw}: points.margin[${k}] ${J(p)} must be an opaque pixel of the drawing`); }); } } }
  for (const d of deliveries) for (const m of d.masks) {
    const mw = `${d.file}: mask "${m.treatment}" of "${m.sprite}"`, dr = byId.get(m.sprite);
    if (d.batch !== Ln.maskBatch.n) { E(`${mw}: masks belong in batch ${Ln.maskBatch.n} (the brief's mask batch), not batch ${d.batch}`); continue; }
    if (!dr) { E(`${mw}: not a drawing of ${Ln.ref}`); continue; }
    if (!Ln.maskBatch.components.has(dr.component) || !(dr.c.masks || []).includes(m.treatment)) { E(`${mw}: ${dr.component} takes masks ${J(dr.c.masks || [])} only`); continue; }
    const it = got.get(`${m.sprite}@${dr.c.orientation}`); if (!it) { E(`${mw}: no such drawing delivered`); continue; }
    if (it.masks[m.treatment]) { E(`${mw}: duplicate — already delivered by ${it.masks[m.treatment].delivery}`); continue; }
    const img = imgOf(m.f.buf, mw); if (!img) continue;
    if (img.w !== it.img.w || img.h !== it.img.h) { E(`${mw}: ${img.w}×${img.h} — a mask must be exactly its drawing's ${it.img.w}×${it.img.h}`); continue; }
    let on = 0, partial = false, outside = null;
    for (let i = 0; i < img.w * img.h; i++) { const a = img.rgba[i * 4 + 3]; if (a && a !== 255) partial = true; if (a === 255) { on++; if (it.img.rgba[i * 4 + 3] !== 255) outside = outside || [i % img.w, (i / img.w) | 0]; } }
    if (partial) E(`${mw}: partial alpha — mask pixels are exactly 0 or 255`);
    if (!on) E(`${mw}: empty mask`);
    if (outside) E(`${mw}: pixel (${outside}) lies outside the drawing's opaque pixels`);
    it.masks[m.treatment] = { treatment: m.treatment, img, delivery: d.file, entry: m.f.name, png: m.f.buf }; }
  // coverage: every component × angle (drawn in the contract's orientation; the build bakes the mirrored left twins)
  const missing = Ln.drawings.filter(x => !got.has(`${x.id}@${x.c.orientation}`)).map(x => x.angle ? `${x.id} (${x.component} at angle ${x.angle})` : x.id);
  if (missing.length) E(`incomplete coverage — missing drawing(s): ${missing.join(", ")}`);
  for (const b of Object.values(Ln.batches)) if (!deliveries.some(d => d.batch === b.n)) E(`batch ${b.n} (${b.name}): no accepted delivery`);
  if (closures.length > 1) E(`batch ${Ln.closure} (${Ln.batches[Ln.closure].name}): ${closures.length} deliveries — exactly one metadata closure`);
  if (errors.length) return { errors, hashes };

  // 6 · layout (deterministic: contract order, each drawing then its masks): swatch strip, shelves, 1-px gutters
  const order = Ln.drawings.map(x => got.get(`${x.id}@${x.c.orientation}`));
  const ATLAS_W = 160, G = 1, sw = [0, 0, MAT.length * 2, Math.max(...MAT.map(m => m.shades)) * 2], places = [];
  let x = 0, y = sw[3] + G, shelfH = 0;
  const alloc = (w, h) => { if (x + w > ATLAS_W) { x = 0; y += shelfH + G; shelfH = 0; } const r = [x, y, w, h]; x += w + G; shelfH = Math.max(shelfH, h); return r; };
  for (const it of order) { it.rect = alloc(it.img.w, it.img.h); places.push(it);
    for (const t of it.c.masks || []) if (it.masks[t]) { it.masks[t].rect = alloc(it.img.w, it.img.h); places.push(it.masks[t]); } }
  const ATLAS_H = y + shelfH, rgba = new Uint8Array(ATLAS_W * ATLAS_H * 4);
  MAT.forEach((m, col) => palette[m.name].forEach((hx, s) => { for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) { const o = ((s * 2 + dy) * ATLAS_W + col * 2 + dx) * 4;
    rgba[o] = parseInt(hx.slice(1, 3), 16); rgba[o + 1] = parseInt(hx.slice(3, 5), 16); rgba[o + 2] = parseInt(hx.slice(5, 7), 16); rgba[o + 3] = 255; } }));
  for (const { rect: [rx, ry], img } of places) for (let yy = 0; yy < img.h; yy++) for (let xx = 0; xx < img.w; xx++) { const i = (yy * img.w + xx) * 4, o = ((ry + yy) * ATLAS_W + rx + xx) * 4;
    if (img.rgba[i + 3]) { rgba[o] = img.rgba[i]; rgba[o + 1] = img.rgba[i + 1]; rgba[o + 2] = img.rgba[i + 2]; rgba[o + 3] = 255; } }

  // 7 · atlas.json (contract metadata) + the provenance map
  const T = C0.treatments, sprites = order.map(it => { const c = it.c, s = { id: it.id, component: it.dr.component, ...(it.dr.angle ? { angle: it.dr.angle } : {}), rect: it.rect, anchor: it.anchor.slice(),
      attach: c.attach, layer: c.layer, order: 0, orientation: it.side, mirror: c.mirror, category: c.category, family: c.family, trait: c.trait, tier: c.tier };
    if (c.points) s.points = Object.fromEntries(c.points.map(k => [k, JSON.parse(J(it.points[k]))]));
    if (c.masks) { s.masks = {}; for (const t of c.masks) if (it.masks[t]) s.masks[t] = it.masks[t].rect.slice(0, 2); else if (!T[t].masksOnly) s.masks[t] = "auto"; }
    return s; });
  const NAME = B.name.toUpperCase(), status = `${NAME} — FINAL ART (PMO-approved; tools/intake-plant-art.mjs)`;
  const atlas = { format: "bloom-plant-atlas@1", pack, bodyPlan: Ln.ref, title: `${B.name} — final art`, status,
    about: `The PMO-approved ${B.name} art (body plan ${Ln.ref}; ${listed.length} accepted deliveries in ${Ln.dir}/), ingested mechanically by ${SELF}. Pixels are the approved pixels; only rects, the swatch and contract metadata were assembled. Provenance: ${Ln.dir}/intake-map.json.`,
    image: "atlas.png", swatch: sw, palette: Object.fromEntries(MAT.map(m => [m.name, palette[m.name]])), environment, render, sprites };
  const sigOf = img => signature(img.w, img.h, (xx, yy) => { const i = (yy * img.w + xx) * 4; return [img.rgba[i], img.rgba[i + 1], img.rgba[i + 2], img.rgba[i + 3]]; });
  const map = { format: FORMAT.map, milestone: "BLOOM-035C0 intake", tool: SELF, pack, species: B.species, bodyPlan: Ln.ref, brief: { path: Ln.brief, sha256: sha256(fs.readFileSync(path.join(root, Ln.brief))) },
    acceptance: { path: ACC, sha256: sha256(accBuf), status: acc.status, deliveries: hashes },
    atlas: { path: `${Ln.packDir}/atlas.png`, w: ATLAS_W, h: ATLAS_H, gutter: G, swatch: sw }, palette: { materials: MAT.length, colours: colour.size, declaredBy: from }, environment, render,
    maskPolicy: "authored masks as delivered; every other pigment / wax mask = the contract default \"auto\"; no authored toothed mask = no teeth (contract)",
    attachments: deliveries.flatMap(d => d.attachments.map(a => `${d.file}:${a}`)),
    sprites: order.map(it => ({ id: it.id, side: it.side, delivery: it.delivery, entry: it.entry, sourceSha256: sha256(it.png), size: [it.img.w, it.img.h], anchor: it.anchor, ...(it.points ? { points: it.points } : {}),
      rect: it.rect, ...sigOf(it.img), masks: Object.fromEntries(Object.entries(it.masks).map(([t, m]) => [t, { delivery: m.delivery, entry: m.entry, sourceSha256: sha256(m.png), rect: m.rect, ...sigOf(m.img) }])) })) };
  const files = { [`${Ln.packDir}/atlas.png`]: encodePNG(ATLAS_W, ATLAS_H, rgba), [`${Ln.packDir}/atlas.json`]: Buffer.from(J(atlas, null, 1) + "\n"), [`${Ln.dir}/intake-map.json`]: Buffer.from(J(map, null, 1) + "\n") };
  return { errors: [], files, atlas, map, lane: Ln };
}

// ================================================================ the production build, on a scratch copy with the assembled files laid over it
/** Run tools/build-plant-art.mjs's full validation (palette, alpha, strays, contract metadata, coverage × sides, body crown points, the static
 *  clip proof at every socket) over a scratch copy of root's plant-art inputs + `files`. Never touches root. */
export function proveWithBuild(root, files, pack) {
  root = path.resolve(root);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bloom-intake-")), cp = rel => fs.cpSync(path.join(root, rel), path.join(tmp, rel), { recursive: true, filter: s => !s.includes(`${path.sep}intake${path.sep}`) && !s.endsWith(`${path.sep}intake`) });
  try {
    for (const rel of ["art/plant", "resources/plant-visual", "tools/build-plant-art.mjs"]) cp(rel);
    for (const [p, b] of Object.entries(files)) if (p.startsWith(`${PACKS}/`)) { fs.mkdirSync(path.dirname(path.join(tmp, p)), { recursive: true }); fs.writeFileSync(path.join(tmp, p), b); }
    const r = buildPlantArt(tmp); if (r.errors.length) return { errors: r.errors.map(e => `build: ${e}`) };
    const cov = r.manifest.packs[pack]; if (!cov || cov.missing.length) return { errors: [`build: pack ${pack} coverage ${J(cov && cov.missing)}`] };
    return { errors: [], coverage: cov, runtime: r.runtime, files: r.files };
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

// ================================================================ CLI
if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  const argv = process.argv.slice(2), opt = k => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
  const root = path.resolve(opt("--root") || path.join(path.dirname(fileURLToPath(import.meta.url)), "..")), pack = opt("--pack");
  if (argv.includes("--list")) {
    for (const l of lanes(root)) { const r = assemble(root, l.pack);
      console.log(`${l.pack.padEnd(16)} ${l.bodyPlan.padEnd(11)} ${l.name.padEnd(15)} ${r.awaiting ? "awaiting deliveries (no PMO_FINAL_ACCEPTANCE.json)" : r.errors.length ? `REFUSED (${r.errors.length} error(s))` : `ready — ${r.atlas.sprites.length} drawings`}  · ${INTAKE}/${l.pack}/`); }
    process.exit(0);
  }
  if (!pack) { console.error("usage: node tools/intake-plant-art.mjs --pack <pack-id> [--dry-run | --check] [--root <dir>]   ·   --list"); process.exit(2); }
  const r = assemble(root, pack);
  if (r.errors.length) { console.error(`intake-plant-art ${pack}: REFUSED — ${r.errors.length} error(s), nothing written\n  ` + r.errors.join("\n  ")); process.exit(1); }
  if (argv.includes("--check")) {
    const bad = Object.entries(r.files).filter(([p, b]) => { const f = path.join(root, p); return !fs.existsSync(f) || !fs.readFileSync(f).equals(b); }).map(([p]) => p);
    if (bad.length) { console.error(`intake check FAILED — committed files differ from a clean intake:\n  ${bad.join("\n  ")}`); process.exit(1); }
    console.log(`intake check OK — ${pack}: ${Object.keys(r.files).length} files match a clean intake of ${r.map.acceptance.deliveries.length} PMO-verified deliveries`); process.exit(0);
  }
  const proof = proveWithBuild(root, r.files, pack);
  if (proof.errors.length) { console.error(`intake-plant-art ${pack}: REFUSED by the plant-art build — nothing written\n  ` + proof.errors.join("\n  ")); process.exit(1); }
  const summary = `${pack} (${r.lane.ref}) — ${r.map.acceptance.deliveries.length} deliveries match the PMO record · ${r.atlas.sprites.length} drawings + ${r.map.sprites.reduce((n, s) => n + Object.keys(s.masks).length, 0)} masks → ${r.map.atlas.w}×${r.map.atlas.h} atlas · build OK: ${proof.coverage.sprites} runtime sprites, ${proof.coverage.placementsProven} placements proven`;
  if (argv.includes("--dry-run")) { console.log(`intake DRY RUN OK — ${summary}; nothing written`); process.exit(0); }
  for (const [p, b] of Object.entries(r.files)) { fs.mkdirSync(path.dirname(path.join(root, p)), { recursive: true }); fs.writeFileSync(path.join(root, p), b); }
  console.log(`intake — ${summary}\nwrote ${Object.keys(r.files).join(" · ")}\nnext: npm --prefix tools run build:plant-art (regenerates the runtime); pointing content/species.js at "${pack}" is a separate, reviewed change`);
}
