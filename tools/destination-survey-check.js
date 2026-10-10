// BLOOM — Destination Survey data checks (BLOOM-028A; validated destination identity BLOOM-028A1). Plain Node, production
// modules only; no browser.
//
//   node tools/destination-survey-check.js
//
// resources/destination-survey/survey-data.js decides which worlds a sector shows, how each is classified (Favorable / Precarious /
// Extreme) and what its dossier says. Contract (028A1): every candidate is a FULLY VALIDATED world from the play flow's own
// production path (BLOOM.play.runSearch, default-scenario: generateFromArchetype layers 1–8, then stripPlanet), and that planet object is
// authoritative — it IS the world a run of that seed would play, it is what the dossier measures, and nothing regenerates it.
// Also: classification and dossier values come from the engine's evaluate() or plain planet data, sectors are reproducible
// from their seed (columns independently), results are plain data (a worker can post them), and nothing in BLOOM_DATA or the
// planets is changed.
"use strict";
const path = require("path"), fs = require("fs");
const ROOT = path.resolve(__dirname, "..");
for (const f of ["content/config.js", "content/traits.js", "content/species.js", "planets/first_bloom.js", "planets/training_grounds.js", "content/archetypes.js", "content/scenarios.js", "content/play.js",
  "resources/bloom-sim.js", "resources/bloom-species.js", "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js",
  "resources/bloom-scenario.js", "resources/bloom-play.js"])
  require(path.join(ROOT, f));
const { BLOOM, BLOOM_DATA } = globalThis, D = BLOOM_DATA;
const J = JSON.stringify;
let fails = 0; const t0 = Date.now();
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (!ok) fails++; };
const info = (name, detail) => console.log(`INFO  ${name}  — ${detail}`);

(async () => {
  const S = await import(path.join(ROOT, "resources/destination-survey/survey-data.js"));
  const before = J({ config: D.config, traits: D.traits, archetypes: D.archetypes, play: D.play, fb: D.planets.first_bloom });
  const SEEDS = [1, 77];
  // (035B) authored-world classes per physiology (docs/SPECIES_SYSTEM_v1.md §5.7): keyed by physiologyKey, so a physiology change
  // that moves a world across a threshold fails until the fixture is updated in the same commit. Values: the accepted 035A study.
  const FB_FIXTURE = { "organic_hybrid/p1#e51a9448": "favorable", "cinder_rosette/p1#4bcba029": "extreme", "woolly_candle/p1#a3b9c465": "favorable", "reed_spire/p1#c2acca04": "favorable" };
  const TG_FIXTURE = { "organic_hybrid/p1#e51a9448": "favorable", "cinder_rosette/p1#4bcba029": "favorable", "woolly_candle/p1#a3b9c465": "favorable", "reed_spire/p1#c2acca04": "favorable" };

  // 1. sector shape: 3 × 3, one column per class, every cell a real candidate, each column most → least habitable
  const sectors = SEEDS.map(s => { const t = Date.now(); const x = S.buildSector(s); x.ms = Date.now() - t; return x; });
  const all = sectors.flatMap(s => s.cells);
  { const bad = [];
    for (const s of sectors) {
      if (s.cells.length !== 9 || s.cells.some(c => !c)) { bad.push(`${s.sectorSeed}: ${s.cells.filter(Boolean).length} cells`); continue; }
      s.cells.forEach((c, i) => { if (c.classId !== S.SURVEY_CLASSES[i % 3].id) bad.push(`${s.sectorSeed}#${i} ${c.classId}`); });
      for (let col = 0; col < 3; col++) { const h = [0, 1, 2].map(r => s.cells[r * 3 + col].habitable); if (!(h[0] >= h[1] && h[1] >= h[2])) bad.push(`${s.sectorSeed} col ${col} order`); }
      if (new Set(s.cells.map(c => c.key)).size !== 9) bad.push(`${s.sectorSeed} duplicate world`);
    }
    check(!bad.length, "S1 every sector is a 3 × 3 matrix: column = class (Favorable / Precarious / Extreme), 9 distinct worlds, each column ordered most → least habitable", bad.join("; ") || SEEDS.length + " sectors");
    info("validated sector build cost (Node, one thread: three columns in sequence)", sectors.map(s => `${s.label}: ${s.ms} ms · columns ${s.columns.map(c => `${c.ms} ms/${c.validations}v/${c.wasted}w`).join(", ")}`).join(" · "));
    const nearest = all.filter(c => c.filledBy).length, src = fs.readFileSync(path.join(ROOT, "resources/destination-survey/survey-data.js"), "utf8").replace(/\/\/.*$/gm, "");
    check(nearest === 0 && all.length === sectors.length * 9 && !/filledBy\s*=|aside\.push/.test(src) && S.MAX_DRAWS >= 200,
      "S2 (028B owner rule) a column only ever holds worlds of ITS class: every sample column has three of its own, and survey-data has no wrong-class fallback (an unfilled row would stay empty; draw budget " + S.MAX_DRAWS + ")", `${nearest} fallback cell(s)`); }

  // 2. classification = the engine's starting lamps, area-weighted, in the documented bands
  { const bad = [];
    for (const c of all) {
      const sim = BLOOM.createSim(c.planet, D.config, D.traits, { rng: () => 0.5 }); let land = 0, green = 0;
      sim.map.SEC.forEach((sec, i) => { const a = sec.area; land += a; if (sim.lampOf(sim.evaluate(i).fitness) === "green") green += a; });
      const want = S.SURVEY_CLASSES.find(k => green / land >= k.minHabitable).id;
      if (Math.abs(green / land - c.habitable) > 1e-12 || want !== c.classId) bad.push(`${c.key} ${c.habitable} vs ${green / land} ${c.classId}/${want}`);
    }
    check(!bad.length && J(S.SURVEY_CLASSES.map(c => c.minHabitable)) === J([0.35, 0.20, 0]),
      "S3 habitable share = green-lamp land / all land from the engine's own evaluate() under the starting plant and sky; class = its band (≥ 35% Favorable, ≥ 20% Precarious, else Extreme — recalibrated on validated worlds)", bad.slice(0, 3).join("; ") || all.length + " worlds"); }

  // 3. THE IDENTITY CONTRACT: each candidate IS the validated world a run of its seed plays (independent production re-run)
  { const bad = []; let substituted = 0, attemptDiffers = 0;
    for (const c of all) {
      const A = D.archetypes.find(a => a.id === c.archetypeId);
      const r = BLOOM.play.runSearch({ archetype: A, scenario: null, seeds: [c.seed], config: D.config, traits: D.traits });
      const structural = BLOOM.generateFromArchetype(A, c.seed, { config: D.config, traits: D.traits, winnability: false });
      if (structural.archetype.attempt !== r.planet.archetype.attempt) attemptDiffers++;
      if (S.planetFingerprint(structural) === c.fingerprint && structural.archetype.attempt !== c.attempt) substituted++;
      const a = c.planet.archetype;
      if (!r.ok || S.planetFingerprint(r.planet) !== c.fingerprint || J(r.planet) !== J(c.planet) || S.planetFingerprint(c.planet) !== c.fingerprint
        || !c.validation.validated || J(a.validatedLayers) !== J([1, 2, 3, 4, 5, 6, 7, 8]) || !a.winnabilityChecked || "witness" in a || "strategies" in a || c.validation.path !== S.VALIDATION_PATH)
        bad.push(c.key);
    }
    check(!bad.length && substituted === 0, "S4 identity: every shown world is byte-for-byte (JSON and fingerprint) the world an independent BLOOM.play.runSearch of its seed produces — validated layers 1–8, winnability checked, validator solutions stripped; never the structural pre-screen world",
      bad.join(", ") || `${all.length} worlds re-validated · ${attemptDiffers} accepted on a later attempt than their structural pre-screen world` ); }

  // 4. determinism, column independence, the scan chain
  { const again = S.buildSector(77), a = sectors.find(s => s.sectorSeed === 77);
    const c2 = S.buildColumn(77, 2), c0 = S.buildColumn(77, 0), c1 = S.buildColumn(77, 1), swapped = S.assembleSector(77, [c2, c0, c1]);
    const fp = s => J(s.cells.map(c => c.fingerprint));
    const chain = []; let k = 1; for (let i = 0; i < 50; i++) { k = S.nextSectorSeed(k); chain.push(k); }
    check(fp(again) === fp(a) && fp(swapped) === fp(a) && new Set(chain).size === 50 && chain.every(x => x >= 1 && x < 1e6) && again.label === a.label,
      "S5 a sector is reproducible from its seed, and its three columns are independent (built in any order — or in parallel workers — the sector is identical); SCAN's nextSectorSeed chain does not repeat over 50 scans", `${a.label} · chain ${chain.slice(0, 4).join(" → ")} …`); }

  // 5. dossier values are derived from THIS planet, not invented
  { const bad = [];
    for (const c of all) {
      const d = c.dossier, p = c.planet, ids = d.rows.map(r => r.id);
      if (J(S.surveyDossier({ ...c, assessment: S.assessWorld(p) })) !== J(d)) bad.push(c.key + " recomputed");
      if (J(ids) !== J(["climate", "water", "soil", "atmosphere", "solar"])) bad.push(c.key + " rows");
      const water = p.tilemap.filter(t => t < 0).length / p.tilemap.length;
      if (Math.abs(d.stats.waterShare - water) > 1e-12) bad.push(c.key + " water");
      const eff = p.sections.map(s => p.globalClimate.temperature + s.local.tempOffset);
      if (d.stats.tMin !== Math.min(...eff) || d.stats.tMax !== Math.max(...eff)) bad.push(c.key + " temps");
      if (Math.abs(d.habitable.green + d.habitable.yellow + d.habitable.red - 1) > 1e-9 || d.habitable.green !== c.habitable) bad.push(c.key + " lamps");
      const lm = new Set(p.sections.map(s => s.landmass)).size;
      if (d.stats.landmasses !== lm || (lm > 1) !== d.challenges.some(x => x.key === "crossing")) bad.push(c.key + " landmasses");
      if (!d.challenges.every(x => x.key === "crossing" || (x.share >= 0.03 && /^(Temperature|Water|Soil|Hazard):/.test(x.key)))) bad.push(c.key + " challenge keys");
      if (!d.rows.every(r => r.word && r.value && r.source)) bad.push(c.key + " empty row");
    }
    check(!bad.length, "S6 dossier = the candidate's own validated planet: recomputing it from candidate.planet gives the identical dossier; rows carry their data source; water, temperature range, landmasses and lamps match the planet data; challenges are engine limiting conditions (≥ 3% of land) plus real water crossings", bad.slice(0, 4).join("; ") || all.length + " dossiers");
    const ex = sectors[0].cells[2].dossier; info("example dossier", `${ex.name}: ${ex.rows.map(r => `${r.label}=${r.word} (${r.value})`).join(" | ")} | challenges: ${ex.challenges.map(c => c.text).join(", ")}`); }

  // 6. First Bloom (authored, legacy rectangle) as a candidate: unchanged, measured the same way
  // (035B) its class comes from the per-physiology FIXTURE table (Organic Hybrid's row), never from a hard-coded "Favorable"
  { const fbCol = S.SURVEY_CLASSES.findIndex(k => k.id === FB_FIXTURE[BLOOM.species.resolve("organic_hybrid").physiologyKey]);
    const col = S.buildColumn(1, fbCol, undefined, { firstBloom: true }), fb = col.cells.find(c => c.authored);
    check(fb && fb.planet === D.planets.first_bloom && !fb.planet.topology && fb.name === "First Bloom" && fb.classId === S.SURVEY_CLASSES[fbCol].id && fb.validation.path === "authored" && col.cells.length === 3 && col.cells[0] === fb && fb.fingerprint === S.planetFingerprint(D.planets.first_bloom),
      "S7 First Bloom can join a sector (development flag): the authored planet object itself (no topology: still a rectangle; played as authored), measured like any world, top of its column — its class from the physiology fixture table (Organic Hybrid: Favorable at 35%)", fb ? `${fb.classId} · ${Math.round(fb.habitable * 100)}% habitable` : "missing"); }

  // 7. fingerprint: deterministic, survives the worker boundary, sensitive to any gameplay-relevant change
  { const c = sectors[0].cells[4], clone = structuredClone(c), p2 = structuredClone(c.planet), p3 = structuredClone(c.planet);
    p2.tilemap[p2.tilemap.findIndex(t => t >= 0)] = -1; p3.sections[0].local.salinity += 1;
    const p4 = structuredClone(c.planet); p4.sections[1].neighbors = p4.sections[1].neighbors.slice(1);
    check(S.planetFingerprint(clone.planet) === c.fingerprint && clone.fingerprint === c.fingerprint && [p2, p3, p4].every(p => S.planetFingerprint(p) !== c.fingerprint) && /^[0-9a-f]{16}$/.test(c.fingerprint),
      "S8 planetFingerprint: stable across structured cloning (the worker → page boundary) and changed by one tile, one region condition or one neighbour link", c.fingerprint); }

  // 7b. (028B) the parallel path — plan picks, validate each independently and OUT OF ORDER, accept in stream order — builds
  // exactly the sequential reference column, for every column of both sectors (incl. a column with First Bloom)
  { const bad = [], memo = new Map(); let spec = 0, accepted = 0;
    const validate = p => { const k = p.archetypeId + ":" + p.seed; if (!memo.has(k)) memo.set(k, S.makeCandidate({ archetypeId: p.archetypeId, seed: p.seed })); return memo.get(k); };
    const parallel = (seed, col, opts = {}) => {
      let plan = S.planColumn(seed, col, undefined, { ...opts, want: 4 }); const picks = [...plan.picks], fb = plan.fb;
      for (;;) {
        const cands = picks.map(validate); // each validated independently (any worker, any order); only stream order matters below
        const r = S.columnFromValidated(seed, col, { fb, results: picks.map((p, i) => ({ draw: p.draw, cand: cands[i] })), exhausted: plan.exhausted });
        if (r.done) { spec += Math.max(0, picks.length - r.column.stats.validations); accepted += r.column.stats.validations; return r.column; }
        plan = S.planColumn(seed, col, undefined, { ...opts, fromDraw: plan.nextDraw, want: 2 }); picks.push(...plan.picks);
      }
    };
    const sig = col => col.cells.map(c => [c.key, c.classId, c.filledBy || "", S.planetFingerprint(c.planet)].join("/")).join(" | ");
    for (const sec of sectors) for (let col = 0; col < 3; col++) {
      const ref = { cells: sec.cells.filter((_, i) => i % 3 === col) }, par = parallel(sec.sectorSeed, col);
      if (sig(par) !== sig(ref)) bad.push(`sector ${sec.sectorSeed} column ${col}`); }
    const fbPar = (() => { for (let c = 0; c < 3; c++) { const ref = S.buildColumn(1, c, undefined, { firstBloom: true }); if (ref.cells.some(x => x.authored)) return { c, ref, par: parallel(1, c, { firstBloom: true }) }; } return null; })();
    if (!fbPar || sig(fbPar.par) !== sig(fbPar.ref)) bad.push("first bloom column");
    check(!bad.length, "S11 (028B) parallel column path = sequential reference: planColumn picks + independent validations + columnFromValidated (stream-order acceptance) give the identical cells (keys, classes, order, planet fingerprints) for all 6 columns of both sectors and a First Bloom column",
      bad.join("; ") || `${accepted} accepted-in-order validations, ${spec} speculative ones discarded`); }


  // ================================================================================== (BLOOM-035B) species-relative survey
  const SPECIES = BLOOM.species.list(), OH = SPECIES[0], cache = S.createSurveyCache(), tS = Date.now();
  const bySp = new Map(); // physiologyKey → [sector for SEEDS[0], sector for SEEDS[1]]
  for (const sp of SPECIES) bySp.set(sp.physiologyKey, SEEDS.map(seed => { const t = Date.now(), x = S.buildSector(seed, undefined, { species: sp, cache }); x.ms = Date.now() - t; return x; }));
  const spAll = sp => bySp.get(sp.physiologyKey).flatMap(x => x.cells);
  info("species sectors (one shared survey cache; Node, one thread)", SPECIES.map(sp => `${sp.id}: ${bySp.get(sp.physiologyKey).map(x => `${x.label} ${x.ms} ms, ${x.columns.reduce((a, c) => a + c.draws, 0)} draws / ${x.columns.reduce((a, c) => a + c.validations, 0)} validations / ${x.columns.reduce((a, c) => a + c.speciesRejected, 0)} rejected`).join(" · ")}`).join(" | ") + ` · cache ${J(cache.stats)} · ${Date.now() - tS} ms`);

  // S1/S2 per species: 3 × 3, columns = this species' classes, every offered world winnable for it
  { const bad = [];
    for (const sp of SPECIES) for (const sec of bySp.get(sp.physiologyKey)) {
      if (sec.cells.length !== 9 || sec.cells.some(c => !c)) { bad.push(`${sp.id} ${sec.sectorSeed}: ${sec.cells.filter(Boolean).length} cells`); continue; }
      sec.cells.forEach((c, i) => { if (c.classId !== S.SURVEY_CLASSES[i % 3].id) bad.push(`${sp.id} ${sec.sectorSeed}#${i} class`); if (!c.playable || !c.playability.s2.ok) bad.push(`${sp.id} ${c.key} not winnable`);
        if (c.species.physiologyKey !== sp.physiologyKey) bad.push(`${sp.id} ${c.key} species`); });
      for (let col = 0; col < 3; col++) { const h = [0, 1, 2].map(r => sec.cells[r * 3 + col].habitable); if (!(h[0] >= h[1] && h[1] >= h[2])) bad.push(`${sp.id} ${sec.sectorSeed} col ${col} order`); }
      if (sec.species.physiologyKey !== sp.physiologyKey || sec.columns.some(c => c.draws >= S.MAX_DRAWS)) bad.push(`${sp.id} ${sec.sectorSeed} provenance / budget`);
    }
    const maxDraws = Math.max(...[...bySp.values()].flat().flatMap(x => x.columns.map(c => c.draws)));
    check(!bad.length, "S1/S2 · species: for every species, every sector (seeds 1, 77) is a 3 × 3 of 9 worlds in THAT species' class columns (no borrowing), each column most → least habitable, every offered world winnable for the species (S2), the sector names its species; no column near MAX_DRAWS",
      bad.join("; ") || `4 species × 2 sectors · largest column ${maxDraws} draws of ${S.MAX_DRAWS}`); }

  // S3 per species: habitable = the engine's green land under THIS species' starting physiology
  { const bad = [];
    for (const sp of SPECIES) for (const c of spAll(sp)) {
      const sim = BLOOM.createSim(c.planet, D.config, D.traits, { rng: () => 0.5, species: sp }); let land = 0, green = 0;
      sim.map.SEC.forEach((sec, i) => { land += sec.area; if (sim.lampOf(sim.evaluate(i).fitness) === "green") green += sec.area; });
      if (Math.abs(green / land - c.habitable) > 1e-12 || S.classFor(green / land).id !== c.classId) bad.push(`${sp.id} ${c.key}`);
      if (J(S.surveyDossier({ ...c, assessment: S.assessWorld(c.planet, undefined, sp) }, undefined, sp)) !== J(c.dossier)) bad.push(`${sp.id} ${c.key} dossier`);
    }
    check(!bad.length && J(S.SURVEY_CLASSES.map(c => c.minHabitable)) === J([0.35, 0.20, 0]), "S3 · species: every species' habitable share is the engine's green land under ITS starting physiology (createSim(…, { species })), the class its band at the SAME global thresholds (35 % / 20 %), and the dossier recomputes identically for that species",
      bad.join(", ") || `${SPECIES.reduce((a, sp) => a + spAll(sp).length, 0)} species cells`); }

  // S4 per species: identity — every shown world is the world an independent runSearch of its seed produces; one planet object per world
  { const bad = [], memo = new Map(); let shared = 0;
    for (const sp of SPECIES) for (const c of spAll(sp)) {
      if (c.authored) continue;
      if (!memo.has(c.physicalKey)) { const r = BLOOM.play.runSearch({ archetype: D.archetypes.find(a => a.id === c.archetypeId), scenario: null, seeds: [c.seed], config: D.config, traits: D.traits });
        memo.set(c.physicalKey, r.ok ? S.planetFingerprint(r.planet) : null); }
      if (memo.get(c.physicalKey) !== c.fingerprint || S.planetFingerprint(c.planet) !== c.fingerprint || c.physicalKey !== `${c.archetypeId}:${c.seed}@w${BLOOM.archetype.WORLD_GEN_VERSION}`) bad.push(`${sp.id} ${c.key}`);
      if (c.planet !== cache.physical.get(c.physicalKey).planet) bad.push(`${sp.id} ${c.key} not the cached physical object`);
    }
    for (const [k, P] of cache.physical) if (P && SPECIES.filter(sp => cache.evaluation.has(S.evaluationKey(k, sp))).length > 1) shared++;
    check(!bad.length, "S4 · species identity: every world shown to any species is byte-for-byte (fingerprint) the world an independent BLOOM.play.runSearch of its seed produces — the survey never generates a species-specific world — and every species' candidate for one physical key carries the SAME cached planet object",
      bad.join(", ") || `${memo.size} distinct worlds re-validated · ${shared} physical worlds evaluated for 2+ species`); }

  // S12 · one physical world, different classes for different species, identical fingerprint
  { const rows = [];
    // a sector column's draw stream is species-free, so worlds shared between two species' sectors were predicted for the same column;
    // evaluate the first eight validated worlds of the cache for all four species (the cheap layer; the planets are the cached objects)
    for (const P of [...cache.physical.values()].filter(x => x && !x.authored).slice(0, 8)) for (const sp of SPECIES) S.evaluateSpecies(P, sp, undefined, cache);
    for (const [k, P] of cache.physical) { if (!P || P.authored) continue;
      const evs = SPECIES.map(sp => cache.evaluation.get(S.evaluationKey(k, sp))).filter(Boolean);
      if (evs.length >= 2 && new Set(evs.map(e => e.classId)).size >= 2) rows.push({ k, fp: P.fingerprint, evs }); }
    const ex = rows[0], allFour = rows.find(r => r.evs.length === 4);
    const fpSame = rows.every(r => r.evs.every(() => S.planetFingerprint(cache.physical.get(r.k).planet) === r.fp));
    check(rows.length > 0 && fpSame, "S12 · the same physical world classifies differently for different species while its fingerprint (identity) is identical — the survey is species-relative, the planet is not",
      ex ? `${rows.length} worlds differ by species · e.g. ${(allFour || ex).k} (${(allFour || ex).fp}): ${(allFour || ex).evs.map(e => `${e.species.id} ${Math.round(e.habitable * 100)}% ${e.classId}`).join(" · ")}` : "none found"); }

  // S13 · cache keys: physical species-free (shared), evaluation per physiology; sector keys per species
  { const phys = [...cache.physical.keys()], ev = [...cache.evaluation.keys()], W = BLOOM.archetype.WORLD_GEN_VERSION;
    const physOk = phys.every(k => /^authored:[a-z_]+$/.test(k) || new RegExp(`^[a-z_]+:\\d+@w${W}$`).test(k));
    const evOk = ev.every(k => { const [pk, sk] = k.split("|"); return cache.physical.has(pk) && SPECIES.some(sp => sp.physiologyKey === sk); });
    const sk = SPECIES.map(sp => S.sectorKey(77, sp, false)), skFb = S.sectorKey(77, OH, true);
    const noSpeciesInPhys = phys.every(k => !SPECIES.some(sp => k.includes(sp.id)));
    // building Organic Hybrid's sector again through the warm cache = the uncached production sector (identical cells)
    const warm = S.buildSector(77, undefined, { cache }), cold = sectors.find(x => x.sectorSeed === 77);
    check(physOk && evOk && noSpeciesInPhys && new Set(sk).size === 4 && sk.every(k => k.startsWith("77|")) && skFb.endsWith("|fb") && cache.stats.physicalHits > 0 && cache.stats.evaluationHits > 0
      && J(warm.cells.map(c => [c.key, c.classId, c.fingerprint])) === J(cold.cells.map(c => [c.key, c.classId, c.fingerprint])),
      "S13 · cache keys: physical `<archetype>:<seed>@w<WORLD_GEN_VERSION>` (no species in it; shared by every species), evaluation `<physical>|<physiologyKey>`, sector `<seed>|<physiologyKey>[|fb]`; the second and later species hit the physical cache; Organic Hybrid's sector through the warm cache = the uncached production sector",
      `${phys.length} physical · ${ev.length} evaluations · hits ${J(cache.stats)} · sector keys ${sk.map(k => k.split("|")[1].split("#")[0]).join(", ")}`); }

  // S14 · First Bloom (and Training Grounds) per species from the fixture table + the ±0.01 boundary report
  { const bad = [], near = [], rows = [];
    for (const sp of SPECIES) for (const [id, FIX] of [["first_bloom", FB_FIXTURE], ["training_grounds", TG_FIXTURE]]) {
      const c = S.makeCandidate({ authored: id }, undefined, { species: sp, cache }), want = FIX[sp.physiologyKey];
      if (!want) { bad.push(`${id} × ${sp.physiologyKey}: no fixture row (update the fixture with the physiology change)`); continue; }
      if (c.classId !== want || !c.playable) bad.push(`${id} × ${sp.id}: ${c.classId}${c.playable ? "" : " (not winnable)"} ≠ fixture ${want}`);
      for (const t of [0.35, 0.20]) if (Math.abs(c.habitable - t) <= 0.01) near.push(`${id} × ${sp.id} ${c.habitable.toFixed(4)} (±0.01 of ${t})`);
      rows.push(`${id} × ${sp.id} ${(c.habitable * 100).toFixed(1)}% ${c.classId}`);
    }
    const fixturesComplete = SPECIES.every(sp => FB_FIXTURE[sp.physiologyKey] && TG_FIXTURE[sp.physiologyKey]);
    // with firstBloom, First Bloom tops the column of ITS class for that species (never a borrowed column)
    for (const sp of SPECIES) { const col = S.SURVEY_CLASSES.findIndex(k => k.id === FB_FIXTURE[sp.physiologyKey]), c = S.buildColumn(1, col, undefined, { firstBloom: true, species: sp, cache });
      if (!c.cells[0] || !c.cells[0].authored) bad.push(`${sp.id}: First Bloom not at the top of its ${FB_FIXTURE[sp.physiologyKey]} column`);
      for (let o = 0; o < 3; o++) if (o !== col && S.buildColumn(1, o, undefined, { firstBloom: true, species: sp, cache }).cells.some(x => x.authored)) bad.push(`${sp.id}: First Bloom in a borrowed column ${o}`); }
    check(!bad.length && fixturesComplete, "S14 · authored worlds per species from the physiologyKey fixture table (never a hard-coded \"First Bloom = Favorable\"): First Bloom Favorable for Organic Hybrid / Woolly Candle / Reed Spire and Extreme for Cinder Rosette, Training Grounds Favorable for all; with firstBloom it tops ITS class column for that species, never a borrowed one",
      bad.join("; ") || rows.join(" · "));
    info("threshold-boundary report (authored world × species within ±0.01 of 35 % / 20 %; a pair that crosses fails S14 until its fixture row is updated)", near.join(" · ") || "none"); }

  // S15 · a world the species cannot win is rejected FOR THAT SPECIES (counted, never regenerated, never shown)
  { const c = spAll(OH)[0], unwinnable = { ...c, playable: false, playability: { ...c.playability, ok: false } };
    const want = c.classId, colIdx = S.SURVEY_CLASSES.findIndex(k => k.id === want);
    const r = S.columnFromValidated(77, colIdx, { results: [{ draw: 1, cand: unwinnable }], exhausted: true });
    const src = fs.readFileSync(path.join(ROOT, "resources/destination-survey/survey-data.js"), "utf8").replace(/\/\/.*$/gm, "");
    const seqRule = /else if \(!c\.playable\) stats\.speciesRejected\+\+/.test(src) && /else if \(!r\.cand\.playable\) stats\.speciesRejected\+\+/.test(src);
    check(r.done && r.column.cells.length === 0 && r.column.stats.speciesRejected === 1 && seqRule,
      "S15 · species rejection: a validated world of the right class that the species cannot win is not offered to it (speciesRejected, sequential and parallel acceptance alike) — the world itself is untouched and the column keeps drawing",
      `rejected ${r.column.stats.speciesRejected} · sector totals ${SPECIES.map(sp => `${sp.id} ${bySp.get(sp.physiologyKey).reduce((a, x) => a + x.columns.reduce((b, c2) => b + c2.speciesRejected, 0), 0)}`).join(", ")}`); }

  // 8. plain data, nothing mutated, no DOM / globals in the module
  { const c = sectors[0].cells[0]; let cloneable = true; try { structuredClone(sectors[0]); } catch (e) { cloneable = e.message; }
    const after = J({ config: D.config, traits: D.traits, archetypes: D.archetypes, play: D.play, fb: D.planets.first_bloom });
    const fpsStill = all.every(x => S.planetFingerprint(x.planet) === x.fingerprint);
    check(cloneable === true && before === after && !("sim" in c.assessment) && fpsStill, "S9 sectors are structured-cloneable plain data (the module workers post them); BLOOM_DATA (config, traits, archetypes, play copy, First Bloom) is unchanged, and no shown planet changed after all the checks above", cloneable === true ? "ok" : cloneable);
    const src = fs.readFileSync(path.join(ROOT, "resources/destination-survey/survey-data.js"), "utf8").replace(/\/\/.*$/gm, "");
    check(!/document\.|window\.|getElementById|querySelector|localStorage|^(let|var) /m.test(src) && !/^\s*import /m.test(src),
      "S10 survey-data.js hygiene: no DOM, no window, no module-level mutable state, no imports (BLOOM is passed in or read from globalThis)"); }

  console.log(fails ? `\n${fails} check(s) FAILED  (${((Date.now() - t0) / 1000).toFixed(1)} s)` : `\nALL CHECKS PASS  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
