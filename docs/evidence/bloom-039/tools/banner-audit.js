// BLOOM-039 banner placement + label click audit, BEFORE (main) and AFTER (worktree) on the same worlds / viewports.
// usage: node banner-audit.js <out.json> [shotsDir] [browser]
const Q = require("./q.js"), fs = require("fs");
const [OUT, SHOTS, BR = "chromium"] = process.argv.slice(2);
const WORLDS = [["desert_world", 7, null], ["frozen_world", 7, null], ["ocean_archipelago", 28, null], ["desert_world", 7, "native_competition"]];
const VIEWS = [[1024, 768], [1440, 900], [1920, 1080], [2560, 1440]];
function PICK() { // representative regions by on-map position (world tiles): one per class, the largest
  const A = BLOOM_RUN_UI.adapter, m = A.map(), W = m.width, H = m.height, TM = m.tilemap, regs = A.regions(), info = regs.map(r => ({ i: r.index, area: r.area, cx: r.center.x / W, cy: r.center.y / H, origin: r.isOrigin, x0: false, x1: false, yb: false }));
  TM.forEach((s, t) => { if (s < 0) return; const x = t % W, y = (t / W) | 0; if (x === 0) info[s].x0 = true; if (x === W - 1) info[s].x1 = true; if (y === H - 1) info[s].yb = true; });
  const by = f => info.filter(f).sort((a, b) => b.area - a.area)[0];
  const out = { upper: by(r => r.cy < 0.25), middle: by(r => r.cy > 0.4 && r.cy < 0.6), lower: by(r => r.cy > 0.75), bottomEdge: by(r => r.yb), leftEdge: by(r => r.cx < 0.12), rightEdge: by(r => r.cx > 0.88), seam: m.topology && m.topology.wrapX ? by(r => r.x0 && r.x1) : null };
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v).map(([k, v]) => [k, v.i]));
}
function MEASURE(i) { // the selected region's visible share under the banner + scenario card; banner vs HUD / stage
  const PV = BLOOM.planetView.instance, A = BLOOM_RUN_UI.adapter, m = A.map(), W = m.width, R = PV.renderer, rect = e => e && !e.hidden && e.getBoundingClientRect();
  const bn = rect(document.getElementById("pvBanner")), scn = rect(document.getElementById("pvScn")), hud = rect(document.querySelector(".pv-hud")), st = rect(document.getElementById("pvStage"));
  let n = 0, underB = 0, underAny = 0; const inR = (r, p) => r && p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom;
  m.tilemap.forEach((s, t) => { if (s !== i) return; n++; const p = R.clientOf((t % W) + 0.5, ((t / W) | 0) + 0.5); const b = inR(bn, p); if (b) underB++; if (b || inR(scn, p)) underAny++; });
  const ov = (a, b) => a && b ? Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)) : 0;
  return { tiles: n, coveredByBanner: +(underB / n).toFixed(3), visible: +(1 - underAny / n).toFixed(3), place: (PV.state().bannerPlace || { place: "bottom" }).place,
    bannerHudOverlapPx: Math.round(ov(bn, hud)), bannerInStage: !!(bn && st && bn.top >= st.top - 0.5 && bn.bottom <= st.bottom + 0.5 && bn.left >= st.left - 0.5 && bn.right <= st.right + 0.5), bannerScnOverlapPx: Math.round(ov(bn, scn)),
    banner: bn && [Math.round(bn.left), Math.round(bn.top), Math.round(bn.width), Math.round(bn.height)] };
}
(async () => { const SB = await Q.serve(Q.MAIN), SA = await Q.serve(Q.WT), b = await Q.launch(BR), res = { browser: BR, banner: [], labels: [], stability: [], coach: {} };
  const open = async (S, w, v) => { const p = await Q.newPage(b, { width: v[0], height: v[1], seeded: true }); await p.goto(Q.nav.harnessURL(S.origin, { archetype: w[0], seed: w[1], scenario: w[2], species: "organic_hybrid" })); await Q.waits.harness(p);
    await p.evaluate(() => { BLOOM_RUN_UI.adapter.actions.pause(); BLOOM_API.advance(30); }); await p.waitForTimeout(300); return p; };
  for (const w of WORLDS) for (const v of VIEWS) {
    const pa = await open(SA, w, v), pb = await open(SB, w, v), picks = await pa.evaluate(PICK), tag = `${w[0]}:${w[1]}${w[2] ? "+" + w[2] : ""}@${v[0]}`;
    for (const [cls, i] of Object.entries(picks)) { const row = { world: tag, cls, region: i };
      for (const [k, p] of [["before", pb], ["after", pa]]) { await p.evaluate(i => { const A = BLOOM_RUN_UI.adapter; A.actions.deselect(); A.actions.selectRegion(i); }, i); await p.waitForTimeout(250); row[k] = await p.evaluate(MEASURE, i); }
      res.banner.push(row);
      if (SHOTS && v[0] === 1024 && row.after.place === "top" && !res.banner.some(x => x !== row && x.world === tag && x.after.place === "top")) { fs.mkdirSync(SHOTS, { recursive: true }); await pa.screenshot({ path: `${SHOTS}/after-${tag.replace(/[:+@]/g, "_")}-${cls}-top.png` }); await pb.screenshot({ path: `${SHOTS}/before-${tag.replace(/[:+@]/g, "_")}-${cls}-bottom.png` }); }
    }
    // stability: the selection with a top placement (or any) held while the run plays at 4× for 3 s, placement sampled every 150 ms
    if (v[0] <= 1440) { const i = (res.banner.filter(x => x.world === tag).find(x => x.after.place === "top") || res.banner.filter(x => x.world === tag)[0]).region;
      const st = await pa.evaluate(async i => { const A = BLOOM_RUN_UI.adapter; A.actions.deselect(); A.actions.selectRegion(i); A.actions.setSpeed(4); A.actions.play(); const seen = [];
        for (let k = 0; k < 20; k++) { await new Promise(r => setTimeout(r, 150)); const bn = document.getElementById("pvBanner"), r = bn.getBoundingClientRect(); seen.push(`${bn.dataset.place || "bottom"}|${Math.round(r.top)}`); }
        A.actions.pause(); return seen; }, i);
      res.stability.push({ world: tag, region: i, distinct: [...new Set(st)] }); }
    // label clicks (1024 / 1440): points inside a pill whose tile belongs to ANOTHER region / water / frame — what does a click select?
    if (v[0] <= 1440) { await pa.evaluate(() => BLOOM_RUN_UI.adapter.actions.deselect()); await pa.waitForTimeout(200);
      const pts = await pa.evaluate(() => { const PV = BLOOM.planetView.instance, R = PV.renderer, I = R.info(), cv = document.getElementById("pvMap").getBoundingClientRect(), out = [];
        const blocked = (x, y) => { const e = document.elementFromPoint(x, y); return e !== document.getElementById("pvMap"); };
        for (const L of I.labels) for (const fx of [0.08, 0.92]) { const x = cv.left + L.x + L.w * fx, y = cv.top + L.y + L.h / 2; if (blocked(x, y)) continue; const h = R.hitTest(x, y); if (h.region !== L.index) out.push({ label: L.index, name: L.name, under: h.region, x, y }); }
        return out; });
      for (const pt of pts) { const r = { world: tag, ...pt };
        for (const [k, p] of [["before", pb], ["after", pa]]) { await p.evaluate(() => BLOOM_RUN_UI.adapter.actions.deselect()); await p.waitForTimeout(80); await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(120); r[k] = await p.evaluate(() => BLOOM_RUN_UI.adapter.selection().index); }
        res.labels.push(r); } }
    await pa.context().close(); await pb.context().close();
  }
  // Training coach vs banner (1024): select a region during the first lessons; overlap of the coach card and the banner
  for (const [k, S] of [["before", SB], ["after", SA]]) { const p = await Q.newPage(b, { width: 1024, height: 768, training: null }); await p.goto(S.origin + "/?bg=2"); await Q.waits.menu(p); await p.click('.mm-item[data-act="training"]'); await Q.waits.training(p, 1); await p.waitForTimeout(800);
    const rows = []; for (const pick of ["lower", "middle", "upper"]) { const i = await p.evaluate(PICK).then(x => x[pick]); if (i === undefined) continue;
      await p.evaluate(i => { const A = BLOOM_RUN_UI.adapter; A.actions.deselect(); A.actions.selectRegion(i); }, i); await p.waitForTimeout(700);
      rows.push(await p.evaluate(([i, pick]) => { const c = document.querySelector(".tc-card"), bn = document.getElementById("pvBanner"); if (!c || c.hidden || bn.hidden) return { pick, region: i, coach: !!(c && !c.hidden), banner: !bn.hidden };
        const a = c.getBoundingClientRect(), z = bn.getBoundingClientRect(), ov = Math.max(0, Math.min(a.right, z.right) - Math.max(a.left, z.left)) * Math.max(0, Math.min(a.bottom, z.bottom) - Math.max(a.top, z.top));
        return { pick, region: i, overlapPx: Math.round(ov), shareOfCoach: +(ov / (a.width * a.height)).toFixed(3), shareOfBanner: +(ov / (z.width * z.height)).toFixed(3) }; }, [i, pick]));
      if (SHOTS && pick === "lower") await p.screenshot({ path: `${SHOTS}/${k}-training-coach-banner.png` }); }
    res.coach[k] = rows; await p.context().close(); }
  fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
  const at = (vw, k) => res.banner.filter(x => x.world.endsWith("@" + vw)).map(x => x[k]);
  for (const vw of [1024, 1440, 1920, 2560]) { const B = at(vw, "before"), A = at(vw, "after"), mean = a => +(a.reduce((s, x) => s + x, 0) / a.length).toFixed(3);
    console.log(vw, "before: mean covered", mean(B.map(x => x.coveredByBanner)), "max", Math.max(...B.map(x => x.coveredByBanner)), "| after: mean covered", mean(A.map(x => x.coveredByBanner)), "max", Math.max(...A.map(x => x.coveredByBanner)), "top", A.filter(x => x.place === "top").length, "/", A.length, "hudOverlap", Math.max(...A.map(x => x.bannerHudOverlapPx)), "inStage", A.every(x => x.bannerInStage)); }
  console.log("labels", res.labels.length, "before→label", res.labels.filter(x => x.before === x.label).length, "after→label", res.labels.filter(x => x.after === x.label).length, "| stability", JSON.stringify(res.stability.map(x => x.distinct.length)), "| coach", JSON.stringify(res.coach));
  await b.close(); SA.close(); SB.close(); })();
