// BLOOM — winnability witness solver (bible §10.3 layers 4–6, BLOOM-005). No DOM.
//
//   BLOOM.findWitness(planet, config, traits, { excludeTraits, measurePeak }) → { ok, layer, reason, witness, best, search }
//   measurePeak: keep the passing witness running to its plateau to report true peak coverage (slower)
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
(function (root) {
  "use strict";
  const BLOOM = root.BLOOM;
  if (!BLOOM || !BLOOM.createSim) throw new Error("bloom-witness.js needs resources/bloom-sim.js loaded first");
  const { waterCrossings } = BLOOM.geo;
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  function findWitness(planet, config, traits, opts = {}) {
    const t0 = Date.now(), V = config.validation, G = config.grow;
    const excluded = new Set(opts.excludeTraits || []);
    const probe = BLOOM.createSim(planet, config, traits, { rng: () => 0.5 });
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
    const staticCoverage = items => {
      if (!setState(items)) return -1;
      const ok = M.SEC.map((_, i) => probe.evaluate(i).fitness > G.growThresh);
      const hasCross = items.some(id => probe.traitById[id].effect.type === "crossing");
      const seen = new Set([M.ORIGIN]), st = [M.ORIGIN];
      while (st.length) { const a = st.pop();
        const next = hasCross ? [...M.NBRS[a], ...xl[a]] : M.NBRS[a];
        for (const b of next) if (ok[b] && !seen.has(b)) { seen.add(b); st.push(b); } }
      let area = 0; for (const i of seen) area += M.AREA[i]; return area / M.LAND;
    };
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
    const search = { staticStates: states.length, capped, candidates: 0, simulations: 0, target };
    const done = r => { search.ms = Date.now() - t0; setState([]);
      // a failure after hitting the enumeration cap says nothing about the planet — flag it as inconclusive
      if (!r.ok && capped) r = { ...r, inconclusive: true, reason: `search capped at ${V.maxStaticStates} static builds (result inconclusive): ${r.reason}` };
      return { ...r, search, bestStatic: { coverage: bestStatic.cov, build: bestStatic.items } }; };
    if (bestStatic.cov < probe.winAt) return done({ ok: false, layer: 4,
      reason: `no legal build can hold the win simultaneously: best build reaches ${(bestStatic.cov * 100).toFixed(1)}% < ${(probe.winAt * 100).toFixed(0)}%` });
    const cands = states.filter(s => s.cov >= target).map(s => ({ ...s, cost: costOf(s.items) }))
      .sort((a, b) => a.cost - b.cost || a.items.length - b.items.length);
    search.candidates = cands.length;
    if (!cands.length) return done({ ok: false, layer: 6,
      reason: `no legal build reaches the validation margin: best build holds ${(bestStatic.cov * 100).toFixed(1)}% < target ${(target * 100).toFixed(0)}%` });

    // ---- stage 2: order each candidate greedily by static gain, then prove it in the real sim
    const order = items => { const left = items.slice(), out = [];
      while (left.length) { let bi = 0, bc = -2, bp = Infinity;
        for (let k = 0; k < left.length; k++) { const c = staticCoverage([...out, left[k]]); if (c < 0) continue;
          const p = probe.price(probe.traitById[left[k]]);
          if (c > bc + 1e-9 || (Math.abs(c - bc) <= 1e-9 && p < bp)) { bi = k; bc = c; bp = p; } }
        out.push(left.splice(bi, 1)[0]); }
      return out; };
    const openings = [boosters.slice(0, 1).map(t => t.id), [], boosters.map(t => t.id)]
      .filter((o, i, a) => a.findIndex(x => x.join() === o.join()) === i);
    let best = null;
    for (const cand of cands) for (const opening of openings) {
      if (search.simulations >= V.maxSimulations) return done({ ok: false, layer: best && best.won ? 6 : 5,
        reason: best && best.won ? `witness wins but peaks at ${(best.peak * 100).toFixed(1)}% < target ${(target * 100).toFixed(0)}%`
          : `no witness reached the win with earned Biomass within ${V.maxSimulations} simulations × ${V.maxTicks} ticks (best peak ${best ? (best.peak * 100).toFixed(1) : 0}%)`, best });
      search.simulations++;
      const r = simulate(planet, config, traits, [...opening, ...order(cand.items)], target, !!opts.measurePeak);
      r.staticCoverage = cand.cov;
      if (r.ok) return done({ ok: true, layer: null, reason: null, witness: r });
      if (!best || r.peak > best.peak) best = r;
    }
    return done({ ok: false, layer: best && best.won ? 6 : 5,
      reason: best && best.won ? `witness wins but peaks at ${(best.peak * 100).toFixed(1)}% < target ${(target * 100).toFixed(0)}%`
        : `no candidate build reached the win with earned Biomass (best peak ${best ? (best.peak * 100).toFixed(1) : 0}%)`, best });
  }

  // one real run: buy `plan` in order via sim.buy as soon as earned Biomass allows
  function simulate(planet, config, traits, plan, target, measurePeak = false) {
    const V = config.validation, sim = BLOOM.createSim(planet, config, traits, { rng: mulberry32(V.rngSeed) }); // never Math.random
    const sec = t => +(t * config.tickMs / 1000).toFixed(1);
    const purchases = []; let k = 0, peak = 0, peakTick = 0, winTick = null, marginTick = null, lastGrowth = 0, illegal = null, atMargin = null;
    for (let t = 1; t <= V.maxTicks; t++) {
      const cov = sim.tick();
      if (cov > peak + 1e-9) { peak = cov; peakTick = t; lastGrowth = t; }
      if (winTick === null && sim.won) winTick = t;
      if (marginTick === null && cov >= target) { marginTick = t; atMargin = snapshot(sim); if (!measurePeak) break; }
      if (k < plan.length) {
        const tr = sim.traitById[plan[k]];
        if (!sim.canBuy(tr)) { illegal = `${tr.name} is not legal at that point`; break; }
        const cost = sim.price(tr);
        if (sim.biomass >= cost && sim.buy(tr.id)) { purchases.push({ id: tr.id, name: tr.name, tick: t, seconds: sec(t), cost }); k++; lastGrowth = t; }
      } else if (t - lastGrowth > V.plateauTicks) break;
    }
    return { ok: marginTick !== null, won: winTick !== null, illegal, plan, purchases,
      totalSpent: purchases.reduce((a, p) => a + p.cost, 0), usedCrossing: purchases.some(p => sim.traitById[p.id].effect.type === "crossing"),
      winTick, winSeconds: winTick && sec(winTick), marginTick, marginSeconds: marginTick && sec(marginTick),
      peak: +peak.toFixed(4), peakTick, peakMeasured: measurePeak, target: +target.toFixed(4), crossingFootholds: sim.crossing.footholds,
      uncolonizedAtMargin: atMargin, uncolonizedAtEnd: snapshot(sim) };
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
  root.BLOOM.witness = { findWitness, simulate };
})(typeof window !== "undefined" ? window : globalThis);
