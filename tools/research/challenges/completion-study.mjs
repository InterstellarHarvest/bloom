// BLOOM-036D — Challenge COMPLETION-CONDITION study (READ-ONLY calibration). docs/CHALLENGE_COMPLETION_STUDY_v1.md.
//
//   node tools/research/challenges/completion-study.mjs [--studies thin_air,hearthfire,windfall,oasis_line] [--workers 12] [--out docs/evidence/bloom-036d/rows]
//   then: node tools/research/challenges/completion-analysis.mjs
//
// What a completion condition would ask, measured with the EXISTING proof machinery — nothing in the game changes:
//   1. the world's ordinary Challenge proof (the seed-bank builder's evaluateWorld: physical → S2 from the start → recipe → the scenario's layer P at
//      the validator's FULL budget with every confirmation → quality), the bank's own verdict;
//   2. the ordinary winning strategies (layer P asked for ≤ 3 materially distinct strategies) — what a perfect player does under plain Bloom;
//   3. every plan REPLAYED in the real engine through the validator's own simulator (BLOOM.witness.simulate: fixed validation RNG, purchases as
//      soon as earned Biomass allows, the scenario live, measurePeak so the run continues to its plateau) to read the state a condition would test;
//   4. CONDITION-SEEKING plans the ordinary search does not try (Hearthfire: N warming steps; Windfall: Terraform rushed to the front), proven the
//      way layer P proves a witness — margin + hold under the validation seed AND each confirmation seed, inside the scenario's pacing bands —
//      plus the condition itself.
// Conditions are evaluated from state the engine already has, except where a row says "new tracking" (the Oasis Line landing snapshot is taken
// from a fresh simulation of the same planet at tick 0 — what a runtime condition would have to record at landing).
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { Worker, isMainThread, parentPort } from "node:worker_threads";
import { ROOT, loadEngine, modules, candidatePool, evaluateWorld } from "../../challenge-bank-builder.mjs";

const r4 = x => x == null ? null : +(+x).toFixed(4);
const TF = new Set(["warm", "cool", "humid", "dry"]);
const PRESCRIBED = sp => ({ policy: "prescribed", species: sp }), CHOICE = { policy: "player-choice" }, NORMAL = { policy: "normal" };
const RECIPE = archetypes => ({ policy: "seed-bank", recipe: { version: 1, archetypes, arrival: null, nativeCover: null }, bank: { version: 1, size: 50 } });
const fx = (id, scenario, icon, launch) => ({ id: `c36d_${id}`, version: 1, status: "fixture", name: `Study ${id}`, short: "Completion-condition study fixture.", scenario,
  presentation: { tagline: "Study fixture.", briefing: "Study fixture.", strategicIdea: "Study fixture.", icon, science: null }, launch, completion: { win: "bloom", conditions: [] } });
const ALL = ["ocean_archipelago", "desert_world", "frozen_world"];

// the studied Challenge definitions (QA fixtures; their completion stays the normal Bloom — the conditions are evaluated by this tool only)
export const STUDIES = {
  thin_air: { def: fx("thin_air", "dying_world", "pressure", { species: PRESCRIBED("woolly_candle"), world: RECIPE(["desert_world", "ocean_archipelago"]), startingState: NORMAL }), sample: 40 },
  hearthfire: { def: fx("hearthfire", "volatile_climate", "climate", { species: PRESCRIBED("cinder_rosette"), world: RECIPE(["frozen_world"]), startingState: NORMAL }), sample: 80 },
  ...Object.fromEntries([200, 225, 250].map(b => [`windfall_${b}`, { def: fx(`windfall_${b}`, "volatile_climate", "climate", { species: CHOICE, world: RECIPE(ALL), startingState: { policy: "prescribed", adaptations: [], biomass: b } }), sample: 15 }])),
  oasis_line: { def: null, released: "oasis_line", sample: 60 },   // the RELEASED Challenge (read-only: is an extra condition an improvement?)
};

function strategyOf(w) { return { qualified: !!w.qualified, signature: w.signature, tokens: w.tokens, plan: w.plan || w.build, purchases: w.purchases.map(p => [p.id, Math.round(p.seconds)]), marginSeconds: r4(w.marginSeconds), winSeconds: r4(w.winSeconds),
  terraform: w.purchases.filter(p => TF.has(p.id)).map(p => p.id), climatePeak: w.climate ? r4(w.climate.peak) : null, shocks: w.climate ? w.climate.shocks.length : null }; }

/** replay one plan with the validator's own simulator, under the validation seed and every confirmation seed: the layer-P meaning of "passes" */
function prove(E, P, S, sp, st, plan, extra = {}) {
  const { BLOOM, D } = E, V = S.validation || {}, seeds = [null, ...(V.confirmRngSeeds || [])], target = (P.winThreshold ?? D.config.win) + D.config.validation.winMargin;
  const runs = seeds.map(seed => BLOOM.witness.simulate(P, D.config, D.traits, plan, target, !!extra.measurePeak, S, seed, sp, st));
  const r = runs[0], pacing = V.pacing ? BLOOM.witness.checkPacing(r, V.pacing) : { ok: true, reasons: [] };
  return { ok: runs.every(x => x.ok) && pacing.ok, okMain: r.ok, pacingOk: pacing.ok, pacing: pacing.reasons, illegal: r.illegal || null, plan, marginSeconds: r4(r.marginSeconds), winSeconds: r4(r.winSeconds),
    hold: r.hold ? { seconds: r.hold.seconds, coverage: r.hold.coverage, held: r.hold.held } : null, trace: r.trace, climate: r.climate ? { peak: r.climate.peak, shocks: r.climate.shocks.length, terraformSteps: r.climate.terraformSteps } : null,
    lost: r.lost, purchases: r.purchases.map(p => [p.id, p.seconds]), uncolonizedAtEnd: extra.keepSnap ? r.uncolonizedAtEnd : undefined, confirm: runs.slice(1).map(x => !!x.ok) };
}

function evaluateStudy(task, E) {
  const { BLOOM, D, SD, cache } = E, st0 = Date.now(), Z = STUDIES[task.study];
  const SDc = { ...SD, physicalCandidate: (spec, deps) => SD.physicalCandidate(spec, deps, cache) };
  const ch = Z.def ? BLOOM.challenges.fixture(Z.def) : BLOOM.challenges.resolve(Z.released), S = BLOOM.challenges.scenarioOf(ch), st = BLOOM.challenges.startingStateOf(ch);
  const row = evaluateWorld(task, { BLOOM, D, SD: SDc }, { challenges: [ch], reasonChars: Infinity }); row.study = task.study;
  if (!row.physical) return row;
  const P = SDc.physicalCandidate({ archetypeId: task.archetypeId, seed: task.seed }).planet;
  for (const [key, cell] of Object.entries(row.cells)) {
    if (cell.stage !== "ok" && cell.stage !== "scenario") continue;
    const sp = BLOOM.species.resolve(key.split("/")[1]);
    const v = BLOOM.validateScenario(P, D.config, D.traits, S, { archetypeId: task.archetypeId, species: sp, ...(st ? { startingState: st } : {}), minStrategies: 3 });
    const ws = [...(v.strategies || []).map(w => ({ ...w, qualified: true })), ...(v.slow || []).map(w => ({ ...w, qualified: false }))];
    cell.strategies = ws.map(strategyOf);
    cell.reasonFull = v.ok ? null : v.reason;   // (036D tooling correction) the FULL layer-P reason — never cut to 140 characters in research output
    const plans = ws.map(w => w.plan || w.build).filter(Boolean);
    const C = cell.conditions = {};
    if (task.study === "thin_air") {
      // Bloom held AT the final atmospheric state: layer P's own hold check (max(margin, final state) + 60 s) — plus when coverage first reached the
      // Bloom threshold vs when the atmosphere reached its final state (a player under plain Bloom would have WON at the first moment)
      const fullAt = S.pressure.graceSeconds + S.pressure.durationSeconds;
      C.finalState = ws.filter(w => w.qualified).map(w => { const r = prove(E, P, S, sp, st, w.plan || w.build, { measurePeak: true }), tr = r.trace || [];
        const atFinal = (tr.find(x => x[0] >= fullAt) || [null, null])[1], firstBloom = r.winSeconds;
        return { signature: w.signature, ok: r.ok, holdHeld: r.hold && r.hold.held, holdCoverage: r.hold && r.hold.coverage, firstBloomSeconds: firstBloom, finalAt: fullAt,
          bloomBeforeFinal: firstBloom != null && firstBloom < fullAt, waitSeconds: firstBloom != null ? Math.max(0, fullAt - firstBloom) : null, coverageAtFinal: atFinal,
          coverageAtFirstBloom: firstBloom != null ? (tr.find(x => x[0] >= firstBloom) || [null, null])[1] : null, peakCoverage: Math.max(0, ...tr.map(x => x[1])) }; });
    }
    if (task.study === "hearthfire") {
      // net sky warming ≥ N steps (+6 °C each): ordinary strategies, a cold-excluded search, and forced-warming variants of every plan
      const net = pl => pl.filter(x => x === "warm").length - pl.filter(x => x === "cool").length;
      C.ordinaryNetWarm = ws.filter(w => w.qualified).map(w => net(w.plan || w.build));
      const nc = BLOOM.findStrategies(P, D.config, D.traits, { minStrategies: 3, pacing: (S.validation || {}).pacing, scenario: S, species: sp, ...(st ? { startingState: st } : {}), excludeTraits: ["cold"] });
      const noCold = [...(nc.strategies || []), ...(nc.slow || [])];
      C.noColdSearch = { status: nc.status, strategies: noCold.map(w => ({ qualified: (nc.strategies || []).includes(w), plan: w.plan || w.build, netWarm: net(w.plan || w.build), climatePeak: w.climate ? r4(w.climate.peak) : null, shocks: w.climate ? w.climate.shocks.length : null })) };
      const bases = [...plans, ...noCold.map(w => w.plan || w.build)].map(pl => pl.filter(x => x !== "warm" && x !== "cool"));
      const uniq = [...new Map(bases.map(b => [b.join(","), b])).values()];
      C.forced = {};
      for (const N of [1, 2, 3]) {
        const variants = [];
        for (const b of uniq) { // warming first; and warming interleaved after the first adaptation (a paced player)
          variants.push(["warm-first", [...Array(N).fill("warm"), ...b]]);
          if (b.length) variants.push(["warm-paced", [b[0], ...Array(N).fill(null).flatMap((_, k) => k < b.length - 1 ? ["warm", b[k + 1]] : ["warm"]), ...b.slice(N + 1)]]);
        }
        const seen = new Set(), out = [];
        for (const [mode, pl] of variants) { const k = pl.join(","); if (seen.has(k)) continue; seen.add(k); const r = prove(E, P, S, sp, st, pl);
          out.push({ mode, plan: pl, ok: r.ok, okMain: r.okMain, pacing: r.pacing, netWarm: net(pl), cold: pl.filter(x => x === "cold").length, marginSeconds: r.marginSeconds, climatePeak: r.climate && r.climate.peak, shocks: r.climate && r.climate.shocks, lost: r.lost, illegal: r.illegal }); }
        C.forced[N] = out;
      }
    }
    if (task.study.startsWith("windfall_")) {
      // never reaching the Critical band (the scenario's own band, from 0.8): ordinary strategies' climate peak, and RUSH variants of every plan
      // (its Terraform steps bought first, back to back — the line a big reserve tempts), rush+1 / rush+2 (one / two more steps on its most-used axis)
      const crit = S.climateInstability.bands.find(b => b.id === "critical").from;
      C.criticalFrom = crit;
      C.ordinary = ws.filter(w => w.qualified).map(w => ({ peak: w.climate ? r4(w.climate.peak) : null, critical: !!(w.climate && w.climate.peak >= crit), terraform: (w.plan || w.build).filter(x => TF.has(x)).length }));
      const rush = [];
      for (const pl of plans) { const tf = pl.filter(x => TF.has(x)), rest = pl.filter(x => !TF.has(x)); if (!tf.length) continue;
        const most = Object.entries(tf.reduce((m, x) => (m[x] = (m[x] || 0) + 1, m), {})).sort((a, b) => b[1] - a[1])[0][0];
        // rush+2: two more steps on that axis — where (if anywhere) the existing Critical band starts to be reachable
        for (const [mode, p2, extra] of [["rush", [...tf, ...rest], 0], ["rush+1", [...tf, most, ...rest], 1], ["rush+2", [...tf, most, most, ...rest], 2]]) { const r = prove(E, P, S, sp, st, p2);
          rush.push({ mode, plan: p2, ok: r.ok, okMain: r.okMain, pacing: r.pacing, peak: r.climate && r.climate.peak, critical: !!(r.climate && r.climate.peak >= crit), shocks: r.climate && r.climate.shocks, terraform: tf.length + extra, lost: r.lost }); } }
      C.rush = rush;
    }
    if (task.study === "oasis_line") {
      // regions native vegetation held AT LANDING (a fresh simulation at tick 0: native tiles ≥ the scenario's dominatedShare of the region — NEW
      // tracking for a runtime condition) and how many of them each winning witness holds at its hold check (≥ 40 % of the region living)
      const s0 = BLOOM.createSim(P, D.config, D.traits, { rng: () => 0.5, scenario: S, species: sp, ...(st ? { startingState: st } : {}) }), CS = s0.competition, AREA = s0.map.AREA;
      const share = (S.competition.events || {}).dominatedShare ?? 0.5;
      const nativeAtLanding = s0.map.SEC.map((sec, i) => i).filter(i => CS.regionTiles.native[i] >= share * AREA[i]);
      C.nativeRegionsAtLanding = nativeAtLanding.length; C.regions = s0.map.SEC.length;
      C.held = ws.filter(w => w.qualified).map(w => { const r = prove(E, P, S, sp, st, w.plan || w.build, { keepSnap: true }), un = new Set(((r.uncolonizedAtEnd || {}).sections || []).map(x => x.id));
        const ids = nativeAtLanding.map(i => s0.map.SEC[i].id); return { ok: r.ok, heldFormerNative: ids.filter(id => !un.has(id)).length, of: ids.length }; });
    }
  }
  row.ms = Date.now() - st0;
  return row;
}

if (!isMainThread) {
  const { BLOOM, D } = loadEngine(), { SD } = await modules(), cache = SD.createSurveyCache();
  parentPort.on("message", t => { try { parentPort.postMessage({ ok: true, row: evaluateStudy(t, { BLOOM, D, SD, cache }) }); } catch (e) { parentPort.postMessage({ ok: false, error: String(e && e.stack || e), t }); } });
} else {
  const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
  const NW = +opt("--workers", String(Math.max(1, Math.min(12, os.cpus().length - 2)))), OUT = path.resolve(ROOT, opt("--out", "docs/evidence/bloom-036d/rows"));
  const list = (opt("--studies", null) || Object.keys(STUDIES).join(",")).split(","), SAMPLE = opt("--sample", null);
  const { BLOOM, D } = loadEngine(), snap = () => JSON.stringify({ config: D.config, traits: D.traits, species: D.species, scenarios: D.scenarios, archetypes: D.archetypes, challenges: D.challenges });
  const before = snap(), pool = candidatePool(D, 160); fs.mkdirSync(OUT, { recursive: true });
  const tasks = [];
  for (const id of list) { const Z = STUDIES[id]; if (!Z) throw new Error(`unknown study ${id}`); const ch = Z.def ? BLOOM.challenges.fixture(Z.def) : BLOOM.challenges.resolve(Z.released);
    const file = path.join(OUT, `${id}.jsonl`), done = new Set(fs.existsSync(file) ? fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map(l => { const r = JSON.parse(l); return `${r.archetypeId}:${r.seed}`; }) : []);
    for (const w of pool) if (ch.launch.world.recipe.archetypes.includes(w.archetypeId) && w.poolIndex < (SAMPLE == null ? Z.sample : +SAMPLE) && !done.has(`${w.archetypeId}:${w.seed}`)) tasks.push({ study: id, archetypeId: w.archetypeId, seed: w.seed, poolIndex: w.poolIndex }); }
  tasks.sort((a, b) => a.poolIndex - b.poolIndex || a.study.localeCompare(b.study));
  console.log(`036D completion study: ${tasks.length} worlds (${list.join(", ")}) · ${NW} workers`);
  const t0 = Date.now(); let failed = 0;
  if (tasks.length) await new Promise((resolve, reject) => { let next = 0, done = 0, live = 0;
    for (let k = 0; k < Math.min(NW, tasks.length); k++) { const w = new Worker(fileURLToPath(import.meta.url)); live++;
      const feed = () => { if (next >= tasks.length) { w.terminate(); return; } w.postMessage(tasks[next++]); };
      w.on("message", m => { if (!m.ok) { failed++; console.error(`  ERROR ${m.t.study} ${m.t.archetypeId}:${m.t.seed}: ${m.error.split("\n").slice(0, 3).join(" | ")}`); }
        else fs.appendFileSync(path.join(OUT, `${m.row.study}.jsonl`), JSON.stringify(m.row) + "\n");
        done++; if (done % 10 === 0 || done === tasks.length) console.log(`  ${done}/${tasks.length}  ${Math.round((Date.now() - t0) / 1000)} s`); feed(); });
      w.on("error", reject); w.on("exit", () => { if (--live === 0) resolve(); }); feed(); } });
  if (snap() !== before) throw new Error("the catalogue changed during the study");
  console.log(`done in ${Math.round((Date.now() - t0) / 1000)} s · ${failed} errors · catalogue unchanged`); if (failed) process.exitCode = 1;
}
