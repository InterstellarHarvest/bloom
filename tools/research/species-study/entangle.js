"use strict";
// Planet-identity entanglement (read-only): what WOULD happen if the selected species' physiology were fed into world construction
// (generateFromArchetype's attempt loop). Compares, per (archetype, seed), the reference world (today's production path) with the world
// the same path produces under a specialist physiology: same planet / a different planet (another attempt k) / no world at all.
// usage: node entangle.js <repoRoot> <species.json> <speciesId> <worlds.json> <nSeeds> <out.json>
const fs = require("fs"), { B, D } = require("./load")(process.argv[2]);
const [, , , SPF, SID, WF, NS, OUT] = process.argv;
const cfg = B.play.deriveConfig(D.config, JSON.parse(fs.readFileSync(SPF, "utf8"))[SID].config || {});
const fp = p => { const { id, name, gridWidth, gridHeight, topology, origin, globalClimate, sections, tilemap } = p; return B.archetype.fnv1a(JSON.stringify([id, name, gridWidth, gridHeight, topology, origin, globalClimate, sections, tilemap])); };
const worlds = JSON.parse(fs.readFileSync(WF, "utf8")).slice(0, +NS), out = [];
for (const w of worlds) {
  const A = D.archetypes.find(a => a.id === (w.planet ? w.planet.archetype.id : WF.match(/worlds\/(\w+)\.json/)[1]));
  const r = B.play.runSearch({ archetype: A, scenario: null, seeds: [w.seed], config: cfg, traits: D.traits });
  const ref = w.ok ? { k: w.planet.archetype.attempt, fp: fp(w.planet) } : null, sp = r.ok ? { k: r.planet.archetype.attempt, fp: fp(r.planet) } : null;
  out.push({ seed: w.seed, ref, sp, outcome: !ref && !sp ? "neither" : !sp ? "species-none" : !ref ? "species-only" : ref.fp === sp.fp ? "same" : "different" });
}
fs.writeFileSync(OUT, JSON.stringify({ species: SID, worlds: WF, out }));
const c = {}; out.forEach(o => c[o.outcome] = (c[o.outcome] || 0) + 1); console.log(SID, WF, JSON.stringify(c));
