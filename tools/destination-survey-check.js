// BLOOM — Destination Survey data checks (BLOOM-028A). Plain Node, production modules only; no browser.
//
//   node tools/destination-survey-check.js
//
// resources/destination-survey/survey-data.js decides which worlds a survey sector shows, how each is classified
// (Stable / Volatile / Extreme) and what its dossier says. It must stay a PRESENTATION of real BLOOM worlds: every candidate is
// the production generator's world for its { archetype, seed } (structural layers), every classification and dossier value is
// read from the engine's own evaluate() or plain planet data, sectors are reproducible from their seed, results are plain data
// (a worker can post them), and nothing in BLOOM_DATA or the planets is changed.
"use strict";
const path = require("path"), fs = require("fs");
const ROOT = path.resolve(__dirname, "..");
for (const f of ["content/config.js", "content/traits.js", "planets/first_bloom.js", "content/archetypes.js", "content/play.js",
  "resources/bloom-sim.js", "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js"])
  require(path.join(ROOT, f));
const { BLOOM, BLOOM_DATA } = globalThis, D = BLOOM_DATA;
const J = JSON.stringify;
let fails = 0; const t0 = Date.now();
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (!ok) fails++; };
const info = (name, detail) => console.log(`INFO  ${name}  — ${detail}`);

(async () => {
  const S = await import(path.join(ROOT, "resources/destination-survey/survey-data.js"));
  const before = J({ config: D.config, traits: D.traits, archetypes: D.archetypes, play: D.play, fb: D.planets.first_bloom });
  const SEEDS = [1, 2, 3, 77, 4242, 90001];

  // 1. sector shape: 3 × 3, one column per class, every cell a real candidate, each column most → least habitable
  const sectors = SEEDS.map(s => { const t = Date.now(); const x = S.buildSector(s); x.ms = Date.now() - t; return x; });
  { const bad = [];
    for (const s of sectors) {
      if (s.cells.length !== 9 || s.cells.some(c => !c)) { bad.push(`${s.sectorSeed}: ${s.cells.length} cells`); continue; }
      s.cells.forEach((c, i) => { if (c.classId !== S.SURVEY_CLASSES[i % 3].id && !c.filledBy) bad.push(`${s.sectorSeed}#${i} ${c.classId}`); });
      for (let col = 0; col < 3; col++) { const h = [0, 1, 2].map(r => s.cells[r * 3 + col].habitable); if (!(h[0] >= h[1] && h[1] >= h[2])) bad.push(`${s.sectorSeed} col ${col} order`); }
      if (new Set(s.cells.map(c => c.key)).size !== 9) bad.push(`${s.sectorSeed} duplicate world`);
    }
    check(!bad.length, "S1 every sector is a 3 × 3 matrix: column = class (Stable / Volatile / Extreme), 9 distinct worlds, each column ordered most → least habitable", bad.join("; ") || SEEDS.length + " sectors");
    info("sector build cost (Node, structural generation + evaluate)", sectors.map(s => `${s.label}: ${s.draws} draws ${s.ms} ms`).join(" · "));
    const nearest = sectors.flatMap(s => s.cells.filter(c => c.filledBy)).length;
    check(nearest === 0, "S2 the draw budget fills every column inside its own band (no nearest-band fallback needed on the sample)", `${nearest} fallback cell(s)`); }

  // 2. classification = the engine's starting lamps, area-weighted, in the documented bands
  { const bad = [];
    for (const s of sectors) for (const c of s.cells) {
      const sim = BLOOM.createSim(c.planet, D.config, D.traits, { rng: () => 0.5 }); let land = 0, green = 0;
      sim.map.SEC.forEach((sec, i) => { const a = sec.area; land += a; if (sim.lampOf(sim.evaluate(i).fitness) === "green") green += a; });
      const want = S.SURVEY_CLASSES.find(k => green / land >= k.minHabitable).id;
      if (Math.abs(green / land - c.habitable) > 1e-12 || want !== c.classId) bad.push(`${c.key} ${c.habitable} vs ${green / land} ${c.classId}/${want}`);
    }
    check(!bad.length, "S3 habitable share = green-lamp land / all land from the engine's own evaluate() under the starting plant and sky; class = its band (≥ 45% Stable, ≥ 22% Volatile, else Extreme)", bad.slice(0, 3).join("; ") || "54 worlds"); }

  // 3. each candidate is the production world for its { archetype, seed }: generateFromArchetype (structural layers)
  { const bad = []; let n = 0;
    for (const s of sectors.slice(0, 3)) for (const c of s.cells) {
      const A = D.archetypes.find(a => a.id === c.archetypeId);
      const p = BLOOM.generateFromArchetype(A, c.seed, { config: D.config, traits: D.traits, winnability: false }); n++;
      if (J(p.tilemap) !== J(c.planet.tilemap) || p.name !== c.name || c.attempt !== p.archetype.attempt || J(c.planet.topology) !== J({ wrapX: true, wrapY: false }) || c.render !== (A.render || null))
        bad.push(c.key);
    }
    check(!bad.length, "S4 every candidate is BLOOM.generateFromArchetype(archetype, seed, { winnability: false }) — same tilemap, name and attempt; a 60×40 cylinder { wrapX: true, wrapY: false }; the archetype's own render hints", bad.join(", ") || n + " worlds"); }

  // 4. determinism + the scan chain
  { const again = S.buildSector(77), a = sectors.find(s => s.sectorSeed === 77);
    const next = [S.nextSectorSeed(1), S.nextSectorSeed(1)], chain = []; let k = 1; for (let i = 0; i < 50; i++) { k = S.nextSectorSeed(k); chain.push(k); }
    check(J(again.cells.map(c => c.key)) === J(a.cells.map(c => c.key)) && next[0] === next[1] && new Set(chain).size === 50 && chain.every(x => x >= 1 && x < 1e6) && again.label === a.label,
      "S5 a sector is reproducible from its seed; SCAN's nextSectorSeed chain is deterministic and does not repeat over 50 scans", `${a.label} · chain ${chain.slice(0, 4).join(" → ")} …`); }

  // 5. dossier values are derived, not invented
  { const bad = [];
    for (const c of sectors.flatMap(s => s.cells)) {
      const d = c.dossier, p = c.planet, ids = d.rows.map(r => r.id);
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
    check(!bad.length, "S6 dossier: Climate / Water / Soil / Atmosphere / Solar exposure rows, each with its data source; water share, temperature range, landmasses and lamps match the planet data; challenges are engine limiting conditions (≥ 3% of land) plus real water crossings", bad.slice(0, 4).join("; ") || "54 dossiers");
    const ex = sectors[0].cells[2].dossier; info("example dossier", `${ex.name}: ${ex.rows.map(r => `${r.label}=${r.word} (${r.value})`).join(" | ")} | challenges: ${ex.challenges.map(c => c.text).join(", ")}`); }

  // 6. First Bloom (authored, legacy rectangle) as a candidate: unchanged, measured the same way
  { const fbs = S.buildSector(1, undefined, { firstBloom: true }), fb = fbs.cells.find(c => c && c.authored);
    check(fb && fb.planet === D.planets.first_bloom && !fb.planet.topology && fb.name === "First Bloom" && fb.dossier.rows.length === 5 && fbs.cells.filter(Boolean).length === 9 && fbs.cells.indexOf(fb) < 3,
      "S7 First Bloom can join a sector (development flag): the authored planet object itself (no topology: still a rectangle), measured and classified like any world, top of its column", fb ? `${fb.classId} · ${Math.round(fb.habitable * 100)}% habitable · cell ${fbs.cells.indexOf(fb)}` : "missing"); }

  // 7. plain data, nothing mutated, no DOM / globals in the module
  { const c = sectors[0].cells[0]; let cloneable = true; try { structuredClone(sectors[0]); } catch (e) { cloneable = e.message; }
    const after = J({ config: D.config, traits: D.traits, archetypes: D.archetypes, play: D.play, fb: D.planets.first_bloom });
    check(cloneable === true && before === after && !("sim" in c.assessment), "S8 sectors are structured-cloneable plain data (the module worker posts them); BLOOM_DATA (config, traits, archetypes, play copy, First Bloom) is unchanged after 60+ worlds", cloneable === true ? "ok" : cloneable);
    const src = fs.readFileSync(path.join(ROOT, "resources/destination-survey/survey-data.js"), "utf8").replace(/\/\/.*$/gm, "");
    check(!/document\.|window\.|getElementById|querySelector|localStorage|^(let|var) /m.test(src) && !/^\s*import /m.test(src),
      "S9 survey-data.js hygiene: no DOM, no window, no module-level mutable state, no imports (BLOOM is passed in or read from globalThis)"); }

  console.log(fails ? `\n${fails} check(s) FAILED  (${((Date.now() - t0) / 1000).toFixed(1)} s)` : `\nALL CHECKS PASS  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
