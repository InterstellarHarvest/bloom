# BLOOM — Next Playable Slice

**Version:** 1.0  
**Purpose:** Define the next implementation gate after Portion 1 — The Surface.

## Goal

Produce one short, complete Eden run that proves BLOOM’s core interaction is understandable and satisfying before expanding procedural generation, trait content, pressure scenarios, or production art.

## Required playable flow

1. The run opens on one authored 8–10 section planet.
2. The plant begins in a protected origin section.
3. The plant spreads automatically into suitable adjacent ground.
4. A nearby section stalls and clearly reports one limiting factor.
5. The player earns passive Biomass and an occasional bonus bubble.
6. The player purchases a Spread, Adapt, or Terraform answer.
7. The affected region visibly changes state and growth resumes or fails for an understandable reason.
8. Later regions create tradeoffs instead of merely requiring every upgrade.
9. The player wins by holding 70% of colonizable land alive simultaneously.
10. A compact Bloom Report shows the final plant and why the build worked.

## Required systems

### Surface and simulation

- existing tile and section foundation;
- Barren, Living, and Dead states;
- vigor and maturity;
- contiguous seed pressure;
- hysteresis and damped die-back;
- recovery from Dead to Barren;
- coverage and win calculation.

### Readability

- Temperature, Water, Soil, and Hazard status per section;
- green/yellow/red state;
- one named limiting factor;
- optional click-through raw explanation;
- clear Adapt-versus-Terraform indicator.

### Economy

- passive Biomass from thriving area;
- reduced income from marginal area;
- protected origin trickle;
- occasional bonus bubbles;
- bubble auto-collection fallback.

### Temporary upgrade set

Use a small test set rather than the final tree.

**Spread**

- Seed Output
- Early Maturity
- Waterborne Seeds, only if the slice contains an island

**Adapt**

- Cold Tolerance
- Heat Tolerance
- Drought Adaptation
- Flood Adaptation
- Salt Handling or Radiation Shielding

**Terraform**

- Warm
- Cool
- Humidify
- Dry

### End state

- 70% simultaneous living coverage wins;
- no external pressure or loss clock;
- optional continue button;
- final plant build and short science debrief.

## Explicitly deferred

- procedural planet selection as the main menu;
- multiple archetypes;
- final hex boards;
- complete trait catalog;
- final layered art set;
- Native Competition or other pressure AI;
- detailed score stars;
- extensive unlock economy;
- final audio and visual polish.

## Acceptance questions

The slice is ready to expand only when playtesting can answer “yes” to most of these:

- Can a new player identify why growth stopped within a few seconds?
- Does buying a solution visibly change the map?
- Is there usually something meaningful to inspect or decide?
- Does passive Biomass avoid dead waiting time?
- Do bubbles feel rewarding without demanding attention?
- Does Terraform create a real regional tradeoff?
- Are at least two broad winning approaches plausible?
- Does the midgame accelerate in a satisfying way?
- Does reaching the threshold feel like solving the planet?
- Can the player explain one real plant adaptation after the run without a separate quiz?

## Implementation rule

Temporary UI is acceptable. A complete ugly loop is more valuable than a polished isolated subsystem. Do not spend major time on final visual style or large procedural content until this gate passes.
