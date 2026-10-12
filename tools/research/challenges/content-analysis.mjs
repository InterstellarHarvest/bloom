// BLOOM-036C — content study ANALYSIS (read-only): study rows → docs/evidence/bloom-036c/candidate-study.json + candidate-summary.md + candidate
// banks (docs/evidence/bloom-036c/candidate-banks/<concept>.json — research output, NEVER content/challenge-seed-banks.js).
//
//   node tools/research/challenges/content-analysis.mjs [--rows docs/evidence/bloom-036c/study-rows] [--out docs/evidence/bloom-036c]
//
// Baselines are exact: every concept world is a world of the released seed-bank pool, so the shipped bank's candidate records
// (docs/evidence/bloom-036b/seed-bank/candidates.json) give the released Challenge's verdict for the same world × species. The derived concepts
// (concepts.mjs DERIVED) are measured from that file and from the 036B recipe study (docs/evidence/bloom-036b/challenge-recipe-study.json) only.
// Times are the validator's perfect-knowledge witness in game-seconds (a person is slower); they rank nothing and are never player-facing.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { ROOT, loadEngine, modules, curateCell, cellOf, entryOf } from "../../challenge-bank-builder.mjs";
import { CONCEPTS, DERIVED } from "./concepts.mjs";

const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const ROWS = path.resolve(ROOT, opt("--rows", "docs/evidence/bloom-036c/study-rows")), OUT = path.resolve(ROOT, opt("--out", "docs/evidence/bloom-036c"));
const { BLOOM, D } = loadEngine(), { CB } = await modules();
createRequire(import.meta.url)(path.join(ROOT, "content/challenge-seed-banks.js"));   // the shipped bank (read only)
const CAND = JSON.parse(fs.readFileSync(path.join(ROOT, "docs/evidence/bloom-036b/seed-bank/candidates.json"), "utf8"));
const RECIPE_STUDY = JSON.parse(fs.readFileSync(path.join(ROOT, "docs/evidence/bloom-036b/challenge-recipe-study.json"), "utf8"));
const base = new Map(CAND.rows.map(r => [`${r.archetypeId}:${r.seed}`, r]));
const SHIPPED = (() => { const src = fs.readFileSync(path.join(ROOT, "content/challenge-seed-banks.js"), "utf8"); return { sha256: crypto.createHash("sha256").update(src).digest("hex") }; })();

const r1 = x => x == null || !Number.isFinite(x) ? null : +(+x).toFixed(1), r3 = x => x == null || !Number.isFinite(x) ? null : +(+x).toFixed(3);
const pct = (n, d) => d ? +(100 * n / d).toFixed(1) : null;
const q = (xs, p) => { xs = xs.filter(x => x != null && Number.isFinite(x)).sort((a, b) => a - b); return xs.length ? xs[Math.min(xs.length - 1, Math.floor(p * (xs.length - 1) + 0.5))] : null; };
const dist = xs => ({ n: xs.filter(x => x != null).length, p10: r1(q(xs, 0.1)), p50: r1(q(xs, 0.5)), p90: r1(q(xs, 0.9)) });
const sdist = xs => ({ n: xs.filter(x => x != null).length, p10: r3(q(xs, 0.1)), p50: r3(q(xs, 0.5)), p90: r3(q(xs, 0.9)) });
const count = (xs, f) => xs.filter(f).length;
const tally = xs => { const o = {}; for (const x of xs) o[x] = (o[x] || 0) + 1; return Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1])); };
const readRows = id => { const f = path.join(ROWS, `${id}.jsonl`); return fs.existsSync(f) ? fs.readFileSync(f, "utf8").split("\n").filter(Boolean).map(l => JSON.parse(l)) : []; };
const TF = new Set(["warm", "cool", "humid", "dry"]);
// a strategy's broad approach in words (tokens are the validator's layer-7 signature: <condition>=<means>(<amount>))
const approach = s => s.tokens.length ? s.tokens.map(t => t.replace(/\(([^)]*)\)/g, "$1")).join(" · ") : "no upgrade needed";

function cellStats(rows, key, concept) {
  const C = rows.map(r => ({ r, c: r.cells && r.cells[key] })).filter(x => x.r.physical && x.c);
  const evaluated = rows.length, physOk = rows.filter(r => r.physical).length, stages = tally(rows.map(r => !r.physical ? "physical" : (r.cells[key] || {}).stage || "none"));
  const ok = C.filter(x => x.c.stage === "ok"), reachedP = C.filter(x => ["ok", "scenario", "quality"].includes(x.c.stage));
  const s = { key, evaluated, physicalOk: physOk, stages, qualifying: ok.length, qualifyingPct: pct(ok.length, physOk), s2Pct: pct(count(C, x => x.c.s2), C.length),
    layerPPassPct: pct(ok.length, reachedP.length),
    arrival: { all: sdist(C.map(x => x.c.habitable)), passing: sdist(ok.map(x => x.c.habitable)), passingZero: count(ok, x => x.c.habitable === 0), passingUnder5: count(ok, x => x.c.habitable < 0.05) },
    foothold: sdist(ok.map(x => x.c.foothold)), byArchetype: {},
    // why layer P refused (digits folded so the same reason groups)
    failReasons: Object.fromEntries(Object.entries(tally(C.filter(x => x.c.stage === "scenario" || x.c.stage === "quality").map(x => (x.c.quality || (x.c.proof && x.c.proof.reason) || x.c.stage || "").replace(/\d+(\.\d+)?/g, "#").slice(0, 90)))).slice(0, 6)) };
  for (const a of [...new Set(rows.map(r => r.archetypeId))]) { const R = C.filter(x => x.r.archetypeId === a); s.byArchetype[a] = { evaluated: rows.filter(r => r.archetypeId === a).length, qualifying: count(R, x => x.c.stage === "ok") }; }
  // the bank proof's witness (the first qualifying strategy) — time to the margin (Bloom + 3 points), purchases, Terraform
  s.witness = { marginSeconds: dist(ok.map(x => x.c.proof.marginSeconds)), purchases: dist(ok.map(x => x.c.proof.purchases)),
    usesTerraformPct: pct(count(ok, x => x.c.proof.terraformSteps > 0), ok.length) };
  const mech = ok.map(x => x.c.proof);
  if (mech.some(p => p.contested != null)) s.witness.contested = dist(mech.map(p => p.contested)), s.witness.nativeStart = sdist(ok.map(x => x.c.nativeStart)), s.witness.nativePeak = sdist(mech.map(p => p.nativePeak));
  if (mech.some(p => p.shocks != null)) s.witness.shockedPct = pct(count(mech, p => p.shocks > 0), ok.length);
  if (mech.some(p => p.pressureAtMargin != null)) s.witness.pressureAtMargin = sdist(mech.map(p => p.pressureAtMargin));
  // start-state concepts: arrival with vs without the prescribed start
  if (C.some(x => x.c.habitableWithoutStart != null)) s.arrivalWithoutStart = sdist(C.map(x => x.c.habitableWithoutStart)), s.arrivalGainFromStart = sdist(C.filter(x => x.c.habitableWithoutStart != null).map(x => x.c.habitable - x.c.habitableWithoutStart));
  // Dying World: the land the decline opens / closes for this plant (green at the final state but not now / now but not at the end)
  if (C.some(x => x.c.decline)) { const P = ok.length ? ok : C; s.decline = { greenNow: sdist(P.map(x => x.c.decline.greenNow)), greenFinal: sdist(P.map(x => x.c.decline.greenFinal)),
    opened: sdist(P.map(x => x.c.decline.opened)), closed: sdist(P.map(x => x.c.decline.closed)), netGainPct: pct(count(P, x => x.c.decline.greenFinal > x.c.decline.greenNow), P.length) }; }
  // diagnostics: ≤ 3 distinct strategies per world
  const dg = ok.filter(x => x.c.diag);
  if (dg.length) {
    const Q = dg.map(x => x.c.diag.strategies.filter(t => t.qualified)), all = Q.flat();
    s.diag = { worlds: dg.length, distinctQualified: tally(Q.map(z => z.length)), fastestWinSeconds: dist(Q.map(z => z.length ? Math.min(...z.map(t => t.winSeconds)) : null)),
      fastestMarginSeconds: dist(Q.map(z => z.length ? Math.min(...z.map(t => t.marginSeconds)) : null)),
      firstPurchaseSeconds: dist(all.map(t => t.firstPurchaseSeconds)),
      approaches: Object.fromEntries(Object.entries(tally(all.map(approach))).slice(0, 8)),
      worldsWithAdaptOnlyWin: count(Q, z => z.some(t => t.terraformSteps === 0)), worldsWithTerraformWin: count(Q, z => z.some(t => t.terraformSteps > 0)),
      worldsWithShockedWin: count(Q, z => z.some(t => t.shocks > 0)), traitUsePct: {} };
    for (const id of D.traits.map(t => t.id)) { const n = count(Q, z => z.some(t => t.purchases.some(p => p[0] === id))); if (n) s.diag.traitUsePct[id] = pct(n, Q.length); }
  }
  // ablations: the same world from another start (does the start matter?)
  const ab = C.filter(x => x.c.ablations);
  if (ab.length) { s.ablations = {};
    for (const id of Object.keys(ab[0].c.ablations)) { const both = ab.filter(x => x.c.stage === "ok" && x.c.ablations[id].ok);
      s.ablations[id] = { worlds: ab.length, conceptPassPct: pct(count(ab, x => x.c.stage === "ok"), ab.length), ablationPassPct: pct(count(ab, x => x.c.ablations[id].ok), ab.length),
        conceptOnly: count(ab, x => x.c.stage === "ok" && !x.c.ablations[id].ok), ablationOnly: count(ab, x => x.c.stage !== "ok" && x.c.ablations[id].ok),
        marginDeltaSeconds: dist(both.map(x => x.c.proof.marginSeconds - x.c.ablations[id].witness.marginSeconds)) }; } }
  // the released Challenge on the SAME worlds × species (candidates.json) — is the concept just that Challenge?
  if (concept.study.baseline) { const bk = `${concept.study.baseline}/${key.split("/")[1]}`, pairs = C.map(x => ({ ...x, b: (base.get(`${x.r.archetypeId}:${x.r.seed}`) || { cells: {} }).cells[bk] })).filter(x => x.b);
    const both = pairs.filter(x => x.c.stage === "ok" && x.b.stage === "ok");
    s.baseline = { cell: bk, worlds: pairs.length, baselineQualifyingPct: pct(count(pairs, x => x.b.stage === "ok"), pairs.length), conceptQualifyingPct: pct(count(pairs, x => x.c.stage === "ok"), pairs.length),
      sameVerdictPct: pct(count(pairs, x => (x.c.stage === "ok") === (x.b.stage === "ok")), pairs.length), identicalProofPct: pct(count(both, x => x.c.proof.marginSeconds === x.b.proof.marginSeconds), both.length),
      marginDeltaSeconds: dist(both.map(x => x.c.proof.marginSeconds - x.b.proof.marginSeconds)) }; }
  return s;
}

/** default-rules concept: the same world under the default rules with Organic Hybrid (the reference plant), from candidates.json S2 */
function defaultBaseline(rows, key) {
  const pairs = rows.filter(r => r.physical).map(r => ({ r, c: r.cells[key], b: (base.get(`${r.archetypeId}:${r.seed}`) || { cells: {} }).cells }));
  const anyOh = pairs.map(x => Object.entries(x.b).find(([k]) => k.endsWith("/organic_hybrid"))).filter(Boolean);
  return { worlds: pairs.length, organicHybridS2Pct: pct(count(anyOh, ([, c]) => c.s2), anyOh.length), conceptS2Pct: pct(count(pairs, x => x.c && x.c.s2), pairs.length),
    requiredConditionAnsweredPct: pct(count(pairs, x => x.c && x.c.requiredAnswered), count(pairs, x => x.c && x.c.stage === "ok")) };
}

const out = { format: "bloom-036c-candidate-study@1", tool: "tools/research/challenges/content-analysis.mjs", runner: "tools/research/challenges/content-study.mjs",
  shippedBank: { file: "content/challenge-seed-banks.js", sha256: SHIPPED.sha256, note: "unchanged by this study" }, pool: "the released seed-bank pool stream (tools/challenge-bank-builder.mjs POOL_STREAM), first N World Seeds per archetype",
  timeUnit: "game-seconds of the validator's perfect-knowledge witness (a person is slower); never player-facing, never a ranking", concepts: {}, derived: {}, current: {} };
fs.mkdirSync(path.join(OUT, "candidate-banks"), { recursive: true });
for (const c of CONCEPTS) {
  const rows = readRows(c.id); if (!rows.length) { out.concepts[c.id] = { missing: true }; continue; }
  const ch = c.kind === "fixture" ? BLOOM.challenges.fixture(c.def) : null;
  const keys = [...new Set(rows.flatMap(r => Object.keys(r.cells || {})))].sort();
  const cells = Object.fromEntries(keys.map(k => [k, cellStats(rows, k, c)]));
  const rec = c.kind === "fixture" ? { scenario: c.def.scenario, species: c.def.launch.species, recipe: c.def.launch.world.recipe, startingState: c.def.launch.startingState, presentation: { name: c.def.name, short: c.def.short, ...c.def.presentation } }
    : { scenario: "default", species: { policy: "prescribed", species: c.species }, recipe: { archetypes: c.archetypes }, startingState: c.start ? { policy: "prescribed", ...c.start } : { policy: "normal" }, presentation: { name: c.name, ...c.copy }, schemaNote: "the current Challenge schema refuses the default scenario" };
  // candidate bank (research only): the builder's own curation; a cell short of 50 is kept as PROVISIONAL with every passing world
  const bank = { format: "bloom-036c-candidate-bank@1", concept: c.id, note: "RESEARCH OUTPUT — not loaded by the game, not part of content/challenge-seed-banks.js", sample: c.study.sample, cells: {} };
  for (const k of keys) { const cur = curateCell(rows.map(r => ({ ...r, poolIndex: r.poolIndex ?? 0 })), k, 50); const sp = k.split("/")[1];
    bank.cells[k] = ch ? { ...cellOf(ch, sp, cur, rows.length, 1, CB), provisional: cur.kept.length < 50 } : { provenance: null, provisional: cur.kept.length < 50, candidates: { evaluated: rows.length, passing: cur.passing, retained: cur.kept.length }, entries: cur.kept.map(x => entryOf(x.row, x.c)) };
    cells[k].candidateBank = { retained: cur.kept.length, provisional: cur.kept.length < 50, quota: cur.quota, minPairDistance: cur.minPairDistance,
      projectedQualifyingInFullPool: Math.round(cells[k].qualifyingPct / 100 * 160 * (c.kind === "fixture" ? c.def.launch.world.recipe.archetypes.length : c.archetypes.length)) }; }
  fs.writeFileSync(path.join(OUT, "candidate-banks", `${c.id}.json`), JSON.stringify(bank) + "\n");
  out.concepts[c.id] = { kind: c.kind, definition: rec, sample: { perArchetype: c.study.sample, worlds: rows.length, diagPerArchetype: c.study.diag }, cells,
    ...(c.kind === "default" ? { defaultBaseline: defaultBaseline(rows, keys[0]) } : {}) };
}
// derived: Deep Freeze = Dying World on Frozen worlds only (the shipped bank's candidate records)
{ const r = {}; for (const sp of BLOOM.species.ids()) { const k = `dying_world/${sp}`, F = CAND.rows.filter(x => x.archetypeId === "frozen_world" && x.physical), A = CAND.rows.filter(x => x.physical);
    const okF = F.filter(x => x.cells[k].stage === "ok"), okA = A.filter(x => x.cells[k].stage === "ok");
    const bank = D.challengeSeedBanks.cells[k].entries;
    r[sp] = { frozenQualifyingPct: pct(okF.length, F.length), allQualifyingPct: pct(okA.length, A.length), frozenMargin: dist(okF.map(x => x.cells[k].proof.marginSeconds)), allMargin: dist(okA.map(x => x.cells[k].proof.marginSeconds)),
      shippedBankFrozenEntries: count(bank, e => e.archetypeId === "frozen_world") }; }
  out.derived.deep_freeze = { ...DERIVED[0], source: "docs/evidence/bloom-036b/seed-bank/candidates.json", bySpecies: r }; }
// derived: Last Refuge = Native Competition below the released 20 % arrival floor (the 036B recipe study proved every world, no recipe)
{ const r = {}; for (const sp of BLOOM.species.ids()) { const W = RECIPE_STUDY.rows.filter(x => x.physical && x.physical.ok && x.species[sp]), lo = W.filter(x => x.species[sp].habitable < 0.20), hi = W.filter(x => x.species[sp].habitable >= 0.20);
    const nc = x => (x.species[sp].scenarios || {}).native_competition, okOf = X => count(X, x => nc(x) && nc(x).ok);
    r[sp] = { worldsBelow20: lo.length, s2Below20: count(lo, x => x.species[sp].s2.ok), passBelow20: okOf(lo), passBelow20Pct: pct(okOf(lo), lo.length), passAtOrAbove20Pct: pct(okOf(hi), hi.length),
      failReasonsBelow20: tally(lo.filter(x => nc(x) && !nc(x).ok).map(x => (nc(x).reason || nc(x).status || "").replace(/^layer P \([^)]*\): /, "").replace(/\d+(\.\d+)?/g, "#").slice(0, 70))) }; }
  out.derived.last_refuge = { ...DERIVED[1], source: "docs/evidence/bloom-036b/challenge-recipe-study.json (40 World Seeds per archetype, every species, layer P on every S2-winnable world)", bySpecies: r }; }
// the three released Challenges (the shipped bank): what a player meets
for (const ch of BLOOM.challenges.list()) { const r = {}; for (const sp of BLOOM.species.ids()) { const E = D.challengeSeedBanks.cells[`${ch.id}/${sp}`].entries;
    r[sp] = { arrival: sdist(E.map(e => e.habitable)), arrivalZero: count(E, e => e.habitable === 0), arrivalUnder5Pct: pct(count(E, e => e.habitable < 0.05), E.length), marginSeconds: dist(E.map(e => e.proof.marginSeconds)),
      ...(ch.id === "volatile_climate" ? { witnessShockedPct: pct(count(E, e => e.proof.shocks > 0), E.length) } : {}), ...(ch.id === "native_competition" ? { contested: dist(E.map(e => e.proof.contested)) } : {}) }; }
  const pool = CAND.rows.filter(x => x.physical), tfp = {}; if (ch.id === "volatile_climate") for (const sp of BLOOM.species.ids()) { const ok = pool.filter(x => x.cells[`${ch.id}/${sp}`].stage === "ok"); tfp[sp] = { witnessUsesTerraformPct: pct(count(ok, x => x.cells[`${ch.id}/${sp}`].proof.terraformSteps > 0), ok.length), witnessShockedPct: pct(count(ok, x => x.cells[`${ch.id}/${sp}`].proof.shocks > 0), ok.length) }; }
  out.current[ch.id] = { bank: r, ...(Object.keys(tfp).length ? { passingPool: tfp } : {}) }; }
fs.writeFileSync(path.join(OUT, "candidate-study.json"), JSON.stringify(out, null, 1) + "\n");
console.log(`wrote ${path.relative(ROOT, path.join(OUT, "candidate-study.json"))} · ${Object.keys(out.concepts).length} concepts · ${Object.keys(out.derived).length} derived`);
