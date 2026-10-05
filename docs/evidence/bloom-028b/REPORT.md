# BLOOM-028B — AtmosphereTransition + Dramatic Descent · evidence report

**Recommendation: ACCEPT.**
- Branch `agent/bloom-028b-atmosphere-transition` (worktree `_worktrees/bloom-028b-atmosphere-transition`), from
  **`80a39ce`** (BLOOM-028A1, accepted).
- Not merged, not pushed. Integration handoff: `docs/ATMOSPHERE_TRANSITION_v1.md`; survey changes:
  `docs/DESTINATION_SURVEY_v1.md` §3.1.

## 1. What was built

- **`resources/atmosphere-transition/atmosphere-transition.js`: the reusable transition.**
  - **Screen-agnostic.** No imports, no planet / survey / gameplay knowledge.
  - **Built from DOM + inline SVG + Web Animations / CSS keyframes** (transform and opacity only). No canvas, no WebGL.
  - **Lifecycle.** `run({ preset, onCovered })`: concealing → **covered** → (async `onCovered`, any length, clouds keep
    drifting) → revealing → idle.
  - **Failure handling.** Failure, timeout, busy and dispose all clear the overlay and reject with a named error.
  - **Built in.** Reduced motion, and input blocking while the overlay is up.
  - **Presets.** DRAMATIC (full concealment) and SUBDUED (~250 ms mist, not wired into any gameplay room).
  - **Seeded layouts (owner request during this milestone).** Every run lays its clouds out from a random seed: mirroring,
    ±6–12 % position, ×0.85–1.2 size, silhouette, facing, drift and stagger, with 9–14 clouds. No two transitions look
    alike; `run({ seed })` reproduces a run exactly.
- **`DestinationSurvey` `descent` option: the dramatic departure.**
  - Without the option, Begin Expedition behaves exactly as in 028A (announce only).
  - With it, in order:
    1. **Commit.** State `departing`; the prefetch workers are halted.
    2. **Recede.** The dossier and header recede.
    3. **Approach.** The **same live view** eases to the screen rectangle, then its camera dollies in with the public
       `setDistance`, from 3.6 to 1.45.
    4. **Cover.** The DRAMATIC transition closes.
    5. **Handoff.** `onCovered(detail)` runs only under full cover; the survey is disposed and the destination mounted.
    6. **Reveal.** The clouds part on the new screen.
  - **Failure** restores the focus screen under cover.
  - **Reduced motion** fades only.
- **Demos.**
  - `demos/atmosphere-transition.html`: standalone technical demo of both presets.
  - `demos/expedition-descent.html`: integration harness. Its handoff target draws `detail.planet`'s own starting surface
    with the existing `planet-texture.js`, and is clearly labelled as a development harness, not gameplay.
- **Tests.**
  - `tools/atmosphere-transition-check.js`: the 21st suite.
  - `qa-atmosphere-transition.js`: browser QA.

## 2. Results

| | |
|---|---|
| browser QA (`qa-atmosphere-transition.js --shots`, on committed `5c9cf8c`) | **151 / 151** (Chromium 1280×800, 1024×768, 1440×900, forced + system reduced motion; Firefox; GPU sample) → `qa-results.json`, `qa-run.log` |
| 21 repository suites (`run-all-suites.sh`) | **858 pass / 1 fail.** 20 suites green, incl. the new 21st (14/14). The one failure is `colony-development-check` [31], a pre-existing timing-dependent pixel check: it also fails intermittently on a pristine `80a39ce`, and none of its inputs changed (`colony-check-31-flake.txt`) → `qa-suites-summary.txt` |
| accepted 028A1 QA re-run on this branch | **17 / 19**: every behavioural check green. 2 non-behavioural failures (§5) → `qa-028a1-rerun.json` |
| nested 028A QA re-run (inside the 028A1 one) | **29 / 32**: every behavioural check green; 3 sentinel failures (§5) → `qa-028a-rerun-nested.json` |
| Safari / WebKit | not installed on this machine (mac12; Playwright WebKit unavailable). Left for hardware QA |

### The milestone's 29 required checks, where they are proven

| # | check | QA |
|---|---|---|
| 1 | start SHA `80a39ce` | N1 |
| 2 | sphere files unchanged | N3, A12 |
| 3 | generator / validator files unchanged | N4, A12 |
| 4 | one shared `PlanetSphereRenderer` | D1, A10 |
| 5 | no WebGL for clouds | A3, S13 (0 contexts, 0 canvases) |
| 6 | screen-agnostic | A2 |
| 7 | dramatic preset | A5, S1–S4 |
| 8 | subdued preset | A6, S5, S6 |
| 9 | subdued ≈ 200–300 ms | A6 (210 ms nominal); S5 measured 245 ms (Chromium) / 251 ms (Firefox), GPU 242 ms |
| 10 | reduced motion internal | A7, S7, S15, D17 |
| 11 | async `onCovered` waits | S3, D11 |
| 12 | immediate callback | S1, D8 |
| 13 | delayed callback holds concealment | S3, S4 (pixels), D9b, D11 |
| 14 | failed callback leaves no overlay | S8, D14 |
| 15 | repeated runs clean up | S13 |
| 16 | Begin cannot double-fire | D2 |
| 17 | same view through the approach | D3 |
| 18 | yaw never reset | D4 |
| 19 | exact `detail.planet` survives | D6 |
| 20 | no generator call | D7 |
| 21 | survey disposed while concealed | D8, D9 |
| 22 | incoming not visible before cover | S2, D9 |
| 23 | reveal | D10 |
| 24 | reduced-motion departure | D5 (rm), D12, D17 |
| 25 | Chromium clean | all chromium checks |
| 26 | Firefox clean | all firefox checks |
| 27 | no console errors | S14, D13 |
| 28 | no new WebGL warnings | D13, F0 |
| 29 | suites green | `qa-suites-summary.txt`: all green except the pre-existing [31] flake (§5) |

## 3. Key proofs

- **The swap happens only under full cover.**
  - A per-frame sampler records phase, veil opacity and which screen is shown (`timelines.json`).
  - The incoming screen first appears on a frame whose phase is `covered` with the veil at 1.000. Standalone and survey,
    in Chromium and Firefox.
  - Full-screen pixel probes during a covered hold find **0** pixels of the screen underneath (minimum luminance 0.71 on a 0–1 scale; the underlying screens are dark).
- **Planet identity.**
  - The object handed over under cover `===` the selected cell's planet `===` the hook's `detail.planet`, with the same
    fingerprint.
  - The mounted surface is pixel-identical to that object's own texture.
  - During the departure: zero main-thread generator / validator / layout calls, zero worker messages, zero new workers.
- **Yaw continuity.**
  - No `setYaw` / `lookAt` / `setPlanet` on any view.
  - The yaw carries on from Begin, rising monotonically with the idle spin (max step ≤ 0.0058 rad / frame), until the survey
    is disposed. No landing alignment.
- **Approach.**
  - The disc grows monotonically, e.g. 697 → 2098 px at 1440×900. It is wider than the screen while the veil is only
    0.02–0.13, so the planet is still visible as it overfills the view.
  - The globe's box never leaves the canvas.
- **Handoff order.** At 1440×900: covered → survey disposed +10 ms → destination mounted +12 ms → reveal +195 ms. With a
  1.5 s hold: +1532 / +1534 / +1545 ms.

## 4. Performance

| | |
|---|---|
| WebGL contexts | survey: 1 before focus; the transition creates **0** (any number of runs) |
| cloud DOM | DRAMATIC up to 102 nodes (14 clouds; seeded runs 9–14), SUBDUED 29; **0 after a run**, plus one shared `<style>` |
| frames, real GPU (Chromium, ANGLE/Metal) | **16.7 ms mean, p95 ≤ 16.8 ms in every phase** (approach, conceal, covered hold, reveal), standalone and during the departure |
| frames, headless software | Chromium standalone 16.7 ms everywhere. Chromium departure: p95 33–67 ms during approach / conceal (software-rendered 2000 px globe). Firefox: mean 21–30 ms, p95 ≤ 83 ms under the QA sampler (17 ms in a plain rAF probe) |
| long tasks | 0 in every Chromium run |
| repeated runs | 17 mixed runs: DOM nodes 73 → 73, listeners 16 → 16, key captures 0, animations 0 |

**Design change made during QA.** CSS `blur()`, `will-change` and an animated veil highlight cost whole frames under
software compositing: Firefox 50–100 ms, plus a "will-change memory" warning. All three were removed; depth now comes from
tone.

**Second design change made during QA.** The first approach CSS-scaled the globe's box beyond the canvas, and Firefox
warned ("destination rect smaller than the viewport rect"). It was replaced by box-to-screen + camera dolly, and the
warning is gone (D18).

## 5. Expected non-behavioural failures in the re-runs of older QA

| failing check | why | behavioural? |
|---|---|---|
| 028A1 N1 | file-list provenance sentinel: lists this milestone's new files as "stray" | no |
| 028A1 N6 | aggregate: expects the nested 028A re-run to fail only its 2 provenance checks; it now fails 3 (the next three rows) | no |
| 028A N1, N5 | provenance sentinels (already failing by design at 028A1's acceptance) | no |
| 028A N4 | static import allow-list: the survey module now also imports `atmosphere-transition.js`, which this milestone requires. The rest of N4 still holds: no sphere internals, exactly one renderer | no (intended change) |

**`colony-development-check` [31].** A pixel check around whichever real crossing events the live sim produced. Same
two outcomes on this branch and on a pristine `80a39ce` (arrival 9 bright px → pass, 13 px → fail). None of its inputs
changed. Pre-existing flake, not a regression; worth stabilising in the gameplay track.

**Firefox "WebGL context was lost." It appears when the survey is disposed. It is the unmodified
`PlanetSphereRenderer.dispose()` (`forceContextLoss`) message. F0 reproduces it on the untouched 028A dev page, so it is
pre-existing, not new.

## 6. Evidence files

| | |
|---|---|
| `01-focused-before-begin.png` | focused planet before Begin |
| `02-early-approach.png` | dossier gone; the planet starting toward the viewer |
| `03-partial-cloud-entry.png` | planet overfilling the view; clouds entering from the edges |
| `04-near-full-concealment.png` | planet visible only through gaps |
| `05-covered-hold.png` | covered hold (DRAMATIC) |
| `06-cloud-reveal.png` | clouds parting on the destination |
| `07-revealed-destination.png` | the handoff target |
| `08-reduced-motion-covered.png` | reduced-motion covered state |
| `09-standalone-subdued-peak.png` | standalone SUBDUED at its peak |
| `09b-standalone-dramatic-building.png` | standalone DRAMATIC building |
| `10-standalone-dramatic-covered-hold.png` | standalone DRAMATIC covered hold |
| `11a/b/c-seed-variation.png` | three seeds, covered |
| `12-firefox-revealed-destination.png` | Firefox: revealed destination |
| `13-firefox-standalone-covered.png` | Firefox: standalone covered |
| `colony-check-31-flake.txt` | the [31] flake investigation (6 runs over 2 trees) |

`timelines.json` holds frame-by-frame timelines. `perf.json` holds frame statistics.

## 7. Known issues and recommendations

- **Safari / WebKit untested.** Test on classroom hardware, especially iPad Safari: compositing and `prefers-reduced-motion`.
- **Firefox on a real GPU was not measured.** Headless software numbers are above. Chromium on the GPU is a flat 60 fps.
- **Low-end devices.** The departure's software-rendered frames come from the large globe (WebGL), not the clouds.
  Classroom Chromebooks should be checked before release.
- **Timing.** A ready destination takes ≈ 3.2 s from Begin to fully revealed: 560 ms lead + ≈ 2.65 s transition. Under
  reduced motion it takes ≈ 0.9 s. Tune `T` in the survey or the preset times after owner review if it feels long.
- **`demos/destination-survey.html` is unchanged** (announce-only; its header still calls the descent "the next
  milestone"). `demos/expedition-descent.html` is the 028B entry.
- **Still open for the Main PMO:**
  - wiring SUBDUED into gameplay rooms;
  - the root `index.html` integration;
  - first-sector prefetch on the title screen;
  - the `file://` decision (unchanged from 027D / 028A).
