# Strange Bloom · Unknown Soils — Challenges system v1

**BLOOM-036A — Challenges foundation + first playable hub.** Status: **CANDIDATE** (review branch `handoff/bloom-036a-review`; not in
production `main` until the PMO integrates it). Current product direction: [`PRODUCT_DIRECTION_CURRENT.md`](PRODUCT_DIRECTION_CURRENT.md) §8.

Code: [`content/challenges.js`](../content/challenges.js) (the definitions) · [`resources/bloom-challenges.js`](../resources/bloom-challenges.js)
(`BLOOM.challenges`: validation, resolution, freezing) · [`resources/challenges/`](../resources/challenges/) (the hub) · the survey's scenario
layer in [`resources/destination-survey/survey-data.js`](../resources/destination-survey/survey-data.js) /
[`sector-pool.js`](../resources/destination-survey/sector-pool.js) · the flow in
[`resources/main-menu/expedition-entry.js`](../resources/main-menu/expedition-entry.js) and
[`resources/app/app-controller.js`](../resources/app/app-controller.js) · the run in [`resources/run/game-session.js`](../resources/run/game-session.js).
QA: [`tools/challenges-check.js`](../tools/challenges-check.js). Record: [`evidence/bloom-036a/REPORT.md`](evidence/bloom-036a/REPORT.md).

---

## 1. Challenge vs scenario

| | **Scenario** (`content/scenarios.js`) | **Challenge** (`content/challenges.js`) |
|---|---|---|
| What it is | simulation mechanics the engine runs (`createSim(…, { scenario })`) | a product definition: what the player is offered on the CHALLENGES hub, how a run is launched, how it is completed |
| Holds | pressure clocks, channels, phases, competition, climate instability, loss, layer-P validation policy, the player-facing display copy | id, version, status, name, presentation, **a reference to one scenario**, launch policies, completion |
| Engine code? | read by `resources/bloom-sim.js` / `bloom-scenario.js` | **no** — the engine never reads a Challenge |

A Challenge never restates or overrides its scenario. `BLOOM.challenges.check()` refuses any scenario-mechanics key at any depth of a
Challenge definition (`MECHANICS_KEYS`), the default scenario, an unknown scenario or a retired alias. Player-facing copy is either a
**reference** to the scenario's own display copy (`"@scenario.display.card.tagline"` …, resolved at load — the scenario stays the source of
truth) or text the scenario does not have; a verbatim copy of scenario text is refused ("reference it instead"). The run plays
`BLOOM.challenges.scenarioOf(challenge)` — the catalogue's own scenario object through the engine's own resolver.

## 2. Schema (v1, `BLOOM.challenges.SCHEMA_VERSION = 1`)

```js
{
  id: "dying_world",            // stable lower_snake id — run provenance, report; never renamed
  version: 1,                   // the definition's revision
  status: "released",           // 036A: the only status; the hub lists released Challenges in content order (not a ranking)
  name: "Dying World",
  short: "@scenario.display.card.tagline",
  scenario: "dying_world",      // a real, non-default scenario with mechanics
  presentation: {
    tagline: "@scenario.display.card.detail",      // what changes
    briefing: "@scenario.display.summary",
    strategicIdea: "@scenario.display.card.cue",
    icon: "pressure",                              // a shared-icon key: the gameplay's scenario glyph (pressure · competition · climate)
    science: "@scenario.display.channels",         // text, a reference (a channel map becomes a list) or null
  },
  launch: { species: "player-choice", world: "destination-survey", startingState: "none", seed: "sector" },
  completion: { win: "bloom", conditions: [] },
}
```

Resolved (`BLOOM.challenges.resolve(id)`): one deep-frozen object per id with the references resolved (`presentation.science` text or
`presentation.sciencePoints`), `schema`, and `sources` (where each copy field came from). An unknown id throws `UNKNOWN_CHALLENGE` — never a
silent Expedition.

### 2.1 Copy rule

No difficulty ranking anywhere: no Easy / Medium / Hard, no stars, scores, tiers or recommended skill (`FORBIDDEN_COPY`, checked on every
resolved string). The hub's cards are equal in size and weight. Inside a Challenge the species screen drops Organic Hybrid's "Recommended
first expedition" note (it speaks about Expeditions).

### 2.2 Launch / completion — 036A values only

| Policy | 036A value | Meaning |
|---|---|---|
| `launch.species` | `player-choice` | the normal Choose Plant Species screen; every released species stays open |
| `launch.world` | `destination-survey` | the species-relative Destination Survey; every offered world also proven under the scenario (§3.2) |
| `launch.startingState` | `none` | nothing owned at landing, the normal starting Biomass |
| `launch.seed` | `sector` | the survey's sector-seed stream: normal physical planet generation |
| `completion.win` | `bloom` | the normal Bloom win (the planet's own threshold) |
| `completion.conditions` | `[]` | reserved — Challenge-specific conditions are BLOOM-036B+ |

Any other value is **refused** by `check()` until it is implemented — the schema can never describe something the game would ignore.

## 3. Flow

```
MAIN MENU → CHALLENGES → Challenge hub → BEGIN CHALLENGE
          → Choose Plant Species (all released species; the kicker names the Challenge)
          → Destination Survey (for that species AND that Challenge's scenario; "Begin challenge")
          → Run (the Challenge's scenario) → Bloom / Extinction report ("Challenge · <name>")
```

All of it inside `index.html` (one document; no new production HTML, no navigation). The hub module is loaded lazily on the first
CHALLENGES (served: `import()`; `file://`: the portable runtime's module seam, `resources/portable/portable-entry.js`). The Challenge
catalogue and its resolver load with the title's classic scripts (`resources/main-menu/title-boot.js`).

### 3.1 Transport

The Challenge is **application state**, exactly like the species: `ExpeditionEntry.challenge` (the resolved object) → the survey's
`challenge` option → the Begin detail's `detail.challenge` (the same object; the app refuses a detail whose Challenge is not the flow's) →
`BLOOM.gameSession.expeditionRun(detail)` → `run.challenge` + `run.scenario`. No query string, no sessionStorage, no localStorage, no
`window.name`.

### 3.2 World / Survey policy (036A)

**Normal physical planet generation + the chosen species' evaluation + the chosen scenario's validation.** One world system with a third
cached layer (`survey-data.js`, `sector-pool.js`):

| Layer | Key | What |
|---|---|---|
| physical | `${archetypeId}:${seed}@w${WORLD_GEN_VERSION}` | the validated world (default scenario, layers 1–8) — species- and scenario-free, one planet object |
| species evaluation | `…\|${physiologyKey}` | class, dossier, S2 winnability for the species |
| **scenario validation** (036A) | `…\|${physiologyKey}\|s:${scenarioId}` | the engine's layer P (`BLOOM.validateScenario`) on that same planet object **with that species** |

A world is offered under a Challenge only if it belongs in its column for the species (class + S2) **and** layer P passes; layer P runs only
for such a world. A world that fails is simply not offered under that Challenge (`scenarioRejected`) — the planet is never regenerated,
mutated or re-rolled, and its identity never depends on art, species or scenario. The sector stream is the Expedition's: a Challenge
survey reuses the title's prefetched pool **and its sector seed**, so the expensive physical validations are shared (the same planet
objects) and only the species / scenario layers are new. Measured on sector 77 (Node, Woolly Candle): the Dying World sector reused 9/9 of
the Expedition sector's planet objects.

Interim note: the locked BLOOM-036 shape (PRODUCT_DIRECTION §8) says a Challenge ultimately generates ONE fresh qualifying planet from its
own recipe with **no** 3 × 3 survey. 036A deliberately uses the existing survey (PMO directive) — the recipe-driven single planet is 036B.

## 4. State invariants

| Action | Challenge | Scenario | Species | Planet |
|---|---|---|---|---|
| a Challenge run | the chosen object | its scenario (the catalogue's object) | the chosen object | the survey's exact object |
| **Play Again** | same | same | same | **same object**, a fresh session + simulation |
| **Choose Another Planet** | same | same | same | that Challenge's survey (a new sector) |
| **Change Species** (survey) | same | same | the new one | the **same sector seed** and pool, re-evaluated (species + scenario) |
| Back from Choose Plant Species | same (hub, selected) | — | — | — |
| **Main Menu** (run, survey, hub) | **cleared** | — | — | — |
| **EXPEDITION** | none | `default` | chosen | a survey with no scenario provenance |
| **TRAINING** | none | `default` | Organic Hybrid | the training world |

`expeditionRun` cross-checks the provenance: a Challenge run needs a candidate proven under **its** scenario
(`candidate.scenarioId` + a passing `scenarioValidation`) and the canonical Challenge object; an Expedition candidate carrying scenario
provenance is refused (no residue).

## 5. Hub, run and report

- **Main menu:** EXPEDITION · **CHALLENGES** · TRAINING · SETTINGS · CREDITS — a chunky icon + word button with the shared `challenge`
  glyph (a pennant: a destination with a purpose, not a rank). `MainMenu` renders CHALLENGES only with its hook — never a disabled or
  "coming soon" entry.
- **Hub** (`ChallengeHub`): the night planning language. Desktop: the three Challenges as a radiogroup of cards (scenario glyph + name +
  one line + what changes) and the selected one's dossier (briefing · What changes · Strategic idea · the science / why it happens · How the
  run works) with BEGIN CHALLENGE at its foot; selecting a card updates the dossier. Phone (≤ 700 px): one vertical list; a card opens its
  dossier as a sheet with BEGIN CHALLENGE pinned. Keyboard: ← → ↑ ↓ Home End, Enter / Space open the dossier (focus on its heading),
  Escape closes it, Escape again returns to the title. Reduced motion: nothing animates.
- **Survey:** the title kicker names the Challenge (glyph + words, also on a phone); the primary action reads "Begin challenge"; the
  dossier's seed line adds "proven for <Challenge>".
- **Run:** the HUD's identity line reads "Challenge · <name>", the footer "Challenge · <name> · <world> · World Seed n"; the scenario's
  existing status card, map feedback and messages run unchanged (reused, not redrawn).
- **Report:** the fact card "Challenge · <name>" (with the scenario's glyph) replaces "Scenario"; the kicker reads "challenge debrief";
  the scenario's own final-state section follows as before. An Expedition keeps "Scenario · None".
- **Specimen environment:** it reads the real region sky, so a Challenge shows only what its simulation does — Dying World's drift dries /
  cools the scene, a real Volatile Climate shock moves it; Native Competition adds nothing to the specimen box (no fake native plants).

## 6. Deferred to BLOOM-036B+ (explicitly not in 036A)

Prescribed / locked species · starting owned adaptations · special starting Biomass · Challenge-specific authored or recipe-generated
planets (one fresh qualifying planet, no survey) · bespoke win thresholds and completion conditions · medals · scoring · difficulty tiers ·
unlock trees · campaign progression. The schema leaves room for them (new `launch` / `completion` values), and `check()` refuses each until
it is implemented.
