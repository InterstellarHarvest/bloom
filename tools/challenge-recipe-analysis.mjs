// BLOOM — Challenge recipe study ANALYSIS (BLOOM-036B, read-only): the numbers behind docs/evidence/bloom-036b/CHALLENGE_RECIPE_STUDY.md.
//
//   node tools/challenge-recipe-analysis.mjs [--in …/challenge-recipe-study.json] [--candidates '{json}'] [--budget N] [--trials 4000] [--write]
//
// Reads the study's per-world rows (tools/challenge-recipe-study.mjs) and reports, per Challenge × species: the qualifying rate of the
// normal physical stream, why worlds fail (physical / S2 / layer P), layer-P time for passes and for failures, arrival class / habitable
// share, the validator's pacing / mechanic evidence, and degenerate cases. For a candidate RECIPE (a filter over the same rows: archetypes,
// arrival band, native cover) it estimates the one-planet selection: attempts to the first qualifying draw and the wall time of the real
// rule (stream-order acceptance, `window` draws in parallel, the launch's first `window` physical worlds prefetched) by resampling streams
// from the sample. It writes `analysis` back into the study JSON (rows untouched).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const IN = path.resolve(ROOT, opt("--in", "docs/evidence/bloom-036b/challenge-recipe-study.json")), TRIALS = +opt("--trials", "4000"), WINDOW = +opt("--window", "8");
// --budget N: model the selection layer's PROOF BUDGET (challenge-world.js): a layer-P proof that needed more than N simulations counts as not
// offered, and its time is scaled to N of its simulations (the validator's search is ordered, so a proof within N is unchanged)
const BUDGET = opt("--budget", null) == null ? null : +opt("--budget", null);
const study = JSON.parse(fs.readFileSync(IN, "utf8")), rows = study.rows, SPECIES = study.species, SCN = study.scenarios;
const q = (xs, p) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))]; };
const med = xs => q(xs, 0.5), p90 = xs => q(xs, 0.9), mx = xs => xs.length ? Math.max(...xs) : null;
const pc = (a, b) => b ? +(100 * a / b).toFixed(1) : null;
const mulberry32 = a => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

/** One row as a draw for (scenario, species, recipe): { ok, stage, ms (task time), physMs } */
function drawOf(r, scn, sp, R) {
  const physMs = r.physical.ms, s = r.species[sp];
  if (R && R.archetypes && !R.archetypes.includes(r.archetype)) return null;                 // never drawn under this recipe
  if (R && R.arrival && r.structural.ok) { const h = r.structural.habitable[sp];             // the structural prediction (cheap)
    if (h == null || (R.arrival.minHabitable != null && h < R.arrival.minHabitable) || (R.arrival.maxHabitable != null && h > R.arrival.maxHabitable)) return { ok: false, stage: "predicted", ms: r.structural.ms, physMs: 0 }; }
  if (!r.physical.ok) return { ok: false, stage: "physical", ms: physMs, physMs };
  const inBand = !R || !R.arrival || ((R.arrival.minHabitable == null || s.habitable >= R.arrival.minHabitable) && (R.arrival.maxHabitable == null || s.habitable <= R.arrival.maxHabitable));
  if (!inBand) return { ok: false, stage: "recipe", ms: physMs + s.evalMs, physMs };
  if (!s.s2.ok) return { ok: false, stage: "species", ms: physMs + s.evalMs, physMs };
  const v = s.scenarios[scn];
  if (R && R.nativeCover && v.competition && v.competition.startShare < R.nativeCover.minStartShare) return { ok: false, stage: "cover", ms: physMs + s.evalMs + 5, physMs };
  const sims = Math.max(1, v.simulations || 1), within = BUDGET == null || sims <= BUDGET, ms = within ? v.ms : Math.round(v.ms * BUDGET / sims), ok = !!v.ok && within;
  return { ok, stage: ok ? "ok" : "scenario", ms: physMs + s.evalMs + ms, physMs, scenarioMs: ms, status: within ? v.status : "BUDGET" };
}

/** Resample streams: the real rule's attempts and wall time (W parallel, stream-order acceptance, first W physical worlds prefetched). */
function simulate(scn, sp, R, seed = 0x5eed) {
  const pool = rows.map(r => drawOf(r, scn, sp, R)).filter(Boolean), okRate = pool.filter(d => d.ok).length / pool.length;
  if (!pool.some(d => d.ok)) return { okRate: 0, attempts: null, ms: null };
  const rng = mulberry32(seed), att = [], wall = [], wallNoPre = [];
  for (let t = 0; t < TRIALS; t++) {
    const stream = []; for (let i = 0; i < 400; i++) stream.push(pool[Math.floor(rng() * pool.length)]);
    const k = stream.findIndex(d => d.ok); att.push(k + 1);
    for (const pre of [true, false]) {
      const free = new Array(WINDOW).fill(0); let accepted = 0;
      for (let i = 0; i <= k; i++) { const d = stream[i], dur = pre && i < WINDOW ? d.ms - d.physMs : d.ms;
        const w = free.indexOf(Math.min(...free)), start = free[w], end = start + Math.max(0, dur); free[w] = end; accepted = Math.max(accepted, end); }
      (pre ? wall : wallNoPre).push(accepted);
    }
  }
  return { okRate: +okRate.toFixed(4), drawn: pool.length, attempts: { median: med(att), p90: p90(att), max: mx(att) },
    ms: { median: med(wall), p90: p90(wall), p99: q(wall, 0.99) }, msNoPrefetch: { median: med(wallNoPre), p90: p90(wallNoPre) } };
}

function table(scn, sp, R) {
  const D = rows.map(r => ({ r, d: drawOf(r, scn, sp, R) })).filter(x => x.d), n = D.length, st = {};
  for (const { d } of D) st[d.stage] = (st[d.stage] || 0) + 1;
  const passMs = D.filter(x => x.d.stage === "ok").map(x => x.d.scenarioMs), failMs = D.filter(x => x.d.stage === "scenario").map(x => x.d.scenarioMs);
  const ok = D.filter(x => x.d.ok).map(x => x.r), W = ok.map(r => r.species[sp].scenarios[scn].witness).filter(Boolean);
  const cls = {}; for (const r of ok) cls[r.species[sp].classId] = (cls[r.species[sp].classId] || 0) + 1;
  const arch = {}; for (const { r, d } of D) { const a = arch[r.archetype] || (arch[r.archetype] = { n: 0, ok: 0 }); a.n++; if (d.ok) a.ok++; }
  const failsByClass = {}; for (const { r, d } of D) if (d.stage === "scenario") { const c = r.species[sp].classId; failsByClass[c] = (failsByClass[c] || 0) + 1; }
  const habOk = ok.map(r => r.species[sp].habitable), habFail = D.filter(x => x.d.stage === "scenario").map(x => x.r.species[sp].habitable);
  const ev = {
    marginSeconds: { median: med(W.map(w => w.marginSeconds)), min: W.length ? Math.min(...W.map(w => w.marginSeconds)) : null },
    terraformStepsWitness: { zero: W.filter(w => w.terraformSteps === 0).length, some: W.filter(w => w.terraformSteps > 0).length },
    ...(scn === "native_competition" ? { nativeStartShare: { min: q(ok.map(r => r.species[sp].scenarios[scn].competition.startShare), 0), median: med(ok.map(r => r.species[sp].scenarios[scn].competition.startShare)) },
      nativePeakShare: { median: med(W.filter(w => w.competition).map(w => w.competition.peakShare)) }, contestedRegions: { median: med(W.filter(w => w.competition).map(w => w.competition.contestedRegions)), zero: W.filter(w => w.competition && w.competition.contestedRegions === 0).length } } : {}),
    ...(scn === "volatile_climate" ? { shocksBeforeHold: { zero: W.filter(w => w.climate && w.climate.shocksBeforeHold === 0).length, some: W.filter(w => w.climate && w.climate.shocksBeforeHold > 0).length },
      terraformingWitness: W.filter(w => w.climate && w.climate.terraformSteps > 0).length } : {}),
    ...(scn === "dying_world" ? { pressureAtMargin: { median: med(W.map(w => w.pressureAtMargin).filter(x => x != null)), min: q(W.map(w => w.pressureAtMargin).filter(x => x != null), 0) },
      holdCoverage: { median: med(W.map(w => w.hold && w.hold.coverage).filter(x => x != null)) } } : {}),
  };
  return { drawn: n, stages: st, qualifying: ok.length, rate: pc(ok.length, n), byArchetype: Object.fromEntries(Object.entries(arch).map(([a, v]) => [a, `${v.ok}/${v.n}`])),
    okClass: cls, failsByClass, habitable: { okMedian: med(habOk), okMin: q(habOk, 0), failMedian: med(habFail) },
    layerP: { passMs: { median: med(passMs), p90: p90(passMs), max: mx(passMs) }, failMs: { n: failMs.length, median: med(failMs), p90: p90(failMs), max: mx(failMs) } }, evidence: ev };
}

const physMs = rows.map(r => r.physical.ms), phys = { worlds: rows.length, ok: rows.filter(r => r.physical.ok).length, ms: { median: med(physMs), p90: p90(physMs), max: mx(physMs) },
  sameAsStructural: rows.filter(r => r.physical.ok && r.physical.sameAsStructural).length,
  byArchetype: Object.fromEntries([...new Set(rows.map(r => r.archetype))].map(a => { const R = rows.filter(r => r.archetype === a); return [a, { worlds: R.length, ok: R.filter(r => r.physical.ok).length, msMedian: med(R.map(r => r.physical.ms)), msP90: p90(R.map(r => r.physical.ms)) }]; })) };
const s2 = Object.fromEntries(SPECIES.map(sp => { const R = rows.filter(r => r.physical.ok); return [sp, { winnable: R.filter(r => r.species[sp].s2.ok).length, of: R.length,
  classes: R.reduce((a, r) => (a[r.species[sp].classId] = (a[r.species[sp].classId] || 0) + 1, a), {}), evalMs: { median: med(R.map(r => r.species[sp].evalMs)), p90: p90(R.map(r => r.species[sp].evalMs)) } }]; }));

const broad = {}, sims = {};
for (const scn of SCN) { broad[scn] = {}; sims[scn] = {}; for (const sp of SPECIES) { broad[scn][sp] = table(scn, sp, null); sims[scn][sp] = simulate(scn, sp, null); } }
// candidate recipes passed as JSON: --candidates '{"native_competition":{"nativeCover":{"minStartShare":0.1}}}'
const cand = JSON.parse(opt("--candidates", "{}")), cands = {};
for (const [scn, R] of Object.entries(cand)) { cands[scn] = { recipe: R, perSpecies: {} }; for (const sp of SPECIES) cands[scn].perSpecies[sp] = { ...table(scn, sp, R), selection: simulate(scn, sp, R) }; }

const analysis = { tool: "tools/challenge-recipe-analysis.mjs", trials: TRIALS, window: WINDOW, proofBudget: BUDGET, physical: phys, species: s2, broad, selectionBroad: sims, candidates: cands };
// --write [--key name]: store it in the study JSON under study[name] (default "analysis"); the rows are never touched
if (argv.includes("--write")) { study[opt("--key", "analysis")] = analysis; fs.writeFileSync(IN, JSON.stringify(study) + "\n"); }
console.log(JSON.stringify(analysis, null, 1));
