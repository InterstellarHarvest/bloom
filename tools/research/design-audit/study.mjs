// BLOOM-038 design audit — the deterministic SIMULATION STUDY driver (research only; never loaded by the game; writes nothing under
// content/, planets/ or resources/).
//
//   node tools/research/design-audit/study.mjs worlds [--per-archetype 20] [--workers 14]   → <scratch>/worlds.json
//   node tools/research/design-audit/study.mjs runs   [--seeds 2] [--entries 10] [--workers 14] → <scratch>/rows.jsonl
//   (then analyze.mjs turns rows.jsonl into docs/evidence/bloom-038/*.json)
//
// WORLDS. Expedition: per archetype, World Seeds from a FIXED stream ("bloom-038 design audit expedition pool v1"), each through the
// Destination Survey's own production path (survey-data physicalCandidate = BLOOM.play.runSearch layers 1–8) and, per species, the survey's
// species evaluation (evaluateSpecies: class + S2 playability). A world enters a species' sample only when the survey could show it to that
// species (S2 playable). Challenge: the first N entries of every shipped seed-bank cell, rebuilt exactly (challenge-bank buildBankWorld,
// fingerprint-verified). Training: the Training Grounds on the training run's derived config.
// RUNS. Every (world, species, policy, run seed) through runner.mjs; Challenges play their scenario, prescribed species / starting state and
// completion gate exactly as game-session.js creates them.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";
import { engine, mulberry32, fnv, ROOT } from "./engine.mjs";
import { run, POLICIES } from "./runner.mjs";

const SCRATCH = process.env.BLOOM038_SCRATCH || path.join(ROOT, ".design-audit-scratch");
const SPECIES = ["organic_hybrid", "cinder_rosette", "woolly_candle", "reed_spire"];
const POOL_STREAM = "bloom-038 design audit expedition pool v1";

async function planetFor(t, E) {
  const { BLOOM, D, CB, SD } = E;
  if (t.kind === "training") return { planet: D.planets[D.training.planetId], config: BLOOM.play.deriveConfig(D.config, D.training.config) };
  if (t.kind === "challenge") { const ch = BLOOM.challenges.resolve(t.challengeId), sp = BLOOM.species.resolve(t.speciesId), cell = CB.bankCell(ch, sp);
    return { planet: CB.buildBankWorld(cell.entries[t.entry], E).planet }; }
  const A = D.archetypes.find(a => a.id === t.archetypeId), { planet } = BLOOM.archetype.attemptPlanet(A, t.seed, t.attempt);
  if (SD.planetFingerprint(planet) !== t.fingerprint) throw new Error(`fingerprint mismatch ${t.archetypeId}:${t.seed}`);
  return { planet };
}

if (!isMainThread) {
  const E = await engine(), { BLOOM, D, SD } = E, cache = new Map();
  parentPort.on("message", async t => { try {
    if (t.job === "world") { // one Expedition pool world: physical validation + every species' survey evaluation
      const t0 = Date.now(), phys = SD.physicalCandidate({ archetypeId: t.archetypeId, seed: t.seed });
      if (!phys) return parentPort.postMessage({ ok: true, row: { ...t, valid: false, ms: Date.now() - t0 } });
      const per = {};
      for (const id of SPECIES) { const ev = SD.evaluateSpecies(phys, BLOOM.species.resolve(id));
        per[id] = { classId: ev.classId, habitable: +ev.habitable.toFixed(4), playable: !!ev.playability.ok, limits: Object.fromEntries(Object.entries(ev.assessment.limits).map(([k, v]) => [k, +v.toFixed(3)])) }; }
      const w = SD.assessWorld(phys.planet, E, BLOOM.species.resolve("organic_hybrid")), P = phys.planet, M = BLOOM.createSim(P, D.config, D.traits, { rng: () => 0.5 }).map;
      // physical condition summary (species-free; area-weighted) — used to pick the visual atlas's extreme worlds
      let a = 0; const acc = { temp: 0, moist: 0, rad: 0, salt: 0, tox: 0, minT: 1e9, maxT: -1e9, maxRad: 0, maxSalt: 0 };
      M.SEC.forEach((s, i) => { const A_ = M.AREA[i], L = s.local, T = P.globalClimate.temperature + L.tempOffset, Mo = P.globalClimate.moisture + L.moistureOffset; a += A_;
        acc.temp += T * A_; acc.moist += Mo * A_; acc.rad += L.radiation * A_; acc.salt += L.salinity * A_; acc.tox += (L.toxicity || 0) * A_;
        acc.minT = Math.min(acc.minT, T); acc.maxT = Math.max(acc.maxT, T); acc.maxRad = Math.max(acc.maxRad, L.radiation); acc.maxSalt = Math.max(acc.maxSalt, L.salinity); });
      const phy = { sky: { ...P.globalClimate }, meanTemp: +(acc.temp / a).toFixed(1), meanMoist: +(acc.moist / a).toFixed(1), meanRad: +(acc.rad / a).toFixed(1), meanSalt: +(acc.salt / a).toFixed(1),
        minT: acc.minT, maxT: acc.maxT, maxRad: acc.maxRad, maxSalt: acc.maxSalt, waterShare: +w.waterShare.toFixed(3), landmasses: w.landmasses, sections: w.sections };
      return parentPort.postMessage({ ok: true, row: { ...t, valid: true, name: P.name, attempt: phys.attempt, fingerprint: phys.fingerprint, species: per, physical: phy, ms: Date.now() - t0 } });
    }
    // a run
    const key = t.kind === "challenge" ? `c|${t.challengeId}|${t.speciesId}|${t.entry}` : t.kind === "training" ? "training" : `e|${t.archetypeId}|${t.seed}`;
    let W = cache.get(key); if (!W) { W = await planetFor(t, E); cache.set(key, W); if (cache.size > 40) cache.delete(cache.keys().next().value); }
    const ch = t.challengeId ? BLOOM.challenges.resolve(t.challengeId) : null;
    const r = run({ planet: W.planet, config: W.config, speciesId: t.speciesId, scenario: ch ? BLOOM.challenges.scenarioOf(ch) : null, challenge: ch,
      startingState: ch ? BLOOM.challenges.startingStateOf(ch) : null, policy: t.policy, runSeed: t.runSeed, capSeconds: t.capSeconds }, E);
    parentPort.postMessage({ ok: true, row: { ...t, ...r } });
  } catch (e) { parentPort.postMessage({ ok: false, error: String(e && e.stack || e), t }); } });
} else {
  const argv = process.argv.slice(2), mode = argv[0], opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
  const NW = +opt("--workers", Math.max(2, os.cpus().length - 2));
  fs.mkdirSync(SCRATCH, { recursive: true });
  const pool = (tasks, onRow) => new Promise((resolve, reject) => { let next = 0, live = 0, done = 0; const t0 = Date.now();
    for (let k = 0; k < Math.min(NW, tasks.length); k++) { const w = new Worker(fileURLToPath(import.meta.url)); live++;
      const feed = () => { if (next >= tasks.length) { w.terminate(); return; } w.postMessage(tasks[next++]); };
      w.on("message", m => { done++; if (m.ok) onRow(m.row); else console.error("ERR", JSON.stringify(m.t), m.error.slice(0, 400));
        if (done % 50 === 0) console.log(`${done}/${tasks.length} ${Math.round((Date.now() - t0) / 1000)} s`); feed(); });
      w.on("error", reject); w.on("exit", () => { if (--live === 0) resolve(); }); feed(); } });
  const E = await engine(), { BLOOM, D, CB } = E;
  if (mode === "worlds") {
    const PER = +opt("--per-archetype", "20"), pol = D.play.search, tasks = [];
    for (const A of D.archetypes) { const rng = mulberry32(fnv(`${POOL_STREAM}|${A.id}`)), seen = new Set();
      while (seen.size < PER) { const s = pol.seedMin + Math.floor(rng() * (pol.seedMax - pol.seedMin + 1)); if (!seen.has(s)) { seen.add(s); tasks.push({ job: "world", archetypeId: A.id, seed: s, poolIndex: seen.size - 1 }); } } }
    const rows = []; await pool(tasks, r => rows.push(r));
    rows.sort((a, b) => a.archetypeId.localeCompare(b.archetypeId) || a.poolIndex - b.poolIndex);
    fs.writeFileSync(path.join(SCRATCH, "worlds.json"), JSON.stringify({ format: "bloom-038-worlds@1", stream: POOL_STREAM, perArchetype: PER, rows }, null, 0));
    console.log("worlds", rows.length, "valid", rows.filter(r => r.valid).length);
  } else if (mode === "runs") {
    const SEEDS = +opt("--seeds", "2"), ENTRIES = +opt("--entries", "10"), only = opt("--only", "expedition,challenge,training").split(",");
    const W = JSON.parse(fs.readFileSync(path.join(SCRATCH, "worlds.json"), "utf8")).rows.filter(r => r.valid), tasks = [];
    if (only.includes("expedition")) for (const w of W) for (const sp of SPECIES) { if (!w.species[sp].playable) continue;
      for (const policy of POLICIES) for (let k = 1; k <= SEEDS; k++)
        tasks.push({ kind: "expedition", archetypeId: w.archetypeId, seed: w.seed, attempt: w.attempt, fingerprint: w.fingerprint, classId: w.species[sp].classId,
          speciesId: sp, policy, runSeed: fnv(`${w.archetypeId}|${w.seed}|${k}`) % 1e6 + 1, rs: k, capSeconds: 3600 }); }
    if (only.includes("challenge")) for (const ch of BLOOM.challenges.list()) { const pres = BLOOM.challenges.speciesOf(ch);
      for (const sp of pres ? [pres.id] : SPECIES) { const cell = CB.bankCell(ch, BLOOM.species.resolve(sp));
        for (let e = 0; e < Math.min(ENTRIES, cell.entries.length); e++) for (const policy of POLICIES)
          tasks.push({ kind: "challenge", challengeId: ch.id, speciesId: sp, entry: e, archetypeId: cell.entries[e].archetypeId, seed: cell.entries[e].seed, classId: cell.entries[e].classId,
            policy, runSeed: fnv(`${ch.id}|${sp}|${e}`) % 1e6 + 1, rs: 1, capSeconds: 3600 }); } }
    if (only.includes("training")) for (const policy of POLICIES) for (let k = 1; k <= 4; k++)
      tasks.push({ kind: "training", speciesId: "organic_hybrid", policy, runSeed: D.training.rngSeed + k - 1, rs: k, capSeconds: 1800 });
    const out = fs.createWriteStream(path.join(SCRATCH, opt("--out", "rows.jsonl")));
    console.log("tasks", tasks.length, "workers", NW);
    await pool(tasks, r => out.write(JSON.stringify(r) + "\n")); out.end();
    console.log("done");
  } else { console.error("usage: study.mjs worlds|runs"); process.exit(2); }
}
