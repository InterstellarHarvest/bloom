# BLOOM — Gameplay Direction Decisions

**Version:** 1.0  
**Status:** Owner direction recorded  
**Relationship:** This document explains the decisions incorporated into `GAME_BIBLE.md` v1.1. The bible remains the plan of record.

## Owner intent

BLOOM should emulate the pacing and accessible strategic structure of *Plague Inc.*, applying that design to a plant spreading through different environments on alien planets.

The project should balance game quality and science learning equally. The intended final feeling is:

> I figured out how to make this plant thrive and take over the planet.

## Locked direction

1. **Plague-style rhythm is the reference.** Watch spread, collect occasional map rewards, buy upgrades, and see regional consequences.
2. **Procedural planets are the main game.** A small number of authored planets teach the systems first.
3. **Eden is a sandbox testbed.** It is useful for learning and experimentation, not the only intended difficulty model.
4. **Progression comes from unlockable starters and pressure scenarios.** Unlocks should create different strategies rather than simple power increases.
5. **Information is glanceable first and detailed second.** Short on-screen labels can be clicked for explanations and science.
6. **Terraform consequences are strategic.** Costs, instability, and region tradeoffs provide the downside; the game does not need an ethical punishment layer.
7. **The visual target is friendly, cutesy, and modern.** The existing dark demo is technical scaffolding, not a locked final aesthetic.
8. **The current eight-variable presentation is not locked.** The player-facing model is reduced to Temperature, Water, Soil, and Hazard while raw values may remain underneath.
9. **Biomass bubbles remain a testable hypothesis.** Current direction is passive income plus bubbles as optional bonus interaction.
10. **The plant should visibly change with adaptations.** Pet or character mechanics are not required.

## Design consequences

### Four-category environmental readout

The game should not ask a new player to continuously interpret temperature, moisture, light, pH, salinity, toxicity, radiation, and nutrients as eight equal gates.

Instead:

- Temperature and Water remain primary strategy axes.
- Soil summarizes pH, salinity, and nutrients, then reveals the actual cause on click.
- Hazard summarizes radiation, toxicity, and special planetary threats.
- Light usually changes growth and income rather than acting as a universal hard gate.

This preserves scientific mechanisms while matching the speed and readability of the chosen reference game.

### Designed procedural generation

Random planets should be generated from coherent archetypes. Archetypes define the broad environmental story; generation changes topology, values, exceptions, and severity.

The validator must protect not only technical winnability but also reachability, pacing, coherent signals, and strategic variety.

### Complete-loop priority

The surface demo has validated map generation and inspection. The next development target is a small complete run, not additional isolated foundation systems.

The project must prove that this sequence is fun:

> see barrier → buy answer → watch spread resume → earn faster → solve larger tradeoff

## Still open

The following require prototypes rather than additional debate:

- bubble frequency and auto-collection;
- final plant personality;
- exact board layout;
- exact temperature specialization rules;
- final visual style;
- amount of predictive information shown before Terraform purchases.
