# Strange Bloom · Unknown Soils — release state v1

**The canonical inventory of what the released game is.** Written by BLOOM-037 (final hardening). The product is **frozen**: nothing below
is added to without a new, explicit PMO decision. Where an older document disagrees with this file about *what ships*, this file wins;
[`PRODUCT_DIRECTION_CURRENT.md`](PRODUCT_DIRECTION_CURRENT.md) holds the decisions and their history, and `docs/evidence/` what happened at
each milestone. Release QA record: [`evidence/bloom-037/REPORT.md`](evidence/bloom-037/REPORT.md).

**Released:** production `main` **`2c491f1`** (BLOOM-037, 2026-10-13), live at <https://interstellarharvest.github.io/bloom/> through the GitHub
Actions Pages workflow. Everything below describes that release.

**Current production: `77a972e` (BLOOM-040, 2026-10-24), live** (Pages run 40061546667). BLOOM-040 is presentation / navigation only: Edge Assemble
between the map and the plant workspace (header from the top · specimen from the left · work panel from the right; the reverse on Back), the
specimen fixed across Regions / Adapt / Spread / Terraform in one canonical geometry (Terraform included), the specimen scene filling its box,
clearer rain and snow (weather is never a transition device), the home selection kept while a room is open, the Bloom / Extinction report as a
quiet crossfade (no page navigation uses the mist), and the Training anatomy lessons showing the full canonical plant (no ghost dither) — no
mode, species, Challenge, bank, mechanic or balance change. Record: [`evidence/bloom-040/REPORT.md`](evidence/bloom-040/REPORT.md).

*Previous production: `c1b5171` (BLOOM-039, 2026-10-14)* (Pages run 38673127447). BLOOM-039 is presentation / shell only on top of the
v1 release described here — no mode, species, Challenge, bank, mechanic or balance changed. It adds: ONE aggregate region-state vocabulary
from the engine's grow rule (OK · STRAINED · BLOCKED · REFUGE, locked in [`PRODUCT_DIRECTION_CURRENT.md`](PRODUCT_DIRECTION_CURRENT.md));
multi-step "Would help" with real prices; Native Competition legibility (competition reason, native ownership mark, Your plant / Natives
Terraform preview, FRONT STALLED cue); hidden-tab / sleep suspension; the selected-region panel's collision placement; region-name pills
that select their region; and a 1920 px maximum application width (centred, passive wells; the title painting full-bleed). Record:
[`evidence/bloom-039/REPORT.md`](evidence/bloom-039/REPORT.md).

## 1. Modes

The title (`index.html`, one of twelve paintings) offers **EXPEDITION · CHALLENGES · TRAINING · SETTINGS** (v1.0.1: no CREDITS entry; attribution stays in the README and the vendored licences). The whole game is that
one document: no screen opens another page, the address never changes, and a reload returns to the title.

| Mode | What it is | Rules |
|---|---|---|
| **EXPEDITION** | the procedural sandbox: a fresh, proven-winnable world from a live 3 × 3 Destination Survey | `default` (no pressure scenario, no extinction loss) |
| **CHALLENGES** | six authored, contained runs, each on ONE prevalidated planet from a seed bank | the Challenge's scenario (all six have extinction loss) |
| **TRAINING** | about five minutes, thirteen guided lessons on the Training Grounds | always Organic Hybrid; `default` rules; Bloom at 65 % |

SETTINGS (v1.0.1): motion (system / reduced / full) · "Show Training recommendation again" (the training record back to first-run) · "Reset preferences"
(motion → Follow system and the training record back to first-run; nothing else in the browser's storage is touched). Nothing gameplay-affecting is a
setting. **Pause truth (corrected by BLOOM-039):** the four decision rooms already pause the run unconditionally (BLOOM-038 measured 0 ticks while a room is
open, scenario clocks frozen), so room pausing is not a deferred setting; whether the selected-region banner, Map View and the run menu should also pause is
a **human-playtest question** (not implemented).

**v1.0.1 — LIVE / COMPLETE 2026-10-14, release head `f631f4f`** (docs/evidence/bloom-v1.0.1/REPORT.md: 46 / 46 regression · 2119 checks, strict
axe pass 0 critical / 0 serious on 22 screens × Chromium / Firefox / WebKit, Pages run 38567439937, live verification 11 / 11, portable
fingerprint de32ce91…). UI polish (owner direction): the title shows no survey-prefetch status (the prefetch itself still runs silently from the title); no
player-facing text is pointer-selectable (`html.mm-page{user-select:none}`); right-hand planning panels — the Challenge dossier, the species dossier,
the Destination Survey's focused-planet dossier and the Challenge Planet Dossier — take their content's height (top-aligned, up to the available
height, scrolling inside only when the content overflows); the flat gameplay map draws exactly ONE copy of a cylindrical world (the frame either
side is outside the map; the topology is unchanged); under a freezing sky water is icy water (deeper cool blue, ripple marks darker than the
surface) while the white frost glints stay on land alone.

## 2. Species

Four released species, all on their PMO-accepted final art (the sprite compositor; `content/species.js`). Species are biology, not
difficulty: no Easy / Hard, no stars, no scores; every strength is paired with a weakness.

| Species | Role | Body plan |
|---|---|---|
| **Organic Hybrid** | the balanced generalist — "Recommended first expedition"; Training's plant | `oh-stem@1` |
| **Cinder Rosette** | dry / heat specialist | `rosette@1` |
| **Woolly Candle** | cold specialist (radiation tolerance a latent secondary strength) | `candle@2` |
| **Reed Spire** | wet / flood specialist (salt-tolerant) | `reed@1` |

Choose Plant Species always opens on EXPEDITION (`?species=1` is ignored). Inside a Challenge it opens only when the Challenge leaves the plant
to the player. World generation never depends on the species (one planet per World Seed, from `config.referencePlant`).

## 3. Challenges

Hub order (content order, not a ranking). Every Challenge is one planet from its bank cell, a Challenge Planet Dossier, then the run.

| # | Challenge | Scenario | Plant | Worlds (bank cell archetypes) | Start | Completion |
|---|---|---|---|---|---|---|
| 1 | **Dying World** (v3) | Dying World — the atmosphere thins | player choice | Desert · Frozen · Ocean | normal | Bloom |
| 2 | **Native Competition** (v4) | Native Competition | player choice | Desert · Frozen · Ocean (Reed Spire 5 / 23 / 22) | normal | Bloom |
| 3 | **Volatile Climate** (v4) | Volatile Climate | player choice | Desert · Frozen · Ocean | normal | Bloom |
| 4 | **Low Tide** (v1) | Dying World | **Organic Hybrid** | Ocean Archipelago | lands with Flood Adaptation + Salt Handling (Drought Adaptation closed) | Bloom |
| 5 | **Oasis Line** (v1) | Native Competition | **Reed Spire** | Desert World | normal (no arrival floor) | Bloom |
| 6 | **Thin Air** (v1) | Dying World | **Woolly Candle** | Desert World + Ocean Archipelago | normal | Bloom **in the final atmosphere** (`pressure-final-state`) |

Not released and not planned without a new decision: Windfall (HOLD), Hearthfire (REJECTED under the studied conditions), any further
completion-condition type, progression, rewards, medals, scores, difficulty tiers, unlocks.

## 4. World flow

```
EXPEDITION  → Choose Plant Species → Destination Survey (9 worlds: Favorable · Precarious · Extreme, species-relative)
            → focus a world → Begin Expedition (the descent; the EXACT surveyed planet) → run → Bloom report
            → Keep playing · Play Again (same planet) · Choose Another Planet (survey; Change species there) · Main Menu
CHALLENGES  → hub (six cards) → BEGIN CHALLENGE → [Choose Plant Species, player-choice Challenges only] → PREPARING CHALLENGE WORLD
            → Challenge Planet Dossier → BEGIN CHALLENGE → run → report
            → Keep playing (after a win) · Retry Challenge (same planet, fresh run) · Challenges · Main Menu
TRAINING    → guided run → report → Begin Expedition (→ Choose Plant Species) · Restart Training · Main Menu; Skip Training (confirmed)
```

Escape / Back steps out of every planning screen and every decision room; the end-of-run report is the one screen it deliberately does not
dismiss (its actions are the way on).

## 5. Win and loss rules

- **Bloom (win):** keep **70 %** of the planet's land alive at the same time (`config.win`). One win per run; Keep playing continues after it.
- **Thin Air:** reaching 70 % before the decline has finished is a *milestone* (HOLDING — "Bloom reached — hold it until the atmosphere
  settles"); the run is won on the first tick with coverage ≥ 70 % **in the final atmosphere** (FINAL ATMOSPHERE ✓). An extinction after an
  early Bloom is a real loss. The engine's win gate is generic (`createSim` `canWin`); the engine names no Challenge.
- **Extinction (loss):** in the Challenge scenarios, no living plant anywhere for **8 s** ends the run. EXPEDITION and TRAINING have no
  extinction loss (a run can always recover or be left).

## 6. Challenge seed banks

`content/challenge-seed-banks.js` — generated, never hand-edited; bank **format 2**, validator `@2`; **15 cells × 50 = 750 entries**
(each player-choice Challenge × 4 species, plus one cell per prescribed-plant Challenge); 400 847 bytes; sha256
`8506124b462cf4d47710a1eb37806ddead9dd3f600c28c36cfcfd071fda59e40`. Each entry is a World Seed + its proof provenance (no geometry).

- **Runtime:** pick an entry deterministically from the launch seed (recent entries avoided, in memory), rebuild that exact planet in
  milliseconds, verify its fingerprint. **No winnability proof runs in the player's browser.**
- **Stale-bank refusal (locked):** any change to the world generator, archetypes, species physiology, traits, engine rules, scenarios,
  Challenge recipes / versions / completion, or the validator makes the bank stale and the game refuses it. Rebuild and commit with the change:
  `node tools/build-challenge-seed-bank.mjs --per-archetype 160 --workers 12` (~70 min on the development machine for the full matrix);
  `--check` proves the shipped bank is exactly the rebuild from the cached candidates. Checklist:
  [`DEVELOPMENT_NOTES.md`](DEVELOPMENT_NOTES.md) § "Change checklist — Challenge seed banks".

## 7. Offline and hosting

- **Local copy:** download or clone the repository and double-click `index.html`. Over `file://` the game's ES modules come from the generated
  portable runtime (`dist/portable/`, reproducible: `npm --prefix tools run check:portable`), the survey's validation runs in `blob:` workers,
  and every request stays on the disk. No network, server, install, account or browser flag.
- **Hosted:** any static host; every URL is relative, so `/` and a project subpath such as `/bloom/` both work. GitHub Pages:
  <https://interstellarharvest.github.io/bloom/>. The repository's Pages workflow (`.github/workflows/pages.yml`, `tools/build-pages-site.mjs`)
  publishes exactly `index.html` + `content/` + `planets/` + `resources/`; the repository's Pages source is **GitHub Actions** (set by the
  owner at the 037 release — the old "Deploy from a branch" source, which published the whole repository, is no longer active).
- No web fonts, CDN, analytics, cookies, service worker or external request anywhere. `localStorage` holds only the settings and the
  training record (the game runs without storage).

## 8. Supported browsers and screens

- **Supported:** current desktop **Chromium-based browsers** (Chrome, Edge, …) and **Firefox** — both the full release QA matrix.
- **Safari: untested, not claimed as supported** (PMO decision, BLOOM-037). A Playwright WebKit build (WebKit 18, macOS 12) runs the whole release
  QA matrix green — supporting evidence only, not Safari itself ([`evidence/bloom-037/REPORT.md`](evidence/bloom-037/REPORT.md) § Browsers).
- **Screens:** gameplay needs a window **at least 1024 px wide** (laptop / desktop / landscape tablet — an accepted v1 limitation, PMO); designed and checked at 1024 × 768,
  1440 × 900 and 2560 × 1440. The planning screens (title, Species Selection, Destination Survey, Challenge hub and dossier) also have phone
  layouts (checked at 390 × 844). Keyboard play is supported throughout; touch is not a designed input.

## 9. Known intentional limitations

- **No saved runs / Continue.** A run lasts as long as the page; a reload returns to the title.
- **No audio.** The game is silent by design.
- **No separate difficulty setting.** Expedition difficulty is the species + the surveyed world class; Challenge difficulty is the authored Challenge.
- **No progression or rewards** — no medals, scores, unlocks or campaign; Challenges are not ranked.
- **Challenge rule changes cost a bank rebuild** (§6, ~70 min offline) — a development cost, invisible to players.
- **Gameplay is not laid out for phones** (§8): the run map and decision rooms need ≥ 1024 px.
- **Safari itself is untested** (§8): WebKit proxy evidence only.

**Accessibility:** WCAG 2.1 AA (axe-core) — 0 critical / 0 serious violations on the 23 audited screens in Chromium, Firefox and WebKit. The
colour-contrast issues found by the 037 hardening (small secondary text, white words on gameplay buttons) were **FIXED before release** — text-only
shades and gameplay button shades in `resources/ui/bloom-theme.css`, the semantic hues unchanged ([`evidence/bloom-037/REPORT.md`](evidence/bloom-037/REPORT.md) § Accessibility).
