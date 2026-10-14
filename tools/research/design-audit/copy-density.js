// BLOOM-038 design audit · L — INFORMATION-DENSITY / COPY audit (read-only research; never edits copy).
//
//   NODE_PATH="$(npm root -g)" node tools/research/design-audit/copy-density.js [--skip expedition,challenge,thinair,training,harness]
//
// Walks the same screens as affordance.js (browser-common.js tour: title → settings → species cards / dossiers → survey grid / focused
// dossier → Expedition run map → selected region → Regions / Adapt / Spread / Terraform → win report; Challenge hub (Dying World · Thin Air)
// → Challenge Planet Dossier → Dying World run (scenario bar + Details) → extinction warning → extinction report; Thin Air dossier → HOLDING →
// coverage dip → Thin Air report; Training coach; Native Competition / Volatile Climate scenario bars on the developer harness) and per
// screen collects the VISIBLE text (text nodes whose element is rendered, not inert, not clipped to ≤ 1.5 px, inside the open modal if
// any), grouped by its nearest block element (de-duplicated by node), then measures: words, blocks, the longest uninterrupted prose block
// (words, characters, rendered lines), sentences, repeated facts on one screen (identical normalised blocks / sentences; numbers repeated
// with the same unit), labels that merely restate a heading, technical / internal language (a fixed regex list), the same sentences /
// 5-word phrases / number+unit facts repeated across ADJACENT screens of the flow, and where each mid-run concept first appears
// (concepts introduced before they matter). Recommendations are short heuristic notes — no copy is rewritten.
// Output: docs/evidence/bloom-038/copy-density.json
"use strict";
const B = require("./browser-common.js");
const argv = process.argv.slice(2), SKIP = new Set(argv.includes("--skip") ? argv[argv.indexOf("--skip") + 1].split(",") : []);

function collect() {
  const modal = [...document.querySelectorAll("dialog[open]")].find(d => { try { return d.matches(":modal"); } catch (e) { return false; } }) || null;
  const BLOCK = new Set(["block", "flex", "grid", "list-item", "table-cell", "flow-root", "table", "inline-flex", "inline-grid", "table-caption"]);
  const blockOf = el => { let n = el; while (n && n !== document.body) { const d = getComputedStyle(n).display; if (BLOCK.has(d) || /^(P|LI|H[1-6]|DT|DD|BUTTON|LABEL|TD|TH|FIGCAPTION|LEGEND|SUMMARY)$/.test(n.tagName)) return n; n = n.parentElement; } return document.body; };
  const path = el => { const p = []; let n = el, k = 0; while (n && n !== document.body && k < 4) { let s = n.tagName.toLowerCase(); if (n.id) { p.unshift(s + "#" + n.id); break; } const c = [...n.classList].slice(0, 2); if (c.length) s += "." + c.join("."); p.unshift(s); n = n.parentElement; k++; } return p.join(" > "); };
  const blocks = new Map();
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let t = tw.nextNode(); t; t = tw.nextNode()) {
    const txt = t.textContent.replace(/\s+/g, " "); if (!txt.trim()) continue;
    const el = t.parentElement; if (!el || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|OPTION)$/.test(el.tagName) || el.closest("[inert]") || (modal && !modal.contains(el))) continue;
    if (el.checkVisibility && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
    const rg = document.createRange(); rg.selectNodeContents(t); const rr = rg.getBoundingClientRect(); if (rr.width <= 1.5 || rr.height <= 1.5) continue;
    // clipped away by an overflow ancestor (sr-only, a scrolled-out strip) — still counted if in a scroller (scrollable text is readable), dropped if clip ≤ 1.5 px
    let n = el, clipped = false; while (n && n !== document.body) { const c = getComputedStyle(n); if (c.clip && c.clip !== "auto" && /rect\(0/.test(c.clip)) { clipped = true; break; } n = n.parentElement; } if (clipped) continue;
    const b = blockOf(el); const e = blocks.get(b) || { el: b, parts: [], ctrl: !!b.closest("button, a[href], [role=button], [role=tab], [role=menuitem], label") }; e.parts.push(txt); blocks.set(b, e);
  }
  const out = [];
  for (const { el, parts, ctrl } of blocks.values()) {
    const text = parts.join("").replace(/\s+/g, " ").trim(); if (!text) continue;
    const cs = getComputedStyle(el), r = el.getBoundingClientRect(), lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3;
    const heading = /^H[1-6]$/.test(el.tagName) || el.getAttribute("role") === "heading" || (parseFloat(cs.fontSize) >= 20 && parseInt(cs.fontWeight) >= 600);
    out.push({ path: path(el), tag: el.tagName.toLowerCase(), text, heading, control: ctrl, fontPx: Math.round(parseFloat(cs.fontSize)), lines: Math.max(1, Math.round(r.height / lh)), inViewport: r.bottom > 0 && r.top < innerHeight });
  }
  return out;
}

// ---------------------------------------------------------------- analysis (Node side)
const wordsOf = s => s.match(/[\p{L}\p{N}][\p{L}\p{N}'’.\-]*/gu) || [];
const norm = s => s.toLowerCase().replace(/[“”"'’]/g, "").replace(/[^\p{L}\p{N}%°×\-−+ ]+/gu, " ").replace(/\s+/g, " ").trim();
const sentencesOf = s => s.split(/(?<=[.!?])\s+(?=[A-Z0-9“"(])/).map(x => x.trim()).filter(x => wordsOf(x).length >= 3);
const NUM_UNIT = /([−\-+]?\d+(?:[.,]\d+)?)\s?(%|°C|°|\bs\b|\bsec\b|\bBiomass\b|×|\bmin\b|\bm\b \d+s)/g;
const TECH = [["fitness", /\bfitness\b/i], ["tick", /\bticks?\b/i], ["seed", /\bseeds?\b/i], ["layer", /\blayers?\b/i], ["validator", /\bvalidat(or|ed|ion)\b/i], ["physiology", /\bphysiolog/i],
  ["RNG", /\bRNG\b|\brandom number/i], ["entry", /\bentry\b|\bentries\b/i], ["bank", /\bbanks?\b/i], ["fingerprint", /\bfingerprint/i], ["establishment", /\bestablishment\b/i], ["threshold", /\bthresholds?\b/i],
  ["offsets", /\boffsets?\b/i], ["percent", /\d\s?%/], ["decimal≥2", /\d+\.\d{2,}/], ["underscore_id", /\b[a-z]+_[a-z_]+\b/], ["camelCase", /\b[a-z]+[A-Z][a-zA-Z]+\b/], ["internal: archetype", /\barchetype/i], ["internal: scenario", /\bscenario\b/i], ["World Seed", /\bWorld Seed\b/]];
// mid-run concepts (become actionable in the run's rooms / map) — where are they first named?
const CONCEPTS = [["Biomass", /\bbiomass\b/i], ["Terraform", /\bterraform/i], ["Adapt (room)", /\badapt\b/i], ["Spread (room)", /\bspread\b/i], ["Waterborne Seeds / crossing", /\bwaterborne|\bcross(es|ing)? (the )?water|floating seeds/i],
  ["radiation", /\bradiation\b/i], ["toxicity", /\btoxi(c|city)\b/i], ["salinity / salt", /\bsalt|salin/i], ["pH", /\bpH\b/], ["nutrients", /\bnutrient/i], ["growth focus (Roots/Leaves/Seeds)", /\bgrowth focus\b|\bfocus\b.*\b(roots|leaves|seeds)\b/i],
  ["local upgrade (Root Network / Leaf Canopy / Seed Reserve)", /root network|leaf canopy|seed reserve|local upgrade/i], ["colony status words (sparse/establishing/dense)", /\b(sparse|establishing|established|dense)\b/i], ["die-back / vigor", /\bdie-?back|\bvigou?r\b/i],
  ["refuge / origin", /\brefuge\b|\borigin\b|landing region/i], ["native plants", /\bnative\b/i], ["climate shock / instability", /\bshock\b|\binstabilit/i], ["decline / pressure", /\bdecline\b|\bpressure\b/i], ["extinction", /\bextinct/i],
  ["Bloom / coverage goal", /\bbloom\b|\b70\s?%|\bcoverage\b/i], ["sky temperature / moisture", /\bsky\b/i], ["Map View lenses", /\bmap view\b/i], ["Cold/Heat Tolerance (named trait)", /cold tolerance|heat tolerance/i], ["Drought/Flood Adaptation (named trait)", /drought adaptation|flood adaptation/i], ["Salt Handling / Radiation Shielding (named trait)", /salt handling|radiation shielding/i]];
const PRE_RUN = new Set(["title", "settings", "species-cards", "species-dossier", "species-dossier-woolly_candle", "survey-grid", "survey-dossier", "challenge-hub", "challenge-hub-thin_air", "challenge-dossier", "challenge-dossier-thin_air"]);
const ADJACENT = [["species-dossier", "survey-grid"], ["survey-grid", "survey-dossier"], ["species-dossier", "survey-dossier"], ["survey-dossier", "run-map"], ["run-map", "selected-region"], ["selected-region", "room-regions"], ["room-regions", "room-adapt"], ["room-adapt", "room-spread"], ["room-spread", "room-terraform"],
  ["challenge-hub", "challenge-dossier"], ["challenge-dossier", "run-dying_world"], ["challenge-hub-thin_air", "challenge-dossier-thin_air"], ["challenge-dossier-thin_air", "run-thin_air-holding"], ["run-dying_world", "report-extinction"], ["species-dossier", "challenge-dossier"]];

function analyse(name, blocks) {
  const uniq = []; const seen = new Set(); for (const b of blocks) { const k = b.path + "|" + b.text; if (!seen.has(k)) { seen.add(k); uniq.push(b); } }
  const W = uniq.map(b => wordsOf(b.text).length), total = W.reduce((a, b) => a + b, 0);
  const prose = uniq.filter(b => !b.control && !b.heading && wordsOf(b.text).length >= 8 && /[.!?:]/.test(b.text));
  const longest = prose.slice().sort((a, b) => wordsOf(b.text).length - wordsOf(a.text).length)[0] || null;
  const sents = uniq.flatMap(b => sentencesOf(b.text).map(s => ({ s, path: b.path })));
  // repeats on one screen
  const dupBlocks = {}; for (const b of uniq) { if (wordsOf(b.text).length < 3) continue; const k = norm(b.text); (dupBlocks[k] = dupBlocks[k] || []).push(b.path); }
  const dupSent = {}; for (const x of sents) { const k = norm(x.s); (dupSent[k] = dupSent[k] || []).push(x.path); }
  const nums = {}; for (const b of uniq) { let m; const re = new RegExp(NUM_UNIT.source, "g"); while ((m = re.exec(b.text))) { const k = (m[1].replace("−", "-") + " " + m[2]).trim(); (nums[k] = nums[k] || []).push(b.path); } }
  const headings = uniq.filter(b => b.heading).map(b => norm(b.text));
  const restate = uniq.filter(b => !b.heading && wordsOf(b.text).length <= 4 && norm(b.text).length >= 3 && headings.some(h => h === norm(b.text) || (h.includes(norm(b.text)) && norm(b.text).length >= 5))).map(b => ({ text: b.text, path: b.path, control: b.control }));
  const tech = []; for (const b of uniq) for (const [k, re] of TECH) { const m = b.text.match(re); if (m) tech.push({ term: k, match: m[0], text: b.text.slice(0, 140), path: b.path }); }
  const techCount = tech.reduce((m, t) => (m[t.term] = (m[t.term] || 0) + 1, m), {});
  const concepts = {}; const all = uniq.map(b => b.text).join(" \n "); for (const [k, re] of CONCEPTS) { const n = (all.match(new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g")) || []).length; if (n) concepts[k] = n; }
  const r = {
    words: total, blocks: uniq.length, blocksInViewport: uniq.filter(b => b.inViewport).length, wordsInViewport: uniq.filter(b => b.inViewport).reduce((a, b) => a + wordsOf(b.text).length, 0),
    sentences: sents.length, proseBlocks: prose.length,
    longestProse: longest ? { words: wordsOf(longest.text).length, chars: longest.text.length, lines: longest.lines, fontPx: longest.fontPx, path: longest.path, text: longest.text } : null,
    repeatedBlocks: Object.entries(dupBlocks).filter(([, v]) => v.length > 1).map(([k, v]) => ({ text: k.slice(0, 120), times: v.length, paths: [...new Set(v)].slice(0, 4) })),
    repeatedSentences: Object.entries(dupSent).filter(([, v]) => v.length > 1).map(([k, v]) => ({ sentence: k.slice(0, 140), times: v.length })),
    repeatedNumbers: Object.entries(nums).filter(([, v]) => v.length > 1).map(([k, v]) => ({ value: k, times: v.length, paths: [...new Set(v)].slice(0, 4) })).sort((a, b) => b.times - a.times),
    labelsRestatingHeading: restate, technical: tech, technicalCount: techCount, concepts,
  };
  // heuristic notes (recommendations only)
  const notes = [];
  if (r.longestProse && r.longestProse.words >= 45) notes.push(`Longest uninterrupted prose block is ${r.longestProse.words} words (${r.longestProse.lines} lines at ${r.longestProse.fontPx}px) — candidate to split or cut.`);
  if (r.wordsInViewport >= 350) notes.push(`${r.wordsInViewport} words visible at once — dense for a decision screen.`);
  const rb = r.repeatedBlocks.filter(x => !/^(ok|blocked|strained)$/.test(x.text)); if (rb.length) notes.push(`${rb.length} identical text block(s) repeated on the screen (e.g. "${rb[0].text.slice(0, 60)}" ×${rb[0].times}).`);
  const rn = r.repeatedNumbers.filter(x => x.times >= 3); if (rn.length) notes.push(`Same number+unit shown ≥3× (e.g. ${rn.slice(0, 3).map(x => `"${x.value}" ×${x.times}`).join(", ")}).`);
  const tk = Object.keys(techCount).filter(k => !["percent", "seed"].includes(k)); if (tk.length) notes.push(`Internal / technical vocabulary visible: ${tk.join(", ")}.`);
  if (r.labelsRestatingHeading.filter(x => !x.control).length) notes.push(`${r.labelsRestatingHeading.filter(x => !x.control).length} non-control label(s) restate a heading on the same screen.`);
  r.notes = notes;
  return r;
}

(async () => {
  const t0 = Date.now(), srv = await B.serve(), browser = await B.launch();
  const out = { format: "bloom-038-copy-density@1", tool: "tools/research/design-audit/copy-density.js", at: new Date().toISOString(), browser: "chromium " + browser.version(), viewport: "1440x900",
    method: "Visible text nodes grouped by nearest block element; words = Unicode letter/number runs; prose block = non-control, non-heading block of ≥ 8 words with punctuation; sentences split on . ! ? followed by a capital/digit; technical regex list and mid-run concept list are fixed in the tool (see TECH / CONCEPTS). Counts include text scrolled inside panels (readable by scrolling); '…InViewport' counts only what is on screen without scrolling.",
    screens: {}, crossScreen: [], conceptFirstSeen: {}, summary: {}, errors: [] };
  const raw = {};
  const errs = await B.tour(browser, srv.origin, async (name, { page: p, ...info }) => {
    const blocks = await p.evaluate(collect); raw[name] = blocks;
    out.screens[name] = { info, ...analyse(name, blocks), inventory: blocks.map(b => ({ text: b.text, path: b.path, heading: b.heading || undefined, control: b.control || undefined, inViewport: b.inViewport })) };
    const s = out.screens[name]; console.log(`      ${s.words} words · longest prose ${s.longestProse ? s.longestProse.words : 0} · sentences ${s.sentences}`);
  }, { skip: SKIP });
  out.errors.push(...errs);
  // ---- across adjacent screens
  const shingles = (blocks, n = 5) => { const S = new Map(); for (const b of blocks) { const w = norm(b.text).split(" "); for (let i = 0; i + n <= w.length; i++) { const k = w.slice(i, i + n).join(" "); if (!S.has(k)) S.set(k, b.text); } } return S; };
  const numSet = blocks => { const S = new Set(); for (const b of blocks) { let m; const re = new RegExp(NUM_UNIT.source, "g"); while ((m = re.exec(b.text))) S.add((m[1].replace("−", "-") + " " + m[2]).trim()); } return S; };
  for (const [a, b] of ADJACENT) { if (!raw[a] || !raw[b]) continue;
    const sa = new Set(raw[a].flatMap(x => sentencesOf(x.text)).map(norm).filter(x => x.split(" ").length >= 5)), sb = raw[b].flatMap(x => sentencesOf(x.text)).map(norm).filter(x => sa.has(x));
    const ha = shingles(raw[a]), hb = shingles(raw[b]); const shared = [...hb.keys()].filter(k => ha.has(k));
    // collapse overlapping shingles into phrases (consecutive shared 5-grams from the same source text)
    const phrases = []; for (const k of shared) { const src = hb.get(k); const last = phrases[phrases.length - 1]; if (last && last.src === src && last.text.endsWith(k.split(" ").slice(0, 4).join(" "))) last.text += " " + k.split(" ")[4]; else phrases.push({ src, text: k }); }
    const na = numSet(raw[a]), nb = [...numSet(raw[b])].filter(x => na.has(x));
    out.crossScreen.push({ from: a, to: b, sharedSentences: [...new Set(sb)].slice(0, 12), sharedPhrases: phrases.map(p => p.text).filter(t => t.split(" ").length >= 5).slice(0, 25), sharedPhraseCount: phrases.length, sharedNumberFacts: nb.slice(0, 20) }); }
  // ---- concepts: first screen (tour order) where each appears; pre-run screens that name it
  const order = Object.keys(out.screens);
  for (const [k] of CONCEPTS) { const where = order.filter(n => out.screens[n].concepts[k]); if (!where.length) continue;
    out.conceptFirstSeen[k] = { first: where[0], preRunScreens: where.filter(n => PRE_RUN.has(n)), runScreens: where.filter(n => !PRE_RUN.has(n)), countsPreRun: where.filter(n => PRE_RUN.has(n)).reduce((s, n) => s + out.screens[n].concepts[k], 0) }; }
  // ---- summary table
  out.summary.table = Object.fromEntries(order.map(n => { const s = out.screens[n]; return [n, { words: s.words, wordsInViewport: s.wordsInViewport, blocks: s.blocks, sentences: s.sentences, longestProseWords: s.longestProse ? s.longestProse.words : 0,
    repeatedNumbers3plus: s.repeatedNumbers.filter(x => x.times >= 3).length, repeatedBlocks: s.repeatedBlocks.length, technical: Object.keys(s.technicalCount).filter(k => k !== "percent").length, percentMentions: s.technicalCount.percent || 0, notes: s.notes.length }]; }));
  out.summary.densest = order.slice().sort((a, b) => out.screens[b].wordsInViewport - out.screens[a].wordsInViewport).slice(0, 6).map(n => `${n} (${out.screens[n].wordsInViewport} words in view)`);
  out.summary.preRunConcepts = Object.entries(out.conceptFirstSeen).filter(([, v]) => v.preRunScreens.length).map(([k, v]) => `${k}: first on ${v.first}; pre-run on ${v.preRunScreens.join(", ")}`);
  out.summary.seconds = Math.round((Date.now() - t0) / 1000);
  B.writeJSON("copy-density.json", out);
  await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
