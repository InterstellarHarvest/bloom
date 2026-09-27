# BLOOM — Visual & specimen direction v1.0

**Status:** APPROVED FUTURE DIRECTION (owner + PMO, recorded with BLOOM-009, 2026-09-26; §9 contextual pop-out panels added with BLOOM-010, 2026-09-27). **Nothing in this document is implemented yet** except where the *Current implementation* section says so.

**Gate rule:** gameplay and mechanics validation comes before the full visual-polish phase. The owner passed the human procedural playtest ([`PLAYTEST_PROCEDURAL_v1.md`](PLAYTEST_PROCEDURAL_v1.md)) after BLOOM-009: the gameplay loop and per-colony development are kept, and the main open concern is **UI crowding** (§9). Content work (more archetypes) continues first; this document still does not start the visual-polish phase.

**Relationship to the bible:** this refines [`GAME_BIBLE.md`](../GAME_BIBLE.md) §12.4 (visual direction) and §13 (plant visual identity). Where §13 describes a "fixed-order layered plant sprite", the modular-anatomy architecture in §6 below supersedes it. §20 still lists the final visual language as an open decision. This document narrows that decision; it does not lock it.

---

## 1. Current implementation (BLOOM-009, BLOOM-010): temporary, functional only

- The dark monospace interface is still engineering scaffolding.
- BLOOM-009 changed the interface only where gameplay hierarchy needed it:
  - **Biomass** is the largest element in the HUD. It shows a big gold number, the passive income per second, a gold glow on gains and a red glow with a floating "−N" on spending.
  - Each colony's **growth focus** and **local upgrade** have bigger buttons and badges.
  - **Waterborne crossings** show as a few seed dots crossing the water, ending in a faint ripple (the seeds arrived) or a bright burst (a new foothold).
- The map draws each Living tile from its real stand density, from a tiny pale sprout to a full dark tile.
- None of this is final art. The Bloom Report's small plant is still a code-drawn pixel placeholder.
- **BLOOM-010** added one tiny, data-driven terrain treatment so a playtester can tell a Desert World from an Ocean Archipelago at a glance: an archetype may carry `render` data (a ground tint, its own water colours, a faint dune stipple on bare ground). It is temporary playtest readability, not the final biome art, and no asset pipeline exists.
- The **permanent left panel** (section readout, colony focus, local upgrades) is increasingly crowded. That is temporary scaffolding; §9 records the approved replacement direction.

## 2. Interface north star (future)

- Kid-friendly, organic and playful rather than clinical.
- Avoid the technical-dashboard / "AI-generated software interface" look.
- Large, readable type. Big controls with generous, touch-friendly hit targets.
- It should feel somewhere between a desktop game and an iPad app.
- The information hierarchy is obvious at a glance. **Biomass is the primary currency and stays visually dominant.**
- Visual sophistication serves readability and delight, not complexity for its own sake.

## 3. The living plant / specimen window (future)

**The map shows the planet blooming; the specimen window shows the player's plant evolving.**

The panel is one integrated scene: the plant grows upward from the soil into the sky, with its roots visible below. Environmental effects can sit behind or in front of the plant. The specimen stays the focus; the panel must not become a dense dashboard.

| Layer | Shows |
|---|---|
| **Sky** | sky colour and current temperature; clouds; rain, snow, haze or other relevant effects; Terraform-driven changes |
| **Plant** | accumulated adaptations; current growth and maturity; the local Roots / Leaves / Seeds allocation; the local specialization where appropriate; temporary stress or health |
| **Soil / belowground** | soil colour and condition; wetness or dryness where that is visually appropriate; visible roots; local root changes, including a Root Network |

### 3.1 Science / visual separation (must hold)

- **Adapt** (organism traits) changes **the plant**.
- **Terraform** changes **the environment around the plant**: sky, weather, soil and background. It never physically alters the organism, and the visuals must not imply that it does.
- **Colony development and density** change maturity, fullness and developmental appearance.
- **Current environmental stress** temporarily changes the plant's condition or behaviour.

### 3.2 Selected-region behaviour

A strong future direction is for the specimen to respond to the **currently selected colony**. The organism's global adaptations stay the same, but the scene shows that organism living in the selected region's temperature, moisture, soil, salinity and hazards, with that colony's allocation, specialization and establishment. This can become a major inspection and readability tool.

### 3.3 Small adaptation history

The panel may show a handful of adaptation tags. Selecting or hovering over one highlights the matching visible feature on the plant. Not implemented.

## 4. Visual channels (design framework, not an immutable rule)

Adaptations **accumulate** visually rather than replacing the whole plant image. Each kind of change owns a channel, so traits don't compete for the same feature. **Science accuracy wins** over forcing an adaptation into the wrong channel.

| Source | Visual channel |
|---|---|
| Temperature adaptation | stature, overall silhouette, compactness, architecture |
| Water adaptation | leaf morphology, thickness, surface qualities, water-related form |
| Soil adaptation | roots and/or stem and leaf tissue, where scientifically appropriate |
| Hazard adaptation | pigmentation, protective surface characteristics |
| Spread adaptation | flowers, fruits, seed structures, dispersal anatomy |
| Local Roots / Leaves / Seeds allocation | emphasis on, and amount of, the corresponding existing anatomy |
| Colony maturity / establishment | overall size, fullness, density |
| Terraform | environment only: sky, weather, soil and background conditions, environmental effects |

## 5. Waterborne Seeds: one visual language

Eventually Waterborne Seeds gets a recognizable seed or fruit form on the specimen itself. The **same** form then appears in the map's crossing feedback, so the player can follow the chain:

plant develops floating seeds → the seeds leave the plant and the colony → they cross the water → a new colony establishes if the destination suits the plant.

BLOOM-009 built only the minimal map crossing feedback (§1). The specimen connection is future work.

## 6. Plant art / rendering architecture (future)

**Do not** build hundreds of baked sprites, one per trait combination. **Do not** have an image model generate the whole runtime plant for each combination.

**Preferred:** modular authored parts + a code-controlled plant skeleton (blueprint) + deterministic assembly. Think character customization or modular anatomy, not pre-rendered plants. The system conceptually contains:

- a root skeleton with anchors; the main stem architecture; branch nodes and sockets; leaf sockets; reproductive sockets;
- reusable parts: leaf families, roots, stems, flowers, fruits, seed heads and pods, and trait-specific pieces or overlays;
- colour and pigment palettes;
- growth and maturity parameters.

Traits and growth state manipulate those parts and parameters. A deterministic seed/build reconstructs the same plant every time, and a manageable curated library yields many combinations.

**Bloom Report:** it reuses and enlarges this same final specimen rather than inventing a separate end-screen plant. It connects player decisions → the visible organism → real-world plant-adaptation analogs.

## 7. Art production plan

- **Prototype phase (now):** simple code-drawn or native SVG placeholders are acceptable. Claude may create simple vectors and shapes that are good enough for mechanical prototypes.
- **Later visual production:**
  - image generation serves as an art-direction and component-production aid;
  - generate reference sheets of plant components where useful;
  - turn the chosen designs into clean, reusable parts;
  - runtime code owns composition and manipulation.
  - Example component batches: leaf families, roots, stems, flowers, seed pods, fruits, thorns, waxy/succulent structures, pigments and protective features.
- Never ask an image generator for every possible finished plant combination.

## 8. Rendering technology: escalation path

1. Native HTML / CSS / canvas / SVG.
2. Native SVG + JavaScript for modular plant assembly.
3. SVG.js or a similar lightweight SVG helper, only if native manipulation becomes unnecessarily cumbersome.
4. Heavier rendering (Three.js / WebGL) only when a demonstrated design or animation requirement cannot reasonably be met by the simpler stack.

Richer planned visuals are not, on their own, a reason to add Three.js. The engineering preference remains maximum game impact with minimum unnecessary code.

## 9. Contextual pop-out panels (approved after BLOOM-009; recorded with BLOOM-010 — future, NOT implemented)

The owner's verdict after the procedural playtest: the gameplay loop is good and the per-colony development mechanic stays. The main remaining problem is **UI crowding**. The owner approved this direction for the final information architecture.

- **The crowded permanent left panel is temporary scaffolding.** It exists because the prototype added one readout after another to a fixed sidebar. It is not the target layout.
- **Lean toward contextual pop-out panels, drawers and large cards**, in the spirit of SimCity and The Sims:
  - selecting a region can open a **larger region panel**, instead of squeezing its readout into a narrow column;
  - **colony development** (growth focus, local specialization) can live in its own contextual panel for the selected colony;
  - the global **Adapt / Spread / Terraform** systems can use larger dedicated surfaces;
  - details appear **on demand** instead of staying permanently visible.
- **Prefer larger fonts and larger buttons** over compressing information to preserve sidebar space. This is consistent with §2 (large type, touch-friendly targets).
- **The map / surface stays the visual centre of the game.** Panels open over or beside it and close again; they never permanently shrink the planet into a corner.
- Continue toward the approved **kid-friendly, organic, desktop/iPad hybrid** direction (§2).
- The SimCity / Sims reference is about **how information is organized** (contextual, on-demand, large). It is **not** an instruction to copy their visual design.

**Scope:** this is future UI/UX direction only. BLOOM-010 was a mechanics/content package (the Desert World archetype) and implemented none of it. The redesign comes with the visual-polish / final-board phase (bible §15), after content validation.

