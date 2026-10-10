# Species calibration on production code (BLOOM-035B)

Sample 120 seeds × 3 archetypes (358 validated worlds) + First Bloom / Training Grounds; 4 species; 340 s on 8 threads.

### Landing habitable share (green-lamp land at arrival; the survey's own assessWorld)

| species | archetype | n | min | p10 | p25 | median | p75 | p90 | max |
|---|---|---|---|---|---|---|---|---|---|
| organic_hybrid | Ocean | 118 | 0.07 | 0.22 | 0.31 | **0.44** | 0.54 | 0.60 | 0.82 |
| organic_hybrid | Desert | 120 | 0.03 | 0.05 | 0.09 | **0.14** | 0.19 | 0.23 | 0.44 |
| organic_hybrid | Frozen | 120 | 0.13 | 0.16 | 0.21 | **0.27** | 0.35 | 0.43 | 0.57 |
| cinder_rosette | Ocean | 118 | 0.00 | 0.00 | 0.00 | **0.10** | 0.18 | 0.26 | 0.46 |
| cinder_rosette | Desert | 120 | 0.03 | 0.18 | 0.23 | **0.33** | 0.40 | 0.47 | 0.70 |
| cinder_rosette | Frozen | 120 | 0.00 | 0.06 | 0.11 | **0.18** | 0.23 | 0.28 | 0.49 |
| woolly_candle | Ocean | 118 | 0.00 | 0.13 | 0.19 | **0.29** | 0.41 | 0.49 | 0.64 |
| woolly_candle | Desert | 120 | 0.00 | 0.05 | 0.08 | **0.12** | 0.16 | 0.23 | 0.44 |
| woolly_candle | Frozen | 120 | 0.10 | 0.22 | 0.29 | **0.37** | 0.48 | 0.56 | 0.67 |
| reed_spire | Ocean | 118 | 0.21 | 0.39 | 0.51 | **0.59** | 0.67 | 0.75 | 0.91 |
| reed_spire | Desert | 120 | 0.00 | 0.00 | 0.00 | **0.05** | 0.08 | 0.11 | 0.27 |
| reed_spire | Frozen | 120 | 0.00 | 0.10 | 0.15 | **0.22** | 0.28 | 0.35 | 0.51 |

### Survey class frequency (≥ 35 % Favorable · ≥ 20 % Precarious · else Extreme)

| species | archetype | Favorable | Precarious | Extreme |
|---|---|---|---|---|
| organic_hybrid | Ocean | 84 (71%) | 25 (21%) | 9 (8%) |
| organic_hybrid | Desert | 2 (2%) | 21 (18%) | 97 (81%) |
| organic_hybrid | Frozen | 29 (24%) | 64 (53%) | 27 (23%) |
| cinder_rosette | Ocean | 3 (3%) | 24 (20%) | 91 (77%) |
| cinder_rosette | Desert | 54 (45%) | 47 (39%) | 19 (16%) |
| cinder_rosette | Frozen | 5 (4%) | 36 (30%) | 79 (66%) |
| woolly_candle | Ocean | 45 (38%) | 39 (33%) | 34 (29%) |
| woolly_candle | Desert | 2 (2%) | 15 (13%) | 103 (86%) |
| woolly_candle | Frozen | 72 (60%) | 38 (32%) | 10 (8%) |
| reed_spire | Ocean | 113 (96%) | 5 (4%) | 0 (0%) |
| reed_spire | Desert | 0 (0%) | 1 (1%) | 119 (99%) |
| reed_spire | Frozen | 12 (10%) | 56 (47%) | 52 (43%) |

### Dominant limiting factor (largest share of the land that is not green), top 3

| species | archetype | frequency |
|---|---|---|
| organic_hybrid | Ocean | Soil:hostile 38% · Water:wet 29% · Hazard:lethal 22% |
| organic_hybrid | Desert | Water:parched 93% · Water:dry 8% |
| organic_hybrid | Frozen | Temperature:freezing 100% |
| cinder_rosette | Ocean | Water:flooded 77% · Water:wet 15% · Temperature:freezing 3% |
| cinder_rosette | Desert | Water:parched 59% · Water:dry 28% · Hazard:lethal 12% |
| cinder_rosette | Frozen | Temperature:freezing 100% |
| woolly_candle | Ocean | Temperature:scorching 49% · Water:wet 25% · Soil:hostile 14% |
| woolly_candle | Desert | Water:parched 53% · Temperature:scorching 46% · Water:dry 1% |
| woolly_candle | Frozen | Temperature:freezing 97% · Temperature:cold 3% |
| reed_spire | Ocean | Hazard:lethal 58% · Soil:hostile 13% · Temperature:cold 6% |
| reed_spire | Desert | Water:parched 100% |
| reed_spire | Frozen | Temperature:freezing 100% |

### Foothold, winnability and the production verdict

| species | archetype | S1 low foothold (< 5 %, reported) | witness winnable (measured) | validateFor S2 ok (offer gate) | median witness spend | median purchases | median win |
|---|---|---|---|---|---|---|---|
| organic_hybrid | Ocean | 7 (6%) | 118/118 (100%) | 118/118 (118 reused) | 710 | 4 | 372 s |
| organic_hybrid | Desert | 24 (20%) | 120/120 (100%) | 120/120 (120 reused) | 750 | 4 | 220 s |
| organic_hybrid | Frozen | 11 (9%) | 120/120 (100%) | 120/120 (120 reused) | 540 | 3 | 210 s |
| cinder_rosette | Ocean | 14 (12%) | 118/118 (100%) | 118/118 | 860 | 5 | 464 s |
| cinder_rosette | Desert | 6 (5%) | 120/120 (100%) | 120/120 | 500 | 3 | 170 s |
| cinder_rosette | Frozen | 18 (15%) | 120/120 (100%) | 120/120 | 890 | 5 | 298 s |
| woolly_candle | Ocean | 8 (7%) | 118/118 (100%) | 118/118 | 800 | 5 | 392 s |
| woolly_candle | Desert | 20 (17%) | 120/120 (100%) | 120/120 | 640 | 4 | 215 s |
| woolly_candle | Frozen | 5 (4%) | 120/120 (100%) | 120/120 | 410 | 3 | 173 s |
| reed_spire | Ocean | 2 (2%) | 118/118 (100%) | 118/118 | 650 | 4 | 345 s |
| reed_spire | Desert | 36 (30%) | 120/120 (100%) | 120/120 | 770 | 4 | 264 s |
| reed_spire | Frozen | 15 (13%) | 120/120 (100%) | 120/120 | 620 | 4 | 236 s |

### Strategy diversity / pacing / required-condition bypass — RECORDED diagnostics (never offer gates)

| species | archetype | S3 ≥ minStrategies distinct | S3 + S4 pacing | ≥ 2 distinct winners | median minimal build | median fastest margin | fastest < 240 s | a winner bypasses the required condition |
|---|---|---|---|---|---|---|---|---|
| organic_hybrid | Ocean | 118/118 (100%) | 118/118 (100%) | 118 (100%) | 3 | 378 s | 2 (2%) | n/a |
| organic_hybrid | Desert | 120/120 (100%) | 120/120 (100%) | 120 (100%) | 3 | 254 s | 10 (8%) | 0 (0%) |
| organic_hybrid | Frozen | 120/120 (100%) | 120/120 (100%) | 120 (100%) | 2 | 248 s | 23 (19%) | 0 (0%) |
| cinder_rosette | Ocean | 106/118 (90%) | 91/118 (77%) | 106 (90%) | 4 | 477 s | 0 (0%) | n/a |
| cinder_rosette | Desert | 95/120 (79%) | 43/120 (36%) | 95 (79%) | 2 | 177 s | 83 (69%) | 11 (9%) |
| cinder_rosette | Frozen | 120/120 (100%) | 112/120 (93%) | 120 (100%) | 3 | 302 s | 3 (3%) | 0 (0%) |
| woolly_candle | Ocean | 115/118 (97%) | 110/118 (93%) | 115 (97%) | 4 | 398 s | 0 (0%) | n/a |
| woolly_candle | Desert | 120/120 (100%) | 118/120 (98%) | 120 (100%) | 3 | 255 s | 27 (23%) | 0 (0%) |
| woolly_candle | Frozen | 119/120 (99%) | 66/120 (55%) | 119 (99%) | 2 | 177 s | 80 (67%) | 7 (6%) |
| reed_spire | Ocean | 83/118 (70%) | 79/118 (67%) | 83 (70%) | 3 | 360 s | 2 (2%) | n/a |
| reed_spire | Desert | 116/120 (97%) | 116/120 (97%) | 116 (97%) | 3 | 278 s | 2 (2%) | 0 (0%) |
| reed_spire | Frozen | 120/120 (100%) | 120/120 (100%) | 120 (100%) | 3 | 258 s | 13 (11%) | 0 (0%) |

### Best or tied-best landing share on the same world

| archetype | worlds | share of worlds where the species is best or tied-best |
|---|---|---|
| Ocean | 118 | organic_hybrid 12% · cinder_rosette 0% · woolly_candle 2% · reed_spire 90% |
| Desert | 120 | organic_hybrid 8% · cinder_rosette 99% · woolly_candle 8% · reed_spire 2% |
| Frozen | 120 | organic_hybrid 23% · cinder_rosette 2% · woolly_candle 79% · reed_spire 8% |

### Authored worlds (survey assessment)

| species | First Bloom habitable | class | winnable | Training Grounds habitable | class | winnable |
|---|---|---|---|---|---|---|
| organic_hybrid | 0.3535 | favorable | yes | 0.3600 | favorable | yes |
| cinder_rosette | 0.1313 | extreme | yes | 0.3800 | favorable | yes |
| woolly_candle | 0.3535 | favorable | yes | 0.5800 | favorable | yes |
| reed_spire | 0.3535 | favorable | yes | 0.3600 | favorable | yes |

### Expected draws to fill one survey column (3 cells) — MAX_DRAWS is 400

| species | Favorable | Precarious | Extreme |
|---|---|---|---|
| organic_hybrid | 9.4 | 9.8 | 8.1 |
| cinder_rosette | 17.4 | 10.1 | 5.7 |
| woolly_candle | 9.1 | 11.7 | 7.3 |
| reed_spire | 8.6 | 17.4 | 6.3 |
