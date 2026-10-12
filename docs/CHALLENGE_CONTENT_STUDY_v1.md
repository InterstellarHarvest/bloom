# Strange Bloom · Unknown Soils — Challenge content study v1 (BLOOM-036C)

**BLOOM-036C — AUTHORED CHALLENGE CONTENT: design + read-only calibration.** Branch `agent/bloom-036c-challenge-content` → review branch
`handoff/bloom-036c-content-design`, from production `main` `a91c6d0` (the BLOOM-036 integration closeout). **Nothing player-facing is
implemented:** no gameplay behaviour changed, `content/challenges.js` and the shipped seed bank `content/challenge-seed-banks.js` (sha256
`dcca6d8f…`) are untouched, no hub card was added. This branch holds research tooling, study results and documents only. **STOP for PMO
content review.**

Evidence: [`evidence/bloom-036c/candidate-study.json`](evidence/bloom-036c/candidate-study.json) (every number below) ·
[`evidence/bloom-036c/candidate-summary.md`](evidence/bloom-036c/candidate-summary.md) (one-page summary) ·
[`evidence/bloom-036c/pacing-probe.json`](evidence/bloom-036c/pacing-probe.json) · `evidence/bloom-036c/study-rows/*.jsonl` (raw per-world
records) · `evidence/bloom-036c/candidate-banks/*.json` (research-only candidate banks). Tooling: [`tools/research/challenges/`](../tools/research/challenges/).

## 0. Answer in one page

**The question:** what contained situations can BLOOM author *today* from species, planet selection, starting state and the three existing
scenario mechanics, without new engine mechanics?

**Ten concepts were drafted and calibrated** on the released seed-bank pool (1 640 concept-world evaluations, the builder's own full proof:
species S2 → recipe → scenario layer P at full budget with every confirmation → the quality rule), plus **two derived concepts** measured from
data already in the repository. Every concept was compared with the released Challenge on *the same worlds* (an exact baseline).

| # | Concept | Levers | Qualifying worlds | Verdict |
|---|---|---|---|---|
| 1 | **Low Tide** | Dying World · prescribed Organic Hybrid · Ocean only · starts WITH Flood + Salt | 50 % (normal start: 93 %) | **SHORTLIST** — the start is a commitment that closes the drought route; the decline then removes 54 % of the land it opened |
| 2 | **Oasis Line** | Native Competition · prescribed Reed Spire · Desert only · no arrival floor | 71 % (released recipe: 4 %) | **SHORTLIST** — a wetland plant contesting dryland natives from a tiny foothold; slowest, most spatial run |
| 3 | **Thin Air** | Dying World · prescribed Woolly Candle · Desert + Ocean | 98 % | **SHORTLIST (framing)** — the decline *opens* land for this plant (median +12 %); proofs identical to the released Woolly cell |
| 4 | Windfall | Volatile Climate · player choice · 400 starting Biomass | 70–78 % (released: 85–99 %) | **HOLD** — the only start that makes climate shocks common (2–18 × the released rate) but a quarter of worlds become too fast; recalibrate at ~200–250 |
| 5 | Hearthfire | Volatile Climate · prescribed Cinder Rosette · Frozen only | 96 % | **RESERVE** — Cold Tolerance ×3 wins without Terraform in 28 / 29 worlds: the premise can be ignored; proofs identical to the released cell |
| 6 | Ember in the Ice / Snow on the Dunes / Reed in the Sand | **default rules** · prescribed mismatched specialist | 98–99 % | **RESERVE** — rich (3 distinct strategies in 84 % of worlds) but an Expedition already offers these worlds; the schema refuses `default` today |
| 7 | Pioneer Rush | Native Competition · Seed Output + Early Maturity · 0 Biomass | 3–8 % | **REJECT** — 0 Biomass breaks the locked 60 s first-purchase cadence, and the head start *lowers* the win rate |
| 8 | Empty Hold | Dying World · 0 Biomass | 11–20 % | **REJECT** — the same cadence conflict; the premise *is* the delay the rules forbid |
| 9 | Deep Freeze (derived) | Dying World · Frozen only | 82–95 % | **REJECT** — Dying World under another name (a third of its bank already) |
| 10 | Last Refuge (derived) | Native Competition below 20 % arrival | 59–91 % | **REJECT as a separate Challenge** — viable (the 20 % floor is a content choice, not an impossibility); its best form is Oasis Line |

**Recommended first authored batch: Low Tide · Oasis Line · Thin Air** — one per scenario, each using a lever the released three do not
(a starting state; a prescribed specialist on an unfloored world recipe; a prescribed specialist whose weakness the scenario reverses). All three
fit the current schema with no engine change and no new completion rule. §8 gives the shortlist; §9 the future requirements.

**The released three (§5):** keep all three. Native Competition needs a real strategic idea in its copy; **Volatile Climate does not tell the
player that only Terraforming unsettles the climate** — and in the shipped bank its proof witness meets a shock in only 3–9 of 50 worlds.

## 1. Scope and rules followed

- Levers used: only what the released code honours (§2). No planned mechanic, no new engine mechanic, no change to the scenarios.
- Read-only: every proof is the seed-bank builder's own (`tools/challenge-bank-builder.mjs` `evaluateWorld` / `curateCell`, unchanged), run on
  QA-fixture Challenge definitions (status `fixture`, accepted by `BLOOM.challenges.fixture` — which also enforces the copy rule). The runner
  asserts the catalogue is identical before and after; the shipped bank is unchanged (sha256 `dcca6d8f…`).
- No live runtime search: candidate concepts were proven offline and curated into **research-only** candidate banks
  (`docs/evidence/bloom-036c/candidate-banks/`, never loaded by the game).
- No difficulty labels. Quantities below (pass rates, witness seconds) are internal measurements, never player-facing, never a ranking.
- Completion stays the normal Bloom; concepts that would benefit from a Challenge-specific condition are listed in §9, not implemented.
- **Time unit:** game-seconds of the validator's perfect-knowledge witness (time to the win threshold + 3 points). A person is slower; the
  numbers compare concepts, they do not predict a human's session.

## 2. Authoring levers — what a Challenge can set TODAY

Only levers that the released code honours (`content/challenges.js` schema 2, `resources/bloom-challenges.js`, `createSim(…, { startingState })`,
the seed-bank builder). Nothing planned or unimplemented is used anywhere in this study.

| Lever | Where | Values today | Notes |
|---|---|---|---|
| **Scenario** | `scenario` | `dying_world` · `native_competition` · `volatile_climate` | Each Challenge references ONE scenario; its mechanics stay in `content/scenarios.js`. **`default` is refused** by `checkChallenge` ("not a real challenge scenario"), although PRODUCT_DIRECTION §8 says a Challenge *may* use default rules + a mismatch. Scenarios cannot be combined (one per Challenge). |
| **Player-choice species** | `launch.species { policy: "player-choice" }` | every released species | Choose Plant Species, one bank cell per species. |
| **Prescribed species** | `launch.species { policy: "prescribed", species }` | any released species | Skips Choose Plant Species; one bank cell. QA fixtures only so far. |
| **Seed-bank recipe — archetypes** | `launch.world.recipe.archetypes` | any non-empty subset of Ocean Archipelago · Desert World · Frozen World | The builder draws pool worlds of these archetypes only. |
| **Arrival band** | `recipe.arrival { minHabitable?, maxHabitable? }` | shares 0…1 | The species-relative share of land green at landing (WITH the prescribed start). |
| **Foothold floor** | `recipe.foothold { minShare }` | share 0…1 | S1 connected foothold. Supported, unused. |
| **Native cover floor** | `recipe.nativeCover { minStartShare }` | share 0…1 | Competition scenarios only. Supported, unused (every sampled world starts ≥ 9 %). |
| **Prescribed starting adaptations** | `launch.startingState.adaptations` | plant traits of effect `tempPoint` · `waterArm` · `level`: Cold / Heat Tolerance, Drought / Flood Adaptation, Salt Handling, Radiation Shielding, Seed Output, Early Maturity | One tier per listed id, applied through the engine's own legality rule (shared temperature cap 3, one water arm, level maxima), never paid for. **Refused:** Terraform (the sky) and Waterborne Seeds (needs a crossing). |
| **Prescribed starting Biomass** | `launch.startingState.biomass` | integer ≥ 0, or `null` (= the normal 100) | |
| **Completion** | `completion` | `{ win: "bloom", conditions: [] }` only | The normal Bloom (the planet's threshold, 70 % default). Conditions are refused until implemented. |
| **Presentation** | `name`, `short`, `presentation.{tagline, briefing, strategicIdea, science}` | literal copy or `@scenario.…` references | Icon limited to `pressure` · `competition` · `climate`. Copy may not rank (no easy / hard / stars / score / best / recommended / skill / tier …). |

**Not levers** (and not used): the planet's sky, its geometry or its win threshold (a recipe *selects* finished procedural worlds, never edits
them); scenario numbers (clock, decline size, native vigour, shock thresholds — a Challenge may not restate or override mechanics); a species
physiology change or a Challenge-only species; Terraform or a crossing at landing; a time limit, score or alternative win.

## 3. Released content inventory

### 3.1 Adaptations and Terraform (`content/traits.js`, exact engine prices)

| Trait | Board | Effect | Price (Biomass) by tier | Cap | Startable |
|---|---|---|---|---|---|
| Cold Tolerance | Adapt · Temperature | +12 °C tolerance below (tempPoint) | 140 · 270 · 400 | cold + heat ≤ 3 | yes |
| Heat Tolerance | Adapt · Temperature | +12 °C tolerance above (tempPoint) | 140 · 270 · 400 | shared with cold | yes |
| Drought Adaptation | Adapt · Water | water window −20, +5 width per point (dry arm) | 150 · 270 · 390 · … | excludes Flood | yes |
| Flood Adaptation | Adapt · Water | water window +20, +5 width per point (wet arm) | 150 · 270 · 390 · … | excludes Drought | yes |
| Salt Handling | Adapt · Soil | +70 salt tolerance | 200 | 1 | yes |
| Radiation Shielding | Adapt · Hazard | +30 radiation tolerance | 220 | 1 | yes |
| Seed Output | Spread · Seeds | +0.6 seed output per level | 130 · 280 | 2 | yes |
| Early Maturity | Spread · Growth | colonies seed sooner (maturity −0.12) | 170 | 1 | yes |
| Waterborne Seeds | Spread · Reach | seeds cross ≤ 6 water tiles (only offered where a crossing exists) | 180 | 1 | **no** |
| Warm / Cool the Sky | Terraform · Atmosphere | ±6 °C on every region | 200 · 290 · 380 · 470 (per direction) | — | **no** |
| Humidify / Dry the Sky | Terraform · Atmosphere | ±8 moisture on every region | 200 · 290 · 380 · 470 | 0…100 | **no** |

Also bought with Biomass: one local colony specialization per region (Root Network · Leaf Canopy · Seed Reserve, 90 · 130 · 170 …), and the
free per-region allocation (Balanced · Roots · Leaves · Seeds). Normal start: 100 Biomass, nothing owned; the origin region trickles 0.3 Biomass
per tick plus bubbles.

### 3.2 Species (`content/species.js`, physiology v1)

| Species | Temperature | Water window | Salt | Radiation | Strengths | Weaknesses |
|---|---|---|---|---|---|---|
| Organic Hybrid | −6 … 24 °C | 32 … 68 | 15 | 30 | temperate, ordinary water | deep cold, fierce heat, salt coasts |
| Cinder Rosette | 2 … 34 °C | 18 … 50 | 15 | 35 | hot, dry ground | cold, wet / flooded ground |
| Woolly Candle | −14 … 16 °C | 28 … 64 | 15 | 50 (latent) | cold ground; radiation once heat is handled | warm and hot ground |
| Reed Spire | −6 … 24 °C | 42 … 82 | 60 | 30 | wet / waterlogged ground, salt coasts | dry / parched ground |

### 3.3 Scenario pressures (`content/scenarios.js`)

| Scenario | Pressure | Driver | Loss | Proof (layer P) |
|---|---|---|---|---|
| **Dying World** | the sky loses 40 % of its starting moisture, −8 °C, +8 surface radiation; grace 40 s, linear over 250 s, then a final harsh state | the clock | extinction | win with margin ≥ 240 s and still hold 60 s into the final state; quality: margin reached at ≥ 80 % of the decline |
| **Native Competition** | native vegetation (reference physiology, centred halfway to the planet's median starting ground) holds 26–32 % of the land, spreads, contests fronts | the competitor, reacting locally | extinction | win + hold 60 s, confirmed under 2 more simulation seeds; quality: the witness met a contested front |
| **Volatile Climate** | each Terraform step unsettles its sky axis; compounding steps → a 45 s shock (±8–14 °C or ±12–22 moisture), overshoot or rebound | **the player's own Terraform** | extinction | win + hold 60 s after the last shock, confirmed; a Terraform-heavy witness counts only if it lived through a shock |

### 3.4 Archetypes and environmental ranges (the released seed-bank pool, 475 physically valid worlds)

| Archetype | Sky (°C · moisture) | Water | Landmasses | Mean ground temperature p10 / p50 / p90 | Identity |
|---|---|---|---|---|---|
| Ocean Archipelago | 8 · 54 | 58–68 % | 3–9 | 8.6 / 12.5 / 15.5 °C | islands; crossing required; salty coasts |
| Desert World | 14 · 18 | 3–11 % | 1–2 | 18.1 / 19.2 / 20.3 °C | hot south, parched ground, wet basins are refuges |
| Frozen World | −18 · 46 | 8–19 % | 1–2 | −17.1 / −13.6 / −8.4 °C | cold everywhere; geothermal refuges (some too hot) |

Arrival share (land green on arrival, normal start) p10 / p50 / p90 and default-rules winnability (S2) per species:

| Species | Ocean | Desert | Frozen |
|---|---|---|---|
| Organic Hybrid | 0.21 / 0.43 / 0.60 · S2 155/155 | 0.07 / 0.14 / 0.27 · 160/160 | 0.19 / 0.28 / 0.40 · 160/160 |
| Cinder Rosette | 0.00 / 0.06 / 0.27 · 155/155 | 0.18 / 0.35 / 0.50 · 158/160 | 0.05 / 0.16 / 0.29 · 160/160 |
| Woolly Candle | 0.11 / 0.30 / 0.47 · 155/155 | 0.04 / 0.13 / 0.23 · 158/160 | 0.24 / 0.38 / 0.51 · 160/160 |
| Reed Spire | 0.42 / 0.60 / 0.75 · 155/155 | 0.00 / 0.06 / 0.14 · 159/160 | 0.11 / 0.23 / 0.35 · 160/160 |

**Consequence for authoring:** under the default rules *every* species can bloom on almost *every* world of every archetype (S2 ≥ 98.7 %
everywhere, mismatches included). A mismatch therefore changes the *opening* (how little land suits the plant at landing, which purchases come
first) far more than whether the world can be won. Difficulty must come from the strategic shape, not from making worlds impossible.

## 4. Method

- **Sample.** Every concept world is a World Seed of the *released* seed-bank pool stream (`POOL_STREAM`, 160 per archetype): the first 160
  per recipe archetype for prescribed-species concepts (one bank cell), the first 40 per archetype for player-choice concepts (four cells), so the
  shipped bank's candidate records (`docs/evidence/bloom-036b/seed-bank/candidates.json`) give the released Challenge's verdict for exactly the
  same world × species.
- **Proof** (fixture concepts): `evaluateWorld` — physical validation → species S2 *from the prescribed start* → the recipe → the scenario's layer P
  at the validator's full budget with every confirmation run → the Challenge quality rule. **Default-rules concepts** (schema refuses
  `default`): physical → species S2 → the archetype's own layer 7–8 strategy search with the species and the archetype's pacing bands.
- **Diagnostics** on the first passing worlds (30 per archetype for prescribed concepts, 10 for player-choice ones): the same proof asked for up
  to **three materially distinct strategies** (the validator's layer-7 signatures: what each answers and by which means), their win times, first
  purchase, Terraform use, shocks, contested fronts.
- **Premise measurements:** Dying World — the land green for this plant now vs at the decline's final state (*opened* / *closed*, engine
  `evaluate()` at the final pressure offsets); starting-state concepts — arrival with and without the start, and **ablations** (the same world
  re-proven from another start); every concept — the released Challenge's verdict and witness on the same worlds.
- **Pacing probe:** the builder stores layer-P reasons cut at 140 characters, which hid *which* pacing bound refused the start-state concepts;
  `pacing-probe.mjs` re-ran 16 refused worlds per concept and read the slow witnesses' real pacing.
- Wall time: 3 881 s for 1 640 concept worlds on 12 workers (16 hardware threads); 0 errors; catalogue unchanged.

## 5. The released three — quality review as player content (no change made)

Read from the hub and dossier as a player meets them (036B evidence screenshots `docs/evidence/bloom-036b/02-hub-*.png`, `05-dossier-*.png`) and
from the shipped bank (`content/challenge-seed-banks.js`, all 600 entries; `candidate-study.json` → `current`).

| | Dying World | Native Competition | Volatile Climate |
|---|---|---|---|
| Hub card (short · tagline) | "The atmosphere is thinning." · "The world becomes drier, colder and more exposed to radiation as the run goes on." | "The planet already has native vegetation." · "Your plant must compete with it for suitable land and resources." | "Reshaping the climate has side effects." · "Terraforming too aggressively can destabilize the climate and cause temporary extremes." |
| Strategic idea | "Plan for the world it is becoming, not only the one it is now." | "Native vegetation is adapted to the planet's starting conditions." | "How fast you change the planet matters." |
| Arrival share, bank p50 (OH · CR · WC · RS) | 0.25 · 0.21 · 0.22 · 0.27 | 0.33 · 0.29 · 0.30 · 0.36 | 0.25 · 0.23 · 0.25 · 0.25 |
| Bank worlds with < 5 % arrival (of 50) | 2 · 11 · 5 · 7 (0 % arrival: 0 · 8 · 3 · 6) | 0 (recipe floor 20 %) | 2 · 9 · 3 · 8 |
| Witness time to Bloom + margin, p10 / p50 / p90 (s) | 244–262 / 273–358 / 535–656 | 274–329 / 456–497 / 659–840 | 243–249 / 275–306 / 506–606 |
| The mechanic in the proof | margin always at ≥ 80 % of the decline (quality rule) | median 8–9 contested regions | witness shocked in **3–9 of 50** worlds; in the passing pool the first witness Terraforms in 22–49 % and is shocked in 1–10 % |

**Dying World — clear, keep.** The card names all three drifts and the strategic idea is a real strategic idea. The pressure is unmistakable
(the hub, the run's phase bar, the proof's 80 % rule). *Near-zero-arrival worlds:* 0 % arrival happens for the specialists on their opposite
archetype (e.g. Cinder Rosette on an Ocean world). The run is still proven (S2 + layer P at full budget) and the origin is a protected refuge,
so the plant never lands dead; the opening is "survive and adapt before the decline", which suits *this* Challenge's fiction. **Appropriate,
as PMO-locked** — but the dossier's "Ground your plant can live on at landing: 0 % of the land" reads like an error. **Copy recommendation:**
when the share is under ~5 %, add one dossier line such as "Only your landing region suits your plant at first: adapt before you spread."
(presentation only; not implemented).

**Native Competition — distinct, but its strategic idea is a fact, not an idea.** "Native vegetation is adapted to the planet's starting
conditions" is true and useful but tells the player nothing to *do*; it is also the scenario card's `cue`, which the hub reuses. The real
strategy (it is in the loss note) is: push where your plant suits the ground better than the natives; protect young colonies; Terraform their
strongholds away from them. **Copy recommendation:** a Challenge-owned strategic idea, e.g. "Win ground where your plant suits it better than
the natives do, and thicken young colonies before they are overgrown." Pressure communication is otherwise good (hatched natives, fronts,
contested events). It is the slowest of the three (p50 ≈ 460–500 s witness) — expected for a contest — and the only one whose pressure
is spatial rather than temporal: the most clearly *different* Challenge.

**Volatile Climate — the pressure is opt-in, and the hub does not say so.** The card says Terraforming "too aggressively" destabilizes the
climate; it does **not** say that *only* Terraforming does, nor that adapting the plant is always safe (that sentence lives in the scenario's
loss note). The data shows the consequence: in the shipped bank the proof witness meets a shock in only 3–9 of 50 worlds per species, because
the cheapest strategies usually adapt. A player who happens to adapt may finish a "Volatile Climate" Challenge without ever seeing the climate
move — the Challenge then feels like an ordinary Expedition. This is the PMO-locked design (no forced shock), so the fix is **communication**,
not mechanics. **Copy recommendations:** (1) briefing / what changes: "The climate here is stable until you change it. Each Terraform step
unsettles it; quick or repeated steps make it swing to a temporary heat pulse, cold snap, wet surge or dry spell." (2) strategic idea:
"Adapting your plant never unsettles the climate. Terraform when it pays, and give the sky time to settle between steps." (3) optionally the
dossier names the world's dominant problem so the player sees *why* Terraform is tempting here. A future authored Challenge where
Terraforming is the natural answer (this study's *Hearthfire*, §6) gives the mechanic a home where it is reliably met.

**Redundancy among the three:** none is redundant. Dying World and Volatile Climate both move the sky, but the driver differs completely (a
clock the player cannot touch vs. the player's own Terraform) and the strategic question is opposite (prepare for a known future vs. pace your
own changes). Their witness timings are similar (p50 ≈ 275–360 s) — both are the default race with a twist; Native Competition is the slow,
spatial one.

**As a first impression:** three distinct pressures — a dying planet, a living one, a fragile one — are a good, legible first set. The weak
spot is Volatile Climate's silent-when-avoided mechanic, which makes one third of the first impression potentially indistinguishable from an
Expedition. Second, every released Challenge is player-choice + normal start, so the first set shows only *one* of the authoring axes
(scenario); none yet shows what a Challenge can do with a prescribed plant, a deliberate world or a starting state — exactly 036C's job.

Hub layout note (presentation only): the selected card's tagline is repeated verbatim as the dossier's "What changes" row; for Native
Competition and Volatile Climate the card's two lines + the dossier's "What changes" say the same thing three times.

## 6. Candidate concepts — content drafts and calibration

Each viable concept: the player-facing draft (as written in `tools/research/challenges/concepts.mjs` and accepted by the Challenge resolver's copy
rule), the definition, then the measurements. "Witness" times are perfect-knowledge game-seconds (§1).

### 6.1 Low Tide — SHORTLIST

| | |
|---|---|
| **Name** | Low Tide |
| **Tagline** | Your plant lands already adapted to flooded, salty shores, and committed to that water strategy, as the planet's air dries. |
| **Briefing** | Organic Hybrid arrives with Flood Adaptation and Salt Handling: well fitted to the archipelago's wet, salty coasts today. But the atmosphere is thinning. The world dries, cools and brightens, and a plant committed to wet ground cannot also adapt to drought. |
| **Strategic idea** | Your head start is also a commitment. Use the coasts while they last, then decide how to keep enough ground wet: Terraform, or retreat. |
| **Science / context** | Mangroves and saltmarsh plants are superbly fitted to wet, salty shores, and stranded when the water retreats. Specialisation pays only while the world it fits lasts. |
| **Scenario** | Dying World |
| **Species policy** | prescribed — Organic Hybrid |
| **World recipe** | Ocean Archipelago only; no arrival band |
| **Starting state** | prescribed adaptations Flood Adaptation + Salt Handling (owned, unpaid); normal Biomass |
| **Why distinct** | The only concept whose start *removes* an option: the engine's one-water-strategy rule means Drought Adaptation is closed for the whole run, so the decline's drying must be answered by Humidify, by living on less land, or by colder / radiation answers elsewhere. Dying World normally asks "prepare for the future"; here the player begins perfectly prepared for the *present* and that preparation becomes the problem. |
| **Expected decisions** | how far to spread across the islands while the coast is generous (Waterborne Seeds); when to start humidifying against the drying; whether to buy cold / radiation answers for the final state; which islands to give up. |

**Calibration** (155 physically valid Ocean worlds):

- **Qualifying: 78 / 155 (50.3 %)** — the same worlds from the normal start: 92.9 %. **The start decides it:** 66 worlds pass only *without* it,
  none only with it. Candidate bank: 50 retained of 78 (not provisional).
- **Arrival:** with the start p50 **74 %** of the land (p10 63 %, p90 83 %) vs 43 % without — the most generous landing in the study.
- **The decline closes p50 54 % of the land** for this plant (final-state green p50 18 %); it opens none. The proof still requires holding the
  Bloom 60 s into the final state.
- **Strategies:** the first witness uses Terraform in 91 % of worlds; in the diagnostics Humidify appears in 94 % of the winning strategies and
  Waterborne Seeds in 100 %; an Adapt-only win exists in 2 of 16 worlds. Usually 2 distinct strategies (9 / 16).
- **Witness time to Bloom + margin:** p10 / p50 / p90 **277 / 397 / 600 s** (the normal start on the same worlds is p50 45 s faster).
- **Failure mode (77 refused):** 72 "no build can reach / hold the win" — the drying world takes back too much for a wet-committed plant.
- **Verdict:** distinct, scientifically coherent, premise cannot be ignored (the start is owned; the decline is unavoidable), not trivial (half
  of ocean worlds qualify), not pathological (78 qualifying worlds). **Shortlist.**

### 6.2 Oasis Line — SHORTLIST

| | |
|---|---|
| **Name** | Oasis Line |
| **Tagline** | Drought-hardy native vegetation holds the open desert; your plant can only live where the water is. |
| **Briefing** | Reed Spire lands beside a desert basin. The wet ground suits it; the dry plains belong to native vegetation adapted to them. Every spring, lakeshore and wet hollow is a front. |
| **Strategic idea** | Hold the wet basins first. To push into the plains the natives hold, your reed must learn to live drier; reshaping the sky can weaken their strongholds. |
| **Science / context** | In real deserts, reeds and palms crowd around springs and oases while drought-hardy shrubs hold the open ground; who wins at the edge depends on how much water the soil holds (a simplified game model). |
| **Scenario** | Native Competition |
| **Species policy** | prescribed — Reed Spire |
| **World recipe** | Desert World only; **no arrival floor** (the released Native Competition recipe requires ≥ 20 %) |
| **Starting state** | normal |
| **Why distinct** | The released Native Competition almost never gives Reed Spire a desert (5 of its 50 entries; 4.4 % of these worlds pass its 20 % floor). Oasis Line is the opposite situation: a tiny wet foothold (p50 7 % of the land) inside a desert the natives already own. The run is a siege from the basins outward, not a race for open ground. |
| **Expected decisions** | which basin colonies to thicken first (Roots) so the natives cannot overgrow them; when to commit to Drought Adaptation (it is in every winning strategy) versus cooling the scorching south; where to open a front. |

**Calibration** (160 Desert worlds):

- **Qualifying: 113 / 160 (70.6 %)**; the released Native Competition recipe (20 % floor) accepts 7 of the same worlds. Candidate bank 50 of 113.
- **Arrival:** p10 / p50 / p90 **2.5 / 7.4 / 16 %**; 10 qualifying worlds start with 0 % beyond the protected landing region.
- **The mechanic in the proof:** contested regions p10 / p50 / p90 **8 / 11 / 14** (released Native Competition: median 8–9).
- **Strategies:** Drought Adaptation and Radiation Shielding in 100 % of the diagnosed winning strategies, Heat Tolerance 91 %, Cool the Sky 78 %;
  Humidify only 13 %. Terraform in 80.5 % of first witnesses; an Adapt-only win exists in 3 of 23 diagnosed worlds; 3 distinct strategies in 11 / 23.
- **Witness time:** **386 / 501 / 617 s** — the slowest concept (a siege), comparable to released Native Competition's slow tail.
- **Failure mode (46 refused):** 21 cannot reach / hold the win, 13 every witness died out (overgrown), 12 pacing.
- **Verdict:** distinct, coherent, the competition clearly matters, ~70 % qualifying. **Shortlist.** Copy was corrected to the data (drying the
  reed is the core move; Humidify is rarely the answer).

### 6.3 Thin Air — SHORTLIST (framing)

| | |
|---|---|
| **Name** | Thin Air |
| **Tagline** | As the atmosphere thins the world cools, dries and brightens with radiation: conditions this plant was built for. |
| **Briefing** | Woolly Candle lands on a warm world whose atmosphere is escaping. Today most of the ground is too warm for it. As the air thins, the land cools toward the candle's range and surface radiation rises, which its wool and pigments shrug off. The drying is the part it was not built for. |
| **Strategic idea** | Do not pay to fight warmth that is already leaving. Hold your refuges, move into ground the decline opens, and watch the water. |
| **Science / context** | Giant rosettes of high mountains (frailejón, giant groundsels) live where the air is thin: cold nights, dry wind and strong ultraviolet light. Their wool and leaf skirts answer exactly the conditions a thinning atmosphere brings. |
| **Scenario** | Dying World |
| **Species policy** | prescribed — Woolly Candle |
| **World recipe** | Desert World + Ocean Archipelago (the warm archetypes) |
| **Starting state** | normal |
| **Why distinct** | It inverts the scenario's meaning. For every other species the decline only closes land (Empty Hold rows: Organic Hybrid opens 0 %, closes 12 %; Reed Spire 0 % / 14 %); for the candle on a warm world it **opens** p50 12 % of the land (p90 41 %) and closes 4 % — the final world is greener than the first in 62 % of worlds. Its latent radiation strength, presented on the species card, finally pays. |
| **Expected decisions** | whether to spend on Heat Tolerance / Cool the Sky now or wait for the decline; how to answer the drying (Drought Adaptation, Humidify); when to expand into the cooling ground. |

**Calibration** (315 valid worlds): **qualifying 310 / 315 (98.4 %)** (Ocean 153 / 160, Desert 157 / 160); arrival p50 20 % (9 worlds 0 %);
witness **247 / 293 / 515 s**, margin reached at ≥ 83 % of the decline; diagnostics: 3 distinct strategies in 42 / 58 worlds, Adapt-only wins in
57 / 58, Terraform wins in 49 / 58; Heat Tolerance in 74 % of winning strategies, Cool the Sky 57 %.

**Caveat — mechanically it is a subset of a released cell.** Its proofs are byte-identical to the released Dying World × Woolly Candle cell on the
same worlds (100 %), and the shipped bank's Woolly cell already holds 33 of 50 Desert / Ocean entries: a player who picks Woolly Candle in Dying
World meets this situation two times in three, unannounced. Thin Air's value is the **authored framing** (the prescribed plant, the reversed
brief) — no new proof is needed. The bot still buys Heat Tolerance in most strategies (it races the 240–900 s band), so "do not fight the warmth"
is a strategic *option*, not a forced line. **Shortlist as the low-cost authored piece; PMO may prefer to keep it as dossier copy for the
released cell instead.**

### 6.4 Windfall — HOLD (recalibrate)

| | |
|---|---|
| **Tagline / briefing** | "You land with four times the usual Biomass: enough to start reshaping the sky at once." · "…Spending it is simple; spending it well is the challenge. The climate here is unstable: heavy Terraforming in a short time makes it swing to temporary extremes." |
| **Strategic idea** | A big budget is not a reason to change the planet all at once. Decide what to adapt, what to Terraform, and how fast. |
| **Definition** | Volatile Climate · player choice · all archetypes · starting Biomass 400 |
| **Why distinct** | It is the only lever measured that makes Volatile Climate's mechanic *common*: with a reserve, Terraforming early is cheap, so the climate is pushed hard. |

**Calibration** (40 worlds per archetype × 4 species): **qualifying 70–78 %** (released Volatile Climate on the same worlds: 85–99 %). **Every probed
refusal (16 / 16) was won too fast** — margin under the 240 s floor. The worlds that remain are near the floor (witness p50 **261–277 s**; released
275–306 s; same-world delta p50 −8 to −58 s). First purchase at 0.2 s. **Witness met a shock: 9–28 %** of qualifying worlds (released passing pool:
1–10 %); in the diagnostics a shocked winning strategy exists in 4–16 of 19–25 worlds. **Verdict:** the premise is real and the mechanic surfaces,
but 400 Biomass trivialises a quarter of worlds and compresses the rest; the bot is not "tempted" the way a person is, so the shock exposure for
humans is likely higher still. **Hold:** re-measure at 200–250 Biomass before shortlisting; a "never let the climate reach Critical" completion
condition (§9) would make it a genuine restraint Challenge.

### 6.5 Hearthfire — RESERVE

Volatile Climate · prescribed Cinder Rosette · Frozen World only. Draft: *"A plant of hot ground on a frozen world, and a climate that pushes
back."* — *"Warm the world in measured steps and let it settle between them, or make the rosette more cold-tolerant and Terraform less."*
**Qualifying 153 / 160 (95.6 %)**; arrival p50 16 %; witness 257 / 315 / 421 s; Warm the Sky in 90 % of winning strategies; a winning strategy
that lived through a shock in 9 / 29 diagnosed worlds (the highest concentration of the mechanic in the study). **But Cold Tolerance ×3 (+ Flood)
wins without any Terraform in 28 / 29 worlds** — the premise can be ignored — and its proofs are identical to the released Volatile Climate × Cinder
Rosette cell. **Reserve**: the strongest home for the climate-shock idea if a future completion condition requires warming (§9); not a first-batch
Challenge under the normal Bloom.

### 6.6 Far From Home (default rules) — RESERVE

Three variants, prescribed specialist on its opposite archetype, **no scenario** (the PRODUCT_DIRECTION §8 example):

| Variant | Qualifying | Arrival p50 (0 % worlds) | Witness p10 / p50 / p90 | 3 distinct strategies | Adapt-only / Terraform wins |
|---|---|---|---|---|---|
| Snow on the Dunes — Woolly Candle on Desert | 158 / 160 | 13 % (4) | 243 / 261 / 295 | 134 / 158 | 118 / 157 |
| Ember in the Ice — Cinder Rosette on Frozen | 157 / 160 | 16 % (5) | 258 / 317 / 424 | 133 / 157 | 132 / 157 |
| Reed in the Sand — Reed Spire on Desert | 159 / 160 | 6 % (36) | 245 / 280 / 321 | 126 / 159 | 153 / 153 |

Rich (several real strategies nearly everywhere) and always answering the archetype's required condition, but: (1) **the schema refuses the
`default` scenario** for a Challenge; (2) an Expedition already offers exactly these worlds — choosing Woolly Candle and an Extreme desert world on
the survey *is* Snow on the Dunes, without the framing. **Reserve**; the best variant is Ember in the Ice (widest time spread, the Cold-vs-Warm
trade-off the Frozen archetype was built around).

### 6.7 Measured and rejected

**Pioneer Rush** (Native Competition · player choice · starts with Seed Output + Early Maturity · 0 Biomass): qualifying **2.5–7.6 %** (released
35–65 % on the same worlds). The pacing probe: 15 / 16 refusals have the **first purchase after 60 s** (the locked BLOOM-013 decision cadence).
The ablation (0 Biomass, no adaptations) passes 13–25 % — **the pioneer head start lowers the win rate** (the fast-spreading seedlings are exactly
what established natives overgrow). Rejected: mostly impossible, conflicts with a locked rule, premise self-defeating.

**Empty Hold** (Dying World · player choice · 0 Biomass): qualifying **11–20 %** (released 86–95 %); 15 / 16 probed refusals = first purchase
after 60 s; the survivors buy at 47–60 s. The premise *is* the slow opening the cadence rule forbids. Rejected. (A reduced-reserve start —
e.g. 40–60 Biomass — is a different concept and would need its own study and a PMO view on cadence inside Challenges.)

**Deep Freeze** (derived: Dying World on Frozen worlds only): qualifying 82–95 % vs 85–96 % on all archetypes, witness times alike; the shipped
Dying World bank already holds 17 Frozen entries per species. Dying World under another name. Rejected.

**Last Refuge** (derived: Native Competition below the released 20 % arrival floor; the 036B recipe study proved every world): passes
**OH 87 % · CR 59 % · WC 91 % · RS 70 %** (≥ 20 %: 89 · 86 · 92 · 85 %). *Not* impossible — my starting hypothesis was wrong; the 20 % floor is a
content choice. As a separate player-choice Challenge it would be Native Competition with a smaller start; its authored, distinct form is
**Oasis Line**. Rejected as a separate Challenge.

### 6.8 Candidate banks

Built with the release builder's curation (`curateCell`, 50 per cell) as research output in `docs/evidence/bloom-036c/candidate-banks/`:
Low Tide 50 · Oasis Line 50 · Thin Air 50 · Hearthfire 50 · Windfall 4 × 50 · Far From Home 3 × 50 (no provenance: the schema refuses
`default`); Pioneer Rush (3–9 per cell) and Empty Hold (13–23) are provisional — too few qualifying worlds in the sample. None is loaded by the
game; a released Challenge gets its cells from `tools/build-challenge-seed-bank.mjs` as usual.

## 7. Rejected concepts — why

| Concept | Reason | Evidence |
|---|---|---|
| Pioneer Rush | mostly impossible (3–8 %); breaks the 60 s first-purchase cadence; the head start lowers the win rate | §6.7, `pacing-probe.json` |
| Empty Hold | breaks the 60 s first-purchase cadence (11–20 % qualify) | §6.7, `pacing-probe.json` |
| Deep Freeze | Dying World under another name | `candidate-study.json` → `derived.deep_freeze` |
| Last Refuge | viable but a smaller-start Native Competition; Oasis Line is its authored form | `derived.last_refuge` |
| Hearthfire *(reserve)* | premise ignorable under the normal Bloom (Adapt-only wins 28 / 29); same proofs as a released cell | §6.5 |
| Far From Home *(reserve)* | needs the `default` scenario (refused); overlaps the Expedition | §6.6 |
| Windfall *(hold)* | trivialises ~25 % of worlds at 400 Biomass | §6.4 |

## 8. Recommended release shortlist

**Low Tide · Oasis Line · Thin Air** (in that order of how much new design each adds):

| | Scenario | New lever shown | Qualifying | Witness p50 | Premise check |
|---|---|---|---|---|---|
| Low Tide | Dying World | prescribed starting adaptations as a *commitment* | 50 % of Ocean worlds | 397 s | the start decides 66 worlds; drought closed by rule |
| Oasis Line | Native Competition | prescribed specialist + an unfloored world recipe | 71 % of Desert worlds | 501 s | contested p50 11; drought in every win |
| Thin Air | Dying World | prescribed specialist whose weakness the scenario reverses | 98 % | 293 s | decline opens p50 12 % of land |

All three: current schema (scenario + prescribed species + recipe + starting state), the normal Bloom, banks of 50 already demonstrable, no engine
change, copy accepted by the resolver's no-ranking rule. Releasing them is a content + bank change (definitions in `content/challenges.js`, a bank
rebuild with the new cells, hub / dossier QA) — **not done here**.

Open PMO choices: (a) whether Thin Air ships as its own Challenge or as copy on the released Woolly Candle cell; (b) whether a two-Dying-World
batch is acceptable (Low Tide and Thin Air share the scenario; the alternatives are Windfall after recalibration, or Hearthfire with a completion
condition); (c) Oasis Line's slow pace (witness p50 ≈ 8 min of game time; a person needs longer).

## 9. Future requirements (not implemented)

**Completion conditions** that would make a concept's premise mandatory (input to 036D):

| Concept | Condition it would need | Why |
|---|---|---|
| Hearthfire | "Bloom with the sky warmed by at least N steps" (net Terraform temperature ≥ +6·N °C) | removes the Cold ×3 bypass; makes climate shocks the run's core risk |
| Windfall | "Bloom without the climate ever reaching *Critical*" (`sim.climate` bands already exist) | turns the windfall into a restraint test instead of a speed-up |
| Thin Air | "Bloom once the atmosphere has reached its final state" (a win counts only at decline progress 1) | forces the player to use the land the decline opens |
| Oasis Line | (optional) "Bloom holding at least N regions that natives held at landing" | rewards pushing out of the basins rather than only outgrowing elsewhere |
| Low Tide | none — the starting state enforces the premise | |

**Schema / system requirements:**

1. **Default-rules Challenges** (Far From Home): `BLOOM.challenges.checkChallenge` refuses `scenario: "default"`; the seed-bank builder's proof for
   a default Challenge would be S2 + the archetype's layer 7–8 search (as this study did), and the hub needs an icon for "no special pressure".
2. **Challenge-level pacing policy:** reduced-reserve or slow-opening Challenges are blocked by the scenarios' shared first-purchase ≤ 60 s band
   (BLOOM-013 decision cadence). Allowing one needs a PMO decision and a per-Challenge pacing override in the proof contract (a bank-rebuild-class
   change).
3. **Builder tooling:** `evaluateWorld` truncates the layer-P reason to 140 characters, which hides the failing pacing bound; keep the full reason
   (or the bound) in the candidate record.
4. **Presentation:** the dossier should say plainly what a prescribed start gives (it does) *and*, for Low Tide, what it closes ("Flood
   Adaptation: Drought Adaptation is not available to this plant"); a low-arrival dossier line (§5).

**No new engine mechanic is required for the shortlist.**

## 10. Reproduce

```bash
node tools/research/challenges/content-study.mjs --workers 12        # 1 640 concept worlds → docs/evidence/bloom-036c/study-rows/ (~65 min; resumable)
node tools/research/challenges/content-analysis.mjs                  # → candidate-study.json + candidate-banks/
node tools/research/challenges/pacing-probe.mjs --per-cell 4         # → pacing-probe.json (~2 min)
```

Concept definitions: `tools/research/challenges/concepts.mjs` (fixture Challenge definitions + default-rules drafts + derived questions).
Baselines read: `docs/evidence/bloom-036b/seed-bank/candidates.json`, `docs/evidence/bloom-036b/challenge-recipe-study.json`,
`content/challenge-seed-banks.js` (read only).
