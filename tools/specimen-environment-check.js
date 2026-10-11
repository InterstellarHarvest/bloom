// BLOOM — specimen ENVIRONMENT checks (BLOOM-035C2). resources/plant-visual/plant-environment.js + resources/run-ui/plant-specimen.js.
//
//   NODE_PATH="$(npm root -g)" node tools/specimen-environment-check.js [--browsers chromium,firefox] [--evidence]
//
// "ADAPT changes the ORGANISM. TERRAFORM changes the ENVIRONMENT around it." The scene behind the organism is region-driven (planet + region
// + the sky its ground sees now), never species-driven, and has its own signature, separate from the organism's.
// Node (real generated worlds — Desert 25 · Ocean 28 · Frozen 22 — and their real regions through createSim):
//   E1 determinism: the same scene twice → the same raster bytes, FX spec and signature; no Math.random / Date in the environment module
//   E2 species independence: every region × all four species → ONE environment signature and identical background pixels; the four organisms differ
//   E3 Terraform: the real sky traits' deltas (warm / cool / humid / dry) change the environment signature while every species' organism
//      signature AND organism pixels stay identical
//   E4 Adapt: a previewed adaptation changes the organism signature while the environment signature stays identical
//   E5 region-driven content: dry (cracks / haze), wet (standing water), cold (snow ground), clear (sun), rain and snow regions exist among the
//      real worlds; a specialist outside its strength (Cinder Rosette — dry / heat — in a wet and a snow region; Reed Spire — wet — in a dry
//      one) gets exactly the scene every other species gets there
//   E6 no scene = the pre-environment specimen frame, byte for byte (5401300's plant-specimen.js in an isolated VM), for the four species
//   E7 the neutral showcase: one scene for all four Species Selection cards, no sun / weather, presentation-only (no planet / region)
// Browser (Chromium + Firefox, file:// — offline): Species Selection cards share ONE environment signature; in a real run the Adapt room's
// specimen shows the region's scene (≠ the showcase); switching the room's region changes the environment and keeps the organism; an Adapt
// node preview changes the organism and keeps the environment; a Terraform node preview changes the environment and keeps the organism; the
// FX overlay animates, and under reduced motion it holds ONE still frame with the same weather state. --evidence writes
// docs/evidence/bloom-035c2/environment/ (engine renders + browser stills).
"use strict";
const path = require("path"), fs = require("fs"), cp = require("child_process"), vm = require("vm");
const ROOT = path.resolve(__dirname, "..");
const argv = process.argv, argOf = k => { const i = argv.indexOf(k); return i > 0 ? argv[i + 1] : null; };
const BROWSERS = (argOf("--browsers") || "chromium,firefox").split(",").filter(Boolean), EVIDENCE = argv.includes("--evidence");
const EVD = path.join(ROOT, "docs/evidence/bloom-035c2/environment"), BASE = "5401300";   // the 035C2 tip before the environment layer
const J = JSON.stringify, read = f => fs.readFileSync(path.join(ROOT, f), "utf8");
let fails = 0, passes = 0; const t0 = Date.now();
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); ok ? passes++ : fails++; return ok; };
const ENGINE = ["content/config.js", "content/traits.js", "content/species.js", "content/archetypes.js", "content/scenarios.js", "resources/bloom-sim.js", "resources/bloom-gen.js", "resources/bloom-validate.js",
  "resources/bloom-witness.js", "resources/bloom-archetype.js", "resources/bloom-species.js"];
const PLANT = ["resources/plant-visual/generated/plant-atlas.js", "resources/plant-visual/plant-visual-model.js", "resources/plant-visual/plant-components.js", "resources/plant-visual/plant-compositor.js",
  "resources/plant-visual/plant-fx.js", "resources/plant-visual/plant-environment.js", "resources/run-ui/plant-specimen.js"];

(async () => {
  for (const f of [...ENGINE, ...PLANT]) require(path.join(ROOT, f));
  const PS = BLOOM.plantSpecimen, PE = BLOOM.plantEnvironment, D = BLOOM_DATA, SP = D.species, W = 84, H = 98, SOIL = 68;
  const room = (t = {}, o = {}) => Object.assign({ traits: t, names: {}, preview: null, colony: { living: true, establishment: 0.7, word: "" }, focus: "balanced", local: null, condition: "ok", viable: true }, o);
  // real worlds → every region's scene (the same derivation as the rooms: the region's effective temperature / moisture = the sky its ground sees)
  const WORLDS = [["desert_world", 25], ["ocean_archipelago", 28], ["frozen_world", 22]], regions = [];
  for (const [aid, seed] of WORLDS) { const A = D.archetypes.find(a => a.id === aid), P = BLOOM.generateFromArchetype(A, seed, { config: D.config, traits: D.traits, winnability: false }), sim = BLOOM.createSim(P, D.config, D.traits, { rng: () => 0.5 });
    sim.map.SEC.forEach((sec, i) => { const e = sim.evaluate(i), L = sec.local;
      const mk = (dt = 0, dm = 0) => PE.region({ planetId: P.id, archetypeId: aid, regionId: sec.id, sky: { temperature: e.effT + dt, moisture: e.effM + dm }, salinity: L.salinity, toxicity: L.toxicity, radiation: e.effRad });
      regions.push({ aid, seed, planet: P.id, region: sec.id, name: sec.name, scene: mk(), mk }); }); }
  const skyTraits = D.traits.filter(t => t.effect.type === "sky").map(t => ({ id: t.id, dt: t.effect.axis === "temp" ? t.effect.delta : 0, dm: t.effect.axis === "moist" ? t.effect.delta : 0 }));
  console.log(`# Node — ${regions.length} real regions on ${WORLDS.map(w => w.join(" ")).join(" · ")}; sky traits ${skyTraits.map(t => t.id).join(", ")}`);

  // E1 · determinism
  { const src = read("resources/plant-visual/plant-environment.js").split("\n").map(l => l.replace(/\/\/.*$/, "")).join("\n"), bad = [];
    for (const r of regions) { const a = PE.paint(r.scene, W, H, SOIL), b = PE.paint(PE.region({ ...{ planetId: r.planet, archetypeId: r.aid, regionId: r.region }, sky: { temperature: r.scene.t, moisture: r.scene.m }, salinity: r.scene.salt, toxicity: r.scene.toxic, radiation: r.scene.rad }), W, H, SOIL);
      if (!Buffer.from(a).equals(Buffer.from(b)) || PE.signature(r.scene, W, H, SOIL) !== PE.signature(r.scene, W, H, SOIL) || J(PE.fx(r.scene)) !== J(PE.fx(r.scene))) bad.push(r.region); }
    const d1 = PS.draw(room(), { species: SP[1], scene: regions[0].scene }), d2 = PS.draw(room(), { species: SP[1], scene: regions[0].scene });
    check(!bad.length && !/Math\.random|Date\.now|new Date/.test(src) && d1.sig === d2.sig && d1.envSig === d2.envSig && d1.organismSig === d2.organismSig,
      `E1 · deterministic: every one of ${regions.length} real region scenes paints the same raster, FX spec and signature twice (also rebuilt from its numbers); the specimen frame / organism / environment signatures repeat; the module rolls no dice and reads no clock`, bad.join(",")); }
  // E2 · species independence
  { const bad = []; let n = 0;
    for (const r of regions) { const D4 = SP.map(sp => PS.draw(room(), { species: sp, scene: r.scene })); n++;
      if (new Set(D4.map(d => d.envSig)).size !== 1 || D4.some(d => !Buffer.from(d.bg).equals(Buffer.from(D4[0].bg))) || new Set(D4.map(d => d.organismSig)).size !== 4) bad.push(r.region); }
    check(!bad.length, `E2 · region-driven, never species-driven: for each of ${n} real regions the four species get ONE environment signature and byte-identical background pixels, while their four organisms differ`, bad.slice(0, 5).join(",")); }
  // E3 · Terraform changes only the environment
  { const bad = []; let changed = 0, tried = 0;
    for (const r of regions.filter((_, k) => k % 3 === 0)) for (const t of skyTraits) { const s1 = r.mk(t.dt, t.dm); tried++;
      for (const sp of SP) { const a = PS.draw(room({ cold: 1 }), { species: sp, scene: r.scene }), b = PS.draw(room({ cold: 1 }), { species: sp, scene: s1 });
        const orgPx = (d, o) => { const out = []; for (let i = 0; i < d.frame.plant.m.length; i++) if (d.frame.plant.m[i]) out.push(d.rgba[i * 4], d.rgba[i * 4 + 1], d.rgba[i * 4 + 2]); return out; };
        if (a.organismSig !== b.organismSig || J(orgPx(a)) !== J(orgPx(b))) bad.push(`${r.region}/${t.id}/${sp.id}: organism moved`);
        if (sp === SP[0] && a.envSig !== b.envSig) changed++; } }
    check(!bad.length && changed >= tried * 0.6, `E3 · Terraform (the real sky traits' deltas warm / cool / humid / dry over real regions): the environment signature changes (${changed} of ${tried} region × trait previews show a visible consequence) while every species' organism signature AND organism pixels stay identical`, bad.slice(0, 4).join(" | ")); }
  // E4 · Adapt changes only the organism
  { const bad = []; let n = 0;
    for (const r of regions.filter((_, k) => k % 4 === 0)) for (const sp of SP) for (const pv of [{ id: "cold", tier: 1 }, { id: "drought", tier: 1 }, { id: "seedOut", tier: 1 }]) { n++;
      const a = PS.draw(room(), { species: sp, scene: r.scene }), b = PS.draw(room({}, { preview: pv }), { species: sp, scene: r.scene });
      if (a.envSig !== b.envSig || a.organismSig === b.organismSig || !Buffer.from(a.bg).equals(Buffer.from(b.bg))) bad.push(`${r.region}/${sp.id}/${pv.id}`); }
    check(!bad.length, `E4 · Adapt: ${n} previews (Cold / Drought / Seed Output × four species × real regions) change the organism signature while the environment signature and background pixels stay identical`, bad.slice(0, 4).join(",")); }
  // E5 · region-driven content, incl. a specialist outside its strength
  const kinds = { dry: r => { const L = PE.look(r.scene); return L.cracks && L.sun; }, wet: r => PE.look(r.scene).water > 0, cold: r => PE.look(r.scene).snowGround, clear: r => PE.look(r.scene).sun,
    rain: r => !!PE.fx(r.scene).rain, snow: r => !!PE.fx(r.scene).snow };
  const found = Object.fromEntries(Object.entries(kinds).map(([k, f]) => [k, regions.find(f) || null]));
  // a controlled sky for the kinds a world does not show today (the same region under a Terraformed sky: the real Terraform path)
  const viaSky = (k, dt, dm) => { if (found[k]) return; for (const r of regions) for (let n = 1; n <= 6 && !found[k]; n++) { const s = r.mk(dt * n, dm * n); if (kinds[k]({ scene: s })) found[k] = { ...r, scene: s, terraformed: `${dt * n >= 0 ? "+" : ""}${dt * n} °C · ${dm * n >= 0 ? "+" : ""}${dm * n} moisture` }; } };
  viaSky("rain", 6, 8); viaSky("wet", 6, 8); viaSky("snow", -6, 8); viaSky("cold", -6, 0); viaSky("dry", 6, -8);
  { const sp = id => SP.find(s => s.id === id), pairs = [["cinder_rosette", found.wet], ["cinder_rosette", found.snow], ["reed_spire", found.dry]], bad = [];
    for (const [id, r] of pairs) { if (!r) { bad.push(`${id}: no region`); continue; } const a = PS.draw(room(), { species: sp(id), scene: r.scene }), o = PS.draw(room(), { species: SP[0], scene: r.scene }); if (a.envSig !== o.envSig) bad.push(`${id} @ ${r.region}`); }
    check(Object.values(found).every(Boolean) && !bad.length,
      `E5 · the scene follows the region: dry (cracks + sun), wet (standing water), cold (snow ground), clear (sun), rain and snow regions among the real worlds${Object.values(found).some(r => r && r.terraformed) ? " (some under a real Terraformed sky)" : ""}; Cinder Rosette in a wet and a snow region and Reed Spire in a dry region get exactly the scene Organic Hybrid gets there`,
      J(Object.fromEntries(Object.entries(found).map(([k, r]) => [k, r ? `${r.aid} ${r.region} t${r.scene.t} m${r.scene.m}${r.terraformed ? " (" + r.terraformed + ")" : ""}` : null]))) + (bad.length ? " · " + bad.join(",") : "")); }
  // E6 · no scene = the pre-035C2 frame
  { const g = { Buffer, console }; vm.createContext(g); const bad = [];
    for (const f of ["content/config.js", "content/traits.js", "content/species.js", ...PLANT.filter(f => !f.includes("plant-environment") && !f.includes("plant-specimen"))]) vm.runInContext(read(f), g, { filename: f });
    vm.runInContext(cp.execSync(`git show ${BASE}:resources/run-ui/plant-specimen.js`, { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 26 }), g, { filename: "old-specimen" });
    for (const sp of SP) for (const st of [room(), room({ cold: 2, salt: 1 }), room({}, { preview: { id: "heat", tier: 1 } }), room({}, { colony: { living: false, establishment: 0, word: "" } }), room({ drought: 2 }, { viable: false, condition: "bad" })])
      for (const hl of [null, "roots"]) { const a = PS.draw(st, { species: sp, highlight: hl }), b = g.BLOOM.plantSpecimen.draw(st, { species: sp, highlight: hl }); if (!Buffer.from(a.rgba).equals(Buffer.from(b.rgba)) || J(a.anchors) !== J(b.anchors)) bad.push(`${sp.id}`); }
    check(!bad.length, `E6 · without a scene the specimen is the pre-environment frame byte for byte (${BASE}'s plant-specimen.js in an isolated VM; four species × base / mutated / preview / no colony / unviable × highlight): RGBA and anchors identical`, [...new Set(bad)].join(",")); }
  // E7 · the neutral showcase
  { const S = PE.showcase(), D4 = SP.map(sp => PS.drawSpecies(sp, { scene: S })), L = PE.look(S), F = PE.fx(S);
    check(new Set(D4.map(d => d.environmentSignature)).size === 1 && !L.sun && !F.rain && !F.snow && !F.haze && !F.dust && !F.ripples && S.planet === null && S.region === null && S.kind === "showcase",
      `E7 · Species Selection's neutral showcase: ONE environment signature for all four cards (${D4[0].environmentSignature}); no sun, rain, snow, haze, dust or water; no planet or region (presentation-only)`); }

  // ---------------------------------------------------------------- evidence (engine renders)
  const { encodePNG } = await import("file://" + path.join(ROOT, "tools/intake-organic-hybrid-art.mjs"));
  const up = (rgba, k) => { const o = new Uint8Array(W * k * H * k * 4); for (let y = 0; y < H * k; y++) for (let x = 0; x < W * k; x++) { const s = ((y / k | 0) * W + (x / k | 0)) * 4, t = (y * W * k + x) * 4; for (let c = 0; c < 4; c++) o[t + c] = rgba[s + c]; } return o; };
  if (EVIDENCE) { fs.mkdirSync(EVD, { recursive: true }); const K = 3, sp = id => SP.find(s => s.id === id), rows = [];
    const save = (name, d, note) => { fs.writeFileSync(path.join(EVD, name), encodePNG(W * K, H * K, up(d.rgba, K))); rows.push({ file: name, note, envSig: d.envSig, organismSig: d.organismSig }); };
    const C = sp("cinder_rosette");
    save("01-cinder-dry-region.png", PS.draw(room(), { species: C, scene: found.dry.scene }), `Cinder Rosette · dry region ${found.dry.region} (${found.dry.aid})`);
    save("02-cinder-wet-region.png", PS.draw(room(), { species: C, scene: found.wet.scene }), `Cinder Rosette · wet region ${found.wet.region} — a dry specialist outside its strength`);
    save("03-cinder-cold-region.png", PS.draw(room(), { species: C, scene: found.cold.scene }), `Cinder Rosette · cold region ${found.cold.region}`);
    save("04-woolly-clear-sun.png", PS.draw(room(), { species: sp("woolly_candle"), scene: found.clear.scene }), `Woolly Candle · clear sky, sun (${found.clear.region})`);
    save("05-reed-rain.png", PS.draw(room(), { species: sp("reed_spire"), scene: found.rain.scene }), `Reed Spire · overcast rain region (${found.rain.region}; rain streaks are the FX overlay in the browser)`);
    save("06-woolly-snow.png", PS.draw(room(), { species: sp("woolly_candle"), scene: found.snow.scene }), `Woolly Candle · snow (${found.snow.region}; flakes are the FX overlay)`);
    save("07-oh-standing-water.png", PS.draw(room(), { species: SP[0], scene: found.wet.scene }), `Organic Hybrid · standing water (${found.wet.region}) — water from the region, not the species`);
    const tr = regions[0], warm = skyTraits.find(t => t.id === "humid") || skyTraits[0];
    save("08a-terraform-before.png", PS.draw(room({ cold: 1 }), { species: sp("reed_spire"), scene: tr.scene }), "Terraform preview · before");
    save("08b-terraform-preview.png", PS.draw(room({ cold: 1 }), { species: sp("reed_spire"), scene: tr.mk(warm.dt * 3, warm.dm * 3) }), `Terraform preview · ${warm.id} ×3: environment changed, organism identical`);
    save("09a-adapt-before.png", PS.draw(room(), { species: C, scene: tr.scene }), "Adapt preview · before");
    save("09b-adapt-preview.png", PS.draw(room({}, { preview: { id: "cold", tier: 2 } }), { species: C, scene: tr.scene }), "Adapt preview · Cold II: organism changed, environment identical");
    fs.writeFileSync(path.join(EVD, "engine-renders.json"), J({ tool: "tools/specimen-environment-check.js --evidence", rows }, null, 1) + "\n"); console.log(`INFO  evidence — ${rows.length} engine renders → ${path.relative(ROOT, EVD)}/`); }

  // ---------------------------------------------------------------- browser
  let pw; try { pw = require("playwright"); } catch (e) { check(false, "playwright", "not installed: NODE_PATH=\"$(npm root -g)\""); return done(); }
  const FILE = "file://" + encodeURI(path.join(ROOT, "index.html"));
  for (const bn of BROWSERS) {
    const browser = await pw[bn].launch(); console.log(`\n# ${bn} ${browser.version()}`);
    const ctx = async (o = {}) => { const c = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...o }); await c.setOffline(true);
      await c.addInitScript(() => { try { localStorage.setItem("strange-bloom.training", '{"v":1,"status":"completed","at":1}'); } catch (e) { /* none */ } }); return c; };
    const go = async (c, species) => { const p = await c.newPage(); p.errs = []; p.on("pageerror", e => p.errs.push(e.message)); p.on("console", m => { if (m.type() === "error") p.errs.push(m.text()); }); p.on("dialog", d => d.accept());
      await p.goto(`${FILE}?sector=77&workers=3&bg=3`); await p.waitForFunction(() => window.MENU_DEV && MENU_DEV.ready && MENU_DEV.entry.state === "menu", null, { timeout: 60000 });
      await p.click('.mm-item[data-act="begin"]'); await p.waitForFunction(() => { const e = MENU_DEV.entry, v = e.speciesView; return e.state === "species" && v && v.inner && e.black.style.display === "none"; }, null, { timeout: 60000 });
      const cards = await p.evaluate(() => [...document.querySelectorAll(".ss-card canvas")].map(c => ({ env: c.dataset.environment, org: c.dataset.organism })));
      await p.evaluate(id => MENU_DEV.entry.speciesView.inner.open(id), species); await p.click(".ss-btn.go");
      await p.waitForFunction(() => { const s = MENU_DEV.entry.survey; return s && s.state === "survey" && s.cells.every(Boolean) && MENU_DEV.entry.black.style.display === "none"; }, null, { timeout: 180000 });
      await p.evaluate(() => MENU_DEV.entry.survey.select(0)); await p.waitForFunction(() => MENU_DEV.entry.survey.state === "focus", null, { timeout: 20000 }); await p.click(".ds-btn.go");
      await p.waitForFunction(() => window.BLOOM_APP && BLOOM_APP.session && BLOOM_APP.stats.sessions.length && BLOOM_APP.stats.sessions[0].readyMs !== null && !BLOOM_APP.busy && !document.querySelector(".atx"), null, { timeout: 90000 });
      return { p, cards }; };
    const specIn = (p, roomId) => p.evaluate(r => { const sp = BLOOM.plantSpecimen.mounted().find(x => x.el.closest(`.dr-room[data-room="${r}"]`) && !x.el.closest("[hidden]"));
      return sp ? { env: sp.environmentSignature(), org: sp.organismSignature(), glob: sp.globalSignature(), fx: sp.fxState(), scene: sp.scene ? { region: sp.scene.region, t: sp.scene.t, m: sp.scene.m } : null } : null; }, roomId);
    const settle = p => p.waitForTimeout(450);
    try {
      { const c = await ctx(), { p, cards } = await go(c, "cinder_rosette");
        await p.evaluate(() => { const D = BLOOM.decisionRooms.instance; D.open("adapt", D.state().context); }); await settle(p);
        const a0 = await specIn(p, "adapt"), DR = await p.evaluate(() => BLOOM.decisionRooms.instance.adapter.regions().length);
        let other = null; for (let i = 0; i < DR && !other; i++) { await p.evaluate(i => BLOOM.decisionRooms.instance.setCtx(i), i); await settle(p); const s = await specIn(p, "adapt"); if (s && s.env !== a0.env) other = { i, ...s }; }
        if (EVIDENCE) await p.screenshot({ path: path.join(EVD, `${bn}-adapt-other-region.png`) });
        // Adapt node preview: organism changes, environment holds
        const before = await specIn(p, "adapt"); await p.hover('.dr-room[data-room="adapt"] .node[data-node="cold"]').catch(() => {}); await settle(p); const during = await specIn(p, "adapt");
        if (EVIDENCE) await p.screenshot({ path: path.join(EVD, `${bn}-adapt-preview.png`) });
        await p.mouse.move(5, 5); await settle(p);
        check(cards.length === 4 && new Set(cards.map(x => x.env)).size === 1 && new Set(cards.map(x => x.org)).size === 4 && a0 && a0.scene && a0.env !== cards[0].env && other && other.glob === a0.glob
          && during && during.org !== before.org && during.env === before.env && !p.errs.length,
          `[${bn}] B1 · file:// offline: the four Species Selection cards share ONE showcase environment; in the run the Adapt room's specimen stands in its region's scene (≠ the showcase); switching the room's region changes the environment (${a0.scene.region} → ${other && other.scene.region}) and keeps the same global plant; an Adapt node preview changes the organism and keeps the environment`,
          J({ cards: cards.map(x => `${x.env}/${x.org}`), envs: [a0 && a0.env, other && other.env], globs: [a0 && a0.glob, other && other.glob], a0: a0 && a0.scene, other: other && other.scene, adapt: during && { org: during.org !== before.org, env: during.env === before.env }, errs: p.errs.slice(0, 2) }));
        // Terraform node preview: environment changes, organism holds
        await p.evaluate(() => { const D = BLOOM.decisionRooms.instance; D.close(); }).catch(() => {}); await settle(p);
        await p.evaluate(() => { const D = BLOOM.decisionRooms.instance; D.open("terraform", D.state().context); }); await p.waitForTimeout(900);
        const t0s = await specIn(p, "terraform"); if (EVIDENCE) await p.screenshot({ path: path.join(EVD, `${bn}-terraform-before.png`) });
        let tp = null, node = null; for (const id of ["humid", "warm", "cool", "dry"]) { await p.hover(`.dr-room[data-room="terraform"] .node[data-node="${id}"]`).catch(() => {}); await settle(p); const s = await specIn(p, "terraform"); if (s && s.env !== t0s.env) { tp = s; node = id; break; } }
        if (EVIDENCE) await p.screenshot({ path: path.join(EVD, `${bn}-terraform-preview.png`) });
        await p.mouse.move(5, 5); await settle(p); const t1s = await specIn(p, "terraform");
        check(t0s && tp && tp.org === t0s.org && tp.env !== t0s.env && t1s.env === t0s.env && !p.errs.length,
          `[${bn}] B2 · the Terraform room shows the plant IN its region's scene: a Terraform node preview (${node}) changes the environment signature while the organism signature stays identical; leaving the node restores the committed scene`, J({ t0: t0s && t0s.scene, tp: tp && tp.scene, errs: p.errs.slice(0, 2) }));
        const fxN = await specIn(p, "terraform");
        check(fxN && fxN.fx && fxN.fx.spec && fxN.fx.animating && !fxN.fx.still, `[${bn}] B3 · the weather FX overlay animates (its own canvas; ${fxN && fxN.fx && fxN.fx.spec ? Object.keys(fxN.fx.spec).filter(k => fxN.fx.spec[k] && k !== "seed").join(", ") : "-"})`);
        await c.close(); }
      { const c = await ctx({ reducedMotion: "reduce" }), { p } = await go(c, "woolly_candle");
        await p.evaluate(() => { const D = BLOOM.decisionRooms.instance; D.open("adapt", D.state().context); }); await settle(p);
        const s = await specIn(p, "adapt"), f1 = s && s.fx && s.fx.frames; await p.waitForTimeout(600); const s2 = await specIn(p, "adapt");
        check(s && s.fx && s.fx.spec && !s.fx.animating && s.fx.still && s2.fx.frames === f1 && s.env && s.scene, `[${bn}] B4 · reduced motion: the FX overlay holds ONE still frame (no frame drawn over time) while the weather state (spec) and the region's scene remain`, J(s && s.fx));
        await c.close(); }
    } catch (e) { check(false, `[${bn}] the browser part ran to the end`, String(e && e.stack || e).slice(0, 500)); }
    await browser.close();
  }
  done();
})().catch(e => { console.error(e); process.exit(1); });
function done() { console.log(`\n${fails ? "FAIL" : "OK"} — specimen-environment-check: ${passes} passed, ${fails} failed (${((Date.now() - t0) / 1000).toFixed(1)} s)`); process.exit(fails ? 1 : 0); }
