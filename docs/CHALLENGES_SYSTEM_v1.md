# Strange Bloom · Unknown Soils — Challenges system v1

**BLOOM-036A — Challenges foundation + first playable hub** **+ BLOOM-036B — the contained Challenge: ONE procedural planet per instance**
**+ BLOOM-036B1 — Challenge worlds from PREVALIDATED SEED BANKS** — PMO-accepted and **IMPLEMENTED / COMPLETE in production `main`** as one
combined Challenges release (`bd0eb27`, 2026-10-12). Current product direction: [`PRODUCT_DIRECTION_CURRENT.md`](PRODUCT_DIRECTION_CURRENT.md) §8.

> **EXPEDITION** = live procedural world discovery (the 3 × 3 Destination Survey generates and validates worlds on the player's machine).
> **CHALLENGES** = curated banks of **prevalidated procedural seeds**: the world is still procedurally generated, but which worlds a Challenge
> may use was decided and proven **offline**; the shipped bank stores **seeds + proof provenance, never map geometry**. Procedural variety,
> fast and guaranteed-valid startup.

Code — **generator** (unchanged: `resources/bloom-gen.js`, `bloom-archetype.js`) · **validator** (`bloom-validate.js`, `bloom-witness.js`,
`bloom-scenario.js`, `bloom-species.js`; kept whole for the builder, QA and authoring) · **bank builder** (offline:
[`tools/build-challenge-seed-bank.mjs`](../tools/build-challenge-seed-bank.mjs), library [`tools/challenge-bank-builder.mjs`](../tools/challenge-bank-builder.mjs))
· **bank** (generated: [`content/challenge-seed-banks.js`](../content/challenge-seed-banks.js)) · **bank consumer** (runtime:
[`resources/challenges/challenge-bank.js`](../resources/challenges/challenge-bank.js), [`challenge-world-prep.js`](../resources/challenges/challenge-world-prep.js),
the survey worker's `challenge-bank-world` task) · definitions [`content/challenges.js`](../content/challenges.js) +
[`resources/bloom-challenges.js`](../resources/bloom-challenges.js) · screens [`challenge-hub.js`](../resources/challenges/challenge-hub.js),
[`challenge-world-screen.js`](../resources/challenges/challenge-world-screen.js) · flow [`expedition-entry.js`](../resources/main-menu/expedition-entry.js),
[`app-controller.js`](../resources/app/app-controller.js) · run [`game-session.js`](../resources/run/game-session.js) `BLOOM.gameSession.challengeRun`.
QA: [`tools/challenges-check.js`](../tools/challenges-check.js) (data layer + hub) · [`tools/challenge-world-check.js`](../tools/challenge-world-check.js)
(banks + the launch). Records: [`evidence/bloom-036b/REPORT.md`](evidence/bloom-036b/REPORT.md) ·
[`seed-bank/BUILD_REPORT.md`](evidence/bloom-036b/seed-bank/BUILD_REPORT.md) · [`CHALLENGE_RECIPE_STUDY.md`](evidence/bloom-036b/CHALLENGE_RECIPE_STUDY.md) ·
[`NATIVE_COMPETITION_LATENCY_STUDY.md`](evidence/bloom-036b/NATIVE_COMPETITION_LATENCY_STUDY.md).

---

## 1. Challenge vs scenario

| | **Scenario** (`content/scenarios.js`) | **Challenge** (`content/challenges.js`) |
|---|---|---|
| What it is | simulation mechanics the engine runs (`createSim(…, { scenario })`) | a product definition: what the hub offers, how a run is launched, how it is completed |
| Holds | pressure, competition, climate instability, loss, layer-P validation policy, the player-facing copy | id, version, status, name, presentation, **a reference to one scenario**, launch policies (species · world · starting state), completion |
| Engine code? | read by the engine | **no** — the engine reads only a prescribed starting state, through `createSim`'s own option |

`BLOOM.challenges.check()` refuses any scenario-mechanics key at any depth (also inside a recipe), the default / an unknown scenario, verbatim
scenario copy, difficulty words, and every launch value the runtime cannot honour.

## 2. Schema (`BLOOM.challenges.SCHEMA_VERSION = 2`; Challenges at version 3)

```js
{
  id: "native_competition", version: 3, status: "released",     // "fixture": QA only (BLOOM.challenges.fixture), never on the hub
  name: "Native Competition", short: "@scenario.display.card.tagline", scenario: "native_competition",
  presentation: { tagline, briefing, strategicIdea, icon, science },
  launch: {
    species:       { policy: "player-choice" },                     // | { policy: "prescribed", species: "<released species id>" }
    world:         { policy: "seed-bank",
                     recipe: { version: 1, archetypes: [...], arrival: { minHabitable: 0.20 }, nativeCover: null },   // what the BUILDER accepts
                     bank: { version: 1, size: 50 } },              // the shipped bank's revision; entries every cell must hold
    startingState: { policy: "normal" },                            // | { policy: "prescribed", adaptations: [traitId…], biomass: n | null }
  },
  completion: { win: "bloom", conditions: [] },
}
```

- **Recipe** (product-level selection data for finished worlds, never a planet change): `version` · `archetypes` · `arrival` band (the
  species' arrival share) · `nativeCover` floor (competition scenarios) · `foothold` floor (S1; supported, unused — the latency study found no
  content reason). Unknown keys, mechanics keys and generator parameters are refused.
- **Versions.** Challenge v3 (036B's live-search launch was v2, 036A's survey launch v1) · recipe v1 · bank v1. Changing a released recipe
  or bank is an explicit change of those numbers; the bank's provenance makes any other rule change detectable (§4.4).
- **Released** Challenges keep player choice, the normal start and the normal Bloom. **Prescribed species and prescribed starting states**
  are implemented and QA-covered with **fixtures** that carry their own fixture bank cells (`BLOOM_DATA.challengeSeedBankFixtures`, honoured
  for `status: "fixture"` only).

## 3. Flow

```
MAIN MENU → CHALLENGES → Challenge hub → BEGIN CHALLENGE
   → (the LAUNCH: a fresh launch seed; one low-priority world worker started, idle)
   → Choose Plant Species        (player-choice only; "Continue with <plant>"; the SELECTED plant's one bank world is built at once)
   → PREPARING CHALLENGE WORLD    (Selecting a proven world · Building the planet · Verifying the planet — skipped when already built)
   → the Challenge Planet Dossier (ONE planet; Back · BEGIN CHALLENGE)
   → BEGIN CHALLENGE (the dramatic descent) → Run → Report (KEEP PLAYING · RETRY CHALLENGE · CHALLENGES · MAIN MENU)
```

No Destination Survey, no alternatives, no reroll. Prescribed species: hub → PREPARING (no species screen). Back: species → hub (the launch is
let go); PREPARING / dossier → species (same launch: the same plant again = the same entry and planet) or → hub (prescribed). One document;
application state only (no URL, storage or `window.name`; QA: `?launch=<n>` fixes the first launch seed).

### 3.1 History (not current design)

- **036A** (interim, PMO directive): a scenario-proven 3 × 3 Destination Survey inside a Challenge (~4–32 s). Removed in 036B; the survey is the
  Expedition's only (its heading is now **Expected hazards**).
- **036B** (accepted product architecture; superseded runtime): each launch searched a species-free stream and proved candidates in the
  browser (physical → recipe → S2 → layer P with confirmations, stream-order acceptance, a run budget). Native Competition took 20–90 s in
  the tail. **036B1 moved that proof offline** into the seed banks; the live search code is retired (its findings:
  [`NATIVE_COMPETITION_LATENCY_STUDY.md`](evidence/bloom-036b/NATIVE_COMPETITION_LATENCY_STUDY.md)).

## 4. Seed banks

### 4.1 The offline builder (`tools/build-challenge-seed-bank.mjs`)

1. **Pool** — species- and Challenge-free, archetype-stratified: per archetype, `--per-archetype` (160) World Seeds from a fixed stream
   (`"bloom-036b1 challenge seed bank pool v1|<archetype>"`). Every world: **physical validation once** (`physicalCandidate`: the production
   generation path, archetype layers 1–8 — its accepted attempt).
2. **Per Challenge × species** (`evaluateWorld`): species evaluation (arrival, S1 foothold, **S2 winnability**, from the prescribed start if
   any) → the **recipe** → the **scenario's layer P at the validator's FULL budget with every confirmation run** (no live-search budget) →
   **Challenge quality**: the mechanic mattered in the proof (Native Competition's witness met contested fronts; Dying World's reached its
   margin with ≥ 80 % of the decline done).
3. **Curation** (`curateCell`, deterministic) — from every passing candidate (unique fingerprints) keep 50: the lowest decile of witness
   hold margin (barely passing) is used only if needed; archetypes get equal quotas; inside an archetype, farthest-point selection on the
   normalized features (arrival share, foothold, water, landmasses, temperature, moisture, radiation, dry / wet / cold / hot / soil / hazard
   limits, native cover, margin time, Terraform steps) from the candidate nearest the centroid. Never "easiest".
4. **Write** — `content/challenge-seed-banks.js` (generated, deterministic bytes: no timestamp, sorted cells) and the evidence
   (`docs/evidence/bloom-036b/seed-bank/`: `BUILD_REPORT.md`, `build.json`, `candidates.json`). A cell short of 50 fails the build and is
   reported (never silently smaller); `--provisional N` is an engineering-only escape hatch, marked in the bank. Resumable: every evaluated
   world is cached with the INPUT fingerprint of the rules it was evaluated under (`--reuse`); `--check` rebuilds in memory and fails if the
   shipped bank differs.

### 4.2 The bank (`BLOOM_DATA.challengeSeedBanks`)

`{ format: 1, bankVersion: 1, provisional, inputsFingerprint, cells: { "<challenge>/<species>": cell } }`; a **cell** =
`{ bankVersion, provenance, candidates: { evaluated, passing, retained, deprioritized }, entries[50] }`; an **entry** = what the runtime needs
to regenerate and verify the exact world + the proof provenance:
`archetypeId, seed, attempt, generationSeed, requestedWaterPct, actualWaterPct, landmasses, originLandmassShare, validatedLayers,
fingerprint, habitable, classId, foothold, s2, nativeStart?, proof { status, simulations, confirmations, strategies, marginSeconds,
holdCoverage, contested? / pressureAtMargin? / shocks? }, bucket` (no traces, no geometry).

### 4.3 The runtime consumer (`challenge-bank.js`, `challenge-world-prep.js`)

1. `bankCell(challenge, species)` — the cell, **checked** against the current game (§4.4); stale / missing → `STALE_BANK` / `NO_BANK`.
2. `pickEntry` — a deterministic index from (launch seed, Challenge id / version, species); this session's recently played entries of the cell
   are stepped over (in memory only; a page reload may revisit a seed — accepted). Never `Math.random`, never worker timing.
3. `buildBankWorld` — `BLOOM.archetype.attemptPlanet(archetype, seed, attempt)` + the accepted world's identity record: the exact planet in
   **milliseconds**, no validation loop; its fingerprint **must** equal the entry's (`FINGERPRINT_MISMATCH` otherwise — an invariant failure,
   never a search for another world). The arrival share must match too.
4. `bankWorld` — the dossier data from the engine's cheap `evaluate()` only; the proof results come from the bank.
5. `makeBankInstance` — the instance (§5).

`ChallengeWorldPrep` runs this in ONE worker: it is started at BEGIN CHALLENGE (idle), builds the plant **selected** on Choose Plant Species
(a species change cancels the other build), and the page re-verifies the received planet's fingerprint. The runtime never calls
`findWitness`, `findStrategies`, `validateScenario` or `species.validateFor` (QA B7 / F3).

### 4.4 Stale-bank protection

Each cell's `provenance` = `{ challengeId, challengeVersion, recipeVersion, recipeFingerprint, scenarioId, scenarioFingerprint (mechanics,
not words), speciesId, physiologyVersion, physiologyKey, startingState, worldGenVersion, archetypes { id: fingerprint }, rulesFingerprint
(the whole engine config + every trait's mechanics), validator ("challenge-bank-validation@1") }`. The runtime recomputes it from the running
game at every launch and refuses any difference, a cell of another bank version than the Challenge's `bank.version`, too few entries
and a provisional bank; the builder re-evaluates everything when its input fingerprint changes. Never a silent reuse.

**Rebuild requirement (PMO-LOCKED).** Any change to the world generator, an archetype, a species physiology, a trait mechanic, an engine rule,
a scenario mechanic, a Challenge recipe / version or the validator / proof contract makes the affected cells stale: rebuild with
`node tools/build-challenge-seed-bank.mjs --per-archetype 160 --workers 8` (~38 min on 8 workers) and commit the regenerated `content/challenge-seed-banks.js` + `docs/evidence/bloom-036b/seed-bank/`
with the change. `challenge-world-check` B1 fails on a stale bank. Checklist: [`DEVELOPMENT_NOTES.md`](DEVELOPMENT_NOTES.md) § "Change checklist —
Challenge seed banks". Release bank (bank v1): 12 cells × 50, 312 145 bytes, sha256 `dcca6d8ff53e7cbb032bcdf0d0dae81fc0b4660ada008ce08894d6d4ed6871ba`.

## 5. The Challenge instance (format 2, `source: "seed-bank"`)

Canonical Challenge (id, version, recipe version, recipe key), scenario, canonical species (+ policy), launch seed, `bank { cellKey,
bankVersion, entryIndex, entries, validator }`, starting state, the EXACT planet object + fingerprint + World Seed + archetype, the bank's proof
summary (S2, layer P — `offline: true`), the dossier. `BLOOM.gameSession.challengeRun(instance)` re-checks it against the current catalogue and
refuses a 036B live-search instance (format 1), another Challenge / recipe / bank version, a foreign object, another starting state or an
unproven planet. The run / report provenance carries source, Challenge / recipe / bank versions, cell, entry, launch seed, planet seed and
fingerprint, species, scenario, starting state. `expeditionRun` refuses a Challenge.

## 6. State invariants

| Action | Bank entry | Planet | Species / Challenge / scenario / start |
|---|---|---|---|
| **RETRY CHALLENGE** | same cell + entry | same object | same objects — a fresh session + simulation |
| Back to the species screen, same plant | same entry | same planet | same launch |
| **CHALLENGES** → BEGIN again | a new launch seed → a fresh pick (the entry just played is avoided this session) | fresh | — |
| **MAIN MENU** | cleared | — | — |
| **EXPEDITION** | none (live procedural survey) | — | default scenario |
| **TRAINING** | none | the training world | Organic Hybrid |

## 7. Screens

- **Hub:** lede "Each Challenge is a contained run with its own starting situation and pressure. Read the brief, choose what the Challenge
  allows, and find a way to bloom."; How the run works: choose your plant · one qualifying Challenge world is generated (no survey, no
  choosing among worlds) · nothing owned at landing · the normal Bloom · extinction where the scenario says so.
- **PREPARING CHALLENGE WORLD:** only the real phases — *Selecting a proven world · Building the planet · Verifying the planet* (no Challenge
  simulation runs, so nothing claims to check Challenge conditions); no percentage; skipped cleanly when the world was built while the player
  read the species screen. An invariant failure says the world could not be prepared and offers Back.
- **Dossier:** The challenge · Your plant (specimen; prescribed plant / starting state) · Your world (globe, name, type, World Seed, ground the
  plant can live on at landing, conditions, Expected hazards). **No separate "Foothold" line** (036B1, PMO): the S1 metric stays in the bank /
  instance for validation and QA.
- **Run / Report:** "Challenge · <name>", challenge debrief, the scenario's final state, "Given by the Challenge at landing: …" for a
  prescribed start, KEEP PLAYING · RETRY CHALLENGE · CHALLENGES · MAIN MENU.

## 8. Deferred (036C+)

Challenge-specific completion conditions · authored Challenges using prescribed species / starting states · bank variety beyond 50 · medals,
scoring, difficulty tiers, unlock trees, campaign progression.
