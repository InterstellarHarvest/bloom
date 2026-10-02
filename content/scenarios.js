// BLOOM — pressure scenarios (bible §11.3), as data. BLOOM-012.
// A scenario is NOT a planet: any planet (an archetype world or an authored one) runs under any scenario that accepts it.
// The engine (resources/bloom-sim.js, createSim(…, { scenario })) reads one definition; nothing here is code.
//
//   pressure     null = no outside pressure (Eden). Otherwise the world changes over the run, through the SAME
//                environmental inputs the player already reads:
//                  graceSeconds     time before the decline starts (the starting planet, unchanged)
//                  durationSeconds  time from the start of the decline to the final state; progress rises linearly 0 → 1
//                                   and then stays at 1 (the final, degraded world — reaching it is not a loss)
//                  channels         the maximum drift at progress 1, scaled by progress before that:
//                                     temperature  °C added to the sky temperature (every region)
//                                     moisture     points added to the sky moisture (every region; clamped 0..100)
//                                     moistureShare  fraction of the planet's STARTING sky moisture lost (−0.4 = the air
//                                                  ends up 40% drier than it began: a humid world loses more points
//                                                  than an already dry one)
//                                     radiation    points added to every land region's surface radiation
//                  graceLabel       readout name for the grace period
//                  phases           readable stages [{ from: progress, id, name, note }]; entering one is a milestone
//   loss         extinction: true → the run is lost when no Living tile is left anywhere for extinctionGraceSeconds
//   validation   the scenario layer (resources/bloom-scenario.js): what a planet + this scenario must prove before the
//                combination is accepted — a real witness under real pressure that wins with margin (minStrategies
//                distinct broad strategies) inside the pacing bands, and still holds the win threshold holdFinalSeconds
//                after the final state is reached. archetypes: per-archetype decisions ("allowed" / "disallowed" + reason)
//   display      short player-facing copy for the temporary pressure bar / Bloom Report
// Terraform never touches scenario progress: it changes the player's sky; the scenario drift is added on top of it.
(function (root) {
  "use strict";
  const D = root.BLOOM_DATA || (root.BLOOM_DATA = { planets: {} });
  D.scenarios = [
    {
      id: "eden", name: "Eden",
      intent: "No outside pressure: the planet stays as it is. Open experimentation (bible §11.2).",
      pressure: null,
      loss: { extinction: false },
      display: { title: "Eden", summary: "No outside pressure. The planet stays as it is." },
    },
    {
      id: "dying_world", name: "Dying World",
      intent: "Habitability steadily degrades: the planet is losing its atmosphere, so the world itself turns drier, colder and more exposed to radiation through the environmental model the player already reads. An earlier solution stops being enough; the player protects, adapts, Terraforms or gives ground up.",
      pressure: {
        graceSeconds: 60, durationSeconds: 420,
        channels: { moistureShare: -0.4, temperature: -8, radiation: 8 },
        graceLabel: "Atmosphere stable (for now)",
        phases: [
          { from: 0,    id: "early",  name: "Early decline",     note: "The air is starting to thin." },
          { from: 0.34, id: "loss",   name: "Noticeable loss",   note: "Drier, colder, more radiation: check your edge regions." },
          { from: 0.67, id: "severe", name: "Severe decline",    note: "Regions near their limits are tipping over." },
          { from: 1,    id: "final",  name: "Final harsh state", note: "The atmosphere has settled thin. Conditions stop changing." },
        ],
      },
      loss: { extinction: true, extinctionGraceSeconds: 8 },
      validation: {
        minStrategies: 1, holdFinalSeconds: 60,
        pacing: { marginSeconds: [300, 1200], firstPurchaseSeconds: [30, 150], maxPurchaseGapSeconds: 300 },
        archetypes: {},
      },
      display: {
        title: "Dying World · Atmosphere thinning",
        summary: "The planet is slowly losing atmosphere. Conditions are becoming drier and colder, and surface radiation is increasing.",
        channels: {
          moisture:    "drier: thinner air holds less water vapour",
          temperature: "colder: less greenhouse warming",
          radiation:   "more radiation: less air shields the surface",
        },
      },
    },
  ];
})(typeof window !== "undefined" ? window : globalThis);
