# art/plant — plant sprite SOURCE ART

This folder is what artists edit. The game never reads it directly. `tools/build-plant-art.mjs` validates it and converts it into
`resources/plant-visual/generated/plant-atlas.js`, which the renderer uses.

**Full contract (read this first):** `docs/PLANT_SPRITE_PIPELINE_v1.md` § **ARTIST_HANDOFF**.

```
contract.json                  engine rules (canvas 84×98, materials, treatments, layers, orientations, component registry) — engine-owned
body-plan.json                 socket geometry the skeleton uses — engine-owned
schema/plant-atlas.schema.json machine-readable structure of atlas.json
schema/example-sprite-entries.json   annotated examples
packs/<pack>/atlas.png         the pixel art (exact palette colours, alpha 0 or 255, no anti-aliasing)
packs/<pack>/atlas.json        the metadata (palette, environment, one entry per sprite: rect, anchor, attach, layer, orientation, …)
```

The three packs here (`proof`, `proof-angular`, `proof-round`) are **TEMPORARY PIPELINE PROOF — NOT FINAL ART**. They were drawn
once by the BLOOM-032B1 engineering agent as deliberately simple placeholders and exported to PNG, so the pipeline could be proven. They are
not art candidates. Approved art from the Plant Pixel Art Studio replaces them pack by pack.

**Workflow**

1. Draw in any pixel editor (Aseprite, Pixaki, LibreSprite, Photoshop with nearest-neighbour, …). Use only the colours in your pack's palette.
2. Record each sprite's rect / anchor / points in `atlas.json`. Copy an entry from `schema/example-sprite-entries.json`.
3. `npm --prefix tools run build:plant-art`. It either writes the generated files or tells you exactly what is wrong.
4. Look at it: open `demos/plant-sprite-pipeline-lab.html` (double-click works). New packs appear automatically.
5. Commit the PNG, the JSON and the two generated files. `npm --prefix tools run check:plant-art` must pass.
