# BLOOM-035C2 — real species packs + Species Selection release · REVIEW CANDIDATE

**Status: CANDIDATE** (branch `handoff/bloom-035c2-review`; NOT merged — production `main` stays `e534750` until PMO integration).
BLOOM-035C is **not IMPLEMENTED** until the PMO integrates this candidate. BLOOM-036 Challenges: NEXT / PLANNED (not started; no
CHALLENGES menu entry).

## 1. What changed

| Area | Change |
|---|---|
| Source intake | The three PMO-accepted source candidates (owner-local ZIPs in `_art_intake/035c2/`, ignored, never committed) → `tools/species-source-deliveries.mjs` → C0 deliveries + `PMO_FINAL_ACCEPTANCE.json` + `SOURCE_PROVENANCE.json` → `tools/intake-plant-art.mjs` → `art/plant/packs/{cinder-rosette,reed-spire,woolly-candle}/` |
| Woolly body plan | NEW revision **`candle@2`** (`art/plant/body-plans/candle@2.json`, `contracts/candle@2.json`) beside the unchanged candle@1. Same registry, grammar, architectures, socket names / attach kinds; production maxima (PMO-locked); one attachment offset (storage root dy 2 → 1). Brief: `docs/species-art-briefs/WOOLLY_CANDLE_ART_BRIEF_v2.{md,json}` |
| Build / runtime | Plan revisions `<id>@<n>.json` keyed by ref (v1 runtime entries and the grammar bundle byte-identical); compositor resolves `bodyPlans["candle@2"]` |
| C0 rules (narrowed, no pixel touched) | stem-leaf anchor column 0 **or 1** (H6; locked OH 14 + Reed 35 leaves at x 1); a trait's own variant drawing may paint its recolour treatment's targets (`.heat` leaves: waxLeaf / waxCore; Reed 6 + Woolly 14 drawings) — pig* still forbidden everywhere |
| Species | `cinder_rosette` / `woolly_candle` / `reed_spire`: status `released`, definition version 2, packs `cinder-rosette` (rosette@1) / `woolly-candle` (candle@2) / `reed-spire` (reed@1); physiology and physiologyVersion unchanged |
| Flow | Species Selection is the normal EXPEDITION flow; `?species=1` ignored (one behaviour path); Organic Hybrid preselected and "Recommended first expedition"; Training always Organic Hybrid |
| Specimen | anchor cascade rebalancing when the last tendril anchor would land off the anatomy (Cinder Cold T3); never runs when the cascade fits |
| Telemetry | species → survey entry record carries `blackMs` |

## 2. Source provenance (local equivalent of the source-ZIP hash)

Aggregate package hash = SHA-256 over the sorted `"<relative path>\t<sha256>\n"` records of every file in the candidate.

| Pack | Candidate | ZIP bytes · SHA-256 | Aggregate (files) | Checksum file | Origins |
|---|---|---|---|---|---|
| cinder-rosette | CINDER_ROSETTE_PRODUCTION_SOURCE_CANDIDATE_v3_1 | 2 607 263 · `1be928b1a6d4e9d95ededdb459f941e08fdcaae7e0db0797b7a5b539f5973bff` | `4254d43c20cf9b13b1215441687342dcc326e857d055cd769163683559ff3bfc` (235) | 147/147 | RECOVERED_EXACT 27 · CANONICAL_REFERENCE_TRANSCRIPTION 33 |
| reed-spire | REED_SPIRE_PRODUCTION_SOURCE_CANDIDATE_v3_1 | 10 868 753 · `73ed7a565b101745b0edc9960daa14e5ec150bbbe1b5f678673b22617dda5983` | `c167a10c747cc221c130adf843eb36c93c406b7d50f3a03690628b6fbff5dfee` (166) | 165/165 | RECOVERED_EXACT 22 · CANONICAL_REFERENCE_TRANSCRIPTION 31 |
| woolly-candle | WOOLLY_CANDLE_PRODUCTION_SOURCE_CANDIDATE_CANDLE2 | 15 376 001 · `48a9db4883e597c9dd15c123f3474af581f4b3bc073fb99802c2f7b6084d3b69` | `cdcf99c910864ad98d58c12c8953dc92fbdf2218217c54715adb7b922632082c` (142) | 141/141 | CANONICAL_REFERENCE_TRANSCRIPTION 58 |

Counts as accepted: Cinder 60 sprites / 42 toothed masks · Reed 53 / 35 · Woolly 58 / 35. `species-source-deliveries --check` regenerates
every delivery byte for byte from the original ZIPs. Full inventories: `art/plant/intake/<pack>/SOURCE_PROVENANCE.json`.

## 3. PMO_FINAL_ACCEPTANCE.json (bloom-plant-art-acceptance@1 · status FINAL PMO-APPROVED ART INTAKE)

| Pack | Record SHA-256 | Deliveries (batch · bytes · SHA-256) |
|---|---|---|
| cinder-rosette (rosette@1) | `77e296c1888b7b10b4575ee776da15d7bb9024b59c41b63467c1ed628aff3ee2` | 1 · 4568 · `6f2cefe5…` · 2 · 4483 · `ad7dac75…` · 3 · 15873 · `0b18c8ff…` · 4 · 19923 · `d34d91ab…` · 5 · 16435 · `d8076936…` · 6 · 2948 · `de7d60c3…` · 7 · 393772 · `63fd8b7a…` |
| reed-spire (reed@1) | `72fbed3b1e2f973dbdf89355a5963c19d0b409c6045406b91ca6262d566e77c1` | 1 · 2754 · `9052bc8a…` · 2 · 3691 · `54550a18…` · 3 · 10817 · `ed9fa6c0…` · 4 · 11756 · `751b6341…` · 5 · 13559 · `0cd66e40…` · 6 · 2755 · `12b841ac…` · 7 · 201822 · `51b9e27a…` |
| woolly-candle (candle@2) | `c7ee891982840d2fdc1721f63e9cb50b69f7aba79aeb5e2a2c268f41f1aeb7ea` | 1 · 4689 · `afbf7314…` · 2 · 8269 · `ec5bbdc8…` · 3 · 13521 · `1537bbb6…` · 4 · 14581 · `897b6909…` · 5 · 13839 · `3632ad68…` · 6 · 3657 · `eddeba14…` · 7 · 154981 · `b6a7cf7d…` |

(Full 64-hex hashes in each record.)

## 4. Real atlases

| Pack | atlas.png SHA-256 | atlas.json SHA-256 | Atlas | Runtime sprites | Static clip proof |
|---|---|---|---|---|---|
| cinder-rosette | `33c9c5204806e5988251c0206d4d512e2d47eb46fd77ca96e8f694542064a503` | `e274d6fbb4f02df4b22c42038bc5d8d5c3a90ae40452d6b739f162e232f30e5c` | 160 × 260 | 102 | 28 334 placements |
| reed-spire | `dfc45eb096ca9ed206dce3367131824732eda080a247a44b7521480d6ba94b99` | `df4cffe50a75854e93bc9d9b032336b2819e7f33cf253c37ab74df2b52dcc117` | 160 × 107 | 88 | 47 294 placements |
| woolly-candle | `c008722eb578bbee59f92067e8c04a73b561da0f36be3b0e9ef3674bb9159c6f` | `539d6fa4daf880eb84f67ce47a401b8ec106c3487287a57e06d52a7e7a051b4d` | 160 × 288 | 94 | 17 768 placements |
| organic-hybrid (unchanged) | `628f988848c607c260c9365852f86b4ae86dd5025b04092731f901baa5c45ec9` | — | byte-identical to `e534750` | 92 | 17 782 |

## 5. candle@2 proof (`tools/candle2-contract-check.js`, 15/15)

- candle@1 plan / contract / grammar / proof pack / brief v1 byte-identical to `e534750`; candle@1 and candle@2 coexist; malformed revisions refused.
- Contract = candle@1's registry, every maxSize = the PMO table (trunk 24×40 · base/heat leaves 20×20 · drought 19/18/17×20 · flood 21×20, 22×21, 22×21 · frost hairs 5×6, 7×8, 9×10 · collars 25×9, 29×11 · storage 16×24, 18×28 · aerial 7×10, 9×14, 11×18 · stilt 14×16 · salt 9×9, 5×5 · bud 12×14 · flower 20×22 · seed heads 16×18, 24×24 · drift 10×10 · pod 14×17). Accepted actual exceptions: seedHead.large 24 × 22; root.storage.3 18 × 27 + 1-px stub (18 × 28 canvas).
- Sockets: all 107 of candle@1 by name / attach / side / angle; trunk crowns = the art's tips (−28 −27 −26 −25); ONE attachment offset — primaryRoot (storage dy 2 → 1): at dy 2 the 28-row storage canvas touched the canvas's last row (0 px margin, Drought T3, 960 models).
- Complete legal-model enumeration: 6720 models (3360 genomes × thriving / strained) with the real pack — every placement on a plan socket, nothing clipped, min margin ≥ 1 px, deterministic, every treatment, exact palette. Tightest: storage 3 · seed head large 1 px of sky.

## 6. Legal-model counts · OH byte-identity

- body-plan-check P2: 6720 models per plan for cinder-rosette, woolly-candle (candle@2), reed-spire — see §9.
- Organic Hybrid: body-plan-check O1–O6 byte-identical to the accepted 5ff53d3 engine over the complete enumeration (26 880 renders × 4 OH-plan packs); OH pack / delivery / contract / body plan unchanged from `e534750`.

## 7. Survey calibration (`tools/species-survey-calibration.mjs` → `survey-calibration.json`)

72 worlds (3 archetypes × seeds 1–24) × 4 species, `e534750` vs this candidate: **identical** fingerprints, habitable shares and classes.
Class distribution (favorable / precarious / extreme): Organic Hybrid 24/24/24 · Cinder Rosette 14/22/36 · Woolly Candle 28/12/32 · Reed
Spire 28/11/33. World fingerprint unchanged by art (also species-check Q7, species-selection F4 / P1 / H1 / S).

## 8. Real Species Selection flow (species-selection-check, Chromium + Firefox, no query flag)

EXPEDITION → Choose Plant Species (4 cards, role order, real packs, ▲/▼ + spoken labels, no proof marking, no ranking words) → Survey for
<species> → Begin → exact planet + exact species → rooms / report on the real pack → Play Again (same planet + species) → Choose another
planet (same species) → Main menu (no "Sector surveyed" banner) → Training (Organic Hybrid). Change Species keeps the sector seed and pool.
`?species=1` = the same flow. file:// offline and `/bloom/` reach a run with no request for art sources, `_art_intake` or a proof pack.
Viewports 390×844 · 1024×768 · 1440×900 · 2560×1440: no horizontal overflow, primary visible (pinned on phone), contrast ≥ 4.5:1;
keyboard radiogroup (← → Home End, Enter, Escape), visible focus, reduced motion.

## 8b. Dynamic specimen environment (PMO additional requirement)

- `resources/plant-visual/plant-environment.js`: scene = planet + region + the sky its ground sees now (Terraform + scenario drift; a
  Terraform preview adds its sky change) → static low-res procedural geography (sky gradient / temperature impression, sun, clouds,
  archetype horizon — dunes / sea / peaks / ridges — with snow caps, dry-cracked / muddy / snow / salt ground, standing water, soil cues) +
  weather FX spec → overlay canvas (drifting clouds, rain, snow, haze, dust, ripples; reduced motion = one still frame). Deterministic
  (stable ids hashed; no Math.random; animation time never in a signature). Environment art is not bound by the plant pixel contract.
- `plant-specimen.js`: organism layer + environment layer, each with its own signature (`organismSignature()` / `environmentSignature()`);
  no scene = the previous frame byte for byte.
- Rooms: every specimen state carries its region scene ("Your plant in <region>" is now a visual statement); the **Terraform room shows the
  plant in its region scene (no tendrils)** and its previews change only the scene; the report uses the best-established living region
  (else the origin) under the final sky; Species Selection: one neutral showcase for all four cards.
- QA `tools/specimen-environment-check.js` 15/15: determinism; species independence over 42 real regions; Terraform (real sky traits) moves
  only the environment signature (organism signature AND pixels identical); Adapt moves only the organism; region content (dry, wet, cold,
  sun, rain, snow) incl. Cinder Rosette in wet / snow and Reed Spire in dry regions; no scene = previous frame; showcase; browser file://
  (cards share one environment, region switch, Adapt / Terraform previews, FX animation, reduced motion still frame), Chromium + Firefox.
- Evidence `environment/`: `01-cinder-dry-region` · `02-cinder-wet-region` · `03-cinder-cold-region` · `04-woolly-clear-sun` ·
  `05-reed-rain` · `06-woolly-snow` · `07-oh-standing-water` · `08a/08b-terraform-before/preview` · `09a/09b-adapt-before/preview`
  (engine renders) + `{chromium,firefox}-{adapt-other-region,adapt-preview,terraform-before,terraform-preview}.png` (browser).

## 9. QA

**Full sequential regression** — every `tools/*-check.js` (42 suites), one at a time, on the final environment-layer code (`164eef3`):
**41/42 green on the first pass; the 42nd (visual-system-check G1) differed only in the specimen box's background** — the intended
environment-scene padding vs the 034-era base. After the padding fix (`padBg` only on laid-out boxes) and a G1 exemption of exactly that
one property: visual-system-check **54/54**; the specimen-touching suites re-run green after the fix (specimen-environment 15/15,
plant-rooms, terraform, species-selection 68/68). **Zero failures.**

| Suite | Result | Suite | Result |
|---|---|---|---|
| archetype | 40/40 | planet-view | 80/80 |
| atmosphere-transition | 14/14 | plant-rooms | 66/66 |
| body-plan | 15/15 (OH byte-identity O1–O6, P1–P5 real packs) | plant-sprite-pipeline | 59/59 |
| candle2-contract | 15/15 | portable-runtime | 71/71 (file:// · / · /bloom/) |
| colony-development | 68/68 | procedural-run | 32/32 |
| crossing | 14/14 | production-plant-integration | 50/50 |
| cylinder-gen | 35/35 | release | 53/53 (incl. single-app-flow + guided-training children) |
| desert | 64/64 | run-ui | 40/40 |
| destination-survey | 18/18 | run-ui-convergence | 57/57 |
| dying-world | 63/63 | sim | 32/32 |
| economy | 39/39 | single-app-flow | 59/59 |
| frozen | 70/70 | slice | 15/15 |
| game-flow | 48/48 | species-art-intake | 16/16 |
| gen | 47/47 | species | 17/17 |
| guided-training | 50/50 | species-selection | 68/68 (Chromium + Firefox) |
| main-menu | 18/18 (M8 banner) | specimen-environment | 15/15 |
| native-competition | 66/66 | sphere-texture | 14/14 |
| organic-hybrid-art-intake | 45/45 | strategy | 35/35 |
| surface | 11/11 | terraform | 61/61 |
| topology | 53/53 | training | 75/75 |
| visual-system | 54/54 (after the fix) | volatile-climate | 78/78 |

Survey banner: main-menu-check M8 + release-check R16b green; species-selection F9b asserts no "Sector surveyed" banner on return.

## 10. Evidence (`docs/evidence/bloom-035c2/`)

- `species-cards-{390x844,1024x768,1440x900,2560x1440}.png`, `firefox-species-cards-1440x900.png`; focused dossiers `dossier-focused-{cinder_rosette,woolly_candle,reed_spire}.png`, `dossier-*-1440x900.png`, phone `dossier-organic_hybrid-390x844.png`
- per specialist: `survey-<id>.png`, `adapt-<id>.png`, `report-<id>.png`; `run-reed_spire.png`, `run-adapt-reed_spire.png`, `survey-reed_spire-same-sector.png`; `training-organic_hybrid.png`
- engine specimens (real compositor, `tools/species-specimen-evidence.mjs`): `specimens/<species>/{base,cold3,heat3,drought3,flood3,salt,radiation,earlyMaturity,seedOutput1,seedOutput2,waterborneSeeds}.png`, `specimens/<species>-sheet.png`, `specimens/index.json`
- `survey-calibration.json`

## 11. Known concerns (for PMO review)

1. **Pack environment colours are now engineering-only** — with the region-driven scene every player surface ignores a pack's own `environment` (it remains required pack metadata and the no-scene engineering backdrop). Cinder's (which its candidate did not declare) was mapped from its studio reference palette (Batch 3 `referencePalette`).
7. **The Terraform room now shows the plant in its environment** (029D had locked "no specimen here"); required so a Terraform preview visibly changes only the scene around an unchanged plant. No tendrils / anchors; terraform-check updated accordingly.
8. The environment's look (thresholds, colours, horizon kinds) is a first implementation of the locked direction — tuning it is presentation-only and never touches the organism or gameplay.
2. **`render.stemOutline: "ink"` for Cinder and Reed** — not declared by those candidates; the repository-wide convention (OH final art included).
3. **Two C0 rule corrections** (stem-leaf anchor column 0–1; `.heat` drawings may hold wax-treatment targets) — required to ingest the accepted Reed / Woolly pixels unchanged; documented in PLANT_SPRITE_PIPELINE § SPECIES_ART_INTAKE / 035C2 and pinned by tests.
4. **candle@2 storage socket offset** (dy 2 → 1) — the one geometry change; the accepted `root.storage.3` PNG has 28 opaque rows (the 1-px stub + 27).
5. With Radiation + Heat T3 the painted wax sheen on `.heat` leaves stays wax while the rest of the leaf takes the pigment (the treatment order pigment → wax): a deliberate consequence of keeping the accepted pixels.
6. The candle@1 / rosette@1 / reed@1 proof packs remain in the generated atlas as engineering material (no species references them); removing them is a separate cleanup decision.
