// BLOOM — the guided training's callout (BLOOM-028D2). docs/GUIDED_TRAINING_v1.md §7–§9.
//
// CALLOUT PRESENTATION ONLY. One instructional card placed beside the real control (or map point) the current lesson names, a
// restrained ring around it, an optional leader line, a polite live region, and Skip Tutorial at all times. It knows nothing about
// the game: what to say and when to move on is the director's (./training-director.js); what the lesson points at is the step
// script's (./training-steps.js). It never clicks, focuses or changes anything in the run; every element but the card itself is
// pointer-events:none, so the target stays fully visible and clickable.
//
//   import { TrainingCoach, placeCard } from "<repo>/resources/training/training-coach.js";
//   const coach = new TrainingCoach({ onSkip, geometry: { regionPoint, regionRect, regionIndex, bubblePoint }, reducedMotion });
//   coach.show({ id, index, total, title, body, status, ack, targets, keepClear });  // a new lesson (announced) or the same one, updated
//   coach.hide();  coach.dispose();
//
// TARGETS are descriptions, never elements (./training-steps.js): { anchor } a frozen data-tutorial name · { control } a real production
// control without an anchor (CONTROLS below: the only production selectors this layer knows) · { region } / { bubble } map geometry
// from the Planet View (regionPoint / regionRect, renderer.clientOf) · { any: [...] } the first of several that is on screen. Every
// animation frame each one is looked up AGAIN (rooms and the report re-render their buttons; a resize re-lays the map out), so no DOM
// reference outlives a frame. A target that is not on screen now (a hidden room's pre-mounted anchor, an inert Planet View under a room,
// a zero-size box) does not resolve: the coach never points at something the player cannot use.
//
// PLACEMENT (placeCard, pure; Node-tested): ≥ 900 px wide — beside the primary target (right, left, below, above) or docked at a
// corner, whichever covers the least of the targets (heavily weighted), then of the keep-clear controls, then is nearest; always inside
// the viewport with a 16 px gutter, flipping sides when there is no room. < 900 px — docked full width (≤ 560 px) at the bottom, or the
// top when the target is down there. Re-placed every frame while shown; styles are written only when something moved.
// MOTION: reducedMotion() true / false forces it, null follows the OS. Reduced: no pulse, no glide, no entrance lift (opacity only).
// ACCESSIBILITY: the card is a labelled region with a real heading; a polite live region reads each new lesson (and an acknowledgement);
// Skip Tutorial is a real button, always keyboard-reachable; focus is never taken on a step change (only the very first callout may
// take it, when nothing else has focus, so it is announced — never trapped).

export const PLACE = Object.freeze({ gap: 14, margin: 16, narrow: 900, width: 340, dockMax: 560 });
/** The real production controls the lessons may point at that carry no data-tutorial anchor (presentation selectors only). */
export const CONTROLS = Object.freeze({
  "tool": n => `#pv .pv-tool[data-tool="${n}"]`,                                          // Planet View: Regions / Adapt / Spread / Terraform
  "room-nav": n => `#dr .dr-room:not([hidden]) .rn[data-go="${n}"]`,                       // the open room's tab to another room
  "room-resume": () => `#dr .dr-room:not([hidden]) .rb.resume`,                            // the open room's Resume
  "help": id => `#pvBanner .hb[data-item="${id}"], #dr .dr-room:not([hidden]) .hbtn[data-item="${id}"]`, // a real "Would help" button
  "banner-inspect": () => `#pvBanner .bn-a > [data-go="region"]`,                          // the selected-region banner's Inspect region
  "tab": n => `#dr .dr-room:not([hidden]) #drtab-${n}`,                                    // Region Inspect: Overview / Colony / Science
  "room-effect": () => `#dr .dr-room:not([hidden]) .z-map .mm-ctx`,                         // the open room's real "Region effect of this choice" readout
  "room-preview": () => `#dr .dr-room:not([hidden]) .z-focus`,                             // the open room's real preview column (specimen / sky, the node's effect)
  "popover": () => `#pv .pv-pop:not([hidden])`,                                           // an open Planet View popover (run menu, Map View): never covered
  "room-header": () => `#dr .dr-room:not([hidden]) .rh`,                                   // the open room's header: Back, the room tabs, Resume (always reachable)
  "hud-tools": () => `#pv:not(.in-room) .pv-tools`,                                        // the Planet View's Explore / Change tools (always reachable)
  "room-controls": () => `#dr .dr-room:not([hidden]) :is(button, [role="tab"])`,         // every control of the open room (keep-clear, all: true): nodes, tabs, focus / local options, strip chips — other honest routes stay usable
  "strip": (id, g) => { const i = g.regionIndex ? g.regionIndex(id) : -1; return i >= 0 ? `#dr .dr-room:not([hidden]) .mm-strip [data-r="${i}"]` : null; },
});
const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';

/**
 * Where the card goes. card { w, h }; primary: rect | null; others / keep: rects; view { width, height }.
 * → { left, top, width, side } — side "right" | "left" | "below" | "above" | "dock-…". Pure.
 */
export function placeCard(card, primary, others, keep, view, { gap = PLACE.gap, margin = PLACE.margin, narrow = PLACE.narrow, dockMax = PLACE.dockMax } = {}) {
  const vw = view.width, vh = view.height, T = [primary, ...(others || [])].filter(okRect), K = (keep || []).filter(okRect), P = okRect(primary) ? primary : null;
  const score = (box, extra) => cost(box, P, T, K) + extra;
  if (vw < narrow) { // narrow window: docked full width at the bottom, or the top when the target sits low
    const w = Math.min(dockMax, vw - 2 * margin), h = card.h, left = Math.round((vw - w) / 2);
    const cands = [{ side: "dock-bottom", left, top: vh - margin - h }, { side: "dock-top", left, top: margin }];
    let best = null; for (const c of cands) { const b = box(c.left, c.top, w, h), s = score(b, c.side === "dock-top" ? 1 : 0); if (!best || s < best.s) best = { ...c, s }; }
    return { left: best.left, top: Math.round(Math.max(margin, best.top)), width: w, side: best.side };
  }
  const w = Math.min(card.w, vw - 2 * margin), h = card.h;
  const clampX = x => Math.max(margin, Math.min(vw - margin - w, x)), clampY = y => Math.max(margin, Math.min(vh - margin - h, y));
  const cands = [];
  if (P) { const cx = (P.left + P.right) / 2, cy = (P.top + P.bottom) / 2;
    const beside = [{ side: "right", left: P.right + gap, top: cy - h / 2 }, { side: "left", left: P.left - gap - w, top: cy - h / 2 },
      { side: "below", left: cx - w / 2, top: P.bottom + gap }, { side: "above", left: cx - w / 2, top: P.top - gap - h }];
    for (const c of beside) {
      cands.push(c);
      // the same side, slid further out past any keep-clear control it would cover (the card then reads beside it, the leader stays)
      let d = { ...c }, moved = false;
      for (let k = 0; k < 4; k++) { const b0 = box(clampX(d.left), clampY(d.top), w, h), hit = K.find(r => overlap(b0, pad(r, 4)) > 0); if (!hit) break; moved = true;
        if (c.side === "above") d.top = hit.top - gap - h; else if (c.side === "below") d.top = hit.bottom + gap; else if (c.side === "left") d.left = hit.left - gap - w; else d.left = hit.right + gap; }
      if (moved) cands.push({ ...d, side: c.side });
    } }
  cands.push({ side: "dock-bottom-left", left: margin, top: vh - margin - h }, { side: "dock-bottom-right", left: vw - margin - w, top: vh - margin - h },
    { side: "dock-top-left", left: margin, top: margin }, { side: "dock-top-right", left: vw - margin - w, top: margin }, { side: "dock-bottom", left: (vw - w) / 2, top: vh - margin - h });
  let best = null;
  cands.forEach((c, order) => {
    // clamped into the viewport: the further it had to slide, the worse (sliding onto the target is priced by the overlap cost)
    const left = clampX(c.left), top = clampY(c.top), b = box(left, top, w, h), shift = Math.abs(left - c.left) + Math.abs(top - c.top);
    const near = P ? Math.hypot((left + w / 2) - (P.left + P.right) / 2, (top + h / 2) - (P.top + P.bottom) / 2) : 0;
    const s = score(b, shift * 0.6 + (P && c.side.startsWith("dock") ? 160 : 0) + near * 0.25 + order);
    if (!best || s < best.s) best = { left, top, side: c.side, s };
  });
  return { left: Math.round(best.left), top: Math.round(best.top), width: Math.round(w), side: best.side };
}
const box = (l, t, w, h) => ({ left: l, top: t, right: l + w, bottom: t + h });
function okRect(r) { return !!r && Number.isFinite(r.left) && Number.isFinite(r.top) && r.right > r.left && r.bottom > r.top; }
export function overlap(a, b) { return Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)); }
const pad = (r, p) => ({ left: r.left - p, top: r.top - p, right: r.right + p, bottom: r.bottom + p });
function cost(b, P, T, K) { let c = 0; if (P) c += overlap(b, pad(P, 10)) * 40; for (const r of T) if (r !== P) c += overlap(b, pad(r, 6)) * 8; for (const r of K) c += overlap(b, pad(r, 4)) * 3; return c; }

export class TrainingCoach {
  constructor({ root = document.body, onSkip = null, geometry = {}, reducedMotion = () => null, labels = {}, stylesheet = null } = {}) {
    this.root = root; this.onSkip = onSkip; this.g = geometry; this.reducedMotion = reducedMotion;
    this.labels = { kicker: "TRAINING", skip: "Skip Tutorial", region: "Training coach", progress: "Training progress", ...labels };
    this.model = null; this.visible = false; this.disposed = false; this._raf = 0; this._last = ""; this._shownOnce = false;
    this.stats = { shows: 0, updates: 0, places: 0, frames: 0, announces: [], lastPlace: null, primary: null, resolved: [] };
    // the stylesheet (once per page); `ready` resolves when it applies, so no callout is ever shown unstyled
    let link = document.querySelector("link[data-training-coach]");
    if (stylesheet && !link) { link = document.createElement("link"); link.rel = "stylesheet"; link.href = stylesheet; link.dataset.trainingCoach = ""; document.head.appendChild(link); }
    this.ready = !link || link.sheet ? Promise.resolve() : new Promise(res => { link.addEventListener("load", res, { once: true }); link.addEventListener("error", res, { once: true }); });
    const L = this.layer = document.createElement("div"); L.className = "tc-layer"; L.dataset.trainingCoach = "";
    L.style.cssText = "position:fixed; inset:0; pointer-events:none; z-index:500"; // (also in the stylesheet: never in the page's flow, never in the way)
    L.innerHTML = `<svg class="tc-leader" aria-hidden="true" focusable="false"></svg><div class="tc-marks" aria-hidden="true"></div>` +
      `<section class="tc-card" hidden role="region" aria-labelledby="tcTitle" tabindex="-1" data-coach="card">` +
        `<div class="tc-top"><span class="tc-kicker">${esc(this.labels.kicker)}</span><span class="tc-count"></span>` +
          `<button type="button" class="tc-skip" data-coach="skip">${esc(this.labels.skip)}</button></div>` +
        `<div class="tc-bar" role="progressbar" aria-label="${esc(this.labels.progress)}" aria-valuemin="1"><i></i></div>` +
        `<p class="tc-ack" hidden></p><h2 class="tc-title" id="tcTitle"></h2><p class="tc-body"></p><p class="tc-status"></p></section>` +
      `<div class="tc-live" aria-live="polite" aria-atomic="true"></div>`;
    root.appendChild(L);
    const q = s => L.querySelector(s);
    Object.assign(this, { card: q(".tc-card"), countEl: q(".tc-count"), bar: q(".tc-bar"), barFill: q(".tc-bar i"), ackEl: q(".tc-ack"), titleEl: q(".tc-title"),
      bodyEl: q(".tc-body"), statusEl: q(".tc-status"), marks: q(".tc-marks"), leader: q(".tc-leader"), live: q(".tc-live"), skipBtn: q(".tc-skip") });
    this._onSkip = () => { if (this.onSkip) this.onSkip(); };
    this.skipBtn.addEventListener("click", this._onSkip);
    this.mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    this._onMq = () => this._applyMotion(); if (this.mq && this.mq.addEventListener) this.mq.addEventListener("change", this._onMq);
    this._applyMotion();
    this._frame = () => { this._raf = 0; if (!this.visible || this.disposed) return; this.stats.frames++; this._place(false); this._raf = requestAnimationFrame(this._frame); };
  }

  get reduced() { const v = this.reducedMotion(); return v ?? !!(this.mq && this.mq.matches); }

  /** A new lesson (different id: announced, re-entered) or the current one updated (copy / status / targets; an ack change is announced). */
  show(m) {
    if (this.disposed) return;
    const fresh = !this.model || this.model.id !== m.id;
    this.model = { targets: [], keepClear: [], ...m }; this.visible = true; this._applyMotion();
    const c = this.card; c.hidden = false;
    this.countEl.textContent = m.total ? `Step ${m.index} of ${m.total}` : "";
    this.bar.setAttribute("aria-valuemax", String(m.total || 1)); this.bar.setAttribute("aria-valuenow", String(m.index || 1));
    this.bar.setAttribute("aria-valuetext", m.total ? `Step ${m.index} of ${m.total}` : "");
    this.barFill.style.width = m.total ? `${Math.round(100 * (m.index - 1) / m.total)}%` : "0%";
    const ackChanged = (this.ackEl.dataset.text || "") !== (m.ack || "");
    if (ackChanged) { this.ackEl.dataset.text = m.ack || ""; this.ackEl.innerHTML = m.ack ? CHECK + `<span>${esc(m.ack)}</span>` : ""; this.ackEl.hidden = !m.ack; }
    this.titleEl.textContent = m.title || ""; this.bodyEl.textContent = m.body || ""; this.statusEl.textContent = m.status || "";
    if (fresh) {
      this.stats.shows++;
      if (!this.reduced) { c.classList.remove("tc-in"); void c.offsetWidth; c.classList.add("tc-in"); } else c.classList.remove("tc-in");
      this._announce([m.ack, `Step ${m.index} of ${m.total}: ${m.title}.`, m.body].filter(Boolean).join(" "));
      // the very first callout may take focus so it is read — only when nothing else has it (never on later steps; never trapped)
      if (!this._shownOnce) { const a = document.activeElement; if (!a || a === document.body || a === document.documentElement) c.focus({ preventScroll: true }); }
      this._shownOnce = true;
    } else { this.stats.updates++; if (ackChanged && m.ack) this._announce(m.ack); }
    this._last = ""; this._place(true);
    if (!this._raf) this._raf = requestAnimationFrame(this._frame);
  }

  hide() { this.visible = false; this.model = null; this.card.hidden = true; this.marks.innerHTML = ""; this.leader.innerHTML = ""; if (this._raf) cancelAnimationFrame(this._raf); this._raf = 0; this._last = ""; }

  dispose() {
    if (this.disposed) return; this.hide(); this.disposed = true;
    this.skipBtn.removeEventListener("click", this._onSkip);
    if (this.mq && this.mq.removeEventListener) this.mq.removeEventListener("change", this._onMq);
    this.layer.remove();
  }

  /** Where a target is right now: { rect, round, el? } or null (looked up again on every call; nothing is kept). */
  locate(t) {
    if (!t) return null;
    if (t.any) { for (const x of t.any) { const r = this.locate(x); if (r) return { ...r, key: keyOf(x) }; } return null; }
    if (t.anchor || t.control) {
      let sel = null;
      if (t.anchor) sel = `[data-tutorial="${cssEsc(t.anchor)}"]`;
      else { const [k, arg] = String(t.control).split(/:(.*)/s), f = CONTROLS[k]; sel = f ? f(arg, this.g) : null; }
      if (!sel) return null;
      for (const el of document.querySelectorAll(sel)) { const r = shownRect(el); if (r) return { rect: r, round: false, el }; }
      return null;
    }
    if (t.region) {
      if (!this._mapShown()) return null;
      const p = this.g.regionPoint && this.g.regionPoint(t.region), rr = this.g.regionRect && this.g.regionRect(t.region); if (!p) return null;
      const rad = Math.max(22, Math.min(64, rr ? Math.min(rr.width, rr.height) * 0.32 : 30));
      return onScreen({ left: p.x - rad, top: p.y - rad, right: p.x + rad, bottom: p.y + rad }, true);
    }
    if (t.bubble !== undefined) {
      if (!this._mapShown()) return null;
      const p = this.g.bubblePoint && this.g.bubblePoint(t.bubble); if (!p) return null;
      return onScreen({ left: p.x - 20, top: p.y - 20, right: p.x + 20, bottom: p.y + 20 }, true);
    }
    return null;
  }

  /** Every on-screen element a control / anchor description matches (keep-clear areas made of several controls). */
  locateAll(t) {
    let sel = null;
    if (t.anchor) sel = `[data-tutorial="${cssEsc(t.anchor)}"]`;
    else if (t.control) { const [k, arg] = String(t.control).split(/:(.*)/s), f = CONTROLS[k]; sel = f ? f(arg, this.g) : null; }
    return sel ? [...document.querySelectorAll(sel)].map(shownRect).filter(Boolean) : [];
  }

  // ---------------------------------------------------------------- internals
  _mapShown() { const m = document.querySelector('#pvMap[data-tutorial="map"]'); return !!(m && !m.closest("[inert]") && !document.querySelector("#pv.in-room") && !(document.querySelector("#rr") && !document.querySelector("#rr").hidden)); }
  _applyMotion() { this.layer.classList.toggle("tc-rm", !!this.reduced); }
  _announce(text) { if (!text) return; this.live.textContent = text; this.stats.announces.push(text); if (this.stats.announces.length > 80) this.stats.announces.shift(); }

  _place(force) {
    const m = this.model; if (!m) return;
    const found = (m.targets || []).map(t => ({ t, at: this.locate(t) })).filter(f => f.at);
    const prim = found[0] || null, others = found.slice(1);
    const keep = [];
    for (const k of m.keepClear || []) { const t = typeof k === "string" ? { anchor: k } : k;
      if (t.all) keep.push(...this.locateAll(t)); else { const a = this.locate(t); if (a) keep.push(a.rect); } }
    const view = { width: document.documentElement.clientWidth || innerWidth, height: document.documentElement.clientHeight || innerHeight };
    const narrow = view.width < PLACE.narrow, w = narrow ? Math.min(PLACE.dockMax, view.width - 2 * PLACE.margin) : Math.min(PLACE.width, view.width - 2 * PLACE.margin);
    if (this.card.style.width !== w + "px") this.card.style.width = w + "px";
    const size = { w, h: this.card.offsetHeight };
    const p = placeCard(size, prim ? prim.at.rect : null, others.map(o => o.at.rect), keep, view);
    const sig = JSON.stringify([p, size.h, found.map(f => [keyOf(f.t), r4(f.at.rect)])]);
    if (!force && sig === this._last) return;
    this._last = sig; this.stats.places++;
    this.stats.lastPlace = { ...p, h: size.h, view };
    this.stats.primary = prim ? { key: prim.at.key || keyOf(prim.t), rect: r4(prim.at.rect) } : null;
    this.stats.resolved = found.map(f => ({ key: f.at.key || keyOf(f.t), rect: r4(f.at.rect) }));
    const c = this.card.style; c.left = p.left + "px"; c.top = p.top + "px";
    this.card.dataset.side = p.side; this.card.dataset.target = prim ? (prim.at.key || keyOf(prim.t)) : "";
    // rings (the coach's own elements, rebuilt from the descriptions; pointer-events:none, drawn OUTSIDE the target's box)
    let html = "";
    found.forEach((f, k) => { const r = f.at.rect, g = f.at.round ? 3 : 5;
      html += `<div class="tc-ring${f.at.round ? " tc-round" : ""}${k ? " tc-secondary" : ""}" data-ring="${esc(f.at.key || keyOf(f.t))}" style="left:${Math.round(r.left - g)}px;top:${Math.round(r.top - g)}px;width:${Math.round(r.right - r.left + 2 * g)}px;height:${Math.round(r.bottom - r.top + 2 * g)}px"></div>`; });
    this.marks.innerHTML = html;
    // leader: from the card's nearest edge to the primary target's edge, when the card sits beside it (not docked)
    let lead = "";
    if (prim && !p.side.startsWith("dock")) {
      const r = prim.at.rect, cb = box(p.left, p.top, p.width, size.h), tx = clamp((r.left + r.right) / 2, r.left, r.right), ty = clamp((r.top + r.bottom) / 2, r.top, r.bottom);
      const sx = clamp(tx, cb.left + 12, cb.right - 12), sy = clamp(ty, cb.top + 12, cb.bottom - 12);
      const ex = clamp(sx, r.left - 6, r.right + 6), ey = clamp(sy, r.top - 6, r.bottom + 6);
      if (Math.hypot(ex - sx, ey - sy) > 18) lead = `<line x1="${Math.round(sx)}" y1="${Math.round(sy)}" x2="${Math.round(ex)}" y2="${Math.round(ey)}"/><circle cx="${Math.round(ex)}" cy="${Math.round(ey)}" r="4"/>`;
    }
    this.leader.innerHTML = lead;
  }
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r4 = r => [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)];
const keyOf = t => t.anchor ? "anchor:" + t.anchor : t.control ? "control:" + t.control : t.region ? "region:" + t.region : t.bubble !== undefined ? "bubble:" + t.bubble : t.any ? "any" : "target";
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function cssEsc(s) { return String(s).replace(/["\\]/g, "\\$&"); }
/** the element's box when the player can see and use it now: connected, not inside [hidden] / [inert] / aria-hidden, non-empty, on screen */
function shownRect(el) {
  if (!el.isConnected || el.closest("[hidden],[inert],[aria-hidden='true']")) return null;
  const b = el.getBoundingClientRect(); if (b.width < 2 || b.height < 2) return null;
  const cs = getComputedStyle(el); if (cs.visibility === "hidden" || cs.display === "none") return null;
  const o = onScreen({ left: b.left, top: b.top, right: b.right, bottom: b.bottom }, false); return o ? o.rect : null;
}
function onScreen(r, round) {
  const vw = document.documentElement.clientWidth || innerWidth, vh = document.documentElement.clientHeight || innerHeight;
  if (r.right < 0 || r.bottom < 0 || r.left > vw || r.top > vh) return null;
  return { rect: r, round };
}
