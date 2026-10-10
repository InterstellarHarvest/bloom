// BLOOM — background world search for the player flow (BLOOM-016). Runs BLOOM.play.searchWorld off the page's main thread so
// the loading screen stays responsive (some planet + scenario checks take many seconds) and Cancel can stop it at once
// (the page terminates the worker). Same production modules as the page, nothing duplicated.
// Browsers refuse workers on file:// pages; demos/demo-run.html then runs the same search on the main thread between frames.
//   in:  { archetypeId, scenarioId, seeds }
//   out: { type: "step", step } … then { type: "done", result } or { type: "error", message }
"use strict";
importScripts("../content/config.js", "../content/traits.js", "../content/species.js", "../planets/first_bloom.js", "../content/archetypes.js", "../content/scenarios.js",
  "bloom-sim.js", "bloom-species.js", "bloom-gen.js", "bloom-validate.js", "bloom-witness.js", "bloom-archetype.js", "bloom-scenario.js", "bloom-play.js");
self.onmessage = e => {
  const { archetypeId, scenarioId, seeds } = e.data, D = self.BLOOM_DATA;
  try {
    const archetype = D.archetypes.find(a => a.id === archetypeId);
    const scenario = scenarioId ? self.BLOOM.pressure.resolveScenario(D.scenarios, scenarioId) : null;
    if (!archetype) throw new Error(`unknown planet ${archetypeId}`);
    const result = self.BLOOM.play.runSearch({ archetype, scenario, seeds, config: D.config, traits: D.traits }, step => self.postMessage({ type: "step", step }));
    self.postMessage({ type: "done", result });
  } catch (err) { self.postMessage({ type: "error", message: String(err && err.message || err) }); }
};
