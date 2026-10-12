// BLOOM — Native Competition latency study ANALYSIS (BLOOM-036B1, read-only). Reads tools/nc-latency-study.mjs's JSON and prints / writes the
// findings for docs/evidence/bloom-036b/NATIVE_COMPETITION_LATENCY_STUDY.md:
//   · per-stage cost (prediction, physical validation, species S2, native-cover probe, layer-P witness runs, confirmation runs)
//   · total-run budget replay (3 / 4 / 5 / 6 / full): every layer-P search's run TRACE replayed under the cap (checked before each new witness
//     run, exactly as the validator's maxRuns): qualifying rate per species, proof time, failing-proof time
//   · S1 connected-foothold correlation with pass / fail, slow failure and extinction, by measured bands
//   node tools/nc-latency-analysis.mjs [--in docs/evidence/bloom-036b/nc-latency-study.json] [--write]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const IN = path.resolve(ROOT, opt("--in", "docs/evidence/bloom-036b/nc-latency-study.json")), S = JSON.parse(fs.readFileSync(IN, "utf8"));
const q = (xs, p) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))]; };
const med = xs => q(xs, 0.5), p90 = xs => q(xs, 0.9), sum = xs => xs.reduce((a, b) => a + b, 0), pct = (a, b) => b ? +(100 * a / b).toFixed(1) : null;
const MIN_ARRIVAL = 0.2;   // the accepted Native Competition recipe

/** Replay a full-budget trace under a total-run cap B (null = full): { ok, ms, runs } */
function replay(sc, B) {
  if (!sc) return null;
  if (!sc.trace.length) return { ok: sc.ok, ms: sc.ms, runs: 0 };          // a static verdict: no simulation
  let runs = 0, ms = 0;
  for (let i = 0; i < sc.trace.length; i++) { const t = sc.trace[i];
    if (t.k === "w" && B != null && runs >= B) return { ok: false, ms, runs, capped: true };
    runs++; ms += t.ms; }
  return { ok: sc.ok, ms: sc.ms, runs };
}
const rows = S.rows.filter(r => r.physical && r.physical.ok), out = { sample: S.sample, worlds: S.rows.length, physicalOk: rows.length, species: S.species };
// per-stage cost
const stage = {}; for (const sp of S.species) { const X = rows.map(r => r.species[sp]).filter(Boolean), P = X.filter(x => x.scenario);
  const wms = P.flatMap(x => x.scenario.trace.filter(t => t.k === "w").map(t => t.ms)), cms = P.flatMap(x => x.scenario.trace.filter(t => t.k === "c").map(t => t.ms));
  stage[sp] = { predictMs: med(X.map(x => x.predictMs)), physicalMs: med(rows.map(r => r.physical.ms)), speciesMs: med(X.map(x => x.speciesMs)), coverMs: med(X.map(x => x.coverMs)),
    witnessRunMs: { median: med(wms), p90: p90(wms) }, confirmationRunMs: { median: med(cms), p90: p90(cms) },
    proofMs: { passMedian: med(P.filter(x => x.scenario.ok).map(x => x.scenario.ms)), failMedian: med(P.filter(x => !x.scenario.ok).map(x => x.scenario.ms)), failP90: p90(P.filter(x => !x.scenario.ok).map(x => x.scenario.ms)) },
    shareOfProofTimeInConfirmations: pct(sum(cms), sum(wms) + sum(cms)), shareOfProofTimeInFailures: pct(sum(P.filter(x => !x.scenario.ok).map(x => x.scenario.ms)), sum(P.map(x => x.scenario.ms))) }; }
out.stage = stage;
// budgets (recipe: arrival ≥ 20 %)
out.budgets = {};
for (const B of [3, 4, 5, 6, null]) { const row = {};
  for (const sp of S.species) { const X = rows.map(r => r.species[sp]).filter(x => x && x.habitable >= MIN_ARRIVAL && x.predicted >= MIN_ARRIVAL && x.s2 && x.scenario);
    const R = X.map(x => replay(x.scenario, B)), ok = R.filter(r => r.ok);
    row[sp] = { eligible: X.length, qualifying: ok.length, qualifyingPctOfPool: pct(ok.length, S.rows.length), passProofMs: med(ok.map(r => r.ms)), failProofMsMedian: med(R.filter(r => !r.ok).map(r => r.ms)),
      failProofMsP90: p90(R.filter(r => !r.ok).map(r => r.ms)), lostPasses: B == null ? 0 : X.filter((x, i) => x.scenario.ok && !R[i].ok).length }; }
  out.budgets[B == null ? "full" : String(B)] = row; }
// foothold correlation (arrival ≥ 20 %, S2-winnable)
out.foothold = {};
const BANDS = [[0, 0.05], [0.05, 0.10], [0.10, 0.15], [0.15, 0.25], [0.25, 1.01]];
for (const sp of S.species) { const X = rows.map(r => r.species[sp]).filter(x => x && x.habitable >= MIN_ARRIVAL && x.s2 && x.scenario);
  out.foothold[sp] = BANDS.map(([lo, hi]) => { const Y = X.filter(x => x.s1.reachable >= lo && x.s1.reachable < hi), F = Y.filter(x => !x.scenario.ok);
    return { band: `${Math.round(lo * 100)}–${hi > 1 ? 100 : Math.round(hi * 100)} %`, n: Y.length, passPct: pct(Y.length - F.length, Y.length), slowFails: F.filter(x => x.scenario.ms > 20000).length,
      extinctions: F.filter(x => /died out|extinct/i.test(x.scenario.reason || "")).length, failMsMedian: med(F.map(x => x.scenario.ms)) }; });
  // point-biserial correlation of foothold with pass
  const xs = X.map(x => x.s1.reachable), ys = X.map(x => x.scenario.ok ? 1 : 0), mx = sum(xs) / xs.length, my = sum(ys) / ys.length;
  const cov = sum(xs.map((x, i) => (x - mx) * (ys[i] - my))), vx = sum(xs.map(x => (x - mx) ** 2)), vy = sum(ys.map(y => (y - my) ** 2));
  out.foothold[sp + ":r"] = vx && vy ? +(cov / Math.sqrt(vx * vy)).toFixed(3) : null; }
// what failures are made of
const reasons = {}; for (const r of rows) for (const sp of S.species) { const x = r.species[sp]; if (x && x.scenario && !x.scenario.ok) { const k = (x.scenario.reason || "").replace(/[0-9.]+/g, "#").slice(0, 70); reasons[k] = (reasons[k] || 0) + 1; } }
out.failureReasons = Object.entries(reasons).sort((a, b) => b[1] - a[1]).slice(0, 8);
if (argv.includes("--write")) { S.analysis = out; fs.writeFileSync(IN, JSON.stringify(S) + "\n"); }
console.log(JSON.stringify(out, null, 1));
