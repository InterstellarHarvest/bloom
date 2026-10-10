// BLOOM — Organic Hybrid FINAL art intake check (BLOOM-032B2). Focused QA of the approved-art intake into the accepted BLOOM-032B1 plant
// sprite pipeline; not (yet) a member of the regression suites. docs/evidence/bloom-032b2/REPORT.md.
//
//   NODE_PATH="$(npm root -g)" node tools/organic-hybrid-art-intake-check.js [--browsers chromium,firefox] [--evidence]
//
// Node: the exact start (accepted 032B1 main be0a829) and scope (no production specimen / gameplay / trait / balance / body-plan / contract /
// compositor change); the 7 deliveries match the PMO hashes; the 55 approved sprites (and no 56th) + 6 approved masks + the closure metadata
// are all accounted for; 18 materials / 69 plant colours, environment separate and exact; every approved sprite's pixels reach the atlas AND
// the generated runtime unchanged (binary alpha, exact size, no rotation, every colour → its material·shade); anchors, points and masks valid;
// the intake and the build are deterministic and == the committed files; check:plant-art passes; every required real-art state renders
// unclipped and distinct; maximal dry / wet fit; the T3 art cap; Cold ≠ Salt; previews and FX exact. Browser (Chromium + Firefox; file://,
// HTTP at /, HTTP under /bloom/): the proof page shows ORGANIC HYBRID — FINAL ART (proof packs still temporary) with browser pixels == Node
// pixels, the final-vs-production-SVG view on identical state, and the 7 required purchases (grow / dissolve / reduced motion) ending exactly
// on the target. --evidence writes docs/evidence/bloom-032b2/ (15 stills + art-intake-proof.json). Exits 1 on any failure.
"use strict";
const path = require("path"), fs = require("fs"), cp = require("child_process"), http = require("http"), crypto = require("crypto");
const ROOT = path.resolve(__dirname, "..");
const argv = process.argv, argOf = k => { const i = argv.indexOf(k); return i > 0 ? argv[i + 1] : null; };
const BROWSERS = (argOf("--browsers") ?? "chromium,firefox").split(",").filter(Boolean), EVIDENCE = argv.includes("--evidence"), EVD = path.join(ROOT, "docs/evidence/bloom-032b2");
const J = JSON.stringify, read = f => fs.readFileSync(path.join(ROOT, f), "utf8"), sha256 = b => crypto.createHash("sha256").update(b).digest("hex");
let fails = 0, passes = 0; const RESULTS = [], t0 = Date.now();
const check = (ok, name, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); RESULTS.push({ ok: !!ok, name: name.slice(0, 200) }); ok ? passes++ : fails++; };
const git = a => cp.execSync(`git ${a}`, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 << 20 }).trim();
const BASE = "be0a82918144a2e3b8aa2fcf2aa8c642dd3128b2";   // accepted BLOOM-032B1 main
const PMO_JSON_SHA256 = "651a540cdea9aa1fe1c27de0d30f5e94a64eb69720dab7f5e11684aed2f5fe2f";   // PMO_FINAL_ACCEPTANCE.json exactly as received in the wrapper
const WRAPPER_SHA256 = "22878851bb9ed0d3bb4c5e0e724ee856241d3dea5dab1ceec214bb996a77a427";   // bloom-organic-hybrid-final-approved-art-intake.zip as received (recorded)
const PACK = "organic-hybrid", PACK_STATUS = "ORGANIC HYBRID — FINAL ART (PMO-approved; BLOOM-032B2 intake)";
// (BLOOM-032C) the later, separately reviewed production integration of this pack: exactly these files may differ from be0a829 as well
const C032 = new Set(["resources/run-ui/plant-specimen.js", "resources/run-ui/decision-rooms.css", "resources/run-ui/run-report.css", "demos/demo-run.html", "resources/plant-sprite-lab/legacy-svg-specimen.js", "tools/production-plant-integration-check.js"]);
const ALLOWED = p => C032.has(p) || /^tools\/[a-z-]+-check\.js$/.test(p) || p.startsWith("art/plant/intake/organic-hybrid/") || p.startsWith("art/plant/packs/organic-hybrid/") || p === "art/plant/README.md"
  || p.startsWith("resources/plant-visual/generated/") || p.startsWith("resources/plant-sprite-lab/") || p === "demos/plant-sprite-pipeline-lab.html"
  || ["tools/intake-organic-hybrid-art.mjs", "tools/organic-hybrid-art-intake-check.js", "tools/plant-sprite-pipeline-check.js"].includes(p) || p.startsWith("docs/");

// ---------------------------------------------------------------- the pipeline in Node (classic scripts → globalThis)
for (const f of ["content/config.js", "content/traits.js", "resources/plant-visual/generated/plant-atlas.js", "resources/plant-visual/plant-visual-model.js", "resources/plant-visual/plant-components.js",
  "resources/plant-visual/plant-compositor.js", "resources/plant-visual/plant-fx.js"]) require(path.join(ROOT, f));
const PV = BLOOM.plantVisual, PC = BLOOM.plantCompositor, FX = BLOOM.plantFx, ART = BLOOM.plantArt, RULES = PV.model.rules(BLOOM_DATA);
const TRAITS_SNAPSHOT = J(BLOOM_DATA.traits), CONFIG_SNAPSHOT = J(BLOOM_DATA.config), CANVAS = ART.contract.canvas, PACKS = ART.packOrder;
/** The required real-art states (BLOOM-032B2 brief) + the art-cap twins. */
const STATES = { base: {}, cold1: { cold: 1 }, cold2: { cold: 2 }, cold3: { cold: 3 }, heat1: { heat: 1 }, heat2: { heat: 2 }, heat3: { heat: 3 }, cold2heat1: { cold: 2, heat: 1 },
  drought1: { drought: 1 }, drought2: { drought: 2 }, drought3: { drought: 3 }, drought3heat3: { drought: 3, heat: 3 }, flood1: { flood: 1 }, flood2: { flood: 2 }, flood3: { flood: 3 }, flood3heat3: { flood: 3, heat: 3 },
  salt: { salt: 1 }, rad: { rad: 1 }, cold2salt: { cold: 2, salt: 1 }, drought2rad: { drought: 2, rad: 1 }, seed1: { seedOut: 1 }, seed2: { seedOut: 2 }, early: { earlyMat: 1 }, water: { waterSeeds: 1 },
  earlySeed2: { earlyMat: 1, seedOut: 2 }, allRepro: { earlyMat: 1, seedOut: 2, waterSeeds: 1 },
  maxDry: { cold: 2, heat: 1, drought: 3, salt: 1, rad: 1, seedOut: 2, earlyMat: 1, waterSeeds: 1 }, maxWet: { cold: 2, heat: 1, flood: 3, salt: 1, rad: 1, seedOut: 2, earlyMat: 1, waterSeeds: 1 } };
const NAMES = { base: "BASE", cold1: "COLD T1", cold2: "COLD T2", cold3: "COLD T3", heat1: "HEAT T1", heat2: "HEAT T2", heat3: "HEAT T3", cold2heat1: "COLD T2 + HEAT T1", drought1: "DROUGHT T1", drought2: "DROUGHT T2",
  drought3: "DROUGHT T3", drought3heat3: "DROUGHT T3 + HEAT T3", flood1: "FLOOD T1", flood2: "FLOOD T2", flood3: "FLOOD T3", flood3heat3: "FLOOD T3 + HEAT T3", salt: "SALT", rad: "RADIATION", cold2salt: "COLD T2 + SALT",
  drought2rad: "DROUGHT T2 + RADIATION", seed1: "SEED OUTPUT T1", seed2: "SEED OUTPUT T2", early: "EARLY MATURITY", water: "WATERBORNE SEEDS", earlySeed2: "EARLY MATURITY + SEED OUTPUT T2",
  allRepro: "ALL REPRODUCTIVE", maxDry: "MAXIMAL LEGAL DRY", maxWet: "MAXIMAL LEGAL WET" };
const CAPS = { drought: [4, 5, 9], flood: [4, 5, 9] };
const TEMP_COMBOS = [{ cold: 3 }, { cold: 2, heat: 1 }, { cold: 1, heat: 2 }, { heat: 3 }];
/** The required FX transitions: [from state, trait proposed, label]. */
const FX_CASES = [["base", "cold", "Base → Cold T1"], ["cold1", "cold", "Cold T1 → Cold T2"], ["base", "drought", "Base → Drought T1"], ["drought2", "rad", "Drought T2 → Radiation"],
  ["base", "earlyMat", "Base → Early Maturity"], ["seed1", "seedOut", "Seed Output T1 → T2"], ["base", "waterSeeds", "Base → Waterborne Seeds"]];
const plus = (t, id) => ({ ...t, [id]: (t[id] || 0) + 1 });
const sel = (traits, condition = "thriving") => PV.components.select(PV.model.normalize({ traits, condition }, RULES));
const frame = (pack, traits, condition) => PC.render(sel(traits, condition), pack);
const PROOF = { milestone: "BLOOM-032B2", status: PACK_STATUS, base: BASE, head: git("rev-parse HEAD"), canvas: CANVAS, intake: {}, states: {}, fx: {}, browsers: {} };

// (BLOOM-033) later milestones' changes are not 032B2's: once HEAD is past 032B2's accepted end on main (END_SHA), this suite's scope checks are
// evaluated over BASE … END_SHA — the END_SHA pattern of run-ui-convergence / guided-training; at END_SHA itself the working tree is checked as before
const END_SHA = "ea1b785517ccc9586cc7bb1ce91fc26f1f46c922";
const AT_END = (() => { try { return git(`merge-base --is-ancestor ${END_SHA} HEAD`) === "" && git("rev-parse HEAD") !== END_SHA; } catch { return false; } })();
const RANGE = AT_END ? `${BASE} ${END_SHA}` : BASE, untrackedNow = () => AT_END ? [] : git("ls-files -o --exclude-standard").split("\n").filter(Boolean);
const hashNow = f => AT_END ? git(`rev-parse ${END_SHA}:"${f}"`) : git(`hash-object "${f}"`);
const existsNow = f => { if (!AT_END) return fs.existsSync(path.join(ROOT, f)); try { git(`cat-file -e ${END_SHA}:"${f}"`); return true; } catch { return false; } };
(async () => {
  const B = await import(path.join(ROOT, "tools/build-plant-art.mjs")), I = await import(path.join(ROOT, "tools/intake-organic-hybrid-art.mjs"));
  const contract = JSON.parse(read("art/plant/contract.json")), atlasJson = JSON.parse(read(`art/plant/packs/${PACK}/atlas.json`)), MAP = JSON.parse(read("art/plant/intake/organic-hybrid/intake-map.json"));
  const atlasImg = B.decodePNG(fs.readFileSync(path.join(ROOT, `art/plant/packs/${PACK}/atlas.png`)));

  console.log("# Node — scope");
  { const first = git(`rev-list --first-parent --reverse ${BASE}..HEAD`).split("\n").filter(Boolean)[0] || null, parent = first ? git(`rev-parse ${first}^`) : git("rev-parse HEAD");
    check(parent === BASE, "S1 · 032B2 starts from the exact accepted BLOOM-032B1 main be0a829", J({ firstParent: parent.slice(0, 7) })); }
  { const tracked = git(`diff --name-only ${RANGE}`).split("\n").filter(Boolean), untracked = untrackedNow();
    const changed = [...new Set([...tracked, ...untracked])].sort(), outside = changed.filter(p => !ALLOWED(p));
    const frozen = git(`ls-tree -r --name-only ${BASE} -- content planets index.html dist resources art/plant/contract.json art/plant/body-plan.json art/plant/schema art/plant/packs/proof art/plant/packs/proof-angular art/plant/packs/proof-round`)
      .split("\n").filter(f => f && !f.startsWith("resources/plant-visual/generated/") && !f.startsWith("resources/plant-sprite-lab/") && !C032.has(f));
    const diff = frozen.filter(f => !existsNow(f) || hashNow(f) !== git(`rev-parse ${BASE}:"${f}"`));
    PROOF.changedFiles = changed;
    check(!diff.length && !outside.length, `S2 · production boundary: all ${frozen.length} files under content/, planets/, index.html, dist/ and resources/ (except the generated plant atlas and the proof page's own script / style) are byte-identical to be0a829 — incl. resources/run-ui/plant-specimen.js (NOT replaced), the production SVG, content/traits.js; the contract, body plan, compositor, selector, model, FX and the three proof packs are unchanged`, J({ diff, outside }));
    const users = git(`grep -l -E "plant-atlas|plantArt|plant-visual|organic-hybrid" ${AT_END ? END_SHA : ""} -- index.html resources content planets dist demos`).split("\n").filter(Boolean).map(f => AT_END ? f.slice(END_SHA.length + 1) : f)
      .filter(f => !f.startsWith("resources/plant-visual/") && !f.startsWith("resources/plant-sprite-lab/") && f !== "demos/plant-sprite-pipeline-lab.html" && !C032.has(f));
    check(!users.length, "S3 · no production surface loads the plant atlas or the new pack except through the BLOOM-032C production specimen (demos/demo-run.html → resources/run-ui/plant-specimen.js); the portable bundle never does", J(users));
    check(git("hash-object art/plant/body-plan.json") === git(`rev-parse ${BASE}:art/plant/body-plan.json`),
      "S4 · body-plan sockets unchanged: the approved sprites fit the accepted sockets with no data change (the build's static clip proof passes on the accepted body plan)"); }

  console.log("# Node — intake");
  const zips = {};
  { const acc = JSON.parse(read("art/plant/intake/organic-hybrid/PMO_FINAL_ACCEPTANCE.json")), rows = [];
    for (const c of acc.contents) { const buf = fs.readFileSync(path.join(ROOT, "art/plant/intake/organic-hybrid/approved-deliveries", c.file)), h = sha256(buf); rows.push({ file: c.file, bytes: buf.length, sha256: h, ok: h === c.sha256 && buf.length === c.bytes }); zips[c.file] = I.readZip(buf); }
    const jsonSha = sha256(fs.readFileSync(path.join(ROOT, "art/plant/intake/organic-hybrid/PMO_FINAL_ACCEPTANCE.json")));
    PROOF.intake.package = { wrapperSha256: WRAPPER_SHA256, pmoAcceptanceSha256: jsonSha, productionMain: acc.production_main, deliveries: rows };
    check(jsonSha === PMO_JSON_SHA256 && rows.length === 7 && rows.every(r => r.ok) && acc.production_main === BASE && acc.production_canvas.width === 84 && acc.production_canvas.height === 98 && acc.production_canvas.soil_y === 68 && J(acc.production_canvas.crown) === "[42,68]",
      "I1 · intake hashes: PMO_FINAL_ACCEPTANCE.json is the file received in the wrapper; all 7 committed delivery ZIPs (batch1–6 + final metadata closure) match PMO_FINAL_ACCEPTANCE.json (SHA-256 + byte size) and are preserved unchanged; the PMO package names production main be0a829 and the locked 84×98 / soil 68 / crown 42,68 canvas", J(rows.map(r => `${r.file}:${r.ok}`))); }
  const ids = Object.values(I.APPROVED).flat(), authored = atlasJson.sprites.map(s => s.id), runtime = ART.packs[PACK].sprites, rkeys = Object.keys(runtime);
  { const baked = rkeys.filter(k => runtime[k].baked), want = authored.filter(id => { const c = contract.components[atlasJson.sprites.find(s => s.id === id).component]; return c.orientation === "right" && c.mirror; });
    const allPng = Object.entries(zips).flatMap(([z, m]) => [...m.keys()].filter(k => /\.png$/.test(k) && !/(preview|proof|strip|swatch|reference|source-1x)/.test(k)).map(k => k.split("/").pop().replace(/\.png$/, "")));
    const spritePng = allPng.filter(n => !n.startsWith("mask."));
    check(ids.length === 55 && new Set(ids).size === 55 && J([...authored].sort()) === J([...ids].sort()) && J([...spritePng].sort()) === J([...ids].sort()) && baked.length === want.length && baked.every(k => runtime[k].baked === "mirror" && authored.includes(k.split("@")[0])) && rkeys.length === 55 + want.length,
      `I2 · 55 approved component sprites accounted for: every approved PNG in the deliveries is in the atlas exactly once, no sprite 56 exists; the runtime has ${rkeys.length} = 55 authored + ${baked.length} mirrored left twins baked by the accepted build (not new art)`, J({ authored: authored.length, deliveredPngs: spritePng.length, baked: baked.length })); }
  // I3 · metadata: anchors, points, masks, closure
  { const bad = [], b5 = Object.fromEntries(Object.entries(zips).filter(([z]) => /^batch/.test(z)).map(([z, m]) => [z, JSON.parse([...m.entries()].find(([k]) => /manifest\.json$/.test(k))[1])]));
    const studio = {}; for (const m of Object.values(b5)) Object.assign(studio, m.sprites);
    for (const s of atlasJson.sprites) { const md = studio[s.id], c = contract.components[s.component];
      if (!md) { bad.push(`${s.id}: no studio entry`); continue; }
      if (J(md.anchor) !== J(s.anchor)) bad.push(`${s.id}: anchor ${J(s.anchor)} ≠ studio ${J(md.anchor)}`);
      if (md.tip && (J(md.tip) !== J(s.points.tip) || J(md.margins || md.margin_points) !== J(s.points.margin))) bad.push(`${s.id}: points ≠ studio`);
      for (const k of ["attach", "layer", "orientation", "mirror", "category", "family", "trait", "tier"]) if (s[k] !== c[k]) bad.push(`${s.id}: ${k}`); }
    const closure = JSON.parse([...zips["final-pack-metadata-closure.zip"].entries()].find(([k]) => k.endsWith("organic-hybrid-final-pack-metadata.json"))[1]);
    const env = closure.environment, P = ART.packs[PACK];
    const closureOk = J(P.palette.waxCore) === J(closure.waxCore.ramp.map(h => h.toLowerCase())) && J(P.environment.sky) === J(env.sky) && J(P.environment.soil) === J(env.soil) && P.environment.turf === env.turf && P.render.stemOutline === "ink" && closure.render.stemOutline === "ink";
    const masks = MAP.masks, maskBad = [];
    for (const m of masks) { const mi = B.decodePNG(zips["batch5-salt-radiation.zip"].get(m.entry)), s = atlasJson.sprites.find(x => x.id === m.sprite), sp = runtime[`${m.sprite}@right`];
      const bits = Buffer.from(sp.masks[m.treatment], "base64"), px = Buffer.from(sp.px, "base64");
      for (let i = 0; i < mi.w * mi.h; i++) { const on = mi.rgba[i * 4 + 3] === 255; if (!!bits[i] !== on) { maskBad.push(`${m.id}: bit ${i}`); break; } if (on && !px[i]) maskBad.push(`${m.id}: on transparent pixel ${i}`);
        if (on && m.treatment === "pigment" && ART.materials[(px[i] >> 2) - 1] !== "leaf") maskBad.push(`${m.id}: pigment on non-leaf pixel ${i}`); }
      const left = runtime[`${m.sprite}@left`], lb = Buffer.from(left.masks[m.treatment], "base64");
      for (let y = 0; y < mi.h; y++) for (let x = 0; x < mi.w; x++) if (lb[y * mi.w + (mi.w - 1 - x)] !== bits[y * mi.w + x]) { maskBad.push(`${m.id}: left twin not mirrored`); y = mi.h; break; }
      if (J(s.masks[m.treatment]) !== J(m.rect.slice(0, 2))) maskBad.push(`${m.id}: atlas.json rect`); }
    const policy = atlasJson.sprites.filter(s => s.masks).map(s => { const base = s.component === "leaf.base";
      return (base ? Array.isArray(s.masks.pigment) && Array.isArray(s.masks.toothed) : s.masks.pigment === "auto" && !("toothed" in s.masks)) && s.masks.wax === "auto" && Object.keys(s.masks).length === (base ? 3 : 2) ? null : s.id; }).filter(Boolean);
    PROOF.intake.maskPolicy = MAP.maskPolicy;
    check(!bad.length && closureOk && masks.length === 6 && !maskBad.length && !policy.length,
      "I3 · all approved metadata accounted for: every anchor / tip / 3 margin points == the studio manifests; contract category · family · attach · layer · orientation · trait / tier per component; the 6 approved Base masks (pigment + toothed × low / mid / high) reach the runtime bit for bit (pigment only on LEAF pixels, notches only on opaque pixels; left twins mirrored); every other leaf drawing uses the contract defaults (pigment auto, wax auto, no toothed mask — no invented mask); closure waxCore · environment · stemOutline ink exact",
      J({ bad: bad.slice(0, 4), closureOk, maskBad: maskBad.slice(0, 4), policy })); }
  // I4 · palette
  { const P = ART.packs[PACK], mats = Object.keys(P.palette), cols = Object.values(P.palette).flat(), envCols = [...P.environment.sky, ...P.environment.soil, P.environment.turf];
    PROOF.intake.palette = { materials: mats.length, colours: cols.length, environment: P.environment, render: P.render };
    check(mats.length === 18 && J([...mats].sort()) === J(contract.materials.map(m => m.name).sort()) && J(Object.keys(atlasJson.palette)) === J(contract.materials.map(m => m.name)) && contract.materials.every(m => P.palette[m.name].length === m.shades) && cols.length === 69 && new Set(cols).size === 69 && envCols.every(h => !cols.includes(h)) && new Set(envCols).size === 6
      && J(P.environment.sky) === J(["#7d8c96", "#aeb4aa"]) && J(P.environment.soil) === J(["#4a3d33", "#3f332b", "#6b5b4c"]) && P.environment.turf === "#626b45" && J(P.palette.waxCore) === J(["#465d4c", "#648466", "#90ac83", "#c2ce9d"]) && P.render.stemOutline === "ink",
      "I4 · ONE converged Organic Hybrid palette: 18 materials (every contract material, ink 1 + 17 ramps × 4, dark → light), 69 unique plant colours; the environment (sky #7d8c96 #aeb4aa · soil #4a3d33 #3f332b #6b5b4c · turf #626b45) is separate from the plant palette; waxCore #465d4c #648466 #90ac83 #c2ce9d; render.stemOutline ink", J({ materials: mats.length, colours: cols.length })); }
  // I5–I7 · pixel integrity: source PNG → atlas rect → generated runtime (exact); binary alpha; palette mapping
  { const res = [], P = ART.packs[PACK], colour = {}; for (const [m, r] of Object.entries(P.palette)) r.forEach((h, s) => { colour[h] = `${m}.${s}`; });
    const hex = (a, i) => "#" + [a[i], a[i + 1], a[i + 2]].map(v => v.toString(16).padStart(2, "0")).join("");
    let atlasPartial = 0; for (let i = 0; i < atlasImg.w * atlasImg.h; i++) { const a = atlasImg.rgba[i * 4 + 3]; if (a !== 0 && a !== 255) atlasPartial++; }
    for (const row of MAP.sprites) { const src = B.decodePNG(zips[row.delivery].get(row.entry)), s = atlasJson.sprites.find(x => x.id === row.id), [rx, ry, rw, rh] = s.rect;
      const key = Object.keys(P.sprites).find(k => k.startsWith(row.id + "@") && !P.sprites[k].baked), sp = P.sprites[key], px = Buffer.from(sp.px, "base64");
      const left = P.sprites[`${row.id}@left`], lpx = left && left.baked ? Buffer.from(left.px, "base64") : null;
      let atlasDiff = 0, runDiff = 0, partial = 0, unknown = 0, mirrorDiff = 0; const mats = new Set();
      for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) { const i = (y * src.w + x) * 4, j = ((ry + y) * atlasImg.w + rx + x) * 4, a = src.rgba[i + 3];
        if (a !== 0 && a !== 255) partial++;
        if (a !== atlasImg.rgba[j + 3] || (a && hex(src.rgba, i) !== hex(atlasImg.rgba, j))) atlasDiff++;
        const v = px[y * src.w + x]; if (!a) { if (v) runDiff++; } else { const want = colour[hex(src.rgba, i)]; if (!want) unknown++; else mats.add(want.split(".")[0]);
          const got = v ? `${ART.materials[(v >> 2) - 1]}.${v & 3}` : null; if (got !== want) runDiff++; }
        if (lpx && lpx[y * src.w + (src.w - 1 - x)] !== v) mirrorDiff++; }
      const studioMats = row.materialsUsed ? new Set(row.materialsUsed.map(m => ({ INK: "ink", LEAF: "leaf", STEM: "stem", ROOT: "root", CORE: "core", TUBER: "tuber", SALT: "salt", PETAL: "petal", CENTER: "center", PAPPUS: "pappus", SEED: "seed", POD: "pod" })[m])) : null;
      const atlasSig = I.signature(rw, rh, (x, y) => { const j = ((ry + y) * atlasImg.w + rx + x) * 4; return [atlasImg.rgba[j], atlasImg.rgba[j + 1], atlasImg.rgba[j + 2], atlasImg.rgba[j + 3]]; });
      res.push({ id: row.id, delivery: row.delivery, sourceSha256: row.sourceSha256, size: [src.w, src.h], rect: s.rect, sourceSig: row.sig, atlasSig: atlasSig.sig, opaque: row.opaque,
        sameSize: src.w === rw && src.h === rh && src.w === sp.w && src.h === sp.h && sha256(zips[row.delivery].get(row.entry)) === row.sourceSha256, atlasDiff, runDiff, partial, unknown, mirrorDiff,
        materials: [...mats].sort(), matsOk: !studioMats || [...mats].every(m => studioMats.has(m)), treatmentOnly: [...mats].filter(m => contract.materials.find(q => q.name === m).treatmentOnly) }); }
    PROOF.intake.sprites = res;
    const bad = res.filter(r => !r.sameSize || r.atlasDiff || r.runDiff || r.partial || r.unknown || r.mirrorDiff || r.sourceSig !== r.atlasSig || !r.matsOk || r.treatmentOnly.length);
    check(res.length === 55 && !bad.length && !atlasPartial,
      "I5 · source → atlas → runtime pixel integrity: for all 55 approved sprites the opaque / transparent matrix and the exact RGB of every opaque pixel are identical in the source PNG, the atlas rect and the generated runtime (signatures recorded); same width × height (no resize), pixel-for-pixel in place (no rotation, no flip — the baked left twins are exact mirrors of the runtime right sprites)",
      J({ bad: bad.slice(0, 3).map(r => ({ id: r.id, atlasDiff: r.atlasDiff, runDiff: r.runDiff, mirrorDiff: r.mirrorDiff })) }));
    check(res.every(r => !r.partial) && !atlasPartial, "I6 · binary alpha: no approved sprite has (or acquired) partial alpha — every source pixel and every atlas pixel is alpha 0 or 255");
    check(res.every(r => !r.unknown && r.matsOk && !r.treatmentOnly.length), "I7 · every approved opaque pixel maps to its correct material · shade (exact palette colour; materials ⊆ the studio's declared materials_used per sprite; no treatment-only colour authored); no unknown colour",
      J(Object.fromEntries(res.filter(r => r.materials.length).slice(0, 4).map(r => [r.id, r.materials])))); }
  // I8 · anchors, points, masks, no clipping (independently of the build)
  { const bad = [], rects = [];
    for (const s of atlasJson.sprites) { const [x, y, w, h] = s.rect, sp = runtime[`${s.id}@${s.orientation}`], px = Buffer.from(sp.px, "base64"); rects.push([s.id, s.rect]);
      if (x < 0 || y < 0 || x + w > atlasImg.w || y + h > atlasImg.h) bad.push(`${s.id}: sprite rect clipped`);
      if (s.anchor[0] < 0 || s.anchor[1] < 0 || s.anchor[0] >= w || s.anchor[1] >= h) bad.push(`${s.id}: anchor`);
      const c = contract.components[s.component]; if (c.maxSize && (w > c.maxSize[0] || h > c.maxSize[1])) bad.push(`${s.id}: over maxSize`);
      if (s.points) for (const q of [s.points.tip, ...s.points.margin]) if (q[0] < 0 || q[1] < 0 || q[0] >= w || q[1] >= h || !px[q[1] * w + q[0]]) bad.push(`${s.id}: point ${q}`);
      if (s.points && s.points.margin.length !== 3) bad.push(`${s.id}: margin count`);
      for (const [t, v] of Object.entries(s.masks || {})) if (v !== "auto") { rects.push([`${s.id}:${t}`, [v[0], v[1], w, h]]); if (v[0] + w > atlasImg.w || v[1] + h > atlasImg.h) bad.push(`${s.id}: ${t} mask clipped`); } }
    for (let i = 0; i < rects.length; i++) for (let k = i + 1; k < rects.length; k++) { const [a, b] = [rects[i][1], rects[k][1]]; if (a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3]) bad.push(`overlap ${rects[i][0]} / ${rects[k][0]}`); }
    const MAN = JSON.parse(read("resources/plant-visual/generated/plant-atlas-manifest.json"));
    check(!bad.length && MAN.packs[PACK].placementsProven > 1000 && !MAN.packs[PACK].missing.length,
      `I8 · anchors valid (inside every rect, == studio), every leaf tip + 3 margin points on an opaque pixel of its own drawing, every sprite ≤ its contract maxSize, no sprite or mask rect clipped or overlapping in the ${atlasImg.w}×${atlasImg.h} atlas; the build's static proof places every real sprite at every socket it can take (${MAN.packs[PACK].placementsProven} placements) inside 84×98`, J(bad.slice(0, 5))); }
  // I9 · deterministic intake + build; == committed; check:plant-art
  { const a = I.assemble(ROOT), b = I.assemble(ROOT), same = Object.keys(a.files).every(f => a.files[f].equals(b.files[f]) && fs.readFileSync(path.join(ROOT, f)).equals(a.files[f]));
    const x = B.buildPlantArt(ROOT), y = B.buildPlantArt(ROOT), same2 = Object.keys(x.files).every(f => x.files[f].equals(y.files[f]) && fs.readFileSync(path.join(ROOT, f)).equals(x.files[f]));
    let cpa = null; try { cpa = cp.execSync("node tools/build-plant-art.mjs --check", { cwd: ROOT, encoding: "utf8" }).trim(); } catch (e) { cpa = "FAILED " + (e.stdout || "") + (e.stderr || ""); }
    const atlasBytes = fs.statSync(path.join(ROOT, `art/plant/packs/${PACK}/atlas.png`)).size, gen = fs.statSync(path.join(ROOT, "resources/plant-visual/generated/plant-atlas.js")).size;
    PROOF.intake.atlas = { w: atlasImg.w, h: atlasImg.h, bytes: atlasBytes, sha256: sha256(fs.readFileSync(path.join(ROOT, `art/plant/packs/${PACK}/atlas.png`))) };
    PROOF.intake.generated = { bytes: gen, fingerprint: ART.fingerprint };
    check(!a.errors.length && same && !x.errors.length && same2 && /^check:plant-art OK/.test(cpa),
      `I9 · deterministic: two clean intakes of the PMO deliveries give identical bytes == the committed atlas.png / atlas.json / intake-map.json; two clean builds == the committed generated runtime; npm run check:plant-art passes (${cpa.slice(0, 80)})`, J({ atlas: `${atlasImg.w}×${atlasImg.h} ${atlasBytes} B`, generated: `${gen} B` })); }

  console.log("# Node — real-art organism");
  // R1 · every required state renders, unclipped, distinct
  { const rows = Object.entries(STATES).map(([k, t]) => { const F = frame(PACK, t), F2 = frame(PACK, t), s = sel(t);
      PROOF.states[k] = { traits: t, components: s.components, treatments: s.treatments, layout: s.layout, clip: F.clip, bbox: F.bbox, anatomy: F.sig.anatomy, full: F.sig.full, unrendered: F.unrendered };
      return { k, clip: F.clip, unrendered: F.unrendered.length, det: F.sig.full === F2.sig.full, full: F.sig.full, inside: F.bbox.x0 >= 0 && F.bbox.y0 >= 0 && F.bbox.x1 < CANVAS.w && F.bbox.y1 < CANVAS.h }; });
    const dup = rows.filter((r, i) => rows.findIndex(q => q.full === r.full) !== i).map(r => r.k);
    check(rows.every(r => !r.clip && !r.unrendered && r.det && r.inside) && !dup.length && J(BLOOM_DATA.traits) === TRAITS_SNAPSHOT,
      `R1 · all ${rows.length} required real-art states render with the ORGANIC HYBRID pack in the accepted compositor — ${Object.values(NAMES).join(" · ")} — every one unclipped inside 84×98, every treatment rendered, deterministic, and visibly distinct from every other`, J({ dup, bad: rows.filter(r => r.clip || r.unrendered || !r.det).map(r => r.k) })); }
  // R2 · art caps
  { const res = []; for (const [arm, tiers] of Object.entries(CAPS)) { const t3 = frame(PACK, { [arm]: 3 }); for (const n of tiers) { const F = frame(PACK, { [arm]: n }); res.push({ arm, n, same: F.sig.anatomy === t3.sig.anatomy && F.sig.full === t3.sig.full && J(sel({ [arm]: n }).components) === J(sel({ [arm]: 3 }).components) }); } }
    const noT4 = !Object.keys(contract.components).some(id => /\.(4|5|9)(\.|$)/.test(id)) && !Object.keys(runtime).some(k => /\.(4|5|9)(\.|@)/.test(k));
    PROOF.artCap = res;
    check(res.every(r => r.same) && noT4 && contract.visualCap.drought === 3 && contract.visualCap.flood === 3, "R2 · art cap with real art: Drought T4 / T5 / T9 draw EXACTLY the Drought T3 anatomy and pixels; Flood T4 / T5 / T9 EXACTLY Flood T3; no authored higher-tier asset exists", J(res.map(r => `${r.arm}${r.n}:${r.same}`))); }
  // R3 · maximal legal dry / wet fit
  for (const [rid, label, base, must] of [["R3", "DRY", STATES.maxDry, ["root.storage.3", "leaf.drought.3"]], ["R4", "WET", STATES.maxWet, ["root.aerial.3", "root.stilt", "leaf.flood.3"]]]) {
    const res = [];
    for (const temp of TEMP_COMBOS) { const t = { ...base }; delete t.cold; delete t.heat; Object.assign(t, temp);
      for (const cond of ["thriving", "strained"]) { const F = frame(PACK, t, cond), comps = new Set(F.placements.map(q => q.component)), margin = Math.min(F.bbox.x0, F.bbox.y0, F.W - 1 - F.bbox.x1, F.H - 1 - F.bbox.y1);
        res.push({ temp: J(temp), cond, legal: PV.model.validate(t, RULES).legal, clip: F.clip, margin, missing: [...must.filter(c => !(comps.has(c) || [...comps].some(q => q.startsWith(c)))), ...["salt.crystal", "salt.gland", "seedHead.large", "seedHead.small", "seed.drift", "flower", "pod"].filter(c => !comps.has(c))] }); } }
    PROOF[`maximal${label}`] = { minMargin: Math.min(...res.map(r => r.margin)), cases: res.length, bbox: frame(PACK, base).bbox };
    check(res.every(r => r.legal && !r.clip && r.margin >= 1 && !r.missing.length), `${rid} · MAXIMAL LEGAL ${label} with real art fits 84×98 for every legal Cold/Heat split (3+0, 2+1, 1+2, 0+3), thriving and strained: legal, every required component present, no pixel clipped, ≥ 1 px clear of every edge (min margin ${PROOF[`maximal${label}`].minMargin} px)`, J(res.filter(r => !r.legal || r.clip || r.margin < 1 || r.missing.length).slice(0, 3))); }
  // R5 · Cold ≠ Salt in the real pack's pixels
  { const MID = Object.fromEntries(ART.materials.map((m, i) => [m, i + 1])), matsOf = F => new Set([...F.plant.m].filter(Boolean).map(v => v >> 2));
    const cold = [1, 2, 3].map(n => matsOf(frame(PACK, { cold: n }))), salt = matsOf(frame(PACK, { salt: 1 })), both = frame(PACK, STATES.cold2salt), bm = matsOf(both);
    const famC = new Set(sel({ cold: 2 }).components.map(c => contract.components[c] && contract.components[c].family)), famS = new Set(sel({ salt: 1 }).components.map(c => contract.components[c] && contract.components[c].family));
    // the authored Base notches alone (Salt's toothed treatment without its crystals): only deletions, 3 px per Base leaf
    const s0 = sel({}), plain = PC.render(s0, PACK), notched = PC.render({ ...s0, treatments: [...s0.treatments, { id: "toothed", level: 1 }] }, PACK), nd = FX.diff(plain, notched);
    const toothed = nd.length === 6 * 3 && nd.every(q => q.del) ? nd.length : -nd.length;
    check(cold.every(s => s.has(MID.frost) && !s.has(MID.salt)) && salt.has(MID.salt) && !salt.has(MID.frost) && bm.has(MID.frost) && bm.has(MID.salt) && famC.has("frost") && !famC.has("salt") && famS.has("salt") && !famS.has("frost") && toothed > 0,
      "R5 · Cold ≠ Salt in real pixels: Cold T1–T3 draw FROST material only (blue-white hairs / wool collars), Salt draws SALT material only (warm-neutral faceted crystals + glands) plus the approved Base notches (exactly 3 px cut from each of the 6 Base leaves); Cold T2 + Salt shows both, separately", J({ notchPixels: toothed })); }
  // R6 · previews + FX for the required transitions (Node, exact)
  { const rows = [];
    for (const [from, id, label] of FX_CASES) { const ft = STATES[from], tt = plus(ft, id), cur = frame(PACK, ft), tgt = frame(PACK, tt), before = PC.fnv(cur.rgba), view = FX.preview(cur, tgt), dset = new Set(FX.diff(cur, tgt).map(q => q.i));
      const r = { label, diff: dset.size, preview: PC.fnv(view) !== cur.sig.full && PC.fnv(cur.rgba) === before };
      for (const st of FX.STYLES) { const mid = FX.fxFrame(cur, tgt, st, 0.5); let leak = 0; for (let i = 0; i < cur.W * cur.H; i++) if (!dset.has(i)) for (let k = 0; k < 3; k++) if (mid[i * 4 + k] !== cur.rgba[i * 4 + k]) { leak++; break; }
        let clock = 0; const played = []; const p = await FX.purchase(cur, tgt, { style: st, onFrame: f => played.push(PC.fnv(f)), now: () => clock, raf: f => { clock += 16; setImmediate(f); } });
        r[st] = { start: PC.fnv(FX.fxFrame(cur, tgt, st, 0)) === cur.sig.full, end: PC.fnv(FX.fxFrame(cur, tgt, st, 1)) === tgt.sig.full, mid: PC.fnv(mid) !== tgt.sig.full && PC.fnv(mid) !== cur.sig.full, leak, frames: p.frames, played: played[played.length - 1] === tgt.sig.full }; }
      const got = []; const rm = await FX.purchase(cur, tgt, { reducedMotion: true, onFrame: f => got.push(PC.fnv(f)) }); r.reduced = rm.frames === 1 && got.length === 1 && got[0] === tgt.sig.full;
      rows.push(r); PROOF.fx[label] = r; }
    check(rows.every(r => r.diff > 0 && r.preview), `R6 · GHOST / OUTLINE preview with real art for every required transition (${FX_CASES.map(c => c[2]).join(" · ")}) shows the change and never mutates the current frame (cancel = the current pixels, exactly)`);
    check(rows.every(r => FX.STYLES.every(st => r[st].start && r[st].end && r[st].mid && !r[st].leak && r[st].frames > 20 && r[st].played) && r.reduced),
      "R7 · GROW (default purchase FX) and DISSOLVE (secondary) with real art: start on the current frame, in-between frames touch only the changed pixels, ≥ 20 frames, and END byte-for-byte on the exact target render; reduced motion = one exact direct swap", J(rows.filter(r => !r.reduced || FX.STYLES.some(st => !r[st].end || r[st].leak)).map(r => r.label))); }
  check(J(BLOOM_DATA.traits) === TRAITS_SNAPSHOT && J(BLOOM_DATA.config) === CONFIG_SNAPSHOT, "G1 · no gameplay / trait / balance change: BLOOM_DATA.traits and config identical after every render, preview and purchase (content/ byte-identical — S2)");

  // ---------------------------------------------------------------- browser
  console.log("# Browser — the review page (file:// · HTTP / · HTTP /bloom/)");
  let playwright = null; try { playwright = require("playwright"); } catch { check(false, "B0 · Playwright available (NODE_PATH=\"$(npm root -g)\")"); }
  const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".json": "application/json", ".svg": "image/svg+xml" };
  const serve = prefix => new Promise(res => { const s = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split("?")[0]); if (prefix) { if (!u.startsWith(prefix)) { r.writeHead(404); return r.end(); } u = "/" + u.slice(prefix.length); }
      const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r); });
    s.listen(0, "127.0.0.1", () => res(s)); });
  const nodeSig = (pack, traits) => frame(pack, traits).sig.full;
  if (playwright) {
    const srvRoot = await serve(null), srvSub = await serve("/bloom/");
    const ORIGINS = { file: "file://" + encodeURI(ROOT) + "/", http: `http://127.0.0.1:${srvRoot.address().port}/`, subpath: `http://127.0.0.1:${srvSub.address().port}/bloom/` };
    const PAGE = "demos/plant-sprite-pipeline-lab.html";
    for (const bn of BROWSERS) {
      let browser; try { browser = await playwright[bn].launch(); } catch (e) { check(false, `[${bn}] B0 · ${bn} launches`, String(e.message).split("\n")[0]); PROOF.browsers[bn] = { unavailable: String(e.message).split("\n")[0] }; continue; }
      PROOF.browsers[bn] = {};
      { const warm = await browser.newPage(); await warm.goto(ORIGINS.file + PAGE); await warm.waitForTimeout(1500); await warm.close(); }
      for (const [where, origin] of Object.entries(ORIGINS)) {
        const p = await browser.newPage({ viewport: { width: 1440, height: 900 } }), errs = [], external = [], loaded = [];
        p.on("console", m => { if (m.type() === "error") errs.push(m.text()); }); p.on("pageerror", e => errs.push(e.message));
        p.on("request", r => { const u = r.url(); loaded.push(u); if (!(u.startsWith("file:") || u.startsWith("data:") || u.startsWith("http://127.0.0.1:"))) external.push(u); });
        p.on("requestfailed", r => errs.push("failed: " + r.url()));
        const B_ = `[${bn} · ${where}]`;
        await p.goto(origin + PAGE); await p.waitForFunction(() => window.PLANT_PIPELINE_LAB && PLANT_PIPELINE_LAB.ready, null, { timeout: 20000 }); await p.waitForTimeout(300);
        const boot = await p.evaluate(() => ({ url: location.href, fp: BLOOM.plantArt.fingerprint, packs: PLANT_PIPELINE_LAB.PACKS, banner: document.querySelector(".banner").textContent,
          panels: [...document.querySelectorAll(".cols .panel")].map(e => ({ pack: e.dataset.panel, head: e.querySelector("h4 span").textContent, tag: e.querySelector(".tag").textContent })), errors: PLANT_PIPELINE_LAB.errors }));
        const labels = boot.panels.filter(q => q.pack !== "production"), lblOk = labels[0] && labels[0].pack === PACK && labels[0].head === "ORGANIC HYBRID — FINAL ART" && labels[0].tag === PACK_STATUS
          && labels.slice(1).every(q => q.head === "TEMPORARY PIPELINE PROOF" && q.tag === "TEMPORARY PIPELINE PROOF — NOT FINAL ART") && labels.length === PACKS.length && boot.banner.includes("ORGANIC HYBRID — FINAL ART") && boot.banner.includes("NOT FINAL ART");
        const mism = [];
        for (const [k, t] of Object.entries(STATES)) { await p.evaluate(tt => PLANT_PIPELINE_LAB.set({ traits: tt, preset: null }), t); const sigs = await p.evaluate(() => PLANT_PIPELINE_LAB.canvasSigs("canvas[data-role=live]"));
          for (const s of sigs) if (s.sig !== nodeSig(s.pack, t)) mism.push(`${k}/${s.pack}`); }
        const subOk = where !== "subpath" || (boot.url.includes("/bloom/demos/") && loaded.every(u => !u.startsWith(origin.replace("/bloom/", "/")) || u.includes("/bloom/")));
        check(!errs.length && !boot.errors.length && boot.fp === ART.fingerprint && lblOk && !mism.length && subOk,
          `${B_} B1 · the review page boots (${where === "file" ? "double-clicked file://" : where === "http" ? "HTTP at /" : "HTTP under /bloom/"}) with no console error and no fetch / image decode (the generated atlas is a classic script); the real pack is first and labelled ORGANIC HYBRID — FINAL ART, the three proof packs stay labelled TEMPORARY PIPELINE PROOF — NOT FINAL ART; all ${Object.keys(STATES).length} required real-art states: canvas pixels == the Node render, byte for byte, in every pack`, J({ mism: mism.slice(0, 4), errs: errs.slice(0, 3), panels: labels.map(q => q.head) }));
        check(!external.length, `${B_} B2 · no external request — works offline (everything ${where === "file" ? "file:" : "127.0.0.1"})`, external.slice(0, 3).join(" "));
        // B3 · final vs production SVG on identical state
        const fin = [];
        for (const k of ["base", "cold2heat1", "drought3", "flood3", "salt", "seed2", "maxDry", "maxWet"]) { await p.evaluate(tt => { PLANT_PIPELINE_LAB.set({ view: "final", traits: tt, preset: null, condition: "thriving", preview: false }); }, STATES[k]);
          const r = await p.evaluate(() => ({ live: PLANT_PIPELINE_LAB.canvasSigs("canvas[data-role=live]"), prod: PLANT_PIPELINE_LAB.production && PLANT_PIPELINE_LAB.production.state.traits, svg: !!document.querySelector("[data-panel=production] svg"), panels: [...document.querySelectorAll(".cols .panel")].map(e => e.dataset.panel) }));
          fin.push({ k, ok: r.live.length === 1 && r.live[0].pack === PACK && r.live[0].sig === nodeSig(PACK, STATES[k]) && J(r.prod) === J(STATES[k]) && r.svg && J(r.panels) === J([PACK, "production"]) }); }
        await p.evaluate(() => PLANT_PIPELINE_LAB.set({ view: "compare" })); await p.keyboard.press("c"); const kv = await p.evaluate(() => PLANT_PIPELINE_LAB.S.view); await p.keyboard.press("c");
        check(fin.every(f => f.ok) && kv === "final", `${B_} B3 · FINAL vs CURRENT PRODUCTION SVG mode (button or key C): the ORGANIC HYBRID final render and the unchanged production SVG side by side, fed the identical build`, J(fin.filter(f => !f.ok).map(f => f.k)));
        if (where === "file") {
          // B4 · the same organism at every production placement
          await p.evaluate(() => { PLANT_PIPELINE_LAB.set({ view: "placements", pack: "organic-hybrid", traits: {}, preset: null }); PLANT_PIPELINE_LAB.setPreset("maxDry"); });
          const pl = await p.evaluate(() => PLANT_PIPELINE_LAB.canvasSigs("canvas[data-role=placement]")), want = { native: 1, room1024: 2, room1280: 3, room1440: 3, journal: 3, zoom4: 4 }, sig0 = nodeSig(PACK, STATES.maxDry);
          check(pl.length === 6 && pl.every(s => s.pack === PACK && s.sig === sig0 && Math.abs(s.cssW - CANVAS.w * want[s.placement]) < 0.01), `${B_} B4 · real room sizes: the same ${CANVAS.w}×${CANVAS.h} Organic Hybrid organism at native 1×, 1024 → 2×, 1280 → 3×, 1440 → 3×, Field Journal → 3× and a 4× zoom (one pixel signature)`, J(pl.map(s => `${s.placement}:${s.cssW}`)));
          // B5 · previews on / off; B6 · the 7 required purchases
          const pv = [], buys = [];
          for (const [from, id, label] of FX_CASES) {
            await p.evaluate(([tt, pid]) => PLANT_PIPELINE_LAB.set({ view: "compare", placement: "room1280", traits: tt, preset: null, propose: pid, preview: false, condition: "thriving" }), [STATES[from], id]);
            const before = await p.evaluate(() => PLANT_PIPELINE_LAB.canvasSigs("canvas[data-role=live]")); await p.click("#previewBtn"); const during = await p.evaluate(() => PLANT_PIPELINE_LAB.canvasSigs("canvas[data-role=live]")); await p.click("#previewBtn");
            const after = await p.evaluate(() => PLANT_PIPELINE_LAB.canvasSigs("canvas[data-role=live]"));
            const fin0 = during.find(s => s.pack === PACK), cur0 = frame(PACK, STATES[from]), tgt0 = frame(PACK, plus(STATES[from], id));
            pv.push({ label, ok: during.every((s, i) => s.sig !== before[i].sig) && after.every((s, i) => s.sig === before[i].sig) && fin0.sig === PC.fnv(FX.preview(cur0, tgt0)) });
            for (const [style, rm] of [["grow", false], ["dissolve", false], ["reduced", true]]) {
              await p.evaluate(([tt, pid, st, r]) => PLANT_PIPELINE_LAB.set({ traits: tt, preset: null, propose: pid, fx: st === "reduced" ? "grow" : st, reducedMotion: r, preview: false }), [STATES[from], id, style, rm]);
              const r = await p.evaluate(() => PLANT_PIPELINE_LAB.purchase()), now = await p.evaluate(() => PLANT_PIPELINE_LAB.canvasSigs("canvas[data-role=live]")), tgtT = plus(STATES[from], id);
              buys.push({ label, style, ok: r && r.results.length === PACKS.length && r.results.every(x => x.endSig === x.targetSig && x.endSig === nodeSig(x.pack, tgtT)) && now.every(s => s.sig === nodeSig(s.pack, tgtT))
                && (rm ? r.results.every(x => x.frames === 1) : r.results.every(x => x.frames > 5)), frames: r && r.results.find(x => x.pack === PACK).frames }); } }
          await p.evaluate(() => PLANT_PIPELINE_LAB.set({ reducedMotion: false }));
          PROOF.browsers[bn].purchases = buys;
          check(pv.every(x => x.ok), `${B_} B5 · PREVIEW (ghost / outline) on → the real-art ghost (== the Node preview); off → the current pixels exactly, for all 7 required transitions`, J(pv.filter(x => !x.ok)));
          check(buys.every(x => x.ok), `${B_} B6 · PURCHASE with real art in the page: ${FX_CASES.map(c => c[2]).join(" · ")} — GROW and DISSOLVE animate and END byte-for-byte on the exact target render in every pack; reduced motion = one exact swap`, J(buys.filter(x => !x.ok).slice(0, 3)));
          if (EVIDENCE && bn === "chromium") await evidence(p);
        }
        PROOF.browsers[bn][where] = { url: boot.url.replace(/^file:\/\/.*?\/demos\//, "file://…/demos/"), errors: errs.length, external: external.length, requests: loaded.length };
        await p.close();
      }
      await browser.close();
    }
    srvRoot.close(); srvSub.close();
  }

  // ---------------------------------------------------------------- evidence (docs/evidence/bloom-032b2/) — every still is rendered by the page's own pipeline
  async function evidence(p) {
    fs.mkdirSync(EVD, { recursive: true });
    await p.evaluate(() => {
      const LAB = PLANT_PIPELINE_LAB, PC = BLOOM.plantCompositor, FX = BLOOM.plantFx;
      window.__board = spec => { const old = document.getElementById("__board"); if (old) old.remove();
        const root = document.createElement("div"); root.id = "__board"; root.style.cssText = "position:absolute;left:0;top:0;z-index:99;background:#f3efe4;padding:12px 14px;font:12px/1.3 system-ui,sans-serif;color:#25261f;width:max-content";
        const h = document.createElement("div"); h.innerHTML = `<b style="letter-spacing:.6px">${spec.title}</b><span style="margin-left:10px;color:#3f6b45;font-weight:800">ORGANIC HYBRID — FINAL ART</span><span style="margin-left:10px;color:#66655a">${spec.note || ""}</span>`; root.append(h);
        for (const row of spec.rows) { const r = document.createElement("div"); r.style.cssText = "display:flex;gap:10px;align-items:flex-end;margin-top:10px";
          if (row.label) { const l = document.createElement("div"); l.style.cssText = "width:150px;font-weight:700;align-self:center"; l.textContent = row.label; r.append(l); }
          for (const c of row.cells) { const box = document.createElement("div"); box.style.cssText = "display:flex;flex-direction:column;gap:3px";
            const cur = LAB.frame(c.pack || "organic-hybrid", c.traits || {}, "thriving"); let rgba = cur.rgba;
            if (c.to) { const tgt = LAB.frame(c.pack || "organic-hybrid", c.to, "thriving"); rgba = c.preview ? FX.preview(cur, tgt) : FX.fxFrame(cur, tgt, c.style || "grow", c.t); }
            const cv = document.createElement("canvas"); cv.width = 84; cv.height = 98; cv.style.cssText = `width:${84 * c.k}px;height:${98 * c.k}px;image-rendering:pixelated;display:block`; PC.paint(cv, rgba, 84, 98);
            if (c.crop) { const [x, y, w, hh] = c.crop, cv2 = document.createElement("canvas"); cv2.width = w; cv2.height = hh; cv2.getContext("2d").putImageData(cv.getContext("2d").getImageData(x, y, w, hh), 0, 0); cv2.style.cssText = `width:${w * c.k}px;height:${hh * c.k}px;image-rendering:pixelated;display:block`; box.append(cv2); }
            else box.append(cv);
            const cap = document.createElement("div"); cap.style.cssText = "font-size:11px;color:#444"; cap.textContent = c.cap; box.append(cap); r.append(box); }
          root.append(r); }
        document.body.append(root); const b = root.getBoundingClientRect(); return { x: 0, y: 0, width: Math.ceil(b.width), height: Math.ceil(b.height) }; };
    });
    const board = async (name, spec) => { const clip = await p.evaluate(s => window.__board(s), spec); await p.waitForTimeout(100); await p.screenshot({ path: path.join(EVD, name), clip, fullPage: true }); await p.evaluate(() => document.getElementById("__board").remove()); };
    const cell = (k, scale = 3, extra = {}) => ({ traits: STATES[k] || k, cap: NAMES[k] || "", k: scale, ...extra });
    await board("01-base-real-art.png", { title: "BASE — real art at native 1× · 2× · 3× · 4×", rows: [{ cells: [1, 2, 3, 4].map(s => cell("base", s, { cap: `BASE ${s}×` })) }] });
    await board("02-cold-progression-real-art.png", { title: "COLD — open → dense (T1) → compact + 2 wool collars (T2) → cushion + 3 collars (T3)", rows: [{ cells: ["base", "cold1", "cold2", "cold3"].map(k => cell(k)) }] });
    await board("03-heat-progression-real-art.png", { title: "HEAT — wax L1 (shades 2–3) + lifted angles · L2 (shades 1–3) · T3 authored narrow heat leaves + full wax", rows: [{ cells: ["base", "heat1", "heat2", "heat3"].map(k => cell(k)) }] });
    await board("04-cold-heat-combination.png", { title: "COLD + HEAT — every legal temperature-pool split", rows: [{ cells: [cell("cold3", 3, { cap: "COLD T3" }), cell("cold2heat1"), cell({ cold: 1, heat: 2 }, 3, { cap: "COLD T1 + HEAT T2" }), cell("heat3")] }] });
    await board("05-drought-progression.png", { title: "DROUGHT — succulent storage leaves (CORE) + tuber (TUBER) · T4 / T5 / T9 = T3 art (art cap)", rows: [{ cells: ["drought1", "drought2", "drought3", "drought3heat3"].map(k => cell(k)) }, { cells: [4, 5, 9].map(n => cell({ drought: n }, 2, { cap: `DROUGHT T${n} (= T3 art)` })) }] });
    await board("06-flood-progression.png", { title: "FLOOD — broad reed leaves · aerial roots T1–T3 · stilt roots T3 · T4 / T5 / T9 = T3 art (art cap)", rows: [{ cells: ["flood1", "flood2", "flood3", "flood3heat3"].map(k => cell(k)) }, { cells: [4, 5, 9].map(n => cell({ flood: n }, 2, { cap: `FLOOD T${n} (= T3 art)` })) }] });
    await board("07-salt-vs-cold.png", { title: "SALT vs COLD — warm faceted SALT crystals + glands + Base notches vs blue-white FROST hairs / collars", rows: [{ cells: ["salt", "cold1", "cold2", "cold2salt"].map(k => cell(k)) }, { cells: ["salt", "cold2", "cold2salt"].map(k => cell(k, 6, { crop: [20, 20, 44, 40], cap: `${NAMES[k]} · 600 % crop` })) }] });
    await board("08-radiation.png", { title: "RADIATION — protective pigment: Base leaves through the approved Batch-5 masks; Drought leaves + stem via the contract default (auto)", rows: [{ cells: ["base", "rad", "drought2", "drought2rad"].map(k => cell(k)) }, { cells: ["rad", "drought2rad"].map(k => cell(k, 6, { crop: [20, 20, 44, 40], cap: `${NAMES[k]} · 600 % crop` })) }] });
    await board("09-reproduction-family.png", { title: "REPRODUCTION — closed bud (BASE) · flower · dry seed heads + drift · waterborne pods (separate families)", rows: [{ cells: ["base", "early", "seed1", "seed2"].map(k => cell(k)) }, { cells: ["water", "earlySeed2", "allRepro"].map(k => cell(k)) }] });
    await board("10-maximal-dry.png", { title: "MAXIMAL LEGAL DRY — Cold T2 + Heat T1 + Drought T3 + Salt + Radiation + Seed Output T2 + Early Maturity + Waterborne Seeds", rows: [{ cells: [1, 2, 3, 4].map(s => cell("maxDry", s, { cap: `${s}×` })) }] });
    await board("11-maximal-wet.png", { title: "MAXIMAL LEGAL WET — Cold T2 + Heat T1 + Flood T3 + Salt + Radiation + Seed Output T2 + Early Maturity + Waterborne Seeds", rows: [{ cells: [1, 2, 3, 4].map(s => cell("maxWet", s, { cap: `${s}×` })) }] });
    // 12 · the page's own final-vs-SVG view, four states stacked
    const shots = [];
    for (const k of ["base", "drought3", "flood3", "maxDry"]) { await p.evaluate(tt => PLANT_PIPELINE_LAB.set({ view: "final", traits: tt, preset: null, preview: false, condition: "thriving" }), STATES[k]); await p.waitForTimeout(150);
      const box = await p.evaluate(() => { const r = document.querySelector(".cols").getBoundingClientRect(), t = document.querySelector(".summary").getBoundingClientRect(); return { x: 0, y: Math.floor(t.top - 6), width: Math.ceil(Math.max(r.right, t.right) + 12), height: Math.ceil(r.bottom - t.top + 14) }; });
      shots.push(B.decodePNG(await p.screenshot({ clip: box }))); }
    { const W = Math.max(...shots.map(s => s.w)), H = shots.reduce((n, s) => n + s.h, 0), o = new Uint8Array(W * H * 4).fill(255); let y0 = 0;
      for (const s of shots) { for (let y = 0; y < s.h; y++) Buffer.from(s.rgba.buffer, s.rgba.byteOffset + y * s.w * 4, s.w * 4).copy(Buffer.from(o.buffer), ((y0 + y) * W) * 4); y0 += s.h; }
      fs.writeFileSync(path.join(EVD, "12-current-svg-vs-organic-hybrid.png"), I.encodePNG(W, H, o)); }
    await p.evaluate(() => { PLANT_PIPELINE_LAB.set({ view: "placements", pack: "organic-hybrid", preview: false }); PLANT_PIPELINE_LAB.setPreset("maxWet"); }); await p.waitForTimeout(150);
    await p.screenshot({ path: path.join(EVD, "13-real-room-sizes.png"), fullPage: true });
    await p.evaluate(() => { PLANT_PIPELINE_LAB.set({ view: "final", traits: {}, preset: null, propose: "cold", preview: true }); }); await p.waitForTimeout(150);
    await p.screenshot({ path: path.join(EVD, "14-preview.png"), clip: await p.evaluate(() => { const r = document.querySelector(".cols").getBoundingClientRect(); return { x: 0, y: 0, width: Math.ceil(r.right + 12), height: Math.ceil(r.bottom + 30) }; }) });
    await p.evaluate(() => PLANT_PIPELINE_LAB.set({ view: "compare", preview: false }));
    const T = [0, 0.15, 0.3, 0.45, 0.6, 0.8, 1];
    await board("15-grow-fx-strip.png", { title: "PURCHASE FX with real art — GROW (default) per required transition; last row DISSOLVE (secondary). Each row: preview · t = 0 … 1 (t = 1 is exactly the target)",
      rows: [...FX_CASES.map(([from, id, label]) => ({ label, cells: [{ traits: STATES[from], to: plus(STATES[from], id), preview: true, k: 2, cap: "preview" }, ...T.map(t => ({ traits: STATES[from], to: plus(STATES[from], id), style: "grow", t, k: 2, cap: `t ${t}` }))] })),
        { label: "Drought T2 → Radiation · DISSOLVE", cells: T.map(t => ({ traits: STATES.drought2, to: plus(STATES.drought2, "rad"), style: "dissolve", t, k: 2, cap: `t ${t}` })) }] });
  }

  PROOF.results = RESULTS; PROOF.summary = { passes, fails, seconds: Math.round((Date.now() - t0) / 1000), browsers: BROWSERS };
  if (EVIDENCE) { fs.mkdirSync(EVD, { recursive: true }); fs.writeFileSync(path.join(EVD, "art-intake-proof.json"), JSON.stringify(PROOF, null, 1) + "\n"); }
  console.log(`\n${fails ? "FAIL" : "OK"} — ${passes}/${passes + fails} checks passed (${PROOF.summary.seconds} s)`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
