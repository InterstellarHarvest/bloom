// BLOOM — Challenge COMPLETION (BLOOM-036D1): the generic engine win gate, the one completion boundary, Thin Air. docs/CHALLENGES_SYSTEM_v1.md §2.5.
//
//   NODE_PATH="$(npm root -g)" node tools/challenge-completion-check.js [--browsers chromium,firefox] [--evidence] [--node-only]
//
// NODE — the ENGINE (resources/bloom-sim.js): a generic, optional win gate (createSim opts.canWin); the engine knows no Challenge
//   G1 no gate = the pre-036D1 engine bit for bit: the First Bloom golden (tools/golden/first_bloom.json) with no gate AND with an always-true
//      gate; a real Dying World run with / without an always-true gate identical tick for tick; the engine source names no Challenge / condition
//   G2 gate false + coverage ≥ winAt → sim.won stays false · G3 onWin does not fire · G4 the run keeps ticking · G5 extinction stays live
//   G6 an early Bloom (coverage ≥ winAt, gate false) followed by a total die-off is an EXTINCTION loss (the ungated twin: won, never lost)
//   G7 the gate becoming true while coverage ≥ winAt → won exactly once (onWin once), on that tick · G8 a permitting gate never wins below winAt
//   G9 coverage crossed early, fell below, then the gate opens → no win until coverage regains winAt, then won on the first tick it does
// NODE — the completion boundary (resources/challenges/challenge-completion.js) and Thin Air:
//   C1 exactly one condition type (pressure-final-state) · C2 unknown type refused · C3 parameters / unknown keys refused · C4 refused without a
//      pressure scenario (default, Native Competition, Volatile Climate), duplicates, > 1 condition, a non-list
//   C5 the five released Challenges keep conditions [] (ungated: winGate null; the session passes NO gate) and their definitions are unchanged
//   C6 Thin Air: dying_world · prescribed Woolly Candle · Desert + Ocean · normal start · Bloom AND pressure-final-state · the copy
//   C7 the completion fingerprint: deterministic; changes with the condition list, a condition type's version, the win; ungated Challenges share it
//   C8 the gated engine on a real Thin Air bank world (its witness plan, the real decline): an early Bloom does not win, does not fire onWin,
//      the run keeps going with extinction live; the win comes exactly once, at the first tick with coverage ≥ winAt in the final atmosphere;
//      the tracker's early-Bloom time = the first tick coverage reached winAt; its report data (win / loss) says so (no score words)
//   C9 an early Bloom → engineered die-off under the Thin Air gate = EXTINCTION; the loss report explains the early Bloom
// NODE — the bank (content/challenge-seed-banks.js):
//   K1 format 2 · validator @2 · every cell's provenance carries completionFingerprint = its Challenge's contract; 15 cells × 50 = 750
//   K2 the Thin Air cell: 50, non-provisional, Woolly Candle only, Desert + Ocean only, every entry's proof EXPLICITLY establishes the condition
//      (proof.completion: pressure-final-state, held ≥ winAt at progress 1, at/after the final state) · the archetype split
//   K3 prove() refuses evidence that does not establish it (a hold short of the final state, a failed hold, a missing hold, a confirmation run
//      that fails it, no verdict) — a future pressure scenario that does not prove it fails the candidate
//   K4 stale completion banks are refused: a changed completionFingerprint, a missing one, a format-1 bank; a mismatched instance / run
//   K5 sampled Thin Air entries re-validated AND replayed through the gated engine: the witness completes in the final atmosphere
//   K6 (PMO checkpoint) existing bank stability: the 14 cells released in 036C1 keep exactly their 700 entries; Thin Air is the only new cell
// BROWSER (Chromium AND Firefox; "/" = the repository, "/bloom/" = the Pages site, file:// offline):
//   H the six-card hub at 390 × 844, 1024 × 768, 1440 × 900, 2560 × 1440 · T the Thin Air flow (no species screen, the dossier's contract, the
//   HUD condition, the early Bloom, the run continuing, the final atmosphere, the true win / report, Keep playing) · L early Bloom → extinction
//   · R retry · X an ungated Challenge still ends at its first Bloom · P file:// · B /bloom/
// --evidence writes docs/evidence/bloom-036d1/ stills. Exits 1 on any failure.
"use strict";
const path = require("path"), fs = require("fs"), http = require("http"), os = require("os");
const ROOT = path.resolve(__dirname, "..");
for (const f of ["content/config.js", "content/traits.js", "content/species.js", "planets/first_bloom.js", "planets/training_grounds.js", "content/archetypes.js", "content/scenarios.js", "content/challenges.js",
  "content/challenge-seed-banks.js", "content/play.js", "content/training.js", "resources/bloom-sim.js", "resources/bloom-species.js", "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js",
  "resources/bloom-archetype.js", "resources/bloom-scenario.js", "resources/bloom-play.js", "resources/bloom-challenges.js", "resources/challenges/challenge-completion.js", "resources/run/game-session.js"]) require(path.join(ROOT, f));
const argv = process.argv, argOf = k => { const i = argv.indexOf(k); return i > 0 ? argv[i + 1] : null; };
const BROWSERS = (argOf("--browsers") || "chromium,firefox").split(","), EVIDENCE = argv.includes("--evidence"), NODE_ONLY = argv.includes("--node-only");
// (development) --browser-only skips the Node part; --only H,T,X,E,P limits the browser sections (a full run uses neither)
const BROWSER_ONLY = argv.includes("--browser-only"), ONLY = (argOf("--only") || "").split(",").filter(Boolean), want = k => !ONLY.length || ONLY.includes(k);
const EVD = path.join(ROOT, "docs/evidence/bloom-036d1");
let fails = 0, passes = 0; const t0 = Date.now();
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (ok) passes++; else fails++; return ok; };
const J = JSON.stringify;
const { BLOOM, BLOOM_DATA: D } = globalThis;
const GOLD = require("./golden/scenarios.js");
const UNGATED = ["dying_world", "native_competition", "volatile_climate", "low_tide", "oasis_line"];
const ALL = [...UNGATED, "thin_air"];
const CC = BLOOM.challengeCompletion, C = BLOOM.challenges;
const mulberry32 = BLOOM.gen.mulberry32;
// a tick-by-tick hash of the whole sim state (tiles, densities, vigor, Biomass, sky, pressure, extinction counters)
const fnvBytes = (h, a) => { const u = new Uint8Array(a.buffer, a.byteOffset, a.byteLength); for (let i = 0; i < u.length; i++) h = Math.imul(h ^ u[i], 0x01000193); return h >>> 0; };
const simHash = s => { let h = 0x811c9dc5; h = fnvBytes(h, s.state); h = fnvBytes(h, s.dens); h = fnvBytes(h, s.vigor); h = fnvBytes(h, new Float64Array([s.biomass, s.sky.temp, s.sky.moist, s.pressure.progress, s.extinction.zeroTicks, s.ticks]));
  return h; };

/**
 * One real engine run of `plan` (purchases through sim.buy as soon as earned Biomass allows — the witness's own rule), under `scenario`, with an
 * optional win gate. hooks.at(t, sim) runs after each tick (engineered QA interventions). Returns the per-tick record and the outcome.
 */
function replay(planet, plan, { scenario, species, gate = undefined, rngSeed = D.config.validation.rngSeed, maxTicks = 3200, hooks = {}, hash = false } = {}) {
  const opts = { rng: mulberry32(rngSeed), scenario, species, ...(gate !== undefined ? { canWin: gate } : {}) };
  const sim = BLOOM.createSim(planet, D.config, D.traits, opts);
  let wins = 0, losses = 0, winTick = null, firstCross = null; const hashes = [], covs = [];
  sim.onWin = () => { wins++; if (winTick === null) winTick = sim.ticks; }; sim.onLoss = () => { losses++; };
  let k = 0;
  for (let t = 1; t <= maxTicks; t++) {
    const cov = sim.tick(); covs.push(cov); if (hash) hashes.push(simHash(sim));
    if (firstCross === null && cov >= sim.winAt) firstCross = t;
    if (k < plan.length) { const tr = sim.traitById[plan[k]]; if (sim.canBuy(tr) && sim.biomass >= sim.price(tr) && sim.buy(tr.id)) k++; }
    if (hooks.at && hooks.at(t, sim) === "stop") break;
    if (sim.lost) break;
  }
  return { sim, wins, losses, winTick, firstCross, hashes, covs, fullTick: sim.pressure.fullAt != null ? Math.ceil(sim.pressure.fullAt * 1000 / D.config.tickMs) : null };
}
// kill every living plant (an engineered total die-off: QA only)
const dieOff = sim => { for (const i of sim.map.LAND_TILES) if (sim.state[i] === sim.LIV) { sim.state[i] = sim.BAR; sim.dens[i] = 0; } };
// thin the living plants to `keep` of the land (engineered partial loss: QA only)
const thinTo = (sim, keep) => { const liv = sim.map.LAND_TILES.filter(i => sim.state[i] === sim.LIV), want = Math.floor(keep * sim.map.LAND); for (let j = want; j < liv.length; j++) { sim.state[liv[j]] = sim.BAR; sim.dens[liv[j]] = 0; } };

(async () => {
  const CB = await import("file://" + path.join(ROOT, "resources/challenges/challenge-bank.js"));
  const S = await import("file://" + path.join(ROOT, "resources/destination-survey/survey-data.js"));
  const BL = await import("file://" + path.join(ROOT, "tools/challenge-bank-builder.mjs"));
  const TA = C.resolve("thin_air"), DW = C.scenarioOf(TA), WC = BLOOM.species.resolve("woolly_candle");
  const bank = D.challengeSeedBanks, taCell = bank && bank.cells && bank.cells["thin_air/woolly_candle"];
  // the browser's Thin Air launch: the first launch seed whose bank entry blooms EARLY (well before the final state) under its own witness plan, so the
  // early-Bloom sequence is really exercised (many Ocean worlds Bloom only after the decline — those are valid entries, not this test's subject)
  const LAUNCH = (() => { if (!taCell) return 3; const FTk = Math.ceil((DW.pressure.graceSeconds + DW.pressure.durationSeconds) * 1000 / D.config.tickMs);
    for (let seed = 1; seed < 400; seed++) { const pk = CB.pickEntry(taCell, { challenge: TA, species: WC, launchSeed: seed }); if (pk.entry.archetypeId !== "desert_world") continue;
      const Pl = CB.buildBankWorld(pk.entry).planet, v = BLOOM.validateScenario(Pl, D.config, D.traits, DW, { archetypeId: pk.entry.archetypeId, species: WC });
      if (!v.ok) continue; const r = replay(Pl, v.strategies[0].plan, { scenario: DW, species: WC, maxTicks: FTk });
      if (r.firstCross !== null && r.firstCross < FTk - 250) { console.log(`INFO  browser Thin Air launch seed ${seed} → entry #${pk.index} ${pk.entry.archetypeId}:${pk.entry.seed} (witness Bloom at tick ${r.firstCross} < final ${FTk})`); return seed; } }
    return 3; })();
  if (BROWSER_ONLY) { await browserChecks(LAUNCH); return done(); }

  // ---- a real Thin Air bank world with an EARLY Bloom under its own witness plan (Desert first: 80 % of Desert Blooms come early)
  console.log("# G · the generic engine win gate (Node)");
  let W = null;
  { const order = taCell ? [...taCell.entries].sort((a, b) => (a.archetypeId === "desert_world" ? 0 : 1) - (b.archetypeId === "desert_world" ? 0 : 1)) : [];
    for (const e of order.slice(0, 8)) {
      const P = CB.buildBankWorld(e).planet, v = BLOOM.validateScenario(P, D.config, D.traits, DW, { archetypeId: e.archetypeId, species: WC });
      if (!v.ok) continue; const plan = v.strategies[0].plan, r = replay(P, plan, { scenario: DW, species: WC });
      if (r.firstCross !== null && r.firstCross < r.fullTick - 20) { W = { entry: e, planet: P, plan, ref: r }; break; } } }
  if (!check(!!W, "G0 · a real Thin Air bank world whose witness plan reaches Bloom BEFORE the final atmosphere (the engine scenarios below run on it)",
    W ? `${W.entry.archetypeId}:${W.entry.seed} · first Bloom tick ${W.ref.firstCross} (${(W.ref.firstCross * D.config.tickMs / 1000).toFixed(1)} s) < final state tick ${W.ref.fullTick} (${(W.ref.fullTick * D.config.tickMs / 1000).toFixed(0)} s)` : "no bank / no early-Bloom world")) return done();
  const { planet: P, plan } = W, FT = W.ref.fullTick;

  // G1 · no gate = bit for bit
  { const adapter = (extra) => { let sim; const planet = D.planets.first_bloom;
      const goldenIds = Object.keys(JSON.parse(fs.readFileSync(path.join(__dirname, "golden/first_bloom.json"), "utf8")).static.prices.start);
      return { reset(seed) { sim = BLOOM.createSim(planet, D.config, D.traits, { rng: GOLD.mulberry32(seed), ...extra }); }, tick() { sim.tick(); }, buy(id) { return sim.buy(id); }, addBiomass(x) { sim.biomass += x; },
        read() { return { biomass: sim.biomass, ticks: sim.ticks, won: sim.won, tiles: sim.state, vigor: sim.vigor, dens: sim.dens, bubbles: sim.bubbles.length }; },
        setColonyFocus(id, mode) { return sim.setColonyFocus(sim.map.SIDX[id], mode); }, buySpecialization(id, spec) { return sim.buySpecialization(sim.map.SIDX[id], spec); },
        colonies() { return { focus: [...sim.colonies.focus], spec: [...sim.colonies.spec] }; },
        setCondition(c) { Object.assign(sim.genome, c.genome); Object.assign(sim.sky, c.sky); for (const k in sim.tf) sim.tf[k] = 0; Object.assign(sim.tf, c.tf || {}); },
        evaluate(i) { return sim.evaluate(i); }, previewOf(id) { return sim.previewOf(id); }, price(id) { return sim.price(sim.traitById[id]); },
        traitIds: D.traits.map(t => t.id).filter(id => goldenIds.includes(id)), get sectionCount() { return sim.map.SC; },
        get map() { return { tilemap: sim.map.TILEMAP, area: sim.map.AREA, cent: sim.map.CENT }; } }; };
    const want = JSON.parse(fs.readFileSync(path.join(__dirname, "golden/first_bloom.json"), "utf8"));
    const same = got => GOLD.PARTS.every(part => J(got[part]) === J(want[part]));
    const g0 = same(GOLD.runGolden(adapter({}))), g1 = same(GOLD.runGolden(adapter({ canWin: () => true })));
    const a = replay(P, plan, { scenario: DW, species: WC, hash: true }), b = replay(P, plan, { scenario: DW, species: WC, gate: () => true, hash: true });
    const diff = a.hashes.findIndex((h, i) => h !== b.hashes[i]);
    // (the one pre-existing mention: 036B's starting-state provenance default `source: … : "challenge"` — data, not a rule; excluded by its exact text)
    const src = fs.readFileSync(path.join(ROOT, "resources/bloom-sim.js"), "utf8").replace(/\/\/.*$/gm, "").replace('source: typeof st.source === "string" ? st.source : "challenge"', "");
    const named = ["thin_air", "pressure-final-state", "challenge", "Challenge", "completion"].filter(w => src.includes(w));
    let refused = false; try { BLOOM.createSim(P, D.config, D.traits, { canWin: true }); } catch (e) { refused = /canWin/.test(e.message); }
    const noGate = BLOOM.createSim(P, D.config, D.traits, { rng: () => 0.5 }), gated = BLOOM.createSim(P, D.config, D.traits, { rng: () => 0.5, canWin: () => true });
    check(g0 && g1 && diff === -1 && a.hashes.length === b.hashes.length && a.winTick === b.winTick && a.wins === 1 && b.wins === 1 && !named.length && refused && noGate.winGated === false && gated.winGated === true,
      "G1 · no gate = the pre-036D1 engine BIT FOR BIT: the First Bloom golden matches with no gate and with an always-true gate; a real Dying World run (Thin Air bank world, its witness plan, the decline) is identical tick for tick with and without an always-true gate (tiles, densities, vigor, Biomass, sky, pressure, extinction counters), winning on the same tick; the engine's code names no Challenge or condition; a non-function gate is refused",
      `golden ${g0}/${g1} · ${a.hashes.length} ticks compared, first difference ${diff} · won tick ${a.winTick}/${b.winTick} · named ${J(named)}`); }

  // G2–G5 · a gate that never permits: an early Bloom is not a win
  { const r = replay(P, plan, { scenario: DW, species: WC, gate: () => false, maxTicks: FT + 400 }), s = r.sim;
    const after = r.covs.slice(r.firstCross - 1).filter(c => c >= s.winAt).length;
    check(r.firstCross !== null && after > 50 && s.won === false, "G2 · gate false + coverage ≥ winAt → sim.won stays FALSE", `coverage ≥ winAt on ${after} ticks from tick ${r.firstCross}; won ${s.won}`);
    check(r.wins === 0 && r.winTick === null, "G3 · gate false → onWin never fires", `onWin calls ${r.wins}`);
    check(s.ticks === FT + 400 && s.pressure.progress === 1 && !s.lost, "G4 · gate false → the simulation keeps ticking (through the final state; the run is neither stopped nor frozen)", `ticks ${s.ticks} · progress ${s.pressure.progress}`);
    // extinction is live: engineered total die-off after the early Bloom
    const x = replay(P, plan, { scenario: DW, species: WC, gate: () => false, maxTicks: FT, hooks: { at: (t, sim) => { if (t === W.ref.firstCross + 5) dieOff(sim); } } });
    check(x.sim.extinction.enabled && x.sim.lost && /extinction/.test(x.sim.lostReason) && x.losses === 1 && x.wins === 0,
      "G5 · gate false → extinction stays ACTIVE after coverage reached winAt (a total die-off is confirmed after the scenario's grace)", `lost at tick ${x.sim.lostTick} (die-off at ${W.ref.firstCross + 5}) · ${x.sim.lostReason}`);
    // G6 · the ungated twin of the same engineered die-off: won at the crossing → extinction is off → never lost
    const u = replay(P, plan, { scenario: DW, species: WC, maxTicks: W.ref.firstCross + 200, hooks: { at: (t, sim) => { if (t === W.ref.firstCross + 5) dieOff(sim); } } });
    check(x.sim.lost && u.sim.won && !u.sim.lost && u.sim.coverage() === 0 && u.winTick === W.ref.firstCross,
      "G6 · early coverage ≥ winAt followed by a total die-off: with the gate closed it is an EXTINCTION loss; the ungated twin (won at the crossing, extinction off) is never lost — the gate keeps the early Bloom from making the player immortal",
      `gated: lost tick ${x.sim.lostTick} · ungated: won tick ${u.winTick}, coverage now ${u.sim.coverage()}, lost ${u.sim.lost}`); }

  // G7–G9 · the gate opening
  { let open = false; const at = W.ref.firstCross + 30;
    const r = replay(P, plan, { scenario: DW, species: WC, gate: () => open, maxTicks: at + 300, hooks: { at: (t) => { if (t === at) open = true; } } });
    const covAt = r.covs[at];   // the tick after `at` is the first one the open gate is asked on
    check(r.wins === 1 && r.winTick === at + 1 && covAt >= r.sim.winAt && r.sim.won,
      "G7 · the gate becoming true while coverage ≥ winAt → sim.won becomes true EXACTLY ONCE, on the first tick the gate permits (onWin once; ticking on does not fire it again)", `won tick ${r.winTick} · onWin ×${r.wins}`);
    const below = replay(P, plan, { scenario: DW, species: WC, gate: () => true, maxTicks: W.ref.firstCross - 1 });
    let asked = 0; const counted = replay(P, plan, { scenario: DW, species: WC, gate: (s, c) => { asked++; return c >= 0; }, maxTicks: W.ref.firstCross - 1 });
    check(!below.sim.won && below.wins === 0 && asked === 0 && !counted.sim.won && Math.max(...below.covs) < below.sim.winAt,
      "G8 · a permitting gate while coverage < winAt → no win (the gate is not even asked below the threshold)", `max coverage ${Math.max(...below.covs).toFixed(3)} < ${below.sim.winAt} · gate asked ${asked}×`);
    // G9 · crossed early → engineered loss below the threshold → the gate opens → no win until coverage regains winAt
    let g = false, regained = null; const cut = W.ref.firstCross + 10;
    const q = replay(P, plan, { scenario: DW, species: WC, gate: () => g, maxTicks: cut + 3000, hooks: { at: (t, sim) => {
      if (t === cut) { thinTo(sim, 0.4); g = true; }
      if (t > cut && regained === null && sim.coverage() >= sim.winAt) regained = t; if (sim.won) return "stop"; } } });
    const between = q.covs.slice(cut, (q.winTick || q.covs.length) - 1);
    check(q.wins === 1 && regained !== null && q.winTick === regained && between.every(c => c < q.sim.winAt) && q.covs[cut] < q.sim.winAt,
      "G9 · coverage crossed early, then fell below the threshold, then the gate opened: NO win while below — the player must regain the threshold; won on the first tick coverage is back at winAt",
      `cut to 40 % at tick ${cut} (coverage ${q.covs[cut].toFixed(3)}) · gate open from ${cut} · ${between.length} ticks below · regained & won at tick ${q.winTick}`); }

  console.log("\n# C · the completion boundary + Thin Air (Node)");
  const d0 = D.challenges.find(c => c.id === "dying_world"), dTA = D.challenges.find(c => c.id === "thin_air"), Sc = D.scenarios;
  const withC = (d, conditions, extra = {}) => ({ ...d, completion: { win: "bloom", conditions, ...extra } });
  check(J(Object.keys(CC.TYPES)) === J(["pressure-final-state"]) && CC.MAX_CONDITIONS === 1 && J(CC.WINS) === J(["bloom"]) && Object.isFrozen(CC) && Object.isFrozen(CC.TYPES),
    "C1 · exactly ONE condition type is supported (pressure-final-state); at most one condition; the only win is the Bloom", J(Object.keys(CC.TYPES)));
  const R2 = C.check([withC(dTA, [{ type: "never-critical" }])], Sc), R2b = C.check([withC(dTA, [{ type: "terraform-axis-min" }])], Sc);
  check(R2.length && R2b.length && R2.every(e => /unknown condition type/.test(e)), "C2 · an unknown condition type is refused", R2[0]);
  const R3 = { param: C.check([withC(dTA, [{ type: "pressure-final-state", holdSeconds: 60 }])], Sc), unknownKey: C.check([withC(dTA, [{ type: "pressure-final-state", note: "x" }])], Sc),
    completionKey: C.check([withC(dTA, [{ type: "pressure-final-state" }], { bonus: true })], Sc), notObject: C.check([withC(dTA, ["pressure-final-state"])], Sc) };
  check(Object.values(R3).every(e => e.length > 0), "C3 · parameters / unknown keys are refused (a condition is { type } only; completion is { win, conditions } only)", J(Object.fromEntries(Object.entries(R3).map(([k, e]) => [k, e[0]]))));
  const def = BLOOM.pressure.resolveScenario(Sc, null);
  const R4 = { default: CC.check({ win: "bloom", conditions: [{ type: "pressure-final-state" }] }, def), nc: C.check([{ ...withC(dTA, [{ type: "pressure-final-state" }]), scenario: "native_competition" }], Sc),
    vc: C.check([{ ...withC(dTA, [{ type: "pressure-final-state" }]), scenario: "volatile_climate" }], Sc), dup: C.check([withC(dTA, [{ type: "pressure-final-state" }, { type: "pressure-final-state" }])], Sc),
    nonList: C.check([{ ...dTA, completion: { win: "bloom", conditions: { type: "pressure-final-state" } } }], Sc), otherWin: C.check([{ ...dTA, completion: { win: "coverage-80", conditions: [] } }], Sc) };
  const ok4 = { dw: C.check([withC(d0, [{ type: "pressure-final-state" }])], Sc), ta: C.check([dTA], Sc) };
  check(Object.values(R4).every(e => e.length > 0) && R4.nc.some(e => /needs a scenario with pressure/.test(e)) && R4.dup.some(e => /duplicate|at most 1/.test(e)) && Object.values(ok4).every(e => !e.length),
    "C4 · pressure-final-state is refused without a pressure scenario (default, Native Competition, Volatile Climate); duplicates, > 1 condition, a non-list and another win are refused; it is legal on Dying World",
    J(Object.fromEntries(Object.entries(R4).map(([k, e]) => [k, (e[0] || "").replace(/^challenge \w+: /, "").slice(0, 70)]))));
  { const rows = UNGATED.map(id => { const ch = C.resolve(id), K = CC.contract(ch); return { id, conditions: ch.completion.conditions.length, gated: K.gated, gate: CC.winGate(ch) }; });
    const src = fs.readFileSync(path.join(ROOT, "resources/run/game-session.js"), "utf8");
    const sessionGate = /\.\.\.\(GATED\?\{canWin:\(s,c\)=>CT\.gate\(s,c\)\}:\{\}\)/.test(src) && /GATED=!!\(CHK&&CHK\.gated\)/.test(src);
    const VERS = { dying_world: 3, native_competition: 4, volatile_climate: 4, low_tide: 1, oasis_line: 1 };
    check(rows.every(r => r.conditions === 0 && !r.gated && r.gate === null) && sessionGate && UNGATED.every(id => C.resolve(id).version === VERS[id]),
      "C5 · the five released Challenges keep conditions [] — ungated: winGate is null and the session passes NO canWin to createSim (the ordinary engine), versions unchanged (DW 3 · NC 4 · VC 4 · Low Tide 1 · Oasis Line 1)", J(rows.map(r => `${r.id}:${r.gated}`))); }
  { const P_ = TA.presentation;
    check(TA.scenario === "dying_world" && TA.launch.species.policy === "prescribed" && TA.launch.species.species === "woolly_candle" && J(TA.launch.world.recipe.archetypes.slice().sort()) === J(["desert_world", "ocean_archipelago"])
        && TA.launch.startingState.policy === "normal" && J(TA.completion) === J({ win: "bloom", conditions: [{ type: "pressure-final-state" }] }) && TA.version === 1 && TA.name === "Thin Air"
        && P_.tagline === "As the atmosphere thins, the world cools, dries and brightens with radiation — conditions Woolly Candle was built to endure." && /frailejones/.test(P_.science) && /simplified changing-atmosphere model/.test(P_.science)
        && !/oxygen|air pressure|atmospheric pressure/i.test(J(P_)) && J(C.ids()) === J(ALL) && !C.closedByStart(TA).length && C.startingStateOf(TA) === null,
      "C6 · Thin Air: Dying World · PRESCRIBED Woolly Candle · Desert + Ocean (no Frozen) · the normal start · Bloom AND pressure-final-state; the accepted 036C copy; science careful (no oxygen / pressure claim); sixth on the hub",
      `${TA.id} v${TA.version} · ${J(TA.launch.world.recipe.archetypes)} · ${J(TA.completion)}`); }
  { const fx = d => CC.contract({ completion: d.completion });
    const a = fx(dTA).fingerprint, b = fx(withC(dTA, [])).fingerprint, c2 = CC.contract(C.resolve("dying_world")).fingerprint;
    const ungated = new Set(UNGATED.map(id => CC.fingerprint(C.resolve(id))));
    const again = CC.contract({ completion: JSON.parse(J(dTA.completion)) }).fingerprint;
    // a condition type's own version and the contract version are part of it (recomputed exactly as contract() does, with a bumped number)
    const fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193); return (h >>> 0).toString(16).padStart(8, "0"); };
    const stable = v => Array.isArray(v) ? `[${v.map(stable).join(",")}]` : v && typeof v === "object" ? `{${Object.keys(v).sort().map(k => J(k) + ":" + stable(v[k])).join(",")}}` : J(v);
    const fpOf = (ver, tv) => fnv(stable({ version: ver, win: "bloom", conditions: [{ type: "pressure-final-state", version: tv }] }));
    check(a !== b && b === c2 && ungated.size === 1 && ungated.has(c2) && a === again && a === CC.fingerprint(TA) && fpOf(CC.VERSION, 1) === a && fpOf(CC.VERSION, 2) !== a && fpOf(CC.VERSION + 1, 1) !== a,
      "C7 · completionFingerprint is deterministic and reflects the resolved contract: it changes with the condition list, a condition type's version and the contract version; every ungated Challenge shares the ordinary-Bloom fingerprint",
      `thin_air ${a} · ungated ${c2} · type v2 ${fpOf(CC.VERSION, 2)} · contract v+1 ${fpOf(CC.VERSION + 1, 1)}`); }

  // C8 · the REAL Thin Air gate + tracker on the real world
  { let early = null;
    const sim0 = BLOOM.createSim(P, D.config, D.traits, { rng: mulberry32(D.config.validation.rngSeed), scenario: DW, species: WC, canWin: (s, c) => trk.gate(s, c) });
    const trk = CC.tracker(TA, sim0, { onEarlyBloom: i => { early = i; } });
    let wins = 0, winTick = null, k = 0, firstCross = null, liveExt = false, statusSeen = new Set(), reportAt = null; sim0.onWin = () => { wins++; winTick = sim0.ticks; reportAt = trk.reportData("win"); };
    for (let t = 1; t <= FT + 1500 && !(sim0.won && t > winTick + 50); t++) {
      const cov = sim0.tick(); if (firstCross === null && cov >= sim0.winAt) firstCross = t;
      if (firstCross !== null && !sim0.won && sim0.extinction.enabled) liveExt = true;
      statusSeen.add(trk.progress().status);
      if (k < plan.length) { const tr = sim0.traitById[plan[k]]; if (sim0.canBuy(tr) && sim0.biomass >= sim0.price(tr) && sim0.buy(tr.id)) k++; }
    }
    const firstFinalWin = W.ref.covs.findIndex((c, i) => i + 1 >= FT && c >= sim0.winAt) + 1;   // the ungated reference's own trajectory (same run until the win)
    const early_s = firstCross * D.config.tickMs / 1000, P_ = trk.progress();
    check(firstCross === W.ref.firstCross && firstCross < FT && wins === 1 && winTick >= FT && winTick === firstFinalWin && early && Math.abs(early.seconds - early_s) < 1e-9 && liveExt && statusSeen.has("early-held") && statusSeen.has("waiting") && P_.status === "complete",
      "C8 · the Thin Air gate on a real bank world (its witness plan, the real decline): the early Bloom (coverage ≥ winAt before the final state) does NOT win — no onWin, the run goes on with extinction live; the win comes ONCE, on the first tick with coverage ≥ winAt in the final atmosphere; the tracker's early-Bloom time is the first crossing",
      `early Bloom ${early_s.toFixed(1)} s (tick ${firstCross}) · final state tick ${FT} · won tick ${winTick} (${(winTick * D.config.tickMs / 1000).toFixed(1)} s) · statuses ${J([...statusSeen])}`);
    const RD = reportAt, words = J(RD);
    check(RD && RD.mark === "FINAL ATMOSPHERE ✓" && RD.earlyBloomSeconds === early_s && /^You held \d+% of the land in the final atmosphere\.$/.test(RD.lines[0]) && /Bloom was first reached at \dm \d\ds/.test(RD.lines[1] || "")
        && !/\b(score|bonus|medal|achievement|objective|points?)\b/i.test(words) && RD.coverageAtCompletion >= sim0.winAt,
      "C16/C15 · the win's completion data: FINAL ATMOSPHERE ✓, the coverage held in the final atmosphere, when Bloom was first reached and when the atmosphere settled — never a score, bonus, medal or objective", RD && RD.lines.join(" / ")); }

  // C9 · early Bloom → engineered total die-off under the REAL Thin Air gate = extinction; the loss data explains the early Bloom
  { const sim = BLOOM.createSim(P, D.config, D.traits, { rng: mulberry32(D.config.validation.rngSeed), scenario: DW, species: WC, canWin: (s, c) => trk.gate(s, c) });
    const trk = CC.tracker(TA, sim); let lost = 0, k = 0; sim.onLoss = () => { lost++; }; sim.onWin = () => { throw new Error("won"); };
    for (let t = 1; t <= FT && !sim.lost; t++) { sim.tick(); if (t === W.ref.firstCross + 20) dieOff(sim);
      if (k < plan.length) { const tr = sim.traitById[plan[k]]; if (sim.canBuy(tr) && sim.biomass >= sim.price(tr) && sim.buy(tr.id)) k++; } }
    const L = trk.reportData("loss");
    check(lost === 1 && sim.lost && !sim.won && L && L.earlyBloomSeconds !== null && /reached Bloom before the atmosphere finished changing, but the plant did not survive the final conditions/.test(L.lines[0]) && !/won|victory/i.test(J(L)),
      "C9/C11 · early Bloom → total die-off under the Thin Air gate is a real EXTINCTION (onLoss once, never won); the loss data says the Bloom came before the atmosphere finished changing and the plant did not survive — never that it had already won",
      L && L.lines[0]); }

  // W2 · the LEGACY report path (developer harness ?ui=legacy) — its pressureReport, evaluated from the session source with stubbed data, says the same
  { const src = fs.readFileSync(path.join(ROOT, "resources/run/game-session.js"), "utf8"), a = src.indexOf("function pressureReport(kind=\"win\")"), b = src.indexOf("\n}", a) + 2;
    const sgn = v => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(Math.round(v * 10) / 10)}`;
    const mk = done => new Function("pressureReportData", "sgn", src.slice(a, b) + "; return pressureReport;")(() => ({ title: "Atmosphere thinning", phaseName: done ? "Final harsh state" : "Severe loss", progress: done ? 1 : 0.6, done,
      offsets: { moist: -5, temp: -4, rad: 4 }, max: { moist: -9, temp: -8, rad: 8 } }), sgn);
    const lossEarly = mk(false)("loss"), winEarly = mk(false)("win"), def = mk(false)(), lossDone = mk(true)("loss"), winDone = mk(true)("win");
    const lossCall = /legacyLossHtml[\s\S]*?\$\{pressureReport\("loss"\)\}/.test(src), winCall = /legacyWinHtml[\s\S]*?\$\{pressureReport\(\)\}/.test(src);
    check(!/keep playing/i.test(lossEarly) && /The atmosphere had not finished changing\. Final conditions would have been: moisture −9, temperature −8 °C, radiation \+8\./.test(lossEarly)
        && /The decline continues if you keep playing \(final: moisture −9/.test(winEarly) && def === winEarly && /the final harsh state\./.test(lossDone) && lossDone === winDone && lossCall && winCall,
      "W2 · the LEGACY report path agrees: an extinction before the final state never says \"keep playing\" and names the final conditions it never reached; a win keeps \"continues if you keep playing\"; a completed decline keeps its final-state words (win and loss alike); the legacy loss report asks for the loss wording",
      lossEarly.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").slice(0, 220)); }

  console.log("\n# K · the bank (Node)");
  { const cells = Object.entries(bank.cells), bad = [];
    for (const [key, cell] of cells) { const [chId, sp] = key.split("/"), ch = C.resolve(chId);
      if (cell.provenance.completionFingerprint !== CC.fingerprint(ch)) bad.push(key); try { CB.bankCell(ch, sp); } catch (e) { bad.push(`${key}: ${e.code}`); } }
    const want = C.list().reduce((n, ch) => n + (C.speciesOf(ch) ? 1 : BLOOM.species.ids().length), 0);
    check(bank.format === 2 && CB.BANK_FORMAT === 2 && CB.VALIDATOR_ID === "challenge-bank-validation@2" && !bank.provisional && cells.length === 15 && want === 15 && cells.every(([, c]) => c.entries.length === 50 && c.provenance.validator === CB.VALIDATOR_ID) && !bad.length,
      "K1 · the bank: format 2, validator @2, every cell's provenance carries completionFingerprint = its Challenge's contract and passes the stale check; 15 cells × 50 = 750 entries; not provisional",
      `${cells.length} cells · ${cells.reduce((n, [, c]) => n + c.entries.length, 0)} entries · bad ${J(bad)}`); }
  { const c = taCell, arch = {}; for (const e of c.entries) arch[e.archetypeId] = (arch[e.archetypeId] || 0) + 1;
    const winAt = D.config.win, fullAt = DW.pressure.graceSeconds + DW.pressure.durationSeconds;
    // (PMO 036D1 checkpoint) EXPLICIT: every entry records that its proof shows coverage ≥ winAt WHILE pressure.progress === 1 (not "Dying World passed")
    const proven = c.entries.filter(e => { const K = e.proof.completion;
      return e.proof.status === "PASS" && K && J(K.conditions) === J(["pressure-final-state"]) && K.proves === "coverage >= winAt while pressure.progress === 1" && K.runs >= 1
        && K.winAt === winAt && K.minHoldCoverage >= K.winAt && K.minHoldProgress === 1 && K.finalAtSeconds === fullAt && K.holdSeconds >= K.finalAtSeconds; });
    const fps = new Set(c.entries.map(e => e.fingerprint));
    check(c.entries.length === 50 && !bank.provisional && c.provenance.speciesId === "woolly_candle" && Object.keys(bank.cells).filter(k => k.startsWith("thin_air/")).length === 1
        && Object.keys(arch).every(a => a === "desert_world" || a === "ocean_archipelago") && arch.desert_world > 0 && arch.ocean_archipelago > 0 && proven.length === 50 && fps.size === 50,
      "K2 · the Thin Air cell: 50 entries, non-provisional, Woolly Candle only (one cell), Desert + Ocean only (both present); EVERY entry's proof RECORDS AND ESTABLISHES the condition explicitly — coverage ≥ winAt (0.70) WHILE pressure.progress === 1, in every proven run (strategies + confirmations), at a hold time ≥ the final state's start (290 s)",
      `archetypes ${J(arch)} · passing ${c.candidates.passing}/${c.candidates.evaluated} · proven ${proven.length}/50 · min hold coverage ${Math.min(...c.entries.map(e => e.proof.completion ? e.proof.completion.minHoldCoverage : 0))} · progress ${J([...new Set(c.entries.map(e => e.proof.completion && e.proof.completion.minHoldProgress))])} · hold ≥ ${Math.min(...c.entries.map(e => e.proof.completion ? e.proof.completion.holdSeconds : 0))} s`); }
  { const good = { ok: true, strategies: [{ hold: { seconds: 350, coverage: 0.75, held: true, progress: 1 }, confirm: [{ rngSeed: 7, hold: { seconds: 350, coverage: 0.74, held: true, progress: 1 } }] }] };
    const mod = f => { const v = JSON.parse(J(good)); f(v); return v; };
    const cases = { early: mod(v => { v.strategies[0].hold.progress = 0.82; }), notHeld: mod(v => { v.strategies[0].hold.held = false; }), missing: mod(v => { delete v.strategies[0].hold; }),
      confirmFails: mod(v => { v.strategies[0].confirm[0].hold.progress = 0.9; }), oldShape: mod(v => { delete v.strategies[0].hold.progress; }), noVerdict: { ok: false, strategies: [] }, noStrategy: { ok: true, strategies: [] } };
    cases.belowWinAt = mod(v => { v.strategies[0].hold.coverage = 0.69; });                   // "held" claimed, but the coverage is not ≥ winAt
    cases.almostFinal = mod(v => { v.strategies[0].hold.progress = 0.9999; });              // progress must be EXACTLY 1 (the engine clamps to 1)
    const res = Object.fromEntries(Object.entries(cases).map(([k, v]) => [k, CC.prove(TA, v, { winAt: 0.7 })]));
    res.noWinAt = CC.prove(TA, good);
    const ungated = CC.prove(C.resolve("dying_world"), { ok: true, strategies: [] });
    check(CC.prove(TA, good, { winAt: 0.7 }).ok && Object.values(res).every(r => !r.ok && r.reason) && ungated.ok && ungated.evidence === null,
      "K3 · the builder's completion proof (BLOOM.challengeCompletion.prove) passes only evidence that ESTABLISHES the condition: a hold before the final state, a failed or missing hold, a confirmation run that fails it, evidence without its progress, no verdict / no strategy are all refused (stage \"completion\"); an ungated Challenge proves nothing more",
      J(Object.fromEntries(Object.entries(res).map(([k, r]) => [k, r.reason.slice(0, 50)])))); }
  { const ch = TA, cell = JSON.parse(J(taCell)), err = c => { try { CB.checkCell(c, ch, "woolly_candle"); return CB.checkCell(c, ch, "woolly_candle").length; } catch (e) { return -1; } };
    const changed = JSON.parse(J(cell)); changed.provenance.completionFingerprint = "00000000";
    const missing = JSON.parse(J(cell)); delete missing.provenance.completionFingerprint;
    const format1 = { ...bank, format: 1 }; let f1 = null; try { CB.bankCell(ch, "woolly_candle", { BLOOM, BLOOM_DATA: { ...D, challengeSeedBanks: format1 } }); } catch (e) { f1 = e.code; }
    let inst = null; try { const pick = CB.pickEntry(taCell, { challenge: ch, species: WC, launchSeed: 3 }), world = CB.bankWorld(pick.entry, taCell, WC, null);
      CB.makeBankInstance({ challenge: ch, species: WC, launchSeed: 3, cell: changed, pick, world }); } catch (e) { inst = e.code || e.message; }
    let run = null; try { const pick = CB.pickEntry(taCell, { challenge: ch, species: WC, launchSeed: 3 }), world = CB.bankWorld(pick.entry, taCell, WC, null);
      const X = CB.makeBankInstance({ challenge: ch, species: WC, launchSeed: 3, cell: taCell, pick, world }); const R = BLOOM.gameSession.challengeRun(X);
      if (R.challengeRun.completion.fingerprint !== CC.fingerprint(ch) || J(R.summary.challenge.completion.conditions) !== J(["pressure-final-state"])) run = "provenance";
      try { BLOOM.gameSession.challengeRun({ ...X, completion: { fingerprint: "deadbeef", conditions: [] } }); run = "accepted a foreign completion"; } catch (e) { run = run || "refused"; } } catch (e) { run = e.message; }
    check(err(cell) === 0 && err(changed) > 0 && err(missing) > 0 && f1 === "STALE_BANK" && inst === "STALE_BANK" && run === "refused",
      "K4 · stale completion banks are refused: a changed or missing completionFingerprint makes the cell STALE, a format-1 bank (no completion provenance) is refused, an instance from a mismatched cell and a run whose instance carries another completion contract are refused; a good run carries the contract's provenance",
      J({ changed: err(changed), missing: err(missing), f1, inst, run })); }
  { const picks = [0, 17, 33, 49].map(i => taCell.entries[i]), out = [], t = Date.now();
    for (const e of picks) { const row = BL.evaluateWorld({ archetypeId: e.archetypeId, seed: e.seed }, { BLOOM, D, SD: S }, { challenges: [TA], species: ["woolly_candle"] }), c = row.cells["thin_air/woolly_candle"];
      const Pl = CB.buildBankWorld(e).planet, v = BLOOM.validateScenario(Pl, D.config, D.traits, DW, { archetypeId: e.archetypeId, species: WC });
      const g = replay(Pl, v.strategies[0].plan, { scenario: DW, species: WC, gate: CC.winGate(TA), maxTicks: 12000 }), u = replay(Pl, v.strategies[0].plan, { scenario: DW, species: WC, maxTicks: 12000 });
      out.push({ key: `${e.archetypeId}:${e.seed}`, stage: c.stage, completion: c.proof && c.proof.completion, gatedWin: g.winTick, fullTick: g.fullTick, ungatedWin: u.winTick, wins: g.wins, lost: g.sim.lost }); }
    check(out.every(o => o.stage === "ok" && o.completion && o.gatedWin !== null && o.gatedWin >= o.fullTick && o.wins === 1 && !o.lost && o.gatedWin >= o.ungatedWin),
      "K5 · sampled Thin Air entries re-validated (the full builder evaluation incl. the completion step) AND their witness REPLAYED through the gated engine: each completes once, in the final atmosphere (never before it), never lost",
      `${out.map(o => `${o.key} ungated ${o.ungatedWin} → gated ${o.gatedWin} (final ${o.fullTick})`).join(" · ")} (${Math.round((Date.now() - t) / 1000)} s)`); }

  // K6 · (PMO 036D1 checkpoint) EXISTING BANK STABILITY: the 14 cells released in 036C1 select the SAME 700 world entries after the format /
  // completionFingerprint migration (provenance may change; the entries may not, absent a real validation / input change); Thin Air is the only new cell
  { let prev = null; try { const src = require("child_process").execFileSync("git", ["show", "d0eaf8f:content/challenge-seed-banks.js"], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 26 });
      const g = {}; new Function("window", src)(g); prev = g.BLOOM_DATA.challengeSeedBanks; } catch (e) { prev = null; }
    const rows = prev ? Object.keys(prev.cells).map(k => { const a = prev.cells[k].entries, b = bank.cells[k] ? bank.cells[k].entries : [];
      const fa = a.map(e => e.fingerprint), fb = b.map(e => e.fingerprint);
      return { k, same: J(a) === J(b), sameWorlds: J(fa) === J(fb), reselected: fa.filter(f => !fb.includes(f)).length, prov: J(prev.cells[k].provenance) !== J(bank.cells[k] && bank.cells[k].provenance) }; }) : [];
    const added = Object.keys(bank.cells).filter(k => !prev || !prev.cells[k]);
    check(prev && prev.format === 1 && rows.length === 14 && rows.every(r => r.same) && rows.every(r => r.prov) && J(added) === J(["thin_air/woolly_candle"]) && rows.reduce((n, r) => n + (bank.cells[r.k] || { entries: [] }).entries.length, 0) === 700,
      "K6 · existing bank stability: the 14 cells released in 036C1 (d0eaf8f, format 1) hold EXACTLY the same 700 world entries after the migration (byte-identical entries, same order; only their provenance changed — completionFingerprint, validator @2); thin_air/woolly_candle is the ONLY new cell",
      prev ? `${rows.filter(r => r.same).length}/14 cells identical · reselected worlds ${rows.reduce((n, r) => n + r.reselected, 0)}${rows.some(r => !r.same) ? " · DIFFER: " + rows.filter(r => !r.same).map(r => `${r.k} (${r.reselected} reselected${r.sameWorlds ? ", same worlds, entry data changed" : ""})`).join(", ") : ""} · new ${J(added)}` : "no 036C1 bank at d0eaf8f"); }

  if (!NODE_ONLY) await browserChecks(LAUNCH);
  done();
})().catch(e => { console.error(e); fails++; done(); });

function done() { console.log(`\n${fails ? "FAIL" : "OK"} — challenge-completion-check: ${passes} passed, ${fails} failed (${Math.round((Date.now() - t0) / 1000)} s)`); process.exit(fails ? 1 : 0); }

async function browserChecks(LAUNCH = 3) {
  let pw; try { pw = require("playwright"); } catch (e) { check(false, "playwright", "not installed: NODE_PATH=\"$(npm root -g)\""); return; }
  const { buildSite } = await import("file://" + path.join(ROOT, "tools/build-pages-site.mjs"));
  const SITE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "bloom036d1-site-")); buildSite(ROOT, SITE_DIR);
  const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml" };
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, "http://x"); let base = ROOT, p = decodeURIComponent(u.pathname);
    if (p.startsWith("/bloom/")) { base = SITE_DIR; p = p.slice("/bloom".length); }
    if (p.endsWith("/")) p += "index.html";
    const f = path.join(base, p); if (!f.startsWith(base) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end("not found"); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-store" }); fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => srv.listen(0, "127.0.0.1", r)); const ORIGIN = `http://127.0.0.1:${srv.address().port}`;
  const FILE_INDEX = "file://" + encodeURI(path.join(ROOT, "index.html"));
  if (EVIDENCE) fs.mkdirSync(EVD, { recursive: true });
  const VIEWPORTS = [[390, 844], [1024, 768], [1440, 900], [2560, 1440]];

  for (const bn of BROWSERS) {
    const browser = await pw[bn].launch(); console.log(`\n# ${bn} ${browser.version()}`);
    const settled = p => p.evaluate(() => Promise.race([Promise.all(document.getAnimations().filter(a => a.playState === "running" && isFinite(a.effect && a.effect.getComputedTiming().endTime)).map(a => a.finished.catch(() => {}))), new Promise(r => setTimeout(r, 4000))]));
    const shot = async (p, name, opts = {}) => { if (EVIDENCE && (bn === "chromium" || opts.firefox)) { await settled(p); await p.waitForTimeout(opts.wait || 300); await p.screenshot({ path: path.join(EVD, (bn === "firefox" ? "firefox-" : "") + name) }); } };
    // seeded: the page's Math.random is a fixed stream (the run's own simulation randomness), so a QA run is repeatable
    const context = async ({ width = 1440, height = 900, offline = false, seeded = false } = {}) => {
      const c = await browser.newContext({ viewport: { width, height } }); if (offline) await c.setOffline(true);
      if (seeded) await c.addInitScript(() => { let a = 20261012; Math.random = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; });
      await c.addInitScript(() => { try { localStorage.setItem("strange-bloom.training", '{"v":1,"status":"completed","at":1}'); } catch (e) { /* none */ } }); return c; };
    const page = async c => { const p = await c.newPage(); p.errs = []; p.reqs = []; p.navs = 0;
      p.on("pageerror", e => p.errs.push("pageerror: " + e.message)); p.on("console", m => { if (m.type() === "error") p.errs.push("console: " + m.text()); });
      p.on("request", r => p.reqs.push(r.url())); p.on("framenavigated", f => { if (f === p.mainFrame()) p.navs++; }); p.on("dialog", d => d.accept()); return p; };
    const menuReady = p => p.waitForFunction(() => window.MENU_DEV && MENU_DEV.ready && MENU_DEV.entry.state === "menu" && MENU_DEV.entry.black.style.display === "none", null, { timeout: 60000, polling: 100 });
    const hubReady = p => p.waitForFunction(() => { const e = MENU_DEV.entry, v = e.challengeView; return e.state === "challenges" && v && v.inner && e.black.style.display === "none"; }, null, { timeout: 60000, polling: 50 });
    const speciesReady = p => p.waitForFunction(() => { const e = MENU_DEV.entry, v = e.speciesView; return e.state === "species" && v && v.inner && e.black.style.display === "none"; }, null, { timeout: 60000, polling: 50 });
    const worldReady = p => p.waitForFunction(() => { const e = MENU_DEV.entry, v = e.worldView; return e.state === "challenge-world" && v && v.inner && v.inner.state === "ready" && e.black.style.display === "none"; }, null, { timeout: 120000, polling: 50 });
    const runReady = (p, n) => p.waitForFunction(n => window.BLOOM_APP && BLOOM_APP.session && BLOOM_APP.stats.sessions.length >= n && BLOOM_APP.stats.sessions[n - 1].readyMs !== null && !BLOOM_APP.busy
      && !document.querySelector(".atx") && MENU_DEV.entry.state === "away" && MENU_DEV.entry.black.style.display === "none", n, { timeout: 120000, polling: 50 });
    const reportOpen = p => p.waitForFunction(() => BLOOM.runReport.instance && BLOOM.runReport.instance.state().open && !BLOOM.runReport.instance.state().busy, null, { timeout: 30000, polling: 30 });
    const HUB = "MENU_DEV.entry.challengeView.inner", SS = "MENU_DEV.entry.speciesView.inner", CW = "MENU_DEV.entry.worldView.inner";
    const openHub = async p => { await p.click('.mm-item[data-act="challenges"]'); await hubReady(p); };
    // the run's OWN witness plan for its exact planet / species / scenario (the page's validator, QA only), then a driven run: each plan purchase as soon as
    // affordable (plus an optional Biomass boost — an engineered QA acceleration), BLOOM_API.advance(1) per tick until `until` (a page expression) holds
    const planOf = p => p.evaluate(() => { const S = BLOOM_APP.session, D = BLOOM_DATA, sc = S.run.scenario;
      const v = sc ? BLOOM.validateScenario(S.planet, D.config, D.traits, sc, { archetypeId: S.run.archetype && S.run.archetype.id, species: S.run.species })
        : BLOOM.findStrategies(S.planet, D.config, D.traits, { minStrategies: 1, species: S.run.species });
      window.__plan = { plan: (v.strategies[0] || {}).plan || [], k: 0 }; return window.__plan.plan; });
    const drive = (p, until, max, boost = 0) => p.evaluate(([until, max, boost]) => { const A = BLOOM_API, s = A.sim, P = window.__plan, f = new Function("s", "return " + until);
      if (boost) A.addBiomass(boost); let t = 0, firstCross = null, wonAt = null;
      for (; t < max; t++) { while (P.k < P.plan.length) { const tr = s.traitById[P.plan[P.k]]; if (s.canBuy(tr) && s.biomass >= s.price(tr) && A.buy(tr.id)) P.k++; else break; }
        A.advance(1); { const m = A.sim && BLOOM_APP.session.adapter.message(); const L = window.__msgs || (window.__msgs = []); if (m !== L[L.length - 1]) L.push(m); }
        if (firstCross === null && s.coverage() >= s.winAt) firstCross = s.ticks; if (s.won && wonAt === null) wonAt = s.ticks; if (f(s) || s.won || s.lost) break; }
      return { ticks: s.ticks, cov: s.coverage(), winAt: s.winAt, won: s.won, lost: s.lost, progress: s.pressure.progress, firstCross, wonAt, bought: P.k }; }, [until, max, boost]);
    const hudRead = p => p.evaluate(() => { const c = document.querySelector("#pvScn .cond"), A = BLOOM_APP.session.adapter;
      return { cond: c ? c.querySelector("b").textContent : null, sub: c && c.querySelector("small") ? c.querySelector("small").textContent : null, status: c ? c.dataset.status : null, state: document.getElementById("pvState").textContent,
        msg: A.message(), completion: A.completion(), report: !!(BLOOM.runReport.instance && BLOOM.runReport.instance.state().open), running: A.run().running, won: A.run().won, lost: A.run().lost, ticks: A.run().ticks }; });
    const reportRead = p => p.evaluate(() => { const r = BLOOM_APP.session.adapter.report(), el = document.querySelector(".rr-cond");
      const pc = [...document.querySelectorAll(".rr-scn")].find(x => /Pressure/.test(x.querySelector("h3").textContent));
      return { kind: r.kind, heading: r.heading, completion: r.completion, press: pc ? pc.innerText.replace(/\s+/g, " ") : null, done: !!(r.pressure && r.pressure.done), card: el ? { h: el.querySelector("h3").textContent, p: [...el.querySelectorAll("p")].map(x => x.textContent) } : null, sum: document.getElementById("rrSum").textContent,
        acts: BLOOM.runReport.instance.state().actions, identity: r.identity }; });
    // an engineered QA dip: keep only the first `share` of the land's tiles living (deterministic: land-tile order), the rest bare
    const thinTo = (p, share) => p.evaluate(share => { const s = BLOOM_API.sim, keep = Math.floor(share * s.map.LAND); let n = 0;
      for (const i of s.map.LAND_TILES) if (s.state[i] === s.LIV && ++n > keep) { s.state[i] = s.BAR; s.dens[i] = 0; } return s.coverage(); }, share);
    const dieOff = p => p.evaluate(() => { const s = BLOOM_API.sim; for (const i of s.map.LAND_TILES) if (s.state[i] === s.LIV) { s.state[i] = s.BAR; s.dens[i] = 0; } });

    try {
      // ------------------------------------------------------------------ H · the six-card hub at four viewports
      for (const [w, h] of want("H") ? VIEWPORTS : []) {
        if (bn === "firefox" && w !== 1024 && w !== 390) continue;   // Firefox: representative sizes
        const c = await context({ width: w, height: h }), p = await page(c);
        await p.goto(`${ORIGIN}/?bg=7`); await menuReady(p); await openHub(p);
        const H = await p.evaluate(async HUBX => { const hub = eval(HUBX), r = hub.root, list = r.querySelector(".ch-list"), cards = [...r.querySelectorAll(".ch-card")];
          const vis = el => { const a = el.getBoundingClientRect(), L = list.getBoundingClientRect(); return a.top >= L.top - 1 && a.bottom <= L.bottom + 1 && a.bottom <= innerHeight + 1; };
          const visPage = el => { const a = el.getBoundingClientRect(); return a.top >= -1 && a.bottom <= innerHeight + 1; };
          const narrow = hub.narrow, seq = [], wait = () => new Promise(res => setTimeout(res, 220));
          // discoverability, as the player first sees the list (scrolled to the top): a list that really scrolls (beyond its own focus padding)
          // shows a card cut at its bottom edge, or a visible scrollbar
          list.scrollTop = 0; await wait();
          const L0 = list.getBoundingClientRect(), overflow = list.scrollHeight - list.clientHeight;
          const cutAtStart = cards.some(x => { const a = x.getBoundingClientRect(); return a.top < L0.bottom - 4 && a.bottom > L0.bottom + 4; });
          cards[hub.index].focus(); await wait();
          const press = async k => { document.activeElement.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true })); await wait();
            const i = hub.index; seq.push({ k, i, focus: document.activeElement === cards[i], vis: narrow ? visPage(cards[i]) : vis(cards[i]) }); };
          for (let k = 0; k < 5; k++) await press("ArrowDown"); await press("Home"); await press("End"); await press("ArrowUp"); await press("ArrowDown"); await press("ArrowDown"); await press("End");
          const go = r.querySelector(".ch-btn.go"), gb = go.getBoundingClientRect(), hit = document.elementFromPoint(gb.x + gb.width / 2, gb.y + gb.height / 2);
          const ta = r.querySelector('[data-challenge="thin_air"]'); hub.select("thin_air"); await wait();
          const dos = r.querySelector(".ch-dossier"), goal = dos.querySelector(".ch-row.goal"), db = dos.getBoundingClientRect();
          const out = { n: cards.length, names: cards.map(x => x.querySelector("h3").textContent), narrow, seq, overflowX: document.scrollingElement.scrollWidth > innerWidth + 1 || r.scrollWidth > r.clientWidth + 1,
            listScrolls: overflow > 16, overflow, scrollbar: list.offsetWidth - list.clientWidth, partial: cutAtStart,
            goVisible: !narrow && !!hit && !!hit.closest(".ch-btn.go") && gb.bottom <= innerHeight, cond: ta.querySelector(".ch-card-cond") ? ta.querySelector(".ch-card-cond").textContent : null,
            goal: goal ? [...goal.querySelectorAll(".ch-goal-l")].map(l => [...l.children].map(x => x.textContent.trim()).join(" ")).join(" ") : null, how: [...dos.querySelectorAll(".ch-row.run li")].map(x => x.textContent), dossierW: Math.round(db.width), fontPx: parseFloat(getComputedStyle(dos.querySelector(".ch-d-brief")).fontSize) };
          return out; }, HUB);
        let sheet = null;
        if (H.narrow) { await p.evaluate(HUBX => eval(HUBX).select("thin_air"), HUB); await p.click('.ch-card[data-challenge="thin_air"]'); await p.waitForTimeout(400);
          sheet = await p.evaluate(() => { const r = document.querySelector(".ch"), go = r.querySelector(".ch-btn.go"), b = go.getBoundingClientRect(), hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
            return { state: r.dataset.state, sheet: r.dataset.sheet, go: !!hit && !!hit.closest(".ch-btn.go") && b.bottom <= innerHeight, goal: !!r.querySelector(".ch-dossier .ch-row.goal") }; });
          await shot(p, `h-hub-phone-sheet-${w}x${h}.png`, { firefox: true });
          await p.keyboard.press("Escape"); await p.waitForTimeout(250); }
        else await shot(p, `h-hub-${w}x${h}.png`, { firefox: w === 1024 });
        if (H.narrow) { await p.evaluate(() => document.querySelector(".ch-scroll") && document.querySelector(".ch-scroll").scrollTo(0, 0)); await shot(p, `h-hub-phone-${w}x${h}.png`, { firefox: true }); }
        const allVis = H.seq.every(s => s.focus && s.vis), visited = new Set(H.seq.map(s => s.i));
        if (process.env.QA_DEBUG) console.log(J({ seq: H.seq, overflowX: H.overflowX, goal: H.goal, font: H.fontPx, go: H.goVisible }));
        const homeEnd = H.seq.find(s => s.k === "Home").i === 0 && H.seq.filter(s => s.k === "End").every(s => s.i === 5) && J(H.seq.map(s => s.i)) === J([1, 2, 3, 4, 5, 0, 5, 4, 5, 0, 5]);
        check(H.n === 6 && J(H.names) === J(["Dying World", "Native Competition", "Volatile Climate", "Low Tide", "Oasis Line", "Thin Air"]) && allVis && visited.size === 6 && homeEnd && !H.overflowX
            && (H.narrow ? sheet && sheet.sheet === "true" && sheet.go && sheet.goal : H.goVisible) && /Bloom in the final atmosphere/.test(H.cond || "") && /BLOOM 70% of land alive/.test(H.goal || "") && /FINAL ATMOSPHERE The Bloom counts only after the atmospheric decline has finished\./.test(H.goal || "")
            && (!H.listScrolls || H.partial || H.scrollbar > 0) && H.fontPx >= 13 && (H.narrow || H.dossierW >= 420),
          `[${bn}] H ${w}×${h}${w === 1024 ? " (PMO: keyboard all the way to Thin Air)" : ""} · six cards (Thin Air sixth); keyboard ↓ ×5 / Home / End / ↑ traverse all six and each selected card is focused AND scrolled into view; ${H.narrow ? "the phone sheet opens with BEGIN CHALLENGE pinned" : "BEGIN CHALLENGE visible and hit-testable"}; no horizontal overflow; Thin Air's card names its condition and its dossier shows the contract (BLOOM 70% · FINAL ATMOSPHERE); a scrolling list shows it (a cut card or a scrollbar)`,
          J({ list: H.listScrolls ? `scrolls ${H.overflow}px (a card cut at the bottom edge ${H.partial}, scrollbar ${H.scrollbar}px)` : `fits (overflow ${H.overflow}px)`, seq: H.seq.map(s => s.i).join(""), cond: H.cond, dossierW: H.dossierW, sheet }));
        if (w === 1440 && bn === "chromium") await shot(p, "h-hub-thin-air-dossier.png");
        check(!p.errs.length, `[${bn}] H ${w}×${h} · no console error`, p.errs.join(" | ")); await c.close();
      }

      // ------------------------------------------------------------------ T · Thin Air end to end
      const runThinAir = async (origin, label, { evidence = false } = {}) => {
        const c = await context({ seeded: true }), p = await page(c);
        await p.goto(`${origin}?launch=${LAUNCH}&bg=7`); await menuReady(p); await openHub(p);
        await p.evaluate(HUBX => eval(HUBX).select("thin_air"), HUB); await p.click(".ch-btn.go"); await worldReady(p);
        const DOS = await p.evaluate(CW => { const v = eval(CW), r = v.root, X = v.instance;
          return { speciesScreen: MENU_DEV.events.filter(e => e.type === "species-screen").length, sp: r.querySelector(".cw-sp-name").textContent, role: r.querySelector(".cw-sp-role").textContent, start: r.querySelector(".cw-start").textContent,
            note: (r.querySelector(".cw-sp-note") || {}).textContent, goal: (r.querySelector(".cw-goal") || {}).innerText, cell: X.bank.cellKey, archetype: X.archetypeId, entry: X.entryIndex, completion: X.completion }; }, CW);
        if (evidence) await shot(p, "t1-thin-air-planet-dossier.png", { firefox: true });
        check(DOS.speciesScreen === 0 && DOS.sp === "Woolly Candle" && /Cold-hardy/i.test(DOS.role) && /nothing owned yet/.test(DOS.start) && /prescribes the plant/.test(DOS.note || "") && DOS.cell === "thin_air/woolly_candle"
            && ["desert_world", "ocean_archipelago"].includes(DOS.archetype) && /BLOOM\s*70% of land alive/.test(DOS.goal || "") && /FINAL ATMOSPHERE\s*The Bloom counts only after the atmospheric decline has finished/.test(DOS.goal || "")
            && DOS.completion && J(DOS.completion.conditions) === J(["pressure-final-state"]),
          `[${bn}] T1${label} · Hub → BEGIN CHALLENGE → the prepared Woolly Candle world → the Challenge Planet Dossier (NO Species Selection): Woolly Candle · Cold-hardy · nothing owned · the completion condition shown before launch`,
          J({ ...DOS, goal: (DOS.goal || "").replace(/\s+/g, " ") }));
        await p.click(".cw-btn.go"); await runReady(p, 1);
        await p.evaluate(() => { window.__wins = 0; document.addEventListener("bloom:win", () => { window.__wins++; }); });
        const R0 = await p.evaluate(() => { const S = BLOOM_APP.session; return { gated: S.sim.winGated, cr: S.run.challengeRun.completion, entry: S.run.challengeRun.entryIndex, fp: S.run.challengeRun.fingerprint }; });
        const h0 = await hudRead(p);
        if (evidence) await shot(p, "t2-thin-air-run-start.png");
        const plan = await planOf(p);
        const e1 = await drive(p, "s.coverage() >= s.winAt", 1800, 400);
        const h1 = await hudRead(p);
        // the run playing (not driven): the HOLDING badge is the running state's word
        await p.evaluate(() => BLOOM_APP.session.adapter.actions.play()); await p.waitForTimeout(450); const h1b = await hudRead(p);
        if (evidence) await shot(p, "t3-thin-air-early-bloom.png", { firefox: true, wait: 50 });
        await p.evaluate(() => BLOOM_APP.session.adapter.actions.pause());
        if (process.env.QA_DEBUG) console.log(J({ R0, h0, h1, h1b }));
        check(R0.gated === true && R0.cr && J(R0.cr.conditions) === J(["pressure-final-state"]) && h0.status === "waiting" && /^Final atmosphere · \d+% of decline$/.test(h0.cond || "")
            && e1.cov >= e1.winAt && e1.progress < 1 && !e1.won && !h1.won && !h1.report && h1.status === "early-held" && h1.cond === "BLOOM REACHED — hold it until the atmosphere settles." && /settles in \d+:\d\d/.test(h1.sub || "")
            && (await p.evaluate(() => (window.__msgs || []).some(m => /Bloom reached — hold it until the atmosphere settles/.test(m)))) && (h1b.state === "HOLDING" || (h1b.status !== "early-held" && !h1b.won)),
          `[${bn}] T2${label} · the run is GATED (the engine got the generic win gate); the HUD's ONE condition line ("Final atmosphere · n% of decline") → at the EARLY Bloom (coverage ≥ winAt, decline ${Math.round(e1.progress * 100)}%): no stop, no report, not won; "BLOOM REACHED — hold it until the atmosphere settles." + the real time left, the state reads HOLDING, the log says why`,
          J({ start: h0.cond, early: h1.cond, sub: h1.sub, state: h1b.state, cov: +e1.cov.toFixed(3), progress: +e1.progress.toFixed(3), plan: plan.length }));
        const t2 = await p.evaluate(() => BLOOM_API.sim.ticks), e2 = await drive(p, "false", 60);
        const h2 = await hudRead(p);
        if (evidence) await shot(p, "t4-thin-air-continuing.png");
        check(e2.ticks === t2 + 60 && !e2.won && !h2.report && !h2.lost && BLOOM_ok(h2),
          `[${bn}] T3${label} · the same run CONTINUES after the early Bloom (60 more ticks, no report, the decline still running)`, J({ ticks: [t2, e2.ticks], status: h2.status, cond: h2.cond }));
        function BLOOM_ok(h) { return h.status === "early-held" || h.status === "early-lost"; }
        // (PMO checkpoint) the FULL early-Bloom sequence: early Bloom (above) → coverage falls BELOW winAt before the final state (an engineered,
        // deterministic dip) → the final atmosphere arrives → still not won → coverage regains winAt → won exactly once → only then the report
        const shown0 = await p.evaluate(() => BLOOM.runReport.instance.state().shown);
        const f1 = await drive(p, "s.pressure.progress >= 0.96", 3000);
        const dip1 = await thinTo(p, f1.winAt - 0.08); await drive(p, "true", 1); await p.waitForTimeout(350); const hd = await hudRead(p);   // one tick: the HUD repaints from the run
        if (evidence) await shot(p, "t4b-thin-air-bloom-lost-before-final.png");
        const f2 = await drive(p, "s.pressure.progress >= 0.995", 3000);
        const dip2 = f2.cov >= f2.winAt - 0.02 ? await thinTo(p, f2.winAt - 0.08) : f2.cov;
        const f3 = await drive(p, "s.pressure.progress >= 1", 200); await p.waitForTimeout(350); const hf = await hudRead(p);
        if (evidence) await shot(p, "t4c-thin-air-final-atmosphere-regain.png", { firefox: true });
        const seq = { early: { cov: +e1.cov.toFixed(3), won: e1.won }, dip: { progress: +f1.progress.toFixed(3), cov: +dip1.toFixed(3), status: hd.status, line: hd.cond, won: hd.won, report: hd.report },
          final: { progress: f3.progress, cov: +f3.cov.toFixed(3), won: f3.won, status: hf.status, line: hf.cond, report: hf.report } };
        const e3 = await drive(p, "s.pressure.progress >= 1 && s.coverage() >= s.winAt", 3000);
        await reportOpen(p); const RP = await reportRead(p);
        const after = await p.evaluate(() => ({ wins: window.__wins, shown: BLOOM.runReport.instance.state().shown, won: BLOOM_API.sim.won }));
        check(!e1.won && f1.progress < 1 && !f1.won && dip1 < f1.winAt && hd.status === "early-lost" && /^Final atmosphere: \d+% · Bloom \d+% \/ 70%$/.test(hd.cond || "") && !hd.won && !hd.report
            && f3.progress === 1 && !f3.won && !f3.lost && f3.cov < f3.winAt && hf.status === "regain" && /^Final atmosphere reached · regain Bloom: \d+% \/ 70%$/.test(hf.cond || "") && !hf.report && !hf.won
            && e3.won && e3.wonAt === e3.firstCross && after.wins === 1 && after.shown === shown0 + 1 && after.won,
          `[${bn}] T3b${label} · the FULL early-Bloom sequence (seeded run, engineered dips): early coverage ≥ winAt → NOT won → coverage falls below winAt before the final state ("${hd.cond}") → the final atmosphere arrives → STILL not won ("${hf.cond}") → coverage regains winAt → won EXACTLY once on that tick (one bloom:win) → the report opens only then (once)`,
          J({ ...seq, regained: { tick: e3.firstCross, won: e3.wonAt }, wins: after.wins, reports: after.shown - shown0 }));
        check(RP.done && /the final harsh state\./.test(RP.press || "") && !/keep playing|had not finished/i.test(RP.press || ""),
          `[${bn}] W4${label} · a report with the pressure already complete keeps its final-state words ("— the final harsh state.")`, RP.press);
        if (evidence) await shot(p, "t5-thin-air-true-win-report.png", { firefox: true });
        check(e3.won && e3.wonAt !== null && e3.progress === 1 && RP.kind === "win" && RP.completion && RP.completion.mark === "FINAL ATMOSPHERE ✓" && RP.card && RP.card.h === "FINAL ATMOSPHERE ✓"
            && /^You held \d+% of the land in the final atmosphere\.$/.test(RP.card.p[0]) && /Bloom was first reached at \dm \d\ds/.test(RP.card.p[1] || "") && RP.completion.earlyBloomSeconds !== null
            && J(RP.acts) === J(["keepPlaying", "retryChallenge", "challenges", "mainMenu"]) && RP.identity.challenge.completion && J(RP.identity.challenge.completion.conditions) === J(["pressure-final-state"])
            && RP.identity.challengeRun.completion.fingerprint === R0.cr.fingerprint && !/score|bonus|medal|achievement|objective/i.test(J(RP.card)),
          `[${bn}] T4${label} · the TRUE completion: won only in the final atmosphere (decline 100 %, coverage ≥ winAt); the report appears then, once, with FINAL ATMOSPHERE ✓ ("You held n% … in the final atmosphere." · "Bloom was first reached at … You held on until the atmosphere settled at …"); the completion provenance survives into the report; no score words`,
          J({ wonAt: e3.wonAt, card: RP.card, sum: RP.sum }));
        await p.click("#rrContinue"); await p.waitForFunction(() => !BLOOM.runReport.instance.state().open && !BLOOM.runReport.instance.state().busy && BLOOM_APP.session.adapter.run().running, null, { timeout: 20000, polling: 50 });
        await p.waitForTimeout(500); const h4 = await hudRead(p);
        if (evidence) await shot(p, "t6-thin-air-final-atmosphere-hud.png", { firefox: true });
        const K = await p.evaluate(() => { const s = BLOOM_API.sim; for (const i of s.map.LAND_TILES) if (s.state[i] === s.LIV) { s.state[i] = s.BAR; s.dens[i] = 0; } BLOOM_API.advance(120); return { won: s.won, lost: s.lost, zero: s.extinction.zeroTicks, cov: s.coverage() }; });
        check(h4.running && h4.won && h4.status === "complete" && h4.cond === "FINAL ATMOSPHERE ✓" && h4.state === "BLOOMED" && K.won && !K.lost && K.cov === 0,
          `[${bn}] T5${label} · Keep playing after the TRUE completion = the ordinary post-win play: running, sim.won, the HUD shows FINAL ATMOSPHERE ✓ · BLOOMED; extinction is off as for every completed run (an engineered total die-off afterwards is never a loss)`, J({ cond: h4.cond, state: h4.state, K }));
        return { c, p, entry: R0.entry, fp: R0.fp, completion: R0.cr };
      };

      if (want("T")) { const T = await runThinAir(`${ORIGIN}/`, "", { evidence: true }), p = T.p;
        // E · the specimen environment late in the decline (the real pressure state; nothing Thin-Air-only)
        await p.evaluate(() => { const D = BLOOM.decisionRooms.instance; D.open("adapt", D.state().context); });
        await p.waitForFunction(() => { const st = BLOOM.decisionRooms.instance.state(); return st.room === "adapt" && !st.transitioning; }, null, { timeout: 20000, polling: 50 }); await p.waitForTimeout(400);
        const env = await p.evaluate(() => { const s = BLOOM.plantSpecimen.mounted().find(x => x.el.closest('.dr-room[data-room="adapt"]') && !x.el.closest("[hidden]")), D = BLOOM.decisionRooms.instance, r = D.adapter.region(D.state().context);
          return { scene: s && s.scene ? { t: s.scene.t, m: s.scene.m, rad: s.scene.rad, kind: s.scene.kind } : null, region: { t: r.raw.effectiveTemp, m: r.raw.effectiveMoist, rad: r.raw.effectiveRadiation }, progress: BLOOM_API.sim.pressure.progress, off: { ...BLOOM_API.sim.pressure.offsets } }; });
        await shot(p, "t7-thin-air-specimen-late-decline.png", { firefox: true });
        check(env.scene && env.progress === 1 && Math.abs(env.scene.t - Math.round(env.region.t * 10) / 10) < 0.11 && Math.abs(env.scene.m - Math.round(env.region.m * 10) / 10) < 0.11 && env.off.temp < 0 && env.off.rad > 0,
          `[${bn}] T6 · the specimen's environment late in the decline reads the REAL pressure state (the region's own cooled, dried, irradiated sky — no Thin-Air-only effect)`, J(env));
        await p.evaluate(() => BLOOM.decisionRooms.instance.close()).catch(() => {}); await p.waitForTimeout(400);
        // R + L · Retry (the same entry and contract), then an engineered early Bloom → total die-off → EXTINCTION
        await p.waitForFunction(() => !BLOOM.decisionRooms.instance.state().transitioning, null, { timeout: 20000 });
        await p.evaluate(() => BLOOM_APP.session.adapter.actions.runAction("retryChallenge")); await runReady(p, 2);
        const R2 = await p.evaluate(() => { const S = BLOOM_APP.session; return { entry: S.run.challengeRun.entryIndex, fp: S.run.challengeRun.fingerprint, cr: S.run.challengeRun.completion, gated: S.sim.winGated, ticks: S.sim.ticks, won: S.sim.won }; });
        await shot(p, "r1-thin-air-retry.png");
        check(R2.entry === T.entry && R2.fp === T.fp && J(R2.cr) === J(T.completion) && R2.gated && R2.ticks < 5 && !R2.won,
          `[${bn}] R · Retry Challenge = the SAME bank entry and the same completion contract, a fresh gated simulation`, J(R2));
        await planOf(p); const l1 = await drive(p, "s.coverage() >= s.winAt", 1800, 400);
        await dieOff(p); const l2 = await drive(p, "false", 200);
        await reportOpen(p); const LR = await reportRead(p);
        await shot(p, "l1-thin-air-early-bloom-then-extinction.png", { firefox: true });
        check(l1.cov >= l1.winAt && l1.progress < 1 && !l1.won && l2.lost && !l2.won && LR.kind === "loss" && LR.heading === "EXTINCTION" && LR.card && /reached Bloom before the atmosphere finished changing, but the plant did not survive the final conditions/.test(LR.card.p[0])
            && !/won|victory/i.test(LR.card.p.join(" ")) && J(LR.acts) === J(["retryChallenge", "challenges", "mainMenu"]),
          `[${bn}] L · an engineered QA run: early Bloom (decline ${Math.round(l1.progress * 100)}%) → total die-off → a real EXTINCTION loss (no Keep playing); the report explains the early Bloom without implying a win`, J({ card: LR.card, sum: LR.sum }));
        // (PMO copy correction) an extinction BEFORE the final pressure state never says "keep playing" (there is no Keep playing on a loss)
        check(!LR.done && LR.press && !/keep playing/i.test(LR.press) && /The atmosphere had not finished changing\. Final conditions would have been: moisture [^,]+, temperature [^,]+ °C, radiation [^.]+\./.test(LR.press)
            && /did not survive the final conditions/.test(LR.card.p[0]),
          `[${bn}] W1 · the extinction report's pressure card (decline not finished) never says "keep playing"; it says the atmosphere had not finished changing and what the final conditions would have been; the Thin Air card still says the plant did not survive the final conditions`, LR.press);
        check(!p.errs.length && p.navs === 1, `[${bn}] D · the Thin Air runs: one document, no console error`, p.errs.join(" | ")); await T.c.close(); }

      // ------------------------------------------------------------------ X · an UNGATED Challenge still ends at its first Bloom
      if (want("X")) { const c = await context({ seeded: true }), p = await page(c);
        await p.goto(`${ORIGIN}/?launch=3&bg=7`); await menuReady(p); await openHub(p);
        await p.evaluate(HUBX => eval(HUBX).select("dying_world"), HUB); await p.click(".ch-btn.go"); await speciesReady(p);
        await p.evaluate(SSX => eval(SSX).open("woolly_candle"), SS); await p.click(".ss-btn.go"); await worldReady(p);
        const noGoal = await p.evaluate(CW => !eval(CW).root.querySelector(".cw-goal"), CW);
        await p.click(".cw-btn.go"); await runReady(p, 1);
        await planOf(p); const x = await drive(p, "s.coverage() >= s.winAt", 3000, 400);
        await reportOpen(p); const XR = await reportRead(p), xh = await p.evaluate(() => ({ gated: BLOOM_API.sim.winGated, cond: !!document.querySelector("#pvScn .cond") }));
        await shot(p, "x1-dying-world-ordinary-bloom-ends.png", { firefox: true });
        check(noGoal && !xh.gated && !xh.cond && x.won && x.wonAt === x.firstCross && x.progress < 1 && XR.kind === "win" && XR.completion === null && !XR.card,
          `[${bn}] X · Dying World (ungated): no condition anywhere (dossier, HUD); its ordinary 70 % Bloom ENDS the run at once — won on the very tick coverage first reached winAt (decline ${Math.round(x.progress * 100)}%), report open`, J({ firstCross: x.firstCross, wonAt: x.wonAt, progress: +x.progress.toFixed(3) }));
        check(!XR.done && /The decline continues if you keep playing \(final: moisture/.test(XR.press || "") && XR.acts.includes("keepPlaying"),
          `[${bn}] W3 · a WIN before the final pressure state (Keep playing exists) keeps "The decline continues if you keep playing (final: …)"`, XR.press);
        await c.close(); }

      // ------------------------------------------------------------------ E · an Expedition's ordinary Bloom (unchanged)
      if (bn === "chromium" && want("E")) { const c = await context({ seeded: true }), p = await page(c);
        await p.goto(`${ORIGIN}/?bg=7`); await menuReady(p); await p.click('.mm-item[data-act="begin"]');
        await p.waitForFunction(() => { const e = MENU_DEV.entry, v = e.speciesView; return e.state === "species" && v && v.inner && v.inner.state === "cards" && !e.covered && e.black.style.display === "none"; }, null, { timeout: 60000, polling: 50 });
        await p.evaluate(() => { const s = MENU_DEV.entry.speciesView.inner; s.open(s.selected.id); }); await p.click(".ss-btn.go");
        await p.waitForFunction(() => { const s = MENU_DEV.entry.survey; return s && s.state === "survey" && s.cells.every(Boolean); }, null, { timeout: 180000, polling: 100 });
        await p.evaluate(() => MENU_DEV.entry.survey.select(0)); await p.waitForFunction(() => MENU_DEV.entry.survey.state === "focus", null, { timeout: 20000, polling: 50 });
        await p.click(".ds-btn.go"); await runReady(p, 1);
        await planOf(p); const x = await drive(p, "s.coverage() >= s.winAt", 6000, 400);
        await reportOpen(p); const XR = await reportRead(p), g = await p.evaluate(() => ({ gated: BLOOM_API.sim.winGated, challenge: BLOOM_APP.session.run.challenge || null, cond: !!document.querySelector("#pvScn .cond") }));
        await shot(p, "x2-expedition-ordinary-bloom.png");
        check(!g.gated && !g.challenge && !g.cond && x.won && x.wonAt === x.firstCross && XR.kind === "win" && XR.completion === null,
          `[${bn}] E · an Expedition: no gate, no condition; its ordinary Bloom wins on the tick coverage first reaches winAt (unchanged)`, J({ firstCross: x.firstCross, wonAt: x.wonAt }));
        await c.close(); }

      // ------------------------------------------------------------------ P · file:// offline · B · /bloom/ (the Pages site)
      for (const [where, url] of want("P") ? [["P file://", FILE_INDEX], ["B /bloom/", `${ORIGIN}/bloom/`]] : []) {
        if (bn === "firefox" && where.startsWith("B")) continue;
        const c = await context({ offline: where.startsWith("P"), seeded: true }), p = await page(c);
        await p.goto(`${url}?launch=${LAUNCH}&bg=7`); await menuReady(p); await openHub(p);
        await p.evaluate(HUBX => eval(HUBX).select("thin_air"), HUB); await p.click(".ch-btn.go"); await worldReady(p); await p.click(".cw-btn.go"); await runReady(p, 1);
        await planOf(p); const e1 = await drive(p, "s.coverage() >= s.winAt", 1800, 400); const h1 = await hudRead(p);
        const e3 = await drive(p, "s.pressure.progress >= 1 && s.coverage() >= s.winAt", 3000); await reportOpen(p); const RP = await reportRead(p);
        const outside = p.reqs.filter(u => !(u.startsWith("file:") || u.startsWith(where.startsWith("P") ? "file:" : `${ORIGIN}/bloom/`) || u.startsWith("data:") || u.startsWith("blob:")));
        check(!e1.won && h1.status === "early-held" && e3.won && RP.completion && RP.completion.mark === "FINAL ATMOSPHERE ✓" && !outside.length && !p.errs.length,
          `[${bn}] ${where} · Thin Air end to end (early Bloom held, the true win in the final atmosphere, the report) with no request outside ${where.startsWith("P") ? "the local files" : "/bloom/"}`,
          `${outside.slice(0, 3).join(" ")}${p.errs.length ? " · " + p.errs.join(" | ") : ""}`);
        await c.close(); }
    } catch (e) { check(false, `[${bn}] browser run`, String(e && e.stack || e).slice(0, 600)); }
    await browser.close();
  }
  srv.close();
}
