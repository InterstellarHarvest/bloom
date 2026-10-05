# AtmosphereTransition v1 — integration handoff (Main PMO)

**From:** BLOOM-028B · **For:** the Main PMO, which will reuse it for gameplay-room transitions, and anyone else who
needs to change screens behind a cloud. Evidence and QA: `docs/evidence/bloom-028b/REPORT.md`.

`AtmosphereTransition` is BLOOM's reusable screen transition. Stylised, chunky cloud forms close over a soft atmospheric veil
and conceal whatever is underneath. The transition then waits while you replace that content, for as long as your work takes,
and parts again to reveal the new state. It knows nothing about planets, menus or gameplay. You should be able to use it
without reading its implementation.

---

## 1. Files

| | |
|---|---|
| `resources/atmosphere-transition/atmosphere-transition.js` | **`AtmosphereTransition`**, **`ATMOSPHERE_PRESETS`** (the module you import; no dependencies) |
| `demos/atmosphere-transition.html` | technical demo: DRAMATIC / SUBDUED, reduced motion, immediate / delayed / failing covered work |
| `demos/expedition-descent.html` | the Destination Survey → expedition integration harness (the DRAMATIC consumer, §7) |
| `tools/atmosphere-transition-check.js` | the 21st regression suite (contract checks in Node) |

The module also exports `layoutClouds(preset, seed)` (pure; §6.1) and its bounds, `LAYOUT_VARIATION`.

## 2. Quick start

```js
import { AtmosphereTransition } from "./resources/atmosphere-transition/atmosphere-transition.js";

const atx = new AtmosphereTransition();            // covers the whole viewport (host = document.body)
await atx.run({
  preset: "subdued",
  async onCovered({ signal }) {
    showRoom("adapt");                             // swap the screen underneath; may be async
  },
});
// … later, when the app no longer needs it:
atx.dispose();
```

- Plain ES module, so serve over http(s), like the rest of the menu work (`python3 -m http.server 8767`).
- The module injects one small `<style id="bloom-atx-style">` the first time it is constructed. No stylesheet to link.
- One instance can run any number of transitions, one at a time. Keep one per app or screen host and reuse it.

## 3. API

```js
new AtmosphereTransition(options?)
```

| option | default | |
|---|---|---|
| `host` | `document.body` | element to cover. `body` → `position: fixed`, full viewport. Any other element → `position: absolute; inset: 0` inside it (a statically positioned host becomes `position: relative` for the run, then is restored) |
| `zIndex` | `10000` | stacking of the overlay |
| `reducedMotion` | `null` | `null` follows `prefers-reduced-motion` at the start of each run; `true` / `false` force it |
| `blockInput` | `true` | swallow pointer and unmodified keyboard input while a run is active (Ctrl / Meta / Alt shortcuts pass) |
| `colors` | — | palette overrides `{ light, shade, far, farShade, veilA, veilB, veilC }` (any CSS colours) |

```js
atx.run(options) → Promise<result>
```

| run option | default | |
|---|---|---|
| `preset` | `"dramatic"` | `"dramatic"`, `"subdued"`, or a preset object (shape as in `ATMOSPHERE_PRESETS`) |
| `onCovered(info)` | — | called **once**, at the covered point. May return a promise; the reveal waits for it. `info = { signal, preset, reducedMotion, concealed }` |
| `conceal` | preset's | `"full"` (veil fully opaque at covered) or `"partial"` (a mist at the preset's peak). Use `"full"` with SUBDUED when a swap must be completely hidden |
| `reducedMotion` | instance setting | per-run override |
| `origin` | `{ x: .5, y: .5 }` | focus of the cloud motion, as fractions of the host (clouds gather toward it and part away from it) |
| `coveredTimeoutMs` | wait | treat an `onCovered` that has not settled by then as failed (§5) |
| `onPhase(phase)` | — | called on each phase change: `"concealing"`, `"covered"`, `"revealing"`, `"idle"` |
| `seed` | random | the cloud layout of this run (§6.1). Leave it out in the product so no two transitions look alike; pass one to reproduce a run exactly (QA, screenshots, a bug report) |

`result = { preset, reducedMotion, concealed, seed, mirrored, coveredHoldMs, totalMs, times: { start, covered, coveredDone, revealStart, end } }`
(times in ms from the start of the run).

Read-only: `atx.running`, `atx.phase`, `atx.runs`, `atx.disposed`. `atx.dispose()` is idempotent.

## 4. Lifecycle and the covered contract

```
run() ─► concealing ─► COVERED ─► onCovered() … (async, as long as it takes) ─► revealing ─► idle (overlay removed)
```

- **Covered is the contract point.** With `conceal: "full"` (DRAMATIC, or SUBDUED when asked), the veil is fully opaque
  when `onCovered` is called, so nothing underneath can be seen. Replace or prepare the underlying state there.
- **The reveal never starts before `onCovered` settles.** It then waits the preset's `settleFrames` (DRAMATIC 2,
  SUBDUED 0), so freshly mounted content has painted before the clouds part.
- **A long hold is alive, not frozen.** The clouds keep drifting during it (CSS keyframe animations on transforms, which
  run on the compositor).
- **No artificial delay.** If `onCovered` returns at once, the covered state lasts only the preset's `minCoveredMs`
  (DRAMATIC 160 ms, SUBDUED 0).
- **Input.** While a run is up, pointer input never reaches the page underneath (the overlay covers its host), and
  unmodified key events are swallowed.
  - If keyboard focus was inside the host, it is blurred at the start.
  - **You restore focus** on your new screen after `run()` resolves.
- **Accessibility.** The overlay is `aria-hidden` and contains nothing focusable. Announce the screen change from your
  new screen, as you would without a transition.
- **Clean-up.**
  - The overlay is built when a run starts and removed when it ends, after success or failure.
  - Between runs, nothing is left in the DOM except the one shared `<style>`.
  - No listeners or animations are left behind (QA S13: 17 mixed runs, DOM nodes / listeners / animations back at baseline).

## 5. Errors and reentrancy

| situation | what happens |
|---|---|
| `onCovered` throws or rejects | the clouds still reveal and remove themselves, then `run()` rejects with **that same error** (never swallowed). `error.atmosphereTransition` carries the run's times |
| `coveredTimeoutMs` passes | treated as a failure: `info.signal` is aborted, the overlay reveals and clears, `run()` rejects with `name: "AtmosphereTransitionTimeout"`. Your `onCovered` keeps running unless it watches the signal |
| `run()` while a run is active | rejects at once with `name: "AtmosphereTransitionBusy"`; the active run is not disturbed |
| `dispose()` during a run | the overlay is removed immediately, `info.signal` is aborted, `run()` rejects with `name: "AbortError"` (even while `onCovered` is still pending) |
| `run()` after `dispose()` | rejects with `AbortError` |
| unknown preset | rejects with `TypeError` |

**Restoring the screen when something fails.** If your covered work can fail, put the outgoing screen back *inside*
`onCovered`'s catch, before rethrowing. You are still under cover, and the reveal then shows a consistent screen. The
Destination Survey does exactly this (§7).

## 6. Presets

### DRAMATIC — big, rare moments (the descent to a world)

- **Intended use.** Destination Survey → expedition, and any once-per-session "we are going somewhere" moment.
- **Timing (full motion).**
  - conceal 1350 ms, then at least 160 ms covered, 2 settle frames, reveal 1000 ms;
  - ≈ 2.65 s from `run()` to the end when the covered work is instant (measured 2.64–2.67 s, Chromium);
  - the covered phase lasts longer only while your work needs it.
- **Visual phases.**
  1. The near clouds close in from the edges of the screen; the centre stays open longest.
  2. Mid clouds slide in.
  3. Far clouds swell out of the distance around `origin`.
  4. The veil fills the gaps (it starts at 380 ms and reaches fully opaque at covered).
  5. Hold: the clouds drift slowly.
  6. Reveal: everything streams outward past the edges, growing as if flown through, while the veil fades.
- **Structure.** Up to 14 clouds in 3 depth layers (far 5, mid 4, near 5) over 1 veil: at most 102 DOM / SVG nodes while
  up, 0 after. The layout differs on every run (§6.1).
  - Each cloud is a `<div>` (enter / exit motion) holding a `<div>` (drift), which holds an inline `<svg>` with two `<use>`
    of a shared circle-cluster silhouette. The two `<use>` are a shade and a light tone; their offset gives the chunky
    two-tone cartoon underside.
  - Depth comes from tone and opacity, not filters (§9).

### SUBDUED — frequent gameplay-room changes (~200–300 ms)

- **Intended use.**
  - Main ↔ Adapt, Main ↔ Spread, Main ↔ Terraform, Main ↔ Region Inspect, and similar.
  - **It is not wired into any gameplay screen yet.** That is the Main PMO's job; 028B only proves it in the standalone demo.
- **Recommended configuration.** The preset as shipped: `atx.run({ preset: "subdued", onCovered })`.
  - Conceal 90 ms, no minimum hold, no settle frame, reveal 120 ms: 210 ms nominal.
  - Measured 242–263 ms from `run()` to the end, including frame alignment (Chromium, Firefox and a real GPU).
- **Visual.**
  - A horizontal mist band sweeps a short way across the screen while it fades up to 0.74 opacity. Three wisps drift a
    few percent sideways.
  - No zoom and no globe assumptions. 29 nodes while up.
- **Coverage is deliberately partial.** A swap at covered is softened, not hidden: the mist peaks at 74 %. If a room swap
  must not be seen at all (layout jumps, half-drawn content), pass `conceal: "full"`. The veil then reaches 1 within the
  same timing (measured ≈ 250–300 ms).
- **Async work.** The same covered contract applies. If a room needs time to prepare, the mist simply holds until
  `onCovered` resolves. Prefer preparing rooms before calling `run()`, so the 200–300 ms feel survives.

### 6.1 Every run is different (seeded layouts)

The presets give a *base* composition, the anchors that make the build read correctly (edges first, centre last). Each run
then draws its own layout from a seed with `layoutClouds(preset, seed)`, so a transition the player sees twenty times
never replays the same animation:

- **Mirroring.** Half the time the whole composition is mirrored left ↔ right; the SUBDUED sweep then runs the other way.
- **Position and size.** Each cloud moves up to ±6 % (near), ±9 % (mid) or ±12 % (far) of the screen and is sized
  ×0.85–1.2.
- **Cloud count.** About one far or mid cloud in five sits the run out (9–14 clouds in DRAMATIC). Near clouds always come,
  so the edges still close first.
- **Character.** Each cloud gets a random cumulus silhouette and facing (wisps stay wisps), its own drift period, phase
  and direction, and an entry stagger of up to 160 ms.

**Concealment does not depend on any of this.** The veil alone reaches full opacity at covered. QA proves it with pixel
probes on random layouts, and the Node suite checks 200 seeds against the bounds.

The default seed is random (`Math.random`). Pass `seed` only when a run must be reproduced.

## 7. The first consumer: Destination Survey → expedition (DRAMATIC)

`DestinationSurvey` takes an optional `descent` option (`docs/DESTINATION_SURVEY_v1.md` §3). Without it, Begin Expedition
only announces the selection, as in 028A. With it:

```js
const survey = new DestinationSurvey(root, {
  descent: {
    async onCovered(detail, info) {      // only under full cloud cover
      detail.survey.dispose();           // the outgoing screen goes while hidden (otherwise it disposes itself afterwards)
      await mountExpedition(detail.planet);   // THE selected planet object — never regenerate it from the seed
    },
    onError(err, detail) { /* the survey is back in focus state; tell the player */ },
    // transition: sharedAtmosphereTransition,   // optional; default: a private one over document.body
    // coveredTimeoutMs: 15000,                  // optional
    // seed: 1234,                               // optional: fix the cloud layout (default: a fresh one every departure)
  },
});
```

What Begin Expedition then does:

1. **Commit.**
   - The screen enters `"departing"`: Begin, Return, Scan and selection are all refused, so a double click is harmless.
   - The `bloom:begin-expedition` event and `onBeginExpedition` fire once, with the same `detail` as 028A plus
     `detail.descent` (a promise of the whole departure).
   - The next-sector prefetch workers are stopped, so no world is generated while departing.
2. **Recede.** The dossier and header fade and slide away (320 ms).
3. **Approach.**
   - The **same live `PlanetSphereView`** keeps turning; its yaw is never set.
   - Its container eases from the focus slot to exactly the screen's rectangle (760 ms), so the world drifts to the
     centre. The WebGL viewport never leaves the canvas.
   - Its camera then dollies in, through the public `setDistance`, from 3.6 to the view's closest 1.45 over 2 s,
     accelerating.
   - The disc becomes wider than the screen while the clouds are still thin (veil ≈ 0.1). No new view, no second renderer.
4. **Atmosphere.** 560 ms after Begin, `run({ preset: "dramatic" })` starts. The planet stays visible through the cloud
   gaps early on.
5. **Covered.** `descent.onCovered(detail, info)` runs. The survey is disposed (by you, or automatically when your callback
   resolves) and your destination is mounted.
6. **Reveal.** The clouds part on the new screen. `detail.descent` resolves `{ detail, transition }`.

**There is no landing alignment.** Nothing rotates the globe toward a starting region; the clouds are the seam.

**Failure.** If `onCovered` throws, the survey restores itself while still covered:
- focus state, dossier back, the same view at its inspection distance;
- prefetch resumed.

The clouds then reveal it, `detail.descent` rejects and `onError` is called (default: `console.error`).

**Reduced motion.** The UI fades without sliding, there is no approach, and the transition takes its reduced path
(below). The globe was not spinning anyway (PlanetSphereView, unchanged).

## 8. Reduced motion

Handled inside the component; consumers need do nothing.

- **Detection.** `prefers-reduced-motion: reduce` is read at the start of every run (`reducedMotion` option to force it).
- **What changes.** No cloud travel, no scaling, no drift: static cloud forms and the veil fade in and out with opacity
  only.
- **What stays the same.** Covered contract, callbacks, input blocking and clean-up.

| | conceal | min covered | reveal |
|---|---|---|---|
| DRAMATIC, reduced | 300 ms | 120 ms | 380 ms (opaque at covered) |
| SUBDUED, reduced | 80 ms | 0 | 110 ms |

## 9. Performance

| | |
|---|---|
| technology | DOM + inline SVG + Web Animations / CSS keyframes on `transform` and `opacity` only. **No canvas, no WebGL** (QA: 0 contexts created by any number of runs) |
| per-frame JavaScript | none (one `requestAnimationFrame` per settle frame; the drift is CSS) |
| frames | **real GPU** (Chromium, ANGLE/Metal): 16.7 ms mean / p95 ≤ 16.8 ms in every phase, standalone and during the survey departure. **Headless software rendering:** Chromium standalone 16.7 ms throughout. Firefox measured 17 ms in a plain rAF probe, but mean 21–30 ms (p95 ≤ 83 ms) under the QA driver, whose per-frame sampler forces style reads. Firefox on a real GPU was not measured |
| main thread | no long tasks attributable to the transition |

**What we removed and why.** An earlier draft used CSS `blur()` on the far and mid clouds, `will-change` on every cloud, and
an animated highlight layer in the veil.

- Under software compositing these cost whole frames: Firefox 50–100 ms, Chromium 33 ms.
- Firefox also warned "will-change memory consumption is too high".

**Do not reintroduce filters or `will-change` on these full-screen layers.**

## 10. Out of scope (deliberately)

- **Not done here:**
  - gameplay-room integration of SUBDUED (Main PMO);
  - root `index.html` integration;
  - the Main Menu, and first-sector prefetch on the title screen (028A1 measured 3–5 s; start it while the title screen
    shows).
- **Excluded by design:**
  - landing alignment of the globe;
  - First Bloom seam masking (its rectangle seam may simply be hidden by late cloud cover).
- **Not tested:** Safari / WebKit. The engine is not installed on the test machine (mac12), so test on classroom hardware.
