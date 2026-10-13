# Strange Bloom · Unknown Soils — release state v1

**The canonical inventory of what the released game is.** Written by BLOOM-037 (final hardening). The product is **frozen**: nothing below
is added to without a new, explicit PMO decision. Where an older document disagrees with this file about *what ships*, this file wins;
[`PRODUCT_DIRECTION_CURRENT.md`](PRODUCT_DIRECTION_CURRENT.md) holds the decisions and their history, and `docs/evidence/` what happened at
each milestone. Release QA record: [`evidence/bloom-037/REPORT.md`](evidence/bloom-037/REPORT.md).

**Release candidate:** review branch `handoff/bloom-037-review` — BLOOM-036D1 (Thin Air) + BLOOM-037 on top of production `main` `d0eaf8f`
(a fast-forward; 036D1 had not yet been fast-forwarded into `main` when 037 began). Everything below describes that candidate.

## 1. Modes

The title (`index.html`, one of twelve paintings) offers **EXPEDITION · CHALLENGES · TRAINING · SETTINGS · CREDITS**. The whole game is that
one document: no screen opens another page, the address never changes, and a reload returns to the title.

| Mode | What it is | Rules |
|---|---|---|
| **EXPEDITION** | the procedural sandbox: a fresh, proven-winnable world from a live 3 × 3 Destination Survey | `default` (no pressure scenario, no extinction loss) |
| **CHALLENGES** | six authored, contained runs, each on ONE prevalidated planet from a seed bank | the Challenge's scenario (all six have extinction loss) |
| **TRAINING** | about five minutes, thirteen guided lessons on the Training Grounds | always Organic Hybrid; `default` rules; Bloom at 65 % |

SETTINGS: motion (system / reduced / full). CREDITS: the team, the paintings, Three.js (MIT).

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
  publishes exactly `index.html` + `content/` + `planets/` + `resources/` — once the repository's Pages source is **GitHub Actions**
  (see [`evidence/bloom-037/REPORT.md`](evidence/bloom-037/REPORT.md) § Release / hosting: the remaining one-time owner setting).
- No web fonts, CDN, analytics, cookies, service worker or external request anywhere. `localStorage` holds only the settings and the
  training record (the game runs without storage).

## 8. Supported browsers and screens

- **Supported:** current desktop **Chromium-based browsers** (Chrome, Edge, …) and **Firefox** — both the full release QA matrix.
- **Safari / WebKit:** see [`evidence/bloom-037/REPORT.md`](evidence/bloom-037/REPORT.md) § Browsers for exactly what was tested (a Playwright
  WebKit build on macOS 12, not Safari itself). Not claimed as supported beyond that evidence.
- **Screens:** gameplay needs a window **at least 1024 px wide** (laptop / desktop / landscape tablet); designed and checked at 1024 × 768,
  1440 × 900 and 2560 × 1440. The planning screens (title, Species Selection, Destination Survey, Challenge hub and dossier) also have phone
  layouts (checked at 390 × 844). Keyboard play is supported throughout; touch is not a designed input.

## 9. Known intentional limitations

- **No saved runs / Continue.** A run lasts as long as the page; a reload returns to the title.
- **No audio.** The game is silent by design.
- **No separate difficulty setting.** Expedition difficulty is the species + the surveyed world class; Challenge difficulty is the authored Challenge.
- **No progression or rewards** — no medals, scores, unlocks or campaign; Challenges are not ranked.
- **Challenge rule changes cost a bank rebuild** (§6, ~70 min offline) — a development cost, invisible to players.
- **Gameplay is not laid out for phones** (§8): the run map and decision rooms need ≥ 1024 px.
- **Colour contrast:** several small secondary labels (muted captions, notes, and white text on the green primary buttons) are below the
  WCAG AA 4.5 : 1 text ratio — locked visual-system tokens; recorded for a PMO decision ([`evidence/bloom-037/REPORT.md`](evidence/bloom-037/REPORT.md) § Accessibility).
