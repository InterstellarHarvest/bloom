STRANGE BLOOM · UNKNOWN SOILS
WOOLLY CANDLE — FINAL ART INTAKE LANE (BLOOM-035C)

Pack id:     woolly-candle
Species id:  woolly_candle
Body plan:   candle@1   (58 drawings + masks)
Brief:       docs/species-art-briefs/WOOLLY_CANDLE_ART_BRIEF_v1.md (+ .json)
Replaces:    art/plant/packs/proof-woolly-candle  (TEMPORARY PIPELINE PROOF — NOT FINAL ART)

STATUS: awaiting deliveries. No final art exists yet.

When the PMO has approved the Woolly Candle batches, place here, unchanged:

  PMO_FINAL_ACCEPTANCE.json        format bloom-plant-art-acceptance@1 (pack "woolly-candle", bodyPlan "candle@1",
                                   status "FINAL PMO-APPROVED ART INTAKE", one {file, batch, bytes, sha256}
                                   per accepted delivery)
  approved-deliveries/*.zip        exactly the accepted ZIPs, each with one delivery.json
                                   (format bloom-plant-art-delivery@1)

Then:

  node tools/intake-plant-art.mjs --pack woolly-candle --dry-run
  node tools/intake-plant-art.mjs --pack woolly-candle
  npm --prefix tools run build:plant-art

The intake is mechanical: it refuses anything not hash-verified and declared, never redraws.
Schemas and every rule: docs/PLANT_SPRITE_PIPELINE_v1.md § SPECIES_ART_INTAKE.
Switching species "woolly_candle" to this pack (content/species.js) is a separate, reviewed step.
