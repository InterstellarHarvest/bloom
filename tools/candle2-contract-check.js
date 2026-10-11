// BLOOM — candle@2 contract revision check (BLOOM-035C2). docs/species-art-briefs/WOOLLY_CANDLE_ART_BRIEF_v2.md §0.
//
//   node tools/candle2-contract-check.js
//
// Woolly Candle's production body plan REVISION candle@2 = the SAME anatomy, grammar, sockets and gameplay as candle@1 at production authoring
// resolution (the PMO-locked larger native maxima). Proves, in Node, with the PMO-accepted woolly-candle pack (BLOOM-035C2):
//   V · version separation — candle@1's plan, contract, grammar, proof pack and brief v1 are byte-identical to the 035C2 base; candle@1 and
//       candle@2 coexist in the generated atlas and each pack resolves to its own revision; malformed / unknown revisions are refused.
//   K · the contract — the same registry as candle@1 except maxSize; every maxSize is EXACTLY the PMO production maximum.
//   S · sockets — the same sockets, axes and coordinates as candle@1 (the accepted art was composed on them); trunk crowns = the art's tips.
//   C · the build's static clip proof with the real pack; every drawing within its maximum; the accepted actual-size exceptions; per-component
//       clearance of the real sprites at their tightest socket.
//   E · the COMPLETE legal-model enumeration (6720) with the real pack; each design §2.4 axis visibly distinct; the specimen draws woolly_candle.
//   X · the species uses it (woolly_candle → woolly-candle / candle@2, released); the v2 brief matches the engine; the intake lane follows it.
"use strict";
const path = require("path"), fs = require("fs"), cp = require("child_process");
const ROOT = path.resolve(__dirname, "..");
const BASE = "e534750f62962b4cb23ee63886e1ef29bbae442a";   // origin/main at the start of BLOOM-035C2
const PACK = "woolly-candle", PLAYER = "proof-woolly-candle", FINAL_STATUS = "WOOLLY CANDLE — FINAL ART (PMO-approved; tools/intake-plant-art.mjs)";
const EXCEPTIONS = { "seedHead.large": { canvas: [24, 22] }, "root.storage.3": { canvas: [18, 28], stubRows: 1 } };   // PMO-accepted actual sizes: 24 × 22; 18 × 27 + a 1-px stub
// the PMO-locked candle@2 production maxima (BLOOM-035C2) — the contract must carry exactly these
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
  const Bd = await import(path.join(ROOT, "tools/build-plant-art.mjs")), I = await import(path.join(ROOT, "tools/intake-plant-art.mjs"));
  for (const f of ["content/config.js", "content/traits.js", "content/species.js", "resources/plant-visual/generated/plant-atlas.js", "resources/plant-visual/plant-visual-model.js", "resources/plant-visual/plant-components.js",
    "resources/plant-visual/plant-compositor.js", "resources/plant-visual/plant-fx.js", "resources/run-ui/plant-specimen.js"]) require(path.join(ROOT, f));
  const PROOF = {}; const PV = BLOOM.plantVisual, PC = BLOOM.plantCompositor, FX = BLOOM.plantFx, ART = BLOOM.plantArt, PS = BLOOM.plantSpecimen, RULES = PV.model.rules(BLOOM_DATA);
  const P1 = JSON.parse(read("art/plant/body-plans/candle.json")), P2 = JSON.parse(read("art/plant/body-plans/candle@2.json")), K1 = JSON.parse(read("art/plant/contracts/candle.json")), K2 = JSON.parse(read("art/plant/contracts/candle@2.json"));

  // ================================================================ V · version separation
  console.log("# V · version separation");
  { const frozen = ["art/plant/body-plans/candle.json", "art/plant/contracts/candle.json", "resources/plant-visual/grammars/candle.js", `art/plant/packs/${PLAYER}/atlas.json`, `art/plant/packs/${PLAYER}/atlas.png`, `art/plant/packs/${PLAYER}/README.md`, "docs/species-art-briefs/WOOLLY_CANDLE_ART_BRIEF_v1.md", "docs/species-art-briefs/WOOLLY_CANDLE_ART_BRIEF_v1.json"];
    const changed = frozen.filter(f => !fs.readFileSync(path.join(ROOT, f)).equals(cp.execSync(`git show ${BASE}:${f}`, { cwd: ROOT, maxBuffer: 64 << 20 })));
    check(!changed.length && P1.version === 1 && P1.contract === "art/plant/contracts/candle.json",
      `V1 · candle@1 preserved as historical / proof-compatibility material: its body plan, contract, grammar, proof pack (${PLAYER}) and brief v1 are byte-identical to the 035C2 base ${BASE.slice(0, 7)}`, changed.join(", ")); }
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
    const geo = J(Object.fromEntries(Object.entries(P1.architectures).map(([k, v]) => [k, v.axes]))) === J(Object.fromEntries(Object.entries(P2.architectures).map(([k, v]) => [k, v.axes]))) && J({ ...P1.roots, about: 0, storage: 0 }) === J({ ...P2.roots, about: 0, storage: 0 }) && J(P2.roots.storage) === J({ dx: 0, dy: 1 }) && J(P1.roots.storage) === J({ dx: 0, dy: 2 });
    check(J(a) === J(b) && structure && keep && geo && so2.length === so1.length && J(moved.map(s => s.socket)) === J(["primaryRoot"]),
      `S1 · the same ${so2.length} sockets as candle@1 in every architecture (name, attach kind, side, angle), the same axes, roots, canvas 84×98, soil row 68, crown 42,68, angles, specimen anchors and local colony layer; ONE attachment offset — primaryRoot (storage dy 2 → 1: the accepted 18 × 28-canvas storage organ keeps ≥ 1 px margin); every other socket at its candle@1 coordinates`, J(moved.map(s => s.socket))); }
  { const A = JSON.parse(read(`art/plant/packs/${PACK}/atlas.json`)), rows = Object.entries(P2.architectures).map(([aid, Ar]) => { const tr = Ar.axes.find(x => x.kind === "sprite"), sp = A.sprites.find(x => x.id === tr.body);
      return { aid, body: tr.body, top: tr.top, tip: [sp.points.tip[0] - sp.anchor[0], sp.points.tip[1] - sp.anchor[1]], size: sp.rect.slice(2) }; });
    check(rows.every(r => J(r.top) === J(r.tip)) && J(rows.map(r => r.top[1])) === J([-28, -27, -26, -25]),
      `S2 · each architecture's trunk crown point is exactly the accepted trunk drawing's tip (points.tip − anchor) — ${rows.map(r => `${r.aid} ${r.body} ${r.size.join("×")} top [${r.top}]`).join(" · ")}`); }

  // ================================================================ C · static clip proof (the build) + the proof pack
  console.log("# C · static clip proof");
  const built = Bd.buildPlantArt(ROOT), MAN = built.manifest;
  { const committed = ["resources/plant-visual/generated/plant-atlas.js", "resources/plant-visual/generated/plant-atlas-manifest.json", "resources/plant-visual/plant-components.js"].every(f => built.files && fs.readFileSync(path.join(ROOT, f)).equals(built.files[f]));
    const A = JSON.parse(read(`art/plant/packs/${PACK}/atlas.json`)), cov = MAN.packs[PACK], over = A.sprites.filter(s => s.rect[2] > K2.components[s.component].maxSize[0] || s.rect[3] > K2.components[s.component].maxSize[1]);
    const img = Bd.decodePNG(fs.readFileSync(path.join(ROOT, `art/plant/packs/${PACK}/atlas.png`))), opaqueBox = s => { let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1; const [rx, ry, w, h] = s.rect; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (img.rgba[((ry + y) * img.w + rx + x) * 4 + 3]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return [x1 - x0 + 1, y1 - y0 + 1]; };
    const ex = Object.entries(EXCEPTIONS).map(([id, e]) => { const sp = A.sprites.find(x => x.id === id); return { id, canvas: sp.rect.slice(2), art: opaqueBox(sp), ok: J(sp.rect.slice(2)) === J(e.canvas) }; });
    check(!built.errors.length && committed && cov.bodyPlan === "candle@2" && !cov.missing.length && cov.authored === 58 && !over.length && ex.every(e => e.ok) && A.status === FINAL_STATUS,
      `C1 · the plant-art build passes (committed generated files == a clean rebuild) with the PMO-accepted ${PACK} pack (${A.status}): 58 drawings (${cov.sprites} runtime sprites with baked left twins), every one within its candle@2 maximum, every component × angle × side present, body crown points exact; static clip proof ${cov.placementsProven} placements inside 84×98; accepted actual-size exceptions ${ex.map(e => `${e.id} ${e.art.join("×")} art on a ${e.canvas.join("×")} canvas`).join(", ")}`, J({ errors: built.errors.slice(0, 3), over: over.map(s => s.id), ex })); }
  { const pack = ART.packs[PACK], so = PC.sockets(ART.bodyPlans["candle@2"], ART.contracts["candle@2"].canvas), cl = {}, side = k => k.endsWith("@left") ? -1 : k.endsWith("@right") ? 1 : 0, pts = Object.entries(pack.sprites).filter(([, sp]) => sp.attach === "leafPoint");
    const note = (sp, x0, y0, at) => { const c = Math.min(x0, y0, 84 - (x0 + sp.w), 98 - (y0 + sp.h)); if (!cl[sp.component] || c < cl[sp.component].c) cl[sp.component] = { c, at }; };
    for (const [k, sp] of Object.entries(pack.sprites)) { if (sp.attach === "leafPoint") continue; for (const q of so.filter(q => q.attach === sp.attach && (!side(k) || q.side === side(k)))) { const x0 = q.x - sp.ax, y0 = q.y - sp.ay; note(sp, x0, y0, `${q.layout}/${q.socket}`);
      if (sp.attach === "radialLeaf") for (const p of [sp.points.tip, ...sp.points.margin].filter(Boolean)) for (const [, ps] of pts) note(ps, x0 + p[0] - ps.ax, y0 + p[1] - ps.ay, `${k.split("@")[0]} point at ${q.layout}/${q.socket}`); } }
    const rows = Object.entries(cl).sort((a, b) => a[1].c - b[1].c);
    PROOF.clearance = Object.fromEntries(rows.map(([k, v]) => [k, v]));
    check(rows.every(([, v]) => v.c >= 0), `C2 · per-component clearance of the accepted sprites at their tightest socket (rect inside the canvas everywhere); tightest: ${rows.slice(0, 5).map(([k, v]) => `${k} ${v.c} px (${v.at})`).join(" · ")}`); }

  // ================================================================ E · the complete legal-model enumeration
  console.log("# E · complete legal-model enumeration (candle@2, the accepted woolly-candle pack)");
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
      `E1 · EVERY legal model of candle@2 (${r.models} = ${MODELS.length / 2} legal genomes × thriving / strained) renders with the accepted ${PACK} pack: only contract components, plan architectures and axes; every one of the ${r.placements} sprite placements on a plan socket of its own attach kind (or a leaf point); nothing clipped, min margin ${r.minMargin} px (≥ 1); deterministic; every treatment (pigment, wax, toothed) rendered; alpha 255 and every thriving plant pixel EXACTLY its palette colour; every non-body component reached — ${r.selections.size} distinct selections, ${r.anatomies.size} distinct thriving anatomies`, J(r.bad)); }
  { const AX = { cold: [1, 2, 3], heat: [1, 2, 3], drought: [1, 2, 3], flood: [1, 2, 3], salt: [1], rad: [1], seedOut: [1, 2], earlyMat: [1], waterSeeds: [1] }, fr = (t, c = "thriving") => PC.render(g.select(PV.model.normalize({ traits: t, condition: c }, RULES)), PACK);
    const base = fr({}), bad = [], steps = [];
    for (const [id, tiers] of Object.entries(AX)) { let prev = base; for (const n of tiers) { const F = fr({ [id]: n }), d = FX.diff(base, F).length, step = FX.diff(prev, F).length; steps.push(Math.min(d, step)); if (F.sig.full === base.sig.full || d < 6 || step < 6) bad.push(`${id}${n}: ${d}/${step}`); prev = F; } }
    if (fr({}, "strained").sig.full === base.sig.full) bad.push("strained = thriving");
    for (const arm of ["drought", "flood"]) for (const n of [4, 5, 9]) if (fr({ [arm]: n }).sig.full !== fr({ [arm]: 3 }).sig.full) bad.push(`${arm}${n} ≠ T3`);
    check(!bad.length, `E2 · design §2.4 on candle@2: each single trait at each tier (Cold, Heat, Drought, Flood T1–T3, Salt, Radiation, Seed Output T1–T2, Early Maturity, Waterborne Seeds) differs from the unmutated plant AND the tier below (≥ 6 px; min ${Math.min(...steps)}); strained ≠ thriving; Drought / Flood T4 · T5 · T9 = T3`, bad.join(", ")); }
  { const sp = (Array.isArray(BLOOM_DATA.species) ? BLOOM_DATA.species : Object.values(BLOOM_DATA.species)).find(s => s.id === "woolly_candle"), bad = [], d1 = PS.drawSpecies(sp), d2 = PS.drawSpecies(sp);
    if (!(d1.w === 84 && d1.h === 98 && d1.signature === d2.signature && d1.plan === "candle@2" && d1.pack === PACK)) bad.push("drawSpecies");
    const room = t => ({ traits: t, names: {}, preview: null, colony: { living: true, establishment: 0.6, word: "" }, focus: "balanced", local: null, condition: "ok", viable: true });
    for (const t of [{}, { cold: 3 }, { cold: 2, heat: 1, drought: 3, salt: 1, rad: 1, seedOut: 2, earlyMat: 1, waterSeeds: 1 }, { cold: 3, flood: 3, salt: 1, seedOut: 2, earlyMat: 1, waterSeeds: 1 }]) { const d = PS.draw(room(t), { species: sp });
      for (const part of PS.PARTS) { const a = d.anchors[part], i = a && a.y * d.W + a.x; if (!a || !(d.frame.plant.m[i] || d.extras.has(i))) bad.push(`${J(t)} ${part} anchor`); if (PS.draw(room(t), { highlight: part, species: sp }).sig === d.sig) bad.push(`${J(t)} ${part} highlight`); } }
    check(!bad.length, "E3 · the production specimen draws the released woolly_candle species: 84×98, deterministic, plan candle@2, pack woolly-candle; every one of the seven part anchors lands on the anatomy and every highlight shows, for the base, Cold T3 and two maximal models", bad.slice(0, 4).join("; ")); }

  // ================================================================ X · not exposed; brief; lane
  console.log("# X · not exposed · brief · intake lane");
  { const defs = BLOOM_DATA.species, woolly = (Array.isArray(defs) ? defs : Object.values(defs)).find(s => s.id === "woolly_candle"), A = JSON.parse(read(`art/plant/packs/${PACK}/atlas.json`)), stale = fs.existsSync(path.join(ROOT, "art/plant/packs/proof-woolly-candle-c2"));
    check(woolly && woolly.status === "released" && woolly.art.bodyPlan === "candle@2" && woolly.art.pack === PACK && A.bodyPlan === "candle@2" && A.status === FINAL_STATUS && !stale,
      `X1 · woolly_candle is released on ${PACK} (candle@2, "${FINAL_STATUS}"); the temporary candle@2 engineering pack is gone; ${PLAYER} (candle@1) stays only as proof-compatibility material`); }
  { const r = cp.spawnSync(process.execPath, ["tools/build-plant-art.mjs", "--briefs", "--check"], { cwd: ROOT, encoding: "utf8" }), B = JSON.parse(read("docs/species-art-briefs/WOOLLY_CANDLE_ART_BRIEF_v2.json")), md = read("docs/species-art-briefs/WOOLLY_CANDLE_ART_BRIEF_v2.md");
    const maxOk = B.components.every(c => J(c.maxSize) === J(PMO[c.id])) && B.revision.maxima.every(m => J(m.v2) === J(PMO[m.id]));
    check(r.status === 0 && B.bodyPlan === "candle@2" && B.newPack === "woolly-candle" && B.replacesPack === PLAYER && B.clipProof.proofPack === null && maxOk && /The ONLY artistic change from brief v1 is the increased native resolution/.test(md) && /previously approved Woolly Candle visual design remains the source of truth/.test(md),
      `X2 · docs/species-art-briefs/WOOLLY_CANDLE_ART_BRIEF_v2.{md,json} match the engine (briefs --check), body plan candle@2, pack woolly-candle, the finalized maxima = the contract = the PMO table, and state that the only artistic change is native resolution with the approved design as source of truth`, (r.stdout + r.stderr).trim().split("\n").pop()); }
  { const L = I.lane(ROOT, "woolly-candle"), list = I.lanes(ROOT);
    check(!L.errors.length && L.ref === "candle@2" && L.brief.endsWith("WOOLLY_CANDLE_ART_BRIEF_v2.json") && L.drawings.length === 58 && list.filter(l => l.pack === "woolly-candle").length === 1,
      "X3 · the woolly-candle intake lane follows the newest brief (v2): body plan candle@2, its contract's 58 drawings and batches; exactly one woolly-candle lane", J(L.errors.slice(0, 3))); }

  console.log(`\n${fails ? "FAIL" : "OK"} — candle2-contract-check: ${passes} passed, ${fails} failed (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
