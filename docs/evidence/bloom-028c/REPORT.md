# BLOOM-028C — Main Menu + Destination Entry · evidence report

**Recommendation: ACCEPT.**
- Branch `agent/bloom-028c-main-menu` (worktree `_worktrees/bloom-028c-main-menu`), from **`d036ea3`** (BLOOM-028B final
  evidence, the accepted start state). Verified: `d036ea3` is the first parent of the first commit on the branch (QA N1).
- Commits: `1c6d1c4` — implementation; this evidence commit.
- Not merged, not pushed. Integration handoff: `docs/MAIN_MENU_v1.md`; survey changes: `docs/DESTINATION_SURVEY_v1.md` §2, §4a.

## 1. What was built

- **The title.** The player reads **STRANGE BLOOM · UNKNOWN SOILS** (text content exactly "Strange Bloom" / "Unknown Soils";
  capitals by CSS; the project, files and modules stay BLOOM). Real HTML over the paintings: a display serif (Palatino family,
  system fonts, no web-font request), gold gradient with a dark drop shadow, letter-spaced, the two title words stacked.
- **The paintings.** The owner's twelve `menu-01 … menu-12.jpg` copied from the main checkout at the same paths, committed,
  byte-identical (SHA-256, QA N5), 1280 × 720, never re-encoded or processed. One `<img>`, `object-fit: cover`, framed 35 %
  toward the greenhouse every painting shares on its left.
  - **Rule:** every show (page load or return) picks one at random, **never the painting just shown** (sessionStorage carries
    "just shown" across reloads); the next is chosen and preloaded while the current one is up. **Two files requested per
    visit**, never twelve. A return **rotates** to the preloaded painting (documented choice).
  - **Same overlay on all twelve.** The plaque sits right of centre over the shared open vista. Readability measured
    (QA M4): text contrast ≥ **8.6 : 1** against the 95th-percentile luminance behind it and ≥ **7.1 : 1** against the single
    brightest pixel, on every painting at 1280 × 800 and in 1920 × 1080, 1024 × 768 and 390 × 844 samples
    (`09-contact-sheet-all-twelve.png`).
- **The menu.** BEGIN EXPEDITION · TRAINING · SETTINGS · CREDITS. Keyboard ↑ ↓ Home End; a gold marker beside the active entry.
  - **No CONTINUE EXPEDITION**: the codebase has no save / resume state (only UI-mockup tab preferences in localStorage), so
    none is offered and nothing fake was built.
  - **TRAINING** is a hook (`onTraining`); without one it opens a dialog that says plainly the training expedition is not yet open.
  - **SETTINGS**: one real, wired setting — Motion (Follow system / Reduced / Full) — persisted at
    `localStorage["strange-bloom.settings"]`, feeding the menu, the transition and the survey.
  - **CREDITS**: a short dialog (copy provisional).
- **First sector on the title screen.** The survey's pool + sector cache moved **unchanged** into `SectorPool`
  (`resources/destination-survey/sector-pool.js`). `DestinationSurvey.prefetch()` starts a sector with no screen, no DOM and no
  WebGL the moment the menu exists; `new DestinationSurvey(root, { sectors: pool })` adopts it. A complete sector arrives with
  the accepted prefetched-scan sweep; a half-built one shows the confirmed worlds at once and fills in as the accepted 028B
  loading does. `survey-data.js` and `survey-worker.js` are byte-identical to 028B (QA N4b); the pool's sector equals
  `buildSector`'s (suite M5). One robustness fix in the moved code: a synchronous `new Worker` failure now rejects the task so
  the main-thread fallback runs, instead of leaving it queued forever (the inherited behaviour, found by the Node suite).
- **Menu → survey → menu.** `ExpeditionEntry` owns the flow with **one** `AtmosphereTransition`: the plaque recedes
  (220 ms), then SUBDUED with `conceal: "full"` (the layout swap and the globes' first frame are never seen); the survey is
  mounted and draws its first frame under cover; the mist clears. "← Main menu" (survey `onExit`, additive) runs the same
  mist back, disposes the survey (renderer, nine views, its pool's workers, listeners, DOM) under cover, shows the next
  painting, and starts a fresh prefetch once the mist has cleared. The survey's dramatic departure (028B) uses the same
  transition instance.
- **Reduced motion.** Menu entrances / recede become immediate (no fade of the painting), the transition and the survey take
  their own reduced paths — from the OS or the Settings choice. Nothing is disabled.
- **Entry page** `demos/main-menu.html` (menu → survey → 028B departure → the clearly marked development handoff target).
  **22nd suite** `tools/main-menu-check.js`. Browser QA `qa-main-menu.js`.

## 2. Results

| | |
|---|---|
| browser QA (`qa-main-menu.js --shots`, on committed `1c6d1c4`) | **86 / 86** (Node provenance N1–N6; Chromium 1280 × 800 / 1440 × 900 / 1920 × 1080 / 1024 × 768 / 390 × 844; Firefox; forced + system + Settings reduced motion; real-GPU sample) → `qa-results.json`, `qa-run.log`. Two earlier runs failed only on harness timing (a dialog's asynchronous `close` event read synchronously); the component was unchanged between them |
| 22 repository suites (`run-all-suites.sh`, on `1c6d1c4`) | **875 / 0** — every suite ALL CHECKS PASS, including `colony-development-check` [31] (the pre-existing flake passed this run), `destination-survey-check` 11 / 11 (S11 parallel = sequential still holds through the moved pool), `atmosphere-transition-check` 14 / 14, `main-menu-check` 15 / 15 → `qa-suites-summary.txt` |
| accepted 028B QA re-run on `1c6d1c4` (`qa-atmosphere-transition.js --no-gpu`) | **172 / 1**: the one failure is N2, its file allow-list provenance sentinel (§5). Every behavioural check — standalone S1–S17, loading L1–L7, departures D1–D19 in Chromium and Firefox, failure recovery, F0 — passed on the survey with its pool moved out → `qa-028b-rerun.json`, `qa-028b-rerun.log` |
| Safari / WebKit | not installed on this machine (mac12). Left for hardware QA |

### The milestone's required checks, where they are proven

| check | QA |
|---|---|
| correct start SHA `d036ea3` | N1 |
| all 12 backgrounds copied and tracked, byte-identical | N5, suite M1 |
| random background selection works | M3 (10 reloads), M3b (30 returns), suite M3 / M3b (36 000 draws, uniform) |
| immediate repeat avoided | M3, M3b, suite M3 (0 repeats) |
| title exactly Strange Bloom / Unknown Soils | M1, suite M2 / M2b |
| menu readable on all 12 images | M4 (pixel contrast behind the text), contact sheet |
| BEGIN EXPEDITION reaches the existing survey | E1, E2, E7 (same `DestinationSurvey`, one renderer) |
| first-sector prefetch begins while the title is visible | M5, M5b (workers started, worlds confirmed, in the `menu` state) |
| no additional WebGL context for the preload | M5, E5 (0 contexts on the menu; exactly 1 once the survey exists) |
| prefetched planets remain the exact authoritative planets | E6 (cells `===` the pool's confirmed objects), E7 (validated layers 1–8, `===` sector cells), suite M5 |
| Begin before preload completes | E6 early (confirmed worlds on the first survey frame, the rest "Incoming", fill-in), R1–R6 after it |
| Begin after preload completes → ready / faster survey | E6 ready (one sweep, no "Incoming", nothing re-validated; usable ≈ 0.9–1.3 s after the click vs 5.4 s standalone load) |
| reduced motion | RM1 (forced), RM2 (transition + survey), RM3 (system), RM4 (Settings, persisted) |
| return-to-menu path cleans up | R1 (frame-sampled), R2 (DOM, workers, context), R3 (listeners / observers at baseline), R4 (next painting), R5 (fresh prefetch), exit-while-loading variant |
| one shared renderer on the survey | E5 |
| no sphere internals changed | N3 |
| Chromium clean · Firefox clean | all chromium / firefox checks; M15, R6 |
| no new console errors / WebGL warnings | M15, R6 (Firefox's "WebGL context was lost." on the survey's dispose is the unmodified renderer's own message, F0 control) |
| existing suites green | `qa-suites-summary.txt` |

## 3. Key proofs

- **Nothing is shown before full cover, both ways.** Frame samplers (`timelines.json`): the survey first exists — and the menu
  is first gone — on a `covered` frame with the veil at 1.000; on the return, the survey is first gone and the menu first
  back on covered frames; no frame ever shows both screens; nothing new appears while `concealing`.
- **Planet identity.** On an early BEGIN the survey's first frame holds exactly the worlds the pool had confirmed, and every
  object in its cells is `===` an object the pool reported (`shown` / finished columns); when ready, its nine cells `===` the
  sector's cells, each fully validated (layers 1–8, winnability checked), each in its class's column; `__gen.calls === 0` on
  the main thread throughout. On a ready BEGIN the nine cells `===` the nine prefetched objects and `sectorTimes` has one
  entry (nothing validated again).
- **The prefetch is invisible.** Zero WebGL contexts and zero canvases exist on the menu; the pool is workers only. The first
  world is confirmed ≈ 1.2–1.4 s after the title appears (Chromium 1158 ms, Firefox 1355 ms, this desktop).
- **Asset loading.** Network requests to `backgrounds/` in the first 2.5 s: exactly two — the shown painting and the one
  preloaded for the next show; the preload is complete and decoded at 1280 × 720 before any return. Thirty returns: 0
  repeats, every swap ≤ 8 ms, all twelve paintings reached.
- **Cleanup on return.** Every worker of the pool the survey owned is terminated (the only live workers are the next visit's
  fresh prefetch), `liveGL` 0, `.ds` DOM 0 nodes, listeners 25 → 102 (survey up) → 25, observers 0 → 1 → 0, no key capture, no
  uncaught errors — also when leaving mid-fill (`survey.ready` rejects quietly).

## 4. Performance

| | |
|---|---|
| menu → survey, click → covered | Chromium 333–334 ms · Firefox 277–305 ms · GPU (Metal) 320 ms |
| menu → survey, click → fully revealed | Chromium 748–906 ms (headless) · Firefox 374–379 ms · **GPU 528 ms** |
| click → survey usable, sector prefetched | Chromium 1257 ms · Firefox 926 ms · GPU 1060 ms (the accepted ~0.9 s sweep is most of it) |
| the same without a title-screen prefetch | `demos/destination-survey.html` load → ready **5353 ms** (same seed, same pool rule) |
| click → survey usable, BEGIN ~1.1 s after the title (1 world confirmed) | Chromium 3335 ms · Firefox 4543 ms (the fill-in shows worlds from the first frame) |
| transition frames, real GPU (ANGLE / Metal) | begin: menu 16.7 ms mean; concealing 28.6 (one 67 ms frame); revealing 25.9 (one 100 ms frame: the survey's first composited frame); **return: 16.7 ms mean, p95 16.8, 0 frames > 50 ms** |
| transition frames, Firefox (headless) | begin revealing 18.8–38.9 ms mean; return 16.7 mean, max 33 ms |
| transition frames, Chromium headless (software) | return 57–85 ms mean: software compositing of the full-screen painting fade + mist (absent on the GPU and in Firefox — the 028B "headless overstates" lesson) |
| first painting | shown 15–40 ms after the menu is built (warm cache); return swap 2–3 ms (preloaded) |
| long tasks on the menu page | 0 |
| memory | one decoded painting on screen + one preloaded (≈ 3.7 MB each decoded); the survey's pool and context are released on return |

**Design change made during QA.** The return used to start the next prefetch under cover; spawning the workers competed with
the reveal in software compositing (Chromium headless return frames ≈ 70 ms mean). It now starts once the mist has cleared —
the player is reading the menu for seconds anyway.

## 5. Expected failures in the re-run of the accepted 028B QA

| failing check | why | behavioural? |
|---|---|---|
| 028B N2 | file allow-list: this milestone adds `resources/main-menu/`, `sector-pool.js`, `demos/main-menu.html`, `docs/MAIN_MENU_v1.md`, the 22nd suite and `docs/evidence/bloom-028c/`, none of which 028B's list could know | no |

028B's N1 (start SHA `80a39ce` as the first parent of the branch line), N3 (sphere unchanged), N4 (generator / content /
`index.html` unchanged) and N5 (the 21st suite) all still pass. The survey's `_pool` / `_poolHalted` reads in that harness
are served by compatibility getters on `DestinationSurvey` (documented in the source).

- **Firefox "WebGL context was lost."** on survey disposal is the unmodified renderer's own message (F0 control, as in 028B).

## 6. Evidence files

| | |
|---|---|
| `01-main-menu.png` · `01b-main-menu-1080p.png` · `02-main-menu-phone.png` | the title over three paintings at 1440 × 900, 1920 × 1080, 390 × 844 |
| `03-settings.png` | the Settings dialog (Motion) |
| `04-transition-mist.png` | menu → survey: the plaque receding under the SUBDUED mist |
| `05-survey-arrival-prefetched.png` | BEGIN after the prefetch completed: the sector arrived in one sweep |
| `06-survey-filling-after-early-begin.png` | BEGIN ~1 s after the title: confirmed worlds up, "Incoming" spots, a world growing in |
| `07-return-new-painting.png` | back on the menu with the next (preloaded) painting |
| `08-reduced-motion-survey.png` | the survey reached under forced reduced motion |
| `09-contact-sheet-all-twelve.png` | the one overlay on all twelve paintings |
| `10-firefox-return.png` | Firefox: back on the menu |
| `qa-results.json` · `qa-run.log` · `perf.json` · `timelines.json` | the QA run, frame statistics (incl. per-painting contrast), frame-by-frame timelines |
| `qa-suites-summary.txt` | the 22 suites |
| `qa-028b-rerun.json` · `qa-028b-rerun.log` | the accepted 028B QA on this branch |

## 7. Known issues and recommendations

- **Survey header kicker** still reads "BLOOM · Expedition planning" after a title that says Strange Bloom. One string; an
  owner content decision, left unchanged here (not a survey redesign).
- **Credits copy** is provisional (owner names / attribution to confirm).
- **Status line** ("Surveying sector · n of 9 worlds") is quiet and informative; drop it with `menu.setStatus("")` if the
  owner prefers a silent title.
- **Safari / WebKit untested**; the plaque uses `<dialog>`, `translate` and container queries (all in Safari ≥ 16).
- **Low-end devices**: the prefetch spawns hardware − 2 workers at page load, as the survey does; check classroom Chromebooks.
- **Still open for the Main PMO:** root `index.html` integration and the `file://` decision; gameplay handoff in
  `descent.onCovered`; tutorial gameplay behind TRAINING; CONTINUE EXPEDITION once a real save exists.
