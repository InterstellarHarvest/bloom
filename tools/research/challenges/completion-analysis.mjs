// BLOOM-036D — completion-condition study ANALYSIS (read-only): rows → docs/evidence/bloom-036d/completion-study.json + candidate-summary.md.
//
//   node tools/research/challenges/completion-analysis.mjs [--rows docs/evidence/bloom-036d/rows] [--out docs/evidence/bloom-036d]
//
// For each condition: how often a world can be completed WITH it (the proof meaning: margin + hold under the validation and confirmation seeds,
// pacing bands, plus the condition), how often ordinary play ALREADY satisfies it (a condition that never binds is decoration), what it costs in
// time (waiting / idling), what it does to the mechanic (shocks, Terraform), and strategy diversity. Times are perfect-play game-seconds.
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "../../challenge-bank-builder.mjs";

const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const ROWS = path.resolve(ROOT, opt("--rows", "docs/evidence/bloom-036d/rows")), OUT = path.resolve(ROOT, opt("--out", "docs/evidence/bloom-036d"));
const read = id => { const f = path.join(ROWS, `${id}.jsonl`); return fs.existsSync(f) ? fs.readFileSync(f, "utf8").split("\n").filter(Boolean).map(l => JSON.parse(l)) : []; };
const q = (xs, p) => { xs = xs.filter(x => x != null && Number.isFinite(x)).sort((a, b) => a - b); return xs.length ? +xs[Math.min(xs.length - 1, Math.floor(p * (xs.length - 1) + 0.5))].toFixed(1) : null; };
const dist = xs => ({ n: xs.filter(x => x != null).length, p10: q(xs, 0.1), p50: q(xs, 0.5), p90: q(xs, 0.9) });
const pct = (n, d) => d ? +(100 * n / d).toFixed(1) : null;
const cellsOf = rows => rows.filter(r => r.physical).flatMap(r => Object.entries(r.cells || {}).map(([k, c]) => ({ r, key: k, sp: k.split("/")[1], c })));
const out = { format: "bloom-036d-completion-study@1", tool: "tools/research/challenges/completion-analysis.mjs", runner: "tools/research/challenges/completion-study.mjs",
  timeUnit: "game-seconds of the validator's perfect-knowledge witness", studies: {} };

// ---- Thin Air: Bloom HELD at the Dying World final atmospheric state
{ const C = cellsOf(read("thin_air")), ok = C.filter(x => x.c.stage === "ok"), F = ok.flatMap(x => (x.c.conditions.finalState || []).map(f => ({ ...f, arch: x.r.archetypeId })));
  const worldPass = ok.filter(x => (x.c.conditions.finalState || []).some(f => f.ok && f.holdHeld));
  const early = F.filter(f => f.bloomBeforeFinal), rise = F.filter(f => f.coverageAtFinal != null && f.coverageAtFirstBloom != null && f.coverageAtFinal > f.coverageAtFirstBloom + 0.005);
  out.studies.thin_air = { worlds: C.length, qualifyingOrdinary: ok.length, qualifyingPct: pct(ok.length, C.length), conditionPassWorlds: worldPass.length, conditionPassPct: pct(worldPass.length, C.length),
    strategies: F.length, finalAtSeconds: F[0] ? F[0].finalAt : null,
    bloomBeforeFinalPct: pct(early.length, F.length), waitSeconds: dist(early.map(f => f.waitSeconds)), firstBloomSeconds: dist(F.map(f => f.firstBloomSeconds)),
    completionSeconds: dist(F.map(f => Math.max(f.firstBloomSeconds || 0, f.finalAt))), coverageAtFinal: dist(F.map(f => f.coverageAtFinal != null ? 100 * f.coverageAtFinal : null)),
    coverageRisesAfterFirstBloomPct: pct(rise.length, F.length),
    byArchetype: Object.fromEntries(["desert_world", "ocean_archipelago"].map(a => { const G = F.filter(f => f.arch === a); return [a, { strategies: G.length, bloomBeforeFinalPct: pct(G.filter(f => f.bloomBeforeFinal).length, G.length), waitP50: q(G.filter(f => f.bloomBeforeFinal).map(f => f.waitSeconds), 0.5) }]; })),
    distinctStrategies: dist(ok.map(x => (x.c.strategies || []).filter(s => s.qualified).length)) }; }

// ---- Hearthfire: Bloom with net sky warming ≥ N Terraform steps (+6 °C each)
{ const C = cellsOf(read("hearthfire")), ok = C.filter(x => x.c.stage === "ok"), S = { worlds: C.length, qualifyingOrdinary: ok.length, qualifyingPct: pct(ok.length, C.length) };
  S.ordinaryStrategiesNetWarm = dist(C.flatMap(x => (x.c.conditions || {}).ordinaryNetWarm || []));
  S.noColdSearchPassPct = pct(C.filter(x => x.c.conditions && x.c.conditions.noColdSearch && x.c.conditions.noColdSearch.status === "PASS").length, C.length);
  S.byN = {};
  for (const N of [1, 2, 3]) {
    const ordinarySat = C.filter(x => ((x.c.conditions || {}).ordinaryNetWarm || []).some(w => w >= N));
    const forcedPass = C.filter(x => ((((x.c.conditions || {}).forced || {})[N]) || []).some(v => v.ok));
    const worldPass = C.filter(x => ordinarySat.includes(x) || forcedPass.includes(x));
    const P = C.flatMap(x => ((((x.c.conditions || {}).forced || {})[N]) || []).filter(v => v.ok));
    const A = C.flatMap(x => ((((x.c.conditions || {}).forced || {})[N]) || []));
    const why = {}; for (const v of A.filter(v => !v.ok)) { const k = v.lost ? "extinction" : v.illegal ? "illegal" : !v.okMain ? "no win / hold" : v.pacing && v.pacing.length ? "pacing: " + v.pacing[0].replace(/[\d.]+/g, "#").slice(0, 40) : "a confirmation seed failed"; why[k] = (why[k] || 0) + 1; }
    S.byN[N] = { warmingCelsius: 6 * N, alreadySatisfiedByOrdinaryPct: pct(ordinarySat.length, C.length), passWithConditionPct: pct(worldPass.length, C.length),
      passingPlans: P.length, triedPlans: A.length, passingPlansShockedPct: pct(P.filter(v => v.shocks > 0).length, P.length), passingPlansWithCold3Pct: pct(P.filter(v => v.cold >= 3).length, P.length),
      passingPlansWithAnyColdPct: pct(P.filter(v => v.cold > 0).length, P.length), marginSeconds: dist(P.map(v => v.marginSeconds)), climatePeak: dist(P.map(v => v.climatePeak != null ? 100 * v.climatePeak : null)),
      distinctPassingPlansPerWorld: dist(C.map(x => ((((x.c.conditions || {}).forced || {})[N]) || []).filter(v => v.ok).length)), failures: why,
      paced: { warmFirstPass: P.filter(v => v.mode === "warm-first").length, warmPacedPass: P.filter(v => v.mode === "warm-paced").length } };
  }
  out.studies.hearthfire = S; }

// ---- Windfall: Bloom without the climate ever reaching the existing Critical band
for (const b of [200, 225, 250]) { const C = cellsOf(read(`windfall_${b}`)), S = { worlds: C.length, bySpecies: {} };
  for (const sp of ["organic_hybrid", "cinder_rosette", "woolly_candle", "reed_spire"]) {
    const X = C.filter(x => x.sp === sp), ok = X.filter(x => x.c.stage === "ok"), O = X.flatMap(x => (x.c.conditions || {}).ordinary || []), R = X.flatMap(x => (x.c.conditions || {}).rush || []);
    const byMode = m => { const G = R.filter(v => v.mode === m); return { plans: G.length, winPct: pct(G.filter(v => v.ok).length, G.length), criticalPct: pct(G.filter(v => v.critical).length, G.length),
      winningAndCriticalPct: pct(G.filter(v => v.ok && v.critical).length, G.length), peak: dist(G.map(v => v.peak != null ? 100 * v.peak : null)) }; };
    const binding = X.filter(x => [...((x.c.conditions || {}).rush || [])].some(v => v.ok && v.critical));
    S.bySpecies[sp] = { worlds: X.length, qualifyingPct: pct(ok.length, X.length), ordinaryStrategies: O.length, ordinaryCriticalPct: pct(O.filter(o => o.critical).length, O.length), ordinaryPeak: dist(O.map(o => o.peak != null ? 100 * o.peak : null)),
      conditionPassPct: pct(X.filter(x => ((x.c.conditions || {}).ordinary || []).some(o => !o.critical)).length, X.length), rush: byMode("rush"), rush1: byMode("rush+1"), rush2: byMode("rush+2"),
      worldsWhereAWinningLineHitsCriticalPct: pct(binding.length, X.length) };
  }
  out.studies[`windfall_${b}`] = S; }

// ---- Oasis Line (released): Bloom while holding ≥ N regions native vegetation held at landing
{ const C = cellsOf(read("oasis_line")), ok = C.filter(x => x.c.stage === "ok"), S = { worlds: C.length, qualifyingPct: pct(ok.length, C.length),
    nativeRegionsAtLanding: dist(C.map(x => (x.c.conditions || {}).nativeRegionsAtLanding)), regions: dist(C.map(x => (x.c.conditions || {}).regions)) };
  const best = x => Math.max(-1, ...((x.c.conditions || {}).held || []).filter(h => h.ok).map(h => h.heldFormerNative));
  S.bestHeldFormerNative = dist(ok.map(best)); S.heldShareOfFormerNative = dist(ok.map(x => { const n = (x.c.conditions || {}).nativeRegionsAtLanding; return n ? 100 * best(x) / n : null; }));
  S.byN = Object.fromEntries([1, 2, 3, 4, 5].map(N => [N, { alreadySatisfiedByOrdinaryWinPct: pct(ok.filter(x => best(x) >= N).length, ok.length), worldsWithEnoughNativeRegionsPct: pct(C.filter(x => (x.c.conditions || {}).nativeRegionsAtLanding >= N).length, C.length) }]));
  out.studies.oasis_line = S; }

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "completion-study.json"), JSON.stringify(out, null, 1) + "\n");
console.log(JSON.stringify(out, null, 1).slice(0, 200000));
