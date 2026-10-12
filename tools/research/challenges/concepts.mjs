// BLOOM-036C — authored Challenge CONCEPTS under study (READ-ONLY research data; never loaded by the game, never in content/challenges.js).
// docs/CHALLENGE_CONTENT_STUDY_v1.md. Every concept uses ONLY released levers (BLOOM-036B schema 2): a real scenario, a species policy, a
// seed-bank recipe (archetypes · arrival band · foothold · native cover), a starting state (owned plant adaptations · starting Biomass), the
// normal Bloom. Scenario concepts are written as QA-fixture Challenge definitions (status "fixture") so BLOOM.challenges.fixture() checks
// them exactly like the catalogue — schema, policies, the engine's own starting-state legality, and the no-ranking copy rule — and the
// seed-bank builder library (tools/challenge-bank-builder.mjs evaluateWorld / curateCell) proves and curates them unchanged.
// `kind: "default"` concepts use the default rules: the current schema REFUSES a default-scenario Challenge (bloom-challenges.js
// checkChallenge), so they are measured through the same species S2 + layer 4–8 strategy search directly and flagged as needing that rule
// relaxed before release (docs/CHALLENGE_CONTENT_STUDY_v1.md §7).
// `study`: what to measure — `sample` (World Seeds per recipe archetype, the first N of the release pool's stream, so the shipped bank's
// candidate records are an exact free baseline), `diag` (passing worlds per cell that also get the strategy-enumeration diagnostics),
// `ablations` (the same proof from another start), `baseline` (the released cell the concept is compared against: candidates.json).
const PRESCRIBED = species => ({ policy: "prescribed", species }), CHOICE = { policy: "player-choice" }, NORMAL = { policy: "normal" };
const START = (adaptations, biomass = null) => ({ policy: "prescribed", adaptations, biomass });
const RECIPE = (archetypes, extra = {}) => ({ policy: "seed-bank", recipe: { version: 1, archetypes, arrival: null, nativeCover: null, ...extra }, bank: { version: 1, size: 50 } });
const ALL = ["ocean_archipelago", "desert_world", "frozen_world"];
const fx = (id, name, scenario, icon, copy, launch) => ({ id: `c36_${id}`, version: 1, status: "fixture", name, short: copy.short, scenario,
  presentation: { tagline: copy.tagline, briefing: copy.briefing, strategicIdea: copy.strategicIdea, icon, science: copy.science }, launch, completion: { win: "bloom", conditions: [] } });

export const CONCEPTS = [
  {
    id: "thin_air", kind: "fixture",
    def: fx("thin_air", "Thin Air", "dying_world", "pressure", {
      short: "A plant from the cold heights, on a warm world that is losing its air.",
      tagline: "As the atmosphere thins the world cools, dries and brightens with radiation: conditions this plant was built for.",
      briefing: "Woolly Candle lands on a warm world whose atmosphere is escaping. Today most of the ground is too warm for it. As the air thins, the land cools toward the candle's range and surface radiation rises, which its wool and pigments shrug off. The drying is the part it was not built for.",
      strategicIdea: "Do not pay to fight warmth that is already leaving. Hold your refuges, move into ground the decline opens, and watch the water.",
      science: "Giant rosettes of high mountains (frailejón, giant groundsels) live where the air is thin: cold nights, dry wind and strong ultraviolet light. Their wool and leaf skirts answer exactly the conditions a thinning atmosphere brings.",
    }, { species: PRESCRIBED("woolly_candle"), world: RECIPE(["desert_world", "ocean_archipelago"]), startingState: NORMAL }),
    study: { sample: 160, diag: 30, baseline: "dying_world" },
  },
  {
    id: "hearthfire", kind: "fixture",
    def: fx("hearthfire", "Hearthfire", "volatile_climate", "climate", {
      short: "A plant of hot ground on a frozen world, and a climate that pushes back.",
      tagline: "Your plant needs warmth the planet does not have, and warming the sky quickly unsettles the climate.",
      briefing: "Cinder Rosette lands in a warm geothermal pocket on a frozen world. Outside its refuges the ground is far too cold for it. Warming the sky opens the land, but every Terraform step unsettles the climate, and a cold snap on a frozen world can take back what the warming gave.",
      strategicIdea: "Warm the world in measured steps and let it settle between them, or make the rosette more cold-tolerant and Terraform less.",
      science: "@scenario.display.science",
    }, { species: PRESCRIBED("cinder_rosette"), world: RECIPE(["frozen_world"]), startingState: NORMAL }),
    study: { sample: 160, diag: 30, baseline: "volatile_climate" },
  },
  {
    id: "oasis_line", kind: "fixture",
    def: fx("oasis_line", "Oasis Line", "native_competition", "competition", {
      short: "A wetland plant in a desert that is already taken.",
      tagline: "Drought-hardy native vegetation holds the open desert; your plant can only live where the water is.",
      briefing: "Reed Spire lands beside a desert basin. The wet ground suits it; the dry plains belong to native vegetation adapted to them. Every spring, lakeshore and wet hollow is a front.",
      strategicIdea: "Hold the wet basins first. To push into the plains the natives hold, your reed must learn to live drier; reshaping the sky can weaken their strongholds.",
      science: "In real deserts, reeds and palms crowd around springs and oases while drought-hardy shrubs hold the open ground; who wins at the edge depends on how much water the soil holds (a simplified game model).",
    }, { species: PRESCRIBED("reed_spire"), world: RECIPE(["desert_world"]), startingState: NORMAL }),
    study: { sample: 160, diag: 30, baseline: "native_competition" },
  },
  {
    id: "windfall", kind: "fixture",
    def: fx("windfall", "Windfall", "volatile_climate", "climate", {
      short: "Land with a full hold, on a planet whose climate does not like to be rushed.",
      tagline: "You land with four times the usual Biomass: enough to start reshaping the sky at once.",
      briefing: "Your expedition arrives with a large Biomass reserve. Spending it is simple; spending it well is the challenge. The climate here is unstable: heavy Terraforming in a short time makes it swing to temporary extremes.",
      strategicIdea: "A big budget is not a reason to change the planet all at once. Decide what to adapt, what to Terraform, and how fast.",
      science: "@scenario.display.science",
    }, { species: CHOICE, world: RECIPE(ALL), startingState: START([], 400) }),
    study: { sample: 40, diag: 10, baseline: "volatile_climate" },
  },
  {
    id: "pioneer_rush", kind: "fixture",
    def: fx("pioneer_rush", "Pioneer Rush", "native_competition", "competition", {
      short: "A fast-seeding pioneer with empty pockets, on a planet that is already green.",
      tagline: "Your plant lands already seeding heavily and maturing early, with no Biomass in reserve, among established native vegetation.",
      briefing: "Your plant arrives as a pioneer: heavy seed output and early maturity, nothing saved. It can spread into open ground quickly, but young colonies are exactly what established natives overgrow.",
      strategicIdea: "Speed wins open ground, not fronts. Use the head start to claim land, then make it hold before the natives push back.",
      science: "Pioneer plants such as dandelions and fireweed colonise open ground fast by sheer numbers of seeds; slower, established vegetation often takes that ground back later: the beginning of ecological succession (a simplified game model).",
    }, { species: CHOICE, world: RECIPE(ALL, { arrival: { minHabitable: 0.20 } }), startingState: START(["seedOut", "earlyMat"], 0) }),
    study: { sample: 40, diag: 10, baseline: "native_competition", ablations: [{ id: "no-reserve-only", start: { adaptations: [], biomass: 0 } }] },
  },
  {
    id: "empty_hold", kind: "fixture",
    def: fx("empty_hold", "Empty Hold", "dying_world", "pressure", {
      short: "No reserves at landing, and the air is already thinning.",
      tagline: "You land with no Biomass at all on a world that is losing its atmosphere.",
      briefing: "Your expedition arrives with nothing to spend. Every upgrade must be grown first, and the decline begins soon after landing.",
      strategicIdea: "Your first growth is your whole budget: decide whether to answer the world as it is, or save for the world it is becoming.",
      science: "@scenario.display.channels",
    }, { species: CHOICE, world: RECIPE(ALL), startingState: START([], 0) }),
    study: { sample: 40, diag: 10, baseline: "dying_world" },
  },
  {
    id: "low_tide", kind: "fixture",
    def: fx("low_tide", "Low Tide", "dying_world", "pressure", {
      short: "A plant fitted for wet salt coasts, on an archipelago that is drying out.",
      tagline: "Your plant lands already adapted to flooded, salty shores, and committed to that water strategy, as the planet's air dries.",
      briefing: "Organic Hybrid arrives with Flood Adaptation and Salt Handling: well fitted to the archipelago's wet, salty coasts today. But the atmosphere is thinning. The world dries, cools and brightens, and a plant committed to wet ground cannot also adapt to drought.",
      strategicIdea: "Your head start is also a commitment. Use the coasts while they last, then decide how to keep enough ground wet: Terraform, or retreat.",
      science: "Mangroves and saltmarsh plants are superbly fitted to wet, salty shores, and stranded when the water retreats. Specialisation pays only while the world it fits lasts.",
    }, { species: PRESCRIBED("organic_hybrid"), world: RECIPE(["ocean_archipelago"]), startingState: START(["flood", "salt"], null) }),
    study: { sample: 160, diag: 30, baseline: "dying_world", ablations: [{ id: "normal-start", start: null }] },
  },
  // default rules (the schema refuses them today — measured directly, flagged)
  {
    id: "far_from_home_frost", kind: "default", name: "Snow on the Dunes", species: "woolly_candle", archetypes: ["desert_world"], start: null,
    copy: { short: "A cold-country plant on a hot desert world, under ordinary skies.", tagline: "Your plant is built for frost; this planet is hot and dry nearly everywhere.",
      briefing: "Woolly Candle lands in the coolest basin of a desert world. Nothing here is changing on its own: the plant must make itself fit for heat and drought, or make the sky cooler and wetter.",
      strategicIdea: "Choose your answer to the heat: change the plant, change the sky, or both, and accept the ground each answer gives up.",
      science: "Plants carried far from their native climate rarely thrive without help; alpine plants in hot lowland gardens need shade, cool roots and water." },
    study: { sample: 160, diag: 30 },
  },
  {
    id: "far_from_home_ember", kind: "default", name: "Ember in the Ice", species: "cinder_rosette", archetypes: ["frozen_world"], start: null,
    copy: { short: "A desert rosette on a frozen world, under ordinary skies.", tagline: "Your plant is built for heat; this planet is frozen nearly everywhere.",
      briefing: "Cinder Rosette lands in a geothermal pocket of a frozen world. Nothing here is changing on its own: the rosette must harden to cold, or the sky must warm.",
      strategicIdea: "Cold tolerance and a warmer sky compete for the same answer, and a warmer sky pushes the hottest vents out of reach.",
      science: "Succulents survive frost only where something keeps them warm: a sheltered wall, a hot spring, a sunny rock." },
    study: { sample: 160, diag: 30 },
  },
  {
    id: "far_from_home_reed", kind: "default", name: "Reed in the Sand", species: "reed_spire", archetypes: ["desert_world"], start: null,
    copy: { short: "A wetland plant on a dry world, under ordinary skies.", tagline: "Your plant needs waterlogged ground; this planet has only scattered wet basins.",
      briefing: "Reed Spire lands in a wet basin of a desert world. Nothing here is changing on its own: the reed must learn to live drier, or the sky must hold more water.",
      strategicIdea: "Your basins are islands of wet ground in a dry sea: decide whether to cross the dry land or flood it.",
      science: "Reeds and papyrus line desert rivers and oases and stop exactly where the water table drops away." },
    study: { sample: 160, diag: 30 },
  },
];

// read-only derived concepts, measured from data already in the repository (no new proof runs): the shipped bank's candidate records
// (docs/evidence/bloom-036b/seed-bank/candidates.json) and the 036B recipe study (docs/evidence/bloom-036b/challenge-recipe-study.json)
export const DERIVED = [
  { id: "deep_freeze", name: "Deep Freeze", scenario: "dying_world", archetypes: ["frozen_world"], species: "player-choice",
    question: "is Dying World restricted to Frozen worlds a distinct Challenge, or Dying World under another name?" },
  { id: "last_refuge", name: "Last Refuge", scenario: "native_competition", arrival: { maxHabitable: 0.20 }, species: "player-choice",
    question: "is Native Competition on worlds with < 20 % arrival (the band the released recipe excludes) a viable Challenge?" },
];
