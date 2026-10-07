# Training Foundation v1 — contracts for the tutorial layer (BLOOM-028D1)

**From:** BLOOM-028D1 · **For:** the Tutorial workstream (028D2: coaching callouts / spotlight / step logic) and the Main PMO.
Evidence and QA: `docs/evidence/bloom-028d1/REPORT.md`, suite `tools/training-check.js` (the 23rd).

The title's **TRAINING** now opens a real, paused training run on the ordinary run page, on a hand-made world, and comes
back through the same fade. This document fixes what the tutorial layer builds on: the URL, the events, the anchors, the bubble
hook, the training config and the status store.

> **BLOOM-028D2 (production):** the guided coach is built on exactly these contracts — `docs/GUIDED_TRAINING_v1.md`. Thirteen
> outcome-driven lessons on the production UI (the player acts; the coach observes the events below, reads the adapter, re-finds the
> anchors and places the one scripted bubble), the first-run "Recommended" tag and prompt on the title, one confirmation before a
> skip, and Begin Expedition · Restart training · Main menu on the finished training (no Keep playing). The training config, the
> world, the events, the anchors and the store are unchanged.

---

## 1. Files

| | owns |
|---|---|
| `planets/training_grounds.js` | the authored **Training Grounds** (§2) |
| `content/training.js` | `BLOOM_DATA.training`: planet id, RNG seed, config overrides, default return page, the training menu copy |
| `resources/bloom-play.js` | + `deriveConfig(base, overrides)`, `trainingQuery({ planet, returnTo })`, `safeReturn(value, here, fallback)` |
| `resources/bloom-sim.js` | + `sim.placeBubble(tile)` — generic, no randomness (§6) |
| `demos/demo-run.html` | `planet=` / `training=1` / `return=` boot; paused start; the training menu; `bloom:*` events; `data-tutorial` anchors; `BLOOM_RUN_UI.placeBubble` |
| `resources/training/training-run.js` | the training page's own layer (ES module, training mode only): arrival / exit fades, Restart / Skip / Main menu, status on a win |
| `resources/training/training-store.js` | the training status (§8) |
| `resources/main-menu/black-fade.js` | the 028C1 fade through black, now shared by `ExpeditionEntry` and the training page (same timings, easing, motion rule) |
| `resources/main-menu/expedition-entry.js` | + `leaveTo(href)`, `trainingHref` option, back-forward-cache restore |
| `demos/main-menu.html` | passes `trainingHref` (TRAINING → the training run, `return=` this page) |

Not touched: `content/config.js`, `content/traits.js`, `planets/first_bloom.js`, the generator, the validators, the survey,
the sphere, the transition, `MainMenu`, root `index.html`.

## 2. Training Grounds

48 × 32, six regions, all land, Eden (no scenario), win at **65 %**. Sky +8 °C, moisture 50. The base plant suits −6…+24 °C,
moisture 32…68 and salinity ≤ 15; a region grows when its fitness is above 0.55.

| region | ground | at the landing | answers |
|---|---|---|---|
| **Landing Meadow ★** | +14 °C · 50 | origin, thrives | — |
| **Green Verge** | +12 °C · 56 | open; the plant fills it on its own | — (spread) |
| **Chill Hollow** | −12 °C | **too cold** (0.40) | Cold Tolerance ×1 · or Warm the Sky ×1 |
| **Thirsty Flats** | moisture 24 | **too dry** (0.33) | Humidify ×1 · or Drought ×1 |
| **Reed Fen** | moisture 64 | wet but fine | Humidify: worse, still grows (0.67) · Drought: closes it (0.08) |
| **Salt Pan** | salinity 80 | **hostile soil**, not terraformable | Salt Handling (never needed) |

Measured with the real engine (6000 ticks, `tools/training-check.js` T3). These plateaus are the same for every seed:

| build | nothing | Cold only | Humidify only | Cold + Humidify | Cold + Drought | Warm + Humidify |
|---|---|---|---|---|---|---|
| plateau | 39 % | 60 % | 59 % | **80 %** | **72 %** | **80 %** |

- One answer alone is never enough.
- Either pair of answers wins, with room to spare.
- The hostile region is never required.
- The shop preview tells the same story (T2c): Cold opens Chill Hollow; Humidify opens Thirsty Flats and closes nothing;
  Drought opens it but closes Reed Fen.

## 3. Training URL contract

```
demos/demo-run.html?training=1[&planet=<authored id>][&return=<url>]
```

- **`training=1`** opens the training world. That is `BLOOM_DATA.training.planetId` (`training_grounds`) unless `planet=` names
  another authored world. It always starts **paused** (the ▶ play button reads "▶ play"; no tick runs until the player
  presses it).
  - It always runs **Eden**.
  - It uses the **derived training config** (§5) and a **seeded RNG** (`mulberry32(BLOOM_DATA.training.rngSeed)`).
  - It uses player wording, the ☰ **Training** menu (*Restart training · Skip training · Main menu*), and the training layer.
- **`return=`** is where Skip, Main menu and a finished training go back to.
  - It is resolved against the run page (`BLOOM.play.safeReturn`) and is **same origin only**. Another site, `javascript:`,
    `data:` or an unparsable value falls back to `BLOOM_DATA.training.returnTo` (`main-menu.html`, the new title page).
  - The title passes its own URL (query included), so the player comes back to exactly the page they left.
- **Explicit failures**, never a substitute world:
  - `training=1` with `archetype=` / `seed=` / `scenario=`
  - an unknown `planet=`
  - `planet=` with `archetype=` / `seed=`
- **`planet=<id>` (generic, 028D1)** opens any authored world as an *ordinary* run: running, on the shared config, with live
  randomness. Without `planet=` the authored world is First Bloom, byte-for-byte as before. In play mode, Play again keeps
  `planet=`.
- **Building the URL:** `BLOOM.play.trainingQuery({ planet, returnTo })` → `training=1&planet=…&return=…`.

## 4. Entry and exit

- **TRAINING** (`ExpeditionEntry({ trainingHref })` → `leaveTo(href)`): the menu goes inert, the black fades in (220 ms;
  reduced motion 80 ms), then navigation. An `onTraining` hook, if given, still overrides it. Without either hook, the
  placeholder dialog is unchanged.
- **Arrival:** the run page puts `#trainingCover` (full black) up before its first paint. The training layer lifts it
  (250 ms; reduced motion 80 ms) after the run's first two frames. If the layer cannot load (file://: ES modules are refused
  there), the run page drops the black by itself after 2 s.
- **Exits** (☰ menu, and the report after a win). No confirm: nothing is lost in training. (028D2: a *guided* training asks once
  before **Skip** — a production dialog shared by the coach's Skip Tutorial and the menu; Restart / Main menu still ask nothing.)
  - **Restart training:** black → the same URL as a fresh page (a paused landing, tick 0).
  - **Skip training:** records `skipped` → black → `return=`.
  - **Main menu:** black → `return=`. Nothing is recorded.
  - Over file://, these navigate without fade or status.
- **Win:** `bloom:win` → the status is recorded `completed`. The report heads "TRAINING COMPLETE" and offers (028D2)
  *Begin Expedition · Restart training · Main menu*; "Keep playing" is no longer offered after training. Begin Expedition fades to
  the title with `begin=1`, which enters the Destination Survey at once.
- **Motion:** both pages read the title's Settings choice through `main-menu-data.js` (`readSettings` → `reducedMotionFor`),
  else the OS.
- **Back / Forward:** a page restored from the back-forward cache after leaving through its black lifts it again, and the
  title takes input again.

## 5. Training config

`BLOOM.play.deriveConfig(BLOOM_DATA.config, BLOOM_DATA.training.config)` makes a fresh deep copy. The shared config object is
never touched, and an override of a key the config does not have (or of the wrong kind) is refused. The four overrides are:

| setting | normal | training | why |
|---|---|---|---|
| `econ.startBiomass` | 100 | 150 | the first Adapt answer (140) is affordable at the landing |
| `econ.originTrickle` | 0.3 | 0.6 | the home colony pays for the lessons (replaces the bubble income) |
| `econ.bubbleChance` | 0.011 | 0 | no random bubbles: every bubble is placed on purpose (§6) |
| `econ.bubbleAutoTicks` | 60 | 375 | a placed bubble waits ~60 s for the player before it collects itself |

Prices, traits, thresholds and growth are the normal ones. **Seeded:** the same actions on the same ticks give the same run,
tile for tile (T5a, B1d). Ordinary runs keep `Math.random` (B3c).

## 6. Bubbles on purpose

- **Engine:** `sim.placeBubble(tile)` puts a bonus bubble on a Living land tile, one per tile, and returns false for anything
  else. It draws no randomness, so the run stays tile-for-tile the same. The bubble then behaves exactly like a rolled one.
- **Page:** `BLOOM_RUN_UI.placeBubble(sectionId?)` → tile or −1. It places on the Living tile of that region (default: the
  origin) nearest the region's centre, and redraws.
- **Biomass:** placing a bubble grants nothing by itself. Biomass arrives only when the bubble is collected (click: +25;
  auto: +12.5). The run page still has exactly one direct Biomass grant (the QA hook; economy-check 3).

## 7. Event contract

`CustomEvent("bloom:<type>")` on **`document`**, dispatched at the real action point **after** the action took effect.
`detail` is plain data. Fired in every run, training or not; nothing listens in an ordinary run. Region fields are
`{ index, id, name }` (`index −1`, `id null` when none).

| type | fired by | detail |
|---|---|---|
| `run-ready` | the run started (UI built, first frame queued) | `{ planetId, kind, training, running }` — also `BLOOM_RUN.started = true` for late listeners |
| `play-pause` | the ⏸ / ▶ button | `{ running }` |
| `speed` | the speed button | `{ speed }` (1, 2, 4) |
| `region-select` | a map click that is not a bubble | `{ index, id, name, previous, water, tile }` — clicking the selected region again deselects (`id null`) |
| `upgrade-preview` | hover / focus of an upgrade button | `{ id, board, name, available, gain, lose, better, worse, reachHostile }` (region ids); `available false` = not buyable now. A hover then a click may send two |
| `upgrade-purchase` | a successful global purchase | `{ id, board, name, cost, tier, biomass }` — none for a refused click |
| `growth-focus` | a growth-focus button that took | `{ index, id, name, focus, previous, changed }` |
| `local-upgrade` | a successful local upgrade | `{ index, id, name, upgrade, upgradeName, cost }` |
| `bubble-collect` | a bubble clicked, or one that collected itself | `{ how: "click" \| "auto", tile, index, id, name, value }` (auto: checked once a frame) |
| `win` | the tick that crossed the win line | `{ coverage, ticks, planetId, training }` |

Purchases through the QA hook `BLOOM_API.buy` emit too (the event lives in `buy()`); `BLOOM_API` is for QA only.

## 8. Training status

`resources/training/training-store.js`; `localStorage["strange-bloom.training"] = {"v":1,"status":"completed"|"skipped","at":<ms>}`.

- `readTraining(storage)` → `{ status: null | "completed" | "skipped", at, v }`. Junk, another version, no storage or throwing
  storage all read as none, and it never throws.
- `writeTraining(storage, status)`: "completed" is never downgraded to "skipped".
- `clearTraining(storage)`.
- Bump `TRAINING_VERSION` to offer a rewritten training to everyone again.
- (028D2) The first-run prompt and the "Recommended" tag on TRAINING read this: no record → the tag + one prompt on the first BEGIN
  EXPEDITION ("Go to Expedition" writes `skipped`; "Start Training" writes nothing). `docs/GUIDED_TRAINING_v1.md` §3.

## 9. Anchors (`data-tutorial`)

Stable names for the tutorial's callouts. Dynamic panels are re-rendered, so a callout re-finds its anchor by selector and
never keeps the element.

- **Header:**
  - `biomass` · `coverage` · `sky` · `play-pause` · `speed` · `run-menu` (☰)
  - per action: `action-<id>`, where id is `restartTraining`, `skipTraining`, `mainMenu` (or the play-mode ids)
- **Map:** `map` (the canvas; regions are drawn, not elements — use `BLOOM_API.geometry().centers` or `sim.map.CENT × TILE` and
  the canvas rect)
- **Inspect panel:**
  - `inspect` · `readout` (the four lamps) · `limiting-factor` · `colony-status` · `raw-signals`
  - `growth-focus`, with `focus-balanced` / `focus-roots` / `focus-leaves` / `focus-seeds`
  - `local-upgrade`, with `local-rootNetwork` / `local-leafCanopy` / `local-seedReserve`
- **Shop:** `upgrades` · `board-spread` / `board-adapt` / `board-terraform` · `upgrade-<trait id>` (e.g. `upgrade-cold`,
  `upgrade-humid`)
- **Footer / report:** `message-log` · `report` · `report-continue` · `run-actions`
- **Production Planet View (BLOOM-029B; the default UI since BLOOM-029E):** `biomass`, `coverage`, `sky`, `play-pause`, `speed`, `run-menu` (+ its
  `action-*`), `map`, `message-log`, `inspect`, `readout`, `limiting-factor`, `colony-status` resolve to the new controls (one element
  each; the hidden shell's copies become `data-tutorial-legacy`); new `map-view`, `scenario-status`. `docs/PRODUCTION_PLANET_VIEW_v1.md` §7.
- **Production rooms (BLOOM-029C):** `raw-signals`, `growth-focus` + `focus-*`, `local-upgrade` + `local-*` resolve to the
  Region Inspect room; `upgrades`, `board-adapt`, `board-spread` and every Adapt / Spread `upgrade-<id>` to the Adapt / Spread rooms (one
  element each, mounted while closed; the shell's copies become `data-tutorial-legacy`). **BLOOM-029D:** `board-terraform` and the
  Terraform `upgrade-warm/cool/humid/dry` resolve to the Terraform room the same way (`docs/PRODUCTION_TERRAFORM_ROOM_v1.md` §13);
  **BLOOM-029E:** `report`, `report-continue`, `run-actions` resolve to the production report (`resources/run-ui/run-report.js`:
  the section, its Keep playing button, its actions group), present from mount; `action-*` on its run actions while it is open (the run
  menu's copies suspended meanwhile). Under the default UI every anchor above resolves to exactly one production element; the hidden shell
  keeps only `data-tutorial-legacy` copies. Complete table: `docs/GAMEPLAY_UI_CONVERGENCE_v1.md` §10.
  `docs/PRODUCTION_PLANT_ROOMS_v1.md` §11. Room navigation is presentation state (no new event); 028D2 integration decides its contract.

## 10. Notes for 028D2 (resolved in `docs/GUIDED_TRAINING_v1.md`)

- **Biomass top-ups.** "Expedition supplies" would be a *second* page-side Biomass grant, which economy-check 3 forbids. Give
  them a declared, reported channel, or raise `content/training.js` numbers instead.
- **Pausing.** Training starts paused; a step that waits for spread must ask the player to press ▶. `running` is a page `let`,
  so a tutorial should press the real button, or ask for a small explicit setter.
- **Pacing.** The derived config is generous: about 4.9 Biomass/s once Meadow and Verge are established. Tune the data, not the
  engine.
- **Layout.** (Updated by 029E) The run page is the production Planet View + rooms + report by default; every anchor name was kept and
  re-homed (`docs/GAMEPLAY_UI_CONVERGENCE_v1.md` §10). The shell exists only behind `?ui=legacy`.
- **Integration.** TRAINING lives on `demos/main-menu.html` (the title's dev page). Root `index.html` integration is still the
  PMO's.
