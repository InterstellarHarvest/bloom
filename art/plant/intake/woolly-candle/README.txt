STRANGE BLOOM · UNKNOWN SOILS
WOOLLY CANDLE — FINAL ART INTAKE LANE (BLOOM-035C)

Pack id:     woolly-candle
Species id:  woolly_candle
Body plan:   candle@2   (58 drawings + masks) — BLOOM-035C2A fidelity revision: the same anatomy, sockets and
             grammar as candle@1 at production authoring resolution (larger native component maxima)
Brief:       docs/species-art-briefs/WOOLLY_CANDLE_ART_BRIEF_v2.md (+ .json)   (v1 / candle@1 = historical)
Replaces:    art/plant/packs/proof-woolly-candle  (TEMPORARY PIPELINE PROOF — NOT FINAL ART; candle@1)
Contract proof: art/plant/packs/proof-woolly-candle-c2  (TEMPORARY engineering proof of candle@2, never shown)

STATUS: awaiting the candle@2 deliveries. No final art exists yet. Woolly Candle V4 (drawn under candle@1)
was a technical pass / visual fail and is NOT ingested; do not deliver art under candle@1.

When the PMO has approved the Woolly Candle batches, place here, unchanged:

  PMO_FINAL_ACCEPTANCE.json        format bloom-plant-art-acceptance@1 (pack "woolly-candle", bodyPlan "candle@2",
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
