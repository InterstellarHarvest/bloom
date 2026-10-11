// BLOOM — PMO-accepted species SOURCE CANDIDATE → C0 delivery ZIPs + acceptance record + source provenance (BLOOM-035C2).
//
//   node tools/species-source-deliveries.mjs --pack <pack-id> --source <SOURCE_CANDIDATE.zip>            write art/plant/intake/<pack>/
//   node tools/species-source-deliveries.mjs --pack <pack-id> --source <SOURCE_CANDIDATE.zip> --check    regenerate in memory; exit 1 unless
//                                                                                                         the committed files match byte for byte
//   [--root <dir>]
//
// The accepted source candidates (Cinder Rosette v3.1, Reed Spire v3.1, Woolly Candle candle@2) arrived as the owner's local ZIPs under
// _art_intake/035c2/ (never committed). This tool is the bridge between such a candidate and the already-integrated C0 intake
// (tools/intake-plant-art.mjs, unchanged in kind): it never draws, never edits a pixel and never re-encodes a PNG — every sprite and mask
// enters its delivery ZIP as the exact bytes of the candidate's canonical file (verified against the candidate's own manifest SHA-256).
//
//   SOURCE_PROVENANCE.json     the candidate's identity: ZIP bytes + SHA-256, the complete relative inventory (every entry: bytes + SHA-256),
//                              and the AGGREGATE PACKAGE HASH = SHA-256 of the sorted "<relative path>\t<sha256>\n" records (paths relative to
//                              the candidate root) — the local equivalent of a source-ZIP provenance hash, independent of how it was zipped;
//                              origins; the files each delivery used; the PMO verdict.
//   approved-deliveries/*.zip  one C0 delivery per brief batch (bloom-plant-art-delivery@1): drawings in their brief batch, the toothed masks in
//                              the mask batch, the metadata closure (palette, environment, render + the candidate's manifests as attachments).
//                              STORED (no compression), fixed timestamps, sorted entries: byte-reproducible on any machine.
//   PMO_FINAL_ACCEPTANCE.json  bloom-plant-art-acceptance@1, status FINAL PMO-APPROVED ART INTAKE, { file, batch, bytes, sha256 } per delivery
//                              (the PMO authorized this record for exactly these accepted candidates, BLOOM-035C2).
// Then: node tools/intake-plant-art.mjs --pack <pack-id>.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { readZip } from "./intake-organic-hybrid-art.mjs";
import { lane, FORMAT, ACCEPTED_STATUS, INTAKE } from "./intake-plant-art.mjs";

const SELF = "tools/species-source-deliveries.mjs", PROJECT = "STRANGE BLOOM · UNKNOWN SOILS", BASE_MAIN = "e534750f62962b4cb23ee63886e1ef29bbae442a";
const sha256 = b => crypto.createHash("sha256").update(b).digest("hex"), J = JSON.stringify;

// ================================================================ the accepted candidates (PMO FINAL SOURCE VERDICTS, BLOOM-035C2)
// Each adapter reads the candidate's canonical manifest → { drawings [{ id, file, sha256, anchor, points, origin }], masks [{ sprite, file, sha256 }],
// palette { material: [hex…] }, environment, render, attachments [paths], derived [{ path, from, bytes }] }.
export const CANDIDATES = {
  "cinder-rosette": {
    identity: "CINDER_ROSETTE_PRODUCTION_SOURCE_CANDIDATE_v3_1", zip: "CINDER_ROSETTE_PRODUCTION_SOURCE_CANDIDATE_v3_1.zip", root: "",
    verdict: "FINAL SOURCE ACCEPTED — 60 canonical sprites, 42 toothed masks; origins RECOVERED_EXACT + CANONICAL_REFERENCE_TRANSCRIPTION; no Cinder pixel may be redesigned",
    expect: { drawings: 60, masks: 42 }, checksums: "SOURCE_AND_CANONICAL_SHA256SUMS.txt",
    read(get) {
      const M = JSON.parse(get("CINDER_ROSETTE_CANONICAL_MANIFEST.json")), P = JSON.parse(get("CINDER_ROSETTE_PRODUCTION_PALETTE_v1.json")), B3 = JSON.parse(get("original-manifests/BATCH3_candidate_manifest.json")).referencePalette;
      const drawings = Object.values(M.drawings).map(d => ({ id: d.id, file: d.canonicalFile, sha256: d.sha256, anchor: d.anchor, points: d.points, origin: d.origin }));
      const masks = Object.values(M.masks).map(m => ({ sprite: m.sourceDrawingId, file: m.file, sha256: m.sha256 }));
      // The candidate defines no specimen-box environment. ENGINEERING MAPPING (flagged for PMO confirmation): every colour comes from the accepted
      // Cinder art studio reference palette (original Batch 3 manifest referencePalette) — sky [sky, skyL], soil [soil, soilD, soilL], turf soil2.
      const environment = { sky: [B3.sky, B3.skyL], soil: [B3.soil, B3.soilD, B3.soilL], turf: B3.soil2 };
      return { drawings, masks, palette: P.materials, environment, render: { stemOutline: "ink" }, bodyPlan: M.bodyPlan,
        attachments: ["CINDER_ROSETTE_CANONICAL_MANIFEST.json", "CINDER_ROSETTE_SOURCE_MAP.json", "CINDER_ROSETTE_PRODUCTION_PALETTE_v1.json", "SOURCE_AND_CANONICAL_SHA256SUMS.txt", "V3_1_README.md", "README.md", "original-manifests/BATCH3_candidate_manifest.json"],
        mapping: { environment: "engineering mapping from the accepted Cinder reference palette (original-manifests/BATCH3_candidate_manifest.json referencePalette): sky [sky, skyL], soil [soil, soilD, soilL], turf soil2 — the candidate declares no environment; PMO confirmation requested", render: "stemOutline ink — the candidate declares none; the convention of every pack in the repository (Organic Hybrid final art included)" } };
    } },
  "reed-spire": {
    identity: "REED_SPIRE_PRODUCTION_SOURCE_CANDIDATE_v3_1", zip: "REED_SPIRE_PRODUCTION_SOURCE_CANDIDATE_v3_1.zip", root: "",
    verdict: "FINAL SOURCE ACCEPTED — 53 canonical sprites, 35 toothed masks; origins RECOVERED_EXACT + CANONICAL_REFERENCE_TRANSCRIPTION; no Reed pixel may be redesigned",
    expect: { drawings: 53, masks: 35 }, checksums: "SHA256SUMS.txt",
    read(get) {
      const M = JSON.parse(get("REED_SPIRE_CANONICAL_MANIFEST.json")), P = JSON.parse(get("REED_SPIRE_PRODUCTION_PALETTE_v1.json"));
      const drawings = M.sprite_items.map(d => ({ id: d.id, file: d.canonical_path, sha256: d.canonical_sha256, anchor: d.anchor, points: d.points, origin: d.method }));
      const masks = M.mask_items.map(m => ({ sprite: m.source_sprite_id, file: m.path, sha256: m.sha256 }));
      return { drawings, masks, palette: P.palette, environment: P.environment, render: { stemOutline: "ink" }, bodyPlan: M.bodyPlan,
        attachments: ["REED_SPIRE_CANONICAL_MANIFEST.json", "REED_SPIRE_SOURCE_MAP.json", "REED_SPIRE_PRODUCTION_PALETTE_v1.json", "REED_SPIRE_VISUAL_EQUIVALENCE_REPORT.json", "SHA256SUMS.txt", "README_V3_1.txt", "README_PMO_REVIEW.txt"],
        mapping: { environment: "the candidate's production palette environment (sky, soil, turf, water) verbatim", render: "stemOutline ink — the candidate declares none; the convention of every pack in the repository (Organic Hybrid final art included)" } };
    } },
  "woolly-candle": {
    identity: "WOOLLY_CANDLE_PRODUCTION_SOURCE_CANDIDATE_CANDLE2", zip: "WOOLLY_CANDLE_PRODUCTION_SOURCE_CANDIDATE_CANDLE2.zip", root: "WOOLLY_CANDLE_PRODUCTION_SOURCE_CANDIDATE_CANDLE2/",
    verdict: "FINAL SOURCE ACCEPTED — 58 canonical sprites, 35 toothed masks; production body plan candle@2; origin CANONICAL_REFERENCE_TRANSCRIPTION; accepted actual-size exceptions seedHead.large 24 × 22 (max 24 × 24), root.storage.3 18 × 27 (max 18 × 28); no Woolly pixel may be redesigned",
    expect: { drawings: 58, masks: 35 }, checksums: "SHA256SUMS.txt",
    read(get) {
      const M = JSON.parse(get("WOOLLY_CANDLE_CANDLE2_CANONICAL_MANIFEST.json")), pbuf = get("WOOLLY_CANDLE_PRODUCTION_PALETTE_v1.json"), P = JSON.parse(pbuf);
      const drawings = M.files.map(d => ({ id: d.id, file: `source-canonical/${d.id}.png`, sha256: d.sha256, anchor: d.anchor, points: d.points, origin: d.origin }));
      const masks = M.masks.map(m => ({ sprite: m.id.replace(/\.toothed$/, ""), file: m.path, sha256: m.sha256 }));
      // PMO METADATA CORRECTION: the locked palette file still says bodyPlan "candle@1"; the production derivative corrects ONLY that field (every RGB
      // value and every other byte unchanged); the supplied file travels unchanged beside it as provenance evidence.
      const txt = pbuf.toString("utf8"), fixed = txt.replace(/"bodyPlan":\s*"candle@1"/, m => m.replace("candle@1", "candle@2"));
      if (fixed === txt || (txt.match(/"bodyPlan":\s*"candle@1"/g) || []).length !== 1) throw new Error("woolly palette: expected exactly one bodyPlan \"candle@1\" field to correct");
      return { drawings, masks, palette: P.materials, environment: P.environment, render: P.render, bodyPlan: M.bodyPlan,
        attachments: ["WOOLLY_CANDLE_CANDLE2_CANONICAL_MANIFEST.json", "WOOLLY_CANDLE_CANDLE2_SOURCE_MAP.json", "WOOLLY_CANDLE_CANDLE2_VISUAL_EQUIVALENCE_REPORT.json", "WOOLLY_CANDLE_PRODUCTION_PALETTE_v1.json", "SHA256SUMS.txt", "README.md", "V4_TO_CANDLE2_CHANGE_REPORT.json"],
        derived: [{ path: "production/WOOLLY_CANDLE_PRODUCTION_PALETTE_v1.candle2.json", from: "WOOLLY_CANDLE_PRODUCTION_PALETTE_v1.json", buf: Buffer.from(fixed, "utf8"), change: "bodyPlan \"candle@1\" → \"candle@2\" (the only change; PMO metadata correction)" }],
        mapping: { environment: "the candidate's production palette environment (sky, soil, turf) verbatim", render: "the candidate's production palette render verbatim", palette: "RGB values verbatim from the locked palette; its bodyPlan metadata corrected candle@1 → candle@2 in the production derivative only" } };
    } },
};

// ================================================================ a deterministic STORED ZIP
const DOS_TIME = 0, DOS_DATE = (2026 - 1980) << 9 | 10 << 5 | 10;   // 2026-10-10 00:00 — fixed, never the clock
function zipStored(entries) {
  const locals = [], central = []; let off = 0;
  for (const [name, data] of entries) { const nb = Buffer.from(name, "utf8"), crc = zlib.crc32(data) >>> 0;
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6); h.writeUInt16LE(0, 8); h.writeUInt16LE(DOS_TIME, 10); h.writeUInt16LE(DOS_DATE, 12);
    h.writeUInt32LE(crc, 14); h.writeUInt32LE(data.length, 18); h.writeUInt32LE(data.length, 22); h.writeUInt16LE(nb.length, 26);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt16LE(0, 10); c.writeUInt16LE(DOS_TIME, 12); c.writeUInt16LE(DOS_DATE, 14);
    c.writeUInt32LE(crc, 16); c.writeUInt32LE(data.length, 20); c.writeUInt32LE(data.length, 24); c.writeUInt16LE(nb.length, 28); c.writeUInt32LE(off, 42);
    locals.push(h, nb, data); central.push(c, nb); off += 30 + nb.length + data.length; }
  const cd = Buffer.concat(central), e = Buffer.alloc(22); e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(entries.length, 8); e.writeUInt16LE(entries.length, 10); e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(off, 16);
  return Buffer.concat([...locals, cd, e]);
}
const slug = s => s.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();

// ================================================================ build
/** Pure: the candidate ZIP bytes → { errors } or { errors: [], files { relPath: Buffer }, provenance, acceptance }. */
export function fromSource(root, pack, zipBuf) {
  root = path.resolve(root);
  const K = CANDIDATES[pack]; if (!K) return { errors: [`no accepted source candidate for pack "${pack}" (${Object.keys(CANDIDATES).join(", ")})`] };
  const errors = [], E = m => errors.push(m);
  let Ln; try { Ln = lane(root, pack); } catch (e) { return { errors: [e.message] }; } if (Ln.errors.length) return { errors: Ln.errors };
  let zip; try { zip = readZip(zipBuf); } catch (e) { return { errors: [`${K.zip}: ${e.message}`] }; }
  // 1 · the complete inventory (relative to the candidate root), the aggregate package hash
  const all = [...zip.keys()].filter(n => !n.endsWith("/")).sort();
  if (all.some(n => !n.startsWith(K.root))) E(`${K.zip}: an entry outside the candidate root "${K.root}"`);
  if (all.some(n => n.split("/").some(s => s === "__MACOSX" || s === ".DS_Store" || s.startsWith("._")))) E(`${K.zip}: OS litter inside the candidate`);
  const inventory = all.map(n => { const b = zip.get(n); return { path: n.slice(K.root.length), bytes: b.length, sha256: sha256(b) }; });
  const aggregate = sha256(inventory.map(i => `${i.path}\t${i.sha256}\n`).join(""));
  const get = rel => { const b = zip.get(K.root + rel); if (!b) throw new Error(`${rel} is not in ${K.zip}`); return b; };
  // 2 · the candidate's own checksum file must agree with the bytes
  const sums = get(K.checksums).toString("utf8").split("\n").filter(Boolean).map(l => /^([0-9a-f]{64})\s+\*?(.+)$/.exec(l.trim())).filter(Boolean);
  const byPath = new Map(inventory.map(i => [i.path, i])); let sumsOk = 0;
  for (const [, h, p] of sums) { const i = byPath.get(p); if (!i) E(`${K.checksums}: lists ${p}, which is not in the candidate`); else if (i.sha256 !== h) E(`${K.checksums}: ${p} SHA-256 ${h} ≠ the bytes ${i.sha256}`); else sumsOk++; }
  let S; try { S = K.read(get); } catch (e) { return { errors: [`${K.identity}: ${e.message}`] }; }
  if (S.bodyPlan !== Ln.ref) E(`${K.identity}: manifest bodyPlan ${S.bodyPlan} ≠ lane ${pack} (${Ln.ref})`);
  if (S.drawings.length !== K.expect.drawings || S.masks.length !== K.expect.masks) E(`${K.identity}: ${S.drawings.length} drawings / ${S.masks.length} masks — the PMO accepted ${K.expect.drawings} / ${K.expect.masks}`);
  // 3 · every canonical file: present, its bytes = the manifest SHA-256, a drawing of the lane's contract
  const by = new Map(Ln.drawings.map(d => [d.id, d])), used = [];
  const take = (rel, want, what) => { const i = byPath.get(rel); if (!i) { E(`${what}: ${rel} missing from the candidate`); return null; } if (i.sha256 !== want) E(`${what}: ${rel} SHA-256 ${i.sha256} ≠ manifest ${want}`); used.push(rel); return get(rel); };
  const D = {}; for (const b of Object.values(Ln.batches)) D[b.n] = { n: b.n, name: b.name, sprites: [], masks: [], entries: [] };
  const seen = new Set();
  for (const d of S.drawings) { const dr = by.get(d.id); if (!dr) { E(`${d.id}: not a drawing of ${Ln.ref}`); continue; } if (seen.has(d.id)) E(`${d.id}: twice in the candidate`); seen.add(d.id);
    const buf = take(d.file, d.sha256, `drawing ${d.id}`); if (!buf) continue;
    const b = D[Ln.batchOf[dr.component]], f = `sprites/${d.id}.png`, pts = dr.c.points ? Object.fromEntries(dr.c.points.map(k => [k, d.points && d.points[k]])) : undefined;
    b.sprites.push({ id: d.id, file: f, anchor: d.anchor, ...(pts ? { points: pts } : {}) }); b.entries.push([f, buf]); }
  for (const d of Ln.drawings) if (!seen.has(d.id)) E(`${d.id}: missing from the candidate (no proof sprite may substitute)`);
  const mb = D[Ln.maskBatch.n];
  for (const m of S.masks) { if (!by.get(m.sprite)) { E(`mask of ${m.sprite}: not a drawing of ${Ln.ref}`); continue; } const buf = take(m.file, m.sha256, `toothed mask of ${m.sprite}`); if (!buf) continue;
    const f = `masks/toothed.${m.sprite}.png`; mb.masks.push({ sprite: m.sprite, treatment: "toothed", file: f }); mb.entries.push([f, buf]); }
  // 4 · the metadata closure
  const C = D[Ln.closure], attachments = [];
  for (const a of S.attachments) { const i = byPath.get(a); if (!i) { E(`attachment ${a} missing from the candidate`); continue; } attachments.push(`source/${a}`); C.entries.push([`source/${a}`, get(a)]); used.push(a); }
  for (const x of S.derived || []) { attachments.push(x.path); C.entries.push([x.path, x.buf]); }
  C.palette = S.palette; C.environment = S.environment; C.render = S.render; C.attachments = attachments;
  if (errors.length) return { errors };
  // 5 · the delivery ZIPs (contract order inside each batch; delivery.json first)
  const files = {}, deliveries = [];
  for (const b of Object.values(D).sort((a, c) => a.n - c.n)) {
    const order = new Map(Ln.drawings.map((d, i) => [d.id, i]));
    b.sprites.sort((a, c) => order.get(a.id) - order.get(c.id)); b.masks.sort((a, c) => order.get(a.sprite) - order.get(c.sprite));
    const M = { format: FORMAT.delivery, pack, bodyPlan: Ln.ref, batch: b.n, sprites: b.sprites, ...(b.masks.length ? { masks: b.masks } : {}),
      ...(b.n === Ln.closure ? { palette: b.palette, environment: b.environment, render: b.render, attachments: b.attachments } : {}),
      notes: `${K.identity} (aggregate package hash ${aggregate}) — batch ${b.n} · ${b.name}; generated by ${SELF}: canonical files copied byte for byte, never re-encoded.` };
    const entries = [["delivery.json", Buffer.from(J(M, null, 1) + "\n")], ...b.entries.sort((a, c) => a[0] < c[0] ? -1 : 1)];
    const name = `${pack}-batch${b.n}-${slug(b.name)}.zip`, buf = zipStored(entries);
    files[`${INTAKE}/${pack}/approved-deliveries/${name}`] = buf; deliveries.push({ file: name, batch: b.n, bytes: buf.length, sha256: sha256(buf), drawings: b.sprites.length, masks: b.masks.length, entries: entries.length });
  }
  const origins = {}; for (const d of S.drawings) origins[d.origin] = (origins[d.origin] || 0) + 1;
  const acceptance = { format: FORMAT.acceptance, project: PROJECT, pack, species: Ln.B.species, bodyPlan: Ln.ref, status: ACCEPTED_STATUS, production_main: BASE_MAIN,
    deliveries: deliveries.map(d => ({ file: d.file, batch: d.batch, bytes: d.bytes, sha256: d.sha256 })),
    integration_rule: `BLOOM-035C2: ingest only with node tools/intake-plant-art.mjs --pack ${pack}; the deliveries are the PMO-accepted source candidate ${K.identity}, converted mechanically by ${SELF} (source provenance: ${INTAKE}/${pack}/SOURCE_PROVENANCE.json).`,
    notes: [`PMO FINAL SOURCE VERDICT: ${K.verdict}.`, `Source candidate ${K.identity}: ZIP ${K.zip} (${zipBuf.length} B, SHA-256 ${sha256(zipBuf)}); aggregate package hash ${aggregate} over ${inventory.length} files.`,
      `Origins: ${Object.entries(origins).map(([k, v]) => `${k} ${v}`).join(", ")}.`, "Acceptance record created by the engineering agent under explicit PMO authorization for exactly this accepted candidate (BLOOM-035C2)."] };
  const provenance = { format: "bloom-species-source-provenance@1", milestone: "BLOOM-035C2", tool: SELF, pack, species: Ln.B.species, bodyPlan: Ln.ref, identity: K.identity, pmo: { status: "FINAL SOURCE ACCEPTED", verdict: K.verdict },
    sourceZip: { name: K.zip, bytes: zipBuf.length, sha256: sha256(zipBuf), entries: inventory.length, root: K.root || "." },
    aggregate: { algorithm: "sha256 over the sorted records \"<relative path>\\t<sha256 of the file>\\n\" (paths relative to the candidate root)", sha256: aggregate, files: inventory.length, bytes: inventory.reduce((n, i) => n + i.bytes, 0) },
    checksums: { file: K.checksums, lines: sums.length, verified: sumsOk }, origins, counts: { drawings: S.drawings.length, masks: S.masks.length },
    mapping: S.mapping, derived: (S.derived || []).map(x => ({ path: x.path, from: x.from, sha256: sha256(x.buf), change: x.change })),
    usedInDeliveries: [...new Set(used)].sort(), deliveries, inventory };
  files[`${INTAKE}/${pack}/PMO_FINAL_ACCEPTANCE.json`] = Buffer.from(J(acceptance, null, 1) + "\n");
  files[`${INTAKE}/${pack}/SOURCE_PROVENANCE.json`] = Buffer.from(J(provenance, null, 1) + "\n");
  return { errors: [], files, provenance, acceptance };
}

// ================================================================ CLI
if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  const argv = process.argv.slice(2), opt = k => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
  const root = path.resolve(opt("--root") || path.join(path.dirname(fileURLToPath(import.meta.url)), "..")), pack = opt("--pack"), src = opt("--source");
  if (!pack || !src) { console.error("usage: node tools/species-source-deliveries.mjs --pack <pack-id> --source <SOURCE_CANDIDATE.zip> [--check] [--root <dir>]"); process.exit(2); }
  const r = fromSource(root, pack, fs.readFileSync(src));
  if (r.errors.length) { console.error(`species-source-deliveries ${pack}: REFUSED (${r.errors.length})\n  ${r.errors.join("\n  ")}`); process.exit(1); }
  if (argv.includes("--check")) {
    const dir = path.join(root, INTAKE, pack, "approved-deliveries"), want = new Set(Object.keys(r.files).filter(p => p.includes("/approved-deliveries/")).map(p => path.basename(p)));
    const bad = Object.entries(r.files).filter(([p, b]) => { const f = path.join(root, p); return !fs.existsSync(f) || !fs.readFileSync(f).equals(b); }).map(([p]) => p);
    for (const f of fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => !f.startsWith(".")) : []) if (!want.has(f)) bad.push(`${INTAKE}/${pack}/approved-deliveries/${f} (unexpected)`);
    if (bad.length) { console.error(`species-source-deliveries --check FAILED (${pack}):\n  ${bad.join("\n  ")}`); process.exit(1); }
    console.log(`species-source-deliveries --check OK — ${pack}: ${Object.keys(r.files).length} files equal a clean regeneration from ${r.provenance.identity} (aggregate ${r.provenance.aggregate.sha256.slice(0, 16)}…)`);
  } else {
    const dir = path.join(root, INTAKE, pack, "approved-deliveries"); fs.rmSync(dir, { recursive: true, force: true });
    for (const [p, b] of Object.entries(r.files)) { fs.mkdirSync(path.dirname(path.join(root, p)), { recursive: true }); fs.writeFileSync(path.join(root, p), b); }
    console.log(`species-source-deliveries ${pack}: ${r.provenance.identity} → ${r.acceptance.deliveries.length} deliveries (${r.acceptance.deliveries.map(d => `b${d.batch} ${d.bytes} B`).join(", ")}); aggregate ${r.provenance.aggregate.sha256}`);
  }
}
