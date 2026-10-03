# BLOOM

A retro-pixel **terraforming / evolution** game in the *Plague Inc.* lineage, built to teach middle-school life & earth science. You are a single pioneer plant dropped onto a hostile world: **evolve** to endure local ground conditions, **terraform** the global sky to bend the whole climate toward you, and win by covering a target % of the planet. The plant drives its own terraform loop — as it spreads it photosynthesizes and changes the atmosphere, so success snowballs (a deliberate echo of the Great Oxidation Event).

> *A planet's "mood" is its sky — you can change that. A region's "personality" is its ground — you have to adapt to that.*

## Status — mechanics-expansion block COMPLETE (every planet and scenario human gate passed; Volatile Climate passed 2026-10-03); BLOOM-016 player game flow built and machine-verified, owner playtest pending; next gate = the PMO / owner UI design-reference review

**To play:** open [`index.html`](index.html) (repo root) in a browser. No URLs to edit: *Start with First Bloom*, or *Choose a New Planet* → pick a planet → pick a scenario → read the briefing → Start.

The original plan was eight isolated portion demos. In August 2026 the **v1.1 direction change** ([PR #1](https://github.com/InterstellarHarvest/bloom/pull/1), see [`docs/GAMEPLAY_DIRECTION_DECISIONS_v1.0.md`](docs/GAMEPLAY_DIRECTION_DECISIONS_v1.0.md)) replaced that march with a single gate: **one complete, ugly-but-playable Eden run** ([`docs/NEXT_PLAYABLE_SLICE_v1.0.md`](docs/NEXT_PLAYABLE_SLICE_v1.0.md)). The slice was built, audited and tuned, and the owner **cleared the gate on 2026-09-26**. Work now follows the bible's post-gate sequence (§15).

| Milestone | What | State |
|---|---|---|
| Portion 1 · The Surface | tile/section model · weighted-Voronoi + procedural generator · water/islands · border tracer | ✅ [`demos/demo-surface.html`](demos/demo-surface.html) |
| Next Playable Slice | one Eden run on the authored 9-section planet *First Bloom*: spread sim (Barren/Living/Dead, hysteresis, die-back, recovery) · Temperature/Water/Soil/Hazard readout + one named limiting factor · passive Biomass + bubbles · temporary Spread/Adapt/Terraform set · hover preview of what a purchase opens/closes · 70% win · Bloom Report | ✅ **gate passed** (owner, 2026-09-26) — [`demos/demo-run.html`](demos/demo-run.html) |
| Slice audit + tuning | fixed a dead shop and misleading readouts; ~5 min perfect-bot run (6–8 min for a person); purchase preview; teaching Bloom Report | ✅ |
| Post-gate 1 · stabilize shared modules (BLOOM-002) | slice simulation extracted to a shared DOM-free engine; tuning, upgrades and the planet moved to data files; gameplay unchanged (bit-for-bit golden) | ✅ |
| Post-gate 2 · reconnect procedural generation (BLOOM-003) | the Portion 1 generator is a shared, seeded module that emits the engine's planet model; the engine models water/impassable terrain; validator foundation (§10.3); `demo-surface.html` uses the shared code | ✅ |
| Post-gate 3a · Waterborne Seeds + reachability (BLOOM-004) | first water-crossing Spread trait (geography-derived crossings, finite range, ordinary fitness rules); validator proves every land tile is reachable with the strongest Spread; generator can keep islands in range | ✅ |
| Post-gate 3b · archetypes + winnability (BLOOM-005) | data-driven archetype layer + **Ocean Archipelago**; deterministic archetype generate → validate → retry; validator layers 4–6 via a real no-cheat **witness build** | ✅ |
| Post-gate 3c · strategy diversity + pacing (BLOOM-006) | validator **layers 7–8**: ≥ 2 materially distinct broad strategies per Ocean Archipelago world, each inside provisional pacing bands; production generation requires layers 1–8 | ✅ |
| Post-gate 3d · procedural-run harness (BLOOM-007) | `demo-run.html?archetype=ocean_archipelago&seed=N` plays a production-generated world in the real game UI; water rendering, island/crossing readouts, Waterborne Seeds preview | ✅ |
| Post-gate 3d′ · colony establishment + Colony Focus (BLOOM-008) | owner-feedback retune: colonies start sparse and establish (Sparse → Establishing → Established → Dense) · map vegetation shaded by stand density · **Colony Focus** (Roots / Leaves / Seeds on one Living region; superseded by BLOOM-009's per-region focus) · golden intentionally regenerated | ✅ |
| Post-gate 3d″ · per-region colony development (BLOOM-009) | owner-feedback iteration: **every colony keeps its own growth focus** (Balanced / Roots / Leaves / Seeds, each with a benefit and a cost) · one Biomass-bought **local specialization** per colony (Root Network / Leaf Canopy / Seed Reserve) · seedlings start much smaller (density 0.15 → 0.05) with a longer seedling → dense journey · Biomass is the dominant HUD element · visible Waterborne seed crossings (arrival vs foothold) · golden intentionally regenerated | ✅ (machine-verified; human verdict pending) |
| **Human procedural playtest** | owner played seeds 13 and 8: [`docs/PLAYTEST_PROCEDURAL_v1.md`](docs/PLAYTEST_PROCEDURAL_v1.md) | ✅ **passed** (owner, after BLOOM-009): gameplay good, colony development kept; the main concern is UI crowding |
| Post-gate 3e · second archetype (BLOOM-010) | **Desert World**: hot, dry, mostly contiguous; water is the problem, wet basins are the refuges; Drought vs Humidify strategies; same generic generate → validate (1–8) → retry path | ✅ **human gate passed with notes** (owner, recorded 2026-10-02): gameplay "decent", move on — [`docs/PLAYTEST_DESERT_v1.md`](docs/PLAYTEST_DESERT_v1.md) |
| Post-gate 3f · third archetype (BLOOM-011) | **Frozen World**: cold, mostly contiguous; temperature is the problem, geothermal pockets and milder lowlands are the refuges; Cold Tolerance vs Warm the Sky, where warming pushes warm refuges toward too hot; Terraform readouts (sky before → after, regions opened / closer / worse) | ✅ **human gate passed** (owner, recorded 2026-10-02): *"all good"* — [`docs/PLAYTEST_FROZEN_v1.md`](docs/PLAYTEST_FROZEN_v1.md) |
| Archetype phase | Ocean Archipelago · Desert World · Frozen World: complete enough for production; no fourth archetype for now | ✅ |
| Post-gate 4a · pressure scenarios (BLOOM-012) | reusable **planet + scenario** architecture ([`content/scenarios.js`](content/scenarios.js), [`docs/SCENARIOS_v1.md`](docs/SCENARIOS_v1.md)): Eden (unchanged) + **Dying World**, a thinning atmosphere that makes the world drier, colder and more exposed to radiation through the ordinary environment model · extinction loss · validation layer P (real pressured witnesses) · temporary pressure bar | ✅ machine-verified · human gate **passed with notes** after BLOOM-013 (below) — [`docs/PLAYTEST_DYING_WORLD_v1.md`](docs/PLAYTEST_DYING_WORLD_v1.md) |
| **Dying World human gate** | owner played Ocean 13 + Dying World | first **REVISE** (owner, 2026-10-02): *"the game still seems a bit slow to actually gain enough biomass to effectively do anything and strategize. things might need to cost less or gain more"* — treated as a shared-economy problem → after BLOOM-013: ✅ **passed with notes** (re-test below) |
| Post-gate 4a′ · Biomass economy + decision cadence (BLOOM-013) | owner-authorized data retune ([`docs/ECONOMY_v1.md`](docs/ECONOMY_v1.md)): start Biomass 40 → 100 and origin trickle 0.1 → 0.3 (no price changes); first global upgrade affordable in ~25–30 s (was ~80–90 s); no purchase gap over 120 s on the study worlds (Ocean 13 Dying World was 306 s); Dying World clock rescaled to the faster runs (grace 60 → 40 s, decline 420 → 250 s); validator pacing bands replaced by the decision-cadence policy; new `tools/economy-study.js` + `tools/economy-check.js`; golden runs intentionally regenerated | ✅ **owner re-test passed with notes** (recorded 2026-10-02): *"seems better, lets move on."* — [`docs/PLAYTEST_ECONOMY_v1.md`](docs/PLAYTEST_ECONOMY_v1.md). Economy human-approved; not reopened without new evidence |
| Post-gate 4b · second pressure scenario (BLOOM-014) | **Native Competition**: a generic competition mechanism (a scenario's `competition` block) with real native tile state that starts established, spreads, recedes and contests the player's colonies at moving fronts; layer P for responsive scenarios (real competitive witnesses, 60 s hold, two confirmation seeds); temporary hatched native layer, amber fronts, region readout, status bar, events, report line | ✅ machine-verified · **owner gate passed with notes** (recorded 2026-10-02): *"fine. continue."* — [`docs/PLAYTEST_NATIVE_COMPETITION_v1.md`](docs/PLAYTEST_NATIVE_COMPETITION_v1.md); no further tuning pass now, limitations stay backlog |
| Post-gate 4c · third pressure scenario (BLOOM-015) | **Volatile Climate**: a generic climate-instability mechanism (a scenario's `climateInstability` block). The player's own Terraform steps unsettle the temperature / moisture axis they change (close steps compound, the climate settles by itself); an unsettled axis announces, then runs, a temporary heat pulse / cold snap / wet surge / dry spell through the ordinary sky inputs; deterministic, no clock, no cooldown, no Biomass tax. Layer P for instability (hold past the last shock; Terraform-heavy witnesses need a real shock). Temporary status bar, Terraform-preview instability line, shock tint/outlines, report line | ✅ machine-verified · **owner gate passed** (recorded 2026-10-03): *"1 - done"* — [`docs/PLAYTEST_VOLATILE_CLIMATE_v1.md`](docs/PLAYTEST_VOLATILE_CLIMATE_v1.md) |
| **Mechanics-expansion block** | planets First Bloom (authored) · Ocean Archipelago · Desert World · Frozen World; scenarios Eden · Dying World · Native Competition · Volatile Climate; three distinct pressure mechanisms | ✅ **complete** (PMO, 2026-10-03). No further archetype or pressure mechanic now |
| Post-gate 4d · player game flow (BLOOM-016) | player entry point [`index.html`](index.html): Home → planet → scenario → briefing → *Preparing planet…* (bounded World Seed search through the real layers 1–8 + layer P) → the run → Bloom Report / extinction with Play this world again · Same planet, new world · Change scenario · Change planet. First Bloom starts directly. Developer URLs unchanged. A clean temporary shell, **not** the final UI | ✅ machine-verified · owner playtest [`docs/PLAYTEST_GAME_FLOW_v1.md`](docs/PLAYTEST_GAME_FLOW_v1.md) **pending** |
| **UI design-reference review** (owner requirement) | PMO + owner review several UI/UX concepts and precedents from comparable strategy/simulation games before the run-screen redesign ([`docs/VISUAL_DIRECTION_v1.0.md`](docs/VISUAL_DIRECTION_v1.0.md) §10) | **next gate** — not started. No final run-screen design is authorized before it |
| Post-gate 5 | visual polish + final boards (§7, §12), including the approved contextual pop-out panels / specimen window, as chosen in the design-reference review | later (**not started**) |

**Procedural validation (BLOOM-006):** validator layers 1–8 (bible §10.3) are implemented. Archetype generation accepts a world only if it passes structural validity, reachability, winnability, the win margin, strategy diversity (≥ 2 materially distinct broad environmental approaches, described by effect-based strategy signatures) and pacing (provisional time bands). This is validator evidence from a perfect-knowledge witness. The owner has playtested Ocean Archipelago seeds 13 and 8 and Desert World seed 25. Since BLOOM-016 the player chooses planets and scenarios from [`index.html`](index.html) (below).

**Procedural-run harness (BLOOM-007):** a generated world can be played in the real game UI through a developer launch path (below). The page calls the production `BLOOM.generateFromArchetype`, so it only ever loads a world that passes layers 1–8. It is a playtest harness, **not the final planet menu**.

**Desert World (BLOOM-010):** the second archetype, chosen to stress different systems from the islands: low water, one mostly contiguous landmass, heat, dryness, a few wet refuges, and the Terraform-vs-Adapt water choice. It is data plus generic generator knobs, with no Desert-specific generator or simulation code. Its own validation policy requires every proven strategy to answer the dry ground and caps the wait after the last purchase (below). Waterborne Seeds stays generic: it is offered only where a real crossing exists (2 of 40 sweep worlds) and is never part of a Desert win. The map gets a tiny temporary sand/dune/lake treatment from archetype data. The owner played it and passed it with notes: *"gameplay is decent. lets move on"* ([`docs/PLAYTEST_DESERT_v1.md`](docs/PLAYTEST_DESERT_v1.md)). No Desert tuning cycle followed; its known limitations (below) stay backlog observations.

**Frozen World (BLOOM-011):** the third archetype stresses a third axis: **temperature**. About 60% of the land is blocked by the cold at the start; uplands and the north are coldest. Geothermal pockets (heat from below) and milder lowlands are the refuges, and every world has at least two besides the origin. Every proven strategy must answer the cold (`requiredConditions: ["Temperature:cold"]`). The two families are Cold Tolerance and Warm the Sky. They differ through mechanics that already existed: the plant's temperature points are shared (cold + heat ≤ 3), and warming the sky reaches beyond that cap but also pushes the warm geothermal refuges past the plant's heat limit. On the main fixture, one Warm step already closes two warm refuges that the Cold Tolerance strategy keeps. It is data plus three new generic generator knobs (`elevationCooling`, `geothermalChance`, `geothermalWarmth`, all neutral at 0) and one new optional archetype rule (`geography.minRefuges`). There is no Frozen-specific generator or simulation code. Waterborne Seeds appears only where a real crossing exists (3 of 40 sweep worlds) and is never needed. The map gets a temporary snow tint (weighted by how cold the ground is now, so warming visibly thaws it), ice glints and cold lake water. Global Terraform effects are now readable in the UI: each region shows its ground temperature and the plant's range in °C; the Terraform preview and the purchase message name every region opened, moved closer but still blocked, made worse, or closed; and the HUD shows the sky change. The owner played it and passed it: *"all good"* ([`docs/PLAYTEST_FROZEN_v1.md`](docs/PLAYTEST_FROZEN_v1.md)).

**Pressure scenarios (BLOOM-012):** a run is now **planet + scenario**. Scenarios are plain data in [`content/scenarios.js`](content/scenarios.js) and are chosen separately from the planet (`&scenario=<id>`). No scenario, or **Eden**, is exactly the earlier game (golden and fixture runs bit-for-bit). **Dying World** is the first pressure scenario. The planet slowly loses its atmosphere: after a 40 s grace, over about 4 minutes (BLOOM-013; was 60 s and 7 minutes), the sky loses 40% of its starting moisture, cools by 8 °C, and surface radiation rises by 8 everywhere. All of it goes through the same evaluation the player already reads (lamps, limiting factor, growth, die-back, Biomass). There is no damage stat, no coverage drain and no currency penalty. The final state stays harsh but is not a loss: a plant suited to it can still win. The run is lost only by **extinction** (no living plants anywhere for 8 s). Terraform keeps working on the player's own sky, and the drift is added on top, so the UI writes the sky as *base + Terraform + thinning = now*. A separate **validation layer P** proves a planet + scenario combination. It uses real pressured witnesses that buy with earned Biomass while the decline advances, and must still hold 70% after the final state. Ocean 13 (the primary fixture), Desert 25 and Frozen 22 all pass, each with two distinct strategies. On Ocean 13 these are answering the drying with Drought Adaptation or with Humidify. Every accepted Eden strategy of those fixtures falls below 70% growable land in the final state, so the earlier solution is no longer enough. The temporary pressure bar sits under the HUD rather than in the crowded left panel. Details: [`docs/SCENARIOS_v1.md`](docs/SCENARIOS_v1.md). Owner playtest: [`docs/PLAYTEST_DYING_WORLD_v1.md`](docs/PLAYTEST_DYING_WORLD_v1.md) — **REVISE**, pending the BLOOM-013 economy re-test.

**Biomass economy + decision cadence (BLOOM-013):** the owner's Dying World verdict (*"still seems a bit slow to actually gain enough biomass to effectively do anything and strategize"*) echoed earlier notes about slow openings, so it was treated as a shared-economy problem. A new study (`tools/economy-study.js`) measures how long a player waits between meaningful Biomass decisions on First Bloom, Ocean 13, Desert 25, Frozen 22 and Ocean 13 + Dying World. Before the retune the first global upgrade was affordable at ~80–90 s, and Ocean 13 + Dying World waited ~5 minutes between Seed Output and Radiation Shielding. After comparing twelve alternatives (start Biomass, origin trickle, colony yield, global price scale, separate local/global scales), the smallest coherent fix won. It is two config values, **start Biomass 40 → 100** and **origin trickle 0.1 → 0.3**, and no price changes. A run now opens with one decision (a 90-Biomass local upgrade for the origin now, or the first global upgrade ~30 s later). Two different options are affordable by ~25–30 s. Purchases recur every ~35–65 s (median), and no recipe has a gap over 120 s, even when the player ignores bubbles. Runs are about a third shorter (a PMO decision point: [`docs/ECONOMY_v1.md`](docs/ECONOMY_v1.md) §6). Dying World's clock was rescaled with the runs, so the decline is still lived through and cannot be ignored. The validators' provisional pacing bands became the decision-cadence policy (first purchase ≤ 60 s, gap ≤ 120 s, margin 240–720 s). Owner re-test: [`docs/PLAYTEST_ECONOMY_v1.md`](docs/PLAYTEST_ECONOMY_v1.md).

**Economy re-test (recorded 2026-10-02 in BLOOM-014):** the owner played the re-test and said *"seems better, lets move on."* The BLOOM-013 economy is human-approved, and the Dying World human gate is passed with notes. Biomass tuning is not reopened without new evidence. The documented 10–20 minute session target stays provisional and unchanged; whether shorter, denser sessions are right stays an open design decision. Runs are never padded with waiting.

**Native Competition (BLOOM-014):** the second pressure scenario. Dying World changes the physical environment; Native Competition puts **another living organism** on the planet that occupies space and responds to the player locally. There is no clock. It is a generic engine mechanism switched on by a scenario's `competition` block; the engine, witness, validators and UI never name the scenario.
- **The natives.** Native vegetation starts established on ~27% of the land, in organic patches (planet-derived, so every run of a planet starts the same). The origin and a 5-tile buffer stay open. It is adapted to the planet's **starting** conditions: halfway between a baseline plant and the planet's typical ground. It reads the same sky, Terraform and local conditions as the player, spreads into open ground, thickens, and recedes where conditions turn against it.
- **Fronts.** Where the two plants meet, the better-suited one pushes into the other's cover. When both suit the ground equally, established colonies hold and young ones can be overgrown. Nothing is direct damage, and red ground stays red (Roots included).
- **Win and loss.** Native cover never counts toward your coverage, and the win stays 70% of the land, so you can leave native strongholds alone. The loss is the generic extinction rule.
- **Counterplay** uses the existing tools only. Adapt raises your own fitness. Terraform shifts the shared environment, weakening some native strongholds and strengthening others (the preview says where). Seed Output works on contested ground. Colony focus falls into a clear spatial pattern: Roots hold a young contested colony, Seeds push a winning front, Leaves pay behind it.
- **Validation.** On the primary fixture, **Desert World 25**, the accepted Eden strategies no longer win (they peak at 43% and 60%). Layer P proves two strategies with real competitive witnesses: Adapt the heat (Heat Tolerance) or Terraform it (Cool the Sky), on top of Drought ×2, Salt and Radiation. Natives peak at 41% and still hold ~20% of the land at the win. Ocean 13 and Frozen 22 also pass. The seeds 1–10 sweep passes 26 of 29 worlds.
- **Economy.** The BLOOM-013 economy is untouched; no gap exceeds ~110 s in the study.
- **UI (temporary).** Native cover is a hatched violet stand, fronts are amber lines, the region panel says who has the advantage and why, a slim bar shows native-held land, its trend and the contested regions, real engine events become short messages, and the Bloom Report adds one competition line.
- Details: [`docs/SCENARIOS_v1.md`](docs/SCENARIOS_v1.md) §6. Owner playtest: [`docs/PLAYTEST_NATIVE_COMPETITION_v1.md`](docs/PLAYTEST_NATIVE_COMPETITION_v1.md).
- **Human gate (recorded 2026-10-02 in BLOOM-015): passed with notes.** The owner said *"fine. continue."* There is no further tuning pass now; the known limitations stay documented backlog observations.

**Volatile Climate (BLOOM-015):** the third pressure scenario, and the last new pressure mechanic before PMO reassesses the route to scenario selection and the larger UI/specimen phase. The pressure comes from **the player's own Terraforming**. Terraform stays powerful, but changing a whole planet quickly unsettles its climate before it settles. It is a generic engine mechanism switched on by a scenario's `climateInstability` block; nothing names the scenario.
- **Instability.** Each Terraform step unsettles its own sky axis (temperature or moisture): one step on a settled climate goes 5% → 35% (*Unsettled*), never a shock. A second step on the same axis soon after compounds (→ 83%, *Critical*). The climate settles by itself (75 s half-life). Adapt and Spread add nothing, and there is no clock and no Terraform cooldown.
- **Shocks.** An axis at 55% or more announces a shock 12 s ahead, then a **heat pulse, cold snap, wet surge or dry spell** swings that sky axis by 8–14 °C or 12–22 moisture for 45 s. The swing goes through the ordinary evaluation (lamps, growth, die-back, Biomass), then returns exactly to the permanent Terraformed sky. Its size follows how unsettled the axis got. Its kind (overshoot of the recent forcing, or rebound) is deterministic from the planet, never the run RNG, so the preview can name it. There is no damage stat and no Biomass tax.
- **Readability (temporary).** A slim bar shows instability (overall, per axis, band), the coming or running shock, a forecast, and the sky as *base + Terraform + shock*. The Terraform preview adds an instability line (*35% → 83% · Unsettled → Critical · ⚠ this will set off a temperature shock in ~12 s, likely a cold snap, about −11.7 °C*). The shock tints the map faintly and outlines the regions it closes or reopens. The inspect panel and the Bloom Report each gain one line.
- **Evidence.** The primary fixture, **Frozen World 22**, proves both target shapes with real witnesses. *Adapt-heavy* (Cold ×2) never leaves 5% instability and sees no shock. *Terraform-heavy* (Cold + Warm ×2) reaches 59%, lives through a real −8.5 °C cold snap that closes and then reopens its newly warmed land, and still wins and holds. In controlled runs, stacking three Warms reaches *Critical*, a 14 °C shock and a later win, while a reckless Humidify ×3 stack can cause extinction. Desert 25 and Ocean 13 pass; Ocean's strategies need at most one Terraform step, so the scenario is mild there. The BLOOM-013 economy and cadence are unchanged (first upgrade ~26–29 s, gaps ≤ 99 s, dead waits identical to Eden).
- Details: [`docs/SCENARIOS_v1.md`](docs/SCENARIOS_v1.md) §7. Owner playtest: [`docs/PLAYTEST_VOLATILE_CLIMATE_v1.md`](docs/PLAYTEST_VOLATILE_CLIMATE_v1.md).
- **Human gate (recorded 2026-10-03 in BLOOM-016): passed.** The owner answered *"1 - done"* to the PMO's recommendation to finish the Volatile Climate run before moving on. This closes the mechanics-expansion block.

**Player game flow (BLOOM-016):** BLOOM now opens like a game. [`index.html`](index.html) at the repo root is the player entry point; nobody needs a query string.
- **Home:** the title, a one-line premise, **Start with First Bloom** (the authored introductory world, launched exactly as the accepted slice) and **Choose a New Planet**, plus a short *How to play*.
- **Planet → scenario:** two separate choices. Planet cards (Ocean Archipelago, Desert World, Frozen World) show a mini map of that kind of world, a one-sentence identity, its main problem and a cue. Scenario cards (Eden, Dying World, Native Competition, Volatile Climate) show what changes and the key idea. They are not ranked by difficulty; only Eden carries a tag (*Relaxed*). All copy is data: `display` in [`content/archetypes.js`](content/archetypes.js), `display.card` in [`content/scenarios.js`](content/scenarios.js), the flow's own copy and search policy in [`content/play.js`](content/play.js). A combination the scenario data marks DISALLOWED would show disabled with the data's own reason (none is today).
- **Briefing:** the planet, the scenario, the goal (keep 70% of the land your plant could live on alive at the same time) and three reminders (*Adapt changes your plant · Terraform changes the planet · Spread helps your plant reach new ground*). Clues, never a build.
- **Preparing planet…:** Start opens `demos/demo-run.html?play=1&archetype=…&scenario=…`. The page picks World Seeds with the browser's crypto random source and runs the real production path on each in turn ([`resources/bloom-play.js`](resources/bloom-play.js)): archetype layers 1–8, then layer P when the scenario changes the run. The first accepted world starts. A rejected candidate is never started; after 6 candidates the page shows a friendly *No playable world found* screen (Try again / Change selection / Home). It never swaps in another planet, a weaker scenario or Eden. Served over http the search runs in a worker ([`resources/bloom-play-worker.js`](resources/bloom-play-worker.js)) and the screen stays fully responsive; over `file://` browsers refuse workers, so it runs on the page one step at a time (each step can hold the page for a few seconds on slow combinations). Cancel returns to the briefing.
- **The run:** the accepted URL replaces the address (`?play=1&archetype=…&seed=…&scenario=…`), so reload or a shared link reopens the same world. The footer shows *planet · World Seed: N · scenario*. A **Menu** offers Play this world again · Same planet, new world · Change scenario · Change planet · Home, with a confirmation before leaving a live run.
- **After the run:** the Bloom Report and the extinction screen are unchanged, plus the same five actions under *What next?*. *Play this world again* = same planet, World Seed and scenario (same map; a fresh start, so outcomes depend on play). *Same planet, new world* = same planet + scenario, new World Seed. Every action opens a new page, so nothing of the old run carries over. There is no save game.
- **Developer harness unchanged:** `demos/demo-run.html` with `?archetype=…&seed=…&scenario=…` (no `play=1`) behaves exactly as before: one explicit seed, developer footer, explicit failure panels, no search, no player menu.
- QA: `tools/game-flow-check.js`. Owner playtest: [`docs/PLAYTEST_GAME_FLOW_v1.md`](docs/PLAYTEST_GAME_FLOW_v1.md).
- **Not the final UI.** Layout, typography, icons (temporary emoji) and art are placeholders. The owner asked to review design ideas and precedents from similar games first; that **design-reference review** is the next gate ([`docs/VISUAL_DIRECTION_v1.0.md`](docs/VISUAL_DIRECTION_v1.0.md) §10).

**Colony establishment (BLOOM-008) + per-region colony development (BLOOM-009), owner-authorized retunes:**

- **Stand density.** Each Living tile carries a stand density. A new tile is a tiny seedling stand (0.05; 0.15 before BLOOM-009) that thickens while its section can grow. A section's *establishment* (Σ density / area) sets how strongly the colony seeds outward and how much Biomass it yields. The inspect panel shows it as *Colony: Sparse / Establishing / Established / Dense* plus a %. The map draws each tile from its real density, from a tiny pale sprout to a full dark tile, so a fully Living region keeps visibly thickening.
- **Growth focus, per region.** Every Living region keeps **its own** growth focus (`sim.setColonyFocus(i, mode)` / `getColonyFocus(i)`). Balanced is the default. Changing one region never touches another. A focus redistributes the colony's sugar budget, so each mode costs something:
  - **Roots:** establish faster; hold on in marginal ground (never red ground); −10% Biomass from that colony.
  - **Leaves:** up to +50% Biomass, ramping with the colony's establishment; −40% seeds.
  - **Seeds:** +60% outward spread and Waterborne pressure; −30% Biomass.
- **Local specializations.** A colony may buy **one** permanent specialization with ordinary Biomass: **Root Network**, **Leaf Canopy** or **Seed Reserve**. They cost 90, 130, 170 … (each purchase raises the next). A specialization matching the colony's focus works 25% better (capped).
- **Region-owned.** Focus and specialization belong to the region. They persist through die-back and total loss, stay dormant while nothing lives there, and act again when the region is recolonized.
- **What they never do.** Neither changes fitness, tolerances or thresholds.
- **Evidence and config.** The BLOOM-009 study ([`docs/evidence/bloom-009/colony-study.txt`](docs/evidence/bloom-009/colony-study.txt)) shows situational per-colony play beating Balanced, and Balanced beating misplaced allocations; Leaves is no longer the automatic answer. All numbers are in `config.colony` / `config.establish`. Validator witnesses never allocate or invest, so layers 4–8 are a no-allocation floor.
- **Other BLOOM-009 changes.** Biomass is now the dominant HUD element. Waterborne crossings show seed dots crossing the water: a faint ripple means the seeds arrived; a bright burst means a new foothold.

**Visual direction (approved future direction, not implemented):** kid-friendly and organic; large type and big touch-friendly controls; a desktop/iPad hybrid; no technical-dashboard look; Biomass visually dominant. A future living-plant **specimen window** will show the plant evolving while the map shows the planet blooming. Plants will be built from modular authored parts assembled by code, and rendering stays on plain HTML/CSS/canvas/SVG unless a demonstrated need appears. The crowded permanent left panel is temporary scaffolding: the final layout leans toward **contextual pop-out panels, drawers and large cards** (region panel, colony-development panel, larger Adapt / Spread / Terraform surfaces, details on demand), with the map as the visual centre. Details: [`docs/VISUAL_DIRECTION_v1.0.md`](docs/VISUAL_DIRECTION_v1.0.md) (§9 for the panels). Visual polish has **not** begun.

**What the slice proves (verified headless):** several broad winning builds exist. The human-paced recipes in `slice-check` are: the *wet* build (Flood I), which gives up Dust Reach; the *dry* build (Drought I), which gives up Marsh Low; and a *Terraform* build (Humidify ×2 instead of Drought, with no water Adaptation), which also gives up Marsh Low. The witness solver finds more (e.g. a Cool or Warm Terraform replacing a temperature point). The tested build with **neither water Adaptation nor water Terraform** (Seed Output ×2, Early Maturity, Cold ×2, Heat, Salt, Radiation) caps at 67.6%. The solver's static search agrees: within its bounds, no build without a water tool exceeds 67.6%. Over-committing (Flood/Drought II) collapses the home regions, and the preview warns you before you do that.

## Next steps (bible §15 post-gate sequence)

1. ~~Extract/stabilize shared simulation modules~~ (BLOOM-002) · ~~reconnect procedural generation~~ (BLOOM-003).
2. ~~Water-crossing Spread + geographic reachability~~ (BLOOM-004).
3. ~~Archetype layer, Ocean Archipelago, validator layers 4–6~~ (BLOOM-005) · ~~layers 7–8: strategy diversity + pacing~~ (BLOOM-006).
4. ~~Developer procedural-run harness~~ (BLOOM-007) → ~~owner procedural playtest~~ (passed after ~~BLOOM-008~~ / ~~BLOOM-009~~).
5. ~~More archetypes and content~~ (§10.1, §17): ~~Desert World~~ (BLOOM-010; human gate passed with notes) · ~~Frozen World~~ (BLOOM-011; human gate passed). The archetype phase is complete enough for production; no fourth archetype for now.
6. **Pressure scenarios** (§11): ~~scenario architecture + Dying World~~ (BLOOM-012; human gate passed with notes after BLOOM-013) · ~~shared Biomass economy + decision-cadence retune~~ (BLOOM-013; owner re-test passed with notes) · ~~Native Competition~~ (BLOOM-014; human gate passed with notes) · ~~Volatile Climate~~ (BLOOM-015; human gate passed) — mechanics-expansion block complete. ~~Player game flow + planet / scenario selection~~ (BLOOM-016; owner playtest [`docs/PLAYTEST_GAME_FLOW_v1.md`](docs/PLAYTEST_GAME_FLOW_v1.md) pending). The other §11.3 scenarios are not planned now.
7. **UI design-reference review** (owner requirement, next gate): PMO + owner review several UI/UX concepts and precedents from comparable games ([`docs/VISUAL_DIRECTION_v1.0.md`](docs/VISUAL_DIRECTION_v1.0.md) §10). Only then **visual polish and final board interactions** (§7, §12): contextual panels, specimen window, modular plant parts.
   - **BLOOM-017 UI concept mockup sandbox** (for that review): [`demos/ui-mockups/index.html`](demos/ui-mockups/index.html) is a gallery of four clickable run-screen layout concepts, with notes in [`docs/UI_CONCEPT_REVIEW_v1.md`](docs/UI_CONCEPT_REVIEW_v1.md). They are **visual mockups only**: fake data, scripted interactions, no connection to the engine, generator, validator, scenarios or Bloom Report. They are **not the game** and not evidence of a production UI. No concept is chosen yet.
   - **BLOOM-018 UI concept iteration 2** (after the owner's review of Round 1): the same gallery now has **Round 1 / Round 2** tabs and opens on Round 2. Concepts 5–8 vary region inspection (anchored popover vs edge sidecar), where Adapt / Spread / Terraform open (palette, card stack, bottom workbench, side workbench), the Regions browser and a compact heatmap lens. All four have persistent Pause and speed controls. The owner's decisions (kept and rejected directions, the map-geometry rule) and the review notes are in [`docs/UI_CONCEPT_REVIEW_v2.md`](docs/UI_CONCEPT_REVIEW_v2.md). These are still visual mockups only, and the production run-screen rebuild is not started.
   - **BLOOM-019 convergence prototype** (after the owner's review of Round 2): the gallery opens on a new **Convergence** tab with **Concept 9, a unified side workbench**. One right-side workbench serves Region, Regions, Map View, Adapt, Spread and Terraform. A region click opens Region mode, and clicking another region updates it in place without moving the map. One Explore / Change tool rail replaces the scattered controls, and the top status banner is larger and centred. A review-only switch compares three Region layouts (A tabbed / B dashboard + tabs / C sections). Notes, measured map geometry and open owner questions are in [`docs/UI_CONCEPT_REVIEW_v3.md`](docs/UI_CONCEPT_REVIEW_v3.md). It is still a visual mockup only; the production UI is not locked.
8. Still-open design questions (need prototypes, not debate): bubble frequency/auto-collect, how much to predict before a Terraform buy, final plant personality, exact board layout.

Tuning stays data-only: every rate/cost/threshold is in [`content/config.js`](content/config.js). An intended retune regenerates the golden with `node tools/sim-check.js --write` and must say so in its commit.

## QA

```bash
node tools/sim-check.js                                                  # engine + content, Node, <1 s
node tools/gen-check.js                                                  # generator, validator, water, Node, ~5 s
node tools/crossing-check.js                                             # Waterborne Seeds / crossings, Node, <1 s
node tools/archetype-check.js                                            # archetypes, winnability, 40-seed production sweep, Node, ~55 s
node tools/strategy-check.js                                             # layers 7–8: strategy diversity + pacing, Node, ~16 s
NODE_PATH="$(npm root -g)" node tools/desert-check.js [--shots <dir>] [--json <out>] [--no-browser]  # Desert World archetype, Node + browser, ~60 s
NODE_PATH="$(npm root -g)" node tools/frozen-check.js [--shots <dir>] [--json <out>] [--no-browser]  # Frozen World archetype, Node + browser, ~2.5 min
NODE_PATH="$(npm root -g)" node tools/dying-world-check.js [--shots <dir>] [--json <out>] [--no-browser]  # pressure scenarios + Dying World, Node + browser, ~40 s
NODE_PATH="$(npm root -g)" node tools/slice-check.js [--shots <dir>]     # demo-run UI, real shop buttons
NODE_PATH="$(npm root -g)" node tools/surface-check.js [--shots <dir>]   # demo-surface UI, both modes
NODE_PATH="$(npm root -g)" node tools/procedural-run-check.js [--shots <dir>]  # demo-run procedural harness, real controls
NODE_PATH="$(npm root -g)" node tools/colony-development-check.js [--shots <dir>]  # BLOOM-009 per-region colony development (engine + UI)
NODE_PATH="$(npm root -g)" node tools/economy-check.js [--shots <dir>] [--json <out>] [--no-browser]  # BLOOM-013 economy + decision cadence, Node + browser, ~4 min
NODE_PATH="$(npm root -g)" node tools/native-competition-check.js [--shots <dir>] [--json <out>] [--no-browser]  # BLOOM-014 Native Competition, Node + browser, ~2 min
NODE_PATH="$(npm root -g)" node tools/volatile-climate-check.js [--shots <dir>] [--json <out>] [--no-browser]  # BLOOM-015 Volatile Climate, Node + browser, ~2 min
NODE_PATH="$(npm root -g)" node tools/game-flow-check.js [--shots <dir>] [--no-browser]  # BLOOM-016 player game flow (index.html → run → actions), Node + browser, ~1.5 min
node tools/pacing-metrics.js [--json <out>]                              # opening / pacing measurements (report, not pass/fail)
node tools/colony-study.js [--json <out>] [--quick] [--worlds fb,13,8,d25,d9,f22,f12]  # per-colony allocation + local-investment study (report; d<N> / f<N> = Desert / Frozen seed N)
node tools/pressure-study.js [--scenario dying_world] [--seeds 20] [--json <out>]  # one scenario across every archetype + the fixtures (report, ~4 min)
node tools/economy-study.js [--json <out>] [--seeds N] [--quick|--brief] [--worlds fb,o13,d25,f22,o13dw,d25dw,f22dw | opt-in d25nc,o13nc,f22nc · f22vc,d25vc,o13vc] [--set econ.x=…]  # decision cadence (report, ~9 min full)
                                                                         # (opt-in: --worlds d25nc,o13nc,f22nc = Native Competition)
```

- **`sim-check.js`** (19 checks, no dependencies):
  - the golden First Bloom runs, bit-for-bit (run traces intentionally regenerated by BLOOM-008, BLOOM-009 and BLOOM-013 — the last for the economy retune; the static layout/evaluation/price part is unchanged since adc87d0; a fifth run, `colonies`, pins several regions holding different allocations at once, a one-region change and a Biomass-bought Leaf Canopy);
  - content is pure data;
  - the engine has no DOM access;
  - config drives behavior;
  - a second planet runs on the unchanged engine;
  - water sections are modeled as impassable, and unknown terrain is still refused;
  - traits added after the golden (Waterborne Seeds) are not offered on First Bloom.
- **`gen-check.js`** (47 checks, no dependencies):
  - fixed seeds for zero water, moderate water, islands and a denominator case;
  - reachability under ordinary spread vs the strongest Spread, including rejecting an out-of-range archipelago;
  - same seed reproduces exactly, and different seeds diverge;
  - a 375-map sweep through the validator;
  - validator negative tests (each defect is caught);
  - generated planets run 3,000 ticks in `BLOOM.createSim`;
  - water is out of the win denominator;
  - spread never crosses water (with a land control case);
  - malformed terrain is rejected.
- **`crossing-check.js`** (14 checks, no dependencies):
  - the same strait with and without the trait;
  - water untouched;
  - finite range (a 7-tile gap stays unreached, a 6-tile gap is reached);
  - a hostile island receives seeds but never establishes;
  - a colony that turns hostile dies back;
  - a generated archipelago is fully colonized.
- **`archetype-check.js`** (40 checks, no dependencies):
  - archetype schema;
  - deterministic generate/retry and explicit bounded failure;
  - a 40-seed Ocean Archipelago coherence sweep through the full layers 1–8 production path (water, landmasses, moisture, sections, crossing required, adaptation needed, variety), plus the layer 7–8 statistics: rejections by layer, strategy classes, margin/win/first-purchase/gap distributions, runtime;
  - the winning fixture (seed 8) with layers 4–6, an independent earned-Biomass replay, and proof that Waterborne Seeds and an Adapt decision are both required;
  - negative fixtures rejected at layer 4 (seed 3) and layer 6 (seed 25);
  - solver bounds and determinism;
  - First Bloom passes layers 4–6 too.
- **`strategy-check.js`** (36 checks, no dependencies), layers 7–8:
  - the pacing policy is archetype data, and the schema rejects bad bands;
  - positive fixture (seed 13, attempt 6): two materially distinct strategies (Cold + Salt vs Heat + Radiation, holding different land), each replayed independently with earned Biomass, each buying its whole core before the margin, both inside the pacing bands;
  - signature rules: purchase order, Spread boosters, redundant add-ons and trait ids never make a new strategy;
  - negatives: layer 7 single-strategy (seed 5 attempt 5, a static proof); layer 8 too slow (seed 6 attempt 0); too fast (seed 1 attempt 2 — natural since BLOOM-013, plus a controlled boundary); purchase gap (seed 32 attempt 10, plus a controlled boundary); first purchase too late (a controlled boundary: since BLOOM-013 no natural world in seeds 1–40 × attempts 0–23 misses the 60 s first purchase). These natural fixtures were re-picked after BLOOM-008's and again after BLOOM-009's retune moved individual witness timings; the bands did not change;
  - caps produce INCONCLUSIVE, never FAIL, and production rejects INCONCLUSIVE;
  - determinism; production worlds record and re-validate layers 1–8;
  - First Bloom's Terraform water alternative and the exact 67.6% no-water-tool cap.
- **`slice-check.js`** (15 checks) drives the **real shop buttons**: pacing, the wet, dry and Terraform (Humidify, no water Adaptation) winning builds, tradeoff guards, preview, readouts, Bloom Report.
- **`surface-check.js`** (11 checks) drives the surface demo toolbar, proves it renders the shared generator's planets, and finds an in-range archipelago through New Map.
- **`procedural-run-check.js`** (32 checks) drives the procedural harness in a real browser with real clicks:
  - First Bloom is still the default (no Waterborne Seeds, no identity line);
  - seed 13 is generated in-page through the production path and matches Node; no witness data reaches the page;
  - water and landmasses render, and a water click is a non-colonizable note;
  - island inspection shows the four categories plus a geography note;
  - Adapt and Waterborne Seeds previews;
  - a full win through real shop clicks, with a crossing foothold that keeps spreading, coverage over land only, and the Bloom Report's identity and analogs with no First Bloom names;
  - bubbles, pause and speed;
  - a seed-8 smoke run;
  - seed 35 and a malformed seed give an explicit failure state with no world started.
- **`colony-development-check.js`** (68 checks; BLOOM-009, grew out of BLOOM-008's `colony-focus-check.js`) runs controlled engine experiments (same map and RNG, one variable changed) and drives the real UI:
  - **per-region allocation:** it persists independently across regions, and changing one region touches no other. It survives ticks, die-back and total loss (dormant, then active again on recolonization). The old global focus is gone.
  - **Roots:** faster establishment on yellow ground; keeps thickening in the marginal band; less die-back under stress; bit-identical to Balanced on red ground (even with a Root Network); costs Biomass on a colony that is already dense.
  - **Leaves:** more of that colony's own Biomass with identical cover, ramping from ~0 on seedlings to full on dense stands; fewer seeds; no change to fitness or previews.
  - **Seeds:** stronger outward push and earlier Waterborne footholds, with destination fitness untouched. On a hostile island seeds arrive but never take root.
  - **local specializations:** paid with real Biomass; refused when Biomass is short; tied to one region; one per region; kept when the focus changes; rising price and a capped synergy. Root Network establishes more strongly than Roots and speeds regrowth; Leaf Canopy pays far more on a dense colony; Seed Reserve brings Waterborne footholds sooner. None changes tolerances or evaluation, and global shop prices and purchases are unaffected.
  - **strategies:** First Bloom stays winnable with no allocation or investment. Situational per-colony play beats Balanced, which beats misplaced play. Leaves-everywhere loses to situational play. Over-investing never soft-locks the global game. Seeds 13 and 8 stay production-valid (layers 1–8) and winnable; seed 35 still fails.
  - **density:** new tiles start at 0.05 (0.15 before), still reach Dense, and keep thickening after a region fills.
  - **UI:** four focus buttons plus the local upgrades with Biomass costs and "need N more"; real map and button clicks across three regions; focus badges drawn on the map; purchase and refusal through real clicks; Biomass is the largest HUD text; live 1× clicks land. The same origin region is captured from just-seeded to Dense, and the drawn patch area tracks `sim.dens`. Crossing animations copy real engine events only; a foothold ends in a bright burst, a hostile arrival never does.
- **`desert-check.js`** (64 checks; BLOOM-010) — Node part, then a real-browser part:
  - **archetype data:** schema, including rejections for the new optional keys; the catalogue is plain data; Ocean Archipelago's policy is untouched.
  - **determinism:** same seed → same world, recorded params reproduce it, deterministic bounded retry, explicit failure.
  - **40-seed sweep** through the full production path. The desert has to stay recognizable: low water, contiguous land, much drier and warmer than Ocean and the default generator, never uniformly lethal, varied, with genuine refuge origins. The check also enforces the sweep quality bar and prints the full statistics.
  - **positive fixture (seed 25):** two materially different strategies holding different land — organism-first Drought ×2 vs Drought + Humidify + Heat + Radiation. It also covers an independent earned-Biomass replay, the margin, the pacing bands, and a static proof that the water problem is real.
  - **Waterborne Seeds is generic:** absent on every one-landmass desert, never in a Desert win, still required on Ocean.
  - **natural negatives:** layer 4 (seed 35/0), layer 7 (50/0), layer 8 (16/0) and a non-refuge origin (9/0), each skipped by production.
  - **other worlds:** First Bloom valid; Ocean seeds 13/8 still pass with stable identities; Ocean seed 35 still fails explicitly.
  - **colony development** works unchanged on a desert.
  - **browser:** launch and identity; the sand/lake treatment renders; dry-region inspection with both remedies; the lake-water note; the Drought preview; wins through real shop buttons with both strategies; the Bloom Report; no Ocean wording and no witness data; Ocean seeds 13/8 still launch.
- **`frozen-check.js`** (BLOOM-011; numbered after the directive's items 1–46) — Node part, then a real-browser part:
  - **archetype data:** schema (including the new optional keys), plain data, three archetypes, each owning its policy; the new generator knobs are generic and neutral, and 56 Ocean/Desert/default planets are bit-for-bit identical to d6e9a5c.
  - **determinism:** same seed → same world; recorded params reproduce it; deterministic retry (seed 22: attempt 0 rejected at layer 8 → attempt 1); explicit bounded failure.
  - **40-seed sweep** through the full production path: water in tolerance, mostly contiguous, far colder than Ocean / Desert / the default generator, never uniformly lethal, several genuine refuges, genuine refuge origins, most land blocked by the cold, every strategy answering the cold, the sweep quality bar; full statistics printed.
  - **positive fixture (seed 22):** Cold Tolerance ×2 vs Cold Tolerance + Warm the Sky ×2, holding different land (the warmer sky makes two warm geothermal refuges too hot); a static proof that no build without a temperature tool reaches 70%; Waterborne Seeds not offered or needed; independent earned-Biomass replays; margin and pacing.
  - **natural negatives:** layer 4 (46/22, off the production path: layer 4 is rare on Frozen), layer 7 with Temperature not required (171/0), layer 8 (22/0), a non-refuge origin (8/0).
  - **colony development** unchanged; Roots and Root Network never colonize or hold red-cold ground; a colony-study comparison on the fixture.
  - **other worlds:** First Bloom, Ocean seeds 13/8/35 and the Desert fixture are unchanged; the Desert human gate is recorded.
  - **browser:** launch and identity; the snow/ice treatment differs from Desert and Ocean; frozen-region and geothermal inspection with the temperature line; the Cold and Warm previews; sky readouts before and after each Warm purchase; wins through real shop buttons with both strategies; the Bloom Report; no Ocean or Desert wording; no witness data.
- **`dying-world-check.js`** (63 checks; BLOOM-012, numbered after the directive's items 1–48) — Node part, then a real-browser part:
  - **catalogue + Eden:** plain data; no scenario-specific code; Eden (explicit, or no scenario) reproduces the First Bloom golden and the Ocean 13/8, Desert 25/9 and Frozen 22/12 worlds and 3000-tick runs pinned to 1b7ea2a.
  - **pressure clock:** starts at zero, grace as configured, monotonic, reaches its maximum and stops; each channel follows the data; deterministic; unknown or malformed scenarios fail explicitly; nothing is mutated.
  - **through the environment:** every pressured evaluation equals an Eden evaluation of the same shifted conditions; a region turns green → yellow → red purely by pressure; Radiation Shielding, Drought Adaptation, Humidify and Warm the Sky answer the matching drift; Terraform never changes the scenario clock; Roots + Root Network cannot rescue red ground; Biomass changes only through colony condition (same income as an Eden world with those conditions).
  - **extinction:** exact grace; shorter gaps never lose; a frozen, clearly explained loss; Eden never loses.
  - **layer P:** Ocean 13 (two strategies: Drought vs Humidify), Desert 25 and Frozen 22 pass with real pressured witnesses, plus an independent earned-Biomass replay; every Eden fixture strategy falls below 70% in the final state; water and Waterborne Seeds are untouched; a per-archetype DISALLOWED policy works.
  - **browser:** launch identity; no solution data in the page; the pressure bar follows the real sim; effective readouts; Terraform vs drift in the bar and messages; milestones at the configured thresholds; threshold outlines; the map drawn from the effective climate under the haze; a win through real shop clicks; a doomed control lost by extinction, with restart; the Bloom Report's scenario line; explicit failures; Desert and Frozen launches.
- **`native-competition-check.js`** (66 checks; BLOOM-014, numbered after the directive's items 1–50) — Node part, then a real-browser part:
  - **data + compatibility:** Native Competition is plain scenario data; no scenario-id special case anywhere; Eden (First Bloom golden, procedural Eden runs) and Dying World (runs + layer P verdicts) and the fixture worlds' whole validator records equal 8a15863.
  - **native state:** planet-derived and deterministic; inside the configured start range (fixtures + a 23-world sweep); origin buffer; land only, never water or lava; one organism per tile.
  - **a living competitor:** it spreads, recedes when conditions turn lethal, gains far less of a region the player holds, and the player's spreading moves the fronts.
  - **contest rules (controlled fronts):** established colonies hold and reclaim; young ones lose; red ground stays red with Roots + Root Network; Adapt flips a region only through the player's fitness; Terraform moves native fitness both ways and never deletes cover; Spread works on contested ground.
  - **economy + loss:** income equals the ordinary colony formula every tick; competition code never touches Biomass; BLOOM-013 values; native cover is never coverage; extinction and its grace.
  - **layer P:** Desert 25 with 2 strategies, Ocean 13, Frozen 22; replayed witnesses earn everything, live through real native expansion and never allocate colonies; the Eden strategies no longer win; Waterborne Seeds stays geography-driven.
  - **colony experiments:** Roots holds a young contested colony, Seeds pushes a winning front, Leaves pays and protects nothing.
  - **browser:** identity; native cover differs by colour AND pattern; the region readout; the status bar without a countdown; events; a win through real shop buttons; extinction + restart; the report line; no solution data; explicit failures; Ocean 13 and Frozen 22 launch.
  - (BLOOM-015: check 46 now checks each shown event's own message instead of the footer's last line — the live UI's Math.random could put a scripted purchase message after the last event; the untouched 9252924 suite failed it in 1 of 3 runs.)
- **`volatile-climate-check.js`** (78 checks; BLOOM-015, numbered after the directive's items 1–62) — Node part, then a real-browser part:
  - **data + compatibility:** Volatile Climate is plain scenario data (a malformed block is refused); no scenario-id special case anywhere; Eden (First Bloom golden + fixture runs), Dying World and Native Competition (runs and layer P verdicts on Frozen 22 / Desert 25 / Ocean 13) equal 9252924; no block = no climate state; a never-Terraform run is the Eden run bit-for-bit with the same RNG draws.
  - **instability:** deterministic (shock history identical under another run RNG); baseline; only Terraform forces (Adapt / Spread never); exact settling half-life; same-axis compounding; no Terraform cooldown; bands, trigger, kind, duration and size follow the data.
  - **shocks:** move the real effective temperature / moisture; the permanent Terraform stays; a clean end with no planet mutation; no coverage damage outside die-back; Biomass = start + income + grants − spending exactly; regions close and reopen through ordinary fitness.
  - **controlled experiments:** extra Cold Tolerance means fewer regions closed; Roots on marginal (not red) ground; Leaves no immunity; Seeds regrowth after the shock; the preview's prediction equals the real shock; extinction + grace; a reckless stack that dies out; stacked vs spaced Terraform.
  - **layer P:** Frozen 22 with an Adapt-heavy (no shock) and a Terraform-heavy (real shock, hold after it, mechanic evidence) strategy; Desert 25 (3 strategies) and Ocean 13 with controlled moisture shocks; Waterborne Seeds geography; BLOOM-013 economy hashes; cadence (first purchase, gaps, dead waits vs Eden).
  - **browser:** identity; status bar (real values, no countdown); a real Terraform click; the shop preview's shock warning; a real shock announced / running / ending with messages, map tint, inspect note and *base + Terraform + shock*; outlines attributed to the shock; a reckless control; a win through real shop buttons; the Bloom Report line; the extinction screen; no solution data; explicit failure; Eden unchanged; Desert and Ocean moisture shocks.
- **`game-flow-check.js`** (BLOOM-016; numbered after the directive's items 1–58, 51–58 = the other suites) — Node part, then a real-browser part:
  - **Node:** card copy is data (and appears nowhere in the pages); plain data; no difficulty ranking; the world search calls the real `generateFromArchetype` (layers 1–8) and the real `validateScenario` (layer P) for the chosen planet + scenario only; a layer-P reject (Frozen 41017 + Dying World) and a planet reject (Ocean 7) are skipped and only the next accepted seed is returned; all-rejected → explicit failure; DISALLOWED data stops before any generation; no Math.random; no witness or strategy data in the result; the same World Seed reproduces the same planet.
  - **browser:** `index.html` over `file://`: Home / First Bloom / planet cards (with drawn mini maps) / scenario cards / briefing (planet, scenario, 70% goal, Adapt · Terraform · Spread); hash-route Back / Forward; keyboard-only Tab + Enter with a visible focus ring; 1366, 1024, 768 and 390 px widths; a spy proves the selection screens never call a validator; a double click starts once; *Preparing planet…*; the accepted run's identity, World Seed and URL; no developer terms on player screens; Menu with confirmation; Play again (same map, clean state after a dirty run), Same planet new world, Change scenario, Change planet; retry and bounded failure in the page; developer URLs (direct, no scenario, five malformed); First Bloom; a won Bloom Report through real shop buttons and an extinction, both with the actions; over http: the worker path accepts the same world as the harness, the screen keeps animating during a slow check, Cancel returns to the briefing; a DISALLOWED card.
- All ten browser suites need `npm i -g playwright`.
- Exit code 1 = failure for all sixteen suites.

## Architecture

```
resources/bloom-sim.js       shared simulation engine, no DOM: layout (Voronoi or explicit tilemap),
                             water/impassable terrain, water crossings, 4-category evaluation, tick,
                             colony establishment (stand density), per-region colony development (focus +
                             local specializations), crossing events, economy, bubbles, win, upgrade effects,
                             purchase preview, grid geometry (BLOOM.geo), scenario pressure + extinction,
                             generic competition (a scenario's native organism: tile state, contest, events)
resources/bloom-gen.js       seeded procedural surface generator → the engine's planet model
resources/bloom-validate.js  planet validator (bible §10.3 layers 1–8)
resources/bloom-witness.js   witness solver: winnability (layers 4–6), strategy diversity + pacing (7–8)
resources/bloom-archetype.js BLOOM.generateFromArchetype: deterministic generate → validate → retry
resources/bloom-scenario.js  BLOOM.validateScenario: scenario validation layer P (real pressured / competitive witnesses)
content/config.js            every rate / cost scale / threshold / category boundary (§15, invariant 11)
content/traits.js            the upgrade catalogue as data: board, effect type, cost, science line
content/archetypes.js        planet archetypes as data (Ocean Archipelago, Desert World, Frozen World)
content/scenarios.js         scenarios as data (Eden, Dying World, Native Competition), orthogonal to planets
planets/first_bloom.js       the authored slice planet
demos/demo-run.html          UI + rendering for a run: First Bloom by default; ?archetype=<id>&seed=<n> plays a generated world; &scenario=<id> adds a scenario
demos/demo-surface.html      UI + rendering for the surface demo (authored Cinder-Frost + Random)
demos/ui-mockups/            UI concept mockups: gallery (Round 1 = BLOOM-017 concepts 1–4, Round 2 = BLOOM-018 concepts 5–8, Convergence = BLOOM-019 concept 9): visual sandbox only, fake data, never loads the engine
tools/                       sim-check · gen-check · crossing-check · archetype-check · strategy-check (Node) · slice-check · surface-check · procedural-run-check · colony-development-check (browser) · desert-check · frozen-check · dying-world-check · economy-check · native-competition-check · volatile-climate-check (Node + browser) · pacing-metrics · economy-study · colony-study · pressure-study (reports) · golden/
docs/evidence/               screenshots attached to directive reports
```

- **One planet model.**
  - An authored planet gives section `center`s and gets a weighted-Voronoi layout.
  - A procedural planet carries an explicit `tilemap` (section index per tile, `-1` = water).
  - Sections may be `kind: "land"` (default) or `"water" | "void" | "lava"`.
  - `BLOOM.resolveLayout` turns either form into the tiles the simulation runs on, and the validator checks those same tiles.
- **`BLOOM.generatePlanet({seed, waterPct, sections, width, height, minLandmassTiles, maxCrossingGap, terrainWeights, climate, names})`** is deterministic. `terrainWeights`, `climate` and `names` are the knobs archetypes set; their defaults reproduce the Portion 1 layout exactly. BLOOM-010 added generic climate knobs, all neutral at their defaults (Ocean worlds are tile-for-tile identical):
  - `basinMoisture`: low-lying sections are wetter;
  - `dryOffset` / `wetOffset`: where soils count as dry or wet;
  - `drySaltChance`: salt pans on dry ground;
  - `lightBias`;
  - the origin preferences `originTemp`, `originMoistureOffset` and `originMoistureWeight`;
  - optional region-name word pools (`names`).
  BLOOM-011 added three more, again neutral at their defaults (every earlier planet is bit-for-bit identical):
  - `elevationCooling`: higher ground is colder (by elevation rank, like `basinMoisture`);
  - `geothermalChance` / `geothermalWarmth`: some regions sit over geothermal heat and are warmer. Such a region is tagged `geothermal: true`, is never also volcanic-acid ground, and gets no strong-sun radiation from that extra warmth (heat from below is not sunlight).
  It uses a mulberry32 RNG and never `Math.random`. Its steps:
  1. carve water from a noise field at the requested percentile;
  2. turn islets smaller than `minLandmassTiles` (default 12) into shallow water;
  3. grow sections by land-only flood fill, so every section is contiguous and never spans water;
  4. derive `neighbors` from the real geography;
  5. place the origin on the lowest-stress section of the largest landmass.
  - `maxCrossingGap` is optional and off by default. When set (product callers pass `config.crossing.maxGap`), landmasses the main landmass can't reach by crossings of at most that many water tiles become water, so bible §9 holds. Without it, the validator rejects such planets.
- **Water/impassable terrain (bible §9):**
  - it never becomes Living or Dead and never seeds spread;
  - it earns no Biomass;
  - it is excluded from coverage and the win denominator (`sim.map.LAND`).
  - The engine still refuses unknown terrain kinds and malformed tilemaps.
- **Waterborne Seeds (bible §9, §17)** is a data-driven Spread trait with effect type `crossing`. Ordinary spread still never crosses water.
  - **Crossings come from geography.** From every coastal land tile, the engine walks through water tiles only, for at most `config.crossing.maxGap` (6) steps. Any land tile of another landmass touching a reached water tile is a landing site at that gap.
  - **Seed pressure.** Once the trait is owned, each Living coastal source adds `chancePerSource` (0.0005) × `gapFalloff` (0.7)^(gap−1) of seed pressure to its landing tiles.
  - **Establishment.** Seeds establish only under the ordinary grow rule: the section must be above the grow threshold, scaled by fitness (and by Seed Output). A hostile shore receives seeds that never take. After a foothold, normal spread, die-back and adaptation apply.
  - **Where it's offered.** The trait appears only on maps that have a crossing, so First Bloom's shop is unchanged.
- **Archetypes (bible §10.1)** are plain data in `content/archetypes.js`: section range, water range and tolerance, climate, geography and validation rules. The generator stays general.
  - **Ocean Archipelago:** 12–18 sections and 55–68% water (±5), in a maritime climate. That means a smaller temperature swing, a humid sky and more saline coasts from sea spray. Finer-scale terrain gives many near islands, at least 3 landmasses, and an origin landmass holding ≤ 62% of the land, so a crossing strategy is required to win.
  - **Desert World (BLOOM-010):**
    - 12–18 sections and 2–12% water (±4): lakes in the lowest ground, not seas.
    - An arid, warm climate: sky moisture 18 against the plant's starting window of 32–68, and about 4 °C in the north to 34 °C in the south.
    - Low basins are wetter, and the lake shores get extra moisture; those basins are the refuges. Clear skies add +20 light.
    - Dry ground has poor nutrients, and some dry sections are salt pans.
    - Continent-scale terrain: at most 2 landmasses, and the origin's landmass holds ≥ 85% of the land.
    - The origin must be a genuine refuge: its own fitness ≥ 0.72 before the protected-refuge floor.
    - Region names come from desert word pools (Oasis, Wadi, Dune, Erg, Playa …).
    - It carries a temporary `render` treatment (sand tint, lake water, dune stipple).
    - Its policy reuses Ocean's pacing bands (they measured cleanly on the Desert sweep) and adds `maxTerminalWaitSeconds` 240 and `requiredConditions: ["Water:dry"]`. Both are optional archetype keys; Ocean sets neither.
  - **Frozen World (BLOOM-011):**
    - 12–18 sections and 6–20% water (±5): lakes and inlets.
    - A cold climate: a −18 °C sky, a north–south gradient, and uplands 10 °C colder (lowlands 10 °C warmer) through `elevationCooling` 20. The coldest regions reach about −45 °C.
    - A quarter of regions are geothermal (+34 °C): the refuges, mostly 0…+15 °C, some warm (+20…+28 °C) and a few too-hot vents.
    - Ordinary moisture, few salt or volcanic soils, slightly dimmer light.
    - Usually one landmass (≤ 3; the origin's landmass holds ≥ 70% of the land).
    - The origin must be a genuine refuge (`minOriginFitness` 0.72), and at least two other regions must be green at the start (`minRefuges` 2, new optional rule).
    - Region names come from frozen word pools (Glacier, Rime, Permafrost, Geyser, Fumarole, Moraine, Cirque …).
    - A temporary `render` treatment: a snow tint weighted by how cold the ground is now (`tintBy: "cold"`, new), ice glints (`frost`, new) and dark cold lake water.
    - Its policy reuses the shared pacing bands and the terminal-wait cap (they measured cleanly) and requires `requiredConditions: ["Temperature:cold"]`.
  - **`BLOOM.generateFromArchetype(archetype, publicSeed, {config, traits})`** is deterministic. Attempt *k* uses the generation seed FNV-1a(`id|seed|k`) and draws its section count and water request from that seed. An attempt is accepted only when:
    - the structure and strongest-Spread reachability checks pass;
    - actual water is within tolerance of the request;
    - the landmass and origin-share rules hold (plus, when an archetype sets them, `maxLandmasses`, `minOriginLandmassShare`, `minOriginFitness` and `minRefuges`);
    - (for `winnable` archetypes) validator layers 4–6 pass;
    - (when the archetype sets `minStrategies` / `pacing`, as both archetypes do) layers 7–8 **PASS**. INCONCLUSIVE counts as a rejection;
    - (when the archetype sets `requiredConditions`) every proven strategy answers those conditions.
  - It stops at `generation.maxAttempts` (24) and **throws** with every attempt's reasons rather than returning a bad world. `planet.archetype` records the public seed, attempt, generation seed, water and witness summary.
- **Witness builds (§10.3 layers 4–6).** `BLOOM.validatePlanet(planet, config, {traits, winnability: true})` asks `BLOOM.findWitness` for proof, in two stages:
  1. **Static search.** It enumerates legal terminal builds by effect type under the engine's own rules and estimates the land each could hold (growable sections reachable from the origin, plus real crossings). It keeps the builds that reach win + `config.validation.winMargin` (0.70 + 0.03) and ranks them cheapest first.
  2. **Real simulation.** It runs the best few with a fixed validation RNG, buying through `sim.buy` as soon as **earned** Biomass allows. There are no grants and no extra starting Biomass.
  - A planet passes when a witness holds ≥ 73% alive at once. Failures name the layer: 4 (no build can hold the win), 5 (can't be bought in time), or 6 (below the margin).
  - Search limits are explicit (`maxStaticStates`, `maxSimulations`, `maxTicks`). A capped search is reported as *inconclusive*, never as a verdict on the planet.
  - The margin is validation policy only; players still win at 70%.
- **Strategy diversity (§10.3 layer 7).** `BLOOM.findStrategies` (the validator's `{strategies: {minStrategies, pacing}}` path) groups every candidate build into **strategy classes**:
  - **Minimal sufficient core.** A build reduces to the cheapest sub-build that still reaches the validation target and has no smaller sufficient sub-build. Upgrades the win didn't need never count.
  - **Signature.** The core becomes one token per environmental condition it answers, built from **effects, not trait ids**: `Temperature:cold|heat`, `Water:dry|wet`, `Defense:<stat>` and `Crossing:<stat>`. Each token records the means and amount: Adapt points, the net Terraform sky shift, or both (e.g. `Water:wet=Terraform(−8)`). Seed Output and Early Maturity never appear.
  - **Material difference.** Two strategies differ only if each has a token the other lacks. Purchase order, Spread timing, a redundant add-on, or the Waterborne Seeds every island build shares can never make a second strategy.
  - **Search.** Classes are simulated cheapest first: each class's cheapest builds (≤ `maxBuildsPerClass`, under every Spread opening) with real `sim.buy` and earned Biomass, until `minStrategies` pairwise-distinct classes qualify.
  - **Proof rule.** A witness counts only if it bought its whole core before reaching the margin.
- **Pacing (§10.3 layer 8).** A strategy qualifies only if its witness also fits the archetype's `pacing` bands, and a win after an absurd wait doesn't count. Since BLOOM-013 the bands carry the owner's decision-cadence requirement (all three archetypes share them; [`docs/ECONOMY_v1.md`](docs/ECONOMY_v1.md)):
  - first purchase within 60 s (was 45–120 s);
  - no gap over 120 s between purchases before the margin (was 240 s);
  - margin reached in 240–720 s (was 360–900 s; scaled to the faster economy — it still rejects trivially fast and very slow worlds);
  - Desert and Frozen also cap the wait after the last purchase at 240 s.
  - They are time bands for a perfect-knowledge witness (people are slower; the bible's session target is 10–20 human minutes), not final balance.
  - Also recorded: purchase intervals, win and margin times, peak coverage, the terminal wait, Biomass earned per game-minute (and whether it grows), and early land reachable/growable without upgrades.
- **Verdicts.** Layer 7 needs `minStrategies` distinct classes that win with margin; layer 8 needs that many that also pace. A shortfall is **FAIL** only when every class was settled and the static enumeration was uncapped. Any cap (`config.validation.diversity`: 40 simulations, 2 builds per class) makes it **INCONCLUSIVE**. A capped search can still **PASS** once the strategies are proven.
- **Current sweep, Ocean Archipelago (public seeds 1–40).**
  - BLOOM-013: 36 accepted; seeds 7, 19, 35 and 38 fail explicitly (seeds 3 and 33 generate again; 11 seeds resolve to a different attempt, the owner seeds 13 and 8 do not — [`docs/evidence/bloom-013/accepted-attempts-diff.txt`](docs/evidence/bloom-013/accepted-attempts-diff.txt)).
  - Accepted strategies reach the margin in 251–699 s, make their first purchase at 16–56 s, and have a largest purchase gap of 58–112 s (before BLOOM-013: 362–891 s, 49–119 s, 86–175 s).
  - Generation takes a median of ~0.6 s per seed (worst ~13 s).
- **Current sweep, Desert World (public seeds 1–40).** Full statistics: [`docs/evidence/bloom-010/desert-check.txt`](docs/evidence/bloom-010/desert-check.txt).
  - 40 accepted (30 at attempt 0, 10 at attempt 1). Seeds 41–120 were also all accepted within a few attempts.
  - Rejected attempts: 7 non-refuge origins, 2 at layer 8, 1 at layer 4.
  - Water 2–12% (mean 7.3%); 38 worlds are one landmass and 2 are two.
  - Area-weighted mean moisture 14 (Ocean 63) and temperature 19 °C (Ocean 11 °C). About 76% of the land is Water-limited at the start.
  - Strategy water means per world: Drought vs Drought 17, Drought vs Drought + Humidify 14, both Drought + Humidify 6, Humidify vs Humidify 2, Drought vs Humidify 1.
  - Margins 362–692 s, first purchase 47–102 s, largest gap 78–165 s (BLOOM-010). BLOOM-013: still 40/40 (31 at attempt 0, 9 at attempt 1; one seed changed attempt); margins 240–431 s, first purchase 16–38 s, largest gap 36–100 s.
  - Median 0.5 s per seed (worst ~3 s).
- **Current sweep, Frozen World (public seeds 1–40).** Full statistics: [`docs/evidence/bloom-011/frozen-check.txt`](docs/evidence/bloom-011/frozen-check.txt).
  - 40 accepted (23 at attempt 0, 13 at attempt 1, 4 at attempt 2). Seeds 41–120 were also all accepted (80/80, within 6 attempts; [`frozen-secondary-41-120.txt`](docs/evidence/bloom-011/frozen-secondary-41-120.txt)).
  - Rejected attempts: 10 at layer 8 (too fast), 7 with fewer than two other refuges, 3 non-refuge origins, 1 landmass rule.
  - Water 6–20% (mean 12%); 37 worlds are one landmass and 3 are two.
  - Area-weighted temperature −12.5 °C (Ocean 10.6, Desert 19.1, default generator 3.4). About 61% of the land is blocked by the cold at the start; water and heat block about 2% each.
  - How strategies answer the cold, per world: Cold Tolerance vs Cold + Warm 30, both Cold + Warm 5, Cold vs Cold 3, Cold vs Warm only 1, Warm vs Warm 1.
  - Margins 361–680 s, first purchase 48–112 s, largest gap 73–174 s, terminal wait 11–198 s (BLOOM-011). BLOOM-013: still 40/40 (30 / 7 / 3 at attempts 0 / 1 / 2; nine seeds changed attempt, not 22 or 12); margins 241–481 s, first purchase 16–37 s, largest gap 37–113 s, terminal wait 11–234 s.
  - Median 0.8 s per seed (worst ~4 s).
- **Pressure scenarios (bible §11.3–11.4, BLOOM-012)** — full contract in [`docs/SCENARIOS_v1.md`](docs/SCENARIOS_v1.md):
  - **Engine.** `BLOOM.createSim(planet, config, traits, { scenario })`. The live state is `sim.pressure` (`progress`, `offsets {temp, moist, rad}`, `phase`, `events`, `fullAt`, `max`). Each tick the drift is recomputed from the scenario clock and added inside `evaluate`: to the sky temperature and moisture and to each region's radiation (`moistureShare` scales by the planet's own starting sky moisture). `evaluate(i, offsets)` can also evaluate another pressure state (the witness uses the final one). Under pressure the origin's refuge floor shrinks with the pressure's own damage to it. `BLOOM.pressure` holds `checkScenario`, `resolveScenario` (unknown id throws), `progressAt`, `offsetsAt`, `maxOffsets` and `phaseAt`.
  - **Loss.** `sim.extinction`, `sim.lost`, `sim.lostReason`, `sim.onLoss`: no Living tile for the scenario's grace → lost and frozen. Only scenarios that enable it.
  - **Witness under pressure.** `findWitness` / `findStrategies` / `simulate` accept `scenario`. Static estimates use the final state; simulations run with the scenario; a pressured witness must also hold the win threshold `holdFinalSeconds` after the final state; two purchase orders are tried (now-first / final-first). Without a scenario the search is byte-identical to BLOOM-006.
  - **Layer P.** `BLOOM.validateScenario(planet, config, traits, scenario, { archetypeId, minStrategies })` → PASS / FAIL / INCONCLUSIVE / DISALLOWED / EDEN. The archetype's layers 1–8 still validate the Eden world; layer P never retries attempts, so a public seed names the same world in every scenario.
  - **UI (temporary).** A full-width pressure bar under the HUD (identity, phase, % lost, time to the next stage, drift chips, the sky as base + Terraform + thinning); a faint map haze that thickens with the decline; milestone messages and a glow at each phase; orange outlines + a message when a living region tips toward its limit (pale green when one opens); the drift in the region panel and raw signals; an extinction screen with restart; the scenario line in the Bloom Report. The page runs layer P before starting and keeps only its status and a count.
  - **Sweep, Dying World (public seeds 1–20 of each archetype):** Ocean 15/17 accepted Eden worlds pass layer P, Desert 18/20, Frozen 20/20 (BLOOM-012); BLOOM-013 (new economy + clock): Ocean 17/18, Desert 17/20, Frozen 20/20 ([`docs/evidence/bloom-013/pressure-study.txt`](docs/evidence/bloom-013/pressure-study.txt)). Rejections are explicit (layer 4/6 under pressure). Full table: [`docs/evidence/bloom-012/pressure-study.txt`](docs/evidence/bloom-012/pressure-study.txt).
- **Biomass economy + decision cadence (BLOOM-013)** — full write-up in [`docs/ECONOMY_v1.md`](docs/ECONOMY_v1.md):
  - **`economy-study.js`** (report) measures how long a player waits between meaningful Biomass decisions on First Bloom, Ocean 13, Desert 25, Frozen 22 and their Dying World runs. It covers the opening (first local / first global / two options at once), purchase cadence (gaps, median, the longest stretch with nothing affordable, the tail after the last purchase), bubbles ignored vs clicked, colony and local-investment policies, and pressure relevance (incl. "ignore" recipes that buy the Eden build under Dying World). Worlds are pinned by seed + attempt; `--set` runs what-if economies (`traits.<id>.base=…`, `scenarios.dying_world.pressure.graceSeconds=…`).
  - **`economy-check.js`** (pass/fail, Node + browser) holds the BLOOM-013 targets: the economy is two config values with no hidden Biomass; the opening, cadence, bubble-free play and tail targets; strategy diversity and layer P on every fixture; Dying World cannot be ignored; tradeoffs, Waterborne Seeds and Terraform still cost; local upgrades are optional and costly; no Leaves runaway, soft-lock or runaway Biomass; real-button HUD / affordability / Bloom Report.
- **Validator reachability (§10.3 layer 3)** reports sections and landmasses reachable by ordinary spread and with the strongest Spread in the catalogue. Islands that need Waterborne Seeds are allowed. Land unreachable even with it fails a procedural planet.
- **Content files** are plain classic scripts holding JSON-shaped data. They load over bare `file://` with one source of truth.
- **Upgrade effects** are four engine types (`tempPoint`, `waterArm`, `level`, `sky`). A new trait of an existing type is data only.
- **Current limitations:**
  - One crossing trait at one range, with no currents or wind (other Spread crossings from bible §17, such as Wind or Ballistic Seeds, don't exist yet).
  - The Waterborne Seeds preview shows direct and multi-hop *geographic* reach, split into suitable-now vs hostile-now. It can't predict establishment odds or timing.
  - Three archetypes (Ocean Archipelago, Desert World, Frozen World) and **no player-facing procedural planet menu** yet. Generated worlds are reachable only through the developer query-string harness.
  - Frozen World: in many worlds both strategies answer the cold at the same depth (Cold ×2 vs Cold + Warm ×2), and about half the sweep worlds' strategy pairs hold the same land. Then the difference is cost and the shared temperature-point cap, not territory. The fixture (seed 22) does show different land held.
  - Frozen World never produces a natural layer-4 world on the production path: none in attempts 0–3 of seeds 1–400. The only natural layer-4 fixture (seed 46, attempt 22) is a deep retry that production never reaches.
  - Frozen openings were slow-ish before BLOOM-013 (first witness purchase at 48–112 s); since the economy retune it comes at 16–37 s.
  - Desert World's second strategy often differs from the first only in how it answers the hot south (Heat Tolerance vs Cool the Sky) rather than the water question. The fixture (seed 25) and many sweep worlds do show the Drought-vs-Humidify split. Every Desert strategy answers the dry ground by rule.
  - Desert acceptance is high (40/40). The validator still rejects about 5% of attempts: non-refuge origins, too-fast worlds, a layer-4 world and single-strategy worlds.
  - On Desert World, Roots is useful mainly for thickening young colonies such as the origin refuge. Its marginal-ground protection rarely matters, because after a water tool most desert colonies are either green or red, with few yellow ones ([`docs/evidence/bloom-010/colony-study.txt`](docs/evidence/bloom-010/colony-study.txt)).
  - Layers 7–8 (and layer P) are validator evidence, **not human validation**. Witnesses use perfect knowledge and buy on the first affordable tick. The owner has played Ocean seeds 13/8, Desert seed 25 and Frozen seed 22; Dying World came back REVISE (economy). The pacing bands now encode the owner's decision-cadence requirement but are still witness bands, not human measurements.
  - Dying World: on Ocean 13 both pressured strategies hold the same land (they differ in how they answer the drying). Every fixture witness reaches its margin after the final state (290 s since BLOOM-013; 480 s before): the decline is lived through, not outrun. Radiation is not terraformable, so Radiation Shielding is part of most pressured strategies unless a world can give its radiation-heavy ground up. The pressure UI is temporary; there is no scenario menu.
  - The paused inspect panel refreshes only every third tick, so advancing a paused run from the test hook can leave it a few ticks stale until play resumes (pre-existing; live play is unaffected).
  - Many accepted worlds earn their second strategy by answering the *same* condition by other means (e.g. Flood Adaptation vs Dry the Sky), sometimes holding the same land. The directive counts Adapt vs Terraform as material; a stricter rule (require different land held) is a possible later tightening.
  - Static search bounds still apply to layer-7 FAIL proofs: water ≤ 2 points and ≤ 2 Terraform steps per sky axis.
  - Coasts don't change moisture in the simulation.
  - Generated section names can repeat. The UI numbers the repeats ("Green Rise 1/2"); the generator itself is unchanged.
  - Cinder-Frost remains a demo-only sample inside `demo-surface.html`.

## Run

**Players:** open [`index.html`](index.html) (repo root) directly in a browser. No build step, no server required. Keep the folder structure. (Served over http, e.g. `python3 -m http.server`, the planet search runs in a background worker and the loading screen stays smoother on slow combinations.)

Open any file in `demos/` directly in a browser for the developer views. Keep the folder structure: the demos load `../content`, `../planets` and `../resources`.

Player-mode run links (what `index.html` opens; `play=1` adds the player menu, wording and post-run actions):

| Launch | Query string on `demos/demo-run.html` |
|---|---|
| First Bloom, player mode | `?play=1` |
| New run: planet + scenario, World Seed chosen automatically | `?play=1&archetype=frozen_world&scenario=volatile_climate` |
| One specific world (Play again / a shared link) | `?play=1&archetype=frozen_world&seed=22&scenario=volatile_climate` |
| QA only: fixed candidate list | `?play=1&archetype=frozen_world&scenario=dying_world&candidates=41017,7342` (41017 is rejected by layer P, 7342 starts) |

Developer procedural-run launch (a playtest harness, not the planet menu). Append a query string to `demos/demo-run.html`:

| Launch | Query string |
|---|---|
| First Bloom (default) | *(none)* |
| Ocean Archipelago, public seed 13 | `?archetype=ocean_archipelago&seed=13` |
| Ocean Archipelago, public seed 8 | `?archetype=ocean_archipelago&seed=8` |
| Known generation failure (seed 35) | `?archetype=ocean_archipelago&seed=35` → explicit **NO WORLD GENERATED** panel |
| Desert World, public seed 25 (main Desert fixture) | `?archetype=desert_world&seed=25` |
| Desert World, public seed 9 | `?archetype=desert_world&seed=9` |
| Frozen World, public seed 22 (main Frozen fixture) | `?archetype=frozen_world&seed=22` |
| Frozen World, public seed 12 (two landmasses) | `?archetype=frozen_world&seed=12` |
| **Dying World** on Ocean 13 (primary pressure fixture) | `?archetype=ocean_archipelago&seed=13&scenario=dying_world` |
| Dying World on Desert 25 / Frozen 22 | `?archetype=desert_world&seed=25&scenario=dying_world` · `?archetype=frozen_world&seed=22&scenario=dying_world` |
| **Native Competition** on Desert 25 (primary competition fixture) | `?archetype=desert_world&seed=25&scenario=native_competition` |
| Native Competition on Ocean 13 / Frozen 22 | `?archetype=ocean_archipelago&seed=13&scenario=native_competition` · `?archetype=frozen_world&seed=22&scenario=native_competition` |
| Explicit Eden (same as no parameter) | add `&scenario=eden` |
| Unknown scenario | `…&scenario=volcano_world` → explicit **NO RUN STARTED** panel |

A seed that fails generation never falls back to another seed, and an unknown or malformed scenario never falls back to another scenario. The footer shows the archetype, public seed, accepted attempt and planet name/id, plus the scenario and its layer-P status on pressure runs.

## Plan of record

[`GAME_BIBLE.md`](GAME_BIBLE.md) — the design bible (v1.1). Everything reconciles there; when in doubt, it wins.
