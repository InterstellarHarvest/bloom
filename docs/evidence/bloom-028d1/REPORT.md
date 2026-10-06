# BLOOM-028D1 — Training Foundation · evidence report

**Recommendation: ACCEPT.**

- Branch `agent/bloom-028d1-training-foundation` (worktree `_worktrees/bloom-028d1-training`), from **`466b88b`** (028C1 final).
- Commits:
  - `b2a6450` the foundation
  - `1c0f050` A12 provenance pin (§5)
  - then this evidence commit
- All QA below ran on **`1c0f050`**, except the 028C1 fade re-run (§4.3), which ran on `b2a6450`.
- Not merged, not pushed. Handoff and contracts: `docs/TRAINING_FOUNDATION_v1.md`.
- No coaching UI was built (no callouts, spotlight or step logic), and no first-run prompt.

## 1. What changed

- **Training Grounds** (`planets/training_grounds.js`): an authored world of 48 × 32, six regions, Eden, win at 65 %. Each
  region carries one lesson with an obvious answer and an honest second one (handoff §2).
- **Authored selection.** `demo-run.html?planet=<id>` opens any authored world. Without it the world is First Bloom, unchanged.
  Unknown ids and mixed parameters show the explicit no-run page.
- **`training=1` on the existing run page.** It uses the training world and starts **paused**. Its config is derived with
  `BLOOM.play.deriveConfig` (a deep copy with four `econ` overrides from `content/training.js`; typos refused). Its RNG is
  seeded (`mulberry32(28041)`). It has a ☰ Training menu (Restart · Skip · Main menu), and `return=` is same-origin only.
- **Events.** Ten generic `bloom:*` CustomEvents fire on `document` at the real action points, in every run (handoff §7).
- **Anchors.** `data-tutorial` names cover every current control (19 static anchors and 5 per-item families; handoff §9).
- **Bubbles on purpose.** `sim.placeBubble(tile)` is generic and draws no randomness. `BLOOM_RUN_UI.placeBubble(sectionId)`
  is the page helper.
- **Status store.** `resources/training/training-store.js`: `completed` / `skipped`, versioned, and it never throws.
- **Training page layer.** `resources/training/training-run.js` is an ES module loaded in training mode only. It handles the
  arrival under black, the exits through black, the status written on a win or a skip, and the Settings motion choice.
- **Shared fade.** The 028C1 fade was moved, unchanged, into `resources/main-menu/black-fade.js`. ExpeditionEntry delegates
  to it and gains `leaveTo(href)` + a `trainingHref` option + a back-forward-cache restore. `demos/main-menu.html` wires TRAINING.
- **Not touched:** `content/config.js`, `content/traits.js`, `planets/first_bloom.js`, the generator, validators, survey, sphere,
  transition, `MainMenu`, root `index.html`.

## 2. Training URL / events / persistence (summary; full contracts in the handoff)

- **URL:** `demos/demo-run.html?training=1[&planet=<authored id>][&return=<same-origin url>]`. The title builds
  `training=1&return=<its own URL>` with `BLOOM.play.trainingQuery`.
- **Events:** `run-ready`, `play-pause`, `speed`, `region-select`, `upgrade-preview`, `upgrade-purchase`, `growth-focus`,
  `local-upgrade`, `bubble-collect` (`how: click | auto`), `win`.
- **Persistence:** `localStorage["strange-bloom.training"] = {"v":1,"status":"completed"|"skipped","at":ms}`. "completed" is
  never downgraded.

## 3. Training planet measurements (`tools/training-check.js` T1–T3; real engine, 6000 ticks)

| build | nothing | Cold | Humidify | Cold + Humidify | Cold + Drought | Warm + Humidify |
|---|---|---|---|---|---|---|
| plateau | 39.0 % | 60.4 % | 58.6 % | **80.0 %** | **72.0 %** | **80.0 %** |

- **Fitness at the landing:**
  - Chill Hollow 0.40 (too cold)
  - Thirsty Flats 0.33 (too dry)
  - Salt Pan 0.00 (hostile, not terraformable)
- **After the answers:**
  - Cold or Warm → Chill Hollow 1.00
  - Humidify or Drought → Thirsty Flats 1.00
  - Humidify leaves Reed Fen at 0.67 (worse, still grows); Drought takes it to 0.08 (closes)
- **Tilemap** `a37abec5`, identical with any config or RNG. Cold + Humidify plateaus at 80.0 % on seeds 1–3.

## 4. QA

### 4.1 `tools/training-check.js` — the 23rd suite: **82 / 82** (Node + Chromium + Firefox, ~47 s)

| | checks |
|---|---|
| **Node** (13) | T1 deterministic load; T2a–c lessons + preview story; T3 plateaus; T4 derived config (shared config byte-identical after; exactly 4 overrides; typos refused); T5a seeded reproducibility; T5b placeBubble draws no randomness; T6 status store; T7 return= / URL contract; T8a–c source rules |
| **per browser** (Chromium 35, Firefox 34) | B1 paused landing, derived config, black lifts, seeded across two page loads · B2 every event from real clicks with its detail (play/pause, speed, map select/deselect, preview, purchase, refused purchase sends nothing, focus, local upgrade, bubble click + auto, win → "TRAINING COMPLETE" + status completed) · B3 ordinary runs unchanged (First Bloom running at once, shared config, no black / layer, same play menu + title, live randomness) · B4 planet= selection + 5 explicit failures · B5 ×2 (default, Settings reduced motion): title TRAINING → full black (220 / 80 ms) → training lifts (250 / 80 ms) → Main menu → back to the exact title URL → Back / Forward never black → Restart = fresh page at a paused landing → Skip records "skipped" → no page errors · B5g back-forward-cache restore of both pages (real `pageshow { persisted: true }`) |
| **Chromium only** (1) | B6 file://: the black clears by itself (≤ 2 s), paused, Main menu still leaves |

Log: `qa-run.log`. Stills: `01-training-paused-landing.png`, `02-training-complete.png`, `03-title-after-skip.png`,
`04-training-run-menu.png`, `05-title-fading-to-training.png`.

### 4.2 All suites (`run-all-suites.sh` → `qa-suites-summary.txt`)

**23 suites, 957 pass / 2 fail**, on `1c0f050`. All 21 other suites are green, including `training-check` 82/82,
`main-menu-check` 17/17, `atmosphere-transition-check` 14/14, `economy-check` 39/39 (still exactly one Biomass grant on the
run page), the golden-pinned `sim-check` / `dying-world-check` / `native-competition-check`, and `game-flow-check` 74/74.

The two failures are the same timing-dependent checks 028C1 recorded:
- **colony-development-check [31]:** the pre-existing pixel flake. Same signature; isolated runs fail on 466b88b too
  (0 0 1 0).
- **slice-check pacing:** 239 s against a 240 s floor. Not a regression — see §4.4.

Details: `suite-flakes.txt`.

### 4.3 028C1 menu-fade QA re-run on the shared fade (`b2a6450`)

The fade moved out of ExpeditionEntry, so the accepted 028C1 browser QA (`docs/evidence/bloom-028c1/qa-menu-fade.js`) was
re-run in full against the new code.

- **Part F: 235 / 235.** That covers Chromium desktop + phone cycles, slow preparation, reduced motion, Firefox (88 checks)
  and a real-GPU sample (20 checks). Results:
  - swap only on fully black frames, never both screens
  - exact 220 / 250 ms (80 / 80 ms reduced)
  - leaks at baseline after every return
  - prefetch identity, dramatic descent unchanged
- **Not counted:**
  - N2–N4 are its provenance checks pinned to 028C1's start, which fail by design on any later file.
  - N5 (main-menu-check M7g) failed because M7g looked for the fade code inside `expedition-entry.js`. M7g now checks the same
    guarantee where the code lives: opacity-only, 220 / 250 / 80 / 80 ms, the same easing, the entry delegating to BlackFade,
    no `.animate(` left in the entry. main-menu-check is 17 / 17.
- The re-run overwrote three 028C1 evidence files; they were restored from git. Log: `c1-fade-rerun.log`.

### 4.4 Normal runs unchanged — proven seed for seed (`slice-pacing-determinism.txt`, `qa-slice-determinism.js`)

slice-check drives the run page, and its pacing check failed once in the first sweep (240 s; floor 240 s). So the exact
slice-check bot (wet build, 25-tick reaction, real shop clicks) was run on **466b88b and on b2a6450** with a seeded
`Math.random` and the animation-frame loop frozen:

- **Seeds 1–6:** identical win ticks and identical final tile hashes on both commits. 028D1 changes nothing in a normal run.
- **Seed 3 wins at tick 1486 (238 s) on both.** The 4-minute floor is inside the bot's own random spread, so the pacing check
  is a timing flake by construction, not a regression.

## 5. Changes to existing suites

| suite | change | why |
|---|---|---|
| `main-menu-check` M7g | reads the fade from `black-fade.js` and requires the entry to delegate to it | the code moved unchanged; same guarantee, plus "no `.animate(` left in the entry" |
| `atmosphere-transition-check` A12 | `git diff 80a39ce d036ea3` instead of `80a39ce` → working tree | A12 states that **028B** did not touch the sphere / generator / play flow / content / planets. Pinned to 028B's own range, it keeps that claim exactly and stops failing whenever a later milestone legitimately works there (028D1 adds content, a planet, `deriveConfig` and `placeBubble`). Verified: 028B's range touches none of those paths |

No check was removed or loosened.

## 6. Notes for 028D2 (also in the handoff §10)

- **Supply top-ups.** "Expedition supplies" would be a second page-side Biomass grant, which economy-check 3 forbids. Use a
  declared, reported channel, or tune `content/training.js`.
- **Pacing.** The training config is generous (≈ 4.9 Biomass/s once Meadow and Verge are established). Tune the data.
- **Pausing.** Training starts paused, so steps that wait for spread must ask for ▶.
- **Layout.** The run page is still the temporary shell; the anchor names are the stable layer.
- **Integration.** TRAINING lives on `demos/main-menu.html`. Root `index.html` integration is still the PMO's.
