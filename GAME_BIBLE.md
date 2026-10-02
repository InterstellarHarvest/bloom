# BLOOM — Design Bible
*A friendly, modern plant-evolution strategy game in the Plague Inc. lineage, built around procedural alien planets and middle-school life and Earth science.*

**Version:** 1.1 (gameplay-direction revision)
**Platform:** Browser, mouse-primary, touch-compatible. No keyboard dependency.
**Session length:** 10–20 minutes per run.
**Primary mode:** Procedural planet × starter plant × pressure scenario.
**Tutorial mode:** A small number of authored planets that introduce systems gradually.
**Player fantasy:** *I figured out how to make this plant thrive and take over the planet.*

---

## 1. DESIGN NORTH STAR

BLOOM should capture the readable rhythm and escalating spread of *Plague Inc.* without copying its theme. The player begins with one pioneer plant, watches it spread across a hostile world, earns Biomass, and purchases traits that let it survive new environments or reshape the planet.

The game must balance two goals equally:

1. **Be a satisfying strategy game.** The player reads the map, identifies the current limiting factor, chooses among viable upgrades, and sees a clear consequence.
2. **Teach through the mechanic.** Adaptation, limiting factors, tradeoffs, dispersal, feedback loops, and succession are learned by making the plant succeed or fail—not by stopping for a lesson.

When those goals conflict, simplify the presentation before simplifying the underlying scientific idea.

### One-sentence pitch

> Evolve one plant to survive a strange procedural planet, spread across its regions, and change the world until your species can thrive.

### The emotional payoff

A successful run should end with the player thinking:

> I understood this planet, built the right plant for it, and made it bloom.

---

## 2. CORE LOOP

```text
read the next barrier
        ↓
adapt / spread / terraform
        ↓
plant survives and fills more land
        ↓
healthy colonies generate Biomass
        ↓
new choices become affordable
        ↓
the planet becomes a larger, harder puzzle
```

The pacing target is:

- **Slow origin:** one protected foothold and only a few affordable choices.
- **Readable expansion:** the plant reaches nearby regions and reveals clear blockers.
- **Explosive midgame:** established colonies generate enough Biomass for faster decisions.
- **Tense endgame:** the pressure scenario or incompatible regions force prioritization before the win threshold is reached.

The player should rarely wait without a decision. Watching spread is part of the pleasure, but the map must keep producing useful signals, Biomass opportunities, and upcoming problems.

---

## 3. GAME STRUCTURE AND PROGRESSION

### 3.1 Tutorials

The first few planets are authored. Each introduces only the concepts needed for that lesson.

Suggested progression:

1. **First Bloom:** temperature, basic spread, passive Biomass, and a 60–70% coverage goal.
2. **Dry and Drowned:** water strategy and the difference between drought and flood adaptation.
3. **Across the Sea:** islands and Spread traits that cross impassable terrain.
4. **A Changing Sky:** Terraform choices and the cost of helping one region while harming another.
5. **Under Pressure:** the first real pressure scenario.

Tutorial planets should not expose every raw environmental signal at once.

### 3.2 Main game

Procedural planets are the primary game after the tutorials. A run is created from:

- one **planet archetype**;
- one **generated map and condition layout**;
- one **starter plant**;
- one **pressure scenario**;
- optional difficulty modifiers later.

Wins unlock additional starters and scenarios. New unlocks should create new approaches rather than simply being stronger.

### 3.3 Starters

Starters are presets in the same plant-genome and layered-sprite system.

Examples:

- **Succulent:** begins dry- and heat-oriented.
- **Lichen:** begins cold- and radiation-oriented.
- **Marsh Bloom:** begins wet- and poor-soil-oriented.
- **Runner:** begins with fast contiguous spread.
- **Custom:** spends a small starting allowance after the player understands the systems.

A starter is a strategic opening, not a character class that locks the final build.

---

## 4. THE SURFACE

### 4.1 Two scales

- **Tile grid:** 60 × 40 cells. This is the paint resolution used for filling, borders, water, and animated spread.
- **Sections:** normally 12–22 named contiguous land regions. Sections are the units the player clicks, reads, and reasons about.

Tiles are visual state. Sections are gameplay decisions.

### 4.2 Tile states

| State | Meaning | Plague-style analog |
|---|---|---|
| **Barren** | Colonizable ground | Healthy |
| **Living** | Occupied by the player plant | Infected |
| **Dead** | Recent die-back; recovering | Dead |

Transitions:

- **Barren → Living:** fitness × seed pressure × growth modifiers.
- **Living → Dead:** sustained conditions below the survival threshold.
- **Dead → Barren:** recovery over time; prior die-back may enrich soil and speed recolonization.

### 4.3 Section health

Each section tracks:

- barren area;
- living area;
- dead area;
- vigor;
- current limiting factor;
- maturity and seed output.

A region can be:

- **Thriving:** expands quickly and produces strong Biomass.
- **Struggling:** survives but spreads and pays slowly.
- **Holding:** neither spreading nor dying because it sits in the hysteresis band.
- **Dying:** living area recedes until the problem is fixed.

### 4.4 Anti-oscillation

Threshold behavior must remain stable:

- growth begins above a higher threshold;
- die-back begins below a lower threshold;
- the space between them is a visible “holding on” state;
- die-back is slower than healthy growth;
- short climate fluctuations do not erase a colony.

### 4.5 Colony development *(addendum: BLOOM-008 / BLOOM-009, owner-authorized gameplay iterations)*

- **Establishment.** Each Living tile carries a stand density that starts as a tiny seedling stand and thickens while its section can grow. A section's establishment (Σ density / area) shows as *Sparse → Establishing → Established → Dense* and sets how much Biomass the colony yields and how strongly it seeds outward.
- **Growth focus is per region and persistent.** Every Living region keeps its own allocation: **Balanced** (the default baseline), **Roots**, **Leaves** or **Seeds**. Changing one region never touches another.
- **Each focus redistributes a fixed sugar budget, so each has a cost:**
  - **Roots:** establishment, recovery and stress resilience on viable ground; costs some Biomass.
  - **Leaves:** more Biomass, growing with the colony's establishment; costs seed output.
  - **Seeds:** outward spread and Waterborne source pressure; costs some Biomass.
- **The right choice depends on the colony's situation.** Young or marginal colonies favour Roots, open frontiers and coasts favour Seeds, and filled-in productive colonies favour Leaves.
- **Local specializations.** A colony may buy **one** permanent local specialization (Root Network / Leaf Canopy / Seed Reserve) with ordinary Biomass. It strengthens the matching function, and each purchase raises the next one's price.
- **Limits.** Neither a focus nor a specialization changes the four environmental categories or the plant's tolerances; none rescues red ground. Both belong to the region: they persist through die-back and total loss, stay dormant while nothing lives there, and act again when the region is recolonized.
- **Optional.** Ignoring allocation and local investment remains legal and winnable (invariants 8 and 9). The validator's witnesses never use either, so layers 4–8 are a no-allocation floor.
- All numbers are in `config.colony` / `config.establish`.

---

## 5. READABLE ENVIRONMENT MODEL

The first bible exposed eight environmental variables equally. That is too much normal-screen cognitive load for a fast strategy game.

BLOOM now uses **four player-facing condition categories**, while retaining scientifically meaningful raw signals underneath.

### 5.1 Player-facing categories

| Category | Quick states | What it represents |
|---|---|---|
| **Temperature** | freezing / cold / suitable / hot / scorching | effective regional temperature versus the plant’s tolerance window |
| **Water** | parched / dry / suitable / wet / flooded | effective moisture versus the plant’s water strategy |
| **Soil** | rich / workable / poor / hostile | nutrients, pH, and salinity combined into the strongest relevant soil limitation |
| **Hazard** | low / stressful / dangerous / lethal | radiation, toxicity, and planet-specific hazards |

The compact section readout should look like:

> **Cold · Dry · Good Soil · Low Hazard**

Each category is green, yellow, or red against the current plant. The strongest blocker is named in plain language:

> **Growth blocked: too cold**

### 5.2 Raw simulation signals

The engine may retain these raw values:

- temperature;
- moisture;
- light;
- soil pH;
- salinity;
- toxicity;
- radiation;
- nutrients.

They are not eight equal hard gates.

- **Temperature** and **Water** are primary survival axes.
- **Soil** selects or combines the most meaningful of pH, salinity, and nutrients.
- **Hazard** selects or combines radiation, toxicity, and special scenario hazards.
- **Light** normally changes growth speed and Biomass output rather than acting as a universal death gate. A special planet or scenario may elevate it into a primary problem.
- **Nutrients** normally slow growth and income before they kill.

### 5.3 Optional detail

Clicking a category opens one short explanation with raw detail and a useful next step.

Example:

> **Hostile Soil — high salinity**  
> Salt around the roots makes water uptake difficult. A salt-handling trait would improve survival here.

The science lives one click deeper. The main map stays readable at a glance.

### 5.4 Limiting-factor rule

Every stalled or dying section must report one dominant reason first. Secondary problems can be listed in details, but the player should never have to inspect eight values to discover why growth stopped.

---

## 6. ADAPTATION MODEL

### 6.1 Temperature — capped tolerance pool

Temperature remains a deliberate specialist-versus-generalist tradeoff.

- A shared three-point pool is split between cold and heat tolerance.
- Extreme specialization reaches the harshest environments on one end.
- Mixed states can cover a broader but less extreme range.
- Terraforming can move the planet toward the plant, but may damage colonies elsewhere.

Exact unlock and refund behavior must be playtested in the complete loop. The pool is preserved as the current hypothesis, not protected from simplification if it proves hard to read.

### 6.2 Water — strategy position

Water remains a position between dry and wet strategies.

- Drought adaptations shift toward dry survival.
- Flood adaptations shift toward wet survival.
- A plant cannot be perfectly specialized for both extremes at once.
- Switching strategy costs Biomass and may endanger existing colonies.

### 6.3 Soil traits

Soil traits solve understandable mechanisms:

- salt handling;
- pH buffering;
- nitrogen fixation;
- deep or specialized roots;
- symbiotic microbes.

The UI presents the problem as Soil first and reveals the mechanism in detail.

### 6.4 Hazard traits

Hazard traits answer recognizable planetary dangers:

- radiation shielding;
- toxin exclusion or accumulation;
- protective pigment;
- repair and resilience;
- scenario-specific defenses later.

### 6.5 Plant resilience

A resilience path may raise the holding/die-back buffer. It must not become a universal “ignore all conditions” upgrade.

---

## 7. THREE UPGRADE BOARDS

The game uses three Plague-style upgrade screens.

### 7.1 Spread

Use **Spread** as the player-facing name. “Dispersal” may appear in science text.

Spread traits affect:

- seed output;
- maturity speed;
- contiguous runners or rhizomes;
- crossing water;
- jumping gaps;
- flowering and other reproductive mechanisms.

### 7.2 Adapt

Adapt traits alter the plant’s tolerance for Temperature, Water, Soil, and Hazards. The large plant specimen lives on this screen and visibly changes as traits are purchased.

### 7.3 Terraform

Terraform traits or controls change global planetary conditions:

- warming or cooling;
- humidifying or drying;
- atmospheric composition;
- other archetype-specific global changes.

Terraforming is powerful because it affects many sections at once. Its cost and strategic downside are enough; the game does not need a moral punishment system.

### 7.4 Board interaction

- Purchases form readable connected paths or groups.
- Affordable, owned, and locked states are visually distinct.
- Refunds are allowed from the tips inward.
- Removing a load-bearing trait immediately recalculates section viability.
- Boards should stay compact enough to read without panning in normal play.

The first playable slice should use simple buttons or a compact test layout before investing heavily in final hex-board rendering.

---

## 8. BIOMASS ECONOMY

**Biomass is the single currency.** It is spent on Spread, Adapt, and Terraform choices.

### 8.1 Passive income

Thriving living area generates Biomass automatically. Struggling colonies generate less. The protected origin provides a small trickle so the player cannot permanently soft-lock the run through experimentation.

### 8.2 Biomass bubbles

Keep Plague-style bubbles as **bonus interaction**, not the main income source.

Bubbles can appear when:

- a section becomes established;
- a new landmass is reached;
- a colony survives a dangerous transition;
- several sections enter thriving state;
- a rare high-output event occurs.

They should:

- provide a satisfying burst of value;
- create reasons to watch the map;
- auto-collect after a short delay or through an accessibility setting;
- never require constant clicking to remain competitive.

### 8.3 Economic tension

Every Biomass point spent reshaping the sky is a point not spent adapting the organism or spreading faster. That is the central macro decision.

*(BLOOM-009 addendum)* Local colony specializations (§4.5) add a smaller, optional sink: improve one important colony now, or save for the next global Adapt / Spread / Terraform upgrade. They are deliberately secondary to global progression.

### 8.4 Decision cadence *(addendum: BLOOM-013, owner-authorized retune)*

**Owner feedback (Dying World playtest, 2026-10-02, verdict REVISE):** *"the game still seems a bit slow to actually gain enough biomass to effectively do anything and strategize. things might need to cost less or gain more."* Earlier playtests had noted slow openings too. The measured cause was a shared economy that left a player watching Biomass climb for minutes: the first global upgrade was affordable at ~80–90 s, and Ocean 13 + Dying World waited ~5 minutes between its first and second purchase.

The rule this adds to the north star: **reduce waiting between meaningful strategic choices.** It is not "make the game faster". The intended rhythm is *read the problem → have, or soon earn, enough Biomass to choose among responses → buy → watch the consequences → another meaningful choice comes within reach → repeat.* Watching the simulation is part of the pleasure. Watching a number climb for minutes is not.

Targets, measured by `tools/economy-study.js` and held by `tools/economy-check.js` (bot seconds; details in `docs/ECONOMY_v1.md`):

- **Opening:** one meaningful decision is affordable immediately (a local upgrade for the origin). Two materially different options are affordable within ~30–45 s. The first global upgrade is bought within ~30–60 s. The start never buys a strategy.
- **Midgame:** meaningful purchases recur every ~30–90 s. No ordinary gap before the win exceeds ~120 s, even for a player who never clicks a bubble.
- **Endgame:** the wait after the last purchase stays bounded. Pointless upgrades are never added to fill time.
- **Integrity:** tradeoffs still bind (temperature cap, one water strategy, Terraform side effects, Waterborne Seeds' price, local-vs-global). Bubbles stay a bonus. Local upgrades stay optional and costly. Biomass never piles up so fast that prices stop mattering.

**The retune** is data only and changes no price: start Biomass 40 → 100 and origin trickle 0.1 → 0.3. The home colony now pays for the opening, so first-choice friction drops far more than later costs; mid- and late-game prices still demand saving. Runs got about a third shorter as a consequence. The 10–20 human-minute session target is unchanged; whether shorter but denser runs are right is a recorded PMO decision point (`docs/ECONOMY_v1.md` §6). Pressure scenarios fit the economy, not the other way round: Dying World's clock was rescaled with the runs (§11.4). The validators' pacing bands now encode these cadence targets (§10.3 layer 8 / layer P).

---

## 9. WATER, ISLANDS, AND IMPASSABLE TERRAIN

Water, void, lava, and similar terrain are never colonizable and are excluded from the win denominator.

They matter because they create geographic barriers:

- ordinary spread crosses neighboring land only;
- island planets make water-crossing traits essential;
- some worlds remain mostly contiguous, making raw growth traits more valuable;
- the generator must never create land that is unreachable even with the strongest available Spread trait.

Coasts may later affect moisture and temperature, but geographic function comes first.

---

## 10. PROCEDURAL PLANETS — THE MAIN GAME

Procedural generation should use **designed randomness**, not unrelated rolls across every signal.

### 10.1 Planet archetypes

Each planet begins from an archetype that defines coherent rules and expected strategic pressures.

Examples:

- **Frozen World:** cold majority, geothermal refuges, frozen barriers.
- **Desert World:** low water, rare wet basins, strong light and poor soils.
- **Ocean Archipelago:** fragmented land, high moisture, mandatory crossing strategy.
- **Toxic Young World:** volcanic hazards, unstable soils, fertile recovery zones.
- **Tidally Locked World:** scorching day side, frozen night side, habitable twilight belt.
- **Humid Jungle World:** abundant water, low-light growth penalties, flood risk.
- **Volatile World:** wide condition swings and strong Terraform consequences.

*(BLOOM-005…011 addendum.)* Three archetypes are implemented as data (`content/archetypes.js`) over one generic generator, validator and simulation. Each archetype owns its identity rule and validation policy; changing one never changes another.

- **Ocean Archipelago:** the defining problem is **crossing**. No single island holds enough land to win, so every winning strategy includes Waterborne Seeds.
- **Desert World:** the defining problem is **water**. It is a hot, mostly contiguous world with a few lakes. Water collects in low basins, and those wet basins are the refuges (the origin is always a genuine one). The dry majority of the land needs a water answer, and every proven strategy must answer the dry ground somehow. Two families compete: evolve to live dry (Drought Adaptation), which gives up the wettest ground, or humidify the sky (Terraform), which needs less Drought but reaches less of the deep desert. Crossing is never the puzzle, and Waterborne Seeds appears only where the generic offer rule finds a real crossing. Strong light is a growth bonus; poor soil nutrients slow dry ground without blocking it; some dry basins are salt pans; the hot south adds heat and strong-sun radiation, which a plant may answer or give up. **Human gate passed with notes** (owner, recorded in BLOOM-011): gameplay was "decent", and production should move on. Known Desert limitations stay backlog observations.
- **Frozen World:** the defining problem is **temperature**. It is a cold, mostly contiguous world with a few lakes; uplands and the north are coldest. Geothermal pockets (heat from below, not sunlight) and milder lowlands are the refuges: the origin is always a genuine one, and at least two other regions are green at the start. Most of the land is blocked by the cold, and every proven strategy must answer it somehow. Two families compete: evolve for the cold (Cold Tolerance), or warm the sky (Terraform), which needs fewer Cold points but pushes the warm geothermal refuges toward too hot. The plant's temperature points are shared (cold + heat ≤ 3), so evolving deep cold tolerance leaves no room for heat, while warming the sky works beyond that cap. Water is rarely the limit. Crossing is never the puzzle, and Waterborne Seeds appears only where the generic offer rule finds a real crossing. **Human gate passed** (owner, recorded in BLOOM-012): *"all good"*.

Within the archetype, randomize:

- land and water layout;
- section sizes and adjacency;
- gradients and local exceptions;
- origin location;
- named biomes;
- severity;
- sacrifice zones;
- optional events.

### 10.2 Procedural quality rules

A generated planet must be:

- reachable with available Spread traits;
- simultaneously winnable at the target coverage;
- understandable from its visual and textual signals;
- not solved by one obviously mandatory sequence;
- capable of supporting at least two broad approaches when possible;
- free of long stretches with no relevant decision;
- coherent enough to feel intentionally designed.

### 10.3 Validation layers

The generator validator should check:

1. section contiguity;
2. origin safety;
3. landmass reachability;
4. simultaneous coverage feasibility;
5. required-trait affordability and dependency order;
6. minimum winnable margin;
7. absence of a single unavoidable exact build where possible;
8. pacing estimates for early reachable land and Biomass generation.

Procedural generation is the product, but it must not be expanded before the complete core loop proves fun on a small authored test planet.

---

## 11. WIN, LOSS, AND PRESSURE

### 11.1 Win

A run is won by holding the required percentage of colonizable land **alive at the same time**, normally around 70%.

The threshold is not 100% because some regions should remain legitimate sacrifice zones. The player wins by finding a successful planetary strategy, not by purchasing every possible resistance.

After winning, the player may continue toward 100% or optional performance goals.

### 11.2 Eden

Eden is the sandbox and systems testbed:

- no external loss clock;
- origin refuge and trickle income;
- open experimentation;
- useful for tutorials, accessibility, and testing new starters.

Eden is not the only intended experience and should not determine the balance of pressure modes.

### 11.3 Pressure scenarios

Pressure changes decisions rather than merely shortening the timer.

| Scenario | Strategic change | Science idea |
|---|---|---|
| **Eden** | No external loss pressure | open experimentation |
| **Native Competition** | Another organism claims space and responds to the player | competition and invasive dynamics |
| **Dying World** | Habitability steadily degrades | planetary habitability factors |
| **Volatile Climate** | Heavy Terraform use raises instability and creates shocks | feedback loops and tipping points |
| **Resource Scarcity** | Lower Biomass income increases specialization pressure | resource limitation |
| **Barren and Toxic** | Slow, hostile opening with few easy regions | adaptation under constraint |

The origin may be immune to the player’s own Terraform effects but not to scenario pressure.

### 11.4 Pressure scenario implementation *(addendum: BLOOM-012)*

The procedural archetype phase is complete enough for production (Ocean Archipelago, Desert World, Frozen World; all three human gates passed). Pressure scenarios are the next phase. BLOOM-012 built the reusable architecture and the first scenario, **Dying World**. Details: `docs/SCENARIOS_v1.md`.

- **Orthogonal to planets.** A run is planet + scenario. Scenarios are plain data in `content/scenarios.js` (`eden`, `dying_world`) and reach the engine separately from the planet. No archetype is cloned to make a pressure variant, and no simulation code names a scenario. No scenario, or Eden, is exactly the earlier engine.
- **Pressure works through the environment the player already reads.** A scenario's channels add a drift that grows over the run to the sky temperature, the sky moisture and each region's surface radiation, inside the ordinary evaluation. There is no pressure damage stat, no direct coverage drain and no currency penalty. Biomass changes only because colonies' real conditions change.
- **Clock.** A grace period, then a linear decline to a final state that stays. Reaching the final state is not a loss: a plant suited to the final world can still win and hold 70% there.
- **Terraform and drift stay separate.** Terraform changes the player's sky; the drift is added on top of it and is never undone by it. The UI writes the sky as base + Terraform + thinning = now.
- **Origin.** Under pressure the protected-refuge floor shrinks in proportion to how much of the origin's own habitability the pressure removes (immune to Terraform, not to scenario pressure).
- **Loss.** A scenario may enable extinction: no Living tile anywhere for a short grace period loses the run, with a clear reason and a restart. Short gaps never lose. Eden keeps invariant 1 and never loses.
- **Validation layer P.** Archetype layers 1–8 keep validating the Eden planet. A separate layer proves a planet + scenario combination: real pressured witnesses that buy with earned Biomass while the decline advances, reach the win + margin, and still hold 70% after the final state is reached, with the scenario's own strategy count and pacing bands. Per-archetype rejection is data.
- **Dying World (atmospheric loss).** After 40 s of grace, over about 4 minutes (BLOOM-013; was 60 s and 7 minutes, rescaled with the faster economy of §8.4), the sky loses 40% of its starting moisture, cools by 8 °C, and surface radiation rises by 8. Wording: *Atmosphere thinning — the planet is slowly losing atmosphere. Conditions are becoming drier and colder, and surface radiation is increasing.* It is a simplified model whose directions are coherent; real atmospheric loss does not behave identically on every planet. The same decline lands differently per archetype: Ocean dries late and its hot lowlands cool into range; Desert has little water left to lose but none to spare; Frozen's cold deepens. It is viable on Ocean 13, Desert 25 and Frozen 22. The primary fixture, Ocean 13, has two strategies: evolve for the drier world (Drought Adaptation) or Terraform against it (Humidify). Owner playtest: `docs/PLAYTEST_DYING_WORLD_v1.md` — **REVISE** (2026-10-02: Biomass too slow to strategize), pending the BLOOM-013 economy re-test (`docs/PLAYTEST_ECONOMY_v1.md`). Not human-approved.
- **Not yet built:** Native Competition and the other §11.3 scenarios, a scenario-selection menu, and the final pressure UI. The current pressure bar is temporary functional UI and follows the approved contextual-panel direction rather than growing the left panel.

---

## 12. USER INTERFACE

### 12.1 Main Surface screen

Show:

- planet and animated coverage map;
- coverage versus win threshold;
- current Biomass;
- pressure meter when applicable;
- speed and pause controls;
- compact global climate readouts;
- current warning or field-log message;
- buttons for Spread, Adapt, and Terraform.

### 12.2 Section panel

On selection, show:

- section name;
- Temperature, Water, Soil, and Hazard status;
- one dominant limiting factor;
- barren/living/dead area and vigor;
- maturity and seed output;
- a clear icon showing whether the problem is solved by Adapt, Terraform, or Spread;
- click-through detail for the raw mechanism and science.

### 12.3 Readability rules

- The player should understand why a section stopped within a few seconds.
- Quick labels use ordinary language first and scientific terminology second.
- Red indicates a blocker, yellow indicates marginal performance, and green indicates suitability.
- Popups remain short; deeper explanations are optional.
- Do not show all raw values unless the player requests detail.

### 12.4 Visual direction

The current dark surface demo is an engineering interface, not final art direction.

Target a **cutesy, modern, friendly-science aesthetic**:

- colorful alien biomes;
- rounded, clean panels;
- soft but readable section boundaries;
- expressive icons;
- animated spreading edges, seeds, spores, weather, and atmospheric effects;
- a cute but not childish hero plant;
- a planet that visibly changes from lonely and hostile to lively and green.

Final visual direction remains open and should be explored through quick comparison prototypes before it is locked.

*(BLOOM-010 addendum: approved future direction, not implemented.)* After the procedural playtest the owner judged the gameplay loop good and the main remaining problem **UI crowding**. The crowded permanent left panel is temporary scaffolding. The final information architecture leans toward **contextual pop-out panels, drawers and large cards** (in the spirit of SimCity / The Sims, without copying their look): a larger panel for the selected region, a dedicated colony-development panel, larger surfaces for Adapt / Spread / Terraform, and details on demand. It prefers larger fonts and buttons over compression, and the map stays the visual centre. Details: [`docs/VISUAL_DIRECTION_v1.0.md`](docs/VISUAL_DIRECTION_v1.0.md) §9.

*(BLOOM-009 addendum: approved future direction, not yet implemented.)* The owner's interface north star, the living plant / specimen window, the science-vs-visual separation (Adapt changes the plant; Terraform changes only its environment), the visual-channel framework, the modular plant-art architecture and the rendering-technology escalation path are recorded in [`docs/VISUAL_DIRECTION_v1.0.md`](docs/VISUAL_DIRECTION_v1.0.md). In short: kid-friendly and organic; large type and big touch-friendly controls; a desktop/iPad hybrid feel; no technical-dashboard look; Biomass visually dominant; plain HTML/CSS/canvas/SVG first, heavier rendering only for a demonstrated need. Mechanics validation still comes before the full visual-polish phase.

---

## 13. PLANT VISUAL IDENTITY

The player does not need pet-care mechanics, but the organism should visibly record their strategy.

Use a fixed-order layered plant sprite:

- body form;
- leaf form;
- coating;
- spines;
- pigment;
- salt structures;
- flowers or pods;
- root adaptations.

Composite and cache the plant when traits change. The map shows coverage rather than thousands of individual plant sprites.

The Adapt screen and final Bloom Report should display the resulting organism prominently. The winning summary should connect visible traits to the environments the plant conquered.

*(BLOOM-009 addendum: approved future direction.)* The preferred implementation is **modular authored parts + a code-controlled plant skeleton + deterministic assembly**, not baked per-combination sprites or per-combination image generation. The approved "visual channel" mapping (temperature → silhouette, water → leaf form, soil → roots/tissue, hazard → pigment/surface, spread → reproductive anatomy, local allocation → emphasis, maturity → size/fullness, Terraform → environment only) is in [`docs/VISUAL_DIRECTION_v1.0.md`](docs/VISUAL_DIRECTION_v1.0.md). The Bloom Report reuses the same final specimen.

---

## 14. SCREENS — PLAGUE INC. TRANSLATION

| Plague-style function | BLOOM screen | Purpose |
|---|---|---|
| Type selection | **Choose Your Seed** | starter, planet, scenario, unlocks |
| World map | **The Surface** | spread, bubbles, coverage, section inspection |
| Transmission | **Spread** | reproduction, maturity, geographic crossing |
| Abilities | **Adapt** | Temperature, Water, Soil, Hazard traits |
| Symptoms/risk board | **Terraform** | global changes with scenario-dependent risk |
| Cure bar | **Pressure meter** | scenario-specific threat; hidden in Eden |
| News ticker | **Field Log** | concise warnings and flavor |
| Overview | **Planet Health** | living/dead/barren totals, climate, genome |
| End screen | **Bloom Report** | outcome, unlocks, plant build, science debrief |

The translation should preserve pacing and readability, not copy exact interface details.

---

## 15. ARCHITECTURE AND CONTENT

- Browser-first HTML/JavaScript with no mandatory build step.
- Data-driven planets, traits, scenarios, archetypes, and tuning.
- The authored tutorials and procedural generator emit the same planet model.
- An embedded fallback planet may remain so the game boots over `file://`.
- Rates, costs, thresholds, scales, and category boundaries live in configuration.
- Small demos are useful for risky isolated systems, but shared simulation logic must not be reimplemented independently in several demo files.

### Build workflow revision

Portion 1 successfully validated the surface and generator foundation. The next priority is **not** a more advanced generator or final trait-board UI. The next priority is a tiny complete playable run using the same map foundation.

After that vertical slice is fun:

1. extract or stabilize shared simulation modules;
2. reconnect procedural generation;
3. expand archetypes and content; *(three production archetypes done — BLOOM-005…011)*
4. add pressure scenarios; *(started — BLOOM-012: scenario architecture + Dying World, §11.4)*
5. polish visuals and final board interactions.

---

## 16. NEXT PLAYABLE SLICE — THE FUN GATE

Build one small authored test planet with:

- 8–10 sections;
- one starter plant;
- Temperature, Water, Soil, and Hazard readouts;
- living, barren, and dead transitions;
- contiguous spread and maturity;
- passive Biomass;
- occasional bonus Biomass bubbles;
- a small set of Adapt choices;
- a small set of Spread choices;
- warming/cooling and humidifying/drying Terraform choices;
- die-back and recovery;
- an Eden run with no external pressure;
- a 70% simultaneous living-coverage win.

Temporary buttons and compact lists are acceptable. Final hex boards and production art are not required.

### Questions this slice must answer

- Is watching spread satisfying?
- Can a player understand the next blocker quickly?
- Do purchases create immediate, visible consequences?
- Does Terraform create interesting help-one-region/hurt-another tradeoffs?
- Is passive Biomass paced well?
- Do bonus bubbles add pleasure without becoming chores?
- Does the midgame accelerate?
- Can the player make more than one reasonable build?
- Does a win feel like solving the plant and planet together?

Do not expand the procedural content library until these answers are positive.

---

## 17. SAMPLE TRAIT DIRECTIONS

These are content hypotheses, not a locked final tree.

### Spread

- Seed Output I–III
- Early Maturity
- Runners / Rhizomes
- Wind Seeds
- Waterborne Seeds
- Ballistic Seeds
- Flowering / Pods

### Adapt

- Cold Tolerance
- Heat Tolerance
- Drought Adaptation
- Flood Adaptation
- Salt Handling
- Soil Buffering
- Nitrogen Fixation
- Radiation Shielding
- Toxin Handling
- Resilience

### Terraform

- Greenhouse Forcing
- Albedo Boost
- Humidify
- Aridify
- Oxygenate
- Carbon Sequestration
- archetype-specific planetary interventions later

Every trait needs:

- a clear gameplay effect;
- a one-line ordinary-language explanation;
- a one-line optional science explanation;
- visible feedback where practical.

---

## 18. DATA MODEL DIRECTION

A section may retain raw local data:

```json
{
  "id": "salt_pan",
  "name": "Salt Pan",
  "area": 110,
  "kind": "land",
  "neighbors": ["north_flats", "dust_steppe"],
  "local": {
    "tempOffset": -4,
    "moistureOffset": -20,
    "light": 70,
    "ph": 8.5,
    "salinity": 85,
    "toxicity": 5,
    "radiation": 20,
    "nutrients": 25
  }
}
```

The UI derives four category results from the raw data and current genome:

```json
{
  "temperature": { "state": "marginal", "reason": "cold" },
  "water": { "state": "marginal", "reason": "dry" },
  "soil": { "state": "blocked", "reason": "high_salinity" },
  "hazard": { "state": "clear", "reason": null },
  "limitingFactor": "high_salinity"
}
```

Category derivation and thresholds must live in configuration and be testable independently from UI rendering.

---

## 19. INVARIANTS

1. **No soft-lock:** the origin remains survivable in Eden and supplies a small Biomass trickle.
2. **Readable failure:** every stalled or dying section names one dominant limiting factor.
3. **No flicker:** hysteresis and damped die-back are present from the first simulation build.
4. **Geographic reachability:** generated land is reachable with available Spread traits.
5. **Simultaneous winnability:** the configured win percentage can be alive at once with an affordable reachable build.
6. **Meaningful tradeoffs:** no upgrade path should make all environments irrelevant.
7. **Procedural coherence:** generated worlds follow archetype rules and feel designed.
8. **No mandatory clicking labor:** passive Biomass sustains play; bubbles are bonuses.
9. **Optional depth:** the main screen stays quick to read, with detailed science behind interaction.
10. **Strategy before content volume:** a complete fun loop is proven before more planets and traits are produced.
11. **Data-driven balance:** rates, costs, thresholds, scales, and category mappings are configuration rather than scattered constants.
12. **Equal game-and-science standard:** educational correctness cannot excuse dull play, and entertainment cannot depend on misleading science.

---

## 20. OPEN DECISIONS

These remain intentionally unresolved until the playable slice provides evidence:

- exact temperature-pool unlock/refund rules;
- whether Biomass bubbles auto-collect by default or only through a setting;
- final plant emotional tone and degree of personality;
- final cutesy/modern visual language (narrowed, not locked, by the approved direction in [`docs/VISUAL_DIRECTION_v1.0.md`](docs/VISUAL_DIRECTION_v1.0.md));
- exact number and shape of nodes on each board;
- default procedural section count and run length;
- how much predictive Terraform information the UI should reveal;
- whether light ever becomes a primary category on special worlds.

Do not lock these through prose alone. Use prototypes and playtests.

---

*End of Design Bible v1.1. The governing target is now a procedural, Plague-style plant strategy game with four readable environmental categories, optional scientific depth, passive Biomass plus bonus bubbles, unlockable starters and scenarios, and a complete playable vertical slice as the next development gate.*
