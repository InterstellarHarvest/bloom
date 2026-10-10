# BLOOM — Pressure scenarios v1 (BLOOM-012, BLOOM-014, BLOOM-015)

> **Current names (BLOOM-033):** the no-pressure scenario is **`default`** (formerly `eden` / "Eden"; mechanics bit-identical; `eden` is
> accepted only by one legacy alias at the resolver). Dying World, Native Competition and Volatile Climate are planned Challenge
> ingredients, not Expedition choices ([`PRODUCT_DIRECTION_CURRENT.md`](PRODUCT_DIRECTION_CURRENT.md) §8).

Pressure scenarios are bible §11.3. This note covers the scenario catalogue, the engine contract, the validation layer and the three scenarios built so far: **Dying World** (§5, a changing physical environment), **Native Competition** (§6, BLOOM-014: a competing organism that responds to the player) and **Volatile Climate** (§7, BLOOM-015: the player's own Terraforming unsettles the climate). Numbers below are the current values in `content/scenarios.js`; the data file is the source of truth.

## 1. Scenarios are not planets

A run is **planet + scenario**. The planet can be an archetype world (`?archetype=…&seed=…`) or the authored First Bloom. The scenario comes from `content/scenarios.js` and is passed to the engine separately:

```js
BLOOM.createSim(planet, config, traits, { scenario })      // no scenario, or Eden = the pre-BLOOM-012 engine, bit-for-bit
BLOOM.pressure.resolveScenario(BLOOM_DATA.scenarios, id)   // null/undefined → Eden; an unknown id throws
BLOOM.validateScenario(planet, config, traits, scenario, { archetypeId, minStrategies })   // layer P
```

No archetype is cloned to make a pressure variant. The engine, witness, validators and UI never name a specific scenario. They read the scenario's data (`tools/dying-world-check.js` check 1c scans for that).

## 2. Catalogue format

Every entry is plain JSON-shaped data:

| Key | Meaning |
|---|---|
| `id`, `name`, `intent` | identity and design intent |
| `pressure` | `null` = no pressure clock. Otherwise: `graceSeconds`, `durationSeconds`, `channels`, `graceLabel`, `phases` |
| `competition` | optional (BLOOM-014): a competing native organism — `tolerance`, `start`, `growth`, `contest`, `events` (§6). Absent = no native layer |
| `pressure.channels` | the drift at full pressure. `temperature` (°C added to the sky), `moisture` (points added to the sky, clamped 0–100), `moistureShare` (a fraction of the planet's **starting** sky moisture), `radiation` (points added to every land region's surface radiation) |
| `pressure.phases` | readable stages `[{ from, id, name, note }]`, `from` = progress 0–1 ascending from 0. Entering one is a milestone |
| `loss` | `{ extinction: true/false, extinctionGraceSeconds }` |
| `validation` | layer P policy: `minStrategies`, `holdFinalSeconds`, `pacing` bands, `archetypes` (per-archetype `{ allowed: false, reason }`), optional `confirmRngSeeds` (BLOOM-014) |
| `display` | short player-facing copy: `title`, `summary`, one note per channel, optional `lossNote` for the extinction screen |

A scenario with neither `pressure` nor `competition` (Eden) changes nothing: `BLOOM.pressure.isDynamic(s)` is false, the engine is the plain engine and layer P has nothing to prove.

## 3. Engine model

- **Clock.** Progress is 0 through the grace period, rises linearly to 1 over `durationSeconds`, and stays at 1. Reaching 1 is the final, degraded world, never a loss by itself.
- **Drift.** Each channel's offset is progress × its maximum. It is added inside the ordinary evaluation: the sky temperature and moisture every region sees, and each region's surface radiation. Fitness, the four lamps, the limiting factor, growth, die-back and Biomass all follow from those effective conditions. No special "pressure damage" stat exists, and the economy code never reads pressure.
- **Nothing is mutated.** The planet data and the scenario data stay untouched. Terraform changes the player's own sky (`sim.sky`); the drift is added on top of it. Terraform therefore never changes scenario progress, and the scenario never undoes a Terraform purchase.
- **Origin refuge.** Bible §11.3: the origin may be immune to the player's own Terraform but not to scenario pressure. Under pressure the protected-refuge floor (0.62) shrinks in proportion to how much of the origin's own habitability the pressure has removed. A home region that stays habitable is unaffected; one the decline makes hostile can die out.
- **Live state** is `sim.pressure`: `id`, `active`, `seconds`, `progress`, `offsets {temp, moist, rad}`, `phase` (−1 = grace), `events` (phase changes), `startsAt`, `fullAt`, `max`.
- **Extinction** (only when the scenario enables it): no Living tile anywhere for `extinctionGraceSeconds` in a row → `sim.lost`, `sim.lostReason`, `onLoss(reason)`, and the run is frozen. A shorter gap resets the counter. A won run is never lost afterwards. Eden never loses.

## 4. Validation layer P

Archetype layers 1–8 keep validating the underlying Eden planet; an Eden witness proves nothing about a pressure run. `resources/bloom-scenario.js` adds one separate layer that reuses the witness machinery with the scenario switched on:

- the static search estimates every build in the scenario's **final** pressure state;
- every witness is a real engine run **with** the scenario. Pressure advances on the real clock, purchases go through `sim.buy` with Biomass earned under the pressured economy, and extinction is live. There are no grants and no immunity;
- a witness passes only if it reaches the win threshold + 3% margin **and** still holds the win threshold `holdFinalSeconds` after the final state is reached. A win that only outran the decline is no proof;
- `minStrategies` distinct broad strategies (layer-7 signatures) must pass, inside the scenario's own pacing bands;
- pressured witnesses try two purchase orders: what opens land now first, or what the final world needs first. Eden's search is unchanged.

Statuses: **PASS**, **FAIL**, **INCONCLUSIVE** (a search cap was hit; never accepted), **DISALLOWED** (per-archetype data policy), **EDEN** (nothing to prove).

BLOOM-014 generalized the layer to any scenario that changes the run. Without a pressure clock, the hold is measured `holdFinalSeconds` after the margin (with a clock: after the later of the margin and the final state, exactly as before). Optional `confirmRngSeeds` re-run a found witness's plan under other simulation seeds; each must also reach the margin and hold, so a win from one lucky RNG stream is no proof. Confirmation runs never use up the search budget. For a competition scenario the static stage cannot know a final native state, and does not invent one; see §6. The browser harness starts a pressured run only on PASS and hands the UI a status and a count, never builds or plans.

## 5. Dying World

**Science idea (simplified game model):** the planet is losing its atmosphere. Thinner air holds less water vapour (drier), traps less heat (colder: less greenhouse warming) and shields the surface less (more radiation). The directions are coherent; real atmospheric loss does not behave identically, or at the same rates, on every planet.

Player-facing wording: **Atmosphere thinning.** *The planet is slowly losing atmosphere. Conditions are becoming drier and colder, and surface radiation is increasing.*

| Setting | Value |
|---|---|
| Grace | 40 s (*Atmosphere stable (for now)*) — BLOOM-013; was 60 s |
| Decline | 250 s, linear; final state at 290 s (~4¾ min) — BLOOM-013; was 420 s, final at 480 s |
| Moisture | `moistureShare` −0.4: the sky ends 40% drier than it began (Ocean 13: −21.6 · Frozen 22: −18.4 · Desert 25: −7.2) |
| Temperature | −8 °C |
| Radiation | +8 on every land region |
| Phases | Early decline (0, 40 s) · Noticeable loss (0.34, ~125 s) · Severe decline (0.67, ~208 s) · Final harsh state (1, 290 s) |
| Extinction | no living plants for 8 s |
| Layer P | 1 strategy required for a playable combination; final-state hold 60 s; margin 240–900 s, first purchase ≤ 60 s, no gap over 120 s (BLOOM-013; was 300–1200 s, 30–150 s, 300 s) |
| Per-archetype policy | none disallowed |

**Why moisture is a share.** A fixed loss in points crushed Desert World (sky moisture 18) while barely touching Ocean Archipelago (54). Losing a share of the water vapour present is the better physical rule and needs no archetype special case: humid worlds lose more points than dry ones.

**BLOOM-013 clock retune.** The owner's Dying World playtest came back REVISE: *"the game still seems a bit slow to actually gain enough biomass to effectively do anything and strategize."* The fix was the shared economy ([`ECONOMY_v1.md`](ECONOMY_v1.md)), which shortens runs by about a third. Under the old 60 + 420 s clock the faster economy outran the decline: Eden builds bought as if nothing were changing won 4/4 on Ocean 13 and Desert 25. So the clock was rescaled with the runs, not the economy slowed back down. Channels, phases and the extinction rule are unchanged. Evidence: `docs/evidence/bloom-013/dying-world-clock-sweep.txt` (4 run seeds: 60/420, 30/300, 45/270, 30/240) and `dying-world-clock-sweep-8seeds.txt` (8 run seeds, bubbles ignored and clicked: 45/270, 30/270, 40/250, 30/240), `pressure-study.txt`. 45/270 looked enough on 4 seeds, but on 8 a bubble-clicking player could still win Desert 25 with the Eden Drought ×2 build, and Ocean 13's Eden Heat + Rad build won 8/8 for the player bot. 40/250 closes both without pushing a fixture witness gap over 120 s. Faster clocks (30/240) start to stretch Ocean 13's seed-output → Radiation Shielding wait past 120 s, because the decline cuts income during it.

**Tuning evidence** (BLOOM-012 values in `docs/evidence/bloom-012/`; current values from `tools/pressure-study.js` in `docs/evidence/bloom-013/`):

- Every accepted Eden strategy of the three fixtures falls below 70% growable land in the final state. Ocean 13: 75% → 22% and 77% → 36%. Desert 25: 74% → 40% and 75% → 55%. Frozen 22: 91% → 17% and 82% → 11%. The earlier solution stops being enough.
- On Ocean 13 a first profile of a fixed −14 moisture, −6 °C and +12 radiation left exactly one strategy class: Waterborne Seeds plus Radiation Shielding held everything. Drying by a share of the moisture creates the Drought-vs-Humidify question.
- Sweep of public seeds 1–20 (accepted Eden worlds): Ocean 15/17 pass layer P, Desert 18/20, Frozen 20/20 under BLOOM-012. Under BLOOM-013: Ocean 17/18, Desert 17/20, Frozen 20/20. Rejections are explicit, e.g. *best build reaches 69.1% < 70%*, and now also *margin reached at 150.6 s < 240 s (too fast)*: a pressure run won before the decline has done much is not accepted.

**How the same decline lands on each archetype:**

- **Ocean Archipelago** starts moist, so the drying matters late. The cooling actually *opens* hot lowlands, while radiation makes Radiation Shielding the price of keeping most islands. The fixture's two strategies answer the drying by evolving (Drought Adaptation) or by Terraforming (Humidify).
- **Desert World** is already dry, so it loses fewer moisture points, but each one hurts more. Strategies lean harder on Drought Adaptation, Humidify, or both. Most also take Radiation Shielding: the sunny south already carries high radiation, and the drift pushes it over the limit.
- **Frozen World**: the cooling compounds the cold. One fixture strategy goes all-in on Cold Tolerance (×3) without Radiation Shielding; the other adds Radiation Shielding and warms the sky. They hold different land. Both also need one Drought Adaptation as the air dries.

**Known limitations:**

- On Ocean 13 both strategies hold the same land; they differ in how they answer the drying, not in territory. Desert 25 and Frozen 22 hold different land.
- Under BLOOM-013 every fixture witness reaches its margin at or after the final state (290 s; pressure 100% at the margin), and normal bot wins come at 90–100% of the decline. The decline is lived through, not raced. Ocean 13's seed-output → Radiation Shielding stretch is still the longest wait in the scenario (~100 s for the witness, up to ~115 s with human reaction time in the browser run).
- Radiation Shielding is part of most pressured strategies, because the radiation channel is not terraformable. A world can give radiation-heavy ground up instead (Frozen 22 strategy 1, Ocean seed 9).
- The witness is a perfect-knowledge floor that never uses colony focus or local upgrades. Human pacing is untested until the owner playtest ([`PLAYTEST_DYING_WORLD_v1.md`](PLAYTEST_DYING_WORLD_v1.md)).

## 6. Native Competition (BLOOM-014)

**Purpose.** Dying World is pressure from a changing physical environment. Native Competition is pressure from **another living organism that occupies space and responds locally to the player's expansion**. Target feeling: *"The planet was already alive. I need to find places where my plant can compete, strengthen vulnerable colonies, and decide whether to adapt the organism or alter the environment."* There is no clock and no countdown.

**Science idea (middle school):** organisms compete when they need the same limited resources: light, water, nutrients and space. Environmental conditions decide which organism has the advantage, so a species that does well in one habitat can lose in another, and changing the environment can change the outcome. Invasion success is not simply "strong beats weak", and competition does not always end with one species gone. Player-facing words: *native competitor, competing vegetation, native cover, contested, competition for light/water/nutrients/space*. Never enemy, attack, infection, combat or kill. Native plants are not "bad"; they are adapted to the planet as it was.

Player-facing summary: *This planet already has native vegetation. It competes with your plant for light, water, nutrients and space.*

### 6.1 A generic mechanism

The engine has one generic competition mechanism, switched on by a scenario's `competition` block (`createSim(…, { scenario })`). Native Competition is that block plus copy. No engine, witness, validator or UI code names it (`tools/native-competition-check.js` check 2 scans for that). A future scenario, or an archetype-flavoured variant, can reuse the mechanism with other numbers.

### 6.2 State

- `sim.competition.native[t]` = native stand density (0–1) on land tile `t`; 0 = no native cover. **One organism per tile:** a native-held tile is never Living or Dead for the player.
- Native cover is never on water, void or lava, never counts toward the player's coverage, and never changes the coverage denominator. The win is still 70% of the colonizable land Living at once.
- Per region: native vigor and fitness (eased like the player's), tile counts, contact ("front") tiles, recent gains/losses, and a side: *your advantage / native advantage / even / no native plants here*.
- Events (`sim.competition.events`, real transitions only, the most recent 64): `contested` (the first contested region), `playerAdvantage`, `nativeRetake` (a net loss of ≥ 6 player tiles in a region within ~20 s, then quiet for 60 s there), `nativeDominated` (a region becomes ≥ 50% native with the player under 10%; regions that start that way raise nothing).

### 6.3 Start (from the planet, never the run RNG)

Every run of the same planet starts the same way (hash of planet id + scenario id → its own stream). The natives cover 26–32% of the colonizable land, in 4–7 organic patches grown on ground they can grow on. Patch centres are weighted by native fitness² and kept apart. Stand density is 0.6–0.9 × the native's fitness there. The origin region and every land tile within 5 steps of it stay open. No landmass starts more than 60% native-held, which leaves natural gaps and open shore on every island.

| Fixture | Native land at the start |
|---|---|
| Desert 25 (primary) | 26.8% |
| Ocean 13 | 26.0% (none on the home island) |
| Frozen 22 | 27.9% |

### 6.4 Suitability

The native is adapted to the planet's **starting** conditions. Its temperature and moisture windows have the baseline plant's width (`breadth` 1.0) and are centred halfway (`adaptation` 0.5) between the baseline plant's centre and the planet's area-weighted median starting ground. Its salt and radiation limits move the same way toward the 75th percentile of the starting land. pH and toxicity limits are the baseline plant's. It is evaluated with the same softness and the same effective inputs as the player: the current sky (Terraform included), local offsets and any scenario drift. Desert 25 natives like −0.5…29.5 °C and moisture 13–49 (the player starts at −6…24 °C and 32–68), so they hold the dry ground the un-adapted player cannot.

### 6.5 Rules

- **Open ground.** Each organism spreads by its own ordinary rule: the player's spread is unchanged; the native's is `spread` 0.02 × native fitness × (1 + 0.34 per extra native neighbour) × the neighbours' mean stand density, on ground where its vigor > 0.55. Within a tick, the player's spread is resolved first.
- **Stands.** Native density thickens toward its own vigor (`rate` 0.004 × the ground's soil/light modifier), holds in its marginal band, and thins where its vigor < 0.35. A stand under 0.04 disappears: the native recedes. Either organism's stands thicken up to 50% more slowly while the other holds their neighbours (`crowding` 0.5 × share of the 4 neighbours): competition for light, water, nutrients and space.
- **Fronts.** *Attack* = min(vigor on that ground, 1) (`nativeVigour` 1.0: the native is as vigorous as the player's plant where each is equally suited). *Defence* = that attack × (0.4 + 0.6 × support). *Support* is the larger of the defender's colony maturity in the region (mean stand density) and its local stand (its own density, or its same-organism neighbours' mean). A contested tile flips to the attacker with the attacker's ordinary spread chance × min(1, (attack − defence) / 0.3). The player additionally needs ground it can grow on (vigor > growThresh), and the native likewise.
  - The better-suited organism pushes into the other's cover.
  - When both suit the ground equally, established stands hold and young ones are overgrown.
  - Red ground stays red: the player never takes it, whatever its focus or upgrades.
- **Roots** (focus or Root Network) cut the chance of being overgrown by its `dieBackCut`, only where the player's ground is at least marginal (the same rule as die-back). It is never immunity.
- **Waterborne Seeds** that land on native-held shore take root only by out-competing the stand there (the same attack/defence rule); open shore is unaffected.
- **Economy.** Untouched: competition never reads or writes Biomass. The player earns less only because it has fewer or thinner Living stands.
- **Loss.** The generic extinction rule (no living plants anywhere for 8 s). There is no "natives reached X%" loss.

### 6.6 Counterplay (existing tools only)

| Tool | What it does against competition | Evidence (check) |
|---|---|---|
| **Adapt** | raises the player's own fitness; never changes the native's | Radiation Shielding lifts Wadi Shelf from 90% to 100% suited against natives at 97.5%; a controlled front goes from net −40 to +40 tiles (17) |
| **Terraform** | changes the shared environment: native strongholds can leave the native's window while other regions suit it more; never deletes native cover directly | after the Adapt-heavy build on Desert 25: Humidify suits the natives better in 3 regions and worse in 1, and hands Amber Shelf to them (native fitness 92% → 100%); Dry the Sky wins Wadi Shelf for the player (its fit 67% → 100%); Cool the Sky wins Pale Pan (native fit 100% → 95%). Buying Humidify + Cool leaves every native stand untouched until the tick rules respond (18, 19) |
| **Spread** | works on contested ground as on open ground | Seed Output ×2 (same build otherwise): coverage at 240 s 68.8% → 80.5%, native tiles taken 654 → 860 (20) |
| **Roots** | holds a young contested colony | young colony vs established natives, 64 s: ends with 50 tiles (Roots) vs 33 (Balanced) (39) |
| **Seeds** | pushes a winning front | native tiles taken in 16 s: 61 (Seeds) vs 47 (Balanced) (40) |
| **Leaves** | pays in secure, established colonies; no protection | secure colonies +50% Biomass; a contested Leaves colony holds no better than Balanced (41) |

So the spatial pattern the design hoped for emerges without being forced: **Roots at a fragile front, Seeds on a front you are winning, Leaves behind the front.** Validation never needs it: witnesses stay on Balanced and buy no local upgrade.

### 6.7 Validation (layer P)

`validation`: 1 strategy for a playable combination (the primary fixture is checked for 2), hold 70% for 60 s after the margin, confirmed under simulation seeds 101 and 202, margin 240–900 s, first purchase ≤ 60 s, no gap over 120 s, no archetype disallowed.

- The **static stage** counts a region only where an established player colony would beat mature native cover in that environment (`sim.holdsAgainstNatives`: the player's fitness > the native's at full maturity, i.e. the engine's own contest rule). Native land a build cannot win blocks the static path to the regions behind it. This ranks candidate builds only; it never decides a verdict, and there is no invented "final native state".
- **Every witness** is a real competitive run: natives start established, spread, contest and recede live, extinction is live, and all Biomass is earned. It must reach the margin, still hold 70% 60 s later, and do both again under two more seeds.

| Fixture | Layer P | Strategies (signature → purchases, margin, native land start → peak → end) |
|---|---|---|
| **Desert 25 (primary)** | PASS, 2 strategies | **Adapt-heavy** [Drought ×2, Heat, Salt, Radiation]: Seed Output 26 s → Salt 103 → Radiation 178 → Drought 225 → Drought 311 → Heat 359; margin 444 s; holds 77.9%; natives 26.8% → 41.3% → 22.1% · **Terraform the heat** [Drought ×2, Salt, Radiation, Cool the Sky]: the same until Cool 375 s; margin 501 s; holds 76.6%; natives → 18.1%. They hold different land (each gives up a different region). |
| Ocean 13 | PASS, 1 strategy (a 2nd unresolved within the search caps) | [Waterborne Seeds, Salt, Radiation, Heat, Drought, Dry the Sky ×2]: margin 620 s; holds 77.4%; natives 26.0% → 40.9% → 19.1% |
| Frozen 22 | PASS (2 found when asked) | [Cold ×2, Heat]: margin 311 s; natives 27.9% → 37.0% → 20.3% · [Cold ×2, Radiation]: margin 363 s |

- **The Eden answers are no longer enough on the primary fixture.** Desert 25's accepted Eden strategies peak at 43.5% (Drought ×2) and 60.5% (Drought + Humidify + Heat + Radiation) under competition. In the economy study, Ocean 13's Eden strategies also never win (0/4 runs each). Frozen 22's Eden build (Cold ×2) still wins: competition slows it but does not force a different answer there.
- **Territory timeline, Desert 25 Adapt-heavy witness** (s: player / native land): 30: 5/36 · 90: 5/41 · 240: 5/41 · 300: 8/38 · 361: 36/34 · 421: 67/31 · 481: 77/23. The natives fill open ground in the first ~90 s, while the player's plant is still stuck on its wet home ground. Once the build fits the dry ground, the player's established colonies push the fronts back. The natives keep the regions that suit them better.
- **Sweep** (public seeds 1–10, accepted Eden worlds): Ocean 8/9, Desert 8/10, Frozen 10/10 pass. Ocean 5 and Desert 1 fail statically (*best build reaches 52.9% / 61.3% < 70%*). Desert 10 is INCONCLUSIVE (*no candidate reached the win; best peak 26%*). (`docs/evidence/bloom-014/layer-p-sweep-1-10.txt`)

### 6.8 How it lands per archetype

- **Desert (primary).** One contiguous front. The natives hold the dry ground the un-adapted plant cannot. Drought adaptation lets the player contest it, but Drought ×2 also makes the wet Wadi Shelf "too wet", and the natives keep it. Heat (Adapt) or Cool the Sky (Terraform) then decide the hot regions; each strategy gives up a different region.
- **Ocean.** The natives are island populations; they never cross water. On Ocean 13 none start on the home island, and the western island is largely native-held, so Waterborne Seeds lands on its open shore or must out-compete the stand there. The cheapest Eden builds stall around 50%. On several sweep worlds the winning witness pushes the natives off every island (native land at the end 0–13%): once an island is lost they cannot return.
- **Frozen.** The natives favour the milder, cold-adapted middle ground, not the frozen wastes. Cold Tolerance competes head-on, and the native front slows the run without changing the answer. It is the mildest of the three.

### 6.9 UI (temporary, functional)

- Map: native stands are violet and hatched (one "/" mark on a young stand, two on a dense one), so they never read by colour alone. Fronts are amber lines on tile edges where the two organisms touch.
- Region panel: *🌿 Competition: ▲ Your advantage / ▼ Native advantage / ◆ Even contest / — No native plants here*, a CONTESTED tag, native cover and your plants as shares of the region, how well the ground suits each, recent tiles taken each way, and one plain sentence of why. Colony tips read the front: Roots where natives push in, Seeds on a winnable front, Leaves behind it.
- Status bar under the HUD: native-held land (share of the land), its trend over ~20 s, contested regions and who leads in them. No countdown.
- Messages + short outlines for each engine event. Terraform previews and purchase messages also name regions where the new sky suits the native plants more or less.
- Bloom Report: one line with native land at the start, at the peak and now, regions contested, and the land left to native vegetation: *"You did not need to remove every native plant."* The extinction screen uses the scenario's own `lossNote`.

### 6.10 Known limitations

**Human gate (recorded 2026-10-02 in BLOOM-015): passed with notes**: *"fine. continue."* No tuning pass now; the items below are backlog observations.

- Desert 25's two strategies share Drought ×2 + Salt + Radiation and differ only in Heat (Adapt) vs Cool the Sky (Terraform). They hold different land, but this is the same "same condition, Adapt vs Terraform" kind of difference as Ocean's Eden pair. No Humidify strategy qualifies under competition.
- Ocean 13 proves 1 strategy, and it is expensive (1510 Biomass, 8 purchases); a second class stays unresolved within the search caps. Ocean runs are the longest (witness margin 620 s; ~530 s for the player bot).
- Frozen 22: the Eden build still wins; competition adds friction, not a new decision.
- Natives can be pushed off a whole island or world (several Ocean sweep witnesses end at 0%). This is a legitimate outcome of the rules, not a requirement, and the report never claims eradication. It does mean natives never recolonize across water.
- On the primary fixture the player's plant stays on its home region for the first ~4–5 minutes while the natives spread. A person who buys Drought first gets out sooner (economy study "player" bot: win in ~5 min). Human feel is untested until the owner playtest ([`PLAYTEST_NATIVE_COMPETITION_v1.md`](PLAYTEST_NATIVE_COMPETITION_v1.md)).
- The witness is a perfect-knowledge floor that never uses colony focus. The UI is temporary.

## 7. Volatile Climate (BLOOM-015)

**Purpose.** Dying World changes the environment on a clock; Native Competition adds a living competitor. Volatile Climate makes pressure come from **the player's own climate manipulation**: *Terraform is powerful. What happens when changing an entire planet too aggressively creates unstable conditions before the new climate settles?* Terraform stays useful but is no longer casually spammable. There is no clock: a player who never or barely Terraforms meets little or no instability, so Adapt-heavy play is a legitimate low-volatility strategy. It is not a moral punishment; Terraform is not framed as bad.

**Science idea (middle school), shown in the status bar's tooltip:** *Climate instability (a simplified game model): rapid changes to a planet's climate can push connected systems out of balance. Feedbacks can make the climate overshoot or swing back before it settles, so heavy Terraforming can cause temporary temperature or moisture extremes. Real climates do not respond the same way to every change, and one action does not cause one heat wave; this model only shows the idea that fast, large forcing brings more variability.* Useful words: feedback, variability, overshoot, system response, temporary extremes. Never: punishment, disaster, "climate science says one warming causes one heat wave", symmetric oscillation.

Player-facing summary: *Terraforming changes the whole planet's climate. Change it too fast and the climate becomes unstable: it can swing to temporary extremes before it settles.*

### 7.1 A generic mechanism

A scenario's optional `climateInstability` block switches the engine's instability layer on (`createSim(…, { scenario })`). Volatile Climate is that block plus copy. No engine, witness, validator or UI code names it (`tools/volatile-climate-check.js` check 2 scans for that). A scenario can carry `pressure`, `competition` and `climateInstability` independently; with no block there is no climate state at all, and a Volatile Climate run that never Terraforms is the Eden run bit-for-bit with the same number of RNG draws (check 6).

### 7.2 State (`sim.climate`)

Per sky axis (`temp`, `moist`): **level** 0..1 (how unsettled that part of the climate is), **recent** (Terraform steps on that axis, fading), **net** (the same, signed: + = warming / humidifying), the announced (**pending**) or running **shock**, a quiet-until tick, the current **offset**. Overall **level** = the most unsettled axis; **band** = its readable state. History: every shock (`shocks`: kind, axis, sign, size, severity, start / end tick) and every Terraform push (`forcing`). **events** (most recent 64): `band` (cause terraform / settling), `shockWarning`, `shockStart`, `shockEnd`. **env** = scenario drift + active shock = what every evaluation reads.

### 7.3 Data (current values)

```js
climateInstability: {
  baseline: 0.05,
  axes: {
    temp:  { unit: 6, magnitude: [8, 14],  up: Heat pulse, down: Cold snap },   // one Warm / Cool step = 6 °C
    moist: { unit: 8, magnitude: [12, 22], up: Wet surge,  down: Dry spell },   // one Humidify / Dry step = 8 points
  },
  forcing:  { perStep: 0.3, compounding: 0.6, memorySeconds: 90 },
  settling: { halfLifeSeconds: 75 },
  shocks:   { threshold: 0.55, warningSeconds: 12, durationSeconds: 45, rampSeconds: 8, release: 0.4, quietSeconds: 20, overshootShare: 0.5 },
  bands:    Stable 0 · Unsettled 0.3 · Volatile 0.55 · Critical 0.8,
},
loss: { extinction: true, extinctionGraceSeconds: 8 },
validation: { minStrategies: 1, holdFinalSeconds: 60, confirmRngSeeds: [101, 202], mechanicEvidence: { terraformSteps: 2, minShocks: 1 },
              pacing: { marginSeconds: [240, 900], firstPurchaseSeconds: [0, 60], maxPurchaseGapSeconds: 120 } },
```

### 7.4 Forcing and settling

- **Only Terraform forces.** A Terraform step of size `units × axis.unit` adds `perStep × units × (1 + compounding × recent)` to its own axis (clamped to 1). Adapt and Spread add nothing (checks 9–11). A step that changes nothing (a sky already at its clamp) adds nothing.
- **Compounding is per axis and fades.** `recent` counts that axis's Terraform steps with time constant `memorySeconds`. One Warm on a settled climate: 5% → 35% (Unsettled). A second Warm at once adds 48 points (→ 83%, Critical); the same second step 4 minutes later adds ~31. Humidify after Warm adds one ordinary step to moisture: the axes are separate and readable.
- **Settling.** Every axis relaxes toward the baseline with a 75 s half-life, with no purchase needed.
- **A single step never shocks.** `baseline + perStep` (0.35) is under the threshold (0.55), so one Terraform step on a settled climate is never "suicidal". With the BLOOM-013 economy, Terraform tiers arrive ~60–70 s apart: two Warms bought as soon as affordable usually set off one modest shock; spacing them ~2 minutes apart usually avoids it. The player is never made to wait. Adapt, Spread and colony upgrades are useful meanwhile, and nothing is disabled (there is no Terraform cooldown, check 14).

### 7.5 Shocks

- **Trigger.** An axis at or above `threshold`, with no shock of its own running or announced and outside its `quietSeconds`, **announces** a shock (`warningSeconds` = 12 s ahead).
- **Size.** `lerp(axis.magnitude, severity)`, where severity = how far above the threshold the axis rose between the warning and the start. Two quick Warms: ~11.7 °C; three: ~14 °C; two Warms ~70 s apart: ~8.5 °C.
- **Kind.** An **overshoot** continues the recent forcing (warming → heat pulse); a **rebound** swings back (warming → cold snap). Which one depends on a planet-derived hash of `planet | scenario | axis | shock number`, with `overshootShare` of them overshoots. It never draws gameplay randomness, so the same purchases at the same times give the same shocks under any run RNG (check 7). The preview can therefore name the likely kind exactly.
- **Effect.** For `durationSeconds` (45 s, ramping in and out over 8 s), the axis's offset is added to the sky inside the ordinary evaluation: lamps, fitness, growth, die-back, Biomass, natives (if any). There is no damage stat, no coverage drain, no Biomass penalty, no price change (checks 20, 23, 24). Regions turn green → yellow → red and back through ordinary fitness (checks 25–26). When a shock starts it releases 40% of the axis's excess instability; when it ends the offset is exactly 0 again. The permanent Terraform never changes and the planet data is never edited (checks 21–22).
- **Origin.** Same generic rule as scenario drift (§3): the protected-refuge floor shrinks in proportion to the habitability the shock removes, so a big enough swing can threaten the home colony.

### 7.6 Readability (temporary UI)

- **Status bar** under the HUD (not the left panel): overall instability % on a meter with the shock threshold marked, band (Stable / Unsettled / Volatile / Critical), each axis's own %, the announced or running shock (kind, size, time to it / time left), a one-line forecast ("One more temperature Terraform step now would set off a shock…", "Settling: back to Stable in about 1:20"), and the sky as *base + Terraform + shock = now* (the shock term only while one runs). There is no scenario countdown because there is no clock.
- **Terraform preview / purchase.** The existing open / close / closer / worse readout gains one line: `🌪 instability: temperature 35% → 83% · Unsettled → Critical · ⚠ this will set off a temperature shock in ~12 s (likely a cold snap, about −11.7 °C)`, or "no shock from this step", or "adds to the temperature swing already under way".
- **Messages** come from real engine events only: shock announced (with the colonies at risk: those near their cold / heat / wet / dry limit), started, passed; the climate settling back to a lower band. Band rises caused by a purchase are already in the purchase message (no spam).
- **Map.** A faint tint of the shock's kind over the map, following its ramp; ground colours follow the shocked sky. Living regions the shock pushes toward their limit, and regions that reopen as it passes, get a message + short outline. These are attributed to the shock, never to a purchase. BLOOM-015 also fixed a latent attribution bug: a purchase made on the same tick as a lamp check used to be blamed on the scenario.
- **Inspect.** The region's temperature line shows the shocked ground value; a note names the shock, its size there, the time left, and that the Terraform stays.
- **Bloom Report / extinction screen.** One climate line: Terraform steps (per axis), peak and current instability, the shocks and the largest temporary swing, and "*Instability is the cost of changing a whole planet quickly, not a score: a heavily Terraformed win and a low-instability win are both wins.*"

### 7.7 Validation (layer P)

Layer P runs every witness with the real instability layer. Purchases (sim.buy, earned Biomass) unsettle the climate live, shocks start and end in the engine, and extinction is on. Nothing is injected.
- **Hold after the last shock.** The hold check waits for every running or announced shock to end and then `holdFinalSeconds` (60 s) more. A win that only lasted until the next shock is no proof.
- **Mechanic evidence.** A witness whose plan buys ≥ `mechanicEvidence.terraformSteps` (2) Terraform steps counts only if ≥ `minShocks` (1) real shock started before its hold check. An Adapt-heavy witness may legitimately see none. In a variant where no shock can happen, the Terraform-heavy plan reaches its margin but is **not** accepted (check 43).
- **Robustness.** Two confirmation seeds (101, 202) must also pass margin + hold.
- **Static stage unchanged.** Shocks are temporary, so builds are ranked in the steady climate; the verdict is the simulation's.

### 7.8 Evidence

**Primary fixture: Frozen World 22** (`?archetype=frozen_world&seed=22&scenario=volatile_climate`). Layer P PASS; with `minStrategies: 2` it proves both target shapes:

| Strategy | Purchases (validation seed) | Climate | Margin · hold |
|---|---|---|---|
| **Adapt-heavy** `Temperature:cold=Adapt(2)` | Seed Output 28 s → Early Maturity 95 s → Cold 132 s → Cold 200 s | instability never leaves 5%; no shock (all 3 seeds) | 252 s · 90.8% at 312 s |
| **Terraform-heavy** `Temperature:cold=Adapt(1)+Terraform(+12)` | Seed Output 28 s → Cold 84 s → Warm 148 s → Warm 219 s | peak 59% (Volatile); cold snap −8.5 °C at 231–276 s (1 shock on every seed) | 306 s · 81.8% at 366 s |

They differ in what they do to the planet and in the land they hold: the Adapt plant keeps the warm geothermal refuges (Mist Reach, Caldera Expanse) that warming the sky overheats. Under the cold snap, the Terraform plant's newly opened cold regions (Rime Slope, Hoar Expanse, Snow Reach) turn green → yellow → red and come back as it passes, while the overheated geothermal refuges briefly reopen. In a real browser run through the shop buttons (earned Biomass), the Terraform-heavy plan won at 283 s with a cold snap at 209 s.

**Controlled experiments** (granted Biomass at fixed moments so two runs differ in one thing only; `tools/volatile-climate-check.js`):
- **Adapt helps survival (27):** under the identical −10.6 °C cold snap, Cold ×1 → 4 living regions red, 1.5% of its land lost; Cold ×2 → 2 regions, 0%.
- **Roots (28–29):** in a marginal swing (fitness 0.32) a Roots colony loses ~32 of 73 plants vs ~51 on Balanced; in a yellow-band swing (0.45) both simply hold; in a red swing (0.10) both lose all 73.
- **Leaves (30):** no protection (~55 lost in the marginal swing).
- **Seeds (31):** a region emptied by a cold snap regrows from its neighbour ~1.8× faster on Seeds (64 vs 36 tiles 20 s after the snap; the region keeps its focus through total loss).
- **Over-Terraforming (44):** the same three Warms stacked 3 s apart reach 100% (Critical), a 14 °C shock, a 3.9-point coverage dip and a win 45 s later than without the scenario; spaced 3 minutes apart they peak at 45% and never shock.
- **Reckless loss (37b):** no Adapt, two quick Warms, then three Humidify steps in 10 s → a Critical wet surge (+22) drowns the only colony: **extinction** at 261 s. The identical purchases without the scenario survive.

**Cross-archetype.**
- **Desert 25:** PASS (`Water:dry=Adapt(2)`). With 3 strategies the Humidify ×1 build passes without a shock, and a Cool ×2 + Humidify build passes through a real heat pulse. Two Humidify steps in a row set off an ~18-point wet surge that pushes Oasis Basin green → yellow → red.
- **Ocean 13:** PASS (`Waterborne Seeds + Salt + Cold`; asked for five strategies, five classes qualify, including single Dry and single Cool steps, none with a shock). *Diagnosis:* every strategy core needs at most one Terraform step, so sensible Ocean play meets little instability. Two quick Dry steps produce an ~18-point dry spell that moves island suitability. Waterborne Seeds stays geography-driven.
- **Sweep, seeds 1–10:** Ocean 9/9 generated worlds pass (8 with 2 strategies, 1 INCONCLUSIVE at 2), Desert 10/10 (10), Frozen 10/10 (10). Witnesses on 3 of these worlds met a shock: most cheapest strategies need ≤ 1 Terraform step.

**Economy and cadence** (`tools/economy-study.js --worlds f22vc,d25vc,o13vc`; 4 run seeds × 2 colony policies × 2 bubble policies; bots buy 4 s after a purchase is affordable, never waiting for the climate). BLOOM-013 values unchanged. First global upgrade affordable at 26–29 s. Every strategy recipe's largest gap ≤ 99 s, and every recipe wins 4/4, including the reckless control. The longest stretch with nothing meaningful affordable is identical to the same worlds in Eden (58 / 60 / 74 s). The reckless Frozen recipe (Warm ×3 first) wins at up to 418 s vs 299 s for the Terraform-heavy recipe.

### 7.9 Known limitations

- **Mild where Terraform is optional.** On most generated worlds the cheapest strategies need ≤ 1 Terraform step per axis, so a sensible run meets little instability (Ocean 13 has no Terraform-heavy strategy at all). The scenario's pressure exists exactly as far as the player chooses to Terraform. That matches the design (no clock), but it means it adds little to an Adapt-first player.
- **Two sky axes only.** Radiation shocks were not added; temperature and moisture carry the idea.
- **Shock direction is a planet-derived lottery** (overshoot vs rebound). On Frozen 22 the first temperature shock is a cold snap, which hurts Terraform-reliant land; on another planet it may be a heat pulse that mostly helps cold land. It is deterministic and named in the preview, but some players may read a "helpful" shock as odd.
- **The origin refuge is not shielded from shocks** (same rule as scenario drift). A Critical swing on a one-colony plant can end the run (the reckless control). It is announced 12 s ahead, and the purchase preview warns of it.
- **Bot vs witness timing.** The witness buys the instant it can, so its two Warms are ~70 s apart; a person who spaces Terraform steps 2+ minutes apart may avoid every shock. That is a legitimate choice, but it makes the scenario's effect depend on purchase timing.
- **Temporary UI**, like the other scenarios: the status bar adds a two-row strip under the HUD (header ~147 px). Human feel is untested until the owner playtest ([`PLAYTEST_VOLATILE_CLIMATE_v1.md`](PLAYTEST_VOLATILE_CLIMATE_v1.md)).

## 8. Player-facing selection (BLOOM-016)

No scenario numbers changed. Each scenario gained a `display.card` block (tagline = what changes, detail, cue = the key strategic idea, a temporary icon key, and an optional tag; only Eden's *Relaxed*), which the launcher (`index.html`) reads for its scenario cards and briefing. Scenarios are offered as different kinds of problem, not a difficulty ladder.

The launch flow uses layer P exactly as it is: for a scenario that changes the run (`BLOOM.pressure.isDynamic`), every automatically chosen World Seed must pass `validateScenario` on its generated world before the run starts; a rejected or inconclusive candidate is skipped (bounded, `content/play.js` search.maxCandidates = 6) and never started; a DISALLOWED entry in `validation.archetypes` disables that planet + scenario card with its `reason`. No combination is DISALLOWED today. Volatile Climate's human gate passed on 2026-10-03 (*"1 - done"*).
