STRANGE BLOOM · UNKNOWN SOILS
CINDER ROSETTE — FINAL ART INTAKE LANE (BLOOM-035C)

Pack id:     cinder-rosette
Species id:  cinder_rosette
Body plan:   rosette@1   (60 drawings + masks)
Brief:       docs/species-art-briefs/CINDER_ROSETTE_ART_BRIEF_v1.md (+ .json)
Replaces:    art/plant/packs/proof-cinder-rosette  (TEMPORARY PIPELINE PROOF — NOT FINAL ART)

STATUS: awaiting deliveries. No final art exists yet.

When the PMO has approved the Cinder Rosette batches, place here, unchanged:

  PMO_FINAL_ACCEPTANCE.json        format bloom-plant-art-acceptance@1 (pack "cinder-rosette", bodyPlan "rosette@1",
                                   status "FINAL PMO-APPROVED ART INTAKE", one {file, batch, bytes, sha256}
                                   per accepted delivery)
  approved-deliveries/*.zip        exactly the accepted ZIPs, each with one delivery.json
                                   (format bloom-plant-art-delivery@1)

Then:

  node tools/intake-plant-art.mjs --pack cinder-rosette --dry-run
  node tools/intake-plant-art.mjs --pack cinder-rosette
  npm --prefix tools run build:plant-art

The intake is mechanical: it refuses anything not hash-verified and declared, never redraws.
Schemas and every rule: docs/PLANT_SPRITE_PIPELINE_v1.md § SPECIES_ART_INTAKE.
Switching species "cinder_rosette" to this pack (content/species.js) is a separate, reviewed step.
