// BLOOM — Destination Survey calibration, this tree vs a base commit (BLOOM-035C2): the species art release must not move any world or class.
//
//   node tools/species-survey-calibration.mjs [--base e534750] [--seeds 24] [--out docs/evidence/bloom-035c2/survey-calibration.json]
//
// For every archetype × seeds 1…N (the structural world = generateFromArchetype layers 1–3, species-free) and every species: the world's
// planetFingerprint and the species' survey assessment (habitable share → FAVORABLE / PRECARIOUS / EXTREME) — computed in two isolated
// engines, this tree and `git show <base>:<file>` — then compared: identical fingerprints, habitable shares and classes, plus the per-species
// class distribution. Exits 1 on any difference.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { execSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const BASE = opt("--base", "e534750"), N = +opt("--seeds", "24"), OUT = path.resolve(ROOT, opt("--out", "docs/evidence/bloom-035c2/survey-calibration.json"));
const FILES = ["content/config.js", "content/traits.js", "planets/first_bloom.js", "planets/training_grounds.js", "content/archetypes.js", "content/scenarios.js", "content/play.js", "content/training.js",
  "content/species.js", "resources/bloom-sim.js", "resources/bloom-gen.js", "resources/bloom-validate.js", "resources/bloom-witness.js", "resources/bloom-archetype.js", "resources/bloom-scenario.js",
  "resources/bloom-play.js", "resources/bloom-species.js"];
const SD = await import(pathToFileURL(path.join(ROOT, "resources/destination-survey/survey-data.js")).href);   // pure functions over the deps given
const engine = src => { const g = { console }; vm.createContext(g); for (const f of FILES) vm.runInContext(src(f), g, { filename: f }); return { BLOOM: g.BLOOM, BLOOM_DATA: g.BLOOM_DATA }; };
const here = engine(f => fs.readFileSync(path.join(ROOT, f), "utf8")), base = engine(f => execSync(`git show ${BASE}:${f}`, { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28 }));
const IDS = here.BLOOM.species.ids();
function table(deps) {
  const rows = [];
  for (const A of deps.BLOOM_DATA.archetypes) for (let seed = 1; seed <= N; seed++) {
    let w; try { w = deps.BLOOM.generateFromArchetype(A, seed, { config: deps.BLOOM_DATA.config, traits: deps.BLOOM_DATA.traits, winnability: false }); } catch (e) { if (!e.attempts) throw e; rows.push({ archetype: A.id, seed, world: null }); continue; }
    const r = { archetype: A.id, seed, fingerprint: SD.planetFingerprint(w), species: {} };
    for (const id of IDS) { const a = SD.assessWorld(w, deps, id); r.species[id] = { habitable: +a.habitable.toFixed(6), class: SD.classFor(a.habitable).id }; }
    rows.push(r);
  }
  return rows;
}
const T1 = table(here), T0 = table(base), diff = [];
T1.forEach((r, i) => { const b = T0[i]; if (JSON.stringify(r) !== JSON.stringify(b)) diff.push({ archetype: r.archetype, seed: r.seed, here: r, base: b }); });
const dist = T => Object.fromEntries(IDS.map(id => { const c = { favorable: 0, precarious: 0, extreme: 0 }; for (const r of T) if (r.species) c[r.species[id].class]++; return [id, c]; }));
const out = { format: "bloom-035c2-survey-calibration@1", tool: "tools/species-survey-calibration.mjs", base: BASE, head: execSync("git rev-parse --short HEAD", { cwd: ROOT, encoding: "utf8" }).trim(),
  worlds: T1.length, generated: T1.filter(r => r.fingerprint).length, species: IDS, identical: !diff.length, differences: diff.slice(0, 20), distribution: { head: dist(T1), base: dist(T0) }, rows: T1 };
fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + "\n");
console.log(`survey calibration ${BASE} → HEAD: ${T1.length} worlds (${out.generated} generated) × ${IDS.length} species — ${diff.length ? `${diff.length} DIFFERENCES` : "IDENTICAL fingerprints, habitable shares and classes"}`);
for (const id of IDS) console.log(`  ${id.padEnd(15)} ${JSON.stringify(out.distribution.head[id])}`);
process.exit(diff.length ? 1 : 0);
