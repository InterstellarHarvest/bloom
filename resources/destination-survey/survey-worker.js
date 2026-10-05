// BLOOM — Destination Survey background worker (BLOOM-028A, module worker). Builds a sector off the page's main thread so
// the nine spinning globes never hitch while worlds are generated (~5–120 ms each, ~0.4 s a sector). Same production modules
// as the page, nothing duplicated: the BLOOM classic scripts are imported for their side effects (each attaches itself to
// globalThis), then survey-data.js does the work. DestinationSurvey falls back to the main thread if this worker can't start.
//   in:  { id, sectorSeed, firstBloom }
//   out: { id, sector } or { id, error }
import "../../content/config.js";
import "../../content/traits.js";
import "../../planets/first_bloom.js";
import "../../content/archetypes.js";
import "../../content/play.js";
import "../bloom-sim.js";
import "../bloom-gen.js";
import "../bloom-validate.js";
import "../bloom-witness.js";
import "../bloom-archetype.js";
import { buildSector } from "./survey-data.js";

self.onmessage = e => {
  const { id, sectorSeed, firstBloom } = e.data;
  try { self.postMessage({ id, sector: buildSector(sectorSeed, undefined, { firstBloom }) }); }
  catch (err) { self.postMessage({ id, error: String((err && err.message) || err) }); }
};
