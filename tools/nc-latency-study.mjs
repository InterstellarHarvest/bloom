// BLOOM — Native Competition launch-latency study (BLOOM-036B1, READ-ONLY). docs/evidence/bloom-036b/NATIVE_COMPETITION_LATENCY_STUDY.md.
//
//   node tools/nc-latency-study.mjs [--per-archetype 40] [--workers 15] [--out docs/evidence/bloom-036b/nc-latency-study.json]
//
// The same sample as the recipe study (every archetype × N World Seeds from mulberry32(0x036b)), Native Competition only. Per world and
// per species, each stage the Challenge rule runs, timed separately, through the production code (nothing re-implemented):
//   predicted   the structural world (layers 1–3) and its species arrival share     (challenge-world.js predictHabitable)
//   physical    the fully validated world                                            (survey-data physicalCandidate)
//   species     arrival share / class, S1 foothold (reachable + growable), S2        (survey-data evaluateSpecies)
//   cover       the native start-share probe                                         (challenge-world.js nativeStartShare)
//   scenario    layer P with the species at the validator's FULL budget, with the opt-in run TRACE: every witness ("w") and
//               confirmation ("c") run in order with its duration and outcome — so any total-run budget (the Challenge proof budget) can be
//               replayed exactly offline (the search is ordered and the cap is only checked before a new witness run)
// The catalogue is asserted byte-identical before and after.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Worker, isMainThread, parentPort } from "node:worker_threads";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLASSIC = ["content/config.js", "content/traits.js", "content/species.js", "planets/first_bloom.js", "content/archetypes.js", "content/scenarios.js", "content/play.js",
  "resources/bloom-sim.js", "resources/bloom-species.js", "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js",
  "resources/bloom-scenario.js", "resources/bloom-play.js"];
const require = createRequire(import.meta.url);
const load = () => { for (const f of CLASSIC) require(path.join(ROOT, f)); return { BLOOM: globalThis.BLOOM, D: globalThis.BLOOM_DATA }; };
const now = () => performance.now();
const r4 = x => x == null ? null : +x.toFixed(4);

if (!isMainThread) {
  const { BLOOM, D } = load();
  const SD = await import(pathToFileURL(path.join(ROOT, "resources/destination-survey/survey-data.js")).href);
  const CW = await import(pathToFileURL(path.join(ROOT, "resources/challenges/challenge-world.js")).href);
  const SPECIES = BLOOM.species.ids(), S = BLOOM.pressure.resolveScenario(D.scenarios, "native_competition");
  parentPort.on("message", ({ archetypeId, seed }) => {
    const row = { archetype: archetypeId, seed, physical: null, species: {} }, pick = { draw: 0, archetypeId, seed };
    let t = now(); const phys = SD.physicalCandidate({ archetypeId, seed }); row.physical = { ok: !!phys, ms: Math.round(now() - t) };
    for (const id of SPECIES) {
      const sp = BLOOM.species.resolve(id), x = row.species[id] = {};
      t = now(); x.predicted = r4(CW.predictHabitable(pick, undefined, sp, null, null)); x.predictMs = Math.round(now() - t);
      if (!phys) continue;
      t = now(); const ev = SD.evaluateSpecies(phys, sp); x.speciesMs = Math.round(now() - t);
      x.habitable = r4(ev.habitable); x.classId = ev.classId; x.s2 = !!ev.playability.ok;
      x.s1 = { reachable: r4(ev.playability.s1.reachableShare), growable: r4(ev.playability.s1.growableShare) };
      t = now(); x.cover = r4(CW.nativeStartShare(phys.planet, "native_competition", sp)); x.coverMs = Math.round(now() - t);
      if (!x.s2) continue;
      t = now(); const v = BLOOM.validateScenario(phys.planet, D.config, D.traits, S, { archetypeId, species: sp, trace: true });
      x.scenario = { ok: !!v.ok, status: v.status, ms: Math.round(now() - t), reason: v.ok ? null : (v.reason || "").replace(/^layer P \(native_competition\): /, "").slice(0, 160),
        trace: (v.search && v.search.trace) || [], simulations: v.search && v.search.simulations, confirmations: (v.search && v.search.confirmations) || 0,
        witness: v.strategies && v.strategies[0] ? { marginSeconds: v.strategies[0].marginSeconds, purchases: v.strategies[0].purchases.length,
          competition: v.strategies[0].competition ? { startShare: v.strategies[0].competition.startShare, peakShare: v.strategies[0].competition.peakShare, contestedRegions: v.strategies[0].competition.contestedRegions } : null } : null };
    }
    parentPort.postMessage(row);
  });
} else {
  const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
  const PER = +opt("--per-archetype", "40"), NW = +opt("--workers", String(Math.max(1, os.cpus().length - 1)));
  const OUT = path.resolve(ROOT, opt("--out", "docs/evidence/bloom-036b/nc-latency-study.json"));
  const { BLOOM, D } = load();
  const snap = () => JSON.stringify({ config: D.config, traits: D.traits, archetypes: D.archetypes, scenarios: D.scenarios, species: D.species, play: D.play }), before = snap();
  const mulberry32 = a => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const rng = mulberry32(0x036b), pol = D.play.search, tasks = [];
  for (const A of D.archetypes) { const seen = new Set(); while (seen.size < PER) seen.add(pol.seedMin + Math.floor(rng() * (pol.seedMax - pol.seedMin + 1))); for (const seed of seen) tasks.push({ archetypeId: A.id, seed }); }
  console.log(`native competition latency study: ${tasks.length} worlds × ${BLOOM.species.ids().length} species, ${NW} workers`);
  const t0 = now(), rows = new Array(tasks.length); let next = 0, done = 0;
  await new Promise((resolve, reject) => { let live = 0;
    for (let k = 0; k < Math.min(NW, tasks.length); k++) { const w = new Worker(fileURLToPath(import.meta.url)); live++;
      const feed = () => { if (next >= tasks.length) { w.terminate(); return; } const i = next++; w.__i = i; w.postMessage(tasks[i]); };
      w.on("message", row => { rows[w.__i] = row; done++; if (done % 10 === 0 || done === tasks.length) console.log(`  ${done}/${tasks.length}  ${((now() - t0) / 1000).toFixed(0)} s`); feed(); });
      w.on("error", reject); w.on("exit", () => { if (--live === 0) resolve(); }); feed(); } });
  if (snap() !== before) throw new Error("the catalogue changed during the study");
  const out = { format: "bloom-036b1-nc-latency-study@1", tool: "tools/nc-latency-study.mjs", generatedAt: new Date().toISOString(), sample: { perArchetype: PER, worlds: tasks.length, seedStream: "mulberry32(0x036b)" },
    species: BLOOM.species.ids(), workers: NW, hardwareThreads: os.cpus().length, wallSeconds: Math.round((now() - t0) / 1000), catalogueUnchanged: true, rows };
  fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(out) + "\n");
  console.log(`wrote ${path.relative(ROOT, OUT)} (${out.wallSeconds} s)`);
}
