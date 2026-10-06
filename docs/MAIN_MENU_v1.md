# Main Menu v1 — integration handoff (Menu / Tutorial workstream, Main PMO)

**From:** BLOOM-028C · **For:** the Main PMO (root `index.html` integration, gameplay handoff) and the Tutorial workstream
(the TRAINING hook). Evidence and QA: `docs/evidence/bloom-028c/REPORT.md`.

The opening title of the game. The player reads **STRANGE BLOOM · UNKNOWN SOILS**; the project, its files, modules and
repository stay **BLOOM**. One of twelve hand-painted backgrounds fills the screen, the title and menu sit on a plaque over it,
BEGIN EXPEDITION leads into the accepted Destination Survey through a short mist, and the first validated sector is already
being prepared while the title is showing.

---

## 1. Files and ownership

| | owns |
|---|---|
| `resources/main-menu/main-menu.js` | **`MainMenu`**: the title screen — background choice and loading, plaque, menu entries, the Training / Settings / Credits dialogs, keyboard, reduced motion. Knows nothing of the survey, planets or transitions |
| `resources/main-menu/main-menu-data.js` | pure data: `TITLE`, `SUBTITLE`, `BACKGROUNDS`, `pickBackground`, settings (`readSettings` / `writeSettings`, `reducedMotionFor`). Node-testable |
| `resources/main-menu/main-menu.css` | the screen's look (scoped under `.mm`) |
| `resources/main-menu/backgrounds/menu-01.jpg … menu-12.jpg` | the owner's twelve paintings, 1280 × 720 JPEG, byte-identical to the originals (never re-encoded) |
| `resources/main-menu/expedition-entry.js` | **`ExpeditionEntry`**: the flow menu ↔ survey — hosts, ONE `AtmosphereTransition`, the title-screen prefetch, the motion setting |
| `resources/destination-survey/sector-pool.js` | **`SectorPool`**: the survey's worker pool + sector cache, lifted out of `DestinationSurvey` so a sector can be built before the screen exists (§5) |
| `resources/destination-survey/destination-survey.js` | adds `sectors` (adopt a pool), `onExit` / `exit()` ("← Main menu"), `static prefetch()` — additive; the accepted behaviour is unchanged |
| `demos/main-menu.html` | the entry page (localhost): menu → survey → 028B departure → a clearly marked development handoff target |
| `tools/main-menu-check.js` | the 22nd regression suite |

Not here: the sphere (`docs/PLANET_SPHERE_VIEW_v1.md`), the transition (`docs/ATMOSPHERE_TRANSITION_v1.md`), the survey
(`docs/DESTINATION_SURVEY_v1.md`). All three are used as they are.

## 2. Mounting it

```html
<link rel="stylesheet" href="resources/destination-survey/destination-survey.css">
<link rel="stylesheet" href="resources/main-menu/main-menu.css">
<!-- the BLOOM classic scripts (content/config.js … resources/bloom-play.js), as on every BLOOM page -->
<div id="app" style="position:relative; width:100%; height:100dvh"></div>
<script type="module">
  import { ExpeditionEntry } from "./resources/main-menu/expedition-entry.js";
  const entry = new ExpeditionEntry(document.getElementById("app"), {
    descent: { async onCovered(detail) { detail.survey.dispose(); await mountGameplay(detail.planet); } },   // the 028B departure consumer
  });
</script>
```

- Like the survey, it needs **http(s)** (ES modules + module workers). Locally: `python3 -m http.server 8767` →
  `http://localhost:8767/demos/main-menu.html`. The root `file://` decision is still the PMO's (PLANET_SPHERE_VIEW §3).
- `ExpeditionEntry` options: `reducedMotion` (undefined = the Settings choice; null / true / false override), `sectorSeed` /
  `firstBloom` / `worker` / `workers` (the first visit's sector and pool), `background` (force a painting, 0 … 11),
  `descent`, `onBeginExpedition`, `onTraining`, `transition`, `storage`.
- Read-only: `state` (`"menu" | "to-survey" | "survey" | "to-menu" | "departed" | "disposed"`), `menu`, `survey`,
  `prefetch` (the pool waiting for the next survey), `stats` (begins, returns, per-entry timings, prefetch timings).
- Methods: `beginExpedition()`, `returnToMenu()`, `dispose()`.
- `MainMenu` alone (for a page that composes its own flow): `new MainMenu(root, { onBegin, onTraining, onSettingsChange, reducedMotion, background })`;
  `shown` (promise), `recede()`, `hide()`, `show({ rotate })`, `setStatus(text)`, `setReducedMotion(v)`, `openDialog(name)`, `dispose()`.

## 3. The screen

- **Title.** `STRANGE BLOOM` stacked as two words over `UNKNOWN SOILS`, real HTML text (`TITLE` / `SUBTITLE` from
  `main-menu-data.js`; text content exactly "Strange Bloom" / "Unknown Soils", capitals by CSS). A display serif (Palatino
  family, system fonts; no web-font request), gold gradient with a dark drop shadow, letter-spaced. Nothing is baked into the
  paintings.
- **Menu.** BEGIN EXPEDITION · TRAINING · SETTINGS · CREDITS, one vertical list; a gold marker slides in beside the hovered /
  focused entry. ↑ ↓ Home End move between entries; Enter / Space activate (native buttons). Focus lands on BEGIN when the
  menu returns from the survey.
  - **No CONTINUE EXPEDITION.** The codebase has no save / resume state (only UI-mockup preferences in localStorage), so none
    is offered; nothing fake was built. Add it when a real save exists.
  - **TRAINING** calls `onTraining` if given; otherwise it opens a dialog that says plainly the training expedition is not
    yet open (a placeholder for the Tutorial workstream).
  - **SETTINGS**: one real setting, **Motion** (Follow system / Reduced / Full), persisted at
    `localStorage["strange-bloom.settings"]` (never throws without storage). It feeds `reducedMotion` to the menu, the
    transition and the survey (§7).
  - **CREDITS**: a short dialog. Copy is provisional (owner names to be confirmed).
- **Plaque.** Right of centre, over the open vista every painting shares (the greenhouse is lower left in all twelve), a
  translucent dark frame with a gold double border and corner marks. The same overlay, same HTML, on every painting — the
  layout never depends on which one loaded. Under 720 px wide (portrait phones, small tablets) the plaque spans the bottom.
- **Status line.** Bottom right, small: "Surveying sector · n of 9 worlds" → "Sector surveyed · nine worlds ready" — what
  BEGIN will meet. It is quiet and can be dropped (`menu.setStatus("")`) if the owner prefers a silent title.

## 4. Backgrounds

- **Choice.** Every time the menu is shown — a page load or a return from the survey — `pickBackground(previous)` picks one
  of the twelve uniformly at random, **never the painting just shown**. "Just shown" survives a reload within the tab
  (`sessionStorage["strange-bloom.menu.last-background"]`); nothing else is remembered.
- **Loading.** Exactly one `<img>` holds the active painting (`object-fit: cover; object-position: 35% 50%`, framing
  slightly toward the greenhouse). It fades in once `decode()` resolves. Then the **next** painting is chosen and preloaded
  (`new Image()` + `decode()`), so a return swaps instantly. Per visit, **two** of the twelve files are requested; never all.
  Measured: the first painting shows in ≈ 20 ms from a warm cache (hundreds of ms cold, network-bound); a return swap takes
  ≈ 2 ms.
- **Rule for a return** (documented choice): **rotate**. A return is a new show, so it takes the preloaded next painting.
  `menu.show({ rotate: false })` keeps the current one (used only when an aborted departure never covered the screen).
- **Scaling.** The 1280 × 720 paintings upscale on larger displays with the browser's default (bilinear) scaling. No
  sharpening, no filters, no processing. On 4 : 3 and portrait screens the cover crop trims the sides, favouring the
  greenhouse (35 %).
- **Readability.** Measured on all twelve (QA M4): the plaque's text keeps ≥ 4.5 : 1 contrast against the 95th-percentile
  luminance of the painting behind it, on every painting, at 1280 × 800, 1920 × 1080, 1024 × 768 and 390 × 844.

## 5. The first sector on the title screen (`SectorPool`, `DestinationSurvey.prefetch`)

The survey's sector machinery (028A1 worker pool, 028B parallel per-world validation) moved **unchanged** from
`DestinationSurvey` into `SectorPool`. `survey-data.js` and `survey-worker.js` are byte-identical to 028B; the sector a pool
builds is the sector `buildSector` builds (suite M5), and the parallel path is still proven equal by
`destination-survey-check` S11.

```js
const pool = DestinationSurvey.prefetch({ sectorSeed, firstBloom, workers });  // → SectorPool with one sector started
pool.progress            // { seed, confirmed, total: 9, ready, ms }
pool.ready               // Promise<sector>
pool.onProgress = e => … // a world confirmed / a column finished
const survey = new DestinationSurvey(root, { sectors: pool });                  // adopts it: that sector is the first shown
pool.dispose();          // only if no survey ever took it
```

- **Adoption.** `sectorSeed` / `firstBloom` default to the pool's prefetched sector. The survey owns the pool from then on
  and disposes it with itself.
  - Sector complete at adoption → the single sweep the accepted prefetched scan uses (`_swapIn`, first).
  - Sector half-built → the accepted 028B fill-in: worlds already confirmed appear at once (they replay through the entry's
    `shown` lists), the rest show "Incoming" and arrive as confirmed. Each world still gets one `setPlanet`.
- **Guarantees kept.** No unvalidated world is shown (every object comes from the worker's `makeCandidate`); nothing is
  regenerated (the objects in `pool` are the objects the survey draws and hands on as `detail.planet`); the main thread never
  generates; **no WebGL context, no canvas, no DOM** exists for a prefetch; the pool size rule is the survey's (hardware
  threads − 2, ≤ 8).
- **Measured** (`docs/evidence/bloom-028c/`, headless Chromium, this desktop): the first world is confirmed about 1.2–1.5 s
  after the title appears; the sector completes in ≈ 3–5 s (bounded by the slowest world, as in 028B). A BEGIN after that
  reaches a fully usable survey **≈ 0.5–0.6 s after the click**; a BEGIN before it shows what is confirmed and fills in.
- **One fix in the moved code.** If `new Worker` throws synchronously (module workers refused), `_viaPool` now rejects at
  once so the main-thread fallback runs; before, the task stayed queued forever. Behaviour on every other path is identical.

## 6. Menu → survey → menu

- **BEGIN** (`ExpeditionEntry.beginExpedition`): the plaque recedes (220 ms; opacity + a 14 px rise), 110 ms later the
  **SUBDUED** transition runs with `conceal: "full"` (the layout swap and the globes' first frame are never seen). Under
  cover: the menu is hidden, the survey constructed with the prefetched pool, one frame drawn. Then the mist clears.
  Measured ≈ 0.3 s to covered and ≈ 0.6 s to fully revealed; no dramatic descent here.
- **"← Main menu"** (survey `onExit`, a ghost button before the survey's title; also Escape in the survey state): SUBDUED,
  `conceal: "full"`; under cover the survey is **disposed** (renderer, nine views, its pool's workers, listeners, DOM), the
  menu shows its next painting, a fresh prefetch starts. Allowed from the survey and loading states; refused in focus (use
  Return to survey), mid-animation and while departing.
- **One `AtmosphereTransition`** serves both directions and the survey's dramatic departure (`descent.transition`).
- **Begin before the prefetch completes** is handled honestly (§5). **A return while still loading** disposes the pool
  mid-work; `survey.ready` rejects quietly (the entry catches it).
- **After the departure** (028B, unchanged) the survey disposes itself under the clouds; the entry's state is `"departed"`.
  Gameplay handoff is the PMO's `descent.onCovered`.

## 7. Reduced motion

- Detection: the OS (`prefers-reduced-motion`, live) unless the Settings motion choice forces it.
- Menu: entrances and the recede become immediate (≤ 10 ms), the painting appears without a fade, the hover marker does not
  slide. Nothing is disabled.
- Transition and survey: their own reduced paths, from the same value (`ExpeditionEntry.reducedMotion`).

## 8. Performance notes

- Menu: HTML / CSS over one `<img>`; no WebGL, no canvas, no workers of its own. No `backdrop-filter`, no `will-change`,
  no animated filter (028B lesson); the title's drop shadow is a static filter on one small element.
- Memory: one decoded 1280 × 720 painting on screen plus one preloaded (≈ 3.7 MB each decoded).
- Headless frame samples of the menu → survey transition are in `perf.json`; judge Firefox smoothness headed on real
  hardware (028B lesson).

## 9. Out of scope (deliberately)

- Root `index.html` integration and the `file://` decision; gameplay handoff; tutorial gameplay (TRAINING is a hook);
  CONTINUE EXPEDITION (no save state exists); SUBDUED in gameplay rooms; any sphere or survey redesign.
- The survey's header kicker still reads "BLOOM · Expedition planning" (owner content decision; one string).
- Credits copy and owner attribution are provisional.
- Safari / WebKit untested here (not installed on this machine).
