// BLOOM — generalized species art intake check (BLOOM-035C0). tools/intake-plant-art.mjs, docs/PLANT_SPRITE_PIPELINE_v1.md § SPECIES_ART_INTAKE.
//
//   node tools/intake-plant-art.mjs is proven WITHOUT final art: every test builds CONTROLLED FIXTURE DELIVERIES from the committed
//   TEMPORARY PIPELINE PROOF packs' own pixels (each drawing cut out of proof-<species>/atlas.png into its own PNG, zipped per brief batch
//   with a delivery.json, hashed into a fixture PMO_FINAL_ACCEPTANCE.json) inside a SCRATCH copy of the plant-art tree — never this tree.
//
//   node tools/species-art-intake-check.js            (Node only, ~1 min)
//
// L · lanes: the three lanes come from the briefs (pack ↔ body plan ↔ contract ↔ batch table, drawing counts); Organic Hybrid and unknown
//     packs are refused; in THIS tree every lane without a PMO record refuses cleanly and writes nothing, and no species points at a pack
//     that was not ingested.
// A · assembly: each lane assembles from its fixture deliveries; the production build (in a scratch copy) passes with the new pack; the pack
//     is lossless (runtime sprites / palette / environment / render == the proof pack it was cut from); every legal model (sampled) renders
//     pixel-identical to the proof pack and passes the body-plan rules; output is deterministic and independent of ZIP order / compression;
//     the CLI writes, --check verifies, --dry-run writes nothing; the three lanes ingest independently and together.
// R · refusals (each: refused with a precise reason, nothing assembled): acceptance hash / byte mismatch, corrupted ZIP, missing accepted
//     delivery, unexpected delivery, missing batch, undeclared / foreign / wrong-batch drawing, duplicates, wrong pack id, wrong bodyPlan,
//     incomplete angle coverage, partial alpha, off-palette and treatment-only pixels, anchor / point / mask violations, maxSize, mirror policy,
//     rotation keys, environment ↔ ground, render options, status.
// O · Organic Hybrid untouched: its intake --check passes and its tool, delivery, pack, contract and body plan are byte-identical to the
//     035C0 base; the generated plant runtime is unchanged while no lane has been ingested.
"use strict";
const path = require("path"), fs = require("fs"), os = require("os"), cp = require("child_process"), vm = require("vm"), zlib = require("zlib"), crypto = require("crypto");
const ROOT = path.resolve(__dirname, "..");
const BASE = "237fa8015ae43ec36d6cd17cc147c4e9b50666ea";   // production main at the start of BLOOM-035C0 (BLOOM-035B integrated + closed)
const J = JSON.stringify, sha256 = b => crypto.createHash("sha256").update(b).digest("hex");
let fails = 0, passes = 0; const t0 = Date.now();
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail && !ok ? "  — " + detail : ""}`); ok ? passes++ : fails++; };
const git = a => cp.execSync(`git ${a}`, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 << 20 }).trim();
const node = (args, cwd = ROOT) => cp.spawnSync(process.execPath, args, { cwd, encoding: "utf8" });
const TMP = []; const scratch = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), "bloom-c0-")); TMP.push(d); return d; };

// ---------------------------------------------------------------- a minimal ZIP writer (stored / deflate) for fixture deliveries
function zip(entries, deflate = true) {
  const locals = [], central = []; let off = 0;
  for (const [name, data] of entries) { const nb = Buffer.from(name, "utf8"), body = deflate ? zlib.deflateRawSync(data, { level: 9 }) : data, crc = zlib.crc32(data) >>> 0;
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(deflate ? 8 : 0, 8); h.writeUInt16LE(33, 12); h.writeUInt32LE(crc, 14); h.writeUInt32LE(body.length, 18); h.writeUInt32LE(data.length, 22); h.writeUInt16LE(nb.length, 26);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(deflate ? 8 : 0, 10); c.writeUInt16LE(33, 14); c.writeUInt32LE(crc, 16); c.writeUInt32LE(body.length, 20); c.writeUInt32LE(data.length, 24); c.writeUInt16LE(nb.length, 28); c.writeUInt32LE(off, 42);
    locals.push(h, nb, body); central.push(c, nb); off += 30 + nb.length + body.length; }
  const cd = Buffer.concat(central), e = Buffer.alloc(22); e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(entries.length, 8); e.writeUInt16LE(entries.length, 10); e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(off, 16);
  return Buffer.concat([...locals, cd, e]);
}

(async () => {
  const I = await import(path.join(ROOT, "tools/intake-plant-art.mjs")), Bd = await import(path.join(ROOT, "tools/build-plant-art.mjs")), OHI = await import(path.join(ROOT, "tools/intake-organic-hybrid-art.mjs"));
  const LANES = { "cinder-rosette": { proof: "proof-cinder-rosette", plan: "rosette", species: "cinder_rosette" }, "woolly-candle": { proof: "proof-woolly-candle", plan: "candle", species: "woolly_candle" }, "reed-spire": { proof: "proof-reed-spire", plan: "reed", species: "reed_spire" } };

  /** A scratch plant-art tree: the inputs the intake + build read, copied from this tree (lane intake folders left empty). */
  function tree() { const d = scratch();
    for (const rel of ["art/plant", "resources/plant-visual", "docs/species-art-briefs", "tools/build-plant-art.mjs"]) fs.cpSync(path.join(ROOT, rel), path.join(d, rel), { recursive: true, filter: s => !/[\\/]intake[\\/](cinder-rosette|woolly-candle|reed-spire)([\\/]|$)/.test(s) && !s.endsWith(".DS_Store") });
    return d; }
  /** Fixture deliveries for one lane, cut from its proof pack: { deliveries: [{ file, batch, manifest, entries: Map(name → Buffer | {w,h,rgba}) }], acceptance } */
  function fixture(pack, root = ROOT) {
    const L = I.lane(root, pack), dir = `art/plant/packs/${LANES[pack].proof}`, A = JSON.parse(fs.readFileSync(path.join(root, dir, "atlas.json"))), img = Bd.decodePNG(fs.readFileSync(path.join(root, dir, "atlas.png")));
    const cut = ([x0, y0, w, h]) => { const rgba = new Uint8Array(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = ((y0 + y) * img.w + x0 + x) * 4, o = (y * w + x) * 4; if (img.rgba[i + 3]) { rgba[o] = img.rgba[i]; rgba[o + 1] = img.rgba[i + 1]; rgba[o + 2] = img.rgba[i + 2]; rgba[o + 3] = 255; } } return { w, h, rgba }; };
    const slug = s => s.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase(), D = {};
    for (const b of Object.values(L.batches)) D[b.n] = { file: `batch${b.n}-${slug(b.name)}.zip`, batch: b.n, manifest: { format: I.FORMAT.delivery, pack, bodyPlan: L.ref, batch: b.n, sprites: [] }, entries: new Map(), wrap: b.n === 3 ? `${pack}-batch3/` : "" };
    for (const e of A.sprites) { const c = L.K.components[e.component], d = D[L.batchOf[e.component]], im = cut(e.rect);
      d.entries.set(`sprites/${e.id}.png`, im);
      d.manifest.sprites.push({ id: e.id, file: `sprites/${e.id}.png`, anchor: e.anchor, ...(c.points ? { points: Object.fromEntries(c.points.map(k => [k, e.points[k]])) } : {}), size: [im.w, im.h] });
      if (Array.isArray(e.masks && e.masks.toothed)) { const m = D[L.maskBatch.n]; (m.manifest.masks = m.manifest.masks || []).push({ sprite: e.id, treatment: "toothed", file: `masks/toothed.${e.id}.png` }); m.entries.set(`masks/toothed.${e.id}.png`, cut([...e.masks.toothed, im.w, im.h])); } }
    D[1].manifest.palette = { leaf: A.palette.leaf };   // a partial ramp declaration early (merged; must agree with the closure)
    Object.assign(D[L.closure].manifest, { palette: A.palette, environment: A.environment, render: A.render, attachments: ["preview/contact-sheet.png"] });
    D[L.closure].entries.set("preview/contact-sheet.png", fs.readFileSync(path.join(root, dir, "atlas.png")));
    return { pack, L, deliveries: Object.values(D), acceptance: { format: I.FORMAT.acceptance, project: "STRANGE BLOOM · UNKNOWN SOILS", pack, species: LANES[pack].species, bodyPlan: L.ref, status: I.ACCEPTED_STATUS, deliveries: [] } };
  }
  const png = v => Buffer.isBuffer(v) ? v : OHI.encodePNG(v.w, v.h, v.rgba);
  /** Write a fixture into root's lane folder: ZIPs + the acceptance record (hashes of the written bytes, unless a test overrides them). */
  function write(root, fx, { deflate = true, reverse = false, acc = a => a, disk = () => {} } = {}) {
    const dir = path.join(root, "art/plant/intake", fx.pack), del = path.join(dir, "approved-deliveries"); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(del, { recursive: true });
    const a = JSON.parse(J(fx.acceptance));
    for (const d of fx.deliveries) { let ents = [[d.wrap + "delivery.json", Buffer.from(J(d.manifest, null, 1))], ...[...d.entries].map(([n, v]) => [d.wrap + n, png(v)])]; if (reverse) ents = ents.reverse();
      const buf = d.raw ? Buffer.from("this is not a ZIP archive") : zip(ents, deflate); fs.writeFileSync(path.join(del, d.file), buf); a.deliveries.push({ file: d.file, batch: d.batch, bytes: buf.length, sha256: sha256(buf) }); }
    fs.writeFileSync(path.join(dir, "PMO_FINAL_ACCEPTANCE.json"), J(acc(a), null, 2) + "\n"); disk(del, dir); return a; }
  const clone = fx => ({ ...fx, deliveries: fx.deliveries.map(d => ({ ...d, manifest: JSON.parse(J(d.manifest)), entries: new Map([...d.entries].map(([n, v]) => [n, Buffer.isBuffer(v) ? v : { w: v.w, h: v.h, rgba: Uint8Array.from(v.rgba) }])) })), acceptance: JSON.parse(J(fx.acceptance)) });
  const FX = Object.fromEntries(Object.keys(LANES).map(p => [p, fixture(p)]));

  // ================================================================ L · lanes
  console.log("# L · lanes");
  { const ls = I.lanes(ROOT), rows = ls.map(l => { const L = I.lane(ROOT, l.pack); return { pack: l.pack, plan: L.ref, drawings: L.drawings.length, brief: L.B.drawings, batches: Object.keys(L.batches).join(""), mask: L.maskBatch.n, closure: L.closure, errors: L.errors.length }; });
    const want = { "cinder-rosette": ["rosette@1", 60], "reed-spire": ["reed@1", 53], "woolly-candle": ["candle@1", 58] };
    let refusedOH = "", refusedX = ""; try { I.lane(ROOT, "organic-hybrid"); } catch (e) { refusedOH = e.message; } try { I.lane(ROOT, "proof-cinder-rosette"); } catch (e) { refusedX = e.message; }
    check(J(rows.map(r => r.pack)) === J(Object.keys(want)) && rows.every(r => r.plan === want[r.pack][0] && r.drawings === want[r.pack][1] && r.brief === r.drawings && r.batches === "1234567" && r.mask === 5 && r.closure === 7 && !r.errors)
      && /intake-organic-hybrid-art\.mjs/.test(refusedOH) && /no species lane/.test(refusedX),
      `L1 · lanes are data: one per art brief — ${rows.map(r => `${r.pack} → ${r.plan}, ${r.drawings} drawings (brief ${r.brief}), batches 1–6 + masks in ${r.mask} + closure ${r.closure}`).join(" · ")}; every contract component × angle in exactly one brief batch; organic-hybrid refused (locked: its own intake tool); a non-lane pack refused`, J({ rows, refusedOH, refusedX })); }
  { const stale = tree(), K = JSON.parse(fs.readFileSync(path.join(stale, "art/plant/contracts/rosette.json"))); K.components["leaf.base"].maxSize = [21, 18]; fs.writeFileSync(path.join(stale, "art/plant/contracts/rosette.json"), J(K));
    const r = I.assemble(stale, "cinder-rosette");
    check(r.errors.some(e => /component table ≠ .*regenerate the brief/.test(e)), "L2 · a brief that no longer matches its plan contract is refused before any delivery is read (regenerate with build-plant-art --briefs)", J(r.errors.slice(0, 3))); }
  { const rows = {}, bad = [];
    for (const l of I.lanes(ROOT)) { const r = I.assemble(ROOT, l.pack), accepted = fs.existsSync(path.join(ROOT, `art/plant/intake/${l.pack}/PMO_FINAL_ACCEPTANCE.json`)), packDir = fs.existsSync(path.join(ROOT, `art/plant/packs/${l.pack}`));
      const readme = fs.existsSync(path.join(ROOT, `art/plant/intake/${l.pack}/README.txt`)) && fs.readFileSync(path.join(ROOT, `art/plant/intake/${l.pack}/README.txt`), "utf8");
      rows[l.pack] = { accepted, packDir, awaiting: !!r.awaiting };
      if (!readme || !readme.includes(`node tools/intake-plant-art.mjs --pack ${l.pack}`)) bad.push(`${l.pack}: intake README`);
      if (!accepted) { if (!r.awaiting || packDir) bad.push(`${l.pack}: not awaiting / pack folder without a PMO record`);
        const cli = node(["tools/intake-plant-art.mjs", "--pack", l.pack]); if (cli.status !== 1 || !/REFUSED.*nothing written/.test(cli.stderr)) bad.push(`${l.pack}: CLI ${cli.status}`); }
      else { const cli = node(["tools/intake-plant-art.mjs", "--pack", l.pack, "--check"]); if (cli.status !== 0) bad.push(`${l.pack}: --check ${cli.stderr.slice(0, 200)}`); } }
    const g = {}; new Function("globalThis", "window", fs.readFileSync(path.join(ROOT, "content/species.js"), "utf8"))(g, undefined);
    const specs = Object.values((g.BLOOM_DATA || g.BLOOM || {}).species || {}), packs = specs.map(s => s.art && s.art.pack).filter(Boolean);
    for (const p of packs) if (I.lanes(ROOT).some(l => l.pack === p) && !rows[p].accepted) bad.push(`species points at un-ingested ${p}`);
    if (packs.length !== 4) bad.push(`content/species.js: ${packs.length} species art refs`);
    check(!bad.length, `L3 · this tree: every lane has its intake folder + README; a lane with no PMO_FINAL_ACCEPTANCE.json refuses cleanly ("awaiting", CLI exit 1, nothing written) and has no pack folder; an ingested lane passes --check; no species points at a lane pack that was not ingested — ${Object.entries(rows).map(([p, r]) => `${p}: ${r.accepted ? "ingested" : "awaiting deliveries"}`).join(" · ")}; species art refs ${J(packs)}`, J(bad)); }

  // ================================================================ A · assembly from fixture deliveries
  console.log("# A · assembly (fixture deliveries cut from the proof packs)");
  const genomes = () => { const out = [], W = [{}, { drought: 1 }, { drought: 2 }, { drought: 3 }, { flood: 1 }, { flood: 2 }, { flood: 3 }];
    for (let c = 0; c <= 3; c++) for (let h = 0; h + c <= 3; h++) for (const w of W) for (const salt of [0, 1]) for (const rad of [0, 1]) for (const seedOut of [0, 1, 2]) for (const earlyMat of [0, 1]) for (const waterSeeds of [0, 1])
      out.push(Object.assign({}, c ? { cold: c } : {}, h ? { heat: h } : {}, w, salt ? { salt } : {}, rad ? { rad } : {}, seedOut ? { seedOut } : {}, earlyMat ? { earlyMat } : {}, waterSeeds ? { waterSeeds } : {})); return out; };
  const MODELS = []; for (const t of genomes()) for (const c of ["thriving", "strained"]) MODELS.push({ traits: t, condition: c });
  const all = tree(), built = {};
  { const rows = {}, bad = [];
    for (const pack of Object.keys(LANES)) { const root = tree(); write(root, FX[pack], { disk: del => fs.writeFileSync(path.join(del, ".DS_Store"), "Finder") });
      const r = I.assemble(root, pack); if (r.errors.length) { bad.push(`${pack}: ${r.errors.slice(0, 3).join(" | ")}`); continue; }
      const pr = I.proveWithBuild(root, r.files, pack); if (pr.errors.length) { bad.push(`${pack}: ${pr.errors.slice(0, 3).join(" | ")}`); continue; }
      const N = pr.runtime.packs[pack], P = pr.runtime.packs[LANES[pack].proof];
      const lossless = J(N.sprites) === J(P.sprites) && J(N.palette) === J(P.palette) && J(N.environment) === J(P.environment) && J(N.render) === J(P.render) && N.bodyPlan === P.bodyPlan;
      if (!lossless) bad.push(`${pack}: runtime ≠ proof`);
      if (!/— FINAL ART \(PMO-approved; tools\/intake-plant-art\.mjs\)$/.test(r.atlas.status) || r.atlas.bodyPlan !== `${LANES[pack].plan}@1`) bad.push(`${pack}: status / bodyPlan`);
      const map = r.map; if (map.sprites.length !== r.atlas.sprites.length || map.acceptance.deliveries.some(d => !d.match) || map.attachments.length !== 1) bad.push(`${pack}: provenance map`);
      rows[pack] = { drawings: r.atlas.sprites.length, masks: map.sprites.reduce((n, s) => n + Object.keys(s.masks).length, 0), atlas: `${map.atlas.w}×${map.atlas.h}`, runtime: pr.coverage.sprites, placements: pr.coverage.placementsProven, lossless };
      built[pack] = { root, r, pr }; write(all, FX[pack]); }
    check(!bad.length, `A1 · each lane assembles from its 7 accepted fixture deliveries (a Finder .DS_Store beside them is ignored) and the production plant-art build passes with the new pack (palette, binary alpha, strays, contract metadata, every component × angle × side, body crown points, static clip proof); the pack is LOSSLESS — its runtime sprites, palette, environment and render equal the proof pack it was cut from; status "<SPECIES> — FINAL ART (PMO-approved; tools/intake-plant-art.mjs)", bodyPlan declared — ${Object.entries(rows).map(([p, r]) => `${p}: ${r.drawings} drawings + ${r.masks} masks → ${r.atlas}, ${r.runtime} runtime sprites, ${r.placements} placements proven`).join(" · ")}`, J(bad)); }
  { const bad = [], rows = {};
    for (const [pack, { pr }] of Object.entries(built)) { const g = { Buffer, console }; vm.createContext(g);
      for (const f of ["content/config.js", "content/traits.js"]) vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), g);
      vm.runInContext(pr.files["resources/plant-visual/generated/plant-atlas.js"].toString("utf8"), g);
      for (const f of ["resources/plant-visual/plant-visual-model.js"]) vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), g);
      vm.runInContext(pr.files["resources/plant-visual/plant-components.js"].toString("utf8"), g);
      for (const f of ["resources/plant-visual/plant-compositor.js", "resources/plant-visual/plant-fx.js"]) vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), g);
      const PV = g.BLOOM.plantVisual, PC = g.BLOOM.plantCompositor, ART = g.BLOOM.plantArt, RULES = PV.model.rules(g.BLOOM_DATA), gr = PV.grammars[LANES[pack].plan], pal = ART.packs[pack].palette;
      let n = 0, diff = 0, err = 0, minMargin = Infinity;
      for (let k = 0; k < MODELS.length; k += 5) { const S = gr.select(PV.model.normalize(MODELS[k], RULES)), F = PC.render(S, pack), Fp = PC.render(S, LANES[pack].proof); n++;
        if (Buffer.compare(Buffer.from(F.rgba), Buffer.from(Fp.rgba)) !== 0) diff++;
        const margin = Math.min(F.bbox.x0, F.bbox.y0, F.W - 1 - F.bbox.x1, F.H - 1 - F.bbox.y1); minMargin = Math.min(minMargin, margin);
        let e = F.clip || margin < 1 || F.unrendered.length; for (let i = 0; i < F.plant.m.length && !e; i++) { if (F.rgba[i * 4 + 3] !== 255) e = true; const v = F.plant.m[i]; if (v && !(pal[ART.materials[(v >> 2) - 1]] || [])[v & 3]) e = true; }
        if (e) err++; }
      rows[pack] = { models: n, diff, err, minMargin }; if (diff || err || n < 1300) bad.push(`${pack}: ${J(rows[pack])}`); }
    check(!bad.length, `A2 · legal models with the assembled packs (every 5th of the 6720 legal genome × condition models per plan, rendered by the production compositor from the build's own runtime): pixel-identical to the proof pack, nothing clipped (≥ 1 px margin), every treatment rendered, opaque output, every plant material in the pack palette — ${Object.entries(rows).map(([p, r]) => `${p}: ${r.models} models, min margin ${r.minMargin} px`).join(" · ")}`, J(bad)); }
  { const bad = [], pack = "reed-spire", a = built[pack].r;
    const again = I.assemble(built[pack].root, pack); if (!Object.keys(a.files).every(p => again.files[p].equals(a.files[p]))) bad.push("re-assembly differs");
    const other = tree(); write(other, FX[pack], { deflate: false, reverse: true }); const b = I.assemble(other, pack);
    if (b.errors.length) bad.push(b.errors[0]); else { for (const p of Object.keys(a.files).filter(p => p.startsWith("art/plant/packs/"))) if (!b.files[p].equals(a.files[p])) bad.push(`${p} depends on ZIP form`);
      const strip = m => J({ ...m, acceptance: null, sprites: m.sprites.map(s => ({ ...s, entry: null })) }); if (strip(JSON.parse(b.files[`art/plant/intake/${pack}/intake-map.json`])) !== strip(JSON.parse(a.files[`art/plant/intake/${pack}/intake-map.json`]))) bad.push("map depends on ZIP form beyond the delivery hashes"); }
    check(!bad.length, "A3 · deterministic: the same deliveries give byte-identical atlas.png / atlas.json / intake-map.json; re-zipped stored instead of deflated with every entry order reversed (new ZIP bytes, re-accepted), the pack is byte-identical and the map differs only in the delivery hashes", J(bad)); }
  { const bad = [], root = tree(), pack = "woolly-candle"; write(root, FX[pack]);
    const dry = node(["tools/intake-plant-art.mjs", "--root", root, "--pack", pack, "--dry-run"]); if (dry.status !== 0 || fs.existsSync(path.join(root, "art/plant/packs", pack))) bad.push(`dry-run ${dry.status} ${dry.stderr.slice(0, 200)}`);
    const pre = node(["tools/intake-plant-art.mjs", "--root", root, "--pack", pack, "--check"]); if (pre.status !== 1) bad.push("--check before intake should fail");
    const run = node(["tools/intake-plant-art.mjs", "--root", root, "--pack", pack]); if (run.status !== 0) bad.push(`intake ${run.stderr.slice(0, 300)}`);
    const chk = node(["tools/intake-plant-art.mjs", "--root", root, "--pack", pack, "--check"]); if (chk.status !== 0) bad.push(`--check ${chk.stderr.slice(0, 200)}`);
    const build = node(["tools/build-plant-art.mjs", "--root", root, "--check"]); if (build.status !== 1 || !/differ from a clean rebuild/.test(build.stderr)) bad.push("the runtime must need a rebuild after an intake");
    const rb = node(["tools/build-plant-art.mjs", "--root", root]); const rbc = node(["tools/build-plant-art.mjs", "--root", root, "--check"]); if (rb.status !== 0 || rbc.status !== 0) bad.push(`build:plant-art ${rb.stderr.slice(0, 200)}`);
    const j = path.join(root, `art/plant/packs/${pack}/atlas.json`); fs.appendFileSync(j, " "); const tam = node(["tools/intake-plant-art.mjs", "--root", root, "--pack", pack, "--check"]); if (tam.status !== 1) bad.push("--check missed a tampered atlas.json");
    const list = node(["tools/intake-plant-art.mjs", "--root", root, "--list"]); if (!/woolly-candle\s+candle@1.*ready/.test(list.stdout) || !/cinder-rosette.*awaiting deliveries/.test(list.stdout)) bad.push(`--list ${list.stdout}`);
    check(!bad.length, "A4 · CLI: --dry-run proves and writes nothing; the intake writes art/plant/packs/<pack>/atlas.{png,json} + intake-map.json, after which build:plant-art regenerates the runtime and check:plant-art passes; --check verifies a clean intake and catches a tampered pack; --list reports each lane", J(bad)); }
  { const bad = [], counts = {};
    for (const pack of Object.keys(LANES)) { const only = tree(); write(only, FX[pack]); for (const q of Object.keys(LANES)) { const r = I.assemble(only, q); if (q === pack ? r.errors.length : !r.awaiting) bad.push(`${pack} alone: ${q}`); } }
    const files = {}; for (const pack of Object.keys(LANES)) { const r = I.assemble(all, pack); if (r.errors.length) bad.push(`${pack} with all: ${r.errors[0]}`); else Object.assign(files, r.files); }
    for (const [p, b] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(all, p)), { recursive: true }); fs.writeFileSync(path.join(all, p), b); }
    const B = Bd.buildPlantArt(all); if (B.errors.length) bad.push(`build with all three: ${B.errors.slice(0, 3)}`); else for (const p of Object.keys(LANES)) counts[p] = B.manifest.packs[p].sprites;
    check(!bad.length, `A5 · the three lanes are independent: each ingests with the other two lanes empty (they stay "awaiting"), and all three together build into one runtime — ${J(counts)}`, J(bad)); }

  // ================================================================ R · refusals
  console.log("# R · refusals (each refused with its reason; nothing assembled)");
  const refuse = (label, pack, mut, want, opts = {}) => { const root = tree(), fx = clone(FX[pack]); mut(fx); write(root, fx, opts); const r = I.assemble(root, pack);
    const ok = r.errors.length > 0 && !r.files && want.test(r.errors.join("\n")); return { ok, label, got: r.errors.slice(0, 3) }; };
  const S = (fx, id) => { for (const d of fx.deliveries) { const s = (d.manifest.sprites || []).find(x => x.id === id); if (s) return { d, s, img: d.entries.get(s.file) }; } throw new Error(id); };
  const opaqueAt = (img, want = true) => { for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) if ((img.rgba[(y * img.w + x) * 4 + 3] === 255) === want) return [x, y]; return null; };
  const group = (name, cases) => { const res = cases.map(c => c()), bad = res.filter(r => !r.ok); check(!bad.length, `${name} — ${res.map(r => r.label).join(" · ")}`, J(bad)); };
  const CR = "cinder-rosette", WC = "woolly-candle", RS = "reed-spire";
  group("R1 · PMO record and files: refused on", [
    () => refuse("SHA-256 mismatch", CR, () => {}, /SHA-256 mismatch/, { acc: a => (a.deliveries[2].sha256 = "0".repeat(64), a) }),
    () => refuse("byte-count mismatch", CR, () => {}, /byte count mismatch/, { acc: a => (a.deliveries[0].bytes += 1, a) }),
    () => refuse("a corrupted ZIP (one byte flipped after acceptance)", CR, () => {}, /SHA-256 mismatch/, { disk: del => { const f = path.join(del, fs.readdirSync(del).sort()[0]), b = fs.readFileSync(f); b[60] ^= 0xff; fs.writeFileSync(f, b); } }),
    () => refuse("an accepted delivery missing on disk", CR, () => {}, /accepted delivery missing/, { disk: del => fs.rmSync(path.join(del, "batch4-flood.zip")) }),
    () => refuse("an unexpected (unaccepted) delivery", CR, () => {}, /unexpected delivery/, { disk: del => fs.writeFileSync(path.join(del, "batch2-cold-heat-v2.zip"), "x") }),
    () => refuse("a missing batch", CR, fx => { fx.deliveries = fx.deliveries.filter(d => d.batch !== 3); }, /batch 3 \(drought\): no accepted delivery/),
    () => refuse("not a ZIP (accepted with its hash)", CR, fx => { fx.deliveries[1].raw = true; }, /not a ZIP/),
    () => refuse("wrong pack id in the acceptance", CR, fx => { fx.acceptance.pack = "woolly-candle"; }, /wrong pack id "woolly-candle"/),
    () => refuse("wrong bodyPlan in the acceptance", CR, fx => { fx.acceptance.bodyPlan = "rosette@2"; }, /wrong bodyPlan "rosette@2"/),
    () => refuse("a status other than FINAL PMO-APPROVED ART INTAKE", CR, fx => { fx.acceptance.status = "DRAFT"; }, /only "FINAL PMO-APPROVED ART INTAKE" is ingested/),
    () => refuse("a delivery accepted as another batch", CR, () => {}, /the PMO accepted it as batch/, { acc: a => (a.deliveries[0].batch = 2, a) }),
  ]);
  group("R2 · delivery content: refused on", [
    () => refuse("wrong pack id in a delivery.json", WC, fx => { fx.deliveries[0].manifest.pack = "reed-spire"; }, /wrong pack id "reed-spire" in delivery\.json/),
    () => refuse("wrong bodyPlan in a delivery.json", WC, fx => { fx.deliveries[1].manifest.bodyPlan = "oh-stem@1"; }, /wrong bodyPlan "oh-stem@1" in delivery\.json/),
    () => refuse("an undeclared extra drawing in a ZIP", WC, fx => { fx.deliveries[0].entries.set("sprites/leaf.base.extra.png", S(fx, "bud").img); }, /undeclared file sprites\/leaf\.base\.extra\.png/),
    () => refuse("a declared drawing outside the contract", WC, fx => { const d = fx.deliveries[0]; d.entries.set("sprites/leaf.base.flat.png", S(fx, "bud").img); d.manifest.sprites.push({ id: "leaf.base.flat", file: "sprites/leaf.base.flat.png", anchor: [0, 0] }); }, /"leaf\.base\.flat": not a drawing of candle@1/),
    () => refuse("a drawing delivered in the wrong batch", WC, fx => { const b1 = fx.deliveries[0], b6 = fx.deliveries.find(d => d.batch === 6), s = b6.manifest.sprites.find(x => x.id === "pod");
      b6.manifest.sprites = b6.manifest.sprites.filter(x => x !== s); b1.manifest.sprites.push(s); b1.entries.set(s.file, b6.entries.get(s.file)); b6.entries.delete(s.file); }, /"pod": belongs to batch 6/),
    () => refuse("the same drawing in two deliveries", WC, fx => { const b2 = fx.deliveries.find(d => d.batch === 2), s = b2.manifest.sprites.find(x => x.id === "frost.hair.1");
      fx.deliveries.push({ file: "batch2-extra.zip", batch: 2, wrap: "", manifest: { ...b2.manifest, sprites: [s] }, entries: new Map([[s.file, b2.entries.get(s.file)]]) }); }, /duplicate — frost\.hair\.1@up already delivered by batch2-/),
    () => refuse("the same drawing twice in one delivery", WC, fx => { const b2 = fx.deliveries[1], s = b2.manifest.sprites[0]; b2.manifest.sprites.push({ ...s, file: "again.png" }); b2.entries.set("again.png", b2.entries.get(s.file)); }, /duplicate — /),
    () => refuse("incomplete angle coverage (leaf.base at mid missing)", WC, fx => { const d = fx.deliveries[0]; d.manifest.sprites = d.manifest.sprites.filter(s => s.id !== "leaf.base.mid"); d.entries.delete("sprites/leaf.base.mid.png"); }, /missing drawing\(s\): leaf\.base\.mid \(leaf\.base at angle mid\)/),
    () => refuse("a rotation key (no runtime rotation)", WC, fx => { fx.deliveries[0].manifest.sprites[0].rotate = 90; }, /unknown key "rotate" \(no runtime rotation/),
    () => refuse("an unknown delivery.json key", WC, fx => { fx.deliveries[0].manifest.stressTint = "#ff0000"; }, /unknown key "stressTint"/),
  ]);
  group("R3 · mirror policy (drawings face the contract's way; the build bakes every left twin, nothing rotates at runtime): refused on", [
    () => refuse("an authored left twin of a mirrored leaf", WC, fx => { const d = fx.deliveries[0], s = d.manifest.sprites.find(x => x.id === "leaf.base.low"); d.manifest.sprites.push({ ...s, file: "left.png", orientation: "left" }); d.entries.set("left.png", d.entries.get(s.file)); }, /mirror policy: leaf\.base is drawn facing right; the build bakes its mirrored left twin/),
    () => refuse("a non-mirrored component drawn the other way", WC, fx => { const b6 = fx.deliveries.find(d => d.batch === 6), s = b6.manifest.sprites.find(x => x.id === "pod"); s.orientation = "up"; }, /mirror policy: pod is drawn facing down, never mirrored/),
  ]);
  const px = (fx, id, f) => { const { img } = S(fx, id); f(img); };
  group("R4 · pixels and geometry: refused on", [
    () => refuse("partial alpha (one pixel at 128)", RS, fx => px(fx, "leaf.base.mid", img => { const [x, y] = opaqueAt(img); img.rgba[(y * img.w + x) * 4 + 3] = 128; }), /partial alpha 128 — alpha must be exactly 0 or 255/),
    () => refuse("an off-palette pixel", RS, fx => px(fx, "bud", img => { const [x, y] = opaqueAt(img), i = (y * img.w + x) * 4; img.rgba[i] ^= 1; }), /is not a declared palette colour/),
    () => refuse("a treatment-only colour drawn", RS, fx => px(fx, "flower", img => { const [x, y] = opaqueAt(img), i = (y * img.w + x) * 4, h = FX[RS].deliveries.find(d => d.batch === 7).manifest.palette.waxLeaf[1]; [1, 3, 5].forEach((k, j) => img.rgba[i + j] = parseInt(h.slice(k, k + 2), 16)); }), /treatment-only material waxLeaf/),
    () => refuse("maxSize exceeded", RS, fx => { const { s, d, img } = S(fx, "salt.gland"), big = { w: img.w + 4, h: img.h, rgba: new Uint8Array((img.w + 4) * img.h * 4) }; for (let y = 0; y < img.h; y++) big.rgba.set(img.rgba.subarray(y * img.w * 4, (y + 1) * img.w * 4), y * big.w * 4); d.entries.set(s.file, big); delete s.size; }, /exceeds the contract's maxSize/),
    () => refuse("a declared size that is not the PNG's", RS, fx => { S(fx, "salt.gland").s.size = [9, 9]; }, /delivery\.json says \[9,9\]/),
    () => refuse("an anchor outside the drawing", RS, fx => { S(fx, "pod").s.anchor = [40, 0]; }, /anchor \[40,0\] is outside/),
    () => refuse("an anchor on a transparent pixel", RS, fx => { const { s, img } = S(fx, "frost.collar.2"); s.anchor = opaqueAt(img, false); }, /is on a transparent pixel/),
    () => refuse("an anchor off the contract edge (seed head not on its bottom row)", RS, fx => { const { s } = S(fx, "seedHead.small"); s.anchor = [s.anchor[0], s.anchor[1] - 1]; }, /breaks the seedHead convention \(the bottom row\)/),
    () => refuse("a leaf anchor off its leftmost column", RS, fx => { const { s, img } = S(fx, "leaf.flood.2.high"); const p = (() => { for (let x = 1; x < img.w; x++) for (let y = 0; y < img.h; y++) if (img.rgba[(y * img.w + x) * 4 + 3]) return [x, y]; })(); s.anchor = p; }, /breaks the leafSocket convention \(the leftmost column\)/),
    () => refuse("a tip point on a transparent pixel", RS, fx => { const { s, img } = S(fx, "leaf.drought.1.low"); s.points.tip = opaqueAt(img, false); }, /points\.tip .* must be an opaque pixel/),
    () => refuse("only two margin points", RS, fx => { S(fx, "leaf.base.low").s.points.margin.pop(); }, /points\.margin must be exactly 3 points/),
    () => refuse("missing points", RS, fx => { delete S(fx, "leaf.base.high").s.points; }, /points \{ tip, margin \} required/),
    () => refuse("points on a component that takes none", RS, fx => { S(fx, "pod").s.points = { tip: [0, 0] }; }, /pod takes no points/),
  ]);
  const M5 = fx => fx.deliveries.find(d => d.batch === 5), firstMask = fx => M5(fx).manifest.masks[0];
  group("R5 · masks: refused on", [
    () => refuse("a mask not the drawing's size", CR, fx => { const m = firstMask(fx), img = M5(fx).entries.get(m.file); M5(fx).entries.set(m.file, { w: img.w - 1, h: img.h, rgba: img.rgba.slice(0, (img.w - 1) * img.h * 4) }); }, /a mask must be exactly its drawing's/),
    () => refuse("a mask pixel outside the drawing", CR, fx => { const m = firstMask(fx), img = M5(fx).entries.get(m.file), src = S(fx, m.sprite).img, p = opaqueAt(src, false); img.rgba[(p[1] * img.w + p[0]) * 4 + 3] = 255; }, /lies outside the drawing's opaque pixels/),
    () => refuse("a mask treatment the component does not take", CR, fx => { const m = firstMask(fx); m.treatment = "glow"; }, /takes masks \["pigment","wax","toothed"\] only/),
    () => refuse("a mask outside the brief's mask batch", CR, fx => { const m = M5(fx).manifest.masks.shift(), b1 = fx.deliveries[0]; (b1.manifest.masks = b1.manifest.masks || []).push(m); b1.entries.set(m.file, M5(fx).entries.get(m.file)); M5(fx).entries.delete(m.file); }, /masks belong in batch 5/),
    () => refuse("a duplicate mask", CR, fx => { const m = firstMask(fx); M5(fx).manifest.masks.push({ ...m, file: "masks/dup.png" }); M5(fx).entries.set("masks/dup.png", M5(fx).entries.get(m.file)); }, /duplicate — already delivered/),
  ]);
  const CL = fx => fx.deliveries.find(d => d.batch === 7).manifest;
  group("R6 · metadata vs the body plan: refused on", [
    () => refuse("water on a soil plan", CR, fx => { CL(fx).environment.water = ["#5f8a99", "#86aebb"]; }, /environment\.water: not part of rosette@1 \(ground "soil" shows no water\)/),
    () => refuse("no water on the waterlogged reed plan", RS, fx => { delete CL(fx).environment.water; }, /environment\.water: 2 lower-case #rrggbb colours \(required: reed@1 stands on waterlogged ground\)/),
    () => refuse("an incomplete palette", RS, fx => { delete CL(fx).palette.pod; }, /material "pod" missing — the pack needs all 18 ramps/),
    () => refuse("contradictory ramps", RS, fx => { fx.deliveries[0].manifest.palette.leaf = ["#000001", "#000002", "#000003", "#000004"]; }, /palette\.leaf .* contradicts/),
    () => refuse("an environment colour that is a plant colour", RS, fx => { CL(fx).environment.turf = CL(fx).palette.leaf[2]; }, /is also the plant colour leaf/),
    () => refuse("a render option beyond stemOutline (no per-pack stress tint in v1)", RS, fx => { CL(fx).render.stressTint = "#ff00ff"; }, /render must be exactly \{ stemOutline/),
    () => refuse("environment outside the closure", RS, fx => { fx.deliveries[0].manifest.environment = CL(fx).environment; }, /environment belongs in the metadata closure \(batch 7\)/),
  ]);

  // ================================================================ O · Organic Hybrid untouched, generated output unchanged
  console.log("# O · Organic Hybrid untouched");
  { const LOCK = ["tools/intake-organic-hybrid-art.mjs", "art/plant/intake/organic-hybrid", "art/plant/packs/organic-hybrid", "art/plant/contract.json", "art/plant/body-plan.json", "art/plant/body-plans/oh-stem.json"];
    const changed = git(`diff --name-only ${BASE} -- ${LOCK.join(" ")}`) + git(`ls-files -o --exclude-standard -- ${LOCK.join(" ")}`);
    const ohc = node(["tools/intake-organic-hybrid-art.mjs", "--check"]), bc = node(["tools/build-plant-art.mjs", "--check"]), proof = node(["art/plant/proof-packs/make-proof-packs.mjs", "--check"]);
    check(!changed && ohc.status === 0 && bc.status === 0 && proof.status === 0, `O1 · Organic Hybrid untouched: its intake tool, PMO delivery, pack, contract.json, body-plan.json and oh-stem plan are byte-identical to the 035C0 base ${BASE.slice(0, 7)}; intake-organic-hybrid-art --check passes (${ohc.stdout.trim()}); check:plant-art passes; the proof packs equal a clean regeneration`, J({ changed, ohc: ohc.stderr, bc: bc.stderr, proof: proof.stderr })); }
  { const ingested = I.lanes(ROOT).filter(l => fs.existsSync(path.join(ROOT, `art/plant/intake/${l.pack}/PMO_FINAL_ACCEPTANCE.json`)));
    const gen = ingested.length ? "" : git(`diff --name-only ${BASE} -- resources/plant-visual content/species.js art/plant/packs`) + git("ls-files -o --exclude-standard -- resources/plant-visual content/species.js art/plant/packs");
    check(!gen, `O2 · ${ingested.length ? `${ingested.length} lane(s) ingested — generated output is covered by check:plant-art` : "no lane ingested yet: the generated plant runtime, the grammar bundle, content/species.js (species art refs) and every pack are byte-identical to the 035C0 base — the intake is tooling only"}`, gen); }

  for (const d of TMP) fs.rmSync(d, { recursive: true, force: true });
  console.log(`\n${fails ? `${fails} check(s) FAILED` : "ALL CHECKS PASS"} (${passes}/${passes + fails}) (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); for (const d of TMP) fs.rmSync(d, { recursive: true, force: true }); process.exit(1); });
