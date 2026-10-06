// BLOOM-028D1 evidence stills (the suite's own --shots give 01–03): the ☰ Training menu open on the paused landing, and the
// title halfway into its fade to the training run.   NODE_PATH="$(npm root -g)" node docs/evidence/bloom-028d1/qa-stills.js
"use strict";
const path = require("path"), fs = require("fs"), http = require("http"), { chromium } = require("playwright");
const ROOT = path.resolve(__dirname, "../../.."), OUT = __dirname;
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".jpg": "image/jpeg", ".png": "image/png" };
const server = http.createServer((req, res) => { const f = path.join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(res); });
(async () => {
  await new Promise(r => server.listen(0, "127.0.0.1", r)); const B = `http://127.0.0.1:${server.address().port}`;
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  await p.goto(`${B}/demos/demo-run.html?training=1`); await p.waitForFunction(() => window.BLOOM_TRAINING_UI && BLOOM_TRAINING_UI.stats.liftedAt);
  await p.click("#btnMenu"); await p.waitForTimeout(150); await p.screenshot({ path: path.join(OUT, "04-training-run-menu.png") });
  await p.goto(`${B}/demos/main-menu.html?bg=3&workers=2`); await p.waitForFunction(() => window.MENU_DEV && MENU_DEV.ready); await p.waitForTimeout(900);
  await p.evaluate(() => { const E = MENU_DEV.entry; E.leaveTo("demo-run.html?training=1", { navigate: () => {} });
    requestAnimationFrame(() => { const a = E.black.getAnimations()[0]; if (a) { a.pause(); a.currentTime = 110; } }); });
  await p.waitForTimeout(200); await p.screenshot({ path: path.join(OUT, "05-title-fading-to-training.png") });
  await b.close(); server.close(); console.log("stills written");
})();
