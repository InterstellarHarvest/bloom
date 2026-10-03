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
//   competition  (BLOOM-014) optional: a competing native organism with real tile state — see the native_competition entry
//   display      short player-facing copy for the temporary pressure / competition bar, Bloom Report and loss screen (lossNote)
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
        // BLOOM-013: the faster economy shortened runs by about a third, so the clock was rescaled with them (was grace 60 s,
        // decline 420 s → final state at 480 s; now final at 290 s): a normal run lives through the whole decline again, and
        // buying the planet's Eden strategy as if nothing were changing no longer wins (docs/evidence/bloom-013/dying-world-clock-*)
        graceSeconds: 40, durationSeconds: 250,
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
        // BLOOM-013 decision cadence (was margin 300–1200 s, first purchase 30–150 s, gap ≤ 300 s): the same first-purchase and gap
        // limits as Eden; the margin floor (240 s) also rejects a pressure run won before the decline has done much
        pacing: { marginSeconds: [240, 900], firstPurchaseSeconds: [0, 60], maxPurchaseGapSeconds: 120 },
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
    {
      id: "native_competition", name: "Native Competition",
      intent: "The planet is already alive: native vegetation, adapted to the planet's starting conditions, holds part of the land and spreads into open ground. The player's plant competes with it for light, water, nutrients and space at moving fronts, finds the places it can win, strengthens vulnerable colonies, and decides whether to adapt the organism or alter the environment. The competitor reacts locally to what the player does; there is no clock.",
      pressure: null,
      // BLOOM-014 generic competition mechanism (resources/bloom-sim.js; the engine never names this scenario):
      //   tolerance  the native's comfort windows: the baseline plant's (content/config.js genomeBase) width × breadth, centred
      //              `adaptation` of the way from the baseline centre to the planet's median STARTING ground; salt/radiation
      //              limits move the same way toward the hardyShare quantile of the starting land
      //   start      starting native cover (from the planet, never the run RNG): coverShare of the colonizable land, in
      //              `patches` blobs on ground the native can grow on, stand density × the native's fitness there; nothing
      //              within originBufferTiles of the origin region; no landmass more than maxLandmassShare native-held
      //   growth     the native's own spread / establishment rules (same meaning as config.grow / config.establish)
      //   contest    at a front, attack = min(vigor, 1) (the native's × nativeVigour: 1 = as vigorous as the player's plant
      //              where each is equally suited) and defence = the defender's attack × (holdBase + (1 − holdBase) × its
      //              support: its colony's mean stand density in the region, or its local stand); a front tile flips to the
      //              attacker at the attacker's spread chance × min(1, (attack − defence) / scale).
      //              crowding: stands thicken this much slower when all 4 neighbours belong to the other organism
      //   events     feedback thresholds: contestedTiles front tiles make a region contested; advantageMargin (of the mean
      //              push difference at its fronts) names a side; a region is native-dominated at dominatedShare native cover with the player under
      //              dominatedPlayerBelow; a NET loss of retakeTiles player tiles within ~windowSeconds is a retake
      competition: {
        tolerance: { adaptation: 0.5, breadth: 1.0, hardyShare: 0.75 },
        start: { coverShare: [0.26, 0.32], density: [0.6, 0.9], patches: [4, 7], originBufferTiles: 5, maxLandmassShare: 0.6 },
        growth: { growThresh: 0.55, dieThresh: 0.35, spread: 0.02, seedPerNeighbor: 0.34, seedlingDensity: 0.15, rate: 0.004,
                  thinning: 0.01, minDensity: 0.04, vigorEase: 0.2 },
        contest: { nativeVigour: 1.0, holdBase: 0.4, scale: 0.3, crowding: 0.5 },
        events: { contestedTiles: 4, advantageMargin: 0.08, dominatedShare: 0.5, dominatedPlayerBelow: 0.1, retakeTiles: 6, windowSeconds: 20 },
      },
      loss: { extinction: true, extinctionGraceSeconds: 8 },
      validation: {
        // a witness must still hold the win threshold 60 s after its margin, and win + hold again under two more simulation seeds
        minStrategies: 1, holdFinalSeconds: 60, confirmRngSeeds: [101, 202],
        pacing: { marginSeconds: [240, 900], firstPurchaseSeconds: [0, 60], maxPurchaseGapSeconds: 120 },
        archetypes: {},
      },
      display: {
        title: "Native Competition",
        summary: "This planet already has native vegetation. It competes with your plant for light, water, nutrients and space.",
        lossNote: "native vegetation overgrew your last colonies. Where the two plants meet, the one better suited to the ground pushes, and established colonies hold while young ones can be overgrown. Spread into ground that suits your plant better than the natives (Adapt), change the sky so their strongholds suit them less (Terraform), or thicken a threatened young colony (Roots).",
      },
    },
  ];
})(typeof window !== "undefined" ? window : globalThis);
