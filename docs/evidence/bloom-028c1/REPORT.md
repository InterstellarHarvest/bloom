# BLOOM-028C1 — Menu ↔ Destination Survey fade · evidence report

**Recommendation: ACCEPT.**

- Branch `agent/bloom-028c1-menu-survey-fade` (worktree `_worktrees/bloom-028c1-menu-fade`), from **`1b0e375`** (BLOOM-028C
  final evidence). `1b0e375` is the first parent of the first commit on the branch (QA N1).
- Commits: `18a0033` the fade; `c620c16` a Firefox painting fix found by QA (§3); `83a5f76` the status line cleared under
  black (§3); then this evidence commit. All QA below ran on **`83a5f76`**.
- Not merged, not pushed. Handoff: `docs/MAIN_MENU_v1.md` §6 and §7.

## 1. What changed

Menu ↔ Destination Survey now goes through a plain fade to black. The SUBDUED AtmosphereTransition is no longer used for it.

- **`ExpeditionEntry`** owns one black `<div>` (`.ee-black`). It sits above both screens and below the departure's clouds,
  and is `display: none` when clear. The fade is a Web Animations opacity animation. Nothing else moves: no clouds, no zoom,
  no wipe. It is about 25 lines of entry logic, not a new transition system.
- **BEGIN:** the menu is made `inert` → black → in one task, the menu is hidden and the survey constructed (with the
  prefetched pool) → two animation frames → the black lifts.
- **← Main menu:** the survey is made `inert` → black → the survey is disposed and the menu shown `settled` with its next
  painting → the black waits for that painting to load and decode, then two frames → the black lifts.
- **`MainMenu.show({ settled: true })`** (new option): no entrance replay, and the painting appears without its own
  0.55 s fade. The menu is complete and at rest before the black lifts, so the lifting black is the entrance.
- **The `AtmosphereTransition`** code and presets are byte-identical (N3). The entry still creates its instance, but only
  hands it to the survey's dramatic departure (focused planet → gameplay is unchanged, D1).
- **Unchanged:** first-sector prefetch on the title screen, exact planet identity, one WebGL context, random-painting-on-return.

## 2. Timings

| | to black | held black | from black | easing |
|---|---|---|---|---|
| menu → survey | **220 ms** | until mounted + 2 frames | **250 ms** | `cubic-bezier(.4,0,.2,1)` |
| survey → menu | **220 ms** | until disposed, painting decoded + 2 frames | **250 ms** | same |
| reduced motion | **80 ms** | as above | **80 ms** | same |

Each fade's nominal duration was read from the black layer's animation on every sampled frame. It was exactly 220/250 ms
(80/80 under reduced motion) in all 48 crossings.

Measured from the click (ms; ranges over all runs):

| | black reached | held | lift | fully revealed |
|---|---|---|---|---|
| **real GPU (Metal)**, begin | 247–280 | 39–88 | 263–278 | **549–646** |
| **real GPU (Metal)**, return | 263–265 | 32–34 | 283–284 | **580–581** |
| Firefox, begin ×6 | 228–233 | 58–90 | 243–265 | 529–584 |
| Firefox, return ×6 | 240–250 | 15–19 | 250–270 | 506–533 |
| Chromium SwiftShader, begin ×10 | 237–277 | 157–250 | 295–700 | 705–1142 |
| Chromium SwiftShader, return ×10 | 297–375 | 19–34 | 265–284 | 591–668 |
| reduced motion (Chromium / Firefox) | 77–145 | 18–221 | 73–119 | 179–460 |

- On the real GPU, both fades run at a steady 60 fps (14–16 frames each).
- Without a GPU (SwiftShader), Chromium can spend about 300 ms on a frame while a half-built sector fills in. A lift can then
  land in one or two frames there. This is the CPU renderer, not the fade: the same crossings on Metal are smooth.
- "Held" on a begin is the survey's construction plus its first globe frames. Nothing is revealed until those are drawn.

## 3. Found and fixed during QA

1. **Firefox: the black could lift onto the previous painting.** While a new image is still loading, Firefox's
   `img.decode()` resolves at once against the *old* image (`complete: false`, old pixels); Chromium waits. On a slow
   network a return would have revealed the previous painting, which would then pop to the new one. `MainMenu._show` now
   waits for the new image's `load` / `error` before decoding (`c620c16`). It is caught by the slow-painting case (F8), which
   also checks `currentSrc`.
2. **Stale status line.** The settled return showed "Sector surveyed · nine worlds ready" for a sector that had just left
   with the survey. It is now cleared under the black, and the fresh prefetch reports its own progress (`83a5f76`).
3. **Reduced motion from the OS** (no Settings override, so the entry's value is `null`) was read as "full motion" in the
   first draft. `_fade` now resolves `null` from `prefers-reduced-motion`. Verified as RM (system) in both browsers.

## 4. Frame evidence: screens swap only while black

Every crossing is sampled once per animation frame (`timelines.json`). For each frame the sampler records:

- the black layer's computed opacity;
- whether the menu is displayed and whether the survey is mounted and visible;
- the painting's state (`is-shown`, decoded, `currentSrc`), the plaque's opacity and the status text;
- any `.atx` overlay, and transforms / clip-paths on the hosts;
- live WebGL contexts and live workers.

**48 crossings** (Chromium 10 round trips at 1280 × 800 and 390 × 844 + slow + reduced ×2; Firefox 6 + slow + reduced ×2;
GPU 2), all passing F1 / F5:

- the old screen disappears, and the new one first appears, on a frame with black opacity **1**;
- every partly black frame shows exactly one screen (the old one before the swap, the new one after), never both and never
  neither;
- at least one fully black frame holds the new screen before the lift. On a begin, that frame has already drawn globes
  (renderer frames ≥ 1);
- no cloud overlay on any frame; no transform or clip-path (no zoom, no wipe).

Real-GPU return (cycle 1). Columns: ms, state, black, screen, survey, WebGL contexts, workers.

```
300  to-menu  0.9999  -                                  ds:survey:9   gl 1  workers 6
317  to-menu  1       menu(bg4, painting pending)        -             gl 0  workers 0   ← swap: survey disposed, menu shown, black = 1
333  to-menu  1       menu(bg4)                          -             gl 0  workers 0   ← painting decoded, still black
383  to-menu  0.9895  menu(bg4, plaque 1)                …lift begins
633  menu     0       menu(bg4)                                              workers 6   ← fresh prefetch after the lift
```

Real-GPU begin (cycle 1):

```
333  to-survey  0.9999  menu(bg8)              -
350  to-survey  1       -                      ds:loading:9  renders 0   ← swap at black = 1
433  to-survey  1       -                      ds:loading:9  renders 1   ← globes drawn, still black
467  to-survey  0.9894  -                      ds:loading:9  renders 3   ← lift
```

**Slow preparation stays black.** Two cases were injected:

- *A 700 ms WebGL init.* The black held through it: 750 ms (Chromium) and 733 ms (Firefox) from black to mounted, and the
  lift only after globe frames.
- *The next painting held back 1200 ms on the network.* The black held 1240–1242 ms, and on every lifting frame the new
  painting was decoded, fully opaque and from the new file.

Stills (each fade seeked to its midpoint and paused): `01-menu-fading-to-black`, `02-survey-fading-in`,
`03-survey-fading-to-black`, `04-menu-fading-in-next-painting`, `05-menu-after-return`.

## 5. Reduced motion

- Forced (`?rm=1`), from Settings, or the OS with the setting on "follow system": **80 ms to black, 80 ms from black**.
- The swap rules are the same: swap only at full black, and the black is held until the new screen is drawn.
- The survey still gets its own reduced path. The return's menu is settled under the black as usual.
- Measured fully revealed: 243–460 ms after the click (begin), 179–330 ms (return).

## 6. Regression results

| | |
|---|---|
| **browser QA** `qa-menu-fade.js --shots` on `83a5f76` | **239 / 239**: provenance N1–N5; Chromium + Firefox + GPU → `qa-results.json`, `qa-run.log`, `perf.json`, `timelines.json` |
| leaks (F10, after every return, 18 round trips in all) | listeners **25 → 25** and observers 0 → 0 (pre-survey baseline); no key capture; **0** live WebGL contexts (exactly one created per visit); the survey's workers all terminated, so the only live workers are the fresh prefetch's pool; no survey DOM; no overlay; black layer `display: none` with no animation; nothing left inert; focus on BEGIN |
| prefetch + identity (F9, every cycle) | the survey's worlds **are** the prefetched objects (`===`): complete sectors adopted whole, half-built ones filled in; all validated (layers 1–8); zero main-thread generation; a double click enters once |
| painting on return (F8) | always the preloaded next painting, never the one just shown |
| dramatic descent (D1, Chromium + Firefox) | from a survey entered after a full round trip: **`atx atx-descent`** (DRAMATIC) covers; the handoff gets the very planet object the survey showed; the survey is disposed under the clouds; the black layer never appears |
| console | clean in both browsers. Firefox's "WebGL context was lost." on each survey dispose is the unmodified renderer's own message (F0 control on the accepted survey page) |
| 22 repository suites (`run-all-suites.sh` on `83a5f76`) | **875 / 2**: 20 suites ALL CHECKS PASS; the 2 failures are timing flakes in code this milestone does not touch — `colony-development-check` [31] (the pre-existing flake documented in 028B) and `slice-check` pacing (238 s against its 4-minute floor, under sweep load). Each passed every isolated re-run (`suite-flakes.txt`) → `qa-suites-summary.txt`. `main-menu-check` 17 / 17, including new M7g (the entry never runs the AtmosphereTransition itself; opacity-only fade) and M7h (settled return) |
| provenance | only `expedition-entry.js`, `main-menu.js`, `main-menu.css`, `tools/main-menu-check.js`, `MAIN_MENU_v1.md`, the demo's header comment and this folder changed. AtmosphereTransition, survey + pool + worker, sphere, generator, content, paintings and `index.html` are byte-identical to `1b0e375` |
| Safari / WebKit | not installed on this machine; untested |

**Not re-run:** the accepted 028B / 028C browser QA scripts. 028C's E2 / R1 assert the SUBDUED mist this milestone removes,
so they would fail by design. Every file 028B exercises is byte-identical (N3), and the menu-entered departure is covered
by D1 above.

## 7. Git state

- `agent/bloom-028c1-menu-survey-fade`: `1b0e375` → `18a0033` → `c620c16` → `83a5f76` → evidence commit. Local only.
- Not merged, not pushed. Working tree clean after the evidence commit.
- Tutorial implementation not started.
