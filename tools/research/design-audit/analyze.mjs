// BLOOM-038 design audit — ANALYSIS of the simulation study (research only).
//
//   node tools/research/design-audit/analyze.mjs
//   reads  <scratch>/worlds.json, <scratch>/rows.jsonl, <scratch>/readout.json   (study.mjs worlds / runs, readout.mjs)
//   writes docs/evidence/bloom-038/{pacing-study,strategy-study,species-comparison,challenge-comparison}.json
//          and the sim half of failure-state-audit.json (<scratch>/failure-sim.json; the browser half is merged by merge-failure.mjs)
// Every number is game seconds at 1× speed (a decision room pauses the run, so time inside rooms is not game time).
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./engine.mjs";
import { POLICIES } from "./runner.mjs";

const SCRATCH = process.env.BLOOM038_SCRATCH || path.join(ROOT, ".design-audit-scratch");
const OUT = path.join(ROOT, "docs/evidence/bloom-038");
fs.mkdirSync(OUT, { recursive: true });
const rows = fs.readFileSync(path.join(SCRATCH, "rows.jsonl"), "utf8").split("\n").filter(Boolean).map(l => JSON.parse(l));
const worlds = JSON.parse(fs.readFileSync(path.join(SCRATCH, "worlds.json"), "utf8"));
const SPECIES = ["organic_hybrid", "cinder_rosette", "woolly_candle", "reed_spire"];
const BOARDS = ["Adapt", "Spread", "Terraform"];
const TRAITS = ["cold", "heat", "drought", "flood", "salt", "rad", "seedOut", "waterSeeds", "earlyMat", "warm", "cool", "humid", "dry"];
const BOARD_OF = { cold: "Adapt", heat: "Adapt", drought: "Adapt", flood: "Adapt", salt: "Adapt", rad: "Adapt", seedOut: "Spread", waterSeeds: "Spread", earlyMat: "Spread", warm: "Terraform", cool: "Terraform", humid: "Terraform", dry: "Terraform" };
const WIN = 70, SOLVED = 72; // coverage threshold (%); "strategically solved" = growable + reachable land ≥ 72 % and never below again

// ---- helpers
const r1 = x => x == null || Number.isNaN(x) ? null : Math.round(x * 10) / 10, r3 = x => x == null || Number.isNaN(x) ? null : Math.round(x * 1000) / 1000;
const q = (xs, p) => { const s = xs.filter(x => x != null).sort((a, b) => a - b); if (!s.length) return null; const i = (s.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); };
const dist = xs => { const s = xs.filter(x => x != null); return s.length ? { n: s.length, p10: r1(q(s, .1)), p25: r1(q(s, .25)), median: r1(q(s, .5)), p75: r1(q(s, .75)), p90: r1(q(s, .9)), max: r1(Math.max(...s)), mean: r1(s.reduce((a, b) => a + b, 0) / s.length) } : { n: 0 }; };
const share = (xs, f) => xs.length ? r3(xs.filter(f).length / xs.length) : null;
const groupBy = (xs, f) => { const m = {}; for (const x of xs) { const k = f(x); (m[k] = m[k] || []).push(x); } return m; };
const mode = r => r.kind === "challenge" ? r.challengeId : r.kind;
const count = (xs) => { const m = {}; for (const x of xs) m[x] = (m[x] || 0) + 1; return Object.fromEntries(Object.entries(m).sort((a, b) => b[1] - a[1])); };
const top = (obj, n) => Object.fromEntries(Object.entries(obj).slice(0, n));

// ---- per-run derived metrics
for (const r of rows) {
  const P = r.purchases, end = r.won ? r.bloomAt : r.lost ? r.lostAt : r.endSeconds;
  r.end = end;
  const gaps = []; let last = 0; for (const p of P) { gaps.push(p.t - last); last = p.t; } r.gaps = gaps; r.maxGap = gaps.length ? Math.max(...gaps) : null;
  r.medianGap = gaps.length > 1 ? q(gaps.slice(1), .5) : null;
  r.meaningful = P.filter(p => p.kind === "unlock" || p.kind === "reach").length;
  r.progressBuys = P.filter(p => p.kind === "progress").length;
  r.speedBuys = P.filter(p => p.kind === "speed").length;
  r.repeats = P.length - new Set(P.map(p => p.id)).size;
  r.byBoard = Object.fromEntries(BOARDS.map(b => [b, P.filter(p => p.board === b).length]));
  r.t50to70 = r.t.cov50 != null && r.t.cov70 != null ? r1(r.t.cov70 - r.t.cov50) : null;
  // endgame: last strategic decision (a purchase that opened reachable land, or reach across water)
  const strat = P.filter(p => p.kind === "unlock" || p.kind === "reach" || p.kind === "progress");
  r.lastStrategic = strat.length ? strat[strat.length - 1].t : null;
  r.covAtLastStrategic = strat.length ? strat[strat.length - 1].cov : null;
  const lastOf = b => { const x = P.filter(p => p.board === b && p.kind !== "speed"); return x.length ? x[x.length - 1].t : null; };
  r.lastAdapt = lastOf("Adapt"); r.lastTerraform = lastOf("Terraform");
  // solved: the first 10-s sample from which growable + reachable land stays ≥ SOLVED until the run's end
  let solvedIdx = null; const S = r.reachS || [];
  for (let i = S.length - 1; i >= 0; i--) { if (S[i] >= SOLVED) solvedIdx = i; else break; }
  r.solvedAt = solvedIdx == null ? null : solvedIdx * 10;
  if (r.won) {
    r.tailAfterStrategic = r.lastStrategic != null ? r1(r.bloomAt - r.lastStrategic) : r.bloomAt;
    r.tailAfterSolved = r.solvedAt != null ? r1(Math.max(0, r.bloomAt - r.solvedAt)) : null;
    r.tailShareSolved = r.tailAfterSolved != null ? r3(r.tailAfterSolved / r.bloomAt) : null;
    r.tailShareStrategic = r3(r.tailAfterStrategic / r.bloomAt);
    r.buysAfterSolved = r.solvedAt != null ? count(P.filter(p => p.t > r.solvedAt).map(p => p.kind)) : {};
    // monotonic after solved: coverage never drops ≥ 2 points between 10-s samples after solvedAt
    let mono = true; if (solvedIdx != null) for (let i = solvedIdx + 1; i < r.cov.length; i++) if (r.cov[i] < r.cov[i - 1] - 2) mono = false; r.monotonicAfterSolved = solvedIdx != null ? mono : null;
    r.waitAfterSolved = r.solvedAt != null ? r1(Math.max(0, r.bloomAt - Math.max(r.solvedAt, ...P.filter(p => p.t > r.solvedAt).map(p => p.t)))) : null;
  }
}
const pacingOf = R => ({
  runs: R.length, bloom: share(R, r => r.won), extinction: share(R, r => r.lost), timeout: share(R, r => r.outcome === "timeout"),
  firstMeaningfulDecision: dist(R.map(r => r.firstDecision)), firstPurchase: dist(R.map(r => r.t.firstPurchase)),
  purchaseGapMedian: dist(R.map(r => r.medianGap)), purchaseGapMax: dist(R.map(r => r.maxGap)),
  biomassSaving: dist(R.map(r => r.wait.saving)), savingShare: dist(R.map(r => r.end ? 100 * r.wait.saving / r.end : null)),
  noUsefulAction: dist(R.map(r => r.wait.nothingUseful)),
  firstSpread: dist(R.map(r => r.t.first_Spread)), firstAdapt: dist(R.map(r => r.t.first_Adapt)), firstTerraform: dist(R.map(r => r.t.first_Terraform)),
  neverSpread: share(R, r => r.t.first_Spread == null), neverTerraform: share(R, r => r.t.first_Terraform == null),
  to25: dist(R.map(r => r.t.cov25)), to50: dist(R.map(r => r.t.cov50)), from50to70: dist(R.map(r => r.t50to70)),
  bloomTime: dist(R.filter(r => r.won).map(r => r.bloomAt)), extinctionTime: dist(R.filter(r => r.lost).map(r => r.lostAt)),
  thinAirEarlyBloom: R.some(r => r.earlyBloomAt != null) ? dist(R.map(r => r.earlyBloomAt)) : undefined,
  purchases: dist(R.map(r => r.purchases.length)), meaningfulPurchases: dist(R.map(r => r.meaningful)), speedPurchases: dist(R.map(r => r.speedBuys)),
  repeatedIdentical: dist(R.map(r => r.repeats)),
  waitAfterSolved: dist(R.filter(r => r.won).map(r => r.waitAfterSolved)),
});

// =========================== E · PACING ===========================
const EXP = rows.filter(r => r.kind === "expedition"), CH = rows.filter(r => r.kind === "challenge"), TR = rows.filter(r => r.kind === "training");
const pacing = {
  format: "bloom-038-pacing-study@1", tool: "tools/research/design-audit/{study,runner,analyze}.mjs",
  method: {
    unit: "game seconds at 1× (decision rooms pause the run; 2×/4× speed divides wall-clock time)",
    policies: POLICIES, informationModel: "runner.mjs header: lamps / previews / prices / map adjacency / climate preview only — no validator witness, no rng, no future pressure",
    human: "notice delay 2–6 s after a target becomes affordable; 35–80 % of Biomass bubbles clicked after 2–4 s (the rest auto-collect at half value)",
    sample: { expeditionWorlds: worlds.rows.filter(w => w.valid).length, stream: worlds.stream, perArchetype: worlds.perArchetype, runSeedsPerCell: 2,
      challengeEntriesPerCell: 10, trainingRuns: TR.length, totalRuns: rows.length },
    cap: "3600 s (training 1800 s); a run that neither Blooms nor goes extinct by the cap is a TIMEOUT (Expedition has no extinction loss)",
    definitions: {
      firstMeaningfulDecision: "first second at which a purchase that opens reachable land / reaches across water / speeds a large uncovered frontier is affordable",
      biomassSaving: "seconds with a chosen target the policy could not yet afford (waiting for Biomass)",
      noUsefulAction: "seconds with no legal purchase that the previews show opens, reaches or measurably improves frontier land",
      meaningfulPurchase: "a purchase whose preview opened reachable land (unlock) or that made other landmasses reachable (Waterborne Seeds)",
      waitAfterSolved: "won runs: seconds from the later of (strategically solved, last purchase after it) to Bloom — pure waiting",
    },
  },
  overall: { expedition: pacingOf(EXP), challenges: pacingOf(CH), training: pacingOf(TR) },
  expedition: {
    bySpecies: Object.fromEntries(SPECIES.map(s => [s, pacingOf(EXP.filter(r => r.speciesId === s))])),
    byArchetype: Object.fromEntries(Object.entries(groupBy(EXP, r => r.archetypeId)).map(([k, R]) => [k, pacingOf(R)])),
    byPolicy: Object.fromEntries(POLICIES.map(p => [p, pacingOf(EXP.filter(r => r.policy === p))])),
    bySurveyClass: Object.fromEntries(Object.entries(groupBy(EXP, r => r.classId)).map(([k, R]) => [k, pacingOf(R)])),
    bySpeciesArchetype: Object.fromEntries(Object.entries(groupBy(EXP, r => `${r.speciesId}|${r.archetypeId}`)).map(([k, R]) => [k, { runs: R.length, bloom: share(R, r => r.won), bloomTime: dist(R.filter(r => r.won).map(r => r.bloomAt)), firstPurchase: dist(R.map(r => r.t.firstPurchase)), timeout: share(R, r => r.outcome === "timeout") }])),
  },
  challenges: {
    byChallenge: Object.fromEntries(Object.entries(groupBy(CH, r => r.challengeId)).map(([k, R]) => [k, pacingOf(R)])),
    byChallengeSpecies: Object.fromEntries(Object.entries(groupBy(CH, r => `${r.challengeId}|${r.speciesId}`)).map(([k, R]) => [k, { runs: R.length, bloom: share(R, r => r.won), extinction: share(R, r => r.lost), bloomTime: dist(R.filter(r => r.won).map(r => r.bloomAt)), firstPurchase: dist(R.map(r => r.t.firstPurchase)) }])),
    byChallengePolicy: Object.fromEntries(Object.entries(groupBy(CH, r => `${r.challengeId}|${r.policy}`)).map(([k, R]) => [k, { runs: R.length, bloom: share(R, r => r.won), extinction: share(R, r => r.lost), bloomTime: dist(R.filter(r => r.won).map(r => r.bloomAt)) }])),
  },
  training: pacingOf(TR),
};
// F · endgame cleanup
const endg = R => { const W = R.filter(r => r.won);
  return { won: W.length, solvedFound: W.filter(r => r.solvedAt != null).length,
    lastStrategicDecision: dist(W.map(r => r.lastStrategic)), coverageAtLastStrategic: dist(W.map(r => r.covAtLastStrategic == null ? null : 100 * r.covAtLastStrategic)),
    lastAdapt: dist(W.map(r => r.lastAdapt)), lastTerraform: dist(W.map(r => r.lastTerraform)),
    solvedAt: dist(W.map(r => r.solvedAt)), bloomAt: dist(W.map(r => r.bloomAt)),
    tailAfterSolvedSeconds: dist(W.map(r => r.tailAfterSolved)), tailAfterSolvedShare: dist(W.map(r => r.tailShareSolved == null ? null : 100 * r.tailShareSolved)),
    tailAfterLastStrategicSeconds: dist(W.map(r => r.tailAfterStrategic)), tailAfterLastStrategicShare: dist(W.map(r => 100 * r.tailShareStrategic)),
    pureWaitAfterSolved: dist(W.map(r => r.waitAfterSolved)),
    monotonicAfterSolved: share(W.filter(r => r.monotonicAfterSolved != null), r => r.monotonicAfterSolved),
    flagged: { rule: "tail after the last strategic decision ≥ 33 % of the run AND ≥ 90 s", share: share(W, r => r.tailShareStrategic >= 0.33 && r.tailAfterStrategic >= 90) },
    purchasesAfterSolved: count(W.flatMap(r => Object.entries(r.buysAfterSolved || {}).flatMap(([k, n]) => Array(n).fill(k)))) }; };
pacing.endgameCleanup = { definitions: {
    strategicDecision: "a purchase whose preview opened reachable land, reached another landmass, or improved blocked frontier land (unlock / reach / progress)",
    solvedAt: `first 10-s sample from which growable AND reachable land stays ≥ ${SOLVED} % of the land until the run ends (the plant only has to fill it)`,
    tail: "Bloom time minus that point" },
  expedition: endg(EXP), expeditionByPolicy: Object.fromEntries(POLICIES.map(p => [p, endg(EXP.filter(r => r.policy === p))])),
  expeditionByArchetype: Object.fromEntries(Object.entries(groupBy(EXP, r => r.archetypeId)).map(([k, R]) => [k, endg(R)])),
  expeditionBySpecies: Object.fromEntries(SPECIES.map(s => [s, endg(EXP.filter(r => r.speciesId === s))])),
  challenges: Object.fromEntries(Object.entries(groupBy(CH, r => r.challengeId)).map(([k, R]) => [k, endg(R)])), training: endg(TR) };
// N · no-save risk: run durations (game seconds) and wall-clock estimates
const durations = R => { const W = R.filter(r => r.won).map(r => r.bloomAt), Lr = R.filter(r => r.lost).map(r => r.lostAt);
  const d = dist(W); return { bloomRuns: d, extinctionRuns: dist(Lr), all: dist(R.map(r => r.end)),
    wallClockMinutesAt1x: { median: r1(d.median / 60), p75: r1(d.p75 / 60), p90: r1(d.p90 / 60), max: r1(d.max / 60) },
    // + reading / room time: ~20 s per purchase (rooms pause the run, so it adds to wall clock) at the median purchase count
    wallClockMinutesWithRooms: { median: r1((d.median + 20 * (q(R.filter(r => r.won).map(r => r.purchases.length), .5) || 0)) / 60) } }; };
pacing.noSaveRisk = { note: "game seconds at 1×; a player at 2× halves the game-time part; room / reading time is added on top because rooms pause",
  expedition: durations(EXP), expeditionByPolicy: Object.fromEntries(POLICIES.map(p => [p, durations(EXP.filter(r => r.policy === p))])),
  challenges: Object.fromEntries(Object.entries(groupBy(CH, r => r.challengeId)).map(([k, R]) => [k, durations(R)])), training: durations(TR),
  longestOrdinarySuccessful: EXP.filter(r => r.won && r.policy !== "low_planning").sort((a, b) => b.bloomAt - a.bloomAt).slice(0, 8).map(r => ({ world: `${r.archetypeId}:${r.seed}`, species: r.speciesId, policy: r.policy, bloomAt: r.bloomAt, purchases: r.purchases.length })) };
// compact per-run table
pacing.runs = rows.map(r => ({ k: r.kind, ch: r.challengeId || null, a: r.archetypeId || null, w: r.seed || null, e: r.entry ?? null, c: r.classId || null, s: r.speciesId, p: r.policy, rs: r.rs,
  o: r.outcome, bloom: r.bloomAt, early: r.earlyBloomAt, lost: r.lostAt, end: r.end, fd: r.firstDecision, fp: r.t.firstPurchase, t25: r.t.cov25, t50: r.t.cov50, t70: r.t.cov70,
  n: r.purchases.length, m: r.meaningful, rep: r.repeats, sav: r1(r.wait.saving), nu: r1(r.wait.nothingUseful), solved: r.solvedAt, lastS: r.lastStrategic,
  buys: r.purchases.map(p => `${p.id}@${Math.round(p.t)}${p.kind[0]}`).join(" "), cov: r.cov.join(","), fc: r.finalCov }));
fs.writeFileSync(path.join(OUT, "pacing-study.json"), JSON.stringify(pacing, null, 0).replace(/\},"/g, '},\n"'));

// =========================== G · STRATEGY ===========================
const cellKey = r => r.kind === "challenge" ? `${r.challengeId}|${r.speciesId}|${r.entry}|${r.rs}` : `${r.archetypeId}:${r.seed}|${r.speciesId}|${r.rs}`;
const strat = R => {
  const cells = groupBy(R, cellKey), pol = {};
  for (const p of POLICIES) { const X = R.filter(r => r.policy === p), Wn = X.filter(r => r.won);
    pol[p] = { runs: X.length, winRate: share(X, r => r.won), extinction: share(X, r => r.lost), bloomTime: dist(Wn.map(r => r.bloomAt)),
      biomassSpentAtBloom: dist(Wn.map(r => r.spent)), coveragePer100Biomass: dist(Wn.map(r => r.spent ? 100 * 70 / r.spent : null)),
      purchases: dist(X.map(r => r.purchases.length)), byBoard: Object.fromEntries(BOARDS.map(b => [b, r3(X.reduce((a, r) => a + r.byBoard[b], 0) / Math.max(1, X.reduce((a, r) => a + r.purchases.length, 0)))])),
      firstPurchase: top(count(X.map(r => r.purchases[0] ? r.purchases[0].id : "none")), 6), opening2: top(count(X.map(r => r.purchases.slice(0, 2).map(p => p.id).join(">"))), 6) }; }
  // paired: per cell, the fastest policy and each policy's time relative to the cell's fastest
  const fastest = {}, rel = Object.fromEntries(POLICIES.map(p => [p, []])), openingOfFastest = [];
  let cellsAllWin = 0, cellsSomeLose = 0;
  for (const X of Object.values(cells)) { const Wn = X.filter(r => r.won); if (!Wn.length) continue;
    if (Wn.length === X.length) cellsAllWin++; else cellsSomeLose++;
    const best = Wn.reduce((a, b) => a.bloomAt <= b.bloomAt ? a : b); fastest[best.policy] = (fastest[best.policy] || 0) + 1;
    openingOfFastest.push(best.purchases.slice(0, 2).map(p => p.id).join(">"));
    for (const r of X) rel[r.policy].push(r.won ? 100 * (r.bloomAt / best.bloomAt - 1) : null); }
  const wins = R.filter(r => r.won), own = {};
  for (const t of TRAITS) own[t] = share(wins, r => r.purchases.some(p => p.id === t) || (r.genome && t === "flood" && r.genome.waterArm === "wet" && r.genome.waterPts > 0 && false));
  const tiers = {}; for (const r of wins) { const c = count(r.purchases.map(p => p.id)); for (const [id, n] of Object.entries(c)) for (let k = 1; k <= n; k++) tiers[`${id}#${k}`] = (tiers[`${id}#${k}`] || 0) + 1; }
  return { policies: pol, cells: Object.keys(cells).length, cellsAllPoliciesWin: cellsAllWin, cellsSomePolicyFails: cellsSomeLose,
    fastestPolicyCount: count(Object.entries(fastest).flatMap(([k, n]) => Array(n).fill(k))),
    slowerThanCellBestPct: Object.fromEntries(POLICIES.map(p => [p, dist(rel[p])])),
    lossVsCellBest: Object.fromEntries(POLICIES.map(p => [p, share(rel[p], x => x == null)])),
    openingOfFastest: top(count(openingOfFastest), 10),
    traitOwnershipInWins: Object.fromEntries(Object.entries(own).sort((a, b) => b[1] - a[1])),
    tierShareInWins: Object.fromEntries(Object.entries(tiers).map(([k, n]) => [k, r3(n / Math.max(1, wins.length))]).sort((a, b) => b[1] - a[1])),
    neverBoughtInWins: TRAITS.filter(t => !wins.some(r => r.purchases.some(p => p.id === t))),
    terraformUseful: { runsWithTerraformThatOpenedLand: share(R, r => r.purchases.some(p => p.board === "Terraform" && p.kind === "unlock")),
      runsBuyingTerraform: share(R, r => r.byBoard.Terraform > 0), terraformShareOfPurchases: r3(R.reduce((a, r) => a + r.byBoard.Terraform, 0) / Math.max(1, R.reduce((a, r) => a + r.purchases.length, 0))) },
    purchaseKinds: count(R.flatMap(r => r.purchases.map(p => `${p.board}:${p.kind}`))),
    colonyLayer: { note: "policy 'colony' = balanced + origin growth focus Leaves + a Leaf Canopy local upgrade", vsBalanced: (() => {
      const d = []; for (const X of Object.values(cells)) { const a = X.find(r => r.policy === "colony"), b = X.find(r => r.policy === "balanced"); if (a && b && a.won && b.won) d.push(100 * (a.bloomAt / b.bloomAt - 1)); }
      return { pairs: d.length, colonyFasterShare: share(d, x => x < 0), relativeTimePct: dist(d) }; })() } };
};
const strategy = { format: "bloom-038-strategy-study@1", method: pacing.method,
  expedition: strat(EXP), expeditionByArchetype: Object.fromEntries(Object.entries(groupBy(EXP, r => r.archetypeId)).map(([k, R]) => [k, strat(R)])),
  expeditionBySpecies: Object.fromEntries(SPECIES.map(s => [s, strat(EXP.filter(r => r.speciesId === s))])),
  challenges: Object.fromEntries(Object.entries(groupBy(CH, r => r.challengeId)).map(([k, R]) => [k, strat(R)])) };
fs.writeFileSync(path.join(OUT, "strategy-study.json"), JSON.stringify(strategy, null, 1));

// =========================== H · SPECIES ===========================
const lev = (a, b) => { const m = a.length, n = b.length; if (!m || !n) return Math.max(m, n); let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; } return prev[n]; };
const seqSim = (a, b) => 1 - lev(a, b) / Math.max(1, a.length, b.length);
const vec = r => { const v = TRAITS.map(t => r.purchases.filter(p => p.id === t).length); return v; };
const cos = (a, b) => { let d = 0, x = 0, y = 0; for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; x += a[i] * a[i]; y += b[i] * b[i]; } return x && y ? d / Math.sqrt(x * y) : (x === y ? 1 : 0); };
const allFour = worlds.rows.filter(w => w.valid && SPECIES.every(s => w.species[s].playable)).map(w => `${w.archetypeId}:${w.seed}`);
const EQ = EXP.filter(r => allFour.includes(`${r.archetypeId}:${r.seed}`));
const speciesProfile = R => { const Wn = R.filter(r => r.won);
  return { runs: R.length, bloom: share(R, r => r.won), timeout: share(R, r => r.outcome === "timeout"), bloomTime: dist(Wn.map(r => r.bloomAt)),
    firstPurchaseBoard: count(R.map(r => r.purchases[0] ? r.purchases[0].board : "none")), firstPurchase: top(count(R.map(r => r.purchases[0] ? r.purchases[0].id : "none")), 6),
    adaptationSequenceTop: top(count(R.map(r => r.purchases.filter(p => p.board === "Adapt").map(p => p.id).join(">"))), 6),
    terraformShare: r3(R.reduce((a, r) => a + r.byBoard.Terraform, 0) / Math.max(1, R.reduce((a, r) => a + r.purchases.length, 0))),
    firstSpread: dist(R.map(r => r.t.first_Spread)),
    viableLandTrajectory: Object.fromEntries([0, 6, 12, 24, 36].map(i => [`${i * 10}s`, dist(R.map(r => r.reachS[Math.min(i, r.reachS.length - 1)]))])),
    finalOwnership: Object.fromEntries(TRAITS.map(t => [t, r3(R.reduce((a, r) => a + r.purchases.filter(p => p.id === t).length, 0) / Math.max(1, R.length))])),
    failureCauses: count(R.filter(r => !r.won).map(r => Object.entries(r.blockedBy || {}).sort((a, b) => b[1] - a[1]).map(x => x[0])[0] || "unreached")) }; };
const pairs = []; for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) pairs.push([SPECIES[i], SPECIES[j]]);
const pairSim = (R, a, b) => { const cells = groupBy(R, r => `${r.archetypeId}:${r.seed}|${r.policy}|${r.rs}`), S = [], C = [], F = [];
  for (const X of Object.values(cells)) { const x = X.find(r => r.speciesId === a), y = X.find(r => r.speciesId === b); if (!x || !y) continue;
    S.push(seqSim(x.purchases.map(p => p.id), y.purchases.map(p => p.id))); C.push(cos(vec(x), vec(y))); F.push(x.purchases[0] && y.purchases[0] && x.purchases[0].id === y.purchases[0].id ? 1 : 0); }
  return { pairs: S.length, sequenceSimilarity: r3(S.reduce((p, c) => p + c, 0) / Math.max(1, S.length)), traitMixCosine: r3(C.reduce((p, c) => p + c, 0) / Math.max(1, C.length)), sameFirstPurchase: r3(F.reduce((p, c) => p + c, 0) / Math.max(1, F.length)) }; };
// within-species baseline: the same species on the same world and policy with the other run seed (pure noise)
const within = R => { const cells = groupBy(R, r => `${r.archetypeId}:${r.seed}|${r.policy}|${r.speciesId}`), S = [], C = [];
  for (const X of Object.values(cells)) { if (X.length < 2) continue; S.push(seqSim(X[0].purchases.map(p => p.id), X[1].purchases.map(p => p.id))); C.push(cos(vec(X[0]), vec(X[1]))); }
  return { pairs: S.length, sequenceSimilarity: r3(S.reduce((p, c) => p + c, 0) / Math.max(1, S.length)), traitMixCosine: r3(C.reduce((p, c) => p + c, 0) / Math.max(1, C.length)) }; };
// blind classifier: nearest centroid on trait-count vectors, leave-one-WORLD-out; chance = 25 %
const classify = R => { const ws = [...new Set(R.map(r => `${r.archetypeId}:${r.seed}`))]; let ok = 0, n = 0; const conf = {};
  for (const w of ws) { const train = R.filter(r => `${r.archetypeId}:${r.seed}` !== w), test = R.filter(r => `${r.archetypeId}:${r.seed}` === w);
    const cent = {}; for (const s of SPECIES) { const X = train.filter(r => r.speciesId === s).map(vec); cent[s] = TRAITS.map((_, i) => X.reduce((a, v) => a + v[i], 0) / Math.max(1, X.length)); }
    for (const r of test) { const v = vec(r), pred = SPECIES.reduce((b, s) => cos(v, cent[s]) > cos(v, cent[b]) ? s : b, SPECIES[0]); n++; if (pred === r.speciesId) ok++; const k = `${r.speciesId}->${pred}`; conf[k] = (conf[k] || 0) + 1; } }
  return { runs: n, accuracy: r3(ok / Math.max(1, n)), chance: 0.25, confusion: conf }; };
const species = { format: "bloom-038-species-comparison@1", method: { equivalentPlanets: `${allFour.length} Expedition sample worlds playable (survey S2) by all four species; same world, same policy, same run seed compared across species`,
    similarity: "sequenceSimilarity = 1 − normalised Levenshtein distance between purchase-id sequences; traitMixCosine = cosine of per-trait purchase counts; withinSpeciesBaseline = the same comparison between two run seeds of ONE species (noise floor)",
    blindClassifier: "nearest-centroid on per-trait purchase counts, leave-one-world-out: if labels and art were hidden, how often do the action trajectories alone name the species (chance 25 %)" },
  equivalentWorlds: allFour.length,
  profiles: Object.fromEntries(SPECIES.map(s => [s, speciesProfile(EQ.filter(r => r.speciesId === s))])),
  profilesByArchetype: Object.fromEntries(["desert_world", "frozen_world", "ocean_archipelago"].map(a => [a, Object.fromEntries(SPECIES.map(s => [s, (({ runs, bloom, bloomTime, firstPurchase, adaptationSequenceTop, terraformShare }) => ({ runs, bloom, bloomTime, firstPurchase, adaptationSequenceTop, terraformShare }))(speciesProfile(EQ.filter(r => r.speciesId === s && r.archetypeId === a)))]))])),
  pairwise: Object.fromEntries(pairs.map(([a, b]) => [`${a}~${b}`, pairSim(EQ, a, b)])),
  pairwiseByArchetype: Object.fromEntries(["desert_world", "frozen_world", "ocean_archipelago"].map(a => [a, Object.fromEntries(pairs.map(([x, y]) => [`${x}~${y}`, pairSim(EQ.filter(r => r.archetypeId === a), x, y)]))])),
  withinSpeciesBaseline: within(EQ),
  blindClassifier: { all: classify(EQ), balancedPolicyOnly: classify(EQ.filter(r => r.policy === "balanced")), ...Object.fromEntries(["desert_world", "frozen_world", "ocean_archipelago"].map(a => [a, classify(EQ.filter(r => r.archetypeId === a))])) } };
fs.writeFileSync(path.join(OUT, "species-comparison.json"), JSON.stringify(species, null, 1));

// =========================== I · CHALLENGES ===========================
const curve = R => { const out = []; for (let i = 0; i <= 60; i += 3) out.push(r1(q(R.map(r => r.cov[Math.min(i, r.cov.length - 1)]), .5))); return out; }; // median coverage every 30 s, 0–600 s
const normCurve = R => { const out = []; for (let f = 0; f <= 1.0001; f += 0.1) out.push(r1(q(R.filter(r => r.won).map(r => r.cov[Math.min(r.cov.length - 1, Math.round(f * (r.cov.length - 1)))]), .5))); return out; };
const chFeat = R => { const tot = Math.max(1, R.reduce((a, r) => a + r.purchases.length, 0)); return [...BOARDS.map(b => R.reduce((a, r) => a + r.byBoard[b], 0) / tot), ...TRAITS.map(t => R.reduce((a, r) => a + r.purchases.filter(p => p.id === t).length, 0) / tot)]; };
const chProfile = (R, id) => { const Wn = R.filter(r => r.won);
  return { runs: R.length, archetypes: count(R.map(r => r.archetypeId)), species: count(R.map(r => r.speciesId)),
    bloom: share(R, r => r.won), extinction: share(R, r => r.lost), timeout: share(R, r => r.outcome === "timeout"),
    actionDistribution: Object.fromEntries(BOARDS.map((b, i) => [b, r3(chFeat(R)[i])])), traitMix: Object.fromEntries(TRAITS.map((t, i) => [t, r3(chFeat(R)[3 + i])])),
    terraformRunsShare: share(R, r => r.byBoard.Terraform > 0), adaptationPatternTop: top(count(R.map(r => r.purchases.filter(p => p.board === "Adapt").map(p => p.id).join(">"))), 6),
    firstSpread: dist(R.map(r => r.t.first_Spread)), firstPurchase: dist(R.map(r => r.t.firstPurchase)), purchases: dist(R.map(r => r.purchases.length)),
    coverageCurveMedian_0to600s_every30s: curve(R), normalizedCurveWins_0to1: normCurve(R),
    duration: dist(Wn.map(r => r.bloomAt)), extinctionAt: dist(R.filter(r => r.lost).map(r => r.lostAt)), reversals: dist(R.map(r => r.reversals)), runsWithReversal: share(R, r => r.reversals > 0),
    pressure: R[0] && R[0].pressure ? { finalProgress: dist(R.map(r => r.pressure && r.pressure.progress)) } : null,
    competition: R[0] && R[0].competition ? { startShare: dist(R.map(r => r.competition.startShare)), peakShare: dist(R.map(r => r.competition.peakShare)), finalShare: dist(R.map(r => r.competition.share)), contestedRegions: dist(R.map(r => r.competition.everContested)), firstContact: dist(R.map(r => r.competition.firstContact)), nativeTook: dist(R.map(r => r.competition.flips.nativeTook)) } : null,
    climate: R[0] && R[0].climate ? { shocks: dist(R.map(r => r.climate.shocks)), runsWithShock: share(R, r => r.climate.shocks > 0), peakBand: count(R.map(r => r.climate.peakBand)) } : null,
    completion: id === "thin_air" ? { earlyBloomRuns: share(R, r => r.earlyBloomAt != null), earlyBloomAt: dist(R.map(r => r.earlyBloomAt)), holdSeconds: dist(Wn.filter(r => r.earlyBloomAt != null).map(r => r.bloomAt - r.earlyBloomAt)), earlyBloomThenExtinction: share(R, r => r.earlyBloomAt != null && r.lost) } : null }; };
const chIds = Object.keys(groupBy(CH, r => r.challengeId));
const chProfiles = Object.fromEntries(chIds.map(id => [id, chProfile(CH.filter(r => r.challengeId === id), id)]));
const curveDist = (a, b) => { let d = 0, n = 0; for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] != null && b[i] != null) { d += Math.abs(a[i] - b[i]); n++; } return n ? r1(d / n) : null; };
const pairC = (A, B, label) => ({ label, runsA: A.length, runsB: B.length, actionMixCosine: r3(cos(chFeat(A), chFeat(B))), coverageCurveMeanAbsDiffPts: curveDist(curve(A), curve(B)), normalizedCurveDiffPts: curveDist(normCurve(A), normCurve(B)),
  medianDurationA: r1(q(A.filter(r => r.won).map(r => r.bloomAt), .5)), medianDurationB: r1(q(B.filter(r => r.won).map(r => r.bloomAt), .5)), bloomA: share(A, r => r.won), bloomB: share(B, r => r.won),
  firstPurchaseOverlap: (() => { const a = count(A.map(r => r.purchases[0] ? r.purchases[0].id : "none")), b = count(B.map(r => r.purchases[0] ? r.purchases[0].id : "none")); let s = 0; for (const k in a) s += Math.min(a[k] / A.length, (b[k] || 0) / B.length); return r3(s); })() });
const chPairs = {}; for (let i = 0; i < chIds.length; i++) for (let j = i + 1; j < chIds.length; j++) chPairs[`${chIds[i]}~${chIds[j]}`] = pairC(CH.filter(r => r.challengeId === chIds[i]), CH.filter(r => r.challengeId === chIds[j]));
const focus = {
  "dying_world(woolly_candle, desert+ocean) ~ thin_air": pairC(CH.filter(r => r.challengeId === "dying_world" && r.speciesId === "woolly_candle" && r.archetypeId !== "frozen_world"), CH.filter(r => r.challengeId === "thin_air"), "same scenario, same species, same archetypes — only the completion contract differs"),
  "dying_world(woolly_candle, all) ~ thin_air": pairC(CH.filter(r => r.challengeId === "dying_world" && r.speciesId === "woolly_candle"), CH.filter(r => r.challengeId === "thin_air")),
  "native_competition(reed_spire, desert) ~ oasis_line": pairC(CH.filter(r => r.challengeId === "native_competition" && r.speciesId === "reed_spire" && r.archetypeId === "desert_world"), CH.filter(r => r.challengeId === "oasis_line"), "same scenario, same species, same archetype — only the recipe (arrival floor) differs"),
  "native_competition(all) ~ oasis_line": pairC(CH.filter(r => r.challengeId === "native_competition"), CH.filter(r => r.challengeId === "oasis_line")),
  "volatile_climate ~ expedition(same species mix)": pairC(CH.filter(r => r.challengeId === "volatile_climate"), EXP.filter(r => r.policy !== "low_planning"), "is Volatile Climate distinguishable from an ordinary Expedition?"),
  "low_tide ~ dying_world(organic_hybrid, ocean)": pairC(CH.filter(r => r.challengeId === "low_tide"), CH.filter(r => r.challengeId === "dying_world" && r.speciesId === "organic_hybrid" && r.archetypeId === "ocean_archipelago"), "same scenario + species + archetype; Low Tide adds the starting state"),
};
const challenge = { format: "bloom-038-challenge-comparison@1", method: { sample: "first 10 entries of every shipped seed-bank cell × 7 policies × 1 run seed", similarity: "actionMixCosine = cosine of board + per-trait purchase shares; coverage curves = median coverage every 30 s (0–600 s) and over normalised run time (wins)" },
  profiles: chProfiles, pairwise: chPairs, focusPairs: focus };
fs.writeFileSync(path.join(OUT, "challenge-comparison.json"), JSON.stringify(challenge, null, 1));

// =========================== J (sim half) ===========================
const readout = fs.existsSync(path.join(SCRATCH, "readout.json")) ? JSON.parse(fs.readFileSync(path.join(SCRATCH, "readout.json"), "utf8")) : null;
const failSim = { format: "bloom-038-failure-sim@1",
  outcomes: { expedition: count(EXP.map(r => r.outcome)), challenges: Object.fromEntries(chIds.map(id => [id, count(CH.filter(r => r.challengeId === id).map(r => r.outcome))])) },
  timeoutCauses: { note: "Expedition runs that never Bloomed: the land not growable at the cap, by the region readout's named limit (area share of land), plus growable-but-unreached land",
    byPolicy: Object.fromEntries(POLICIES.map(p => { const X = EXP.filter(r => r.policy === p && r.outcome === "timeout"); return [p, { runs: X.length, finalCoverage: dist(X.map(r => 100 * r.finalCov)), topLimit: count(X.map(r => Object.entries(r.blockedBy || {}).sort((a, b) => b[1] - a[1]).map(x => x[0])[0] || "none")), unreachedGrowable: dist(X.map(r => 100 * r.unreachedGrowable)) }]; })) },
  extinctions: Object.fromEntries(chIds.map(id => { const X = CH.filter(r => r.challengeId === id && r.lost); return [id, { runs: X.length, at: dist(X.map(r => r.lostAt)), policies: count(X.map(r => r.policy)), maxCoverageBefore: dist(X.map(r => 100 * r.maxCov)), earlyBloomBefore: share(X, r => r.earlyBloomAt != null) }]; })),
  nativeTakeover: Object.fromEntries(["native_competition", "oasis_line"].map(id => { const X = CH.filter(r => r.challengeId === id && r.competition); return [id, { runs: X.length, nativeFinalShareAboveStart: share(X, r => r.competition.share > r.competition.startShare), nativeTookTiles: dist(X.map(r => r.competition.flips.nativeTook)) }]; })),
  readoutHonesty: readout };
fs.writeFileSync(path.join(SCRATCH, "failure-sim.json"), JSON.stringify(failSim, null, 1));
console.log("wrote", ["pacing-study", "strategy-study", "species-comparison", "challenge-comparison"].map(f => f + ".json").join(", "), "+ scratch failure-sim.json");
