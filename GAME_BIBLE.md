# BLOOM — Design Bible
*A retro-pixel terraforming/evolution demake in the Plague Inc. lineage, for middle-school life & earth science.*

**Version:** 1.0 (build-ready)
**Platform:** Browser, mouse-primary (touch-compatible). No keyboard dependency.
**Architecture:** Single-file HTML/JS engine + external JSON content (planets / traits / scenarios), no build step. Embedded fallback planet so it boots over `file://`.
**Session length:** 10–20 min per level. Replayable: pick planet × starter × pressure scenario.

**Build workflow (this project):** build each portion as a self-contained demo (one HTML file under `demos/`), verify in isolation, then integrate into the single-file engine via shared modules in `resources/`. Same pattern as the Trans-plant project (demos per level → engine integration).

---

## 1. HIGH CONCEPT

You are a single pioneer plant species dropped onto a hostile world. You spread across the planet by **evolving the plant to endure local ground conditions** and **terraforming the global sky to bend the whole climate toward you**. Win by covering a target % of the planet. The plant itself drives the terraform loop — as it spreads, it photosynthesizes and changes the atmosphere, so success snowballs.

**The one-sentence pitch for a 12-year-old:** *A planet's "mood" is its sky — you can change that. A region's "personality" is its ground — you have to adapt to that.*

---

## 2. WHAT WE TEACH (and how they learn it)

| Concept | Taught through |
|---|---|
| Tolerance ranges / limiting factors (Shelford's law) | The survive/struggle/die feedback on every section; the color-coded condition panel |
| Real plant adaptations + their mechanisms | Each evolved trait carries a one-line "why it works" (waxy cuticle → less water loss, etc.) |
| Biogeochemical cycles (C, O, N, water) | The plant's terraform *output* literally moves the global climate sliders |
| Climate systems & feedback loops | Terraforming tradeoffs; the Volatile pressure scenario |
| Evolutionary tradeoffs / specialist vs generalist | Finite points; the temperature pool cap; refund consequences |
| Ecological succession | Dead land decomposes → soil enriches → recolonizes faster |

**Pedagogical engine:** learning by *instructive failure*, exactly like Plague teaches epidemiology. Every die-back names the one variable that killed the colony.

---

## 3. CORE LOOP

```
evolve / terraform  →  plant survives more sections  →  plant spreads (fills area)
        ^                                                          |
        |                                                          v
   spend biomass  ←  collect biomass from thriving colonies  ←  spreading plant
                                                                photosynthesizes →
                                                                shifts GLOBAL climate
                                                                → new sections become
                                                                  survivable → (repeat, faster)
```

Slow patient-zero start → explosive midgame → tense endgame (driven by the pressure scenario). This mirrors the real Great Oxidation Event: the organism that spreads is the organism that changes the air. **The loop is the lesson.**

---

## 4. THE SIMULATION

### 4.1 Two grids — don't conflate them
- **Tile grid (paint resolution):** **60 × 40** square tiles (2,400 tiles). The unit the sim ticks over. Tiles are never individually clicked.
- **Sections (gameplay units):** **15–25** per planet. A section = a labeled cluster of contiguous tiles. ~100–150 tiles each. This is the granularity of player decisions.

Tiles = the paint. Sections = the brushwork the player reasons about.

### 4.2 Three-state model (per tile)
Adapted from Plague's healthy / infected / dead:

| State | Meaning | Plague analog |
|---|---|---|
| **Barren** | empty, colonizable | healthy |
| **Living** | colonized; the fill | infected |
| **Dead** | recently died back | dead |

**Transitions (the entire sim):**
- **Barren → Living** (colonize): rate = `plantFitness(section) × seedPressure(neighbors)`. Good fit + many mature neighbors = fast fill. Marginal = slow crawl.
- **Living → Dead** (die-back): when section conditions drop below the plant's survival threshold *for its current genome*. Vigor drops first, growth stalls, then edges recede. **Damped** (slower than growth) so a brief dip doesn't wipe a colony.
- **Dead → Barren** (recovery): dead land slowly returns to barren and becomes recolonizable. Decomposition leaves the soil **nutrient-enriched** — the *second* colonization of that ground is faster. (Succession. Build the hook in v1, enable enrichment once core feels good.)

### 4.3 The survival check — 8 variables, one tick
A tile thrives only if the plant clears **all** gates. `effective = global + localOffset` for terraformable vars; local-only otherwise.

| # | Variable | Mechanic type | Terraformable? | Real concept |
|---|---|---|---|---|
| 1 | Temperature | **Pool window** (see §5) | yes | thermal tolerance |
| 2 | Moisture | **Position window** (see §6) | yes | xerophyte ↔ hydrophyte |
| 3 | Light | **Additive** (stack both ends) | partial (local: shadow/latitude) | photosynthetic range |
| 4 | Soil pH | **Buffer / additive broaden** | no | root ion regulation |
| 5 | Salinity | **Resistance** (one-way) | no | halophyte salt-pumping |
| 6 | Toxicity (heavy metals) | **Resistance** | no | hyperaccumulation |
| 7 | Radiation | **Resistance** | no | pigment shielding |
| 8 | Nutrients | **Soft modifier** (speed/yield, not a gate) | yes (plant can enrich) | nitrogen availability |

Three *different* mechanic shapes across the windowed vars (temp = capped pool, moisture = exclusive position, light = additive stack) so each teaches a distinct contrast.

### 4.4 Anti-oscillation (mandatory, design in from day one)
A section hovering at threshold must not flicker colonize↔die every tick.
- **Hysteresis:** the threshold to *start dying* is lower than the threshold to *start growing*. The gap = a "hanging on, not spreading" dead-zone (mirrors real plant stress).
- **Damped die-back:** death rate < growth rate. Sustained bad conditions kill; momentary dips don't.
- **Vigor** trait raises the die-back floor (lets marginal colonies hold while you terraform). It *is* the hysteresis buffer surfaced as a buyable.

### 4.5 Spread rules
- **Contiguous.** A section seeds its neighbors once it is **≥ maturity threshold (default 50%) colonized AND above survival vigor** — not 100%. Marginal sections still pass the plant along, just slower.
- **Seed pressure** scales with how many mature neighbors a barren section has (3 sides = fast).
- **Dispersal traits** unlock gap-jumps (wind = 1 gap, water = cross water, ballistic = 2+).

### 4.6 Section health
Sections track **Barren / Living / Dead area + a vigor 0–100%**. Perfect match = thriving (max biomass + max terraform output). Marginal = surviving, low output. Below threshold = dying back.

### 4.7 Water, islands & impassable terrain — *what gives Dispersal its purpose*
Some planets have **impassable terrain**: ocean/water, ice-void, lava seas. This is a first-class part of the model, not flavor.

- **A section (or raw tile run) can be flagged `kind: "water"` / `"void"` / `"lava"`** — collectively *impassable*. Impassable cells are **never colonizable** (they can't become Living) and are **excluded from the win denominator** — win % is measured against **land area only**, not the whole grid.
- **Impassable terrain breaks contiguity → islands.** A landmass cut off by water can't be reached by ordinary contiguous spread.
- **This is the entire reason the Dispersal jump group exists.** On a fully-contiguous Pangaea (Cinder-Frost), `wind_seed`/`water_seed`/`ballistic` are dead weight — there are no gaps to cross, so a rational player never buys them. Islands make those traits the only way across, turning "Adaptation vs Dispersal" into a live spend decision (the §7 tension). **Mirror of Plague's land/air/sea vectors: ocean is what makes "sea transmission" worth buying.**
- **Per-planet variety:** Cinder-Frost = Pangaea (no water, Dispersal optional). An **archipelago** planet makes Dispersal mandatory. An ice-cap planet uses `void`. The procedural generator simply marks some cells impassable (and the winnability validator must confirm every land section is reachable given the *available* dispersal traits — see Invariant 3).
- **Earth-science bonus (v2):** water bodies raise the local moisture of neighboring land (coasts are wetter) and buffer local temperature — so water teaches the water cycle, not just acts as a wall.
- **Rendering:** impassable cells get their own fill (deep water blue / void black) and the border tracer treats the land/water edge like any other section boundary (coastlines fall out for free).

**Build order note:** introduced as a playable feature in **Portion 6** (with the Dispersal board) via a dedicated **archipelago demo planet**. Cinder-Frost (Portions 1–5) stays all-land so the core loop is validated without dispersal complexity.

---

## 5. TEMPERATURE — the capped pool

A **3-point pool**, two locked arms from a shared thermal root.
- Climb one arm first: `Hot 1/3 → 2/3 → 3/3` (cold locked while you do).
- Maxing an arm **unlocks** the opposite arm permanently.
- Hard cap of **3 total temp points.** Reachable end-states: `3/0, 2/1, 1/2, 0/3` (always sum 3).
- After unlock, every cold point is **pulled from hot** (a tier-scaling refund + buy). Hedging is deliberately expensive — generalism is possible but stings.

**Why this and not pure additive:** pure additive made temperature *solvable* (enough points = shrug off both ends), dumping all difficulty onto local stressors. The cap keeps the hot/cold tradeoff a live decision and guarantees no plant can tolerate extreme-cold AND extreme-hot regions at once — forces terraforming or sacrifice zones.

**Free sprite win:** the cap is odd, so every mixed state has a dominant side (2/1, never 2/2) — the sprite shows the dominant pigment (frost-blue vs silver), never a blend.

---

## 6. MOISTURE — the exclusive position window

NOT additive, NOT a pool. A single **position** on a desert↔swamp slider. The plant sits at **one** point: a xerophyte genuinely rots in a swamp.
- Two opposing arms from a moisture root: **Xerophyte** (shift dry) / **Hydrophyte** (shift wet).
- Invest along one arm to move your position. Switching strategy requires **refunding** the other arm. You are never meaningfully both.
- No "broaden" node — there's no width, only position.

This is the one true Goldilocks variable, placed where it's biologically honest (water strategy is anatomical, not a range).

---

## 7. ECONOMY

**Single currency: Biomass.** Earned passively from thriving colonies (spore/biomass bubbles float over healthy sections; click to collect — same dopamine loop as Plague's DNA bubbles).

Spent across all three trait boards AND on terraforming pushes. **Every point spent reshaping the sky is a point not spent adapting the plant.** That single tension is the macro-game. One currency kills "which resource does what?" confusion.

---

## 8. TRAIT TREES — three hex boards

Three independent screens, each its own hex board (Plague's separate tabs): **Evolve / Dispersal / Terraform.**

**Board rules:**
- Hex tiles. Within a board, traits sit in **groups**, each with its own **root** (a hub root unlocks a fan; a string root starts a linear chain — group shape is a data property).
- **Connected-blob purchase rule:** you can only buy a hex adjacent to one you already own *within its group*. Adjacency = prerequisite (mostly replaces explicit `prereq` fields; keep explicit prereqs only for rare cross-group links).
- **Refund:** allowed, **from the tip inward only** (can't refund a hex with owned hexes hanging off it). **Cost scales with tier.** Refunding recomputes survival next tick — removing a load-bearing trait can trigger die-back. That consequence is the real cost, not the currency.
- Single non-scrolling board per screen at ~30 total nodes. (Gentle pan only if a board ever exceeds ~40.)

**Rendering:** hex = six points; states = owned / affordable / locked (three fills). Axial coords → one rounding fn for hit-testing. Reuse SpriteVG's pattern/cache approach.

---

## 9. TRAIT LIST (sample set, ~30 nodes)

Notation: `cost` in biomass; `arm` = which pool/position arm; [S] = writes a sprite layer.

### EVOLVE board (14)
| id | name | group | effect | sprite | science |
|---|---|---|---|---|---|
| `heat_1` | Heat Tolerance I | thermal(hot arm) | temp ceiling +1 | silver tint | heat-shock proteins |
| `heat_2` | Heat Tolerance II | thermal(hot) | ceiling +1 | [S] silver | " |
| `heat_3` | Heat Tolerance III | thermal(hot) | ceiling +1; unlocks cold arm | [S] silver | " |
| `cold_1` | Cold Tolerance I | thermal(cold, locked) | temp floor −1 | frost tint | antifreeze proteins |
| `cold_2` | Cold Tolerance II | thermal(cold) | floor −1 | [S] frost | " |
| `cold_3` | Cold Tolerance III | thermal(cold) | floor −1; unlocks hot arm | [S] frost | " |
| `xero_1` | Drought Adaptation I | moisture(xero) | position −, low-water survival | [S] spines | waxy cuticle / water storage |
| `xero_2` | Drought Adaptation II | moisture(xero) | position − | [S] succulent body | " |
| `hydro_1` | Flood Adaptation I | moisture(hydro) | position +, waterlogging survival | [S] broad glossy leaf | aerenchyma air channels |
| `hydro_2` | Flood Adaptation II | moisture(hydro) | position + | [S] broad glossy | " |
| `salt_1` | Salt Tolerance | salt(string) | salinity resist + | [S] crystal specks | halophyte ion pumps |
| `rad_1` | Radiation Shielding | rad(string) | radiation resist + | [S] purple-black pigment | melanin shielding |
| `fixn_1` | Nitrogen Fixation | nutrient(string) | removes low-nutrient penalty; enriches dead soil | icon | root-nodule bacteria |
| `vigor_1` | Resilience | output(string) | raises die-back floor (hysteresis buffer) | icon | stress hardiness |

### DISPERSAL board (8)
| id | name | group | effect | science |
|---|---|---|---|---|
| `seed_1` | Seed Output I | rate(string) | barren→living fill rate + | reproductive output |
| `seed_2` | Seed Output II | rate | fill rate + | " |
| `early_mat` | Early Maturity | rate | sections seed neighbors at lower % | r-strategy |
| `runner` | Runner / Rhizome | spread(hub) | faster contiguous spread | vegetative propagation |
| `wind_seed` | Wind Seeds | jump(string) | jump 1-gap | anemochory |
| `water_seed` | Water Seeds | jump | cross water/low tiles | hydrochory |
| `ballistic` | Ballistic Seeds | jump (needs `wind_seed`) | jump 2+ gaps | explosive dehiscence |
| `pods` | Flowering | spread | +seed pressure | [S] flowers/pods (spread feedback) |

### TERRAFORM board (8)
| id | name | group | effect | science | tension |
|---|---|---|---|---|---|
| `warm_1` | Greenhouse Forcing I | temp(hub) | global temp + (rate) | greenhouse gases | helps cold poles, cooks equator |
| `warm_2` | Greenhouse Forcing II | temp | global temp + faster | " | " |
| `cool_1` | Albedo Boost I | temp | global temp − | reflectivity | mirror of warming |
| `cool_2` | Albedo Boost II | temp | global temp − faster | " | " |
| `humid_1` | Humidify | water(hub) | global moisture + | water cycle | floods dry-adapted colonies |
| `dry_1` | Aridify | water | global moisture − | " | " |
| `oxy_1` | Oxygenate | gas(string) | global O2 + | photosynthesis byproduct | win/pressure flavor |
| `co2_seq` | Carbon Sequestration | gas | global CO2 − | carbon cycle | drives Volatile instability |

---

## 10. SPRITE SYSTEM

One generic plant as a **fixed z-order layer stack** (the Trans Plant hull+overlay pattern). Acquisition order never matters — rendering always composites bottom→top in fixed sequence. **~25 PNGs → hundreds of distinct plants.**

**Slots:**
| slot | type | options | resolves by |
|---|---|---|---|
| Body | exclusive | default / succulent-thick / slender | priority |
| Leaf form | exclusive | default / needle / broad-glossy / small-waxy | priority |
| Coating | additive | waxy-frost sheen | on/off |
| Spines | additive | — | on/off |
| Pigment | exclusive (whole-sprite tint) | green→frost-blue→silver→red→radiation-black | priority order |
| Salt glands | additive | crystal specks | on/off |
| Flowers/pods | additive | — | on/off |
| Roots | additive | deep-root / aerenchyma | on/off |

- Exclusive slots resolve by a priority number (radiation-black beats frost-blue). Pure Isaac logic, no combo table.
- Composite **once on trait change, cache it**. Hero sprite lives only on the lab/Evolve screen.
- The **map shows coverage color**, not per-tile plants — zero per-tile sprite cost.
- **"Starters" are presets in this same system** (Succulent = thick-body + 2 drought/heat points pre-spent; Lichen = flat-form + cold/radiation). Plus a **Custom** option (allocate your own starting points). No parallel art pipeline.
- Special-combo art (unique look when traits A+B coexist) = cheap *later* add via a small lookup. **Not v1.**

---

## 11. WIN / LOSS / PRESSURE

### Win
- **Win = hit the level's area-weighted coverage threshold** (e.g. 70%). Banks the unlock **permanently** (new planet / starter / scenario). Cannot be un-won.
- **After winning:** keep playing — sandbox toward 100%, or chase optional stars (speed / max simultaneous coverage / biomass efficiency). On hardest planets a true 100%-at-once may be impossible; that's fine, it's bonus. Show the *win threshold* prominently, not a taunting 100% bar.

### Loss
- **Loss comes ONLY from the pressure scenario.** The base sim, with a protected origin region that always trickles biomass, is essentially unloseable — correct for the chill **Eden** default.
- The origin is immune to dying from **your own terraforming** (always a refuge + income). It is **not** immune to **pressure** (that's how Dying World eventually takes your last colony). *Your hands can't kill your last harbor; the scenario can.*

### Pressure scenarios (selectable per playthrough = replay + difficulty + a 2nd lesson)
| Scenario | Pressure meter | Teaches |
|---|---|---|
| **Eden** | none (sandbox) | open terraforming; chill default |
| **Hostile Native Life** | Native Spread bar — natives compete & adapt to you (the "cure" analog) | competition / invasive dynamics |
| **Dying World** | Atmosphere Bleed clock — air leaks to space / star dims | planetary habitability factors |
| **Volatile Climate** | Instability gauge — more terraforming = more unstable (runaway greenhouse, acid rain, tipping points) | climate feedback loops; punishes brute-force terraform |
| **Barren & Toxic** | extreme local stressors, slow start | adaptation under constraint |

---

## 12. SCREENS (Plague map → Bloom)

| Plague | Bloom | Shows / does |
|---|---|---|
| Disease-type select | **Choose Your Seed** | starter (or Custom) + planet + scenario; starter stats, planet preview, scenario blurb |
| World globe | **The Surface** | main screen: tiles fill barren→living→dead, biomass bubbles, coverage % vs win threshold, live global-climate readouts, click a section to inspect |
| Transmission tab | **Dispersal** (hex board) | colonize/spread/jump traits |
| Abilities tab | **Adaptation** (hex board) | tolerance + local-stressor traits |
| Symptoms tab | **Terraform** (hex board) | global climate pushes (powerful but drives instability in Volatile — same risk/reward shape as symptoms drawing the cure) |
| Cure bar | **Pressure meter** (renamed per scenario) | hidden in Eden |
| DNA bubbles | **Spore/biomass bubbles** | float over thriving colonies; click to collect |
| News ticker | **Field Log** | flavor + warnings ("Equatorial colonies wilting", "Native lichen probing your border") |
| Disease overview | **Planet Health** | coverage %, living/dead/barren area, climate state, genome summary |
| End screen | **Bloom Report** | win: coverage/unlocks/score; lose: cause + retry. Both end with a 1-paragraph science debrief tying outcome to the real mechanism |

---

## 13. UI — reading a section

**Borders:** draw a 2px line only on tile edges where neighbor tile's `sectionId` differs (interior edges blank). Auto-traces every section outline (Atelier Andrea shared-edge logic). Two states: thin/dark at rest; whole outline brightens 3–4px when selected. Cached overlay — computed once at load (sections don't move), redrawn only on selection change. Fill renders *inside* borders.

**On click → left info panel** (the "why"):
- Section name.
- All 8 variables as labeled readouts, **color-coded vs your current plant**: 🟢 clears / 🟡 marginal / 🔴 lethal. The red line *is* the teaching moment — points straight at which trait to buy.
- terraform tag on terraformable variables (learn fix-by-terraform vs must-evolve).
- *(v2)* predictive line: "Warm +10° → this section 🟡→🟢 but equator 🟢→🔴." Turns the panel into a planning tool. Design panel with room for it.

**Bottom bar** (the "state"): selected section's **Barren / Living / Dead** area + vigor, always visible. Direct Plague three-population analog.

*Diagnosis on the left, vital signs on the bottom.*

---

## 14. ARCHITECTURE

- **One HTML file = engine** (sim, render, UI, trait logic). ES modules (`sim/render/ui/traits`) **only if** the engine passes ~5–6k lines.
- **Content = external JSON** beside it: `planets/*.json`, `traits.json`, `scenarios.json`. Loaded via `fetch()`. Adding a planet = writing JSON, zero engine code.
- **Embedded fallback planet** inside the HTML so it boots/plays over bare `file://` (external `fetch` enriches when served over HTTP, which is the normal dev + FTP deploy path).
- Procedural generator and hand-authored campaign levels **emit the same JSON** (grid + section labels + per-section stats). Procedural planets run the winnability validator and reroll on fail; authored validated once. Engine doesn't care which made them.
- **All rates / costs / thresholds = config values** (`config.json`), never hard-coded — balancing is data-tweaking, never re-architecting.

### Core systems (the build order)
1. Region/tile model + section grouping + border tracer
2. Plant/genome model
3. Global terraform state
4. **The tick** (survival formula + state transitions + hysteresis) — the spine
5. Spread (contiguous + seed pressure + maturity threshold)
6. Trait boards (hex render, purchase/refund-from-tip)
7. Biomass economy + bubbles
8. Pressure/event system
9. Screens + UI panels
10. Sprite layer compositor (cache on trait change)
11. Win/loss + Bloom Report
12. Procedural generator + winnability validator

---

## 15. JSON SCHEMAS

### 15.1 Planet
```json
{
  "id": "cinderfrost",
  "name": "Cinder-Frost",
  "blurb": "Frozen poles, a volcanic equatorial belt. Warm the world and you save the poles but melt the equator.",
  "gridWidth": 60,
  "gridHeight": 40,
  "winThreshold": 0.70,
  "origin": "tundra_shelf",
  "globalClimate": { "temperature": -8, "moisture": 45, "o2": 8, "co2": 60, "pressure": 90 },
  "globalLimits": { "temperature": [-40, 60], "moisture": [0, 100] },
  "sections": [ /* see 15.2 */ ],
  "tileMap": "RLE-or-array of sectionId per tile (length = gridWidth*gridHeight)",
  "defaultScenario": "eden"
}
```
> **Generation (build choice):** instead of authoring a 2,400-entry `tileMap` by hand, each section carries a normalized `center` seed and the engine grows the map with an **additively-weighted Voronoi** pass (gentle weights → geometry/adjacency dominates, light nudge toward target areas; weight magnitude capped so no cell reaches across a neighbor). This is the seed of the procedural generator (System 12). Verified on Cinder-Frost: 100% of authored adjacencies present, all sections single-blob, ~2% area drift.
```json
```

### 15.2 Section
```json
{
  "id": "tundra_shelf",
  "name": "Tundra Shelf",
  "area": 140,
  "kind": "land",                  // "land" (default) | "water" | "void" | "lava" — impassable kinds are not colonizable & excluded from win denominator
  "neighbors": ["frost_basin", "ash_steppe"],
  "isOrigin": true,
  "local": {
    "tempOffset": -22, "moistureOffset": -10, "light": 35,
    "ph": 6.5, "salinity": 5, "toxicity": 0, "radiation": 10, "nutrients": 30
  }
}
```
> `effectiveTemp = globalClimate.temperature + local.tempOffset` (same for moisture). Other locals used as-is.

### 15.3 Trait
```json
{
  "id": "heat_3", "board": "evolve", "group": "thermal", "arm": "hot",
  "cost": 60, "tier": 3, "hex": { "q": 2, "r": -1 },
  "adjacency": ["heat_2"], "prereq": [], "unlocks": ["cold_1"],
  "poolCap": { "pool": "thermal", "max": 3 },
  "effect": { "type": "tempCeiling", "value": 1 },
  "sprite": { "slot": "pigment", "value": "silver", "priority": 3 },
  "science": "Heat-shock proteins refold proteins damaged by high temperature."
}
```

### 15.4 Scenario
```json
{
  "id": "volatile", "name": "Volatile Climate", "meterLabel": "Instability", "lossAt": 100,
  "rules": {
    "instabilityPerTerraformPush": 0.8, "instabilityDecayPerTick": 0.05,
    "catastropheThresholds": [
      { "at": 50, "event": "acid_rain", "effect": "phShockAllSections" },
      { "at": 80, "event": "runaway_greenhouse", "effect": "tempSpikeGlobal" }
    ]
  },
  "originImmuneToOwnTerraform": true, "originImmuneToPressure": false
}
```

---

## 16. SAMPLE PLANET — "Cinder-Frost" (12 sections, winnable)

Designed to exercise: the temperature pool (cold poles + hot equator), the terraform tradeoff, salt resistance, and one nutrient-poor regolith zone. Win = 70% by area. `globalClimate.temperature = -8`. `effectiveTemp = -8 + tempOffset`.

| section | area | tempOff → effTemp | moistOff | light | pH | salin | tox | rad | nutr | neighbors | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `tundra_shelf` ORIGIN | 140 | −22 → **−30** | −10 | 35 | 6.5 | 5 | 0 | 10 | 30 | frost_basin, ash_steppe | always-survivable refuge |
| `frost_basin` | 130 | −18 → −26 | +5 | 30 | 6.0 | 0 | 0 | 10 | 35 | tundra_shelf, north_flats | cold |
| `north_flats` | 120 | −10 → −18 | 0 | 50 | 7.0 | 0 | 0 | 15 | 40 | frost_basin, salt_pan | mild-cold |
| `salt_pan` | 110 | −4 → −12 | −20 | 70 | 8.5 | **85** | 5 | 20 | 25 | north_flats, dust_steppe | needs salt tolerance |
| `dust_steppe` | 130 | +2 → −6 | −25 | 80 | 7.5 | 10 | 0 | 25 | 20 | salt_pan, midlands | dry; low nutrient |
| `midlands` | 150 | +8 → 0 | +10 | 65 | 6.8 | 0 | 0 | 20 | 55 | dust_steppe, ash_steppe, river_belt | the easy heartland |
| `ash_steppe` | 120 | +6 → −2 | −5 | 60 | 6.2 | 0 | 15 | 30 | 35 | tundra_shelf, midlands, volcanic_rise | mild toxicity |
| `river_belt` | 110 | +14 → +6 | **+40** | 70 | 6.5 | 0 | 0 | 15 | 60 | midlands, jungle_fringe | wet — flood-adapted favored |
| `jungle_fringe` | 130 | +20 → +12 | +35 | 75 | 6.0 | 0 | 0 | 15 | 70 | river_belt, equator_belt | warm + wet |
| `equator_belt` | 150 | +34 → **+26** | +5 | 95 | 6.5 | 0 | 0 | 45 | 50 | jungle_fringe, volcanic_rise | hot + high radiation |
| `volcanic_rise` | 100 | +46 → **+38** | −30 | 90 | 4.5 | 0 | **60** | 50 | 30 | ash_steppe, equator_belt | brutal: heat+tox+rad+acid — likely sacrifice |
| `glass_desert` | 110 | +28 → +20 | −40 | 100 | 7.0 | 30 | 0 | 55 | 15 | equator_belt | hot, dry, irradiated, starved |

**Total area = 1,500.** Win at 70% = **1,050.**

**Designed solution path (proves winnability):**
1. Start `tundra_shelf` (−30°): buy `cold_1/2/3` → survive the cold north (shelf, basin, flats). Maxing cold unlocks the hot arm.
2. Spread through `midlands` heartland (easy) into `ash_steppe`.
3. Take `salt_pan` with `salt_1`; cross `dust_steppe` (slow — low nutrient; `fixn_1` helps).
4. **Terraform warm +~12°** to lift the cold north toward comfort — but watch the equator. Buy back toward `heat` (refund some cold, now 1/2 split) for `river_belt`/`jungle_fringe`/`equator_belt`. `hydro_1` for the wet belt; `rad_1` for the equator's radiation.
5. `volcanic_rise` (+38°, tox 60, rad 50, pH 4.5) and `glass_desert` (nutr 15) are the **sacrifice zones** — covering the other 10 sections ≈ 1,290 area > 1,050 win. The planet is winnable while two sections stay barren, exactly as intended.

---

## 17. TUNING / BALANCE CONFIG (`config.json`)

```json
{
  "tickMs": 250,
  "growth": {
    "baseFillPerTick": 0.012, "fitnessExponent": 1.5,
    "seedPressurePerMatureNeighbor": 0.25, "maturityThreshold": 0.50, "nutrientSpeedFloor": 0.4
  },
  "dieback": {
    "growStartThreshold": 0.55, "dieStartThreshold": 0.40,
    "_comment_hysteresis": "grow > die = stable dead-zone between",
    "diebackDampingFactor": 0.35, "vigorFloorPerVigorTrait": 0.08
  },
  "recovery": {
    "deadToBarrenPerTick": 0.006, "enrichmentBonusPerDeadCycle": 0.15, "enrichmentCap": 0.6
  },
  "economy": {
    "biomassPerThrivingAreaPerTick": 0.02, "biomassPerMarginalAreaPerTick": 0.006,
    "bubbleSpawnChancePerTick": 0.05, "bubbleValue": 8, "originTrickle": 1.0
  },
  "traits": {
    "tier1Cost": 20, "tier2Cost": 40, "tier3Cost": 60,
    "refundMultiplierByTier": [0, 0.6, 0.7, 0.8],
    "_comment_refund": "refund returns cost*mult; higher tier keeps more = stings more to undo"
  },
  "terraform": {
    "tempPushPerTickTier1": 0.05, "tempPushPerTickTier2": 0.10,
    "moisturePushPerTickTier1": 0.08, "biomassDrainPerPushTick": 0.5
  },
  "win": { "defaultThreshold": 0.70, "scoreStars": { "speed": true, "maxSimultaneous": true, "biomassEfficiency": true } },
  "validator": { "requireSimultaneousSatisfiable": true, "minWinnableMarginArea": 0.02 }
}
```

### Engine-derived scale constants (NOT in the bible's config — added during build, must live in config.json)
The bible's trait effects use `value: 1` for a "+1" point. Planet temps span [-40, 60], so a point must scale to degrees. These conversion constants are config:
- `scales.degreesPerTempPoint` — how many °C one hot/cold point moves the tolerance bound.
- `scales.moisturePerPoint` — how far one xero/hydro point shifts moisture position.
- `scales.resistPerPoint` — how much one resistance point raises a stressor tolerance.
- `genomeBase` — the untraited plant's starting tolerances (temp window, moisture position+band, light range, pH band, resist thresholds).

---

## 18. INVARIANTS — the dead-end audit (enforce these forever)

1. **No soft-lock:** origin section is always survivable and always trickles biomass.
2. **Self-terraform can't kill your last harbor:** origin immune to your own terraforming (but not to pressure).
3. **No unreachable-but-survivable region:** contiguous spread + dispersal jumps. On planets with impassable terrain (§4.7), the validator must confirm every land section is reachable from the origin given the *available* dispersal traits — no island stranded beyond the strongest jump.
4. **No circular trait dependency:** every planet must be *provably winnable from the start with available traits* — validator enforces "∃ reachable genome+terraform state where ≥ win% sits above survival simultaneously."
5. **No endgame boredom:** pressure escalates with progress; that's the scenario's only job.
6. **No balancing hell:** every rate/cost/threshold is config data, never code.
7. **No flicker:** hysteresis (grow threshold > die threshold) + damped die-back, designed in from tick #1.

If a change would violate one of these, it's wrong — design around it, don't ship it.

---

*End of bible v1.0. Everything reconciles: every loop closes, every die-back has an escape hatch, every hard planet stays winnable, and loss lives only in the pressure layer.*
