"use strict";
// Phase 2: species-RELATIVE evaluation of the fixed physical sample. The planet objects are never regenerated or edited; only the
// starting physiology changes. For the study the physiology is applied as a derived config (BLOOM.play.deriveConfig over
// config.genomeBase / config.categories) — legitimate here because the default scenario has no native organism (in production the
// species is a createSim input, never a shared-config edit: docs/SPECIES_SYSTEM_v1.md §4).
// usage: node species-eval.js <repoRoot> <species.json> <speciesId> <worlds.json> <out.json> [--strategies]
const fs = require("fs"), { B, D } = require("./load")(process.argv[2]);
const [, , , SPF, SID, WF, OUT] = process.argv, STRAT = process.argv.includes("--strategies");
const SP = JSON.parse(fs.readFileSync(SPF, "utf8"))[SID];
const cfg = B.play.deriveConfig(D.config, SP.config || {});
const worlds = JSON.parse(fs.readFileSync(WF, "utf8")).filter(w => w.ok);
const CAT = cfg.categories, G = cfg.grow;
function assess(planet) {
  const sim = B.createSim(planet, cfg, D.traits, { rng: () => 0.5 }), M = sim.map;
  let land = 0, origin = null; const lamps = { green: 0, yellow: 0, red: 0 }, limits = {}, grow = { a: 0 };
  let refuges = 0;
  M.SEC.forEach((sec, i) => { const e = sim.evaluate(i), a = M.AREA[i], lamp = sim.lampOf(e.fitness);
    land += a; lamps[lamp] += a; if (e.fitness > G.growThresh) grow.a += a;
    if (i === M.ORIGIN) { const raw = Object.values(e.cats).reduce((p, c) => p * c.f, 1); origin = { raw: +raw.toFixed(3), limit: e.limitKey && e.limitKey + ":" + e.cats[e.limitKey].word }; }
    else if (e.fitness > CAT.lamp.green) refuges++;
    if (lamp !== "green" && e.limitKey) { const k = e.limitKey + ":" + e.cats[e.limitKey].word; limits[k] = (limits[k] || 0) + a; } });
  const sh = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, +(v / land).toFixed(4)]));
  return { habitable: +(lamps.green / land).toFixed(4), lamps: sh(lamps), limits: sh(limits), growable: +(grow.a / land).toFixed(4), origin, refuges };
}
const out = [];
for (const w of worlds) {
  const A = D.archetypes.find(a => a.id === w.planet.archetype.id), r = { seed: w.seed, archetype: A.id, ...assess(w.planet) };
  let t = Date.now(); const wit = B.findWitness(w.planet, cfg, D.traits);
  r.witness = { ok: wit.ok, layer: wit.layer || null, ms: Date.now() - t, early: wit.early || null,
    spent: wit.witness ? wit.witness.totalSpent : null, purchases: wit.witness ? wit.witness.purchases.map(p => p.id) : null,
    winSeconds: wit.witness && wit.witness.winTick != null ? Math.round(wit.witness.winTick * cfg.tickMs / 1000) : null,
    bestStatic: wit.bestStatic ? +wit.bestStatic.coverage.toFixed(3) : null };
  if (STRAT) { t = Date.now(); const P = A.validation; const s = B.findStrategies(w.planet, cfg, D.traits, { minStrategies: P.minStrategies || 1, pacing: P.pacing || null });
    const req = P.requiredConditions || [];
    const all = [...(s.strategies || []), ...(s.slow || [])];
    r.strategies = { status: s.status, layer: s.layer || null, ms: Date.now() - t,
      layer7: s.layer7 ? s.layer7.status : s.status, distinct: s.layer7 ? s.layer7.strategies : 0, layer8: s.layer8 ? s.layer8.status : s.status,
      found: all.length, classes: (s.classes || []).length,
      list: all.map(x => ({ sig: x.signature, build: x.minimalBuild, win: x.winSeconds, margin: x.marginSeconds,
        pacing: x.pacingCheck ? x.pacingCheck.reasons : [], answersRequired: req.every(c => x.tokens.some(tk => tk.startsWith(c + "="))) })) };
  }
  out.push(r);
}
const fb = D.planets.first_bloom, tg = D.planets.training_grounds;
fs.writeFileSync(OUT, JSON.stringify({ species: SID, physiology: SP, worlds: out, firstBloom: assess(fb), trainingGrounds: assess(tg) }));
console.log(SID, WF, out.length);
