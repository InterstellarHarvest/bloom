"use strict";
const fs = require("fs");
const q = (rows, key, p) => { const r = rows.slice().sort((a, b) => a[key] - b[key]), tot = r.reduce((a, x) => a + x.a, 0); let acc = 0; for (const x of r) { acc += x.a; if (acc >= p * tot) return x[key]; } return r[r.length - 1][key]; };
for (const a of ["ocean_archipelago", "desert_world", "frozen_world"]) {
  const W = JSON.parse(fs.readFileSync(`worlds/${a}.json`)).filter(w => w.ok), rows = [];
  for (const w of W) { const p = w.planet, gc = p.globalClimate, area = {}; p.tilemap.forEach(t => { if (t >= 0) area[t] = (area[t] || 0) + 1; });
    p.sections.forEach((s, i) => { if (!area[i]) return; const L = s.local; rows.push({ a: area[i], t: gc.temperature + L.tempOffset, m: gc.moisture + L.moistureOffset, salt: L.salinity, rad: L.radiation, tox: L.toxicity, ph: L.ph, origin: !!s.isOrigin }); }); }
  const line = k => [0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 0.95].map(p => Math.round(q(rows, k, p))).join(" / ");
  console.log(`\n${a} (${W.length} worlds, ${rows.length} sections) p5/p10/p25/p50/p75/p90/p95`);
  for (const k of ["t", "m", "salt", "rad", "tox", "ph"]) console.log(" ", k.padEnd(5), line(k));
  const o = rows.filter(r => r.origin); console.log("  origins t", line.call(null, "t") && [0.1,0.5,0.9].map(p => Math.round(q(o, "t", p))).join("/"), "m", [0.1,0.5,0.9].map(p => Math.round(q(o, "m", p))).join("/"));
}
