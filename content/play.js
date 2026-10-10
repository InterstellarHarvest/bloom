// BLOOM — player launch flow (BLOOM-016), as data. The one canonical source for the launcher's own copy and policy.
// Planet and scenario card copy lives with the planet / scenario data (content/archetypes.js `display`, content/scenarios.js
// `display`); this file holds only what belongs to the flow itself: the home premise, the First Bloom entry, the briefing
// reminders, the loading-step labels, the world-search policy and the post-run action labels.
// Temporary shell copy, not final UI: the run-screen layout is chosen later in the PMO / owner design-reference review.
//
//   search      maxCandidates  how many automatically chosen World Seeds one New Run may try before it stops with a friendly
//                              failure (each candidate is the full production path: archetype layers 1–8, then the scenario's
//                              layer P when the scenario changes the run). Never a different planet or scenario.
//               seedMin/seedMax  range of automatically chosen World Seeds (short enough to read back and replay)
(function (root) {
  "use strict";
  const D = root.BLOOM_DATA || (root.BLOOM_DATA = { planets: {} });
  D.play = {
    home: {
      title: "BLOOM",
      premise: "Grow an alien plant across a new world. Adapt your organism, spread to new ground, and reshape the climate to keep at least {win}% of the planet alive.",
      howTo: [
        "Your plant spreads by itself into ground it can live on.",
        "Click a region to see what is holding your plant back there.",
        "Spend Biomass on upgrades to answer it, and give up ground you cannot hold.",
      ],
    },
    firstBloom: {
      planetId: "first_bloom",
      name: "First Bloom",
      tagline: "A small hand-made world. Recommended first run.",
      summary: "Nine regions, no outside pressure: a gentle place to learn how the plant spreads, what blocks it and how upgrades help.",
      action: "Start with First Bloom",
    },
    choose: { action: "Choose a New Planet", planetsTitle: "Choose a planet", scenariosTitle: "Choose a scenario",
      planetsNote: "Each planet is generated fresh: a new map every time, with the same character.",
      scenariosNote: "A scenario changes the kind of problem, not just how hard it is." },
    briefing: {
      goal: "Keep {win}% of the land your plant could live on alive at the same time.",
      reminders: [
        { verb: "Adapt", text: "changes your plant." },
        { verb: "Terraform", text: "changes the planet." },
        { verb: "Spread", text: "helps your plant reach new ground." },
      ],
      start: "Start",
    },
    loading: {
      title: "Preparing planet…",
      steps: {
        terrain:  "Shaping the terrain and checking your plant can reach new ground…",
        scenario: "Checking the scenario on this world…",
        retry:    "That world was not a fair fit for {scenario}. Finding another…",
        ready:    "World ready.",
      },
      slowNote: "Some worlds take a little longer to check.",
      cancel: "Cancel",
    },
    failure: {
      title: "No playable world found",
      body: "We could not find a fair {planet} for {scenario} this time. Nothing was started, and no other planet or scenario was swapped in.",
      replayBody: "This World Seed no longer makes a fair {planet} for {scenario}. Nothing was started.",
      badLink: "That planet or scenario is not available. Nothing was started.",
      retry: "Try again",
      change: "Change selection",
    },
    actions: {
      playAgain: "Play this world again",
      playAgainNote: "Same planet, same World Seed, same scenario. A fresh start: your choices make the run.",
      newWorld: "Same planet, new world",
      changeScenario: "Change scenario",
      changePlanet: "Change planet",
      home: "Home",
      menu: "Menu",
      confirmLeave: "Leave this run? It will not be saved.",
    },
    search: { maxCandidates: 6, seedMin: 1, seedMax: 99999 },
    // (BLOOM-029F) an expedition run: the exact planet chosen in the Destination Survey, played as it was selected (never regenerated
    // from its World Seed). Its post-run actions. (BLOOM-033: the run never leaves index.html, so the old handoff failure states — a
    // missing / foreign / corrupt expedition link, "lives only in this tab" — cannot happen any more and their copy is gone.)
    expedition: {
      playAgain: "Play again",
      playAgainNote: "This exact planet, exactly as surveyed. A fresh start: your choices make the run.",
      choosePlanet: "Choose another planet",
      choosePlanetNote: "Back to the Destination Survey to pick a different destination.",
      mainMenu: "Main menu",
      mainMenuNote: "Back to the title.",
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
