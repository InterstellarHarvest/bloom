# Strange Bloom · Unknown Soils — Challenges system v1

**BLOOM-036A — Challenges foundation + first playable hub** (PMO: ACCEPTED FOUNDATION, not integrated alone) **+ BLOOM-036B — contained
Challenge launch: ONE generated qualifying planet** (CANDIDATE). Review branch `handoff/bloom-036b-review` (it contains 036A + 036B); not in
production `main` until the PMO integrates the combined candidate. Current product direction: [`PRODUCT_DIRECTION_CURRENT.md`](PRODUCT_DIRECTION_CURRENT.md) §8.

Code: [`content/challenges.js`](../content/challenges.js) (the definitions) · [`resources/bloom-challenges.js`](../resources/bloom-challenges.js)
(`BLOOM.challenges`: validation, resolution, freezing, QA fixtures) · [`resources/challenges/`](../resources/challenges/) — the hub
(`challenge-hub.js`), the one-planet selection rule (`challenge-world.js`, pure), its browser search (`challenge-world-search.js`) and the
PREPARING / dossier screen (`challenge-world-screen.js`) · the survey worker's `challenge-*` tasks
([`survey-worker.js`](../resources/destination-survey/survey-worker.js)) · the engine's prescribed starting state
([`bloom-sim.js`](../resources/bloom-sim.js) `createSim(…, { startingState })`, threaded through the witness / layer P / S2) · the flow in
[`expedition-entry.js`](../resources/main-menu/expedition-entry.js) and [`app-controller.js`](../resources/app/app-controller.js) · the run
([`game-session.js`](../resources/run/game-session.js) `BLOOM.gameSession.challengeRun`). QA: [`tools/challenges-check.js`](../tools/challenges-check.js)
(data layer + hub), [`tools/challenge-world-check.js`](../tools/challenge-world-check.js) (the one-planet launch). Calibration:
[`evidence/bloom-036b/CHALLENGE_RECIPE_STUDY.md`](evidence/bloom-036b/CHALLENGE_RECIPE_STUDY.md). Records:
[`evidence/bloom-036a/REPORT.md`](evidence/bloom-036a/REPORT.md) · [`evidence/bloom-036b/REPORT.md`](evidence/bloom-036b/REPORT.md).

---

## 1. Challenge vs scenario

| | **Scenario** (`content/scenarios.js`) | **Challenge** (`content/challenges.js`) |
|---|---|---|
| What it is | simulation mechanics the engine runs (`createSim(…, { scenario })`) | a product definition: what the player is offered on the CHALLENGES hub, how a run is launched, how it is completed |
| Holds | pressure clocks, channels, phases, competition, climate instability, loss, layer-P validation policy, the player-facing display copy | id, version, status, name, presentation, **a reference to one scenario**, launch policies (species · world recipe · starting state), completion |
| Engine code? | read by `resources/bloom-sim.js` / `bloom-scenario.js` | **no** — the engine never reads a Challenge (it reads only the starting state a Challenge prescribes, through `createSim`'s own option) |

A Challenge never restates or overrides its scenario. `BLOOM.challenges.check()` refuses any scenario-mechanics key at any depth (also inside a
recipe), the default scenario, an unknown scenario or a retired alias. Player-facing copy is either a **reference** to the scenario's own display
copy (`"@scenario.display.card.tagline"` …) or text the scenario does not have; a verbatim copy of scenario text is refused. The run plays
`BLOOM.challenges.scenarioOf(challenge)` — the catalogue's own scenario object.

## 2. Schema (v2, `BLOOM.challenges.SCHEMA_VERSION = 2`)

```js
{
  id: "native_competition",       // stable lower_snake id — run provenance, report; never renamed
  version: 2,                     // the definition's revision (036A's v1 launched through the Destination Survey)
  status: "released",             // "released": on the hub · "fixture": QA only (BLOOM.challenges.fixture), never on the hub or in content
  name: "Native Competition",
  short: "@scenario.display.card.tagline",
  scenario: "native_competition", // a real, non-default scenario with mechanics
  presentation: { tagline, briefing, strategicIdea, icon, science },   // 036A, unchanged
  launch: {
    species:       { policy: "player-choice" },                        // | { policy: "prescribed", species: "<released species id>" }
    world:         { policy: "recipe", recipe: {                       // ONE generated world (§4)
                       version: 1,                                     // the recipe's own revision
                       archetypes: ["ocean_archipelago", "desert_world", "frozen_world"],
                       arrival: { minHabitable: 0.20 },                // species-relative arrival share band, or null
                       nativeCover: null } },                          // { minStartShare } (competition scenarios only), or null
    startingState: { policy: "normal" },                               // | { policy: "prescribed", adaptations: [traitId…], biomass: n | null }
  },
  completion: { win: "bloom", conditions: [] },                        // the normal Bloom; Challenge-specific conditions: schema path kept
}
```

Resolved (`BLOOM.challenges.resolve(id)`): one deep-frozen object per id with the copy references resolved, `schema: 2`, `sources` and
`recipeKey` (`<id>@<version>/recipe-<recipe version>`). Helpers: `speciesOf(ch)` (the prescribed species object or null),
`startingStateOf(ch)` (the frozen prescribed start or null), `provenance(ch)` (`{ id, name, version, recipeVersion, scenarioId, icon }`).
An unknown id throws `UNKNOWN_CHALLENGE` — never a silent Expedition.

### 2.1 Copy rule

No difficulty ranking anywhere: no Easy / Medium / Hard, stars, scores, tiers or recommended skill (`FORBIDDEN_COPY`). The hub's cards are equal
in size and weight. Inside a Challenge the species screen drops Organic Hybrid's "Recommended first expedition" note and its action reads
"Continue with <plant>" (a Challenge has no survey).

### 2.2 Launch policies — what the runtime honours (everything else is refused)

| Policy | Values | Runtime |
|---|---|---|
| `launch.species` | `player-choice` · `prescribed` + a **released** species id | Choose Plant Species, or skipped (the dossier names the prescribed plant) |
| `launch.world` | `recipe` + a recipe of `version`, `archetypes` (known, ≥ 1, no repeats, none the scenario disallows), `arrival` (`minHabitable` / `maxHabitable` shares, min < max) or null, `nativeCover` (`{ minStartShare }`, a competition scenario only) or null | `challenge-world.js` (§4); no other recipe key exists |
| `launch.startingState` | `normal` · `prescribed` + `adaptations` (Adapt / Spread plant traits whose effect needs no world feature: `tempPoint`, `waterArm`, `level`; one tier per id, legal in order) and / or `biomass` (integer ≥ 0, null = the normal amount) | the engine's `createSim(…, { startingState })`; `check()` asks the engine itself (a Terraform step, a crossing, an over-max level, two water arms, past the temperature cap, negative Biomass or an empty start are refused) |
| `completion.win` | `bloom` | the planet's own threshold |
| `completion.conditions` | `[]` | reserved |

**The three released Challenges keep the normal model** (PMO): player-choice species, a recipe world, the normal start, the normal Bloom.
Prescribed species and prescribed starting states are implemented and QA-covered with **non-released fixtures** only
(`tools/challenge-world-check.js` W6 / W7 / X1 / X2); no fixture is in `content/challenges.js` or on the hub.

## 3. Flow (canonical, 036B)

```
MAIN MENU → CHALLENGES → Challenge hub → BEGIN CHALLENGE
   → (the LAUNCH: a fresh launch seed; its workers start validating the launch's species-free world stream)
   → Choose Plant Species            (player-choice only; "Continue with <plant>"; the selected plant's world is prepared early)
   → PREPARING CHALLENGE WORLD       (Searching candidate worlds · Checking <Challenge> conditions · Preparing your planet)
   → the Challenge Planet Dossier    (ONE planet; Back · BEGIN CHALLENGE)
   → BEGIN CHALLENGE                 (the survey's dramatic descent)
   → Run → Report                    (KEEP PLAYING · RETRY CHALLENGE · CHALLENGES · MAIN MENU)
```

No Destination Survey, no choosing among worlds, no reroll. A prescribed-species Challenge skips Choose Plant Species (hub → PREPARING).

| From | Back goes to | The launch |
|---|---|---|
| Choose Plant Species | the hub | let go (beginning the Challenge again is a fresh instance) |
| PREPARING (player choice) | Choose Plant Species | kept; the running selection is cancelled at once (its busy workers terminated) |
| the dossier (player choice) | Choose Plant Species | kept: the same plant again is the SAME planet (the finished selection); another plant is evaluated on the same species-free stream — no promise that the planet stays |
| PREPARING / the dossier (prescribed) | the hub | let go |
| the hub | the title | — |

All of it inside `index.html` (one document). The hub and the Challenge world screen are loaded lazily (served: `import()`; `file://`: the portable
runtime's module seam). The Challenge, the launch and the instance are **application state** — never a query string, sessionStorage,
localStorage or `window.name` (development / QA only: `?launch=<n>` fixes the first launch seed).

### 3.1 History — the 036A interim survey policy (NOT current design)

036A (PMO directive) launched a Challenge through the species-relative **Destination Survey**: a 3 × 3 sector whose every world was also proven
under the scenario (a third cached survey layer, `…|s:<scenario>`), with "Begin challenge", Change Species / Choose Another Planet keeping
the Challenge. It cost roughly 4–32 s (nine layer-P proofs) and contradicted the locked contained-Challenge model. **036B removed it**: the
survey's scenario layer, its worker task, the sector key's scenario part, the survey's Challenge option and wording are gone (the
Destination Survey is the Expedition's only, unchanged — its "Expected challenges" heading is now **Expected hazards**, since CHALLENGES is a
top-level mode).

## 4. The Challenge world: ONE generated qualifying planet

### 4.1 Not a second world system

A Challenge world is a world of the normal physical stream produced by the survey's own production path (`physicalCandidate`:
`BLOOM.play.runSearch`, default scenario, archetype layers 1–8 → `stripPlanet` — one species-free planet object), judged by the survey's own
species evaluation (`evaluateSpecies`: engine `evaluate()` + `BLOOM.species.validateFor` S2) and by the engine's own scenario validation
(`BLOOM.validateScenario`, layer P, with the species and the starting state). The recipe only decides which **finished** world is accepted; the
species, the recipe and the scenario never alter the planet a (archetype, World Seed) generates.

### 4.2 The rule (`challenge-world.js`, rule version 1)

- **Stream.** `streamSeed(launchSeed, challenge)` = hash(Challenge id, Challenge version, recipe version) ⊕ launch seed — **never the species**.
  Draw *i* (`drawAt`) = an archetype of `recipe.archetypes` and a World Seed in `content/play.js` `search.seedMin…seedMax`, computed directly
  from *i*. No `Math.random` (a launch seed comes from `crypto.getRandomValues`).
- **Stages** (the first that fails rejects the draw, for this species):
  1. `predicted` — with an arrival band: the draw's cheap structural world (layers 1–3, never shown) assessed for the species must fall in it
  2. `physical` — the fully validated world exists for that seed
  3. `recipe` — archetype in the recipe; the arrival share (species-relative, with the starting state) in the band
  4. `species` — S2: the species can win it (from the prescribed start, if any)
  5. `cover` — (`nativeCover`) the scenario's native cover starts on at least that share of the land (the engine's own probe)
  6. `scenario` — layer P passes **within the proof budget** (§4.4)
- **Acceptance.** The instance's planet is the **first draw in stream order** that passes every stage (`acceptInOrder`): draws are evaluated
  speculatively in parallel, but a draw is accepted only once every earlier draw is known to be rejected — so timing never chooses the
  planet. Same launch seed + Challenge version (+ recipe version) + species ⇒ the same planet. Budget: `MAX_DRAWS` = 160 (an exhausted launch
  says "No qualifying world turned up" and offers Back; never observed).

### 4.3 The search in the browser (`challenge-world-search.js`)

A small pool of the survey's own module workers (`survey-worker.js` "challenge-physical" / "challenge-draw"; over `file://` the portable
runtime's blob worker) owned by the launch, not the title's survey pool:
- **prefetch** — from BEGIN CHALLENGE (the stream is species-free) the first `poolSize` physical worlds are validated while the player is on
  Choose Plant Species; the page keeps each as the canonical physical candidate (one planet object per world) and a draw's task carries it;
- **warm** — the plant selected on Choose Plant Species has its selection started early; choosing it joins that work, selecting another
  plant cancels it (one selection at a time);
- **window** — `poolSize` draws run at once; on acceptance the remaining tasks are dropped and their workers terminated; Back cancels the same
  way; nothing rejected ever leaves the search (the screen receives the instance or an exhausted / cancelled outcome, and plain phases).
The title's survey prefetch is stopped at BEGIN CHALLENGE (no world generation competes) and restarts when the title is back.

### 4.4 The proof budget (early stop, not a weaker proof)

Layer P may use at most **6 simulation runs in all** for a Challenge world — witness candidates AND the scenario's confirmation reruns
(Native Competition and Volatile Climate replay every winning witness under two more seeds; the validator does not count those against its
own 40-simulation budget). It is the validator's opt-in `maxRuns` option (`resources/bloom-witness.js` `findStrategies`, passed through
`BLOOM.validateScenario`; absent everywhere else, so every other caller is unchanged), checked only **before a new witness run starts** — a
winner always completes its confirmations. Counted in runs, never time, so deterministic. The validator's search is ordered, so a world
proven within the budget gets the **identical** witness, margin and run counts as under the full budget (`challenge-world-check` W9, on a
Dying World pass and a Native Competition pass with its confirmations); a world whose proof needs more is not offered.
Rationale: passing proofs overwhelmingly need one witness run (plus its confirmations), while failing ones run long — up to 40 witness runs,
and for Native Competition up to 12 more confirmation reruns — the 15–140 s waits stream-order acceptance would otherwise sit behind. (A first
version capped witness runs only; the browser timing showed failing Native Competition searches still spending most of their time in
confirmations, so the cap now counts them.)

### 4.5 The initial recipes (calibrated: [`CHALLENGE_RECIPE_STUDY.md`](evidence/bloom-036b/CHALLENGE_RECIPE_STUDY.md))

| Challenge | Recipe v1 | Why |
|---|---|---|
| Dying World | every archetype · arrival any · no cover | **broad**: layer P alone keeps the decline decisive (every passing world reaches its margin ≥ 240 s in, at ≥ 80 % of the decline, and holds 60 s into the final state) |
| Native Competition | every archetype · **arrival ≥ 20 %** · no cover | a contest needs ground to contest: Extreme-arrival starts hold most of its layer-P failures (the plant dies out under established natives, or no build reaches the margin); native cover itself needs no floor (≥ 9 % on every sampled world, contested fronts in every witness) |
| Volatile Climate | every archetype · arrival any · no cover | **broad**: layer P (pacing, mechanic evidence for Terraform-heavy witnesses, confirmation seeds) is the proof; an arrival cap would not change how often the mechanic is met |

Every player-choice species receives qualifying worlds under every recipe; no difficulty labels; no species physiology or scenario mechanic was
changed.

## 5. The Challenge instance

`makeInstance` (application state; frozen; never serialized):

| Field | |
|---|---|
| `challenge`, `challengeId`, `challengeVersion`, `recipeVersion`, `recipeKey`, `scenarioId` | the canonical Challenge object and its identity |
| `species`, `speciesId`, `speciesPolicy` | the canonical species object |
| `launchSeed`, `stream`, `draw`, `draws`, `ruleVersion` | where in the launch's stream the planet was |
| `startingState`, `startingStatePolicy` | the Challenge's prescribed start (frozen) or null |
| `planet`, `fingerprint`, `worldSeed`, `archetypeId`, `candidate` | the EXACT planet object, its identity and the verdicts it passed (S2, layer P, recipe) |
| `dossier`, `assessment`, `render` | the dossier rows / arrival share for that species + start; the globe's render hints |

`BLOOM.gameSession.challengeRun(instance)` re-checks it against the **current** catalogue: the canonical Challenge / species objects, the same
Challenge version and recipe version, the same scenario, the same starting state, a passing layer P — an old, tampered or foreign instance is
**refused**, never reinterpreted under new data. The run's provenance (`run.challengeRun`, the report identity) carries challenge id / version,
recipe version, rule version, launch seed, planet seed / fingerprint, species, scenario and the starting state.
`BLOOM.gameSession.expeditionRun` refuses a Challenge, an instance or scenario provenance (no Challenge residue in an Expedition).

## 6. State invariants

| Action | Challenge | Scenario | Species | Planet |
|---|---|---|---|---|
| a Challenge run | the instance's | its scenario (the catalogue's object) | the instance's | the instance's exact object |
| **RETRY CHALLENGE** | same | same | same | **same object** (same instance), a fresh session + simulation |
| **CHALLENGES** (report) | → the hub (selected) | — | — | BEGIN CHALLENGE again = a new launch seed, a fresh instance |
| **MAIN MENU** (run, hub) | **cleared** (no launch, no instance) | — | — | — |
| **EXPEDITION** | none | `default` | chosen | its 3 × 3 Destination Survey (Play again · Choose another planet · Main menu) |
| **TRAINING** | none | `default` | Organic Hybrid | the training world |

## 7. Screens

- **Main menu:** EXPEDITION · **CHALLENGES** · TRAINING · SETTINGS · CREDITS (036A).
- **Hub** (`ChallengeHub`, 036A): lede "Each Challenge is a contained run with its own starting situation and pressure. Read the brief, choose
  what the Challenge allows, and find a way to bloom." Dossier rows What changes · Strategic idea · the science · **How the run works**: choose
  your plant (or: the Challenge prescribes it) · one qualifying Challenge world is generated (no survey, no choosing among worlds) · nothing owned
  at landing (or: what the Challenge gives) · the normal Bloom · extinction where the scenario says so.
- **PREPARING CHALLENGE WORLD:** the three real phases the search reports ("Checking <Challenge> conditions" = a world's layer-P proof is
  running); no percentage (there is no real denominator), no world, no rejected candidate; Back / Escape cancels.
- **The Challenge Planet Dossier:** **The challenge** (name, what changes, strategic idea) · **Your plant** (its real specimen with any
  prescribed adaptations; "This Challenge prescribes the plant."; "Lands as it always does: nothing owned yet." or what the Challenge gives) ·
  **Your world** (a PlanetSphereView of the instance's planet, name, world type, World Seed, ground the plant can live on at landing, the
  foothold (growable at landing and reachable from the landing region — the S1 measure; normal start only), the conditions rows, Expected
  hazards). BEGIN CHALLENGE + Back. Keyboard: focus on the world's heading, Tab reaches the actions, Escape = Back.
- **Run / Report:** the HUD and footer name the Challenge (036A). The report: "Challenge · <name>" under a challenge debrief, the scenario's own
  final state, a "Given by the Challenge at landing: …" note for a prescribed start (never counted as purchases), and KEEP PLAYING (on a win) ·
  RETRY CHALLENGE · CHALLENGES · MAIN MENU.
- **Specimen environment:** the real region sky only — Dying World's drift, a real Volatile Climate shock; Native Competition adds nothing.

## 8. Deferred (036C+)

Challenge-specific completion conditions (the schema path exists, refused until implemented) · authored Challenge worlds · new authored
Challenges using prescribed species / starting states · medals · scoring · difficulty tiers · unlock trees · campaign progression.
