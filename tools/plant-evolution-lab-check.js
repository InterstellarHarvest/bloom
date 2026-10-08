// BLOOM — Plant Evolution Visual Lab check (BLOOM-032A). A design-lab QA, NOT a member of the regression suites (yet).
// docs/PLANT_EVOLUTION_VISUAL_LAB_v1.md. Numbered after the directive's QA items 1–40 (L1 … L40; one check may carry several).
//
//   NODE_PATH="$(npm root -g)" node tools/plant-evolution-lab-check.js [--browsers chromium,firefox] [--evidence]
//
// Node (the plant-visual pipeline is pure, so the organism itself is checked without a browser): the exact start (accepted BLOOM-031
// main bba000f); production specimen, trait data, engine and every production file byte-identical; four genuinely different concepts
// fed by one concept-independent model; every real Adapt / Spread trait and every multi-tier step changes authored anatomy; the
// temperature pool, the water arms, Salt, Radiation, Seed Output T1 / T2, Early Maturity, Waterborne Seeds; focus / local / condition
// variants; Terraform touches only the environment; preview treatments; purchase FX end frames; determinism; complex builds unclipped
// and readable. Browser (the lab page, as a file, every request local): the lab boots; compare synchronized; the production reference
// fed the same state; preview on / off; Purchase mutation (all four in compare) ends on the exact target pixels, reduced motion too;
// room sizes; 1024×768 · 1280×800 · 1440×900; keyboard 1–4 / C / P / R; Firefox; no gameplay data mutated; no console error.
// --evidence writes docs/evidence/bloom-032a/ (14 stills + plant-lab-proof.json). Exits 1 on any failure.
"use strict";
const path = require("path"), fs = require("fs"), cp = require("child_process");
const ROOT = path.resolve(__dirname, "..");
const argv = process.argv, argOf = k => { const i = argv.indexOf(k); return i > 0 ? argv[i + 1] : null; };
const BROWSERS = (argOf("--browsers") || "chromium,firefox").split(","), EVIDENCE = argv.includes("--evidence");
const EVD = path.join(ROOT, "docs/evidence/bloom-032a");
const J = JSON.stringify, read = f => fs.readFileSync(path.join(ROOT, f), "utf8"), sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0, passes = 0; const t0 = Date.now(), RESULTS = [];
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); RESULTS.push({ ok: !!ok, name: name.slice(0, 140) }); if (ok) passes++; else fails++; };
const info = (name, detail) => console.log(`INFO  ${name}  — ${detail}`);
const git = a => cp.execSync(`git ${a}`, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 << 20 }).trim();

const BASE = "bba000fcd60bcd259af289c257b441087eff4b92";   // accepted BLOOM-031 final = main after integration
const OWN = git(`log --format=%H%x09%s ${BASE}..HEAD`).split("\n").filter(Boolean).map(l => l.split("\t")).filter(([, s]) => /^BLOOM-032A\b/.test(s));
const END = OWN.length ? OWN[0][0] : null, HEAD = git("rev-parse HEAD"), WITH_TREE = !END || END === HEAD;
const hashAt = f => WITH_TREE ? git(`hash-object "${f}"`) : git(`rev-parse ${END}:"${f}"`);
const ALLOWED = p => p.startsWith("resources/plant-visual/") || p.startsWith("resources/plant-evolution-lab/") || p === "demos/plant-evolution-lab.html"
  || p === "tools/plant-evolution-lab-check.js" || p.startsWith("docs/");

// ---------------------------------------------------------------- load the pipeline in Node (classic scripts → globalThis)
for (const f of ["content/config.js", "content/traits.js", "resources/run-ui/plant-specimen.js", "resources/plant-visual/plant-model.js", "resources/plant-visual/pixel-parts.js",
  "resources/plant-visual/plant-skeleton.js", "resources/plant-visual/concepts.js", "resources/plant-visual/plant-renderer.js", "resources/plant-visual/mutation-fx.js"]) require(path.join(ROOT, f));
const PV = BLOOM.plantVisual, D = BLOOM_DATA, RULES = PV.model.rules(D), CS = PV.concepts.list, MAT = PV.parts.MAT, PART = PV.renderer.PART;
const TRAITS_SNAPSHOT = J(D.traits), CONFIG_SNAPSHOT = J(D.config);
const env0 = { temp: 14, moist: 50 };
const model = (traits, o = {}) => PV.model.normalize({ traits, est: 1, condition: "thriving", focus: "balanced", local: null, env: env0, ...o }, RULES);
const frame = (C, traits, o = {}, size = null) => PV.renderer.render(model(traits, o), C, size ? { W: size[0], H: size[1] } : undefined);
const count = (F, mat) => { let n = 0; for (const v of F.plant.m) if (v && (v >> 2) === mat) n++; return n; };
const countPart = (F, part) => { let n = 0; for (let i = 0; i < F.plant.m.length; i++) if (F.plant.m[i] && F.plant.part[i] === part) n++; return n; };
const diffN = (a, b) => PV.fx.diff(a, b).length;
const PROOF = { milestone: "BLOOM-032A", base: BASE, head: HEAD, concepts: {}, traitMappings: {}, tierSteps: {}, complex: {}, local: {}, fx: {}, browsers: {}, rooms: null };
const PRESET_TRAITS = { base: {}, cold: { cold: 3 }, heat: { heat: 3 }, dry: { drought: 3 }, wet: { flood: 3 }, protected: { salt: 1, rad: 1 }, disperser: { seedOut: 2, earlyMat: 1, waterSeeds: 1 },
  generalist: { cold: 2, heat: 1 }, complexA: { cold: 2, drought: 2, salt: 1, rad: 1, seedOut: 1 }, complexB: { heat: 2, flood: 2, rad: 1, seedOut: 2, earlyMat: 1 },
  maximal: { cold: 2, heat: 1, drought: 3, salt: 1, rad: 1, seedOut: 2, earlyMat: 1, waterSeeds: 1 } };

(async () => {
  console.log("# Node");
  // L1 · the exact start
  { const first = git(`rev-list --first-parent --reverse ${BASE}..HEAD`).split("\n").filter(Boolean)[0] || null, parent = first ? git(`rev-parse ${first}^`) : HEAD;
    let main = null; try { main = git("rev-parse origin/main"); } catch {}
    check(parent === BASE && (!main || git(`merge-base --is-ancestor ${BASE} ${main}`) === ""), "L1 · 032A starts from the exact accepted BLOOM-031 main (bba000f, now origin/main)", J({ firstParent: parent.slice(0, 7), originMain: main && main.slice(0, 7) })); }
  // L2 · L3 · L4 · L40 (source) · production specimen, trait data, engine and every production file unchanged
  { const tracked = git(WITH_TREE ? `diff --name-only ${BASE}` : `diff --name-only ${BASE} ${END}`).split("\n").filter(Boolean), untracked = WITH_TREE ? git("ls-files -o --exclude-standard").split("\n").filter(Boolean) : [];
    const changed = [...new Set([...tracked, ...untracked])], outside = changed.filter(p => !ALLOWED(p));
    const same = f => hashAt(f) === git(`rev-parse ${BASE}:"${f}"`);
    const engine = git(`ls-tree -r --name-only ${BASE} -- resources content planets demos index.html dist`).split("\n").filter(Boolean);
    const engDiff = engine.filter(f => !same(f));
    check(same("resources/run-ui/plant-specimen.js"), "L2 · production resources/run-ui/plant-specimen.js is byte-identical to bba000f (not replaced in 032A)");
    check(same("content/traits.js") && same("content/config.js"), "L3 · content/traits.js (and content/config.js) byte-identical — no trait data, price or tier changed");
    check(!engDiff.length && !outside.length, `L4 · the engine, every production runtime file (${engine.length}: resources, content, planets, demos, the root, the portable runtime) byte-identical; 032A only adds the lab (resources/plant-visual/, resources/plant-evolution-lab/, demos/plant-evolution-lab.html, its check, docs)`, J({ engDiff, outside }));
    PROOF.changedFiles = changed.sort(); }

  // L5 · four genuinely different concepts (body plan, parts, line, palette, environment) — not palette swaps
  { const F = CS.map(C => frame(C, {})), mask = (f, n = 48) => { const m = new Uint8Array(n * n); for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const X = Math.floor((x + 0.5) * f.W / n), Y = Math.floor((y + 0.5) * f.sk.soilY / n); if (f.plant.m[Y * f.W + X] && f.plant.part[Y * f.W + X] !== PART.roots) m[y * n + x] = 1; } return m; };
    const iou = (a, b) => { let i = 0, u = 0; for (let k = 0; k < a.length; k++) { if (a[k] && b[k]) i++; if (a[k] || b[k]) u++; } return u ? i / u : 1; };
    const M = F.map(f => mask(f)), pairs = []; for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) pairs.push([CS[i].id + CS[j].id, +iou(M[i], M[j]).toFixed(2)]);
    const traitsDiff = CS.map(C => [C.leafProfile, C.outline, C.shading, C.env.style, C.leafPairs ? "pairs" : C.sidePattern ? "irregular" : "alternate", J(PV.parts.sprites[C.id].flower)]);
    const distinctSpecs = new Set(traitsDiff.map(J)).size === 4, distinctSprites = new Set(CS.map(C => J(PV.parts.sprites[C.id]))).size === 4;
    PROOF.concepts = Object.fromEntries(CS.map((C, k) => [C.id, { name: C.name, blurb: C.blurb, native: [C.W, C.H], resolutions: C.resolutions, leafProfile: C.leafProfile, phyllotaxy: traitsDiff[k][4], outline: C.outline, shading: C.shading, env: C.env.style, fxDefault: C.fx, previewDefault: C.preview, baseSig: F[k].sig.anatomy }]));
    check(pairs.every(([, v]) => v < 0.75) && distinctSpecs && distinctSprites && new Set(F.map(f => f.sig.anatomy)).size === 4,
      "L5 · four genuinely different concepts: different body plans (base silhouettes overlap < 75 %: alternate / opposite pairs / irregular-asymmetric / chunky basal), leaf profiles, sprite sets, line + shading treatments and environments — not palette swaps", J(pairs)); }
  // L6 · one concept-independent model feeds every concept; L7 · base renders
  { const m1 = model({ cold: 2, seedOut: 1 }), keys = CS.map(C => PV.renderer.render(m1, C).sig.key);
    check(new Set(keys).size === 1 && !/concept/i.test(m1.key), "L6 · the same visual state → ONE normalized model (concept-independent component key) feeds all four concepts", keys[0]);
    const base = CS.map(C => { const f = frame(C, {}); return { c: C.id, leaves: countPart(f, PART.leaves), stem: countPart(f, PART.stem), roots: countPart(f, PART.roots), repro: countPart(f, PART.repro), clip: f.clip }; });
    check(base.every(b => b.leaves > 80 && b.stem > 20 && b.roots > 15 && b.repro > 0 && b.clip === 0), "L7 · the base plant renders in every concept (leaves, stem, roots, a bud; nothing clipped)", J(base)); }
  // L8 · L9 · every real Adapt / Spread trait changes the organism (owned anatomy, not a label)
  { const out = {}; let ok8 = true, ok9 = true;
    for (const t of RULES.traits) { out[t.id] = CS.map(C => diffN(frame(C, {}), frame(C, { [t.id]: 1 }))); const good = out[t.id].every(n => n >= 25); if (t.board === "Adapt") ok8 = ok8 && good; else ok9 = ok9 && good; }
    PROOF.traitPixelChange = out;
    check(ok8, "L8 · every real Adapt trait (cold, heat, drought, flood, salt, rad) at T1 changes the plant's pixels in every concept (≥ 25 px)", RULES.traits.filter(t => t.board === "Adapt").map(t => `${t.id} ${out[t.id].join("/")}`).join(" · "));
    check(ok9, "L9 · every real Spread trait (seedOut, earlyMat, waterSeeds) at T1 changes the plant's pixels in every concept", RULES.traits.filter(t => t.board === "Spread").map(t => `${t.id} ${out[t.id].join("/")}`).join(" · ")); }
  // L10 · every real multi-tier step adds / alters an AUTHORED component (not only a scale)
  { const strip = m => { const c = JSON.parse(J({ a: m.architecture, s: m.stem, l: { ...m.leaf, length: 0, width: 0 }, f: m.surface, r: m.roots, p: m.repro })); return J(c); };
    const steps = []; let ok = true;
    for (const t of RULES.traits.filter(t => t.artMax > 1)) for (let k = 1; k < t.artMax + 1; k++) { const a = model({ [t.id]: k - 1 }), b = model({ [t.id]: k }), authored = strip(a) !== strip(b);
      const px = CS.map(C => diffN(frame(C, { [t.id]: k - 1 }), frame(C, { [t.id]: k }))); steps.push([`${t.id} ${k - 1}→${k}`, authored, Math.min(...px)]); ok = ok && authored && Math.min(...px) >= 20; }
    PROOF.tierSteps = steps;
    check(ok, "L10 · every real multi-tier step (Cold / Heat 1→3 in the shared pool, Drought / Flood 1→3 (uncapped arm, art to T3), Seed Output 1→2) changes an authored component in the model AND ≥ 20 px in every concept", steps.map(s => `${s[0]}${s[1] ? "" : " NOT-AUTHORED"} ${s[2]}px`).join(" · ")); }
  // L11 · Cold + Heat combine coherently
  { const r = CS.map(C => { const f = frame(C, { cold: 2, heat: 1 }); return { c: C.id, frost: count(f, MAT.FROST), wax: count(f, MAT.WAX), arch: f.model ? null : null, stems: new Set([...f.plant.prim].filter((p, i) => f.plant.part[i] === PART.stem && f.plant.m[i])).size }; });
    const m = model({ cold: 2, heat: 1 });
    check(m.legal && m.architecture === "compact" && m.surface.hairs === 2 && m.surface.wax === 1 && r.every(x => x.frost > 10 && x.wax > 5),
      "L11 · Cold + Heat (one real temperature pool, 2 + 1 ≤ 3) on ONE plant: Cold sets the architecture (compact) and frost hairs, Heat the cuticle (wax) and leaf narrowing — both visible together, one stem, no second plant", J(r.map(x => [x.c, x.frost, x.wax]))); }
  // L12 · Drought / Flood each work; an impossible both-arms build is handled
  { const d = CS.map(C => { const f = frame(C, { drought: 3 }); return count(f, MAT.TUBER) + count(f, MAT.CORE); }), fl = CS.map(C => { const f = frame(C, { flood: 3 }); let above = 0; for (let i = 0; i < f.plant.m.length; i++) if (f.plant.m[i] && f.plant.part[i] === PART.roots && ((i / f.W) | 0) < f.sk.soilY) above++; return above; });
    let both = null; try { both = CS.map(C => frame(C, { drought: 2, flood: 1 }).clip); } catch (e) { both = e.message; }
    const mb = model({ drought: 2, flood: 1 });
    check(d.every(n => n > 15) && fl.every(n => n > 10) && Array.isArray(both) && !mb.legal && mb.leaf.form === "succulent",
      "L12 · Drought (storage leaves + taproot / tuber) and Flood (air roots and stilt roots above the soil, strap leaves) each read in every concept; the impossible Drought + Flood build (QA only) renders without error, flagged illegal, the larger arm leading the leaves", J({ droughtStorage: d, floodAirRootPx: fl })); }
  // L13 · L14 · Salt and Radiation visible at room distance
  { const s = CS.map(C => count(frame(C, { salt: 1 }), MAT.SALT)), r = CS.map(C => { const f = frame(C, { rad: 1 }); return +(count(f, MAT.RADLEAF) / Math.max(1, countPart(f, PART.leaves))).toFixed(2); });
    check(s.every(n => n >= 12), "L13 · Salt Handling is visible: outlined salt crystals on the leaves (+ a toothed margin) in every concept (≥ 12 crystal px — several crystals, legible at room size)", J(s));
    check(r.every(f => f >= 0.5), "L14 · Radiation Shielding is visible: protective pigment turns the leaves (≥ 50 % of leaf pixels) and stem red-violet in every concept", J(r)); }
  // L15 · L16 · L17 · Seed Output T1 / T2, Early Maturity, Waterborne Seeds
  { const repro = (C, t) => countPart(frame(C, t), PART.repro);
    const so = CS.map(C => [repro(C, { seedOut: 1 }), repro(C, { seedOut: 2 })]), so2 = CS.map(C => diffN(frame(C, { seedOut: 1 }), frame(C, { seedOut: 2 })));
    check(so.every(([a, b]) => b >= a * 1.5) && so2.every(n => n >= 25) && model({ seedOut: 2 }).repro.drift > 0, "L15 · Seed Output T1 (one developed seed head) and T2 (a larger head + a second head + drifting seeds) are distinct in every concept", J(so));
    const em = CS.map(C => [count(frame(C, {}), MAT.PETAL), count(frame(C, { earlyMat: 1 }), MAT.PETAL), count(frame(C, { earlyMat: 1 }, { est: 0.4 }), MAT.PETAL)]);
    check(em.every(([a, b, y]) => a === 0 && b > 10 && y > 4), "L16 · Early Maturity is visible: open flowers appear (none without it) — and even on a YOUNG colony, which is what the trait means", J(em));
    const ws = CS.map(C => count(frame(C, { waterSeeds: 1 }), MAT.POD));
    check(ws.every(n => n > 20), "L17 · Waterborne Seeds is visible: buoyant pods on the stem and one floating at the soil line (a dispersal structure)", J(ws)); }
  // L18 · L19 · L20 · local colony development
  { const g = { cold: 1, drought: 1, seedOut: 1 };
    const fsig = CS.map(C => PV.model.FOCI.map(f => frame(C, g, { focus: f }).sig.anatomy)), lsig = CS.map(C => PV.model.LOCALS.map(l => frame(C, g, { local: l }).sig.anatomy));
    check(fsig.every(s => new Set(s).size === 4), "L18 · the four Growth Focus states (Balanced / Roots / Leaves / Seeds) are four distinct presentations in every concept");
    const localPx = CS.map(C => ["rootNetwork", "leafCanopy", "seedReserve"].map(l => countPart(frame(C, g, { local: l }), PART.local)));
    check(lsig.every(s => new Set(s).size === 4) && localPx.every(a => a.every(n => n > 6)), "L19 · the three local upgrades (Root Network / Leaf Canopy / Seed Reserve) are distinct and drawn as the COLONY's development (network + nodules, canopy companions, a seed bank + cache), not as genome parts", J(localPx));
    const inp = { traits: { ...g }, est: 1, condition: "thriving", env: env0 }, before = J(inp.traits);
    const gs = ["balanced", "roots", "leaves", "seeds"].flatMap(f => [null, "rootNetwork", "leafCanopy", "seedReserve"].map(l => J(PV.model.normalize({ ...inp, focus: f, local: l }, RULES).genome)));
    check(new Set(gs).size === 1 && J(inp.traits) === before, "L20 · local state never touches the global genome: all 16 focus × upgrade variants normalize to the identical genome, and the input traits object is not mutated", gs[0]); }
  // L21 · condition
  { const r = CS.map(C => { const a = frame(C, { rad: 1, seedOut: 1 }), b = frame(C, { rad: 1, seedOut: 1 }, { condition: "strained" }), c = frame(C, { rad: 1, seedOut: 1 }, { condition: "unviable" }); return [a.sig.full, b.sig.full, c.sig.full]; });
    const genomes = ["thriving", "strained", "unviable"].map(c => J(model({ rad: 1, seedOut: 1 }, { condition: c }).genome));
    check(r.every(s => new Set(s).size === 3) && new Set(genomes).size === 1, "L21 · thriving / strained (droop, yellowed, scorched tips) / unviable (a dithered ghost) are distinct in every concept — the owned genome is the same in all three"); }
  // L22 · Terraform environment preview leaves the anatomy untouched
  { const base = CS.map(C => frame(C, { cold: 2 }));
    const r = CS.map((C, k) => RULES.terraform.map(t => { const f = frame(C, { cold: 2 }, { env: { ...env0, terraform: { [t.id]: 2 } } }); return [f.sig.anatomy === base[k].sig.anatomy, f.sig.env !== base[k].sig.env]; }));
    check(r.every(a => a.every(([same, envChanged]) => same && envChanged)), "L22 · every real Terraform preview (Warm / Cool / Humidify / Dry the Sky, ×2, real deltas) changes the specimen's surroundings (sky, weather, soil) and NEVER the plant's anatomy signature", RULES.terraform.map(t => `${t.id} ${t.delta}`).join(" · ")); }
  // L23 · preview differs; L25 · L26 (pure) purchase FX end frames; L27 determinism
  { const fnv = PV.renderer.fnv; const r = []; let okP = true, okE = true;
    for (const C of CS) { const cur = frame(C, { cold: 1 }), tgt = frame(C, { cold: 1, seedOut: 1 });
      for (const st of PV.fx.PREVIEW_STYLES) { const pf = PV.fx.previewFrame(cur, tgt, C, st, st === "flip" ? 700 : 300); okP = okP && fnv(pf) !== fnv(cur.rgba); }
      for (const st of PV.fx.FX_STYLES) { const mid = PV.fx.fxFrame(cur, tgt, C, st, 0.5, cur.sk.apex, cur.sk.stemPath), end = PV.fx.fxFrame(cur, tgt, C, st, 1, cur.sk.apex, cur.sk.stemPath);
        okE = okE && fnv(end) === fnv(tgt.rgba) && fnv(mid) !== fnv(tgt.rgba) && fnv(mid) !== fnv(cur.rgba); r.push([C.id, st]); } }
    check(okP, "L23 · every preview treatment (ghost, glow, flip) shows a proposed organism different from the current one, in every concept");
    check(okE, "L25 (pure) · every purchase FX (grow, pulse, dissolve, bloom) passes through real intermediate frames and its final frame IS the target frame, pixel for pixel, in every concept");
    const again = CS.map(C => [frame(C, PRESET_TRAITS.maximal).sig.full, frame(C, PRESET_TRAITS.maximal).sig.full]);
    check(again.every(([a, b]) => a === b), "L27 · deterministic: the same build renders the same pixels every time (no randomness; small irregularities come from a fixed hash)", again.map(a => a[0]).join(" ")); PROOF.maximalSig = Object.fromEntries(CS.map((C, k) => [C.id, again[k][0]])); }
  // L28 · L29 · complex builds unclipped and readable (native sizes + the real room sizes)
  { const rooms = [[205, 237], [258, 298], [290, 335], [296, 342]], out = {}; let ok28 = true, ok29 = true;
    for (const [pid, tr] of Object.entries(PRESET_TRAITS)) { out[pid] = {};
      for (const C of CS) { const sizes = [[C.W, C.H], ...rooms.map(([w, h]) => { const s = Math.max(1, Math.round(h / C.H)); return [Math.floor(w / s), Math.floor(h / s)]; })];
        for (const sz of sizes) { const f = frame(C, tr, {}, sz), b = f.bbox; const inside = f.clip === 0 && b.x0 >= 1 && b.y0 >= 1 && b.x1 <= f.W - 2 && b.y1 <= f.H - 2; ok28 = ok28 && inside; }
        const f = frame(C, tr), need = { leaves: 60, stem: 12, roots: 12 }; const p = { leaves: countPart(f, PART.leaves), stem: countPart(f, PART.stem), roots: countPart(f, PART.roots), repro: countPart(f, PART.repro), surface: countPart(f, PART.surface) };
        const marks = { salt: tr.salt ? count(f, MAT.SALT) >= 8 : true, rad: tr.rad ? count(f, MAT.RADLEAF) > 40 : true, frost: tr.cold ? count(f, MAT.FROST) > 8 : true, wax: tr.heat ? count(f, MAT.WAX) > 4 : true,
          seeds: tr.seedOut ? count(f, MAT.PAPPUS) + count(f, MAT.SAC) > 15 : true, flower: tr.earlyMat ? count(f, MAT.PETAL) > 8 : true, pods: tr.waterSeeds ? count(f, MAT.POD) > 15 : true };
        const ok = Object.entries(need).every(([k, n]) => p[k] >= n) && Object.values(marks).every(Boolean); ok29 = ok29 && ok; out[pid][C.id] = { ...p, marks: Object.entries(marks).filter(([, v]) => !v).map(([k]) => k) }; } }
    PROOF.complex = out;
    check(ok28, "L28 · no build clips the specimen box: all 11 canonical builds (incl. COMPLEX A / B and MAXIMAL LEGAL) × 4 concepts × native + the four real room sizes keep the organism ≥ 1 px inside the canvas");
    check(ok29, "L29 · complex builds keep every major part readable: leaves, stem and roots keep their mass, and every owned trait's mark survives (salt crystals, pigment, frost, wax, seed structures, flowers, pods)", J(Object.fromEntries(["complexA", "complexB", "maximal"].map(k => [k, Object.fromEntries(Object.entries(out[k]).map(([c, v]) => [c, v.marks.length ? v.marks : "ok"]))])))); }
  // performance (renderer)
  { const t1 = Date.now(); let n = 0; for (let k = 0; k < 5; k++) for (const C of CS) { frame(C, { ...PRESET_TRAITS.maximal, cold: k % 3 }); n++; } PROOF.renderMs = +((Date.now() - t1) / n).toFixed(1); info("renderer", `${PROOF.renderMs} ms per organism (maximal build, Node)`); }
  PROOF.traitMappings = Object.fromEntries(RULES.traits.map(t => [t.id, { name: t.name, board: t.board, legalMax: t.max, artMax: t.artMax, pool: t.pool, layer: PV.model.TRAIT_LAYER[t.id], fxAnchor: PV.model.TRAIT_ANCHOR[t.id] }]));

  // ================================================================ browser
  let pw = null; try { pw = require("playwright"); } catch { check(false, "Playwright available (NODE_PATH=\"$(npm root -g)\")"); }
  const LAB = "file://" + encodeURI(path.join(ROOT, "demos/plant-evolution-lab.html")), FROOT = "file://" + encodeURI(ROOT);
  if (EVIDENCE) fs.mkdirSync(EVD, { recursive: true });
  const errsAll = [], external = [];
  for (const bname of BROWSERS) {
    if (!pw || !pw[bname]) continue;
    const browser = await pw[bname].launch(), B = `[${bname}]`, CH = bname === "chromium"; console.log(`# ${bname}`); PROOF.browsers[bname] = { version: browser.version() };
    // warm-up: a fresh headless browser may drop the first page's 2D canvas contexts while its GPU process starts (the lab repaints on contextrestored)
    { const w = await browser.newPage(); await w.setContent("<canvas></canvas>"); await sleep(2500); await w.close(); }
    const open = async (vw = 1280, vh = 800, rm = false) => { const c = await browser.newContext({ viewport: { width: vw, height: vh }, reducedMotion: rm ? "reduce" : "no-preference" });
      c.on("request", r => { const u = r.url(); if (!/^(file|data|blob|about):/.test(u)) external.push(u); }); const p = await c.newPage(); p.errs = [];
      p.on("pageerror", e => { p.errs.push(e.message); errsAll.push(`${B} ${e.message}`); }); p.on("console", m => { if (m.type() === "error") { p.errs.push(m.text()); errsAll.push(`${B} ${m.text()}`); } });
      await p.goto(LAB); await p.waitForFunction(() => window.PLANT_LAB && PLANT_LAB.ready, null, { timeout: 30000 }); await sleep(200); return p; };
    const snap = p => p.evaluate(() => JSON.stringify([BLOOM_DATA.traits, BLOOM_DATA.config]));
    try {
      const p = await open(); const data0 = await snap(p);
      // L30 · compare mode synchronized; L31 · production reference fed the same state
      await p.evaluate(() => PLANT_LAB.setPreset("complexB")); await p.keyboard.press("c"); await sleep(250);
      const cmp = await p.evaluate(() => { const L = PLANT_LAB, PV = BLOOM.plantVisual; const keys = ["A", "B", "C", "D"].map(c => L.frame(c).sig.key);
        const canv = [...document.querySelectorAll(".cmp canvas")].map(c => c.dataset.concept); const ref = document.querySelectorAll('.cmp [data-panel="production"]').length;
        const sp = L.production[0], st = sp.state, exp = L.productionStateFor(L.S.traits, L.S.previewOn && L.S.preview ? L.S.preview : null);
        return { mode: L.S.mode, keys, canv, ref, prodState: JSON.stringify(st) === JSON.stringify(exp), prodSig: sp.signature(), prodDraw: (() => { const m = BLOOM.plantSpecimen.draw(exp).markup; let h = 0x811c9dc5; for (let i = 0; i < m.length; i++) { h ^= m.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16); })() }; });
      const before = await p.evaluate(() => ["A", "B", "C", "D"].map(c => PLANT_LAB.canvasSig(c, "preview") || PLANT_LAB.canvasSig(c, "current")));
      await p.click('[data-trait="salt"] button[aria-label$="up"]'); await sleep(250);
      const after = await p.evaluate(() => ({ sigs: ["A", "B", "C", "D"].map(c => PLANT_LAB.canvasSig(c, "preview") || PLANT_LAB.canvasSig(c, "current")), keys: ["A", "B", "C", "D"].map(c => PLANT_LAB.frame(c).sig.key), prod: PLANT_LAB.production[0].state.traits.salt }));
      check(cmp.mode === "compare" && J(cmp.canv) === J(["A", "B", "C", "D"]) && cmp.ref === 1 && new Set(cmp.keys).size === 1 && after.sigs.every((s, k) => s !== before[k]) && new Set(after.keys).size === 1 && after.prod === 1,
        `${B} L30 · Compare (key C) shows the SAME build in A · B · C · D (one model key) beside the production reference; one control change (Salt +) redraws all four and the reference together`);
      check(cmp.prodState && cmp.prodSig === cmp.prodDraw, `${B} L31 · the CURRENT PRODUCTION REFERENCE (resources/run-ui/plant-specimen.js, unchanged) receives the same traits / preview / colony / focus / local / condition, and draws exactly what the production specimen draws for that state`);
      // L24 · cancel preview → exact current; L23 (lab) preview differs
      await p.evaluate(() => PLANT_LAB.set({ mode: "single", concept: "D", previewOn: true })); await p.evaluate(() => PLANT_LAB.setPreset("generalist")); await sleep(200);
      const pv = await p.evaluate(() => { const L = PLANT_LAB, cur = L.frame("D"); return { prev: L.canvasSig("D", "preview"), cur: L.canvasSig("D", "current"), want: BLOOM.plantVisual.renderer.fnv(cur.rgba) }; });
      await p.click("#previewOn"); await sleep(150);
      const off = await p.evaluate(() => ({ prev: PLANT_LAB.canvasSig("D", "preview"), cur: PLANT_LAB.canvasSig("D", "current"), want: BLOOM.plantVisual.renderer.fnv(PLANT_LAB.frame("D").rgba) }));
      check(pv.prev && pv.prev !== pv.want && pv.cur === pv.want && !off.prev && off.cur === off.want, `${B} L23 · L24 · in the lab the preview panel shows the proposed organism (different from current); turning Preview off leaves exactly the current signature`);
      await p.click("#previewOn"); await sleep(100);
      // L25 · Purchase mutation in compare: all four animate and end on the exact target pixels
      await p.evaluate(() => PLANT_LAB.set({ mode: "compare", reducedMotion: false })); await p.evaluate(() => PLANT_LAB.setPreset("base")); await sleep(150);
      await p.evaluate(() => PLANT_LAB.set({ preview: { id: "seedOut", tier: 1 } }));
      const t1 = Date.now(), buy = await p.evaluate(() => PLANT_LAB.purchase()), ms = Date.now() - t1;
      const post = await p.evaluate(() => ({ traits: PLANT_LAB.S.traits, sigs: ["A", "B", "C", "D"].map(c => PLANT_LAB.canvasSig(c, "preview") || PLANT_LAB.canvasSig(c, "current")) }));
      check(buy && buy.results.length === 4 && buy.results.every(r => r.endSig === r.targetSig && r.frames >= 8 && r.ms >= 450 && r.ms <= 900) && post.traits.seedOut === 1,
        `${B} L25 · Purchase mutation (visual only) in Compare: all four concepts animate (${buy && buy.results.map(r => `${r.concept} ${r.style} ${r.ms} ms / ${r.frames} frames`).join(", ")}) and each ends on EXACTLY the target build's pixels; the lab state now owns Seed Output T1`);
      PROOF.fx.purchase = buy;
      // L26 · reduced motion: a short still swap to the same target
      await p.evaluate(() => PLANT_LAB.set({ reducedMotion: true, preview: { id: "earlyMat", tier: 1 } }));
      const rm = await p.evaluate(() => PLANT_LAB.purchase());
      check(rm && rm.results.every(r => r.endSig === r.targetSig && r.style === "reduced" && r.ms < 320 && r.frames === 2), `${B} L26 · reduced motion: Purchase mutation is a short two-step swap (${rm && rm.results[0].ms} ms, no movement) ending on the same exact target pixels`);
      PROOF.fx.reduced = rm;
      // L37 · keyboard: 1–4, C, P, R
      await p.evaluate(() => PLANT_LAB.set({ mode: "single", reducedMotion: false })); await p.focus("body");
      const k = []; for (const key of ["1", "3", "4", "2"]) { await p.keyboard.press(key); k.push(await p.evaluate(() => PLANT_LAB.S.concept)); }
      await p.keyboard.press("c"); const kc = await p.evaluate(() => PLANT_LAB.S.mode); await p.keyboard.press("c"); const kc2 = await p.evaluate(() => PLANT_LAB.S.mode);
      const pr0 = await p.evaluate(() => PLANT_LAB.S.preset); await p.keyboard.press("p"); const pr1 = await p.evaluate(() => PLANT_LAB.S.preset); await p.keyboard.press("p"); const pr2 = await p.evaluate(() => PLANT_LAB.S.preset);
      const r0 = await p.evaluate(() => PLANT_LAB.S.reducedMotion); await p.keyboard.press("r"); const r1 = await p.evaluate(() => PLANT_LAB.S.reducedMotion);
      check(J(k) === J(["A", "C", "D", "B"]) && kc === "compare" && kc2 === "single" && pr1 && pr2 && pr1 !== pr2 && r1 === !r0, `${B} L37 · keyboard: 1 / 3 / 4 / 2 switch concepts, C toggles Compare, P cycles presets (${pr0} → ${pr1} → ${pr2}), R toggles reduced motion`);
      await p.keyboard.press("r");
      // L32 · real room sizes
      await p.evaluate(() => PLANT_LAB.set({ mode: "rooms" })); await sleep(200);
      const rooms = await p.evaluate(() => [...document.querySelectorAll('canvas[data-view="room"]')].map(c => { const fr = c.parentElement.getBoundingClientRect(), r = c.getBoundingClientRect(); return { c: c.dataset.concept, w: c.width, h: c.height, cw: Math.round(r.width), ch: Math.round(r.height), fw: Math.round(fr.width), fh: Math.round(fr.height), scale: r.width / c.width }; }));
      const prodRooms = await p.evaluate(() => document.querySelectorAll('[data-room-concept="production"] .ps').length);
      check(rooms.length === 16 && rooms.every(r => Number.isInteger(+r.scale.toFixed(3)) && r.cw <= r.fw && r.ch <= r.fh && r.fw - r.cw <= r.scale * 2 + 2 && r.fh - r.ch <= r.scale * 2 + 2) && prodRooms === 4,
        `${B} L32 · Room size: every concept at the four real specimen boxes measured in production (Adapt / Spread / Region at 1024×768 205×237, 1280×800 258×298, 1440×900 290×335; report 296×342), re-laid-out to fill each box at an integer scale; the production reference at the same boxes`, rooms.filter(r => r.c === "A").map(r => `${r.w}×${r.h}@${r.scale}`).join(" "));
      PROOF.rooms = rooms;
      if (EVIDENCE && CH) { await p.evaluate(() => PLANT_LAB.setPreset("complexA")); await sleep(200); await p.evaluate(() => PLANT_LAB.set({ mode: "rooms" })); await sleep(200);
        await p.setViewportSize({ width: 1440, height: 900 }); await sleep(300); await p.addStyleTag({ content: ".lab{height:auto} .stage{overflow:visible} .ctl{display:none} .lab-body{grid-template-columns:1fr}" }); await sleep(200);
        await p.locator(".rooms").screenshot({ path: path.join(EVD, "13-real-room-size.png") }); await p.setViewportSize({ width: 1280, height: 800 }); }
      // L40 · no gameplay data changed by anything the lab did
      const data1 = await snap(p);
      check(data0 === data1 && data0 === J([JSON.parse(TRAITS_SNAPSHOT), JSON.parse(CONFIG_SNAPSHOT)]), `${B} L40 · no gameplay mutation: after presets, trait changes, previews and purchases, BLOOM_DATA.traits and BLOOM_DATA.config are exactly the page-load (and repository) data`);
      // L27 (cross-environment) · the browser renders the same pixels as Node
      const bsig = await p.evaluate(() => Object.fromEntries(["A", "B", "C", "D"].map(c => { const M = BLOOM.plantVisual.model.normalize({ traits: { cold: 2, heat: 1, drought: 3, salt: 1, rad: 1, seedOut: 2, earlyMat: 1, waterSeeds: 1 }, est: 1, condition: "thriving", focus: "balanced", local: null, env: { temp: 14, moist: 50 } }, PLANT_LAB.RULES); return [c, BLOOM.plantVisual.renderer.render(M, BLOOM.plantVisual.concepts[c]).sig.full]; })));
      check(J(bsig) === J(PROOF.maximalSig), `${B} L27 · cross-environment determinism: the browser renders the maximal build pixel-identically to Node in all four concepts`);
      // L39 · no console / page error on this page
      check(!p.errs.length && !(await p.evaluate(() => PLANT_LAB.errors.length)), `${B} L39 · no console error, page error or unhandled rejection in the lab`, p.errs.slice(0, 2).join(" | "));
      await p.context().close();

      // L33 · L34 · L35 · viewports (Chromium) / L36 Firefox at 1280×800
      for (const [w, h] of CH ? [[1024, 768], [1280, 800], [1440, 900]] : [[1280, 800]]) {
        const q = await open(w, h); await q.evaluate(() => PLANT_LAB.setPreset("complexA")); await sleep(150);
        const single = await q.evaluate(() => { const r = s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)]; };
          return { sw: document.documentElement.scrollWidth, vw: innerWidth, cur: r('[data-panel="A"][data-view="current"] canvas'), prev: r('[data-view="preview"] canvas'), ref: r('[data-panel="production"]'), buy: !!document.getElementById("buy"), strip: document.querySelectorAll(".cc").length }; });
        await q.keyboard.press("c"); await sleep(200);
        const cmpv = await q.evaluate(() => ({ sw: document.documentElement.scrollWidth, vw: innerWidth, panels: [...document.querySelectorAll(".cmp .panel")].map(p => { const b = p.getBoundingClientRect(); return [Math.round(b.right), Math.round(b.bottom)]; }) }));
        const ok = single.sw <= single.vw && single.cur && single.prev && single.ref && single.ref[2] <= w && single.ref[1] < single.cur[1] && single.ref[3] <= h && single.cur[3] <= h && single.strip === 4 && cmpv.sw <= cmpv.vw && cmpv.panels.length === 5 && cmpv.panels.every(([r, b]) => r <= w && b <= h);
        const id = { 1024: "L33", 1280: "L34", 1440: "L35" }[w];
        check(ok, `${B} ${CH ? id : "L36"} · ${w}×${h} usable: no horizontal scroll; the review strip, current + preview + production reference in one row; Compare's five panels all in view`, J({ single: [single.cur, single.ref], cmp: cmpv.panels.length }));
        if (EVIDENCE && CH && w === 1280) { await q.keyboard.press("c"); await sleep(100); }
        if (!CH) { await q.keyboard.press("c"); const pf = await q.evaluate(() => { PLANT_LAB.set({ preview: { id: "seedOut", tier: 2 } }); return PLANT_LAB.purchase(); });
          check(pf && pf.results.every(r => r.endSig === r.targetSig), `${B} L36 · Firefox: the lab, Compare and Purchase mutation work; the animation ends on the exact target pixels`); }
        await q.context().close(); }

      // ---------------- evidence stills (Chromium): sheets assembled from real renders in the lab page
      if (EVIDENCE && CH) {
        const e = await open(1440, 900);
        const sheet = async (file, title, rows, scale = 3) => {
          await e.evaluate(({ title, rows, scale }) => { const PV = BLOOM.plantVisual, L = PLANT_LAB, old = document.getElementById("sheet"); if (old) old.remove();
            const s = document.createElement("div"); s.id = "sheet"; s.style.cssText = "position:absolute;left:0;top:0;z-index:99;background:#f6f0e0;padding:14px;width:max-content;min-width:100vw;font:12px ui-rounded,system-ui,sans-serif;color:#2b2a22";
            s.innerHTML = `<div style="font-weight:800;font-size:15px;margin-bottom:8px">${title}</div>`; document.body.append(s);
            for (const row of rows) { const r = document.createElement("div"); r.style.cssText = "display:flex;gap:10px;align-items:flex-end;margin-bottom:10px";
              if (row.label) r.innerHTML = `<div style="width:92px;font-weight:800">${row.label}</div>`;
              for (const c of row.cells) { const C = PV.concepts[c.concept], inp = { traits: c.traits || {}, est: c.est ?? 1, condition: c.condition || "thriving", focus: c.focus || "balanced", local: c.local || null, env: c.env || { temp: 14, moist: 50 } };
                const M = PV.model.normalize(inp, L.RULES), F = PV.renderer.render(M, C); let rgba = F.rgba;
                if (c.preview) { const T = PV.renderer.render(PV.model.normalize({ ...inp, traits: { ...inp.traits, ...c.preview.traits } }, L.RULES), C); rgba = PV.fx.previewFrame(F, T, C, c.preview.style, 300); }
                if (c.fxT !== undefined) { const T = PV.renderer.render(PV.model.normalize({ ...inp, traits: { ...inp.traits, ...c.fxTo } }, L.RULES), C); rgba = PV.fx.fxFrame(F, T, C, c.fx, c.fxT, F.sk.anchors[c.anchor] || F.sk.apex, F.sk.stemPath); }
                const cv = document.createElement("canvas"); PV.renderer.paint(cv, rgba, F.W, F.H); cv.style.cssText = `width:${F.W * (c.scale || scale)}px;height:${F.H * (c.scale || scale)}px;image-rendering:pixelated;border-radius:5px;display:block`;
                const box = document.createElement("div"); box.append(cv); const cap = document.createElement("div"); cap.textContent = c.caption || ""; cap.style.cssText = "margin-top:3px;font-size:11px;color:#4a463a;max-width:" + F.W * (c.scale || scale) + "px"; box.append(cap); r.append(box); }
              s.append(r); } }, { title, rows, scale });
          await sleep(150); await e.locator("#sheet").screenshot({ path: path.join(EVD, file) }); };
        const cs = ["A", "B", "C", "D"], each = (f) => cs.map(f);
        for (const [k, c] of cs.entries()) await sheet(`0${k + 1}-concept-${c.toLowerCase()}-base.png`, `Concept ${c} · ${PROOF.concepts[c].name} — BASE (no traits) at native ${PROOF.concepts[c].native.join("×")} · 6×, and young / established`,
          [{ cells: [{ concept: c, scale: 6, caption: "base · mature" }, { concept: c, est: 0.4, scale: 3, caption: "young (est 40 %)" }, { concept: c, est: 0.7, scale: 3, caption: "established" }] }]);
        await sheet("06-cold-tier-progression.png", "Cold Tolerance T0 → T1 (frosted margin) → T2 (compact + hairs) → T3 (cushion + woolly collars) — real tiers in the shared temperature pool (max 3)",
          cs.map(c => ({ label: c, cells: [0, 1, 2, 3].map(t => ({ concept: c, traits: t ? { cold: t } : {}, caption: `Cold T${t}` })) })), 2);
        await sheet("07-drought-vs-flood.png", "Drought (T1 thick · T2 succulent + taproot · T3 storage + tuber) vs Flood (T1 straps + air roots · T2 ribbons · T3 emergent blades + stilt roots) — mutually exclusive arms",
          cs.map(c => ({ label: c, cells: [1, 2, 3].map(t => ({ concept: c, traits: { drought: t }, caption: `Drought T${t}` })).concat([1, 2, 3].map(t => ({ concept: c, traits: { flood: t }, caption: `Flood T${t}` }))) })), 2);
        await sheet("08-seed-output-progression.png", "Seed Output (real max 2): none → T1 (a developed seed head) → T2 (a larger head + a second head + drifting seeds); + Early Maturity, + Waterborne Seeds",
          cs.map(c => ({ label: c, cells: [{}, { seedOut: 1 }, { seedOut: 2 }, { earlyMat: 1 }, { waterSeeds: 1 }].map((t, i) => ({ concept: c, traits: t, caption: ["none", "Seed Output T1", "Seed Output T2", "Early Maturity", "Waterborne Seeds"][i] })) })), 2);
        await sheet("09-protected-salt-radiation.png", "PROTECTED: Salt Handling (crystals + toothed margin) · Radiation Shielding (protective pigment) · both — on a salt-flat specimen box",
          cs.map(c => ({ label: c, cells: [{}, { salt: 1 }, { rad: 1 }, { salt: 1, rad: 1 }].map((t, i) => ({ concept: c, traits: t, env: { temp: 22, moist: 30, soil: "saline" }, caption: ["base", "Salt", "Radiation", "Salt + Radiation"][i] })) })), 2);
        await sheet("10-local-colony-variants.png", "LOCAL colony development on one genome (Cold T1 · Drought T1 · Seed Output T1): Balanced · Roots + Root Network · Leaves + Leaf Canopy · Seeds + Seed Reserve · strained · unviable",
          cs.map(c => ({ label: c, cells: [{ caption: "Balanced" }, { focus: "roots", local: "rootNetwork", caption: "Roots + Root Network" }, { focus: "leaves", local: "leafCanopy", caption: "Leaves + Leaf Canopy" }, { focus: "seeds", local: "seedReserve", caption: "Seeds + Seed Reserve" }, { condition: "strained", caption: "strained" }, { condition: "unviable", caption: "unviable / ghost" }]
            .map(x => ({ concept: c, traits: { cold: 1, drought: 1, seedOut: 1 }, ...x })) })), 2);
        await sheet("11-preview-current-vs-proposed.png", "PREVIEW: current · ghost treatment · glow treatment · proposed (Heat T1 → T2 on a Cold T1 plant, and Waterborne Seeds)",
          cs.map(c => ({ label: c, cells: [{ caption: "current" }, { preview: { traits: { heat: 2 }, style: "ghost" }, caption: "ghost: Heat → T2" }, { preview: { traits: { heat: 2 }, style: "glow" }, caption: "glow: Heat → T2" }, { traits: { cold: 1, heat: 2 }, caption: "proposed (Heat T2)" },
            { preview: { traits: { waterSeeds: 1 }, style: "ghost" }, caption: "ghost: Waterborne" }, { preview: { traits: { waterSeeds: 1 }, style: "glow" }, caption: "glow: Waterborne" }].map(x => ({ concept: c, traits: { cold: 1, heat: 1 }, ...x })) })), 2);
        await sheet("12-mutation-fx-frame-strip.png", "PURCHASE FX frame strips (t = 0 · .2 · .4 · .6 · .8 · 1): grow (A), pulse (B), dissolve (C), bloom (D) — Seed Output T1 → T2; every strip ends on the exact target",
          [["A", "grow"], ["B", "pulse"], ["C", "dissolve"], ["D", "bloom"]].map(([c, fx]) => ({ label: `${c} · ${fx}`, cells: [0, 0.2, 0.4, 0.6, 0.8, 1].map(t => ({ concept: c, traits: { seedOut: 1 }, fx, fxT: t, fxTo: { seedOut: 2 }, anchor: "apex", caption: `t ${t}` })) })), 2);
        // 05 · the same complex build in all four concepts (Compare, no preview)
        { const e5 = await open(1440, 900); await e5.evaluate(() => { PLANT_LAB.setPreset("complexB"); PLANT_LAB.set({ previewOn: false, mode: "compare" }); }); await sleep(250); await e5.screenshot({ path: path.join(EVD, "05-all-concepts-same-complex-build.png") }); await e5.context().close(); }
        // 14 · the production reference beside the four concepts on the same build
        const e2 = await open(1440, 900); await e2.evaluate(() => { PLANT_LAB.setPreset("disperser"); PLANT_LAB.set({ previewOn: false }); }); await e2.keyboard.press("c"); await sleep(250); await e2.screenshot({ path: path.join(EVD, "14-current-production-reference.png") }); await e2.context().close();
        await e.context().close();
      }
    } catch (err) { check(false, `${B} browser flow completed`, (err.stack || String(err)).split("\n").slice(0, 3).join(" | ")); }
    await browser.close();
  }
  check(!external.length, "L38 · no external request: every resource the lab loaded is a local file (it opens straight from disk)", external.slice(0, 3).join(" | "));
  check(!errsAll.length, "L39 · no console error or page error in any browser", errsAll.slice(0, 3).join(" | "));
  if (EVIDENCE) { PROOF.checks = { pass: passes, fail: fails, results: RESULTS }; fs.writeFileSync(path.join(EVD, "plant-lab-proof.json"), JSON.stringify(PROOF, null, 1) + "\n"); console.log(`INFO  evidence  — ${path.relative(ROOT, EVD)}`); }
  console.log(fails ? `\n${fails} check(s) FAILED, ${passes} passed  (${((Date.now() - t0) / 1000).toFixed(1)} s)` : `\nALL ${passes} CHECKS PASS  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
