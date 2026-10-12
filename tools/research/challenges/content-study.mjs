// BLOOM-036C — authored Challenge CONTENT STUDY runner (READ-ONLY calibration; docs/CHALLENGE_CONTENT_STUDY_v1.md).
//
//   node tools/research/challenges/content-study.mjs [--concepts a,b] [--workers 12] [--out docs/evidence/bloom-036c/study-rows] [--sample N --diag N]
//   (--sample / --diag override every concept's own numbers: smoke runs only)
//   then: node tools/research/challenges/content-analysis.mjs   (→ candidate-study.json, candidate-summary.md, candidate banks)
//
// For every concept of concepts.mjs and every World Seed of its sample (the first `study.sample` worlds per recipe archetype of the RELEASED
// seed-bank pool stream, tools/challenge-bank-builder.mjs candidatePool — so the shipped bank's candidate records are an exact baseline):
//   · fixture concepts  → the seed-bank BUILDER's own evaluateWorld (physical → species S2 from the start → recipe → the scenario's layer P at the
//                         validator's FULL budget with every confirmation → the Challenge quality rule), unchanged; then, on the first `study.diag`
//                         worlds per archetype that pass, the DIAGNOSTICS: the same layer P asked for up to 3 materially distinct strategies (what
//                         wins, how fast, with which purchases, what the mechanic did), the arrival without the prescribed start, and (Dying
//                         World) the land the decline OPENS and CLOSES for this plant (engine evaluate() at the final pressure state);
//                         `study.ablations` re-prove the world from another start (does the start matter?)
//   · default concepts  → the same steps under the default rules: physical → species S2 → the archetype's own layer 7–8 search with the species
//                         (findStrategies, ≤ 3 distinct strategies, the archetype's pacing bands) — the proof a default-rules Challenge would need
// Nothing is changed: the run asserts the catalogue (config, traits, species, scenarios, archetypes, challenges) is identical before and after.
// Rows are appended to <out>/<concept>.jsonl (resumable: a world already in the file is skipped).
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";
import { ROOT, loadEngine, modules, candidatePool, evaluateWorld } from "../../challenge-bank-builder.mjs";
import { CONCEPTS } from "./concepts.mjs";

const r4 = x => x == null ? null : +(+x).toFixed(4);
const TERRAFORM = new Set(["warm", "cool", "humid", "dry"]);

function strategyRow(w, qualified) {
  const tf = w.purchases.filter(p => TERRAFORM.has(p.id));
  return { qualified, signature: w.signature, tokens: w.tokens, minimalBuild: w.minimalBuild, winSeconds: r4(w.winSeconds), marginSeconds: r4(w.marginSeconds),
    firstPurchaseSeconds: w.pacing ? r4(w.pacing.firstPurchaseSeconds) : null, maxGapSeconds: w.pacing ? r4(w.pacing.maxPurchaseGapSeconds) : null,
    purchases: w.purchases.map(p => [p.id, Math.round(p.seconds)]), terraformSteps: tf.length, firstTerraformSeconds: tf.length ? Math.round(tf[0].seconds) : null, totalSpent: w.totalSpent,
    ...(w.pressureAtMargin != null ? { pressureAtMargin: r4(w.pressureAtMargin) } : {}), ...(w.hold ? { holdCoverage: r4(w.hold.coverage) } : {}),
    ...(w.competition ? { contested: w.competition.contestedRegions, nativeStart: r4(w.competition.startShare), nativePeak: r4(w.competition.peakShare), nativeEnd: r4(w.competition.endShare), flips: w.competition.flips } : {}),
    ...(w.climate ? { shocks: w.climate.shocks.length, shockKinds: w.climate.shocks.map(s => s.kind || s.id || null), minCoverageAfterMargin: r4(w.climate.minCoverageAfterMargin), climatePeak: r4(w.climate.peak) } : {}),
    ...(w.confirm ? { confirmOk: w.confirm.every(x => x.ok) } : {}) };
}
const strategiesOf = v => [...(v.strategies || []).map(w => strategyRow(w, true)), ...(v.slow || []).map(w => strategyRow(w, false))];

/** green share of the land for this plant: now (start) and at the scenario's final pressure state; opened = green only at the end, closed = only now */
function declineLand(BLOOM, D, P, S, sp, st) {
  const sim = BLOOM.createSim(P, D.config, D.traits, { rng: () => 0.5, species: sp, scenario: S, ...(st ? { startingState: st } : {}) });
  const off = BLOOM.pressure.maxOffsets(S.pressure, P.globalClimate), green = f => sim.lampOf(f) === "green";
  let land = 0, now = 0, end = 0, opened = 0, closed = 0;
  sim.map.SEC.forEach((sec, i) => { const a = sec.area || sim.map.AREA[i] || 1, g0 = green(sim.evaluate(i, { temp: 0, moist: 0, rad: 0 }).fitness), g1 = green(sim.evaluate(i, off).fitness);
    land += a; if (g0) now += a; if (g1) end += a; if (g1 && !g0) opened += a; if (g0 && !g1) closed += a; });
  return { greenNow: r4(now / land), greenFinal: r4(end / land), opened: r4(opened / land), closed: r4(closed / land) };
}

function evaluateConcept(task, E) {
  const { BLOOM, D, SD } = E, cache = E.cache, c = CONCEPTS.find(x => x.id === task.concept), t0 = Date.now();
  const SDc = { ...SD, physicalCandidate: (spec, deps) => SD.physicalCandidate(spec, deps, cache) };
  if (c.kind === "fixture") {
    const ch = BLOOM.challenges.fixture(c.def), S = BLOOM.challenges.scenarioOf(ch), st = BLOOM.challenges.startingStateOf(ch);
    const row = evaluateWorld(task, { BLOOM, D, SD: SDc }, { challenges: [ch] });
    row.concept = c.id;
    if (!row.physical) return row;
    const phys = SDc.physicalCandidate({ archetypeId: task.archetypeId, seed: task.seed }), P = phys.planet;
    for (const [key, cell] of Object.entries(row.cells)) {
      const sp = BLOOM.species.resolve(key.split("/")[1]);
      if (st && cell.habitable != null) cell.habitableWithoutStart = r4(SD.assessWorld(P, undefined, sp).habitable);
      if (S.pressure && cell.habitable != null) cell.decline = declineLand(BLOOM, D, P, S, sp, st);
      const reachedP = cell.stage === "ok" || cell.stage === "scenario" || cell.stage === "quality";
      if (task.diag && cell.stage === "ok") { const t = Date.now();
        const v = BLOOM.validateScenario(P, D.config, D.traits, S, { archetypeId: task.archetypeId, species: sp, ...(st ? { startingState: st } : {}), minStrategies: 3 });
        cell.diag = { ms: Date.now() - t, status3: v.status, strategies: strategiesOf(v), classes: (v.classes || []).map(k => [k.signature, k.status]) }; }
      if (reachedP && (c.study.ablations || []).length) {
        cell.ablations = {};
        for (const ab of c.study.ablations) { const t = Date.now(), abSt = ab.start ? { ...ab.start, source: "challenge" } : null;
          const v = BLOOM.validateScenario(P, D.config, D.traits, S, { archetypeId: task.archetypeId, species: sp, ...(abSt ? { startingState: abSt } : {}) });
          const w = (v.strategies || [])[0];
          cell.ablations[ab.id] = { ok: !!v.ok, status: v.status, ms: Date.now() - t, habitable: r4(SD.assessWorld(P, undefined, sp, abSt).habitable), ...(w ? { witness: strategyRow(w, true) } : {}) }; }
      }
    }
    row.ms = Date.now() - t0;
    return row;
  }
  // default rules: physical → species S2 → the archetype's own layer 7–8 search with the species
  const sp = BLOOM.species.resolve(c.species), A = D.archetypes.find(a => a.id === task.archetypeId), key = `${c.id}/${sp.id}`;
  const row = { concept: c.id, archetypeId: task.archetypeId, seed: task.seed, poolIndex: task.poolIndex, physical: null, cells: {} };
  const phys = SDc.physicalCandidate({ archetypeId: task.archetypeId, seed: task.seed });
  if (!phys) { row.ms = Date.now() - t0; return row; }
  const P = phys.planet, a = P.archetype;
  row.physical = { fingerprint: phys.fingerprint, attempt: a.attempt, generationSeed: a.generationSeed, requestedWaterPct: a.requestedWaterPct, actualWaterPct: a.actualWaterPct,
    landmasses: a.landmasses, originLandmassShare: a.originLandmassShare, validatedLayers: a.validatedLayers, name: P.name, sections: P.sections.length, winAt: P.winThreshold ?? D.config.win,
    sky: { temperature: r4(P.globalClimate.temperature), moisture: r4(P.globalClimate.moisture) } };
  const ev = SD.evaluateSpecies(phys, sp, undefined, null, c.start || null), st1 = ev.dossier.stats, lim = ev.assessment.limits || {};
  const share = pre => r4(Object.entries(lim).filter(([k]) => k.startsWith(pre)).reduce((x, [, v]) => x + v, 0));
  const cell = row.cells[key] = { stage: null, habitable: r4(ev.habitable), classId: ev.classId, s2: !!ev.playability.ok, foothold: r4(ev.playability.s1.reachableShare),
    growable: r4(ev.playability.s1.growableShare), s2WinSeconds: ev.playability.s2.winSeconds ?? null, s2Build: ev.playability.s2.build || null,
    features: { meanTemp: r4(st1.meanTemp), waterShare: r4(st1.waterShare), landmasses: st1.landmasses, strongRadiation: r4(st1.strongRadiation),
      dry: share("Water:parched") + share("Water:dry"), wet: share("Water:wet") + share("Water:flooded"), cold: share("Temperature:cold") + share("Temperature:freezing"),
      hot: share("Temperature:hot") + share("Temperature:scorching"), soil: share("Soil:"), hazard: share("Hazard:") } };
  if (!cell.s2) { cell.stage = "species"; row.ms = Date.now() - t0; return row; }
  const t = Date.now(), V = A.validation || {};
  const r = BLOOM.findStrategies(P, D.config, D.traits, { species: sp, minStrategies: 3, pacing: V.pacing || null, ...(c.start ? { startingState: c.start } : {}) });
  const S = strategiesOf(r), first = S.find(s => s.qualified) || null, req = V.requiredConditions || [];
  cell.diag = { ms: Date.now() - t, status3: r.status, strategies: S, classes: (r.classes || []).map(k => [k.signature, k.status]) };
  cell.proof = { status: first ? "PASS" : (r.status === "INCONCLUSIVE" ? "INCONCLUSIVE" : "FAIL"), ok: !!first, ms: Date.now() - t, simulations: r.search ? r.search.simulations : null, confirmations: 0,
    strategies: S.filter(s => s.qualified).length, reason: first ? null : (S.length ? "won only outside the pacing bands" : (r.reason || "").slice(0, 140)),
    ...(first ? { marginSeconds: first.marginSeconds, purchases: first.purchases.length, terraformSteps: first.terraformSteps, holdCoverage: null } : {}) };
  cell.requiredAnswered = first ? req.every(cn => first.tokens.some(tk => tk.startsWith(cn + "="))) : null;
  cell.stage = first ? "ok" : "scenario";
  row.ms = Date.now() - t0;
  return row;
}

if (!isMainThread) {
  const { BLOOM, D } = loadEngine(), { SD } = await modules(), cache = SD.createSurveyCache();
  parentPort.on("message", task => { try { parentPort.postMessage({ ok: true, row: evaluateConcept(task, { BLOOM, D, SD, cache }) }); }
    catch (e) { parentPort.postMessage({ ok: false, error: String(e && e.stack || e), task }); } });
} else {
  const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
  const NW = +opt("--workers", String(Math.max(1, Math.min(12, os.cpus().length - 2)))), OUT = path.resolve(ROOT, opt("--out", "docs/evidence/bloom-036c/study-rows"));
  const only = opt("--concepts", null), list = only ? only.split(",") : CONCEPTS.map(c => c.id);
  const SAMPLE = opt("--sample", null), DIAG = opt("--diag", null);
  const { BLOOM, D } = loadEngine();
  const snap = () => JSON.stringify({ config: D.config, traits: D.traits, species: D.species, scenarios: D.scenarios, archetypes: D.archetypes, challenges: D.challenges });
  const before = snap(), pool = candidatePool(D, 160);
  fs.mkdirSync(OUT, { recursive: true });
  const tasks = [];
  for (const id of list) { const c = CONCEPTS.find(x => x.id === id); if (!c) throw new Error(`unknown concept ${id}`);
    if (c.kind === "fixture") BLOOM.challenges.fixture(c.def);   // refuses an invalid definition before any work
    const archs = c.kind === "fixture" ? c.def.launch.world.recipe.archetypes : c.archetypes, file = path.join(OUT, `${c.id}.jsonl`);
    const done = new Set(fs.existsSync(file) ? fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map(l => { const r = JSON.parse(l); return `${r.archetypeId}:${r.seed}`; }) : []);
    for (const w of pool) if (archs.includes(w.archetypeId) && w.poolIndex < (SAMPLE == null ? c.study.sample : +SAMPLE) && !done.has(`${w.archetypeId}:${w.seed}`))
      tasks.push({ concept: c.id, archetypeId: w.archetypeId, seed: w.seed, poolIndex: w.poolIndex, diag: w.poolIndex < (DIAG == null ? c.study.diag : +DIAG) }); }
  tasks.sort((a, b) => a.poolIndex - b.poolIndex || a.concept.localeCompare(b.concept) || a.archetypeId.localeCompare(b.archetypeId));
  console.log(`036C content study: ${tasks.length} concept worlds to evaluate (${list.join(", ")}) · ${NW} workers`);
  const t0 = Date.now(); let failed = 0;
  if (tasks.length) await new Promise((resolve, reject) => { let next = 0, done = 0, live = 0;
    for (let k = 0; k < Math.min(NW, tasks.length); k++) { const w = new Worker(fileURLToPath(import.meta.url)); live++;
      const feed = () => { if (next >= tasks.length) { w.terminate(); return; } w.postMessage(tasks[next++]); };
      w.on("message", m => { if (!m.ok) { failed++; console.error(`  ERROR ${m.task.concept} ${m.task.archetypeId}:${m.task.seed}: ${m.error.split("\n")[0]}`); }
        else fs.appendFileSync(path.join(OUT, `${m.row.concept}.jsonl`), JSON.stringify(m.row) + "\n");
        done++; if (done % 25 === 0 || done === tasks.length) console.log(`  ${done}/${tasks.length}  ${Math.round((Date.now() - t0) / 1000)} s`); feed(); });
      w.on("error", reject); w.on("exit", () => { if (--live === 0) resolve(); }); feed(); } });
  if (snap() !== before) throw new Error("the catalogue changed during the study");
  console.log(`done in ${Math.round((Date.now() - t0) / 1000)} s · ${failed} errors · catalogue unchanged`);
  if (failed) process.exitCode = 1;
}
