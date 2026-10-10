# Strange Bloom — visual system v1 (BLOOM-034)

The game has **one** visual language. Gameplay defined it (the Concept 18 / BLOOM-029 production UI: cream cards on the planet,
the rounded sans-serif family, chunky friendly controls, the irregular rounded corners, the semantic colours, the stroke-icon
family). BLOOM-034 moved that language into a shared token system and brought the planning screens — the title / main menu and
the Destination Survey — onto it, keeping them darker than gameplay with their outer-space feeling.

Current direction and status: [`PRODUCT_DIRECTION_CURRENT.md`](PRODUCT_DIRECTION_CURRENT.md) §9 (this file describes the system;
that file wins about what is decided and what is in production).

---

## 1. Files

| File | Role |
|---|---|
| `resources/ui/bloom-theme.css` | **The shared token system.** `:root` custom properties for type, shape, motion, the semantic hues, the category identity, the LIGHT gameplay surfaces and their NIGHT planning counterparts; plus two neutral primitives (`.bloom-ic`, `.bloom-sr-only`). No element rule, no web font, no URL, no `backdrop-filter`. |
| `resources/ui/bloom-icons.js` | The production icon family for the planning screens (`ICONS`, `ico(name)`): every glyph gameplay already has, with identical path data, plus `settings` and `scan` drawn on the same 24-grid stroke. Pure ES module. |
| `resources/main-menu/main-menu.css` | The title / menu, now entirely on theme tokens. |
| `resources/destination-survey/destination-survey.css` | The survey, now entirely on theme tokens. |
| `resources/run-ui/planet-view.css`, `run-report.css`, `resources/training/training-coach.css` | Gameplay: their local tokens (`--paper`, `--leaf`, `--rr-bg`, the coach's, the Skip dialog's …) are now `var(--bloom-…)` references with **exactly** the values they had (proved value by value against 79f5540 by `tools/visual-system-check.js` V3, and element by element in the browser, G1). |
| `tools/visual-system-check.js` | The BLOOM-034 suite (Node V1–V10, Chromium + Firefox T / D / S / G / L / A / P). `--evidence` writes `docs/evidence/bloom-034/`. |

**Load order.** `bloom-theme.css` is the FIRST stylesheet of every document that shows a player-facing surface: `index.html` and the
developer harnesses `demos/main-menu.html`, `demo-run.html`, `destination-survey.html`, `expedition-descent.html`. The training coach's
stylesheet is only ever added inside those documents. Under `file://` the same `<link>`s work; the portable runtime bundles
`bloom-icons.js` with the other modules.

## 2. Tokens

| Group | Tokens | Notes |
|---|---|---|
| Type | `--bloom-font` (`ui-rounded, "SF Pro Rounded", Nunito, "Varela Round", "Trebuchet MS", system-ui, sans-serif`), `--bloom-kicker-size / -weight / -track` | System fonts only. The kicker is the small uppercase 900-weight label above a title. |
| Shape | `--bloom-r-lg` (22 18 24 18), `--bloom-r-md` (16 13 17 14), `--bloom-r-btn` (14 px), `--bloom-r-pill`, `--bloom-control-min` (44 px), `--bloom-control-lg` (52 px), `--bloom-lip` (2 px) | The irregular rounded-corner family; chunky controls with a bottom lip (`box-shadow: 0 lip 0`). |
| Motion | `--bloom-ease` | |
| Semantic hues | `--bloom-leaf(-dark/-soft)`, `--bloom-bloom(…)`, `--bloom-sky(…)`, `--bloom-gold(-deep/-soft)` (Biomass), `--bloom-pressure(-soft)`, `--bloom-ok`, `--bloom-warn`, `--bloom-bad`, `--bloom-focus` | Gameplay's exact values. |
| Categories | `--bloom-cat-{temperature,water,soil,hazard}(-soft/-dark/-night)` | Temperature · Water · Soil · Hazard. |
| LIGHT surfaces | `--bloom-paper(-2)`, `--bloom-card`, `--bloom-line(-2)`, `--bloom-ink(-soft/-faint)`, `--bloom-frame`, `--bloom-shadow-lg` | Gameplay. |
| NIGHT surfaces | `--bloom-space-0/1/2`, `--bloom-night-card` (translucent), `--bloom-night-card-solid`, `--bloom-night-paper(-2)` (raised controls), `--bloom-night-line(-2/-3)`, `--bloom-night-ink(-soft/-faint)`, `--bloom-night-shadow`, `--bloom-night-veil` | Each is the dark counterpart of a LIGHT token (↔ in the file). Night ink IS the gameplay card's cream. |
| Hues on night | `--bloom-{leaf,bloom,sky,gold,pressure,ok,warn,bad}-night`, `--bloom-focus-night` | The same hue, lifted to read on the dark. |
| Planning buttons | `--bloom-{leaf,sky}-btn-night(-hover/-lip/-rim)` | The leaf / sky primaries of the planning screens: gameplay's DARK shade of the hue as the surface, the hue itself as the rim, one step deeper under the pointer / focused / pressed. |

**Contrast** (WCAG 2.x, V6): every night text token ≥ 4.5 : 1 on the solid night card, on deep space and on a raised control (the
lowest is 5.6 : 1; night ink ≥ 14 : 1); the night focus ring ≥ 7.9 : 1. **Buttons** (PMO review): a white word on gameplay's leaf /
sky is only 3.4 / 3.5 : 1, so the planning primaries use the planning button shades — white on leaf 5.61 : 1 and sky 5.98 : 1 at rest,
7.67 / 8.15 : 1 under the pointer, focused and pressed; the raised and ghost controls carry ink at ≥ 10.5 : 1. `visual-system-check`
C1 measures every planning button's computed word against its computed surface in all four states (≥ 4.5 : 1, both browsers).
Gameplay's own buttons are unchanged.

## 3. The NIGHT planning language

Planning stays **darker** than gameplay and keeps the outer-space feeling — darkness, stars, planets, the faint atmospheric glow,
restrained translucent dark surfaces. It is **not** neon, cyberpunk or a sci-fi HUD: no glows on controls, no scan lines, no
monospace, no `backdrop-filter`. Everything else is gameplay's: the font, the corner family, the control proportions and lip, the
icon family, kickers above titles, status pills (icon disc + word), condition boxes with a category accent bar, focus rings.

## 4. Icons

24 × 24 inline-SVG strokes (stroke 2, round caps and joins; `.bloom-ic` = gameplay's `.pv .ic`), always `aria-hidden` beside a real
word, never emoji, never text arrows. An icon is written with no whitespace beside it, so the control's `textContent` is exactly its
word (the suites read those words). Shared glyphs are byte-identical to the gameplay tables (V5).

## 5. Title / main menu

- The twelve hand-painted backgrounds are untouched (byte-identical; the background rule, preload and rotation unchanged).
- One dark planning card on the right (`--bloom-night-card` gradient, `--bloom-r-lg`, 2 px night line, the night shadow) replaces the
  serif / gold plaque, its double rule and its corner marks.
- The title is the one expressive element: the gameplay family at 900 weight — STRANGE in night ink, BLOOM in a bloom-pink
  gradient with a soft pink glow (one static filter, never animated); UNKNOWN SOILS a leaf-green kicker between two leaf dots.
  Readability is measured on all twelve paintings through the card's least opaque stop (T2: worst 5.2 : 1, painting 09).
- Menu: EXPEDITION · TRAINING · SETTINGS · CREDITS as chunky icon + word buttons (world · journal · settings · info).
  EXPEDITION is the leaf button in its planning shade (white ≥ 5.6 : 1); the others are raised night controls. TRAINING's "Recommended" is a Biomass-gold pill
  with a star (a word, not a colour).
- Status ("Surveying sector · n of 9 worlds"): a night pill with a leaf dot.
- Dialogs (Training placeholder, the first-run recommendation, Settings, Credits): the solid night card; kicker above the heading;
  Settings' motion choices are gameplay list rows (the checked one outlined in leaf); notes are sky info lines; buttons are gameplay
  buttons (Start Training = leaf primary).
- Narrow (< 720 px): the card spans the bottom; short (< 560 px): a compact card.
- **Scope rule.** The menu's root-level rules select `.mm-screen` (a class only MainMenu's own root carries), never a bare `.mm`:
  the decision rooms' mini-map card is also a `.mm`. Before BLOOM-034 the menu's root rule (serif, menu ink, `container-type:size`)
  collapsed that card in the one-document app (BLOOM-033) to a thin strip; commit `BLOOM-034 (fix)` repaired it (G2).

## 6. Destination Survey

- The deep-space ground (starfield, the glow near the top, the globes, the focus glow) is unchanged — the darker planning feeling.
- Header: the gameplay back button (icon + "Main menu"), the leaf kicker "Strange Bloom" over "Destination Survey", the sector as a
  night pill with a sky dot, **Scan new sector** as the sky button in its planning shade.
- The three classes carry the gameplay status colours: **Favorable = OK** (leaf, check), **Precarious = warning** (amber, alert),
  **Extreme = severe** (bloom red, the hazard sign) — column heads and the dossier chip are status pills, icon + word. Extreme is a
  PLAYABLE class: it signals high risk, never prohibition, so it never shows the blocked cross; the cross stays for genuinely hostile
  ground (the habitability key's "Hostile") and unavailable actions.
- Dossier (the night card): name, world type, tagline; habitability on arrival as the gameplay meter with a word key
  (Suits · Marginal · Hostile with shares); the five rows as gameplay condition boxes with the category identity — Climate =
  Temperature, Water, Soil, Atmosphere (neutral, cloud), Solar exposure = Hazard (sun). Each row has two separate parts: on the left
  the category kicker over its **primary descriptor** (bold, ink); past a thin rule on the right, the **secondary explanation**
  (smaller, soft) — e.g. "Fertile | fertile 100 %" no longer runs together; on a phone the explanation drops under the descriptor; expected challenges in the "blocked" tint
  with its icon; the cue as a leaf note; Return to survey (ghost) · **Begin expedition** (leaf primary).
- The action bar is sticky: on a short screen (1024 × 768, 1280 × 720) the dossier scrolls under it and Begin expedition stays in
  view (it was cut off at 1024 × 768 before). Below 820 px of height the dossier is a little more compact.
- Buttons are sentence case like gameplay's (the 028A uppercase / tracked button style is retired); headings and kickers keep
  gameplay's uppercase kicker style.

## 7. Gameplay

Unchanged. Its stylesheets read the theme; the computed styles of the Planet View, the region banner, the report and the training
coach are identical to 79f5540 element by element (G1). The only gameplay-visible change is the repaired rooms' mini-map card
(§5 scope rule), which returns the rooms to their BLOOM-032C look (and their scale probe to the card's real size).

## 8. Not in BLOOM-034

Species, species selection, Challenges, any mechanic, any copy change beyond the controls' icons, any change to the paintings,
the globes, the transitions, the Organic Hybrid art, Training's lessons, the portable / Pages architecture.
