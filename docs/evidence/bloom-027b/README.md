# BLOOM-027B evidence — Cylindrical Procedural Generation

| item | value |
|---|---|
| branch / worktree | `agent/bloom-027b-cylinder-generator` · `_worktrees/bloom-027b-cylinder-gen` |
| starting SHA | `ae9c780` (BLOOM-027A; main was still `b704961`) |
| final SHA | _(filled in by the closing commit; see the branch tip)_ |
| sphere spike | `agent/planet-sphere-spike` `75101e1`, untouched |

## Files

| file | what it proves |
|---|---|
| `seam-survey.js`, `seam-survey-baseline-ae9c780.json`, `seam-survey-after.json`, `seam-survey.md` | before/after seam survey, 160 raw worlds + 3 archetypes × seeds 1–40 through the production path, read cylindrically; determinism repeats; attempt changes |
| `rng-draw-compare.js`, `rng-draw-compare.json` | both generators instrumented in vm contexts: 143 draws per noise field in both; where the stream legitimately diverges |
| `lattice-phase-scan.js`, `lattice-phase-scan.json` | why the lattice ring is turned by ⅓ cell (the cut would otherwise be the smoothest column) |
| `fixture-scan.js` | per-attempt production validation used to re-pick negative fixtures by role |
| `repin.js`, `repin.json` | every generator-dependent pin recomputed with each suite's own hashing |
| `fixture-changes.md` | every changed fixture/pin, why, and the proof it fills the same role |
| `render-flat-maps.js`, `flat-maps/` | flat-map captures (engine strip + half-turn rotation so the former edge is mid-picture + the two seam columns) |
| `economy-old-baseline.json` | the new fixture worlds measured under the pre-BLOOM-013 economy (economy-check's "was" numbers) |
| `run-all-suites.sh`, `qa-suites-summary.txt` | the 18-suite run and its totals (below) |

Periodic-noise proof, topology output proof, determinism, coast/crossing/adjacency proofs: `node tools/cylinder-gen-check.js` (every check names what it proves); generator pins: `node tools/topology-check.js` group I.

## QA totals (final run, Node 20.20.2, Playwright under `npm root -g`, macOS 12)

| suite | checks | result |
|---|---|---|
| sim-check (First Bloom golden bit-for-bit) | 19 | PASS |
| gen-check | 47 | PASS |
| crossing-check | 14 | PASS |
| topology-check (group I re-pinned, +I.4) | 53 | PASS |
| **cylinder-gen-check (new)** | **35** | PASS |
| archetype-check | 40 | PASS |
| strategy-check (natural too-fast → controlled) | 35 | PASS |
| slice-check | 15 | PASS |
| surface-check | 11 | PASS |
| procedural-run-check | 32 | PASS |
| colony-development-check | 68 | PASS |
| desert-check | 64 | PASS |
| frozen-check | 70 | PASS |
| dying-world-check | 63 | PASS |
| economy-check | 39 | PASS |
| native-competition-check | 66 | PASS |
| volatile-climate-check | 78 | PASS |
| game-flow-check | 74 | PASS |
| **total** | **823** (788 at 027A: +35 new, +1 topology, −1 strategy) | all green |

Raw: `qa-suites-summary.txt`. Validator results, archetype sweeps and winnability: `seam-survey-after.json` (120/120 production worlds accepted and validated as cylinders; every Node suite's sweep is inside the suite logs), `fixture-changes.md` (every pinned seed / hash that moved, with reasons).
