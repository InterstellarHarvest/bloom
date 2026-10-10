# art/plant — plant sprite SOURCE ART

This folder is what artists edit. The game never reads it directly. `tools/build-plant-art.mjs` validates it and converts it into
`resources/plant-visual/generated/plant-atlas.js`, which the renderer uses.

**Full contract (read this first):** `docs/PLANT_SPRITE_PIPELINE_v1.md` § **ARTIST_HANDOFF**.

```
contract.json                  engine rules (canvas 84×98, materials, treatments, layers, orientations, the 34-component locked Organic Hybrid registry) — engine-owned
body-plan.json                 socket geometry (4 cold layouts, 117 sockets) — engine-owned
schema/plant-atlas.schema.json machine-readable structure of atlas.json
schema/example-sprite-entries.json   annotated examples
packs/<pack>/atlas.png         the pixel art (exact palette colours, alpha 0 or 255, no anti-aliasing)
packs/<pack>/atlas.json        the metadata (palette, environment, one entry per sprite: rect, anchor, attach, layer, orientation, …)
intake/organic-hybrid/         the PMO-approved delivery ZIPs + PMO_FINAL_ACCEPTANCE.json (hashes) + intake-map.json (source → atlas)
intake/<species-pack>/         (BLOOM-035C0) the three species lanes cinder-rosette / woolly-candle / reed-spire: PMO_FINAL_ACCEPTANCE.json +
                               approved-deliveries/*.zip, ingested by `node tools/intake-plant-art.mjs --pack <id>` (README.txt per lane;
                               schemas: docs/PLANT_SPRITE_PIPELINE_v1.md § SPECIES_ART_INTAKE) — awaiting deliveries, no final art yet
body-plans/<plan>.json         (BLOOM-035B-5) one BODY PLAN @3 per plan — oh-stem (Organic Hybrid: references body-plan.json + contract.json,
                               which stay byte-pinned), rosette (Cinder Rosette), candle (Woolly Candle), reed (Reed Spire)
contracts/<plan>.json          (BLOOM-035B-5) a plan's component registry; materials / treatments / pixel rules shared from contract.json
proof-packs/make-proof-packs.mjs   generates the three TEMPORARY PIPELINE PROOF packs of the new plans (--check: committed == regeneration)
```

Every pack's `atlas.json` declares `"bodyPlan": "<plan>@<version>"` and is validated against THAT plan's contract, sockets and clip proof
(the locked `organic-hybrid` delivery declares nothing: `body-plans/oh-stem.json` lists it in `lockedPacks`). Art briefs for the new
species: `docs/species-art-briefs/` (generated: `node tools/build-plant-art.mjs --briefs`).

`organic-hybrid` is **ORGANIC HYBRID — FINAL ART**: the PMO-approved Art Studio deliveries (kept unchanged, with their PMO hashes, in
`intake/organic-hybrid/`) assembled mechanically by `node tools/intake-organic-hybrid-art.mjs` (`--check` proves the committed pack equals a
clean intake; `intake/organic-hybrid/intake-map.json` records every sprite's source → atlas rect and pixel signature). Do not hand-edit its
atlas: change the art at the studio, re-deliver, re-run the intake. (BLOOM-032B2; not yet used by production.)

The `proof-cinder-rosette`, `proof-woolly-candle` and `proof-reed-spire` packs (BLOOM-035B-5, body plans rosette@1 / candle@1 / reed@1) are
**TEMPORARY PIPELINE PROOF — NOT FINAL ART** as well: generated engineering placeholders (flat fills, a hazard checker) that only prove every
legal model of their plan renders; each folder's README says so.

The other three packs (`proof`, `proof-angular`, `proof-round`) are **TEMPORARY PIPELINE PROOF — NOT FINAL ART**. They were drawn
once by the BLOOM-032B1 engineering agent as deliberately simple placeholders and exported to PNG, so the pipeline could be proven. They are
not art candidates. Approved art from the Plant Pixel Art Studio replaces them pack by pack.

**Workflow**

1. Draw in any pixel editor (Aseprite, Pixaki, LibreSprite, Photoshop with nearest-neighbour, …). Use only the colours in your pack's palette.
2. Record each sprite's rect / anchor / points in `atlas.json`. Copy an entry from `schema/example-sprite-entries.json`.
3. `npm --prefix tools run build:plant-art`. It either writes the generated files or tells you exactly what is wrong.
4. Look at it: open `demos/plant-sprite-pipeline-lab.html` (double-click works). New packs appear automatically.
5. Commit the PNG, the JSON and the two generated files. `npm --prefix tools run check:plant-art` must pass.
