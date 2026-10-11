// BLOOM — Challenges (BLOOM-036A; design: docs/CHALLENGES_SYSTEM_v1.md). Classic script (not JSON + fetch) so it loads over file://
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
//   status         "released" (on the hub). BLOOM-036A: all three are released.
//   name           the Challenge's name (hub, survey, run, report)
//   short          one line for the hub card
//   scenario       the scenario id the run plays (a real, non-default scenario of content/scenarios.js)
//   presentation   tagline · briefing · strategicIdea · icon · science. A string starting with "@scenario." is a REFERENCE to the scenario's
//                  own player-facing copy (the source of truth: never copied here); only copy the hub needs and the scenario does not have
//                  is written here. icon = a key of the shared icon family (resources/ui/bloom-icons.js).
//   launch         036A policies (deliberately simple; the only values accepted today):
//                    species        "player-choice"       the normal Choose Plant Species screen, all released species
//                    world          "destination-survey"  the species-relative Destination Survey, every world also validated for the
//                                                         scenario (survey-data.js scenario layer); no authored Challenge worlds yet
//                    startingState  "none"                no owned adaptations, no special Biomass
//                    seed           "sector"              the survey's sector-seed stream: normal physical planet generation
//   completion     win "bloom" — the normal Bloom win (the planet's own threshold); conditions [] — reserved for later Challenge-specific
//                  conditions (BLOOM-036B+), none in 036A
// No difficulty labels anywhere: no Easy / Medium / Hard, no stars, no recommended skill. The hub lists Challenges in this order, which
// is not a ranking.
(function (root) {
  "use strict";
  const D = root.BLOOM_DATA || (root.BLOOM_DATA = { planets: {} });
  const LAUNCH_036A = { species: "player-choice", world: "destination-survey", startingState: "none", seed: "sector" };
  D.challenges = [
    {
      id: "dying_world", version: 1, status: "released",
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
      launch: { ...LAUNCH_036A },
      completion: { win: "bloom", conditions: [] },
    },
    {
      id: "native_competition", version: 1, status: "released",
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
      launch: { ...LAUNCH_036A },
      completion: { win: "bloom", conditions: [] },
    },
    {
      id: "volatile_climate", version: 1, status: "released",
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
      launch: { ...LAUNCH_036A },
      completion: { win: "bloom", conditions: [] },
    },
  ];
})(typeof window !== "undefined" ? window : globalThis);
