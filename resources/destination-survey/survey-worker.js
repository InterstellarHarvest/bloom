// BLOOM — Destination Survey background worker (BLOOM-028A; validated column tasks BLOOM-028A1, module worker). Builds ONE
// COLUMN of a sector — three FULLY VALIDATED worlds of one class — off the page's main thread, so the spinning globes never
// hitch while worlds are validated (~0.5–1.1 s each, a few seconds a column). DestinationSurvey runs up to three of these in
// parallel (one per column). Same production modules as the page, nothing duplicated: the BLOOM classic scripts are imported
// for their side effects (each attaches itself to globalThis), then survey-data.js does the work through the play flow's own
// validation path (BLOOM.play.runSearch). DestinationSurvey falls back to the main thread if this worker can't start.
//   in:  { id, sectorSeed, column, firstBloom, species }                         a whole column, sequentially (028A1 task)
//        { id, type: "plan", sectorSeed, column, firstBloom, fromDraw, want, species }   the column's next predicted picks (028B)
//        { id, type: "validate", archetypeId, seed, species }                   ONE fully validated candidate for that species, or null
//        { id, type: "evaluate", physical, species }                           (035B) the species EVALUATION of a physical candidate the
//                                                                                page already holds (no planet in the result)
//   out: { id, progress: { found, draws, validations } } … (column task only), then { id, result } or { id, error }
// (035B) `species` = { id, physiologyKey }: the worker resolves the id itself (BLOOM.species.resolve — an unknown id is an error) and
// refuses a physiology that is not the page's (no object crosses the boundary, no silent substitution). Each worker keeps a small
// species-free cache of STRUCTURAL worlds, so predicting a draw for a second species costs only its assessment.
import "../../content/config.js";
import "../../content/traits.js";
import "../../content/species.js";
import "../../planets/first_bloom.js";
import "../../content/archetypes.js";
import "../../content/scenarios.js";
import "../../content/play.js";
import "../bloom-sim.js";
import "../bloom-species.js";
import "../bloom-gen.js";
import "../bloom-validate.js";
import "../bloom-witness.js";
import "../bloom-archetype.js";
import "../bloom-scenario.js";
import "../bloom-play.js";
import { columnCandidates, planColumn, makeCandidate, evaluateSpecies, speciesFor } from "./survey-data.js";

const cache = { physical: null, evaluation: null, structural: new Map(), stats: { physicalHits: 0, physicalMisses: 0, evaluationHits: 0, evaluationMisses: 0 } };

self.onmessage = e => {
  const { id, type, sectorSeed, column, firstBloom } = e.data;
  try {
    const species = speciesFor(e.data.species || null);   // throws on an unknown id or a physiology other than the page's
    if (type === "plan") { self.postMessage({ id, result: planColumn(sectorSeed, column, undefined, { firstBloom, fromDraw: e.data.fromDraw, want: e.data.want, species, cache }) }); return; }
    if (type === "validate") { self.postMessage({ id, result: makeCandidate({ archetypeId: e.data.archetypeId, seed: e.data.seed }, undefined, { species, cache }) }); return; }
    if (type === "evaluate") { self.postMessage({ id, result: evaluateSpecies(e.data.physical, species) }); return; }
    const it = columnCandidates(sectorSeed, column, undefined, { firstBloom, species, cache });
    for (;;) { const r = it.next(); if (r.done) { self.postMessage({ id, result: r.value }); return; } self.postMessage({ id, progress: r.value }); }
  } catch (err) { self.postMessage({ id, error: String((err && err.message) || err) }); }
};
