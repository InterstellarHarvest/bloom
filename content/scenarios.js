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
//   climateInstability (BLOOM-015) optional: the player's own Terraform unsettles the climate and causes temporary shocks —
//                see the volatile_climate entry
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
    {
      id: "volatile_climate", name: "Volatile Climate",
      intent: "Terraforming is powerful, but changing a whole planet's climate quickly pushes it out of balance before it settles. Each Terraform step unsettles the part of the climate it changes (temperature or moisture); heavy or closely spaced steps compound; the climate settles back on its own. An axis that stays unsettled enough swings: a temporary heat pulse, cold snap, wet surge or dry spell, announced a few seconds ahead, through the same sky the player already reads. Permanent Terraform stays. There is no clock: a plant that adapts instead of reshaping the sky meets little instability.",
      pressure: null,
      // BLOOM-015 generic climate-instability mechanism (resources/bloom-sim.js; the engine never names this scenario):
      //   baseline   starting (and resting) instability of every axis, 0..1
      //   axes       the sky axes Terraform can unsettle: unit = the size of one Terraform step on that axis (°C / moisture
      //              points) — forcing is counted in steps; magnitude = [lo, hi] size of a shock's swing (°C / points), lo at
      //              the threshold, hi at full instability; up / down = the shock kinds when it swings up / down
      //   forcing    one Terraform step adds perStep × (1 + compounding × recent), where recent = Terraform steps on that axis,
      //              each fading with time constant memorySeconds: closely spaced steps on one axis compound
      //   settling   instability relaxes toward the baseline with this half-life (no purchase needed)
      //   shocks     an axis at or above threshold announces a shock warningSeconds ahead; it lasts durationSeconds (ramping in
      //              and out over rampSeconds), releases `release` of the axis's excess instability when it starts, then the
      //              axis is quiet for quietSeconds; overshootShare of shocks continue the recent forcing (warming → heat
      //              pulse), the rest swing back (warming → cold snap) — chosen by a planet-derived hash, never the run RNG
      //   bands      readable states of the overall instability (the most unsettled axis)
      climateInstability: {
        baseline: 0.05,
        axes: {
          temp:  { unit: 6, magnitude: [8, 14],  up: { id: "heat_pulse", name: "Heat pulse" }, down: { id: "cold_snap", name: "Cold snap" } },
          moist: { unit: 8, magnitude: [12, 22], up: { id: "wet_surge",  name: "Wet surge" },  down: { id: "dry_spell", name: "Dry spell" } },
        },
        forcing: { perStep: 0.3, compounding: 0.6, memorySeconds: 90 },
        settling: { halfLifeSeconds: 75 },
        shocks: { threshold: 0.55, warningSeconds: 12, durationSeconds: 45, rampSeconds: 8, release: 0.4, quietSeconds: 20, overshootShare: 0.5 },
        bands: [
          { from: 0,    id: "stable",    name: "Stable",    note: "The climate is settled." },
          { from: 0.3,  id: "unsettled", name: "Unsettled", note: "Recent Terraforming is still working through the climate." },
          { from: 0.55, id: "volatile",  name: "Volatile",  note: "Unsettled enough to swing: expect a temporary shock." },
          { from: 0.8,  id: "critical",  name: "Critical",  note: "Strong, repeated forcing: shocks will be large." },
        ],
      },
      loss: { extinction: true, extinctionGraceSeconds: 8 },
      validation: {
        // a witness must still hold the win threshold 60 s after the later of its margin and its last shock; a Terraform-heavy
        // witness (≥ 2 Terraform steps) counts only if it lived through a real shock
        minStrategies: 1, holdFinalSeconds: 60, confirmRngSeeds: [101, 202],
        mechanicEvidence: { terraformSteps: 2, minShocks: 1 },
        pacing: { marginSeconds: [240, 900], firstPurchaseSeconds: [0, 60], maxPurchaseGapSeconds: 120 },
        archetypes: {},
      },
      display: {
        title: "Volatile Climate",
        summary: "Terraforming changes the whole planet's climate. Change it too fast and the climate becomes unstable: it can swing to temporary extremes before it settles.",
        science: "Climate instability (a simplified game model): rapid changes to a planet's climate can push connected systems out of balance. Feedbacks can make the climate overshoot or swing back before it settles, so heavy Terraforming can cause temporary temperature or moisture extremes. Real climates do not respond the same way to every change, and one action does not cause one heat wave; this model only shows the idea that fast, large forcing brings more variability.",
        axes: { temp: "temperature", moist: "moisture" },
        lossNote: "a climate shock pushed your last colonies past what your plant tolerates. Shocks come from Terraforming: each step unsettles the climate, steps close together compound, and the climate settles on its own. Adapting the plant (Adapt) adds no instability; spacing Terraform steps, or giving colonies some tolerance beyond the new sky, lets them ride out a swing.",
      },
    },
  ];
})(typeof window !== "undefined" ? window : globalThis);
