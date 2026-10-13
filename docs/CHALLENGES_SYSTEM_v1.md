# Strange Bloom · Unknown Soils — Challenges system v1

**BLOOM-036A — Challenges foundation + first playable hub** **+ BLOOM-036B — the contained Challenge: ONE procedural planet per instance**
**+ BLOOM-036B1 — Challenge worlds from PREVALIDATED SEED BANKS** — PMO-accepted and **IMPLEMENTED / COMPLETE in production `main`** as one
combined Challenges release (`bd0eb27`, 2026-10-12). **+ BLOOM-036C1 — the first AUTHORED Challenges (Low Tide · Oasis Line): IMPLEMENTED / COMPLETE** (`d69d458`, §9).
**+ BLOOM-036D1 — the first Challenge COMPLETION CONDITION: Thin Air · `pressure-final-state` — CANDIDATE** (review branch `handoff/bloom-036d1-review`,
§2.5, §10). Current product direction: [`PRODUCT_DIRECTION_CURRENT.md`](PRODUCT_DIRECTION_CURRENT.md) §8.

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
[`resources/bloom-challenges.js`](../resources/bloom-challenges.js) · completion (036D1) [`resources/challenges/challenge-completion.js`](../resources/challenges/challenge-completion.js) · screens [`challenge-hub.js`](../resources/challenges/challenge-hub.js),
[`challenge-world-screen.js`](../resources/challenges/challenge-world-screen.js) · flow [`expedition-entry.js`](../resources/main-menu/expedition-entry.js),
[`app-controller.js`](../resources/app/app-controller.js) · run [`game-session.js`](../resources/run/game-session.js) `BLOOM.gameSession.challengeRun`.
QA: [`tools/challenges-check.js`](../tools/challenges-check.js) (data layer + hub) · [`tools/challenge-world-check.js`](../tools/challenge-world-check.js)
(banks + the launch) · [`tools/challenge-completion-check.js`](../tools/challenge-completion-check.js) (036D1: the engine win gate, completion, Thin Air). Records: [`evidence/bloom-036b/REPORT.md`](evidence/bloom-036b/REPORT.md) ·
[`seed-bank/BUILD_REPORT.md`](evidence/bloom-036b/seed-bank/BUILD_REPORT.md) · [`CHALLENGE_RECIPE_STUDY.md`](evidence/bloom-036b/CHALLENGE_RECIPE_STUDY.md) ·
[`NATIVE_COMPETITION_LATENCY_STUDY.md`](evidence/bloom-036b/NATIVE_COMPETITION_LATENCY_STUDY.md).

---

## 1. Challenge vs scenario

| | **Scenario** (`content/scenarios.js`) | **Challenge** (`content/challenges.js`) |
|---|---|---|
| What it is | simulation mechanics the engine runs (`createSim(…, { scenario })`) | a product definition: what the hub offers, how a run is launched, how it is completed |
| Holds | pressure, competition, climate instability, loss, layer-P validation policy, the player-facing copy | id, version, status, name, presentation, **a reference to one scenario**, launch policies (species · world · starting state), completion |
| Engine code? | read by the engine | **no** — the engine reads only a prescribed starting state and (036D1) an optional generic win gate, through `createSim`'s own options; never a Challenge id or condition name |

`BLOOM.challenges.check()` refuses any scenario-mechanics key at any depth (also inside a recipe), the default / an unknown scenario, verbatim
scenario copy, difficulty words, and every launch value the runtime cannot honour.

## 2. Schema (`BLOOM.challenges.SCHEMA_VERSION = 2`; Dying World v3, Native Competition / Volatile Climate v4, the authored Challenges v1)

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
- **Completion** (036D1): `{ win: "bloom", conditions }` — `[]` = the ordinary Bloom; one condition type exists (`pressure-final-state`, §2.5).
- **Released** Challenges keep player choice, the normal start and the normal Bloom. **Prescribed species and prescribed starting states**
  are implemented and QA-covered with **fixtures** that carry their own fixture bank cells (`BLOOM_DATA.challengeSeedBankFixtures`, honoured
  for `status: "fixture"` only).

## 2.5 Completion (BLOOM-036D1)

**The engine boundary.** `sim.won` is the RUN's actual completion. `createSim(planet, config, traits, { …, canWin })` takes an optional, GENERIC
win gate `canWin(sim, coverage) → boolean`, asked only on a tick whose coverage has reached `winAt` while the run is not won:

```
if (!sim.won && coverage >= winAt && (no gate || canWin(sim, coverage) === true)) { sim.won = true; onWin(coverage); }
```

- **No gate** (every Expedition, Training and ungated Challenge run): the pre-036D1 engine **bit for bit** (the First Bloom golden, and a real
  Dying World run tick for tick — `challenge-completion-check` G1).
- **A gate:** coverage ≥ `winAt` is necessary, not sufficient. Coverage may cross `winAt` earlier — an **early Bloom**, a milestone — but `sim.won`
  stays false: the run keeps ticking, `onWin` does not fire (no report), **extinction stays live** (an early Bloom can still end in EXTINCTION). The
  run is won once, on the first tick where coverage ≥ `winAt` AND the gate permits; coverage that fell back below `winAt` must be regained first.
  After the true completion Keep Playing is the ordinary post-win play (`sim.won`, extinction off as for every completed run).
- The engine names no Challenge, condition or completion concept; `sim.winGated` records that a gate was supplied (provenance only).

**The completion boundary** — [`resources/challenges/challenge-completion.js`](../resources/challenges/challenge-completion.js),
`BLOOM.challengeCompletion` (classic script, loaded with `bloom-challenges.js` everywhere) owns every Challenge-level completion semantic, so hub,
dossier, run, report, builder and QA never re-derive it: `check` (definition validation; `bloom-challenges.js` delegates to it) · `contract` (the
resolved, frozen contract) · `fingerprint` · `winGate` (the engine gate — `null` for an ungated Challenge, so the session passes none) · `goal`
(the player-facing contract) · `tracker` (the run's completion state: progress line, first early Bloom, report data) · `prove` (the offline proof).

**Schema v1 — exactly one condition type, no parameters, at most one condition, no expression language:**

| `completion.conditions` | Legal on | Met when | Offline proof (bank builder, `VALIDATOR_ID` @2) |
|---|---|---|---|
| `[]` | any Challenge | — (the ordinary Bloom completes the run) | nothing more (entries unchanged) |
| `[{ type: "pressure-final-state" }]` | a scenario WITH pressure (Dying World); refused for the default, Native Competition and Volatile Climate scenarios | the scenario's decline has reached its final state: `sim.pressure.progress ≥ 1` | every proven strategy's layer-P hold record AND every confirmation run's held the Bloom threshold with `progress = 1` (`hold.progress` — the witness's hold check is at max(margin, final state) + `holdFinalSeconds`); a candidate whose evidence does not establish it fails (stage `completion`) — never assumed from the scenario |

Refused: an unknown type, parameters / unknown keys (`{ type, holdSeconds }`), duplicates, more than one condition, a non-list, another win.

**Completion fingerprint.** `fnv(stable({ version: 1, win, conditions: [{ type, version }] }))` of the RESOLVED contract — every ungated Challenge
shares the ordinary-Bloom fingerprint (`c59f4a25`); Thin Air's is `8496aade`. It is part of every bank cell's provenance (§4.4), of the instance,
the run (`challengeRun.completion`) and the report (`identity.challenge.completion`): any completion-definition change (a condition, a type's
semantics version, the contract version) makes the cell STALE.

**Player-facing contract** (`goal`, `tracker`): the hub card names the condition ("Bloom in the final atmosphere"); the hub dossier and the Challenge
Planet Dossier open with **To win** — `BLOOM · 70% of land alive` AND `FINAL ATMOSPHERE · The Bloom counts only after the atmospheric decline has
finished.` (never "bonus", "objective", "achievement" or "medal": it is the win condition); "How the run works" says an earlier Bloom is a milestone.
In the run, ONE line under the existing pressure state: `Final atmosphere · 82% of decline` → at an early Bloom `BLOOM REACHED — hold it until the
atmosphere settles.` + the real time left (state badge **HOLDING**, the log says why the report did not appear) → if coverage falls back
`Final atmosphere: 91% · Bloom 63% / 70%` → once the decline is complete but coverage is short `Final atmosphere reached · regain Bloom: 63% / 70%`
→ `FINAL ATMOSPHERE ✓`. The report (win only at the true completion): **FINAL ATMOSPHERE ✓** · "You held 73% of the land in the final atmosphere."
· "Bloom was first reached at 3m 57s. You held on until the atmosphere settled at 4m 50s." An extinction after an early Bloom: "You reached Bloom
before the atmosphere finished changing, but the plant did not survive the final conditions." Report / debrief provenance only — never a score.

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
   margin with ≥ 80 % of the decline done) → (036D1) **completion**: a gated Challenge's condition ASSERTED from the proof's own witness
   evidence (`BLOOM.challengeCompletion.prove`, §2.5) and recorded in the entry (`proof.completion`); an ungated Challenge proves nothing more.
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

`{ format: 2, bankVersion: 1, provisional, inputsFingerprint, cells: { "<challenge>/<species>": cell } }` (036D1: format 2 — every cell's provenance
carries `completionFingerprint`; a format-1 bank is refused); a **cell** =
`{ bankVersion, provenance, candidates: { evaluated, passing, retained, deprioritized }, entries[50] }`; an **entry** = what the runtime needs
to regenerate and verify the exact world + the proof provenance:
`archetypeId, seed, attempt, generationSeed, requestedWaterPct, actualWaterPct, landmasses, originLandmassShare, validatedLayers,
fingerprint, habitable, classId, foothold, s2, nativeStart?, proof { status, simulations, confirmations, strategies, marginSeconds,
holdCoverage, contested? / pressureAtMargin? / shocks? / completion? }, bucket` (no traces, no geometry). `proof.completion` (gated Challenges only) =
`{ conditions, runs, minHoldCoverage, holdSeconds }`: the condition, how many proven runs (strategies + confirmations) established it, the
lowest coverage they held, the earliest hold time.

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
(the whole engine config + every trait's mechanics), validator ("challenge-bank-validation@2" since 036D1: the builder also proves the completion
contract), completionFingerprint (036D1, §2.5) }`. The runtime recomputes it from the running
game at every launch and refuses any difference, a cell of another bank version than the Challenge's `bank.version`, too few entries
and a provisional bank; the builder re-evaluates everything when its input fingerprint changes. Never a silent reuse.

**Rebuild requirement (PMO-LOCKED).** Any change to the world generator, an archetype, a species physiology, a trait mechanic, an engine rule,
a scenario mechanic, a Challenge recipe / version, (036D1) a Challenge's completion definition or the validator / proof contract makes the affected cells stale: rebuild with
`node tools/build-challenge-seed-bank.mjs --per-archetype 160 --workers 8` (~38 min on 8 workers) and commit the regenerated `content/challenge-seed-banks.js` + `docs/evidence/bloom-036b/seed-bank/`
with the change. `challenge-world-check` B1 fails on a stale bank. Checklist: [`DEVELOPMENT_NOTES.md`](DEVELOPMENT_NOTES.md) § "Change checklist —
Challenge seed banks". Release bank (bank v1): 12 cells × 50, 312 145 bytes, sha256 `dcca6d8ff53e7cbb032bcdf0d0dae81fc0b4660ada008ce08894d6d4ed6871ba`. 036C1: 14 cells, sha256 `5cd2e385…`.
**036D1 (format 2, validator @2): 15 cells × 50 = 750 entries, 400 847 bytes, sha256 `8506124b462cf4d47710a1eb37806ddead9dd3f600c28c36cfcfd071fda59e40`**,
inputs `cf96f14e470882d7` — a full honest rebuild (`--workers 14`, ~70 min on this machine); the 14 released cells' 700 entries are byte-identical to
036C1's (only provenance changed); `thin_air/woolly_candle` is the one new cell (25 Desert + 25 Ocean).

## 5. The Challenge instance (format 2, `source: "seed-bank"`)

Canonical Challenge (id, version, recipe version, recipe key), scenario, canonical species (+ policy), launch seed, `bank { cellKey,
bankVersion, entryIndex, entries, validator }`, starting state, the EXACT planet object + fingerprint + World Seed + archetype, the bank's proof
summary (S2, layer P — `offline: true`), the dossier. `BLOOM.gameSession.challengeRun(instance)` re-checks it against the current catalogue and
refuses a 036B live-search instance (format 1), another Challenge / recipe / bank version, a foreign object, another starting state or an
unproven planet — and (036D1) an instance whose completion contract (`instance.completion.fingerprint`, checked against the cell at
`makeBankInstance`) is not the Challenge's current one. The run / report provenance carries source, Challenge / recipe / bank versions, cell, entry,
launch seed, planet seed and fingerprint, species, scenario, starting state and the completion contract. `expeditionRun` refuses a Challenge.

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
  instance for validation and QA. (036C1) A prescribed start also says what it **closes** for the run ("Drought Adaptation is not available: a
  plant commits to one water strategy — Flood is already chosen.") — the hub's How the run works says the same; and when under **5 %** of the
  land suits the plant at landing, the true share is kept and one line explains it: "Little or none of this world suits your plant yet: your
  landing region keeps it alive at first. Adapt before you spread." (presentation only; validation unchanged).
- **Completion contract** (036D1, gated Challenges only — §2.5): the hub card's chip "Bloom in the final atmosphere"; **To win** first in the hub
  dossier and the Challenge Planet Dossier; the run's one condition line in the pressure panel and the HOLDING badge during an early Bloom; the
  report's FINAL ATMOSPHERE ✓ card. With six Challenges the hub's card list scrolls on its own at 1024 × 768 (a card is visibly cut at the list's
  edge); the keyboard-selected card is scrolled fully into view (`scrollIntoView({ block: "nearest" })` — Firefox's `focus()` alone left a partly
  visible card cut off).
- **Run / Report:** "Challenge · <name>", challenge debrief, the summary "… in the <name> Challenge …" (036C1: the Challenge, not only its scenario),
  the scenario's final state, "Given by the Challenge at landing: …" for a prescribed start with the given tiers marked *given* on their chips,
  KEEP PLAYING · RETRY CHALLENGE · CHALLENGES · MAIN MENU.

## 8. Deferred

Any completion condition type beyond `pressure-final-state` (036D1 implements exactly one; the study rejected Hearthfire's warming, Windfall's
never-Critical and Oasis Line's former-native regions) · bank variety
beyond 50 · default-rules Challenges (the schema refuses `default`) · medals, scoring, difficulty tiers, unlock trees, campaign progression (not
planned without explicit approval).

## 9. Authored Challenges (BLOOM-036C1, IMPLEMENTED / COMPLETE)

From the PMO-accepted content study ([`CHALLENGE_CONTENT_STUDY_v1.md`](CHALLENGE_CONTENT_STUDY_v1.md) §6.1, §6.2, §11):

| Challenge | Scenario | Species | World recipe | Starting state | Bank |
|---|---|---|---|---|---|
| **Low Tide** (`low_tide` v1) | Dying World | prescribed Organic Hybrid | Ocean Archipelago only | Flood Adaptation + Salt Handling given · normal Biomass | `low_tide/organic_hybrid` × 50 |
| **Oasis Line** (`oasis_line` v1) | Native Competition | prescribed Reed Spire | Desert World only · **no arrival floor** | normal | `oasis_line/reed_spire` × 50 |

- **Several Challenges per scenario.** A Challenge references a scenario; it is never identified by it. Low Tide and Dying World both play
  `dying_world`, Oasis Line and Native Competition both play `native_competition`, yet each has its own id, name, version, recipe, bank cells
  (keyed `<challenge>/<species>`) and instance / run / report provenance. The builder makes cells only for the species a Challenge allows (a
  prescribed plant = one cell).
- **What a start closes.** `BLOOM.challenges.closedByStart(ch)` — the plant traits the engine would sell from a normal start but not from the
  prescribed one (Low Tide: Drought Adaptation, by the one-water-strategy rule) — decided by the engine's own `canBuy` / `why`, never a list.
- **Versioning of copy edits.** A Challenge's `version` is the definition's revision, presentation included, and each bank cell's provenance
  carries `challengeVersion`; the 036C1 copy corrections therefore made Native Competition and Volatile Climate **version 4**, and their cells were
  **rebuilt** (stale-bank protection kept, no bypass). The rebuilt cells hold the same worlds with the same proofs (only the provenance changed).
- **Windfall: HOLD** (the focused recalibration did not pass the premise gate) · ~~Thin Air: RESERVE~~ → **Thin Air: released in 036D1** with a
  completion condition (§10).
- **REFUGE — the protected landing refuge (PMO presentation rule).** When the run's ORIGIN region's own ground would be Blocked but the engine's
  landing-refuge rule (`config.categories.originFitnessFloor`) is what keeps the plant alive there (the protected fitness is above both the
  unprotected one and the die-back threshold), the region's status chip says **Refuge** (shield; "Protected landing refuge: this ground does not
  suit your plant yet, but your landing region keeps it alive while you adapt.") instead of Blocked; the **Origin** marker and the real limiting
  condition ("Limiting: Water · too dry") stay. Derived every time from the real evaluation (`run-ui-adapter` `refuge`): once Adapt / Terraform
  make the ground suit the plant, or the protection no longer keeps it alive, the ordinary status takes over. Non-origin regions keep **Blocked**.
  Presentation only — fitness, spread, establishment, origin protection, validation and banks unchanged. Applies wherever the rule holds
  (Challenges, Expedition, Training alike); it reinforces the dossier's low-arrival line.

## 10. Thin Air — the first Challenge with a completion condition (BLOOM-036D1, CANDIDATE)

From the PMO-accepted completion study ([`CHALLENGE_COMPLETION_STUDY_v1.md`](CHALLENGE_COMPLETION_STUDY_v1.md) §3) and the 036C content direction:

| Challenge | Scenario | Species | World recipe | Starting state | Completion | Bank |
|---|---|---|---|---|---|---|
| **Thin Air** (`thin_air` v1) | Dying World | prescribed **Woolly Candle** (Cold-hardy) | Desert World + Ocean Archipelago (no Frozen) | normal (nothing owned) | Bloom **AND** `pressure-final-state` | `thin_air/woolly_candle` × 50 (25 Desert World + 25 Ocean Archipelago, 310 of the 320 Desert / Ocean pool worlds qualified) |

- **Same worlds, a different contract.** The released Dying World × Woolly Candle cell plays the same scenario and plant; under plain Bloom
  most Desert runs finish before the decline does. Thin Air makes the final atmosphere the finish line: the Bloom counts only once the decline has
  finished, so every run lives through the reversal (the cooling that suits the candle, the drying that does not). Physical worlds may overlap
  the Dying World cell: it is a distinct Challenge contract, so a distinct cell with its own provenance.
- **Prescribed plant, nothing prescribed after landing.** Hub → BEGIN CHALLENGE → the prepared Woolly Candle world → the dossier (no Species
  Selection). Adapt and Terraform are fully open (Heat Tolerance is not locked: the player may adapt, terraform, wait for the cooling or combine).
- **Early Bloom** (coverage ≥ the threshold before the final atmosphere): no stop, no report, not won — the HUD says "BLOOM REACHED — hold it until
  the atmosphere settles." with the real time left (the pressure clock), the badge reads HOLDING, the log explains; if coverage falls back, the line
  shows the decline and the Bloom share; once the decline is complete and coverage is short, "Final atmosphere reached · regain Bloom". An early
  Bloom can still end in **EXTINCTION** (extinction stays live until the true completion): the debrief says the Bloom came before the atmosphere
  finished changing and the plant did not survive — never that the run had been won.
- **True completion:** the first tick with coverage ≥ the threshold in the final atmosphere → `sim.won`, `onWin` once, the report with FINAL
  ATMOSPHERE ✓ ("You held n% of the land in the final atmosphere." + when Bloom was first reached and when the atmosphere settled). Keep Playing is
  the ordinary post-win play.
- **Offline proof.** For every retained entry the builder asserted, from the layer-P witness evidence (every proven strategy's hold record and
  every confirmation run's), that **coverage ≥ winAt while pressure.progress === 1**, and recorded it in `proof.completion` (`proves`, `runs`,
  `winAt`, `minHoldCoverage`, `minHoldProgress` = 1, `holdSeconds` ≥ `finalAtSeconds` = 290). The witness's hold check (max(margin, final state) + 60 s)
  is stronger than the runtime condition; it is still asserted explicitly, never inferred from "Dying World passed".
- **Copy.** Tagline "As the atmosphere thins, the world cools, dries and brightens with radiation — conditions Woolly Candle was built to endure.";
  briefing, strategic idea as the PMO set them; science: high-mountain giant rosettes (frailejones), cold nights, dry winds and strong ultraviolet
  radiation; woolly leaves and protective pigments; "Strange Bloom uses a simplified changing-atmosphere model" (no claim that BLOOM simulates oxygen
  or air pressure).
- **The other five Challenges** keep `conditions: []` (ungated: the session gives the engine no gate) and are mechanically and textually unchanged;
  the bank migration rebuilt their cells' provenance only — their 700 entries are byte-identical to 036C1's (`challenge-completion-check` K6).

