// BLOOM — the training run's own layer (BLOOM-028D1 foundation; BLOOM-028D2 guided training; BLOOM-033 one layer per training SESSION).
// Training is a RUN configuration, not a page: the app (index.html, resources/app/app-controller.js) creates a training GameSession and
// mounts this layer over it; the developer harness (demos/demo-run.html ?training=1) does the same. It owns what a training run does
// beyond an ordinary run:
//   · the arrival: the run is created under black (the app's fade layer; in the harness the page's #trainingCover, put up before the
//     first paint) and the black lifts once the run's first frames are drawn — the other half of the title's fade;
//   · the exits: Restart training · Skip training (records "skipped") · Main menu · (028D2) the finished training's Begin Expedition —
//     each fades to black first, then hands the action to the app (`onAction`: a fresh training session, the title, the Destination
//     Survey — all inside index.html). Without `onAction` (the harness) the historical navigation applies: Restart = this page again,
//     the others = the return URL (Begin Expedition with begin=1);
//   · the training status: a win records "completed" (./training-store.js), which is never downgraded;
//   · the motion setting: the title's Settings choice (main-menu-data.js), else the OS;
//   · (028D2) the GUIDED TRAINING on the production run UI: once the black has lifted, a TrainingDirector runs the thirteen lessons of
//     ./training-steps.js against the real run and drives a TrainingCoach callout (docs/GUIDED_TRAINING_v1.md). The coach observes the
//     bloom:* events and the run UI adapter's reads and points at real controls; the player does every action. Not mounted under the
//     developer flag ?ui=legacy (no production view) — the foundation's own shell oracle (tools/training-check.js B2);
//   · (028D2) ONE confirmation before a guided training is skipped — the coach's Skip Tutorial and the run menu's Skip training take
//     this same path (a production dialog, never window.confirm). Cancel keeps the same lesson. Restart / Main menu ask nothing.
//
//   const layer = mountTraining(session, { fader, onAction })   // also window.BLOOM_TRAINING_UI while it lives; session.dispose() disposes it
//   layer.go("restartTraining" | "skipTraining" | "mainMenu" | "beginExpedition")   (the session's training actions come here)
//   layer.status()        → the stored training record
//   layer.stats           → { liftedAt, leaving, lastAction, skipDialog: { opened, kept, confirmed } } (QA)
//   layer.guide           → { director, coach, mounted, mount(), unmount() } (QA: director.log / current / events)
//   layer.lifted          → Promise: the arrival black has lifted (and the guide mounted)
import { readSettings, reducedMotionFor } from "../main-menu/main-menu-data.js";
import { BlackFade } from "../main-menu/black-fade.js";
import { readTraining, writeTraining } from "./training-store.js";
import { TrainingCoach } from "./training-coach.js";
import { TrainingDirector } from "./training-director.js";
import { trainingSteps, KEEP_CLEAR } from "./training-steps.js";

const ACTIONS = new Set(["restartTraining", "skipTraining", "mainMenu", "beginExpedition"]);
const frame = () => new Promise(r => requestAnimationFrame(() => r()));
const COACH_CSS = new URL("./training-coach.css", import.meta.url).href;

/**
 * Mount the training layer over a training GameSession.
 *   fader      { fade(to, reducedMotion) → Promise } — the black the arrival lifts and the exits fade into (the app's). Omitted (harness):
 *              the page's #trainingCover (created clear if it is gone).
 *   onAction   the app's training actions, called at full black with the action id. Omitted (harness): the historical navigation.
 *   storage    Storage for settings and the training record (default localStorage; a blocked one degrades: nothing is recorded)
 */
export function mountTraining(session, { fader = null, onAction = null, storage = safe(() => globalThis.localStorage) } = {}) {
  if (!session || !session.run || !session.run.training) throw new TypeError("mountTraining: needs a training GameSession");
  const run = session.run, T = run.training, life = new AbortController(), LIFE = { signal: life.signal };
  const reducedMotion = () => reducedMotionFor(readSettings(storage).motion);   // null: follow the OS (read by the fade itself)
  const stats = { liftedAt: null, leaving: false, lastAction: null, skipDialog: { opened: 0, kept: 0, confirmed: 0, open: false } };
  const COPY = (globalThis.BLOOM_DATA && BLOOM_DATA.training && BLOOM_DATA.training.copy) || {};
  const SKIP = { title: "Skip training?", body: "You can start it again any time from the main menu.", keep: "Keep training", skip: "Skip training", ...(COPY.skipConfirm || {}) };
  let disposed = false;

  // the harness's black: the boot's arrival cover, claimed here (the harness drops it by itself if this module never loads)
  if (!fader) {
    let cover = document.getElementById("trainingCover");
    if (!cover) { cover = document.createElement("div"); cover.id = "trainingCover"; cover.className = "training-cover"; cover.style.cssText = "opacity:0; display:none"; document.body.appendChild(cover); }
    cover.dataset.owner = "training";
    fader = new BlackFade(cover);
  }

  // ---------------------------------------------------------------- (028D2) the guided training
  const guide = {
    director: null, coach: null, mounted: false,
    /** The coach + director over THIS run: production run UI only, training only, not after the win. Idempotent. */
    mount() {
      const A = session.adapter, pv = session.planetView, ui = session.runUI;
      if (disposed || guide.mounted || stats.leaving || !A || !pv || !document.documentElement.classList.contains("ui18") || A.run().won) return false;
      const idx = {}; A.map().regions.forEach(r => { idx[r.id] = r.index; });
      const coach = guide.coach = new TrainingCoach({ onSkip: () => go("skipTraining"), reducedMotion, stylesheet: COACH_CSS,
        geometry: { regionPoint: id => pv.regionPoint(id), regionRect: id => pv.regionRect(id), regionIndex: id => idx[id] ?? -1,
          bubblePoint: tile => { const b = A.bubbles().find(x => x.tile === tile); return b ? pv.renderer.clientOf(b.x, b.y) : null; } } });
      guide.director = new TrainingDirector({ steps: trainingSteps(), adapter: A, coach, keepClear: KEEP_CLEAR, growThresh: T.config.grow.growThresh,
        hooks: { placeBubble: id => ui.placeBubble(id) }, readUi,
        onFinish: outcome => { if (outcome === "completed") coach.hide(); } });
      guide.mounted = true;
      const d = guide.director; coach.ready.then(() => { if (guide.director === d && !stats.leaving && !disposed) d.start(); });   // the first callout only once its styles apply
      return true;
    },
    /** Remove the coach and stop the director (no listener, timer, observer or element left behind). */
    unmount() { if (!guide.mounted) return false; guide.director.dispose(); guide.coach.dispose(); guide.director = guide.coach = null; guide.mounted = false; return true; },
  };
  // the rooms' presentation state (decision-rooms controller.state(): room, context, swap lock) and Region Inspect's selected tab
  function readUi() {
    const dr = session.rooms, s = dr ? dr.state() : null;
    const tab = s && s.room === "region" ? document.querySelector('#dr .dr-room[data-room="region"] [role="tab"][aria-selected="true"]') : null;
    return { room: s ? s.room : null, context: s && s.room ? s.contextId : null, tab: tab ? tab.id.replace(/^drtab-/, "") : null, transitioning: !!(s && s.transitioning) };
  }

  // ---------------------------------------------------------------- (028D2) the one Skip confirmation (a production dialog)
  let skipping = null, skipDialog = null;
  function confirmSkip() {
    if (skipping) return skipping;
    stats.skipDialog.opened++; stats.skipDialog.open = true;
    const opener = document.activeElement, pv = document.getElementById("pv"), layer = guide.coach && guide.coach.layer;
    const madeInert = [pv, layer].filter(x => x && !x.inert); madeInert.forEach(x => { x.inert = true; });
    const d = skipDialog = document.createElement("div"); d.className = "tsk"; d.dataset.trainingSkip = "";
    d.innerHTML = `<div class="tsk-card" role="alertdialog" aria-modal="true" aria-labelledby="tskTitle" aria-describedby="tskBody">` +
      `<h2 id="tskTitle">${esc(SKIP.title)}</h2><p id="tskBody">${esc(SKIP.body)}</p>` +
      `<div class="tsk-acts"><button type="button" class="tsk-btn" data-skip="keep">${esc(SKIP.keep)}</button><button type="button" class="tsk-btn primary" data-skip="skip">${esc(SKIP.skip)}</button></div></div>`;
    document.body.appendChild(d);
    const btns = [...d.querySelectorAll("button")];
    return (skipping = new Promise(resolve => {
      const done = ok => { d.remove(); skipDialog = null; madeInert.forEach(x => { x.inert = false; }); stats.skipDialog.open = false; skipping = null;
        if (ok) stats.skipDialog.confirmed++; else { stats.skipDialog.kept++; if (opener && opener.isConnected && !opener.closest("[inert]")) opener.focus({ preventScroll: true }); }
        resolve(ok); };
      d.addEventListener("click", e => { const b = e.target.closest("[data-skip]"); if (b) done(b.dataset.skip === "skip"); });
      d.addEventListener("keydown", e => {
        if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); done(false); return; }
        if (e.key !== "Tab") return; const i = btns.indexOf(document.activeElement); e.preventDefault();
        btns[(i + (e.shiftKey ? btns.length - 1 : 1)) % btns.length].focus();
      });
      btns[0].focus({ preventScroll: true });   // the safe default: Keep training
    }));
  }

  async function go(action) {
    if (disposed || !ACTIONS.has(action) || stats.leaving) return false;
    if (action === "skipTraining" && guide.mounted && !(await confirmSkip())) return false;   // (028D2) cancel: the same lesson goes on
    if (disposed || stats.leaving) return false;
    stats.leaving = true; stats.lastAction = action;
    if (action === "skipTraining") { writeTraining(storage, "skipped"); guide.unmount(); }      // no coach state survives a skip
    await fader.fade(1, reducedMotion());
    if (onAction) { onAction(action); return true; }                                          // the app: at full black, inside index.html
    if (action === "restartTraining") location.reload();                                      // the harness: the historical navigation
    else { const u = new URL(T.returnTo || "../index.html", location.href); if (action === "beginExpedition") u.searchParams.set("begin", "1"); u.hash = ""; location.assign(u.href); }
    return true;
  }

  async function lift() {
    await frame(); await frame();                       // the map, HUD and panels drawn under the black
    if (stats.leaving || disposed) return;
    await fader.fade(0, reducedMotion());
    if (disposed) return;
    stats.liftedAt = Math.round(performance.now());
    guide.mount();
  }

  document.addEventListener("bloom:win", e => { if (e.detail && e.detail.training) writeTraining(storage, "completed"); }, LIFE);
  // (harness) back to this page from the title (back-forward cache): it would still be black
  if (!onAction) addEventListener("pageshow", e => { if (e.persisted && stats.leaving) { stats.leaving = false; fader.fade(0, reducedMotion()); } }, LIFE);

  const layer = {
    go, status: () => readTraining(storage), stats, guide, session, lifted: null,
    dispose() {
      if (disposed) return; disposed = true; guide.unmount(); life.abort();
      if (skipDialog) { skipDialog.remove(); skipDialog = null; }
      if (globalThis.BLOOM_TRAINING_UI === layer) globalThis.BLOOM_TRAINING_UI = null;
    },
  };
  session.attachTraining(layer);
  globalThis.BLOOM_TRAINING_UI = layer;
  layer.lifted = run.started ? lift() : new Promise(res => document.addEventListener("bloom:run-ready", () => res(lift()), { once: true, signal: life.signal }));
  return layer;
}

function safe(f) { try { return f(); } catch { return null; } }
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
