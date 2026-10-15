// BLOOM-039 re-audit / QA helpers (research only, never loaded by the game): serve a checkout (BEFORE = BLOOM_BEFORE, AFTER = this repo) and reuse the
// BLOOM-038 waits / nav / run helpers (tools/research/design-audit/browser-common.js). CommonJS; NODE_PATH="$(npm root -g)".
"use strict";
const path = require("path"), fs = require("fs"), http = require("http");
// AFTER = this repository; BEFORE = a checkout of the base commit (BLOOM_BEFORE=/path/to/checkout-of-8b23e78)
const WT = path.resolve(__dirname, "../../../.."), MAIN = process.env.BLOOM_BEFORE || WT;
const B = require(path.join(WT, "tools/research/design-audit/browser-common.js"));
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
function serve(ROOT) {
  const srv = http.createServer((req, res) => { let p = decodeURIComponent(new URL(req.url, "http://x").pathname); if (p.endsWith("/")) p += "index.html";
    const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-store" }); fs.createReadStream(f).pipe(res); });
  return new Promise(r => srv.listen(0, "127.0.0.1", () => r({ origin: `http://127.0.0.1:${srv.address().port}`, close: () => srv.close() })));
}
const PWM = process.env.PW_MODULE || "playwright";
async function launch(name = "chromium") { const pw = require(PWM); return pw[name].launch(); }
module.exports = { ...B, serve, launch, WT, MAIN, rootOf: which => which === "before" ? MAIN : WT };
