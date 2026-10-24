#!/bin/bash
# sequential regression: focused list, then every tools/*-check.js (default args); TSV of suite, exit, seconds, pass/fail counts
ROOT="$1"; OUT="$2"; mkdir -p "$OUT"; cd "$ROOT"; export NODE_PATH="$(npm root -g)"
FOCUSED="run-ui-check run-ui-convergence-check planet-view-check plant-rooms-check terraform-check guided-training-check visual-system-check ui-polish-check portable-runtime-check transition-check"
run() { local name="$1"; shift; local t0=$(date +%s); node "tools/$name.js" "$@" > "$OUT/$name$TAG.log" 2>&1; local ec=$?; local t=$(( $(date +%s) - t0 ));
  local p=$(grep -cE "^(PASS|ok|  ✓|✓)" "$OUT/$name$TAG.log"); local f=$(grep -cE "^(FAIL|not ok|  ✗|✗)" "$OUT/$name$TAG.log"); printf "%s%s\t%s\t%s\t%s\t%s\n" "$name" "$TAG" "$ec" "$t" "$p" "$f" >> "$OUT/regression.tsv"; }
printf "suite\texit\tseconds\tpass_lines\tfail_lines\n" > "$OUT/regression.tsv"
TAG=":focused"; for s in $FOCUSED; do run "$s"; done; run release-check --no-suites
TAG=""; for f in tools/*-check.js; do run "$(basename "$f" .js)"; done
echo DONE >> "$OUT/regression.tsv"
