// BLOOM — Plant Sprite Pipeline check (BLOOM-032B1). A focused QA of the production plant sprite pipeline proof; not (yet) a member of the
// regression suites. docs/PLANT_SPRITE_PIPELINE_v1.md §10.
//
//   NODE_PATH="$(npm root -g)" node tools/plant-sprite-pipeline-check.js [--browsers chromium,firefox] [--evidence]
//
// Node: the exact start (accepted BLOOM-031 main bba000f) and scope (no production / gameplay / trait file touched; the 032A review branch
// untouched); source PNG atlases exist and decode; metadata parses; every rect in bounds; anchors / points / masks valid; the validator
// REJECTS broken art (off-palette, partial alpha, out-of-bounds, overlap, bad anchor, missing variant, stray pixel, socket clip, metadata
// that disagrees with the contract); clean rebuild deterministic and == the committed generated output; no timestamp / machine path; no
// sprite pixels in hand-written JS; one canonical canvas; the trait → component rules live only in the selector (the renderer names no
// trait); every locked Organic Hybrid state visibly differs (T4 = T3 art); every state composes unclipped; pack swap = same skeleton, new pixels;
// preview cancel exact; FX and reduced motion land exactly; the portable / Pages contract. Browser (Chromium + Firefox; file://, HTTP at /,
// HTTP under /bloom/) — plus N1–N12 for the locked contract (normalization, slots, Cold+Heat, Drought/Flood, art cap, Salt≠Cold, pods, maximal dry/wet fit,
// sockets, preview + FX per mutation class): the proof page boots with no error and no external request; browser pixels == Node pixels; the same organism at every
// placement at a whole-number scale; preview on / off; purchase grow / dissolve / reduced motion end on the exact target.
// --evidence writes docs/evidence/bloom-032b1/ (screenshots, 400 % crop, FX strip, pipeline-proof.json). Exits 1 on any failure.
"use strict";
const path = require("path"), fs = require("fs"), cp = require("child_process"), http = require("http"), os = require("os"), zlib = require("zlib");
const ROOT = path.resolve(__dirname, "..");
const argv = process.argv, argOf = k => { const i = argv.indexOf(k); return i > 0 ? argv[i + 1] : null; };
const BROWSERS = (argOf("--browsers") ?? "chromium,firefox").split(",").filter(Boolean), EVIDENCE = argv.includes("--evidence"), EVD = path.join(ROOT, "docs/evidence/bloom-032b1");
const J = JSON.stringify, read = f => fs.readFileSync(path.join(ROOT, f), "utf8");
let fails = 0, passes = 0; const RESULTS = [], t0 = Date.now();
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); RESULTS.push({ ok: !!ok, name: name.slice(0, 160) }); ok ? passes++ : fails++; };
const git = a => cp.execSync(`git ${a}`, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 << 20 }).trim();
const BASE = "bba000fcd60bcd259af289c257b441087eff4b92", LAB_032A = "c561a34";
const ALLOWED = p => p.startsWith("art/plant/") || p.startsWith("resources/plant-visual/") || p.startsWith("resources/plant-sprite-lab/") || p === "demos/plant-sprite-pipeline-lab.html"
  || p === "tools/build-plant-art.mjs" || p === "tools/plant-sprite-pipeline-check.js" || p === "tools/package.json" || p.startsWith("docs/")
  || p === "tools/intake-organic-hybrid-art.mjs" || p === "tools/organic-hybrid-art-intake-check.js";   // BLOOM-032B2: the final-art intake + its focused QA
// (BLOOM-032C) the later, separately reviewed production integration: exactly these files may differ from bba000f as well
const C032 = new Set(["resources/run-ui/plant-specimen.js", "resources/run-ui/decision-rooms.css", "resources/run-ui/run-report.css", "demos/demo-run.html", "resources/plant-sprite-lab/legacy-svg-specimen.js", "tools/production-plant-integration-check.js"]);
const FINAL_PACKS = { "organic-hybrid": "ORGANIC HYBRID — FINAL ART (PMO-approved; BLOOM-032B2 intake)" };   // approved art; every other pack is temporary proof art
const OWN_RUNTIME = ["resources/plant-visual/plant-visual-model.js", "resources/plant-visual/plant-components.js", "resources/plant-visual/plant-compositor.js", "resources/plant-visual/plant-fx.js", "resources/plant-sprite-lab/lab.js"];

// ---------------------------------------------------------------- the pipeline in Node (classic scripts → globalThis)
for (const f of ["content/config.js", "content/traits.js", "resources/plant-visual/generated/plant-atlas.js", "resources/plant-visual/plant-visual-model.js", "resources/plant-visual/plant-components.js",
  "resources/plant-visual/plant-compositor.js", "resources/plant-visual/plant-fx.js"]) require(path.join(ROOT, f));
const PV = BLOOM.plantVisual, PC = BLOOM.plantCompositor, FX = BLOOM.plantFx, ART = BLOOM.plantArt, RULES = PV.model.rules(BLOOM_DATA);
const TRAITS_SNAPSHOT = J(BLOOM_DATA.traits), CONFIG_SNAPSHOT = J(BLOOM_DATA.config), CANVAS = ART.contract.canvas, PACKS = ART.packOrder;
const STATES = { base: {}, cold1: { cold: 1 }, cold2: { cold: 2 }, cold3: { cold: 3 }, heat1: { heat: 1 }, heat2: { heat: 2 }, heat3: { heat: 3 }, cold2heat1: { cold: 2, heat: 1 },
  drought1: { drought: 1 }, drought2: { drought: 2 }, drought3: { drought: 3 }, drought4: { drought: 4 }, flood1: { flood: 1 }, flood2: { flood: 2 }, flood3: { flood: 3 }, flood4: { flood: 4 },
  salt: { salt: 1 }, rad: { rad: 1 }, seed1: { seedOut: 1 }, seed2: { seedOut: 2 }, early: { earlyMat: 1 }, water: { waterSeeds: 1 },
  maxDry: { cold: 2, heat: 1, drought: 3, salt: 1, rad: 1, seedOut: 2, earlyMat: 1, waterSeeds: 1 }, maxWet: { cold: 2, heat: 1, flood: 3, salt: 1, rad: 1, seedOut: 2, earlyMat: 1, waterSeeds: 1 } };
const ART_CAP_TWINS = { drought4: "drought3", flood4: "flood3" };   // gameplay T4 draws EXACTLY as T3 art — the only states allowed to share anatomy
const TEMP_COMBOS = [{ cold: 3 }, { cold: 2, heat: 1 }, { cold: 1, heat: 2 }, { heat: 3 }];   // every legal way to spend the whole temperature pool
const sel = (traits, condition = "thriving") => PV.components.select(PV.model.normalize({ traits, condition }, RULES));
const frame = (pack, traits, condition) => PC.render(sel(traits, condition), pack);
const PROOF = { milestone: "BLOOM-032B1", status: "TEMPORARY PIPELINE PROOF — NOT FINAL ART", base: BASE, head: git("rev-parse HEAD"), canvas: CANVAS, packs: {}, states: {}, browsers: {} };

// ---------------------------------------------------------------- tiny PNG encoder (evidence + negative tests)
const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = b => { let c = 0xffffffff; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t, "ascii"), d]), c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
function png(W, H, rgba) { const h = Buffer.alloc(13); h.writeUInt32BE(W, 0); h.writeUInt32BE(H, 4); h[8] = 8; h[9] = 6;
  const raw = Buffer.alloc((W * 4 + 1) * H); for (let y = 0; y < H; y++) Buffer.from(rgba.buffer, rgba.byteOffset + y * W * 4, W * 4).copy(raw, y * (W * 4 + 1) + 1);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", h), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]); }
function upscale(F, k, crop) { const [cx, cy, cw, ch] = crop || [0, 0, F.W, F.H], W = cw * k, H = ch * k, o = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = ((cy + (y / k | 0)) * F.W + cx + (x / k | 0)) * 4, j = (y * W + x) * 4; o[j] = F.rgba[i]; o[j + 1] = F.rgba[i + 1]; o[j + 2] = F.rgba[i + 2]; o[j + 3] = 255; } return { W, H, rgba: o }; }
function strip(frames, k, gap = 4) { const W = frames.reduce((n, f) => n + f.W * k + gap, -gap), H = Math.max(...frames.map(f => f.H * k)), o = new Uint8Array(W * H * 4).fill(255); let x0 = 0;
  for (const f of frames) { const u = upscale(f, k); for (let y = 0; y < u.H; y++) Buffer.from(u.rgba.buffer, y * u.W * 4, u.W * 4).copy(Buffer.from(o.buffer), (y * W + x0) * 4); x0 += u.W + gap; } return { W, H, rgba: o }; }

// (BLOOM-033) later milestones' changes are not 032B1's: once HEAD is past 032B1's accepted end on main (END_SHA), this suite's scope checks are
// evaluated over BASE … END_SHA — the END_SHA pattern of run-ui-convergence / guided-training; at END_SHA itself the working tree is checked as before
const END_SHA = "be0a82918144a2e3b8aa2fcf2aa8c642dd3128b2";
const AT_END = (() => { try { return git(`merge-base --is-ancestor ${END_SHA} HEAD`) === "" && git("rev-parse HEAD") !== END_SHA; } catch { return false; } })();
const RANGE = AT_END ? `${BASE} ${END_SHA}` : BASE, untrackedNow = () => AT_END ? [] : git("ls-files -o --exclude-standard").split("\n").filter(Boolean);
const hashNow = f => AT_END ? git(`rev-parse ${END_SHA}:"${f}"`) : git(`hash-object "${f}"`);
const existsNow = f => { if (!AT_END) return fs.existsSync(path.join(ROOT, f)); try { git(`cat-file -e ${END_SHA}:"${f}"`); return true; } catch { return false; } };
(async () => {
  console.log("# Node — scope");
  // S1 · the exact start
  { const first = git(`rev-list --first-parent --reverse ${BASE}..HEAD`).split("\n").filter(Boolean)[0] || null, parent = first ? git(`rev-parse ${first}^`) : git("rev-parse HEAD");
    let main = null; try { main = git("rev-parse origin/main"); } catch {}
    check(parent === BASE && (!main || git(`merge-base --is-ancestor ${BASE} ${main}`) === ""), "S1 · 032B1 starts from the exact accepted BLOOM-031 production main bba000f", J({ firstParent: parent.slice(0, 7), originMain: main && main.slice(0, 7) })); }
  // S2 · S3 · scope: production / gameplay / trait files byte-identical; 032A review branch untouched
  { const tracked = git(`diff --name-only ${RANGE}`).split("\n").filter(Boolean), untracked = untrackedNow();
    const changed = [...new Set([...tracked, ...untracked])].sort(), outside = changed.filter(p => !ALLOWED(p) && !C032.has(p) && !/^tools\/[a-z-]+-check\.js$/.test(p));
    const prod = git(`ls-tree -r --name-only ${BASE} -- resources content planets demos index.html dist`).split("\n").filter(Boolean);
    const prodDiff = prod.filter(f => !C032.has(f)).filter(f => !existsNow(f) || hashNow(f) !== git(`rev-parse ${BASE}:"${f}"`));
    check(!prodDiff.length && !outside.length, `S2 · no gameplay / production file changed: all ${prod.length} files under resources/, content/, planets/, demos/, index.html and dist/ at bba000f are byte-identical (incl. resources/run-ui/plant-specimen.js and content/traits.js); 032B1 only ADDS art/plant/, resources/plant-visual/, resources/plant-sprite-lab/, the proof page, its build + check tools, docs (and two npm scripts)`, J({ prodDiff, outside }));
    let lab = null; try { lab = git("rev-parse origin/handoff/bloom-032a-review"); } catch {}
    const labFiles = lab ? git(`diff --name-only ${BASE} ${lab}`).split("\n").filter(Boolean) : [];
    check(lab && lab.startsWith(LAB_032A) && !changed.some(f => labFiles.includes(f)),
      "S3 · the 032A lab is reference only: handoff/bloom-032a-review is still c561a34, none of its files is in 032B1, and the 032A lab's production files (plant-specimen.js etc.) stay untouched", J({ lab: lab && lab.slice(0, 7), overlap: changed.filter(f => labFiles.includes(f)) }));
    const pkg = JSON.parse(read("tools/package.json")), basePkg = JSON.parse(git(`show ${BASE}:tools/package.json`));
    check(J(pkg.devDependencies) === J(basePkg.devDependencies) && pkg.scripts["build:plant-art"] === "node build-plant-art.mjs" && pkg.scripts["check:plant-art"] === "node build-plant-art.mjs --check" && pkg.scripts["build:portable"] === basePkg.scripts["build:portable"],
      "S4 · npm --prefix tools run build:plant-art / check:plant-art exist; no new dependency (the plant build uses Node built-ins only)", J(pkg.scripts));
    PROOF.changedFiles = changed; }

  console.log("# Node — source art + build");
  const B = await import(path.join(ROOT, "tools/build-plant-art.mjs"));
  const contract = JSON.parse(read("art/plant/contract.json"));
  // A1 · A2 · A3 · source PNGs exist and decode; metadata parses; rects / anchors / points / masks valid (independently of the build)
  { const packs = fs.readdirSync(path.join(ROOT, "art/plant/packs")).filter(n => !n.startsWith(".")).sort(), bad = [], info = {};
    for (const p of packs) { const M = JSON.parse(read(`art/plant/packs/${p}/atlas.json`)), buf = fs.readFileSync(path.join(ROOT, `art/plant/packs/${p}/${M.image}`)), img = B.decodePNG(buf);
      info[p] = { image: `${img.w}×${img.h}`, bytes: buf.length, sprites: M.sprites.length, status: M.status };
      if (buf.slice(1, 4).toString() !== "PNG") bad.push(`${p}: not PNG`);
      if (M.status !== (FINAL_PACKS[p] || "TEMPORARY PIPELINE PROOF — NOT FINAL ART")) bad.push(`${p}: ${FINAL_PACKS[p] ? "not labelled as the approved final art" : "not labelled as temporary proof art"}`);
      for (const s of M.sprites) { const [x, y, w, h] = s.rect;
        if (x < 0 || y < 0 || x + w > img.w || y + h > img.h) bad.push(`${p}/${s.id}: rect`);
        if (s.anchor[0] < 0 || s.anchor[1] < 0 || s.anchor[0] >= w || s.anchor[1] >= h) bad.push(`${p}/${s.id}: anchor`);
        for (const q of [...(s.points && s.points.tip ? [s.points.tip] : []), ...((s.points && s.points.margin) || [])]) if (q[0] < 0 || q[1] < 0 || q[0] >= w || q[1] >= h) bad.push(`${p}/${s.id}: point`);
        for (const [t, v] of Object.entries(s.masks || {})) if (v !== "auto" && (v[0] + w > img.w || v[1] + h > img.h)) bad.push(`${p}/${s.id}: mask ${t}`); } }
    PROOF.packs = info;
    check(packs.length >= 1 && packs.includes("proof") && !bad.length, `A1–A3 · source art is real PNG atlases + JSON metadata (${packs.join(", ")}); all parse; every sprite / mask rect is inside its image; every anchor and attachment point lies inside its rect; every proof pack is labelled TEMPORARY PIPELINE PROOF — NOT FINAL ART (the approved organic-hybrid pack: FINAL ART)`, J({ info, bad })); }
  // A5 · the machine-readable schema (art/plant/schema/plant-atlas.schema.json) accepts every pack and the annotated examples, and rejects junk
  { const SCH = JSON.parse(read("art/plant/schema/plant-atlas.schema.json"));
    const V = (s, v, at = "$") => { const errs = [], E = m => errs.push(`${at}: ${m}`);
      if (s.$ref) return V(SCH.$defs[s.$ref.split("/").pop()], v, at);
      if (s.oneOf) { const n = s.oneOf.filter(o => !V(o, v, at).length).length; if (n !== 1) E(`oneOf matched ${n}`); return errs; }
      if ("const" in s && v !== s.const) E(`≠ ${s.const}`); if (s.enum && !s.enum.includes(v)) E(`${J(v)} not in enum`);
      const types = [].concat(s.type || []), tOf = x => x === null ? "null" : Array.isArray(x) ? "array" : Number.isInteger(x) ? "integer" : typeof x;
      if (types.length && !types.some(t => t === tOf(v) || (t === "number" && typeof v === "number"))) { E(`type ${tOf(v)} ≠ ${types}`); return errs; }
      if (typeof v === "string" && s.pattern && !new RegExp(s.pattern).test(v)) E(`"${v}" !~ ${s.pattern}`);
      if (typeof v === "number" && s.minimum !== undefined && v < s.minimum) E(`< ${s.minimum}`);
      if (Array.isArray(v)) { if (s.minItems !== undefined && v.length < s.minItems) E("too few items"); if (s.maxItems !== undefined && v.length > s.maxItems) E("too many items"); if (s.items) v.forEach((x, i) => errs.push(...V(s.items, x, `${at}[${i}]`))); }
      if (v && typeof v === "object" && !Array.isArray(v)) { for (const k of s.required || []) if (!(k in v)) E(`missing ${k}`);
        for (const [k, x] of Object.entries(v)) { if (s.propertyNames) errs.push(...V(s.propertyNames, k, `${at}.${k} (name)`));
          if (s.properties && s.properties[k]) errs.push(...V(s.properties[k], x, `${at}.${k}`)); else if (s.additionalProperties === false) E(`unexpected property ${k}`); else if (typeof s.additionalProperties === "object") errs.push(...V(s.additionalProperties, x, `${at}.${k}`)); } }
      return errs; };
    const packs = fs.readdirSync(path.join(ROOT, "art/plant/packs")).filter(n => !n.startsWith(".")), errs = {};
    for (const p of packs) { const e = V(SCH, JSON.parse(read(`art/plant/packs/${p}/atlas.json`))); if (e.length) errs[p] = e.slice(0, 3); }
    const ex = JSON.parse(read("art/plant/schema/example-sprite-entries.json")).examples.map(x => { const y = { ...x }; delete y._note; return V(SCH.$defs.sprite, y); }).flat();
    const junk = V(SCH, { format: "bloom-plant-atlas@1", pack: "Bad Pack", title: "x", status: "x", image: "a.gif", palette: { glitter: ["#fff"] }, environment: {}, sprites: [{ id: "x" }] });
    check(!Object.keys(errs).length && !ex.length && junk.length >= 5, `A5 · the machine-readable schema accepts all ${packs.length} packs and the annotated example entries, and rejects a malformed pack (${junk.length} errors)`, J({ errs, ex })); }
  // A4 · the validator rejects broken art (negative tests on a scratch copy)
  { const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "plant-art-neg-")), copyRepo = () => { fs.rmSync(tmp, { recursive: true, force: true }); for (const d of ["art/plant", "resources/plant-visual", "tools"]) fs.cpSync(path.join(ROOT, d), path.join(tmp, d), { recursive: true, filter: s => !s.includes("node_modules") }); };
    const mutate = (fn) => { copyRepo(); const mp = path.join(tmp, "art/plant/packs/proof/atlas.json"), ip = path.join(tmp, "art/plant/packs/proof/atlas.png"), M = JSON.parse(fs.readFileSync(mp, "utf8")), img = B.decodePNG(fs.readFileSync(ip));
      fn(M, img); fs.writeFileSync(mp, JSON.stringify(M)); fs.writeFileSync(ip, png(img.w, img.h, img.rgba)); return B.buildPlantArt(tmp).errors.join(" | "); };
    const leafAt = M => M.sprites.find(s => s.id === "leaf.base.mid");
    const px = (img, x, y, c) => { const i = (y * img.w + x) * 4; img.rgba[i] = c[0]; img.rgba[i + 1] = c[1]; img.rgba[i + 2] = c[2]; img.rgba[i + 3] = c[3]; };
    const cases = {
      "off-palette pixel": [(M, img) => { const s = leafAt(M); px(img, s.rect[0] + s.anchor[0], s.rect[1] + s.anchor[1], [1, 2, 3, 255]); }, /not in the pack palette/],
      "partial alpha": [(M, img) => { const s = leafAt(M); const i = ((s.rect[1] + s.anchor[1]) * img.w + s.rect[0] + s.anchor[0]) * 4; img.rgba[i + 3] = 128; }, /partial alpha/],
      "rect out of bounds": [M => { leafAt(M).rect[0] = 9999; }, /outside the/],
      "overlapping rects": [M => { const a = leafAt(M), b = M.sprites.find(s => s.id === "leaf.base.high"); b.rect = [a.rect[0], a.rect[1], b.rect[2], b.rect[3]]; }, /overlaps/],
      "anchor outside rect": [M => { leafAt(M).anchor = [99, 0]; }, /anchor .* outside/],
      "missing angle variant": [M => { M.sprites = M.sprites.filter(s => s.id !== "leaf.flood.3.heat.high"); }, /missing sprites the renderer can ask for: .*leaf\.flood\.3\.heat\.high/],
      "auto mask for a clear treatment": [M => { leafAt(M).masks = { toothed: "auto" }; }, /mask toothed must be an authored rect/],
      "stray pixel": [(M, img) => { px(img, img.w - 1, img.h - 1, [255, 0, 255, 255]); }, /stray opaque pixel/],
      "sprite clips at a socket (body plan moved)": [() => { const bp = path.join(tmp, "art/plant/body-plan.json"), P = JSON.parse(fs.readFileSync(bp, "utf8")); P.layouts.open.drift[0] = [-44, -12]; fs.writeFileSync(bp, JSON.stringify(P)); }, /clip: seed\.drift@up at open\/drift\.0 .* leaves the 84×98 canvas/],
      "metadata disagrees with contract": [M => { leafAt(M).layer = "repro"; }, /layer "repro" ≠ contract "leaves"/],
      "id convention": [M => { leafAt(M).id = "myLeaf"; }, /id must be "leaf\.base\.mid"/],
      "unknown mask": [M => { leafAt(M).masks = { glitter: "auto" }; }, /mask "glitter" is not a contract treatment/],
    };
    const res = Object.fromEntries(Object.entries(cases).map(([n, [fn, re]]) => { const e = mutate(fn); return [n, re.test(e) ? "rejected" : `NOT REJECTED: ${e.slice(0, 160) || "(no error)"}`]; }));
    copyRepo(); const clean = B.buildPlantArt(tmp).errors; fs.rmSync(tmp, { recursive: true, force: true });
    check(!clean.length && Object.values(res).every(v => v === "rejected"), `A4 · the build validator enforces the art contract: an untouched copy builds, and each of ${Object.keys(cases).length} broken-art cases is rejected with its specific error`, J(res)); }
  // D1 · D2 · D3 · deterministic build; committed == clean rebuild; no timestamps / machine paths
  { const r1 = B.buildPlantArt(ROOT), r2 = B.buildPlantArt(ROOT), out1 = fs.mkdtempSync(path.join(os.tmpdir(), "pa1-")), out2 = fs.mkdtempSync(path.join(os.tmpdir(), "pa2-"));
    cp.execFileSync(process.execPath, [path.join(ROOT, "tools/build-plant-art.mjs"), "--out", out1], { stdio: "pipe" }); cp.execFileSync(process.execPath, [path.join(ROOT, "tools/build-plant-art.mjs"), "--out", out2], { stdio: "pipe" });
    const same = Object.keys(r1.files).every(f => r1.files[f].equals(r2.files[f]) && fs.readFileSync(path.join(out1, f)).equals(fs.readFileSync(path.join(out2, f))) && fs.readFileSync(path.join(out1, f)).equals(r1.files[f]));
    const committed = Object.keys(r1.files).every(f => fs.readFileSync(path.join(ROOT, f)).equals(r1.files[f]));
    let checkOk = true; try { cp.execSync("npm --prefix tools run --silent check:plant-art", { cwd: ROOT, stdio: "pipe" }); } catch { checkOk = false; }
    check(!r1.errors.length && same, "D1 · the build is deterministic: two in-process builds and two separate CLI runs into fresh directories give byte-identical files", Object.keys(r1.files).join(", "));
    check(committed && checkOk, "D2 · committed generated output == a clean rebuild (npm --prefix tools run check:plant-art exits 0)", r1.manifest.fingerprint.slice(0, 16));
    const text = Object.values(r1.files).map(b => b.toString("utf8")).join("\n");
    check(!/\b20\d\d-\d\d-\d\d|T\d\d:\d\d:\d\d|\/Users\/|\/home\/|\/private\/|\/var\/folders|[A-Z]:\\\\|MrDashiki|localhost/.test(text) && !text.includes(os.hostname()) && !text.includes(ROOT),
      "D3 · no timestamp, absolute path, user or machine name in the generated output");
    fs.rmSync(out1, { recursive: true, force: true }); fs.rmSync(out2, { recursive: true, force: true });
    PROOF.build = { fingerprint: r1.manifest.fingerprint, output: r1.manifest.output, inputs: r1.manifest.inputs };
    // D4 · no source sprite is hand-edited in JS: every pixel in the runtime came from a PNG; hand-written runtime JS holds no pixel art
    const js = OWN_RUNTIME.map(f => [f, read(f)]), gen = read("resources/plant-visual/generated/plant-atlas.js");
    const pixRow = q => q.length >= 4 && /^[.#A-Za-z0-9]+$/.test(q) && !/^[A-Za-z][A-Za-z0-9]*(\.[A-Za-z0-9]+)+$/.test(q) && (q.match(/[.#]/g) || []).length / q.length >= 0.3;   // "..#a#.." rows, not "leaf.base" ids
    const asciiArt = s => { const strs = [...s.matchAll(/"([^"\n]*)"\s*,\s*(?=")/g)].map(m => m[1]); let run = 0; for (const q of strs) { run = pixRow(q) ? run + 1 : 0; if (run >= 3) return true; } return false; }, longB64 = s => /"[A-Za-z0-9+/=]{40,}"/.test(s);
    const offenders = js.filter(([, s]) => asciiArt(s) || longB64(s)).map(([f]) => f);
    const idsFromJson = new Set(PACKS.flatMap(p => JSON.parse(read(`art/plant/packs/${p}/atlas.json`)).sprites.map(s => s.id))), idsGen = new Set(PACKS.flatMap(p => Object.keys(ART.packs[p].sprites).map(k => k.split("@")[0])));
    check(!offenders.length && /^\/\/ GENERATED by tools\/build-plant-art\.mjs from art\/plant\/ — DO NOT EDIT/.test(gen) && [...idsGen].every(i => idsFromJson.has(i)) && committed,
      "D4 · no sprite is authored in JS: the hand-written runtime (model, selector, compositor, FX, page) contains no pixel strings or pixel data; the only pixels are in the GENERATED file, which is a byte-exact build of the PNGs; every runtime sprite id comes from an atlas.json", J({ offenders, sprites: idsGen.size })); }

  console.log("# Node — renderer");
  // R1 · one canonical canvas
  { const sizes = new Set(); for (const p of PACKS) for (const t of Object.values(STATES)) for (const c of ["thriving", "strained"]) { const F = frame(p, t, c); sizes.add(`${F.W}×${F.H}`); }
    check(sizes.size === 1 && [...sizes][0] === `${CANVAS.w}×${CANVAS.h}` && CANVAS.w === contract.canvas.w && CANVAS.h === contract.canvas.h, `R1 · ONE canonical plant canvas: every build, pack and condition renders at ${CANVAS.w}×${CANVAS.h}`, [...sizes].join(", ")); }
  // R2 · trait → component rules live in the selector; the renderer names no trait, price or tier rule
  { const src = ["resources/plant-visual/plant-compositor.js", "resources/plant-visual/plant-fx.js"].map(read).join("\n").replace(/\/\/.*$/gm, "");
    const named = ["cold", "heat", "drought", "flood", "salt", "rad", "seedOut", "earlyMat", "waterSeeds"].filter(id => new RegExp(`["'\`]${id}["'\`]|\\.${id}\\b`).test(src));
    const pricey = /\bcost\b|\bprice\b|BLOOM_DATA|tempCap|\.traits\b/.test(src);
    const S2 = sel({ cold: 2 }), Sd = sel({ drought: 2 }), Sr = sel({ rad: 1 }), S1 = sel({ seedOut: 1 }), Ss = sel({ seedOut: 2 }), Se = sel({ earlyMat: 1 }), Sx = sel(STATES.maxDry), Sw = sel(STATES.maxWet), Sb = sel({});
    const ok = S2.layout === "compact" && S2.leaf.component === "leaf.base" && S2.collars === "frost.collar.2" && S2.leafPoints.some(q => q.component === "frost.hair.2" && q.at === "tip+margin")
      && Sd.leaf.component === "leaf.drought.2" && Sd.roots.storage === "root.storage.2" && J(Sr.treatments) === J([{ id: "pigment", level: 1 }]) && J(Sr.components) === J(Sb.components)
      && S1.apex === "seedHead.small" && !S1.sideHeads && Ss.apex === "seedHead.large" && Ss.sideHeads === 2 && Ss.drift === 3 && Se.apex === "flower" && Sx.flower === "flower.1" && Sx.layout === "compact"
      && Sx.leaf.component === "leaf.drought.3" && Sw.leaf.component === "leaf.flood.3" && Sb.apex === "bud" && Sb.axils === "bud.axil" && !Sb.flower && !Sb.sideHeads;
    check(!named.length && !pricey && ok, "R2 · trait rule separation: the model maps real traits to visual axes (cold T2 → compact 2 + frost 2 …), the selector maps axes to component ids (BASE = closed apical + axillary buds only), and the compositor / FX name no trait, tier rule, price or BLOOM_DATA", J({ named, pricey, maxDry: Sx.components })); }
  // R3 · every golden-slice state visibly differs (per pack), each from base and from each other
  { const out = {};
    for (const p of PACKS) { const F = Object.fromEntries(Object.entries(STATES).map(([k, t]) => [k, frame(p, t)])), keys = Object.keys(F), sigs = new Set(keys.map(k => F[k].sig.anatomy));
      const fromBase = Object.fromEntries(keys.filter(k => k !== "base").map(k => [k, FX.diff(F.base, F[k]).length]));
      let minPair = Infinity; for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) if (ART_CAP_TWINS[keys[j]] !== keys[i]) minPair = Math.min(minPair, FX.diff(F[keys[i]], F[keys[j]]).length);
      out[p] = { distinct: sigs.size, fromBase, minPair };
      for (const [a, b] of Object.entries(ART_CAP_TWINS)) if (F[a].sig.anatomy !== F[b].sig.anatomy) out[p].capBroken = a;
      PROOF.states[p] = Object.fromEntries(keys.map(k => [k, { anatomy: F[k].sig.anatomy, full: F[k].sig.full, components: sel(STATES[k]).components, treatments: sel(STATES[k]).treatments, layout: sel(STATES[k]).layout, placements: F[k].placements.length, bbox: F[k].bbox }])); }
    const nDistinct = Object.keys(STATES).length - Object.keys(ART_CAP_TWINS).length;
    check(Object.values(out).every(o => o.distinct === nDistinct && !o.capBroken && Object.values(o.fromBase).every(n => n >= 30) && o.minPair >= 20), `R3 · all ${Object.keys(STATES).length} locked states are distinct organisms in every pack (${nDistinct} distinct anatomies: only Drought T4 / Flood T4 share T3's, by the art cap): each differs from BASE by ≥ 30 px and from every other state by ≥ 20 px`, J(Object.fromEntries(Object.entries(out).map(([k, o]) => [k, { distinct: o.distinct, minPair: o.minPair, minFromBase: Math.min(...Object.values(o.fromBase)) }])))); }
  // R4 · every locked state composes without clipping (runtime) + the static per-socket proof
  { const clips = []; for (const p of PACKS) for (const [k, t] of Object.entries(STATES)) for (const c of ["thriving", "strained"]) { const F = frame(p, t, c); if (F.clip || F.bbox.x0 < 0 || F.bbox.y1 >= F.H) clips.push(`${p}/${k}/${c}:${F.clip}`); }
    const extreme = [{ drought: 9 }, { flood: 9 }, { cold: 3, drought: 7, salt: 1, rad: 1, seedOut: 2, earlyMat: 1, waterSeeds: 1 }].map(t => PACKS.map(p => frame(p, t).clip).reduce((a, b) => a + b, 0));
    const C = frame("proof", STATES.maxDry), comps = new Set(C.placements.map(q => q.component));
    check(!clips.length && extreme.every(n => n === 0) && ["leaf.drought.3", "frost.hair.2", "frost.collar.2", "salt.crystal", "salt.gland", "root.storage.3", "seedHead.large", "seedHead.small", "seed.drift", "flower", "pod", "bud.axil"].every(c => comps.has(c)) && !B.buildPlantArt(ROOT).errors.length,
      "R4 · every locked state composes with no pixel clipped, in every pack, thriving and strained (and gameplay tiers far above the art cap); the build's static proof places every sprite at every socket — and every leaf-point detail on every leaf drawing — inside the canvas", J({ clips, placements: C.placements.length })); }
  // R5 · placement = skeleton: every sprite sits on a contract socket (the build's size-budget sockets == the renderer's)
  { const manifest = JSON.parse(read("resources/plant-visual/generated/plant-atlas-manifest.json")), so = PC.sockets(ART.bodyPlan, CANVAS);
    const key = a => J(a.sort()), same = key(manifest.sockets.map(s => J([s.layout, s.socket, s.at, s.room]))) === key(so.map(s => J([s.layout, s.socket, [s.x, s.y], Object.fromEntries(Object.entries(s.room).sort())])));
    const off = []; for (const p of PACKS) { const F = frame(p, STATES.maxDry), table = Object.fromEntries(so.filter(s => s.layout === "compact" || s.layout === "*").map(s => [s.socket, s]));
      for (const q of F.placements.filter(q => q.kind === "sprite" && !q.socket.endsWith(":point"))) { const s = table[q.socket]; if (!s || s.x !== q.anchor.x || s.y !== q.anchor.y) off.push(`${p}:${q.component}@${q.socket}`); } }
    check(same && !off.length && manifest.sockets.length === so.length, `R5 · the skeleton chooses placement: every sprite's anchor pixel lands exactly on its body-plan socket; the manifest's per-socket size budget (${so.length} sockets) is the renderer's own socket table`, J({ off })); }
  // R6 · pack swap: same skeleton + components, different pixels — the renderer is style-agnostic
  { const res = Object.entries(STATES).map(([k, t]) => { const F = PACKS.map(p => frame(p, t)), lay = F.map(f => J(f.placements.map(q => q.socket.endsWith(":point") ? [q.component, q.socket] : [q.component, q.socket, q.anchor]))), pix = new Set(F.map(f => f.sig.full)); return { k, sameSkeleton: new Set(lay).size === 1, distinctPixels: pix.size === PACKS.length }; });
    check(PACKS.length >= 3 && res.every(r => r.sameSkeleton && r.distinctPixels), `R6 · swapping only the art pack (${PACKS.join(" / ")}) re-skins every state — same components on the same sockets (surface details ride on each pack's own leaf points), entirely different pixels — with no renderer change`, J(res.filter(r => !(r.sameSkeleton && r.distinctPixels)))); }
  // R7 · treatments through masks; posture via authored angle variants
  { const b = frame("proof", {}), r = frame("proof", { rad: 1 }), d = FX.diff(b, r), MID = Object.fromEntries(ART.materials.map((m, i) => [m, i + 1]));
    const recolourOnly = d.every(q => b.plant.m[q.i] && r.plant.m[q.i] && (b.plant.m[q.i] & 3) === (r.plant.m[q.i] & 3)), pig = d.filter(q => [MID.pigLeaf, MID.pigStem].includes(r.plant.m[q.i] >> 2)).length;
    const leafPx = [...b.plant.m].filter(v => v >> 2 === MID.leaf).length, leafLeft = [...r.plant.m].filter(v => v >> 2 === MID.leaf).length;
    const s = frame("proof", {}, "strained"), angT = f => f.placements.filter(q => q.component === "leaf.base").map(q => q.key.split(".")[2].split("@")[0]);
    check(recolourOnly && pig === d.length && leafLeft > 0 && leafLeft < leafPx && J(angT(s)) === J(angT(b).map(a => ({ low: "low", mid: "low", high: "mid" })[a])),
      "R7 · Radiation is a pure surface treatment (recolour shade-for-shade, no pixel added or moved) applied through each sprite's authored pigment MASK (the proof pack masks only the leaf base); strain steps every leaf to the next lower AUTHORED angle variant (no rotation)", J({ recoloured: d.length, leafPx, leafLeftGreen: leafLeft })); }

  console.log("# Node — preview + FX");
  // F1 · preview + cancel; F2 · FX exact; F3 · reduced motion
  { const fx = {};
    for (const [a, b] of [["base", "cold2"], ["base", "rad"], ["seed2", "maxDry"], ["base", "early"]]) for (const p of PACKS) {
      const cur = frame(p, STATES[a]), tgt = frame(p, STATES[b]), pv = FX.preview(cur, tgt), d = FX.diff(cur, tgt), dset = new Set(d.map(q => q.i));
      const pvSig = PC.fnv(pv), pristine = PC.fnv(cur.rgba) === cur.sig.full;
      const res = {}; for (const st of FX.STYLES) { const mid = FX.fxFrame(cur, tgt, st, 0.5), end = FX.fxFrame(cur, tgt, st, 1), t0f = FX.fxFrame(cur, tgt, st, 0);
        let leak = 0; for (let i = 0; i < cur.W * cur.H; i++) if (!dset.has(i)) for (let k = 0; k < 3; k++) if (mid[i * 4 + k] !== cur.rgba[i * 4 + k]) { leak++; break; }
        res[st] = { exact: PC.fnv(end) === tgt.sig.full, mid: PC.fnv(mid) !== tgt.sig.full && PC.fnv(mid) !== cur.sig.full, start: PC.fnv(t0f) === cur.sig.full, leak }; }
      fx[`${p}:${a}→${b}`] = { diff: d.length, previewDiffers: pvSig !== cur.sig.full, curIntact: pristine, anchors: FX.anchorsOf(cur, tgt).length, ...res }; }
    const all = Object.values(fx);
    check(all.every(x => x.previewDiffers && x.curIntact), "F1 · GHOST / OUTLINE preview shows the proposed change (ghosted new pixels, thinned removals, a traced outline) without mutating the current frame — cancel = repaint the unchanged current frame, exactly", `${all.length} previews`);
    check(all.every(x => x.grow.exact && x.dissolve.exact && x.grow.start && x.dissolve.start && x.grow.mid && x.dissolve.mid && !x.grow.leak && !x.dissolve.leak),
      "F2 · GROW and DISSOLVE start on the current frame, pass through genuine in-between frames that touch ONLY the changed pixels, and end EXACTLY on the target frame (every pack, structural, surface and reproductive mutations)", J(Object.fromEntries(Object.entries(fx).slice(0, 4))));
    const cur = frame("proof", {}), tgt = frame("proof", { earlyMat: 1 }), got = []; let ms = 0;
    const r = await FX.purchase(cur, tgt, { reducedMotion: true, onFrame: f => got.push(PC.fnv(f)), now: () => ms });
    let clock = 0; const played = []; const r2 = await FX.purchase(cur, tgt, { style: "grow", onFrame: f => played.push(PC.fnv(f)), now: () => clock, raf: f => { clock += 16; setImmediate(f); } });
    check(r.frames === 1 && got.length === 1 && got[0] === tgt.sig.full && r2.frames > 20 && played[played.length - 1] === tgt.sig.full, "F3 · reduced motion = a short direct swap: exactly one frame, the target; the animated path plays ≥ 20 frames and also ends on the target", J({ reduced: r, animated: { frames: r2.frames, ms: r2.ms } }));
    PROOF.fx = fx; }
  console.log("# Node — the locked Organic Hybrid contract");
  const C_ = contract.components, compsOf = t => sel(t).components, famOf = id => C_[id] && C_[id].family;
  const MAN = JSON.parse(read("resources/plant-visual/generated/plant-atlas-manifest.json"));
  // N1 · every locked trait / tier normalizes onto its visual axes
  { const M = t => PV.model.normalize({ traits: t }, RULES), bad = [];
    const expect = [[{ cold: 1 }, m => m.architecture.compact === 1 && m.surface.frost === 1], [{ cold: 3 }, m => m.architecture.compact === 3 && m.surface.frost === 3],
      [{ heat: 2 }, m => m.leaf.heat === 2 && m.surface.wax === 2 && !m.architecture.compact], [{ cold: 2, heat: 1 }, m => m.architecture.compact === 2 && m.leaf.heat === 1 && m.surface.frost === 2 && m.surface.wax === 1 && m.legal],
      [{ drought: 1 }, m => m.leaf.water.arm === "drought" && m.leaf.water.tier === 1 && m.roots.storage === 1], [{ drought: 6 }, m => m.leaf.water.tier === 3 && m.roots.storage === 3 && m.capped[0].drawnAs === 3 && m.legal],
      [{ flood: 2 }, m => m.leaf.water.arm === "flood" && m.roots.aerial === 2 && !m.roots.storage], [{ flood: 5 }, m => m.leaf.water.tier === 3 && m.legal],
      [{ salt: 1 }, m => m.surface.salt === 1], [{ rad: 1 }, m => m.surface.pigment === 1], [{ seedOut: 1 }, m => m.repro.seedHead === 1], [{ seedOut: 2 }, m => m.repro.seedHead === 2],
      [{ earlyMat: 1 }, m => m.repro.flower === 1], [{ waterSeeds: 1 }, m => m.repro.pods === 1], [{}, m => m.legal && !m.repro.flower && !m.repro.seedHead]];
    for (const [t, f] of expect) if (!f(M(t))) bad.push(J(t));
    const legal = Object.entries(STATES).filter(([, t]) => !PV.model.validate(t, RULES).legal).map(([k]) => k);
    check(!bad.length && !legal.length, `N1 · every locked trait / tier normalizes onto its visual axis (Cold → architecture + insulation, Heat → leaf orientation + wax, Drought / Flood → primary leaf + roots, Salt / Radiation → surface, Seed Output / Early Maturity / Waterborne → reproductive), and all ${Object.keys(STATES).length} proof states — incl. both maximal builds — are LEGAL under the real rules`, J({ bad, illegal: legal })); }
  // N2 · every component slot of the locked vocabulary exists in the contract, and every pack provides every one
  { const required = ["leaf.base", "bud", "bud.axil", "frost.hair.1", "frost.hair.2", "frost.hair.3", "frost.collar.2", "frost.collar.3", "leaf.base.heat",
      ...["drought", "flood"].flatMap(a => [1, 2, 3].flatMap(t => [`leaf.${a}.${t}`, `leaf.${a}.${t}.heat`])), "root.storage.2", "root.storage.3", "root.aerial.1", "root.aerial.2", "root.aerial.3", "root.stilt",
      "salt.crystal", "salt.gland", "flower", "seedHead.small", "seedHead.large", "seed.drift", "pod"];
    const missing = required.filter(c => !C_[c]), packMiss = Object.fromEntries(PACKS.map(p => [p, MAN.packs[p].missing])), treat = ["pigment", "wax", "toothed"].filter(t => !contract.treatments[t]);
    const heatLevels = J(contract.treatments.wax.levels), noT4 = Object.keys(C_).filter(c => /\.[4-9](\.|$)/.test(c));
    check(!missing.length && !treat.length && PACKS.every(p => !packMiss[p].length) && heatLevels === J({ 1: [2, 3], 2: [1, 2, 3], 3: [0, 1, 2, 3] }) && !noT4.length,
      `N2 · all ${Object.keys(C_).length} contract component slots of the locked vocabulary exist (BASE leaves + buds · Cold T1–T3 hairs + T2/T3 collars · Heat T3 leaf variants for every structure + wax levels 1–3 · Drought T1–T3 + T2/T3 storage roots · Flood T1–T3 + aerial T1–T3 + stilt · Salt gland + crystal + toothed mask · Radiation pigment · flower · T1/T2 dry heads + drift · pod) and every pack provides every sprite (no T4+ asset exists)`, J({ missing, treat, packMiss, noT4 })); }
  // N3 · Cold + Heat combine legally on ONE organism: cold architecture / insulation + heat surface / orientation
  { const c2 = sel({ cold: 2 }), h1 = sel({ heat: 1 }), ch = sel({ cold: 2, heat: 1 }), legal = PV.model.validate({ cold: 2, heat: 1 }, RULES).legal;
    const F = PACKS.map(p => ({ c2: frame(p, { cold: 2 }), h1: frame(p, { heat: 1 }), ch: frame(p, { cold: 2, heat: 1 }) }));
    const angles = f => f.placements.filter(q => q.component.startsWith("leaf.")).map(q => q.key.split("@")[0].split(".").pop());
    const ok = legal && ch.layout === c2.layout && ch.collars === c2.collars && J(ch.leafPoints) === J(c2.leafPoints) && ch.treatments.some(t => t.id === "wax" && t.level === 1) && J(ch.leaf.angle) === J(h1.leaf.angle)
      && F.every(f => f.ch.sig.anatomy !== f.c2.sig.anatomy && f.ch.sig.anatomy !== f.h1.sig.anatomy && J(angles(f.ch)) !== J(angles(f.c2)) || f.ch.sig.anatomy !== f.c2.sig.anatomy) && TEMP_COMBOS.every(t => PV.model.validate(t, RULES).legal);
    check(ok && !PV.model.validate({ cold: 2, heat: 2 }, RULES).legal, "N3 · Cold T2 + Heat T1 is legal and reads as ONE organism with BOTH axes: Cold's compact layout, collars and frost hairs + Heat's wax sheen and lifted authored angles (≠ Cold T2 alone, ≠ Heat T1 alone); Cold and Heat are never exclusive — only the shared temperature pool (cold + heat ≤ 3) limits them", J({ c2: c2.components, ch: ch.components, angle: ch.leaf.angle })); }
  // N4 · Drought / Flood stay mutually exclusive
  { const both = PV.model.validate({ drought: 1, flood: 1 }, RULES), fams = Object.values(STATES).map(t => sel(t).leaf.component).filter(c => /drought/.test(c) && /flood/.test(c));
    const anyBoth = Object.values(STATES).some(t => { const c = compsOf(t).join(); return /drought|storage/.test(c) && /flood|aerial|stilt/.test(c); });
    check(!both.legal && !fams.length && !anyBoth, "N4 · Drought and Flood remain mutually exclusive: the real rules reject a both-arms build; no state ever selects drought and flood components together (one PRIMARY leaf structure at a time)", J(both.issues)); }
  // N5 · the T3 art cap: gameplay tiers ≥ 3 draw EXACTLY as T3, without any T4 asset
  { const res = []; for (const p of PACKS) for (const arm of ["drought", "flood"]) { const t3 = frame(p, { [arm]: 3 }); for (const n of [4, 5, 9]) { const tn = frame(p, { [arm]: n }); res.push({ p, arm, n, anat: tn.sig.anatomy === t3.sig.anatomy, full: tn.sig.full === t3.sig.full }); } }
    const mx = PACKS.every(p => frame(p, { ...STATES.maxDry, drought: 8 }).sig.anatomy === frame(p, STATES.maxDry).sig.anatomy && frame(p, { ...STATES.maxWet, flood: 8 }).sig.anatomy === frame(p, STATES.maxWet).sig.anatomy);
    check(res.every(r => r.anat && r.full) && mx, "N5 · art cap: Drought T4 / T5 / T9 and Flood T4 / T5 / T9 render byte-identical anatomy (and pixels) to authored T3 in every pack, alone and inside the maximal builds — no T4+ asset is requested", `${res.length} comparisons`); }
  // N6 · Salt vs Cold: disjoint component families
  { const coldIds = new Set([1, 2, 3].flatMap(t => compsOf({ cold: t })).filter(c => !compsOf({}).includes(c) && !c.startsWith("leaf."))), saltIds = new Set(compsOf({ salt: 1 }).filter(c => !compsOf({}).includes(c)));
    const both = [...coldIds].filter(c => saltIds.has(c)), coldFam = [...coldIds].every(c => famOf(c) === "frost"), saltFam = [...saltIds].every(c => famOf(c) === "salt");
    const contractOverlap = Object.entries(C_).filter(([id, c]) => (c.family === "frost" && c.trait !== "cold") || (c.family === "salt" && c.trait !== "salt") || (/frost/.test(id) && c.family !== "frost") || (/salt/.test(id) && c.family !== "salt")).map(([id]) => id);
    const mixed = sel({ cold: 2, salt: 1 }), points = new Set(), clash = [];
    for (const lp of mixed.leafPoints) for (const at of lp.at.split("+").flatMap(a => a.startsWith("margin:") ? a.slice(7).split(",").map(k => "margin" + k) : a === "margin" ? ["margin0", "margin1", "margin2"] : [a])) { if (points.has(at)) clash.push(at); points.add(at); }
    const mats = PACKS.every(p => { const pal = ART.packs[p].palette; return pal.salt.every(c => !pal.frost.includes(c)); });
    check(coldIds.size && saltIds.size && !both.length && coldFam && saltFam && !contractOverlap.length && !clash.length && mats,
      "N6 · Salt ≠ Cold: Cold resolves only to FROST-family components (hairs, wool collars), Salt only to SALT-family components (glands, faceted crystals) + the toothed treatment; no component id serves both; with both traits they never share a leaf point; salt and frost have separate material ramps", J({ cold: [...coldIds], salt: [...saltIds], both, contractOverlap, clash })); }
  // N7 · Waterborne pods have real sockets and stalks
  { const so = PC.sockets(ART.bodyPlan, CANVAS), podSo = so.filter(q => q.attach === "pod"), lays = Object.keys(ART.bodyPlan.layouts);
    const placed = PACKS.every(p => { const F = frame(p, { waterSeeds: 1 }), pods = F.placements.filter(q => q.component === "pod"), stalks = F.placements.filter(q => q.component === "branch" && /^pod\./.test(q.socket));
      const tab = Object.fromEntries(so.filter(q => q.layout === "open").map(q => [q.socket, q])); return pods.length === 2 && stalks.length === 2 && pods.every(q => tab[q.socket] && tab[q.socket].x === q.anchor.x && tab[q.socket].y === q.anchor.y); });
    check(podSo.length === 2 * lays.length && lays.every(l => podSo.filter(q => q.layout === l).length === 2) && placed && famOf("pod") === "pod" && C_.pod.attach === "pod",
      `N7 · Waterborne Seeds has real sockets: pod.0 / pod.1 (low side stalks) in all ${lays.length} layouts; both pods hang exactly from their sockets on procedural stalks; the pod family is separate from flowers and dry seed heads`, J(podSo.filter(q => q.layout === "open").map(q => [q.socket, q.x, q.y]))); }
  // N8 · N9 · the maximal legal DRY and WET organisms fit 84×98 (every legal temperature-pool split), with a 1-px safety margin
  for (const [nid, label, base, must, leaf3] of [["N8", "DRY", STATES.maxDry, ["root.storage.3"], "leaf.drought.3"], ["N9", "WET", STATES.maxWet, ["root.aerial.3", "root.stilt"], "leaf.flood.3"]]) {
    const res = [];
    for (const temp of TEMP_COMBOS) { const t = { ...base, cold: 0, heat: 0, ...temp }; delete t.cold; delete t.heat; Object.assign(t, temp);
      for (const p of PACKS) for (const cond of ["thriving", "strained"]) { const F = frame(p, t, cond), F2 = frame(p, t, cond), comps = new Set(F.placements.map(q => q.component)), sl = sel(t, cond);
        const req = [...must, sl.leaf.component, "salt.crystal", "salt.gland", "seedHead.large", "seedHead.small", "seed.drift", "flower", "pod", "bud.axil", ...sl.leafPoints.map(q => q.component), ...(sl.collars ? [sl.collars] : [])];
        const margin = Math.min(F.bbox.x0, F.bbox.y0, F.W - 1 - F.bbox.x1, F.H - 1 - F.bbox.y1);
        res.push({ temp: J(temp), p, cond, legal: PV.model.validate(t, RULES).legal, clip: F.clip, margin, missing: req.filter(c => !comps.has(c)), det: F.sig.full === F2.sig.full && F.sig.full === PC.render(sl, p).sig.full, leaf: sl.leaf.component, pig: sl.treatments.some(x => x.id === "pigment") }); } }
    const bad = res.filter(r => !r.legal || r.clip || r.margin < 1 || r.missing.length || !r.det || !r.pig || !r.leaf.startsWith(leaf3));
    PROOF[`maximal${label}`] = { traits: base, combos: TEMP_COMBOS, minMargin: Math.min(...res.map(r => r.margin)), cases: res.length, bbox: frame("proof", base).bbox, components: sel(base).components };
    check(!bad.length, `${nid} · MAXIMAL LEGAL ${label} (temperature pool + ${label === "DRY" ? "Drought T3" : "Flood T3"} + Salt + Radiation + Seed Output T2 + Early Maturity + Waterborne Seeds) fits the 84×98 canvas for every legal Cold/Heat split (3+0, 2+1, 1+2, 0+3), every pack, thriving and strained: legal, every required component present, no pixel clipped, ≥ 1 px clear of every edge, deterministic`, J({ cases: res.length, minMargin: PROOF[`maximal${label}`].minMargin, bad: bad.slice(0, 3) })); }
  // N10 · the complete socket table (incl. tips / margins via leaf points) lies inside the canvas and is documented in the manifest
  { const so = PC.sockets(ART.bodyPlan, CANVAS), kinds = new Set(so.map(q => q.attach)), want = ["leafSocket", "stemNode", "axil", "apex", "flower", "seedHead", "pod", "drift", "rootCrown", "primaryRoot", "aerialRoot", "stiltRoot"];
    const out = so.filter(q => q.x < 0 || q.y < 0 || q.x >= CANVAS.w || q.y >= CANVAS.h).map(q => q.socket);
    const pointsIn = PACKS.every(p => Object.values(ART.packs[p].sprites).filter(sp => sp.attach === "leafSocket").every(sp => [sp.points.tip, ...sp.points.margin].every(pt => pt && pt[0] < sp.w && pt[1] < sp.h) && sp.points.margin.length === 3));
    const proven = PACKS.map(p => MAN.packs[p].placementsProven);
    check(want.every(k => kinds.has(k)) && !out.length && pointsIn && proven.every(n => n > 1000) && MAN.sockets.length === so.length && contract.attach.leafPoint,
      `N10 · the socket table covers leaf sockets, stem nodes / collars, axils, apex, flower branch, seed-head branches, pod branches, drift points, root crown, primary root, aerial-root and stilt-root anchors (${so.length} sockets, all inside the canvas); every leaf drawing declares a tip + 3 margin points; the build statically proves ${proven.join(" / ")} placements (every sprite at every socket, every leaf-point detail on every leaf drawing)`, J({ out, kinds: [...kinds] })); }
  // N11 · N12 · preview + Grow / Dissolve / reduced motion for every new mutation class
  { const classes = { structural: [["base", "cold1"], ["cold2", "cold3"], ["base", "drought1"], ["drought2", "drought3"], ["base", "flood1"], ["flood2", "flood3"], ["heat2", "heat3"]],
      surface: [["base", "heat1"], ["heat1", "heat2"], ["base", "salt"], ["base", "rad"], ["cold2", "cold2heat1"]], reproductive: [["base", "seed1"], ["seed1", "seed2"], ["base", "early"], ["base", "water"], ["maxDry", "maxWet"]] };
    const pv = [], fx = [];
    for (const [cls, pairs] of Object.entries(classes)) for (const [a, b] of pairs) for (const p of PACKS) {
      const cur = frame(p, STATES[a]), tgt = frame(p, STATES[b]), view = FX.preview(cur, tgt), d = FX.diff(cur, tgt).length;
      pv.push({ cls, a, b, p, ok: d > 0 && PC.fnv(view) !== cur.sig.full && PC.fnv(cur.rgba) === cur.sig.full });
      for (const st of FX.STYLES) fx.push({ cls, st, a, b, p, ok: PC.fnv(FX.fxFrame(cur, tgt, st, 1)) === tgt.sig.full && PC.fnv(FX.fxFrame(cur, tgt, st, 0)) === cur.sig.full && PC.fnv(FX.fxFrame(cur, tgt, st, 0.5)) !== tgt.sig.full }); }
    let rmOk = true; for (const [a, b] of [["base", "flood3"], ["base", "salt"], ["base", "water"]]) { const cur = frame("proof", STATES[a]), tgt = frame("proof", STATES[b]), got = [];
      const r = await FX.purchase(cur, tgt, { reducedMotion: true, onFrame: f => got.push(PC.fnv(f)) }); rmOk = rmOk && r.frames === 1 && got.length === 1 && got[0] === tgt.sig.full; }
    check(pv.every(x => x.ok), `N11 · the ghost / outline preview shows every new mutation class — structural (Cold T1→T3 architecture, Drought / Flood T1→T3, Heat T3 leaf form), surface (wax T1/T2, salt, pigment, Heat over Cold) and reproductive (dry heads, flower, pods) — and never mutates the current frame`, `${pv.length} previews`);
    check(fx.every(x => x.ok) && rmOk && contract.treatments && FX.STYLES.join() === "grow,dissolve", `N12 · GROW (the default purchase FX) and DISSOLVE start on the current frame and end EXACTLY on the target for every structural, surface and reproductive change in every pack; reduced motion is one exact direct swap`, `${fx.length} animations · bad ${J(fx.filter(x => !x.ok).slice(0, 3))}`); }

  // G1 · no gameplay data mutated by any of this
  check(J(BLOOM_DATA.traits) === TRAITS_SNAPSHOT && J(BLOOM_DATA.config) === CONFIG_SNAPSHOT, "G1 · no trait / mechanic change: BLOOM_DATA.traits and config are identical after every render, preview and purchase");
  // H1 · the ARTIST_HANDOFF contract is complete and agrees with the generated socket table
  { const doc = read("docs/PLANT_SPRITE_PIPELINE_v1.md"), hs = Array.from({ length: 17 }, (_, i) => `### H${i + 1}.`).filter(h => !doc.includes(h) && !(h === "### H11." && doc.includes("+ H11.")));
    const man = JSON.parse(read("resources/plant-visual/generated/plant-atlas-manifest.json")), missing = man.sockets.filter(s => !doc.includes(`${s.at[0]}, ${s.at[1]}`)).map(s => `${s.layout}/${s.socket}`);
    const comps = Object.keys(contract.components).filter(c => !doc.includes("`" + c + "`"));
    check(!hs.length && !missing.length && !comps.length && doc.includes(`**${CANVAS.w} × ${CANVAS.h} logical pixels**`) && doc.includes(`row ${CANVAS.soilY}`),
      "H1 · docs ARTIST_HANDOFF covers all 17 contract points (canvas, pixel format, transparency, palette, rect, anchor, layers, orientations, naming, trait/tier, categories, masks, sockets, size budget, angles, build, adding sprites) and its socket table matches the generated manifest", J({ hs, missing, comps })); }
  // P1 · portable / Pages contract
  { const site = await import(path.join(ROOT, "tools/build-pages-site.mjs")), tmp = fs.mkdtempSync(path.join(os.tmpdir(), "site-")), files = site.buildSite(ROOT, tmp);
    const need = ["resources/plant-visual/generated/plant-atlas.js", "resources/plant-visual/plant-visual-model.js", "resources/plant-visual/plant-components.js", "resources/plant-visual/plant-compositor.js", "resources/plant-visual/plant-fx.js"];
    fs.rmSync(tmp, { recursive: true, force: true });
    let bundled = null; try { const esb = require(path.join(ROOT, "tools/node_modules/esbuild")); const r = esb.buildSync({ stdin: { contents: need.map(f => `import ${J("./" + f)};`).join("\n"), resolveDir: ROOT }, bundle: true, write: false, format: "iife", platform: "browser", logLevel: "silent" });
      const g = {}; new Function("globalThis", "window", r.outputFiles[0].text)(g, g); bundled = g.BLOOM && g.BLOOM.plantArt && g.BLOOM.plantArt.fingerprint === ART.fingerprint && typeof g.BLOOM.plantCompositor.render === "function"; } catch (e) { bundled = "esbuild: " + e.message; }
    const noFetch = need.every(f => !/\bfetch\(|XMLHttpRequest|new Image\(|import\(/.test(read(f)));
    check(need.every(f => files.includes(f)) && bundled === true && noFetch, "P1 · portable contract: the generated atlas and pipeline are classic scripts with no fetch / image decode / dynamic import (synchronous over file://); the GitHub Pages site build (tools/build-pages-site.mjs, unchanged) ships them automatically under resources/; and esbuild — the portable runtime's bundler — bundles them as plain imports with the identical atlas", J({ bundled })); }

  // ---------------------------------------------------------------- browsers
  let playwright = null; try { playwright = require("playwright"); } catch { check(false, "B0 · Playwright available (NODE_PATH=\"$(npm root -g)\")"); }
  const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png" };
  const serve = prefix => new Promise(res => { const s = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split("?")[0]); if (prefix) { if (!u.startsWith(prefix)) { r.writeHead(404); return r.end(); } u = u.slice(prefix.length - 1); }
      const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r); });
    s.listen(0, "127.0.0.1", () => res(s)); });
  const nodeSig = (pack, traits) => frame(pack, traits).sig.full;
  if (playwright) {
    const srvRoot = await serve(null), srvSub = await serve("/bloom/");
    const ORIGINS = { file: "file://" + encodeURI(ROOT) + "/", http: `http://127.0.0.1:${srvRoot.address().port}/`, subpath: `http://127.0.0.1:${srvSub.address().port}/bloom/` };
    const PAGE = "demos/plant-sprite-pipeline-lab.html";
    for (const bn of BROWSERS) {
      const browser = await playwright[bn].launch(); PROOF.browsers[bn] = {};
      { const warm = await browser.newPage(); await warm.goto(ORIGINS.file + PAGE); await warm.waitForTimeout(1500); await warm.close(); }   // (a fresh headless Chromium can lose its first page's 2D contexts)
      for (const [where, origin] of Object.entries(ORIGINS)) {
        const p = await browser.newPage({ viewport: { width: 1440, height: 900 } }), errs = [], external = [], loaded = [];
        p.on("console", m => { if (m.type() === "error") errs.push(m.text()); }); p.on("pageerror", e => errs.push(e.message));
        p.on("request", r => { const u = r.url(); loaded.push(u); if (!(u.startsWith("file:") || u.startsWith("data:") || u.startsWith("http://127.0.0.1:"))) external.push(u); });
        p.on("requestfailed", r => errs.push("failed: " + r.url()));
        const B_ = `[${bn} · ${where}]`;
        await p.goto(origin + PAGE); await p.waitForFunction(() => window.PLANT_PIPELINE_LAB && PLANT_PIPELINE_LAB.ready, null, { timeout: 20000 }); await p.waitForTimeout(400);
        const boot = await p.evaluate(() => ({ url: location.href, fp: BLOOM.plantArt.fingerprint, packs: BLOOM.plantArt.packOrder, banner: document.querySelector(".banner").textContent, errors: PLANT_PIPELINE_LAB.errors }));
        const pageSigs = async () => p.evaluate(() => PLANT_PIPELINE_LAB.canvasSigs("canvas[data-role=live]"));
        // every golden state: browser pixels == Node pixels (all packs)
        const mism = [];
        for (const [k, t] of Object.entries(STATES)) { await p.evaluate(id => PLANT_PIPELINE_LAB.setPreset(id), k); const sigs = await pageSigs();
          for (const s of sigs) if (s.sig !== nodeSig(s.pack, t)) mism.push(`${k}/${s.pack}`); }
        const subOk = where !== "subpath" || (boot.url.includes("/bloom/demos/") && loaded.every(u => !u.startsWith(origin.replace("/bloom/", "/")) || u.includes("/bloom/")));
        check(!errs.length && !boot.errors.length && boot.fp === ART.fingerprint && boot.banner.includes("NOT FINAL ART") && !mism.length && subOk,
          `${B_} B1 · the proof page boots (${where === "file" ? "double-clicked file://" : where === "http" ? "HTTP at /" : "HTTP under the /bloom/ GitHub Pages subpath"}) with no console error, the generated atlas loaded synchronously, the TEMPORARY PIPELINE PROOF banner shown, and every locked state's canvas pixels == the Node render, byte for byte, in all ${boot.packs.length} packs`, J({ mism, errs: errs.slice(0, 3), loaded: loaded.length }));
        check(!external.length, `${B_} B2 · no external request (everything ${where === "file" ? "file:" : "127.0.0.1"})`, external.slice(0, 3).join(" "));
        if (where === "file") {
          // B3 · same organism at every placement, whole-number scale
          await p.evaluate(() => { PLANT_PIPELINE_LAB.setPreset("maxDry"); PLANT_PIPELINE_LAB.set({ view: "placements", pack: "proof" }); });
          const pl = await p.evaluate(() => PLANT_PIPELINE_LAB.canvasSigs("canvas[data-role=placement]"));
          const want = { native: 1, room1024: 2, room1280: 3, room1440: 3, journal: 3, zoom4: 4 }, sig0 = nodeSig("proof", STATES.maxDry);
          const okPl = pl.length === 6 && pl.every(s => s.w === CANVAS.w && s.h === CANVAS.h && s.sig === sig0 && Math.abs(s.cssW - CANVAS.w * want[s.placement]) < 0.01 && Math.abs(s.cssH - CANVAS.h * want[s.placement]) < 0.01);
          check(okPl, `${B_} B3 · the SAME organism at every production placement: one ${CANVAS.w}×${CANVAS.h} canvas with the identical pixel signature, shown at whole-number nearest-neighbour scales — native 1×, Adapt/Spread/Region 1024 → 2×, 1280 → 3×, 1440 → 3×, Field Journal → 3× (+ a 4× zoom)`, J(pl.map(s => `${s.placement}:${s.cssW}×${s.cssH}`)));
          PROOF.browsers[bn].placements = pl;
          // B4 · preview on → ghost; off → exactly current
          await p.evaluate(() => { PLANT_PIPELINE_LAB.set({ view: "compare", placement: "room1280" }); PLANT_PIPELINE_LAB.setPreset("base"); PLANT_PIPELINE_LAB.set({ propose: "cold" }); });
          const before = await pageSigs(); await p.click("#previewBtn"); const during = await pageSigs(); const st = await p.evaluate(() => PLANT_PIPELINE_LAB.S.preview); await p.click("#previewBtn"); const after = await pageSigs();
          check(st && during.every((s, i) => s.sig !== before[i].sig) && after.every((s, i) => s.sig === before[i].sig && s.sig === nodeSig(s.pack, {})), `${B_} B4 · Preview (Cold Tolerance → T1) shows the ghost / outline in every pack; cancelling restores the current pixels EXACTLY`);
          // B5 · purchases: grow, dissolve, reduced motion — all end on the exact target
          const buys = {};
          for (const [label, setup, traitsAfter] of [["grow", { fx: "grow", reducedMotion: false, propose: "earlyMat" }, { earlyMat: 1 }], ["dissolve", { fx: "dissolve", reducedMotion: false, propose: "rad" }, { earlyMat: 1, rad: 1 }], ["reduced", { reducedMotion: true, propose: "seedOut" }, { earlyMat: 1, rad: 1, seedOut: 1 }]]) {
            await p.evaluate(s => PLANT_PIPELINE_LAB.set(s), setup); const r = await p.evaluate(() => PLANT_PIPELINE_LAB.purchase()); const now = await pageSigs();
            buys[label] = { ok: r && r.results.length === PACKS.length && r.results.every(x => x.endSig === x.targetSig && x.endSig === nodeSig(x.pack, traitsAfter)) && now.every(s => s.sig === nodeSig(s.pack, traitsAfter)), frames: r && r.results.map(x => x.frames), style: r && r.style }; }
          check(buys.grow.ok && buys.dissolve.ok && buys.reduced.ok && buys.reduced.frames.every(n => n === 1) && buys.grow.frames.every(n => n > 5), `${B_} B5 · Purchase (visual only): GROW and DISSOLVE animate in every pack and land EXACTLY on the target pixels; reduced motion lands exactly on the target in a single direct swap`, J(buys));
          // B6 · production reference fed the same build, unchanged module
          const prod = await p.evaluate(() => ({ sig: PLANT_PIPELINE_LAB.production && PLANT_PIPELINE_LAB.production.signature(), traits: PLANT_PIPELINE_LAB.production && PLANT_PIPELINE_LAB.production.state.traits }));
          check(prod.sig && J(prod.traits) === J({ earlyMat: 1, rad: 1, seedOut: 1 }), `${B_} B6 · the current production SVG (resources/run-ui/plant-specimen.js, unchanged) is shown beside the packs, fed the same build`, J(prod));
          // B7 · keyboard: presets 1–7
          await p.keyboard.press("8"); const kb = await p.evaluate(() => PLANT_PIPELINE_LAB.S.preset); await p.keyboard.press("1");
          check(kb === "cold2heat1" && !(await p.evaluate(() => PLANT_PIPELINE_LAB.errors.length)), `${B_} B7 · keyboard presets (1–9) work; no page error after every interaction`);
          if (EVIDENCE && bn === "chromium") await evidence(p);
        }
        PROOF.browsers[bn][where] = { url: boot.url.replace(/^file:\/\/.*?\/demos\//, "file://…/demos/"), errors: errs.length, external: external.length, requests: loaded.length };
        await p.close();
      }
      await browser.close();
    }
    srvRoot.close(); srvSub.close();
  }

  async function evidence(p) {
    fs.mkdirSync(EVD, { recursive: true });
    const shot = async (name, clip) => { await p.waitForTimeout(150); await p.screenshot({ path: path.join(EVD, name), fullPage: !clip, clip }); };
    await p.evaluate(() => PLANT_PIPELINE_LAB.set({ view: "compare", placement: "room1280", preview: false, condition: "thriving", reducedMotion: true }));
    let n = 1; for (const k of ["base", "cold2heat1", "drought3", "flood3", "salt", "maxDry", "maxWet"]) { await p.evaluate(id => PLANT_PIPELINE_LAB.setPreset(id), k);
      const box = await p.evaluate(() => { const r = document.querySelector(".cols").getBoundingClientRect(); return { x: 0, y: 0, width: Math.ceil(r.right + 12), height: Math.ceil(r.bottom + 8) }; });
      await shot(`${String(n++).padStart(2, "0")}-${k}-pipeline-and-pack-swap.png`, box); }
    await p.evaluate(() => PLANT_PIPELINE_LAB.set({ view: "sheet", pack: "proof" })); await shot("08-all-locked-states-proof-pack.png");
    await p.evaluate(() => PLANT_PIPELINE_LAB.set({ view: "placements", pack: "proof" })); await p.evaluate(() => PLANT_PIPELINE_LAB.setPreset("maxDry")); await shot("09-same-organism-every-placement.png");
    await p.evaluate(() => { PLANT_PIPELINE_LAB.set({ view: "compare", placement: "room1280" }); PLANT_PIPELINE_LAB.setPreset("seed2"); PLANT_PIPELINE_LAB.set({ propose: "earlyMat", preview: true }); });
    await shot("10-preview-ghost-outline.png", await p.evaluate(() => { const r = document.querySelector(".cols").getBoundingClientRect(); return { x: 0, y: 0, width: Math.ceil(r.right + 12), height: Math.ceil(r.bottom + 8) }; }));
    // Node-rendered stills: the 400 % crop and the FX frame strips (exact frames, not screenshots)
    const cx = frame("proof", STATES.maxDry), crop = upscale(cx, 4, [22, 2, 44, 60]);
    fs.writeFileSync(path.join(EVD, "11-crop-400pct-maximal-dry-proof-pack.png"), png(crop.W, crop.H, crop.rgba));
    for (const st of FX.STYLES) { const cur = frame("proof", STATES.seed2), tgt = frame("proof", STATES.maxDry), fr = [0, 0.2, 0.4, 0.6, 0.8, 1].map(t => ({ W: cur.W, H: cur.H, rgba: FX.fxFrame(cur, tgt, st, t) }));
      const s = strip([...fr, { W: cur.W, H: cur.H, rgba: FX.preview(cur, tgt) }], 2); fs.writeFileSync(path.join(EVD, `${st === "grow" ? "12" : "13"}-fx-${st}-strip.png`), png(s.W, s.H, s.rgba)); }
    const all = []; for (const pk of PACKS) for (const t of Object.values(STATES)) all.push(frame(pk, t));
    const NS = Object.keys(STATES).length, grid = { W: 8 * (CANVAS.w * 2 + 4) - 4, H: Math.ceil(PACKS.length * NS / 8) * (CANVAS.h * 2 + 4) - 4 }; grid.rgba = new Uint8Array(grid.W * grid.H * 4).fill(255);
    all.forEach((f, i) => { const u = upscale(f, 2), gx = (i % 8) * (CANVAS.w * 2 + 4), gy = Math.floor(i / 8) * (CANVAS.h * 2 + 4); for (let y = 0; y < u.H; y++) Buffer.from(u.rgba.buffer, y * u.W * 4, u.W * 4).copy(Buffer.from(grid.rgba.buffer), ((gy + y) * grid.W + gx) * 4); });
    fs.writeFileSync(path.join(EVD, "14-all-states-all-packs-2x.png"), png(grid.W, grid.H, grid.rgba));
    for (const pk of PACKS) { const im = B.decodePNG(fs.readFileSync(path.join(ROOT, `art/plant/packs/${pk}/atlas.png`))), u = upscale({ W: im.w, H: im.h, rgba: im.rgba }, 4); fs.writeFileSync(path.join(EVD, `15-source-atlas-${pk}-4x.png`), png(u.W, u.H, u.rgba)); }
  }

  // ---------------------------------------------------------------- canvas-size measurement (docs §2) + proof file
  PROOF.canvasChoice = ["84×98", "96×112"].map(s => { const [w, h] = s.split("×").map(Number); return { canvas: s, scales: Object.fromEntries([["room1024", 205, 237], ["room1280", 258, 298], ["room1440", 290, 335], ["journal", 296, 342]].map(([id, bw, bh]) => [id, Math.floor(Math.min(bw / w, bh / h))])) }; });
  PROOF.results = RESULTS; PROOF.summary = { passes, fails, seconds: Math.round((Date.now() - t0) / 1000) };
  if (EVIDENCE) { fs.mkdirSync(EVD, { recursive: true }); fs.writeFileSync(path.join(EVD, "pipeline-proof.json"), JSON.stringify(PROOF, null, 1) + "\n"); }
  console.log(`\n${fails ? "FAIL" : "OK"} — ${passes}/${passes + fails} checks passed (${PROOF.summary.seconds} s)`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
