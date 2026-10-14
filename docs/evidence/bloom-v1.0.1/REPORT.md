# STRANGE BLOOM · UNKNOWN SOILS — v1.0.1 UI polish hotfix · evidence

Post-release, owner-directed presentation hotfix on top of production v1 (game release `2c491f1`, docs closeout `ab29f6b` =
`origin/main` at the start). No feature, gameplay, world-generation, species, Challenge-bank or simulation change. Review branch
`handoff/bloom-v1.0.1-review`; **not merged** — stopped for PMO review.

Scope = the PMO brief (1 · 2) plus the owner's five additions during the run (3 · 4 · 5 · 6 · 7):

| # | Owner direction | Where it lives |
|---|---|---|
| 1 | Main Menu shows **no** Expedition-prefetch progress; the prefetch itself continues | `resources/main-menu/expedition-entry.js`, `main-menu.js`, `main-menu.css` |
| 2 | No player-facing text is pointer-selectable (one central rule) | `resources/main-menu/main-menu.css` — the app-shell block |
| 3 | CREDITS removed from the title; attribution / licences kept | `main-menu.js`, `main-menu.css`; README "Credits", Three.js vendor LICENSE, bundle `@license` |
| 4 | Settings = Motion · **Show Training recommendation again** · **Reset preferences**; nothing gameplay-affecting | `main-menu.js`, `expedition-entry.js` (training store), `main-menu.css` |
| 5 | Right-hand planning panels take their content's height (hub dossier · species dossier · survey focused dossier · Challenge Planet Dossier) | `challenge-hub.css`, `species-select.css`, `destination-survey.css`, `challenge-world-screen.css` |
| 6 | The flat gameplay map draws exactly **one** copy of a cylindrical world | `resources/run-ui/run-map-renderer.js` (+ comments in `planet-view.js`) |
| 7 | Icy water on frozen planets is distinct from frozen land | `resources/planet-surface/planet-surface.js` (the canonical surface: globe = map) |

## 1 · Status UI removed, background prefetch retained

**Exact code removed** (commit `12a5e00`):

- `MainMenu.setStatus(text)` and the `statusEl` field; the `<p class="mm-status" role="status" aria-live="polite">` element; the
  status's share of `recede()` (its opacity animation) and `_replayEntrance()`.
- `main-menu.css`: the `.mm-status` pill block (`.mm-status`, `::before`, `:empty`), its entrance animation line, its
  `is-receded` / `is-settled` / reduced-motion / `.rm` selectors and the narrow-screen reposition. No empty slot is left: the
  element no longer exists, so nothing reserves space and nothing shifts when the prefetch completes (M3 proves the card's
  rectangle is identical before and after readiness at 390×844 · 1024×768 · 1440×900 · 2560×1440).
- `expedition-entry.js`: the four `this.menu.setStatus("")` calls on every return to the title and, in `_prefetchSector()`,
  the `status()` closure + `pool.onProgress = status` that published `` `Surveying sector · ${p.confirmed} of ${p.total} worlds` ``.

**Prefetch unchanged:** `_prefetchSector()` still calls `DestinationSurvey.prefetch({ ...first, ...this.poolOpts, species })`
from the constructor (while the title shows) and after every return to the title with no pool; it still records
`stats.prefetches[].readyMs`. Candidate generation, worker count, validation, first-sector / species behaviour and the Destination
Survey's own loading UI are untouched (no file under `resources/destination-survey/` changed for this item). Proof that it still
runs and is used: `ui-polish-check` M2 polls the title from the first frame — the confirmed count advanced 0 → 1 → 2 → 4 → 5 → 8 → 9
with **no** status element and none of "Surveying sector" / "n of 9 worlds" / "Sector surveyed" / "worlds ready" on the page at any
poll; BEGIN EXPEDITION's survey then reported `stats.adopted = true` with the prefetched worlds already present; back on the
title there is still no banner. `release-check` R16b was rewritten to the same guard (the live root, 180 s wait to readiness).

## 2 · Pointer text selection

**Canonical rule** (`resources/main-menu/main-menu.css`, the "(BLOOM-030; BLOOM-033) app document shell" block that already
styles `html.mm-page`, the production document's root — `index.html` and its `demos/main-menu.html` alias carry that class;
repository docs and developer pages do not):

```css
html.mm-page{-webkit-user-select:none; user-select:none}
html.mm-page dialog{-webkit-user-select:none; user-select:none}
```

**The one exception — and why:** the browser proof found text inside the Settings `<dialog>` still selectable. An element in the
top layer does not resolve the property's `auto` value against its DOM parent (Chromium computes `text` inside a modal), so the
root rule did not reach the title's three `<dialog>`s (Training placeholder · first-run recommendation · Settings). The same rule is
stated once more, centrally, for `html.mm-page dialog` (commit `6ea89ef`). No component-level declarations were added, no
`mousedown` / `preventDefault` script, no pointer-event suppression; `bloom-theme.css` (shared with docs / demos) carries no
selection rule. There is no editable `<input type=text>` / `<textarea>` / `contenteditable` in the released UI (only the Settings
radios), so no further exception exists.

**Accessibility / interaction unaffected:** buttons, keyboard focus and Tab / arrow traversal, focus rings, scrolling, pointer and
touch controls, the Settings radios, dialogs, accessible names and `aria-live` announcements are presentation-independent of
`user-select`; T1 clicks a radio after the drags, S1 / S2 drive Settings by keyboard, and the regression suites' keyboard /
focus checks all still pass (below).

## 3 · Credits removed; attribution kept

The CREDITS entry, its dialog markup, the `.mm-credits` styles, its click handler and its icon mapping are gone (commit
`12a5e00`): no hidden button, no empty slot, no unreachable dialog; the keyboard list wraps over four. Kept, verified by
`main-menu-check` M10: README § Credits (team, paintings, Three.js MIT), `resources/planet-sphere/vendor/three-0.185.1/LICENSE`,
and the `@license` header inside the portable bundle. Menu QA across the suites now expects exactly
`begin · challenges · training · settings`.

## 4 · Settings — Motion · Training · Local preferences

- **Show Training recommendation again** → `ExpeditionEntry.resetTrainingRecommendation()` = the training store's own
  `clearTraining(storage)` + re-sync of the Recommended tag. No second storage format; nothing is launched; no in-memory
  Challenge / Expedition state is touched. The button exists only when a real training hook exists (as TRAINING itself does).
- **Reset preferences** → `MainMenu.resetPreferences()`: Motion → Follow system through `writeSettings` (the radio, the stored
  record, the `rm` class and the entry's `reducedMotion` update in place — no reload) and the same training reset. Only
  `strange-bloom.settings` and `strange-bloom.training` change; no `localStorage.clear()` anywhere in production (M10 scans).
  A polite live line in the dialog confirms either action; the reset is low-risk, so there is no confirmation step.
- Not added (owner): difficulty, audio, graphics, colour-blind / high-contrast, text-size, save / Continue, progression,
  Challenge options, **"pause while decision rooms are open"** (it changes run timing under Dying World / Native Competition /
  Volatile Climate / Thin Air — explicitly deferred to its own gameplay-design / QA pass), **Fullscreen** (deferred).

## 5 · Planning panels — content height, top-aligned, capped

Smallest CSS change per screen (commit `acb625d`); phone sheets / stacks unchanged:

- Challenge hub `.ch-dossier`: `align-self:start; max-height:100%` of the grid row (the row gets `grid-template-rows:minmax(0,1fr)`
  — already there); only a dossier taller than the row scrolls inside `.ch-d-main`. Left list untouched (still its own scroller).
- Challenge Planet Dossier `.cw-dossier`: the same (`.cw-body` gets its explicit `1fr` row); phone keeps `align-self:stretch`.
- Species `.ss-dossier`: `bottom:auto`; the inner grid carries the cap `max-height:calc(100cqh − top − 16px − 4px)`, so the actions
  follow the content and only an overflowing dossier scrolls; the 78 % phone sheet keeps `height:100%; max-height:none`.
- Destination Survey `.ds-dossier`: `align-self:start` with `margin-top` = the focused globe's own centring offset
  (`max(0px, (100cqh − head − 20px − F) / 2)`) so its top is level with the globe's, and `max-height` = the space below that; the
  ≤ 820 px stack resets the margin.

## 6 · One flat world

`run-map-renderer.js` (commit `59e834b`): `layout()` keeps one copy (`kMin = kMax = 0`) for cylinders and rectangles, tile = the
largest whole device pixel that fits both stage dimensions, centred; the stage either side is frame colour. `hitTest()` maps only
the drawn world (frame → `tile −1, region −2`; the Planet View's click path then deselects), `bubbleAt()` / `clientOf()` resolve on
the one world (so `regionPoint` / `regionRect` and the Training callouts follow). Overlays are drawn once; a water crossing over the
x = W−1 → 0 seam is drawn clipped to the world at k = 0 and the one re-entering offset, so its dots leave one edge and arrive at the
other. Topology, spread, crossings, fronts, neighbours, fingerprints, generation, validation and banks: untouched
(`topology-check` 53/53, `crossing-check` 14/14, `native-competition-check` below). Rectangles unchanged (W2). The seam is shown
as clean canonical edges — no ghost copies, strips or arrows; QA did not find the edge relationship confusing on the Frozen,
Ocean or Desert worlds driven, so nothing is raised to PMO on that point.

## 7 · Icy water (design study → option A)

`planet-surface.js` (commit `0cab8cc`): water under a sky colder than the frost line (`frostBelow` −8 °C) carries `cold:true` —
base `mix(water, coldWater [58,104,156], 0.42)`, shallows toward `coldShallow [168,214,230]` (never white), ripple marks
`mix(rgb, coldMark [26,64,118], 0.5)` — darker than the water. The white frost glints remain land-only; it thaws as the sky warms.
Same stipple lattice (sphere-texture C2 / C3 periodicity holds); the globe paints the same function (D2). Warm-sky worlds (Ocean,
Desert, the authored 6–8 °C planets) are byte-identical to before (C1).

Study (`cold-water-study/`): current · **A** darker ripples · B sparse cyan seams · C floe / crack marks, on Frozen World 7 (Ymir-853)
and 25 (Hollow-329). **A chosen:** clearest "this is cold WATER" with the least noise. B's light cyan seams drift back toward the
glint motif; C's cracks read as the letter "L" at map resolution. The two were not equal, so PMO was not asked.

## Browser results — `tools/ui-polish-check.js` (new, the 46th suite)

| Engine | Sections | Result |
|---|---|---|
| Chromium 147.0.7727.15 | T · M · S · P · W · C · O | **32 / 32** (the regression's single run; `regress-1/ui-polish-check.log`) |
| Firefox 148.0.2 | T · M · S · P · W · C · O | **32 / 32** (same run) |
| WebKit 18.0 (macOS 12 build, Playwright 1.46.1 client) | T · M | **7 / 7** (`--only T,M`; the frozen build is the Safari proxy, as in BLOOM-037) |

- **T1 · text selection:** 19 pointer drags (down on the text, across it, released outside the element) and double-clicks — Main Menu
  title + subtitle, a menu label (TRAINING; nothing launched), Settings copy + a motion choice, Species Selection card + dossier, the
  Destination Survey header + focused dossier, the gameplay HUD + banner, the Adapt room, the Bloom report, the Challenge Planet Dossier,
  the Challenge hub dossier + card, Training — all `window.getSelection().toString() === ""`, every element's effective
  `user-select` = `none` from the root rule; the Settings radio still toggles by click afterwards; no page error. In all three engines.
- **M1–M3 · Main Menu:** exactly `begin · challenges · training · settings`; ↓ wraps over four, End / Home, ↑ wraps; while the prefetch
  advanced (confirmed 0 → 1 → 2 → 4 → 5 → 8 → 9 across 41 polls) **no** status element and none of the four banned phrases; the survey
  **adopted** the prefetched pool; no banner after returning. At 390×844 · 1024×768 · 1440×900 · 2560×1440 the card's rectangle is
  identical before and after readiness (no vertical jump), the title holds only the painting, the card and its dialogs (no slot, no gap),
  nothing overflows.
- **S1–S3 · Settings:** after a **completed** and after a **skipped** Training, Tab → "Show Training recommendation again" → Enter clears
  the record, TRAINING carries Recommended again, nothing launches, the dialog stays open with its confirmation, Escape returns focus to
  SETTINGS, and Enter on EXPEDITION then shows the first-run recommendation (Go to Expedition · Start Training). Reset preferences with
  Motion = Reduced: radio, stored record, `rm` class and `reducedMotion` all back to Follow system in place, training record cleared,
  **only** `strange-bloom.settings` + `strange-bloom.training` changed (two unrelated keys survived), polite live confirmation, focus
  inside, Done closes back to SETTINGS. The dialog fits every viewport without internal scrolling (576 px; 646 px at 390×844).
  axe: available via `AXE=…/axe.min.js` (not part of the regression's run; the dialog's structure — one heading, two labelled groups,
  described buttons, a polite live line — is the same markup the BLOOM-037 strict axe pass covered).
- **P1–P4 · panels (4 viewports each):** hub — Dying World 725 px = its content at 1440×900 (BEGIN 12 px after the last section, no
  internal scrollbar, 47 px short of the row), 747 px at 2560 (565 px short); Thin Air caps at the row and scrolls at 1024 / 1440,
  fits at 2560 (930 px); phone = the 86 % sheet from the card's own button. Species — Organic Hybrid 749 px vs Woolly Candle 778 px at
  1440 (each ends at its own actions), phone = the 78 % sheet. Survey — the focused dossier's top is level with the globe's at 1024 /
  1440 / 2560 (612 / 775 / 775 px), scrolling inside only at 1024; a second world lays out the same way; the phone stack is unchanged
  (Begin reachable by scrolling the stack, as before). Challenge Planet Dossier — top-aligned with the globe column, capped at the body's
  row where its long content overflows (1024: 680 ↕, 1440: 806 ↕), at 2560 at least one stops short of the row at its content height.
- **W1–W2 · one world:** Frozen World 7 at 1024 / 1440 / 2560 → `copies.count = 1`, `topology.wrapX = true`, tile 16 / 19 / 33 px, world
  960 / 1140 / 1980 px centred with 32 / 150 / 290 px of frame either side (frame pixels = the stage colour, nothing beyond the world's right
  edge), gutters `region −2`, the world's first / last columns x = 0 / 59, 20 labels for 20 regions (drawn once), a gutter click **deselects**
  the selected origin instead of selecting x mod W. First Bloom: one copy, no wrap, water not icy.
- **C1 · icy water:** Frozen World 7 and 25 (−18 °C sky): every water tile `cold`, base luminance well below the plain palette colour,
  ripple marks darker than the water, frost glints on land only (0 on water). Ocean Archipelago 28 / Desert World 17: no cold water, base
  byte-identical to the plain palette, marks still lighter.
- **O1 · origins:** http `/`, the Pages site `/bloom/`, `file://` (offline, the portable runtime): four entries, no status, no Credits,
  `user-select: none` on the root, Settings with both actions.

## Strict accessibility pass (PMO release gate, 2026-10-14) — the BLOOM-037 driver, section A, with `AXE` set

`qa-a11y-v101.js` = `docs/evidence/bloom-037/qa-037.js` with one adaptation (the title has no CREDITS entry, so the dialog loop audits
the dialogs that exist; A3's Credits-closed condition is recorded as absent / closed). Same scopes, Tab walks, rendered-contrast
reading and axe configuration (WCAG 2.0/2.1 A + AA, no rule suppressed, no exception). Results (`a11y-summary.log`,
`a11y-chromium-firefox.json`, `a11y-webkit.json`):

| Engine | Screens | A1 names | A2 focus walk | A3 Escape / Back | **A4 axe critical / serious** | A7 rendered contrast | A5 / A6 |
|---|---|---|---|---|---|---|---|
| Chromium 147 | 22 | all named | clean | clean | **0 / 0** (every screen *clean*) | 17 pairs ≥ 4.55 : 1 | pass |
| Firefox 148 | 22 | all named | clean | clean | **0 / 0** (every screen *clean*) | 17 pairs ≥ 4.55 : 1 | pass |
| WebKit 18.0 | 22 | all named | clean | clean | **0 / 0** (every screen *clean*) | 17 pairs ≥ 4.55 : 1 | pass |

Screens: first-run dialog · Main Menu · Settings dialog · Species Selection · species dossier · Destination Survey · survey focus · run map ·
region banner · Region Inspect / Adapt / Spread / Terraform rooms · banner "would help" · Inspect help buttons · Adapt node preview · run
menu · report · Challenge hub · Challenge Planet Dossier · Training coach · Skip-training dialog. No contrast, accessible-name or
focus / dialog regression against BLOOM-037; no code change was needed, so the 46 / 46 regression above stands as the release regression.

## Focused QA (before the full run)

`focused-run-1.tsv` / `focused-run-2.tsv`: main-menu 20/20 · sphere-texture 14/14 · topology 53/53 · crossing 14/14 · destination-survey
18/18 · challenges 33/33 · run-ui 40/40 · run-ui-convergence 57/57 · guided-training 50/50 · portable-runtime 71/71 · planet-view 80/80 ·
surface 11/11 · native-competition 66/66 · release-check `--no-suites` 51/51; single-app-flow 59/59, species-selection 68/68 and
visual-system 55/55 after their five-entry / status expectations were updated (F1 · F13 · T1 · P1 · F9b — expectation fixes only).

## Full regression — every `tools/*-check.js`, sequentially, quiet machine

`regression-final.tsv`: **46 suites · 46 exit 0 · 2119 checks PASS · 0 FAIL · 97 min** (BLOOM-037 had 45 suites / 2053; +1 suite,
+66 checks net of the retired Credits checks). No timing bound was loosened. Longest: body-plan 14 min, portable-runtime 8 min,
release-check 7 min, single-app-flow 6.5 min, ui-polish 4 min.

## Portable / hosted

`npm --prefix tools run build:portable` was run after the module changes (expedition-entry, main-menu, run-map-renderer,
planet-surface are bundled); `check:portable` = **identical** — bundle `strange-bloom.portable.js` sha256 `becaa128…`, manifest
fingerprint **`de32ce91…`** (was `4c37d300…` in the release). `file://`, `/` and `/bloom/` all show the four-entry title with no
survey progress, the Settings actions and the root selection rule (O1, Chromium offline + Firefox); the one-copy map and icy water are
the same renderer / surface in every origin. No network change.

## Stills (`shots/`, 18 files, 12 MB — Chromium set + Firefox title / Settings / frozen map + WebKit title)

`01-title-{390x844,1024x768,1440x900,2560x1440}` · `02-settings-1440x900` · `03-challenge-hub-dying-world-1440x900` ·
`04-species-dossier-woolly-candle-1440x900` · `05/06-survey-focused-planet-{a,b}-1440x900` ·
`07-challenge-planet-dossier-{dying-world,low-tide}-1440x900` · `08-frozen-world-7-selected-region-1440x900` ·
`09-frozen-world-7-one-copy-{1024x768,2560x1440}` · `cold-water-study/` (the four options on two Frozen worlds).

## Review

Starting `origin/main`: `ab29f6b` (game `2c491f1`). Implementation: `12a5e00` · `acb625d` · `59e834b` · `0cab8cc` · `6ea89ef` · `a963870`
(+ this report). `handoff/bloom-v1.0.1-review` = the agent branch tip; **0 behind / 7 ahead of main; not merged.** Open for PMO: none
raised by QA — the seam edges read cleanly without extra UI; no option in the cold-water study was a tie.
