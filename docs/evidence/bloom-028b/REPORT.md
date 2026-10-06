# BLOOM-028B — AtmosphereTransition + Dramatic Descent · evidence report

**Recommendation: ACCEPT.**
- Branch `agent/bloom-028b-atmosphere-transition` (worktree `_worktrees/bloom-028b-atmosphere-transition`), from
  **`80a39ce`** (BLOOM-028A1, accepted).
- Commits:
  - `5c9cf8c` — implementation;
  - `e3a07d6` — evidence;
  - `b670d84` — owner revision;
  - this evidence commit.
- Not merged, not pushed. Integration handoff: `docs/ATMOSPHERE_TRANSITION_v1.md`; survey changes:
  `docs/DESTINATION_SURVEY_v1.md` §3.1 and §4.

## 0. Owner revision (after the first handoff)

The owner reviewed the first build in Firefox on a 5K iMac and asked for four changes:

1. **"The planet should begin to zoom for a beat before the clouds appear."**
   - The clouds now start 1.0 s after Begin (was 0.56 s).
   - By then the planet has moved to the centre and its disc has grown about 1.6×.
   - D5b checks this: no overlay for ≥ 0.9 s while the disc grows ≥ 1.3×. Measured: clouds at 1.02 s, disc 627 → 990 px.
2. **"The cloud animation is kinda choppy" (Firefox).**
   - Clouds are now **bitmaps drawn once** (`<img>`), not inline SVG. Firefox re-rasterises scaled SVG on the CPU.
   - The reveal now waits for **smooth frames** after the covered work (≤ 400 ms), so a heavy first paint of the new
     screen happens under cover.
   - Bitmap preparation never blocks a frame. It runs one bitmap per task, without `toBlob`, whose idle-time encoding
     waited ~1 s per bitmap on the busy survey page and logged GPU-readback warnings.
   - **Firefox on the real GPU (headed, 1920×1080 @2×):** approach, cloud build and reveal hold a flat 16.7 ms.
     - One 67 ms frame inside the covered hold: the survey teardown and destination mount, invisible under full cover.
     - The 50–150 ms reveal-start frames seen only in **headless** Firefox are software rasterisation. The main thread
       was never blocked, and real-GPU Firefox showed 0 / 4 such frames.
3. **"Nine planets load slowly."**
   - **Parallel validation.** Each world is now its own worker task (pool = hardware threads − 2, ≤ 8; 8 on this iMac),
     accepted in stream order with the sequential column's exact rule. Sectors are identical, proven by
     `destination-survey-check` S11 on real sectors, including a First Bloom column.
   - The floor is the single slowest world (one can take 3–4 s on its own), so complete-sector time improved only
     modestly (5.6 → 4.2–5.7 s at 5K).
4. **Owner decision: "fill in as confirmed".** The owner chose it over "remember the next sector" and "prefetch two ahead".
   - Each globe appears the moment its world is validated *and certain to be in the sector*, so the grid fills one world
     at a time.
   - Arrivals take a row consistent with the worlds already shown; at completion any out-of-order globe shrinks out and
     grows into its final row (2–5 per sector). Each world still gets exactly one `setPlanet`.
   - **First world on screen: ≈ 1.2–1.4 s** (Firefox real GPU 1.4 s), previously a blank 4–5.6 s wait.
   - **Scan before the next sector is ready: first new world after 0.56–0.83 s**, previously 3.7–5.7 s of nothing.

## 1. What was built

- **`resources/atmosphere-transition/atmosphere-transition.js`: the reusable transition.**
  - **Screen-agnostic.** No imports, no planet / survey / gameplay knowledge.
  - **Built from DOM + bitmap `<img>` clouds + Web Animations / CSS keyframes** (transform and opacity only). No WebGL.
    The bitmaps are drawn once with an off-screen 2D canvas.
  - **Lifecycle.** `run({ preset, onCovered })`: concealing → **covered** → (async `onCovered`, any length, clouds keep
    drifting) → smooth-frame settle → revealing → idle. `prepare()` draws the bitmaps ahead of time.
  - **Failure handling.** Failure, timeout, busy and dispose all clear the overlay and reject with a named error.
  - **Built in.** Reduced motion, and input blocking while the overlay is up.
  - **Presets.** DRAMATIC (full concealment) and SUBDUED (~250 ms mist, not wired into any gameplay room).
  - **Seeded layouts (owner request).** Every run lays its clouds out from a random seed: mirroring, ±6–12 % position,
    ×0.85–1.2 size, silhouette, facing, drift and stagger, with 9–14 clouds. `run({ seed })` reproduces a run exactly.
- **`DestinationSurvey`.**
  - **`descent` option: the dramatic departure.**
    1. **Commit.** State `departing`; prefetch halted.
    2. **Recede.** The dossier and header recede.
    3. **Approach.** The **same live view** eases to the screen rectangle and its camera dollies in (public
       `setDistance`, 3.6 → 1.45). The planet zooms alone for 1 s.
    4. **Cover.** The DRAMATIC transition closes.
    5. **Handoff.** `onCovered(detail)` runs only under full cover; the survey is disposed and the destination mounted.
    6. **Reveal.** The clouds part on the new screen.
  - **Failure** restores the focus screen under cover. **Reduced motion** fades only.
  - **Loading (revision).** Parallel per-world validation and progressive fill.
- **Demos.**
  - `demos/atmosphere-transition.html`: standalone, both presets.
  - `demos/expedition-descent.html`: integration harness. Its handoff target draws `detail.planet`'s own starting
    surface, and is clearly labelled as a development harness.
- **Tests.**
  - `tools/atmosphere-transition-check.js`: the 21st suite.
  - `tools/destination-survey-check.js` + S11: the parallel-equals-sequential proof.
  - `qa-atmosphere-transition.js`: browser QA.

## 2. Results

| | |
|---|---|
| browser QA (`qa-atmosphere-transition.js --shots`, on committed `b670d84`) | **167 / 167** (Chromium 1280×800, 1024×768, 1440×900, forced + system reduced motion, loading; Firefox incl. loading; GPU sample) → `qa-results.json`, `qa-run.log` |
| 21 repository suites (`run-all-suites.sh`, on the revision) | **860 / 0**, all green, incl. `destination-survey-check` 11/11 (new S11) and the 21st suite 14/14 → `qa-suites-summary.txt` |
| accepted 028A1 QA re-run on the revision | **11 / 19**. Every failure is a sentinel for a behaviour the owner asked to change, or provenance (§5). The identity flags inside I3 are all true. → `qa-028a1-rerun.json` |
| nested 028A QA re-run | **27 / 32**: provenance, the import allow-list, and the two reduced-motion "all nine at once" checks (§5) → `qa-028a-rerun-nested.json` |
| Firefox on the real GPU (headed spot checks) | departure 16.7 ms in every visible phase; standalone 0 frames > 40 ms in 4 / 4 swap runs (§0) |
| Safari / WebKit | not installed on this machine (mac12). Left for hardware QA |

### The milestone's 29 required checks, where they are proven

| # | check | QA |
|---|---|---|
| 1 | start SHA `80a39ce` | N1 |
| 2 | sphere files unchanged | N3, A12 |
| 3 | generator / validator files unchanged | N4, A12 (survey data / worker change additively, proven equal by S11) |
| 4 | one shared `PlanetSphereRenderer` | D1, A10 |
| 5 | no WebGL for clouds | A3, S13, S17 |
| 6 | screen-agnostic | A2 |
| 7 | dramatic preset | A5, S1–S4 |
| 8 | subdued preset | A6, S5, S6 |
| 9 | subdued ≈ 200–300 ms | A6 (210 ms nominal); S5 measured 246 ms (Chromium) / 253 ms (Firefox), GPU 243 ms |
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
| 20 | no generator call | D7 (counted from the Begin frame), L1 |
| 21 | survey disposed while concealed | D8, D9 |
| 22 | incoming not visible before cover | S2, D9 |
| 23 | reveal | D10 |
| 24 | reduced-motion departure | D5 (rm), D12, D17 |
| 25 | Chromium clean | all chromium checks |
| 26 | Firefox clean | all firefox checks |
| 27 | no console errors | S14, D13, L4 |
| 28 | no new WebGL warnings | D13, F0 |
| 29 | suites green | `qa-suites-summary.txt` 860 / 0 |

Revision checks: **D5b** (zoom beat), **S17** (bitmap clouds, no long task), **L1–L4** (loading), **S11** (parallel equals
sequential).

## 3. Key proofs

- **The swap happens only under full cover.**
  - The per-frame sampler (`timelines.json`) shows the incoming screen first appears on a `covered` frame with the veil at
    1.000.
  - Pixel probes during covered holds find 0 underlying pixels (minimum luminance 0.711; the underlying screens are dark).
- **Planet identity.**
  - The handed-over object `===` the selected cell's planet `===` the hook's `detail.planet`, with the same fingerprint.
  - The mounted surface is pixel-identical to that planet's own texture.
  - No generation from the Begin frame onward: 0 generator calls, 0 worker messages, 0 new workers.
- **Loading identity (L1, L3).**
  - Every world shown during the fill is fully validated (layers 1–8).
  - After the column moves, the view in every grid slot draws exactly that slot's planet.
  - The finished grid `===` the sector's cells; one `setPlanet` per world.
- **Yaw continuity.** No `setYaw` / `lookAt` / `setPlanet`; the yaw rises with the idle spin (max step 0.0059 rad / frame).
  No landing alignment.
- **Approach.**
  - The disc grows monotonically (697 → 2190 px at 1440×900). With the zoom beat it is already wider than the screen as
    the clouds begin (veil 0.00–0.01).
  - The globe's box never leaves the canvas.
- **Handoff order.** At 1440×900: covered → disposed +11 ms → mounted +13 ms → reveal +208 ms. With a 1.5 s hold:
  +1530 / +1533 / +1570 ms.

## 4. Performance

| | |
|---|---|
| WebGL contexts | survey: 1; the transition creates **0** |
| cloud DOM | DRAMATIC ≤ 44 nodes (14 clouds × 3 + veil + overlay; seeded runs 9–14 clouds), **0 after a run** |
| cloud bitmaps | 8, prepared in 36 ms (Chromium) / 86 ms (Firefox), worst main-thread stall 9 / 36 ms |
| frames, real GPU | Chromium (ANGLE/Metal, up to 2560×1440 @2×): 16.7 ms mean, p95 ≤ 16.8 ms in every phase. Firefox headed: see §0 |
| frames, headless software | Chromium departure p95 33–67 ms (software-rendered full-screen globe). Firefox reveal-start frames 50–150 ms (software rasterisation; absent on the real GPU) |
| long tasks | 0 in every Chromium run |
| repeated runs | 17 mixed runs: DOM nodes 73 → 73, listeners 17 → 17, key captures 0, animations 0 |
| loading (headless Chromium, pool 6) | first world 1.96 s, sector 4.8 s, scan-before-ready first world 0.56 s |
| loading (Firefox, pool 8) | first world 1.34 s, sector 5.7 s, scan-before-ready first world 0.83 s |
| CPU | the same validation work, spread over up to 8 workers (≈ 1 speculative validation per sector is discarded); the main thread never generates |

**Design changes made during QA.**
- **Removed:** CSS `blur()`, `will-change` and an animated veil highlight (whole frames under software compositing; a
  Firefox "will-change memory" warning).
- **Approach:** box-to-screen + camera dolly replaced CSS-scaling the box beyond the canvas, which caused a Firefox
  viewport warning.
- **Clouds:** bitmaps replaced inline SVG (revision).

## 5. Expected failures in the re-runs of older QA

None of these is a regression. Each is provenance, or a sentinel for a behaviour this milestone or the owner changed.

| failing check | why | behavioural? |
|---|---|---|
| 028A1 N1, 028A N1, N5 | file-list provenance sentinels (028A N1 / N5 already failed by design at 028A1's acceptance) | no |
| 028A N4 | import allow-list: the survey now also imports `atmosphere-transition.js` (required by 028B). The rest of N4 holds: no sphere internals, one renderer | no (intended) |
| 028A1 I2, I3 | wrap each view's `setPlanet` by its **original** grid index. Fill-in moves views between rows when a column settles, so "assigned" is false where a view moved. Every other identity flag in I3 is true: validated, rendered, dossier, focus, event, callback, unchanged, 0 generator calls. L1 proves slot ↔ planet directly | no (owner change) |
| 028A1 I6, 028A T8 (×2) | "no globe changes until all nine are validated" / reduced-motion scan "all nine at once" | no (owner decision: fill in as confirmed) |
| 028A1 I8 | "never more than three workers": the pool is now hardware threads − 2 (≤ 8) | no (owner request: faster loading) |
| 028A1 F1 | Firefox aggregate of the above | no |
| 028A1 N6 | aggregate of the nested 028A results | no |

- **`colony-development-check` [31]** passed in the final suite run. It is a pre-existing timing-dependent pixel flake: it
  also fails intermittently on a pristine `80a39ce` (`colony-check-31-flake.txt`).
- **Firefox "WebGL context was lost."** on survey disposal is the unmodified renderer's own message. F0 reproduces it on the
  untouched 028A page.

## 6. Evidence files

| | |
|---|---|
| `01-focused-before-begin.png` | focused planet before Begin |
| `02-early-approach.png` | 0.65 s: dossier gone, the planet zooming alone (no clouds yet) |
| `03-partial-cloud-entry.png` | 1.5 s: planet overfilling the view, clouds entering from the edges |
| `04-near-full-concealment.png` | 2.1 s: planet visible only through gaps |
| `05-covered-hold.png` | covered hold |
| `06-cloud-reveal.png` | clouds parting on the destination |
| `07-revealed-destination.png` | the handoff target |
| `08-reduced-motion-covered.png` | reduced-motion covered state |
| `09-standalone-subdued-peak.png` | standalone SUBDUED at its peak |
| `09b-standalone-dramatic-building.png` | standalone DRAMATIC building |
| `10-standalone-dramatic-covered-hold.png` | standalone DRAMATIC covered hold |
| `11a/b/c-seed-variation.png` | three seeds, covered |
| `12-firefox-revealed-destination.png` | Firefox: revealed destination |
| `13-firefox-standalone-covered.png` | Firefox: standalone covered |
| `14-loading-fill-in.png` | first load, the grid filling in (a column settling) |
| `15-scan-fill-in.png` | scan before the next sector is ready: new worlds filling in |
| `colony-check-31-flake.txt` | the [31] flake investigation |

`timelines.json` holds frame-by-frame timelines. `perf.json` holds frame statistics.

## 7. Known issues and recommendations

- **Duplicate world names (pre-existing).** Two different worlds in one sector can carry the same generated name, e.g.
  `desert_world` seeds 30939 and 42144 are both "Tharsis-278" (visible in `15-scan-fill-in.png`).
  - Names come from the generator (off-limits here, and part of the planet's identity), so the survey shows them as they
    are.
  - Recommend a naming fix in the generator track.
- **Safari / WebKit untested.** Test on classroom hardware, especially iPad Safari.
- **Low-end devices.** Check classroom Chromebooks. The departure's heaviest frames come from the large WebGL globe, and
  8 workers assume a desktop: the pool scales with `hardwareConcurrency`, so a 4-thread device gets 2.
- **Timing.**
  - Begin to fully revealed ≈ 3.6 s for a ready destination: 1.0 s zoom beat + ≈ 2.55 s transition.
  - Under reduced motion ≈ 0.9 s.
  - Tune after owner review.
- **Loading floor.** A complete sector is bounded by its slowest world's validation. The fill-in hides most of it. The
  Main Menu milestone's title-screen prefetch would hide the rest.
- **`demos/destination-survey.html` is unchanged** (announce-only; its header still calls the descent "the next
  milestone"). It now also fills in as confirmed, since that behaviour lives in the survey itself.
- **Still open for the Main PMO:**
  - wiring SUBDUED into gameplay rooms;
  - the root `index.html` integration;
  - title-screen prefetch;
  - the `file://` decision.
