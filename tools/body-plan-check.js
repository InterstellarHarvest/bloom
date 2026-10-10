// BLOOM — Body-plan layer check (BLOOM-035B-5). docs/SPECIES_BODY_PLANS_v1.md § Implementation (035B-5).
//
//   NODE_PATH="$(npm root -g)" node tools/body-plan-check.js [--browsers chromium,firefox] [--evidence] [--quick]
//
// Node — O · ORGANIC HYBRID MIGRATION, BYTE-IDENTICAL against the pre-migration code at 5ff53d3 (the old model / selector / compositor /
// generated atlas / specimen loaded from `git show 5ff53d3:<path>` into an isolated VM context, the new ones into another; nothing is edited
// while either runs): over the COMPLETE legal-model enumeration (every legal genome × thriving / strained) the same selection, and in every
// Organic Hybrid-plan pack the same placements, plant buffer, owners, RGBA and signatures; the same 117 sockets; the same 17 782-placement
// static clip proof per pack; the same runtime pack data; the production specimen's displayed frames, anchors and signatures identical for
// every local-colony state, preview and highlight; the selector source moved byte-for-byte; the generic `stem` axis reproduces body-plan@2.
// P · PER BODY PLAN (rosette · candle · reed): contract coverage (every component × angle × side in every pack of the plan); FINAL_PACKS
// per plan (only organic-hybrid is final; the proof packs are marked TEMPORARY PIPELINE PROOF — NOT FINAL ART); for EVERY legal model the
// grammar names only contract components and plan sockets, every placement lands on a socket of its own attach kind, nothing clips (≥ 1 px
// margin), the render is deterministic, every plant pixel is an exact palette colour with binary alpha; the static per-plan clip proof;
// a visible, distinct answer for every design §2.4 axis (each single trait at each tier ≠ the unmutated plant and ≠ its neighbour tier;
// strained ≠ thriving; T4+ = T3); the specimen (drawSpecies, draw with a species, anchors / highlight for all seven parts, ghost /
// unviable / preview); refusals (unknown pack / plan, plan ≠ species art, malformed species) THROW; the proof packs equal a clean
// regeneration; check:plant-art passes. Browser (Chromium + Firefox, file://): BLOOM.plantSpecimen.mount(host, { species }) for the four
// species — canvas pixels == the Node frame, data-pack / data-plan, refusals throw. --evidence writes docs/evidence/bloom-035b/body-plans/.
"use strict";
const path = require("path"), fs = require("fs"), cp = require("child_process"), vm = require("vm"), os = require("os"), zlib = require("zlib");
const ROOT = path.resolve(__dirname, "..");
const argv = process.argv, argOf = k => { const i = argv.indexOf(k); return i > 0 ? argv[i + 1] : null; };
const BROWSERS = (argOf("--browsers") ?? "chromium,firefox").split(",").filter(Boolean), EVIDENCE = argv.includes("--evidence"), QUICK = argv.includes("--quick");
const EVD = path.join(ROOT, "docs/evidence/bloom-035b/body-plans");
const J = JSON.stringify, read = f => fs.readFileSync(path.join(ROOT, f), "utf8");
let fails = 0, passes = 0; const RESULTS = [], t0 = Date.now();
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); RESULTS.push({ ok: !!ok, name: name.slice(0, 200) }); ok ? passes++ : fails++; };
const git = a => cp.execSync(`git ${a}`, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 256 << 20 }).trim();
const BASE = "5ff53d3";   // production main before BLOOM-035B-5 (BLOOM-035A accepted)
const PLANS = { rosette: { pack: "proof-cinder-rosette", species: "cinder_rosette" }, candle: { pack: "proof-woolly-candle", species: "woolly_candle" }, reed: { pack: "proof-reed-spire", species: "reed_spire" } };
const SPECIES = { organic_hybrid: { id: "organic_hybrid", art: { bodyPlan: "oh-stem@1", pack: "organic-hybrid" } },
  cinder_rosette: { id: "cinder_rosette", art: { bodyPlan: "rosette@1", pack: "proof-cinder-rosette" } },
  woolly_candle: { id: "woolly_candle", art: { bodyPlan: "candle@1", pack: "proof-woolly-candle" } },
  reed_spire: { id: "reed_spire", art: { bodyPlan: "reed@1", pack: "proof-reed-spire" } } };
const FINAL_PACKS = { "oh-stem": { "organic-hybrid": "ORGANIC HYBRID — FINAL ART (PMO-approved; BLOOM-032B2 intake)" }, rosette: {}, candle: {}, reed: {} };
const PROOF_STATUS = "TEMPORARY PIPELINE PROOF — NOT FINAL ART";
const RUNTIME = ["content/config.js", "content/traits.js", "resources/plant-visual/generated/plant-atlas.js", "resources/plant-visual/plant-visual-model.js", "resources/plant-visual/plant-components.js",
  "resources/plant-visual/plant-compositor.js", "resources/plant-visual/plant-fx.js", "resources/run-ui/plant-specimen.js"];
const PROOF = { milestone: "BLOOM-035B-5", status: PROOF_STATUS, base: BASE, head: git("rev-parse HEAD"), oh: {}, plans: {}, browsers: {} };

// ---------------------------------------------------------------- two isolated pipelines: the pre-migration code (5ff53d3) and this tree
function context(name, sources) { const g = { Buffer, console }; vm.createContext(g); for (const [f, src] of sources) vm.runInContext(src, g, { filename: `${name}:${f}` }); return g; }
const OLD = context("5ff53d3", RUNTIME.map(f => [f, git(`show ${BASE}:${f}`)]));
const NEW = context("HEAD", RUNTIME.map(f => [f, read(f)]));
const O = OLD.BLOOM, N = NEW.BLOOM, RULES_O = O.plantVisual.model.rules(OLD.BLOOM_DATA), RULES_N = N.plantVisual.model.rules(NEW.BLOOM_DATA);
// the P · checks use this tree's runtime required into the main realm (as every Node tool loads it; a VM realm's global lookups are ~4× slower)
for (const f of RUNTIME) require(path.join(ROOT, f));
const PV = BLOOM.plantVisual, PC = BLOOM.plantCompositor, FX = BLOOM.plantFx, ART = BLOOM.plantArt, PS = BLOOM.plantSpecimen, RULES = PV.model.rules(BLOOM_DATA);
const NPV = N.plantVisual, NPC = N.plantCompositor, NPS = N.plantSpecimen;   // the O · comparisons: old and new, each in its own VM realm

// ---------------------------------------------------------------- the complete legal-model enumeration (traits are shared by every species)
function genomes() { const out = [], W = [{}, { drought: 1 }, { drought: 2 }, { drought: 3 }, { flood: 1 }, { flood: 2 }, { flood: 3 }];
  for (let c = 0; c <= 3; c++) for (let h = 0; h + c <= 3; h++) for (const w of W) for (const salt of [0, 1]) for (const rad of [0, 1]) for (const seedOut of [0, 1, 2]) for (const earlyMat of [0, 1]) for (const waterSeeds of [0, 1]) {
    const t = Object.assign({}, c ? { cold: c } : {}, h ? { heat: h } : {}, w, salt ? { salt } : {}, rad ? { rad } : {}, seedOut ? { seedOut } : {}, earlyMat ? { earlyMat } : {}, waterSeeds ? { waterSeeds } : {}); out.push(t); }
  return out; }
const GENOMES = genomes(), CONDS = ["thriving", "strained"];
const MODELS = []; for (const t of GENOMES) for (const c of CONDS) MODELS.push({ traits: t, condition: c });
const sample = QUICK ? MODELS.filter((_, i) => i % 7 === 0) : MODELS;
const plainPl = F => F.placements.map(q => { const o = Object.assign({}, q); delete o.sp; return o; });
const same = (a, b) => a.length === b.length && Buffer.from(a.buffer, a.byteOffset, a.byteLength).equals(Buffer.from(b.buffer, b.byteOffset, b.byteLength));
const MID = Object.fromEntries(ART.materials.map((m, i) => [m, i + 1]));

// ---------------------------------------------------------------- tiny PNG (evidence)
const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = b => { let c = 0xffffffff; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t, "ascii"), d]), c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
function png(W, H, rgba) { const h = Buffer.alloc(13); h.writeUInt32BE(W, 0); h.writeUInt32BE(H, 4); h[8] = 8; h[9] = 2; const raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4, j = y * (W * 3 + 1) + 1 + x * 3; raw[j] = rgba[i]; raw[j + 1] = rgba[i + 1]; raw[j + 2] = rgba[i + 2]; }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", h), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]); }

(async () => {
  console.log(`# Node — scope (HEAD ${PROOF.head.slice(0, 7)} vs ${BASE})`);
  { const changed = [...new Set([...git(`diff --name-only ${BASE}`).split("\n"), ...git("ls-files -o --exclude-standard").split("\n")])].filter(Boolean).sort();
    const MAY = p => (p.startsWith("art/plant/") && !p.startsWith("art/plant/packs/organic-hybrid/") && !p.startsWith("art/plant/intake/")) || p.startsWith("resources/plant-visual/") || p === "resources/run-ui/plant-specimen.js"
      || p.startsWith("resources/plant-sprite-lab/") || ["tools/build-plant-art.mjs", "tools/plant-sprite-pipeline-check.js", "tools/production-plant-integration-check.js", "tools/organic-hybrid-art-intake-check.js", "tools/intake-plant-art.mjs", "tools/body-plan-check.js"].includes(p)
      || ["docs/SPECIES_BODY_PLANS_v1.md", "docs/PLANT_SPRITE_PIPELINE_v1.md"].includes(p) || p.startsWith("docs/species-art-briefs/") || p.startsWith("docs/evidence/bloom-035b/body-plans/");
    const outside = changed.filter(p => !MAY(p)), locked = git(`diff --name-only ${BASE} -- art/plant/packs/organic-hybrid art/plant/intake art/plant/body-plan.json art/plant/contract.json`).split("\n").filter(Boolean);
    PROOF.changedFiles = changed;
    check(!outside.length && !locked.length, `S1 · scope: every changed file is in the 035B-5 file set (art/plant/ except the locked delivery, resources/plant-visual/, plant-specimen.js, the plant build + checks, the body-plan / pipeline docs, art briefs, evidence); the PMO-locked Organic Hybrid delivery (packs/organic-hybrid, intake/ incl. PMO_FINAL_ACCEPTANCE.json and the approved ZIPs) and the pinned body-plan.json / contract.json are byte-identical to ${BASE}`, J({ outside, locked, changed: changed.length })); }

  console.log("# Node — O · Organic Hybrid migration (byte-identical to " + BASE + ")");
  const OH_PACKS = ART.bodyPlans["oh-stem"].packs, OLD_PACKS = O.plantArt.packOrder;
  // O1 · selections over the complete enumeration + the moved source
  { let bad = 0, n = 0; const keys = new Set();
    for (const m of MODELS) { const a = O.plantVisual.components.select(O.plantVisual.model.normalize(m, RULES_O)), Mn = NPV.model.normalize(m, RULES_N), b = NPV.grammars["oh-stem"].select(Mn), c = NPV.components.select(Mn);
      n++; keys.add(b.key); if (J(a) !== J(b) || J(b) !== J(c) || J(O.plantVisual.model.normalize(m, RULES_O)) !== J(Mn)) bad++; }
    const fnSrc = s => s.slice(s.indexOf("  function select(M) {"), s.indexOf("\n  }\n", s.indexOf("  function select(M) {")) + 4);
    const oldSrc = fnSrc(git(`show ${BASE}:resources/plant-visual/plant-components.js`)), newSrc = fnSrc(read("resources/plant-visual/grammars/oh-stem.js")), bundled = read("resources/plant-visual/plant-components.js").includes(oldSrc);
    PROOF.oh.models = n; PROOF.oh.legalGenomes = GENOMES.length; PROOF.oh.distinctSelections = keys.size;
    check(!bad && n === 6720 && GENOMES.every(t => NPV.model.validate(t, RULES_N).legal) && oldSrc.length > 1000 && oldSrc === newSrc && bundled && NPV.components === NPV.grammars["oh-stem"],
      `O1 · the Organic Hybrid grammar is the accepted selector MOVED, not edited: select() source byte-identical (grammars/oh-stem.js and the generated bundle plant-components.js); over the complete legal-model enumeration (${GENOMES.length} legal genomes × thriving / strained = ${n} models) the model and the selection are identical to ${BASE}; BLOOM.plantVisual.components IS grammars["oh-stem"]`, J({ bad, models: n, selections: keys.size })); }
  // O2 · renders: every model × every Organic Hybrid-plan pack
  { let n = 0; const bad = [];
    for (const pack of OH_PACKS) for (const m of sample) { const so = O.plantVisual.components.select(O.plantVisual.model.normalize(m, RULES_O)), sn = NPV.grammars["oh-stem"].select(NPV.model.normalize(m, RULES_N));
      const A = O.plantCompositor.render(so, pack), B = NPC.render(sn, pack); n++;
      if (!(same(A.rgba, B.rgba) && same(A.env, B.env) && same(A.plant.m, B.plant.m) && same(A.plant.owner, B.plant.owner) && J(plainPl(A)) === J(plainPl(B)) && J(A.sig) === J(B.sig) && A.clip === B.clip && J(A.bbox) === J(B.bbox)
        && J(A.skeleton.sockets) === J(B.skeleton.sockets) && J(A.unrendered) === J(B.unrendered) && B.plan === "oh-stem")) { if (bad.length < 4) bad.push(`${pack}:${J(m)}`); bad.n = (bad.n || 0) + 1; } }
    PROOF.oh.renders = n; PROOF.oh.packs = OH_PACKS;
    check(!bad.length && n === sample.length * 4 && J(OH_PACKS) === J(OLD_PACKS), `O2 · every render byte-identical: ${n} renders (${sample.length} models × ${OH_PACKS.length} Organic Hybrid-plan packs ${OH_PACKS.join(" / ")}) — same placements (component, sprite key, socket, position, size, anchor), plant buffer, owners, RGBA, environment, anatomy / full signatures, clip, bbox and socket table${QUICK ? " (--quick: every 7th model)" : ""}`, J({ bad, n: bad.n || 0 })); }
  // O3 · 117 sockets, the 17 782-placement clip proof, runtime data
  { const so = NPC.sockets(ART.bodyPlan, ART.contract.canvas), sOld = O.plantCompositor.sockets(O.plantArt.bodyPlan, O.plantArt.contract.canvas), viaPlan = NPC.sockets(ART.bodyPlans["oh-stem"], ART.contract.canvas);
    const MAN = JSON.parse(read("resources/plant-visual/generated/plant-atlas-manifest.json")), MAN0 = JSON.parse(git(`show ${BASE}:resources/plant-visual/generated/plant-atlas-manifest.json`));
    const proofOk = OH_PACKS.every(p => MAN.packs[p].placementsProven === 17782 && MAN0.packs[p].placementsProven === 17782 && MAN.packs[p].sprites === MAN0.packs[p].sprites);
    const rt = OH_PACKS.every(p => { const a = O.plantArt.packs[p], b = ART.packs[p]; return J(a.sprites) === J(b.sprites) && J(a.palette) === J(b.palette) && J(a.environment) === J(b.environment) && J(a.render) === J(b.render) && a.status === b.status; });
    const contractOk = J(O.plantArt.contract) === J(ART.contract) && J(ART.contracts["oh-stem"]) === J(ART.contract) && J(O.plantArt.bodyPlan) === J(ART.bodyPlan) && J(ART.bodyPlans["oh-stem"].stem2) === J(ART.bodyPlan) && J(O.plantArt.materials) === J(ART.materials);
    PROOF.oh.sockets = so.length; PROOF.oh.clipProof = Object.fromEntries(OH_PACKS.map(p => [p, MAN.packs[p].placementsProven]));
    check(so.length === 117 && J(so) === J(sOld) && J(viaPlan) === J(so) && J(MAN.sockets) === J(MAN0.sockets) && proofOk && rt && contractOk && ART.packs["organic-hybrid"].bodyPlan === undefined && NPC.planRefOf("organic-hybrid") === "oh-stem@1",
      `O3 · the same 117 sockets (the renderer's table, the plan's, and the manifest size budget == ${BASE}); the same static clip proof: ${OH_PACKS.map(p => `${p} ${MAN.packs[p].placementsProven}`).join(" · ")} placements (${BASE}: 17 782 each); every Organic Hybrid-plan pack's runtime sprites, palette, environment and render options, the contract, body-plan@2 and materials are JSON-identical; the locked organic-hybrid pack declares no bodyPlan (lockedPacks of oh-stem@1)`, J({ sockets: so.length, proofOk, rt, contractOk })); }
  // O4 · the production specimen: identical displayed frames for Organic Hybrid (no species and the explicit species)
  { const room = (traits, o = {}) => Object.assign({ traits, names: {}, preview: null, colony: { living: true, establishment: 0.6, word: "" }, focus: "balanced", local: null, condition: "ok", viable: true }, o);
    const variants = [{}, { colony: { living: true, establishment: 1, word: "" } }, { colony: { living: true, establishment: 0.05, word: "" } }, { focus: "roots" }, { focus: "leaves" }, { focus: "seeds" }, { focus: "roots", local: "rootNetwork" },
      { focus: "leaves", local: "leafCanopy" }, { focus: "seeds", local: "seedReserve" }, { condition: "warn" }, { condition: "bad" }, { colony: { living: false, establishment: 0, word: "" } },
      { colony: { living: false, establishment: 0, word: "" }, viable: false, condition: "bad" }, { preview: { id: "cold", tier: 1 } }, { preview: { id: "seedOut", tier: 2 } }, { preview: { id: "rad", tier: 1 } }];
    const traitsSet = QUICK ? GENOMES.filter((_, i) => i % 23 === 0) : GENOMES.filter((_, i) => i % 10 === 0);
    let n = 0; const bad = [];
    for (const t of traitsSet) for (const v of variants) for (const hl of [null, ...NPS.PARTS]) { if (hl && v !== variants[0] && v !== variants[13]) continue;
      const st = room(t, v), a = O.plantSpecimen.draw(st, { highlight: hl }), b = NPS.draw(st, { highlight: hl }), c = NPS.draw(st, { highlight: hl, species: SPECIES.organic_hybrid }); n++;
      if (!(same(a.rgba, b.rgba) && same(b.rgba, c.rgba) && J(a.anchors) === J(b.anchors) && J(b.anchors) === J(c.anchors) && a.sig === b.sig && a.globalSig === b.globalSig && a.pack === b.pack && J(a.extras ? [...a.extras.keys()] : 0) === J([...b.extras.keys()]))) { if (bad.length < 3) bad.push(J([t, v, hl])); } }
    PROOF.oh.specimenFrames = n;
    check(!bad.length && n > 1000 && NPS.PACK === "organic-hybrid" && O.plantSpecimen.PACK === NPS.PACK && NPS.renderer === O.plantSpecimen.renderer && J(NPS.PARTS) === J(O.plantSpecimen.PARTS) && NPS.version === O.plantSpecimen.version,
      `O4 · the production specimen (resources/run-ui/plant-specimen.js) is byte-identical for Organic Hybrid: ${n} displayed frames (genomes × local colony states — establishment, growth focus, local upgrades, warn / bad, no colony, unviable — × previews × all seven highlights) give identical RGBA, signatures, global signatures, local extras and anchors, both without a species and with the explicit organic_hybrid species; PACK / PARTS / renderer / version unchanged`, J({ bad, n })); }
  // O5 · the generic `stem` axis kind reproduces body-plan@2 (a one-axis @3 plan from the same numbers)
  { const B = ART.bodyPlan, conv = { format: "bloom-plant-body-plan@3", id: "oh-as-axes", version: 1, crown: B.crown, canvas: ART.contract.canvas, ground: { y: B.crown[1], kind: "soil" },
      roots: { kind: "taproot", ...B.roots, storage: { dx: 0, dy: B.roots.storageSocket }, aerial: { dy: B.roots.aerial.dy, dx: B.roots.aerial.dx } },
      architectures: Object.fromEntries(Object.entries(B.layouts).map(([id, L]) => [id, { axes: [{ id: "main", kind: "stem", height: L.stem.height, width: L.stem.width, bend: L.stem.bend,
        sockets: { leaf: L.leaves, collar: L.collars.map(t => ({ t })), axil: L.axils, flower: [L.flowerBranch], seedHead: L.headBranches, pod: L.podBranches, drift: L.drift, stilt: L.stilts } }] }])) };
    const legacy = NPC.sockets(B, ART.contract.canvas), generic = NPC.planSockets(conv, ART.contract.canvas), rename = s => s.replace(/^main\./, "").replace(/^collar/, "collar").replace(/^stemNode/, "stemNode");
    const key = s => `${s.layout}|${rename(s.socket)}|${s.attach}|${s.x},${s.y}|${s.side || 0}`, L = new Set(legacy.filter(s => !s.socket.startsWith("stemNode.")).map(key)), G = new Set(generic.map(key));
    const paths = Object.keys(B.layouts).every(id => J(NPC.skeleton(B, id, 0).stem.path) === J(NPC.axesOf(conv, id).axes.main.path));
    const missing = [...L].filter(k => !G.has(k)), extra = [...G].filter(k => !L.has(k));
    check(paths && !missing.length && !extra.length, `O5 · the generalized skeleton is a superset, not a fork: Organic Hybrid's body-plan@2 restated as one @3 \`stem\` axis per layout gives the identical stem path in all four layouts and the identical leaf / collar / axil / apex / flower / seed-head / pod / drift / stilt / root sockets (${G.size} coordinates; the @2 stemNode.i aliases of the leaf nodes aside)`, J({ missing: missing.slice(0, 4), extra: extra.slice(0, 4) })); }

  console.log("# Node — P · the three new body plans");
  const MAN = JSON.parse(read("resources/plant-visual/generated/plant-atlas-manifest.json"));
  // P0 · registry, FINAL_PACKS per plan, proof marking
  { const dirs = fs.readdirSync(path.join(ROOT, "art/plant/packs")).filter(n => !n.startsWith(".")).sort(), bad = [];
    const finals = Object.values(FINAL_PACKS).flatMap(o => Object.keys(o));
    for (const p of dirs) { const M = JSON.parse(read(`art/plant/packs/${p}/atlas.json`)), plan = PC.planOf(p).id, fin = FINAL_PACKS[plan] && FINAL_PACKS[plan][p];
      if (fin ? M.status !== fin : M.status !== PROOF_STATUS) bad.push(`${p}: status`);
      if (!fin && PLANS[plan]) { const md = fs.existsSync(path.join(ROOT, `art/plant/packs/${p}/README.md`)) ? read(`art/plant/packs/${p}/README.md`) : "";
        if (!M.title.startsWith("TEMPORARY PIPELINE PROOF") || !M.about.startsWith(PROOF_STATUS) || !md.includes(`**${PROOF_STATUS}.**`) || !/hazard checker/.test(M.about)) bad.push(`${p}: proof marking`); } }
    const planIds = Object.keys(ART.bodyPlans).sort(), refs = Object.values(SPECIES).map(s => s.art);
    const declared = refs.every(a => ART.packs[a.pack] && PC.planRefOf(a.pack) === a.bodyPlan), onlyOneFinal = finals.length === 1 && finals[0] === "organic-hybrid" && Object.keys(PLANS).every(pl => !Object.keys(FINAL_PACKS[pl]).length);
    PROOF.registry = { plans: Object.fromEntries(planIds.map(id => [id, { ref: ART.bodyPlans[id].ref, packs: ART.bodyPlans[id].packs, skeleton: ART.bodyPlans[id].skeleton }])), finalPacks: FINAL_PACKS };
    check(J(planIds) === J(["candle", "oh-stem", "reed", "rosette"]) && declared && onlyOneFinal && !bad.length,
      `P0 · four body plans oh-stem@1 · rosette@1 · candle@1 · reed@1; the species art mapping resolves (organic_hybrid → organic-hybrid, cinder_rosette → proof-cinder-rosette, woolly_candle → proof-woolly-candle, reed_spire → proof-reed-spire, each pack declaring exactly that plan); FINAL_PACKS per plan: only organic-hybrid (oh-stem) is final; the three new packs are status / title / about / README "${PROOF_STATUS}" with the hazard-checker look`, J({ bad, plans: PROOF.registry.plans })); }
  // P1 · contract coverage + static clip proof per plan
  { const rows = {};
    for (const [plan, { pack }] of Object.entries(PLANS)) { const C = ART.contracts[plan], P = ART.packs[pack], need = [];
      for (const [cid, c] of Object.entries(C.components)) for (const a of c.angles || [null]) for (const side of c.orientation === "right" ? ["right", "left"] : [c.orientation]) need.push(`${a ? cid + "." + a : cid}@${side}`);
      const have = Object.keys(P.sprites), foreign = have.filter(k => !C.components[P.sprites[k].component]);
      const so = PC.sockets(ART.bodyPlans[plan], C.canvas);
      rows[plan] = { components: Object.keys(C.components).length, drawings: JSON.parse(read(`art/plant/packs/${pack}/atlas.json`)).sprites.length, runtimeSprites: have.length, sockets: so.length, manifestSockets: MAN.bodyPlans[plan].sockets.length,
        clipProof: MAN.packs[pack].placementsProven, missing: need.filter(k => !P.sprites[k]).length, foreign: foreign.length, extra: have.length - need.length }; }
    PROOF.plans.coverage = rows;
    check(Object.values(rows).every(r => !r.missing && !r.foreign && !r.extra && r.sockets === r.manifestSockets && r.clipProof > 5000),
      `P1 · per-plan contract coverage and static clip proof: every pack of a plan covers every component × angle × side of THAT plan's contract and nothing else; the build places every sprite at every socket of its attach kind (and every leaf-point detail on every leaf drawing) inside 84×98 — ${Object.entries(rows).map(([k, r]) => `${k}: ${r.components} components · ${r.drawings} drawings (${r.runtimeSprites} runtime) · ${r.sockets} sockets · ${r.clipProof} placements proven`).join(" | ")}`, J(rows)); }
  // P2 · every legal model of every new plan
  { const rows = {};
    for (const [plan, { pack }] of Object.entries(PLANS)) {
      const g = PV.grammars[plan], C = ART.contracts[plan], Pl = ART.bodyPlans[plan], pal = ART.packs[pack].palette, socks = new Map(PC.planSockets(Pl, C.canvas).map(s => [`${s.layout}|${s.socket}`, s]));
      const colourOf = v => pal[ART.materials[(v >> 2) - 1]] && pal[ART.materials[(v >> 2) - 1]][v & 3];
      const r = { models: 0, selections: new Set(), anatomies: new Set(), bad: [], minMargin: Infinity, placements: 0 };
      for (const m of MODELS) { let S, F, F2; r.models++;
        try { S = g.select(PV.model.normalize(m, RULES)); F = PC.render(S, pack); F2 = PC.render(g.select(PV.model.normalize(m, RULES)), pack); } catch (e) { if (r.bad.length < 4) r.bad.push(`${J(m)}: ${e.message}`); continue; }
        r.selections.add(S.key); if (m.condition === "thriving") r.anatomies.add(F.sig.anatomy);
        const err = [];
        if (S.plan !== plan) err.push("plan");
        for (const c of S.components) if (!C.components[c]) err.push(`component ${c} not in contract`);
        if (!S.components.includes(S.leaf.component)) err.push("leaf not in components");
        const arch = Pl.architectures[S.architecture]; if (!arch) err.push(`architecture ${S.architecture}`);
        for (const a of S.axes) if (!arch.axes.some(x => x.id === a)) err.push(`axis ${a}`);
        for (const ax of arch.axes) if (ax.kind === "sprite" && S.axes.includes(ax.id) && S.body !== undefined && S.body !== ax.body) err.push(`body ${S.body} ≠ plan ${ax.body}`);
        for (const q of F.placements) { if (q.kind !== "sprite") continue; r.placements++;
          if (!S.components.includes(q.component) && !(q.component.startsWith("body.") && arch.axes.some(x => x.body === q.component))) err.push(`placed ${q.component} not selected`);
          if (!q.socket.endsWith(":point")) { const s = socks.get(`${S.architecture}|${q.socket}`) || socks.get(`*|${q.socket}`); if (!s || s.attach !== q.sp.attach || s.x !== q.anchor.x || s.y !== q.anchor.y) err.push(`socket ${q.socket}`); } }
        const margin = Math.min(F.bbox.x0, F.bbox.y0, F.W - 1 - F.bbox.x1, F.H - 1 - F.bbox.y1); r.minMargin = Math.min(r.minMargin, margin);
        if (F.clip || margin < 1) err.push(`clip ${F.clip} margin ${margin}`);
        if (F.sig.full !== F2.sig.full || !same(F.rgba, F2.rgba)) err.push("not deterministic");
        if (F.unrendered.length) err.push(`unrendered ${F.unrendered}`);
        for (let i = 0; i < F.plant.m.length; i++) { if (F.rgba[i * 4 + 3] !== 255) { err.push("alpha"); break; } const v = F.plant.m[i]; if (!v) continue; const h = colourOf(v); if (!h) { err.push(`material ${v} not in palette`); break; }
          if (!S.stress) { const c = [1, 3, 5].map(k => parseInt(h.slice(k, k + 2), 16)); if (F.rgba[i * 4] !== c[0] || F.rgba[i * 4 + 1] !== c[1] || F.rgba[i * 4 + 2] !== c[2]) { err.push("non-palette pixel"); break; } } }
        if (err.length && r.bad.length < 4) r.bad.push(`${J(m)}: ${err.slice(0, 3).join("; ")}`); if (err.length) r.badN = (r.badN || 0) + 1; }
      // the art pack itself: binary alpha, every opaque pixel an exact palette colour (the build validates it too)
      const B = await import(path.join(ROOT, "tools/build-plant-art.mjs")), A = JSON.parse(read(`art/plant/packs/${pack}/atlas.json`)), img = B.decodePNG(fs.readFileSync(path.join(ROOT, `art/plant/packs/${pack}/atlas.png`)));
      const cols = new Set(Object.values(A.palette).flat()); let partial = 0, offPal = 0;
      for (let i = 0; i < img.w * img.h; i++) { const a = img.rgba[i * 4 + 3]; if (a && a !== 255) partial++; if (a === 255 && !cols.has("#" + [0, 1, 2].map(k => img.rgba[i * 4 + k].toString(16).padStart(2, "0")).join(""))) offPal++; }
      rows[plan] = { models: r.models, legalSelections: r.selections.size, distinctAnatomies: r.anatomies.size, minMargin: r.minMargin, spritePlacements: r.placements, bad: r.bad, badN: r.badN || 0, atlasPartialAlpha: partial, atlasOffPalette: offPal }; }
    PROOF.plans.enumeration = rows;
    check(Object.values(rows).every(r => r.models === 6720 && !r.bad.length && !r.badN && r.minMargin >= 1 && !r.atlasPartialAlpha && !r.atlasOffPalette),
      `P2 · EVERY legal model of each new plan (6720 = ${GENOMES.length} legal genomes × thriving / strained) renders with its proof pack: the grammar names only that plan's contract components, architectures and axes; every sprite lands exactly on a plan socket of its own attach kind (or a leaf point); no pixel clipped and ≥ 1 px clear of every edge; deterministic (rendered twice, identical); every treatment rendered; output alpha 255 and every thriving plant pixel EXACTLY its palette colour; the atlas has binary alpha — ${Object.entries(rows).map(([k, r]) => `${k}: ${r.legalSelections} legal selections · ${r.distinctAnatomies} distinct thriving anatomies · ${r.spritePlacements} sprite placements · min margin ${r.minMargin} px`).join(" | ")}`, J(Object.fromEntries(Object.entries(rows).map(([k, r]) => [k, { bad: r.bad, badN: r.badN }])))); }
  // P3 · design §2.4: a visible, distinct answer per axis (each single trait at each tier) + condition + art cap
  { const rows = {};
    const AX = { cold: [1, 2, 3], heat: [1, 2, 3], drought: [1, 2, 3], flood: [1, 2, 3], salt: [1], rad: [1], seedOut: [1, 2], earlyMat: [1], waterSeeds: [1] };
    for (const [plan, { pack }] of Object.entries(PLANS)) { const g = PV.grammars[plan], fr = (t, c = "thriving") => PC.render(g.select(PV.model.normalize({ traits: t, condition: c }, RULES)), pack);
      const base = fr({}), out = { fromBase: {}, tierSteps: {}, bad: [] };
      for (const [id, tiers] of Object.entries(AX)) { let prev = base; for (const n of tiers) { const F = fr({ [id]: n }), d = FX.diff(base, F).length, step = FX.diff(prev, F).length; out.fromBase[`${id}${n}`] = d; out.tierSteps[`${id}${n}`] = step;
          if (F.sig.full === base.sig.full || d < 6 || step < 6) out.bad.push(`${id}${n}: ${d} px from base, ${step} px from the tier below`); prev = F; } }
      const str = FX.diff(base, fr({}, "strained")).length; if (str < 6 && fr({}, "strained").sig.full === base.sig.full) out.bad.push("strained = thriving");
      for (const arm of ["drought", "flood"]) for (const n of [4, 5, 9]) if (fr({ [arm]: n }).sig.full !== fr({ [arm]: 3 }).sig.full) out.bad.push(`${arm}${n} ≠ T3`);
      const famOf = c => ART.contracts[plan].components[c] && ART.contracts[plan].components[c].family, sel = t => g.select(PV.model.normalize({ traits: t }, RULES));
      const cold = new Set([1, 2, 3].flatMap(n => sel({ cold: n }).components.filter(c => !sel({}).components.includes(c) && !c.startsWith("leaf.") && !c.startsWith("body.")))), salt = new Set(sel({ salt: 1 }).components.filter(c => !sel({}).components.includes(c)));
      if (![...cold].every(c => famOf(c) === "frost") || ![...salt].every(c => famOf(c) === "salt") || !cold.size || !salt.size) out.bad.push("Cold / Salt families");
      if (PV.model.validate({ drought: 1, flood: 1 }, RULES).legal) out.bad.push("drought + flood legal");
      out.strained = str; rows[plan] = out; }
    PROOF.plans.axes = rows;
    check(Object.values(rows).every(r => !r.bad.length), `P3 · design §2.4 on every new plan: each single trait at each tier (Cold T1–T3 architecture, Heat T1–T3, Drought T1–T3, Flood T1–T3, Salt, Radiation, Seed Output T1–T2, Early Maturity, Waterborne Seeds) visibly differs from the unmutated plant AND from the tier below (≥ 6 px); strained ≠ thriving; Drought / Flood T4 · T5 · T9 = T3 exactly; Cold draws only frost-family, Salt only salt-family components`,
      J(Object.fromEntries(Object.entries(rows).map(([k, r]) => [k, { bad: r.bad, minFromBase: Math.min(...Object.values(r.fromBase)), minStep: Math.min(...Object.values(r.tierSteps)), strained: r.strained }])))); }
  // P4 · the specimen with a species: drawSpecies, anchors / highlight for all seven parts, local colony, preview
  { const room = (traits, o = {}) => Object.assign({ traits, names: {}, preview: null, colony: { living: true, establishment: 0.6, word: "" }, focus: "balanced", local: null, condition: "ok", viable: true }, o);
    const STATES = { base: {}, cold1: { cold: 1 }, cold2: { cold: 2 }, cold3: { cold: 3 }, heat1: { heat: 1 }, heat2: { heat: 2 }, heat3: { heat: 3 }, drought1: { drought: 1 }, drought3: { drought: 3 }, flood1: { flood: 1 }, flood3: { flood: 3 },
      salt: { salt: 1 }, rad: { rad: 1 }, seed1: { seedOut: 1 }, seed2: { seedOut: 2 }, early: { earlyMat: 1 }, water: { waterSeeds: 1 }, cold2heat1: { cold: 2, heat: 1 },
      maxDry: { cold: 2, heat: 1, drought: 3, salt: 1, rad: 1, seedOut: 2, earlyMat: 1, waterSeeds: 1 }, maxWet: { cold: 2, heat: 1, flood: 3, salt: 1, rad: 1, seedOut: 2, earlyMat: 1, waterSeeds: 1 } };
    const rows = {};
    for (const sp of Object.values(SPECIES)) { const bad = [], d1 = PS.drawSpecies(sp), d2 = PS.drawSpecies(sp), dT = PS.drawSpecies(sp, { traits: { cold: 1 } }), dS = PS.drawSpecies(sp, { condition: "warn" }), dTh = PS.drawSpecies(sp, { condition: "thriving" });
      if (!(d1.w === 84 && d1.h === 98 && d1.rgba.length === 84 * 98 * 4 && d1.signature === d2.signature && same(d1.rgba, d2.rgba) && dT.signature !== d1.signature && dS.signature !== d1.signature && dTh.signature === d1.signature && d1.pack === sp.art.pack && d1.plan === sp.art.bodyPlan)) bad.push("drawSpecies");
      for (const [k, t] of Object.entries(STATES)) { const d = PS.draw(room(t), { species: sp }), A = d.anchors;
        if (d.pack !== sp.art.pack) bad.push(`${k}: pack`);
        for (const part of PS.PARTS) { const h = PS.draw(room(t), { highlight: part, species: sp }); if (h.sig === d.sig) bad.push(`${k}: ${part} highlight shows nothing`);
          const a = A[part], i = a && a.y * d.W + a.x; if (!a || !(a.x >= 0 && a.y >= 0 && a.x < d.W && a.y < d.H)) bad.push(`${k}: ${part} anchor outside`); else if (!(d.frame.plant.m[i] || d.extras.has(i))) bad.push(`${k}: ${part} anchor off the anatomy`); }
        const ad = ["pigment", "leafShape", "stem", "roots"].map(p => A[p].y), spr = ["seedHead", "flowers", "pods"].map(p => A[p].y);
        if (!ad.every((y, i) => !i || y >= ad[i - 1] + 10) || !spr.every((y, i) => !i || y >= spr[i - 1] + 10)) bad.push(`${k}: anchors out of tendril order / GAP`); }
      const t = STATES.cold2heat1, V = { est: {}, est1: { colony: { living: true, establishment: 1, word: "" } }, roots: { focus: "roots", local: "rootNetwork" }, leaves: { focus: "leaves", local: "leafCanopy" }, seeds: { focus: "seeds", local: "seedReserve" },
        warn: { condition: "warn" }, none: { colony: { living: false, establishment: 0, word: "" } }, unviable: { colony: { living: false, establishment: 0, word: "" }, viable: false, condition: "bad" }, preview: { preview: { id: "seedOut", tier: 1 } } };
      const D = Object.fromEntries(Object.entries(V).map(([k, o]) => [k, PS.draw(room(t, o), { species: sp })])), disp = new Set(Object.values(D).map(d => d.sig)), glob = new Set(Object.values(D).map(d => d.globalSig));
      const kept = ["est", "est1", "roots", "leaves", "seeds"].every(k => { for (const i of D[k].extras.keys()) if (D[k].frame.plant.m[i]) return false; return true; });
      if (disp.size !== Object.keys(V).length || glob.size !== 1 || !kept || !D.preview.previewing || !D.none.ghost || D.unviable.viable) bad.push(`local colony: ${disp.size} displays, ${glob.size} globals, kept ${kept}`);
      rows[sp.id] = { bad: bad.slice(0, 5), badN: bad.length, signature: d1.signature, global: d1.globalSignature, plan: d1.plan, pack: d1.pack }; }
    PROOF.species = rows;
    check(Object.values(rows).every(r => !r.badN), `P4 · the specimen with each species (organic_hybrid · cinder_rosette · woolly_candle · reed_spire): drawSpecies() → a deterministic 84×98 frame (fully grown, thriving, fully established colony; "thriving" ≡ "ok"), a trait or a strained condition changes it; across ${Object.keys(STATES).length} states every one of the seven parts highlights visibly and anchors ON visible anatomy inside the canvas in the rooms' tendril order with the 10-px GAP; the local colony (establishment, focus, local upgrades, warn, no colony, unviable) and the preview change only the presentation of ONE global organism`, J(Object.fromEntries(Object.entries(rows).map(([k, r]) => [k, r.badN ? r.bad : r.signature])))); }
  // P5 · refusals: never a silent fallback to Organic Hybrid
  { const tries = { "unknown pack": () => PS.drawSpecies({ id: "x", art: { bodyPlan: "rosette@1", pack: "no-such-pack" } }), "pack of another plan": () => PS.drawSpecies({ id: "x", art: { bodyPlan: "rosette@1", pack: "organic-hybrid" } }),
      "unknown plan version": () => PS.drawSpecies({ id: "x", art: { bodyPlan: "rosette@2", pack: "proof-cinder-rosette" } }), "OH plan on a rosette pack": () => PS.draw({ traits: {} }, { species: { id: "x", art: { bodyPlan: "oh-stem@1", pack: "proof-reed-spire" } } }),
      "species without art": () => PS.drawSpecies({ id: "x" }), "malformed art": () => PS.draw({ traits: {} }, { species: { id: "x", art: { pack: "organic-hybrid" } } }), "no species": () => PS.drawSpecies(null),
      "mount: bad species (before any DOM)": () => PS.mount({}, { species: { id: "x", art: { bodyPlan: "candle@1", pack: "proof-reed-spire" } } }),
      "compositor: selection of another plan": () => PC.render(PV.grammars.rosette.select(PV.model.normalize({ traits: {} }, RULES)), "organic-hybrid"),
      "compositor: OH selection on a candle pack": () => PC.render(PV.components.select(PV.model.normalize({ traits: {} }, RULES)), "proof-woolly-candle") };
    const res = Object.fromEntries(Object.entries(tries).map(([k, f]) => { try { f(); return [k, "NOT THROWN"]; } catch (e) { return [k, e && (e.name === "TypeError" || /body plan|pack|selection/.test(e.message)) ? "throws" : "wrong error: " + e.message]; } }));
    check(Object.values(res).every(v => v === "throws"), "P5 · refusals throw (never a silent Organic Hybrid fallback): an unknown pack, a pack of another plan, an unknown plan version, a plan ≠ the pack's, a species without / with malformed art, no species for drawSpecies, mount() with a mismatched species (before touching the DOM); the compositor refuses a selection made by another plan's grammar", J(res)); }
  // P6 · the grammar bundle, proof-pack regeneration, check:plant-art, the legacy selection shape
  { let cpa = "", mpp = ""; try { cpa = cp.execSync("node tools/build-plant-art.mjs --check", { cwd: ROOT, encoding: "utf8" }).trim(); } catch (e) { cpa = "FAILED " + e.stdout + e.stderr; }
    try { mpp = cp.execSync("node art/plant/proof-packs/make-proof-packs.mjs --check", { cwd: ROOT, encoding: "utf8" }).trim(); } catch (e) { mpp = "FAILED " + e.stdout + e.stderr; }
    let brf = ""; try { brf = cp.execSync("node tools/build-plant-art.mjs --briefs --check", { cwd: ROOT, encoding: "utf8" }).trim(); } catch (e) { brf = "FAILED " + e.stdout + e.stderr; }
    const sep = context("grammars", ["content/config.js", "content/traits.js", "resources/plant-visual/plant-visual-model.js", ...["oh-stem", "rosette", "candle", "reed"].map(p => `resources/plant-visual/grammars/${p}.js`)].map(f => [f, read(f)]));
    const R2 = sep.BLOOM.plantVisual.model.rules(sep.BLOOM_DATA), sameSel = sample.filter((_, i) => i % 11 === 0).every(m => ["oh-stem", "rosette", "candle", "reed"].every(p => J(sep.BLOOM.plantVisual.grammars[p].select(sep.BLOOM.plantVisual.model.normalize(m, R2))) === J(PV.grammars[p].select(PV.model.normalize(m, RULES)))));
    const pkg = JSON.parse(read("tools/package.json"));
    check(/^check:plant-art OK/.test(cpa) && /^make-proof-packs --check OK/.test(mpp) && /^briefs --check OK/.test(brf) && sameSel && pkg.scripts["check:plant-art"] === "node build-plant-art.mjs --check",
      `P6 · npm run check:plant-art passes (the generated atlas, manifest and grammar bundle == a clean rebuild of art/plant/ + grammars/: ${cpa.slice(0, 60)}); the proof packs == a clean regeneration (${mpp.slice(0, 50)}); the art briefs == a regeneration from the plans (${brf.slice(0, 40)}); the four grammar files loaded on their own select exactly what the generated bundle selects`, J({ cpa: cpa.slice(0, 200), mpp: mpp.slice(0, 200), brf: brf.slice(0, 200) })); }

  // ---------------------------------------------------------------- browsers: the specimen mounted with each species (file://)
  let pw = null; try { pw = require("playwright"); } catch { check(false, "B0 · Playwright available (NODE_PATH=\"$(npm root -g)\")"); }
  if (pw) { const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bloom-bodyplan-")), page = path.join(dir, "specimens.html"), url = f => "file://" + encodeURI(path.join(ROOT, f)).replace(/#/g, "%23").replace(/\?/g, "%3F");
    fs.writeFileSync(page, `<!doctype html><meta charset="utf-8"><title>body plans</title><style>.ps{position:relative;width:258px;height:298px;overflow:hidden;display:inline-block}.ps-canvas{position:absolute;image-rendering:pixelated}.ps-tag{display:none}</style><body>
${RUNTIME.map(f => `<script src="${url(f)}"></script>`).join("\n")}
<div id="hosts"></div><script>window.__R = (() => { const out = {}, SP = ${J(SPECIES)};
  const hash = cv => { const d = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data; let h = 0x811c9dc5; for (let i = 0; i < d.length; i++) { h ^= d[i]; h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16).padStart(8, "0"); };
  const st = t => ({ traits: t, names: {}, preview: null, colony: { living: true, establishment: 1, word: "" }, focus: "balanced", local: null, condition: "ok", viable: true });
  for (const [id, sp] of Object.entries(SP).concat([["default", null]])) { const host = document.createElement("div"); document.getElementById("hosts").append(host);
    const s = BLOOM.plantSpecimen.mount(host, sp ? { reducedMotion: () => true, species: sp } : { reducedMotion: () => true }); const rows = [];
    for (const t of [{}, { cold: 2, heat: 1, drought: 3, salt: 1, rad: 1, seedOut: 2, earlyMat: 1, waterSeeds: 1 }, { flood: 3, seedOut: 1 }]) { s.render(st(t)); rows.push({ canvas: hash(s.canvas), expect: BLOOM.plantSpecimen.draw(st(t), { species: sp || undefined }).sig }); }
    s.highlight("stem"); const hl = { canvas: hash(s.canvas), expect: BLOOM.plantSpecimen.draw(s.state, { highlight: "stem", species: sp || undefined }).sig };
    out[id] = { rows, hl, pack: s.pack, plan: s.plan, species: s.species, dataPack: s.el.dataset.pack, dataPlan: s.el.dataset.plan, anchors: s.anchors().filter(a => a.client).length }; }
  try { BLOOM.plantSpecimen.mount(document.body, { species: { id: "x", art: { bodyPlan: "reed@1", pack: "organic-hybrid" } } }); out.refused = false; } catch (e) { out.refused = e instanceof TypeError; }
  out.boxes = document.querySelectorAll(".ps").length; return out; })();</script>`);
    for (const bn of BROWSERS) { let browser; try { browser = await pw[bn].launch(); } catch (e) { check(false, `[${bn}] B0 · ${bn} launches`, e.message.split("\n")[0]); continue; }
      const p = await browser.newPage({ viewport: { width: 1400, height: 800 } }), errs = []; p.on("pageerror", e => errs.push(e.message)); p.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
      { const w = await browser.newPage(); await w.goto("file://" + encodeURI(page)); await w.waitForTimeout(800); await w.close(); }   // a fresh headless Chromium can lose its first page's 2D contexts
      await p.goto("file://" + encodeURI(page)); await p.waitForFunction(() => window.__R, null, { timeout: 20000 }); const R = await p.evaluate(() => window.__R);
      const nodeOk = Object.entries(SPECIES).every(([id, sp]) => R[id].rows.every((r, k) => r.canvas === r.expect && r.expect === PS.draw({ traits: [{}, { cold: 2, heat: 1, drought: 3, salt: 1, rad: 1, seedOut: 2, earlyMat: 1, waterSeeds: 1 }, { flood: 3, seedOut: 1 }][k], names: {}, preview: null, colony: { living: true, establishment: 1, word: "" }, focus: "balanced", local: null, condition: "ok", viable: true }, { species: sp }).sig));
      const attrs = Object.entries(SPECIES).every(([id, sp]) => R[id].pack === sp.art.pack && R[id].plan === sp.art.bodyPlan && R[id].dataPack === sp.art.pack && R[id].dataPlan === sp.art.bodyPlan && R[id].species === id && R[id].hl.canvas === R[id].hl.expect && R[id].anchors === 7);
      const dflt = R.default.pack === "organic-hybrid" && R.default.plan === "oh-stem@1" && R.default.species === null && J(R.default.rows) === J(R.organic_hybrid.rows);
      PROOF.browsers[bn] = { version: browser.version(), species: Object.fromEntries(Object.keys(SPECIES).map(id => [id, R[id].rows.map(r => r.canvas)])) };
      check(nodeOk && attrs && dflt && R.refused && R.boxes === 5 && !errs.length, `[${bn} ${browser.version()}] B1 · file://: BLOOM.plantSpecimen.mount(host, { species }) for organic_hybrid · cinder_rosette · woolly_candle · reed_spire paints canvas pixels == the Node frame (three builds each, + a highlight); sp.pack / sp.plan / sp.species and data-pack / data-plan carry the species art; no species = Organic Hybrid (identical pixels to the explicit species); a mismatched species is refused (TypeError) and mounts nothing; no console error`, J({ nodeOk, attrs, dflt, refused: R.refused, boxes: R.boxes, errs: errs.slice(0, 2) }));
      await browser.close(); }
    fs.rmSync(dir, { recursive: true, force: true }); }

  // ---------------------------------------------------------------- evidence: TEMPORARY ENGINEERING PROOF contact sheets (Node-rendered, exact frames)
  if (EVIDENCE) { fs.mkdirSync(EVD, { recursive: true });
    const FONT = { "A": "0x1f,0x24,0x44,0x24,0x1f", "B": "0x7f,0x49,0x49,0x49,0x36", "C": "0x3e,0x41,0x41,0x41,0x22", "D": "0x7f,0x41,0x41,0x22,0x1c", "E": "0x7f,0x49,0x49,0x49,0x41", "F": "0x7f,0x48,0x48,0x48,0x40", "G": "0x3e,0x41,0x49,0x49,0x2e", "H": "0x7f,0x08,0x08,0x08,0x7f", "I": "0x00,0x41,0x7f,0x41,0x00", "J": "0x02,0x01,0x41,0x7e,0x40", "K": "0x7f,0x08,0x14,0x22,0x41", "L": "0x7f,0x01,0x01,0x01,0x01", "M": "0x7f,0x20,0x18,0x20,0x7f", "N": "0x7f,0x10,0x08,0x04,0x7f", "O": "0x3e,0x41,0x41,0x41,0x3e", "P": "0x7f,0x48,0x48,0x48,0x30", "Q": "0x3e,0x41,0x45,0x42,0x3d", "R": "0x7f,0x48,0x4c,0x4a,0x31", "S": "0x32,0x49,0x49,0x49,0x26", "T": "0x40,0x40,0x7f,0x40,0x40", "U": "0x7e,0x01,0x01,0x01,0x7e", "V": "0x7c,0x02,0x01,0x02,0x7c", "W": "0x7e,0x01,0x0e,0x01,0x7e", "X": "0x63,0x14,0x08,0x14,0x63", "Y": "0x70,0x08,0x07,0x08,0x70", "Z": "0x43,0x45,0x49,0x51,0x61",
      "0": "0x3e,0x45,0x49,0x51,0x3e", "1": "0x00,0x21,0x7f,0x01,0x00", "2": "0x21,0x43,0x45,0x49,0x31", "3": "0x42,0x41,0x51,0x69,0x46", "4": "0x0c,0x14,0x24,0x7f,0x04", "5": "0x72,0x51,0x51,0x51,0x4e", "6": "0x1e,0x29,0x49,0x49,0x06", "7": "0x40,0x47,0x48,0x50,0x60", "8": "0x36,0x49,0x49,0x49,0x36", "9": "0x30,0x49,0x49,0x4a,0x3c",
      " ": "0,0,0,0,0", "-": "0x08,0x08,0x08,0x08,0x08", "+": "0x08,0x08,0x3e,0x08,0x08", ".": "0x00,0x03,0x03,0x00,0x00", "@": "0x3e,0x41,0x5d,0x55,0x1c", "/": "0x03,0x04,0x08,0x10,0x60", "(": "0x00,0x1c,0x22,0x41,0x00", ")": "0x00,0x41,0x22,0x1c,0x00", ":": "0x00,0x36,0x36,0x00,0x00", "=": "0x14,0x14,0x14,0x14,0x14" };
    const sheet = (rows, k, title) => { const cw = 84 * k + 6, ch = 98 * k + 22, W = Math.max(...rows.map(r => r.cells.length)) * cw + 150, H = rows.length * ch + 34, o = new Uint8Array(W * H * 4).fill(255);
      const txt = (s, x, y, col = [30, 30, 30]) => { for (const c of s.toUpperCase()) { const g = (FONT[c] || FONT[" "]).split(",").map(Number); g.forEach((bits, gx) => { for (let gy = 0; gy < 7; gy++) if (bits & (0x40 >> gy)) { const i = ((y + gy) * W + x + gx) * 4; if (x + gx < W && y + gy < H) { o[i] = col[0]; o[i + 1] = col[1]; o[i + 2] = col[2]; } } }); x += 6; } };
      txt(title, 6, 6, [160, 40, 20]);
      rows.forEach((r, ri) => { txt(r.label, 6, 34 + ri * ch + 40); r.cells.forEach((c, ci) => { const x0 = 150 + ci * cw, y0 = 24 + ri * ch;
        for (let y = 0; y < 98 * k; y++) for (let x = 0; x < 84 * k; x++) { const i = ((y / k | 0) * 84 + (x / k | 0)) * 4, j = ((y0 + y) * W + x0 + x) * 4; o[j] = c.rgba[i]; o[j + 1] = c.rgba[i + 1]; o[j + 2] = c.rgba[i + 2]; }
        txt(c.cap, x0, y0 + 98 * k + 4); }); });
      return png(W, H, o); };
    const fr = (plan, pack, t, c = "thriving") => (plan === "oh-stem" ? PV.components : PV.grammars[plan]).select(PV.model.normalize({ traits: t, condition: c }, RULES));
    const cells = (plan, pack, list) => list.map(([cap, t, c]) => ({ cap, rgba: PC.render(fr(plan, pack, t, c), pack).rgba }));
    const LIST = [["BASE", {}], ["COLD 1", { cold: 1 }], ["COLD 3", { cold: 3 }], ["HEAT 3", { heat: 3 }], ["DROUGHT 3", { drought: 3 }], ["FLOOD 3", { flood: 3 }], ["SALT+COLD 2", { salt: 1, cold: 2 }], ["RAD", { rad: 1 }],
      ["SEED 2+EARLY", { seedOut: 2, earlyMat: 1 }], ["WATERBORNE", { waterSeeds: 1 }], ["MAX DRY", { cold: 2, heat: 1, drought: 3, salt: 1, rad: 1, seedOut: 2, earlyMat: 1, waterSeeds: 1 }], ["MAX WET", { cold: 2, heat: 1, flood: 3, salt: 1, rad: 1, seedOut: 2, earlyMat: 1, waterSeeds: 1 }], ["STRAINED", {}, "strained"]];
    const ROWS = [["oh-stem", "organic-hybrid", "ORGANIC HYBRID (UNCHANGED)"], ["rosette", "proof-cinder-rosette", "ROSETTE@1 PROOF"], ["candle", "proof-woolly-candle", "CANDLE@1 PROOF"], ["reed", "proof-reed-spire", "REED@1 PROOF"]];
    fs.writeFileSync(path.join(EVD, "01-contact-sheet-all-plans-2x.png"), sheet(ROWS.map(([pl, pk, label]) => ({ label, cells: cells(pl, pk, LIST) })), 2, "TEMPORARY ENGINEERING PROOF - NOT FINAL ART - BLOOM-035B-5 BODY PLANS (ORGANIC HYBRID ROW = THE APPROVED ART, UNCHANGED)"));
    const SEL = Object.values(SPECIES).map(sp => ({ cap: sp.id.replace(/_/g, " "), rgba: PS.drawSpecies(sp).rgba }));
    fs.writeFileSync(path.join(EVD, "02-species-selection-specimens-4x.png"), sheet([{ label: "DRAWSPECIES()", cells: SEL }], 4, "TEMPORARY ENGINEERING PROOF - NOT FINAL ART - SPECIES SPECIMENS"));
    for (const [pl, pk, label] of ROWS.slice(1)) fs.writeFileSync(path.join(EVD, `03-${pl}-architectures-3x.png`), sheet([{ label, cells: cells(pl, pk, [["OPEN", {}], ["COLD 1", { cold: 1 }], ["COLD 2", { cold: 2 }], ["COLD 3", { cold: 3 }], ["HEAT 1", { heat: 1 }], ["HEAT 2", { heat: 2 }], ["DROUGHT 1", { drought: 1 }], ["FLOOD 1", { flood: 1 }]]) }], 3, `TEMPORARY ENGINEERING PROOF - NOT FINAL ART - ${label}`));
    const hl = []; for (const sp of Object.values(SPECIES)) hl.push({ label: sp.id.replace(/_/g, " ").toUpperCase(), cells: PS.PARTS.map(part => { const d = PS.draw({ traits: { seedOut: 2, earlyMat: 1, waterSeeds: 1, cold: 1 }, colony: { living: true, establishment: 0.6 }, condition: "ok", viable: true }, { highlight: part, species: sp }), o = new Uint8Array(d.rgba);
      const a = d.anchors[part]; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const i = ((a.y + dy) * 84 + a.x + dx) * 4; if (i >= 0 && i < o.length) { o[i] = 230; o[i + 1] = 20; o[i + 2] = 20; } } return { cap: part, rgba: o }; }) });
    fs.writeFileSync(path.join(EVD, "04-part-highlights-and-anchors-2x.png"), sheet(hl, 2, "TEMPORARY ENGINEERING PROOF - SEVEN PARTS: HIGHLIGHT + ANCHOR (RED) PER SPECIES"));
    const B = await import(path.join(ROOT, "tools/build-plant-art.mjs"));
    for (const [, pk] of ROWS.slice(1)) { const im = B.decodePNG(fs.readFileSync(path.join(ROOT, `art/plant/packs/${pk}/atlas.png`))), k = 3, W = im.w * k, H = im.h * k, o = new Uint8Array(W * H * 4);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = ((y / k | 0) * im.w + (x / k | 0)) * 4, j = (y * W + x) * 4, a = im.rgba[i + 3]; const bg = ((x >> 3) + (y >> 3)) % 2 ? 236 : 248; o[j] = a ? im.rgba[i] : bg; o[j + 1] = a ? im.rgba[i + 1] : bg; o[j + 2] = a ? im.rgba[i + 2] : bg; }
      fs.writeFileSync(path.join(EVD, `05-source-atlas-${pk}-3x.png`), png(W, H, o)); } }

  PROOF.results = RESULTS; PROOF.summary = { passes, fails, seconds: Math.round((Date.now() - t0) / 1000), browsers: BROWSERS, quick: QUICK };
  if (EVIDENCE) fs.writeFileSync(path.join(EVD, "body-plan-proof.json"), JSON.stringify(PROOF, (k, v) => v instanceof Set ? [...v] : v, 1) + "\n");
  console.log(`\n${fails ? "FAIL" : "OK"} — ${passes}/${passes + fails} checks passed (${PROOF.summary.seconds} s)`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
