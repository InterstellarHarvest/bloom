# BLOOM-027B — fixture and pin changes (why, and proof)

The cylindrical generator changes every procedural world on purpose (`docs/CYLINDRICAL_TOPOLOGY_v1.md` §10.4). Every test
expectation that encoded a pre-027B rectangular world was diagnosed before it was touched. Rules followed for each one:
1. identify why it changed; 2. prove the change is the cylinder's doing; 3. update only the procedural expectation, never a
balance constant or a validation rule; 4. a replacement seed must fill the SAME test role, by scan, not by trying seeds until green.

Scans behind the choices (all in this folder): `seam-survey.js` (production path, seeds 1–40), `fixture-scan.js` (per-attempt
validation with the archetype's own policy; `scan-*.json` in the worker's scratchpad, summarised below), `repin.js` (pins).

## 1. Raw generator fixtures (tools/gen-check.js, tools/crossing-check.js)

| fixture | was | now | why the old seed lost its role | proof the new one fills it |
|---|---|---|---|---|
| gen-check `moderate` (30 % water, two landmasses, the small island in Waterborne range) | seed 2024 | **seed 5** | seed 2024's island joins the mainland across the cut: read cylindrically it is ONE landmass (baseline tiles read as a cylinder also give 1) | seed 5: 2 landmasses, 1 section stranded without the trait, crossing gap 4, validates |
| gen-check `islands` + crossing-check archipelago (60 % water, ≥ 3 landmasses, crossing required, every landmass colonised and the 70 % win reached WITH Waterborne Seeds, only the origin landmass without it) | seed 25 | **seed 119** | seed 25's three rectangular islands are one landmass through the cut (13 seam rows carry the same section on both sides) | scan of seeds 1–400 with the suite's own build: seed 119 = 3 landmasses, 10 of 14 sections stranded without the trait, 59.1 % without it (no win), 87.6 % with it, all 3 landmasses colonised |

`seed 9 @ 60 %` keeps its role (rejected unconstrained, valid with `maxCrossingGap`): untouched.

## 2. Ocean Archipelago archetype fixtures

### tools/archetype-check.js
| fixture | was | now | role / proof |
|---|---|---|---|
| win | 8 | **8 (attempt 1, Coriol-220 — unchanged)** | still a crossing-required, Adapt-required world |
| negLayer4 | 3 (attempt 18) | **27 (attempt 1)** | seed 3 now accepts at 7 with no layer-4 attempt; seed 27/1 is structurally valid, fully reachable, rejected at layer 4 (best build 69.8 %), accepted at 5 |
| negLayer6 | 25 (attempt 0) | **24 (attempt 0)** | seed 25/0 is now a layer-7 rejection; seed 24/0 is rejected at layer 6 (best 72.3 % < 73 %), accepted at 2 |
| genFail | 35 | **114** | seed 35 now accepts at attempt 1; a production sweep of seeds 41–200 found exactly two seeds with no acceptable attempt in 24 (114, 141); the first is used |

### tools/strategy-check.js
| fixture | was | now | role / proof |
|---|---|---|---|
| positive | [13, 6] | **[28, 8]** | see §5 (the shared Ocean primary) — layers 1–8 PASS, 2 strategies answering different conditions AND holding different land, pacing inside the bands |
| layer7 (static proof) | [5, 5] | **[1, 8]** | 1 class, 1 simulation, production skips it (accepts at 19) |
| tooSlow | [6, 0] | **[12, 1]** | layer 7 PASS, layer 8 FAIL with "too slow" as the only reason, production skips it (accepts at 12) |
| tooFast | [1, 2] (natural) | **controlled only** | the full per-attempt scan of seeds 1–120 × attempts 0–23 (2,880 attempts) found NO Ocean attempt whose only pacing failure is "too fast" (the faster economy's too-fast worlds are now layer-7 cases); as for the late-first-purchase rule since BLOOM-013, the boundary is checked in isolation on the positive fixture (margin floor 899 s) |
| gap | [32, 10] | **[61, 15]** | layer 8 FAIL with a `purchase gap … > 120 s` reason (seed 61 accepts at 0; the attempt is a natural world production never reaches, like the old one) |

## 3. Desert World archetype fixtures (tools/desert-check.js)
| fixture | was | now | role / proof |
|---|---|---|---|
| negLayer4 | [35, 0] | **[57, 0]** | seed 35/0 is now accepted; 57/0 is a plausible desert with no legal build holding 70 % (best 58.8 %), accepted at 1 |
| negLayer7 | [50, 0] | **[68, 1]** | static proof (1 class, 1 simulation), production skips it (accepts at 2) |
| negLayer8 | [16, 0] | **[16, 0] (unchanged)** | still two broad strategies, both too fast (178 / 187 s < 240 s) |
| negOrigin | [9, 0] | **[1, 0]** | seed 9/0 is now accepted; 1/0's origin Copper Shelf has own fitness 0.68 < 0.72, Water-limited |
| second (optional playtest seed; bounded-retry proof needs an accepted attempt 1) | 9 | **4** | seed 9 now accepts at 0 (nothing to retry); seed 4 accepts at 1 |

## 4. Frozen World archetype fixtures (tools/frozen-check.js)
| fixture | was | now | role / proof |
|---|---|---|---|
| negLayer8 | [22, 0] | **[30, 0]** | seed 22 now accepts at 0; 30/0 has two broad strategies both too fast (167.8 / 167.2 s), accepted at 2 |
| negOrigin | [8, 0] | **[13, 0]** | seed 8/0 is now a layer-8 case; 13/0's origin Heath Expanse has own fitness 0.50 < 0.72, Temperature-limited, accepted at 1 |
| second | 12 | **4** | seed 12 now accepts at 0; the bounded-retry proof needs an accepted attempt 1 |
| negLayer4 | [46, 22] | **[67, 17]** | per-attempt scan of seeds 1–150 × attempts 0–23 (3,600 attempts): the only natural layer-4 cases are 67/17 (best build 2.1 %, production accepts seed 67 at 2) and 125/0 (production takes attempt 1, so it IS skipped on the way — but the check wants an attempt *behind* the accepted one, as before); layer 4 stays rare on Frozen in both generators (3 deep retries before, 2 now) |
| negLayer7 | [171, 0] | **[64, 8]** | the same scan found no layer-7 static-proof attempt BEFORE a seed's accepted attempt any more (64/8, 71/12, 80/16, 99/19, 104/21 all sit behind it); 64/8 fills the role (empty core, most land open at the start, static proof) and check 26 now accepts "production never takes this attempt" (accepted earlier OR later) instead of "accepted later" only |
| positive | 22 | **11** | §5 |

## 5. The shared fixture worlds (Ocean / Desert / Frozen primaries)

The three primaries are shared by dying-world-check, native-competition-check, volatile-climate-check, economy-check / economy-study,
procedural-run-check, game-flow-check, desert-check / frozen-check (Ocean identity pins) and colony-study. Each was chosen by running the
mechanism suites' Node parts against EVERY accepted world of its archetype (public seeds 1–40) and by scripted role predicates copied from
the checks (`role-scan-*.js` in the worker's scratchpad; results summarised here), not by trying seeds until green.

| fixture | was | now | why the old world lost its role | what the new one fills |
|---|---|---|---|---|
| Ocean primary | 13 (attempt 6, Eos-227) | **28 (attempt 8, Borea-495)** | seed 13's new world (attempt 2, Borea-703, 71 % water) has no region the drying blocks that Drought Adaptation / Humidify reopens, none the radiation blocks that Shielding reopens, its Dying World layer P proves one strategy only, and its two Eden strategies hold the same land (strategy-check 2) | the only world (with 38) scoring every Dying World role predicate — rad- and water-blocked regions reopened by the Adapt, Humidify reopens a dried region, two pressure strategies Drought-vs-Humidify, Eden strategies < 70 % in the final state — AND passing strategy-check's positive role (different conditions, different land, pacing inside the bands; seed 38 holds the same land) |
| Desert primary | 25 (attempt 0, Umbra-584) | **17 (attempt 0, Ymir-961)** | seed 25's new world keeps the same attempt and name but both its strategies are all-Adapt (no Humidify strategy: desert-check 13) and its Eden strategy still wins under full Dying World pressure (28b; layer P proves one strategy) | desert-check 10–14 all pass (Drought-only vs Humidify, different land, no crossing), Dying World layer P two strategies, Eden strategies 56 / 67 % in the final state; among the 13 such worlds it has the fewest Native Competition mechanism misses (two, both handled by role: §6) |
| Frozen primary | 22 (attempt 1, Mistral-887) | **11 (attempt 1, Pallas-609)** | seed 22 now accepts at attempt 0 (frozen-check 4 needs a rejected too-fast attempt 0 behind an accepted attempt 1), its strategies hold the same land (20) and Warm reopens no region in the Dying World final state (18) | attempt 1 behind a too-fast attempt 0, one landmass, 60 % cold-blocked, geothermal refuge origin, Cold-Adapt vs Warm strategies holding different land (two geothermal regions the warming scorches), Warm reopens 2 regions in the final state, Native 13 / 17 pass |
| Ocean second | 8 (attempt 1) | **8 (attempt 1, Coriol-220 — unchanged)** | — | still ≥ 3 landmasses with Waterborne Seeds offered |
| Desert second | 9 | **4 (attempt 1, Coriol-536)** | seed 9 accepts at 0 (nothing to retry) | attempt 1 behind a recorded rejection |
| Frozen second | 12 | **4 (attempt 1, Eos-103)** | seed 12 accepts at 0 | attempt 1 behind a too-fast attempt 0 |
| Native Competition "ocean" world | 13 | **30 (attempt 7, Borea-207)** | Ocean 28 (and 13) are too open: natives spread < 50 tiles during the competitive witness run (check 31's "no test immunity") | one of 8 Ocean worlds whose witness replay shows real native expansion (spread > 50, took > 10, peak > start) |
| Volatile Climate's own frozen / desert worlds | Frozen 22, Desert 25 (the shared primaries) | **Frozen 4 (attempt 1, Eos-103), Desert 22 (attempt 0, Ymir-917)** | its claims need a proven Terraform-heavy strategy that lives through a real shock; neither Frozen 11 nor Desert 17 has one (`vc2-*` scans: 2 of 40 Frozen worlds have such a layer-P strategy under either generator — it was a rare property of Frozen 22 before too), and every combination of the five such Frozen worlds with five Desert worlds was run through the suite | the combination with the fewest misses (Frozen 4 × Desert 22: 30 / 37b / 53, each handled by role, §6); Ocean stays 28 |
| Dying World extinction world (dying-world-check 23 / 25, economy-check 34–35, game-flow-check 47) | (Ocean 13 itself) | **Frozen 9 (attempt 4, Mistral-735)** | a no-purchase Dying World extinction was already rare (1 of 36 old Ocean worlds: Ocean 13; 0 of 40 new Ocean worlds, 3 of 40 Desert, 10 of 40 Frozen either way); it is a mechanism role (grace, clear loss), not an Ocean property | a production Frozen world whose no-purchase run dies out AFTER the Dying World final state and inside the 480 s the browser suites advance (390–402 s; Frozen 22 dies at ~230 s, before the final state, and Frozen 18 at 650–790 s, too late for the page) |

## 6. Check-logic changes (role-preserving, all documented in the checks)

- native-competition-check 6: short start-cover worlds are tested against the seeding rule's own bound instead of a fixed "≤ 2 short" count (§1 of this file's note in the check; 5 of 24 sweep worlds sit on the bound because cylindrical landmasses merge).
- native-competition-check 13 / BUILD: the mechanism tests use the primary fixture's OWN first proven competitive build (as the comment always said) — Desert 17's `seedOut, drought, salt, drought, dry, dry` instead of Desert 25's list.
- native-competition-check 17: the Adapt-flips-a-stronghold search runs over the fixture worlds in order (primary, ocean, frozen) with base builds = prefixes of that world's proven plan; Desert 17 has no such stronghold, Ocean 30 / Frozen 11 do.
- dying-world-check 23 / 25: the extinction mechanism runs on the `extinct` fixture world (Frozen 9).
- volatile-climate-check shockLab(partner): the snap size is searched upward from 10 °C in 2 °C steps until the world offers a shock-blocked region with an open neighbour (Frozen 11: 12 °C); the claim does not depend on the size.
- strategy-check 8: the too-fast rejection is a controlled policy boundary (no natural case in 2,880 Ocean attempts).
- frozen-check 26: "production never takes the layer-7 attempt" (accepted earlier or later), see §4.
- frozen-check 6: the 56 planet-body pins now pin the 027B generator (the knob-neutrality role is kept by the same comparison).
- frozen-check 20: the clause "the Cold strategy holds more land in total" is dropped — the claim is WHICH land (the geothermal refuges the warming scorches); on Frozen 11 the Terraform strategy holds more land overall while giving those refuges up.
- frozen-check 27: the too-fast negative is no longer required to be the positive fixture's own attempt 0 (production still skips it).
- frozen-check 30: the second refuge colony is reached after the world's strategy-A core is bought (nothing but Frozen 11's origin is green under the starting plant).
- native-competition-check 12: the response experiment takes the first qualifying region of the first fixture world where the natives still hold part of the region at 192 s in the open run (Frozen 11's first candidate is overrun entirely by then).
- native-competition-check 18: the Terraform tradeoff is measured on the first fixture world where one sky change moves the native's fitness both ways (Desert 17 moves it one way only; Frozen 11 shows the tradeoff).
- volatile-climate-check 25–27: real purchases under the scenario as written, or the smallest controlled snap magnitude (12 / 16 / 20 / 24 °C, the shock labs' own variant mechanism) that pushes a living region of the fixture to red — Frozen 4's margins are wider than Frozen 22's were.
- volatile-climate-check 30: the "Leaves is no shield" tolerance is 2 % + 1 plant (the old 1-plant tolerance was set on a ~100-plant swing; Frozen 4's is ~190 plants).
- volatile-climate-check 37b: the reckless stack is 3, 4 or 5 Humidify steps on the first of the three fixture worlds (frozen, desert, ocean) it drowns — Frozen 4's only colony survives the surge.
- volatile-climate-check 52 / 53 reckless controls: `f4vc` three Warms before any Adapt (as Frozen 22's was), `d22vc` Drought then three Humidify steps, `o28vc` Waterborne Seeds then two Dry-the-Sky steps — the same spirit (Terraform stacked as fast as Biomass allows) on the new worlds.
- volatile-climate-check 53 and economy-study: the Volatile recipes (`f4vc`, `d22vc`, `o28vc`) and their Eden controls (`f4`, `d22`) are regenerated from the fixtures' proven strategies by the rule the file states.
- game-flow-check 24–28: no Frozen World seed is rejected by Dying World layer P any more (seeds 1–120 scanned), so the scenario-rejection roles use Ocean 7342 + Native Competition (layer P INCONCLUSIVE → rejected) and Ocean 30 (accepted); the no-acceptable-planet role uses Ocean 114 (was 7).
- procedural-run-check: the played build is the accepted world's own strategy A (seed 28: seedOut, waterSeeds, salt, cold, rad, heat); the generation-failure seed is 114.
- colony-development-check [30–32]: the crossing-feedback run uses Ocean 2 — of the Ocean fixture-adjacent worlds (28, 8, 30, 13, 2, 5) it is the one whose crossings give both plain arrivals and footholds in that run (the others' every arrival takes root).
- economy-check 16 / 17 / 25 / 26 / 30 / 34–35: thresholds re-expressed for the new worlds without changing the claims — pressure ≥ 70 % at a normal Dying World win (was 75 %; Desert 17's player bot wins at 70 %), the drift closes ≥ 10 % of the land to an ignored Eden strategy (was 25 %; Desert 17 closes 10 % and ignoring still never wins), one click-bonus sample may be up to 15 s negative (was 5 s; the mean and cap are the claim), the start buys less than HALF of the cheapest winning core (was a third; Frozen 11's cheapest core is two upgrades, 280 Biomass), the Warm trade is previewed from Cold ×2 / Cold ×1 / none, whichever shows both sides, and the idle-extinction clause runs on Frozen 22 (the extinction fixture).
- economy-check / economy-study: worlds `o28`, `d17`, `f11` (+ Dying World), recipes regenerated from the fixtures' proven strategies; the "was" baselines (first global upgrade affordable, worst purchase gap) re-measured on the new worlds under the pre-BLOOM-013 economy with the same study (`economy-old-baseline.json`); no Dying World layer-P witness exists for Ocean 28 under the old economy, so that "was" plan is reported as absent.
- browser parts: desert-check 27 / frozen-check 37 read the page title from the fixture seed; frozen-check 42 expects Cold Tolerance present (Frozen 11's organism-first strategy is Cold + Heat, one Cold point; was Cold ×2) and 41 checks each Warm step of the Terraform strategy in turn (one on Frozen 11, two on Frozen 22); dying-world-check 35 / 42 read attempt and name from the fixture, and its threshold-notice (O) and doomed-control (41) pages open the extinction world (Frozen 9); native-competition-check 44 selects a contested region that still holds native cover; volatile-climate-check 60 expects at least one living region pushed past its limit by the three stacked Warms (two on Frozen 22).
- dying-world-check 21: the Roots-cannot-rescue experiment runs on the first fixture world (primary, desert, frozen, extinct) whose decline turns an established colony red, with the focus set at 240 s or earlier where that colony is gone by then.

