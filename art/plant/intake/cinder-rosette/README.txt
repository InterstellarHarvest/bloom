STRANGE BLOOM · UNKNOWN SOILS
CINDER ROSETTE — FINAL ART INTAKE LANE (BLOOM-035C)

Pack id:     cinder-rosette
Species id:  cinder_rosette
Body plan:   rosette@1   (60 drawings + masks)
Brief:       docs/species-art-briefs/CINDER_ROSETTE_ART_BRIEF_v1.md (+ .json)
Replaces:    art/plant/packs/proof-cinder-rosette  (TEMPORARY PIPELINE PROOF — NOT FINAL ART)

STATUS: INGESTED (BLOOM-035C2 review candidate). The PMO-accepted source candidate CINDER_ROSETTE_PRODUCTION_SOURCE_CANDIDATE_v3_1
(2607263 B ZIP, SHA-256 1be928b1a6d4e9d95ededdb459f941e08fdcaae7e0db0797b7a5b539f5973bff; aggregate package hash
4254d43c20cf9b13b1215441687342dcc326e857d055cd769163683559ff3bfc over 235 files) was converted mechanically into the 7 C0 deliveries here by
tools/species-source-deliveries.mjs (SOURCE_PROVENANCE.json = the complete source inventory) and ingested by
tools/intake-plant-art.mjs into art/plant/packs/cinder-rosette/ (intake-map.json). The species uses this pack.

  node tools/species-source-deliveries.mjs --pack cinder-rosette --source <path to CINDER_ROSETTE_PRODUCTION_SOURCE_CANDIDATE_v3_1.zip> --check
  node tools/intake-plant-art.mjs --pack cinder-rosette --check

The lane format (for any future re-delivery), unchanged:

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
