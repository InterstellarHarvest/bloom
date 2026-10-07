// BLOOM — the training run page's own layer (BLOOM-028D1 foundation; BLOOM-028D2 guided training). Loaded by demos/demo-run.html in
// training mode only (?training=1), after the run has started. It owns what a training run does beyond an ordinary run:
//   · the arrival: the page opens under black (#trainingCover, put there by the run page's boot before the first paint) and the
//     black lifts once the run's first frames are drawn — the other half of the title's fade (ExpeditionEntry.leaveTo);
//   · the exits: Restart training (fade → the same URL again: a fresh page, nothing carried over), Skip training (records
//     "skipped", fade → return URL), Main menu (fade → return URL), and (028D2) the finished training's Begin Expedition (fade →
//     return URL with begin=1: the title enters the Destination Survey at once, the accepted 029F path), each through the same black
//     (./../main-menu/black-fade.js);
//   · the training status: a win records "completed" (./training-store.js), which is never downgraded;
//   · the motion setting: the title's Settings choice (main-menu-data.js), else the OS;
//   · (028D2) the GUIDED TRAINING on the production run UI: once the black has lifted, a TrainingDirector runs the thirteen lessons of
//     ./training-steps.js against the real run and drives a TrainingCoach callout (docs/GUIDED_TRAINING_v1.md). The coach observes the
//     bloom:* events and the run UI adapter's reads and points at real controls; the player does every action. Not mounted under the
//     developer flag ?ui=legacy (no production view) — the foundation's own shell oracle (tools/training-check.js B2);
//   · (028D2) ONE confirmation before a guided training is skipped — the coach's Skip Tutorial and the run menu's Skip training take
//     this same path (a production dialog, never window.confirm). Cancel keeps the same lesson. Restart / Main menu ask nothing.
//
//   window.BLOOM_TRAINING_UI.go("restartTraining" | "skipTraining" | "mainMenu" | "beginExpedition")   (the run page's training actions)
//   window.BLOOM_TRAINING_UI.status()        → the stored training record
//   window.BLOOM_TRAINING_UI.stats           → { liftedAt, leaving, lastAction, skipDialog: { opened, kept, confirmed } } (QA)
//   window.BLOOM_TRAINING_UI.guide           → { director, coach, mounted, mount(), unmount() } (QA: director.log / current / events)
import { readSettings, reducedMotionFor } from "../main-menu/main-menu-data.js";
import { BlackFade } from "../main-menu/black-fade.js";
import { readTraining, writeTraining } from "./training-store.js";
import { TrainingCoach } from "./training-coach.js";
import { TrainingDirector } from "./training-director.js";
import { trainingSteps, KEEP_CLEAR } from "./training-steps.js";

const storage = safe(() => globalThis.localStorage);
const reducedMotion = () => reducedMotionFor(readSettings(storage).motion);   // null: follow the OS (read by the fade itself)
const frame = () => new Promise(r => requestAnimationFrame(() => r()));
const ACTIONS = new Set(["restartTraining", "skipTraining", "mainMenu", "beginExpedition"]);
const stats = { liftedAt: null, leaving: false, lastAction: null, skipDialog: { opened: 0, kept: 0, confirmed: 0, open: false } };
const COPY = (globalThis.BLOOM_DATA && BLOOM_DATA.training && BLOOM_DATA.training.copy) || {};
const SKIP = { title: "Skip training?", body: "You can start it again any time from the main menu.", keep: "Keep training", skip: "Skip training", ...(COPY.skipConfirm || {}) };

// the black: the boot's arrival cover, claimed here (the run page drops it by itself if this module never loads, e.g. file://);
// created clear if it is already gone, so the exits still fade
let cover = document.getElementById("trainingCover");
if (!cover) { cover = document.createElement("div"); cover.id = "trainingCover"; cover.className = "training-cover"; cover.style.cssText = "opacity:0; display:none"; document.body.appendChild(cover); }
cover.dataset.owner = "training";
const fader = new BlackFade(cover);

async function lift() {
  await frame(); await frame();                       // the map, HUD and panels drawn under the black
  if (stats.leaving) return;
  await fader.fade(0, reducedMotion());
  stats.liftedAt = Math.round(performance.now());
  guide.mount();
}

// ---------------------------------------------------------------- (028D2) the guided training
const guide = {
  director: null, coach: null, mounted: false,
  /** The coach + director over THIS run: production run UI only, training only, not after the win. Idempotent. */
  mount() {
    const run = window.BLOOM_RUN, ui = window.BLOOM_RUN_UI, A = ui && ui.adapter, B = window.BLOOM || {}, pv = B.planetView && B.planetView.instance;
    if (guide.mounted || stats.leaving || !run || !run.training || !A || !pv || !document.documentElement.classList.contains("ui18") || A.run().won) return false;
    const idx = {}; A.map().regions.forEach(r => { idx[r.id] = r.index; });
    const coach = guide.coach = new TrainingCoach({ onSkip: () => go("skipTraining"), reducedMotion, stylesheet: new URL("./training-coach.css", import.meta.url).href,
      geometry: { regionPoint: id => pv.regionPoint(id), regionRect: id => pv.regionRect(id), regionIndex: id => idx[id] ?? -1,
        bubblePoint: tile => { const b = A.bubbles().find(x => x.tile === tile); return b ? pv.renderer.clientOf(b.x, b.y) : null; } } });
    guide.director = new TrainingDirector({ steps: trainingSteps(), adapter: A, coach, keepClear: KEEP_CLEAR, growThresh: run.training.config.grow.growThresh,
      hooks: { placeBubble: id => ui.placeBubble(id) }, readUi,
      onFinish: outcome => { if (outcome === "completed") coach.hide(); } });
    guide.mounted = true;
    const d = guide.director; coach.ready.then(() => { if (guide.director === d && !stats.leaving) d.start(); });   // the first callout only once its styles apply
    return true;
  },
  /** Remove the coach and stop the director (no listener, timer, observer or element left behind). */
  unmount() { if (!guide.mounted) return false; guide.director.dispose(); guide.coach.dispose(); guide.director = guide.coach = null; guide.mounted = false; return true; },
};
// the rooms' presentation state (decision-rooms controller.state(): room, context, swap lock) and Region Inspect's selected tab
function readUi() {
  const dr = window.BLOOM && BLOOM.decisionRooms && BLOOM.decisionRooms.instance, s = dr ? dr.state() : null;
  const tab = s && s.room === "region" ? document.querySelector('#dr .dr-room[data-room="region"] [role="tab"][aria-selected="true"]') : null;
  return { room: s ? s.room : null, context: s && s.room ? s.contextId : null, tab: tab ? tab.id.replace(/^drtab-/, "") : null, transitioning: !!(s && s.transitioning) };
}

// ---------------------------------------------------------------- (028D2) the one Skip confirmation (a production dialog)
let skipping = null;
function confirmSkip() {
  if (skipping) return skipping;
  stats.skipDialog.opened++; stats.skipDialog.open = true;
  const opener = document.activeElement, pv = document.getElementById("pv"), layer = guide.coach && guide.coach.layer;
  const madeInert = [pv, layer].filter(x => x && !x.inert); madeInert.forEach(x => { x.inert = true; });
  const d = document.createElement("div"); d.className = "tsk"; d.dataset.trainingSkip = "";
  d.innerHTML = `<div class="tsk-card" role="alertdialog" aria-modal="true" aria-labelledby="tskTitle" aria-describedby="tskBody">` +
    `<h2 id="tskTitle">${esc(SKIP.title)}</h2><p id="tskBody">${esc(SKIP.body)}</p>` +
    `<div class="tsk-acts"><button type="button" class="tsk-btn" data-skip="keep">${esc(SKIP.keep)}</button><button type="button" class="tsk-btn primary" data-skip="skip">${esc(SKIP.skip)}</button></div></div>`;
  document.body.appendChild(d);
  const btns = [...d.querySelectorAll("button")];
  return (skipping = new Promise(resolve => {
    const done = ok => { d.remove(); madeInert.forEach(x => { x.inert = false; }); stats.skipDialog.open = false; skipping = null;
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
  if (!ACTIONS.has(action) || stats.leaving) return false;
  const run = window.BLOOM_RUN, T = run && run.training; if (!T) return false;
  if (action === "skipTraining" && guide.mounted && !(await confirmSkip())) return false;   // (028D2) cancel: the same lesson goes on
  if (stats.leaving) return false;
  stats.leaving = true; stats.lastAction = action;
  if (action === "skipTraining") { writeTraining(storage, "skipped"); guide.unmount(); }      // no coach state survives a skip
  await fader.fade(1, reducedMotion());
  if (action === "restartTraining") location.reload();
  else if (action === "beginExpedition") { const u = new URL(T.returnTo, location.href); u.searchParams.set("begin", "1"); u.hash = ""; location.assign(u.href); }
  else location.assign(T.returnTo);
  return true;
}

document.addEventListener("bloom:win", e => { if (e.detail && e.detail.training) writeTraining(storage, "completed"); });
// back to this page from the title (back-forward cache): it would still be black
addEventListener("pageshow", e => { if (e.persisted && stats.leaving) { stats.leaving = false; fader.fade(0, reducedMotion()); } });

window.BLOOM_TRAINING_UI = { go, status: () => readTraining(storage), stats, guide };
if (window.BLOOM_RUN && window.BLOOM_RUN.started) lift(); else document.addEventListener("bloom:run-ready", lift, { once: true });

function safe(f) { try { return f(); } catch { return null; } }
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
