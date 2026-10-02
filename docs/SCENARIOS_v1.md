# BLOOM — Pressure scenarios v1 (BLOOM-012)

Pressure scenarios are bible §11.3. This note covers the scenario catalogue, the engine contract, the validation layer and the first scenario, **Dying World**. Numbers below are the current values in `content/scenarios.js`; the data file is the source of truth.

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
| `pressure` | `null` = no outside pressure (Eden). Otherwise: `graceSeconds`, `durationSeconds`, `channels`, `graceLabel`, `phases` |
| `pressure.channels` | the drift at full pressure. `temperature` (°C added to the sky), `moisture` (points added to the sky, clamped 0–100), `moistureShare` (a fraction of the planet's **starting** sky moisture), `radiation` (points added to every land region's surface radiation) |
| `pressure.phases` | readable stages `[{ from, id, name, note }]`, `from` = progress 0–1 ascending from 0. Entering one is a milestone |
| `loss` | `{ extinction: true/false, extinctionGraceSeconds }` |
| `validation` | layer P policy: `minStrategies`, `holdFinalSeconds`, `pacing` bands, `archetypes` (per-archetype `{ allowed: false, reason }`) |
| `display` | short player-facing copy: `title`, `summary`, one note per channel |

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

Statuses: **PASS**, **FAIL**, **INCONCLUSIVE** (a search cap was hit; never accepted), **DISALLOWED** (per-archetype data policy), **EDEN** (nothing to prove). The browser harness starts a pressured run only on PASS and hands the UI a status and a count, never builds or plans.

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
