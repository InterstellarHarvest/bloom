# Plant Evolution Visual Lab v1 — BLOOM-032A

**For:** the owner, who chooses the production plant's look, and the PMO and developers who will build it in 032B.
**Open:** `demos/plant-evolution-lab.html`. Double-click it, or serve the repository and visit `/demos/plant-evolution-lab.html`.
**QA:** `tools/plant-evolution-lab-check.js`. **Evidence:** `docs/evidence/bloom-032a/`.

The lab is a design gate, not gameplay. It shows four candidate art directions for the production plant. Each one is driven by the
real trait data and the real tier rules, and all four sit beside the current production specimen. **Nothing has been chosen.** The
game keeps `resources/run-ui/plant-specimen.js` until the owner picks a direction.

---

## 1. Why the production SVG specimen is still the reference

BLOOM-029C's specimen proved the data connection. Every real Adapt and Spread trait, the colony's focus and local upgrade,
establishment, stress and previews all reach a drawn plant. It is truthful, and it stays in production.

It is also provisional. It is smooth SVG, so it doesn't match the pixel-art game, and it has no body plan to grow from. The lab shows
it as **CURRENT PRODUCTION REFERENCE**, fed the same state as the four concepts, so the owner can see what each direction changes.

## 2. The shared architecture (production-worthy)

```
REAL STATE  (owned tiers, colony focus / local upgrade, establishment, condition, region + Terraform preview)
   │  plant-model.js      rules(BLOOM_DATA): legal tiers from content/traits.js + tempCap; normalize(): the VISUAL MODEL
   ▼                      (genome clamped to authored tiers + deterministic COMPONENT SELECTION + local + life + env)
VISUAL MODEL  ── same object for every concept (its `key` excludes the environment)
   │  plant-skeleton.js   stable anchors: root crown, primary root, lateral root anchors, stem path / nodes, leaf sockets,
   ▼                      apex, flower sockets, seed-head sockets, side-pod sockets, side-bud sockets
SKELETON
   │  pixel-parts.js      authored sprites (per concept) + authored leaf profiles
   │  concepts.js         per concept: native resolution, body-plan proportions, palette, line / shading, environment
   ▼  plant-renderer.js   indexed pixel buffer → shading → separation lines → outline → surface overlays → environment → RGBA
ORGANISM  (+ signatures: anatomy · env · full · key)
   │  mutation-fx.js      preview treatments and purchase animations from the current / target pixel difference
```

- The renderer knows no price, rule or mechanic. It reads only the visual model.
- **Deterministic.** There is no randomness anywhere; small irregularities come from a fixed hash. Node and both browsers render
  identical pixels (QA L27).
- **Classic scripts with no dependencies**, like the run page. They load over `file://` and in Node, and they can be dropped into
  `demos/demo-run.html` in 032B without touching the portable runtime.
- **Performance:** about 2 ms per organism (maximal build, in Node). Buffers are at most 112×136 px.

### Skeleton and anchors

The skeleton is computed from the model and the concept's proportions, in integer logical pixels.

- **Stem:** one stem point per pixel row.
- **Leaves:** sockets alternate, or come in opposite pairs, or follow the alien concept's irregular rhythm.
- **Reproductive parts:** they sit at the apex and on short side branches. Seed heads never take a flower's place.
- **Posture:** stress moves the sockets (lean, droop). It never adds or removes one.
- **FX anchors:** each trait's mutation grows from a named anchor: `rootCrown`, `stemMid`, `leafTop`, `apex` or `podSocket`.

## 3. Authored parts and pixel treatment

- **Sprites** are small indexed pixel drawings: buds, flowers, seed heads, drifting seeds, pods, floating pods, salt crystals, air-root
  tips, side buds, seed caches, nodules and companion sprouts. Each concept has its own set, so concepts are not palette swaps.
- **Leaf profiles** are authored width curves along the blade (ovate, elliptic, asymmetric lobed paddle, teardrop, thick, succulent,
  storage, strap). They are rasterized pixel by pixel at the socket's size and angle.
- The **renderer passes** make the result read as hand-placed pixels:
  - light from the upper left (three tones);
  - dark separation lines where a later part overlaps an earlier one;
  - a concept outline: selective (A), ink (B, C, D).
  Roots are left un-outlined in A, C and D, so they read as light lines in the soil.
- **Logical resolutions** (shown with nearest-neighbour scaling):

| Concept | Native | Alternatives in the lab | In a room box (measured in production) |
|---|---|---|---|
| A | 80×96 | 96×112, 112×136 | 1024: 102×118 @2× · 1280: 86×99 @3× · 1440: 96×111 @3× · report: 74×85 @4× |
| B | 96×112 | 80×96, 112×136 | as A (re-laid-out per box, integer scale) |
| C | 88×104 | 80×96, 112×136 | as A |
| D | 80×96 | 96×112, 112×136 | as A |

  The production specimen boxes were measured in the real rooms and report. Room boxes are 205×237 px at 1024×768, 258×298 at
  1280×800 and 290×335 at 1440×900; the report box is 296×342. The skeleton scales with the box, so each concept is re-laid-out to
  fill the box at an integer scale and its pixels stay square. Detail was kept large enough to read at 2×.

## 4. The four concepts

| | Idea | Body plan | Treatment | Specimen box |
|---|---|---|---|---|
| **A · Botanical Pixel Specimen** | field-guide readability | upright, alternate ovate leaves, small basal rosette | selective outline, 3-tone shading, midribs | pale sky, sun, layered loam |
| **B · Field-Journal Cutaway** | above + below ground at once | opposite leaf **pairs**, shorter shoot, deep extensive roots (outlined) | ink line, flat wash, pinnate veins | paper grid, ruled strata, ink frame with ruler ticks |
| **C · Strange Alien Herbarium** | discovering a weird organism | asymmetric curling stem, node bulbs, irregular leaf rhythm, lobed paddles, crozier bud | indigo line, teal / violet / coral | dusk sky, stars, ringed planet, mineral veins |
| **D · Organic Hybrid** | friendly + a little strange (a production candidate) | thick stem, fewer **big** teardrop leaves, broad basal pair, curled top leaves | warm dark line, saturated friendly greens | bright sky, sun rays, rich soil |

QA L5 checks that they really differ: the base silhouettes overlap less than 75 %, and the profiles, sprite sets, line styles and
environments are all distinct.

## 5. Trait → visible component mapping (real ids, real legal tiers)

Real tier rules come from `content/traits.js` and `config.scales.tempCap`:

- Cold and Heat share one temperature pool: each is 0–3, and Cold + Heat ≤ 3.
- Drought and Flood are one water arm. The engine sets **no cap** (the price rises), so the art authors T1–T3 and holds T3 beyond that.
  The lab never offers an un-authored tier.
- Salt 1, Radiation 1, Seed Output 2, Early Maturity 1, Waterborne Seeds 1.

| Trait | Layer | T1 | T2 | T3 |
|---|---|---|---|---|
| **cold** | structural + surface | silvery insulating fringe on the upper leaf margin + sparse hairs | **compact** architecture (shorter, stouter, shorter leaves) + dense 2-px hairs + stem hairs | **cushion**: clustered low leaves, reinforced stem, both margins frosted, woolly collars at nodes and bud |
| **heat** | surface + leaf form | wax sheen streaks on the leaves, waxy stem edge | whole cuticle **glaucous** (reflective blue-grey), leaves narrower and steeper | leaves **edge-on** to the sun, narrowest, bright reflective tips |
| **drought** | structural leaves + roots | **thick** leaves | **succulent** leaves with water-storage tissue + **deep taproot** | **storage** paddles + swollen storage stem + **tuber** |
| **flood** | structural roots + leaves | **strap** leaves + 2 air roots (pneumatophores) above the soil + air channels in the stem | **ribbon** leaves, 4 taller air roots, denser air channels | **wetland** architecture: emergent basal blades, stilt / prop roots, 6 air roots |
| **salt** | surface / detail | outlined salt crystals at leaf tips (alternate leaves) + a toothed, toughened margin | — | — |
| **rad** | surface / pigment | protective red-violet pigment on leaves and stem + a darker anthocyanin blotch at each leaf base | — | — |
| **seedOut** | reproductive | one developed seed head (seed clock / spore cluster) | a larger head + a second head + drifting seeds | — |
| **earlyMat** | reproductive (flower) | open flowers at the apex and a side branch, **even on a young colony** | — | — |
| **waterSeeds** | reproductive (pods) | buoyant pods on the stem + one pod floating at the soil line | — | — |

- **Cold + Heat together** make one organism. Cold owns the architecture and the hairs; Heat owns the cuticle and the leaf narrowing
  and orientation. A Cold 2 + Heat 1 plant is compact, haired and waxy, with one stem (QA L11).
- **Drought / Flood** are exclusive in play. The lab can force an impossible both-arms build for QA: it renders without error, is
  flagged illegal in the summary, and the larger arm leads the leaves.
- **Multi-tier progression is authored.** Every step changes a named component in the model, not only a size (QA L10).
- **Terraform** is not a plant trait. It never touches anatomy (§7).

## 6. Local vs global

The **genome** (owned traits) is the organism's anatomy. **Local** development is THIS colony's presentation. It is drawn as the
colony around the plant, or as density, never as a new genome part. All 16 focus × upgrade variants normalize to the identical genome
(QA L20).

| Local state | Presentation |
|---|---|
| Balanced | neutral baseline |
| Roots focus | denser, stronger root system (two more laterals, thicker upper laterals, branchlets) |
| Leaves focus | denser canopy (two more leaves, slightly larger) |
| Seeds focus | more prominent reproductive structures (larger bud / flower) + side buds + a few seeds in the topsoil |
| Root Network | a fine network running out through the soil to neighbouring colonies, with nodules |
| Leaf Canopy | denser, larger leaves + two small canopy companions (the same species) at the box edges |
| Seed Reserve | a seed bank in the topsoil + a seed cache beside the crown |

## 7. Life stage, stress and Terraform

- **Establishment** sets the stage:
  - young colony (under 55 %): seedling, then young;
  - established (55–85 %);
  - mature (85 % and up).
  It changes size and how much has grown, never what is owned. Without Early Maturity, a young colony has no open flower or seed
  head yet.
- **Condition** changes posture and colour only; the genome is identical (QA L21).
  - **thriving:** as authored;
  - **strained:** droop (leaves lower, apex leans), drier yellowed colours, scorched tips on alternate leaves;
  - **unviable:** a dithered grey ghost of the same anatomy.
- **Terraform environment preview** uses the real Warm / Cool the Sky (±6 °C) and Humidify / Dry the Sky (±8 moisture) deltas. They
  change only the specimen box:
  - sky tone and weather: clouds and rain when wet, haze when hot and dry, snow specks when cold;
  - soil colour by moisture.

  The plant's anatomy signature never changes (QA L22). Region presets (temperate, tundra, desert, wetland, salt flat) set the base
  climate.

## 8. The specimen box ("mutation box")

Every concept is drawn inside its own living specimen box: sky above, a soil cutaway below, and the plant rooted across the line.
The box reacts to the region and to Terraform previews. It is the concept's environment, not a chart.

## 9. Preview treatments

Both treatments compare the current and target renders of the same concept. The organism itself shows the proposal, and no badge is
needed.

- **ghost:** the current plant, with the proposed pixels solid but pale. Pixels that would go are thinned to a dither. Concept A / B
  default.
- **glow:** the mutated region is swapped in and traced with a pulsing outline (gold; red ink in B; pale green in C). Concept C / D
  default.
- **flip:** alternates current and proposed every 700 ms, a bolder read for a projector.

With reduced motion, the glow holds still and the flip shows the proposal.

## 10. Purchase / mutation FX

These are visual only and silent. Each animation is about 600–760 ms and ends on **exactly** the target pixels (QA L25).

- **grow (A):** new pixels grow outward from the mutation's attachment point, with a bright leading edge.
- **pulse (B):** a light pulse travels up the stem or root from the crown to the attachment point, then the growth.
- **dissolve (C):** the old part dissolves and the new one condenses in an ordered dither.
- **bloom (D):** growth, plus a few cells or pollen lifting from the attachment point and a brief brightening of the specimen box.

With **reduced motion**, a purchase is a ~160 ms two-step swap with no movement, ending on the same target (QA L26).

## 11. Production integration questions (for 032B, after the owner's choice)

1. **Which concept.** The renderer, model and skeleton are shared; integration swaps `BLOOM.plantSpecimen.mount/render` for a canvas
   mount over the same state the rooms already pass (traits, preview, colony, focus, local, condition).
2. **Integer scale vs fill.** The room boxes resize with the viewport. The lab re-lays the organism out per box at an integer scale
   (square pixels, a few px of margin). The alternative is filling the box at a fractional scale.
3. **Anchors for the room tendrils.** The production rooms point organic tendrils at specimen parts (`anchorPoint`). The skeleton
   already has named anchors; the part → anchor map needs agreeing.
4. **Highlight.** The rooms dim all but one part on hover. The pixel buffer records the part of every pixel, so a highlight pass is
   straightforward.
5. **Report specimen:** the same renderer at the report box size.
6. **Visual QA.** `plant-rooms-check` / `run-ui-convergence` assert the SVG specimen today and will need their specimen checks moved
   to the new mount.

## 12. OWNER REVIEW

Please open the lab: Single view, then **C** for Compare, then **Room size**. Cycle presets with **P** and try **Purchase mutation**.

1. **Which overall concept?** A Botanical · B Field-Journal · C Alien · D Hybrid (or a mix, e.g. D's body with B's cutaway).
2. **Which base silhouette?** Alternate (A), opposite pairs (B), asymmetric curl (C), chunky basal (D).
3. **How strange should the organism become?** As grounded as A / B, as strange as C, or in between (D)?
4. **Which preview treatment?** ghost · glow · flip.
5. **Which mutation / purchase FX?** grow · pulse · dissolve · bloom.
6. **Any trait that is too subtle or too loud?** Candidates to look at:
   - Cold T1's fringe;
   - Salt's crystals;
   - Radiation's pigment, which is strong by design;
   - Seed Output T1's head size;
   - the Flood T1 → T2 step.
