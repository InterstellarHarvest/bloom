// BLOOM-038 design audit · K — INTERACTION / AFFORDANCE audit (read-only research; never edits the game).
//
//   NODE_PATH="$(npm root -g)" node tools/research/design-audit/affordance.js [--no-shots] [--skip expedition,challenge,thinair,training,harness]
//
// For every audited screen of the released index.html (title, settings, species selection + dossier, Destination Survey grid + focused
// dossier, Challenge hub, Challenge Planet Dossier, run map, selected-region banner, Regions / Adapt / Spread / Terraform rooms, win /
// extinction / Thin Air reports, the Training coach) it inventories, in Chromium at 1440×900:
//   · every visible INTERACTIVE element — semantic (button, a[href], input, select, summary, label, [role=button|tab|option|radio|…],
//     [tabindex≥0]) or carrying a real click / pointer listener (CDP DOMDebugger.getEventListeners over the whole document) — and
//   · every visible NON-interactive element that LOOKS interactive (cursor:pointer set on it, a :hover rule of its own, a pill / button /
//     card / icon-box shape: border or fill + radius, uppercase / bold short labels, transitions),
// with its selector path, text, role, rect, visual cues, interaction evidence (semantic / own listener / delegated ancestor listener),
// hit tests (elementFromPoint at the centre + 4 inset corners), target size, disabled state + whether a reason is visible, a CSS-rule
// :hover analysis for all of them and a REAL page.mouse hover (computed-style diff after 320 ms) for the look-alikes and a sample of
// controls. The run map (production renderer on the developer harness: Ocean 28 · Frozen 7 · Desert 17, plus the Expedition run) is
// sampled on a grid (hitTest → region / water / frame, the drawn colour), the drawn region-label pills are re-derived from the renderer's
// own placement rule and hit-tested (does clicking a label select its region?), and a water click / hover is checked for feedback.
// Output: docs/evidence/bloom-038/affordance-audit.json (+ screenshots in docs/evidence/bloom-038/affordance/ unless --no-shots).
"use strict";
const path = require("path");
const B = require("./browser-common.js");
const argv = process.argv.slice(2), SHOTS = !argv.includes("--no-shots");
const SKIP = new Set(((argv[argv.indexOf("--skip") + 1] || "") && argv.includes("--skip") ? argv[argv.indexOf("--skip") + 1] : "").split(",").filter(Boolean));
const SHOT_DIR = path.join(B.OUT, "affordance");

// ===================================================================================== in-page inventory
function inventory() {
  const L = window.__audL || new Map();
  const CLICK = ["click", "pointerdown", "pointerup", "mousedown", "mouseup", "dblclick", "touchstart", "touchend"], HOVER = ["pointerover", "pointerenter", "mouseover", "mouseenter", "pointermove", "mousemove"];
  const ROLES = new Set(["button", "link", "tab", "option", "radio", "checkbox", "menuitem", "menuitemradio", "menuitemcheckbox", "switch", "slider", "treeitem", "combobox", "listbox", "spinbutton", "application", "textbox", "searchbox"]);
  const KEY_ATTRS = ["data-act", "data-tool", "data-go", "data-node", "data-r", "data-lens", "data-challenge", "data-species", "data-sp", "data-item", "data-cat", "data-room", "data-tab", "data-focus", "data-spec", "data-cell", "data-dialog", "data-tutorial"];
  const cssPath = el => { const parts = []; let n = el, k = 0;
    while (n && n.nodeType === 1 && n !== document.body && k < 5) { let s = n.tagName.toLowerCase();
      if (n.id) { parts.unshift(s + "#" + n.id); break; }
      const cls = [...n.classList].filter(c => !/^(on|pv-prev|over|entering|pulse|up|down)$/.test(c)).slice(0, 2); if (cls.length) s += "." + cls.join(".");
      for (const a of KEY_ATTRS) if (n.hasAttribute(a)) { s += `[${a}="${n.getAttribute(a).slice(0, 30)}"]`; break; }
      parts.unshift(s); n = n.parentElement; k++; }
    return parts.join(" > "); };
  const alpha = c => { const m = /rgba?\(([^)]+)\)/.exec(c || ""); if (!m) return c === "transparent" ? 0 : 1; const v = m[1].split(/[ ,/]+/).filter(Boolean); return v.length >= 4 ? parseFloat(v[3]) : 1; };
  const listenerTypes = el => L.get(el) || [];
  const hasClick = el => listenerTypes(el).some(t => CLICK.includes(t));
  const semantic = el => { const t = el.tagName;
    if (t === "BUTTON" || t === "SELECT" || t === "TEXTAREA" || t === "SUMMARY" || t === "OPTION") return t.toLowerCase();
    if (t === "A" && el.hasAttribute("href")) return "a[href]";
    if (t === "INPUT" && el.type !== "hidden") return "input[" + el.type + "]";
    if (t === "LABEL" && (el.control || el.querySelector("input"))) return "label(control)";
    const r = el.getAttribute("role"); if (r && ROLES.has(r)) return "role=" + r;
    if (el.hasAttribute("tabindex") && +el.getAttribute("tabindex") >= 0) return "tabindex";
    if (el.isContentEditable) return "contenteditable";
    return null; };
  const inert = el => !!el.closest("[inert]");
  const vis = el => { const r = el.getBoundingClientRect(); if (r.width <= 1.5 || r.height <= 1.5) return false;
    if (el.checkVisibility && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false; return true; };
  // :hover rules: base selector (":hover" removed) and whether the :hover sits on the subject itself (last compound)
  const splitTop = s => { const out = []; let d = 0, cur = ""; for (const ch of s) { if (ch === "(") d++; if (ch === ")") d--; if (ch === "," && d === 0) { out.push(cur.trim()); cur = ""; } else cur += ch; } if (cur.trim()) out.push(cur.trim()); return out; };
  const lastCompound = s => { let d = 0, cut = 0; for (let i = 0; i < s.length; i++) { const ch = s[i]; if (ch === "(") d++; else if (ch === ")") d--; else if (d === 0 && /[\s>+~]/.test(ch)) cut = i + 1; } return s.slice(cut); };
  const HOV = [];
  const walk = rules => { for (const r of rules) { try { if (r.cssRules && !r.selectorText) walk(r.cssRules);
    else if (r.selectorText && r.selectorText.includes(":hover")) for (const part of splitTop(r.selectorText)) if (part.includes(":hover") && !part.includes(":not(:hover")) {
      HOV.push({ self: lastCompound(part).includes(":hover"), base: part.replace(/:hover/g, "") || "*", sel: part, props: r.style.cssText.slice(0, 140) }); } } catch (e) { /* skip */ } } };
  for (const sh of document.styleSheets) { try { walk(sh.cssRules); } catch (e) { /* cross-origin */ } }
  const hoverRulesFor = el => HOV.filter(h => h.self && (() => { try { return el.matches(h.base); } catch (e) { return false; } })());
  // ---- pass 1: interactive set
  const all = [...document.body.querySelectorAll("*")].filter(el => !["SCRIPT", "STYLE", "TEMPLATE", "NOSCRIPT", "BR"].includes(el.tagName) && !(el.closest("svg") && el.tagName !== "svg"));
  const modal = [...document.querySelectorAll("dialog[open]")].find(d => { try { return d.matches(":modal"); } catch (e) { return false; } }) || null;   // a modal dialog makes the rest inert
  const shown = all.filter(el => !inert(el) && vis(el) && (!modal || modal.contains(el)));
  // a delegation container: an own click listener on an element that holds semantic controls (nav, tree, strip, banner …) — not a control itself
  const container = el => hasClick(el) && !semantic(el) && !!el.querySelector("button, a[href], input, select, [role=button], [role=tab], [role=option], [role=radio], [role=menuitem]");
  const isInteractive = el => !!semantic(el) || (hasClick(el) && !container(el));
  const interSet = new Set(shown.filter(isInteractive));
  const insideInteractive = el => { let n = el.parentElement; while (n && n !== document.body) { if (interSet.has(n) || semantic(n)) return n; n = n.parentElement; } return null; };
  const delegated = el => { let n = el.parentElement, d = 1; while (n && n !== document.documentElement) { if (hasClick(n)) return { path: n === document.body ? "body" : n === document.documentElement ? "html" : cssPath(n), depth: d }; n = n.parentElement; d++; } return null; };
  // the part of the element actually shown: the viewport ∩ every overflow-clipping ancestor (a chip scrolled out of its strip is not "occluded")
  const clipRect = (el, r) => { let L = Math.max(0, r.left), T = Math.max(0, r.top), R = Math.min(innerWidth, r.right), Bm = Math.min(innerHeight, r.bottom), n = el.parentElement;
    while (n && n !== document.documentElement) { const c = getComputedStyle(n); if (c.overflowX !== "visible" || c.overflowY !== "visible") { const q = n.getBoundingClientRect(); L = Math.max(L, q.left); T = Math.max(T, q.top); R = Math.min(R, q.right); Bm = Math.min(Bm, q.bottom); } n = n.parentElement; }
    return R - L >= 2 && Bm - T >= 2 ? { left: L, top: T, right: R, bottom: Bm, width: R - L, height: Bm - T } : null; };
  const words = s => (s.match(/[\p{L}\p{N}][\p{L}\p{N}'’.-]*/gu) || []).length;
  const out = [], lookSet = new Set();
  const els = [];
  for (const el of shown) {
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el), par = el.parentElement ? getComputedStyle(el.parentElement) : null;
    const inter = interSet.has(el), within = insideInteractive(el);
    if (within && !inter) continue;                                   // a part of a control (its label, icon, …)
    const bw = ["Top", "Right", "Bottom", "Left"].map(s => cs["border" + s + "Style"] !== "none" && cs["border" + s + "Style"] !== "hidden" ? parseFloat(cs["border" + s + "Width"]) * (alpha(cs["border" + s + "Color"]) > 0.08 ? 1 : 0) : 0);
    const border = Math.max(...bw), fill = alpha(cs.backgroundColor) > 0.05 || cs.backgroundImage !== "none", shadow = cs.boxShadow !== "none";
    const radius = Math.max(parseFloat(cs.borderTopLeftRadius) || 0, parseFloat(cs.borderBottomRightRadius) || 0);
    const trans = cs.transitionDuration.split(",").some(d => parseFloat(d) > 0) && cs.transitionProperty !== "none";
    const ownText = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join(" ").replace(/\s+/g, " ").trim();
    const text = (el.innerText || el.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim();
    const upper = cs.textTransform === "uppercase" || (/[A-Z]{3}/.test(ownText) && ownText === ownText.toUpperCase());
    const bold = parseInt(cs.fontWeight) >= 600;
    const svg = el.querySelector(":scope > svg, :scope > img, :scope > span > svg"), boxed = (border > 0 || fill || shadow) && radius >= 3;
    const setsPointer = cs.cursor === "pointer" && !(par && par.cursor === "pointer");
    const hov = hoverRulesFor(el);
    const nw = words(text);
    const shape = !boxed ? null : (radius >= r.height / 2 - 2 && r.height <= 34 && nw <= 5) ? "pill" : (r.width <= 60 && r.height <= 60 && svg && nw <= 1) ? "icon-box"
      : (r.height <= 64 && r.width <= 420 && nw >= 1 && nw <= 6) ? "button-like" : (r.width >= 110 && r.height >= 56) ? "card" : "box";
    const group = [...interSet].some(x => x !== el && el.contains(x));      // a box that holds controls is a group, not a look-alike control
    const iconOnlyInPill = !text && el.parentElement && lookSet.has(el.parentElement);
    const looks = !group && el.tagName !== "svg" && !iconOnlyInPill && (setsPointer || hov.length > 0 || shape === "pill" || shape === "icon-box" || shape === "button-like" || (shape === "card" && (trans || hov.length > 0 || setsPointer)));
    if (looks) lookSet.add(el);
    if (!inter && !looks && (shape !== "card" || group || el.tagName === "svg")) continue;
    const sem = semantic(el), own = listenerTypes(el), dl = inter ? null : delegated(el), isContainer = container(el);
    if (isContainer && !looks) continue;
    const disabled = !!(el.disabled || el.getAttribute("aria-disabled") === "true");
    const lockedish = disabled || /\b(locked|disabled|unavailable|off|na|blocked|cant)\b/.test(el.className && el.className.baseVal === undefined ? el.className : "") || el.dataset.state === "locked" || el.dataset.room === "unavailable";
    let reason = null; const REASON = /(need|requires?|locked|not available|already|max|unavailable|can.?t|cannot|only|more biomass|afford)/i;
    if (lockedish) { const desc = (el.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean).map(id => document.getElementById(id)).filter(Boolean).map(n => n.textContent.trim()).join(" ");
      const sib = el.nextElementSibling && vis(el.nextElementSibling) ? el.nextElementSibling.innerText.replace(/\s+/g, " ").trim().slice(0, 120) : "";
      const t = el.getAttribute("title") || "";
      reason = { title: t || null, titleIsReason: REASON.test(t), describedBy: desc || null, ariaLabel: el.getAttribute("aria-label") || null, ownTextReason: REASON.test(text) ? text.slice(0, 160) : null, priceShown: (/(\d+)\s*Biomass/.exec(text) || [])[0] || null, nextSibling: sib || null };
      reason.visible = !!(reason.ownTextReason || (sib && REASON.test(sib))); reason.hoverOnly = !reason.visible && (reason.titleIsReason || REASON.test(desc)); }
    // hit tests (only in the viewport)
    let hit = null; const vr = clipRect(el, r), inVp = !!vr;
    if (inVp) { const ins = Math.min(Math.max(3, radius * 0.32 + 1.5), vr.width / 4, vr.height / 4), pts = [[vr.left + vr.width / 2, vr.top + vr.height / 2], [vr.left + ins, vr.top + ins], [vr.right - ins, vr.top + ins], [vr.left + ins, vr.bottom - ins], [vr.right - ins, vr.bottom - ins]];
      const res = pts.map(([x, y]) => { if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return "offscreen"; const e = document.elementFromPoint(x, y); return !e ? "none" : (e === el || el.contains(e)) ? "ok" : cssPath(e); });
      hit = { centre: res[0], cornersOk: res.slice(1).filter(x => x === "ok").length, blockers: [...new Set(res.filter(x => x !== "ok" && x !== "offscreen"))].slice(0, 3), clippedShare: +(1 - (vr.width * vr.height) / (r.width * r.height)).toFixed(2) }; }
    // the visual control larger than the click target: the nearest boxed, non-interactive ancestor (≤ 3 up) that holds only this control
    let visualBox = null;
    if (inter) { let n = el.parentElement, k = 0; while (n && n !== document.body && k < 3) { const ncs = getComputedStyle(n), nr = n.getBoundingClientRect();
        const nb = (alpha(ncs.backgroundColor) > 0.05 || ncs.boxShadow !== "none" || (parseFloat(ncs.borderTopWidth) > 0 && ncs.borderTopStyle !== "none")) && (parseFloat(ncs.borderTopLeftRadius) || 0) >= 3;
        if (nb && !interSet.has(n) && [...n.querySelectorAll("*")].filter(x => interSet.has(x)).length === 1 && nr.width * nr.height >= 1.5 * r.width * r.height && nr.width < innerWidth * 0.6) { visualBox = { path: cssPath(n), w: Math.round(nr.width), h: Math.round(nr.height), areaRatio: +(nr.width * nr.height / (r.width * r.height)).toFixed(2) }; break; }
        n = n.parentElement; k++; } }
    const idx = els.push(el) - 1;
    out.push({ i: idx, path: cssPath(el), tag: el.tagName.toLowerCase(), role: el.getAttribute("role"), text: text.slice(0, 90), words: nw,
      rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], inViewport: inVp,
      interactive: inter, delegationContainer: isContainer, evidence: { semantic: sem, ownListeners: own.filter(t => CLICK.includes(t) || HOVER.includes(t) || t === "keydown"), delegatedClickAncestor: dl },
      cues: { cursorPointerSet: setsPointer, cursor: cs.cursor, border, fill, shadow, radius: Math.round(radius), transition: trans, uppercase: upper, bold, icon: !!svg, shape, hoverRules: hov.slice(0, 3).map(h => h.sel) },
      looksInteractive: looks, disabled, lockedish, disabledReason: reason, hit, visualBox, minSide: Math.round(Math.min(r.width, r.height)),
      attrs: { class: typeof el.className === "string" ? el.className.slice(0, 80) : null, title: el.getAttribute("title"), ariaLabel: el.getAttribute("aria-label"), pressed: el.getAttribute("aria-pressed"), state: el.dataset.state || null } });
  }
  window.__audEls = els;
  return { items: out, hoverRules: HOV.length, docClick: hasClick(document) || hasClick(document.documentElement) || hasClick(document.body) };
}

// computed-style snapshot for the real hover diff
function styleOf(i) { const el = window.__audEls[i]; if (!el || !el.isConnected) return null; const cs = getComputedStyle(el);
  const kids = [...el.querySelectorAll("*")].slice(0, 6).map(k => { const c = getComputedStyle(k); return c.color + "|" + c.backgroundColor + "|" + c.opacity; }).join(";");
  return { backgroundColor: cs.backgroundColor, color: cs.color, borderColor: cs.borderTopColor, boxShadow: cs.boxShadow, transform: cs.transform, filter: cs.filter, opacity: cs.opacity, outline: cs.outlineStyle, textDecoration: cs.textDecorationLine, cursor: cs.cursor, kids }; }

// ===================================================================================== in-page map audit (the production renderer)
function mapAudit() {
  const PV = BLOOM.planetView.instance, R = PV.renderer, A = BLOOM_RUN_UI.adapter, cv = document.getElementById("pvMap"), r = cv.getBoundingClientRect(), I = R.info();
  const regs = A.regions(), ctx = cv.getContext("2d");
  const px = (x, y) => { const d = ctx.getImageData(Math.round((x - r.left) * I.dpr), Math.round((y - r.top) * I.dpr), 1, 1).data; return [d[0], d[1], d[2]]; };
  // ---- region-label pills: the renderer's own placement rule (run-map-renderer.js placeLabels), re-derived in client px, then hit-tested
  const dpr = I.dpr, td = I.tileDevicePx, cssT = td / dpr, fs = Math.min(14, Math.max(10, Math.round(cssT * 0.78))) * dpr, h = Math.round(fs * 1.7), g = Math.round(fs * 0.95), pad = Math.round(fs * 0.55), gap = Math.round(fs * 0.3);
  const mc = document.createElement("canvas").getContext("2d"); mc.font = `800 ${fs}px ui-rounded, "SF Pro Rounded", "Nunito", "Varela Round", "Trebuchet MS", system-ui, sans-serif`;
  const placed = [], labels = [];
  for (const rg of regs.slice().sort((a, b) => (b.area || 0) - (a.area || 0))) {
    const w = Math.round(pad + g + gap + (rg.isOrigin ? g + gap : 0) + mc.measureText(rg.name).width + pad); let x = rg.center.x * td, y = rg.center.y * td;
    const hitL = yy => placed.some(p => Math.abs(p.x - x) < (p.w + w) / 2 + 2 * dpr && Math.abs(p.y - yy) < h + 2 * dpr);
    let moved = false; if (hitL(y)) { const up = y - h - 3 * dpr, dn = y + h + 3 * dpr; const ny = !hitL(dn) ? dn : !hitL(up) ? up : y; moved = ny !== y; y = ny; }
    placed.push({ x, y, w });
    const cx = r.left + (I.offsetX * dpr + x) / dpr, cy = r.top + (I.offsetY * dpr + y) / dpr, wc = w / dpr, hc = h / dpr;
    const samples = [[cx, cy], [cx - wc / 2 + 4, cy], [cx + wc / 2 - 4, cy], [cx - wc / 4, cy], [cx + wc / 4, cy]].map(([sx, sy]) => { const t = R.hitTest(sx, sy); return t.region === rg.index ? "own" : t.region >= 0 ? "other:" + regs[t.region].name : t.tile >= 0 ? "water" : "frame"; });
    labels.push({ region: rg.name, lamp: rg.lamp, blocked: rg.blocked, origin: rg.isOrigin, moved, rect: [Math.round(cx - wc / 2), Math.round(cy - hc / 2), Math.round(wc), Math.round(hc)], samples, allOwn: samples.every(s => s === "own"), centreOwn: samples[0] === "own" });
  }
  const NX = 36, NY = 20, pts = [];
  const sampleGrid = () => { for (let gy = 0; gy < NY; gy++) for (let gx = 0; gx < NX; gx++) { const x = r.left + (gx + 0.5) * r.width / NX, y = r.top + (gy + 0.5) * r.height / NY;
    const h = R.hitTest(x, y), t = A.tileAt(x, y), kind = h.region >= 0 ? "land" : h.tile >= 0 ? "water" : "frame", g = h.region >= 0 ? regs[h.region] : null;
    const underLabel = labels.some(l => x >= l.rect[0] - 4 && x <= l.rect[0] + l.rect[2] + 4 && y >= l.rect[1] - 14 && y <= l.rect[1] + l.rect[3] + 4);   // (pill + its colony badge above)
    pts.push({ x: Math.round(x), y: Math.round(y), tile: h.tile, region: h.region, adapterRegion: t.region, kind, lamp: g ? g.lamp : null, blocked: g ? g.blocked : null, living: g ? g.living : null, underLabel, rgb: px(x, y) }); } };
  const avg = list => list.length ? [0, 1, 2].map(k => Math.round(list.reduce((s, p) => s + p.rgb[k], 0) / list.length)) : null;
  const dist = (a, b) => Math.round(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]));
  sampleGrid();
  const clean = pts.filter(p => !p.underLabel), water = clean.filter(p => p.kind === "water"), land = clean.filter(p => p.kind === "land"), bare = land.filter(p => !p.living), blockedLand = land.filter(p => p.blocked);
  // nearest land colour to each water sample (how close can a region's drawn ground get to water?)
  let minWL = Infinity, closest = null; for (const w of water) for (const l of land) { const d = dist(w.rgb, l.rgb); if (d < minWL) { minWL = d; closest = { water: w.rgb, land: l.rgb, landRegion: regs[l.region].name, blocked: l.blocked }; } }
  // samples drawn closer to the OTHER kind's mean colour (land that reads as water, water that reads as land)
  const wA = avg(water), lA = avg(land), lookAlike = [];
  if (wA && lA) { for (const p of land) if (dist(p.rgb, wA) < dist(p.rgb, lA)) lookAlike.push({ kind: "land drawn like water", region: regs[p.region].name, blocked: p.blocked, x: p.x, y: p.y, rgb: p.rgb, toWater: dist(p.rgb, wA), toLand: dist(p.rgb, lA) });
    for (const p of water) if (dist(p.rgb, lA) < dist(p.rgb, wA)) lookAlike.push({ kind: "water drawn like land", x: p.x, y: p.y, rgb: p.rgb, toWater: dist(p.rgb, wA), toLand: dist(p.rgb, lA) }); }
  return { lookAlike: { landLikeWater: lookAlike.filter(x => x.kind.startsWith("land")).length, waterLikeLand: lookAlike.filter(x => x.kind.startsWith("water")).length, examples: lookAlike.slice(0, 12) }, canvas: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], tilePx: I.tilePx, wrapX: I.wrapX, regions: regs.length,
    counts: { land: land.length, water: water.length, underLabelExcluded: pts.length - clean.length, frame: pts.filter(p => p.kind === "frame").length, adapterAgrees: pts.filter(p => p.region === p.adapterRegion || (p.region < 0 && p.adapterRegion < 0)).length, total: pts.length },
    colour: { water: avg(water), land: avg(land), bareLand: avg(bare), blockedLand: avg(blockedLand), waterVsLand: water.length && land.length ? dist(avg(water), avg(land)) : null, waterVsBlockedLand: water.length && blockedLand.length ? dist(avg(water), avg(blockedLand)) : null, minWaterToLandSample: Number.isFinite(minWL) ? minWL : null, closestPair: closest },
    labels, labelSummary: { total: labels.length, centreNotOwn: labels.filter(l => !l.centreOwn).length, anySampleNotOwn: labels.filter(l => !l.allOwn).length, moved: labels.filter(l => l.moved).length },
    waterPoint: water[Math.floor(water.length / 2)] || null, landPoint: land.find(p => p.region >= 0 && !regs[p.region].isOrigin) || land[0] || null, sample: pts.filter((_, k) => k % 7 === 0) };
}

// on a run screen with the selected-region banner open: how much of the SELECTED region (its land tiles' centres) the banner covers
function bannerOcclusion() {
  const ban = document.getElementById("pvBanner"), A = window.BLOOM_RUN_UI && BLOOM_RUN_UI.adapter; if (!ban || ban.hidden || !A) return null;
  const sel = A.selection(); if (sel.index < 0) return null; const M = A.map(), R = BLOOM.planetView.instance.renderer, b = ban.getBoundingClientRect(), cv = document.getElementById("pvMap").getBoundingClientRect();
  let n = 0, covered = 0, inView = 0; M.tilemap.forEach((s, t) => { if (s !== sel.index) return; const x = t % M.width, y = (t / M.width) | 0, c = R.clientOf(x + 0.5, y + 0.5); n++;
    if (c.x >= cv.left && c.x <= cv.right && c.y >= cv.top && c.y <= cv.bottom) { inView++; if (c.x >= b.left && c.x <= b.right && c.y >= b.top && c.y <= b.bottom) covered++; } });
  return { region: sel.name, tiles: n, tilesInMapView: inView, coveredByBanner: covered, share: n ? +(covered / n).toFixed(2) : null, banner: [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)], mapShareCoveredByBanner: +((b.width * b.height) / (cv.width * cv.height)).toFixed(2) };
}

async function mapClicks(p, M) {
  const out = {}; const st = () => p.evaluate(() => { const A = BLOOM_RUN_UI.adapter, cv = document.getElementById("pvMap"); return { sel: A.selection(), banner: !document.getElementById("pvBanner").hidden, toast: !document.getElementById("pvToast").hidden ? document.getElementById("pvToast").innerText : null, log: document.getElementById("pvLog").innerText, cursor: getComputedStyle(cv).cursor, over: cv.classList.contains("over"), live: (document.getElementById("pvLive") || {}).textContent || "" }; });
  if (M.landPoint) { await p.mouse.move(M.landPoint.x, M.landPoint.y); await p.waitForTimeout(150); out.hoverLand = await st(); await p.mouse.click(M.landPoint.x, M.landPoint.y); await p.waitForTimeout(400); out.clickLand = await st(); }
  if (M.waterPoint) { await p.mouse.move(M.waterPoint.x, M.waterPoint.y); await p.waitForTimeout(150); out.hoverWater = await st(); await p.mouse.click(M.waterPoint.x, M.waterPoint.y); await p.waitForTimeout(400); out.clickWater = await st();
    await p.mouse.click(M.waterPoint.x, M.waterPoint.y); await p.waitForTimeout(300); out.clickWaterAgain = await st(); }
  out.waterFeedback = out.clickWater ? { selectionWater: !!out.clickWater.sel.water, bannerShown: out.clickWater.banner, toast: out.clickWater.toast, logChanged: out.clickLand ? out.clickWater.log !== out.clickLand.log : null, liveRegion: out.clickWater.live, cursorOverWater: out.hoverWater.cursor, cursorOverLand: out.hoverLand ? out.hoverLand.cursor : null } : null;
  await p.mouse.move(2, 2);
  return out;
}

// ===================================================================================== flags
function flagsFor(screen, inv) {
  const F = [];
  const add = (type, it, note) => F.push({ type, path: it.path, text: it.text, rect: it.rect, note });
  for (const it of inv.items) {
    const ev = it.evidence, delegatedOnly = !it.interactive && !!ev.delegatedClickAncestor;
    if (!it.interactive && !it.delegationContainer && it.looksInteractive) {
      if (it.cues.shape === "pill" && (it.cues.uppercase || it.cues.bold)) add("label-resembles-button", it, `pill${it.cues.uppercase ? " uppercase" : ""}${it.cues.bold ? " bold" : ""}, no role/listener${delegatedOnly ? " (a click listener on an ancestor: " + ev.delegatedClickAncestor.path + ")" : ""}`);
      else if (it.cues.shape === "button-like") add("label-resembles-button", it, `button-shaped box (border/fill + radius ${it.cues.radius}px, ${it.words} words), not interactive${delegatedOnly ? " (ancestor listener " + ev.delegatedClickAncestor.path + ")" : ""}`);
      if (it.cues.shape === "icon-box") add("icon-implies-interaction", it, "icon inside a box, not interactive");
      if (it.cues.cursorPointerSet) add("cursor-pointer-without-interaction", it, `cursor:pointer set here, no role/listener${delegatedOnly ? " (ancestor listener " + ev.delegatedClickAncestor.path + ")" : ""}`);
      if (it.cues.hoverRules.length) add("hover-effect-on-non-interactive", it, "own :hover rule(s): " + it.cues.hoverRules.join(" | "));
      if (it.realHover && it.realHover.changed.length) add("hover-effect-on-non-interactive", it, "real hover changed " + it.realHover.changed.join(", "));
    }
    if (!it.interactive && !it.delegationContainer && it.cues.shape === "card" && (it.cues.transition || it.cues.hoverRules.length || it.cues.cursorPointerSet)) add("static-card-resembles-selectable", it, `card ${it.rect[2]}×${it.rect[3]} with ${[it.cues.transition && "transition", it.cues.hoverRules.length && ":hover rule", it.cues.cursorPointerSet && "cursor:pointer"].filter(Boolean).join(" + ")}`);
    if (it.interactive && it.inViewport) {
      const flat = !it.cues.border && !it.cues.fill && !it.cues.shadow, noPointer = it.cues.cursor !== "pointer", noHover = !it.cues.hoverRules.length && !(it.realHover && it.realHover.changed.length);
      if (ev.semantic === "tabindex" && !ev.ownListeners.length && !ev.delegatedClickAncestor) add("focusable-without-action", it, "tabindex=0, no role and no click/pointer listener (keyboard focus stop with nothing to activate)");
      else if (it.tag !== "canvas" && flat && noPointer && noHover && it.rect[2] >= 80) add("selectable-not-looking-selectable", it, "interactive but no border / fill / shadow, no pointer cursor, no hover change");
      else if (it.tag !== "canvas" && noPointer && it.cues.cursor === "default" && !it.disabled) add("interactive-default-cursor", it, `cursor:${it.cues.cursor}`);
      if (it.hit && it.hit.centre !== "ok" && it.hit.centre !== "offscreen") add("click-target-occluded", it, "centre of the shown part hits " + it.hit.centre);
      else if (it.hit && it.hit.cornersOk < 4) add("click-target-partly-occluded", it, `${it.hit.cornersOk}/4 corners hit; blockers ${it.hit.blockers.join(" | ")}`);
      if (it.visualBox) add("click-target-smaller-than-visual", it, `visual box ${it.visualBox.path} is ${it.visualBox.areaRatio}× the target`);
      if (it.minSide < 24 && it.tag !== "canvas") add("target-under-24px", it, `${it.rect[2]}×${it.rect[3]}`);
    }
    if (it.lockedish && it.disabledReason && !it.disabledReason.visible) add("disabled-without-visible-reason", it, (it.disabled ? "disabled control" : "locked-looking control") + (it.disabledReason.hoverOnly ? `; reason only on hover/focus${it.disabledReason.revealedOnHover && it.disabledReason.revealedOnHover.length ? ' ("' + it.disabledReason.revealedOnHover.join(" / ").slice(0, 90) + '")' : " (title / description)"}` : "; no reason text in it, its title, aria-describedby, the next element or text revealed on hover") + (it.disabledReason.priceShown ? `; only the price "${it.disabledReason.priceShown}" is shown` : "") + (it.disabledReason.title && !it.disabledReason.titleIsReason ? `; its title is a description ("${it.disabledReason.title.slice(0, 50)}")` : ""));
  }
  return F;
}

// ===================================================================================== main
(async () => {
  const t0 = Date.now(), srv = await B.serve(), browser = await B.launch();
  const out = { format: "bloom-038-affordance-audit@1", tool: "tools/research/design-audit/affordance.js", at: new Date().toISOString(), browser: "chromium " + browser.version(), viewport: "1440x900",
    method: "CDP DOMDebugger.getEventListeners (depth -1, pierce) for listener evidence; CSS :hover rule matching for every candidate; real page.mouse hover + computed-style diff (320 ms) for look-alikes and a sample of controls; elementFromPoint hit tests (centre + 4 corners inset 3 px). 'Interactive' = semantic element/role/tabindex or an own click/pointer listener; a click listener on an ancestor only (event delegation) is reported as evidence but NOT counted as interactive — such items need a human glance.",
    screens: {}, maps: {}, summary: {}, errors: [] };
  const errs = await B.tour(browser, srv.origin, async (name, { page: p, ...info }) => {
    const L = await B.markListeners(p); const inv = await p.evaluate(inventory);
    // real hover: look-alikes (≤ 40) + the first 25 in-viewport controls
    const pick = [...new Set([...inv.items.filter(i => !i.interactive && i.looksInteractive && i.inViewport).slice(0, 40), ...inv.items.filter(i => i.lockedish && i.inViewport).slice(0, 14), ...inv.items.filter(i => i.interactive && i.inViewport && i.tag !== "canvas").slice(0, 25)])];
    const lines = () => p.evaluate(() => { const r = document.querySelector(".dr .dr-room:not([hidden])") || document.body; return r.innerText.split("\n").map(s => s.trim()).filter(Boolean); });
    for (const it of pick) { await p.mouse.move(1, 1); await p.waitForTimeout(60); const before = await p.evaluate(styleOf, it.i); if (!before) continue; const t0 = it.lockedish ? await lines() : null;
      await p.mouse.move(it.rect[0] + it.rect[2] / 2, it.rect[1] + it.rect[3] / 2); await p.waitForTimeout(320); const after = await p.evaluate(styleOf, it.i); if (!after) continue;
      it.realHover = { changed: Object.keys(before).filter(k => before[k] !== after[k]) };
      if (t0) { const t1 = await lines(), had = new Set(t0); it.realHover.revealed = t1.filter(x => !had.has(x)).slice(0, 8); if (it.disabledReason) { it.disabledReason.revealedOnHover = it.realHover.revealed.filter(x => /(need|requires?|locked|not available|already|max|unavailable|can.?t|cannot|only|biomass|afford)/i.test(x)); if (it.disabledReason.revealedOnHover.length) it.disabledReason.hoverOnly = true; } } }
    await p.mouse.move(1, 1);
    const flags = flagsFor(name, inv);
    const I = inv.items.filter(i => i.interactive), sizes = I.filter(i => i.inViewport && i.tag !== "canvas");
    out.screens[name] = { info, listeners: L, hoverRulesInCSS: inv.hoverRules,
      stats: { interactive: I.length, interactiveInViewport: sizes.length, lookalikes: inv.items.filter(i => !i.interactive && i.looksInteractive).length, cards: inv.items.filter(i => i.cues.shape === "card").length,
        under24: sizes.filter(i => i.minSide < 24).length, under32: sizes.filter(i => i.minSide < 32).length, under44: sizes.filter(i => i.minSide < 44).length, minSide: sizes.length ? Math.min(...sizes.map(i => i.minSide)) : null,
        delegatedOnly: inv.items.filter(i => !i.interactive && i.evidence.delegatedClickAncestor && i.looksInteractive).length, flags: flags.reduce((m, f) => (m[f.type] = (m[f.type] || 0) + 1, m), {}) },
      flags, items: inv.items };
    if (SHOTS) out.screens[name].screenshot = await B.shot(p, path.join(SHOT_DIR, name + ".png"));
    try { const bo = await p.evaluate(bannerOcclusion); if (bo) out.screens[name].bannerOcclusion = bo; } catch (e) { /* not a run screen */ }
    if (name === "run-map") { try { const M = await p.evaluate(mapAudit); M.clicks = await mapClicks(p, M); out.maps["expedition-run"] = M; } catch (e) { out.errors.push("expedition map: " + e.message); } }
  }, { skip: SKIP });
  out.errors.push(...errs);
  // ---- the run map on three deterministic harness worlds (the same production Planet View + renderer)
  if (!SKIP.has("maps")) for (const [archetype, seed] of [["ocean_archipelago", 28], ["frozen_world", 7], ["desert_world", 17]]) {
    const p = await B.newPage(browser);
    try { await p.goto(B.nav.harnessURL(srv.origin, { archetype, seed, species: "organic_hybrid" })); await B.waits.harness(p); await p.evaluate(() => BLOOM_API.advance(120)); await p.waitForTimeout(700);
      const M = await p.evaluate(mapAudit); M.clicks = await mapClicks(p, M); M.world = `${archetype}:${seed}`; out.maps[`${archetype}-${seed}`] = M;
      if (SHOTS) M.screenshot = await B.shot(p, path.join(SHOT_DIR, `map-${archetype}-${seed}.png`)); console.log(`  · map ${archetype} ${seed}: water ${M.counts.water} land ${M.counts.land}; labels off-target ${M.labelSummary.anySampleNotOwn}/${M.labelSummary.total}`); }
    catch (e) { out.errors.push(`map ${archetype}:${seed}: ` + e.message); }
    await p.context().close(); }
  // ---- summary
  const S = out.summary; S.screens = Object.keys(out.screens).length; S.flagTotals = {};
  for (const [n, s] of Object.entries(out.screens)) for (const [k, v] of Object.entries(s.stats.flags)) { S.flagTotals[k] = S.flagTotals[k] || { total: 0, screens: {} }; S.flagTotals[k].total += v; S.flagTotals[k].screens[n] = v; }
  S.targetSize = Object.fromEntries(Object.entries(out.screens).map(([n, s]) => [n, { interactive: s.stats.interactiveInViewport, under24: s.stats.under24, under32: s.stats.under32, minSide: s.stats.minSide }]));
  S.bannerOcclusion = Object.fromEntries(Object.entries(out.screens).filter(([, s]) => s.bannerOcclusion).map(([n, s]) => [n, s.bannerOcclusion]));
  S.maps = Object.fromEntries(Object.entries(out.maps).map(([k, M]) => [k, { water: M.counts.water, land: M.counts.land, waterVsLand: M.colour.waterVsLand, waterVsBlockedLand: M.colour.waterVsBlockedLand, minWaterToLandSample: M.colour.minWaterToLandSample, landLikeWater: M.lookAlike.landLikeWater, waterLikeLand: M.lookAlike.waterLikeLand, landSamples: M.counts.land, waterSamples: M.counts.water,
    labels: M.labelSummary, waterClick: M.clicks && M.clicks.waterFeedback }]));
  S.seconds = Math.round((Date.now() - t0) / 1000);
  B.writeJSON("affordance-audit.json", out);
  await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
