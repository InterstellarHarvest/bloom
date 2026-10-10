#!/bin/zsh
# usage: tools/research/species-study/run-study.sh [repoRoot]   (after gen-worlds.js has written worlds/<archetype>.json)
# BLOOM-035A study driver (read-only against the repo): phase 2 species evaluation + the entanglement measurement
R="${1:-${0:A:h}/../../..}"; cd "${0:A:h}"; mkdir -p results logs
A=(ocean_archipelago desert_world frozen_world)
for s in organic_hybrid dry_heat cold_v2 wet_flood cold_rad dry_v2; do for a in $A; do
  nice -n 5 node species-eval.js "$R" species.json $s worlds/$a.json results/$s.$a.json --strategies > logs/$s.$a.log 2>&1 &
done; done
for s in dry_heat cold_rad wet_flood; do for a in $A; do
  nice -n 5 node entangle.js "$R" species.json $s worlds/$a.json 40 results/entangle.$s.$a.json > logs/entangle.$s.$a.log 2>&1 &
done; done
wait
for s in cold_only wet_nosalt dry_sharp cold_dry wet_v1; do for a in $A; do
  nice -n 5 node species-eval.js "$R" species.json $s worlds/$a.json results/$s.$a.json > logs/$s.$a.log 2>&1 &
done; done
wait; echo STUDY-DONE
