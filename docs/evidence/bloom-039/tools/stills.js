// BLOOM-039 evidence stills, BEFORE (main) and AFTER (worktree) on identical states. usage: node stills.js <outDir>
const Q = require("./q.js"), fs = require("fs"), path = require("path"); const L = require(path.join(Q.WT, "tools/research/design-audit/atlas-lib.js"));
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
(async () => { const b = await Q.launch(), SB = await Q.serve(Q.MAIN), SA = await Q.serve(Q.WT);
  const open = async (S, w, h, q) => { const p = await Q.newPage(b, { width: w, height: h, seeded: true }); await p.goto(Q.nav.harnessURL(S.origin, q)); await Q.waits.harness(p); await p.evaluate(() => BLOOM_RUN_UI.adapter.actions.pause()); return p; };
  const both = async (name, w, h, q, prep, sel) => { for (const [k, S] of [["before", SB], ["after", SA]]) { const p = await open(S, w, h, q); if (prep) await p.evaluate(prep); await p.waitForTimeout(300);
      if (sel) { const i = await p.evaluate(sel); if (i >= 0) { await p.evaluate(i => BLOOM_RUN_UI.adapter.actions.selectRegion(i), i); await p.waitForTimeout(450); } }
      await p.mouse.move(1, h - 1); await p.screenshot({ path: `${OUT}/${name}-${k}.png` }); await p.context().close(); } };
  // multi-tier Would help (frozen 7, Hoar Reach) · 1024
  await both("readout-multistep-1024", 1024, 768, { archetype: "frozen_world", seed: 7, species: "organic_hybrid" }, () => BLOOM_API.advance(60), () => BLOOM_RUN_UI.adapter.regions().findIndex(r => r.name === "Hoar Reach"));
  // helps; still blocks (frozen 7, Tundra Cirque) · 1440
  await both("readout-helps-still-blocks-1440", 1440, 900, { archetype: "frozen_world", seed: 7, species: "organic_hybrid" }, () => BLOOM_API.advance(60), () => BLOOM_RUN_UI.adapter.regions().findIndex(r => r.name === "Tundra Cirque"));
  // a growable region the old readout called Blocked (first such region in the sample: largest fitness in (0.55, 0.72) with a factor < 0.72)
  await both("readout-strained-vs-blocked-1440", 1440, 900, { archetype: "desert_world", seed: 7, species: "organic_hybrid" }, () => { BLOOM_API.addBiomass(400); BLOOM_API.buy("drought"); BLOOM_API.advance(200); },
    () => { const s = BLOOM_API.sim, G = s.config.grow.growThresh; let best = -1, bf = 0; for (let i = 0; i < s.map.SC; i++) { const e = s.evaluate(i); if (!s.map.SEC[i].isOrigin && e.fitness > G && e.limitF < s.config.categories.blockedBelow && e.fitness > bf) { bf = e.fitness; best = i; } } return best; });
  // lethal toxicity (desert 7 native competition: Ochre Hollow)
  await both("readout-toxicity-1440", 1440, 900, { archetype: "desert_world", seed: 7, species: "organic_hybrid", scenario: "native_competition" }, null, () => BLOOM_RUN_UI.adapter.regions().findIndex(r => r.name === "Ochre Hollow"));
  // Native Competition: native-held ground (after a stalled front)
  await both("nc-native-held-1440", 1440, 900, { archetype: "desert_world", seed: 7, species: "organic_hybrid", scenario: "native_competition" }, () => { BLOOM_API.addBiomass(400); BLOOM_API.buy("drought"); BLOOM_API.buy("drought"); BLOOM_API.advance(900); },
    () => BLOOM_RUN_UI.adapter.regions().findIndex(r => r.name === "Gold Dunes 1"));
  // label click proof (ocean 28, 1024): a click inside a pill whose end sits over another region / water
  for (const [k, S] of [["before", SB], ["after", SA]]) { const p = await open(S, 1024, 768, { archetype: "ocean_archipelago", seed: 28, species: "organic_hybrid" });
    const pt = await (k === "before" ? (async () => { const pa = await open(SA, 1024, 768, { archetype: "ocean_archipelago", seed: 28, species: "organic_hybrid" });
      const r = await pa.evaluate(() => { const R = BLOOM.planetView.instance.renderer, I = R.info(), cv = document.getElementById("pvMap").getBoundingClientRect();
        for (const L of I.labels) for (const fx of [0.92, 0.08]) { const x = cv.left + L.x + L.w * fx, y = cv.top + L.y + L.h / 2; if (R.hitTest(x, y).region !== L.index && document.elementFromPoint(x, y) === document.getElementById("pvMap")) return { x, y, label: L.name, under: R.hitTest(x, y).region }; } return null; });
      await pa.context().close(); fs.writeFileSync(`${OUT}/label-click-point.json`, JSON.stringify(r)); return r; })() : Promise.resolve(JSON.parse(fs.readFileSync(`${OUT}/label-click-point.json`, "utf8"))));
    if (pt) { await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(400); await p.evaluate(([x, y]) => { const d = document.createElement("div"); d.style.cssText = `position:fixed;left:${x - 9}px;top:${y - 9}px;width:18px;height:18px;border:3px solid #e0205a;border-radius:50%;z-index:9999;pointer-events:none`; document.body.appendChild(d); }, [pt.x, pt.y]);
      const sel = await p.evaluate(() => BLOOM_RUN_UI.adapter.selection().name); fs.writeFileSync(`${OUT}/label-click-${k}.json`, JSON.stringify({ ...pt, selected: sel })); await p.screenshot({ path: `${OUT}/label-click-1024-${k}.png` }); }
    await p.context().close(); }
  // 2560 decision room (Spread) + run, BEFORE / AFTER, through the app
  for (const [k, S] of [["before", SB], ["after", SA]]) { const p = await Q.newPage(b, { width: 2560, height: 1440 }); await p.goto(S.origin + "/?bg=3&sector=7"); await Q.waits.menu(p); await Q.nav.toSpecies(p); await Q.nav.chooseSpecies(p, "organic_hybrid"); await Q.waits.survey(p); await Q.nav.focusFirst(p); await p.waitForTimeout(500);
    await p.click(".ds-btn.go"); await Q.waits.run(p, 1); await p.waitForTimeout(600); await p.screenshot({ path: `${OUT}/app-2560-run-${k}.jpg`, type: "jpeg", quality: 70 });
    await L.openRoom(p, "spread"); await p.waitForTimeout(500); await p.screenshot({ path: `${OUT}/room-2560-spread-${k}.jpg`, type: "jpeg", quality: 70 }); await L.closeRoom(p); await p.context().close(); }
  // unaffordable reason at rest (Adapt, 1024)
  { const p = await open(SA, 1024, 768, { archetype: "ocean_archipelago", seed: 28, species: "organic_hybrid" }); await L.openRoom(p, "adapt"); await p.waitForTimeout(500); await p.screenshot({ path: `${OUT}/room-adapt-1024-unaffordable-after.png` }); await p.context().close(); }
  await b.close(); SA.close(); SB.close(); console.log("stills done"); })();
