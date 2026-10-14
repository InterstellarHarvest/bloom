// BLOOM-038 design audit — ONE research run: a production sim (BLOOM.createSim, exactly the arguments game-session.js passes, plus a
// seeded rng) driven by an IMPERFECT, PLAYER-INFORMED strategy policy. Research only: never loaded by the game, never edits content.
//
// WHAT A POLICY MAY READ (all of it is on screen in the released run UI):
//   · Biomass, every offered trait's price / legality / tier (Adapt · Spread · Terraform rooms)
//   · every region's lamp (engine evaluate().fitness → growable or not), its living plants and its landmass (the map / Regions room)
//   · a trait's PREVIEW: which regions it opens / closes (sim.previewOf — the same what-if the rooms and the map outline show)
//   · (Volatile Climate) the Terraform room's climate preview (sim.climatePreview): band change / "sets off a shock"
//   · coverage, scenario progress / native cover / shock warnings (the HUD)
// Reachability is the map read a player does by eye: a growable region counts as reachable when growable land connects it to a living
// colony (section adjacency), or — once Waterborne Seeds is owned — across one of the map's real water crossings.
// A policy NEVER reads the validator's witness / strategies, future pressure offsets, the rng, or any hidden engine state.
import { mulberry32, fnv } from "./engine.mjs";

export const POLICIES = ["balanced", "adapt_first", "spread_first", "terraform_first", "greedy", "low_planning", "colony"];
const SPEED_IDS = new Set(["seedOut", "earlyMat"]);
const FAR = 0.4; // weight of preview-opened land that is not yet connected to a colony
const COMPW = 1;  // weight of suitability gained where natives out-suit the plant (competition runs)
const r1 = x => x == null ? null : Math.round(x * 10) / 10, r3 = x => x == null ? null : Math.round(x * 1000) / 1000;

// per-policy human parameters: notice = seconds between "I can afford my target" and the purchase (time to notice, open the room, read,
// choose — the room itself pauses the run, so only the noticing costs game time); attention = share of Biomass bubbles clicked
// (the rest collect themselves at half value); bubbleDelay = seconds before a clicked bubble is clicked
const HUMAN = {
  balanced: { notice: 3, attention: 0.6, bubbleDelay: 2.5 }, adapt_first: { notice: 3, attention: 0.6, bubbleDelay: 2.5 },
  spread_first: { notice: 3, attention: 0.6, bubbleDelay: 2.5 }, terraform_first: { notice: 3, attention: 0.6, bubbleDelay: 2.5 },
  greedy: { notice: 2, attention: 0.8, bubbleDelay: 2 }, low_planning: { notice: 6, attention: 0.35, bubbleDelay: 4 },
  colony: { notice: 3, attention: 0.6, bubbleDelay: 2.5 },
};

/**
 * run(task, eng) → a plain-data run record.
 * task: { planet, speciesId, scenario (resolved or null), challenge (resolved or null), startingState, policy, runSeed, capSeconds, config? }
 */
export function run(task, { BLOOM, D }) {
  const cfg = task.config || D.config, sp = BLOOM.species.resolve(task.speciesId), TPS = 1000 / cfg.tickMs;
  const CHK = task.challenge && BLOOM.challengeCompletion ? BLOOM.challengeCompletion.contract(task.challenge) : null, GATED = !!(CHK && CHK.gated);
  let CT = null, earlyBloomAt = null;
  const sim = BLOOM.createSim(task.planet, cfg, D.traits, { rng: mulberry32(task.runSeed), species: sp, ...(task.scenario ? { scenario: task.scenario } : {}),
    ...(task.startingState ? { startingState: task.startingState } : {}), ...(GATED ? { canWin: (s, c) => CT.gate(s, c) } : {}) });
  if (CHK) CT = BLOOM.challengeCompletion.tracker(task.challenge, sim, { onEarlyBloom: () => { if (earlyBloomAt == null) earlyBloomAt = sim.ticks / TPS; } });
  const M = sim.map, SC = M.SC, AREA = M.AREA, LANDA = AREA.reduce((a, b) => a + b, 0), G = cfg.grow, WIN = cfg.win;
  const pol = task.policy, H = HUMAN[pol], prng = mulberry32(fnv(`${task.runSeed}|${pol}|policy`));
  const traits = D.traits.filter(t => sim.offered(t)), byId = sim.traitById;
  const links = (M.CROSSINGS && M.CROSSINGS.links) || [];
  const COMP = !!(sim.competition && sim.competition.enabled), careful = pol !== "greedy" && pol !== "low_planning";
  const cap = Math.round((task.capSeconds || 3600) * TPS), DEC = Math.max(1, Math.round(TPS)); // decide once a game second

  // ---- the player's map read
  const fitNow = () => { const f = new Float64Array(SC); for (let i = 0; i < SC; i++) f[i] = sim.evaluate(i).fitness; return f; };
  function reachable(grow, living, cross) { // growable land connected to a living colony (adjacency; + crossings when owned)
    const seen = new Uint8Array(SC), st = [];
    for (let i = 0; i < SC; i++) if (living[i] > 0) { seen[i] = 1; st.push(i); }
    const massOn = new Set();
    while (st.length) { const i = st.pop(); massOn.add(M.LANDMASS[i]);
      for (const u of M.NBRS[i]) if (!seen[u] && grow[u]) { seen[u] = 1; st.push(u); }
      if (!st.length && cross) { // hop: any growable region on a landmass linked to a reached landmass
        for (const L of links) { const a = massOn.has(L.from) ? L.to : massOn.has(L.to) ? L.from : null; if (a == null) continue;
          for (let j = 0; j < SC; j++) if (!seen[j] && grow[j] && M.LANDMASS[j] === a) { seen[j] = 1; st.push(j); } } }
    }
    return seen;
  }
  // what-if on copies of the plant / sky (the engine's own previewOf pattern: apply, evaluate, restore) → fitness of every region after
  let lastNat = null; // native fitness after the last whatIf (competition runs): the preview's "suits native plants less / more"
  function whatIf(t) {
    const g0 = { ...sim.genome }, s0 = { ...sim.sky }, t0 = { ...sim.tf }, e = t.effect, gm = sim.genome;
    if (e.type === "tempPoint" || e.type === "level" || e.type === "crossing") gm[e.stat] = (gm[e.stat] || 0) + 1;
    else if (e.type === "waterArm") { if (gm.waterArm !== e.arm) { gm.waterArm = e.arm; gm.waterPts = 0; } gm.waterPts++; }
    else if (e.type === "sky") { const v = sim.sky[e.axis] + e.delta; sim.sky[e.axis] = (e.min !== undefined || e.max !== undefined) ? Math.min(e.max ?? Infinity, Math.max(e.min ?? -Infinity, v)) : v; }
    const f = fitNow(); if (COMP) { lastNat = new Float64Array(SC); for (let i = 0; i < SC; i++) lastNat[i] = sim.nativeEvaluate(i).fitness; } Object.assign(sim.genome, g0); Object.assign(sim.sky, s0); Object.assign(sim.tf, t0); return f;
  }
  const areaOf = mask => { let a = 0; for (let i = 0; i < SC; i++) if (mask[i]) a += AREA[i]; return a / LANDA; };
  const crossOwned = () => (sim.genome.waterSeeds || 0) > 0;

  function assess() {
    const fit = fitNow(), living = sim.livingCountBySection(), grow = Array.from(fit, f => f > G.growThresh);
    const reach = reachable(grow, living, crossOwned()), reachShare = areaOf(reach);
    const frontier = new Uint8Array(SC); for (let i = 0; i < SC; i++) if (reach[i]) for (const u of M.NBRS[i]) if (!reach[u]) frontier[u] = 1;
    let uncovered = 0; for (let i = 0; i < SC; i++) if (reach[i]) uncovered += AREA[i] - living[i]; uncovered /= LANDA;
    const cands = [], losing = [], contestable = [], natFit = new Float64Array(SC);
    if (COMP) for (let i = 0; i < SC; i++) { const c = sim.competitionAt(i); natFit[i] = c.nativeFitness;
      if (c.nativeTiles > 0 && fit[i] > G.growThresh && c.nativeFitness > fit[i] + 0.05) losing.push(i);
      if (c.nativeTiles > 0 && fit[i] > G.growThresh) contestable.push(i); }
    for (const t of traits) {
      if (!sim.canBuy(t)) continue;
      const c = { id: t.id, board: t.board, price: sim.price(t), unlock: 0, loseLiving: 0, speed: 0, reach: 0, risk: 0, better: 0, gainFar: 0, compete: 0, value: 0 };
      if (t.effect.type === "crossing") {
        const r2 = reachable(grow, living, true); c.reach = Math.max(0, areaOf(r2) - reachShare);
      } else if (SPEED_IDS.has(t.id)) c.speed = uncovered;
      else {
        const p = sim.previewOf(t.id); if (!p) continue;
        const g2 = grow.slice(); for (const i of p.gain) g2[i] = true; for (const i of p.lose) g2[i] = false;
        const liv2 = Int32Array.from(living); for (const i of p.lose) liv2[i] = 0;
        const r2 = reachable(g2, liv2, crossOwned()); c.unlock = areaOf(r2) - reachShare;
        // regions the preview opens that are not connected yet (the preview still shows them opening): valued at a discount
        for (const i of p.gain) if (!r2[i]) c.gainFar += AREA[i] / LANDA;
        for (const i of p.lose) if (living[i] > 0) c.loseLiving += living[i] / LANDA;
        // the preview's "better" regions on the FRONTIER (blocked land touching the reachable set): the visible progress of a step that
        // does not open a region yet (the region panel's limiting-factor hint points at exactly these)
        const f2 = whatIf(t); for (let i = 0; i < SC; i++) if (!grow[i] && frontier[i] && f2[i] > fit[i] + 0.02) c.better += (f2[i] - fit[i]) * AREA[i] / LANDA;
        for (let i = 0; i < SC; i++) if (reach[i] && fit[i] > G.growThresh && f2[i] < fit[i] - 0.05) c.better -= (fit[i] - f2[i]) * AREA[i] / LANDA;
        if (t.effect.type === "sky" && sim.climate && sim.climate.enabled) { const cp = sim.climatePreview(t.id); if (cp) c.risk = cp.triggersShock ? 2 : cp.crossesBand ? 1 : 0; }
      }
      // (competition runs) the region panel says "the native plants are better suited to this ground than your plant": a purchase that
      // raises the plant's suitability where natives hold / reclaim ground it can grow on is visible progress against them
      if (COMP && t.effect.type !== "crossing" && !SPEED_IDS.has(t.id)) { const f2 = whatIf(t);
        for (const i of losing) c.compete += Math.max(0, Math.min(f2[i], natFit[i] + 0.1) - fit[i]) * AREA[i] / LANDA;
        if (t.effect.type === "sky") for (const i of contestable) { const d = natFit[i] - lastNat[i];
          // "suits native plants less" helps; "suits native plants more" (≥ 0.1, the preview's own cut) is a visible warning
          if (d > 0) c.compete += Math.min(d, natFit[i] - fit[i] + 0.1) * AREA[i] / LANDA; else if (d <= -0.1 && careful) c.compete += d * AREA[i] / LANDA; } }
      c.value = c.unlock + FAR * c.gainFar + COMPW * c.compete; cands.push(c);
    }
    return { fit, living, grow, reach, reachShare, uncovered, cands };
  }

  // ---- policies: return the TARGET candidate (may be unaffordable: the player saves for it) or null (nothing worth buying)
  // a purchase helps when its visible net gain is positive; careful policies accept a visible loss of living land only for a clearly
  // larger gain (≥ 2×), the greedy / low-planning ones for any net gain
  const helpful = c => c.value > 1e-6 && c.loseLiving <= (careful ? 0.5 : 1) * c.value;
  const effic = c => c.value / c.price;
  const best = (xs, f) => xs.reduce((b, x) => (b == null || f(x) > f(b) ? x : b), null);
  const speedOk = (c, A) => c.speed > 0.08 && (c.id !== "seedOut" || (sim.genome.seedOut || 0) < 2);
  let lastBoards = [];
  function choose(A) {
    const C = A.cands, H1 = C.filter(helpful), cautious = pol !== "greedy" && pol !== "low_planning" && pol !== "terraform_first";
    const safe = H1.filter(c => !(cautious && c.risk >= 2));
    const spread = C.filter(c => (c.reach > 0.01) || (SPEED_IDS.has(c.id) && speedOk(c, A)));
    const spreadPick = () => best(spread, c => c.reach > 0.01 ? 10 + c.reach : c.speed / c.price);
    const by = b => safe.filter(c => c.board === b);
    const prog = C.filter(c => c.value <= 1e-6 && c.better > 0.004 && c.loseLiving < 0.02 && !(cautious && c.risk >= 2));
    const progPick = b => best(b ? prog.filter(c => c.board === b) : prog, c => c.better / c.price);
    switch (pol) {
      case "adapt_first": return best(by("Adapt"), effic) || best(by("Terraform"), effic) || progPick("Adapt") || spreadPick() || progPick();
      case "terraform_first": return best(by("Terraform"), effic) || best(by("Adapt"), effic) || progPick("Terraform") || spreadPick() || progPick();
      case "spread_first": { const s = spread.filter(c => c.reach > 0.01 || c.speed > 0.08); return s.length ? spreadPick() : best(safe, effic) || progPick(); }
      case "greedy": { const aff = H1.filter(c => c.price <= sim.biomass); if (aff.length) return best(aff, c => c.value);
        const sa = spread.filter(c => c.price <= sim.biomass); if (sa.length) return best(sa, c => c.reach + c.speed);
        const pa = prog.filter(c => c.price <= sim.biomass); return pa.length ? best(pa, c => c.better) : null; }
      case "low_planning": { const pool = [...H1, ...spread]; const q = pool.length ? pool : prog; if (!q.length) return null;
        const keep = target && q.find(c => c.id === target.id); return keep || q[Math.floor(prng() * q.length)]; } // keeps its pick until bought
      default: { // balanced / colony: the most efficient opening; avoid a third same-board purchase in a row when a decent alternative exists
        let b = best(safe, effic);
        if (b && lastBoards.length >= 2 && lastBoards.slice(-2).every(x => x === b.board)) {
          const alt = best(safe.filter(c => c.board !== b.board), effic); if (alt && effic(alt) >= 0.5 * effic(b)) b = alt; }
        if (!b || (A.uncovered > 0.25 && spread.length && (sim.genome.seedOut || 0) === 0 && b.value < 0.05)) b = spreadPick() || b;
        return b || progPick();
      }
    }
  }

  // ---- the loop
  const rec = { policy: pol, runSeed: task.runSeed, purchases: [], colony: [], cov: [], reachS: [], t: {}, wait: { saving: 0, nothingUseful: 0 } };
  let target = null, affordSince = null, firstDecision = null, maxCov = 0, wonAt = null, lostAt = null;
  const seenB = new Map(); let lastSample = -1;
  const mark = (k, s) => { if (rec.t[k] == null) rec.t[k] = r1(s); };
  if (pol === "colony") sim.setColonyFocus(M.ORIGIN, "leaves");
  let A = assess();
  for (let k = 1; k <= cap; k++) {
    const cov = sim.tick(), s = k / TPS; maxCov = Math.max(maxCov, cov);
    // bubbles: a seeded share is clicked after a human delay; the rest auto-collect (engine)
    for (const b of sim.bubbles) if (!seenB.has(b)) seenB.set(b, prng() < H.attention ? k + Math.round(H.bubbleDelay * TPS) : Infinity);
    for (let j = sim.bubbles.length - 1; j >= 0; j--) { const due = seenB.get(sim.bubbles[j]); if (due !== undefined && k >= due) { seenB.delete(sim.bubbles[j]); sim.collectBubble(j); } }
    if (seenB.size > 64) for (const b of seenB.keys()) if (!sim.bubbles.includes(b)) seenB.delete(b);
    if (cov >= 0.25) mark("cov25", s); if (cov >= 0.5) mark("cov50", s); if (cov >= WIN) mark("cov70", s);
    if (sim.won && wonAt == null) { wonAt = s; }
    if (sim.lost) { lostAt = s; }
    if (k % DEC === 0 || sim.won || sim.lost) {
      A = assess();
      const S = Math.floor(s / 10); if (S !== lastSample) { lastSample = S; rec.cov.push(Math.round(cov * 1000) / 10); rec.reachS.push(Math.round(A.reachShare * 1000) / 10); }
      if (sim.won || sim.lost) break;
      const tg = choose(A);
      const anyUseful = A.cands.some(c => helpful(c) || c.reach > 0.01 || (SPEED_IDS.has(c.id) && speedOk(c, A)) || c.better > 0.004);
      if (!anyUseful) rec.wait.nothingUseful += DEC / TPS;
      if (firstDecision == null && A.cands.some(c => (helpful(c) || c.reach > 0.01 || c.speed > 0.08) && c.price <= sim.biomass)) firstDecision = s;
      if (!tg) { target = null; affordSince = null; }
      else {
        if (!target || target.id !== tg.id) { target = tg; affordSince = null; }
        if (sim.biomass >= tg.price) {
          if (affordSince == null) affordSince = s;
          if (s - affordSince >= H.notice) {
            const cov0 = cov;
            if (sim.buy(tg.id)) {
              const kind = tg.value > 1e-6 ? "unlock" : tg.reach > 0.01 ? "reach" : SPEED_IDS.has(tg.id) ? "speed" : tg.better > 0 ? "progress" : "none";
              rec.purchases.push({ t: r1(s), id: tg.id, board: tg.board, price: tg.price, cov: r3(cov0), unlock: r3(tg.unlock), far: r3(tg.gainFar), lose: r3(tg.loseLiving), reach: r3(tg.reach), better: r3(tg.better), kind, risk: tg.risk });
              mark("first_" + tg.board, s); mark("firstPurchase", s); lastBoards.push(tg.board);
              target = null; affordSince = null;
            }
          }
        } else { affordSince = null; rec.wait.saving += DEC / TPS; }
      }
      // the competition panel's hint: "Your colony here is still young … Roots thicken a young colony faster" — careful players follow it
      if (COMP && careful && k % (DEC * 5) === 0) for (let i = 0; i < SC; i++) { const c = sim.competitionAt(i);
        if (c.side === "native" && c.playerTiles > 0 && c.playerMaturity < cfg.establish.status.established && sim.getColonyFocus(i) !== "roots") { if (sim.setColonyFocus(i, "roots")) rec.colony.push({ t: r1(s), focus: "roots", region: i }); } }
      if (pol === "colony" && sim.biomass >= sim.specPrice() + 60 && !sim.getSpecialization(M.ORIGIN) && rec.purchases.length >= 1) {
        if (sim.buySpecialization(M.ORIGIN, "leafCanopy")) rec.colony.push({ t: r1(s), id: "leafCanopy", region: "origin" });
      }
    }
  }
  const end = sim.ticks / TPS;
  rec.firstDecision = r1(firstDecision);
  rec.won = !!sim.won; rec.bloomAt = r1(wonAt); rec.earlyBloomAt = r1(earlyBloomAt); rec.lost = !!sim.lost; rec.lostAt = r1(lostAt); rec.lostReason = sim.lostReason || null;
  rec.endSeconds = r1(end); rec.finalCov = r3(sim.coverage()); rec.maxCov = r3(maxCov); rec.spent = Math.round(sim.spent.global + sim.spent.local);
  rec.genome = { ...sim.genome }; rec.tf = { ...sim.tf }; rec.sky = { temp: r1(sim.sky.temp), moist: r1(sim.sky.moist) };
  rec.outcome = rec.won ? "bloom" : rec.lost ? "extinction" : "timeout";
  // why the land that is not growable is not: area share by the engine's named limiting category (what the region panel says)
  const lim = {}; let unreachedGrow = 0;
  for (let i = 0; i < SC; i++) { const e = sim.evaluate(i);
    if (!(e.fitness > G.growThresh)) { const key = e.limitKey ? `${e.limitKey}:${e.cats[e.limitKey].word}` : "none"; lim[key] = r3((lim[key] || 0) + AREA[i] / LANDA); }
    else if (!A.reach[i]) unreachedGrow += AREA[i] / LANDA; }
  rec.blockedBy = lim; rec.unreachedGrowable = r3(unreachedGrow);
  // scenario evidence
  if (task.scenario && task.scenario.pressure && sim.pressure) rec.pressure = { progress: r3(sim.pressure.progress), phases: (sim.pressure.events || []).length };
  if (sim.competition && sim.competition.enabled) { const C = sim.competition; rec.competition = { share: r3(C.share), peakShare: r3(C.peakShare), startShare: r3(C.startShare), everContested: C.everContested.reduce((a, b) => a + b, 0), firstContact: r1(C.firstContactTick == null ? null : C.firstContactTick / TPS), flips: { ...C.flips }, events: C.nextEventId - 1 }; }
  if (sim.climate && sim.climate.enabled) rec.climate = { shocks: sim.climate.shocks.length, peakBand: sim.climate.band, peak: r3(sim.climate.peak), forcing: sim.climate.forcing.length };
  // reversals: coverage drops of ≥ 5 points from a running peak (sampled every 10 s)
  let pk = 0, rev = 0, inDrop = false; for (const c of rec.cov) { if (c > pk) { pk = c; inDrop = false; } else if (pk - c >= 5 && !inDrop) { rev++; inDrop = true; } }
  rec.reversals = rev;
  if (task.keepSim) Object.defineProperty(rec, "sim", { value: sim, enumerable: false }); // (escape.mjs) the live sim, not serialised
  return rec;
}
