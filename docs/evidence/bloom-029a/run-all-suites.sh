#!/bin/zsh
# BLOOM-029A evidence: run every QA suite in turn and write qa-suites-summary.txt (Node 20, Playwright under `npm root -g`).
# The 24 suites (run-ui-check is the 24th, added in 029A).
cd "$(dirname "$0")/../../.." || exit 1
export NODE_PATH="$(npm root -g)"
OUT="docs/evidence/bloom-029a/qa-suites-summary.txt"; LOGDIR="${TMPDIR:-/tmp}/bloom-029a-suites"; mkdir -p "$LOGDIR"
printf "%-28s %5s %5s  %s\n" suite pass fail result > "$OUT"
for t in sim-check gen-check crossing-check topology-check cylinder-gen-check archetype-check strategy-check slice-check surface-check procedural-run-check colony-development-check desert-check frozen-check dying-world-check economy-check native-competition-check volatile-climate-check game-flow-check sphere-texture-check destination-survey-check atmosphere-transition-check main-menu-check training-check run-ui-check; do
  t0=$(date +%s); node "tools/$t.js" > "$LOGDIR/$t.log" 2>&1; code=$?; dt=$(( $(date +%s) - t0 ))
  pass=$(grep -c '^PASS' "$LOGDIR/$t.log"); fail=$(grep -c '^FAIL' "$LOGDIR/$t.log"); res=$(grep -E "ALL CHECKS PASS|check\(s\) FAILED" "$LOGDIR/$t.log" | tail -1)
  printf "%-28s %5s %5s  exit=%s %s  (%ss)\n" "$t" "$pass" "$fail" "$code" "${res:-CRASHED}" "$dt" | tee -a "$OUT"
done
