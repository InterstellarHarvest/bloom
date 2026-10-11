STRANGE BLOOM · UNKNOWN SOILS
REED SPIRE — FINAL ART INTAKE LANE (BLOOM-035C)

Pack id:     reed-spire
Species id:  reed_spire
Body plan:   reed@1   (53 drawings + masks)
Brief:       docs/species-art-briefs/REED_SPIRE_ART_BRIEF_v1.md (+ .json)
Replaces:    art/plant/packs/proof-reed-spire  (TEMPORARY PIPELINE PROOF — NOT FINAL ART)

STATUS: INGESTED (BLOOM-035C2 review candidate). The PMO-accepted source candidate REED_SPIRE_PRODUCTION_SOURCE_CANDIDATE_v3_1
(10868753 B ZIP, SHA-256 73ed7a565b101745b0edc9960daa14e5ec150bbbe1b5f678673b22617dda5983; aggregate package hash
c167a10c747cc221c130adf843eb36c93c406b7d50f3a03690628b6fbff5dfee over 166 files) was converted mechanically into the 7 C0 deliveries here by
tools/species-source-deliveries.mjs (SOURCE_PROVENANCE.json = the complete source inventory) and ingested by
tools/intake-plant-art.mjs into art/plant/packs/reed-spire/ (intake-map.json). The species uses this pack.

  node tools/species-source-deliveries.mjs --pack reed-spire --source <path to REED_SPIRE_PRODUCTION_SOURCE_CANDIDATE_v3_1.zip> --check
  node tools/intake-plant-art.mjs --pack reed-spire --check

The lane format (for any future re-delivery), unchanged:

  PMO_FINAL_ACCEPTANCE.json        format bloom-plant-art-acceptance@1 (pack "reed-spire", bodyPlan "reed@1",
                                   status "FINAL PMO-APPROVED ART INTAKE", one {file, batch, bytes, sha256}
                                   per accepted delivery)
  approved-deliveries/*.zip        exactly the accepted ZIPs, each with one delivery.json
                                   (format bloom-plant-art-delivery@1)

Then:

  node tools/intake-plant-art.mjs --pack reed-spire --dry-run
  node tools/intake-plant-art.mjs --pack reed-spire
  npm --prefix tools run build:plant-art

The intake is mechanical: it refuses anything not hash-verified and declared, never redraws.
Schemas and every rule: docs/PLANT_SPRITE_PIPELINE_v1.md § SPECIES_ART_INTAKE.
Switching species "reed_spire" to this pack (content/species.js) is a separate, reviewed step.
