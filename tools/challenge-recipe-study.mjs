// BLOOM — Challenge recipe calibration study (BLOOM-036B, READ-ONLY measurement). docs/evidence/bloom-036b/CHALLENGE_RECIPE_STUDY.md.
//
//   node tools/challenge-recipe-study.mjs [--per-archetype 40] [--workers 14] [--out docs/evidence/bloom-036b/challenge-recipe-study.json]
//
// Before any Challenge recipe number is chosen, this measures what the EXISTING pipeline does on a sample of the normal physical world
// stream — the same production path the survey and the Challenge launch use, nothing re-implemented:
//   1. physical validation       survey-data physicalCandidate (BLOOM.play.runSearch, default scenario, layers 1–8)
//   2. species evaluation        survey-data evaluateSpecies (engine evaluate(): habitable share / class; BLOOM.species.validateFor: S1, S2)
//   3. scenario validation       BLOOM.validateScenario (layer P) with the species, for every S2-winnable world × every Challenge scenario
// plus the cheap structural prediction (layers 1–3) the selection layer can use to skip validations. Per world it records generation times,
// arrival class / habitable share, the layer-P verdict and the pacing / mechanic evidence the validator already exposes (margin time, first
// purchase, Terraform steps, native start / peak share, climate shocks before the hold, coverage held). Nothing is changed: no config,
// scenario, species or planet is edited (the run asserts the catalogue is byte-identical before and after).
// Sample: every archetype × N World Seeds drawn from a fixed stream (mulberry32(0x036b)) in content/play.js search.seedMin…seedMax.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLASSIC = ["content/config.js", "content/traits.js", "content/species.js", "planets/first_bloom.js", "content/archetypes.js", "content/scenarios.js", "content/play.js",
  "resources/bloom-sim.js", "resources/bloom-species.js", "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js",
  "resources/bloom-scenario.js", "resources/bloom-play.js"];
const require = createRequire(import.meta.url);
const load = () => { for (const f of CLASSIC) require(path.join(ROOT, f)); return { BLOOM: globalThis.BLOOM, D: globalThis.BLOOM_DATA }; };
const SCENARIOS = ["dying_world", "native_competition", "volatile_climate"];
const now = () => performance.now();
const r4 = x => x == null ? null : +x.toFixed(4);

if (!isMainThread) {
  const { BLOOM, D } = load();
  const SD = await import(pathToFileURL(path.join(ROOT, "resources/destination-survey/survey-data.js")).href);
  const SPECIES = BLOOM.species.ids();
  parentPort.on("message", ({ archetypeId, seed }) => {
    const row = { archetype: archetypeId, seed, structural: null, physical: null, species: {} };
    // structural prediction (layers 1–3): what a cheap pre-filter would say, per species
    const A = D.archetypes.find(a => a.id === archetypeId);
    let t = now(), w = null;
    try { w = BLOOM.generateFromArchetype(A, seed, { config: D.config, traits: D.traits, winnability: false }); } catch (e) { if (!e.attempts) throw e; }
    row.structural = { ok: !!w, ms: Math.round(now() - t), habitable: w ? Object.fromEntries(SPECIES.map(id => [id, r4(SD.assessWorld(w, undefined, id).habitable)])) : null,
      fingerprint: w ? SD.planetFingerprint(w) : null };
    t = now(); const phys = SD.physicalCandidate({ archetypeId, seed });
    row.physical = { ok: !!phys, ms: Math.round(now() - t) };
    if (!phys) { parentPort.postMessage(row); return; }
    const P = phys.planet;
    row.physical = { ...row.physical, fingerprint: phys.fingerprint, attempt: phys.attempt, sameAsStructural: phys.fingerprint === row.structural.fingerprint,
      name: P.name, winThreshold: P.winThreshold ?? D.config.win, sky: { temperature: r4(P.globalClimate.temperature), moisture: r4(P.globalClimate.moisture) },
      sections: P.sections.length, landmasses: P.archetype && P.archetype.landmasses, waterPct: P.archetype && P.archetype.actualWaterPct };
    for (const id of SPECIES) {
      const sp = BLOOM.species.resolve(id);
      t = now(); const ev = SD.evaluateSpecies(phys, sp); const evMs = Math.round(now() - t);
      const st = ev.dossier.stats;
      const s = row.species[id] = { habitable: r4(ev.habitable), classId: ev.classId, lamps: { green: r4(ev.assessment.lamps.green || 0), yellow: r4(ev.assessment.lamps.yellow || 0), red: r4(ev.assessment.lamps.red || 0) },
        s1: ev.playability.s1 && { reachableShare: r4(ev.playability.s1.reachableShare), growableShare: r4(ev.playability.s1.growableShare), low: !!ev.playability.s1.low },
        s2: { ok: !!ev.playability.s2.ok, reused: !!ev.playability.s2.reused, inconclusive: !!ev.playability.s2.inconclusive, winSeconds: ev.playability.s2.winSeconds ?? null, build: ev.playability.s2.build || null },
        evalMs: evMs, meanTemp: r4(st.meanTemp), strongRadiation: r4(st.strongRadiation), scenarios: {} };
      if (!s.s2.ok) continue;
      for (const scn of SCENARIOS) {
        const S = BLOOM.pressure.resolveScenario(D.scenarios, scn);
        t = now(); const v = BLOOM.validateScenario(P, D.config, D.traits, S, { archetypeId, species: sp }); const ms = Math.round(now() - t);
        const w0 = (v.strategies || [])[0] || null, any = w0 || (v.slow || [])[0] || null;
        const sky = x => x ? x.purchases.filter(p => (D.traits.find(tr => tr.id === p.id) || {}).board === "Terraform").length : null;
        s.scenarios[scn] = { ok: !!v.ok, status: v.status, ms, reason: v.ok ? null : (v.reason || "").slice(0, 220), simulations: v.search && v.search.simulations,
          witness: any && { qualified: !!w0, signature: any.signature, marginSeconds: any.marginSeconds, winSeconds: any.winSeconds, firstPurchaseSeconds: any.pacing && any.pacing.firstPurchaseSeconds,
            maxGap: any.pacing && any.pacing.maxPurchaseGapSeconds, purchases: any.purchases.length, terraformSteps: sky(any), totalSpent: any.totalSpent,
            pressureAtMargin: any.pressureAtMargin ?? null, hold: any.hold || null,
            competition: any.competition ? { startShare: any.competition.startShare, peakShare: any.competition.peakShare, endShare: any.competition.endShare, contestedRegions: any.competition.contestedRegions, flips: any.competition.flips } : null,
            climate: any.climate ? { terraformSteps: any.climate.terraformSteps, shocksBeforeHold: any.climate.shocksBeforeHold, shocks: any.climate.shocks.length, minCoverageAfterMargin: any.climate.minCoverageAfterMargin, peak: any.climate.peak } : null },
          competition: v.competition ? { startShare: v.competition.startShare, startTiles: v.competition.startTiles } : null };
      }
    }
    parentPort.postMessage(row);
  });
} else {
  const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
  const PER = +opt("--per-archetype", "40"), NW = +opt("--workers", String(Math.max(1, os.cpus().length - 2)));
  const OUT = path.resolve(ROOT, opt("--out", "docs/evidence/bloom-036b/challenge-recipe-study.json"));
  const { BLOOM, D } = load();
  const before = JSON.stringify({ config: D.config, traits: D.traits, archetypes: D.archetypes, scenarios: D.scenarios, species: D.species, play: D.play });
  const mulberry32 = a => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const rng = mulberry32(0x036b), pol = D.play.search, tasks = [];
  for (const A of D.archetypes) { const seen = new Set(); while (seen.size < PER) seen.add(pol.seedMin + Math.floor(rng() * (pol.seedMax - pol.seedMin + 1))); for (const seed of seen) tasks.push({ archetypeId: A.id, seed }); }
  console.log(`challenge recipe study: ${tasks.length} worlds (${D.archetypes.length} archetypes × ${PER}) × ${BLOOM.species.ids().length} species × ${SCENARIOS.length} scenarios, ${NW} workers`);
  const t0 = now(), rows = new Array(tasks.length); let next = 0, done = 0;
  await new Promise((resolve, reject) => {
    let live = 0;
    for (let k = 0; k < Math.min(NW, tasks.length); k++) {
      const w = new Worker(fileURLToPath(import.meta.url)); live++;
      const feed = () => { if (next >= tasks.length) { w.terminate(); return; } const i = next++; w.__i = i; w.postMessage(tasks[i]); };
      w.on("message", row => { rows[w.__i] = row; done++; if (done % 10 === 0 || done === tasks.length) console.log(`  ${done}/${tasks.length}  ${((now() - t0) / 1000).toFixed(0)} s`); feed(); });
      w.on("error", reject); w.on("exit", () => { if (--live === 0) resolve(); });
      feed();
    }
  });
  const after = JSON.stringify({ config: D.config, traits: D.traits, archetypes: D.archetypes, scenarios: D.scenarios, species: D.species, play: D.play });
  if (before !== after) throw new Error("the catalogue changed during the study");
  const out = { format: "bloom-036b-challenge-recipe-study@1", tool: "tools/challenge-recipe-study.mjs", generatedAt: new Date().toISOString(),
    sample: { perArchetype: PER, archetypes: D.archetypes.map(a => a.id), seedStream: "mulberry32(0x036b) in play.search seedMin…seedMax", worlds: tasks.length },
    species: BLOOM.species.ids(), scenarios: SCENARIOS, wallSeconds: Math.round((now() - t0) / 1000), workers: NW, catalogueUnchanged: true, rows };
  fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(out) + "\n");
  console.log(`wrote ${path.relative(ROOT, OUT)} (${out.wallSeconds} s)`);
}
