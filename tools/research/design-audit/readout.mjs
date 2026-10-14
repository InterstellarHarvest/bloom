// BLOOM-038 design audit — READOUT HONESTY (failure-state clarity, sim side). Research only.
//
//   node tools/research/design-audit/readout.mjs   (needs <scratch>/worlds.json and <scratch>/rows.jsonl from study.mjs)
//   → <scratch>/readout.json (analyze.mjs folds it into docs/evidence/bloom-038/failure-state-audit.json)
//
// For every region the released UI says one of two things (resources/run-ui/planet-view.js, decision-rooms.js, game-session.js
// LIMIT_MSG / FIX_HINT): BLOCKED ("Limiting: <category> · too cold …" + a fix hint) when the lowest category factor is below
// config.categories.blockedBelow, else "Nothing holding the plant back". Whether plants can actually colonise the region is a different
// rule: the PRODUCT of the four factors must exceed config.grow.growThresh. This measures, by land area, how often the two disagree, and
// whether the named fix can open a blocked region by itself:
//   says-blocked-but-grows     blocked readout, fitness > growThresh            (the plant spreads into a region labelled blocked)
//   says-clear-but-cannot-grow "Nothing holding the plant back", fitness ≤ growThresh (several sub-green factors multiply below the line)
//   multi-factor-blocked       blocked, and ≥ 2 categories below blockedBelow  (fixing the named one alone cannot be enough)
//   hint-cannot-help           the hint's Adapt answer (one step, and up to its maximum) leaves the region not growable
//   soil-by-pH                 Soil is the limit but salt is fine — the hint says "Salt Handling", which does not change pH
//   hazard-by-toxicity         Hazard is the limit because of toxicity — no trait addresses it (the hint says so)
// States sampled: the landing (as the survey / dossier shows it) and the moment each research run ended (its genome + sky + scenario state),
// so the measure covers what players read mid-run, not only at the start.
import fs from "node:fs";
import path from "node:path";
import { engine, ROOT } from "./engine.mjs";

const SCRATCH = process.env.BLOOM038_SCRATCH || path.join(ROOT, ".design-audit-scratch");
const E = await engine(), { BLOOM, D, SD, CB } = E, CFG = D.config, BB = CFG.categories.blockedBelow, GT = CFG.grow.growThresh, So = CFG.categories.Soil;
const HINT_TRAIT = { Temperature: w => (w === "freezing" || w === "cold") ? ["cold", "warm"] : ["heat", "cool"], Water: w => (w === "parched" || w === "dry") ? ["drought", "humid"] : ["flood", "dry"],
  Soil: () => ["salt"], Hazard: () => ["rad"] };
const tally = () => ({ land: 0, blocked: 0, blockedButGrows: 0, clearButCannotGrow: 0, multiFactor: 0, hintAdaptCannotHelp: 0, hintNeitherHelps: 0, soilByPH: 0, hazardByTox: 0, wouldHelpEmpty: 0, wouldHelpEmptyButMultiStep: 0, regions: 0, examples: [] });
function measure(sim, T, tag) {
  const M = sim.map, LA = M.AREA.reduce((a, b) => a + b, 0);
  for (let i = 0; i < M.SC; i++) {
    const e = sim.evaluate(i), a = M.AREA[i] / LA, L = M.SEC[i].local, d = sim.derived(); T.land += a; T.regions++;
    if (M.SEC[i].isOrigin) continue; // the protected refuge reads differently (adapter refugeOf) — audited in the browser
    const blocked = e.limitF < BB, grows = e.fitness > GT, low = Object.keys(e.cats).filter(k => e.cats[k].f < BB);
    if (blocked) T.blocked += a;
    if (blocked && grows) T.blockedButGrows += a;
    if (!blocked && !grows) { T.clearButCannotGrow += a; if (T.examples.length < 12) T.examples.push({ tag, kind: "clear-but-cannot-grow", region: i, fitness: +e.fitness.toFixed(3), cats: Object.fromEntries(Object.entries(e.cats).map(([k, c]) => [k, +c.f.toFixed(2) + " " + c.word])) }); }
    if (blocked && !grows) {
      if (low.length >= 2) T.multiFactor += a;
      const [adaptId, tfId] = HINT_TRAIT[e.limitKey](e.cats[e.limitKey].word);
      const opens = id => { const t = sim.traitById[id]; if (!t || !sim.canBuy(t) || !sim.offered(t)) return false;
        // apply the hinted answer as far as it legally goes (a player following the hint keeps buying it), then evaluate
        const g0 = { ...sim.genome }, s0 = { ...sim.sky }; let ok = false;
        for (let k = 0; k < 4 && sim.canBuy(t); k++) { const ef = t.effect, gm = sim.genome;
          if (ef.type === "tempPoint" || ef.type === "level") gm[ef.stat] = (gm[ef.stat] || 0) + 1;
          else if (ef.type === "waterArm") { if (gm.waterArm !== ef.arm) { gm.waterArm = ef.arm; gm.waterPts = 0; } gm.waterPts++; }
          else if (ef.type === "sky") sim.sky[ef.axis] = Math.min(ef.max ?? Infinity, Math.max(ef.min ?? -Infinity, sim.sky[ef.axis] + ef.delta));
          if (sim.evaluate(i).fitness > GT) { ok = true; break; } if (ef.type === "level" && gm[ef.stat] >= ef.max) break; }
        Object.assign(sim.genome, g0); Object.assign(sim.sky, s0); return ok; };
      const aOk = opens(adaptId), tOk = tfId ? opens(tfId) : false;
      // the panel's WOULD HELP list = offered traits whose ONE-step preview opens this region (adapter.wouldHelp). Empty, yet the hinted
      // answer opens it in ≥ 2 steps → the player is told "No offered upgrade opens it right now" about a region that IS reachable by Adapt
      const one = D.traits.some(t => sim.offered(t) && sim.canBuy(t) && (sim.previewOf(t.id) || { gain: [] }).gain.includes(i));
      if (!one) { T.wouldHelpEmpty += a; if (aOk || tOk) { T.wouldHelpEmptyButMultiStep += a; if (T.examples.filter(x => x.kind === "would-help-empty-multistep").length < 6) T.examples.push({ tag, kind: "would-help-empty-multistep", region: i, limit: e.limitKey + ":" + e.cats[e.limitKey].word }); } }
      if (!aOk) T.hintAdaptCannotHelp += a; if (!aOk && !tOk) T.hintNeitherHelps += a;
      if (e.limitKey === "Soil") { const saltBad = L.salinity > d.saltTol; const phBad = L.ph < So.phMin || L.ph > So.phMax; if (phBad && !saltBad) T.soilByPH += a; }
      if (e.limitKey === "Hazard") { if (L.toxicity > d.toxTol && !(e.effRad > d.radTol)) T.hazardByTox += a; }
    }
  }
}
const out = { format: "bloom-038-readout-honesty@1", blockedBelow: BB, growThresh: GT, landing: {}, runEnd: {} };
const W = JSON.parse(fs.readFileSync(path.join(SCRATCH, "worlds.json"), "utf8")).rows.filter(r => r.valid);
const SPECIES = ["organic_hybrid", "cinder_rosette", "woolly_candle", "reed_spire"];
const planets = new Map();
const planetOf = (A, seed, attempt) => { const k = `${A}:${seed}`; if (!planets.has(k)) planets.set(k, BLOOM.archetype.attemptPlanet(D.archetypes.find(a => a.id === A), seed, attempt).planet); return planets.get(k); };
// landing: every sample world × playable species
for (const w of W) for (const sp of SPECIES) { if (!w.species[sp].playable) continue; const P = planetOf(w.archetypeId, w.seed, w.attempt);
  const k = `${w.archetypeId}|${sp}`, T = out.landing[k] || (out.landing[k] = tally());
  measure(BLOOM.createSim(P, CFG, D.traits, { rng: () => 0.5, species: BLOOM.species.resolve(sp) }), T, `${w.archetypeId}:${w.seed}/${sp}@landing`); }
// run end: replay each Expedition / Challenge research run's purchases (with unlimited Biomass) and its elapsed time (scenario state), then read
const rows = fs.readFileSync(path.join(SCRATCH, "rows.jsonl"), "utf8").split("\n").filter(Boolean).map(l => JSON.parse(l)).filter(r => r.kind !== "training" && r.policy === "balanced");
for (const r of rows) {
  let P; const ch = r.challengeId ? BLOOM.challenges.resolve(r.challengeId) : null;
  if (ch) P = CB.buildBankWorld(CB.bankCell(ch, BLOOM.species.resolve(r.speciesId)).entries[r.entry], E).planet; else P = planetOf(r.archetypeId, r.seed, r.attempt);
  const sim = BLOOM.createSim(P, CFG, D.traits, { rng: () => 0.5, species: BLOOM.species.resolve(r.speciesId), ...(ch ? { scenario: BLOOM.challenges.scenarioOf(ch) } : {}),
    ...(ch && BLOOM.challenges.startingStateOf(ch) ? { startingState: BLOOM.challenges.startingStateOf(ch) } : {}) });
  for (const p of r.purchases) { sim.biomass = 1e9; sim.buy(p.id); }
  // the scenario's pressure state at the run's end (Dying World offsets; Volatile Climate shocks are transient and not replayed)
  if (sim.pressure && ch && BLOOM.challenges.scenarioOf(ch).pressure) { const n = Math.round(r.endSeconds * 1000 / CFG.tickMs); sim.ticks = Math.max(0, n - 1); sim.tick(); }
  const k = `${ch ? ch.id : "expedition"}|${r.speciesId}`, T = out.runEnd[k] || (out.runEnd[k] = tally());
  measure(sim, T, `${ch ? ch.id : r.archetypeId + ":" + r.seed}/${r.speciesId}@end`);
}
const round = T => { for (const k in T) if (typeof T[k] === "number" && k !== "regions") T[k] = +T[k].toFixed(3); return T; };
for (const g of ["landing", "runEnd"]) for (const k in out[g]) round(out[g][k]);
// totals
for (const g of ["landing", "runEnd"]) { const S = tally(); for (const T of Object.values(out[g])) for (const k in S) if (typeof S[k] === "number") S[k] += T[k]; out[g + "Total"] = round(S); }
fs.writeFileSync(path.join(SCRATCH, "readout.json"), JSON.stringify(out, null, 1));
const pct = (T, k) => (100 * T[k] / T.land).toFixed(1) + "%";
for (const g of ["landingTotal", "runEndTotal"]) { const T = out[g]; console.log(g, ["blocked", "blockedButGrows", "clearButCannotGrow", "multiFactor", "hintAdaptCannotHelp", "hintNeitherHelps", "soilByPH", "hazardByTox", "wouldHelpEmpty", "wouldHelpEmptyButMultiStep"].map(k => `${k} ${pct(T, k)}`).join(" · ")); }
