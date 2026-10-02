# BLOOM-013 — economy before (4d1e52c) / after, from `tools/economy-study.js` (8 run seeds, same tool, same pinned worlds)

Bubbles IGNORED (auto-collect only) unless marked *clicked*. **witness-like** = balanced colonies, strategy recipe bought 4 s after affordable, nothing else. **player** = situational allocation + one Leaf Canopy on the origin + Spread upgrades after the recipe. `ignore…` recipes buy the planet's Eden strategy under Dying World as if nothing were declining. Times in game-seconds (bot time; people are slower). Dying World before = 60 + 420 s clock, after = 40 + 250 s.

## Opening (nothing bought yet)

| World | options at t=0 | first local affordable | first meaningful global affordable | two options at once | first global affordable, bubbles clicked |
|---|---|---|---|---|---|
| First Bloom · Eden | 0 → 1 | 61.3 → 0.2 s | 83.4 → 28.9 s | 83.4 → 28.9 s | 73.1 → 28.9 s |
| Ocean Archipelago 13 · Eden | 0 → 1 | 55.7 → 0.2 s | 83.2 → 25.6 s | 83.2 → 25.6 s | 64.1 → 22.2 s |
| Desert World 25 · Eden | 0 → 1 | 49.9 → 0.2 s | 74.2 → 23.9 s | 74.2 → 23.9 s | 53.9 → 18.6 s |
| Frozen World 22 · Eden | 0 → 1 | 54.6 → 0.2 s | 78 → 25.3 s | 78 → 25.3 s | 60.8 → 21.3 s |
| Ocean Archipelago 13 · Dying World | 0 → 1 | 55.7 → 0.2 s | 83.2 → 25.6 s | 83.2 → 25.6 s | 64.1 → 22.2 s |
| Desert World 25 · Dying World | 0 → 1 | 49.9 → 0.2 s | 74.2 → 23.9 s | 74.2 → 23.9 s | 53.9 → 18.6 s |
| Frozen World 22 · Dying World | 0 → 1 | 54.6 → 0.2 s | 79.1 → 25.3 s | 79.1 → 25.3 s | 61.9 → 21.3 s |

## Purchase cadence per strategy recipe

| World · recipe | bot | 1st | 2nd | 3rd | largest gap (worst seed) | median gap | longest stretch with nothing affordable (worst) | last purchase → win | win | won |
|---|---|---|---|---|---|---|---|---|---|---|
| First Bloom · Eden · wet | witness-like | 86.8 → 32.5 | 142.5 → 84.4 | 192.2 → 120.9 | 87.4 (100.2) → 60.3 (65.6) | 53 → 35.4 | 62.9 (72) → 34.5 (41) | 8.5 → 8.6 | 344.8 → 248.1 | 8/8 → 8/8 |
| First Bloom · Eden · wet | player | 102.3 → 32.4 | 132.9 → 88.7 | 163.7 → 111.8 | 102.3 (108.5) → 56.3 (62.1) | 31.6 → 28.1 | 91.3 (108) → 44 (54) | 7.7 → 9.6 | 268.8 → 195.8 | 8/8 → 8/8 |
| First Bloom · Eden · dry | witness-like | 86.8 → 32.5 | 142.5 → 84.4 | 192.2 → 120.9 | 87.6 (100.2) → 60 (69.4) | 53 → 35.6 | 62.9 (72) → 34.5 (41) | 22.1 → 20.9 | 374.3 → 264.7 | 8/8 → 8/8 |
| First Bloom · Eden · dry | player | 102.3 → 32.4 | 132.9 → 88.7 | 163.7 → 111.8 | 102.3 (108.5) → 56.3 (62.1) | 31.3 → 23.9 | 91.3 (108) → 44 (54) | 15.9 → 7.9 | 286.8 → 214.7 | 8/8 → 8/8 |
| First Bloom · Eden · terraformWater | witness-like | 86.8 → 32.5 | 142.5 → 84.4 | 209.1 → 136.3 | 87 (100.2) → 56.4 (60) | 57.5 → 42.3 | 62.9 (72) → 34.5 (41) | 7.2 → 7.1 | 356.7 → 262.2 | 8/8 → 8/8 |
| First Bloom · Eden · terraformWater | player | 102.3 → 32.4 | 132.9 → 88.7 | 171.7 → 117.2 | 102.3 (108.5) → 56.3 (62.1) | 35.6 → 30 | 91.3 (108) → 44 (54) | 6.6 → 6.8 | 277.7 → 202.4 | 8/8 → 8/8 |
| Ocean Archipelago 13 · Eden · coldSalt | witness-like | 86.7 → 29 | 190.5 → 102.4 | 299.9 → 171.6 | 112.9 (126.8) → 77.6 (86.8) | 93.9 → 53.8 | 64.3 (74) → 40 (46) | 158.7 → 180.2 | 521.8 → 394.4 | 8/8 → 8/8 |
| Ocean Archipelago 13 · Eden · coldSalt | player | 112 → 31.5 | 177.4 → 103.1 | 273.6 → 156.5 | 113 (124.3) → 71.6 (80.5) | 65.8 → 41.2 | 98.4 (122) → 49.1 (65) | 36 → 35.5 | 440.6 → 303.9 | 8/8 → 8/8 |
| Ocean Archipelago 13 · Eden · heatRad | witness-like | 86.7 → 29 | 190.5 → 102.4 | 309.4 → 177.6 | 119.1 (138.6) → 79.6 (92.8) | 96.1 → 57.2 | 65.4 (75) → 40 (46) | 68.3 → 73.4 | 445.1 → 296.5 | 8/8 → 8/8 |
| Ocean Archipelago 13 · Eden · heatRad | player | 112 → 31.5 | 177.4 → 103.1 | 280.8 → 162.6 | 113.7 (127.2) → 72.3 (80.5) | 77.3 → 38.7 | 98.4 (122) → 49.3 (65) | 36.3 → 17.4 | 382.3 → 253.3 | 8/8 → 8/8 |
| Desert World 25 · Eden · drought2 | witness-like | 77.7 → 27.5 | 163 → 81.1 | 309.4 → 176.2 | 146.4 (179.5) → 95.1 (104.3) | 87.3 → 53.6 | 59 (72) → 33.6 (40) | 178.3 → 173.8 | 487.7 → 350 | 8/8 → 8/8 |
| Desert World 25 · Eden · drought2 | player | 104.3 → 26.5 | 158.7 → 86.6 | 256.4 → 143.6 | 107.2 (114.2) → 61.4 (67.2) | 57.2 → 40.5 | 97.3 (114) → 44.5 (63) | 34.8 → 59.3 | 395 → 276.3 | 8/8 → 8/8 |
| Desert World 25 · Eden · humidify | witness-like | 77.7 → 27.5 | 163 → 81.1 | 274 → 153.9 | 115.2 (141.7) → 75.3 (79.1) | 85.2 → 53.6 | 59 (72) → 34.6 (40) | 34.8 → 59.8 | 461.4 → 319.6 | 8/8 → 8/8 |
| Desert World 25 · Eden · humidify | player | 104.3 → 26.5 | 158.7 → 86.6 | 234.2 → 130.4 | 104.3 (114.2) → 60.1 (67.2) | 62.2 → 38.4 | 97.3 (114) → 44.5 (63) | 12.2 → 16.7 | 384.7 → 280.5 | 8/8 → 8/8 |
| Frozen World 22 · Eden · cold2 | witness-like | 81.5 → 28.9 | 157.5 → 90.6 | 214.1 → 128.6 | 99.7 (113.1) → 71.7 (78.6) | 78.2 → 49.3 | 57.4 (73) → 35.8 (42) | 39.2 → 49.6 | 351.9 → 248.5 | 8/8 → 8/8 |
| Frozen World 22 · Eden · cold2 | player | 100.9 → 29 | 145.6 → 91.2 | 180.1 → 113.6 | 100.9 (111.7) → 62.1 (65.6) | 53 → 39.4 | 71.4 (110) → 44.9 (57) | 45.8 → 9.3 | 287.2 → 207.1 | 8/8 → 8/8 |
| Frozen World 22 · Eden · warm2 | witness-like | 81.5 → 28.9 | 157.5 → 90.6 | 214.1 → 128.6 | 94.3 (101.7) → 73.3 (77.6) | 75.8 → 52.1 | 57.4 (73) → 35.8 (42) | 32.8 → 37.3 | 411.1 → 289.8 | 8/8 → 8/8 |
| Frozen World 22 · Eden · warm2 | player | 100.9 → 29 | 145.6 → 91.2 | 180.1 → 113.6 | 100.9 (111.7) → 62.1 (65.6) | 47.3 → 36.7 | 71.4 (110) → 44.9 (57) | 33.6 → 13.7 | 323.9 → 234.3 | 8/8 → 8/8 |
| Ocean Archipelago 13 · Dying World · drought | witness-like | 86.7 → 29 | 368.2 → 135.2 | 460.9 → 190.6 | 281.5 (306.4) → 106.2 (114.6) | 91.9 → 56.7 | 99.4 (126) → 40 (46) | 121.3 → 122.4 | 665.7 → 371.1 | 8/8 → 8/8 |
| Ocean Archipelago 13 · Dying World · drought | player | 125.6 → 31.5 | 338.5 → 145.9 | 398.4 → 178.1 | 212.9 (218.7) → 114.4 (125.3) | 73 → 35.6 | 145.3 (152) → 81.3 (100) | 22.2 → 27 | 534.5 → 304.9 | 8/8 → 8/8 |
| Ocean Archipelago 13 · Dying World · humidify | witness-like | 86.7 → 29 | 368.2 → 135.2 | 486.9 → 207.8 | 281.5 (306.4) → 106.2 (114.6) | 104.5 → 65.1 | 99.4 (126) → 40 (46) | 112.7 → 126.2 | 681.9 → 391.6 | 8/8 → 8/8 |
| Ocean Archipelago 13 · Dying World · humidify | player | 125.6 → 31.5 | 338.5 → 145.9 | 417.2 → 186.8 | 212.9 (218.7) → 114.4 (125.3) | 86.7 → 41.1 | 145.3 (152) → 81.3 (100) | 34.8 → 43.9 | 546.3 → 316.8 | 8/8 → 8/8 |
| Ocean Archipelago 13 · Dying World · ignoreColdSalt | witness-like | 86.7 → 29 | 312.3 → 114.7 | 537 → 202.3 | 259.4 (508.4) → 92.3 (102.4) | 157.9 → 65.5 | 124.3 (207) → 43.1 (46) | — → — | — → — | 0/8 → 0/8 |
| Ocean Archipelago 13 · Dying World · ignoreColdSalt | player | 125.6 → 31.5 | 298.8 → 131.4 | 430.8 → 200.6 | 197 (220.5) → 136.7 (181.8) | 136.7 → 59.8 | 148.6 (178) → 83.6 (100) | — → — | — → — | 0/8 → 0/8 |
| Ocean Archipelago 13 · Dying World · ignoreHeatRad | witness-like | 86.7 → 29 | 312.3 → 114.7 | 553.7 → 209.7 | 269 (575.5) → 97.1 (112.6) | 171.1 → 62.8 | 137.1 (310) → 43 (46) | — → 67.2 | — → 285 | 0/8 → 1/8 |
| Ocean Archipelago 13 · Dying World · ignoreHeatRad | player | 125.6 → 31.5 | 298.8 → 131.4 | 438.6 → 207.5 | 176.6 (206.3) → 99.9 (110.7) | 124 → 52.3 | 148.6 (178) → 81.3 (100) | — → — | — → — | 0/8 → 0/8 |
| Desert World 25 · Dying World · drought2 | witness-like | 77.7 → 27.5 | 208.4 → 108.1 | 297.7 → 155.8 | 151.2 (167.5) → 89.1 (100.2) | 110.5 → 63.5 | 59.5 (67) → 35.9 (40) | 125.6 → 122.2 | 572.5 → 365.8 | 8/8 → 8/8 |
| Desert World 25 · Dying World · drought2 | player | 104.3 → 26.5 | 185.1 → 101 | 240.1 → 128.8 | 105.5 (114.2) → 74.5 (83.2) | 76.8 → 38.2 | 97.3 (114) → 46.3 (66) | 35.7 → 21 | 444.9 → 282.9 | 8/8 → 8/8 |
| Desert World 25 · Dying World · humidify2 | witness-like | 77.7 → 27.5 | 199 → 100.8 | 325.2 → 171.4 | 149.3 (165.1) → 87.7 (95.9) | 110 → 67 | 59.3 (65) → 35.6 (40) | 129.5 → 135 | 800.6 → 513.9 | 8/8 → 8/8 |
| Desert World 25 · Dying World · humidify2 | player | 104.3 → 26.5 | 178.4 → 96.9 | 259.1 → 138.5 | 104.7 (114.2) → 70.4 (78.7) | 73.8 → 39.2 | 97.3 (114) → 46.3 (66) | 32.5 → 32.2 | 593.1 → 364.2 | 8/8 → 8/8 |
| Desert World 25 · Dying World · ignoreDrought2 | witness-like | 77.7 → 27.5 | 163 → 81.1 | 322 → 177.9 | 159 (182.5) → 96.8 (119.9) | 87.3 → 53.6 | 60.5 (69) → 36.3 (40) | — → — | — → — | 0/8 → 0/8 |
| Desert World 25 · Dying World · ignoreDrought2 | player | 104.3 → 26.5 | 158.7 → 86.6 | 261.1 → 141.4 | 109.5 (114.2) → 60.6 (67.2) | 66.1 → 42.4 | 97.3 (114) → 46.3 (66) | — → — | — → — | 0/8 → 0/8 |
| Frozen World 22 · Dying World · cold3 | witness-like | 82.6 → 28.9 | 151 → 86.9 | 201.2 → 125.6 | 142.5 (164.5) → 99.1 (110.9) | 84.8 → 58 | 57.1 (73) → 36.4 (42) | 47.6 → 56.6 | 499.5 → 352.6 | 8/8 → 8/8 |
| Frozen World 22 · Dying World · cold3 | player | 102.1 → 29 | 141.1 → 89.7 | 176.8 → 112.9 | 102.3 (116.2) → 63.8 (66.4) | 60.8 → 35.8 | 72.3 (110) → 45.5 (61) | 19.6 → 16.9 | 362.9 → 257.8 | 8/8 → 8/8 |
| Frozen World 22 · Dying World · coldWarm | witness-like | 82.6 → 28.9 | 151 → 86.9 | 234.9 → 147.3 | 104.7 (116.6) → 69.8 (76.8) | 75.2 → 51.9 | 57.1 (73) → 36.4 (42) | 60.4 → 67.9 | 519.5 → 368.5 | 8/8 → 8/8 |
| Frozen World 22 · Dying World · coldWarm | player | 102.1 → 29 | 141.1 → 89.7 | 193 → 125.4 | 102.1 (116.2) → 60.7 (66.4) | 49 → 32.6 | 72.3 (110) → 45.5 (61) | 6.3 → 11.6 | 385.3 → 284.3 | 8/8 → 8/8 |
| Frozen World 22 · Dying World · ignoreCold2 | witness-like | 82.6 → 28.9 | 158.9 → 93.7 | 210.3 → 130.6 | 124.1 (169.3) → 81 (94.9) | 78.8 → 50.9 | 59.3 (73) → 38.1 (55) | — → — | — → — | 0/8 → 0/8 |
| Frozen World 22 · Dying World · ignoreCold2 | player | 102.1 → 29 | 146.1 → 92.9 | 181.2 → 116.1 | 106.4 (122.1) → 78.3 (101.1) | 77.3 → 55 | 77.8 (110) → 56.6 (67) | — → — | — → — | 0/8 → 0/8 |

## Bubbles, local investment, pressure (after)

| World · recipe | player win: bubbles ignored → clicked | player win: no local upgrade → one Canopy → Canopy on every colony | Leaves everywhere + Canopy everywhere | Biomass spent locally (everywhere) | player earned by 180 s | Dying World: pressure at the player's win (before → after) | drift-closed land, max (before → after) |
|---|---|---|---|---|---|---|---|
| First Bloom · Eden · wet | 195.8 → 185.6 | 205.5 → 195.8 → 309.3 | 320.6 | 850 | 1100.6 | — | — |
| First Bloom · Eden · dry | 214.7 → 205.4 | 223.5 → 214.7 → 327.2 | 346 | 850 | 1100.4 | — | — |
| First Bloom · Eden · terraformWater | 202.4 → 188 | 214 → 202.4 → 309.4 | 308.4 | 850 | 1077.6 | — | — |
| Ocean Archipelago 13 · Eden · coldSalt | 303.9 → 294.3 | 344.9 → 303.9 → 447 | 561.5 | 855 | 695.3 | — | — |
| Ocean Archipelago 13 · Eden · heatRad | 253.3 → 232 | 278.3 → 253.3 → 431.3 | 378.4 | 610 | 702.9 | — | — |
| Desert World 25 · Eden · drought2 | 276.3 → 263.7 | 306.6 → 276.3 → 344.2 | 447.9 | 1103.8 | 857.9 | — | — |
| Desert World 25 · Eden · humidify | 280.5 → 260.6 | 278.6 → 280.5 → 352.3 | 435.4 | 662.5 | 860.9 | — | — |
| Frozen World 22 · Eden · cold2 | 207.1 → 192.2 | 213.2 → 207.1 → 313.6 | 354.4 | 850 | 972.2 | — | — |
| Frozen World 22 · Eden · warm2 | 234.3 → 216.8 | 243.8 → 234.3 → 352.5 | 387.1 | 850 | 977.2 | — | — |
| Ocean Archipelago 13 · Dying World · drought | 304.9 → 285.3 | 301.9 → 304.9 → 409.2 | 475.7 | 547.5 | 622.4 | 1 → 1 | 0.2 → 0 |
| Ocean Archipelago 13 · Dying World · humidify | 316.8 → 295.4 | 348.2 → 316.8 → 442.6 | 432.4 | 600 | 622.4 | 1 → 1 | 0.2 → 0 |
| Ocean Archipelago 13 · Dying World · ignoreColdSalt | — → — | — → — → — | — | 935 | 549 | 1 → 1 | 0.5 → 0.6 |
| Ocean Archipelago 13 · Dying World · ignoreHeatRad | — → 243 | — → — → — | — | 791.3 | 549 | 1 → 1 | 0.4 → 0.4 |
| Desert World 25 · Dying World · drought2 | 282.9 → 247.9 | 313.7 → 282.9 → 356.5 | 414.1 | 662.5 | 851.9 | 0.9 → 1 | 0 → 0 |
| Desert World 25 · Dying World · humidify2 | 364.2 → 326.7 | 417.9 → 364.2 → 457.8 | 534.8 | 756.3 | 880.5 | 1 → 1 | 0.2 → 0.1 |
| Desert World 25 · Dying World · ignoreDrought2 | — → — | — → — → — | — | 1181.3 | 855.8 | 1 → 1 | 0.3 → 0.3 |
| Frozen World 22 · Dying World · cold3 | 257.8 → 229.1 | 278.9 → 257.8 → 557.1 | 495.1 | 1840 | 945.2 | 0.7 → 0.9 | 0.3 → 0.3 |
| Frozen World 22 · Dying World · coldWarm | 284.3 → 260.4 | 310.6 → 284.3 → 385.4 | 448.2 | 850 | 968.3 | 0.8 → 1 | 0.2 → 0.2 |
| Frozen World 22 · Dying World · ignoreCold2 | — → — | — → — → — | — | 390 | 856.2 | 1 → 1 | 0.7 → 0.7 |

## Prices (unchanged by BLOOM-013)

cold 140/270/400 · heat 140/270/400 · drought 150/270 · flood 150/270 · salt 200 · rad 220 · seedOut 130/280 · waterSeeds 180 · earlyMat 170 · warm 200/290 · cool 200/290 · humid 200/290 · dry 200/290 · local specializations 90/130/170/210 …
