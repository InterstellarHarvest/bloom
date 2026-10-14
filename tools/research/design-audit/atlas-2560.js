// BLOOM-038 design audit — 2560×1440 SURPLUS-SPACE traversal of the released index.html (READ-ONLY research).
//
//   NODE_PATH="$(npm root -g)" node tools/research/design-audit/atlas-2560.js
//
// Title → EXPEDITION → Species Selection (cards, dossier) → Destination Survey (grid, focused dossier) → Begin → the run (base map,
// selected region, Map View, Regions, Adapt, Spread, Terraform) → Bloom report; then Challenges → hub (dossier) → Challenge Planet Dossier.
// Each state is screenshotted at 2560×1440 (JPEG) and measured with atlas-lib MEASURE (whitespace share + largest bare rectangle, isolation
// = gap to the nearest other content block, prose line lengths (> 90 chars flagged), globe / map sizes and viewport shares, panel rects,
// primary-action ↔ target distances, map framing / letterboxing). The same state is also MEASURED (not shot) at 1440×900 and 1920×1080 so the
// panel / card / globe widths form a growth curve (does a panel stop growing?). Output: visual-atlas/2560/ + surplus2560.json.
"use strict";
const path = require("path"), fs = require("fs");
const L = require("./atlas-lib.js");
const EVD = path.join(L.ROOT, "docs/evidence/bloom-038"), OUTD = path.join(EVD, "visual-atlas/2560"), OUT = path.join(EVD, "surplus2560.json");
const t0 = Date.now(), CURVE = [[1440, 900], [1920, 1080], [2560, 1440]];

(async () => {
  const pw = require("playwright"); const srv = await L.serve(), O = srv.O; const browser = await pw.chromium.launch();
  const shots = [], states = []; const shoot0 = L.makeShooter(OUTD, shots, { relTo: EVD });
  const c = await L.newContext(browser, 2560, 1440), p = await L.newPage(c); let n = 0;
  const T = () => Math.round((Date.now() - t0) / 1000);
  // measure at the curve sizes, then shoot at 2560
  async function state(label, gameplay, reenter = null) {
    const curve = [];
    for (const [w, h] of CURVE) { await p.setViewportSize({ width: w, height: h }); await L.settle(p, 600); if (reenter) await reenter(); const m = await L.measure(p);
      curve.push({ viewport: `${w}x${h}`, panels: m.panels.map(x => ({ n: x.name, w: x.rect.w, h: x.rect.h })), cards: m.cards.slice(0, 12).map(x => ({ n: x.cls, w: x.rect.w, h: x.rect.h })), globes: m.globes.map(g => ({ n: g.cls, w: g.rect.w, h: g.rect.h })),
        world: m.map ? { w: m.map.world.w, h: m.map.world.h, tilePx: m.map.tilePx } : null, maxLineChars: m.prose.maxLineChars, bareShare: m.whitespace.bareShare, labelsPx: m.labels ? m.labels.fontPx : null, fonts: Object.fromEntries(Object.entries(m.fonts).map(([k, v]) => [k, v.px])) }); }
    n++; const id = `2560-${String(n).padStart(2, "0")}-${label}`; const e = await shoot0(p, id, { runId: "surplus2560", scene: "surplus2560", route: "app", phase: label, uiState: label, gameplay, purchases: [] }, { jpeg: true, quality: 80 });
    const m = e.metrics;
    const flags = { proseOver90: m.prose.top.filter(x => x.maxLineChars > 90).map(x => ({ text: x.text, maxLineChars: x.maxLineChars, maxLineW: x.maxLineW, cls: x.cls })),
      isolated: m.isolation.filter(x => x.nearestGapPx != null && x.nearestGapPx > 160).map(x => ({ n: x.n, gapPx: x.nearestGapPx, nearest: x.nearest })),
      largeBareRect: m.whitespace.largestBareRect && m.whitespace.largestBareRect.shareOfViewport > 0.1 ? m.whitespace.largestBareRect : null,
      stopsGrowing: (() => { const out = []; const names = new Set(curve.flatMap(cv => cv.panels.map(x => x.n).concat(cv.cards.map(x => "card:" + x.n)))); for (const nm of names) { const ws = curve.map(cv => (cv.panels.find(x => x.n === nm) || cv.cards.find(x => "card:" + x.n === nm) || {}).w || null); if (ws.every(Boolean)) out.push({ n: nm, widths: ws, grows: ws[2] > ws[0] * 1.15 }); } return out; })() };
    states.push({ id, label, file: e.file, curve, metrics: { whitespace: m.whitespace, isolation: m.isolation, prose: { max: m.prose.maxLineChars, over90: m.prose.over90, top: m.prose.top.slice(0, 5) }, globes: m.globes, panels: m.panels, actions: m.actions, map: m.map, labels: m.labels && { count: m.labels.count, fontPx: m.labels.fontPx, overlaps: m.labels.overlaps, extendBeyondWorld: m.labels.extendBeyondWorld }, fonts: m.fonts }, flags });
    console.log(`[${T()}s] ${id} bare ${m.whitespace.bareShare} maxLine ${m.prose.maxLineChars}`);
    await p.setViewportSize({ width: 2560, height: 1440 }); await L.settle(p, 300);
  }
  try {
    await p.goto(`${O}/?bg=3&sector=7`); await L.W.menu(p); await L.settle(p, 600); await state("title", false);
    await p.click('.mm-item[data-act="begin"]'); await L.W.species(p); await state("species", false);
    await p.evaluate(() => MENU_DEV.entry.speciesView.inner.open("organic_hybrid")); await state("species-dossier", false);
    await p.click(".ss-btn.go"); await L.W.survey(p); await L.W.cells(p, 9).catch(() => {}); await L.settle(p, 1200); await state("survey-grid", false);
    const i = await p.evaluate(() => MENU_DEV.entry.survey.cells.findIndex(Boolean)); await p.evaluate(i => MENU_DEV.entry.survey.select(i), i); await p.waitForFunction(() => MENU_DEV.entry.survey.state === "focus"); await L.settle(p, 900);
    await state("survey-focus", false);
    await p.click(".ds-btn.go"); await L.W.run(p, 1); await L.settle(p, 900); await p.evaluate(() => BLOOM_API.advance(12)); await L.settle(p, 500);
    await state("run-base", true);
    const blocked = await p.evaluate(() => BLOOM_RUN_UI.adapter.regions().filter(r => r.blocked && !r.isOrigin).sort((a, b) => b.area - a.area)[0].index);
    await L.clickRegion(p, blocked); await p.mouse.move(2, 2); await state("run-selected-blocked", true, async () => { await p.evaluate(i => BLOOM_RUN_UI.adapter.actions.selectRegion(i), blocked); });
    await L.deselect(p); await p.click('.pv-tool[data-tool="mapview"]'); await L.settle(p, 300); await p.click('#pvLens .pv-lb[data-lens="Water"]'); await L.settle(p, 300);
    await state("run-mapview", true, async () => { if (!(await p.evaluate(() => BLOOM.planetView.instance.state().lensOpen))) { await p.click('.pv-tool[data-tool="mapview"]'); await L.settle(p, 250); } });
    await p.evaluate(() => { BLOOM.planetView.instance.setLens(null); }); await p.keyboard.press("Escape"); await L.settle(p, 300);
    if (await p.evaluate(() => BLOOM.planetView.instance.state().lensOpen)) { await p.click('.pv-tool[data-tool="mapview"]'); await L.settle(p, 200); }
    for (const room of ["region", "adapt", "spread", "terraform"]) { await L.openRoom(p, room); await state(`room-${room}`, true); }
    await L.closeRoom(p);
    const r = await L.progressTo(p, 0.70, { grant: 600, step: 10, maxTicks: 30000 }); console.log(`  progressed: ${JSON.stringify({ cov: r.coverage, won: r.won, buys: r.bought.length })}`);
    if (!r.won) await L.progressTo(p, 0.66, {}); await L.W.report(p).catch(() => {}); await L.settle(p, 900); await state("report", true);
    await p.goto(`${O}/?bg=3`); await L.W.menu(p); await p.click('.mm-item[data-act="challenges"]'); await L.W.hub(p); await p.evaluate(() => { MENU_DEV.entry.challengeView.inner.select("native_competition"); MENU_DEV.entry.nextLaunchSeed = 2; }); await L.settle(p, 400);
    await state("challenge-hub", false);
    await p.click(".ch-btn.go"); await L.W.species(p); await p.evaluate(() => MENU_DEV.entry.speciesView.inner.open("organic_hybrid")); await L.settle(p, 200); await p.click(".ss-btn.go"); await L.W.world(p); await L.settle(p, 800);
    await state("challenge-dossier", false);
    await p.click(".cw-btn.go"); await L.W.run(p, 1); await L.settle(p, 900); await p.evaluate(() => BLOOM_API.advance(12)); await L.settle(p, 500); await state("challenge-run-base", true);
  } catch (e) { console.log("ERROR " + String(e.stack || e).slice(0, 500)); }
  const out = { format: "bloom-038-surplus2560@1", tool: "tools/research/design-audit/atlas-2560.js", generatedAt: new Date().toISOString(), viewport: "2560x1440", curveViewports: CURVE.map(v => v.join("x")), runtimeSeconds: T(), pageErrors: p.errs.slice(0, 5), states, shots };
  fs.mkdirSync(EVD, { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  await browser.close(); srv.close(); console.log(`done ${T()} s, ${shots.length} shots`);
})().catch(e => { console.error(e); process.exit(1); });
