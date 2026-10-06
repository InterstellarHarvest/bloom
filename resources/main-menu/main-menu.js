// BLOOM — Main Menu screen (BLOOM-028C): the opening title. One of twelve hand-painted backgrounds, the title STRANGE BLOOM /
// UNKNOWN SOILS and the menu (BEGIN EXPEDITION · TRAINING · SETTINGS · CREDITS) as real HTML over it, with small dialogs for
// Training (a placeholder until tutorial gameplay exists), Settings (motion) and Credits.
//
//   import { MainMenu } from "<repo>/resources/main-menu/main-menu.js";
//   const menu = new MainMenu(root, { onBegin() { … } });
//   await menu.shown;                 // the painting is decoded and fading in (the plaque is up at once)
//   await menu.recede();              // title / menu recede (leaving for the survey) …
//   menu.hide();                      // … then hidden under cover; later
//   menu.show();                      // back: a NEW painting (never the one just shown), the entrance replays
//   menu.show({ settled: true });     // … or appears at rest (no entrance, no painting fade): shown under a cover that lifts (028C1)
//   menu.dispose();
//
// This screen knows nothing about the Destination Survey, planets or transitions: ExpeditionEntry (./expedition-entry.js) owns
// the flow. No WebGL, no workers, no canvas here.
//
// BACKGROUND RULE. Every show (page load or a return from the survey) picks a painting at random, never the one just shown
// (across reloads too, via sessionStorage). The next painting is chosen and preloaded while the current one is up, so a return
// swaps instantly; only two of the twelve files are ever requested per visit.
import { TITLE, SUBTITLE, BACKGROUNDS, pickBackground, MOTION_OPTIONS, readSettings, writeSettings, reducedMotionFor } from "./main-menu-data.js";

const EASE = "cubic-bezier(.2,.8,.2,1)";
const T = { recede: 220, recedeRm: 110 };
const LAST_KEY = "strange-bloom.menu.last-background";
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const ITEMS = [
  { id: "begin", label: "Begin Expedition", primary: true },
  { id: "training", label: "Training" },
  { id: "settings", label: "Settings" },
  { id: "credits", label: "Credits" },
];

export class MainMenu {
  /**
   * root               the screen element (any sized box)
   * reducedMotion      null follows prefers-reduced-motion; true / false force it (the Settings motion choice)
   * background         force a painting index 0 … 11 (development / QA); default: the random rule above
   * previous           the index to avoid on the first show (default: the last one shown in this tab, from sessionStorage)
   * rng                () → [0, 1) for the picks (QA)
   * onBegin()          BEGIN EXPEDITION
   * onTraining()       TRAINING — the tutorial hook. Omitted: the "not yet open" placeholder dialog
   * onSettingsChange(settings)  after a setting changed (already persisted)
   * baseUrl            where "resources/main-menu/backgrounds/…" resolves from (default: this module's repository root)
   * storage / session  Storage-like objects for settings / the last background (default: localStorage / sessionStorage)
   */
  constructor(root, { reducedMotion = null, background = null, previous = undefined, rng = Math.random, onBegin = null, onTraining = null, onSettingsChange = null,
    baseUrl = new URL("../../", import.meta.url), storage = undefined, session = undefined } = {}) {
    if (!root || typeof root.appendChild !== "function") throw new TypeError("MainMenu: root must be a DOM element");
    this.root = root; this.onBegin = onBegin; this.onTraining = onTraining; this.onSettingsChange = onSettingsChange; this.rng = rng; this.baseUrl = baseUrl;
    this.storage = storage === undefined ? safe(() => globalThis.localStorage) : storage;
    this.session = session === undefined ? safe(() => globalThis.sessionStorage) : session;
    this.mq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    this.settings = readSettings(this.storage);
    this.forcedReducedMotion = reducedMotion;
    this.state = "shown"; this.background = null; this.next = null; this._preload = null;
    this.stats = { shows: 0, begins: 0, loads: [], preloads: 0, dialogs: 0 };
    this._build();
    this._applyMotionClass();
    const prev = previous !== undefined ? previous : this._lastShown();
    this.shown = this._show(Number.isInteger(background) ? Math.max(0, Math.min(BACKGROUNDS.length - 1, background)) : pickBackground(prev, this.rng));
  }

  get reducedMotion() { return this.forcedReducedMotion ?? !!(this.mq && this.mq.matches); }
  get title() { return TITLE; }
  get subtitle() { return SUBTITLE; }

  // ---------------------------------------------------------------- public
  /** Status line under the plaque's column (e.g. the first sector preparing). Empty hides it. */
  setStatus(text) { this.statusEl.textContent = text || ""; }

  /** The Settings motion choice took effect (null follows the OS; true / false force). */
  setReducedMotion(v) { this.forcedReducedMotion = v; this._applyMotionClass(); }

  /** Leaving: the plaque and status recede (opacity + a short rise; opacity only under reduced motion). Resolves when done. */
  recede() {
    if (this.state !== "shown") return Promise.resolve();
    this.state = "receded"; this._closeDialog();
    const rm = this.reducedMotion, dur = rm ? T.recedeRm : T.recede, opts = { duration: dur, easing: EASE, fill: "forwards" };
    this._recedeAnims = [this.plaque.animate([{ opacity: 1, translate: "0 0" }, { opacity: 0, translate: rm ? "0 0" : "0 -14px" }], opts),
      this.statusEl.animate([{ opacity: 1 }, { opacity: 0 }], opts)];
    return Promise.all(this._recedeAnims.map(a => a.finished.catch(() => {}))).then(() => { if (this.state === "receded") this.root.classList.add("is-receded"); });
  }

  /** Hidden (display: none) — under cover. The DOM stays; the painting element keeps nothing but its last src. */
  hide() { if (this.state === "disposed") return; this.state = "hidden"; this._closeDialog(); this.root.style.display = "none"; }

  /**
   * Show again (after hide / recede): a NEW painting — the one already preloaded — and the entrance replays; focus lands on
   * BEGIN EXPEDITION. `rotate: false` keeps the current painting (used when a departure was aborted before anything changed).
   * `settled: true` (the consumer shows it under a cover that then lifts): no entrance replay and the painting appears without
   * its fade — the screen is complete the moment the painting is decoded. Resolves when the painting is decoded and shown.
   */
  show({ rotate = true, settled = false } = {}) {
    if (this.state === "disposed") return Promise.resolve();
    for (const a of this._recedeAnims || []) a.cancel(); this._recedeAnims = null;
    this.root.classList.remove("is-receded"); this.root.classList.toggle("is-settled", settled); this.root.style.display = "";
    this.state = "shown";
    if (!settled) this._replayEntrance();
    const p = rotate || !this.background ? this._show(this.next ? this.next.index : pickBackground(this.background ? this.background.index : null, this.rng)) : Promise.resolve(this.background);
    this.focusMenu();
    return (this.shown = p);
  }

  focusMenu() { const b = this.items.begin; if (b && this.state === "shown") b.focus({ preventScroll: true }); }

  /** Open Training / Settings / Credits as a modal; focus returns to `opener` (default: the active element) when it closes. */
  openDialog(name, opener = document.activeElement) { const d = this.dialogs[name]; if (!d || this.state !== "shown") return false; this._opener = opener; this.stats.dialogs++; d.showModal(); return true; }

  dispose() {
    if (this.state === "disposed") return;
    this.state = "disposed"; this._closeDialog();
    for (const a of this.root.getAnimations({ subtree: true })) a.cancel();
    this.root.removeEventListener("click", this._onClick); this.root.removeEventListener("keydown", this._onKey);
    this.art.removeAttribute("src"); this._preload = null; this.next = null;
    this.root.replaceChildren(); this.root.classList.remove("mm", "rm", "motion-full", "is-receded", "is-settled"); this.root.style.display = "";
  }

  // ---------------------------------------------------------------- the painting
  _url(index) { return new URL(BACKGROUNDS[index], this.baseUrl).href; }

  /** Load painting `index` into the one <img>, fade it in once decoded, remember it, then choose and preload the next one. */
  _show(index) {
    const img = this.art, t0 = performance.now(), src = this._url(index);
    this.background = { index, src }; this.stats.shows++;
    img.classList.remove("is-shown"); img.src = src;
    const done = () => { if (this.state === "disposed" || this.background.index !== index) return this.background;
      img.classList.add("is-shown"); this.stats.loads.push({ index, ms: Math.round(performance.now() - t0) }); this._remember(index); this._preloadNext(index); return this.background; };
    return (img.decode ? img.decode() : Promise.resolve()).then(done, done); // (a decode() rejection — src changed mid-decode — still shows what the browser has)
  }

  /** Choose the painting a later show() will use (never this one) and let the browser fetch + decode it now. */
  _preloadNext(current) {
    const index = pickBackground(current, this.rng), src = this._url(index), pre = new Image();
    pre.decoding = "async"; pre.src = src; if (pre.decode) pre.decode().catch(() => {});
    this._preload = pre; this.next = { index, src }; this.stats.preloads++;
  }

  _lastShown() { const v = safe(() => this.session && this.session.getItem(LAST_KEY)); const n = v == null ? NaN : +v; return Number.isInteger(n) ? n : null; }
  _remember(index) { safe(() => this.session && this.session.setItem(LAST_KEY, String(index))); }

  // ---------------------------------------------------------------- DOM
  _build() {
    const r = this.root;
    r.classList.add("mm");
    if (!r.hasAttribute("aria-label")) r.setAttribute("aria-label", `${TITLE}: main menu`);
    r.innerHTML = `
      <div class="mm-bg" aria-hidden="true"><img class="mm-art" alt="" decoding="async"></div>
      <section class="mm-plaque" aria-labelledby="mm-title">
        <span class="mm-corner tl" aria-hidden="true"></span><span class="mm-corner tr" aria-hidden="true"></span><span class="mm-corner bl" aria-hidden="true"></span><span class="mm-corner br" aria-hidden="true"></span>
        <div class="mm-plaque-inner">
          <header class="mm-title"><h1 id="mm-title">${TITLE.split(" ").map(w => `<span>${esc(w)}</span>`).join(" ")}</h1><p class="mm-sub">${esc(SUBTITLE)}</p></header>
          <ul class="mm-nav" aria-label="Main menu">${ITEMS.map((it, i) => `<li style="--i:${i}"><button type="button" class="mm-item${it.primary ? " primary" : ""}" data-act="${it.id}">${esc(it.label)}</button></li>`).join("")}</ul>
        </div>
      </section>
      <p class="mm-status" role="status" aria-live="polite"></p>
      <dialog class="mm-dialog" data-dialog="training" aria-labelledby="mm-dlg-training"><div class="mm-dialog-body">
        <h2 id="mm-dlg-training">Training</h2><p class="lede">Not yet open</p>
        <p>The training expedition — a guided first landing on a hand-made world — is not ready for recruits yet.</p>
        <p class="mm-note">Placeholder: tutorial gameplay arrives in a later milestone. Begin Expedition is the way out onto unknown soils for now.</p>
        <div class="mm-dialog-actions"><button type="button" class="mm-btn" data-act="close">Back to menu</button></div></div></dialog>
      <dialog class="mm-dialog" data-dialog="settings" aria-labelledby="mm-dlg-settings"><div class="mm-dialog-body">
        <h2 id="mm-dlg-settings">Settings</h2><p class="lede">Expedition preferences</p>
        <fieldset><legend>Motion</legend>${MOTION_OPTIONS.map(m => `<label class="mm-choice"><input type="radio" name="mm-motion" value="${m.id}"><span><b>${esc(m.label)}</b><small>${esc(m.hint)}</small></span></label>`).join("")}</fieldset>
        <div class="mm-rule"></div>
        <p>Motion covers the menu, the atmosphere between screens and the turning worlds of the Destination Survey. Nothing is switched off by reducing it.</p>
        <div class="mm-dialog-actions"><button type="button" class="mm-btn" data-act="close">Done</button></div></div></dialog>
      <dialog class="mm-dialog" data-dialog="credits" aria-labelledby="mm-dlg-credits"><div class="mm-dialog-body">
        <h2 id="mm-dlg-credits">Credits</h2><p class="lede">${esc(TITLE)} · ${esc(SUBTITLE)}</p>
        <dl class="mm-credits">
          <dt>A BLOOM project</dt><dd>Design, worlds, simulation and code by the BLOOM project team.</dd>
          <dt>Menu paintings</dt><dd>Twelve hand-painted expedition vistas by the project's owner.</dd>
          <dt>Open source</dt><dd>Three.js r185.1 (MIT) draws the globes of the Destination Survey.</dd>
        </dl>
        <div class="mm-dialog-actions"><button type="button" class="mm-btn" data-act="close">Back to menu</button></div></div></dialog>`;
    const q = s => r.querySelector(s);
    this.art = q(".mm-art"); this.plaque = q(".mm-plaque"); this.nav = q(".mm-nav"); this.statusEl = q(".mm-status"); this.titleEl = q("#mm-title");
    this.items = Object.fromEntries(ITEMS.map(it => [it.id, q(`[data-act="${it.id}"]`)]));
    this.dialogs = Object.fromEntries([...r.querySelectorAll("dialog")].map(d => [d.dataset.dialog, d]));
    for (const d of Object.values(this.dialogs)) d.addEventListener("close", () => { const o = this._opener; this._opener = null; if (o && o.isConnected && this.state === "shown") o.focus({ preventScroll: true }); });
    const radios = [...r.querySelectorAll('input[name="mm-motion"]')];
    for (const x of radios) { x.checked = x.value === this.settings.motion; x.addEventListener("change", () => this._setMotion(x.value)); }
    this._onClick = e => {
      const b = e.target.closest("button"); if (!b || !r.contains(b)) return;
      const act = b.dataset.act;
      if (act === "close") this._closeDialog();
      else if (act === "begin") { if (this.state === "shown") { this.stats.begins++; if (this.onBegin) this.onBegin(this); } }
      else if (act === "training") { if (this.onTraining) this.onTraining(this); else this.openDialog("training", b); }
      else if (act === "settings" || act === "credits") this.openDialog(act, b); // (the button itself: a click need not have focused it)
    };
    this._onKey = e => { // menu list: ↑ ↓ Home End move between entries (Enter / Space activate the focused button natively)
      const cur = e.target.closest ? e.target.closest(".mm-item") : null; if (!cur || e.altKey || e.ctrlKey || e.metaKey) return;
      const all = [...this.nav.querySelectorAll(".mm-item")], i = all.indexOf(cur); if (i < 0) return;
      const to = e.key === "ArrowDown" ? all[(i + 1) % all.length] : e.key === "ArrowUp" ? all[(i - 1 + all.length) % all.length] : e.key === "Home" ? all[0] : e.key === "End" ? all[all.length - 1] : null;
      if (to) { e.preventDefault(); to.focus(); }
    };
    r.addEventListener("click", this._onClick); r.addEventListener("keydown", this._onKey);
  }

  _setMotion(id) {
    this.settings = writeSettings(this.storage, { motion: id });
    this.setReducedMotion(reducedMotionFor(this.settings.motion));
    if (this.onSettingsChange) this.onSettingsChange({ ...this.settings });
  }

  _applyMotionClass() { this.root.classList.toggle("rm", this.forcedReducedMotion === true); this.root.classList.toggle("motion-full", this.forcedReducedMotion === false); }

  _closeDialog() { for (const d of Object.values(this.dialogs || {})) if (d.open) d.close(); }

  /** Restart the CSS entrance animations (plaque, entries, status) for a renewed show. */
  _replayEntrance() {
    for (const el of [this.plaque, this.statusEl, ...this.nav.querySelectorAll("li")]) { el.style.animation = "none"; void el.offsetWidth; el.style.animation = ""; }
  }
}

function safe(f) { try { return f(); } catch { return null; } }
