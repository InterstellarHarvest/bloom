// BLOOM-029A evidence: before / after functional equivalence of the temporary run shell.
//
//   NODE_PATH="$(npm root -g)" node docs/evidence/bloom-029a/qa-equivalence.js <before root (c23815e)> <after root> [--shots <dir>]
//
// The same scripted player drives demos/demo-run.html in both trees through the REAL shell only (map clicks, shop clicks, growth-
// focus clicks, bubble clicks — never the adapter), with Math.random seeded, the animation-frame loop frozen and a fake clock, so a
// run is exactly reproducible. Every 50 ticks it records the sim (tiles, density, vigor, Biomass, genome, sky, colonies, bubbles),
// the shell (HUD, inspect, colony controls, shop, footer, scenario bars) and every bloom:* event. At the end it screenshots the
// page (CSS animations settled, wall-time floaters removed). Before and after must agree at every checkpoint and event for event,
// and the screenshots must be pixel-identical below the header strip (y ≥ 60: the map, inspect, shop, footer, report). The header's
// buttons can differ by a few anti-aliased pixels between two loads of the SAME tree (measured: c23815e vs c23815e, 6 px on the
// ☰ button), so header pixels are reported, not judged. Control: run it with the same root twice (before vs before).
"use strict";
const { chromium } = require("playwright"), path = require("path"), fs = require("fs"), crypto = require("crypto");
const [BEFORE, AFTER] = process.argv.slice(2, 4).map(p => path.resolve(p)), argOf = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const SHOTS = argOf("--shots"), J = JSON.stringify, sha = b => crypto.createHash("sha256").update(b).digest("hex").slice(0, 12);
const RUNS = [["first_bloom", "", 1, 1600], ["first_bloom (seed 2)", "", 2, 1600], ["training", "?training=1", 3, 1400], ["planet=training_grounds", "?planet=training_grounds", 4, 1200],
  ["ocean_archipelago 28", "?archetype=ocean_archipelago&seed=28", 5, 1400], ["dying_world · ocean 28", "?archetype=ocean_archipelago&seed=28&scenario=dying_world", 6, 1400],
  ["native_competition · desert 22", "?archetype=desert_world&seed=22&scenario=native_competition", 7, 1400], ["volatile_climate · frozen 4", "?archetype=frozen_world&seed=4&scenario=volatile_climate", 8, 1400]];
const INIT = seed => {
  let a = seed; Math.random = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  let T = 1000; performance.now = () => T; window.__clock = ms => { T += ms; }; window.requestAnimationFrame = () => 0;
  window.__EV = []; for (const t of ["run-ready", "play-pause", "speed", "region-select", "upgrade-preview", "upgrade-purchase", "growth-focus", "local-upgrade", "bubble-collect", "win"])
    document.addEventListener("bloom:" + t, e => window.__EV.push(t + ":" + JSON.stringify(e.detail)));
  // (wall-time effects are left out on both sides: the "−N" spend floaters and the bars' "pulse" glow are removed by real setTimeouts)
  window.__calm = () => { document.querySelectorAll(".spend").forEach(x => x.remove()); document.querySelectorAll(".pulse").forEach(x => x.classList.remove("pulse")); };
  window.__snap = () => { __calm(); const $ = s => { const e = document.querySelector(s); return e ? e.innerHTML : null; };
    let h = 2166136261; const mix = arr => { for (const v of arr) h = Math.imul(h ^ (Math.round(v * 1e6) | 0), 16777619) >>> 0; };
    mix(sim.state); mix(sim.dens); mix(sim.vigor); mix([sim.biomass, sim.ticks, sim.sky.temp, sim.sky.moist]); mix(sim.bubbles.map(b => b.tile));
    return { sim: (h >>> 0).toString(16) + JSON.stringify({ g: sim.genome, tf: sim.tf, f: sim.colonies.focus, s: sim.colonies.spec, won: sim.won, lost: sim.lost }),
      hud: $("header"), insp: $("#inspMain"), focus: $("#focusBox"), more: $("#inspMore"), shop: $("#shop"), log: $("#log"), report: $("#report"), ev: window.__EV.length }; };
};
async function play(browser, root, [label, q, seed, maxTicks]) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } }); await ctx.addInitScript(INIT, seed);
  const p = await ctx.newPage(), errs = []; p.on("pageerror", e => errs.push(e.message));
  await p.goto("file://" + encodeURI(path.join(root, "demos/demo-run.html")) + q);
  await p.waitForFunction(() => window.BLOOM_RUN && BLOOM_RUN.started, null, { polling: 50 }); await p.waitForFunction(() => !document.getElementById("trainingCover"), null, { polling: 100, timeout: 5000 }); // (rAF is frozen: poll by time)
  const at = (t) => p.evaluate(t => { const r = cv.getBoundingClientRect(), W = sim.map.W; return { x: r.left + ((t % W) + .5) * TILE, y: r.top + (((t / W) | 0) + .5) * TILE }; }, t);
  const render = () => p.evaluate(() => { __clock(16); frame(performance.now()); });
  const checkpoints = [], FOCI = ["roots", "leaves", "seeds", "balanced"];
  await render();
  for (let t = 0, k = 0; t <= maxTicks; t += 10) {
    const st = await p.evaluate(() => { BLOOM_API.advance(10); __clock(1600); frame(performance.now()); return { won: sim.won, lost: sim.lost, ticks: sim.ticks, bub: sim.bubbles.map(b => b.tile), SC: sim.map.SC }; });
    if (st.won || st.lost) { checkpoints.push(await p.evaluate(() => __snap())); break; }
    if (st.bub.length) { const xy = await at(st.bub[0]); await p.mouse.click(xy.x, xy.y); await render(); }                          // collect a bubble (canvas click)
    const buy = await p.evaluate(() => { const b = [...document.querySelectorAll("#shop button.buy:not(.off)")].sort((a, b) => +a.querySelector(".cost").textContent - +b.querySelector(".cost").textContent)[0]; return b ? b.dataset.id : null; });
    if (buy && t % 30 === 0) { await p.click(`#shop button.buy[data-id="${buy}"]`); await p.mouse.move(2, 2); await render(); }    // the cheapest affordable upgrade (shop click)
    if (t % 150 === 0) { k++; const tile = await p.evaluate(i => { const M = sim.map, c = M.CENT[i]; let best = -1, bd = 1e9;                   // click a region, then a focus
        for (const x of M.SEC_TILES[i]) { const d = ((x % M.W) + .5 - c.x) ** 2 + (((x / M.W) | 0) + .5 - c.y) ** 2; if (d < bd) { bd = d; best = x; } } return best; }, k % st.SC);
      const xy = await at(tile); await p.mouse.click(xy.x, xy.y); await render();
      const fb = await p.$(`#focusBox button.fbtn[data-focus="${FOCI[k % 4]}"]:not(.off)`); if (fb) { await fb.click(); await render(); }
      const sb = await p.$("#focusBox button.sbtn:not(.off)"); if (sb) { await sb.click(); await render(); } }                      // a local upgrade when affordable
    if (t % 50 === 0) checkpoints.push(await p.evaluate(() => __snap()));
  }
  // (and the panels' scroll offsets, which the harness's own scroll-into-view clicks leave behind: measured 342 vs 361 px on the same tree)
  await p.evaluate(() => { __calm(); for (const id of ["inspect", "shop"]) document.getElementById(id).scrollTop = 0; }); await p.mouse.move(2, 2);
  const events = await p.evaluate(() => window.__EV), shot = await p.screenshot({ animations: "disabled", caret: "hide" });
  await ctx.close(); return { label, checkpoints, events, shot, errs };
}
// pixel difference of two PNGs, decoded by the browser: { pixels, bbox [x0,y0,x1,y1] | null, below: pixels at y ≥ 60 }
async function pixelDiff(browser, a, b) {
  const p = await browser.newPage(); const r = await p.evaluate(async ([a, b]) => {
    const img = async u => { const i = new Image(); i.src = u; await i.decode(); const c = document.createElement("canvas"); c.width = i.width; c.height = i.height;
      const x = c.getContext("2d"); x.drawImage(i, 0, 0); return x.getImageData(0, 0, c.width, c.height); };
    const A = await img(a), B = await img(b); if (A.width !== B.width || A.height !== B.height) return { pixels: -1, bbox: null, below: -1 };
    let n = 0, below = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let i = 0; i < A.data.length; i += 4) if (A.data[i] !== B.data[i] || A.data[i + 1] !== B.data[i + 1] || A.data[i + 2] !== B.data[i + 2]) {
      const k = i / 4, x = k % A.width, y = (k / A.width) | 0; n++; if (y >= 60) below++; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    return { pixels: n, bbox: n ? [x0, y0, x1, y1] : null, below }; }, ["data:image/png;base64," + a.toString("base64"), "data:image/png;base64," + b.toString("base64")]);
  await p.close(); return r;
}
(async () => {
  const browser = await chromium.launch(), lines = [], rows = []; let bad = 0;
  for (const run of RUNS) {
    const a = await play(browser, BEFORE, run), b = await play(browser, AFTER, run);
    const firstDiff = a.checkpoints.findIndex((c, i) => J(c) !== J(b.checkpoints[i])), same = firstDiff < 0 && a.checkpoints.length === b.checkpoints.length;
    const px = await pixelDiff(browser, a.shot, b.shot), evSame = J(a.events) === J(b.events), shotSame = px.below === 0, last = b.checkpoints[b.checkpoints.length - 1];
    const ok = same && evSame && shotSame && !a.errs.length && !b.errs.length; if (!ok) bad++;
    const types = {}; b.events.forEach(e => { const t = e.split(":")[0]; types[t] = (types[t] || 0) + 1; });
    let detail = ""; if (firstDiff >= 0) { const x = a.checkpoints[firstDiff], y = b.checkpoints[firstDiff] || {}; detail = ` · FIRST DIFF at checkpoint ${firstDiff}: ${Object.keys(x).filter(k => J(x[k]) !== J(y[k])).join(", ")}`; }
    lines.push(`${ok ? "SAME" : "DIFF"}  ${run[0]} (Math.random seed ${run[2]}): ${b.checkpoints.length} checkpoints identical=${same} · ${b.events.length} bloom:* events identical=${evSame} (${Object.entries(types).map(([t, n]) => `${t} ${n}`).join(", ")})`
      + ` · screenshot ${sha(a.shot)} vs ${sha(b.shot)}: ${px.pixels} px differ${px.bbox ? ` in [${px.bbox.join(",")}]` : ""}, below the header ${px.below} · final sim ${last.sim.slice(0, 8)} won=${/"won":true/.test(last.sim)}${a.errs.concat(b.errs).length ? " · ERR " + a.errs.concat(b.errs).join(" | ") : ""}${detail}`);
    rows.push({ run: run[0], checkpoints: b.checkpoints.length, events: b.events.length, same, evSame, shotSame });
    if (SHOTS && run[0] === "first_bloom") { fs.mkdirSync(SHOTS, { recursive: true }); fs.writeFileSync(path.join(SHOTS, "equivalence-first-bloom-c23815e.png"), a.shot); fs.writeFileSync(path.join(SHOTS, "equivalence-first-bloom-029a.png"), b.shot); }
  }
  await browser.close();
  console.log(lines.join("\n")); console.log(bad ? `\n${bad} run(s) DIFFER` : `\nALL ${RUNS.length} RUNS IDENTICAL (before c23815e = after BLOOM-029A)`); process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
