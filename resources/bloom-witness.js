// BLOOM — winnability witness solver (bible §10.3 layers 4–6, BLOOM-005) plus strategy diversity and
// pacing (layers 7–8, BLOOM-006). No DOM.
//
//   BLOOM.findWitness(planet, config, traits, { excludeTraits, measurePeak }) → { ok, layer, reason, witness, best, search, early }
//   BLOOM.findStrategies(planet, config, traits, { minStrategies, pacing, excludeTraits, measurePeak }) → layers 4–8 verdict
//   BLOOM.witness.strategyOf(planet, config, traits, items) → { sufficient, coverage, signature } (order-independent)
//   BLOOM.witness.strategyClasses(planet, config, traits) → static candidate classes (no simulation)
//   measurePeak: keep a passing witness running to its plateau to report true peak coverage (slower)
//
// Two stages, deliberately small (not a general planner):
//  1. STATIC: enumerate legal terminal builds from the trait catalogue by effect type, respecting the
//     engine's rules (shared temperature cap, one water strategy, level caps, crossing only where offered,
//     bounded Terraform steps per sky axis). For each, estimate the land an unhurried plant could hold:
//     sections whose fitness clears growThresh, reachable from the origin through other such sections
//     (plus real water crossings if a crossing trait is owned). Keep builds whose estimate reaches the
//     validation target; rank cheapest first.
//  2. SIMULATE: for the best few, run the REAL engine (BLOOM.createSim, fixed validation RNG). Purchases
//     happen through sim.buy() the tick earned Biomass allows — no grants, no starting pile beyond the
//     planet's normal start. A PASS needs simultaneous living coverage ≥ winThreshold + config.validation.winMargin.
// Spread-board `level` traits (Seed Output, Early Maturity) don't change where the plant can live, so
// they are "boosters": not enumerated, tried as fixed opening variants instead.
//
// LAYER 7 — strategy signature. A build's broad approach, from what its effects DO (never trait ids,
// purchase order, or Spread speed):
//  a. reduce the terminal build to its MINIMAL SUFFICIENT core: the cheapest sub-build (sub-multiset of its
//     purchases) whose static estimate still reaches the validation target, and which has no sufficient
//     proper sub-build itself. Upgrades the win didn't need — redundant, or merely "nice to have" — are never
//     part of a strategy. Exact and cheap: every sufficient sub-build is itself an enumerated, cheaper
//     candidate, so walking candidates cheapest-first, a candidate founds a new CLASS only when no earlier
//     class core is contained in it; otherwise it joins the cheapest such class;
//  b. describe each environmental condition the minimal build answers as one token
//     "<condition>=<means>(<amount>)[+<means>(<amount>)]":
//       Temperature:cold / Temperature:heat  ← tempPoint points (Adapt) or the net sky temp shift (Terraform; + answers cold)
//       Water:dry / Water:wet                ← waterArm points (Adapt; the dry arm survives dry ground) or the net sky moisture shift
//       Defense:<stat>                       ← non-Spread `level` points (salt, radiation …)
//       Crossing:<stat>                      ← a `crossing` effect (Waterborne Seeds)
// Two signatures are MATERIALLY DISTINCT when each has a token the other lacks — neither contains the
// other. A shared Waterborne Seeds token therefore never distinguishes two strategies, and neither does
// boosting Spread, re-ordering purchases or adding an upgrade the win didn't need.
//
// PRESSURE SCENARIOS (BLOOM-012) — opts.scenario (a content/scenarios.js definition). Nothing is special-cased: the
// static stage estimates every build in the scenario's FINAL pressure state (the world the run ends in), and every
// simulation runs the real engine WITH the scenario, so pressure advances on the real clock while the witness earns and
// buys. A pressured witness passes only if it reaches the margin AND still holds the planet's win threshold
// scenario.validation.holdFinalSeconds after the final state is reached (a win that only outran the decline is no
// proof). Extinction ends a witness run as a failure. Without a scenario everything is exactly the BLOOM-006 search.
//
// COMPETITION (BLOOM-014) — a scenario with a `competition` block has a living competitor and no static final state. The
// static stage then counts a region only if an ESTABLISHED player colony would also out-compete MATURE native cover there in
// that environment (sim.holdsAgainstNatives: the engine's own contest rule at full maturity); native land the build cannot
// win also blocks the static path to the regions behind it. That only ranks candidates — the proof is the real simulation:
// natives start established, spread, contest and recede live, and every witness must hold the win threshold
// validation.holdFinalSeconds after the later of its margin and the final pressure state (no clock: after the margin), so
// a coverage spike the competitor takes back is no proof. Optional validation.confirmRngSeeds: the same plan must also pass
// (margin + hold) under each of those simulation seeds before a witness counts (robust, not one lucky RNG stream).
//
// CLIMATE INSTABILITY (BLOOM-015) — a scenario with a `climateInstability` block has no clock and no fixed final state either:
// shocks come from the witness's OWN Terraform purchases, live. The static stage is unchanged (shocks are temporary, so it
// ranks builds in the steady climate); the simulation runs the real instability layer, and the hold check moves past every
// shock: a witness must still hold the win threshold holdFinalSeconds after the later of its margin and the end of the last
// shock that was running or announced then (a win that only lasted until the next shock is no proof). Mechanic evidence
// (scenario.validation.mechanicEvidence { terraformSteps, minShocks }): a witness whose plan buys at least terraformSteps
// Terraform steps counts only if at least minShocks real shocks started before its hold check — a Terraform-heavy strategy
// must have lived through the mechanic. A plan with fewer steps (Adapt-heavy) may legitimately see no shock at all.
(function (root) {
  "use strict";
  const BLOOM = root.BLOOM;
  if (!BLOOM || !BLOOM.createSim) throw new Error("bloom-witness.js needs resources/bloom-sim.js loaded first");
  const { waterCrossings } = BLOOM.geo;
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  const SKY_AXES = { temp: ["Temperature", "cold", "heat"], moist: ["Water", "dry", "wet"] }; // + shift answers the first side
  function signatureOf(items, traitById, skyShift) {
    const cond = {}, add = (c, means, n) => { const m = cond[c] || (cond[c] = {}); m[means] = (m[means] || 0) + n; };
    for (const id of items) { const t = traitById[id], e = t.effect;
      if (e.type === "tempPoint") add(`Temperature:${e.stat}`, "Adapt", 1);
      else if (e.type === "waterArm") add(`Water:${e.arm}`, "Adapt", 1);
      else if (e.type === "level" && t.board !== "Spread") add(`Defense:${e.stat}`, "Adapt", 1);
      else if (e.type === "crossing") add(`Crossing:${e.stat}`, "Spread", 1); }
    for (const ax in skyShift) { const A = SKY_AXES[ax], d = skyShift[ax]; if (A && d) add(`${A[0]}:${d > 0 ? A[1] : A[2]}`, "Terraform", Math.abs(d)); }
    const tokens = Object.keys(cond).sort().map(c => `${c}=` + Object.keys(cond[c]).sort().map(m =>
      m === "Terraform" ? `Terraform(${c.endsWith(SKY_AXES.temp[1]) || c.endsWith(SKY_AXES.moist[1]) ? "+" : "−"}${cond[c][m]})` : `${m}(${cond[c][m]})`).join("+"));
    return { key: tokens.join(" · "), tokens };
  }
  const distinctSignatures = (a, b) => { const A = new Set(a.tokens), B = new Set(b.tokens); return a.tokens.some(t => !B.has(t)) && b.tokens.some(t => !A.has(t)); };
  function signatureDifference(a, b) {
    const A = new Set(a.tokens), B = new Set(b.tokens), hA = new Set(a.held), hB = new Set(b.held);
    return { onlyA: a.tokens.filter(t => !B.has(t)), onlyB: b.tokens.filter(t => !A.has(t)),
      heldOnlyA: a.held.filter(s => !hB.has(s)), heldOnlyB: b.held.filter(s => !hA.has(s)) };
  }

  // LAYER 8 — the archetype's explicit time bands, checked on a finished witness run (simulate().pacing)
  //   policy { marginSeconds: [min, max], firstPurchaseSeconds: [min, max], maxPurchaseGapSeconds, maxTerminalWaitSeconds? }
  //   maxTerminalWaitSeconds (BLOOM-010, optional): the wait from the last purchase to the margin — a world won by one
  //   early purchase followed by minutes of nothing to decide fails it (bible §10.2 "no long stretches without a decision")
  function checkPacing(run, P) {
    const m = run.pacing, why = [];
    const band = (v, [lo, hi], what) => { if (v === null) why.push(`${what}: never`); else if (v < lo) why.push(`${what} at ${v} s < ${lo} s (too fast)`); else if (v > hi) why.push(`${what} at ${v} s > ${hi} s (too slow)`); };
    band(run.marginSeconds, P.marginSeconds, "margin reached");
    band(m.firstPurchaseSeconds, P.firstPurchaseSeconds, "first purchase");
    if (m.maxPurchaseGapSeconds > P.maxPurchaseGapSeconds) why.push(`purchase gap of ${m.maxPurchaseGapSeconds} s before the margin > ${P.maxPurchaseGapSeconds} s`);
    if (P.maxTerminalWaitSeconds != null && m.terminalWaitSeconds > P.maxTerminalWaitSeconds)
      why.push(`waited ${m.terminalWaitSeconds} s after the last purchase for the margin > ${P.maxTerminalWaitSeconds} s`);
    return { ok: !why.length, reasons: why };
  }

  // shared static search (stage 1) + helpers for stage 2; used by findWitness and findStrategies
  function prepare(planet, config, traits, opts) {
    const t0 = Date.now(), V = config.validation, G = config.grow;
    const excluded = new Set(opts.excludeTraits || []), SCN = opts.scenario || null;
    const probe = BLOOM.createSim(planet, config, traits, { rng: () => 0.5, scenario: SCN });
    // static estimates under pressure use the final state (undefined → the probe's own, unpressured offsets)
    const FIN = SCN && SCN.pressure ? BLOOM.pressure.offsetsAt(SCN.pressure, 1, planet.globalClimate) : undefined;
    const M = probe.map, target = probe.winAt + V.winMargin;
    const usable = traits.filter(t => !excluded.has(t.id) && probe.offered(t));
    const byType = type => usable.filter(t => t.effect.type === type);
    const temp = byType("tempPoint"), arms = byType("waterArm"), cross = byType("crossing"), sky = byType("sky");
    const adaptLevels = byType("level").filter(t => t.board !== "Spread");
    const boosters = byType("level").filter(t => t.board === "Spread");

    // section-level crossing links from the same geography the engine uses
    const xl = Array.from({ length: M.SC }, () => new Set());
    if (cross.length) for (const [a, b] of waterCrossings(M.TILEMAP, M.W, M.H, (config.crossing || {}).maxGap || 0).pairs)
      xl[M.TILEMAP[a]].add(M.TILEMAP[b]);

    // ---- static estimate for a terminal state {items: [traitId...]}
    const base = { genome: { ...probe.genome }, sky: { ...probe.sky }, tf: { ...probe.tf } };
    const setState = items => {
      Object.assign(probe.genome, base.genome); Object.assign(probe.sky, base.sky); Object.assign(probe.tf, base.tf);
      probe.biomass = Infinity; for (const id of items) if (!probe.buy(id)) return false; return true; // legality via the engine's own rules
    };
    const staticHeld = (items, off = FIN) => { // sections an unhurried plant could hold with this terminal build (null = illegal)
      if (!setState(items)) return null;
      const ok = M.SEC.map((_, i) => probe.evaluate(i, off).fitness > G.growThresh && probe.holdsAgainstNatives(i, off));
      const hasCross = items.some(id => probe.traitById[id].effect.type === "crossing");
      const seen = new Set([M.ORIGIN]), st = [M.ORIGIN];
      while (st.length) { const a = st.pop();
        const next = hasCross ? [...M.NBRS[a], ...xl[a]] : M.NBRS[a];
        for (const b of next) if (ok[b] && !seen.has(b)) { seen.add(b); st.push(b); } }
      return seen;
    };
    const covMemo = new Map(), nowMemo = new Map();
    const staticCoverage = (items, off = FIN, memo = covMemo) => {
      const k = items.join(); if (memo.has(k)) return memo.get(k);
      const seen = staticHeld(items, off); let c = -1;
      if (seen) { let area = 0; for (const i of seen) area += M.AREA[i]; c = area / M.LAND; }
      memo.set(k, c); return c;
    };
    // under pressure, the land a build holds in the STARTING world (used only to order purchases: what helps now first)
    const nowCoverage = items => staticCoverage(items, undefined, nowMemo);
    const costOf = items => { setState([]); let c = 0; for (const id of items) { c += probe.price(probe.traitById[id]); probe.buy(id); } return c; };

    // ---- stage 1: enumerate legal terminal builds (by effect type, never by trait id)
    const cap = config.scales.tempCap, states = []; let capped = false;
    const tempSplits = []; (function rec(i, left, acc) { if (i === temp.length) { tempSplits.push(acc); return; }
      for (let n = 0; n <= left; n++) rec(i + 1, left - n, acc.concat(Array(n).fill(temp[i].id))); })(0, cap, []);
    const waterOpts = [[]]; for (const a of arms) for (let n = 1; n <= V.maxWaterPts; n++) waterOpts.push(Array(n).fill(a.id));
    const levelOpts = adaptLevels.reduce((acc, t) => acc.flatMap(a => Array.from({ length: t.effect.max + 1 }, (_, n) => a.concat(Array(n).fill(t.id)))), [[]]);
    const axes = [...new Set(sky.map(t => t.effect.axis))];
    const skyOpts = axes.reduce((acc, ax) => acc.flatMap(a => { const o = [a];
      for (const t of sky.filter(t => t.effect.axis === ax)) for (let n = 1; n <= V.maxSkySteps; n++) o.push(a.concat(Array(n).fill(t.id))); return o; }), [[]]);
    const crossOpts = [[], ...cross.map(t => [t.id])];
    outer: for (const tp of tempSplits) for (const w of waterOpts) for (const l of levelOpts) for (const sk of skyOpts) for (const c of crossOpts) {
      if (states.length >= V.maxStaticStates) { capped = true; break outer; }
      const items = [...tp, ...w, ...l, ...sk, ...c], cov = staticCoverage(items);
      if (cov >= 0) states.push({ items, cov });
    }
    const bestStatic = states.reduce((b, s) => s.cov > b.cov ? s : b, { cov: 0, items: [] });
    const cands = states.filter(s => s.cov >= target).map(s => ({ ...s, cost: costOf(s.items), key: s.items.join() }))
      .sort((a, b) => a.cost - b.cost || a.items.length - b.items.length);

    // ---- stage 2 helpers: order a build greedily by static gain; opening variants for the Spread boosters.
    // Under pressure (BLOOM-012) the gain is measured in the starting world first and in the final world as the
    // tie-break: buy what opens land now, then prepare for the decline (what a person would do). Eden: unchanged.
    // Two orders are tried under pressure ("now" first, then "final" = gain in the final world only).
    const order = (items, mode = "final") => { const left = items.slice(), out = [];
      while (left.length) { let bi = 0, bc = -2, bn = -2, bp = Infinity;
        for (let k = 0; k < left.length; k++) { const c = staticCoverage([...out, left[k]]); if (c < 0) continue;
          const n = mode === "now" ? nowCoverage([...out, left[k]]) : 0;
          setState([...out, left[k]]); const p = probe.price(probe.traitById[left[k]]); // (next-tier price, as in BLOOM-005)
          if (n > bn + 1e-9 || (Math.abs(n - bn) <= 1e-9 && (c > bc + 1e-9 || (Math.abs(c - bc) <= 1e-9 && p < bp)))) { bi = k; bc = c; bn = n; bp = p; } }
        out.push(left.splice(bi, 1)[0]); }
      return out; };
    const openings = [boosters.slice(0, 1).map(t => t.id), [], boosters.map(t => t.id)]
      .filter((o, i, a) => a.findIndex(x => x.join() === o.join()) === i)
      .flatMap(o => SCN && FIN ? [{ o, mode: "now" }, { o, mode: "final" }] : [{ o, mode: "final" }]); // Eden: the BLOOM-006 list

    // ---- layer 7 (see header): candidate classes by minimal sufficient core, then effect tokens per core
    const counts = items => items.reduce((m, id) => (m[id] = (m[id] || 0) + 1, m), {});
    const within = (a, b) => Object.keys(a).every(id => (b[id] || 0) >= a[id]); // multiset a ⊆ b
    const classes = [], classOf = new Map();
    for (const c of cands) { const n = counts(c.items), cl = classes.find(k => within(k.n, n));
      if (cl) cl.members.push(c); else classes.push({ core: c.items, n, members: [c] });
      classOf.set(c.key, cl || classes[classes.length - 1]); }
    const signature = items => { const cl = classOf.get(items.join());
      if (cl.signature) return cl.signature;
      const held = [...staticHeld(cl.core)].sort((a, b) => a - b); // leaves the probe in the core's state
      const shift = { temp: probe.sky.temp - base.sky.temp, moist: probe.sky.moist - base.sky.moist };
      return (cl.signature = { ...signatureOf(cl.core, probe.traitById, shift), minimalBuild: cl.core, held: held.map(i => M.SEC[i].id),
        heldShare: +(held.reduce((a, i) => a + M.AREA[i], 0) / M.LAND).toFixed(4) }); };
    // pacing context (layer 8, recorded — not a verdict): land open before any upgrade
    const early = (() => { const held = staticHeld([]), grow = M.SEC.map((_, i) => probe.evaluate(i).fitness > G.growThresh);
      let r = 0, g = 0; for (let i = 0; i < M.SC; i++) { if (held.has(i)) r += M.AREA[i]; if (grow[i]) g += M.AREA[i]; }
      return { reachableShare: +(r / M.LAND).toFixed(4), growableShare: +(g / M.LAND).toFixed(4) }; })();

    const search = { staticStates: states.length, capped, candidates: cands.length, simulations: 0, target };
    // layers 4 and 6 are static verdicts (a capped enumeration makes them inconclusive)
    let staticFail = null;
    if (bestStatic.cov < probe.winAt) staticFail = { ok: false, layer: 4,
      reason: `no legal build can hold the win simultaneously: best build reaches ${(bestStatic.cov * 100).toFixed(1)}% < ${(probe.winAt * 100).toFixed(0)}%` };
    else if (!cands.length) staticFail = { ok: false, layer: 6,
      reason: `no legal build reaches the validation margin: best build holds ${(bestStatic.cov * 100).toFixed(1)}% < target ${(target * 100).toFixed(0)}%` };
    const done = r => { search.ms = Date.now() - t0; setState([]);
      // a failure after hitting the enumeration cap says nothing about the planet — flag it as inconclusive
      if (!r.ok && capped) r = { ...r, inconclusive: true, reason: `search capped at ${V.maxStaticStates} static builds (result inconclusive): ${r.reason}` };
      return { ...r, search, early, bestStatic: { coverage: bestStatic.cov, build: bestStatic.items } }; };
    const CONFIRM = (SCN && SCN.validation && SCN.validation.confirmRngSeeds) || [];
    const run = (cand, opening, measurePeak) => { search.simulations++;
      const plan = [...opening.o, ...order(cand.items, opening.mode)], r = simulate(planet, config, traits, plan, target, !!measurePeak, SCN);
      if (SCN && FIN) r.order = opening.mode;
      if (r.ok && CONFIRM.length) { // robustness: the same plan under other simulation seeds (each a full run: margin + hold)
        // (confirmation runs verify a found witness; they are counted apart and never use up the search budget)
        r.confirm = CONFIRM.map(seed => { search.confirmations = (search.confirmations || 0) + 1; const c = simulate(planet, config, traits, plan, target, false, SCN, seed);
          return { rngSeed: seed, ok: c.ok, marginSeconds: c.marginSeconds, hold: c.hold && { coverage: c.hold.coverage, held: c.hold.held }, lost: c.lost,
            ...(c.climate ? { shocks: c.climate.shocks.length, noEvidence: c.climate.noEvidence } : {}) }; });
        if (r.confirm.some(c => !c.ok)) { r.ok = false; r.unconfirmed = true; } }
      r.staticCoverage = cand.cov; r.build = cand.items; if (r.ok) r.signature = signature(cand.items); return r; };
    const noWin = (best, capNote) => ({ ok: false, layer: best && best.won ? 6 : 5, best,
      reason: best && best.unconfirmed ? `witness wins with margin under the validation seed but not under every confirmation seed (${best.confirm.map(c => `${c.rngSeed}: ${c.ok ? "ok" : c.lost ? "extinct" : c.hold && !c.hold.held ? `held ${(c.hold.coverage * 100).toFixed(1)}%` : "no margin"}`).join(", ")})`
        : best && best.climate && best.climate.noEvidence && best.marginTick !== null && best.hold && best.hold.held ? `witness wins with ${best.climate.terraformSteps} Terraform steps but never lived through a climate shock (${best.climate.shocksBeforeHold} < ${SCN.validation.mechanicEvidence.minShocks}): no proof under the scenario's mechanic`
        : best && best.hold && !best.hold.held ? `witness reaches the margin but holds only ${(best.hold.coverage * 100).toFixed(1)}% < ${(probe.winAt * 100).toFixed(0)}% ${SCN.validation.holdFinalSeconds} s ${SCN.pressure ? "into the final pressure state" : SCN.climateInstability ? "after the margin and the last climate shock" : "after the margin"}`
        : best && best.lost ? `every witness died out (extinction at ${best.lostSeconds} s; best peak ${(best.peak * 100).toFixed(1)}%)`
        : best && best.won ? `witness wins but peaks at ${(best.peak * 100).toFixed(1)}% < target ${(target * 100).toFixed(0)}%`
        : capNote ? `no witness reached the win with earned Biomass within ${capNote} (best peak ${best ? (best.peak * 100).toFixed(1) : 0}%)`
        : `no candidate build reached the win with earned Biomass (best peak ${best ? (best.peak * 100).toFixed(1) : 0}%)` });
    // order-independent classification of any build (same rule as the classes above)
    const classify = items => { const cov = staticCoverage(items); if (cov < target) return { sufficient: false, coverage: cov };
      const cl = classes.find(k => within(k.n, counts(items))); return { sufficient: true, coverage: cov, signature: cl && signature(cl.core) }; };
    return { V, target, cands, classes, openings, signature, classify, search, done, run, noWin, staticFail, capped, early };
  }

  // layers 4–6: the cheapest build that a real, no-cheat run wins with margin (BLOOM-005 behaviour)
  function findWitness(planet, config, traits, opts = {}) {
    const X = prepare(planet, config, traits, opts), V = X.V;
    if (X.staticFail) return X.done(X.staticFail);
    let best = null;
    for (const cand of X.cands) for (const opening of X.openings) {
      if (X.search.simulations >= V.maxSimulations) return X.done(X.noWin(best, `${V.maxSimulations} simulations × ${V.maxTicks} ticks`));
      const r = X.run(cand, opening, opts.measurePeak);
      if (r.ok) return X.done({ ok: true, layer: null, reason: null, witness: r });
      if (!best || r.peak > best.peak) best = r;
    }
    return X.done(X.noWin(best));
  }

  // layers 4–8 (BLOOM-006). Candidate builds are grouped into CLASSES by signature (cheapest class first).
  // Classes are simulated in turn — members cheapest first, every opening — until `minStrategies`
  // pairwise-distinct classes QUALIFY: a member wins with margin AND passes the pacing policy. A class
  // that is materially the same as an already-qualified one is skipped (it cannot add a strategy).
  // Class outcomes: qualified · slow (its cheapest build that wins with margin misses pacing under every
  // Spread opening) · lost (every member simulated, none wins) · unresolved (a cap was reached first:
  // ≤ maxBuildsPerClass builds per class, ≤ maxSimulations runs in all). Verdicts: layer 7 needs `minStrategies` distinct classes that win with margin,
  // layer 8 needs that many that qualify. A shortfall is FAIL only when nothing is unresolved and the
  // static enumeration was not capped; otherwise it is INCONCLUSIVE. Limits: config.validation.diversity.
  //   → { ok, layer, status PASS|FAIL|INCONCLUSIVE, reason, required, strategies[], slow[], layer7, layer8,
  //       differences[], classes[], first (a layers 4–6 result: its witness), early, search }
  function findStrategies(planet, config, traits, opts = {}) {
    const X = prepare(planet, config, traits, opts), D = X.V.diversity, need = opts.minStrategies || 1, P = opts.pacing || null;
    if (X.staticFail) { const f = X.done(X.staticFail);
      return { ...f, status: f.inconclusive ? "INCONCLUSIVE" : "FAIL", required: need, strategies: [], slow: [], classes: [], first: f }; }
    const classes = X.classes.map(k => ({ signature: X.signature(k.core), members: k.members }));
    const qualified = [], slow = []; let best = null, budgetOut = false;
    for (const cl of classes) {
      if (qualified.length >= need) { cl.status = "not needed"; continue; }
      if (qualified.some(q => !distinctSignatures(q.signature, cl.signature))) { cl.status = "same as a qualified strategy"; continue; }
      cl.status = "unresolved"; cl.tried = 0; let winner = null;
      for (const cand of cl.members.slice(0, D.maxBuildsPerClass)) {
        for (const opening of X.openings) {
          if (X.search.simulations >= D.maxSimulations) { budgetOut = true; break; }
          const r = X.run(cand, opening, opts.measurePeak);
          if (!r.ok) { if (!best || r.peak > best.peak) best = r; continue; }
          // a witness proves its strategy only if its whole core was bought before the margin was reached
          const got = {}; for (const p of r.purchases) if (p.tick <= r.marginTick) got[p.id] = (got[p.id] || 0) + 1;
          const core = {}; for (const id of cl.signature.minimalBuild) core[id] = (core[id] || 0) + 1;
          if (Object.keys(core).some(id => (got[id] || 0) < core[id])) { cl.coreIncomplete = (cl.coreIncomplete || 0) + 1; continue; }
          r.pacingCheck = P ? checkPacing(r, P) : { ok: true, reasons: [] };
          if (r.pacingCheck.ok) { winner = r; break; }
          if (!cl.slowWitness) cl.slowWitness = r;
        }
        if (budgetOut || winner) break;
        cl.tried++;
        if (cl.slowWitness) break; // this build wins; its openings settled pacing — more builds only matter for losers
      }
      if (winner) { cl.status = "qualified"; qualified.push(winner); }
      else if (cl.slowWitness && !budgetOut) { cl.status = "slow"; slow.push(cl.slowWitness); }
      else if (!budgetOut && cl.tried === cl.members.length) cl.status = cl.coreIncomplete ? "wins only before its core is bought (no proof)" : "lost";
      else if (cl.slowWitness) slow.push(cl.slowWitness); // won but budget ran out before pacing was settled
      if (budgetOut) break;
    }
    const search = { ...X.search, classes: classes.length, budgetOut,
      limits: { maxSimulations: D.maxSimulations, maxBuildsPerClass: D.maxBuildsPerClass, openings: X.openings.length, maxTicks: X.V.maxTicks } };
    const unresolved = classes.some(c => !c.status || c.status === "unresolved") || X.capped;
    const summary = w => ({ signature: w.signature.key, tokens: w.signature.tokens, minimalBuild: w.signature.minimalBuild, held: w.signature.held,
      heldShare: w.signature.heldShare, build: w.build, plan: w.plan, purchases: w.purchases.map(p => ({ id: p.id, seconds: p.seconds, cost: p.cost })),
      totalSpent: w.totalSpent, winSeconds: w.winSeconds, marginSeconds: w.marginSeconds, peak: w.peak, peakMeasured: w.peakMeasured,
      pacing: w.pacing, pacingCheck: w.pacingCheck,
      ...(w.scenario ? { scenario: w.scenario, order: w.order, pressureAtMargin: w.pressureAtMargin, hold: w.hold && { seconds: w.hold.seconds, coverage: w.hold.coverage, held: w.hold.held },
        trace: w.trace } : {}), ...(w.competition ? { competition: w.competition } : {}), ...(w.climate ? { climate: w.climate } : {}), ...(w.confirm ? { confirm: w.confirm } : {}) });
    const classRows = classes.map(c => ({ signature: c.signature.key, members: c.members.length, status: c.status || "not reached", cheapest: c.members[0].cost,
      ...(c.coreIncomplete ? { winsBeforeCoreBought: c.coreIncomplete } : {}) }));
    const base = { required: need, classes: classRows, early: X.early, search };
    const winners = [...qualified, ...slow];
    if (!winners.length) { const f = X.done(budgetOut ? X.noWin(best, `${D.maxSimulations} simulations × ${X.V.maxTicks} ticks`) : X.noWin(best));
      // no witness at all: FAIL only if every class was actually settled (otherwise nothing was proven either way)
      const st = f.inconclusive || unresolved ? "INCONCLUSIVE" : "FAIL";
      return { ...base, ...f, search, status: st, reason: st === "INCONCLUSIVE" && !f.inconclusive ? `INCONCLUSIVE — search capped: ${f.reason}` : f.reason,
        strategies: [], slow: [], first: f }; }
    const distinct = winners.reduce((acc, w) => acc.every(x => distinctSignatures(x.signature, w.signature)) ? acc.concat(w) : acc, []);
    const verdict = n => n >= need ? "PASS" : unresolved ? "INCONCLUSIVE" : "FAIL";
    const layer7 = { status: verdict(distinct.length), strategies: distinct.length, required: need };
    const layer8 = { status: layer7.status === "PASS" ? verdict(qualified.length) : layer7.status, qualifying: qualified.length, required: need, policy: P };
    const differences = [];
    for (let i = 0; i < distinct.length; i++) for (let j = i + 1; j < distinct.length; j++)
      differences.push({ a: distinct[i].signature.key, b: distinct[j].signature.key, ...signatureDifference(distinct[i].signature, distinct[j].signature) });
    const out = { ...base, strategies: qualified.map(summary), slow: slow.map(summary), layer7, layer8, differences, witnesses: qualified,
      first: X.done({ ok: true, layer: null, reason: null, witness: winners[0] }) };
    const list = ws => ws.map(w => `[${w.signature.key}]`).join(" ");
    if (layer7.status !== "PASS") return { ...out, ok: false, layer: 7, status: layer7.status,
      reason: layer7.status === "INCONCLUSIVE" ? `INCONCLUSIVE — search capped with ${distinct.length} of ${need} broad strategies proven ${list(distinct)}`
        : `only ${distinct.length} of ${need} required broad strategies wins with margin ${list(distinct)}; every other candidate class is ${classes.length > 1 ? "materially the same or cannot win" : "absent (static proof)"}` };
    if (layer8.status !== "PASS") return { ...out, ok: false, layer: 8, status: layer8.status,
      reason: `${layer8.status === "INCONCLUSIVE" ? "INCONCLUSIVE — search capped: " : ""}only ${qualified.length} of ${need} broad strategies meet the pacing policy — ` +
        slow.map(w => `[${w.signature.key}] ${w.pacingCheck.reasons.join("; ")}`).join(" | ") };
    return { ...out, ok: true, layer: null, status: "PASS", reason: null };
  }

  // which broad strategy a terminal build belongs to (layer-7 signature of its minimal sufficient core);
  // { sufficient: false } when its static estimate misses the validation target
  function strategyOf(planet, config, traits, items, opts = {}) { const X = prepare(planet, config, traits, opts), r = X.classify(items); X.done({}); return r; }
  // the static candidate classes (one per minimal sufficient core, cheapest first) — no simulation, so not yet proof
  function strategyClasses(planet, config, traits, opts = {}) { const X = prepare(planet, config, traits, opts);
    const out = X.classes.map(k => ({ signature: X.signature(k.core).key, core: k.core, members: k.members.length, cheapest: k.members[0].cost })); X.done({}); return out; }

  // one real run: buy `plan` in order via sim.buy as soon as earned Biomass allows
  // scenario (BLOOM-012): run under that pressure scenario; after the margin keep running until holdFinalSeconds past the
  // final pressure state and record whether the win threshold still holds there (r.hold); ok needs both
  // competition (BLOOM-014): any scenario that changes the run (BLOOM.pressure.isDynamic) must hold the win threshold
  // holdFinalSeconds after the later of the margin and the final pressure state (no pressure clock: after the margin)
  function simulate(planet, config, traits, plan, target, measurePeak = false, scenario = null, rngSeed = null) {
    const V = config.validation, sim = BLOOM.createSim(planet, config, traits, { rng: mulberry32(rngSeed ?? V.rngSeed), scenario }); // never Math.random
    const sec = t => +(t * config.tickMs / 1000).toFixed(1), P = scenario && scenario.pressure, DYN = BLOOM.pressure.isDynamic(scenario);
    const fullTick = P ? Math.ceil(sim.pressure.fullAt * 1000 / config.tickMs) : 0;
    const holdTicks = DYN ? Math.round(((scenario.validation || {}).holdFinalSeconds || 0) * 1000 / config.tickMs) : 0;
    const CL = sim.climate.enabled ? sim.climate : null, shockTicks = CL ? Math.round(scenario.climateInstability.shocks.durationSeconds * 1000 / config.tickMs) : 0;
    const EVD = CL && (scenario.validation || {}).mechanicEvidence, skySteps = plan.filter(id => sim.traitById[id].effect.type === "sky").length;
    let minAfterMargin = null; // lowest coverage between the margin and the hold check (how hard the shocks bit)
    const purchases = []; let k = 0, peak = 0, peakTick = 0, winTick = null, marginTick = null, lastGrowth = 0, illegal = null, atMargin = null;
    let holdAt = null, hold = null, pressureAtMargin = null; const trace = [], nativeTrace = []; // [seconds, coverage, pressure progress] every 30 s (+ native share)
    const perMin = Math.round(60000 / config.tickMs), earnedPerMinute = []; // Biomass the economy produced, per game-minute (observed, never edited)
    const every = Math.round(30000 / config.tickMs);
    for (let t = 1; t <= V.maxTicks; t++) {
      const before = sim.biomass, cov = sim.tick();
      if (sim.lost) break;
      if (t % every === 0) { trace.push([sec(t), +cov.toFixed(4), +sim.pressure.progress.toFixed(3)]); if (sim.competition.enabled) nativeTrace.push([sec(t), +sim.competition.share.toFixed(4)]); }
      if (marginTick === null) { const m = ((t - 1) / perMin) | 0; earnedPerMinute[m] = (earnedPerMinute[m] || 0) + (sim.biomass - before); }
      if (cov > peak + 1e-9) { peak = cov; peakTick = t; lastGrowth = t; }
      if (winTick === null && sim.won) winTick = t;
      if (CL && marginTick !== null && !hold) minAfterMargin = minAfterMargin === null ? cov : Math.min(minAfterMargin, cov);
      if (marginTick === null && cov >= target) { marginTick = t; atMargin = snapshot(sim); pressureAtMargin = +sim.pressure.progress.toFixed(3);
        if (DYN) holdAt = Math.max(t, fullTick) + holdTicks; else if (!measurePeak) break; }
      if (CL && holdAt !== null && !hold) { // climate instability: the hold check waits for every running / announced shock to end
        let end = 0; for (const ax in CL.axes) { const A = CL.axes[ax]; if (A.shock) end = Math.max(end, A.shock.endTick); else if (A.pending) end = Math.max(end, A.pending.startTick + shockTicks); }
        if (end) holdAt = Math.max(holdAt, end + holdTicks); }
      if (holdAt !== null && t >= holdAt && !hold) { hold = { seconds: sec(t), coverage: +cov.toFixed(4), held: cov >= sim.winAt, progress: sim.pressure.progress, atEnd: snapshot(sim) };
        if (!measurePeak) break; }
      if (k < plan.length) {
        const tr = sim.traitById[plan[k]];
        if (!sim.canBuy(tr)) { illegal = `${tr.name} is not legal at that point`; break; }
        const cost = sim.price(tr);
        if (sim.biomass >= cost && sim.buy(tr.id)) { purchases.push({ id: tr.id, name: tr.name, tick: t, seconds: sec(t), cost }); k++; lastGrowth = t; }
      } else if (t - lastGrowth > V.plateauTicks && (holdAt === null || hold)) break;
    }
    const CS = sim.competition;
    // mechanic evidence (climate instability): a Terraform-heavy plan must have lived through at least minShocks real shocks
    const shocksBeforeHold = CL ? CL.shocks.filter(x => hold ? x.startTick <= Math.round(hold.seconds * 1000 / config.tickMs) : true).length : 0;
    const noEvidence = !!(EVD && skySteps >= EVD.terraformSteps && shocksBeforeHold < EVD.minShocks);
    return { ok: marginTick !== null && (!DYN || !!(hold && hold.held)) && !noEvidence, won: winTick !== null, illegal, plan, purchases,
      ...(CL ? { climate: { peak: +CL.peak.toFixed(4), terraformSteps: skySteps, shocksBeforeHold, noEvidence, minCoverageAfterMargin: minAfterMargin === null ? null : +minAfterMargin.toFixed(4),
        shocks: CL.shocks.map(x => ({ axis: x.axis, kind: x.kind, sign: x.sign, magnitude: +x.magnitude.toFixed(2), severity: x.severity, seconds: sec(x.startTick), endSeconds: sec(x.endTick), levelAtStart: x.levelAtStart })),
        forcing: CL.forcing.map(f => ({ seconds: sec(f.tick), axis: f.axis, add: +f.add.toFixed(3), after: +f.after.toFixed(3) })), endLevel: +CL.level.toFixed(4) } } : {}),
      ...(CS.enabled ? { competition: { startShare: +CS.startShare.toFixed(4), peakShare: +CS.peakShare.toFixed(4), endShare: +CS.share.toFixed(4),
        contestedRegions: CS.everContested.reduce((a, b) => a + b, 0), flips: { ...CS.flips }, nativeTrace } } : {}),
      scenario: scenario ? scenario.id : null, hold, pressureAtMargin, trace, lost: sim.lost, lostSeconds: sim.lost ? sec(sim.lostTick) : null,
      totalSpent: purchases.reduce((a, p) => a + p.cost, 0), usedCrossing: purchases.some(p => sim.traitById[p.id].effect.type === "crossing"),
      winTick, winSeconds: winTick && sec(winTick), marginTick, marginSeconds: marginTick && sec(marginTick),
      peak: +peak.toFixed(4), peakTick, peakMeasured: measurePeak, target: +target.toFixed(4), crossingFootholds: sim.crossing.footholds,
      uncolonizedAtMargin: atMargin, uncolonizedAtEnd: snapshot(sim), pacing: pacingOf() };
    // layer-8 measurements. Gaps run start → 1st purchase → … → last purchase made before the margin; the
    // wait from the last purchase to the margin is reported separately (terminalWaitSeconds), not gated.
    function pacingOf() {
      const end = marginTick ?? V.maxTicks, before = purchases.filter(p => p.tick <= end);
      const gaps = before.map((p, i) => +(p.seconds - (i ? before[i - 1].seconds : 0)).toFixed(1));
      const epm = earnedPerMinute.map(x => Math.round(x)), third = Math.max(1, Math.floor(epm.length / 3));
      const avg = xs => xs.reduce((a, b) => a + b, 0) / xs.length;
      return { firstPurchaseSeconds: before.length ? before[0].seconds : null, purchaseGapsSeconds: gaps,
        maxPurchaseGapSeconds: gaps.length ? Math.max(...gaps) : null,
        terminalWaitSeconds: marginTick && before.length ? +(sec(marginTick) - before[before.length - 1].seconds).toFixed(1) : null,
        earnedPerMinute: epm, economyAccelerates: epm.length >= 3 && avg(epm.slice(-third)) > avg(epm.slice(0, third)) };
    }
    // land the witness does NOT hold (sections < 40% living) and why — proof the win doesn't need 100%
    function snapshot(sim) {
      const living = sim.livingCountBySection();
      const uncolonized = sim.map.SEC.map((s, i) => ({ s, i })).filter(({ i }) => living[i] / sim.map.AREA[i] < 0.4)
      .map(({ s, i }) => { const e = sim.evaluate(i); return { id: s.id, name: s.name, landShare: +(sim.map.AREA[i] / sim.map.LAND).toFixed(3),
        limit: e.fitness > config.grow.growThresh ? "suitable (not filled yet)" : e.limitKey }; });
      return { coverage: +sim.coverage().toFixed(4), landShareUnheld: +uncolonized.reduce((a, u) => a + u.landShare, 0).toFixed(3), sections: uncolonized };
    }
  }

  root.BLOOM.findWitness = findWitness;
  root.BLOOM.findStrategies = findStrategies;
  root.BLOOM.witness = { findWitness, findStrategies, strategyOf, strategyClasses, simulate, signatureOf, distinctSignatures, checkPacing };
})(typeof window !== "undefined" ? window : globalThis);
