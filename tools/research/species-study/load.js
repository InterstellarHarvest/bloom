"use strict";
// loads the BLOOM classic scripts (read-only) from a repo root into globalThis
const path = require("path");
module.exports = (ROOT = path.resolve(__dirname, "../../..")) => {
  for (const f of ["content/config.js","content/traits.js","planets/first_bloom.js","planets/training_grounds.js","content/archetypes.js","content/scenarios.js","content/play.js",
   "resources/bloom-sim.js","resources/bloom-gen.js","resources/bloom-validate.js","resources/bloom-witness.js","resources/bloom-archetype.js","resources/bloom-scenario.js","resources/bloom-play.js"]) require(path.join(ROOT, f));
  return { B: globalThis.BLOOM, D: globalThis.BLOOM_DATA };
};
