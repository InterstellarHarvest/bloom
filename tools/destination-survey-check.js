// BLOOM — Destination Survey data checks (BLOOM-028A; validated destination identity BLOOM-028A1). Plain Node, production
// modules only; no browser.
//
//   node tools/destination-survey-check.js
//
// resources/destination-survey/survey-data.js decides which worlds a sector shows, how each is classified (Stable / Volatile /
// Extreme) and what its dossier says. Contract (028A1): every candidate is a FULLY VALIDATED world from the play flow's own
// production path (BLOOM.play.runSearch, Eden: generateFromArchetype layers 1–8, then stripPlanet), and that planet object is
// authoritative — it IS the world a run of that seed would play, it is what the dossier measures, and nothing regenerates it.
// Also: classification and dossier values come from the engine's evaluate() or plain planet data, sectors are reproducible
// from their seed (columns independently), results are plain data (a worker can post them), and nothing in BLOOM_DATA or the
// planets is changed.
"use strict";
const path = require("path"), fs = require("fs");
const ROOT = path.resolve(__dirname, "..");
for (const f of ["content/config.js", "content/traits.js", "planets/first_bloom.js", "content/archetypes.js", "content/scenarios.js", "content/play.js",
  "resources/bloom-sim.js", "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js",
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

  // 1. sector shape: 3 × 3, one column per class, every cell a real candidate, each column most → least habitable
  const sectors = SEEDS.map(s => { const t = Date.now(); const x = S.buildSector(s); x.ms = Date.now() - t; return x; });
  const all = sectors.flatMap(s => s.cells);
  { const bad = [];
    for (const s of sectors) {
      if (s.cells.length !== 9 || s.cells.some(c => !c)) { bad.push(`${s.sectorSeed}: ${s.cells.filter(Boolean).length} cells`); continue; }
      s.cells.forEach((c, i) => { if (c.classId !== S.SURVEY_CLASSES[i % 3].id && !c.filledBy) bad.push(`${s.sectorSeed}#${i} ${c.classId}`); });
      for (let col = 0; col < 3; col++) { const h = [0, 1, 2].map(r => s.cells[r * 3 + col].habitable); if (!(h[0] >= h[1] && h[1] >= h[2])) bad.push(`${s.sectorSeed} col ${col} order`); }
      if (new Set(s.cells.map(c => c.key)).size !== 9) bad.push(`${s.sectorSeed} duplicate world`);
    }
    check(!bad.length, "S1 every sector is a 3 × 3 matrix: column = class (Stable / Volatile / Extreme), 9 distinct worlds, each column ordered most → least habitable", bad.join("; ") || SEEDS.length + " sectors");
    info("validated sector build cost (Node, one thread: three columns in sequence)", sectors.map(s => `${s.label}: ${s.ms} ms · columns ${s.columns.map(c => `${c.ms} ms/${c.validations}v/${c.wasted}w`).join(", ")}`).join(" · "));
    const nearest = all.filter(c => c.filledBy).length;
    check(nearest === 0, "S2 every column fills with worlds of its own class inside the draw budget (no nearest-band fallback on the sample)", `${nearest} fallback cell(s)`); }

  // 2. classification = the engine's starting lamps, area-weighted, in the documented bands
  { const bad = [];
    for (const c of all) {
      const sim = BLOOM.createSim(c.planet, D.config, D.traits, { rng: () => 0.5 }); let land = 0, green = 0;
      sim.map.SEC.forEach((sec, i) => { const a = sec.area; land += a; if (sim.lampOf(sim.evaluate(i).fitness) === "green") green += a; });
      const want = S.SURVEY_CLASSES.find(k => green / land >= k.minHabitable).id;
      if (Math.abs(green / land - c.habitable) > 1e-12 || want !== c.classId) bad.push(`${c.key} ${c.habitable} vs ${green / land} ${c.classId}/${want}`);
    }
    check(!bad.length && J(S.SURVEY_CLASSES.map(c => c.minHabitable)) === J([0.35, 0.20, 0]),
      "S3 habitable share = green-lamp land / all land from the engine's own evaluate() under the starting plant and sky; class = its band (≥ 35% Stable, ≥ 20% Volatile, else Extreme — recalibrated on validated worlds)", bad.slice(0, 3).join("; ") || all.length + " worlds"); }

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
  { const col = S.buildColumn(1, 0, undefined, { firstBloom: true }), fb = col.cells.find(c => c.authored);
    check(fb && fb.planet === D.planets.first_bloom && !fb.planet.topology && fb.name === "First Bloom" && fb.classId === "stable" && fb.validation.path === "authored" && col.cells.length === 3 && col.cells[0] === fb && fb.fingerprint === S.planetFingerprint(D.planets.first_bloom),
      "S7 First Bloom can join a sector (development flag): the authored planet object itself (no topology: still a rectangle; played as authored), measured like any world (35% → Stable), top of its column", fb ? `${fb.classId} · ${Math.round(fb.habitable * 100)}% habitable` : "missing"); }

  // 7. fingerprint: deterministic, survives the worker boundary, sensitive to any gameplay-relevant change
  { const c = sectors[0].cells[4], clone = structuredClone(c), p2 = structuredClone(c.planet), p3 = structuredClone(c.planet);
    p2.tilemap[p2.tilemap.findIndex(t => t >= 0)] = -1; p3.sections[0].local.salinity += 1;
    const p4 = structuredClone(c.planet); p4.sections[1].neighbors = p4.sections[1].neighbors.slice(1);
    check(S.planetFingerprint(clone.planet) === c.fingerprint && clone.fingerprint === c.fingerprint && [p2, p3, p4].every(p => S.planetFingerprint(p) !== c.fingerprint) && /^[0-9a-f]{16}$/.test(c.fingerprint),
      "S8 planetFingerprint: stable across structured cloning (the worker → page boundary) and changed by one tile, one region condition or one neighbour link", c.fingerprint); }

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
