// BLOOM — species system invariants (BLOOM-035B). Plain Node, no browser. docs/SPECIES_SYSTEM_v1.md §0.1 / §10.1.
//
//   node tools/species-check.js
//
// Numbered after the PMO's required invariants (Q1 … Q16; one check may prove several), plus the 035B guards around them:
//   Q1  schema validity (and the validator refuses what v1 forbids)        Q9   native profile / state identical across player species
//   Q2  unique stable ids and versions                                    Q10  specialist simulations are deterministic
//   Q3  physiologyVersion stability (numbers pinned per revision)         Q11  species classification fixtures
//   Q4  Organic Hybrid physiology == config.referencePlant (numerically)  Q12  species playability verdict deterministic
//   Q5  referencePlant and Organic Hybrid are semantically separate       Q13  an unknown species throws
//   Q6  no-species run == Organic Hybrid run == the accepted baseline     Q14  Training always resolves Organic Hybrid
//   Q7  one (archetype, seed) = the same physical planet for all species  Q15  Play Again preserves planet + species
//   Q8  generateFromArchetype refuses a species                           Q16  no Challenge / referencePlant coupling
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm"), crypto = require("crypto"), { execSync } = require("child_process");
const ROOT = path.resolve(__dirname, "..");
const BASE_SHA = "5ff53d3"; // BLOOM-035B's starting point (= production main after the 035A closeout): the accepted pre-species engine
const ENGINE = ["content/config.js", "content/traits.js", "planets/first_bloom.js", "planets/training_grounds.js", "content/archetypes.js", "content/scenarios.js",
  "content/play.js", "content/training.js", "resources/bloom-sim.js", "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js",
  "resources/bloom-archetype.js", "resources/bloom-scenario.js", "resources/bloom-play.js"];
const SPECIES_FILES = ["content/species.js", "resources/bloom-species.js"];
const read = f => fs.readFileSync(path.join(ROOT, f), "utf8");
const git = cmd => execSync(`git ${cmd}`, { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28 });
// a fresh, isolated engine (its own globals) from a source reader: the current tree, or the accepted base
const ctxOf = (src, files) => { const c = vm.createContext({ console, performance }); c.globalThis = c; for (const f of files) vm.runInContext(src(f), c, { filename: f }); return c; };
const NOW = ctxOf(read, [...ENGINE.slice(0, 3), SPECIES_FILES[0], ...ENGINE.slice(3, 9), SPECIES_FILES[1], ...ENGINE.slice(9)]);
const { BLOOM, BLOOM_DATA: D } = NOW, S = BLOOM.species, C = D.config;
const J = JSON.stringify, sha = x => crypto.createHash("sha256").update(typeof x === "string" ? x : J(x)).digest("hex").slice(0, 16);

let fails = 0, passes = 0;
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (ok) passes++; else fails++; };
const throws = f => { try { f(); return null; } catch (e) { return e; } };

// The PMO-locked 035B v1 table (docs/SPECIES_SYSTEM_v1.md §0.1) — the physiology pinned per (id, physiologyVersion). A change to a
// species' numbers without a physiologyVersion bump (and a new row here) fails Q3; the world-generation reference is pinned apart.
const LOCKED = {
  organic_hybrid: { physiologyVersion: 1, physiology: { tempFloor: -6, tempCeil: 24, waterPos: 50, waterTol: 18, saltTol: 15, radTol: 30, toxTol: 25 } },
  cinder_rosette: { physiologyVersion: 1, physiology: { tempFloor: 2, tempCeil: 34, waterPos: 34, waterTol: 16, saltTol: 15, radTol: 35, toxTol: 25 } },
  woolly_candle: { physiologyVersion: 1, physiology: { tempFloor: -14, tempCeil: 16, waterPos: 46, waterTol: 18, saltTol: 15, radTol: 50, toxTol: 25 } },
  reed_spire: { physiologyVersion: 1, physiology: { tempFloor: -6, tempCeil: 24, waterPos: 62, waterTol: 20, saltTol: 60, radTol: 30, toxTol: 25 } },
};
const IDS = ["organic_hybrid", "cinder_rosette", "woolly_candle", "reed_spire"];
// WORLD_GEN_VERSION 1's reference physiology (= the pre-035B genomeBase). Changing it is a WORLD_GEN_VERSION decision, never a retune.
const REFERENCE_V1 = { tempFloor: -6, tempCeil: 24, waterPos: 50, waterTol: 18, saltTol: 15, radTol: 30, toxTol: 25 };

// a deterministic fixed-plan run: buys the first affordable trait every 20 ticks, a colony focus and local upgrades; fingerprints
// the whole state every 250 ticks (single-app-flow S4's plan, extended with the competition layer)
function playFingerprint(ctx, planet, { scenario = null, species = null, seed = 7, ticks = 3000 } = {}) {
  const B = ctx.BLOOM, DD = ctx.BLOOM_DATA, opts = { rng: B.gen.mulberry32(seed) };
  if (scenario) opts.scenario = scenario; if (species) opts.species = species;
  const sim = B.createSim(planet, DD.config, DD.traits, opts), marks = [];
  for (let k = 1; k <= ticks && !sim.won && !sim.lost; k++) {
    sim.tick();
    if (k % 20 === 0) for (const t of DD.traits) { if (sim.canBuy(t) && sim.biomass >= sim.price(t)) { sim.buy(t.id); break; } }
    if (k === 150) sim.setColonyFocus(sim.map.ORIGIN, "leaves");
    if (k % 97 === 0) for (let i = 0; i < sim.map.SC; i++) if (!sim.getSpecialization(i) && !sim.specBlock(i, "seedReserve")) { sim.buySpecialization(i, "seedReserve"); break; }
    if (k % 250 === 0 || sim.won || sim.lost) marks.push(sha({ k, b: sim.biomass, s: [...sim.state], d: [...sim.dens], v: [...sim.vigor], g: sim.genome, sky: sim.sky, tf: sim.tf,
      c: [...sim.colonies.focus, ...sim.colonies.spec], cov: sim.coverage(), n: sim.competition.enabled ? [...sim.competition.native] : null }));
  }
  return { fp: sha(marks), ticks: sim.ticks, won: sim.won, lost: sim.lost };
}
const scen = (ctx, id) => ctx.BLOOM.pressure.resolveScenario(ctx.BLOOM_DATA.scenarios, id);
const arche = (ctx, id) => ctx.BLOOM_DATA.archetypes.find(a => a.id === id);

// ---------------------------------------------------------------------------------------------------- Q1 · schema
{ const errs = S.check(D.species, C), list = S.list();
  check(!errs.length && list.length === 4 && list.every(sp => Object.isFrozen(sp) && Object.isFrozen(sp.physiology) && Object.isFrozen(sp.presentation.strengths)),
    "Q1 · schema: content/species.js passes BLOOM.species.check (exact keys, physiology = the reference's seven keys, edges / startingGenome null, art { bodyPlan, pack }, 1–3 strengths, ≥ 1 weakness tied to real categories, no ranking copy) and resolves to deeply frozen objects",
    errs.join("; ") || list.map(s => `${s.id}: ${s.art.bodyPlan} / ${s.art.pack}`).join(" · ")); }
{ const base = JSON.parse(J(D.species[1])), bad = [
    ["a growth modifier", { ...base, growth: { spread: 1.2 } }], ["species Adapt scales", { ...base, scales: { degPerTempPoint: 15 } }],
    ["per-species softness", { ...base, edges: { tempSoft: 7 } }], ["an Expedition startingGenome", { ...base, startingGenome: { cold: 1 } }],
    ["a missing physiology key", { ...base, physiology: { ...base.physiology, toxTol: undefined } }], ["an extra physiology key", { ...base, physiology: { ...base.physiology, phTol: 2 } }],
    ["an inverted temperature window", { ...base, physiology: { ...base.physiology, tempFloor: 40 } }], ["a water window outside 0…100", { ...base, physiology: { ...base.physiology, waterPos: 95 } }],
    ["no weakness", { ...base, presentation: { ...base.presentation, weaknesses: [] } }], ["a strength in no category", { ...base, presentation: { ...base.presentation, strengths: [{ category: "Luck", text: "x" }] } }],
    ["Easy copy", { ...base, presentation: { ...base.presentation, note: "Easy mode" } }], ["a star rating", { ...base, short: "Rated 4 stars" }],
    ["a latent weakness", { ...base, presentation: { ...base.presentation, weaknesses: [{ category: "Water", text: "x", latent: true }] } }],
    ["a bad id", { ...base, id: "Cinder Rosette" }], ["a status outside released / candidate", { ...base, status: "beta" }]];
  const missed = bad.filter(([, d]) => !S.checkSpecies(d, C).length).map(([w]) => w);
  const dup = S.check([D.species[0], D.species[0]], C).some(m => /unique/.test(m)), order = S.check([D.species[1], D.species[0]], C).some(m => /role order/.test(m));
  check(!missed.length && dup && order, "Q1 · the schema refuses what v1 forbids: growth / economy modifiers, species scales, softness, an Expedition starting genome, a malformed physiology, a strength or weakness without a real category, ranking copy (Easy / stars), duplicate ids, a non-role order",
    missed.length ? "ACCEPTED: " + missed.join(", ") : `${bad.length} bad definitions refused · duplicates · role order`); }

// ---------------------------------------------------------------------------------------------------- Q2 · ids and versions
{ const ids = S.ids(), list = S.list();
  check(J(ids) === J(IDS) && list.every(sp => Number.isInteger(sp.version) && Number.isInteger(sp.physiologyVersion) && sp.physiologyKey === `${sp.id}/p${sp.physiologyVersion}#${S.physiologyHash(sp.physiology)}`)
    && new Set(list.map(s => s.physiologyKey)).size === 4 && list[0].id === "organic_hybrid" && list.filter(s => s.status === "candidate").map(s => s.id).join() === IDS.slice(1).join(),
    "Q2 · stable ids in role order (organic_hybrid · cinder_rosette · woolly_candle · reed_spire), integer version + physiologyVersion, unique physiology keys \"<id>/p<n>#<hash>\"; the three new species are status \"candidate\"",
    list.map(s => s.physiologyKey).join(" · ")); }

// ---------------------------------------------------------------------------------------------------- Q3 · physiology stability
{ const bad = S.list().filter(sp => { const L = LOCKED[sp.id]; return !L || L.physiologyVersion !== sp.physiologyVersion || J(L.physiology) !== J(sp.physiology); }).map(s => s.id);
  check(!bad.length && Object.keys(LOCKED).length === S.ids().length, "Q3 · physiologyVersion stability: every species' numbers equal the PMO-locked 035B v1 table for its physiologyVersion (a numeric change without a version bump fails here)",
    bad.length ? "CHANGED: " + bad.join(", ") : S.list().map(s => `${s.id} p${s.physiologyVersion}: ${s.physiology.tempFloor}…${s.physiology.tempCeil} °C, water ${s.physiology.waterPos - s.physiology.waterTol}…${s.physiology.waterPos + s.physiology.waterTol}, salt ${s.physiology.saltTol}, rad ${s.physiology.radTol}`).join(" · ")); }

// ---------------------------------------------------------------------------------------------------- Q4 · OH ≡ reference (numerically)
{ const OH = S.resolve("organic_hybrid");
  check(J(OH.physiology) === J(C.referencePlant) && S.sameAsReference(OH, C) && J(C.referencePlant) === J(REFERENCE_V1) && Object.isFrozen(C.referencePlant)
    && S.list().filter(sp => S.sameAsReference(sp, C)).map(s => s.id).join() === "organic_hybrid",
    "Q4 · Organic Hybrid's physiology is numerically config.referencePlant, which is WORLD_GEN_VERSION 1's reference (the pre-035B genomeBase) and frozen; no other species equals it",
    J(C.referencePlant)); }

// ---------------------------------------------------------------------------------------------------- Q5 · semantic separation
{ const OH = S.resolve("organic_hybrid");
  const separate = OH.physiology !== C.referencePlant && !("genomeBase" in C) && BLOOM.archetype.WORLD_GEN_VERSION === 1;
  // no production reader of the retired key, and nobody but the engine's two reference readers and world generation names referencePlant
  const prod = ["index.html", ...git("ls-files resources content planets").split("\n").filter(f => /\.(js|html|mjs)$/.test(f))];
  // a READER is a property access or a key declaration; the refusal lists name "genomeBase" only as a string, to refuse it
  const gb = prod.filter(f => /\.genomeBase\b|\bgenomeBase\s*:/.test(read(f).replace(/\/\/.*$/gm, "")));
  const rp = prod.filter(f => /\breferencePlant\b/.test(read(f).replace(/\/\/.*$/gm, "")));
  const RP_OK = ["content/config.js", "resources/bloom-sim.js", "resources/bloom-species.js", "resources/bloom-play.js", "resources/bloom-archetype.js"];
  // the decisive property: RETUNING ORGANIC HYBRID DOES NOT CHANGE WORLD GENERATION — a copy of the tree with OH's physiology moved
  // generates the very same planets, while an OH run on them changes
  const retuned = ctxOf(f => f === "content/species.js" ? read(f).replace("physiology: { tempFloor: -6, tempCeil: 24, waterPos: 50, waterTol: 18,", "physiology: { tempFloor: -9, tempCeil: 21, waterPos: 47, waterTol: 18,") : read(f),
    [...ENGINE.slice(0, 3), SPECIES_FILES[0], ...ENGINE.slice(3, 9), SPECIES_FILES[1], ...ENGINE.slice(9)]);
  const seeds = [["ocean_archipelago", 28], ["desert_world", 25], ["frozen_world", 22]];
  const world = (ctx, a, s) => { const B = ctx.BLOOM, DD = ctx.BLOOM_DATA; const p = B.generateFromArchetype(arche(ctx, a), s, { config: DD.config, traits: DD.traits }); return sha({ id: p.id, t: [...p.tilemap], s: p.sections, g: p.globalClimate, a: p.archetype.attempt }); };
  const worldsSame = seeds.every(([a, s]) => world(NOW, a, s) === world(retuned, a, s));
  const ohMoved = retuned.BLOOM.species.resolve("organic_hybrid").physiology.tempFloor === -9
    && playFingerprint(retuned, retuned.BLOOM_DATA.planets.first_bloom, { species: retuned.BLOOM.species.resolve("organic_hybrid") }).fp !== playFingerprint(NOW, D.planets.first_bloom, { species: OH }).fp;
  check(separate && !gb.length && rp.every(f => RP_OK.includes(f)) && worldsSame && ohMoved,
    "Q5 · referencePlant and Organic Hybrid are semantically separate: different objects; config has no genomeBase and no production file reads it (no legacy alias); only the engine (player default + native), world generation, deriveConfig's refusal and the species module name referencePlant; RETUNING ORGANIC HYBRID (a copy of the tree with OH −9…21 °C) generates the IDENTICAL Ocean 28 / Desert 25 / Frozen 22 planets while the OH run itself changes",
    `genomeBase readers: ${gb.join(", ") || "none"} · referencePlant in ${rp.join(", ")} · worlds identical ${worldsSame} · OH run moved ${ohMoved}`); }

// ---------------------------------------------------------------------------------------------------- Q6 · no species == OH == baseline
{ const OLD = ctxOf(f => git(`show ${BASE_SHA}:${f}`), ENGINE), OH = S.resolve("organic_hybrid");
  const ocean = BLOOM.play.stripPlanet(BLOOM.generateFromArchetype(arche(NOW, "ocean_archipelago"), 28, { config: C, traits: D.traits }));
  const oceanOld = OLD.BLOOM.play.stripPlanet(OLD.BLOOM.generateFromArchetype(arche(OLD, "ocean_archipelago"), 28, { config: OLD.BLOOM_DATA.config, traits: OLD.BLOOM_DATA.traits }));
  const desert = BLOOM.generateFromArchetype(arche(NOW, "desert_world"), 25, { config: C, traits: D.traits });
  const desertOld = OLD.BLOOM.generateFromArchetype(arche(OLD, "desert_world"), 25, { config: OLD.BLOOM_DATA.config, traits: OLD.BLOOM_DATA.traits });
  const cases = [["First Bloom · default", D.planets.first_bloom, OLD.BLOOM_DATA.planets.first_bloom, null], ["Training Grounds · default", D.planets.training_grounds, OLD.BLOOM_DATA.planets.training_grounds, null],
    ["Ocean 28 · default", ocean, oceanOld, null], ["Desert 25 · dying_world", desert, desertOld, "dying_world"], ["Desert 25 · native_competition", desert, desertOld, "native_competition"],
    ["Ocean 28 · volatile_climate", ocean, oceanOld, "volatile_climate"]];
  const rows = cases.map(([name, p, pOld, sc]) => { const base = playFingerprint(OLD, pOld, { scenario: sc && scen(OLD, sc) }), none = playFingerprint(NOW, p, { scenario: sc && scen(NOW, sc) }),
    oh = playFingerprint(NOW, p, { scenario: sc && scen(NOW, sc), species: OH }); return { name, ok: base.fp === none.fp && none.fp === oh.fp, fp: none.fp, ticks: none.ticks, won: none.won }; });
  check(rows.every(r => r.ok), `Q6 · a run without a species == an Organic Hybrid run == the accepted ${BASE_SHA} engine, bit for bit (fixed plan with purchases, colony focus and local upgrades; whole-state fingerprints every 250 ticks) — default, Dying World, Native Competition and Volatile Climate`,
    rows.map(r => `${r.name} ${r.ok ? "=" : "≠"} ${r.fp} (${r.ticks} ticks${r.won ? ", won" : ""})`).join(" · ")); }

// ---------------------------------------------------------------------------------------------------- Q8 · generation refuses species
{ const A = arche(NOW, "ocean_archipelago"), sp = S.resolve("reed_spire");
  const refused = [{ species: sp }, { species: null }, { speciesId: "reed_spire" }, { physiology: sp.physiology }, { referencePlant: sp.physiology }]
    .map(o => throws(() => BLOOM.generateFromArchetype(A, 28, { config: C, traits: D.traits, ...o })));
  const src = read("resources/bloom-archetype.js").replace(/\/\/.*$/gm, ""), body = src.slice(src.indexOf("function generateFromArchetype"), src.indexOf("root.BLOOM.generateFromArchetype ="));
  const probes = (body.match(/createSim\([^)]*\)/g) || []), validates = (body.match(/validatePlanet\([^)]*\)/g) || []);
  check(refused.every(e => e && /species-free/.test(e.message)) && probes.length === 2 && probes.every(c => !/species|physiology/.test(c)) && validates.length === 2 && validates.every(c => !/species|physiology/.test(c)),
    "Q8 · generateFromArchetype refuses a species (also species: null, speciesId, a physiology or a referencePlant override) and its own probes (origin refuge, refuges) and layer 4–8 validation call createSim / validatePlanet without one — world construction reads config.referencePlant only",
    `${refused.filter(Boolean).length}/5 refused · probes: ${probes.join(" · ")} · validatePlanet: ${validates.length}`); }

// ---------------------------------------------------------------------------------------------------- Q12 · playability deterministic
{ const worlds = [["ocean_archipelago", 28], ["desert_world", 25], ["frozen_world", 22]].map(([a, sd]) => [`${a} ${sd}`, BLOOM.play.runSearch({ archetype: arche(NOW, a), scenario: null, seeds: [sd], config: C, traits: D.traits }).planet]);
  worlds.push(["first_bloom", D.planets.first_bloom]);
  const strip = v => J({ ...v, ms: 0 }), rows = [];
  for (const [n, p] of worlds) for (const sp of S.list()) { const a = S.validateFor(p, sp, { config: C, traits: D.traits }), b = S.validateFor(p, sp, { config: C, traits: D.traits });
    rows.push({ n: `${n} · ${sp.id}`, same: strip(a) === strip(b), ok: a.ok, reused: a.s2.reused, authored: !p.archetype, low: a.s1.low, foot: a.s1.reachableShare }); }
  const reuseRule = rows.every(r => r.reused === (r.n.endsWith("organic_hybrid") && !r.authored));
  check(rows.every(r => r.same && r.ok) && reuseRule,
    "Q12 · the species playability verdict (S1 foothold reported, S2 winnability required) is deterministic — identical twice for all four species on Ocean 28, Desert 25, Frozen 22 and the authored First Bloom — and every one is winnable; Organic Hybrid reuses its world's own layer 4–6 proof on validated worlds (numerically the reference) and is proven afresh on the authored world",
    rows.map(r => `${r.n}: ${r.ok ? "winnable" : "NOT winnable"}${r.reused ? " (reused)" : ""} foothold ${r.foot}${r.low ? " LOW" : ""}`).join(" · ")); }

// ---------------------------------------------------------------------------------------------------- Q9 · natives species-free
{ const desert = BLOOM.generateFromArchetype(arche(NOW, "desert_world"), 25, { config: C, traits: D.traits }), NC = scen(NOW, "native_competition");
  const view = sp => { const sim = BLOOM.createSim(desert, C, D.traits, { rng: BLOOM.gen.mulberry32(3), scenario: NC, ...(sp ? { species: sp } : {}) }), M = sim.map;
    return { profile: sha(sim.competition.profile), start: sha([...sim.competition.native]), startShare: sim.competition.startShare,
      nativeFit: sha(M.SEC.map((_, i) => sim.nativeEvaluate(i).fitness)), player: sha(M.SEC.map((_, i) => sim.evaluate(i).fitness)) }; };
  const vs = [null, ...S.list()].map(view), same = k => vs.every(v => v[k] === vs[0][k]);
  const playerDiffers = new Set(vs.slice(1).map(v => v.player)).size === 4;
  check(same("profile") && same("start") && same("startShare") && same("nativeFit") && playerDiffers,
    "Q9 · Native Competition's native is species-independent: its tolerance profile (from config.referencePlant), its planet-derived starting stands and its fitness in every region are identical for no species and all four player species — while the player's own fitness differs per species",
    `profile ${vs[0].profile} · start ${vs[0].start} (${(vs[0].startShare * 100).toFixed(1)}% cover) · native fitness ${vs[0].nativeFit} · player fitness: ${vs.slice(1).map(v => v.player.slice(0, 6)).join(" / ")}`); }

// ---------------------------------------------------------------------------------------------------- Q10 · specialist determinism
{ const ocean = BLOOM.play.stripPlanet(BLOOM.generateFromArchetype(arche(NOW, "ocean_archipelago"), 28, { config: C, traits: D.traits }));
  const rows = S.list().slice(1).flatMap(sp => [["First Bloom", D.planets.first_bloom, null], ["Ocean 28 · native_competition", ocean, "native_competition"]].map(([n, p, sc]) => {
    const a = playFingerprint(NOW, p, { species: sp, scenario: sc && scen(NOW, sc) }), b = playFingerprint(NOW, p, { species: sp, scenario: sc && scen(NOW, sc) }), ref = playFingerprint(NOW, p, { scenario: sc && scen(NOW, sc) });
    return { n: `${sp.id} · ${n}`, ok: a.fp === b.fp && a.fp !== ref.fp, fp: a.fp }; }));
  check(rows.every(r => r.ok), "Q10 · specialist simulations are deterministic (two identical fixed-plan runs, incl. Native Competition) and genuinely differ from the reference plant's run",
    rows.map(r => `${r.n} ${r.fp}${r.ok ? "" : " ✗"}`).join(" · ")); }

// ---------------------------------------------------------------------------------------------------- Q13 · unknown species throws
{ const e1 = throws(() => S.resolve("dry_heat")), e2 = throws(() => S.resolve("")), e3 = throws(() => S.resolve(null));
  const e4 = throws(() => BLOOM.createSim(D.planets.first_bloom, C, D.traits, { species: "organic_hybrid" }));
  const e5 = throws(() => BLOOM.createSim(D.planets.first_bloom, C, D.traits, { species: { id: "x", physiologyKey: "x", physiology: { ...C.referencePlant } } }));
  check(e1 && e1.code === "UNKNOWN_SPECIES" && e2 && e2.code === "UNKNOWN_SPECIES" && e3 && e3.name === "TypeError" && e4 && /resolved species/.test(e4.message) && e5 && /resolved species/.test(e5.message),
    "Q13 · an unknown species id throws (UNKNOWN_SPECIES — the study's role id \"dry_heat\", an empty id), a non-string throws, and createSim refuses an id string or an unresolved (unfrozen) physiology object: never a silent fallback",
    [e1, e4, e5].map(e => e && e.message.slice(0, 64)).join(" | ")); }

// ---------------------------------------------------------------------------------------------------- Q16 · no Challenge / reference coupling
{ const P = BLOOM.play, base = scen(NOW, null);
  const refused = ["referencePlant", "genomeBase", "species", "physiology"].map(k => throws(() => P.deriveConfig(C, { [k]: { tempFloor: -20 } })));
  const training = !throws(() => P.deriveConfig(C, D.training.config));
  const scenarioRefuses = ["referencePlant", "genomeBase", "physiology"].every(k => BLOOM.pressure.checkScenario({ ...base, [k]: { ...C.referencePlant } }).some(m => m.startsWith(k)));
  const catalogueClean = D.scenarios.every(s => !BLOOM.pressure.checkScenario(s).length && !J(s).includes("referencePlant"));
  const frozen = throws(() => { "use strict"; C.referencePlant.tempFloor = -30; }) && C.referencePlant.tempFloor === -6;
  check(refused.every(e => e && /cannot be overridden/.test(e.message)) && training && scenarioRefuses && catalogueClean && frozen,
    "Q16 · no Challenge / referencePlant coupling: deriveConfig refuses referencePlant / genomeBase / species / physiology overrides (Training's economy overrides still derive), a scenario (the Challenge ingredient) carrying referencePlant / genomeBase / physiology is invalid, no shipped scenario names it, and config.referencePlant cannot be written at run time",
    `refused ${refused.filter(Boolean).length}/4 · training derives ${training} · scenario refuses ${scenarioRefuses} · frozen ${!!frozen}`); }

console.log(`\n${fails ? fails + " FAILED" : "ALL CHECKS PASS"} (${passes}/${passes + fails})`);
process.exit(fails ? 1 : 0);
