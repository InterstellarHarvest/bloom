# Strange Bloom — species system v1 (BLOOM-035A design)

**Status: ACCEPTED (PMO, 2026-10-10) — BLOOM-035A design COMPLETE; BLOOM-035B implements it.** The PMO accepted this design
with the decisions recorded as **LOCKED** in §0.1 below; where §0.1 and a later section differ, **§0.1 wins** (the later sections are kept
as the reviewed design text). BLOOM-035A itself changed no production mechanic, data file or sprite.
[`PRODUCT_DIRECTION_CURRENT.md`](PRODUCT_DIRECTION_CURRENT.md) §4–§7 wins about what is decided for the product.

Companion documents:

- [`SPECIES_STUDY_v1.md`](SPECIES_STUDY_v1.md): the measurement study (four candidate physiologies plus seven sensitivities, 358 validated
  worlds, landing shares, classes, witnesses, strategies, the planet-identity entanglement measurement).
- [`SPECIES_BODY_PLANS_v1.md`](SPECIES_BODY_PLANS_v1.md): the body-plan layer for the sprite pipeline, the candidate species concepts,
  and the art-production plan.

Line references are to `main` at the BLOOM-034 closeout (`8e271f1`). The engine, generator, validators, witness, survey data and
content files are byte-identical there to `79f5540` and to `726f74d` (release-check R78 / visual-system-check V7).

---

## 0. Summary

1. **One physical planet per World Seed, whatever the species.** World construction is a function of
   `(archetype, public seed, WORLD_GEN_VERSION)` and never of the selected species. Today's generator *is* entangled with a plant —
   its attempt loop accepts or rejects whole worlds using the Organic Hybrid baseline (§2.2). The design keeps that loop exactly as it
   is, but names the plant it reads the **reference physiology**: a frozen, versioned constant of world generation, numerically equal
   to today's `config.genomeBase`. The selected species is never an input to it, so every existing world seed keeps its planet
   (zero fixture churn), and a species can only *accept or reject* a finished world, never change it.
2. **Species enters at one seam:** `BLOOM.createSim(planet, config, traits, { species })`. A species replaces the PLAYER's starting
   physiology inside `derived()` only. `config` is not copied or edited; the native competitor, the environment, the sky, scenario
   pressure and the purchased genome stay where they are (§4).
3. **Organic Hybrid's physiology equals the reference physiology bit-for-bit**, so a run with `species: organic_hybrid` is the
   golden-pinned engine of today (`tools/golden/first_bloom.json` unchanged).
4. **The Destination Survey becomes species-relative** without touching planet identity: the expensive *physical* validation of a
   candidate world is shared by every species; the cheap *species evaluation* (habitable share, class, dossier, species playability)
   is per species. A sector is keyed by `(sector seed, species id, physiology version)`.
5. **Species playability is a separate validation family** (S-layers): landing foothold, winnability with this physiology, optional
   strategy diversity. A species-rejected world is skipped for that species; it is never regenerated or mutated.
6. **Species are physiology-first.** The study (358 validated worlds) found that four physiology blocks alone give each role a
   recognizable home (the best landing share on 76–92 % of its archetype's worlds), a real weakness, no universal winner, and no
   trapped species (every physiology could win 100 % of worlds). Growth / economy modifiers are not recommended for v1.
7. **Art needs a body-plan layer** (one manifest, one component contract and one small grammar per body plan); Organic Hybrid's plan is
   migrated byte-identically. Details in the body-plans document.

---

## 0.1 PMO decisions — LOCKED for BLOOM-035B (2026-10-10)

**Reference physiology (§2.3, §12.1).**

- A new explicit key **`config.referencePlant`**, numerically identical to today's `genomeBase`. It belongs to **world generation**, not
  to any playable species. `WORLD_GEN_VERSION` stays **1**; any future change to `referencePlant` requires an explicit `WORLD_GEN_VERSION`
  decision.
- The meaning of `genomeBase` is **not** merely renamed: production readers migrate to the explicit concept. If a temporary legacy alias
  is technically necessary it must point to the same object, and no new production logic may read it.
- Organic Hybrid has its **own** species physiology object, numerically equal to `referencePlant` (QA pins the equality; the two objects
  have different semantic ownership). Retuning Organic Hybrid never changes world generation.

**Cold role (§3.5, §12.2).** The production candidate is a **COLD SPECIALIST**. Its additional radiation tolerance stays; radiation is a
**latent secondary strength**, not a promise that it thrives on irradiated landing ground, and player copy must say so honestly (e.g.
"Handles harsh radiation once heat is under control"). Cold + dry is **not** substituted at this stage.

**Strategy diversity (§6.3, §12.3).** Species-specific **winnability is required**. Strategy diversity and pacing are **recorded
diagnostics only**: they never reject an otherwise winnable species / world pair. World construction keeps every existing reference
physiology validation exactly as today.

**Organic Hybrid note (§7.2, §12.4).** Organic Hybrid keeps a "Recommended first expedition" / "Balanced generalist" note. It is never
labelled Easy, and species are never presented as difficulty levels.

**Physiology values for 035B v1 (§3.4, §12.5)** — the implementation values; not tuned casually during implementation. A retune needs a
concrete measured defect (study tool evidence, documented first) and changes that species' physiology version.

| id | concept | tempFloor | tempCeil | waterPos | waterTol (window) | saltTol | radTol | toxTol |
|---|---|---|---|---|---|---|---|---|
| `organic_hybrid` | Organic Hybrid — generalist | −6 | 24 | 50 | 18 (32 … 68) | 15 | 30 | 25 |
| `cinder_rosette` | Cinder Rosette — dry / heat | 2 | 34 | 34 | 16 (18 … 50) | 15 | 35 | 25 |
| `woolly_candle` | Woolly Candle — cold | −14 | 16 | 46 | 18 (28 … 64) | 15 | 50 | 25 |
| `reed_spire` | Reed Spire — wet / flood | −6 | 24 | 62 | 20 (42 … 82) | 60 | 30 | 25 |

(The study's role ids `dry_heat`, `cold_v2`, `wet_flood` are these physiologies; production uses the concept ids above.)

**Challenges (§4.3, §12.7).** A Challenge **never** changes `referencePlant`. It may choose a species, a world recipe, a scenario,
starting adaptations / state, or combinations of these; `referencePlant` remains a world-generation constant.

**Species concepts accepted:** generalist **Organic Hybrid** · dry / heat **Cinder Rosette** · cold **Woolly Candle** · wet / flood
**Reed Spire**. The alternates (SPECIES_BODY_PLANS §3) remain historical design alternatives only.

**Developer flag (§8, §12.6).** Species mechanics may live on `main`; the Species Selection screen is reachable only with the explicit
developer query flag `?species=1` (no Developer section in normal Settings) until the real species art is accepted. Without the flag the
Expedition flow is the Organic Hybrid flow.

## 0.2 Implementation (BLOOM-035B — CANDIDATE on `handoff/bloom-035b-review`, pending PMO review)

What BLOOM-035B built against §0.1 (evidence and numbers: [`docs/evidence/bloom-035b/REPORT.md`](evidence/bloom-035b/REPORT.md)):

| Area | Implementation |
|---|---|
| Reference physiology | `content/config.js` `referencePlant` (frozen; numerically the pre-035B `genomeBase`; **no `genomeBase` key, no alias**). `WORLD_GEN_VERSION = 1` in `resources/bloom-archetype.js` (`BLOOM.archetype.WORLD_GEN_VERSION`). Readers: `createSim`'s default player physiology (no species) and `nativeProfile` (the native competitor). |
| Species data | `content/species.js` (`organic_hybrid` released; `cinder_rosette`, `woolly_candle`, `reed_spire` `status: "candidate"`), the §0.1 numbers; `resources/bloom-species.js`: `resolve` (frozen; unknown id throws `UNKNOWN_SPECIES`), `list` / `ids` (role order), `check` / `checkSpecies` (refuses modifiers, softness, starting genomes, ranking copy), `physiologyKey = "<id>/p<physiologyVersion>#<fnv of the numbers>"`, `provenance`, `validateFor` (S-layers). |
| The seam | `createSim(planet, config, traits, { species })` — a resolved species only (an id string or a bare physiology throws); it replaces `derived()`'s base and nothing else; `sim.species` provenance. No species ≡ Organic Hybrid ≡ the 5ff53d3 engine, bit for bit. `deriveConfig` and `checkScenario` refuse `referencePlant` / `genomeBase` / `species` / `physiology`. |
| Validation | the witness, `validatePlanet` (layers 4–8) and `validateScenario` (layer P) take `opts.species`; `generateFromArchetype` **refuses** `species` / `speciesId` / `physiology` / `referencePlant`. |
| Playability | `BLOOM.species.validateFor`: **S2 winnability required** (findWitness with the species; Organic Hybrid reuses its world's own layer 4–6 proof — numerically identical physiology); **S1 foothold measured and reported** (`low` flag, never a rejection — see the deviation below); S3 / S4 and required-condition bypass **recorded only** (`diagnostics`). |
| Survey | `survey-data.js`: `physicalCandidate` (species-free; key `<archetype>:<seed>@w<WORLD_GEN_VERSION>`) + `evaluateSpecies` (key `<physical>|<physiologyKey>`) composed by `makeCandidate(spec, deps, { species, cache })`; columns accept a world only if its class *for the species* is the column's and the species can win it (`speciesRejected`); sector key `<seed>|<physiologyKey>[|fb]`; global thresholds and `MAX_DRAWS` unchanged. Workers resolve `{ id, physiologyKey }` themselves; a new `evaluate` task; `SectorPool` holds the page session's physical + evaluation caches and survives a species switch (`release`). |
| Run identity | `expeditionRun(detail)` takes `detail.species` cross-checked with the candidate's `speciesId` + `physiologyKey`; `GameSession` requires the canonical species object; the report names the species; Play Again = the same planet + species objects; Choose another planet = the same species' survey; `trainingRun()` is always Organic Hybrid; the harness takes `&species=<id>` (unknown = explicit failure; `training=1` refuses it). |
| Species Selection | `resources/species-select/` — **only** behind `index.html?species=1` (lazily loaded; never in the normal flow; no Settings entry). Without the flag EXPEDITION is the Organic Hybrid survey, unchanged. |
| Body plans | `bloom-plant-body-plan@3` with `oh-stem@1` (Organic Hybrid, migrated byte-identically), `rosette@1`, `candle@1`, `reed@1`; per-plan contracts and grammars; three TEMPORARY engineering proof packs (`proof-cinder-rosette`, `proof-woolly-candle`, `proof-reed-spire`), never final art. See [`SPECIES_BODY_PLANS_v1.md`](SPECIES_BODY_PLANS_v1.md). |

**Deviation (recorded for the PMO): S1 foothold is reported, not an offer gate.** The design text (§6.3) proposed "S1 + S2 required" with a
0.05 minimum. As a gate it would remove about a fifth of the Desert worlds the production Organic Hybrid survey offers today (the 035A study:
20 % of Desert worlds are below 0.05 for Organic Hybrid) — changing the accepted no-flag flow — while the study itself (§5.3) concludes those
worlds are winnable and correctly shown as Extreme. 035B therefore measures S1 for every offered world (`playability.s1`: reachable /
growable shares, `low`), shows it in QA and calibration, and keeps S2 winnability as the only offer gate (the PMO's "required offer gate:
species can win the planet"). The origin is a protected refuge for every species, so no offered world has zero foothold.

---

## 1. Current-state dependency map

The simulation has no notion of species. "Organic Hybrid" exists only in art, presentation and docs; in mechanics the plant is the
`config.genomeBase` block plus a genome of purchased trait counts.

### 1.1 Where the starting physiology is read

| Where | What it does with the plant baseline | Role |
|---|---|---|
| `content/config.js:18` | `genomeBase { tempFloor −6, tempCeil 24, waterPos 50, waterTol 18, saltTol 15, radTol 30, toxTol 25 }` | the one starting physiology |
| `content/config.js:21-31` | category softness (`Temperature.soft 10`, `Water.soft 12`, `Soil.saltSoft 26`, `Hazard.radSoft 20 / toxSoft 26`), pH window, lamp bands | global physics of the four categories |
| `resources/bloom-sim.js:387-398` `derived()` | base + genome × `scales` → the live tolerance window | **the player's physiology (the seam)** |
| `resources/bloom-sim.js:415-449` `evaluate()` | factors, fitness, limit, words — all through `derived()` | player |
| `resources/bloom-sim.js:529-539` `nativeProfile()` | the native competitor's windows = `C.genomeBase` width × breadth, centred toward the planet's median | **native (must stay species-free)** |
| `resources/bloom-archetype.js:105-114` | `minOriginFitness`, `minRefuges` under the starting genome | world acceptance (reference plant) |
| `resources/bloom-archetype.js:116-129` | layers 4–8 + `requiredConditions` through `validatePlanet` → witness | world acceptance (reference plant) |
| `resources/bloom-witness.js:111`, `:350` | probe and simulation sims via `createSim(planet, config, traits, …)` | validation (inherits whatever physiology the sim gets) |
| `resources/bloom-validate.js:139` | denominator sim (no physiology dependence in its result) | structural |
| `resources/bloom-scenario.js:47` | layer P competition probe | scenario validation |
| `resources/destination-survey/survey-data.js:67-84` `assessWorld()` | habitable share = green-lamp land share under the starting genome | survey class |
| `resources/destination-survey/survey-data.js:261` | dossier "Solar exposure": `r.radiation > C.genomeBase.radTol` | survey dossier |
| `resources/run/game-session.js:61-62` | the run's `createSim` (shared config, or Training's derived config) | gameplay |
| `resources/run-ui/run-ui-adapter.js:167` | `plantMin / plantMax` from `derived()` | UI (already species-safe) |
| `resources/run/game-session.js:147-158` | `LIMIT_MSG` / `FIX_HINT` copy per limit word | UI copy (species-neutral wording) |

### 1.2 Systems that assume exactly one starting plant

- **The engine** — `derived()` reads `C.genomeBase` directly, so the only way to vary the plant today is a derived config, which would
  also move the native competitor (`nativeProfile` reads the same key) and every other `config.genomeBase` reader.
- **World generation acceptance** — §2.2.
- **The Destination Survey** — `assessWorld`, `predictClass`, `makeCandidate`, `columnCandidates` / `planColumn` / `columnFromValidated`,
  the dossier, the worker messages (`survey-worker.js` reads globals; no species in any message), `SectorPool.key(seed, firstBloom)`
  (`sector-pool.js:48`) and the title prefetch (`expedition-entry.js`).
- **The run handoff** — `expeditionRun(detail)` (`game-session.js:1325-1339`) carries planet + candidate provenance but no plant;
  `trainingRun` (`:1343-1352`) the same; the run summary / report have no species field.
- **Art** — `resources/run-ui/plant-specimen.js:40` `const PACK = "organic-hybrid"`; one body plan and one component contract
  (`plant-compositor.js:91`); the selector names Organic Hybrid components (`plant-components.js`). Details in the body-plans document.
- **QA pins** — `destination-survey-check` S3 (recomputes habitable with `D.config`) and **S7 (First Bloom must be Favorable)**;
  `single-app-flow-check` S6 (thresholds and the `classFor` sweep); `colony-development-check.js:46` (reads `genomeBase`);
  `release-check` R78 / `visual-system-check` V7 PROTECTED byte-identity lists; `production-plant-integration-check:80`,
  `single-app-flow-check:302`, `game-flow-check:298` (the `organic-hybrid` pack); `plant-sprite-pipeline-check:32` (`FINAL_PACKS`);
  `tools/golden/first_bloom.json` (bit-exact engine).

### 1.3 How tolerances reach the places that show or prove them

| Consumer | How it obtains the starting tolerances today | After species |
|---|---|---|
| witness / strategies | the probe sim it builds (`bloom-witness.js:111`) | the same, with `{ species }` passed through |
| Adapt / Terraform previews | `sim.previewOf` snapshots the run's own sim (`bloom-sim.js:1001-1008`) | unchanged — the run's sim already has the species |
| room copy ("suits your plant X to Y"), `plantMin/Max` | `sim.derived()` | unchanged |
| survey class / dossier | `assessWorld` builds its own sim with `D.config` | `assessWorld(planet, deps, species)` |
| report | nothing species-specific | `summary.species = { id, name, physiologyVersion }` |
| specimen art | constant pack | `species.art` → body plan + pack |

---

## 2. Planet identity

### 2.1 The locked principle

> A WORLD SEED IDENTIFIES THE SAME PHYSICAL PLANET REGARDLESS OF SPECIES.

Pipeline:

```
(archetype, public seed)
  → PHYSICAL WORLD CONSTRUCTION      species-free: generator attempts + physical-world validation (WORLD_GEN_VERSION)
  → the physical planet              one object; its planetFingerprint is the identity
  → SPECIES EVALUATION               assessWorld(planet, species): habitable share, class, limits, dossier
  → SPECIES PLAYABILITY VALIDATION   S-layers (§6): foothold, winnability with this physiology, optional diversity
  → offer the candidate for this species, or reject it FOR THIS SPECIES and keep searching
```

The physical planet is never mutated, re-rolled or regenerated to suit a species.

### 2.2 Where world construction is entangled with the plant today

`generateFromArchetype` (`resources/bloom-archetype.js:87-145`) loops over attempts `k = 0 … maxAttempts − 1`; attempt `k`'s raw planet
is `generatePlanet(FNV("<id>|<seed>|<k>"))` (`attemptPlanet`, `:76-85`) — purely physical. The **first accepted k becomes the world**, and
acceptance reads the plant in three places:

| Check | Line | Reads the plant through |
|---|---|---|
| `geography.minOriginFitness` (Desert, Frozen: 0.72) — the origin is a genuine refuge | `:105-109` | `createSim(planet, config, …).evaluate(ORIGIN)` |
| `geography.minRefuges` (Frozen: 2) — other green regions at landing | `:110-114` | the same, every section |
| layers 4–8 (winnability witness, strategy diversity, pacing) and `requiredConditions` | `:116-129` | `validatePlanet(…, { winnability: true, strategies })` → `findWitness` / `findStrategies` → `createSim` |

So the planet a seed produces depends on the plant baseline: **if the selected species' physiology were fed to this loop, the same
(archetype, seed) would often produce a different planet.** The study measured this (SPECIES_STUDY §6): with a specialist's
physiology in the loop, **43–59 % of seeds** (38–78 % per archetype) would become a different planet.

Two smaller couplings are *not* species entanglement and stay as they are:

- `bloom-gen.js:260-269` chooses the origin by a climate score with archetype knobs (`originTemp`, `originMoistureOffset`) that were
  tuned for a temperate plant. These are archetype design data, constant for every species: physical, not species-relative.
- `predictClass` (`survey-data.js:87-91`) builds a structural world (`winnability: false`), whose accepted attempt can differ from the
  validated world's. It is a prediction only and never shown (unchanged by this design; see §5.6 for its species input).

### 2.3 Decision (recommended): the reference physiology

- Introduce `config.referencePlant` — a frozen block **numerically identical** to today's `genomeBase` — and
  `WORLD_GEN_VERSION = 1`. *Implementation note:* the narrowest edit keeps the key `genomeBase` and only renames its *meaning* in
  comments and docs; a new key is cleaner. Either way the generator reads it through an explicit `{ physiology: REFERENCE }` passed to
  its probe sims — never the selected species.
- World construction (`generateFromArchetype`, its probes, its layers 4–8 and `requiredConditions`) always uses the reference
  physiology. Its meaning becomes: *"a structurally coherent world of this archetype, of the intended character, that a reference
  organism can win"* — a property of the world, computed from constants.
- Organic Hybrid's species physiology equals the reference physiology. A QA check pins that equality, so a future Organic Hybrid
  rebalance cannot silently change every planet: retuning Organic Hybrid changes `organic_hybrid.physiology` and its version, and the
  reference stays. Changing the reference is a deliberate `WORLD_GEN_VERSION` bump (all world seeds change; goldens regenerated).

Why not make construction purely physical (replace the plant-based acceptance checks by physical proxies)? It is the cleaner end state
but changes the planet of **every** existing (archetype, seed), loses the archetype identity guarantees that were tuned against the
plant (Desert's dry problem, Frozen's refuges), and forces a full rebaseline of archetype / desert / frozen / strategy checks. Nothing
in the species design needs it. Recorded as an option for a later `WORLD_GEN_VERSION 2`.

### 2.4 Identity rules (QA-enforceable)

1. For every species S and every (archetype, seed): `fingerprint(world(archetype, seed))` is identical. (The physical cache key never
   contains a species id.)
2. The survey's selected `detail.planet` is the run's planet object (BLOOM-033 identity rule, unchanged) and the run's species is the
   species the candidate was classified and validated for.
3. Play Again replays the same planet object **and** the same species object.

---

## 3. Species data model

### 3.1 Schema (`content/species.js`, classic script like every content file)

```js
D.species = [
  {
    id: "organic_hybrid",                 // stable id; part of cache keys, reports and any future save
    version: 1,                           // bump on any physiology change (human-readable); the physiology hash is checked too
    name: "Organic Hybrid",
    role: "generalist",                   // generalist | dry-heat | cold | wet  (presentation + QA grouping only)
    short: "A balanced generalist: no ground is easy, little ground is closed.",

    // STARTING PHYSIOLOGY — exactly the keys of the reference physiology, nothing else
    physiology: { tempFloor: -6, tempCeil: 24, waterPos: 50, waterTol: 18, saltTol: 15, radTol: 30, toxTol: 25 },

    // reserved, must be absent / null for an Expedition species in v1 (validated):
    edges: null,                          // per-species category softness { tempSoft, waterSoft } — see §3.3
    startingGenome: null,                 // owned mutations at landing — Challenges only (036), never an Expedition species

    art: { bodyPlan: "oh-stem@1", pack: "organic-hybrid" },
    presentation: {
      icon: "species-generalist",
      strengths: [{ category: "Temperature", text: "…" }, …],   // 1–3, each tied to a real category
      weaknesses: [{ category: "Water", text: "…" }, …],        // ≥ 1
      dossier: { habit: "…", reproduction: "…", science: "…" }, // plain copy; science = the real-plant analogy (bible §17)
      specimen: { traits: {}, condition: "thriving" },          // the selection-screen specimen (a fully grown, unmutated plant)
    },
  },
  …
];
```

Derived at load (`BLOOM.species`, a new classic script beside `bloom-sim.js`):

- `physiologyVersion = id + "@" + version + "#" + fnv(JSON(physiology))` — the cache / provenance key;
- `resolveSpecies(id)` → a frozen object `{ id, version, physiologyVersion, physiology, art, … }`; unknown id **throws** (never a silent
  fallback);
- `checkSpecies(def, config, traits)` → errors (§10.1).

### 3.2 What is in the physiology — and what is not

**In:** the seven keys the engine actually uses as the starting window (`tempFloor`, `tempCeil`, `waterPos`, `waterTol`, `saltTol`,
`radTol`, `toxTol`). These interact with every existing system without new mechanics: lamps, limits, words, Adapt previews, the
witness, the survey.

**Not in (v1):**

- **Trait scales** (`config.scales`): Adapt behaves identically for every species — one Cold point is 12 °C for everyone. A species
  differs in where it starts, not in how evolution works. (Keeps every Adapt price, preview and witness enumeration valid.)
- **pH window, nutrients, light**: global category physics (`config.categories.Soil / light`). No candidate role needs them.
- **Growth / economy modifiers** (establishment, spread, biomass, reproduction, density). Not recommended for v1: the study shows the
  physiology alone produces distinct homes and weaknesses; growth multipliers would stack invisibly on top of habitability and make
  "who is better" a hidden-number question. The schema reserves no slot for them; adding one later is an explicit decision with its
  own study.

### 3.3 Softness (`edges`) — measured, not recommended

The study tested a dry specialist with sharper edges (Temperature soft 10 → 7, Water soft 12 → 8). It changes the numbers only
slightly (0.01–0.02 worse everywhere, SPECIES_STUDY §5.5) and would make the species' lamps disagree with the category words every player learns from the
generalist. Recommendation: keep softness global in v1; the field stays reserved and validated as null.

### 3.4 The four species (recommended physiology, study set A–D)

| | Temp window | Water window | Salt | Radiation | Toxicity | Identity |
|---|---|---|---|---|---|---|
| **A · Organic Hybrid** (generalist) | −6 … 24 °C | 32 … 68 | 15 | 30 | 25 | today's plant, unchanged |
| **B · dry / heat** | 2 … 34 °C | 18 … 50 | 15 | 35 | 25 | strengths heat + dry ground; weaknesses cold + wet ground |
| **C · cold** (+ radiation) | −14 … 16 °C | 28 … 64 | 15 | 50 | 25 | strength cold; weakness heat; radiation is a *latent* strength (§3.5) |
| **D · wet / flood** (+ salt) | −6 … 24 °C | 42 … 82 | 60 | 30 | 25 | strengths wet ground + coastal salt; weakness dry ground |

Windows are about as wide as Organic Hybrid's (temperature 30–32 °C vs 30; water 32–40 vs 36), so no specialist is "Organic Hybrid
plus extras". C is the study's re-tuned `cold_v2`: the first calibration (−20 … 12 °C) trivialized Frozen worlds (SPECIES_STUDY §5.4).
Exact numbers are study values, not locked; the PMO / owner tune them in 035B with the study tool.

### 3.5 Finding: radiation does not pair naturally with cold in today's worlds

The generator puts strong radiation (≥ 40) only on ground whose sky-driven temperature exceeds 26 °C (`bloom-gen.js:245-257`:
`radiation = (sunHot ? 40 : 10) + rng·25`), and a cold specialist cannot live there. Measured: removing the cold specialist's
radiation strength changes its landing share by ≤ 0.01 on every archetype (SPECIES_STUDY §5.5). Radiation tolerance only pays after
the plant buys Heat Tolerance, or under Dying World's rising radiation (a Challenge ingredient). Options for the PMO:

1. keep **cold + radiation** as the role (PMO's current candidate) and present radiation honestly as "thrives under harsh sun once
   it can bear the heat" — a latent strength with Challenge relevance;
2. **cold + dry-hardy** (physiological drought: alpine and tundra plants survive frozen, unavailable water) — measured as the
   alternative C‴; it gives a small real landing advantage on Frozen uplands and Desert margins;
3. leave the role as cold-only with a single, larger strength.

Recommendation: option 1 for 035B (it keeps the PMO's role and the Challenge hook), with the copy rule above; option 2 retained.

---

## 4. The species entry point and the four separations

### 4.1 The seam

```js
const sp = BLOOM.species.resolve("dry_heat");                      // frozen; throws on an unknown id
const sim = BLOOM.createSim(planet, config, traits, { rng, scenario, species: sp });
```

Inside `createSim` (`bloom-sim.js:335`):

```js
const PB = (opts.species && opts.species.physiology) || C.referencePlant /* = genomeBase */;   // the PLAYER's starting physiology
function derived() {               // (:387) identical arithmetic, base read from PB instead of C.genomeBase
  const s = C.scales, b = PB; …
}
sim.species = opts.species ? { id, version, physiologyVersion } : null;   // provenance; read by UI / report
```

- No `species` → `PB` is the reference physiology → the engine is bit-identical to today (golden unchanged).
- `organic_hybrid` → the same numbers → the same bits (QA: run fingerprints equal with and without it).
- `config` is never copied or edited. `BLOOM.play.deriveConfig` remains Training's tool for **economy** overrides and must refuse
  `genomeBase` / `referencePlant` overrides (a species is never expressed as a derived config).

### 4.2 Separation table

| Concern | Lives in | Read by | Species-dependent? |
|---|---|---|---|
| **Player species physiology** | `opts.species.physiology` | `derived()` only | yes |
| **Purchased adaptations** | `sim.genome` (+ `config.scales`) | `derived()`, previews, witness enumeration | no (same rules for all species) |
| **Environment** | planet data, `sim.sky`, Terraform `tf`, scenario offsets, climate shocks | `rawFactors()` | no |
| **Native competitor physiology** | `nativeProfile()` from `config.referencePlant` + the planet + `scenario.competition.tolerance` | `nativeEvaluate()` | **no — explicitly** |

Native Competition must not inherit the player's species. Today `nativeProfile` (`bloom-sim.js:530`) reads `C.genomeBase`; after
035B it reads the reference physiology explicitly (`const b = C.referencePlant`), so the native is the same organism on the same planet
for every player species. QA: the native profile, the native's tile state after N ticks with a fixed plan, and `holdsAgainstNatives` on
the reference build are identical across all four species.

### 4.3 Who resolves a species

| Context | Species | How |
|---|---|---|
| **Expedition** | the player's choice on the Species screen | `detail.species` from the survey → `expeditionRun(detail)` → `BLOOM_RUN.species` → `createSim` |
| **Training** | always `organic_hybrid` | `content/training.js` gains `speciesId: "organic_hybrid"`; `trainingRun` resolves it. The guided lessons are written against Organic Hybrid's limits (e.g. its Cold lesson) and must not change with a menu choice. |
| **Authored worlds** (First Bloom, Training Grounds) | whatever the context resolves | an authored planet has no species; it is evaluated per species like any world (§5.7). It may carry an optional `display.recommendedSpecies` note only. |
| **Challenges** (036) | prescribed by the challenge | `challenge.species` (id) and optional `challenge.physiologyOverrides` → `BLOOM.species.resolve(id, { overrides })` → a NEW frozen species object with its own `physiologyVersion` (`…#<hash>`); the shared definition is never edited |
| **Developer URL** | `demos/demo-run.html?…&species=<id>` | default `organic_hybrid` when absent; an unknown id is the existing badLink failure ("That planet or scenario is not available" gains "or species") — never a silent fallback |
| **Play Again** | the run's own species object | the same object, like the planet |
| **Choose another planet** | the run's species | back to the survey for the same species |

### 4.4 Reports and provenance

- `summary.species = { id, name, physiologyVersion }`; the report header names the species beside the planet; the expedition record
  `{ …, speciesId, physiologyVersion }`.
- `planetFingerprint` stays species-free (it identifies the planet). A run identity is `(planetFingerprint, physiologyVersion,
  scenario id)`.

---

## 5. Survey consequences

### 5.1 Answers

| Question | Answer |
|---|---|
| Is Favorable / Precarious / Extreme computed with the selected species' starting physiology? | **Yes.** `classFor(assessWorld(planet, species).habitable)`. |
| Does the same planet move between classes for different species? | **Yes**, routinely: the four species agree on a world's class on only 2 % (Ocean), 16 % (Desert) and 9 % (Frozen) of worlds. |
| Does the same world seed still describe identical physical planet data? | **Yes** (§2). |
| Do the thresholds change per species? | **No.** 35 % / 20 % stay global: a class means "how much of this world your species can already live on". |

### 5.2 Two caches

```
PHYSICAL CANDIDATE   key  `${archetypeId}:${seed}@w${WORLD_GEN_VERSION}`          species-free, expensive (~0.6–2.6 s)
                     value  stripped planet + physical validation record (layers 1–8 for the reference plant) + fingerprint
                     (null = no world for this seed)

SPECIES EVALUATION   key  `${physicalKey}|${physiologyVersion}`                    cheap assess (~ms) + S-layers (~0.3–2 s)
                     value  { habitable, classId, assessment, dossier, playability verdict }

SECTOR               key  `${sectorSeed}|${physiologyVersion}${firstBloom ? "|fb" : ""}`
                     value  the assembled 3 × 3 for that species
```

The physical cache is shared across species and across sectors (a world drawn in two sectors validates once). Both caches live in the
page session (the `SectorPool`), never in storage; the worker returns plain data, so a worker-side LRU is optional.

### 5.3 Filling the 3 × 3 for a species

- The **draw stream** per (sector seed, column) is unchanged and species-free (`mulberry32((sectorSeed ^ 0x5eed0028) + column ·
  0x9e3779b1)`).
- **Prediction** becomes species-relative: `predictClass(archetypeId, seed, deps, species)` assesses the cheap structural world with the
  species' physiology.
- A draw predicted for the column is turned into a physical candidate (cache) → species evaluation (cache) → accepted iff its real
  class is the column's **and** it passes the species S-layers. Rejections are counted (`wasted`, `failed`, new `speciesRejected`).
- Columns still never borrow another class (028B owner rule) and are still bounded by `MAX_DRAWS = 400`. Measured column-fill cost per
  species is in SPECIES_STUDY §4.8 / §5.6: every species fills every column inside the budget; the rarest (species, class) pairs need
  ≈ 17 draws per column against 8–10 today (e.g. a Favorable world for the wet specialist from the Desert share of the stream never happens; it
  fills from Ocean draws instead).
- Parallel path (`planColumn` → `validate` tasks → `columnFromValidated`) takes the species in every message:
  `{ type: "plan", sectorSeed, column, firstBloom, fromDraw, want, speciesId }`, `{ type: "validate", archetypeId, seed, speciesId }`.
  Workers resolve the id themselves (`BLOOM.species.resolve`), so no object crosses the boundary. A worker's physical candidate may be
  returned with `speciesEval` attached; the page merges both caches.

### 5.4 Back out and switch species

- The sector **seed** survives the switch (the player is looking at the same part of space through different eyes); the sector
  **content** is rebuilt for the new species from the two caches, so worlds already validated physically cost only their species
  evaluation.
- The previous species' sector stays cached for the session (switching back is instant).
- SCAN NEW SECTOR walks the same `nextSectorSeed` chain for every species.

### 5.5 Prefetch

The title cannot know the species. Recommended:

1. the title prefetches the sector for the **last species chosen this session** (initially `organic_hybrid`) — exactly today's cost;
2. on the Species screen, focusing a card for ≥ 400 ms starts that species' sector on the shared pool (lowest priority, cancellable);
3. the physical cache makes the second and later species much cheaper (the dominant cost is shared).

Prefetching all four species up front is ≈ 4× the worker load during the title and is not recommended.

### 5.6 What is cached / reused / invalidated

| Change | Physical cache | Species evaluations | Sectors |
|---|---|---|---|
| switch species | kept | kept (per physiologyVersion) | other species' kept |
| a species physiology retune (version bump) | kept | that species' entries unreachable (new key) | that species' unreachable |
| `WORLD_GEN_VERSION` bump | all new keys | all new | all new |
| reload | gone (no storage) | gone | gone |

### 5.7 First Bloom (Organic Hybrid share 0.3529 vs the 0.35 threshold)

- First Bloom is authored; it has no physical validation to share and is evaluated per species like any world. Measured landing shares
  (study §4.7): Organic Hybrid **0.353** (Favorable by 0.003), dry/heat **0.131** (Extreme), cold **0.353**, wet/flood **0.353** — three
  of the four species sit on the same knife-edge (First Bloom's meadows lie inside all three windows). Training Grounds is Favorable for
  every species (0.36–0.60).
- With `firstBloom: true` it is placed at the top of **its class column for the selected species** (unchanged rule: never a borrowed
  column). For the dry/heat species it appears in Extreme — truthful: First Bloom is a temperate meadow world.
- **035A does not fix the near-threshold value.** It is recorded as a known boundary case.
- Tests must not become brittle:
  - the class of an authored world is asserted from a **fixture table keyed by `physiologyVersion`**
    (`{ "organic_hybrid@1#…": "favorable", … }`), never a hard-coded "First Bloom is Favorable";
  - a separate **boundary check** reports every (authored world, species) pair within ±0.01 of a threshold and fails only when a
    physiology or world change *moves a pair across* a threshold without the fixture being updated in the same commit;
  - tests that only need "an authored world in a known column" pick the column from the fixture, not from the number.

### 5.8 Dossier

- `assessWorld` and `surveyDossier` take the species: lamps, limits, words ("too dry for your species"), "Solar exposure" against the
  species' `radTol` (replacing `C.genomeBase.radTol` at `survey-data.js:261`).
- Rows describing physical facts (climate range, water, soil composition, sky) are species-free and identical across species; rows
  describing what limits the plant are species-relative. The dossier gains a small "for <species>" kicker on the habitable bar.

---

## 6. Validation and witness implications

### 6.1 Layers that assume Organic Hybrid / `config.genomeBase`

| Layer | Today | After 035B |
|---|---|---|
| 1 structure · 2 origin · 3 reachability · denominator · determinism | plant-free (layer 3 reads the trait catalogue only) | unchanged — PHYSICAL |
| archetype `minOriginFitness`, `minRefuges` | baseline plant | **reference** physiology — PHYSICAL (world construction) |
| 4–6 winnability witness | baseline plant | **reference** for world construction; **species** in the S-layers |
| 7 strategy diversity · 8 pacing | baseline plant | **reference** for world construction; optional for species (§6.3) |
| `requiredConditions` (archetype identity) | baseline plant | **reference** only (an archetype's identity is a world property) |
| P scenario validation | baseline plant | species (Challenges prescribe the species) |

### 6.2 Species as an explicit input

- `findWitness(planet, config, traits, { species, … })`, `findStrategies(…, { species })`, `strategyOf`, `strategyClasses`,
  `simulate(…)`: pass `species` to every `createSim` they make (`bloom-witness.js:111`, `:350`).
- `validatePlanet(planet, config, { traits, winnability, strategies, species })`: only layers 4–8 use it.
- `generateFromArchetype` **refuses** a `species` option (its probes pass `physiology: REFERENCE` explicitly), so no caller can
  entangle world construction by accident.
- `validateScenario(planet, config, traits, S, { species })` for layer P.

### 6.3 The species playability layers (new, `BLOOM.species.validateFor`)

```
S1 FOOTHOLD     the land growable (fitness > growThresh) AND reachable from the origin at landing ≥ speciesPolicy.minFoothold
                (witness `early.reachableShare`; proposed 0.05)                                         — cheap
S2 WINNABLE     findWitness(planet, config, traits, { species }) passes (layers 4–6 for this physiology) — ~0.3 s
S3 DIVERSE      (policy, optional) findStrategies with minStrategies (the archetype's, or 1)            — ~0.5–2.3 s
S4 PACED        (policy, optional) the archetype's pacing bands for the species' strategies             — inside S3
```

Recommendation for 035B: **S1 + S2 required, S3 / S4 recorded but not required.** Measured (SPECIES_STUDY §4.5): S3 at the
archetype's own `minStrategies: 2` would reject 30 % of Ocean worlds for the wet specialist and 21 % of Desert worlds for the dry
specialist — their *home* worlds, where a specialist legitimately has fewer distinct answers — and S4 (pacing) would reject most home
worlds because a specialist is supposed to be faster there. S2 never rejected a sampled world (100 % winnable for every physiology), so
it is a guarantee, not a filter. The archetype's `requiredConditions` are **not** applied to species: a dry specialist winning a Desert without Drought
Adaptation is the point of choosing it (the study measures how often; §5 "trivialization").

A species rejection never re-rolls the world: the candidate is rejected **for that species**, the column keeps drawing.

### 6.4 Cost and caching

Per survey candidate today: physical validation ≈ 0.6–2.6 s. Added per species: assess ≈ 1–3 ms, S1 ≈ free (computed inside the witness
`prepare`), S2 ≈ 0.25–0.3 s (measured). For Organic Hybrid the S-layers are already proven by the physical layers (same physiology): the
verdict is reused, cost zero. For a specialist, a sector needs 28–33 draws against ≈ 27 today
(+3 … +22 %) plus one S2 witness per offered cell: expect a specialist's first sector ≈ 20–50 % slower than today's, later species
cheaper through the shared physical cache. The worker pool and the physical cache absorb it; no new caching beyond §5.2 is needed.

---

## 7. Species Selection UX (design only)

### 7.1 Flow

```
TITLE ─ EXPEDITION ─▶ CHOOSE PLANT SPECIES ─▶ DESTINATION SURVEY (for that species) ─▶ focus ─▶ Begin Expedition
          ▲                │ Back                        │ "Species: Cinder Rosette · Change"
          └────────────────┘                             └──▶ back to CHOOSE PLANT SPECIES (survey seed kept)
```

TRAINING never shows the species screen. A first-run player (no Training completed) gets Organic Hybrid pre-focused; nothing is locked.

### 7.2 Layout (BLOOM-034 NIGHT planning language)

- Kicker "EXPEDITION", title **Choose your plant**, one line: "Each species starts with a different body. The worlds you are offered
  next are judged by what *this* plant can live on."
- **Four cards in one row** (≥ 1024 px wide), each a `--bloom-night-card` with the irregular `--bloom-r-lg` corners:
  - the **specimen**: the species' real sprite system, a fully grown unmutated plant on its 84 × 98 canvas at the largest whole-number
    scale that fits (×3 at 1440 × 900, ×2 at 1024 × 768), pixelated, on the pack's own specimen-box backdrop;
  - the **name** and the **role line** ("Balanced generalist", "Heat- and drought-hardy", "Cold-hardy", "Wet- and salt-hardy");
  - **two strength chips** and **one or two weakness chips** in the gameplay status-pill form (category icon disc + word), using the
    category identity colours (`--bloom-cat-*-night`) — e.g. ▲ Temperature "Hot ground", ▲ Water "Dry ground", ▼ Temperature "Cold
    ground".
- **Physiology at a glance** (inside the focused dossier, not on every card): two horizontal range bars on fixed, labelled axes —
  temperature (−45 … +45 °C) and moisture (0 … 100) — with the species' window solid and Organic Hybrid's window as a faint outline for
  comparison; salt / radiation as two small "tolerates up to" ticks. No numbers beside the bars unless hovered / focused (then the
  exact window in °C / moisture units, matching the room copy "suits your plant X to Y").
- **Focused dossier** (click / Enter on a card): the card scales up, the others recede, a dossier panel opens beside it in the survey's
  dossier language (two-part rows from BLOOM-034: descriptor | secondary facts): Habit · Water strategy · Temperature · Soil · Hazard ·
  Reproduction · the real-plant analogy. Primary button **Survey for <name>** (`--bloom-leaf-btn-night`, ≥ 4.5 : 1), secondary Back.
- Not shown before a planet is seen: per-archetype performance, win rates, "best on Desert" labels, stars, difficulty words, numbers of
  habitable land. The player learns which worlds suit the plant from the survey that follows — that is the decision.
- Not an RPG difficulty ladder: no "Easy / Hard", no locked species, no ordering by power; cards are ordered by role (generalist first,
  then the three specialists in a fixed order). Organic Hybrid carries "A good first expedition" only for a player with no completed
  expedition, as a quiet note, not a badge.

Wireframe (1440 × 900, nothing focused):

```
 EXPEDITION
 Choose your plant                                                         [ ← Back ]
 Each species starts with a different body. The worlds you are offered next are judged by what this plant can live on.

 ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
 │   [specimen]  │  │   [specimen]  │  │   [specimen]  │  │   [specimen]  │
 │    84×98 ×3   │  │    84×98 ×3   │  │    84×98 ×3   │  │    84×98 ×3   │
 │ Organic Hybrid│  │ Cinder Rosette│  │ Woolly Candle │  │  Reed Spire   │
 │ Balanced      │  │ Heat- and     │  │ Cold-hardy    │  │ Wet- and      │
 │ generalist    │  │ drought-hardy │  │               │  │ salt-hardy    │
 │ ▲ no closed   │  │ ▲ hot ground  │  │ ▲ cold ground │  │ ▲ wet ground  │
 │   ground      │  │ ▲ dry ground  │  │ ▲ harsh sun*  │  │ ▲ salt coasts │
 │ ▼ no home     │  │ ▼ cold ▼ wet  │  │ ▼ hot ground  │  │ ▼ dry ground  │
 └───────────────┘  └───────────────┘  └───────────────┘  └───────────────┘
   (role order, never power order; * latent: once it bears the heat)
```

Focused (card scales, dossier opens to its right, others recede): range bars for temperature and moisture with Organic Hybrid's window
as a faint outline, two-part dossier rows, **Survey for Cinder Rosette** primary and Back.

### 7.3 Keyboard and focus

- Cards are a roving-tabindex radio group (`role="radiogroup"`, each `role="radio"` with `aria-checked`): ← / → (and ↑ / ↓ on the phone
  layout) move, Home / End jump, Enter / Space opens the focused dossier, Esc closes it (then Esc again = Back to the title).
- In the dossier: focus moves to its heading; Tab order heading → rows → Survey for … → Back; Esc returns focus to the card.
- Focus ring `--bloom-focus-night` (≥ 7.9 : 1). Reduced motion: no scale animation, an instant swap.
- The survey's header shows the chosen species as a chip with a **Change** button (keyboard reachable before the matrix).

### 7.4 Mobile (390 × 844)

- A vertical list of compact cards: specimen ×2 left (168 × 196), name / role / chips right; the list scrolls.
- The dossier is a bottom sheet (75 % height) with the specimen at ×2, the bars stacked, the primary button pinned at the bottom
  (always visible — same rule as BLOOM-034's Begin expedition).

### 7.5 States

- The specimen renders synchronously from the generated atlas (no network), so the screen never waits for art.
- While the chosen species' first sector is still validating, the survey shows its existing progress state; nothing on the species
  screen blocks.

---

## 8. Migration sequence (recommended BLOOM-035B slices)

Each slice is independently reviewable and keeps the full regression green; every slice keeps Organic Hybrid bit-identical.

| Slice | Content | Proves |
|---|---|---|
| **035B-1 · Species core** | `content/species.js` (4 entries, specialists flagged `status: "candidate"`), `resources/bloom-species.js` (`resolve`, `checkSpecies`, versions), the `createSim(…, { species })` seam, native profile reads the reference physiology explicitly, `deriveConfig` refuses physiology keys, run summary provenance | golden unchanged; OH ≡ no species; native identical across species; species-check (Node) |
| **035B-2 · Validation input** | witness / strategies / validatePlanet / validateScenario take `species`; `generateFromArchetype` refuses it; `BLOOM.species.validateFor` (S1–S4); the study tool promoted to `tools/research/species-study.js` | world fingerprints identical across species; S-layer verdicts deterministic; reference worlds unchanged |
| **035B-3 · Species-relative survey** | `assessWorld` / `predictClass` / `makeCandidate` split into physical + species evaluation; caches; worker messages with `speciesId`; `SectorPool` keys; First Bloom fixture table + boundary check; dossier wording | the destination-survey / single-app-flow / main-menu / portable checks extended per species; identity through survey → run |
| **035B-4 · Run plumbing** | `expeditionRun(detail)` species, GameSession, Play Again, Choose another planet, report header, dev URL `&species=`, Training fixed to OH | Play Again species identity; Training unchanged; badLink on unknown species |
| **035B-5 · Body-plan layer** | body-plan manifest v3, per-plan contract + grammar, compositor multi-plan, OH migrated byte-identically, specimen takes the species, proof body plans + proof packs for the three new plans | 17 782-placement clip proof identical for OH; every plan's coverage; proof packs render every legal model |
| **035B-6 · Species Selection** | the screen (§7) with the proof packs behind a development flag (`&species=1` or Settings → Developer), Chromium + Firefox, file://, /bloom/ | flow, keyboard, phone, contrast |
| **Species art production** | three real packs, PMO acceptance per pack, then the flag is removed | per-pack intake checks |

Recommended release rule: species mechanics may land on `main` behind the flag from 035B-1; the player-facing Species screen is
switched on only when the three real packs are accepted, so the game never shows proof art as a species.

---

## 9. Persistence and future save implications

Runs are not saved today (reload → title). Any future save / share code must carry, at minimum:

`{ WORLD_GEN_VERSION, archetypeId, seed, attempt, planetFingerprint, speciesId, physiologyVersion, scenarioId, genome, sky, … }`

and refuse to resume when `physiologyVersion` no longer resolves (a species retune) rather than silently loading the new numbers.
Authored-world saves carry the authored planet id plus the same species fields.

---

## 10. QA plan (for 035B)

### 10.1 New suites

| Suite | Scope |
|---|---|
| `tools/species-check.js` (Node) | schema (`checkSpecies`: exact keys, numeric, `tempFloor < tempCeil`, water window inside 0…100, ids unique, versions present, `edges` / `startingGenome` null, art plan + pack exist and are compatible, strengths 1–3 / weaknesses ≥ 1 with real categories); OH physiology ≡ reference; `resolve` throws on unknown ids; physiologyVersion stable; **same world seed = same physical planet across all species** (fingerprints over a fixed sample of every archetype); OH run ≡ no-species run (fingerprint of 3 000 ticks with a fixed plan); native profile / native state identical across species (competition scenario); species-specific classification on a fixed fixture list (the study fixtures); S-layer verdicts deterministic; Training resolves OH whatever was chosen |
| `tools/species-selection-check.js` (browser) | the Species screen in Chromium + Firefox at 390 × 844, 1024 × 768, 1440 × 900, 2560 × 1440: four specimens rendered from the real sprite system (per-pack pixel signatures), keyboard (radiogroup, Esc chain), focus visibility, contrast ≥ 4.5 : 1 of every word / button, Back / Change flows, the phone bottom sheet keeps the primary button visible; file:// (portable) and `/bloom/` (Pages) |
| `tools/research/species-study.js` | the 035A study as a deterministic research tool (not a gate): `--sample N`, `--species`, writes a JSON + Markdown table; its fixtures (`tools/fixtures/species-study-v1.json`: seeds, fingerprints, expected classes per physiologyVersion) back the Node checks |

### 10.2 Existing suites to extend

| Suite | Extension |
|---|---|
| `sim-check` | `species: organic_hybrid` reproduces the golden; a specialist run is deterministic (own golden fixture) |
| `native-competition-check` | the native is identical across the four species (profile, run fingerprint) |
| `destination-survey-check` | S1–S11 per species (sector seeds `[1, 77]` × four species); S3 recomputes habitable with the species; **S7 becomes the fixture-table check**; new S12: one physical world classifies differently across species while its fingerprint is identical; new S13: cache keys (physical shared, evaluation per physiologyVersion) |
| `single-app-flow-check` | EXPEDITION → species → survey → run → report shows the species; Play Again keeps planet + species; Choose another planet returns to the same species' survey; S6 `classFor` sweep unchanged (thresholds global) |
| `main-menu-check` | M5 pool sector = `buildSector(seed, species)`; M7e worker message shapes with `speciesId` |
| `portable-runtime-check` | the species content + module in the bundle; the Species screen over file:// |
| `release-check` / `visual-system-check` | PROTECTED lists re-baselined at the 035B base; `content/species.js` added |
| `game-flow-check`, `production-plant-integration-check`, `single-app-flow-check:302` | the pack is the run species' pack (four packs once art lands; OH-only before) |
| `plant-sprite-pipeline-check` | per body plan: contract coverage, socket clip proof, grammar coverage of every legal model; `FINAL_PACKS` per plan |
| `training-check`, `guided-training-check` | Training is OH regardless of the last chosen species |
| `colony-development-check:46` | reads the reference physiology explicitly |
| `topology-check`, `cylinder-gen-check`, `gen-check`, `archetype-check`, `desert-check`, `frozen-check`, `strategy-check` | unchanged (world construction unchanged) — they become the proof that world identity held |

### 10.3 Matrix

| Area | Chromium | Firefox | file:// | /bloom/ | Node |
|---|---|---|---|---|---|
| species definitions / versions | | | | | ✔ |
| same seed = same planet × 4 species | | | | | ✔ |
| species-relative class + dossier | ✔ | ✔ | ✔ | | ✔ |
| S-layers | | | | | ✔ |
| native separation | | | | | ✔ |
| survey → run planet + species identity | ✔ | ✔ | ✔ | ✔ | |
| Play Again / Choose another planet | ✔ | ✔ | | | |
| Training / authored worlds | ✔ | ✔ | | | ✔ |
| four specimens (body plans + packs) | ✔ | ✔ | ✔ | ✔ | ✔ (pixels) |
| Species screen UX (4 viewports, keyboard, contrast) | ✔ | ✔ | ✔ | ✔ | |
| deterministic study fixtures | | | | | ✔ |

---

## 11. Risks

| Risk | Mitigation |
|---|---|
| Someone "simplifies" by making species a derived config → natives move with the species, world construction gets entangled | `deriveConfig` refuses physiology keys; `generateFromArchetype` refuses `species`; species-check pins both |
| An OH retune silently changes every planet | reference physiology is separate and pinned; OH ≡ reference checked; a mismatch is a deliberate WORLD_GEN_VERSION decision |
| A specialist trivializes its home archetype | measured (study §5); thresholds and windows tuned with the study tool; Desert / Frozen remain hard for the *other* three |
| A specialist is trapped on off-archetype worlds | S1 + S2 never offer a world the species cannot win; the study reports foothold failures per pair |
| Survey cost for rare (species, class) pairs | physical cache shared; measured draws per column inside MAX_DRAWS; prefetch by last species |
| First Bloom flips class on a tiny retune | fixture table by physiologyVersion + boundary check; not "fixed" in 035A |
| Art: three new body plans balloon the compositor | narrow body-plan layer (one skeleton generalization: multiple axes + rosette / sprite-body axes), no skeletal animation |
| Species screen reads as a difficulty choice | no power ordering, no stars / difficulty words, strengths always paired with weaknesses |

## 12. Design choices (RESOLVED by the PMO, 2026-10-10 — see §0.1)

1. Reference physiology as a **new key** (`config.referencePlant`) or keep the `genomeBase` key with a new meaning (§2.3). → **new key**.
2. Cold role: **cold + radiation** (recommended, latent strength) vs **cold + dry-hardy** (§3.5). → **cold specialist, radiation latent**.
3. S3 strategy diversity for species: recorded only (recommended) or required at `minStrategies: 1` / the archetype's own count. → **recorded only** (S3 / S4).
4. Whether Organic Hybrid keeps the "good first expedition" note. → **kept** ("Recommended first expedition"; never "Easy").
5. Exact physiology numbers (study values are a calibrated starting point, not final). → **the §0.1 table** for 035B v1.
6. Whether species mechanics land on `main` behind a flag before the art (recommended) or wait for the art. → **behind `?species=1`**.
7. Whether a Challenge may change the *reference* physiology (recommended: never — a Challenge changes the species, the world recipe,
   or both, never the reference). → **never**.
