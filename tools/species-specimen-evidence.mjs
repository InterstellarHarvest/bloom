// BLOOM — engine specimen evidence for the four production species (BLOOM-035C2). REAL compositor output, not review boards.
//
//   node tools/species-specimen-evidence.mjs [--out docs/evidence/bloom-035c2/specimens] [--scale 3]
//
// For each species in content/species.js: its own art { bodyPlan, pack } through BLOOM.plantSpecimen.drawSpecies (the production specimen path:
// grammar → compositor → specimen box) for the release states — Base · Cold T3 · Heat T3 · Drought T3 · Flood T3 · Salt · Radiation · Early
// Maturity · Seed Output T2 · Waterborne Seeds (+ Seed Output T1) — one nearest-neighbour PNG per state and one contact sheet per species, plus
// index.json (pack, plan, signature, sha256 of every PNG). Deterministic.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), require = createRequire(import.meta.url);
const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const OUT = path.resolve(ROOT, opt("--out", "docs/evidence/bloom-035c2/specimens")), K = +opt("--scale", "3");
export const STATES = [["base", {}], ["cold3", { cold: 3 }], ["heat3", { heat: 3 }], ["drought3", { drought: 3 }], ["flood3", { flood: 3 }], ["salt", { salt: 1 }], ["radiation", { rad: 1 }],
  ["earlyMaturity", { earlyMat: 1 }], ["seedOutput1", { seedOut: 1 }], ["seedOutput2", { seedOut: 2 }], ["waterborneSeeds", { waterSeeds: 1 }]];
for (const f of ["content/config.js", "content/traits.js", "content/species.js", "resources/plant-visual/generated/plant-atlas.js", "resources/plant-visual/plant-visual-model.js", "resources/plant-visual/plant-components.js",
  "resources/plant-visual/plant-compositor.js", "resources/plant-visual/plant-fx.js", "resources/plant-visual/plant-environment.js", "resources/run-ui/plant-specimen.js"]) require(path.join(ROOT, f));
const { encodePNG } = await import(path.join(ROOT, "tools/intake-organic-hybrid-art.mjs"));
const PS = globalThis.BLOOM.plantSpecimen, SPECIES = globalThis.BLOOM_DATA.species, sha = b => crypto.createHash("sha256").update(b).digest("hex");
const up = (d, k) => { const W = d.w * k, H = d.h * k, o = new Uint8Array(W * H * 4); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const s = ((y / k | 0) * d.w + (x / k | 0)) * 4, t = (y * W + x) * 4; for (let c = 0; c < 4; c++) o[t + c] = d.rgba[s + c]; } return { w: W, h: H, rgba: o }; };
fs.mkdirSync(OUT, { recursive: true });
const index = { format: "bloom-035c2-specimen-evidence@1", tool: "tools/species-specimen-evidence.mjs", scale: K, states: STATES.map(s => s[0]), species: {} };
for (const sp of SPECIES) {
  const dir = path.join(OUT, sp.id); fs.mkdirSync(dir, { recursive: true }); const row = [], rec = { name: sp.name, pack: sp.art.pack, bodyPlan: sp.art.bodyPlan, states: {} };
  for (const [name, traits] of STATES) { const d = PS.drawSpecies(sp, { traits, scene: globalThis.BLOOM.plantEnvironment.showcase() }), u = up(d, K), png = encodePNG(u.w, u.h, u.rgba); fs.writeFileSync(path.join(dir, `${name}.png`), png);
    rec.states[name] = { traits, signature: d.signature, plan: d.plan, pack: d.pack, sha256: sha(png) }; row.push(u); }
  const G = 6, SW = row.reduce((n, u) => n + u.w + G, G), SH = row[0].h + 2 * G, sheet = new Uint8Array(SW * SH * 4).fill(255); let ox = G;
  for (const u of row) { for (let y = 0; y < u.h; y++) sheet.set(u.rgba.subarray(y * u.w * 4, (y + 1) * u.w * 4), ((G + y) * SW + ox) * 4); ox += u.w + G; }
  const png = encodePNG(SW, SH, sheet); fs.writeFileSync(path.join(OUT, `${sp.id}-sheet.png`), png); rec.sheet = { file: `${sp.id}-sheet.png`, sha256: sha(png) };
  index.species[sp.id] = rec; console.log(`${sp.id.padEnd(15)} ${sp.art.pack.padEnd(16)} ${sp.art.bodyPlan.padEnd(10)} ${STATES.length} states → ${path.relative(ROOT, dir)}/`);
}
fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify(index, null, 1) + "\n");
