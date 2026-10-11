// BLOOM — Challenges (BLOOM-036A foundation; BLOOM-036B contained-Challenge launch; design: docs/CHALLENGES_SYSTEM_v1.md). Classic script (not JSON + fetch) so it loads over file://
// like every content file. Resolved, validated and frozen by resources/bloom-challenges.js (BLOOM.challenges.resolve(id) — an unknown
// id THROWS, never a silent fallback).
//
// A CHALLENGE IS NOT A SCENARIO. A scenario (content/scenarios.js) is simulation mechanics the engine runs; a Challenge is a product
// definition — what the player is offered on the CHALLENGES hub, how a run of it is launched and how it is completed — that REFERENCES
// one scenario by id. Nothing here is engine code and nothing here restates a mechanic: no pressure, competition, climate-instability,
// validation or loss numbers (resources/bloom-challenges.js refuses those keys).
//
//   id             stable lower_snake id — part of run provenance and the report. Never renamed.
//   version        the definition's revision (presentation / launch / completion)
//   status         "released" (on the hub). All three are released (a "fixture" status exists for QA only: BLOOM.challenges.fixture).
//   name           the Challenge's name (hub, survey, run, report)
//   short          one line for the hub card
//   scenario       the scenario id the run plays (a real, non-default scenario of content/scenarios.js)
//   presentation   tagline · briefing · strategicIdea · icon · science. A string starting with "@scenario." is a REFERENCE to the scenario's
//                  own player-facing copy (the source of truth: never copied here); only copy the hub needs and the scenario does not have
//                  is written here. icon = a key of the shared icon family (resources/ui/bloom-icons.js).
//   launch         (036B, schema 2) how a run of it is launched — the contained-Challenge model, NO Destination Survey:
//                    species        { policy: "player-choice" }  the normal Choose Plant Species screen, every released species
//                                   { policy: "prescribed", species }  that species (the species screen is skipped) — none released yet
//                    world          { policy: "recipe", recipe }  ONE world generated for the launch from the RECIPE: product-level
//                                   constraints on which finished world of the normal physical stream is accepted (resources/challenges/
//                                   challenge-world.js) — version · archetypes · arrival · nativeCover. Calibrated by the read-only study
//                                   docs/evidence/bloom-036b/CHALLENGE_RECIPE_STUDY.md; a recipe never changes a planet
//                    startingState  { policy: "normal" }  nothing owned at landing, the normal starting Biomass
//                                   { policy: "prescribed", adaptations, biomass }  — none released yet (QA fixtures only)
//   completion     win "bloom" — the normal Bloom win (the planet's own threshold); conditions [] — reserved for later Challenge-specific
//                  conditions, none yet
// VERSIONS. `version` is the definition's revision; `launch.world.recipe.version` the recipe's. The recipe decides which planet a launch
// generates, so changing a released recipe is an explicit change of BOTH (an old instance is never reinterpreted under new recipe data).
// 036B: every Challenge is version 2 (036A's version 1 launched through the Destination Survey), recipe version 1.
// No difficulty labels anywhere: no Easy / Medium / Hard, no stars, no recommended skill. The hub lists Challenges in this order, which
// is not a ranking.
(function (root) {
  "use strict";
  const D = root.BLOOM_DATA || (root.BLOOM_DATA = { planets: {} });
  // the three initial Challenges: the player chooses the plant, nothing is owned at landing (036B directive: the new prescribed-species and
  // starting-state capabilities are proven on QA fixtures, not forced onto these)
  const PLAYER_CHOICE = { policy: "player-choice" }, NORMAL_START = { policy: "normal" };
  const ALL_ARCHETYPES = ["ocean_archipelago", "desert_world", "frozen_world"];
  D.challenges = [
    {
      id: "dying_world", version: 2, status: "released",
      name: "Dying World",
      short: "@scenario.display.card.tagline",
      scenario: "dying_world",
      presentation: {
        tagline: "@scenario.display.card.detail",
        briefing: "@scenario.display.summary",
        strategicIdea: "@scenario.display.card.cue",
        icon: "pressure",
        science: "@scenario.display.channels",
      },
      // recipe (docs/evidence/bloom-036b/CHALLENGE_RECIPE_STUDY.md): intentionally BROAD — layer P alone keeps the decline decisive (every
      // passing world reaches its margin ≥ 240 s in, at ≥ 80% of the decline, and must hold 60 s into the final state); 83–93% of the stream
      // qualifies for every species
      launch: { species: { ...PLAYER_CHOICE }, world: { policy: "recipe", recipe: { version: 1, archetypes: [...ALL_ARCHETYPES], arrival: null, nativeCover: null } }, startingState: { ...NORMAL_START } },
      completion: { win: "bloom", conditions: [] },
    },
    {
      id: "native_competition", version: 2, status: "released",
      name: "Native Competition",
      short: "@scenario.display.card.tagline",
      scenario: "native_competition",
      presentation: {
        tagline: "@scenario.display.card.detail",
        briefing: "@scenario.display.summary",
        strategicIdea: "@scenario.display.card.cue",
        icon: "competition",
        // the scenario has no science line of its own; the hub's context, in the terms of the mechanic (stands that are established hold,
        // young ones can be overgrown; the better-suited plant pushes at a front)
        science: "Real ecosystems (a simplified game model): plants already living somewhere are suited to its conditions. A newcomer gains ground where it suits the ground better than they do, and established stands hold their ground better than young ones.",
      },
      // recipe: the plant starts with a real foothold — ≥ 20% of the land suits it on arrival (the survey's Extreme / Precarious boundary).
      // A contest needs ground to contest: on Extreme-arrival worlds the study's layer-P failures concentrate (the plant dies out under
      // established natives, or no build reaches the margin) and the start is about surviving, not competing. Native cover itself needs no
      // constraint (every sampled world starts with ≥ 9% native cover and the witnesses meet contested fronts)
      launch: { species: { ...PLAYER_CHOICE }, world: { policy: "recipe", recipe: { version: 1, archetypes: [...ALL_ARCHETYPES], arrival: { minHabitable: 0.20 }, nativeCover: null } }, startingState: { ...NORMAL_START } },
      completion: { win: "bloom", conditions: [] },
    },
    {
      id: "volatile_climate", version: 2, status: "released",
      name: "Volatile Climate",
      short: "@scenario.display.card.tagline",
      scenario: "volatile_climate",
      presentation: {
        tagline: "@scenario.display.card.detail",
        briefing: "@scenario.display.summary",
        strategicIdea: "@scenario.display.card.cue",
        icon: "climate",
        science: "@scenario.display.science",
      },
      // recipe: intentionally BROAD — layer P (pacing, a Terraform-heavy witness must live through a real shock, confirmation seeds) is the
      // proof; capping the arrival share would not change how often the mechanic is met (the study), so no constraint is added for symmetry
      launch: { species: { ...PLAYER_CHOICE }, world: { policy: "recipe", recipe: { version: 1, archetypes: [...ALL_ARCHETYPES], arrival: null, nativeCover: null } }, startingState: { ...NORMAL_START } },
      completion: { win: "bloom", conditions: [] },
    },
  ];
})(typeof window !== "undefined" ? window : globalThis);
