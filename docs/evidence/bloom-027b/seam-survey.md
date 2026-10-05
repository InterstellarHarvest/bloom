# BLOOM-027B seam survey — rectangular generator (ae9c780) vs cylindrical generator

Both trees' worlds are read CYLINDRICALLY by `seam-survey.js` (the question is what the flat cut looks like on a globe). 160 raw generator worlds (40 seeds × 4 parameter sets) and 3 archetypes × public seeds 1–40 through the full production path (retry + winnability). Raw JSON: `seam-survey-baseline-ae9c780.json`, `seam-survey-after.json`.

## Headline metrics (mean per world; `n>0` = worlds where the metric is non-zero)

| set | metric | before (rectangular) | after (cylindrical) |
|---|---|---|---|
| raw dry | landmasses spanning the cut | 1 (max 1, n>0 40) | 1 (max 1, n>0 40) |
| raw dry | sections spanning the cut (same id both sides, connected) | 0 (max 0, n>0 0) | 3.95 (max 7, n>0 40) |
| raw dry | sections split when read as a rectangle | 0 (max 0, n>0 0) | 3.95 (max 7, n>0 40) |
| raw dry | neighbour pairs touching ONLY across the cut | 5.3 (max 6, n>0 40) | 0 (max 0, n>0 0) |
| raw dry | land/water flips along the cut vs mean interior boundary | 0 vs 0 (max 0, n>0 0) | 0 vs 0 (max 0, n>0 0) |
| raw dry | terrain step across the cut ÷ mean interior step | 12.932 (max 26.669, n>0 40) | 1.079 (max 1.96, n>0 40) |
| raw dry | cut's rank among the 59 interior boundaries (0 smoothest … 1 steepest) | 1 (max 1, n>0 40) | 0.547 (max 0.949, n>0 40) |
| raw dry | moisture-construction step across the cut ÷ interior | 13.633 (max 28.033, n>0 40) | 1.156 (max 1.881, n>0 40) |
| raw dry | broken sections when read as a cylinder | 0 (max 0, n>0 0) | 0 (max 0, n>0 0) |
| raw moderate | landmasses spanning the cut | 0.85 (max 1, n>0 34) | 1.025 (max 2, n>0 40) |
| raw moderate | sections spanning the cut (same id both sides, connected) | 0 (max 0, n>0 0) | 3.4 (max 6, n>0 40) |
| raw moderate | sections split when read as a rectangle | 0 (max 0, n>0 0) | 3.4 (max 6, n>0 40) |
| raw moderate | neighbour pairs touching ONLY across the cut | 2.45 (max 6, n>0 30) | 0.05 (max 1, n>0 2) |
| raw moderate | land/water flips along the cut vs mean interior boundary | 20.075 vs 1.538 (max 40, n>0 38) | 1.425 vs 1.703 (max 8, n>0 24) |
| raw moderate | terrain step across the cut ÷ mean interior step | 12.932 (max 26.669, n>0 40) | 1.079 (max 1.96, n>0 40) |
| raw moderate | cut's rank among the 59 interior boundaries (0 smoothest … 1 steepest) | 1 (max 1, n>0 40) | 0.547 (max 0.949, n>0 40) |
| raw moderate | moisture-construction step across the cut ÷ interior | 13.633 (max 28.033, n>0 40) | 1.156 (max 1.881, n>0 40) |
| raw moderate | broken sections when read as a cylinder | 0 (max 0, n>0 0) | 0 (max 0, n>0 0) |
| raw islands | landmasses spanning the cut | 0.175 (max 1, n>0 7) | 0.95 (max 2, n>0 36) |
| raw islands | sections spanning the cut (same id both sides, connected) | 0 (max 0, n>0 0) | 2.35 (max 7, n>0 36) |
| raw islands | sections split when read as a rectangle | 0 (max 0, n>0 0) | 2.35 (max 7, n>0 36) |
| raw islands | neighbour pairs touching ONLY across the cut | 0.325 (max 3, n>0 6) | 0.05 (max 1, n>0 2) |
| raw islands | land/water flips along the cut vs mean interior boundary | 19.625 vs 1.302 (max 40, n>0 39) | 1.35 vs 1.516 (max 8, n>0 24) |
| raw islands | terrain step across the cut ÷ mean interior step | 12.932 (max 26.669, n>0 40) | 1.079 (max 1.96, n>0 40) |
| raw islands | cut's rank among the 59 interior boundaries (0 smoothest … 1 steepest) | 1 (max 1, n>0 40) | 0.547 (max 0.949, n>0 40) |
| raw islands | moisture-construction step across the cut ÷ interior | 13.633 (max 28.033, n>0 40) | 1.156 (max 1.881, n>0 40) |
| raw islands | broken sections when read as a cylinder | 0 (max 0, n>0 0) | 0 (max 0, n>0 0) |
| raw small | landmasses spanning the cut | 0.5 (max 1, n>0 20) | 1.1 (max 2, n>0 40) |
| raw small | sections spanning the cut (same id both sides, connected) | 0 (max 0, n>0 0) | 2.675 (max 6, n>0 40) |
| raw small | sections split when read as a rectangle | 0 (max 0, n>0 0) | 2.675 (max 6, n>0 40) |
| raw small | neighbour pairs touching ONLY across the cut | 0.85 (max 3, n>0 17) | 0 (max 0, n>0 0) |
| raw small | land/water flips along the cut vs mean interior boundary | 19.4 vs 1.565 (max 32, n>0 40) | 1.925 vs 1.808 (max 10, n>0 23) |
| raw small | terrain step across the cut ÷ mean interior step | 10.324 (max 21.3, n>0 40) | 1.044 (max 1.873, n>0 40) |
| raw small | cut's rank among the 59 interior boundaries (0 smoothest … 1 steepest) | 1 (max 1, n>0 40) | 0.517 (max 0.957, n>0 40) |
| raw small | moisture-construction step across the cut ÷ interior | 10.892 (max 22.416, n>0 40) | 1.121 (max 1.851, n>0 40) |
| raw small | broken sections when read as a cylinder | 0 (max 0, n>0 0) | 0 (max 0, n>0 0) |
| ocean_archipelago | accepted / failed (production path, seeds 1–40) | 36 / [7, 19, 35, 38] | 40 / [] |
| ocean_archipelago | repeat generation byte-identical | 36/36 | 40/40 |
| ocean_archipelago | landmasses spanning the cut | 0.611 (max 2, n>0 20) | 1.65 (max 3, n>0 38) |
| ocean_archipelago | sections spanning the cut | 0 (max 0, n>0 0) | 2.475 (max 4, n>0 38) |
| ocean_archipelago | sections split when read as a rectangle | 0 (max 0, n>0 0) | 2.475 (max 4, n>0 38) |
| ocean_archipelago | neighbour pairs touching ONLY across the cut | 1.056 (max 4, n>0 20) | 0 (max 0, n>0 0) |
| ocean_archipelago | Waterborne landing pairs across longitude zero | 34.111 (max 144, n>0 21) | 9 (max 66, n>0 19) |
| ocean_archipelago | broken sections (cylinder reading) | 0 (max 0, n>0 0) | 0 (max 0, n>0 0) |
| ocean_archipelago | land/water flips along the cut vs mean interior boundary | 18.583 vs 3.014 (max 39, n>0 36) | 2.85 vs 2.997 (max 12, n>0 31) |
| ocean_archipelago | terrain step across the cut ÷ interior (attempt-0 worlds) | 5.864 (max 9.959, n>0 40) | 1.106 (max 1.74, n>0 40) |
| ocean_archipelago | cut's rank among interior boundaries | 1 (max 1, n>0 40) | 0.581 (max 0.898, n>0 40) |
| desert_world | accepted / failed (production path, seeds 1–40) | 40 / [] | 40 / [] |
| desert_world | repeat generation byte-identical | 40/40 | 40/40 |
| desert_world | landmasses spanning the cut | 1 (max 1, n>0 40) | 1 (max 1, n>0 40) |
| desert_world | sections spanning the cut | 0 (max 0, n>0 0) | 4.2 (max 7, n>0 40) |
| desert_world | sections split when read as a rectangle | 0 (max 0, n>0 0) | 4.2 (max 7, n>0 40) |
| desert_world | neighbour pairs touching ONLY across the cut | 4.2 (max 7, n>0 40) | 0 (max 0, n>0 0) |
| desert_world | Waterborne landing pairs across longitude zero | 0 (max 0, n>0 0) | 0 (max 0, n>0 0) |
| desert_world | broken sections (cylinder reading) | 0 (max 0, n>0 0) | 0 (max 0, n>0 0) |
| desert_world | land/water flips along the cut vs mean interior boundary | 11.05 vs 0.683 (max 28, n>0 36) | 0.7 vs 0.669 (max 9, n>0 9) |
| desert_world | terrain step across the cut ÷ interior (attempt-0 worlds) | 13.996 (max 26.697, n>0 40) | 1.127 (max 2.255, n>0 40) |
| desert_world | cut's rank among interior boundaries | 1 (max 1, n>0 40) | 0.584 (max 0.949, n>0 40) |
| frozen_world | accepted / failed (production path, seeds 1–40) | 40 / [] | 40 / [] |
| frozen_world | repeat generation byte-identical | 40/40 | 40/40 |
| frozen_world | landmasses spanning the cut | 1 (max 1, n>0 40) | 1.025 (max 2, n>0 40) |
| frozen_world | sections spanning the cut | 0 (max 0, n>0 0) | 3.85 (max 6, n>0 40) |
| frozen_world | sections split when read as a rectangle | 0 (max 0, n>0 0) | 3.85 (max 6, n>0 40) |
| frozen_world | neighbour pairs touching ONLY across the cut | 3.925 (max 7, n>0 40) | 0.075 (max 1, n>0 3) |
| frozen_world | Waterborne landing pairs across longitude zero | 0 (max 0, n>0 0) | 0.85 (max 34, n>0 1) |
| frozen_world | broken sections (cylinder reading) | 0 (max 0, n>0 0) | 0 (max 0, n>0 0) |
| frozen_world | land/water flips along the cut vs mean interior boundary | 14.475 vs 1.028 (max 32, n>0 37) | 1.3 vs 1.013 (max 7, n>0 22) |
| frozen_world | terrain step across the cut ÷ interior (attempt-0 worlds) | 14.358 (max 29.197, n>0 40) | 1.129 (max 2.34, n>0 40) |
| frozen_world | cut's rank among interior boundaries | 1 (max 1, n>0 40) | 0.587 (max 0.949, n>0 40) |

## Reading

- **Before:** the cut was a wall. No section ever spanned it (0 of 280 worlds); land/water flipped there far more often than at an interior boundary on watery sets; the terrain field jumped 10–14× an ordinary column step (the two edges were unrelated lattice ends); every neighbour pair that *would* touch across the cut on a globe was missing from gameplay.
- **After:** every raw dry/moderate world and 38–40 of each archetype's 40 worlds have at least one section whose single id sits on both sides of the cut (growth went through it); those sections are one piece under the cylinder and would be two under a rectangle; pairs touching *only* across the cut are rare (0–0.075 per world) because region borders no longer have to end there; the terrain step across the cut is 1.04–1.13× an ordinary boundary and ranks at the median (0.52–0.59); land/water flips along the cut match the interior mean; no section is broken under the cylinder reading.
- **Validation:** all 120 production worlds validate as cylinders (0 broken sections); Ocean Archipelago now accepts 40/40 public seeds (was 36/40: seeds 7, 19, 35, 38 accept with the new geography).

## Attempt changes (production path, public seeds 1–40)

- **ocean_archipelago**: 36 of 40 seeds changed attempt — 1: 23→19, 2: 8→0, 3: 18→7, 4: 1→11, 5: 17→6, 6: 2→0, 7: FAIL→2, 9: 3→4, 10: 8→2, 11: 0→2, 12: 1→12, 13: 6→2, 14: 1→0, 15: 13→11, 17: 2→1, 18: 4→13, 19: FAIL→13, 20: 11→2, 21: 1→11, 22: 0→2, 23: 2→4, 25: 10→6, 26: 22→16, 27: 1→5, 29: 1→5, 30: 19→7, 31: 3→5, 32: 9→1, 33: 5→0, 34: 17→4, 35: FAIL→1, 36: 11→4, 37: 4→2, 38: FAIL→4, 39: 9→1, 40: 6→2
- **desert_world**: 15 of 40 seeds changed attempt — 4: 0→1, 9: 1→0, 14: 0→3, 18: 0→1, 19: 0→1, 21: 0→1, 22: 1→0, 23: 1→0, 26: 0→1, 28: 1→0, 29: 0→1, 32: 0→1, 35: 1→0, 38: 0→1, 40: 1→0
- **frozen_world**: 21 of 40 seeds changed attempt — 3: 0→5, 4: 0→1, 5: 0→1, 6: 0→1, 8: 2→5, 9: 0→4, 10: 1→4, 11: 0→1, 12: 1→0, 17: 2→1, 18: 0→1, 19: 0→2, 22: 1→0, 24: 0→1, 29: 0→1, 30: 0→2, 31: 2→4, 33: 0→1, 35: 0→4, 37: 0→2, 38: 1→3

(An attempt is FNV-1a(id|seed|k); the same attempt keeps its planet name, so a fixture that keeps its attempt keeps its name.)
