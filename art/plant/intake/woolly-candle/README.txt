STRANGE BLOOM · UNKNOWN SOILS
WOOLLY CANDLE — FINAL ART INTAKE LANE (BLOOM-035C)

Pack id:     woolly-candle
Species id:  woolly_candle
Body plan:   candle@2   (58 drawings + masks) — BLOOM-035C2 fidelity revision: the same anatomy, sockets and
             grammar as candle@1 (one attachment offset: the storage root, dy 2 → 1) with larger native component maxima
Brief:       docs/species-art-briefs/WOOLLY_CANDLE_ART_BRIEF_v2.md (+ .json)   (v1 / candle@1 = historical)
Replaces:    art/plant/packs/proof-woolly-candle  (TEMPORARY PIPELINE PROOF — NOT FINAL ART; candle@1)

STATUS: INGESTED (BLOOM-035C2 review candidate). The PMO-accepted source candidate WOOLLY_CANDLE_PRODUCTION_SOURCE_CANDIDATE_CANDLE2
(15376001 B ZIP, SHA-256 48a9db4883e597c9dd15c123f3474af581f4b3bc073fb99802c2f7b6084d3b69; aggregate package hash
cdcf99c910864ad98d58c12c8953dc92fbdf2218217c54715adb7b922632082c over 142 files) was converted mechanically into the 7 C0 deliveries here by
tools/species-source-deliveries.mjs (SOURCE_PROVENANCE.json = the complete source inventory) and ingested by
tools/intake-plant-art.mjs into art/plant/packs/woolly-candle/ (intake-map.json). The species uses this pack.

  node tools/species-source-deliveries.mjs --pack woolly-candle --source <path to WOOLLY_CANDLE_PRODUCTION_SOURCE_CANDIDATE_CANDLE2.zip> --check
  node tools/intake-plant-art.mjs --pack woolly-candle --check

The lane format (for any future re-delivery), unchanged:

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
