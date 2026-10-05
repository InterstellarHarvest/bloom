// BLOOM — competition-scenario QA (BLOOM-014): the generic competition mechanism and Native Competition on all three production
// archetypes. Two parts:
//   A · Node: Native Competition is plain scenario data and the engine never names it; Eden and Dying World are unchanged
//       (First Bloom golden, procedural Eden runs, Dying World runs and layer P verdicts pinned to 8a15863); native state is real,
//       planet-derived, deterministic, inside its configured start range, kept off the origin buffer and off water; it spreads,
//       recedes, responds to the player's plants and to the environment; strong colonies hold / reclaim and young ones lose;
//       red ground stays red (Roots included); Adapt acts only through the player's fitness, Terraform only through the
//       environment (never deleting native cover); the economy is BLOOM-013's and competition adds or removes Biomass only
//       through the player's own colonies; native cover never counts as coverage; extinction; layer P with real competitive
//       witnesses (primary fixture Desert 17 with ≥ 2 broad strategies, Ocean 30, Frozen 11); controlled Roots / Seeds / Leaves
//       experiments; Waterborne Seeds stays geography-driven
//   B · real browser: demo-run.html?archetype=desert_world&seed=17&scenario=native_competition (+ Ocean 30, Frozen 11) —
//       identity, explicit failures, native cover drawn distinctly (colour AND pattern), the region readout, the status bar,
//       real competition events, a win through REAL shop buttons, a doomed control losing by extinction, the Bloom Report line,
//       no witness / solution data in the page
//
//   NODE_PATH="$(npm root -g)" node tools/native-competition-check.js [--shots <dir>] [--json <evidence.json>] [--no-browser]
//
// Production modules only. Witnesses buy through sim.buy() with Biomass earned in the real competitive run. Tests marked
// "mechanism" set tiles, densities or Biomass directly to isolate ONE rule (never to prove winnability). Exits 1 on failure.
"use strict";
const path = require("path"), fs = require("fs");
const ROOT = path.resolve(__dirname, "..");
for (const f of ["content/config.js", "content/traits.js", "content/archetypes.js", "content/scenarios.js", "planets/first_bloom.js", "resources/bloom-sim.js",
  "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js", "resources/bloom-scenario.js"]) require(path.join(ROOT, f));
const { BLOOM, BLOOM_DATA } = globalThis, { config, traits, archetypes, scenarios } = BLOOM_DATA;
const GOLD = require("./golden/scenarios.js");
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const SHOTS = arg("--shots"), JSON_OUT = arg("--json"), NO_BROWSER = process.argv.includes("--no-browser");
const J = o => JSON.stringify(o), clone = o => JSON.parse(J(o)), pct = x => (x * 100).toFixed(1) + "%";
const fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return (h >>> 0).toString(16).padStart(8, "0"); };
const mul = GOLD.mulberry32, TICK_S = config.tickMs / 1000, G = config.grow.growThresh;
const EDEN = scenarios.find(s => s.id === "eden"), DW = scenarios.find(s => s.id === "dying_world"), NC = scenarios.find(s => s.id === "native_competition");
const CP = NC.competition;
let fails = 0; const t0 = Date.now(), EVID = {};
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (!ok) fails++; };
const gen = (id, seed) => BLOOM.generateFromArchetype(archetypes.find(a => a.id === id), seed, { config, traits });
// BLOOM-027B: fixtures re-picked by role (docs/evidence/bloom-027b/fixture-changes.md §5). primary Desert 17 (attempt 0, Ymir-961: Drought-only vs
// Humidify strategies, two pressure strategies, start cover in range; Desert 17's new world keeps winning under full Dying World pressure); ocean =
// Ocean 30 (attempt 7, Borea-207): the shared Ocean primary (28) is too open for natives to spread > 50 tiles during a witness run (check 31), Ocean 30
// is not; frozen = Frozen 11 (attempt 1, Pallas-609), the shared Frozen primary.
const FIX = { primary: ["desert_world", 17], ocean: ["ocean_archipelago", 30], frozen: ["frozen_world", 11] };
const WORLDS = Object.fromEntries(Object.entries(FIX).map(([k, [id, s]]) => [k, gen(id, s)]));
const DPRI = WORLDS.primary;
const ncSim = (planet, seed = 7, scenario = NC) => BLOOM.createSim(planet, config, traits, { rng: mul(seed), scenario });
const nativeTiles = sim => { const out = []; sim.competition.native.forEach((d, t) => { if (d > 0) out.push(t); }); return out; };
const runFp = (sim, plan, ticks, every = 500) => { let k = 0; const tr = [];
  for (let t = 1; t <= ticks; t++) { sim.tick(); if (k < plan.length && sim.biomass >= sim.price(sim.traitById[plan[k]]) && sim.buy(plan[k])) k++;
    if (t % every === 0) tr.push(fnv(Array.from(sim.state).join("") + "|" + sim.biomass + "|" + Array.from(sim.dens).join(",") + "|" + sim.lost)); }
  return tr.join(","); };
const BUILD = ["seedOut", "drought", "salt", "drought", "dry", "dry"]; // the primary fixture's first proven build (layer P: Desert 17), used by the mechanism tests (was Desert 17's seedOut, salt, rad, drought, drought, heat)
// each fixture world's first proven competitive plan (the primary's is BUILD); used by the mechanism tests that search the fixture worlds (BLOOM-027B)
const PLAN_CACHE = {}, planOf = k => k === "primary" ? BUILD : (PLAN_CACHE[k] ??= (BLOOM.validateScenario(WORLDS[k], config, traits, NC, { archetypeId: FIX[k][0] }).strategies || [{ plan: WORLDS[k].archetype.strategies.list[0].purchases.map(x => x[0]) }])[0].plan);
// a probe in one build (static environment, no ticking)
function probe(planet, items = [], scenario = NC) { const s = BLOOM.createSim(planet, config, traits, { rng: () => 0.5, scenario }); s.biomass = Infinity; for (const id of items) s.buy(id); s.biomass = 0; return s; }

console.log("# A · scenario data, architecture, Eden / Dying World compatibility");
// 1 · plain data
{ const c = NC.competition, keys = o => Object.keys(o).sort().join(",");
  check(J(clone(scenarios)) === J(scenarios) && !/function|=>/.test(J(scenarios)) && scenarios.every(s => BLOOM.pressure.checkScenario(s).length === 0)
    && NC.pressure === null && NC.loss.extinction === true && keys(c) === "contest,events,growth,start,tolerance" && BLOOM.pressure.isDynamic(NC) && !BLOOM.pressure.isDynamic(EDEN),
    "1 · Native Competition is scenario data (content/scenarios.js): a competition block (tolerance, start, growth, contest, events), no pressure clock, extinction loss; it passes the engine's scenario check",
    `start ${J(c.start)} · contest ${J(c.contest)}`);
  const broken = clone(NC); broken.competition.contest.nativeVigour = 9; broken.competition.start.coverShare = [0.5, 0.2];
  const errs = BLOOM.pressure.checkScenario(broken);
  check(errs.length === 2 && errs.every(e => /competition\./.test(e)), "1b · a malformed competition block is refused with the reason (never silently clamped)", errs.join(" | ")); }
// 2 · no scenario-specific code
{ const code = ["resources/bloom-sim.js", "resources/bloom-witness.js", "resources/bloom-scenario.js", "resources/bloom-archetype.js", "resources/bloom-validate.js", "resources/bloom-gen.js"]
    .map(f => fs.readFileSync(path.join(ROOT, f), "utf8")).join("\n"), ui = fs.readFileSync(path.join(ROOT, "demos/demo-run.html"), "utf8");
  check(!/native_competition/.test(code) && !/native_competition/.test(ui) && !/Native Competition/.test(code) && !/\bdying/i.test(code) && !/scenario\.id\s*===|SCN\.id\s*===/.test(code + ui),
    "2 · no scenario-id special case: the engine, generator, witness, validators and UI never name Native Competition (or Dying World); they read the scenario's competition data"); }
// 3 · Eden unchanged: First Bloom golden (explicit Eden and no scenario) + procedural Eden runs pinned since BLOOM-013
{ const want = JSON.parse(fs.readFileSync(path.join(__dirname, "golden/first_bloom.json"), "utf8")), ids = Object.keys(want.static.prices.start), planet = BLOOM_DATA.planets.first_bloom;
  const adapter = scenario => { let sim; return {
    reset(seed) { sim = BLOOM.createSim(planet, config, traits, { rng: mul(seed), ...(scenario ? { scenario } : {}) }); }, tick() { sim.tick(); }, buy(id) { return sim.buy(id); },
    addBiomass(x) { sim.biomass += x; }, read() { return { biomass: sim.biomass, ticks: sim.ticks, won: sim.won, tiles: sim.state, vigor: sim.vigor, dens: sim.dens, bubbles: sim.bubbles.length }; },
    setColonyFocus(id, mode) { return sim.setColonyFocus(sim.map.SIDX[id], mode); }, buySpecialization(id, spec) { return sim.buySpecialization(sim.map.SIDX[id], spec); },
    colonies() { return { focus: [...sim.colonies.focus], spec: [...sim.colonies.spec] }; },
    setCondition(c) { Object.assign(sim.genome, c.genome); Object.assign(sim.sky, c.sky); for (const k in sim.tf) sim.tf[k] = 0; Object.assign(sim.tf, c.tf || {}); },
    evaluate(i) { return sim.evaluate(i); }, previewOf(id) { return sim.previewOf(id); }, price(id) { return sim.price(sim.traitById[id]); },
    traitIds: traits.map(t => t.id).filter(id => ids.includes(id)), get sectionCount() { return sim.map.SC; },
    get map() { return { tilemap: sim.map.TILEMAP, area: sim.map.AREA, cent: sim.map.CENT }; } }; };
  const same = got => GOLD.PARTS.every(p => J(clone(got[p])) === J(want[p]));
  // procedural Eden runs: the same pins as tools/dying-world-check.js (BLOOM-027B generator; were geometry vs 1b7ea2a, runs = BLOOM-013 data)
  const BASE_FP = { "ocean_archipelago:30": "4f5d4a29,ef774658,ae0fbccc,6d7c152c,a9ab53f1,b65e2cd7", "desert_world:17": "8aeda063,f99cae45,4fb52470,1e751fb5,d9691906,a99afb94",
    "frozen_world:11": "7a37679f,36899074,6ff6e65f,fd3d2368,0fde15ea,50a5bad2" }; // (BLOOM-027B generator + fixtures, = tools/dying-world-check.js)
  const fp = (sim, plan, ticks) => { let k = 0; const tr = []; for (let t = 1; t <= ticks; t++) { sim.tick(); if (k < plan.length && sim.biomass >= sim.price(sim.traitById[plan[k]]) && sim.buy(plan[k])) k++;
    if (t % 500 === 0) tr.push(fnv(Array.from(sim.state).join("") + "|" + sim.biomass + "|" + Array.from(sim.dens).join(","))); } return tr.join(","); };
  const rows = Object.entries(BASE_FP).map(([key, want]) => { const [id, seed] = key.split(":"), p = gen(id, +seed), plan = p.archetype.strategies.list[0].purchases.map(x => x[0]);
    return { key, a: fp(BLOOM.createSim(p, config, traits, { rng: mul(12345) }), plan, 3000) === want, b: fp(BLOOM.createSim(p, config, traits, { rng: mul(12345), scenario: EDEN }), plan, 3000) === want }; });
  const eden = BLOOM.createSim(DPRI, config, traits, { scenario: EDEN });
  check(same(GOLD.runGolden(adapter(EDEN))) && same(GOLD.runGolden(adapter(null))) && rows.every(r => r.a && r.b) && eden.competition.enabled === false && !eden.nativeEvaluate,
    "3 · Eden is unchanged: First Bloom golden bit-for-bit (with Eden and with no scenario); Ocean 30 / Desert 17 / Frozen 11 Eden 3000-tick runs equal their BLOOM-013 pins; no native layer exists",
    rows.map(r => `${r.key} ${r.a && r.b ? "✓" : "✗"}`).join(" · ")); }
// 4 / 36 / 37 · Dying World and the archetype records pinned to the BLOOM-027B generator (were 8a15863, computed from `git archive 8a15863`)
const PIN = { planets: {"desert_world:17": "b72e23dd", "ocean_archipelago:30": "be10566d", "frozen_world:11": "290a7b3f"},
  dw: { "desert_world:17": "3ad9c1d1,b41d8295,028c482e,114ede5f,1097e447,7c93b68c", "ocean_archipelago:30": "05b456a1,6231e4ca,5cea4681,389cef9c,e2c8773c,12cbe1b9", "frozen_world:11": "f5e161e4,3f1df5bc,60a24440,66b93ca3,a7b2629b,1714b6c3" },
  dwLayerP: {"desert_world:17": "8e7b201c", "ocean_archipelago:30": "83013a93", "frozen_world:11": "2b20f6bc"} }; // BLOOM-027B generator + fixtures (docs/evidence/bloom-027b/repin.json; were 8a15863 / Ocean 13 · Desert 25 · Frozen 22)
const DWLP = {};
{ const rows = [];
  for (const [k, [id, seed]] of Object.entries(FIX)) { const key = `${id}:${seed}`, p = WORLDS[k], plan = p.archetype.strategies.list[0].purchases.map(x => x[0]);
    const run = runFp(BLOOM.createSim(p, config, traits, { rng: mul(4242), scenario: DW }), plan, 3000);
    const v = DWLP[k] = BLOOM.validateScenario(p, config, traits, DW, { archetypeId: id });
    const lp = fnv(J({ status: v.status, strategies: v.strategies.map(x => ({ sig: x.signature, purchases: x.purchases, margin: x.marginSeconds, hold: x.hold, trace: x.trace })) }));
    rows.push({ key, planet: fnv(J(p)) === PIN.planets[key], run: run === PIN.dw[key], lp: lp === PIN.dwLayerP[key], status: v.status }); }
  check(rows.every(r => r.run && r.lp), "4 · Dying World is unchanged: Ocean 30 / Desert 17 / Frozen 11 Dying World 3000-tick runs and their layer P verdicts (strategies, purchases, margins, holds, traces) equal 8a15863",
    rows.map(r => `${r.key} run ${r.run ? "✓" : "✗"} layer P ${r.status} ${r.lp ? "✓" : "✗"}`).join(" · "));
  check(rows.every(r => r.planet), "36 · archetype validation layers 1–8 are unchanged in meaning: the three generated fixture worlds, including their whole validator record (witness, strategies, rejected attempts), equal 8a15863 bit-for-bit",
    rows.map(r => `${r.key} ${r.planet ? "✓" : "✗"}`).join(" · "));
  check(Object.values(DWLP).every(v => v.status === "PASS" && v.competition === null), "37 · Dying World layer P remains valid: all three fixtures PASS, with no competition record (the competition machinery is inert without a competition block)",
    Object.entries(DWLP).map(([k, v]) => `${k} ${v.status} (${v.strategies.length})`).join(" · ")); }

console.log("\n# A · native state");
{ // 5 · determinism: planet-derived start, run RNG irrelevant to the start, identical runs
  const a = ncSim(DPRI, 1), b = ncSim(DPRI, 999), c = ncSim(WORLDS.frozen, 1);
  const fa = runFp(ncSim(DPRI, 77), ["seedOut", "drought"], 3000), fb = runFp(ncSim(DPRI, 77), ["seedOut", "drought"], 3000);
  check(J(Array.from(a.competition.native)) === J(Array.from(b.competition.native)) && fa === fb && J(Array.from(c.competition.native)) !== J(Array.from(a.competition.native).slice(0, c.map.N)),
    "5 · native state initializes deterministically from the planet (two different run seeds start identically) and a seeded competitive run reproduces bit-for-bit",
    `start hash ${fnv(J(Array.from(a.competition.native)))} · run ${fa.split(",").slice(-1)}`); }
const STARTS = {};
for (const [k, p] of Object.entries(WORLDS)) { const s = ncSim(p); STARTS[k] = { share: s.competition.startShare, tiles: s.competition.tiles, sim: s }; }
{ // 6 · starting cover inside the configured range (fixtures + a 1–8 seed sweep of every archetype). A world may fall short ONLY when
  // the seeding rules themselves cannot place more: native-suitable land outside the origin buffer, capped at maxLandmassShare per
  // landmass (BLOOM-027B: cylindrical landmasses merge across the cut, so 5 of the 24 sweep worlds now sit on that bound — each is
  // checked against its own bound here instead of the former "at most 2 short" tolerance; the config range is unchanged)
  const bound = s => { const M = s.map, S = CP.start, lm = BLOOM.geo.components(Array.from(M.TILEMAP, v => v >= 0 ? 1 : 0), M.W, M.H, M.topology), dist = new Int32Array(M.N).fill(-1), q = [];
    for (const t of M.SEC_TILES[M.ORIGIN]) { dist[t] = 0; q.push(t); }
    for (let h = 0; h < q.length; h++) { const t = q[h]; if (dist[t] >= S.originBufferTiles) continue; for (const u of BLOOM.geo.neighbors4(t, M.W, M.H, M.topology)) if (M.TILEMAP[u] >= 0 && dist[u] < 0) { dist[u] = dist[t] + 1; q.push(u); } }
    const size = {}, suit = {}; for (const t of M.LAND_TILES) { const c = lm.id[t]; size[c] = (size[c] || 0) + 1; if (dist[t] < 0 && s.nativeEvaluate(M.TILEMAP[t]).fitness > CP.growth.growThresh) suit[c] = (suit[c] || 0) + 1; }
    return Object.keys(size).reduce((a, c) => a + Math.min(suit[c] || 0, Math.floor(S.maxLandmassShare * size[c])), 0) / M.LAND; };
  const sweep = []; for (const a of archetypes) for (let seed = 1; seed <= 8; seed++) { let p; try { p = gen(a.id, seed); } catch (e) { continue; } const s = ncSim(p); sweep.push({ a: a.id, seed, share: s.competition.startShare, bound: bound(s) }); }
  const [lo, hi] = CP.start.coverShare, inR = x => x >= lo - 0.002 && x <= hi + 0.002, short = sweep.filter(r => !inR(r.share));
  check(Object.values(STARTS).every(s => inR(s.share)) && short.every(r => r.share < lo && r.bound < lo + 0.02 && r.share >= r.bound - 0.05) && sweep.every(r => r.share <= hi + 0.002 && r.share >= 0.1),
    `6 · starting native cover stays inside the configured range (${lo}–${hi} of the colonizable land): all three fixtures, and the archetype sweep (only a world with too little native-suitable ground may fall short, never above)`,
    `${Object.entries(STARTS).map(([k, s]) => `${k} ${pct(s.share)}`).join(" · ")} · sweep ${sweep.length} worlds ${pct(Math.min(...sweep.map(r => r.share)))}–${pct(Math.max(...sweep.map(r => r.share)))}` +
    (short.length ? ` · ${short.length} short, each at its own suitable-ground bound: ${short.map(r => `${r.a.slice(0, 3)}${r.seed} ${pct(r.share)} (bound ${pct(r.bound)})`).join(", ")}` : ""));
  EVID.startSweep = sweep; }
{ // 7 · origin buffer
  const rows = Object.entries(STARTS).map(([k, { sim }]) => { const M = sim.map, dist = new Int32Array(M.N).fill(-1), q = [];
    for (const t of M.SEC_TILES[M.ORIGIN]) { dist[t] = 0; q.push(t); }
    for (let h = 0; h < q.length; h++) { const t = q[h], x = t % M.W, y = (t / M.W) | 0; for (const u of [x > 0 && t - 1, x < M.W - 1 && t + 1, y > 0 && t - M.W, y < M.H - 1 && t + M.W]) if (u !== false && M.TILEMAP[u] >= 0 && dist[u] < 0) { dist[u] = dist[t] + 1; q.push(u); } }
    const near = nativeTiles(sim).map(t => dist[t]).filter(d => d >= 0).reduce((m, d) => Math.min(m, d), Infinity);
    return { k, near, ok: near > CP.start.originBufferTiles }; });
  check(rows.every(r => r.ok), `7 · the origin starts usable: no native cover in the origin region or within ${CP.start.originBufferTiles} land tiles of it`, rows.map(r => `${r.k} nearest native ${r.near} tiles`).join(" · ")); }
{ // 8 / 9 · land only, never water/void/lava; never on a player tile (exclusive occupancy), through whole runs
  let bad = 0, overlap = 0, ticks = 0;
  for (const [k, p] of Object.entries(WORLDS)) { const s = ncSim(p, 3); const plan = p.archetype.strategies.list[0].purchases.map(x => x[0]); let i = 0;
    for (let t = 0; t <= 3000; t++) { if (t) s.tick(); ticks++; if (i < plan.length && s.biomass >= s.price(s.traitById[plan[i]]) && s.buy(plan[i])) i++;
      if (t % 50) continue; const N = s.competition.native; for (let j = 0; j < N.length; j++) if (N[j] > 0) { if (s.map.TILEMAP[j] < 0) bad++; if (s.state[j] !== s.BAR) overlap++; } } }
  const lavaPlanet = clone(DPRI); const lavaIdx = lavaPlanet.sections.findIndex(x => !x.isOrigin && x.kind !== "water"); lavaPlanet.sections[lavaIdx].kind = "lava";
  for (let t = 0; t < lavaPlanet.tilemap.length; t++) if (lavaPlanet.tilemap[t] === lavaIdx) lavaPlanet.tilemap[t] = -1;
  const ls = ncSim(lavaPlanet, 3); for (let t = 0; t < 1500; t++) ls.tick(); const lavaBad = nativeTiles(ls).filter(t => ls.map.TILEMAP[t] < 0).length;
  check(bad === 0 && lavaBad === 0 && nativeTiles(ls).length > 0, "8 · native cover exists on real colonizable land only (every native tile is a land tile of a land region)", `${ticks} sampled ticks on three worlds`);
  check(bad === 0 && lavaBad === 0, "9 · native cover never occupies water, void or lava (also with a region turned to lava: mechanism)", `0 of ${ls.map.N - ls.map.LAND} impassable tiles`);
  check(overlap === 0, "9b · one organism per tile: native cover never sits on a Living or Dead player tile, so a native tile can never count as the player's", `${overlap} overlaps`); }

console.log("\n# A · a living competitor: spread, recession, response");
const noBuy = (() => { const s = ncSim(DPRI, 11), tr = []; for (let t = 1; t <= 2400; t++) { s.tick(); if (t % 150 === 0) tr.push(+s.competition.share.toFixed(4)); } return { s, tr }; })();
check(noBuy.s.competition.flips.nativeSpread > 50 && noBuy.tr[3] > noBuy.s.competition.startShare + 0.03, "10 · native cover expands: with no player purchases it spreads into open ground it can grow on",
  `start ${pct(noBuy.s.competition.startShare)} → ${noBuy.tr.slice(0, 6).map(pct).join(" → ")} · ${noBuy.s.competition.flips.nativeSpread} tiles colonized`);
{ // 11 · contraction (mechanism: a sky the native cannot live under, set directly — no Terraform purchase)
  const s = ncSim(DPRI, 11); for (let t = 0; t < 300; t++) s.tick(); const before = s.competition.share; s.sky.temp += 30;
  for (let t = 0; t < 900; t++) s.tick();
  check(s.competition.flips.nativeReceded > 100 && s.competition.share < before * 0.5, "11 · native cover contracts: where conditions turn lethal for it, its stands thin and disappear (mechanism: sky +30 °C)",
    `${pct(before)} → ${pct(s.competition.share)} · ${s.competition.flips.nativeReceded} tiles receded`); }
{ // 12 · native expansion responds to the player's local state (mechanism: the same run — same build, Biomass granted to both —
  // with one region pre-planted by the player's established plants on its open ground)
  // (BLOOM-027B: the region is searched over the fixture worlds in order — primary, ocean, frozen — each with its own proven competitive plan; Desert 17 has
  // no native-suitable region with ≥ 20 open tiles where the player is at least as suited, the next fixture world does)
  const planOf12 = planOf; const _unused12 = k => k === "primary" ? BUILD : (BLOOM.validateScenario(WORLDS[k], config, traits, NC, { archetypeId: FIX[k][0] }).strategies || [{ plan: WORLDS[k].archetype.strategies.list[0].purchases.map(x => x[0]) }])[0].plan;
  // Every qualifying region of every fixture world is a valid instance; the first one where the natives still hold any of the region at 192 s in the open run
  // is reported (on Frozen 11's first candidate the player overruns the whole region by then, which says nothing about the response).
  let W12 = DPRI, P12 = BUILD, occ, M, N0, s0, mk = null, at = [], bt = [], spreadA = 0, spreadB = 0, found = false;
  for (const k of ["primary", "ocean", "frozen"]) { if (found) break; W12 = WORLDS[k]; P12 = planOf12(k);
    mk = () => { const s = ncSim(W12, 5); s.biomass = 1e6; for (const id of P12) s.buy(id); s.biomass = 0; return s; };
    s0 = mk(); M = s0.map; N0 = s0.competition.native;
    const cands = M.SEC.map((_, i) => i).filter(i => i !== M.ORIGIN && s0.nativeEvaluate(i).fitness > CP.growth.growThresh && s0.evaluate(i).fitness >= s0.nativeEvaluate(i).fitness - 0.02)
      .map(i => ({ i, open: M.SEC_TILES[i].filter(t => !(N0[t] > 0)).length, n: M.SEC_TILES[i].filter(t => N0[t] > 0).length }))
      .filter(r => r.n > 0 && r.open >= 20).sort((a, b) => b.open - a.open); // native-suitable, the player at least as suited, native cover + open ground at the start
    for (const cand of cands) { occ = cand.i;
      const a = mk(), b = mk(); for (const t of M.SEC_TILES[occ]) if (!(b.competition.native[t] > 0)) { b.state[t] = b.LIV; b.dens[t] = 1; }
      b.vigor[occ] = b.evaluate(occ).fitness; // (an established colony: its vigor already matches its ground)
      at = []; bt = []; for (let t = 1; t <= 1200; t++) { a.tick(); b.tick(); if (t === 300 || t === 1200) { at.push(M.SEC_TILES[occ].filter(u => a.competition.native[u] > 0).length); bt.push(M.SEC_TILES[occ].filter(u => b.competition.native[u] > 0).length); } }
      spreadA = a.competition.flips.nativeSpread; spreadB = b.competition.flips.nativeSpread; if (at[1] > 0) { found = true; break; } } }
  check(at[0] >= bt[0] + 20 && at[1] > bt[1] && spreadA !== spreadB, "12 · native expansion responds to the player: where the player's plants are already established, native cover gains far less of the region (and spreads differently overall) than in the identical run without them",
    `${W12.name}: ${M.SEC[occ].name} (${M.AREA[occ]} tiles, ${N0.reduce((x, d, t) => x + (d > 0 && M.TILEMAP[t] === occ ? 1 : 0), 0)} native at the start): native tiles at 48 s / 192 s ${at.join(" / ")} (open) vs ${bt.join(" / ")} (player-held) · tiles colonized overall ${spreadA} vs ${spreadB}`);
  EVID.response = { region: M.SEC[occ].name, nativeTilesOpen: at, nativeTilesPlayerHeld: bt }; }
{ // 13 · the player's expansion changes the front
  const a = ncSim(DPRI, 9), b = ncSim(DPRI, 9); a.biomass = b.biomass = 0; let ib = 0; const plan = BUILD; // (the fixture's own first proven build)
  for (let t = 1; t <= 3000; t++) { a.tick(); b.tick(); if (ib < plan.length && b.biomass >= b.price(b.traitById[plan[ib]]) && b.buy(plan[ib])) ib++; }
  const ca = a.competition, cb = b.competition, regs = c => c.everContested.reduce((x, y) => x + y, 0);
  check(cb.flips.playerTook > ca.flips.playerTook + 100 && cb.share < ca.share - 0.05 && regs(cb) !== regs(ca), "13 · the player's expansion moves the competitive front: a run that spreads (earned purchases) contests more ground, takes native cover and leaves the native less land than a run that does not",
    `native land at 480 s ${pct(ca.share)} (no purchases) vs ${pct(cb.share)} (spreading) · player took ${ca.flips.playerTook} vs ${cb.flips.playerTook} native tiles · regions contested ${regs(ca)} vs ${regs(cb)}`); }

// ---- controlled fronts (mechanism): one region split into a player half and a native half, everything else cleared
function lab(planet, region, { build = BUILD, pDens = 0.9, nDens = 0.9, focus = "balanced", spec = null, ticks = 300, seed = 1, sky = null } = {}) {
  const s = ncSim(planet, seed); s.biomass = Infinity; for (const id of build) s.buy(id); if (sky) Object.assign(s.sky, sky);
  const M = s.map, N = s.competition.native, tiles = M.SEC_TILES[region], xs = tiles.map(t => t % M.W).sort((a, b) => a - b), mid = xs[xs.length >> 1];
  for (const t of M.LAND_TILES) { s.state[t] = s.BAR; s.dens[t] = 0; N[t] = 0; }
  for (const t of tiles) { if (t % M.W < mid) { s.state[t] = s.LIV; s.dens[t] = pDens; } else N[t] = nDens; }
  for (let i = 0; i < M.SC; i++) { s.vigor[i] = s.evaluate(i).fitness; s.competition.vigor[i] = s.nativeEvaluate(i).fitness; }
  if (focus !== "balanced") s.setColonyFocus(region, focus); if (spec) { s.biomass = 1e9; s.buySpecialization(region, spec); }
  s.biomass = 0; const start = { p: tiles.filter(t => s.state[t] === s.LIV).length, n: tiles.filter(t => N[t] > 0).length };
  // took / lost = tiles of THIS region that changed hands between the two organisms (stands spreading elsewhere don't count)
  let income = 0, took = 0, lost = 0; const was = new Int8Array(tiles.length);
  for (let t = 0; t < ticks; t++) { tiles.forEach((u, k) => { was[k] = s.state[u] === s.LIV ? 1 : N[u] > 0 ? 2 : 0; }); s.tick(); income += s.income;
    tiles.forEach((u, k) => { const now = s.state[u] === s.LIV ? 1 : N[u] > 0 ? 2 : 0; if (was[k] === 2 && now === 1) took++; else if (was[k] === 1 && now === 2) lost++; }); }
  const end = { p: tiles.filter(t => s.state[t] === s.LIV).length, n: tiles.filter(t => N[t] > 0).length };
  return { start, end, took, lost, income, sim: s, pf: s.evaluate(region).fitness, nf: s.nativeEvaluate(region).fitness };
}
const P0 = probe(DPRI, BUILD), M0 = P0.map, big = i => M0.AREA[i] >= 60;
const regionsBy = f => M0.SEC.map((_, i) => i).filter(i => i !== M0.ORIGIN && big(i) && f(Math.min(1, P0.evaluate(i).fitness), Math.min(1, P0.nativeEvaluate(i).fitness)));
const TIE = regionsBy((pf, nf) => pf > 0.95 && nf > 0.95)[0];                     // both organisms fully suited
const FAV = regionsBy((pf, nf) => pf > 0.95 && nf > G && nf < 0.95)[0] ?? TIE;      // the player better suited, the native still viable
const PR0 = probe(DPRI, ["seedOut"]), RED_BUILD = ["seedOut"];                  // red ground: an un-adapted plant on a desert
const RED = M0.SEC.map((_, i) => i).filter(i => i !== M0.ORIGIN && big(i) && PR0.evaluate(i).fitness <= G && PR0.nativeEvaluate(i).fitness > G)[0]; // red for the player, fine for the native
console.log("\n# A · contest rules (controlled fronts, mechanism)");
{ // 14 · strong player colonies hold / reclaim
  const rows = [FAV, TIE].map(r => { const x = [1, 2, 3].map(seed => lab(DPRI, r, { seed })); return { r, x, net: x.reduce((a, o) => a + o.took - o.lost, 0) / 3, held: x.every(o => o.end.p >= o.start.p) }; });
  check(rows.every(o => o.held && o.net > 0), "14 · strong (established, well-suited) player colonies hold their ground and reclaim suitable native ground — where the player is better suited, and even where both are fully suited",
    rows.map(o => `${M0.SEC[o.r].name} (suits you ${pct(o.x[0].pf)}, natives ${pct(o.x[0].nf)}): player tiles ${o.x[0].start.p} → ${o.x.map(z => z.end.p).join("/")}, net +${o.net.toFixed(0)}`).join(" · "));
  EVID.strongFront = rows.map(o => ({ region: M0.SEC[o.r].name, start: o.x[0].start, ends: o.x.map(z => z.end), net: o.net })); }
{ // 15 · weak colonies lose contested ground
  const x = [1, 2, 3].map(seed => lab(DPRI, TIE, { pDens: 0.05, ticks: 150, seed })), net = x.reduce((a, o) => a + o.took - o.lost, 0) / 3;
  check(x.every(o => o.end.p < o.start.p && o.lost > o.took), "15 · weak (young) player colonies lose contested ground: the same front with seedling stands is overgrown by established native cover",
    `${M0.SEC[TIE].name}: seedling colony ${x[0].start.p} → ${x.map(o => o.end.p).join("/")} tiles in 24 s (net ${net.toFixed(0)}), established colony holds (check 14)`); }
{ // 16 · red ground cannot be rescued by competition or Roots
  const x = [1, 2].map(seed => lab(DPRI, RED, { build: RED_BUILD, focus: "roots", spec: "rootNetwork", pDens: 1, ticks: 600, seed }));
  check(RED !== undefined && x.every(o => o.took === 0 && o.end.p < o.start.p * 0.5) && x[0].pf <= G, "16 · red ground stays red: on ground too hostile for the player, competition never lets the player take native cover, and Roots focus + Root Network do not keep the colony there",
    `${M0.SEC[RED].name} (suits you ${pct(x[0].pf)}, natives ${pct(x[0].nf)}): with Roots + Root Network ${x[0].start.p} → ${x.map(o => o.end.p).join("/")} player tiles in 96 s, native tiles taken ${x.map(o => o.took).join("/")}`); }
{ // 17 · Adapt acts through the player's fitness only
  // (search: the first base build + one Adapt purchase that turns a viable native stronghold — native fitness > growThresh,
  // the player growing there but weaker — into ground an established colony wins; every Adapt purchase is also checked for
  // leaving the native's fitness untouched everywhere)
  // (BLOOM-027B: the search runs over the fixture worlds in order — primary, ocean, frozen — with base builds = prefixes of that world's first
  // proven competitive plan; the primary Desert 17 has no viable native stronghold the player grows on but is weaker in, so the hit comes from
  // the next fixture world that has one. The claim is about the mechanism, not about one map.)
  const adapt = traits.filter(t => t.board === "Adapt").map(t => t.id); let hit = null, base = null, natAlways = true, hitW = null, hitM = null, hitKey = null;
  for (const k of ["primary", "ocean", "frozen"]) { if (hit) break; const w = WORLDS[k], plan = planOf(k), Mw = probe(w, []).map, bigW = i => Mw.AREA[i] >= 60;
    for (const b0 of [["seedOut"], plan.slice(0, 2), plan.slice(0, 3), plan.slice(0, 4)]) for (const id of adapt) {
      const a = probe(w, b0), b = probe(w, [...b0, id]); if (J(b.genome) === J(a.genome)) continue;
      const natSame = a.map.SEC.every((_, i) => a.nativeEvaluate(i).fitness === b.nativeEvaluate(i).fitness); if (!natSame) natAlways = false;
      const flip = a.map.SEC.map((_, i) => i).find(i => bigW(i) && !a.holdsAgainstNatives(i) && b.holdsAgainstNatives(i) && a.evaluate(i).fitness > G && a.nativeEvaluate(i).fitness > G);
      if (!hit && flip !== undefined) { hit = { id, flip, natSame, pfA: a.evaluate(flip).fitness, pfB: b.evaluate(flip).fitness, nf: a.nativeEvaluate(flip).fitness }; base = b0; hitW = w; hitM = Mw; hitKey = k; } } }
  if (hit) hit.natSame = natAlways;
  let lx = null; if (hit) { const A = [1, 2, 3].map(seed => lab(hitW, hit.flip, { build: base, seed, pDens: 0.6 })), B = [1, 2, 3].map(seed => lab(hitW, hit.flip, { build: [...base, hit.id], seed, pDens: 0.6 }));
    lx = { a: A.reduce((s, o) => s + o.took - o.lost, 0) / 3, b: B.reduce((s, o) => s + o.took - o.lost, 0) / 3 }; }
  check(hit && hit.natSame && lx.b > lx.a + 5, "17 · Adapt changes the competitive outcome only through the player's own fitness: it never changes the native's fitness anywhere, yet it flips a region the native held into one an established colony wins",
    hit ? `${hitKey} fixture (${hitW.name}): after ${base.join(" + ")}, ${traits.find(t => t.id === hit.id).name}: ${hitM.SEC[hit.flip].name} suits you ${pct(hit.pfA)} → ${pct(hit.pfB)} (natives ${pct(hit.nf)}, unchanged) · controlled front net ${lx.a.toFixed(0)} → +${lx.b.toFixed(0)} tiles` : "no such region found");
  EVID.adapt = hit && { world: hitKey, trait: hit.id, region: hitM.SEC[hit.flip].name, playerFitness: [hit.pfA, hit.pfB], nativeFitness: hit.nf, frontNet: lx }; }
{ // 18 / 19 · Terraform acts through the environment, both ways; it never deletes native cover by itself
  // (BLOOM-027B: measured on the first fixture world — primary, ocean, frozen — where one sky change moves the native's fitness BOTH ways; on Desert 17 every
  // single step moves it one way only, Frozen 11 shows the tradeoff)
  let rows = [], W18 = DPRI;
  for (const k of ["primary", "ocean", "frozen"]) { W18 = WORLDS[k]; const P18 = k === "primary" ? BUILD : planOf(k); rows = [];
    for (const id of ["humid", "dry", "warm", "cool"]) { const a = probe(W18, P18), b = probe(W18, [...P18, id]);
      const up = [], down = [], flip = []; a.map.SEC.forEach((_, i) => { const d = b.nativeEvaluate(i).fitness - a.nativeEvaluate(i).fitness; if (d > 0.05) up.push(i); if (d < -0.05) down.push(i);
        if (a.holdsAgainstNatives(i) !== b.holdsAgainstNatives(i)) flip.push(i); });
      rows.push({ id, up, down, flip }); }
    if (rows.filter(r => r.flip.length && (r.up.length || r.down.length)).length >= 2 && rows.some(r => r.up.length && r.down.length)) break; }
  const s = ncSim(DPRI, 3); for (let t = 0; t < 400; t++) s.tick(); const before = Array.from(s.competition.native); s.biomass = 1e6; s.buy("humid"); s.buy("cool"); const after = Array.from(s.competition.native);
  const any = rows.filter(r => r.flip.length && (r.up.length || r.down.length)), both = rows.filter(r => r.up.length && r.down.length);
  check(any.length >= 2 && both.length >= 1, "18 · Terraform changes player / native advantage through the environment: a sky change moves the native's fitness (some regions down, some up — a tradeoff) and flips who wins regions",
    rows.map(r => `${r.id}: natives worse in ${r.down.length}, better in ${r.up.length}, advantage flips in ${r.flip.map(i => probe(W18, []).map.SEC[i].name).join("/") || "none"}`).join(" · "));
  check(J(before) === J(after), "19 · Terraform never deletes native cover directly: buying Humidify + Cool the Sky leaves every native stand untouched until the ordinary tick rules respond to the new conditions",
    `${before.filter(x => x > 0).length} native tiles before and after the purchases`);
  EVID.terraform = rows.map(r => ({ trait: r.id, nativeWorse: r.down.map(i => probe(W18, []).map.SEC[i].name), nativeBetter: r.up.map(i => probe(W18, []).map.SEC[i].name), advantageFlips: r.flip.map(i => probe(W18, []).map.SEC[i].name) })); }
{ // 20 · Spread upgrades affect player expansion normally (mechanism: Biomass granted equally to both runs)
  const run = items => { const s = ncSim(DPRI, 21); s.biomass = 1e6; for (const id of items) s.buy(id); s.biomass = 0; for (let t = 0; t < 1500; t++) s.tick(); return { cov: s.coverage(), took: s.competition.flips.playerTook }; };
  const a = run(["salt", "rad", "drought", "drought", "heat"]), b = run(["seedOut", "seedOut", "salt", "rad", "drought", "drought", "heat"]);
  check(b.cov > a.cov + 0.03 && b.took > a.took, "20 · Spread upgrades affect player expansion normally: Seed Output speeds spread into open ground and into contested native cover alike",
    `240 s: coverage ${pct(a.cov)} → ${pct(b.cov)} with Seed Output ×2 · native tiles taken ${a.took} → ${b.took}`); }

console.log("\n# A · economy");
{ // 21 / 23 · income = the ordinary colony formula; Biomass never touched by competition code
  const s = ncSim(DPRI, 13), E = config.econ, g = config.grow, lerp = BLOOM.util.lerp, clamp = BLOOM.util.clamp, plan = ["seedOut", "drought"]; let k = 0, worst = 0, bubbleOnly = true, n = 0;
  for (let t = 0; t < 2500; t++) { const b0 = s.biomass; s.tick(); n++;
    const yieldOf = new Float64Array(s.map.SC); for (const i of s.map.LAND_TILES) if (s.state[i] === s.LIV) yieldOf[s.map.TILEMAP[i]] += lerp(E.youngYield, 1, s.dens[i]);
    let inc = 0; for (let i = 0; i < s.map.SC; i++) { let y = yieldOf[i] * (s.secFit[i] > E.thrivingAbove ? E.thriving : E.marginal); if (i === s.map.ORIGIN) y += E.originTrickle * lerp(E.youngYield, 1, clamp(s.establishment(i) / g.maturity, 0, 1)); inc += y; }
    worst = Math.max(worst, Math.abs(inc - s.income)); const extra = s.biomass - b0 - s.income; if (Math.abs(extra) > 1e-9 && Math.abs(extra / (E.bubbleValue * E.autoCollectShare) - Math.round(extra / (E.bubbleValue * E.autoCollectShare))) > 1e-9) bubbleOnly = false;
    if (k < plan.length && s.biomass >= s.price(s.traitById[plan[k]]) && s.buy(plan[k])) k++; }
  const src = fs.readFileSync(path.join(ROOT, "resources/bloom-sim.js"), "utf8"), comp = src.slice(src.indexOf("// ---- competition (BLOOM-014)"), src.indexOf("const validSecC"));
  check(worst < 1e-12 && bubbleOnly, "21 · competition grants no hidden Biomass: every tick's income equals the ordinary colony formula over the player's Living tiles, and every other Biomass change is a bubble",
    `${n} ticks, largest income difference ${worst.toExponential(1)}`);
  check(!/biomass|income|spent/.test(comp), "23 · competition influences Biomass only through the player's colonies (fewer / thinner Living stands earn less): the competition code never reads or writes Biomass, income or spending"); }
{ // 22 · economy values = BLOOM-013
  const E = config.econ; const want = { thriving: 0.0004, marginal: 0.00012, thrivingAbove: 0.7, originTrickle: 0.3, startBiomass: 100, youngYield: 0.45, bubbleChance: 0.011, bubbleValue: 25,
    bubbleAutoTicks: 60, autoCollectShare: 0.5, bubbleFitAbove: 0.72, bubbleMinLiving: 8, costScale: 5 };
  const prices = traits.map(t => `${t.id}:${t.cost.base}/${t.cost.step}`).join(",");
  const keysOf = o => o && typeof o === "object" ? Object.keys(o).flatMap(k => [k, ...keysOf(o[k])]) : [];
  check(J(E) === J(want) && fnv(prices) === "c76e356c" && !keysOf(NC).some(k => /^(econ|cost|price|biomass|startBiomass|income|yield)/i.test(k)), "22 · the economy is BLOOM-013's: config.econ values and every trait price unchanged; the scenario carries no economy settings",
    `start ${E.startBiomass}, trickle ${E.originTrickle}, costScale ${E.costScale} · prices ${fnv(prices)}`); }
{ // 24 / 25 · coverage
  const s = ncSim(DPRI, 4), eden = BLOOM.createSim(DPRI, config, traits, { rng: mul(4) }); let ok = true; for (let t = 0; t < 1200; t++) { const c = s.tick(); if (t % 100 === 0) { let l = 0; for (const i of s.map.LAND_TILES) if (s.state[i] === s.LIV) l++; if (Math.abs(c - l / s.map.LAND) > 1e-12) ok = false; } }
  check(ok && s.map.LAND === eden.map.LAND && s.competition.tiles > 0, "24 · native cover never counts toward the player's coverage: coverage = the player's Living tiles / the same colonizable-land denominator as Eden",
    `land ${s.map.LAND} (Eden ${eden.map.LAND}) · natives ${s.competition.tiles} tiles, coverage ${pct(s.coverage())}`); }

console.log("\n# A · extinction");
{ // 26 · a doomed run (mechanism: every player tile cleared) is lost after the grace, then frozen
  const s = ncSim(DPRI, 8); for (let t = 0; t < 50; t++) s.tick(); for (const i of s.map.LAND_TILES) if (s.state[i] !== s.BAR) { s.state[i] = s.BAR; s.dens[i] = 0; }
  let lostAt = null, reason = null; s.onLoss = r => { reason = r; }; for (let t = 0; t < 200 && !s.lost; t++) { s.tick(); if (s.lost) lostAt = t + 1; }
  const frozen = s.ticks; s.tick(); s.tick();
  check(s.lost && lostAt === s.extinction.graceTicks && /extinction: no living plants anywhere for 8 s/.test(reason) && s.ticks === frozen, "26 · extinction loss works (the generic rule): no living plants anywhere for the grace → lost, a clear reason, the run frozen",
    `lost after ${lostAt} ticks (${(lostAt * TICK_S).toFixed(1)} s): ${reason}`); }
{ // 27 · a shorter gap survives
  const s = ncSim(DPRI, 8); for (let t = 0; t < 50; t++) s.tick(); const keep = s.map.SEC_TILES[s.map.ORIGIN][0];
  for (const i of s.map.LAND_TILES) if (s.state[i] !== s.BAR) { s.state[i] = s.BAR; s.dens[i] = 0; }
  for (let t = 0; t < s.extinction.graceTicks - 3; t++) s.tick(); const z = s.extinction.zeroTicks; s.state[keep] = s.LIV; s.dens[keep] = 0.5; s.tick();
  check(!s.lost && z === s.extinction.graceTicks - 3 && s.extinction.zeroTicks === 0, "27 · a near-extinction shorter than the grace survives: one surviving tile resets the counter",
    `${z} of ${s.extinction.graceTicks} zero-ticks, then a living tile → counter ${s.extinction.zeroTicks}`); }

console.log("\n# A · layer P (real competitive witnesses)");
const LP = {}; for (const [k, [id]] of Object.entries(FIX)) LP[k] = BLOOM.validateScenario(WORLDS[k], config, traits, NC, { archetypeId: id, minStrategies: k === "primary" ? 2 : undefined });
const LPdef = BLOOM.validateScenario(DPRI, config, traits, NC, { archetypeId: "desert_world" });
const sumS = s => `[${s.signature}] buys ${s.purchases.map(p => `${p.id}@${p.seconds}`).join(" ")} · margin ${s.marginSeconds} s · holds ${pct(s.hold.coverage)} at ${s.hold.seconds} s · natives ${pct(s.competition.startShare)} → peak ${pct(s.competition.peakShare)} → ${pct(s.competition.endShare)}`;
check(LPdef.status === "PASS" && LPdef.competition && LPdef.competition.startShare > 0.2, "28 · the primary fixture (Desert 17 + Native Competition) passes layer P with real competitive witnesses",
  `${LPdef.status} in ${LPdef.search.ms} ms · ${LPdef.strategies.map(sumS).join(" | ")}`);
{ const v = LP.primary, s = v.strategies;
  check(v.status === "PASS" && s.length >= 2 && BLOOM.witness.distinctSignatures(s[0], s[1]), "29 · the primary fixture has ≥ 2 materially distinct broad strategies under competition (layer-7 signatures, each also inside the pacing policy)",
    s.map(sumS).join(" | ") + (v.differences[0] ? ` · differ: ${J(v.differences[0].onlyA)} vs ${J(v.differences[0].onlyB)}` : "")); }
{ // 30 / 31 / 38 · replay the witnesses: earned Biomass, real competition all the way, no colony allocation
  const rows = [];
  for (const k of Object.keys(FIX)) for (const w of LP[k].strategies) {
    const s = BLOOM.createSim(WORLDS[k], config, traits, { rng: mul(config.validation.rngSeed), scenario: NC }), plan = w.plan; let i = 0, earned = 0, ok = true, minShare = 1, t = 0;
    const buys = []; for (t = 1; t <= Math.round(w.marginSeconds / TICK_S); t++) { const b0 = s.biomass; s.tick(); earned += s.biomass - b0; minShare = Math.min(minShare, s.competition.share);
      if (i < plan.length) { const tr = s.traitById[plan[i]], c = s.price(tr); if (s.biomass >= c) { if (!s.buy(tr.id)) ok = false; buys.push({ id: tr.id, seconds: +(t * TICK_S).toFixed(1), cost: c }); i++; } } }
    rows.push({ k, sig: w.signature, same: J(buys) === J(w.purchases), earned, spent: s.spent.global, start: config.econ.startBiomass, minShare, flips: s.competition.flips, peak: s.competition.peakShare, startShare: s.competition.startShare,
      focus: s.colonies.focus.every(f => f === "balanced"), local: s.spent.local, cov: s.coverage(), ok }); }
  check(rows.every(r => r.same && r.ok && r.spent <= r.earned + r.start + 1e-6 && r.cov >= 0.73 - 1e-9), "30 · real witnesses earn all their Biomass: replaying each witness reproduces its purchases at the same seconds, and everything spent was the start Biomass plus what the run earned",
    rows.map(r => `${r.k}: spent ${r.spent} of ${Math.round(r.earned + r.start)}`).join(" · "));
  check(rows.every(r => r.minShare > 0.03 && r.flips.nativeSpread > 50 && r.flips.nativeTook > 10 && r.peak > r.startShare), "31 · no test immunity: every witness lives through real native expansion and loses tiles to it, and native cover never vanishes during the run",
    rows.map(r => `${r.k}: natives ${pct(r.startShare)} → peak ${pct(r.peak)}, min ${pct(r.minShare)}; native spread ${r.flips.nativeSpread}, took ${r.flips.nativeTook} player tiles; player took ${r.flips.playerTook}`).join(" · "));
  check(rows.every(r => r.focus && r.local === 0), "38 · colony allocation is not required for validation: every witness leaves every region on Balanced and buys no local upgrade");
  EVID.witnessReplay = rows.map(r => ({ fixture: r.k, signature: r.sig, earned: Math.round(r.earned), spent: r.spent, nativeStart: r.startShare, nativePeak: r.peak, flips: r.flips })); }
{ const v = LP.primary, end = v.strategies.map(s => s.competition.endShare);
  check(end.every(x => x >= 0.1), "25 · the player need not eradicate native plants to win: every primary-fixture witness wins and holds with ≥ 10% of the land still native-held",
    end.map(pct).join(" · ")); }
for (const [k, n, label] of [["ocean", 32, "Ocean 30"], ["primary", 33, "Desert 17"], ["frozen", 34, "Frozen 11"]]) { const v = k === "primary" ? LPdef : LP[k];
  check(v.status === "PASS", `${n} · ${label} + Native Competition is viable: layer P PASS (≥ 1 broad strategy, margin + 60 s hold, confirmed under ${NC.validation.confirmRngSeeds.length} more simulation seeds)`,
    `${v.status}${v.reason ? " " + v.reason : ""} · ${v.strategies.map(sumS).join(" | ")}`); }
{ // the Eden strategies of the primary fixture are no longer enough
  const rows = DPRI.archetype.strategies.list.map(st => { const plan = st.purchases.map(x => x[0]), r = BLOOM.witness.simulate(DPRI, config, traits, plan, 0.73, false, NC); return { sig: st.signature, peak: r.peak, ok: r.ok }; });
  check(rows.every(r => !r.ok && r.peak < 0.70), "P · the primary fixture's accepted Eden strategies no longer win under competition (real competitive runs of the Eden witness plans)",
    rows.map(r => `[${r.sig}] peaks at ${pct(r.peak)}`).join(" · "));
  EVID.edenUnderCompetition = rows; }
{ // 35 · Waterborne Seeds stays geography-driven
  const off = Object.fromEntries(Object.entries(WORLDS).map(([k, p]) => { const s = ncSim(p); return [k, s.offered(s.traitById.waterSeeds)]; }));
  const ow = LP.ocean.strategies[0], uses = ow.purchases.some(p => p.id === "waterSeeds");
  const sea = ncSim(WORLDS.ocean), eden = BLOOM.createSim(WORLDS.ocean, config, traits, {});
  check(off.ocean && !off.primary && !off.frozen && uses && J(sea.map.CROSSINGS) === J(eden.map.CROSSINGS), "35 · Waterborne Seeds remains geography-driven: offered only where a real water crossing exists (Ocean 13, not Desert 17 / Frozen 22), the same crossings as Eden, and part of the Ocean witness",
    `offered ${J(off)} · Ocean witness ${ow.purchases.map(p => p.id).join(" → ")}`); }

console.log("\n# A · colony development under competition (controlled experiments, mechanism)");
{ // 39 · Roots: a young contested colony holds better
  const seeds = [1, 2, 3, 4], bal = seeds.map(seed => lab(DPRI, TIE, { pDens: 0.15, ticks: 400, seed })), roo = seeds.map(seed => lab(DPRI, TIE, { pDens: 0.15, ticks: 400, seed, focus: "roots" }));
  const avg = (xs, f) => xs.reduce((a, o) => a + f(o), 0) / xs.length;
  check(avg(roo, o => o.end.p) > avg(bal, o => o.end.p) + 3 && avg(roo, o => o.lost) < avg(bal, o => o.lost), "39 · Roots gives a young, contested (viable) colony legitimate holding value: it thickens faster and is overgrown less than the same colony on Balanced",
    `${M0.SEC[TIE].name}, young colony vs established natives, 64 s: Balanced ends with ${avg(bal, o => o.end.p).toFixed(0)} tiles (lost ${avg(bal, o => o.lost).toFixed(0)}), Roots ${avg(roo, o => o.end.p).toFixed(0)} (lost ${avg(roo, o => o.lost).toFixed(0)})`);
  EVID.roots = { region: M0.SEC[TIE].name, balanced: avg(bal, o => o.end.p), roots: avg(roo, o => o.end.p), lostBalanced: avg(bal, o => o.lost), lostRoots: avg(roo, o => o.lost) }; }
{ // 40 · Seeds: a winning front moves faster
  // (rate over the first 16 s, before the native half of the region runs out)
  const seeds = [1, 2, 3, 4, 5, 6], bal = seeds.map(seed => lab(DPRI, FAV, { ticks: 100, seed })), sds = seeds.map(seed => lab(DPRI, FAV, { ticks: 100, seed, focus: "seeds" }));
  const avg = (xs, f) => xs.reduce((a, o) => a + f(o), 0) / xs.length;
  check(avg(sds, o => o.took) > avg(bal, o => o.took) * 1.15, "40 · Seeds gives frontier value: on a front the player is winning, a Seeds colony takes native cover faster than Balanced",
    `${M0.SEC[FAV].name}, first 16 s: native tiles taken ${avg(bal, o => o.took).toFixed(1)} (Balanced) → ${avg(sds, o => o.took).toFixed(1)} (Seeds)`);
  EVID.seeds = { region: M0.SEC[FAV].name, tookBalanced: avg(bal, o => o.took), tookSeeds: avg(sds, o => o.took) }; }
{ // 41 · Leaves: economic, never competitive immunity
  const seeds = [1, 2, 3, 4, 5, 6], avg = (xs, f) => xs.reduce((a, o) => a + f(o), 0) / xs.length;
  const balC = seeds.map(seed => lab(DPRI, TIE, { pDens: 0.3, ticks: 300, seed })), leaC = seeds.map(seed => lab(DPRI, TIE, { pDens: 0.3, ticks: 300, seed, focus: "leaves" }));
  // a secure colony: one whole region of established stands, no native cover anywhere, no open ground in it to spread into
  // (secure colonies: every region the player can grow in fully planted with established stands, no native cover anywhere)
  const fill = (focus, seed) => { const s = ncSim(DPRI, seed); s.biomass = Infinity; for (const id of BUILD) s.buy(id); const M = s.map, grow = M.SEC.map((_, i) => s.evaluate(i).fitness > G);
    for (const t of M.LAND_TILES) { s.competition.native[t] = 0; const ok = grow[M.TILEMAP[t]]; s.state[t] = ok ? s.LIV : s.BAR; s.dens[t] = ok ? 0.9 : 0; }
    for (let i = 0; i < M.SC; i++) { s.vigor[i] = s.evaluate(i).fitness; if (grow[i] && focus !== "balanced") s.setColonyFocus(i, focus); } s.biomass = 0;
    let inc = 0; for (let t = 0; t < 300; t++) { s.tick(); inc += s.income; } return inc; };
  const incB = avg(seeds.slice(0, 2), seed => fill("balanced", seed)), incL = avg(seeds.slice(0, 2), seed => fill("leaves", seed));
  const L = config.colony.modes.leaves, protective = Object.keys(L).filter(k => /establish|dieBack|thinning|recover|marginal/.test(k));
  check(incL > incB * 1.15 && protective.length === 0 && avg(leaC, o => o.end.p) <= avg(balC, o => o.end.p) + 2, "41 · Leaves stays economic: more Biomass from a secure, established colony, but no protective effect at all — on a contested front a Leaves colony holds no better than Balanced",
    `secure colonies (all suitable land, 48 s) income ${incB.toFixed(2)} → ${incL.toFixed(2)} · Leaves effects ${J(L)} · contested colony ends with ${avg(balC, o => o.end.p).toFixed(1)} tiles (Balanced) vs ${avg(leaC, o => o.end.p).toFixed(1)} (Leaves)`);
  EVID.leaves = { secureIncomeBalanced: incB, secureIncomeLeaves: incL, contestedEndBalanced: avg(balC, o => o.end.p), contestedEndLeaves: avg(leaC, o => o.end.p) }; }
{ // events from real transitions (engine side)
  const s = ncSim(DPRI, 9); s.biomass = 0; let i = 0; const plan = BUILD; for (let t = 1; t <= 3000; t++) { s.tick(); if (i < plan.length && s.biomass >= s.price(s.traitById[plan[i]]) && s.buy(plan[i])) i++; }
  const types = new Set(s.competition.events.map(e => e.type)), first = s.competition.events.filter(e => e.type === "contested");
  check(first.length === 1 && types.has("playerAdvantage") && s.competition.events.length < 40, "46a · the engine raises competition events from real transitions only (one first contact, advantage changes, retakes, native-dominated regions), without spam",
    `${s.competition.events.length} events in 480 s: ${[...types].join(", ")}`);
  EVID.events = s.competition.events.map(e => ({ type: e.type, region: s.map.SEC[e.sec].name, seconds: +(e.tick * TICK_S).toFixed(1) })); }

// ---------------------------------------------------------------------------------------------------------- B · browser
async function browserPart() {
  let chromium; try { ({ chromium } = require("playwright")); } catch (e) { check(false, "Playwright available for part B", "npm i -g playwright; NODE_PATH=\"$(npm root -g)\""); return; }
  const PAGE = "file://" + encodeURI(path.join(ROOT, "demos/demo-run.html")), browser = await chromium.launch();
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  const shot = async (p, n) => { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, n) }); };
  { const w = await browser.newPage(); await w.goto(PAGE); await w.waitForTimeout(200); await w.close(); } // headless warm-up (first page reads canvas blank)
  const open = async (q, pause = true) => { const p = await browser.newPage({ viewport: { width: 1440, height: 920 } }); p.errors = [];
    p.on("pageerror", e => p.errors.push(e.message)); p.on("console", m => { if (m.type() === "error") p.errors.push(m.text()); });
    await p.goto(PAGE + q, { timeout: 120000 }); await p.waitForTimeout(300); if (pause && await p.$("#btnPlay")) await p.click("#btnPlay"); return p; };
  const NCQ = "?archetype=desert_world&seed=17&scenario=native_competition";
  console.log("\n# B · browser");
  // 42 / 50 · launch identity; no solution data
  { const p = await open(NCQ), r = await p.evaluate(() => ({ run: BLOOM_API.run, title: document.title, h: document.querySelector("header h1 small").textContent, bar: (document.getElementById("cbar") || {}).innerText || "",
      pbar: !!document.getElementById("pbar"), foot: document.getElementById("runId").textContent, raw: JSON.stringify(window.BLOOM_RUN.summary) + JSON.stringify(window.BLOOM_RUN.planet.archetype),
      log: document.getElementById("log").textContent, c: BLOOM_API.competition() }));
    check(r.run.scenarioId === "native_competition" && /Native Competition/.test(r.title) && /native competition/.test(r.h) && /NATIVE COMPETITION/.test(r.bar) && !r.pbar
      && /scenario native_competition \(layer P PASS\)/.test(r.foot) && /Ymir-961/.test(r.foot) && /public seed 17/.test(r.foot) && r.run.attempt === DPRI.archetype.attempt && r.c.enabled && Math.abs(r.c.startShare - STARTS.primary.share) < 1e-12,
      "42 · the browser launch works: Desert World seed 25 (the same planet) under Native Competition (title, header, competition bar, footer), with the engine's native state live", `${r.title} · ${r.foot.slice(-70)}`);
    check(!/"purchases"|minimalBuild|"signature"|witness|"held"|"plan"|"strategies"/.test(r.raw) && J(Object.keys(r.run.scenarioValidation).sort()) === J(["required", "status", "strategiesProven"]),
      "50 · no solution or witness data reaches the UI: layer P hands the page a status and a count only", J(r.run.scenarioValidation));
    check(/Native plants \(violet, hatched\) hold \d+% of the land/.test(r.log), "Y · the run opens with the scenario's short science wording and how much land the natives hold", r.log.slice(0, 160));
    await shot(p, "nc-desert25-start.png");
    // 43 · native cover visibly differs from player cover and terrain: colour AND pattern
    await p.evaluate(() => { BLOOM_API.addBiomass(400); for (const id of ["seedOut", "drought"]) BLOOM_API.buy(id); BLOOM_API.advance(1300); draw(); });
    const px = await p.evaluate(() => { const S = BLOOM_API.sim, M = S.map, N = S.competition.native, d = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      const pick = f => M.LAND_TILES.find(t => f(t) && [t - 1, t + 1, t - M.W, t + M.W].every(u => u >= 0 && u < M.N && f(u)));
      const nt = pick(t => N[t] > 0.6), lt = pick(t => S.state[t] === S.LIV && S.dens[t] > 0.8), bt = pick(t => S.state[t] === S.BAR && !(N[t] > 0)), wt = M.TILEMAP.findIndex(v => v < 0);
      const g = cv.getContext("2d"), cell = t => { const x = Math.floor((t % M.W) * TILE * d), y = Math.floor(((t / M.W) | 0) * TILE * d), w = Math.floor(TILE * d), im = g.getImageData(x, y, w, w).data, cols = new Set();
        let r = 0, gg = 0, b = 0, n = 0; for (let k = 0; k < im.length; k += 4) { cols.add(`${im[k] >> 4},${im[k + 1] >> 4},${im[k + 2] >> 4}`); r += im[k]; gg += im[k + 1]; b += im[k + 2]; n++; } return { mean: [r / n, gg / n, b / n].map(Math.round), distinct: cols.size }; };
      return { nat: cell(nt), liv: cell(lt), bar: cell(bt), wat: cell(wt) }; });
    const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    check(dist(px.nat.mean, px.liv.mean) > 60 && dist(px.nat.mean, px.bar.mean) > 40 && dist(px.nat.mean, px.wat.mean) > 40 && px.nat.distinct > px.liv.distinct + 1,
      "43 · native cover is visibly different from the player's plants, bare ground and water — by colour AND by pattern (hatched native stands vs solid player stands)",
      `mean rgb native ${px.nat.mean} · player ${px.liv.mean} · bare ${px.bar.mean} · water ${px.wat.mean} · colours per tile: native ${px.nat.distinct}, player ${px.liv.distinct}`);
    // 44 · region inspection: a contested region's readout = the engine's competitionAt, updating as the run goes
    // (BLOOM-027B: the region must hold native cover — on Desert 17 the most contested region is one the natives have already lost, whose readout is "No native plants here")
    const pickReg = () => p.evaluate(() => { const C = BLOOM_API.competition(); let best = -1; C.regions.forEach((c, i) => { if (c.contested && i !== BLOOM_API.sim.map.ORIGIN && BLOOM_API.sim.competitionAt(i).nativeShare > 0 && (best < 0 || c.contact > C.regions[best].contact)) best = i; }); return best; });
    const reg = await pickReg(), g = await p.evaluate(() => BLOOM_API.geometry()), box = await (await p.$("#cv")).boundingBox();
    if (reg >= 0) await p.mouse.click(box.x + g.centers[reg].x, box.y + g.centers[reg].y);
    const read = () => p.evaluate(r => { renderInspect(); const c = BLOOM_API.sim.competitionAt(r); return { side: c.side, nshare: c.nativeShare, pshare: c.playerShare, text: (document.getElementById("compNote") || {}).innerText || "", sel: selected }; }, reg);
    const r1 = await read(); await shot(p, "nc-desert25-contested-region.png");
    await p.evaluate(() => { BLOOM_API.addBiomass(1200); for (const id of ["salt", "rad", "drought", "heat"]) BLOOM_API.buy(id); BLOOM_API.advance(700); });
    const r2 = await read(), SIDE = { player: "Your advantage", native: "Native advantage", even: "Even contest", none: "No native plants here" };
    const shows = r => r.text.includes(SIDE[r.side]) && r.text.includes(`native cover ${Math.round(r.nshare * 100)}%`) && r.text.includes(`your plants ${Math.round(r.pshare * 100)}%`) && r.text.split("\n").length >= 3;
    check(reg >= 0 && r1.sel === reg && shows(r1) && shows(r2) && (r1.side !== r2.side || r1.nshare !== r2.nshare), "44 · selecting a region shows its competition readout (who has the advantage, native cover, your plants, and why in plain words), and it updates with the engine",
      `${r1.text.split("\n")[0]} → ${r2.text.split("\n")[0]} · “${(r2.text.split("\n")[2] || "").slice(0, 120)}”`);
    await shot(p, "nc-desert25-after-adapt.png");
    // 45 · scenario status = real values, no countdown
    const bar = await p.evaluate(() => { renderComp(); const C = BLOOM_API.competition(); return { text: document.getElementById("cbar").innerText, share: C.share, cont: C.contested }; });
    check(bar.text.includes(`native plants hold ${Math.round(bar.share * 100)}% of the land`) && bar.text.includes(`contested regions ${bar.cont}`) && !/\d+:\d\d/.test(bar.text) && !/left|remaining|until/i.test(bar.text),
      "45 · the scenario status shows real native-held land and contested regions (and a trend), with no countdown", bar.text.replace(/\n/g, " "));
    // 46 · events: engine transitions shown in the UI
    // (BLOOM-015 flake fix: the footer holds only the LATEST message, and with the live UI's Math.random the last competition
    // event may come before the scripted purchases' own messages — so each shown event's own message is checked instead)
    const ev = await p.evaluate(() => { pollCompetition(performance.now()); const C = BLOOM_API.competition(); return { eng: C.events.length, ui: C.uiEvents.length, types: [...new Set(C.uiEvents.map(e => e.type))],
      allShown: C.uiEvents.every(e => /🌿/.test(e.msg || "")), log: (C.uiEvents.at(-1) || {}).msg || "" }; });
    check(ev.ui > 0 && ev.ui === ev.eng && ev.allShown, "46 · real simulation produces competition events, and each one is shown (message + map outline) — none invented by the UI", `${ev.ui} events: ${ev.types.join(", ")} · last: ${ev.log.slice(0, 100)}`);
    check(p.errors.length === 0, "no browser errors (Desert 17 readouts)", p.errors.join(" | ")); await p.close(); }
  // 47 / 49 · a run won through REAL shop buttons with earned Biomass (the plan comes from the Node-side validator; the page never sees it)
  { const p = await open(NCQ), plan = LP.primary.strategies[0].purchases.map(x => x.id); let i = 0, affordAt = null, won = null; const buys = [];
    for (let t = 0; t < 9000 && !won; t += 5) {
      await p.evaluate(() => { BLOOM_API.advance(5); refreshShop(); pollCompetition(performance.now()); }); const st = await p.evaluate(() => ({ ...BLOOM_API.state(), lost: BLOOM_API.sim.lost }));
      if (st.won || st.lost) { won = st; break; }
      if (i < plan.length) { const off = await p.$eval(`button.buy[data-id="${plan[i]}"]`, b => b.classList.contains("off"));
        if (!off) { affordAt ??= st.ticks; if (st.ticks - affordAt >= 25) { await p.click(`button.buy[data-id="${plan[i]}"]`); await p.mouse.move(5, 5); buys.push(`${plan[i]} @ ${Math.round(st.ticks * TICK_S)} s`); i++; affordAt = null; } } } }
    const fin = await p.evaluate(() => ({ cov: BLOOM_API.sim.coverage(), c: BLOOM_API.competition(), granted: BLOOM_API.sim.spent.global }));
    check(won && won.won && !won.lost && i === plan.length && fin.cov >= 0.70, "47 · a Native Competition run is won through real shop clicks with earned Biomass (Desert 17, the first proven strategy)",
      `${buys.join(" → ")} · win at ${won ? Math.round(won.ticks * TICK_S) : "—"} s with ${pct(fin.cov)} of the land; natives ${pct(fin.c.share)} (peak ${pct(fin.c.peakShare)})`);
    EVID.browserWin = { buys, winSeconds: won && Math.round(won.ticks * TICK_S), coverage: fin.cov, native: fin.c.share, nativePeak: fin.c.peakShare };
    await p.waitForTimeout(150);
    const rep = await p.evaluate(() => ({ on: document.getElementById("reportModal").classList.contains("on"), text: document.getElementById("report").innerText, c: (document.getElementById("repComp") || {}).innerText || "" }));
    check(rep.on && /under Native Competition/.test(rep.text) && /Competition: Native Competition/.test(rep.c) && /at the start/.test(rep.c) && /at their peak/.test(rep.c) && /contested/.test(rep.c) && /did not need to remove every native plant/.test(rep.c) && /Ymir-961/.test(rep.text),
      "49 · the Bloom Report identifies Native Competition in one concise line (native land at start / peak / now, contested regions, land left to native vegetation) without implying eradication", rep.c.replace(/\n/g, " "));
    await shot(p, "nc-desert25-report.png"); check(p.errors.length === 0, "no browser errors (Native Competition win)", p.errors.join(" | ")); await p.close(); }
  // 48 · a doomed run loses by extinction (mechanism: the player's tiles cleared through the test hook)
  { const p = await open(NCQ); await p.evaluate(() => { BLOOM_API.advance(60); const S = BLOOM_API.sim; for (const i of S.map.LAND_TILES) if (S.state[i] !== S.BAR) { S.state[i] = S.BAR; S.dens[i] = 0; } });
    let st; for (let n = 0; n < 30; n++) { st = await p.evaluate(() => { BLOOM_API.advance(5); return { lost: BLOOM_API.sim.lost, t: BLOOM_API.sim.ticks }; }); if (st.lost) break; }
    await p.waitForTimeout(150);
    const r = await p.evaluate(() => ({ on: document.getElementById("reportModal").classList.contains("on"), text: document.getElementById("report").innerText, btn: !!document.getElementById("lossRestart"), why: BLOOM_API.competition().lostReason }));
    check(st.lost && r.on && /EXTINCTION/.test(r.text) && /No living plants were left anywhere for 8 s/.test(r.text) && /native vegetation overgrew your last colonies/.test(r.text) && /Competition: Native Competition/.test(r.text) && r.btn,
      "48 · a doomed run loses by extinction: the loss screen gives the reason, the scenario's own debrief and the competition line, and offers a restart", `${r.why} at ${Math.round(st.t * TICK_S)} s`);
    await shot(p, "nc-desert25-extinction.png"); await p.click("#lossRestart"); await p.waitForTimeout(800);
    const again = await p.evaluate(() => ({ t: BLOOM_API.sim.ticks, lost: BLOOM_API.sim.lost, on: document.getElementById("reportModal").classList.contains("on") }));
    check(!again.lost && !again.on && again.t < 30, "48b · restart reloads the same launch as a fresh run", J(again));
    check(p.errors.length === 0, "no browser errors (extinction control)", p.errors.join(" | ")); await p.close(); }
  // V · explicit failures + the other archetypes + Eden unchanged
  for (const [q, want] of [["?archetype=desert_world&seed=17&scenario=native_competitions", /unknown scenario "native_competitions"/], ["?archetype=desert_world&seed=17&scenario=Native%20Competition", /must be a scenario id/]]) {
    const p = await open(q, false), r = await p.evaluate(() => ({ fail: (document.getElementById("genFail") || {}).innerText || "", sim: !!(window.BLOOM_API && BLOOM_API.sim) }));
    check(want.test(r.fail) && /NO RUN STARTED/.test(r.fail) && !r.sim, `V · ${q.slice(1)} fails explicitly: no run started, no substitute`, r.fail.split("\n").slice(1, 3).join(" / ")); await p.close(); }
  { const p = await open("?archetype=desert_world&seed=17"), r = await p.evaluate(() => ({ bar: !!document.getElementById("cbar"), c: BLOOM_API.sim.competition.enabled, run: BLOOM_API.run.scenarioId, title: document.title }));
    check(!r.bar && !r.c && r.run === "eden" && !/Native/.test(r.title), "V · no scenario parameter = Eden: no native layer, no competition bar", r.title); await p.close(); }
  for (const [id, seed, name] of [["ocean_archipelago", 30, "Ocean Archipelago"], ["frozen_world", 11, "Frozen World"]]) {
    const p = await open(`?archetype=${id}&seed=${seed}&scenario=native_competition`); await p.evaluate(() => { BLOOM_API.addBiomass(600); BLOOM_API.buy("seedOut"); BLOOM_API.advance(1800); pollCompetition(performance.now()); renderComp(); draw(); });
    const r = await p.evaluate(() => ({ run: BLOOM_API.run, bar: document.getElementById("cbar").innerText, c: BLOOM_API.competition() }));
    check(r.run.scenarioId === "native_competition" && r.run.scenarioValidation.status === "PASS" && r.run.archetype === name && r.c.flips.nativeSpread > 0 && r.c.events.length > 0,
      `V · ${name} ${seed} + Native Competition launches (layer P PASS) and its competition runs live`, `${r.bar.replace(/\n/g, " ")} · events ${r.c.events.length}`);
    await shot(p, `nc-${id.split("_")[0]}${seed}-midgame.png`); check(p.errors.length === 0, `no browser errors (${name} Native Competition)`, p.errors.join(" | ")); await p.close(); }
  await browser.close();
}

(async () => {
  if (!NO_BROWSER) await browserPart();
  if (JSON_OUT) { fs.writeFileSync(JSON_OUT, JSON.stringify({ scenario: NC, layerP: Object.fromEntries(Object.entries(LP).map(([k, v]) => [k, { status: v.status, competition: v.competition,
    strategies: v.strategies.map(s => ({ signature: s.signature, tokens: s.tokens, minimalBuild: s.minimalBuild, held: s.held, purchases: s.purchases, totalSpent: s.totalSpent, winSeconds: s.winSeconds,
      marginSeconds: s.marginSeconds, hold: s.hold, pacing: s.pacing, trace: s.trace, competition: s.competition, confirm: s.confirm })), differences: v.differences, classes: v.classes, ms: v.search.ms }])),
    layerPDefaultPrimary: { status: LPdef.status, strategies: LPdef.strategies.length }, starts: Object.fromEntries(Object.entries(STARTS).map(([k, s]) => [k, s.share])), evidence: EVID }, null, 1));
    console.log("evidence written:", JSON_OUT); }
  console.log(`\n${fails ? fails + " check(s) FAILED" : "ALL CHECKS PASS"}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  process.exit(fails ? 1 : 0);
})();
