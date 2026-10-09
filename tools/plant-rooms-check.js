// BLOOM — production decision rooms checks (BLOOM-029C: Region Inspect · Adapt · Spread). The 26th regression suite.
//
//   NODE_PATH="$(npm root -g)" node tools/plant-rooms-check.js [--browsers chromium,firefox] [--evidence]
//
// Node: the branch starts at the accepted 029B tip 2750cbb; content/traits.js carries the exact PMO presentation categories and the
// mechanics never read them (same prices, availability, previews and seeded runs with the field stripped); the room sources read
// no page global, roll no dice, import no Concept 18 mockup file / region / placeholder node, reuse the ONE production map
// renderer (no second mini-map renderer), use the organic treatment only, call no transition, no coach (Terraform is the fourth room since 029D);
// the adapter stays api 1 with its 10 events and the run page keeps every bloom:* dispatch with unchanged detail keys; the
// specimen draws every real Adapt / Spread trait visibly.
// Browser (static server on 127.0.0.1; Chromium 1280×800 / 1024×768 / 1440×900 + reduced motion; Firefox 1280×800): opening a room
// pauses the real run at once and remembers its state; Back restores, Resume runs, Escape closes; room → room stays paused with the
// same context; the Planet View keeps its exact geometry underneath, blurred / dimmed / inert; the home selection becomes the room
// context and is cleared; context changes emit no bloom:region-select; chips peek the mini-map; the mini-map is the 029B renderer;
// Region Inspect's tabs (ARIA + arrows), Overview = adapter.region, Would help = adapter.wouldHelp, Colony = the real actions and
// events, Science = the real raw readings; the trees hold exactly the offered real traits with the PMO categories and colours;
// hover / focus previews through actions.preview (bloom:upgrade-preview), every reset path clears; click buys through actions.buy
// (bloom:upgrade-purchase) and the specimen changes for good; tendril weights, no crossings, the anchor → plate → tendril → port →
// label chain; Spread shorter than Adapt; three median chips across; content-height cards; no horizontal scroll; touch targets;
// background not clickable or tabbable; training through the production rooms, deterministic; anchors re-homed; no external
// requests; no console errors. --evidence writes docs/evidence/bloom-029c/ (screenshots + measurements.json). Exits 1 on failure.
"use strict";
const path = require("path"), fs = require("fs"), http = require("http"), { execSync } = require("child_process");
const ROOT = path.resolve(__dirname, ".."), BASE_SHA = "2750cbb0363c3be27165196ea6325171442203eb";
const argv = process.argv, argOf = k => { const i = argv.indexOf(k); return i > 0 ? argv[i + 1] : null; };
const BROWSERS = (argOf("--browsers") || "chromium,firefox").split(","), EVIDENCE = argv.includes("--evidence");
const EVD = path.join(ROOT, "docs/evidence/bloom-029c");
const read = f => fs.readFileSync(path.join(ROOT, f), "utf8"), J = JSON.stringify, git = c => execSync("git " + c, { cwd: ROOT, encoding: "utf8" }).trim();
let fails = 0; const t0 = Date.now();
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); if (!ok) fails++; };
const info = (name, detail) => console.log(`INFO  ${name}  — ${detail}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const strip = src => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
const fnv = a => { let h = 0x811c9dc5; for (let i = 0; i < a.length; i++) { h ^= a[i] & 0xff; h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16); };
const MEAS = { generatedAt: new Date().toISOString(), base: BASE_SHA };
// (BLOOM-029E) this suite's own range: its base → the accepted BLOOM-029C final candidate 2d0fb08 while a later milestone is checked out on top
// (as tools/run-ui-check.js already does), so later work that legitimately touches these files never trips this milestone's scope guards;
// at or before 2d0fb08 the working tree is compared as before
const END_SHA = "2d0fb0899967db96bf23a3c17d4f78c9ab635f81";
const AT_END = (() => { try { return git(`merge-base --is-ancestor ${END_SHA} HEAD`) === "" && git("rev-parse HEAD") !== END_SHA; } catch { return false; } })();
const RANGE = AT_END ? `${BASE_SHA} ${END_SHA}` : BASE_SHA, untracked = () => AT_END ? [] : git("ls-files --others --exclude-standard").split("\n").filter(Boolean);
const EVTS = ["run-ready", "play-pause", "speed", "region-select", "upgrade-preview", "upgrade-purchase", "growth-focus", "local-upgrade", "bubble-collect", "win"];
// the 028D1 detail shapes (docs/TRAINING_FOUNDATION_v1.md §7), frozen
const SHAPES = { "run-ready": "planetId,kind,training,running", "play-pause": "running", speed: "speed", "region-select": "index,id,name,previous,water,tile", "upgrade-preview": "id,board,name,available,gain,lose,better,worse,reachHostile",
  "upgrade-purchase": "id,board,name,cost,tier,biomass", "growth-focus": "index,id,name,focus,previous,changed", "local-upgrade": "index,id,name,upgrade,upgradeName,cost", "bubble-collect": "how,tile,index,id,name,value", win: "coverage,ticks,planetId,training" };
const MAPPING = { rad: "Hazard", drought: "Water", flood: "Water", cold: "Temperature", heat: "Temperature", salt: "Soil", seedOut: "Seeds", earlyMat: "Growth", waterSeeds: "Reach" };
const PALETTE = { Hazard: "#8a5bb8", Water: "#3b8fd0", Temperature: "#d9601f", Soil: "#8a6a3e", Seeds: "#c58a1a", Growth: "#3f9d4b", Reach: "#1f8f8f" };
const hexToRgb = h => `rgb(${parseInt(h.slice(1, 3), 16)}, ${parseInt(h.slice(3, 5), 16)}, ${parseInt(h.slice(5, 7), 16)})`;

(async () => {
  // ================================================================ Node
  console.log("# Node");
  const head = git("rev-parse HEAD");
  check(git(`merge-base HEAD ${BASE_SHA}`) === BASE_SHA && git(`cat-file -t ${BASE_SHA}`) === "commit", "N1 · the branch starts from the accepted BLOOM-029B final candidate 2750cbb (not origin/main)",
    `HEAD ${head.slice(0, 7)} · ${git(`rev-list --count ${BASE_SHA}..HEAD`)} commit(s) since 2750cbb`);

  for (const f of ["content/config.js", "content/traits.js", "content/archetypes.js", "content/training.js", "planets/first_bloom.js", "planets/training_grounds.js", "resources/bloom-sim.js", "resources/bloom-gen.js",
    "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js", "content/scenarios.js", "resources/bloom-scenario.js", "resources/bloom-play.js", "resources/run-ui/run-ui-adapter.js",
    // (BLOOM-032C) the production specimen is an adapter over the accepted sprite runtime: load it first, as demos/demo-run.html does
    "resources/plant-visual/generated/plant-atlas.js", "resources/plant-visual/plant-visual-model.js", "resources/plant-visual/plant-components.js", "resources/plant-visual/plant-compositor.js", "resources/plant-visual/plant-fx.js",
    "resources/run-ui/plant-specimen.js", "resources/run-ui/decision-rooms.js"]) require(path.join(ROOT, f));
  const { BLOOM, BLOOM_DATA } = globalThis, { config, traits, archetypes } = BLOOM_DATA;

  // N2 · the exact PMO category mapping, presentation only
  { const got = Object.fromEntries(traits.filter(t => t.board !== "Terraform").map(t => [t.id, t.uiCategory])), tf = traits.filter(t => t.board === "Terraform" && !(t.uiBank === "Atmosphere" && ["Sky temperature", "Rain"].includes(t.uiCategory))); // (029D) the Terraform traits carry their own presentation metadata (tools/terraform-check.js N2)
    const mech = ["resources/bloom-sim.js", "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js", "resources/bloom-scenario.js", "resources/bloom-play.js", "resources/run-ui/run-ui-adapter.js"].filter(f => /uiCategory/.test(strip(read(f))));
    const sorted = o => J(Object.keys(o).sort().map(k => [k, o[k]]));
    check(sorted(got) === sorted(MAPPING) && !tf.length && J(mech) === J(["resources/run-ui/run-ui-adapter.js"]) && (strip(read("resources/run-ui/run-ui-adapter.js")).match(/uiCategory/g) || []).length === 2,
      "N2 · content/traits.js: the nine Adapt / Spread traits carry exactly the PMO-locked uiCategory (rad Hazard · drought / flood Water · cold / heat Temperature · salt Soil · seedOut Seeds · earlyMat Growth · waterSeeds Reach), the Terraform traits only their 029D Atmosphere bank metadata; no mechanic reads it (only the adapter copies it, once)",
      `${Object.entries(got).map(([k, v]) => `${k}→${v}`).join(" ")}${mech.length > 1 ? " · READ BY " + mech.join(", ") : ""}`); }
  // N2b · gameplay outputs unchanged with the field stripped: prices, rules, previews, seeded runs
  { const stripped = JSON.parse(J(traits)).map(t => { delete t.uiCategory; return t; });
    const worlds = [["first_bloom", BLOOM_DATA.planets.first_bloom], ["training_grounds", BLOOM_DATA.planets.training_grounds], ["ocean_28", BLOOM.generateFromArchetype(archetypes.find(a => a.id === "ocean_archipelago"), 28, { config, traits })]];
    let diffs = [];
    for (const [name, planet] of worlds) { const mk = tr => BLOOM.createSim(planet, config, tr, { rng: BLOOM.gen.mulberry32(11) }); const a = mk(traits), b = mk(stripped);
      const shop = s => traits.map(t => { const u = s.traitById[t.id]; return `${t.id}:${s.price(u)}/${s.canBuy(u)}/${s.ownedTier(u)}/${s.offered(u)}/${J(s.previewOf(t.id))}`; }).join("|");
      if (shop(a) !== shop(b)) diffs.push(name + " shop");
      a.biomass = b.biomass = 1e4; for (const id of ["cold", "drought", "seedOut", "seedOut", "earlyMat", "humid"]) { const x = a.buy(id), y = b.buy(id); if (x !== y) diffs.push(name + " buy " + id); }
      if (shop(a) !== shop(b)) diffs.push(name + " shop after buys");
      let ca = 0, cb = 0; for (let t = 0; t < 900; t++) { ca = a.tick(); cb = b.tick(); }
      if (ca !== cb || fnv(a.state) !== fnv(b.state) || fnv(new Uint8Array(a.dens.buffer)) !== fnv(new Uint8Array(b.dens.buffer)) || a.biomass !== b.biomass) diffs.push(name + " run"); }
    check(!diffs.length, "N2b · gameplay unchanged with uiCategory stripped from the traits: identical prices / rules / tiers / offered / previews, identical purchases and identical seeded 900-tick runs (state, density, Biomass, coverage) on First Bloom, Training Grounds and Ocean 28", diffs.join(", ") || "3 worlds identical"); }

  // N3 · scope
  { const changed = git(`diff --name-only ${RANGE}`).split("\n").filter(Boolean).concat(untracked());
    const allowed = p => p === "content/traits.js" || p === "demos/demo-run.html" || p.startsWith("resources/run-ui/") || p === "tools/plant-rooms-check.js" || p === "tools/planet-view-check.js" || p === "tools/terraform-check.js" || p.startsWith("docs/") || p === "README.md"; // (029D) + the Terraform suite
    const guarded = ["resources/planet-sphere/", "resources/planet-surface/", "resources/atmosphere-transition/", "resources/main-menu/", "resources/destination-survey/", "resources/training/", "resources/bloom-", "planets/", "index.html", "demos/ui-mockups/", "demos/main-menu.html", "demos/destination-survey.html", "demos/planet-sphere", "demos/atmosphere-transition.html", "content/config.js", "content/scenarios.js", "content/training.js", "content/archetypes.js", "content/play.js", "GAME_BIBLE.md"];
    const out = changed.filter(p => !allowed(p)), hit = changed.filter(p => guarded.some(g => p.startsWith(g)));
    check(!out.length && !hit.length, "N3 · scope: 029C changes only content/traits.js (metadata), the run page, resources/run-ui/, the two suites, docs / evidence and README — sphere, canonical surface, transition, menu, survey, training layer, engine, generator, validators, planets, config, scenarios and the mockups are untouched",
      `${changed.sort().join(", ")}${out.length ? ` · OUTSIDE: ${out.join(", ")}` : ""}`); }

  // N4 · the production room sources: truth from the adapter only, no mockup data, one map renderer, organic only, no Terraform / transition / coach
  const DR = read("resources/run-ui/decision-rooms.js"), PSP = read("resources/run-ui/plant-specimen.js"), DRC = read("resources/run-ui/decision-rooms.css"), drc = strip(DR), psc = strip(PSP);
  { const globals = /\b(BLOOM_RUN|BLOOM_API|BLOOM_DATA|BLOOM_TRAINING_UI|BLOOM_RUN_UI)\b|\bsim\.|getElementById\("(cv|hBio|hCov|hSky|btnPlay|btnSpeed|log|inspMain|shop)"\)|Math\.random/;
    const shared = read("demos/ui-mockups/shared.js"), c18 = read("demos/ui-mockups/c18.js");
    const fakeNames = [...shared.matchAll(/\{ id:'(\w+)', name:'([^']+)', terrain:/g)].map(m => m[2]).concat([...c18.matchAll(/future:true, name:'([^']+)'/g)].map(m => m[1]));
    const added = DR + "\n" + PSP + "\n" + DRC + "\n" + read("resources/run-ui/planet-view.js") + "\n" + read("resources/run-ui/planet-view.css") + "\n" + read("resources/run-ui/terraform-globe.js") + "\n"
      + git(`diff ${RANGE} -- demos/demo-run.html resources/run-ui/run-ui-adapter.js content/traits.js`).split("\n").filter(l => l.startsWith("+") && !l.startsWith("+++")).join("\n");
    const leaks = fakeNames.filter(n => added.includes(n)).concat(/ui-mockups|shared\.js|c18\.js|\bBM\.|future:|ROOMS2\d/.test(added.replace(/Concept 18['’]?s?|mockup file/g, "")) ? ["mockup reference"] : []);
    const renderer = /RM\.createRenderer\(|BLOOM\.runMap/.test(drc) && !/paintSurface|getImageData|fillRect|surfacePlanet|tilemap\[/.test(drc);
    const organicOnly = !/bridge|docked|socket|lane bay|data-link/i.test(drc + strip(DRC));
    // (029D) the Terraform room lives in decision-rooms.js too; the sphere is reached only through BLOOM.terraformGlobe (its guarded import lives in terraform-globe.js, not here)
    const noTf = !/PlanetSphereView|planet-sphere|AtmosphereTransition|atmosphere-transition|import\(/.test(drc + psc), noCoach = !/coach|spotlight|callout|director/i.test(drc + psc);
    const contract = /A\.actions\.preview\(/.test(drc) && /A\.actions\.buy\(/.test(drc) && !/previewOf\(/.test(drc) && /A\.actions\.setGrowthFocus\(/.test(drc) && /A\.actions\.buyLocalUpgrade\(/.test(drc) && !/actions\.selectRegion|actions\.selectTile/.test(drc);
    check(!globals.test(drc) && !globals.test(psc) && !leaks.length && renderer && organicOnly && noTf && noCoach && contract,
      "N4 · decision-rooms.js / plant-specimen.js read no page global and roll no dice; no Concept 18 mockup file, region or placeholder node in any 029C / 029D addition; the mini-map is BLOOM.runMap.createRenderer (no second terrain / tile drawing); organic is the only connector treatment; no direct sphere import, AtmosphereTransition or coach in the rooms; nodes preview through actions.preview and buy through actions.buy, colony through the real actions, and the rooms never select a home region",
      leaks.length ? "LEAKS " + leaks.join(", ") : `${DR.split("\n").length} + ${PSP.split("\n").length} lines scanned for ${fakeNames.length} mockup names`); }
  // N5 · the adapter and the run page's event contract
  { const ad = strip(read("resources/run-ui/run-ui-adapter.js")); const RU = BLOOM.runUI;
    const adAdded = git(`diff ${RANGE} -- resources/run-ui/run-ui-adapter.js`).split("\n").filter(l => /^\+[^+]/.test(l));
    const runBase = git(`show ${BASE_SHA}:demos/demo-run.html`), runAt = read("demos/demo-run.html");
    const sites = s => EVTS.map(t => [t, (s.match(new RegExp(`emit\\("${t}"`, "g")) || []).length]);
    const keysOf = s => EVTS.map(t => { const m = [...s.matchAll(new RegExp(`emit\\("${t}",\\s*\\{([^}]*)\\}`, "g"))].map(x => x[1].replace(/\s+/g, "")); return [t, m.join(" | ")]; });
    const same = J(sites(runBase)) === J(sites(runAt)) && J(keysOf(runBase)) === J(keysOf(runAt));
    // (029D) the adapter's later additions are the presentation-only uiBank copy, the sky preview shape, bandNames and terraformPreview (tools/terraform-check.js N5)
    check(RU.API_VERSION === 1 && RU.EVENTS.length === 10 && J(RU.EVENTS) === J(EVTS) && adAdded.every(l => /uiCategory|uiBank|BLOOM-029[CD]|skyShape|sky:|terraformPreview|bandNames|previewOf\(id\)|currentSurfaceSky|sim\.traitById\[id\]; if \(!u \|\| u\.effect\.type|^\+\s*\/\/|^\+\s*\}\s*$/.test(l)) && adAdded.length <= 24 && same && (runAt.match(/biomass\s*\+=/g) || []).length === 1,
      "N5 · the adapter stays api 1 with the 10 events and its additions are presentation copies / read-only seams (uiCategory, uiBank, the preview's sky, bandNames, terraformPreview); the run page keeps every bloom:* dispatch site with exactly the same detail keys as 2750cbb (the ten shapes unchanged) and one Biomass grant",
      `adapter +${adAdded.length} line(s) · dispatch sites ${sites(runAt).map(([t, n]) => `${t} ${n}`).join(", ")}`); }
  // N6 · Concept 18 constants in the production rooms equal the accepted ones
  { const D = BLOOM.decisionRooms;
    const tend = J(D.TENDRIL) === J({ idle: [0.52, 8.5], lit: [0.8, 12.5], glow: 1.9, vein: [0.12, 2] }), cols = Object.entries(PALETTE).every(([c, h]) => D.CAT_COLOR[c][0] === h);
    const order = J(D.CATS.Adapt) === J(["Hazard", "Water", "Temperature", "Soil"]) && J(D.CATS.Spread) === J(["Seeds", "Growth", "Reach"]); // (029D adds CATS.Terraform: tools/terraform-check.js N6)
    const parts = J(Object.fromEntries(Object.entries(D.CAT_PART).map(([k, v]) => [k, v[1]]))) === J({ Hazard: "Leaf pigment", Water: "Leaf shape", Temperature: "Stem", Soil: "Roots", Seeds: "Seed head", Growth: "Flowers", Reach: "Pods" });
    check(tend && cols && order && parts, "N6 · the rooms carry the accepted Concept 18 constants: tendril weights (idle .52em ≥ 8.5 px · lit .8em ≥ 12.5 px · glow 1.9× · vein .12em ≥ 2 px), the category palette, the top → bottom category order and the anatomy anchors (Hazard → Leaf pigment · Water → Leaf shape · Temperature → Stem · Soil → Roots · Seeds → Seed head · Growth → Flowers · Reach → Pods)", J(D.TENDRIL)); }
  // N7 · the production specimen: pure, and every real trait changes the drawing (tiers scale it)
  { const P = BLOOM.plantSpecimen, base = { traits: {}, colony: { living: true, establishment: 0.5, word: "establishing" }, focus: "balanced", local: null, condition: "ok", viable: true };
    // (BLOOM-032C) the specimen draws the Organic Hybrid organism (pixels; draw().sig), not 029C SVG markup. A preview is the accepted GHOST /
    // OUTLINE whose proposed organism is EXACTLY the next tier (docs/PRODUCTION_PLANT_INTEGRATION_v1.md §3), no longer the owned drawing itself.
    const draw = st => P.draw(st).sig, b0 = draw(base), b1 = draw(base), sigs = {}; let allDiffer = true;
    for (const id of Object.keys(MAPPING)) { const s1 = draw({ ...base, traits: { [id]: 1 } }), s2 = draw({ ...base, traits: { [id]: 2 } }); sigs[id] = s1; if (s1 === b0 || (s2 === s1 && ["cold", "heat", "drought", "flood", "seedOut"].includes(id))) allDiffer = false; }
    const distinct = new Set(Object.values(sigs)).size === Object.keys(sigs).length;
    const pvD = P.draw({ ...base, preview: { id: "cold", tier: 1 } }), pv = pvD.previewing && pvD.target.sig.full === P.draw({ ...base, traits: { cold: 1 } }).frame.sig.full && pvD.sig !== b0;
    const colony = draw({ ...base, focus: "roots" }) !== b0 && draw({ ...base, focus: "leaves", local: "leafCanopy" }) !== b0 && draw({ ...base, condition: "bad" }) !== b0;
    const anchors = P.draw(base).anchors, ordA = ["pigment", "leafShape", "stem", "roots"].map(k => anchors[k].y), ordS = ["seedHead", "flowers", "pods"].map(k => anchors[k].y);
    const mono = a => a.every((v, i) => !i || v > a[i - 1]);
    check(b0 === b1 && allDiffer && distinct && pv && colony && mono(ordA) && mono(ordS) && !/Math\.random/.test(psc),
      "N7 · plant-specimen.draw is deterministic; each of the nine real traits changes the drawing (and multi-tier traits change again at tier 2), all nine differ from each other; a preview of a trait shows the ghost / outline of exactly its next tier (BLOOM-032C); growth focus / local upgrade / condition show; anchors run top → bottom in category order", `anchors Adapt y ${ordA.map(Math.round).join(" < ")} · Spread y ${ordS.map(Math.round).join(" < ")}`); }

  // ================================================================ browser
  console.log("# Browser");
  let pw = null; try { pw = require("playwright"); } catch { check(false, "Playwright available (NODE_PATH=\"$(npm root -g)\")", "require('playwright') failed"); }
  const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".json": "application/json", ".svg": "image/svg+xml", ".webp": "image/webp", ".jpg": "image/jpeg" };
  const server = http.createServer((req, res) => { const u = decodeURIComponent(new URL(req.url, "http://x").pathname), f = path.join(ROOT, u);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream", "cache-control": "no-store" }); fs.createReadStream(f).pipe(res); });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const ORIGIN = `http://127.0.0.1:${server.address().port}`, RUN = ORIGIN + "/demos/demo-run.html";
  if (EVIDENCE) fs.mkdirSync(EVD, { recursive: true });
  const INIT = () => { window.__EV = []; for (const t of ["run-ready", "play-pause", "speed", "region-select", "upgrade-preview", "upgrade-purchase", "growth-focus", "local-upgrade", "bubble-collect", "win"])
      document.addEventListener("bloom:" + t, e => window.__EV.push({ type: t, detail: e.detail })); };
  const H = `(() => { const PV = BLOOM.planetView.instance, DR = BLOOM.decisionRooms.instance, A = BLOOM_RUN_UI.adapter;
    const hash = c => { const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let h = 0x811c9dc5; for (let i = 0; i < d.length; i += 7) { h ^= d[i]; h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16); };
    const room = () => document.querySelector(".dr .dr-room:not([hidden])");
    const geom = () => { const r = document.getElementById("pvMap").getBoundingClientRect(), I = PV.renderer.info(); return [r.x, r.y, r.width, r.height, I.tilePx, I.offsetX, I.offsetY, I.copies.count].map(v => Math.round(v * 100) / 100).join(","); };
    const ev = t => __EV.filter(e => e.type === t);
    window.__dr = { PV, DR, A, hash, room, geom, ev, state: () => ({ dr: DR.state(), run: A.run().running, sel: A.selection().index, pv: PV.state(), active: A.activePreview() }),
      // (BLOOM-032C) the specimen is the Organic Hybrid canvas: its displayed-pixel signature + accessible label; its highlighted logical part
      specOf: () => { const r = room(); return r && BLOOM.plantSpecimen.mounted().find(s => r.contains(s.el)); },
      spec: () => { const s = __dr.specOf(); return s ? s.signature() + ":" + s.canvas.getAttribute("aria-label") : null; },
      hl: () => { const s = __dr.specOf(); return s && s.highlighted ? [s.highlighted] : []; },
      nodes: () => [...room().querySelectorAll(".node")].map(n => ({ id: n.dataset.node, cat: n.dataset.cat, color: getComputedStyle(n).getPropertyValue("--cat").trim(), text: n.textContent.replace(/\\s+/g, " ").trim(), dis: n.getAttribute("aria-disabled"), y: n.getBoundingClientRect().y })),
      labels: () => [...room().querySelectorAll(".cat-l")].sort((a, b) => a.getBoundingClientRect().y - b.getBoundingClientRect().y).map(l => l.dataset.cat),
      crossings(name) { const paths = [...room().querySelectorAll(".dr-leaders .ld")]; const pts = paths.map(p => { const L = p.getTotalLength(), out = []; for (let k = 0; k <= 80; k++) { const q = p.getPointAtLength(L * k / 80); out.push([q.x, q.y]); } return out; });
        const segX = (a, b, c, d) => { const o = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]); return (o(a, b, c) > 0) !== (o(a, b, d) > 0) && (o(c, d, a) > 0) !== (o(c, d, b) > 0); };
        let crossings = 0, minGap = Infinity, at = null; const w = paths.map(p => parseFloat(getComputedStyle(p).strokeWidth)), cats = paths.map(p => p.dataset.cat);
        for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) { for (let a = 1; a < pts[i].length; a++) for (let b = 1; b < pts[j].length; b++) if (segX(pts[i][a - 1], pts[i][a], pts[j][b - 1], pts[j][b])) crossings++;
          for (const p of pts[i]) for (const q of pts[j]) { const d = Math.hypot(p[0] - q[0], p[1] - q[1]) - (w[i] + w[j]) / 2; if (d < minGap) { minGap = d; at = [cats[i], cats[j], Math.round(p[0]), Math.round(p[1])]; } } }
        return { paths: paths.length, crossings, minGap: Math.round(minGap * 10) / 10, at, widths: w }; } };
    return true; })()`;
  const frames = (p, n = 3) => p.evaluate(n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  const shot = async (p, name, clip) => { if (EVIDENCE) await p.screenshot({ path: path.join(EVD, name), ...(clip ? { clip } : {}) }); };
  const state = p => p.evaluate(() => __dr.state());
  // (BLOOM-029E) room swaps run through the SUBDUED mist: after a room click, Back, Resume or Escape the controller is busy for ~0.3 s; the
  // checks below read the settled state (the swap happens at the covered point, the resume / focus after the reveal), exactly as before
  const settled = p => p.waitForFunction(() => !BLOOM.decisionRooms.instance.state().transitioning, null, { timeout: 8000, polling: 20 });
  const openRoom = async (p, name) => { await settled(p); const inRoom = await p.evaluate(() => !!__dr.DR.state().room); await p.click(inRoom ? `.dr .dr-room:not([hidden]) .rn[data-go="${name}"]` : `.pv-tool[data-tool="${name}"]`); await settled(p); await frames(p, 4); await sleep(60); };
  const hoverNode = async (p, id) => { await p.hover(`.dr .dr-room:not([hidden]) .node[data-node="${id}"]`); await frames(p, 3); };
  const leaveTree = async (p) => { const r = await p.evaluate(() => { const h = document.querySelector(".dr .dr-room:not([hidden]) .rh").getBoundingClientRect(); return [h.x + h.width / 2, h.y + h.height - 4]; }); await p.mouse.move(r[0], r[1]); await frames(p, 3); };

  for (const bname of BROWSERS) {
    if (!pw) break; const FF = bname === "firefox", tag = `[${bname}]`;
    let browser; try { browser = await pw[bname].launch(); } catch (e) { check(false, `${tag} browser launches`, e.message.split("\n")[0]); continue; }
    console.log(`# ${bname}`);
    const pages = [];
    const open = async (q, { w = 1280, h = 800, rm = false } = {}) => {
      const c = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: rm ? "reduce" : "no-preference" }); await c.addInitScript(INIT);
      const p = await c.newPage(); p.errs = []; p.reqs = []; p.on("pageerror", e => p.errs.push(e.message)); p.on("console", m => { if (m.type() === "error") p.errs.push(m.text()); }); p.on("request", r => p.reqs.push(r.url())); pages.push(p);
      await p.goto(RUN + q);
      await p.waitForFunction(() => window.BLOOM && BLOOM.planetView && BLOOM.planetView.instance && BLOOM.decisionRooms && BLOOM.decisionRooms.instance && BLOOM.planetView.instance.renderer.info().frames > 0, null, { timeout: 30000, polling: 100 });
      await p.evaluate(H); await frames(p, 4); return p; };
    try {
      const p = await open("?archetype=ocean_archipelago&seed=28&ui=18");
      // ---- B1 · opening a room: pause at once, remember, carry + clear the selection, keep the Planet View's geometry, veil, inert
      { const before = await p.evaluate(() => ({ ...__dr.state(), geom: __dr.geom(), n: __EV.length }));
        await openRoom(p, "adapt");
        const r = await p.evaluate(() => { const hud = document.querySelector(".pv-hud"), st = document.querySelector(".pv-stage"), ft = document.querySelector(".pv-foot"), dr = document.getElementById("dr"), m = document.getElementById("pvMap").getBoundingClientRect();
          const e = document.elementFromPoint(m.x + m.width / 2, m.y + m.height / 2);
          return { ...__dr.state(), geom: __dr.geom(), blur: getComputedStyle(hud).filter, veil: getComputedStyle(dr).backgroundColor, inert: [hud, st, ft].every(x => x.inert && x.getAttribute("aria-hidden") === "true"),
            hidden: dr.hidden, over: !!(e && e.closest("#dr")), focusIn: !!document.activeElement.closest("#dr"), pp: __dr.ev("play-pause").map(e => e.detail.running), rs: __dr.ev("region-select").map(e => e.detail.id), toolPressed: document.querySelector('.pv-tool[data-tool="adapt"]').getAttribute("aria-pressed") }; });
        check(before.run === true && before.sel >= 0 && r.dr.room === "adapt" && r.run === false && r.dr.wasRunning === true && r.dr.context === before.sel && r.sel === -1 && J(r.pp) === "[false]" && J(r.rs) === "[null]" && r.geom === before.geom
          && /blur\(7px\)/.test(r.blur) && /rgba\(52, 62, 48, 0\.46\)/.test(r.veil) && r.inert && !r.hidden && r.over && r.focusIn && r.toolPressed === "true",
          `${tag} B1 · opening Adapt from a running run pauses it at once (one real bloom:play-pause {running:false}), remembers it was running, carries the home selection into the room context and clears it (one bloom:region-select {id:null}); the Planet View keeps the exact same map geometry underneath, blurred 7 px under the 46 % veil, inert and aria-hidden; the room takes focus`,
          J({ before: [before.run, before.sel, before.geom], after: [r.run, r.dr.wasRunning, r.dr.context, r.sel, r.geom], blur: r.blur, veil: r.veil, pp: r.pp, rs: r.rs })); }
      // ---- B2 · Back restores · Resume forces running · Escape closes · focus returns to the opener
      { await p.click(".dr .dr-room:not([hidden]) .rb.back"); await settled(p); await frames(p, 3);
        const a = await p.evaluate(() => ({ ...__dr.state(), hidden: document.getElementById("dr").hidden, inert: document.querySelector(".pv-hud").inert, active: document.activeElement.dataset.tool, cls: document.querySelector(".pv").classList.contains("in-room") }));
        await p.evaluate(() => __dr.A.actions.pause()); await frames(p, 2); await openRoom(p, "region"); const b0 = await state(p); await p.click(".dr .dr-room:not([hidden]) .rb.back"); await settled(p); await frames(p, 3); const b = await state(p);
        await openRoom(p, "region"); await p.click(".dr .dr-room:not([hidden]) .rb.resume"); await settled(p); await frames(p, 3); const c = await state(p);
        await p.evaluate(() => __dr.A.actions.pause()); await openRoom(p, "spread"); await p.keyboard.press("Escape"); await settled(p); await frames(p, 3); const d = await state(p);
        await p.evaluate(() => __dr.A.actions.play()); await openRoom(p, "spread"); await p.keyboard.press("Escape"); await settled(p); await frames(p, 3); const e = await state(p);
        check(a.dr.room === null && a.run === true && a.sel === -1 && a.hidden && !a.inert && !a.cls && a.active === "adapt" && b0.run === false && b0.dr.wasRunning === false && b.run === false && b.dr.room === null && c.run === true && c.dr.room === null && d.run === false && d.dr.room === null && e.run === true && e.dr.room === null && e.sel === -1,
          `${tag} B2 · Back restores the pre-room state (running → running again, focus back on the opener, no region selected; paused → still paused); Resume closes and runs regardless; Escape closes and restores (paused stays paused, running runs)`, J({ back: [a.run, a.active], pausedBack: [b0.dr.wasRunning, b.run], resume: c.run, escPaused: d.run, escRunning: e.run })); }
      // ---- B3 · room → room: still paused, same context, the old preview cleared; B4 · no selection → the origin
      { await p.evaluate(() => { __dr.A.actions.deselect(); __dr.A.actions.play(); }); await frames(p, 2); const n0 = await p.evaluate(() => __EV.length);
        await openRoom(p, "region"); const s1 = await state(p); const origin = await p.evaluate(() => __dr.A.regions().find(r => r.isOrigin).index);
        await openRoom(p, "adapt"); await hoverNode(p, "cold"); const s2 = await state(p);
        await openRoom(p, "spread"); const s3 = await state(p);
        const pp = await p.evaluate(n => __EV.slice(n).filter(e => e.type === "play-pause").length, n0);
        check(s1.dr.context === origin && s1.run === false && s2.dr.room === "adapt" && s2.dr.context === origin && s2.run === false && s2.dr.preview === "cold" && s2.active !== null && s3.dr.room === "spread" && s3.dr.context === origin && s3.run === false && s3.dr.preview === null && s3.dr.hovered === null && s3.active === null && pp === 1,
          `${tag} B3/B4 · with nothing selected the room context is the origin; Region → Adapt → Spread never returns to the Planet View, stays paused (one play-pause in all), keeps the context, and switching clears the old room's real preview (no sticky preview)`, J({ ctx: [s1.dr.context, s2.dr.context, s3.dr.context, origin], run: [s1.run, s2.run, s3.run], pv: [s2.dr.preview, s3.dr.preview], pp })); }
      // ---- B5 · the region strip: click = context only (no bloom:region-select), hover / focus = a peek on the mini-map, leave restores
      { await openRoom(p, "region"); const n0 = await p.evaluate(() => __EV.length);
        const r = await p.evaluate(async () => { const room = __dr.room(), strip = room.querySelector(".mm-strip"), cv = room.querySelector(".mm-cv"), ctx0 = __dr.DR.state().context;
          const other = [...strip.querySelectorAll("[data-r]")].find(b => +b.dataset.r !== ctx0); const h0 = __dr.hash(cv);
          other.dispatchEvent(new PointerEvent("pointerover", { bubbles: true, pointerType: "mouse" })); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
          const peek = __dr.DR.state().peek, h1 = __dr.hash(cv), peekLine = room.querySelector(".mm-peek").textContent, pkCls = other.classList.contains("pk");
          strip.dispatchEvent(new PointerEvent("pointerleave", { bubbles: false })); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
          const peek2 = __dr.DR.state().peek, h2 = __dr.hash(cv);
          other.click(); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
          const st = __dr.DR.state(); return { ctx0, target: +other.dataset.r, peek, peek2, hashes: [h0, h1, h2], peekLine, pkCls, ctx1: st.context, name: room.querySelector(".mm-name").textContent, pressed: other.getAttribute("aria-pressed"), sel: __dr.A.selection().index, regName: __dr.A.regions()[+other.dataset.r].name, rgName: room.querySelector(".rg-name").textContent, specCap: room.querySelector(".sc-n").textContent }; });
        const rs = await p.evaluate(n => __EV.slice(n).filter(e => e.type === "region-select").length, n0);
        check(r.peek === r.target && r.peek2 === -1 && r.hashes[0] !== r.hashes[1] && r.hashes[2] === r.hashes[0] && r.peekLine.includes(r.regName) && r.pkCls && r.ctx1 === r.target && r.ctx1 !== r.ctx0 && r.name === r.regName && r.pressed === "true" && r.sel === -1 && rs === 0 && r.rgName === r.regName && r.specCap === `Your plant in ${r.regName}`,
          `${tag} B5 · a region chip: hover peeks that region on the mini-map (the canvas changes, the peek line reads it) and leaving restores the drawing; click changes the ROOM CONTEXT only (mini-map header, specimen caption and the room repaint to it) — the home selection stays empty and no bloom:region-select fires`, J({ ...r, hashes: undefined, rs })); if (!FF) await shot(p, "12-room-context-change.png"); }
      // ---- B6 · the mini-map is the 029B renderer: same canonical surface signature as the main map
      { const r = await p.evaluate(() => { const main = __dr.PV.renderer.info(); const mm = ["region", "adapt", "spread", "terraform"].map(k => __dr.DR.rooms[k].mm.R.info()); return { main: main.surfaceSignature, mm: mm.map(i => i.surfaceSignature), frames: mm.map(i => i.frames), canvases: document.querySelectorAll(".dr .mm-cv").length, keys: Object.keys(__dr.DR.rooms.region.mm.R).sort().join() }; }); // (029D) four rooms, four mini-maps
        check(r.mm.every(s => s === r.main) && r.frames[0] > 0 && r.canvases === 4 && r.keys === Object.keys({ setSource: 1, setSky: 1, layout: 1, draw: 1, hitTest: 1, bubbleAt: 1, clientOf: 1, info: 1, surfaceCanvas: 1, worldCanvas: 1, planet: 1, render: 1 }).sort().join(),
          `${tag} B6 · each room's mini-map is BLOOM.runMap.createRenderer on its own canvas (the same frozen renderer API as the main map) and paints the same canonical surface signature as the Planet View`, J(r)); }
      // ---- B7 · Region Inspect tabs: ARIA + arrow keys
      { const r = await p.evaluate(async () => { const room = __dr.room(), tabs = [...room.querySelectorAll('[role="tab"]')], list = room.querySelector('[role="tablist"]');
          const sel = () => tabs.map(t => t.getAttribute("aria-selected")).join(), hid = () => tabs.map(t => document.getElementById(t.getAttribute("aria-controls")).hidden ? 0 : 1).join(), ti = () => tabs.map(t => t.tabIndex).join();
          const a = { sel: sel(), hid: hid(), ti: ti(), roles: tabs.map(t => document.getElementById(t.getAttribute("aria-controls")).getAttribute("role") + "/" + (document.getElementById(t.getAttribute("aria-controls")).getAttribute("aria-labelledby") === t.id)).join(), list: !!list };
          tabs[0].focus(); tabs[0].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })); const b = { sel: sel(), hid: hid(), focus: document.activeElement.id };
          tabs[1].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true })); const c = { sel: sel(), focus: document.activeElement.id };
          tabs[2].click(); const d = { sel: sel(), hid: hid(), ti: ti() }; tabs[0].click(); return { a, b, c, d }; });
        check(r.a.sel === "true,false,false" && r.a.hid === "1,0,0" && r.a.ti === "0,-1,-1" && r.a.roles === "tabpanel/true,tabpanel/true,tabpanel/true" && r.a.list && r.b.sel === "false,true,false" && r.b.hid === "0,1,0" && r.b.focus === "drtab-colony" && r.c.sel === "true,false,false" && r.c.focus === "drtab-overview" && r.d.sel === "false,false,true" && r.d.hid === "0,0,1" && r.d.ti === "-1,-1,0",
          `${tag} B7 · Overview / Colony / Science use role=tablist / tab / tabpanel with aria-selected, aria-controls / aria-labelledby and a roving tabindex; ArrowRight / ArrowLeft move selection and focus; click selects`, J(r)); }
      // ---- B8 · Overview = adapter.region(ctx); Would help = adapter.wouldHelp(ctx); a suggestion opens the room with the same context and focuses the real node
      { const r = await p.evaluate(() => { const A = __dr.A, regs = A.regions(); const pick = regs.find(x => (A.wouldHelp(x.index) || []).some(u => u.board === "Adapt")) || regs.find(x => x.blocked) || regs[0]; __dr.DR.setCtx(pick.index); const room = __dr.room(), rg = A.region(pick.index);
          const cap = s => s.charAt(0).toUpperCase() + s.slice(1), degC = t => `${Math.round(t) < 0 ? "−" : ""}${Math.abs(Math.round(t))} °C`, LS = { green: "ok", yellow: "warn", red: "bad" }, W = { ok: "OK", warn: "Strained", bad: "Blocked" };
          const rows = [...room.querySelectorAll(".cond")].map(c => ({ cat: c.dataset.cat, color: getComputedStyle(c).getPropertyValue("--cat").trim(), st: [...c.classList].find(k => k.startsWith("st-")).slice(3), word: c.querySelector(".stc").textContent.trim(), reading: c.querySelector(".ct").textContent.trim() }));
          const want = rg.conditions.map(c => ({ cat: c.key, st: LS[c.lamp], word: W[LS[c.lamp]], reading: cap(c.word) + (c.key === "Temperature" ? ` · ${degC(rg.temperature.ground)}` : "") }));
          const help = [...room.querySelectorAll(".help [data-item]")].map(b => b.dataset.item), wh = (A.wouldHelp(pick.index) || []).map(u => u.id);
          const lim = room.querySelector(".limbox").textContent.replace(/\s+/g, " "), intrinsic = [...room.querySelectorAll(".help .hbtn")].every(b => getComputedStyle(b).flexGrow === "0" && b.getBoundingClientRect().width < room.querySelector(".help").getBoundingClientRect().width * 0.7);
          return { pick: pick.index, rows, want, help, wh, lim, limKey: rg.limiting.key, blocked: rg.limiting.blocked, intrinsic, colors: rows.map(r => r.color) }; });
        const rowsOk = J(r.rows.map(x => [x.cat, x.st, x.word, x.reading])) === J(r.want.map(x => [x.cat, x.st, x.word, x.reading])) && J(r.colors) === J([PALETTE.Temperature, PALETTE.Water, PALETTE.Soil, PALETTE.Hazard]);
        check(rowsOk && J(r.help) === J(r.wh) && (!r.blocked || r.lim.includes(r.limKey)) && r.intrinsic, `${tag} B8 · Overview: the four condition rows (Temperature orange · Water blue · Soil brown · Hazard purple, status chip icon + word, reading) equal adapter.region(context).conditions exactly; the limiting box names the real limiting key; "Would help" buttons are exactly adapter.wouldHelp(context), intrinsic width`, J({ pick: r.pick, rows: r.rows.map(x => `${x.cat} ${x.st} ${x.reading}`), help: r.help, wh: r.wh }));
        if (!FF) await shot(p, "01-region-inspect-overview-1280x800.png");
        if (r.help.length) { const n0 = await p.evaluate(() => __EV.length); const item = r.help[0]; const board = await p.evaluate(id => __dr.A.upgrade(id).board.toLowerCase(), item);
          if (board !== "terraform") { await p.click(`.dr .dr-room:not([hidden]) .help [data-item="${item}"]`); await settled(p); await frames(p, 4); await sleep(80);
            const s = await p.evaluate((n) => ({ ...__dr.state(), active: document.activeElement.dataset.node, pv: __EV.slice(n).filter(e => e.type === "upgrade-preview").map(e => e.detail.id) }), n0);
            check(s.dr.room === board && s.dr.context === r.pick && s.active === item && s.pv[0] === item && s.run === false, `${tag} B8b · clicking a real "Would help" suggestion (${item}) opens ${board} with the same room context and focuses that real node (its focus preview fires bloom:upgrade-preview)`, J({ room: s.dr.room, ctx: s.dr.context, active: s.active, pv: s.pv }));
            await openRoom(p, "region"); } } }
      // ---- B9 · Colony: the real actions and events
      { const n0 = await p.evaluate(() => __EV.length);
        const r = await p.evaluate(() => { const A = __dr.A, o = A.regions().find(x => x.isOrigin).index; __dr.DR.setCtx(o); const room = __dr.room(); room.querySelector("#drtab-colony").click();
          const c0 = A.colony(o), opts = [...room.querySelectorAll("[data-focus]")].map(b => [b.dataset.focus, b.getAttribute("aria-pressed"), b.getAttribute("aria-disabled"), b.dataset.tutorial]);
          const locals = [...room.querySelectorAll("[data-spec]")].map(b => [b.dataset.spec, b.getAttribute("aria-pressed"), b.getAttribute("aria-disabled"), b.dataset.tutorial]);
          const price = room.querySelector('[data-tutorial="local-upgrade"] .lab').textContent; return { o, focus: c0.focus, opts, locals, price, localPrice: c0.localPrice, choices: c0.focusChoices.map(f => [f.id, String(f.selected), String(!f.available)]), lc: c0.localChoices.map(l => [l.id, String(c0.localUpgrade === l.id), String(!l.available)]) }; });
        await p.click('.dr .dr-room:not([hidden]) [data-focus="roots"]'); await frames(p, 3);
        await p.evaluate(() => { BLOOM_API.addBiomass(400); }); await frames(p, 2); await p.click('.dr .dr-room:not([hidden]) [data-spec="rootNetwork"]'); await frames(p, 3);
        const s = await p.evaluate((n) => { const A = __dr.A, o = __dr.DR.state().context, c = A.colony(o), room = __dr.room(); return { focus: c.focus, local: c.localUpgrade, gf: __EV.slice(n).filter(e => e.type === "growth-focus").map(e => [e.detail.index, e.detail.focus, e.detail.previous, e.detail.changed, Object.keys(e.detail).join()]),
          lu: __EV.slice(n).filter(e => e.type === "local-upgrade").map(e => [e.detail.index, e.detail.upgrade, Object.keys(e.detail).join()]), pressed: room.querySelector('[data-focus="roots"]').getAttribute("aria-pressed"), lpressed: room.querySelector('[data-spec="rootNetwork"]').getAttribute("aria-pressed"), others: [...room.querySelectorAll("[data-spec]:not([data-spec=rootNetwork])")].map(b => b.getAttribute("aria-disabled")) }; }, n0);
        check(J(r.opts.map(x => x.slice(0, 3))) === J(r.choices) && J(r.locals.map(x => x.slice(0, 3))) === J(r.lc) && r.price.includes(String(r.localPrice)) && r.opts.every(x => x[3] === "focus-" + x[0]) && r.locals.every(x => x[3] === "local-" + x[0])
          && s.focus === "roots" && J(s.gf) === J([[r.o, "roots", r.focus, true, SHAPES["growth-focus"]]]) && s.local === "rootNetwork" && J(s.lu) === J([[r.o, "rootNetwork", SHAPES["local-upgrade"]]]) && s.pressed === "true" && s.lpressed === "true" && s.others.every(d => d === "true"),
          `${tag} B9 · Colony: growth-focus and local-upgrade buttons mirror adapter.colony(context) (selected, availability, ownership, price, anchors focus-* / local-*); clicking Roots is the real actions.setGrowthFocus (bloom:growth-focus, unchanged keys); buying Root Network is the real actions.buyLocalUpgrade (bloom:local-upgrade, unchanged keys); the other local upgrades then read as taken`, J({ gf: s.gf, lu: s.lu, price: r.price }));
        if (!FF) await shot(p, "02-region-inspect-colony.png"); }
      // ---- B10 · Science = the real raw readings
      { const r = await p.evaluate(() => { const A = __dr.A, o = __dr.DR.state().context, R = A.region(o).raw, room = __dr.room(); room.querySelector("#drtab-science").click();
          const num = v => Number.isInteger(v) ? String(v) : (Math.round(v * 10) / 10).toString(), degC = t => `${Math.round(t) < 0 ? "−" : ""}${Math.abs(Math.round(t))} °C`;
          const rows = [...room.querySelectorAll(".rawt tr")].map(tr => tr.querySelector("td").textContent.trim());
          const want = [degC(R.effectiveTemp), num(R.effectiveMoist), num(R.light), num(R.ph), num(R.salinity), num(R.nutrients), num(R.toxicity), R.effectiveRadiation !== R.radiation ? `${num(R.radiation)} · ${num(R.effectiveRadiation)} at the surface` : num(R.radiation)];
          return { rows, want, anchor: room.querySelectorAll('[data-tutorial="raw-signals"]').length }; });
        check(J(r.rows) === J(r.want) && r.rows.length === 8 && r.anchor === 1, `${tag} B10 · Science: eight rows (ground temperature, ground moisture, light, pH, salinity, nutrients, toxicity, radiation incl. the effective value) equal adapter.region(context).raw; the raw-signals anchor is here`, J(r.rows));
        if (!FF) await shot(p, "03-region-inspect-science.png"); await p.click("#drtab-overview"); }
      // ---- B11 · the real trees: exactly the offered real traits, PMO categories, palette, order, real prices / tiers / availability
      for (const [name, board] of [["adapt", "Adapt"], ["spread", "Spread"]]) { await openRoom(p, name);
        const r = await p.evaluate(b => { const A = __dr.A, items = A.upgrades().find(x => x.board === b).items, nodes = __dr.nodes(), labels = __dr.labels(), ROMAN = ["", "I", "II", "III", "IV"];
          const want = items.map(u => ({ id: u.id, cat: u.uiCategory, price: u.price, tier: u.tier, canBuy: u.canBuy, reason: u.reason })); const byId = Object.fromEntries(nodes.map(n => [n.id, n]));
          const text = want.every(w => { const n = byId[w.id]; if (!n) return false; return (w.canBuy || (!w.canBuy && w.tier === 0 && !w.reason) || (w.tier > 0 && w.reason === null)) ? n.text.includes(String(w.price)) || (w.tier > 0 && n.text.includes("Tier")) : true; });
          const offered = { waterSeeds: A.upgrade("waterSeeds").offered }; const catOrder = [...new Set(nodes.sort((a, b) => a.y - b.y).map(n => n.cat))];
          return { ids: nodes.map(n => n.id).sort(), want: want.map(w => w.id).sort(), cats: Object.fromEntries(nodes.map(n => [n.id, n.cat])), colors: nodes.map(n => [n.cat, n.color]), labels, catOrder, text, dis: nodes.map(n => [n.id, n.dis]), canBuy: Object.fromEntries(want.map(w => [w.id, String(!w.canBuy)])), offered, treeAnchor: __dr.room().querySelectorAll(`[data-tutorial="board-${b.toLowerCase()}"]`).length, nodeAnchors: nodes.every(n => !!__dr.room().querySelector(`[data-tutorial="upgrade-${n.id}"]`)) }; }, board);
        const CAT = board === "Adapt" ? ["Hazard", "Water", "Temperature", "Soil"] : ["Seeds", "Growth", "Reach"];
        const mapOk = Object.entries(r.cats).every(([id, c]) => MAPPING[id] === c), colOk = r.colors.every(([c, col]) => col === PALETTE[c]), orderOk = J(r.labels) === J(CAT.filter(c => r.labels.includes(c))) && J(r.catOrder) === J(r.labels);
        check(J(r.ids) === J(r.want) && r.ids.every(id => id in MAPPING) && mapOk && colOk && orderOk && r.text && r.dis.every(([id, d]) => d === r.canBuy[id]) && r.treeAnchor === 1 && r.nodeAnchors && (board !== "Spread" || r.ids.includes("waterSeeds") === r.offered.waterSeeds),
          `${tag} B11 · ${board}: the tree holds exactly the adapter's offered real ${board} traits (${r.ids.join(", ")}) — no placeholder node, no fake cost; each card sits under its PMO category with the accepted colour; categories read ${CAT.join(" → ")} top → bottom; prices / tiers / aria-disabled follow the adapter; board-${name} and upgrade-* anchors are here`, J({ ids: r.ids, labels: r.labels, colors: r.colors.filter((x, i, a) => a.findIndex(y => y[0] === x[0]) === i) })); }
      // ---- B12 · the preview contract (Adapt): actions.preview on hover / focus, bloom:upgrade-preview unchanged, every reset path clears
      { await openRoom(p, "adapt"); const n0 = await p.evaluate(() => __EV.length);
        await hoverNode(p, "cold"); const a = await p.evaluate(n => ({ ...__dr.state(), ev: __EV.slice(n).filter(e => e.type === "upgrade-preview").map(e => [e.detail.id, Object.keys(e.detail).join()]), spec: document.querySelector(".dr .dr-room:not([hidden]) .ps").classList.contains("previewing"), lit: [...document.querySelectorAll(".dr .dr-room:not([hidden]) .dr-leaders .ld.on")].map(x => x.dataset.cat), hl: __dr.hl(), info: document.querySelector(".dr .dr-room:not([hidden]) .lf-info").textContent.includes("Cold Tolerance"), fx: document.querySelector(".dr .dr-room:not([hidden]) .mm-ctx").classList.contains("pvw") }), n0);
        await leaveTree(p); const b = await state(p);
        await hoverNode(p, "heat"); await hoverNode(p, "cold"); const c = await p.evaluate(n => ({ pv: __dr.DR.state().preview, ids: __EV.slice(n).filter(e => e.type === "upgrade-preview").map(e => e.detail.id) }), n0);
        await p.evaluate(() => { const r = __dr.room().querySelector(".tree").getBoundingClientRect(); return r; }); const empty = await p.evaluate(() => { const r = __dr.room().querySelector(".tree").getBoundingClientRect(); return [r.x + 8, r.y + r.height - 8]; }); await p.mouse.move(empty[0], empty[1]); await frames(p, 3); const d = await state(p);
        await p.evaluate(() => { __dr.room().querySelector('.node[data-node="salt"]').focus(); }); await frames(p, 3); const e = await state(p);
        await p.evaluate(() => { __dr.room().querySelector(".mm-strip [data-r]").focus(); }); await frames(p, 3); const f = await state(p);
        await hoverNode(p, "rad"); await p.evaluate(() => window.dispatchEvent(new Event("blur"))); await frames(p, 3); const g = await state(p); await p.evaluate(() => window.dispatchEvent(new Event("focus")));
        await hoverNode(p, "drought"); await p.evaluate(() => { Object.defineProperty(document, "hidden", { get: () => true, configurable: true }); document.dispatchEvent(new Event("visibilitychange")); }); await frames(p, 3); const h = await state(p); await p.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event("visibilitychange")); });
        await p.evaluate(() => { __dr.room().querySelector('.node[data-node="flood"]').focus(); }); await frames(p, 2); await p.keyboard.press("Escape"); await settled(p); await frames(p, 3); const i = await state(p);
        check(a.dr.preview === "cold" && a.active !== null && J(a.ev) === J([["cold", SHAPES["upgrade-preview"]]]) && a.spec && J(a.lit) === J(["Temperature"]) && J(a.hl) === J(["stem"]) && a.info && a.fx
          && b.dr.preview === null && b.active === null && c.pv === "cold" && J(c.ids) === J(["cold", "heat", "cold"]) && d.dr.preview === null && e.dr.preview === "salt" && f.dr.preview === null && g.dr.preview === null && g.active === null && h.dr.preview === null && i.dr.preview === null && i.active === null && i.dr.room === null,
          `${tag} B12 · hovering Cold Tolerance is the real actions.preview: bloom:upgrade-preview {id:"cold"} with the unchanged 9 keys, the home map outlines it (activePreview), the specimen previews it (PREVIEW tag, the Stem anchor lit, the Temperature tendril lit), the information and effect cards describe it; the preview clears on: leaving the tree, empty tree space, a new node (replaces), keyboard focus leaving the tree, window blur, document hidden, and closing the room; keyboard focus previews`,
          J({ a: [a.dr.preview, a.ev, a.lit, a.hl], leave: b.dr.preview, replace: c.ids, empty: d.dr.preview, focus: e.dr.preview, focusOut: f.dr.preview, blur: g.dr.preview, hidden: h.dr.preview, close: [i.dr.preview, i.dr.room] })); }
      // ---- B13 · purchase: actions.buy → bloom:upgrade-purchase unchanged; the specimen changes for good; the preview re-reads the next tier
      { await openRoom(p, "adapt"); const n0 = await p.evaluate(() => __EV.length);
        const before = await p.evaluate(() => ({ spec: __dr.spec(), bio: __dr.A.hud().biomass, node: __dr.nodes().find(n => n.id === "cold").text }));
        await p.evaluate(() => { BLOOM_API.addBiomass(1000); }); await frames(p, 2); if (!FF) await shot(p, "04-adapt-normal.png");
        await hoverNode(p, "cold"); const pvSpec = await p.evaluate(() => __dr.spec()); if (!FF) await shot(p, "05-adapt-cold-tolerance-hover.png");
        await p.click('.dr .dr-room:not([hidden]) .node[data-node="cold"]'); await frames(p, 4); await sleep(60);
        const after = await p.evaluate(n => ({ spec: __dr.spec(), tier: __dr.A.upgrade("cold").tier, node: __dr.nodes().find(n => n.id === "cold").text, pu: __EV.slice(n).filter(e => e.type === "upgrade-purchase").map(e => [e.detail.id, e.detail.tier, e.detail.cost, Object.keys(e.detail).join()]),
          pv: __EV.slice(n).filter(e => e.type === "upgrade-preview").map(e => e.detail.id), hovered: __dr.DR.state().hovered, active: __dr.A.activePreview(), has: document.querySelector('.dr .dr-room:not([hidden]) .node[data-node="cold"]').classList.contains("has") }), n0);
        if (!FF) await shot(p, "06-adapt-purchased-cold-tolerance.png");
        await leaveTree(p); const rest = await p.evaluate(() => ({ spec: __dr.spec(), pv: __dr.DR.state().preview, active: __dr.A.activePreview(), bio: __dr.A.hud().biomass, owned: document.querySelector('.dr .dr-room:not([hidden]) .ownd').textContent.includes("Cold Tolerance") }));
        check(pvSpec !== before.spec && after.tier === 1 && after.pu.length === 1 && after.pu[0][0] === "cold" && after.pu[0][1] === 1 && after.pu[0][3] === SHAPES["upgrade-purchase"] && after.spec !== before.spec && after.node.includes("Tier I") && after.has && rest.owned && after.pv.length === 2 && after.hovered === "cold" && after.active !== null
          && rest.pv === null && rest.active === null && rest.spec !== after.spec && rest.spec !== before.spec && rest.spec !== pvSpec && rest.bio < before.bio + 1000,
          `${tag} B13 · clicking Cold Tolerance is the real actions.buy: one bloom:upgrade-purchase {id:"cold", tier:1} with the unchanged 6 keys, Biomass spent; the specimen changes permanently (and differs from the hover preview), the card reads Tier I owned, the owned chips list it; still on the node the preview re-reads the NEXT real tier (a second bloom:upgrade-preview); leaving clears the transient preview but keeps the purchased plant`,
          J({ pu: after.pu, pv: after.pv, node: after.node, spec: { hoverDiffers: pvSpec !== before.spec, ownedDiffers: rest.spec !== before.spec, nextTierPreviewDiffers: after.spec !== rest.spec } })); }
      // ---- B14 · every real trait visibly changes the production specimen through a real purchase (where the rules allow it in one run)
      { const r = await p.evaluate(async () => { const A = __dr.A, out = {}; BLOOM_API.addBiomass(5000); const o = __dr.DR.state().context;
          for (const id of ["heat", "drought", "salt", "rad"]) { const s0 = __dr.spec(); const ok = A.actions.buy(id); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); __dr.DR.rooms.adapt.paint(); out[id] = { bought: ok, changed: __dr.spec() !== s0 }; }
          out.floodBlocked = { canBuy: A.upgrade("flood").canBuy, reason: A.upgrade("flood").reason, node: __dr.nodes().find(n => n.id === "flood").text }; void o; return out; });
        check(["heat", "drought", "salt", "rad"].every(id => r[id].bought && r[id].changed) && !r.floodBlocked.canBuy && /Drought/.test(r.floodBlocked.reason) && r.floodBlocked.node.includes("Drought"),
          `${tag} B14 · heat, drought, salt and rad each visibly change the specimen when really bought (cold did in B13); Flood is then really blocked by the one-water-strategy rule and its card shows the real reason (no fake lock)`, J(r)); if (!FF) { await hoverNode(p, "salt"); await shot(p, "07-adapt-soil-category-active.png"); await leaveTree(p); } }
      // ---- B15 · organic tendrils: weights, no crossings, the chain, only organic; Spread shorter than Adapt; chips fit; content-height cards
      { const measureAt = async (q, name) => { await openRoom(q, name); const m0 = await q.evaluate(n => ({ ...__dr.DR.measure(n), x: __dr.crossings(n) }), name); await hoverNode(q, name === "adapt" ? "cold" : "seedOut"); const m1 = await q.evaluate(n => ({ ...__dr.DR.measure(n), x: __dr.crossings(n) }), name); await leaveTree(q); return { idle: m0, lit: m1 }; };
        const widths = FF ? [[1280, 800]] : [[1024, 768], [1280, 800], [1440, 900]]; MEAS.rooms = MEAS.rooms || {};
        for (const [w, h] of widths) { const q = w === 1280 && !FF ? p : await open("?archetype=ocean_archipelago&seed=28&ui=18", { w, h }); if (q !== p) await q.evaluate(() => __dr.A.actions.deselect());
          const A = await measureAt(q, "adapt"), S = await measureAt(q, "spread"), em = A.idle.em;
          const fit = await q.evaluate(() => { const pr = document.querySelector(".dr .dr-probe"), st = pr.querySelector(".mm-strip"), ch = pr.querySelector(".rc"); pr.style.fontSize = getComputedStyle(document.getElementById("dr")).getPropertyValue("--room-em"); const s = st.getBoundingClientRect().width, c = ch.getBoundingClientRect().width, g = parseFloat(getComputedStyle(st).columnGap) || 0; pr.style.fontSize = "";
            const real = document.querySelector(".dr .dr-room:not([hidden]) .mm-strip"); return { strip: s, chip: c, gap: g, three: 3 * c + 2 * g, fits: 3 * c + 2 * g <= s, realStrip: real.getBoundingClientRect().width, median: __dr.DR.state().medianName }; });
          const cards = await q.evaluate(() => { const room = __dr.room(), slab = el => { const kids = [...el.children].filter(k => k.offsetParent !== null); if (!kids.length) return 0; const r = el.getBoundingClientRect(), last = Math.max(...kids.map(k => k.getBoundingClientRect().bottom)); return r.bottom - last; };
            const em = __dr.DR.state().em; return { info: slab(room.querySelector(".lf-info")) / em, mm: slab(room.querySelector(".mm")) / em, ctx: slab(room.querySelector(".mm-ctx")) / em, main: room.querySelector(".z-main").getBoundingClientRect().height, zone: room.getBoundingClientRect().height - room.querySelector(".rh").getBoundingClientRect().bottom, scroll: document.documentElement.scrollWidth - document.documentElement.clientWidth, drScroll: document.getElementById("dr").scrollWidth - document.getElementById("dr").clientWidth,
              header: room.querySelector(".rh").getBoundingClientRect().height / em, small: [...room.querySelectorAll(".rb, .rn, [role=tab], .opt, .hbtn, .node")].filter(b => b.offsetParent).filter(b => { const r = b.getBoundingClientRect(); return r.width < 43.5 || r.height < 43.5; }).map(b => b.className.split(" ")[0] + ":" + Math.round(b.getBoundingClientRect().width) + "×" + Math.round(b.getBoundingClientRect().height)),
              chips: [...room.querySelectorAll(".rc")].filter(b => b.offsetParent).map(b => b.getBoundingClientRect().height), lenses: [...room.querySelectorAll(".lb")].map(b => Math.min(b.getBoundingClientRect().width, b.getBoundingClientRect().height)) }; });
          const idleMin = Math.max(0.52 * em, 8.5), litMin = Math.max(0.8 * em, 12.5), veinMin = Math.max(0.12 * em, 2);
          const tendOk = [A, S].every(M => M.idle.tendrils.length === M.idle.categories.length && M.idle.tendrils.every(t => t.width >= idleMin - 0.05) && M.lit.tendrils.filter(t => t.lit).length === 1 && M.lit.tendrils.filter(t => t.lit).every(t => t.width >= litMin - 0.05) && Math.abs(M.lit.glow - M.lit.litW * 1.9) < 0.5 && M.idle.vein >= veinMin - 0.05);
          const chainOk = [A, S].every(M => M.idle.chain.every(c => c.anchor && c.plate && c.tendril && c.port && c.label && c.cards > 0));
          const crossOk = [A.idle, A.lit, S.idle, S.lit].every(M => M.x.crossings === 0 && M.x.minGap > 0);
          const shorter = S.idle.treeHeight < A.idle.treeHeight * 0.8, contentH = Math.abs(S.idle.treeHeight - Math.min(S.idle.wantH + 4, cards.zone)) < 8;
          MEAS.rooms[`${w}x${h}${FF ? "-firefox" : ""}`] = { em, emBy: (await q.evaluate(() => __dr.DR.state().emBy)), tendrils: { idleMin, litMin, veinMin, adapt: A.idle.tendrils.map(t => [t.cat, t.width]), adaptLit: A.lit.tendrils.filter(t => t.lit).map(t => [t.cat, t.width]), glow: A.lit.glow, vein: A.idle.vein, spread: S.idle.tendrils.map(t => [t.cat, t.width]) }, crossings: { adapt: A.idle.x, adaptLit: A.lit.x, spread: S.idle.x, spreadLit: S.lit.x }, trees: { adapt: A.idle.treeHeight, spread: S.idle.treeHeight, spreadWant: S.idle.wantH, zone: cards.zone }, chipFit: fit, cards, labelMode: A.idle.labelMode };
          check(tendOk && chainOk && crossOk && shorter && contentH && fit.fits && cards.scroll <= 0 && cards.drScroll <= 0 && cards.header < 5.2 && !cards.small.length && cards.chips.every(hh => hh >= 36) && cards.lenses.every(x => x >= 36) && cards.info < 1.6 && cards.ctx < 1.6,
            `${tag} B15 · ${w}×${h} (em ${em}): tendrils idle ≥ ${idleMin.toFixed(1)} px, lit ≥ ${litMin.toFixed(1)} px, glow 1.9× lit, vein ≥ ${veinMin.toFixed(1)} px, one lit tendril with the rest dimmed; 0 crossings and clear space between neighbours idle and lit in both rooms; anchor → plate → tendril → port → category label → cards intact per category; Spread's tree card is content-height and materially shorter than Adapt's; three median real region chips ("${fit.median}") fit across the right column; no horizontal scroll; one-row header; every room control ≥ 44 px (chips / layer chips ≥ 36); no dead slab under the information / effect cards`,
            J({ idle: A.idle.tendrils.map(t => Math.round(t.width * 10) / 10), lit: A.lit.tendrils.filter(t => t.lit).map(t => Math.round(t.width * 10) / 10), glow: A.lit.glow, vein: A.idle.vein, gaps: [A.idle.x.minGap, A.lit.x.minGap, S.idle.x.minGap, S.lit.x.minGap], tight: [A.idle.x.at, A.lit.x.at], trees: [Math.round(A.idle.treeHeight), Math.round(S.idle.treeHeight), Math.round(S.idle.wantH)], fit: [Math.round(fit.three), Math.round(fit.strip)], small: cards.small, slabs: [cards.info, cards.mm, cards.ctx].map(v => Math.round(v * 10) / 10), header: Math.round(cards.header * 10) / 10, scroll: [cards.scroll, cards.drScroll], minChip: Math.round(Math.min(...cards.chips)), minLens: Math.round(Math.min(...cards.lenses)) }));
          if (!FF && w === 1024) { await openRoom(q, "adapt"); await shot(q, "13-1024x768-adapt.png"); await openRoom(q, "spread"); await shot(q, "14-1024x768-spread.png"); }
          if (!FF && w === 1440) { await openRoom(q, "adapt"); await shot(q, "15-1440x900-adapt.png"); }
          if (q !== p) await q.context().close(); }
        await openRoom(p, "spread"); if (!FF) await shot(p, "08-spread-normal.png"); await hoverNode(p, "seedOut"); if (!FF) await shot(p, "09-spread-seed-output-hover.png"); await leaveTree(p); }
      // ---- B16 · Spread on a world where Waterborne Seeds is offered: a real crossing preview reaches the effect box; the specimen shows pods
      { const r = await p.evaluate(() => ({ offered: __dr.A.upgrade("waterSeeds").offered, node: !!__dr.room().querySelector('.node[data-node="waterSeeds"]') }));
        if (r.offered) { await hoverNode(p, "waterSeeds"); const s = await p.evaluate(() => { const pv = __dr.A.activePreview(), box = __dr.room().querySelector(".mm-ctx").textContent; return { pv: !!pv, reach: (__dr.DR.state().preview === "waterSeeds"), box, spec: __dr.room().querySelector(".ps").classList.contains("previewing"), hl: __dr.hl(), lit: [...__dr.room().querySelectorAll(".dr-leaders .ld.on")].map(x => x.dataset.cat) }; });
          if (!FF) await shot(p, "10-spread-waterborne-seeds-hover.png"); await leaveTree(p);
          check(r.node && s.pv && s.reach && s.spec && J(s.hl) === J(["pods"]) && J(s.lit) === J(["Reach"]) && /Waterborne|reachable|Unchanged|Opens|hostile/.test(s.box), `${tag} B16 · Ocean 28 offers Waterborne Seeds: its real crossing preview shows (actions.preview), the Pods anchor and the Reach tendril light, and the effect box reads the real preview lists for the context`, J({ hl: s.hl, lit: s.lit, box: s.box.slice(0, 120) })); }
        else check(!r.node, `${tag} B16 · Waterborne Seeds not offered on this world: not in the tree`, J(r)); }
      // ---- B17 · (029D) Terraform is the fourth room: the header nav opens it (still paused, same context, Spread's preview cleared); back to Spread for the checks below
      { const before = await p.evaluate(() => ({ ...__dr.state(), n: __EV.length })); await hoverNode(p, "seedOut");
        await p.click('.dr .dr-room:not([hidden]) .rn[data-go="terraform"]'); await settled(p); await frames(p, 3);
        const r = await p.evaluate(n => ({ ...__dr.state(), n: __EV.filter(e => e.type === "play-pause").length, attr: document.querySelector('.dr .dr-room:not([hidden]) .rn[data-go="terraform"]').getAttribute("aria-disabled"), pressed: document.querySelector('.dr .dr-room:not([hidden]) .rn[data-go="terraform"]').getAttribute("aria-pressed"), hasTf: __dr.PV.rooms.has("terraform"), ctxSame: __dr.DR.state().context === n }), before.dr.context);
        await p.click('.dr .dr-room:not([hidden]) .rn[data-go="spread"]'); await settled(p); await frames(p, 3); const back = await state(p);
        check(r.dr.room === "terraform" && r.run === false && r.attr === null && r.pressed === "true" && r.hasTf && r.ctxSame && r.dr.preview === null && r.active === null && back.dr.room === "spread" && back.run === false,
          `${tag} B17 · Terraform in the room header is a ready room (029D): pressing it opens the Terraform room still paused with the same context and clears Spread's preview; Spread reopens the same way`, J({ room: r.dr.room, ctxSame: r.ctxSame, back: back.dr.room })); }
      // ---- B18 · the background is inert: no Tab reaches it, a click on the covered map selects nothing
      { const r = await p.evaluate(async () => { const out = new Set(); for (let k = 0; k < 80; k++) { const e = document.activeElement; out.add(e.closest("#dr") ? "room" : e === document.body ? "body" : "outside:" + (e.id || e.className)); } return [...out]; });
        const tabs = []; for (let k = 0; k < 60; k++) { await p.keyboard.press("Tab"); tabs.push(await p.evaluate(() => { const e = document.activeElement; return e.closest("#dr") ? "room" : e === document.body ? "body" : "outside:" + (e.id || e.className); })); }
        const m = await p.evaluate(() => { const r = document.getElementById("pvMap").getBoundingClientRect(); return [r.x + r.width * 0.35, r.y + r.height * 0.5]; }); const n0 = await p.evaluate(() => __EV.length);
        await p.mouse.click(m[0], m[1]); await frames(p, 2); const s = await p.evaluate(n => ({ sel: __dr.A.selection().index, rs: __EV.slice(n).filter(e => e.type === "region-select").length, room: __dr.DR.state().room }), n0);
        check(tabs.every(t => t === "room" || t === "body") && tabs.filter(t => t === "room").length > 40 && s.sel === -1 && s.rs === 0 && s.room === "spread", `${tag} B18 · while a room is open 60 Tab presses never land on the Planet View (HUD, map, banner, footer are inert) and a click on the covered map selects nothing and emits no bloom:region-select`, J({ tabs: [...new Set(tabs)], ...s, r })); }
      // ---- B19 · anchors: every claimed 028D1 name resolves to exactly ONE production element; the shell's copies are legacy; Terraform / report anchors stay on the shell
      { const r = await p.evaluate(() => { const claimed = __dr.DR.state().claimedAnchors, one = n => { const e = document.querySelectorAll(`[data-tutorial="${n}"]`); return e.length === 1 && !!e[0].closest(".pv .dr"); };
          const legacy = n => document.querySelectorAll(`[data-tutorial-legacy="${n}"]`).length >= 1; const shell = ["report", "report-continue", "run-actions"].map(n => [n, document.querySelectorAll(`[data-tutorial="${n}"]`).length, !!document.querySelector(`[data-tutorial="${n}"]`) && !!document.querySelector(`[data-tutorial="${n}"]`).closest(".pv .rr")]); // (029D) Terraform's anchors are production; (029E) the production report owns the report anchors
          const banner = ["inspect", "readout", "limiting-factor", "colony-status"].map(n => document.querySelectorAll(`[data-tutorial="${n}"]`).length);
          // the shell renders its inspect / report anchors only while IT shows a selected region / the report: a legacy copy exists then, else nothing at all
          return { claimed, missing: claimed.filter(n => !one(n)), noLegacy: ["upgrades", "board-adapt", "upgrade-cold", "board-terraform", "upgrade-warm"].filter(n => !legacy(n)), shell, banner }; });
        check(!r.missing.length && !r.noLegacy.length && r.shell.every(([, n, inReport]) => n === 1 && inReport) && J(r.banner) === "[1,1,1,1]", `${tag} B19 · ${r.claimed.length} re-homed anchors (raw-signals, growth-focus, focus-*, local-upgrade, local-*, upgrades, board-adapt, board-spread, board-terraform, upgrade-<real id>) each resolve to ONE production element inside the rooms, the shell's copies are data-tutorial-legacy; only the report anchors stay on the shell (until the report converges); the banner keeps inspect / readout / limiting-factor / colony-status`, J({ missing: r.missing, noLegacy: r.noLegacy, shell: r.shell.map(s => s[0] + ":" + s[1]) })); }
      // ---- B20 · network / console / event shapes seen
      { const ext = p.reqs.filter(u => !u.startsWith(ORIGIN) && !u.startsWith("data:") && !u.startsWith("blob:"));
        const shapes = await p.evaluate(() => { const out = {}; for (const e of __EV) { const k = Object.keys(e.detail).join(); out[e.type] = out[e.type] || new Set(); out[e.type].add(k); } return Object.fromEntries(Object.entries(out).map(([t, s]) => [t, [...s]])); });
        const bad = Object.entries(shapes).filter(([t, ks]) => ks.length !== 1 || ks[0] !== SHAPES[t]);
        check(!ext.length && !p.reqs.some(u => /ui-mockups/.test(u)) && !p.errs.length && !bad.length && Object.keys(shapes).length >= 6, `${tag} B20 · no request leaves the local server, no Concept 18 file is requested, no console error; every bloom:* event seen in this run (${Object.keys(shapes).join(", ")}) carries exactly its 028D1 detail keys`, `${p.reqs.length} requests${ext.length ? " · EXTERNAL " + ext.join(", ") : ""}${p.errs.length ? " · ERRORS " + p.errs.join(" | ") : ""}${bad.length ? " · SHAPES " + J(bad) : ""}`); }
      await p.context().close();

      // ---- B21 · training through the production rooms (first: on the fresh page, before any room opened, every claimed anchor already resolves)
      { const q = await open("?training=1&ui=18&return=" + encodeURIComponent("/demos/main-menu.html")); await sleep(500); await frames(q, 3);
        const fresh = await q.evaluate(() => { const claimed = __dr.DR.state().claimedAnchors, one = n => { const e = document.querySelectorAll(`[data-tutorial="${n}"]`); return e.length === 1 && !!e[0].closest(".pv .dr"); }; return { room: __dr.DR.state().room, missing: claimed.filter(n => !one(n)), n: claimed.length }; });
        check(fresh.room === null && !fresh.missing.length, `${tag} B21-0 · on a fresh training page, before any room has opened, all ${fresh.n} claimed anchors already resolve to ONE room element (the rooms paint once at mount), so a coach can find them first`, J(fresh));
        const s0 = await state(q); await openRoom(q, "region"); const s1 = await state(q); await openRoom(q, "adapt"); const n0 = await q.evaluate(() => __EV.length);
        const spec0 = await q.evaluate(() => __dr.spec()); await hoverNode(q, "cold");
        const pv = await q.evaluate(n => __EV.slice(n).filter(e => e.type === "upgrade-preview").map(e => e.detail), n0);
        const ch = await q.evaluate(() => { const i = __dr.A.regions().find(r => r.id === "chill_hollow").index; __dr.room().querySelector(`.mm-strip [data-r="${i}"]`).click(); return i; }); await frames(q, 3); await hoverNode(q, "cold");
        const fx = await q.evaluate(() => ({ box: __dr.room().querySelector(".mm-ctx").textContent.replace(/\s+/g, " "), ctx: __dr.DR.state().contextId, cap: __dr.room().querySelector(".sc-n").textContent }));
        if (!FF) await shot(q, "16-training-adapt-paused.png");
        await q.click('.dr .dr-room:not([hidden]) .node[data-node="cold"]'); await frames(q, 4); await sleep(60);
        const pu = await q.evaluate(n => ({ pu: __EV.slice(n).filter(e => e.type === "upgrade-purchase").map(e => e.detail), spec: __dr.spec(), run: __dr.A.run().running, bio: __dr.A.hud().biomass, chill: __dr.A.region("chill_hollow").limiting.blocked, box: __dr.room().querySelector(".mm-ctx").textContent.replace(/\s+/g, " ") }), n0);
        await leaveTree(q); await openRoom(q, "region"); await q.click('.dr .dr-room:not([hidden]) #drtab-colony'); await q.evaluate(() => { const i = __dr.A.regions().find(r => r.isOrigin).index; __dr.DR.setCtx(i); }); await frames(q, 2);
        await q.click('.dr .dr-room:not([hidden]) [data-focus="leaves"]'); await frames(q, 3); const gf = await q.evaluate(n => __EV.slice(n).filter(e => e.type === "growth-focus").map(e => [e.detail.id, e.detail.focus]), n0);
        await q.click(".dr .dr-room:not([hidden]) .rb.back"); await settled(q); await frames(q, 3); const s2 = await state(q);
        check(s0.run === false && s0.sel >= 0 && s1.run === false && s1.dr.wasRunning === false && s1.dr.contextId === "landing_meadow" && pv.length === 1 && pv[0].id === "cold" && pv[0].available === true && J(pv[0].gain) === '["chill_hollow"]' && fx.ctx === "chill_hollow" && /Opens Chill Hollow/.test(fx.box) && fx.cap === "Your plant in Chill Hollow"
          && pu.pu.length === 1 && pu.pu[0].cost === 140 && pu.pu[0].tier === 1 && pu.spec !== spec0 && pu.run === false && pu.bio === 10 && pu.chill === false,
          `${tag} B21 · training starts paused; Region Inspect opens still paused (context Landing Meadow, the origin); in Adapt the real Cold Tolerance preview fires bloom:upgrade-preview {available, gain:[chill_hollow]}; with Chill Hollow as the room context the effect box reads "Opens Chill Hollow"; the click is the real training-price purchase (bloom:upgrade-purchase cost 140, tier 1, Biomass 150 → 10), the specimen changes, Chill Hollow is no longer blocked; the colony focus goes through the real action; Back keeps training paused`,
          J({ start: [s0.run, s1.dr.contextId], pv: pv.map(d => [d.id, d.available, d.gain]), fx: [fx.ctx, fx.box.slice(0, 80)], pu: pu.pu.map(d => [d.id, d.cost, d.tier, d.biomass]), chill: pu.chill, gf, back: s2.run }));
        check(J(gf) === J([["landing_meadow", "leaves"]]) && s2.run === false && s2.dr.room === null, `${tag} B21b · the training colony's growth focus is the real action (bloom:growth-focus on landing_meadow) and Back returns to a still-paused training run`, J({ gf, run: s2.run }));
        // determinism: the same scripted actions through the rooms, twice → the same run tile for tile
        const script = async (pg) => { await openRoom(pg, "adapt"); await pg.click('.dr .dr-room:not([hidden]) .node[data-node="cold"]'); await frames(pg, 3); await pg.click(".dr .dr-room:not([hidden]) .rb.back"); await settled(pg); await frames(pg, 2);
          return pg.evaluate(() => { BLOOM_API.advance(400); const s = BLOOM_API.state(), S = BLOOM_API.sim; let h = 0x811c9dc5; for (let i = 0; i < S.state.length; i++) { h ^= S.state[i]; h = Math.imul(h, 0x01000193); h ^= Math.round(S.dens[i] * 1000) & 255; h = Math.imul(h, 0x01000193); } return JSON.stringify([s.ticks, s.biomass, s.coverage, (h >>> 0).toString(16)]); }); };
        const q2 = await open("?training=1&ui=18&return=" + encodeURIComponent("/demos/main-menu.html")); await sleep(400); const h2 = await script(q2); await q2.context().close();
        const q3 = await open("?training=1&ui=18&return=" + encodeURIComponent("/demos/main-menu.html")); await sleep(400); const h3 = await script(q3);
        check(h2 === h3 && h2.length > 10, `${tag} B21c · deterministic training stays deterministic through the production rooms: two fresh loads, the same room purchase and 400 ticks → identical ticks, Biomass, coverage and tiles`, `${h2.slice(0, 60)}…`);
        await q3.click("#pvMenuBtn"); await Promise.all([q3.waitForNavigation({ timeout: 20000 }).catch(() => {}), q3.click('#pvMenu [data-act="restartTraining"]')]); await q3.waitForFunction(() => window.BLOOM_RUN_UI && BLOOM_RUN_UI.adapter && BLOOM.decisionRooms && BLOOM.decisionRooms.instance, null, { timeout: 20000, polling: 100 }).catch(() => {}); await sleep(400);
        const re = await q3.evaluate(() => ({ url: location.search, running: BLOOM_RUN_UI.adapter.run().running, ticks: BLOOM_RUN_UI.adapter.run().ticks, menu: [...document.querySelectorAll("#pvMenu [data-act]")].map(b => b.dataset.act) }));
        check(/training=1/.test(re.url) && !/ui=legacy/.test(re.url) && re.running === false && re.ticks === 0 && J(re.menu) === '["restartTraining","skipTraining","mainMenu"]', `${tag} B21d · Restart training (the production menu, the page's own path) reopens the training run paused at tick 0 in the production view; Skip / Main menu remain in the menu`, J(re));
        check(!q.errs.length && !q3.errs.length, `${tag} B21e · training pages: no console error`, [...q.errs, ...q3.errs].join(" | ") || "none"); await q.context().close(); await q3.context().close(); }
      // ---- B22 · reduced motion
      if (!FF) { const q = await open("?archetype=ocean_archipelago&seed=28&ui=18", { rm: true }); await openRoom(q, "adapt"); await hoverNode(q, "cold");
        const r = await q.evaluate(() => ({ cls: document.querySelector(".pv").classList.contains("reduced"), anims: document.getAnimations().filter(a => a.playState === "running").length, room: __dr.DR.state().room, pv: __dr.DR.state().preview, trans: getComputedStyle(document.querySelector(".dr .lf-info")).transitionDuration }));
        check(r.cls && r.anims === 0 && r.room === "adapt" && r.pv === "cold" && /^0s/.test(r.trans), `${tag} B22 · reduced motion: the rooms run no animation or transition while open and previewing`, J(r)); await shot(q, "18-reduced-motion-adapt.png"); await q.context().close(); }
      if (FF) { const q = await open("?archetype=ocean_archipelago&seed=28&ui=18"); await openRoom(q, "adapt"); await hoverNode(q, "cold"); await shot(q, "17-firefox-1280x800-adapt.png"); await q.context().close(); }
      // ---- B23 · the mini-map region peek shot (evidence) + the 029B Planet View still behaves (banner, Map View) with the rooms mounted
      if (!FF) { const q = await open("?archetype=ocean_archipelago&seed=28&ui=18"); await openRoom(q, "region");
        await q.evaluate(() => { const room = __dr.room(), b = [...room.querySelectorAll(".mm-strip [data-r]")].find(x => +x.dataset.r !== __dr.DR.state().context); b.dispatchEvent(new PointerEvent("pointerover", { bubbles: true, pointerType: "mouse" })); }); await frames(q, 3); await shot(q, "11-room-minimap-region-peek.png");
        await q.click(".dr .dr-room:not([hidden]) .rb.back"); await settled(q); await frames(q, 3);
        const r = await q.evaluate(async () => { const A = __dr.A, o = A.regions().find(x => x.isOrigin).index; A.actions.selectRegion(o); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
          return { banner: !document.getElementById("pvBanner").hidden, name: document.querySelector("#pvBanner .bn-t b").textContent === A.regions()[o].name, tools: [...document.querySelectorAll(".pv-tool[data-room]")].map(b => b.dataset.tool + ":" + b.dataset.room) }; });
        check(r.banner && r.name && J(r.tools) === J(["region:ready", "adapt:ready", "spread:ready", "terraform:ready"]), `${tag} B23 · after a room closes the Planet View works as before (selection → banner); the tools read Region / Adapt / Spread / Terraform ready (029D)`, J(r)); await q.context().close(); }
    } catch (e) { check(false, `${tag} crashed`, e.stack.split("\n").slice(0, 4).join(" | ")); }
    for (const pg of pages) await pg.context().close().catch(() => {});
    await browser.close();
  }
  server.close();
  if (EVIDENCE) fs.writeFileSync(path.join(EVD, "measurements.json"), J(MEAS, null, 2));
  console.log(`\n${fails ? `${fails} check(s) FAILED` : "ALL CHECKS PASS"}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log("FAIL  crashed — " + e.stack); console.log("\n1 check(s) FAILED"); process.exit(1); });
