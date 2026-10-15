// BLOOM-039 Native Competition re-audit. usage: node native-audit.js <before|after> <out.json> [shotsDir]
// A · every region where the competition (not the ground) holds the plant back — side native, native cover there, the plant could grow —
//     read in the REAL banner: does it still say "Nothing holding the plant back"? does it name the competition? (several worlds × times)
// B · the production Terraform room, hovering each real sky node: does the preview show the native shift BEFORE purchase?
// C · the FRONT STALLED cue: a deterministic stalled front (no purchases, game time advanced) → the cue appears after ~120 game s, not
//     before; paused time does not count; meaningful front progress clears it. (AFTER only: BEFORE has no cue.)
const Q = require("./q.js"), fs = require("fs");
const [which, OUT, SHOTS] = process.argv.slice(2), out = { which, A: { worlds: [] }, B: {}, C: {} };
const L = require(require("path").join(Q.WT, "tools/research/design-audit/atlas-lib.js"));
(async () => { const S = await Q.serve(Q.rootOf(which)), b = await Q.launch();
  const open = async (archetype, seed, sp = "organic_hybrid") => { const p = await Q.newPage(b, { width: 1440, height: 900, seeded: true }); await p.goto(Q.nav.harnessURL(S.origin, { archetype, seed, scenario: "native_competition", species: sp })); await Q.waits.harness(p); await p.evaluate(() => BLOOM_RUN_UI.adapter.actions.pause()); return p; };
  const shot = async (p, n) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await p.screenshot({ path: `${SHOTS}/${which}-${n}.png` }); } };
  // ---- A
  for (const [arch, seed, buys, ticks] of [["desert_world", 7, ["drought", "drought"], 900], ["desert_world", 11, ["drought", "drought", "seedOut"], 1200], ["frozen_world", 7, ["cold", "cold"], 1200], ["ocean_archipelago", 28, ["waterSeeds", "seedOut"], 1200]]) {
    const p = await open(arch, seed);
    const r = await p.evaluate(async ([buys, ticks]) => { BLOOM_API.addBiomass(2000); for (const id of buys) BLOOM_API.buy(id); BLOOM_API.advance(ticks);
      const A = BLOOM_RUN_UI.adapter, sim = BLOOM_API.sim, GT = sim.config.grow.growThresh, rows = [];
      for (const g of A.regions()) { const c = sim.competitionAt(g.index); if (!c || c.side !== "native" || !c.nativeTiles || !(sim.evaluate(g.index).fitness > GT)) continue;
        A.actions.selectRegion(g.index); await new Promise(r => setTimeout(r, 0)); const t = document.getElementById("pvBanner").innerText.replace(/\s+/g, " ");
        rows.push({ name: g.name, nothingHolding: /Nothing holding the plant back/.test(t), namesCompetition: /Natives are better suited|native plants here are more established|Established natives are reclaiming/i.test(t), ownership: /Native-held|Natives \d+%/.test(t), lamp: g.lamp, labelGlyphCheck: g.lamp === "green" && !g.nativeHeld }); }
      A.actions.deselect(); return { coverage: +sim.coverage().toFixed(3), native: +sim.competition.share.toFixed(3), rows }; }, [buys, ticks]);
    out.A.worlds.push({ world: `${arch}:${seed}`, ...r });
    if (arch === "desert_world" && seed === 7) { const i = await p.evaluate(() => { const A = BLOOM_RUN_UI.adapter; return (A.regions().find(g => g.nativeHeld && g.status !== "blocked") || {}).index ?? -1; });
      if (i >= 0) { await p.evaluate(i => BLOOM_RUN_UI.adapter.actions.selectRegion(i), i); await p.waitForTimeout(400); await shot(p, "nc-banner-native"); }
      // ---- B (this world: Terraform room, each sky node hovered)
      await p.evaluate(() => BLOOM_RUN_UI.adapter.actions.deselect()); if (i >= 0) await p.evaluate(i => BLOOM_RUN_UI.adapter.actions.selectRegion(i), i);
      await L.openRoom(p, "terraform"); await p.waitForTimeout(800); const nodes = await p.$$eval(".dr-room:not([hidden]) .node", ns => ns.map(n => n.dataset.node)); out.B.nodes = [];
      for (const id of nodes) { await p.hover(`.dr-room:not([hidden]) .node[data-node="${id}"]`); await p.waitForTimeout(350);
        const t = await p.evaluate(() => ({ info: document.querySelector(".dr-room:not([hidden]) .lf-info").innerText.replace(/\s+/g, " "), ctx: document.querySelector(".dr-room:not([hidden]) .mm-ctx").innerText.replace(/\s+/g, " ") }));
        const pv = await p.evaluate(id => { const v = BLOOM_RUN_UI.adapter.previewOf(id); return { less: (v.nativeLess || []).length, more: (v.nativeMore || []).length, text: /suits native plants (less|more)/.test(v.text) }; }, id);
        out.B.nodes.push({ id, footerHasNativeShift: pv.text, adapterLists: [pv.less, pv.more], roomShowsNatives: /Natives/.test(t.info) || /natives/i.test(t.ctx), roomShowsLessMore: /Suits natives (less|more)/.test(t.ctx), info: t.info.slice(0, 300), ctx: t.ctx.slice(0, 300) });
        if (id === nodes[0] || pv.less) await shot(p, `nc-terraform-preview-${id}`); }
      await L.closeRoom(p); }
    await p.context().close(); }
  // ---- C (AFTER only): a stalled front with no purchases
  { const p = await open("desert_world", 7);
    const step = async (ticks) => p.evaluate(async t => { BLOOM_API.advance(t); await new Promise(r => setTimeout(r, 50)); return { s: BLOOM_RUN_UI.adapter.run().seconds, cov: +BLOOM_API.sim.coverage().toFixed(4), nat: +BLOOM_API.sim.competition.share.toFixed(4), st: BLOOM.planetView.instance.state().standoff, cue: !!document.querySelector("#pvScn .stall") }; }, ticks);
    await p.evaluate(() => { BLOOM_API.addBiomass(400); BLOOM_API.buy("drought"); BLOOM_API.buy("drought"); });
    const trace = []; for (let k = 0; k < 40; k++) trace.push(await step(100)); out.C.trace = trace;
    const first = trace.find(x => x.cue); out.C.firstCueAtSecond = first ? first.s : null; out.C.watchStartedAt = trace.map(x => x.st && x.st.watching ? x.s - x.st.stalledFor : null).filter(v => v !== null).pop();
    if (first) await shot(p, "nc-front-stalled");
    // paused wall time does not count (the watch is in game seconds): stay paused 3 s, no change
    const pz0 = await step(0); await p.waitForTimeout(3000); const pz1 = await step(0); out.C.pausedWallTime = { before: pz0.st, after: pz1.st };
    // progress clears it: give the plant real front progress (test-only state change: player stands on 2 % of land beside its front) → cue gone
    const prog = await p.evaluate(async () => { const s = BLOOM_API.sim, M = s.map; let n = 0, want = Math.ceil(0.02 * M.LAND);
      for (const t of M.LAND_TILES) { if (n >= want) break; if (s.state[t] === s.BAR && !(s.competition.native[t] > 0) && s.evaluate(M.TILEMAP[t]).fitness > s.config.grow.growThresh) { s.state[t] = s.LIV; s.dens[t] = 0.3; n++; } }
      BLOOM_API.advance(1); await new Promise(r => setTimeout(r, 50)); return { converted: n, cue: !!document.querySelector("#pvScn .stall"), st: BLOOM.planetView.instance.state().standoff }; });
    out.C.afterProgress = prog; await p.context().close(); }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  const A = out.A.worlds.flatMap(w => w.rows); console.log(which, "A regions", A.length, "nothingHolding", A.filter(x => x.nothingHolding).length, "namesCompetition", A.filter(x => x.namesCompetition).length,
    "| B", JSON.stringify((out.B.nodes || []).map(x => [x.id, x.adapterLists, x.roomShowsNatives, x.roomShowsLessMore])), "| C cue at", out.C.firstCueAtSecond, "after progress", JSON.stringify(out.C.afterProgress), "errs", 0);
  await b.close(); S.close(); })();
