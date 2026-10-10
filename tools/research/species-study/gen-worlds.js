"use strict";
// Phase 1: the species-INDEPENDENT physical sample. For each archetype, a fixed deterministic list of World Seeds; each goes through
// the survey's own production path (BLOOM.play.runSearch, default scenario → generateFromArchetype layers 1–8 → stripPlanet).
// usage: node gen-worlds.js <repoRoot> <archetypeId> <nSeeds> <out.json>
const fs = require("fs"), { B, D } = require("./load")(process.argv[2]);
const [, , , AID, N, OUT] = process.argv;
const A = D.archetypes.find(a => a.id === AID), idx = D.archetypes.indexOf(A);
const rng = B.gen.mulberry32(0x035A0000 + idx * 7919), seeds = new Set();
while (seeds.size < +N) seeds.add(1 + Math.floor(rng() * 99999));
const out = [];
for (const seed of seeds) {
  const t = Date.now(), r = B.play.runSearch({ archetype: A, scenario: null, seeds: [seed], config: D.config, traits: D.traits });
  out.push(r.ok ? { seed, ok: true, ms: Date.now() - t, planet: r.planet } : { seed, ok: false, ms: Date.now() - t });
}
fs.writeFileSync(OUT, JSON.stringify(out));
console.log(AID, "seeds", out.length, "validated", out.filter(x => x.ok).length);
