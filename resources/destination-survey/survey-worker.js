// BLOOM — Destination Survey background worker (BLOOM-028A; validated column tasks BLOOM-028A1, module worker). Builds ONE
// COLUMN of a sector — three FULLY VALIDATED worlds of one class — off the page's main thread, so the spinning globes never
// hitch while worlds are validated (~0.5–1.1 s each, a few seconds a column). DestinationSurvey runs up to three of these in
// parallel (one per column). Same production modules as the page, nothing duplicated: the BLOOM classic scripts are imported
// for their side effects (each attaches itself to globalThis), then survey-data.js does the work through the play flow's own
// validation path (BLOOM.play.runSearch). DestinationSurvey falls back to the main thread if this worker can't start.
//   in:  { id, sectorSeed, column, firstBloom }                         a whole column, sequentially (028A1 task)
//        { id, type: "plan", sectorSeed, column, firstBloom, fromDraw, want }   the column's next predicted picks (028B)
//        { id, type: "validate", archetypeId, seed }                     ONE fully validated candidate, or null (028B)
//   out: { id, progress: { found, draws, validations } } … (column task only), then { id, result } or { id, error }
import "../../content/config.js";
import "../../content/traits.js";
import "../../planets/first_bloom.js";
import "../../content/archetypes.js";
import "../../content/scenarios.js";
import "../../content/play.js";
import "../bloom-sim.js";
import "../bloom-gen.js";
import "../bloom-validate.js";
import "../bloom-witness.js";
import "../bloom-archetype.js";
import "../bloom-scenario.js";
import "../bloom-play.js";
import { columnCandidates, planColumn, makeCandidate } from "./survey-data.js";

self.onmessage = e => {
  const { id, type, sectorSeed, column, firstBloom } = e.data;
  try {
    if (type === "plan") { self.postMessage({ id, result: planColumn(sectorSeed, column, undefined, { firstBloom, fromDraw: e.data.fromDraw, want: e.data.want }) }); return; }
    if (type === "validate") { self.postMessage({ id, result: makeCandidate({ archetypeId: e.data.archetypeId, seed: e.data.seed }) }); return; }
    const it = columnCandidates(sectorSeed, column, undefined, { firstBloom });
    for (;;) { const r = it.next(); if (r.done) { self.postMessage({ id, result: r.value }); return; } self.postMessage({ id, progress: r.value }); }
  } catch (err) { self.postMessage({ id, error: String((err && err.message) || err) }); }
};
