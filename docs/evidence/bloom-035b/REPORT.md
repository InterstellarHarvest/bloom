# BLOOM-035B — Species system implementation · evidence

**Branch** `agent/bloom-035b-species-system` → review branch `handoff/bloom-035b-review` · **base** `5ff53d3` (production `main` after the
BLOOM-035A closeout) · **not merged**. Design: [`docs/SPECIES_SYSTEM_v1.md`](../../SPECIES_SYSTEM_v1.md) (§0.1 PMO decisions, §0.2 what
035B built), [`docs/SPECIES_BODY_PLANS_v1.md`](../../SPECIES_BODY_PLANS_v1.md) ("Implementation (035B-5)"). Machine: macOS 12, Node 20.20.2,
Playwright 1.59.1, Chromium 147.0.7727.15, Firefox 148.0.2.

> The three new species' images in this folder are **TEMPORARY ENGINEERING PROOF ART** (flat fills, hazard checker), never final species
> art. They exist only behind the `?species=1` developer flag, to prove that every legal model renders.

## BLOOM-035A closeout

- Locked-decisions amendment `5ff53d3` (SPECIES_SYSTEM §0.1, the STUDY / BODY_PLANS status lines, PRODUCT_DIRECTION §4 / §6 / roadmap) —
  a clean fast-forward of `8e271f1` with docs + `tools/research/` only; `main` = `origin/main` = `5ff53d3`. That commit also marks 035A
  ACCEPTED / COMPLETE and 035B NEXT (no separate closeout commit needed).
- The 035A worktree, `agent/bloom-035a-species-design` and the remote `handoff/bloom-035a-species-design` were removed after proving every
  commit is contained in `main` and the worktree was clean.

## Commits (by slice)

| Slice | SHA | |
|---|---|---|
| 035B-1 species core | `c10fe9b` | `config.referencePlant`, `content/species.js`, `resources/bloom-species.js`, the `createSim(…, { species })` seam, native → reference |
| 035B-2 playability | `280cf7d` | species as a validation input; `generateFromArchetype` refuses it; `BLOOM.species.validateFor` (S1 reported, S2 required, S3/S4 recorded) |
| 035B-3 survey | `80c6b77` | physical / species-evaluation split, two caches, species-keyed sectors, worker protocol, survey species option |
| 035B-4 run identity | `187b8aa` · `f0f2a05` · `28b1be1` | GameSession / expeditionRun / trainingRun / report / app / entry / harness; portable rebuild; existing suites follow the protocol |
| calibration | `efa95b0` | `tools/research/species-study.js` + `calibration/` |
| 035B-5 body plans | `bf9f11b` · `bd0a752` · `68623da` · `0d0a62f` · `04c8aa5` · `6cdc1c2` | body-plan@3 layer, proof packs, specimen species API, body-plan-check, art briefs, docs + `body-plans/` evidence |
| 035B-6 Species Selection | `ca88286` | the screen behind `?species=1`, rooms part labels, `tools/species-selection-check.js`, portable rebuild |
| docs · evidence | `82b023e` · `8df8388` · this report | SPECIES_SYSTEM §0.2, PRODUCT_DIRECTION (CANDIDATE), README; these stills |
| QA | `65bb896` | atmosphere-transition A11 and body-plan-check S1 follow the combined branch |

## Species schema and the implemented physiology

`content/species.js` — `{ id, version, physiologyVersion, status, name, role, short, physiology, edges: null, startingGenome: null,
art: { bodyPlan, pack }, presentation: { roleLabel, note, strengths[], weaknesses[], dossier { habit, water, reproduction, science } } }`.
`BLOOM.species.resolve(id)` freezes it and derives `physiologyHash` and `physiologyKey = "<id>/p<physiologyVersion>#<hash>"`.

| id | status | physiologyKey | temperature | water window | salt | radiation | toxicity | art |
|---|---|---|---|---|---|---|---|---|
| `organic_hybrid` | released | `organic_hybrid/p1#e51a9448` | −6 … 24 °C | 32 … 68 | 15 | 30 | 25 | `oh-stem@1` / `organic-hybrid` |
| `cinder_rosette` | candidate | `cinder_rosette/p1#4bcba029` | 2 … 34 °C | 18 … 50 | 15 | 35 | 25 | `rosette@1` / `proof-cinder-rosette` |
| `woolly_candle` | candidate | `woolly_candle/p1#a3b9c465` | −14 … 16 °C | 28 … 64 | 15 | 50 | 25 | `candle@1` / `proof-woolly-candle` |
| `reed_spire` | candidate | `reed_spire/p1#c2acca04` | −6 … 24 °C | 42 … 82 | 60 | 30 | 25 | `reed@1` / `proof-reed-spire` |

Exactly the PMO's 035B v1 values; nothing was retuned (species-check Q3 pins them per physiologyVersion).

## referencePlant migration

- `content/config.js`: `genomeBase` → `referencePlant: Object.freeze({ … })`, the same numbers in the same position. **No legacy alias**:
  no production file reads `genomeBase` (species-check Q5 scans every tracked production file).
- Readers: `createSim`'s default player physiology (no species) and `nativeProfile` (Native Competition) — `resources/bloom-sim.js`.
  World generation reads it through those probes, always without a species. `deriveConfig` and `checkScenario` refuse
  `referencePlant` / `genomeBase` / `species` / `physiology`.
- `WORLD_GEN_VERSION = 1` (`BLOOM.archetype.WORLD_GEN_VERSION`); species-check Q4 pins `referencePlant` to WORLD_GEN_VERSION 1's numbers.
- Suites that pinned the old key: `colony-development-check` reads `referencePlant`; `volatile-climate-check` #50 hashes the whole config
  with the rename mapped back (still `58caa476`, so nothing else changed); `run-ui-convergence-check` N10 hands the 0f5ce81 engine the same
  numbers under its old key name.
- **Retuning Organic Hybrid does not change world generation** (Q5): a copy of the tree with Organic Hybrid at −9 … 21 °C generates
  byte-identical Ocean 28 / Desert 25 / Frozen 22 planets while the Organic Hybrid run itself changes.

## World identity · Native Competition separation

- **Q6**: a run without a species == an Organic Hybrid run == the 5ff53d3 engine, whole-state fingerprints every 250 ticks over a fixed plan
  with purchases, colony focus and local upgrades — First Bloom, Training Grounds, Ocean 28 (default and Volatile Climate), Desert 25 under
  Dying World and Native Competition. sim-check: Organic Hybrid reproduces `tools/golden/first_bloom.json` bit-for-bit; the specialists are
  pinned by `tools/golden/species_specialists.json`.
- **Q7**: for six study worlds, each species' survey candidate — built with its own empty cache — has the planetFingerprint and accepted
  attempt of the 5ff53d3 generator's world (e.g. `ocean_archipelago:15723 6347aba1e836b2ae`, classes F/E/F/F for the four species).
- **Q8**: `generateFromArchetype` refuses `species` (even `null`), `speciesId`, `physiology`, `referencePlant`; its two probes and two
  `validatePlanet` calls pass none.
- World-construction suites unchanged and green **without rebaselining any planet fixture**: archetype, desert, frozen, strategy, gen,
  topology, cylinder-gen, crossing (see the regression below).
- **Q9 Native separation** (Desert 25, Native Competition): the native's tolerance profile, its planet-derived starting stands (26.8 %
  cover) and its fitness in every region are identical for no species and all four species, while the player's fitness differs per species.

## Survey / cache performance

Node, one thread, one shared survey cache, sector seeds 1 and 77 (destination-survey-check):

| species | sector 1 | sector 77 | draws (1 / 77) | species-rejected |
|---|---|---|---|---|
| Organic Hybrid | 5.8 s | 7.5 s | 24 / 18 | 0 |
| Cinder Rosette | 6.5 s | 5.8 s | 17 / 34 | 0 |
| Woolly Candle | 2.5 s | 2.2 s | 19 / 20 | 0 |
| Reed Spire | 3.9 s | 4.2 s | 24 / 23 | 0 |

The largest column took 34 draws of `MAX_DRAWS = 400`. Later species run faster because the physical cache is shared: 33 of the 74 physical
lookups were hits. Expected draws per column from the 358-world calibration (see `calibration/tables.md`): at most 17.4 (Cinder Favorable,
Reed Precarious) against 8–10 for Organic Hybrid. In the browser, Change Species keeps the pool, its caches and the sector seed
(species-selection-check F2). Organic Hybrid's sector through a warm cache is identical to the uncached production sector (S13).

## Calibration (production species code vs the accepted 035A study)

`node tools/research/species-study.js --sample 120 --jobs 8 --strategies` → [`calibration/`](calibration/) (`tables.md`, `compare.md`,
`summary.json`, `results.json`):

- **1432 world × species rows compared with the accepted 035A data: 0 mismatches** in habitable share, class, winnability, witness spend,
  purchases, win time and distinct strategies. The implementation reproduces the study exactly.
- Every species wins every one of the 358 sampled worlds (S2 never rejects); First Bloom and Training Grounds are winnable for all four.
- Home advantage (best or tied-best landing share): **Cinder Rosette 99 % of Desert**, **Woolly Candle 79 % of Frozen**, **Reed Spire 90 %
  of Ocean**; Organic Hybrid 8–23 %. No species is best almost everywhere.
- Required-condition bypass (recorded): Cinder on Desert 9 %, Woolly on Frozen 6 %, all others 0 %.
- Pacing (recorded, not a gate): specialists win their home archetype fast (fastest margin under 240 s: Cinder / Desert 69 %, Woolly /
  Frozen 67 %); strategy diversity S3 ≥ 2 on Reed / Ocean 70 %, Cinder / Desert 79 %.
- S1 low foothold (< 5 %, reported): Organic Hybrid on Desert 20 %, Reed Spire on Desert 30 % — shown as Extreme, never rejected.
- **PMO flags raised: none.** None of the flag conditions occurred: lost winnability on an offered world, a near-universal best species, a
  vanished home advantage, common bypass, disagreement with the study, or survey fill approaching MAX_DRAWS.
- Training Grounds measures 0.36 / 0.38 / 0.58 / 0.36 in the survey's assessment against the study's table (0.39 / 0.36 / 0.60 / 0.39): the
  study weighted that authored world by tile counts, the survey by its sections' declared areas. All are Favorable in both. Procedural
  worlds agree exactly.

## Body-plan architecture · Organic Hybrid byte identity · proof packs

From the 035B-5 slice ([`body-plans/`](body-plans/), body-plan-check 15/15):

- `bloom-plant-body-plan@3` manifests (`art/plant/body-plans/{oh-stem,rosette,candle,reed}.json`, 84 × 98 for every plan), per-plan
  contracts (`art/plant/contracts/*`; materials / treatments / pixel rules shared from `contract.json`), per-plan grammars
  (`resources/plant-visual/grammars/*`), axis kinds `stem` / `rosette` / `sprite`. The compositor resolves the plan through the pack's
  `bodyPlan`. `oh-stem.json` references the locked `body-plan.json` / `contract.json` (byte-identical) and keeps the accepted OH code path.
  No skeletal animation, runtime leaves, rigs or per-species canvas sizes.
- **Organic Hybrid byte-identical** against the 5ff53d3 runtime loaded in a separate VM realm:
  - all 6 720 legal models: identical normalized models and selections;
  - 26 880 renders over the four oh-stem packs: identical placements, RGBA and signatures;
  - the same 117 sockets and the 17 782-placement clip proof per pack;
  - 10 080 production specimen frames identical with no species and with `organic_hybrid`.
  - The locked OH delivery (`packs/organic-hybrid/**`, intake, `PMO_FINAL_ACCEPTANCE.json`, ZIPs) is untouched.
- **New plans:**

  | plan | components | sockets | clip-proof placements | legal models |
  |---|---|---|---|---|
  | rosette@1 | 32 | 106 | 28 334 | 6 720 |
  | candle@1 | 37 | 107 | 17 768 | 6 720 |
  | reed@1 | 32 | 246 | 47 294 | 6 720 |

  Every legal model renders inside the canvas with at least a 1-px margin, deterministically, with exact palette colours and binary alpha.
  Every trait tier changes the picture, and every part anchor lands on anatomy.
- **Proof packs** `proof-cinder-rosette` / `proof-woolly-candle` / `proof-reed-spire`: generated (`art/plant/proof-packs/make-proof-packs.mjs
  --check`), titled and documented "TEMPORARY PIPELINE PROOF — NOT FINAL ART", a hazard checker on every drawing; not in `FINAL_PACKS`
  (per plan, `organic-hybrid` only).

## Species Selection (development flag) — `tools/species-selection-check.js` 56 / 56 (28 per browser)

Stills (Chromium unless named `firefox-`):

- the screen with all four species: [`species-1440x900.png`](species-1440x900.png), [`species-1024x768.png`](species-1024x768.png),
  [`species-2560x1440.png`](species-2560x1440.png), [`species-390x844.png`](species-390x844.png) (phone), [`firefox-species-1440x900.png`](firefox-species-1440x900.png)
- each species' dossier: [`dossier-organic_hybrid-1440x900.png`](dossier-organic_hybrid-1440x900.png) (the Organic Hybrid recommendation),
  [`dossier-cinder_rosette-1440x900.png`](dossier-cinder_rosette-1440x900.png), [`dossier-woolly_candle-1440x900.png`](dossier-woolly_candle-1440x900.png)
  (radiation shown as latent), [`dossier-reed_spire-1440x900.png`](dossier-reed_spire-1440x900.png),
  [`dossier-organic_hybrid-390x844.png`](dossier-organic_hybrid-390x844.png) (phone sheet), [`firefox-dossier-woolly_candle-1440x900.png`](firefox-dossier-woolly_candle-1440x900.png)
- the species switch keeping the sector seed: [`survey-woolly_candle.png`](survey-woolly_candle.png) then
  [`survey-reed_spire-same-sector.png`](survey-reed_spire-same-sector.png) (Sector 6E-077 both times), [`survey-focus-reed_spire.png`](survey-focus-reed_spire.png)
- the run, rooms and report: [`run-reed_spire.png`](run-reed_spire.png), [`run-adapt-reed_spire.png`](run-adapt-reed_spire.png) (proof specimen;
  plan part labels "Sheaths" / "Culms"), [`report-reed_spire.png`](report-reed_spire.png) (names Reed Spire; the win is the suite's QA shortcut)
- Training stays Organic Hybrid: [`training-organic_hybrid.png`](training-organic_hybrid.png)
- one physical world in different species-relative classes: see destination-survey-check S12, e.g. Frozen 22103 — Organic Hybrid 41 %
  Favorable · Cinder Rosette 27 % Precarious · Woolly Candle 66 % Favorable · Reed Spire 37 % Favorable, with one fingerprint
- the proof specimens: [`body-plans/`](body-plans/) contact sheets

What the suite proves, in both browsers:

- **Layout, at 390 × 844, 1024 × 768, 1440 × 900 and 2560 × 1440:**
  - four cards in role order, Organic Hybrid first and "Recommended first expedition";
  - strengths and weaknesses on every specialist;
  - no star / Easy / Hard / score words;
  - real specimens at a whole-number scale (×2, ×3 at 1440 × 900 and up), proof art labelled;
  - no horizontal overflow;
  - every dossier's primary button visible (pinned on the phone) at 5.61 : 1.
- **Keyboard radiogroup:** ← → Home End with wrap and `aria-checked`, a visible 3 px solid focus ring, Enter / Escape / Escape-to-title;
  reduced motion runs no animation.
- **Flow:**
  - Change Species keeps sector seed 77 and the pool;
  - the run's planet IS the selected object, with the fingerprint recomputed in Node;
  - the run's species IS the canonical object (sim, adapter, provenance);
  - the rooms show the species' pack, and the report names it;
  - Play Again keeps the same planet and species;
  - Choose another planet opens the same species' survey;
  - Main menu returns to the title, and EXPEDITION reopens on the last species;
  - Training is Organic Hybrid.
- **file:// offline** (portable runtime, no network) and **HTTP `/bloom/`** (the Pages site): the flag flow reaches a run with the exact
  planet and species.
- **No flag:** EXPEDITION goes straight to the Organic Hybrid survey — no species screen, chip, or candidate name, the species module is never
  requested, the run is Organic Hybrid, and Settings has no species or developer control.

## Focused QA

- **species-check** (new, Node): **17 / 17** — the PMO's 16 invariants, plus Q1's refusal set.
- **destination-survey-check**, extended with per-species S1–S4, S7 as a fixture table, S12–S15 and the boundary report:
  - all pass;
  - boundary report: First Bloom is 0.3535 for Organic Hybrid / Woolly Candle / Reed Spire, within ±0.01 of 35 %.
- **sim-check**: Organic Hybrid reproduces the golden bit-for-bit, and the specialists' goldens are pinned.
- **body-plan-check** (new) 15 / 15.
- **species-selection-check** (new) 56 / 56.
- **Post-035B-4 regression** on `f0f2a05` / `28b1be1`:
  - single-app-flow 59, game-flow 48, training 75, guided-training 50, run-ui 40, planet-view 80, plant-rooms 66, terraform 61,
    procedural-run 32, slice 15, release 52 and volatile-climate 78 all passed;
  - main-menu, run-ui-convergence and visual-system each failed one check — protocol / rename pins and V7's range — and were fixed in
    `28b1be1`; they now pass 17 / 57 / 54;
  - portable-runtime 67 / 71 — its classic-script count and lazy-module pins — was fixed with slice 6.

## Full regression

Every `tools/*-check.js` (**39 suites**: 36 existing + `species-check`, `species-selection-check`, `body-plan-check`) ran sequentially in a
clean detached worktree at `8df8388`, with nothing else running ([`qa-full-regression.txt`](qa-full-regression.txt)). **37 suites were
fully green.** Two pins failed: `atmosphere-transition-check` A11 (it sliced the survey's source up to the literal `dispose() {`) and
`body-plan-check` S1 (it scoped the whole branch rather than its own slice). Both were fixed in `65bb896` and re-run there: 14 / 14 and 15 / 15.
Neither was a flake, and no product code changed for them.

**Final: 39 / 39 suites · 1780 checks passed · 0 failing.** Highlights:

- species-check 17, species-selection 56 and body-plan 15;
- destination-survey all pass (18 assertion lines);
- portable-runtime 71, single-app-flow 59, release 52 and visual-system 54;
- world construction: archetype 40, desert 64, frozen 70, strategy 35, gen 47, topology 53, cylinder-gen 35, crossing 14 — no planet
  fixture rebaselined;
- run UI: run-ui 40, run-ui-convergence 57, planet-view 80, plant-rooms 66, terraform 61;
- training 75 and guided-training 50;
- plant suites: plant-sprite-pipeline 59, production-plant-integration 50, organic-hybrid-art-intake 45.

## Portable rebuild

`npm --prefix tools run build:portable` at `ca88286`: `dist/portable/strange-bloom.portable.js` sha256 `3af5f115…`, manifest fingerprint
`68d43a0c…`, 40 inputs; `check:portable` OK (a rebuild reproduces it byte for byte). The bundle gains the species content, the species
module and the lazily loaded species screen. The plant runtime is not in `dist/`.

## Final-art briefs (next phase — not started)

[`docs/species-art-briefs/`](../../species-art-briefs/) — `CINDER_ROSETTE_ART_BRIEF_v1.md` / `WOOLLY_CANDLE_ART_BRIEF_v1.md` /
`REED_SPIRE_ART_BRIEF_v1.md`, each with a JSON twin generated from its plan, contract, socket table and grammar (body-plan-check P6 proves
they equal a regeneration), plus the README with independent batches per species.

## Known risks / deviations

1. **S1 foothold is reported, not an offer gate** (SPECIES_SYSTEM §0.2). As a gate it would drop about a fifth of the Desert worlds the
   production Organic Hybrid survey offers today. S2 winnability is the only offer gate.
2. **Organic Hybrid reuses its world's layer 4–6 proof** for S2 (numerically the reference physiology, a bit-identical engine). The
   calibration measured its witness independently anyway: 358 / 358 winnable, identical to the study.
3. **Authored-world area weighting**: the survey weights by sections' declared areas, the 035A study by tile counts. This differs only on
   authored worlds (Training Grounds); every class is the same.
4. Body-plan slice deviations (its report):
   - `plant-components.js` is now a generated bundle of the four grammars, so no loader changed;
   - `oh-stem.json` references rather than converts the locked files;
   - Reed Spire's sheaths sit on the culms and the rosette's central root is deeper, so the rooms' fixed tendril order and GAP rule land on
     anatomy;
   - on the low Cinder Rosette the stem ("Rosette") anchor sits at the root crown;
   - the atlas grows 255 → 577 KB (proof packs drawn at full `maxSize`);
   - the generalized intake tool and per-pack stress tint are not built.
5. **First Bloom sits on the 35 % threshold for three species** (0.3535). It is pinned by the physiologyKey fixture table plus the ±0.01
   boundary report, never by a hard-coded "Favorable".
6. **Specialists win their home archetype fast** (recorded). Per the PMO, this is not retuned: specialists are supposed to feel specialized.
