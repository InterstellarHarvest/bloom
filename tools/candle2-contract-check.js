// BLOOM — candle@2 contract revision check (BLOOM-035C2A). docs/species-art-briefs/WOOLLY_CANDLE_ART_BRIEF_v2.md §0.
//
//   node tools/candle2-contract-check.js
//
// Woolly Candle's production body plan REVISION candle@2 = the SAME anatomy, grammar, sockets (by name / attach kind) and gameplay as
// candle@1 at production authoring resolution (larger native component maxima). Proves, in Node, with the temporary engineering proof pack
// proof-woolly-candle-c2 (every drawing at its FULL candle@2 maximum):
//   V · version separation — candle@1's plan, contract, grammar and player proof pack are byte-identical to the 035C2A base; candle@1 and
//       candle@2 coexist in the generated atlas and each pack resolves to its own revision; an unknown revision (candle@3) is refused.
//   K · the contract — the same registry as candle@1 except maxSize; every maxSize is EXACTLY the PMO candle@2 maximum (none reduced).
//   S · sockets — the same sockets per architecture as candle@1 (names, attach kinds, sides, angles); only coordinates moved; vertical budget.
//   C · the static clip proof — the build passes with every drawing at its full maximum (placements counted), every sprite at every socket.
//   E · the COMPLETE legal-model enumeration (6720 = every legal genome × thriving / strained): grammar names only contract components and
//       plan sockets, every sprite on a socket of its own attach kind, nothing clipped, ≥ 1 px from every edge, deterministic, every treatment
//       rendered, exact palette, binary alpha; each design §2.4 axis visibly distinct; the specimen draws a candle@2 species.
//   X · not exposed — content/species.js keeps woolly_candle on proof-woolly-candle / candle@1; no player surface names the c2 pack; the
//       engineering pack is marked TEMPORARY; the v2 brief matches the engine and the woolly-candle intake lane follows it.
"use strict";
const path = require("path"), fs = require("fs"), cp = require("child_process");
const ROOT = path.resolve(__dirname, "..");
const BASE = "e534750f62962b4cb23ee63886e1ef29bbae442a";   // origin/main at the start of BLOOM-035C2A
const PACK = "proof-woolly-candle-c2", PLAYER = "proof-woolly-candle", PROOF_STATUS = "TEMPORARY PIPELINE PROOF — NOT FINAL ART";
// the PMO candle@2 target maxima (BLOOM-035C2A directive) — the contract must carry exactly these (no clip-proof reduction was needed)
const PMO = { "body.trunk.0": [24, 40], "body.trunk.1": [24, 40], "body.trunk.2": [24, 40], "body.trunk.3": [24, 40], "leaf.base": [20, 20], "leaf.base.heat": [20, 20],
  "leaf.drought.1": [19, 20], "leaf.drought.2": [18, 20], "leaf.drought.3": [17, 20], "leaf.flood.1": [21, 20], "leaf.flood.2": [22, 21], "leaf.flood.3": [22, 21],
  "frost.hair.1": [5, 6], "frost.hair.2": [7, 8], "frost.hair.3": [9, 10], "frost.collar.2": [25, 9], "frost.collar.3": [29, 11], "root.storage.2": [16, 24], "root.storage.3": [18, 28],
  "root.aerial.1": [7, 10], "root.aerial.2": [9, 14], "root.aerial.3": [11, 18], "root.stilt": [14, 16], "salt.crystal": [9, 9], "salt.gland": [5, 5], bud: [12, 14], flower: [20, 22],
  "seedHead.small": [16, 18], "seedHead.large": [24, 24], "seed.drift": [10, 10], pod: [14, 17] };
for (const s of ["drought.1", "drought.2", "drought.3", "flood.1", "flood.2", "flood.3"]) PMO[`leaf.${s}.heat`] = PMO[`leaf.${s}`];   // a .heat variant = its structure's maximum
const J = JSON.stringify, read = f => fs.readFileSync(path.join(ROOT, f), "utf8");
const git = a => cp.execSync(`git ${a}`, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 << 20 });
let fails = 0, passes = 0; const t0 = Date.now();
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); ok ? passes++ : fails++; };

(async () => {
  const Bd = await import(path.join(ROOT, "tools/build-plant-art.mjs")), MP = await import(path.join(ROOT, "art/plant/proof-packs/make-proof-packs.mjs")), I = await import(path.join(ROOT, "tools/intake-plant-art.mjs"));
  for (const f of ["content/config.js", "content/traits.js", "content/species.js", "resources/plant-visual/generated/plant-atlas.js", "resources/plant-visual/plant-visual-model.js", "resources/plant-visual/plant-components.js",
    "resources/plant-visual/plant-compositor.js", "resources/plant-visual/plant-fx.js", "resources/run-ui/plant-specimen.js"]) require(path.join(ROOT, f));
  const PV = BLOOM.plantVisual, PC = BLOOM.plantCompositor, FX = BLOOM.plantFx, ART = BLOOM.plantArt, PS = BLOOM.plantSpecimen, RULES = PV.model.rules(BLOOM_DATA);
  const P1 = JSON.parse(read("art/plant/body-plans/candle.json")), P2 = JSON.parse(read("art/plant/body-plans/candle@2.json")), K1 = JSON.parse(read("art/plant/contracts/candle.json")), K2 = JSON.parse(read("art/plant/contracts/candle@2.json"));

  // ================================================================ V · version separation
  console.log("# V · version separation");
  { const frozen = ["art/plant/body-plans/candle.json", "art/plant/contracts/candle.json", "resources/plant-visual/grammars/candle.js", `art/plant/packs/${PLAYER}/atlas.json`, `art/plant/packs/${PLAYER}/atlas.png`, `art/plant/packs/${PLAYER}/README.md`, "docs/species-art-briefs/WOOLLY_CANDLE_ART_BRIEF_v1.md", "docs/species-art-briefs/WOOLLY_CANDLE_ART_BRIEF_v1.json"];
    const changed = frozen.filter(f => !fs.readFileSync(path.join(ROOT, f)).equals(cp.execSync(`git show ${BASE}:${f}`, { cwd: ROOT, maxBuffer: 64 << 20 })));
    check(!changed.length && P1.version === 1 && P1.contract === "art/plant/contracts/candle.json",
      `V1 · candle@1 preserved: its body plan, contract, grammar, player proof pack (${PLAYER}) and brief v1 are byte-identical to the 035C2A base ${BASE.slice(0, 7)}`, changed.join(", ")); }
  { const r1 = PC.planOf(PLAYER), r2 = PC.planOf(PACK), c1 = ART.contracts.candle, c2 = ART.contracts["candle@2"];
    let refused = false; try { PS.drawSpecies({ id: "x", art: { bodyPlan: "candle@3", pack: PACK } }); } catch (e) { refused = e instanceof TypeError; }
    let wrong = false; try { PS.drawSpecies({ id: "x", art: { bodyPlan: "candle@1", pack: PACK } }); } catch (e) { wrong = e instanceof TypeError; }
    check(`${r1.id}@${r1.version}` === "candle@1" && `${r2.id}@${r2.version}` === "candle@2" && r2.key === "candle@2" && r1.key === undefined && ART.bodyPlans.candle.ref === "candle@1" && ART.bodyPlans["candle@2"].ref === "candle@2"
      && c1.components["leaf.base"].maxSize.join() === "14,14" && c2.components["leaf.base"].maxSize.join() === "20,20" && P2.id === "candle" && P2.version === 2 && P2.grammar === "candle" && P2.contract === "art/plant/contracts/candle@2.json" && refused && wrong,
      `V2 · candle@1 and candle@2 coexist (art/plant/body-plans/candle.json + candle@2.json; generated bodyPlans / contracts keys "candle" and "candle@2"): ${PLAYER} → candle@1, ${PACK} → candle@2, each with its own contract; the same grammar "candle"; candle@3 and a candle@1 species on the c2 pack are refused (TypeError)`); }
  { let refused = []; const tmp = fs.mkdtempSync(path.join(require("os").tmpdir(), "bloom-c2-"));
    try { for (const rel of ["art/plant", "resources/plant-visual", "tools/build-plant-art.mjs"]) fs.cpSync(path.join(ROOT, rel), path.join(tmp, rel), { recursive: true });
      const p = path.join(tmp, "art/plant/body-plans/candle@2.json"), orig = fs.readFileSync(p, "utf8");
      fs.writeFileSync(p, orig.replace('"version": 2', '"version": 3')); refused.push(Bd.buildPlantArt(tmp).errors.some(e => /must declare version <n> ≥ 2/.test(e)));
      fs.writeFileSync(p, orig.replace('"version": 2', '"version": 1')); refused.push(Bd.buildPlantArt(tmp).errors.some(e => /declared twice|must declare version/.test(e)));
      fs.writeFileSync(p, orig); fs.copyFileSync(p, path.join(tmp, "art/plant/body-plans/candle@3.json")); refused.push(Bd.buildPlantArt(tmp).errors.some(e => /must declare version <n> ≥ 2/.test(e)));
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
    check(refused.length === 3 && refused.every(Boolean), "V3 · the build refuses a malformed revision: a candle@2.json declaring version 3, one declaring version 1 (a duplicate of candle@1), and a candle@3.json declaring version 2", J(refused)); }

  // ================================================================ K · the contract
  console.log("# K · the candle@2 contract");
  { const strip = c => { const o = Object.assign({}, c); delete o.maxSize; return o; }, diff = [];
    for (const k of ["format", "plan", "shared", "sharedKeys", "angles", "layers", "proceduralLayers", "families", "visualCap"]) if (J(K1[k]) !== J(K2[k])) diff.push(k);
    if (J(Object.keys(K1.attach)) !== J(Object.keys(K2.attach))) diff.push("attach kinds");
    if (J(Object.keys(K1.components)) !== J(Object.keys(K2.components))) diff.push("component ids / order");
    for (const id of Object.keys(K1.components)) if (K2.components[id] && J(strip(K1.components[id])) !== J(strip(K2.components[id]))) diff.push(id);
    check(!diff.length, `K1 · the candle@2 registry is candle@1's: the same ${Object.keys(K1.components).length} components (family, category, attach, layer, orientation, mirror, angles, trait / tier, points, masks), angles, layers, families, attach kinds, visual cap and shared keys — only maxSize differs`, diff.join(", ")); }
  { const bad = Object.entries(K2.components).filter(([id, c]) => J(c.maxSize) !== J(PMO[id])).map(([id, c]) => `${id} ${c.maxSize} ≠ PMO ${PMO[id]}`), grew = Object.entries(K2.components).filter(([id, c]) => c.maxSize[0] < K1.components[id].maxSize[0] || c.maxSize[1] < K1.components[id].maxSize[1]);
    check(!bad.length && !grew.length && Object.keys(PMO).length === Object.keys(K2.components).length,
      `K2 · every candle@2 maxSize is EXACTLY the PMO target maximum (${Object.keys(PMO).length} components; none reduced by the clip proof, none smaller than candle@1) — trunk 24×40 · base / heat leaves 20×20 · drought 19/18/17×20 · flood 21×20, 22×21, 22×21 · frost hairs 5×6, 7×8, 9×10 · collars 25×9, 29×11 · storage 16×24, 18×28 · aerial 7×10, 9×14, 11×18 · stilt 14×16 · salt 9×9, 5×5 · bud 12×14 · flower 20×22 · seed heads 16×18, 24×24 · drift 10×10 · pod 14×17`, bad.concat(grew.map(([id]) => `${id} shrank`)).join("; ")); }

  // ================================================================ S · sockets + geometry
  console.log("# S · sockets");
  const so1 = PC.sockets(ART.bodyPlans.candle, ART.contracts.candle.canvas), so2 = PC.sockets(ART.bodyPlans["candle@2"], ART.contracts["candle@2"].canvas);
  { const sig = s => `${s.layout}|${s.socket}|${s.attach}|${s.side}|${s.angle || ""}`, a = so1.map(sig).sort(), b = so2.map(sig).sort(), moved = so2.filter(s => { const o = so1.find(q => q.layout === s.layout && q.socket === s.socket); return o && (o.x !== s.x || o.y !== s.y); });
    const same = (x, y) => J(x) === J(y), structure = Object.keys(P1.architectures).every(aid => same(P1.architectures[aid].axes.map(a => [a.id, a.kind, a.from, a.at, a.part, a.body, Object.keys(a.sockets || {}).map(k => [k, a.sockets[k].length])]), P2.architectures[aid].axes.map(a => [a.id, a.kind, a.from, a.at, a.part, a.body, Object.keys(a.sockets || {}).map(k => [k, a.sockets[k].length])])));
    const keep = same(P1.angles, P2.angles) && same(P1.canvas, P2.canvas) && same(P1.ground, P2.ground) && same(P1.crown, P2.crown) && same(P1.anchors, P2.anchors) && same(P1.local, P2.local) && same(P1.partLabels, P2.partLabels)
      && same(Object.keys(P1.architectures), Object.keys(P2.architectures)) && same({ ...P1.roots, about: 0, storage: 0, aerial: 0 }, { ...P2.roots, about: 0, storage: 0, aerial: 0 }) && P2.roots.aerial.dx.length === P1.roots.aerial.dx.length;
    check(J(a) === J(b) && structure && keep && so2.length === so1.length && moved.length > 0 && so2.every(s => s.x >= 0 && s.y >= 0 && s.x < 84 && s.y < 98),
      `S1 · the same ${so2.length} sockets as candle@1 in every architecture (name, attach kind, side, angle), the same axes (kind, origin, part, body drawing, socket groups and counts), canvas 84×98, soil row 68, crown 42,68, angles, specimen anchors, local colony layer and taproot numbers; only coordinates moved (${moved.length} sockets), all on the canvas`); }
  { const rows = Object.fromEntries(Object.entries(P2.architectures).map(([aid, A]) => { const tr = A.axes.find(x => x.kind === "sprite"), col = A.axes.find(x => x.id === "column"), apex = so2.find(s => s.layout === aid && s.socket === "column.apex");
      return [aid, { top: tr.top[1], column: col.height, budget: -tr.top[1] + col.height, apexY: apex.y, largeHeadTop: apex.y - (PMO["seedHead.large"][1] - 1) }]; }));
    check(Object.values(rows).every(r => r.budget <= 43 && r.largeHeadTop >= 1) && rows.open.top < P1.architectures.open.axes[0].top[1],
      `S2 · vertical budget: trunk crown height |top| + column height ≤ 43 in every architecture, so the 24-row seed head on the column apex keeps ≥ 1 px of sky; the trunk crowns rose with the larger trunk (open −28 → ${rows.open.top}) — ${Object.entries(rows).map(([k, r]) => `${k} top ${r.top} + column ${r.column} = ${r.budget}, large head top row ${r.largeHeadTop}`).join(" · ")}`); }

  // ================================================================ C · static clip proof (the build) + the proof pack
  console.log("# C · static clip proof");
  const built = Bd.buildPlantArt(ROOT), MAN = built.manifest;
  { const committed = ["resources/plant-visual/generated/plant-atlas.js", "resources/plant-visual/generated/plant-atlas-manifest.json", "resources/plant-visual/plant-components.js"].every(f => built.files && fs.readFileSync(path.join(ROOT, f)).equals(built.files[f]));
    const A = JSON.parse(read(`art/plant/packs/${PACK}/atlas.json`)), atMax = A.sprites.filter(s => J(s.rect.slice(2)) === J(K2.components[s.component].maxSize)).length, cov = MAN.packs[PACK];
    const regen = MP.makeAll(ROOT)[PACK], same = J(regen.atlas) === J(A) && Buffer.from(regen.rgba).equals(Buffer.from(Bd.decodePNG(fs.readFileSync(path.join(ROOT, `art/plant/packs/${PACK}/atlas.png`))).rgba));
    check(!built.errors.length && committed && cov.bodyPlan === "candle@2" && !cov.missing.length && cov.authored === 58 && atMax === 58 && cov.placementsProven > 5000 && same,
      `C1 · the plant-art build passes (committed generated files == a clean rebuild) with ${PACK}: 58 drawings (${cov.sprites} runtime sprites with baked left twins), EVERY drawing at its full candle@2 maximum (${atMax}/58), every component × angle × side present, body crown points exact; static clip proof ${cov.placementsProven} placements — every sprite at every socket of its attach kind and every leaf-point detail on every leaf drawing inside 84×98; the pack equals a clean regeneration`, J(built.errors.slice(0, 3))); }
  { const R = JSON.parse(read("docs/species-art-briefs/WOOLLY_CANDLE_ART_BRIEF_v2.json")).revision, tight = R.maxima.filter(m => m.clearanceAtMax !== null).sort((a, b) => a.clearanceAtMax - b.clearanceAtMax);
    check(R.maxima.every(m => m.clearanceAtMax === null || m.clearanceAtMax >= 1) && R.reduced.length === 0,
      `C2 · per-component clearance at the full maximum ≥ 1 px everywhere (the drawing at its maximum, at its tightest socket); tightest: ${tight.slice(0, 4).map(m => `${m.id} ${m.clearanceAtMax} px (${m.tightest})`).join(" · ")}`); }

  // ================================================================ E · the complete legal-model enumeration
  console.log("# E · complete legal-model enumeration (candle@2, full-size proof pack)");
  const genomes = () => { const out = [], W = [{}, { drought: 1 }, { drought: 2 }, { drought: 3 }, { flood: 1 }, { flood: 2 }, { flood: 3 }];
    for (let c = 0; c <= 3; c++) for (let h = 0; h + c <= 3; h++) for (const w of W) for (const salt of [0, 1]) for (const rad of [0, 1]) for (const seedOut of [0, 1, 2]) for (const earlyMat of [0, 1]) for (const waterSeeds of [0, 1])
      out.push(Object.assign({}, c ? { cold: c } : {}, h ? { heat: h } : {}, w, salt ? { salt } : {}, rad ? { rad } : {}, seedOut ? { seedOut } : {}, earlyMat ? { earlyMat } : {}, waterSeeds ? { waterSeeds } : {})); return out; };
  const MODELS = []; for (const t of genomes()) for (const c of ["thriving", "strained"]) MODELS.push({ traits: t, condition: c });
  const g = PV.grammars.candle, C = ART.contracts["candle@2"], Pl = ART.bodyPlans["candle@2"], pal = ART.packs[PACK].palette, socks = new Map(PC.planSockets(Pl, C.canvas).map(s => [`${s.layout}|${s.socket}`, s]));
  const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
  { const r = { models: 0, selections: new Set(), anatomies: new Set(), bad: [], badN: 0, minMargin: Infinity, placements: 0, treatments: new Set(), comps: new Set() };
    for (const m of MODELS) { let S, F, F2; r.models++;
      try { S = g.select(PV.model.normalize(m, RULES)); F = PC.render(S, PACK); F2 = PC.render(g.select(PV.model.normalize(m, RULES)), PACK); } catch (e) { r.badN++; if (r.bad.length < 4) r.bad.push(`${J(m)}: ${e.message}`); continue; }
      r.selections.add(S.key); if (m.condition === "thriving") r.anatomies.add(F.sig.anatomy); S.treatments.forEach(t => r.treatments.add(t.id));
      const err = [], arch = Pl.architectures[S.architecture];
      if (S.plan !== "candle" || F.plan !== "candle") err.push("plan");
      for (const c of S.components) { if (!C.components[c]) err.push(`component ${c} not in contract`); r.comps.add(c); }
      if (!arch) err.push(`architecture ${S.architecture}`); else for (const a of S.axes) if (!arch.axes.some(x => x.id === a)) err.push(`axis ${a}`);
      for (const q of F.placements) { if (q.kind !== "sprite") continue; r.placements++;
        if (!q.socket.endsWith(":point")) { const s = socks.get(`${S.architecture}|${q.socket}`) || socks.get(`*|${q.socket}`); if (!s || s.attach !== q.sp.attach || s.x !== q.anchor.x || s.y !== q.anchor.y) err.push(`socket ${q.socket}`); } }
      const margin = Math.min(F.bbox.x0, F.bbox.y0, F.W - 1 - F.bbox.x1, F.H - 1 - F.bbox.y1); r.minMargin = Math.min(r.minMargin, margin);
      if (F.W !== 84 || F.H !== 98 || F.clip || margin < 1) err.push(`clip ${F.clip} margin ${margin}`);
      if (F.sig.full !== F2.sig.full || !same(F.rgba, F2.rgba)) err.push("not deterministic");
      if (F.unrendered.length) err.push(`unrendered ${F.unrendered}`);
      for (let i = 0; i < F.plant.m.length; i++) { if (F.rgba[i * 4 + 3] !== 255) { err.push("alpha"); break; } const v = F.plant.m[i]; if (!v) continue; const ramp = pal[ART.materials[(v >> 2) - 1]], h = ramp && ramp[v & 3]; if (!h) { err.push(`material ${v} not in palette`); break; }
        if (!S.stress) { const c = [1, 3, 5].map(k => parseInt(h.slice(k, k + 2), 16)); if (F.rgba[i * 4] !== c[0] || F.rgba[i * 4 + 1] !== c[1] || F.rgba[i * 4 + 2] !== c[2]) { err.push("non-palette pixel"); break; } } }
      if (err.length) { r.badN++; if (r.bad.length < 4) r.bad.push(`${J(m)}: ${err.slice(0, 3).join("; ")}`); } }
    const allComps = Object.keys(C.components).filter(c => !c.startsWith("body.")).every(c => r.comps.has(c));
    check(r.models === 6720 && !r.badN && r.minMargin >= 1 && allComps && ["pigment", "wax", "toothed"].every(t => r.treatments.has(t)),
      `E1 · EVERY legal model of candle@2 (${r.models} = ${MODELS.length / 2} legal genomes × thriving / strained) renders with the full-size proof pack: only contract components, plan architectures and axes; every one of the ${r.placements} sprite placements on a plan socket of its own attach kind (or a leaf point); nothing clipped, min margin ${r.minMargin} px (≥ 1); deterministic; every treatment (pigment, wax, toothed) rendered; alpha 255 and every thriving plant pixel EXACTLY its palette colour; every non-body component reached — ${r.selections.size} distinct selections, ${r.anatomies.size} distinct thriving anatomies`, J(r.bad)); }
  { const AX = { cold: [1, 2, 3], heat: [1, 2, 3], drought: [1, 2, 3], flood: [1, 2, 3], salt: [1], rad: [1], seedOut: [1, 2], earlyMat: [1], waterSeeds: [1] }, fr = (t, c = "thriving") => PC.render(g.select(PV.model.normalize({ traits: t, condition: c }, RULES)), PACK);
    const base = fr({}), bad = [], steps = [];
    for (const [id, tiers] of Object.entries(AX)) { let prev = base; for (const n of tiers) { const F = fr({ [id]: n }), d = FX.diff(base, F).length, step = FX.diff(prev, F).length; steps.push(Math.min(d, step)); if (F.sig.full === base.sig.full || d < 6 || step < 6) bad.push(`${id}${n}: ${d}/${step}`); prev = F; } }
    if (fr({}, "strained").sig.full === base.sig.full) bad.push("strained = thriving");
    for (const arm of ["drought", "flood"]) for (const n of [4, 5, 9]) if (fr({ [arm]: n }).sig.full !== fr({ [arm]: 3 }).sig.full) bad.push(`${arm}${n} ≠ T3`);
    check(!bad.length, `E2 · design §2.4 on candle@2: each single trait at each tier (Cold, Heat, Drought, Flood T1–T3, Salt, Radiation, Seed Output T1–T2, Early Maturity, Waterborne Seeds) differs from the unmutated plant AND the tier below (≥ 6 px; min ${Math.min(...steps)}); strained ≠ thriving; Drought / Flood T4 · T5 · T9 = T3`, bad.join(", ")); }
  { const sp = { id: "woolly_candle", art: { bodyPlan: "candle@2", pack: PACK } }, bad = [], d1 = PS.drawSpecies(sp), d2 = PS.drawSpecies(sp);
    if (!(d1.w === 84 && d1.h === 98 && d1.signature === d2.signature && d1.plan === "candle@2" && d1.pack === PACK)) bad.push("drawSpecies");
    const room = t => ({ traits: t, names: {}, preview: null, colony: { living: true, establishment: 0.6, word: "" }, focus: "balanced", local: null, condition: "ok", viable: true });
    for (const t of [{}, { cold: 3 }, { cold: 2, heat: 1, drought: 3, salt: 1, rad: 1, seedOut: 2, earlyMat: 1, waterSeeds: 1 }, { cold: 3, flood: 3, salt: 1, seedOut: 2, earlyMat: 1, waterSeeds: 1 }]) { const d = PS.draw(room(t), { species: sp });
      for (const part of PS.PARTS) { const a = d.anchors[part], i = a && a.y * d.W + a.x; if (!a || !(d.frame.plant.m[i] || d.extras.has(i))) bad.push(`${J(t)} ${part} anchor`); if (PS.draw(room(t), { highlight: part, species: sp }).sig === d.sig) bad.push(`${J(t)} ${part} highlight`); } }
    check(!bad.length, "E3 · the production specimen draws a candle@2 species (engineering object only — no species uses it): 84×98, deterministic, plan candle@2; every one of the seven part anchors lands on the anatomy and every highlight shows, for the base, Cold T3 and two maximal models", bad.slice(0, 4).join("; ")); }

  // ================================================================ X · not exposed; brief; lane
  console.log("# X · not exposed · brief · intake lane");
  { const defs = BLOOM_DATA.species, woolly = (Array.isArray(defs) ? defs : Object.values(defs)).find(s => s.id === "woolly_candle"), A = JSON.parse(read(`art/plant/packs/${PACK}/atlas.json`)), md = read(`art/plant/packs/${PACK}/README.md`);
    const surfaces = ["content/species.js", "index.html", "resources/species-select/species-select.js", "resources/run-ui/plant-specimen.js", "resources/run-ui/run-ui-adapter.js"].filter(f => read(f).includes(PACK) || read(f).includes("candle@2"));
    check(woolly && woolly.art.bodyPlan === "candle@1" && woolly.art.pack === PLAYER && !surfaces.length && A.status === PROOF_STATUS && A.title.includes("engineering only") && /TEMPORARY ENGINEERING PROOF/.test(A.about) && /hazard checker/.test(A.about) && md.includes("**Engineering only (BLOOM-035C2A).**"),
      `X1 · not exposed: content/species.js keeps woolly_candle on ${PLAYER} (candle@1); no player surface names ${PACK} or candle@2; the pack is "${PROOF_STATUS}", titled "engineering only", its about / README say TEMPORARY ENGINEERING PROOF and that it is not the player proof pack`, surfaces.join(", ")); }
  { const r = cp.spawnSync(process.execPath, ["tools/build-plant-art.mjs", "--briefs", "--check"], { cwd: ROOT, encoding: "utf8" }), B = JSON.parse(read("docs/species-art-briefs/WOOLLY_CANDLE_ART_BRIEF_v2.json")), md = read("docs/species-art-briefs/WOOLLY_CANDLE_ART_BRIEF_v2.md");
    const maxOk = B.components.every(c => J(c.maxSize) === J(PMO[c.id])) && B.revision.maxima.every(m => J(m.v2) === J(PMO[m.id]));
    check(r.status === 0 && B.bodyPlan === "candle@2" && B.newPack === "woolly-candle" && B.replacesPack === PLAYER && B.clipProof.proofPack === PACK && maxOk && /The ONLY artistic change from brief v1 is the increased native resolution/.test(md) && /previously approved Woolly Candle visual design remains the source of truth/.test(md),
      `X2 · docs/species-art-briefs/WOOLLY_CANDLE_ART_BRIEF_v2.{md,json} match the engine (briefs --check), body plan candle@2, pack woolly-candle, the finalized maxima = the contract = the PMO table, and state that the only artistic change is native resolution with the approved design as source of truth`, (r.stdout + r.stderr).trim().split("\n").pop()); }
  { const L = I.lane(ROOT, "woolly-candle"), list = I.lanes(ROOT);
    check(!L.errors.length && L.ref === "candle@2" && L.brief.endsWith("WOOLLY_CANDLE_ART_BRIEF_v2.json") && L.drawings.length === 58 && list.filter(l => l.pack === "woolly-candle").length === 1,
      "X3 · the woolly-candle intake lane follows the newest brief (v2): body plan candle@2, its contract's 58 drawings and batches; exactly one woolly-candle lane", J(L.errors.slice(0, 3))); }

  console.log(`\n${fails ? "FAIL" : "OK"} — candle2-contract-check: ${passes} passed, ${fails} failed (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
