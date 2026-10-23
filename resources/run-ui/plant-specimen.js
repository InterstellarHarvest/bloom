// BLOOM — production plant specimen (BLOOM-032C: the approved ORGANIC HYBRID sprite organism; the provisional 029C SVG is retired).
// docs/PRODUCTION_PLANT_INTEGRATION_v1.md · docs/PLANT_SPRITE_PIPELINE_v1.md · docs/PRODUCTION_PLANT_ROOMS_v1.md §8.
//
// The plant Region Inspect / Adapt / Spread (and Guided Training, which uses those rooms) and the Bloom / Extinction report show. The
// PUBLIC API is the 029C one, unchanged — the rooms and the report call it exactly as before:
//
//   const sp = BLOOM.plantSpecimen.mount(host, { reducedMotion })
//   sp.render(state)                 // state: { traits {id → tier}, preview {id, tier} | null, colony {living, establishment, word},
//                                    //          focus, local, condition "ok" | "warn" | "bad", viable, names {id → trait name} }
//   sp.highlight(part | null)        // light one logical part (pigment · leafShape · stem · roots · seedHead · flowers · pods), dim the rest
//   sp.anchorPoint(part)             // → { x, y } in CLIENT px on the visible anatomy (the organic tendrils start here); null before the first render
//   sp.anchors()                     // → every anchor, top → bottom by part
//   sp.signature()                   // a hash of the displayed pixels (QA: a trait must change the picture)
//   sp.state · sp.parts · sp.el      // the last state · the seven logical parts · the specimen box
//   (additive) sp.canvas (sp.svg names the same image element) · sp.globalSignature() · sp.scale() · sp.lastFx {seq, style, frames,
//   endSig, targetSig, exact} · sp.animating() · sp.highlighted · sp.pack · BLOOM.plantSpecimen.mounted() (QA: the mounted specimens, read-only)
//   sp.dispose()   (BLOOM-033) its owner releases it (listener, observer, element, its mounted() entry) when the run is disposed
//   (BLOOM-040) sp.fill() → { ext, env, envRect, boxRect }: the environment layer that makes the scene fill the whole box (QA)
//
// (BLOOM-035B-5, docs/SPECIES_BODY_PLANS_v1.md §2.6) SPECIES — every call above is unchanged; a species is optional:
//   BLOOM.plantSpecimen.mount(host, { reducedMotion, species })   species = any { id, art: { bodyPlan: "<plan>@<n>", pack } } (content/species.js);
//                                    absent → Organic Hybrid exactly as before (pack "organic-hybrid", body plan "oh-stem@1")
//   sp.pack · sp.plan · sp.species   the pack, "<plan>@<n>" and the species id (null without one); the box carries data-pack / data-plan
//   BLOOM.plantSpecimen.draw(state, { highlight, species })       (Node-requirable) the displayed frame of any species
//   BLOOM.plantSpecimen.drawSpecies(species, { traits = {}, condition = "ok" })  → { w, h, rgba, signature, pack, plan } — the Species
//                                    Selection specimen: a fully grown plant (those traits; {} = unmutated) with a thriving, fully established
//                                    colony; deterministic; condition "ok" | "warn" | "bad" (or "thriving" | "strained")
//   An unknown pack, an unknown body plan, a pack whose declared body plan ≠ species.art.bodyPlan, or a plan without a loaded grammar THROWS
//   (a TypeError, at mount / draw) — never a silent fallback to Organic Hybrid.
//
// Behind it is the accepted BLOOM-032B pipeline, unchanged: BLOOM.plantVisual.model (normalize) → the species' body-plan grammar
// (BLOOM.plantVisual.grammars[plan]; Organic Hybrid's = BLOOM.plantVisual.components) → BLOOM.plantCompositor (the ONE canonical 84 × 98
// organism from the generated atlas BLOOM.plantArt, the species' pack — "organic-hybrid" by default) → BLOOM.plantFx
// (GHOST / OUTLINE preview, GROW purchase, reduced-motion swap). Mapping, truthfully, with no mechanic invented:
//   GLOBAL GENOME   state.traits (cold heat drought flood salt rad seedOut earlyMat waterSeeds) → the authored anatomy and treatments.
//                   Identical traits give identical organism pixels on every surface (globalSignature()).
//   LOCAL COLONY    living · establishment · growth focus · local upgrade · condition · viable → a small deterministic PRESENTATION layer
//                   around the assembled organism (no authored sprite edited, no fake mutation, the genome signature untouched):
//                   condition warn / bad (living)  → the accepted "strained" posture (droop one authored angle) + stress tint
//                   establishment                  → up to 8 young sprouts on the soil line beside the plant (colony density; the body
//                                                     plan's local.sprouts spots)
//                   focus roots · rootNetwork      → extra procedural lateral roots (+ root nodules for the root network)
//                   focus leaves · leafCanopy      → the canopy one shade fuller (same material ramp: never wax, never pigment)
//                   focus seeds · seedReserve      → a seed bank: seeds resting in the topsoil
//                   no colony here                 → the organism thinned to a dither over its backdrop (a ghost of what would grow)
//                   viable false                   → a restrained desaturation (would not survive / the run was lost)
//   ENVIRONMENT     (035C2) state.scene (BLOOM.plantEnvironment.region() for a run's region under its current / previewed sky, or showcase()
//                   for Species Selection): a deterministic environment scene behind the organism + a weather FX overlay canvas above it.
//                   Region-driven, never species-driven; Terraform changes only it, Adapt only the organism (sp.organismSignature() /
//                   sp.environmentSignature()). Without a scene: the pack's own static backdrop, exactly the pre-035C2 frame.
// A real purchase (the page's bloom:upgrade-purchase) GROWS the change into the visible specimen once; every other render (first paint,
// region switch, hover preview, tick, report) paints the exact frame directly. Pixels are shown on one canvas scaled by a whole number,
// nearest-neighbour, centred and padded in the host box. Classic script; boots over file://; Node can require it (draw / describe).
(function (root) {
  "use strict";
  const PARTS = ["seedHead", "pigment", "flowers", "leafShape", "pods", "stem", "roots"]; // every anchor, top → bottom
  const DEFAULT_ART = Object.freeze({ bodyPlan: "oh-stem@1", pack: "organic-hybrid" });     // no species = Organic Hybrid, exactly as before 035B
  const ADAPT = ["pigment", "leafShape", "stem", "roots"], SPREAD = ["seedHead", "flowers", "pods"]; // tendril order per room: anchors keep it
  const GAP = 10;  // minimum logical px between neighbouring anchors (20 client px at 2×, 30 at 3×): the tendrils and their label plates need clear space
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const hex = h => [1, 3, 5].map(k => parseInt(h.slice(k, k + 2), 16));
  const hash = (a, b = 0) => { let h = Math.imul((a + 1) * 0x9e3779b1 ^ (b + 7) * 0x85ebca6b, 0x27d4eb2f) >>> 0; h ^= h >>> 15; return (h >>> 0) / 4294967296; };
  const fnv = arr => { let h = 0x811c9dc5; for (let i = 0; i < arr.length; i++) { h ^= arr[i]; h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16).padStart(8, "0"); };
  const STRESS = [176, 150, 84], HALO = [255, 244, 200];
  const MOUNTED = [];   // every mounted specimen (QA reads them through BLOOM.plantSpecimen.mounted(); nothing writes through it)
  let fxSeq = 0;

  // ---------------------------------------------------------------- the accepted pipeline (resolved lazily: Node can require this file alone)
  /** A species' art { bodyPlan, pack } (absent species → Organic Hybrid). Malformed input throws. */
  function artOf(species) {
    if (species === undefined || species === null) return DEFAULT_ART;
    const a = species && species.art;
    if (!a || typeof a.pack !== "string" || typeof a.bodyPlan !== "string") throw new TypeError(`BLOOM.plantSpecimen: species ${species && species.id ? `"${species.id}" ` : ""}needs art { bodyPlan: "<plan>@<n>", pack }`);
    return a;
  }
  const pipes = new Map();
  function pipe(art) {
    art = art || DEFAULT_ART; const key = art.pack + "|" + art.bodyPlan; let P = pipes.get(key); if (P) return P;
    const B = root.BLOOM || {}, PV = B.plantVisual, ART = B.plantArt, PC = B.plantCompositor, FX = B.plantFx;
    if (!PV || !PV.model || !PV.components || !ART || !PC || !FX) throw new TypeError("BLOOM.plantSpecimen: needs the plant sprite runtime (generated plant-atlas.js, plant-visual-model.js, plant-components.js, plant-compositor.js, plant-fx.js) loaded before it");
    if (!ART.packs[art.pack]) throw new TypeError(`BLOOM.plantSpecimen: the generated atlas has no "${art.pack}" pack`);
    let plan; try { plan = PC.planOf(art.pack); } catch (e) { throw new TypeError(`BLOOM.plantSpecimen: ${e.message}`); }
    if (`${plan.id}@${plan.version}` !== art.bodyPlan) throw new TypeError(`BLOOM.plantSpecimen: pack "${art.pack}" is body plan "${plan.id}@${plan.version}", the species asks for "${art.bodyPlan}"`);
    const grammar = PV.grammars && PV.grammars[plan.grammar];
    if (!grammar || typeof grammar.select !== "function") throw new TypeError(`BLOOM.plantSpecimen: body plan "${art.bodyPlan}" needs its grammar "${plan.grammar}" (resources/plant-visual/plant-components.js) loaded`);
    const pack = ART.packs[art.pack], MAT = ART.materials, MID = Object.fromEntries(MAT.map((m, i) => [m, i + 1]));
    const ramp = m => pack.palette[m].map(hex), C = ART.contracts[plan.key || plan.id];
    // RULES: the accepted model reads the real trait data itself (the specimen reads no page global)
    P = { PV, ART, PC, FX, pack, packId: art.pack, plan, planRef: art.bodyPlan, grammar, MAT, MID, ramp, RULES: PV.model.rules(), W: C.canvas.w, H: C.canvas.h, soilY: plan.crown[1], crownX: plan.crown[0],
      local: plan.local, env: { sky: pack.environment.sky.map(hex), soil: pack.environment.soil.map(hex) } };
    pipes.set(key, P); return P;
  }
  const frames = new Map();
  /** The global organism: real traits + the accepted condition axis → the compositor's canonical frame (cached per pack). */
  function organism(p, traits, condition) {
    const k = JSON.stringify([p.packId, traits, condition]); let F = frames.get(k);
    if (!F) { if (frames.size > 96) frames.clear(); F = p.PC.render(p.grammar.select(p.PV.model.normalize({ traits, condition }, p.RULES)), p.packId); frames.set(k, F); }
    return F;
  }
  const genome = st => { const t = {}; for (const [id, v] of Object.entries((st && st.traits) || {})) if (v > 0) t[id] = v; return t; };
  /** Production state → the three frames' inputs: committed traits, previewed traits (or null), the accepted condition and the local colony. */
  function readState(st) {
    st = st || {}; const col = st.colony || {}, living = !!col.living, traits = genome(st);
    const pv = st.preview && st.preview.id ? Object.assign({}, traits, { [st.preview.id]: st.preview.tier }) : null;
    const cond = st.condition || "ok", strained = living && cond !== "ok";
    return { traits, preview: pv, condition: strained ? "strained" : "thriving",
      local: { living, establishment: living ? clamp(+col.establishment || 0, 0, 1) : 0, focus: st.focus || "balanced", up: st.local || null, viable: st.viable !== false, strained } };
  }

  // ---------------------------------------------------------------- the LOCAL presentation layer (around the organism; deterministic)
  function line(x0, y0, x1, y1, put) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let s = 0; s <= n; s++) put(Math.round(x0 + (x1 - x0) * s / n), Math.round(y0 + (y1 - y0) * s / n)); }
  /** Extra pixels the local colony adds: { i → [r, g, b], part }. Only on pixels the organism leaves empty; never changes the organism. */
  function localExtras(p, F, L) {
    const W = F.W, out = new Map(), free = (x, y) => x >= 0 && y >= 0 && x < W && y < F.H && !F.plant.m[y * W + x] && !out.has(y * W + x);
    const add = (x, y, c, part) => { if (free(x, y)) out.set(y * W + x, { c, part }); };
    if (!L.living) return out;
    const root_ = p.ramp("root"), leaf = p.ramp("leaf"), seed = p.ramp("seed"), prim = F.skeleton.primary, D = prim.length - 1;
    // establishment: young sprouts beside the plant on the soil line (colony density)
    const SPOTS = p.local.sprouts, n = Math.round(L.establishment * SPOTS.length);
    for (let k = 0; k < n; k++) { const x = p.crownX + SPOTS[k], tall = hash(k, 31) > 0.5 ? 3 : 2;
      add(x, p.soilY - 1, leaf[1], null); add(x, p.soilY - 2, leaf[2], null); if (tall > 2) add(x + (k % 2 ? 1 : -1), p.soilY - 3, leaf[3], null); }
    // roots focus / root network: extra procedural lateral roots off the real primary root
    const roots = (L.focus === "roots" ? 2 : 0) + (L.up === "rootNetwork" ? 4 : 0);
    for (let k = 0; k < roots; k++) { const q = prim[clamp(Math.round(D * (0.3 + 0.17 * (k % 4))), 0, D)], side = k % 2 ? 1 : -1, len = 9 + Math.round(hash(k, 41) * 6), drop = 3 + (k >> 1);
      line(q.x, q.y + 1, q.x + side * len, q.y + 1 + drop, (x, y) => add(x, y, root_[k < 2 ? 1 : 2], "roots"));
      if (L.up === "rootNetwork") add(q.x + side * (len - 2), q.y + drop + 2, root_[3], "roots"); }
    // seeds focus / seed reserve: a seed bank resting in the topsoil
    const seeds = (L.focus === "seeds" ? 4 : 0) + (L.up === "seedReserve" ? 7 : 0);
    const [b0, b1] = p.local.seedBank.y;
    for (let k = 0, tries = 0; k < seeds && tries < 64; tries++) { const x = 6 + Math.round(hash(tries, 51) * (W - 13)), y = p.soilY + b0 + Math.round(hash(tries, 52) * (b1 - b0));
      if (Math.abs(x - p.crownX) < 3 || !free(x, y) || !free(x + 1, y)) continue; add(x, y, seed[3], "seedHead"); add(x + 1, y, seed[1], "seedHead"); k++; }
    return out;
  }
  /** Apply the local layer to one organism picture (a compositor frame, a preview or an FX frame) of frame F. */
  function present(p, rgba, F, L, extras, part, bg) {
    // (035C2) bg = the backdrop the organism is shown over: the pack's own (F.env, the legacy frame, byte for byte) or a scene's environment.
    // An organism pixel is told apart from the backdrop exactly as before (against F.env); every backdrop pixel is then the bg's.
    const W = F.W, o = new Uint8ClampedArray(rgba), env = bg || F.env, m = F.plant.m;
    if (env !== F.env) for (let i = 0; i < m.length; i++) if (sameAsEnv(rgba, F.env, i)) { o[i * 4] = env[i * 4]; o[i * 4 + 1] = env[i * 4 + 1]; o[i * 4 + 2] = env[i * 4 + 2]; }
    const canopy = (L.up === "leafCanopy" ? 1 : 0) + (L.living && L.focus === "leaves" ? 1 : 0);
    if (canopy) { const R = {}; for (const mat of ["leaf", "waxLeaf", "pigLeaf"]) if (p.pack.palette[mat]) R[p.MID[mat]] = p.ramp(mat);
      const occ = rgbaKey(rgba, F);
      for (let i = 0; i < m.length; i++) { const v = m[i], r = v && R[v >> 2]; if (!r || !occ[i]) continue; const s = v & 3, lift = canopy >= 2 ? 1 : (s === 0 ? 1 : 0); if (!lift) continue;
        let c = r[Math.min(3, s + lift)]; if (L.strained) c = c.map((x, k) => Math.round(x + (STRESS[k] - x) * 0.3)); o[i * 4] = c[0]; o[i * 4 + 1] = c[1]; o[i * 4 + 2] = c[2]; } }
    for (const [i, e] of extras) { o[i * 4] = e.c[0]; o[i * 4 + 1] = e.c[1]; o[i * 4 + 2] = e.c[2]; }
    const plantPx = i => (m[i] && !sameAsEnv(rgba, F.env, i)) || extras.has(i);
    if (!L.living || !L.viable) for (let i = 0; i < m.length; i++) { if (!plantPx(i)) continue; const x = i % W, y = (i / W) | 0;
      if (!L.living && (x + y) % 2) { o[i * 4] = env[i * 4]; o[i * 4 + 1] = env[i * 4 + 1]; o[i * 4 + 2] = env[i * 4 + 2]; continue; }
      if (!L.viable) { const g = 0.3 * o[i * 4] + 0.59 * o[i * 4 + 1] + 0.11 * o[i * 4 + 2]; for (let k = 0; k < 3; k++) o[i * 4 + k] = Math.round(o[i * 4 + k] + (g + 8 - o[i * 4 + k]) * 0.55); } }
    if (part) { const on = part.mask; // highlight: the part keeps its colours and gets a 1-px halo; the rest of the plant dims toward the backdrop
      for (let i = 0; i < m.length; i++) { if (on[i]) continue; const x = i % W, y = (i / W) | 0;
        if (plantPx(i)) { for (let k = 0; k < 3; k++) o[i * 4 + k] = Math.round(o[i * 4 + k] + (env[i * 4 + k] - o[i * 4 + k]) * 0.58); continue; }
        if ((x > 0 && on[i - 1]) || (x < W - 1 && on[i + 1]) || (y > 0 && on[i - W]) || (i + W < m.length && on[i + W])) for (let k = 0; k < 3; k++) o[i * 4 + k] = HALO[k]; } }
    return o;
  }
  const sameAsEnv = (a, env, i) => a[i * 4] === env[i * 4] && a[i * 4 + 1] === env[i * 4 + 1] && a[i * 4 + 2] === env[i * 4 + 2];
  const rgbaKey = (rgba, F) => { const o = new Uint8Array(F.plant.m.length); for (let i = 0; i < o.length; i++) o[i] = F.plant.m[i] && !sameAsEnv(rgba, F.env, i) ? 1 : 0; return o; };

  // ---------------------------------------------------------------- logical parts on the real placements
  function partOf(pl) {
    const c = pl.component || "", s = pl.socket || "";
    if (pl.kind === "procedural" && pl.part) return [pl.part];   // (035B-5) a body plan @3 names each procedural axis's / stalk's part
    if (pl.kind === "procedural") return c === "roots" ? ["roots"] : c === "stem" ? ["stem"] : c === "branch" ? [s.startsWith("pod.") ? "pods" : s.startsWith("flower.") ? "flowers" : "seedHead"] : [];
    if (c.startsWith("root.")) return ["roots"];
    if (c.startsWith("body.")) return ["stem"];   // (035B-5) a sprite body (the Woolly Candle trunk)
    if (c.startsWith("leaf.")) return ["leafShape", "pigment"];
    if (c.startsWith("salt.")) return ["pigment"];
    if (c.startsWith("frost.")) return ["stem"];
    if (c === "flower" || c === "bud.axil") return ["flowers"];
    if (c === "bud") return ["seedHead", "flowers"];
    if (c.startsWith("seedHead.") || c === "seed.drift") return ["seedHead"];
    if (c === "pod") return ["pods"];
    return [];
  }
  /** part → { mask, px [i…] } over the organism frame(s) + the local extras. */
  function partMasks(Fs, extras) {
    const W = Fs[0].W, N = Fs[0].plant.m.length, out = {}; for (const q of PARTS) out[q] = { mask: new Uint8Array(N), px: [] };
    const mark = (q, i) => { const e = out[q]; if (!e.mask[i]) { e.mask[i] = 1; e.px.push(i); } };
    for (const F of Fs) { const parts = F.placements.map(partOf); for (let i = 0; i < N; i++) { const o = F.plant.owner[i]; if (o && F.plant.m[i]) for (const q of parts[o - 1]) mark(q, i); } }
    for (const [i, e] of extras) if (e.part) mark(e.part, i);
    void W; return out;
  }
  /** Anchors in LOGICAL canvas px, on visible pixels of each part, kept in the rooms' top → bottom tendril order. */
  function anchorsOf(p, F, masks) {
    const W = F.W, at = i => ({ x: i % W, y: (i / W) | 0 }), so = F.skeleton.sockets, A = {};
    const nearest = (px, tx, ty, minY = -1) => { let best = null, bd = Infinity; for (const i of px) { const q = at(i); if (q.y < minY) continue; const d = Math.hypot(q.x - tx, (q.y - ty) * 1.3); if (d < bd) { bd = d; best = q; } } return best; };
    const centre = px => { let x = 0, y = 0; for (const i of px) { const q = at(i); x += q.x; y += q.y; } return px.length ? { x: x / px.length, y: y / px.length } : null; };
    const sock = k => so[k] ? { x: so[k].x, y: so[k].y } : null;
    const placementsOf = pred => F.placements.filter(pred).sort((a, b) => a.y0 - b.y0);
    const leaves = placementsOf(q => q.kind === "sprite" && (q.component || "").startsWith("leaf."));
    const leafPx = q => masks.leafShape.px.filter(i => { const p = at(i); return p.x >= q.x0 && p.x < q.x0 + q.w && p.y >= q.y0 && p.y < q.y0 + q.h; });
    const any = [...new Set([].concat(...PARTS.map(q => masks[q].px)))];   // an absent part's anchor snaps to the nearest visible anatomy
    const pick = (part, t, minY) => (masks[part].px.length && nearest(masks[part].px, t.x, t.y, minY)) || nearest(any, t.x, t.y, minY) || t;
    const top = leaves[0], mid = leaves[Math.floor((leaves.length - 1) / 2)] || top, stemPath = F.skeleton.stem ? F.skeleton.stem.path : null;
    // (035B-5) a body plan @3 names its fallback sockets and its stem / roots targets (plan.anchors); Organic Hybrid keeps the accepted rule
    const Ah = p.plan.anchors || null, hint = (k, dflt) => Ah && Ah[k] !== undefined ? sock(Ah[k]) : sock(dflt), off = a => ({ x: p.crownX + a[0], y: p.soilY + a[1] });
    const want = {
      seedHead: (() => { const px = masks.seedHead.px; if (!px.length) return hint("seedHead", "apex"); let y = Infinity; for (const i of px) y = Math.min(y, at(i).y); const c = centre(px); return { x: c.x, y: y + 1 }; })(),
      flowers: centre(masks.flowers.px.filter(i => F.placements[F.plant.owner[i] - 1] && F.placements[F.plant.owner[i] - 1].component === "flower")) || centre(masks.flowers.px) || hint("flowers", "flower.1"),
      pods: centre(masks.pods.px.filter(i => (F.placements[F.plant.owner[i] - 1] || {}).component === "pod")) || hint("pods", "pod.0"),
      pigment: top ? centre(leafPx(top)) : Ah ? off([0, -4]) : sock("leaf.5"),
      leafShape: mid ? centre(leafPx(mid)) : Ah ? off([0, -2]) : sock("leaf.2"),
      stem: Ah ? off(Ah.stem.at) : (() => { const q = stemPath[Math.max(1, Math.round((stemPath.length - 1) * 0.25))]; return { x: q.x, y: q.y }; })(),
      roots: Ah ? off(Ah.roots.at) : { x: F.skeleton.primary[0].x, y: F.skeleton.primary[0].y + 14 },
    };
    for (const order of [SPREAD, ADAPT]) { let prev = -Infinity;
      for (const part of order) { const t = want[part] || { x: F.W / 2, y: F.H / 2 }, q = pick(part, t, prev + GAP); A[part] = { x: q.x, y: Math.max(q.y, prev + GAP) }; prev = A[part].y; }
      // (035C2) the Adapt cascade pushed its last anchor past the anatomy (onto no plant pixel — e.g. a low, closed rosette above a short
      // taproot): walk back up, each anchor on a DRAWN pixel of its own part (else any part) at least GAP above the next. Never runs when the
      // cascade already fits.
      // (Body plans @3 only: Organic Hybrid keeps the accepted rule byte for byte.)
      const last = order[order.length - 1], L = A[last];
      if (Ah && order === ADAPT && L && !F.plant.m[L.y * W + L.x]) { let limit = Infinity;
        for (let k = order.length - 1; k >= 0; k--) { const part = order[k], drawn = i => F.plant.m[i] && at(i).y <= limit, own = masks[part].px.filter(drawn), px = own.length ? own : any.filter(drawn), q = px.length ? nearest(px, A[part].x, A[part].y) : null;
          if (q && (k === order.length - 1 || A[part].y > limit || !F.plant.m[A[part].y * W + A[part].x])) A[part] = q; else if (A[part].y > limit) A[part] = { x: A[part].x, y: limit };
          limit = A[part].y - GAP; } } }
    return A;
  }

  // ---------------------------------------------------------------- draw: production state → the displayed frame (pure)
  /** (035C2) The scene's environment raster for this pipeline (a region / showcase scene from BLOOM.plantEnvironment), or null = the pack's backdrop. */
  function sceneOf(p, scene) {
    if (scene == null) return null;
    const PE = root.BLOOM && root.BLOOM.plantEnvironment;
    if (!PE) throw new TypeError("BLOOM.plantSpecimen: a scene needs resources/plant-visual/plant-environment.js loaded");
    if (!PE.isScene(scene)) throw new TypeError("BLOOM.plantSpecimen: scene must come from BLOOM.plantEnvironment.region() / showcase()");
    return { scene, bg: PE.paint(scene, p.W, p.H, p.soilY), sig: PE.signature(scene, p.W, p.H, p.soilY), fx: PE.fx(scene) };
  }
  const KEYS = new Map();   // a constant key backdrop per canvas size: the organism layer's own signature never depends on any environment
  const keyBg = (W, H) => { let k = KEYS.get(W + "x" + H); if (!k) { k = new Uint8ClampedArray(W * H * 4); for (let i = 3; i < k.length; i += 4) k[i] = 255; KEYS.set(W + "x" + H, k); } return k; };
  function draw(st, { highlight = null, species, scene } = {}) {
    const p = pipe(artOf(species)), S = readState(st), cur = organism(p, S.traits, S.condition), tgt = S.preview ? organism(p, S.preview, S.condition) : null, shown = tgt || cur;
    const extras = localExtras(p, shown, S.local), masks = partMasks(tgt ? [cur, tgt] : [cur], extras);
    const base = tgt ? p.FX.preview(cur, tgt) : cur.rgba, hl = highlight && masks[highlight] ? masks[highlight] : null;
    const E = sceneOf(p, scene !== undefined ? scene : (st && st.scene)), rgba = present(p, base, shown, S.local, extras, hl, E ? E.bg : null), anchors = anchorsOf(p, shown, masks);
    const global = organism(p, S.traits, "thriving"), organismSig = fnv(present(p, base, shown, S.local, extras, hl, keyBg(p.W, p.H)));
    return { W: p.W, H: p.H, rgba, anchors, sig: fnv(rgba), globalSig: global.sig.anatomy, organismSig, envSig: E ? E.sig : null, scene: E ? E.scene : null, fx: E ? E.fx : null, bg: E ? E.bg : shown.env,
      key: JSON.stringify([S, highlight, E ? E.sig : null]), pack: p.packId,
      ghost: !S.local.living, stressed: S.local.strained, viable: S.local.viable, previewing: !!tgt, frame: cur, target: tgt, local: S.local, extras };
  }
  /** (035B-5) The Species Selection specimen: a fully grown plant (traits; {} = unmutated) with a thriving, fully established colony. Pure. */
  const CONDITION = { ok: "ok", warn: "warn", bad: "bad", thriving: "ok", strained: "warn" };
  function drawSpecies(species, { traits = {}, condition = "ok", scene = null } = {}) {
    if (!species) throw new TypeError("BLOOM.plantSpecimen.drawSpecies: a species { id, art: { bodyPlan, pack } } is required");
    if (!CONDITION[condition]) throw new TypeError(`BLOOM.plantSpecimen.drawSpecies: condition "${condition}" (ok | warn | bad)`);
    const p = pipe(artOf(species)), D = draw({ traits, names: {}, preview: null, colony: { living: true, establishment: 1, word: "" }, focus: "balanced", local: null, condition: CONDITION[condition], viable: true }, { species, scene });
    return { w: D.W, h: D.H, rgba: D.rgba, signature: D.sig, globalSignature: D.globalSig, organismSignature: D.organismSig, environmentSignature: D.envSig, pack: p.packId, plan: p.planRef };
  }

  function describe(st) {
    const names = st.names || {}, owned = Object.keys(st.traits || {}).filter(id => st.traits[id] > 0).map(id => (names[id] || id) + (st.traits[id] > 1 ? " ×" + st.traits[id] : ""));
    const col = st.colony || {};
    return `Your plant${col.living ? "" : " (no colony here yet)"}${owned.length ? ": " + owned.join(", ") : ": no adaptations yet"}${st.preview ? `. Previewing ${names[st.preview.id] || st.preview.id}` : ""}${col.living && st.condition !== "ok" ? ". Stressed here" : ""}${st.viable === false ? ". Would not survive" : ""}.`;
  }

  function mount(host, { reducedMotion = () => false, species } = {}) {
    const art = artOf(species), p = pipe(art);   // (035B-5) resolved (and refused) before any DOM is touched
    const life = new AbortController();   // (BLOOM-033) one run of many in the same document: dispose() releases the global listener
    const box = document.createElement("div"); box.className = "ps"; box.dataset.pack = p.packId; box.dataset.plan = p.planRef; host.appendChild(box);
    const cv = document.createElement("canvas"); cv.className = "ps-canvas"; cv.width = p.W; cv.height = p.H; cv.setAttribute("role", "img"); cv.setAttribute("aria-label", "Your plant");
    const tag = document.createElement("span"); tag.className = "ps-tag"; tag.setAttribute("aria-hidden", "true"); tag.textContent = "PREVIEW";
    // (035C2) the weather FX overlay: its own canvas above the specimen (never part of the organism or the static environment pixels)
    const fxc = document.createElement("canvas"); fxc.className = "ps-fx"; fxc.setAttribute("aria-hidden", "true");
    // (BLOOM-040) the ENVIRONMENT FILL: one more canvas BEHIND the organism, the same scene painted over the whole box (plantEnvironment.paint's
    // margin extension; its window under the organism is byte-identical to the organism frame's own backdrop, so the two read as one picture).
    // The sky, horizon, ground and soil reach every edge of the box — never a flat padded band — and the weather overlay covers the box too.
    // Both layers are presentation only: the organism canvas, its pixels and every signature are exactly as before. Their inline styles also
    // shield them from a page-wide canvas rule (the developer harness paints every canvas dark).
    const envc = document.createElement("canvas"); envc.className = "ps-env"; envc.setAttribute("aria-hidden", "true"); envc.hidden = true;
    const LAYER = { position: "absolute", pointerEvents: "none", imageRendering: "pixelated", background: "transparent", border: "0", borderRadius: "0", maxWidth: "none", maxHeight: "none", margin: "0", boxSizing: "content-box" };
    Object.assign(fxc.style, LAYER); Object.assign(envc.style, LAYER);
    box.append(envc, cv, fxc, tag);
    const PE = root.BLOOM && root.BLOOM.plantEnvironment, fxl = PE && typeof fxc.getContext === "function" ? PE.mountFx(fxc, { reducedMotion }) : null; let fxKey = "", envKey = "";
    const envCtx = typeof envc.getContext === "function" ? envc.getContext("2d") : null;
    let ext = { left: 0, top: 0, right: 0, bottom: 0 };   // the box's margins around the frame, in whole logical px (BLOOM-040)
    const ctx = cv.getContext("2d");
    let last = null, D = null, hl = null, k = 0, fit = "", anim = null, armed = false, committed = null, sig = "";
    const fx = { last: null };
    let shown = null;   // the last painted frame: repainted if the browser drops and restores the canvas's 2D context
    const paint = rgba => { shown = rgba; ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba), p.W, p.H), 0, 0); };
    cv.addEventListener("contextrestored", () => { if (shown) paint(shown); });
    // whole-number nearest-neighbour scale, centred; the padding continues the pack's own sky / soil
    function layout() {
      const w = box.clientWidth, h = box.clientHeight; if (!w || !h) return k;
      const s = Math.max(1, Math.floor(Math.min(w / p.W, h / p.H))), key = `${w}x${h}`; if (key === fit && s === k) return k; fit = key; k = s;
      const cw = p.W * s, ch = p.H * s, left = Math.floor((w - cw) / 2), top = Math.floor((h - ch) / 2), soil = top + p.soilY * s, rgb = c => `rgb(${c.join(",")})`;
      Object.assign(cv.style, { width: cw + "px", height: ch + "px", left: left + "px", top: top + "px" });
      // (BLOOM-040) whole logical margins on every side (the last one may run a fraction past the box, clipped by its overflow), aligned to the
      // organism's own pixel grid: the environment and weather layers cover the whole box
      // (+1 px: clientWidth / clientHeight are rounded, a box may be a fraction of a pixel larger; the overflow clips the excess)
      ext = { left: Math.ceil(left / s), top: Math.ceil(top / s), right: Math.ceil((w + 1 - left - cw) / s), bottom: Math.ceil((h + 1 - top - ch) / s) };
      const EW = p.W + ext.left + ext.right, EH = p.H + ext.top + ext.bottom, at = { width: EW * s + "px", height: EH * s + "px", left: left - ext.left * s + "px", top: top - ext.top * s + "px" };
      Object.assign(envc.style, at); Object.assign(fxc.style, at);
      padBg(top, soil); fxKey = ""; envKey = "";
      return k;
    }
    // the padding around the canvas continues the backdrop: the scene's (035C2) or the pack's own sky / soil
    let padTop = 0, padSoil = 0;
    function padBg(top, soil) { if (top !== undefined) { padTop = top; padSoil = soil; } if (!fit) return;   // (a box never laid out keeps no background, as before)
      const rgb = c => `rgb(${c.join(",")})`, B = D && D.scene ? D.bg : null, px = (x, y) => { const i = (y * p.W + x) * 4; return [B[i], B[i + 1], B[i + 2]]; };
      if (!B) { const c = [p.env.sky[0], p.env.sky[1], p.env.soil[0], p.env.soil[1]];
        box.style.background = `linear-gradient(to bottom, ${rgb(c[0])} 0, ${rgb(c[0])} ${padTop}px, ${rgb(c[1])} ${padSoil}px, ${rgb(c[2])} ${padSoil}px, ${rgb(c[3])} 100%)`; return; }
      // a scene: the sky colour is sampled ABOVE its skyline (the horizon would tint the margins), the soil below the ground line
      const hy = Math.max(1, p.soilY - 24), s = (padSoil - padTop) / p.soilY, c = [px(0, 0), px(0, hy), px(0, p.soilY + 2), px(0, p.H - 1)];
      box.style.background = `linear-gradient(to bottom, ${rgb(c[0])} 0, ${rgb(c[0])} ${padTop}px, ${rgb(c[1])} ${Math.round(padTop + hy * s)}px, ${rgb(c[1])} ${padSoil}px, ${rgb(c[2])} ${padSoil}px, ${rgb(c[3])} 100%)`; }
    function syncFx() { if (!fxl) return; const key = `${D && D.envSig}|${k}|${ext.left},${ext.top},${ext.right},${ext.bottom}`; if (key === fxKey) return; fxKey = key;
      fxl.set(D && D.scene ? D.fx : null, { W: p.W + ext.left + ext.right, H: p.H + ext.top + ext.bottom, soilY: ext.top + p.soilY, scale: Math.max(1, k), fw: p.W }); }
    // (BLOOM-040) the environment fill: the scene's raster over the whole box, repainted only when the scene or the box's margins change
    function syncEnv() { if (!envCtx) return; const sc = D && D.scene; if (!sc || !fit) { envc.hidden = true; envKey = ""; return; }
      const key = `${PE.keyOf(sc)}|${ext.left},${ext.top},${ext.right},${ext.bottom}`; if (key === envKey) return; envKey = key;
      const EW = p.W + ext.left + ext.right, EH = p.H + ext.top + ext.bottom; if (envc.width !== EW) envc.width = EW; if (envc.height !== EH) envc.height = EH;
      envCtx.putImageData(new ImageData(PE.paint(sc, p.W, p.H, p.soilY, ext), EW, EH), 0, 0); envc.hidden = false; }
    const ro = typeof ResizeObserver === "function" ? new ResizeObserver(() => { layout(); syncEnv(); syncFx(); }) : null; if (ro) ro.observe(box);
    const visible = () => box.isConnected && box.getClientRects().length > 0 && !box.closest("[hidden]");
    // a REAL purchase only (the page's own event); consumed by the very next render of a visible specimen
    document.addEventListener("bloom:upgrade-purchase", () => { if (visible()) armed = true; }, { signal: life.signal });
    function show() { if (!D) return; sig = D.sig; if (!anim) paint(D.rgba); padBg(); syncEnv(); syncFx(); }
    function render(st) {
      last = st; const S = readState(st); layout();
      D = draw(st, { highlight: hl, species });
      box.classList.toggle("previewing", D.previewing); box.classList.toggle("ghost", D.ghost); box.classList.toggle("stressed", D.stressed); box.classList.toggle("unviable", !D.viable);
      cv.setAttribute("aria-label", describe(st));
      const now = { core: organism(p, S.traits, S.condition), local: S.local, key: JSON.stringify([S.traits, S.condition]) }, from = committed;
      committed = now;
      if (armed) { armed = false;
        if (from && from.key !== now.key && !anim) {   // the committed organism changed because of a real purchase: GROW it in
          const extras = localExtras(p, now.core, now.local), bg = D.scene ? D.bg : null, mk = rgba => present(p, rgba, now.core, now.local, extras, null, bg), targetSig = fnv(mk(now.core.rgba)); let endSig = null;
          anim = p.FX.purchase(from.core, now.core, { style: "grow", reducedMotion: !!reducedMotion(), onFrame: rgba => { const o = mk(rgba); endSig = fnv(o); paint(o); } })
            .then(r => { fx.last = Object.assign({ seq: ++fxSeq, endSig, targetSig, exact: endSig === targetSig }, r); anim = null; show(); return fx.last; });
          fx.last = { pending: true }; sig = D.sig; return; } }
      show();
    }
    function highlight(part) { const q = part ? [].concat(part)[0] : null; if (q === hl) return; hl = PARTS.includes(q) ? q : null; if (last) { D = draw(last, { highlight: hl, species }); show(); } }
    function anchorPoint(part) {
      if (!D || !D.anchors[part]) return null; layout(); const r = cv.getBoundingClientRect(); if (!r.width) return null;
      const a = D.anchors[part], s = r.width / p.W; return { x: r.left + (a.x + 0.5) * s, y: r.top + (a.y + 0.5) * s };
    }
    const inst = Object.freeze({ el: box, canvas: cv, svg: cv, render, highlight, anchorPoint,
      anchors: () => PARTS.map(q => ({ part: q, view: D ? D.anchors[q] : null, client: anchorPoint(q) })),
      signature: () => sig, globalSignature: () => D ? D.globalSig : null,
      // (035C2) the organism layer and the environment scene, each with its own signature (QA: Terraform moves only the second, Adapt only the first)
      organismSignature: () => D ? D.organismSig : null, environmentSignature: () => D ? D.envSig : null, get scene() { return D ? D.scene : null; }, fxState: () => fxl ? fxl.state() : null, scale: () => layout(), animating: () => !!anim,
      // (BLOOM-040) the environment fill's geometry (QA): the margins in logical px and whether the box is covered
      fill: () => ({ ext: { ...ext }, env: !envc.hidden, envRect: envc.hidden ? null : envc.getBoundingClientRect().toJSON(), boxRect: box.getBoundingClientRect().toJSON() }),
      get state() { return last; }, get lastFx() { return fx.last; }, get highlighted() { return hl; }, parts: PARTS.slice(), pack: p.packId, plan: p.planRef,
      species: species ? (species.id || null) : null, partLabels: Object.freeze(Object.assign({}, p.plan.partLabels || {})),
      // (BLOOM-033) the owner (a room, the report) disposes its specimen with itself: listener, observer, element, and its MOUNTED entry
      dispose() { life.abort(); if (ro) ro.disconnect(); if (fxl) fxl.dispose(); box.remove(); const i = MOUNTED.indexOf(inst); if (i >= 0) MOUNTED.splice(i, 1); } });
    MOUNTED.push(inst); return inst;
  }

  // PACK (pre-035B name) = the default pack, used when no species is given; DEFAULT_ART = the default species art
  root.BLOOM = Object.assign(root.BLOOM || {}, { plantSpecimen: Object.freeze({ mount, draw, drawSpecies, describe, mounted: () => MOUNTED.slice(), PARTS: Object.freeze(PARTS.slice()),
    PACK: DEFAULT_ART.pack, DEFAULT_ART, version: 1, renderer: "organic-hybrid-sprite" }) });
})(typeof window !== "undefined" ? window : globalThis);
