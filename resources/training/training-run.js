// BLOOM — the training run page's own layer (BLOOM-028D1 foundation). Loaded by demos/demo-run.html in training mode only
// (?training=1), after the run has started. It owns what a training run does beyond an ordinary run:
//   · the arrival: the page opens under black (#trainingCover, put there by the run page's boot before the first paint) and the
//     black lifts once the run's first frames are drawn — the other half of the title's fade (ExpeditionEntry.leaveTo);
//   · the exits: Restart training (fade → the same URL again: a fresh page, nothing carried over), Skip training (records
//     "skipped", fade → return URL), Main menu (fade → return URL), each through the same black (./../main-menu/black-fade.js);
//   · the training status: a win records "completed" (./training-store.js);
//   · the motion setting: the title's Settings choice (main-menu-data.js), else the OS.
// No coaching, callouts or step logic: that is the tutorial layer built on top later (its inputs: the run page's bloom:* events,
// its data-tutorial anchors and BLOOM_RUN_UI.placeBubble — docs/TRAINING_FOUNDATION_v1.md).
//
//   window.BLOOM_TRAINING_UI.go("restartTraining" | "skipTraining" | "mainMenu")   (what the run page's training actions call)
//   window.BLOOM_TRAINING_UI.status()        → the stored training record
//   window.BLOOM_TRAINING_UI.stats           → { liftedAt, leaving, lastAction } (QA)
import { readSettings, reducedMotionFor } from "../main-menu/main-menu-data.js";
import { BlackFade } from "../main-menu/black-fade.js";
import { readTraining, writeTraining } from "./training-store.js";

const storage = safe(() => globalThis.localStorage);
const reducedMotion = () => reducedMotionFor(readSettings(storage).motion);   // null: follow the OS (read by the fade itself)
const frame = () => new Promise(r => requestAnimationFrame(() => r()));
const ACTIONS = new Set(["restartTraining", "skipTraining", "mainMenu"]);
const stats = { liftedAt: null, leaving: false, lastAction: null };

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
}

async function go(action) {
  if (!ACTIONS.has(action) || stats.leaving) return false;
  const run = window.BLOOM_RUN, T = run && run.training; if (!T) return false;
  stats.leaving = true; stats.lastAction = action;
  if (action === "skipTraining") writeTraining(storage, "skipped");
  await fader.fade(1, reducedMotion());
  if (action === "restartTraining") location.reload(); else location.assign(T.returnTo);
  return true;
}

document.addEventListener("bloom:win", e => { if (e.detail && e.detail.training) writeTraining(storage, "completed"); });
// back to this page from the title (back-forward cache): it would still be black
addEventListener("pageshow", e => { if (e.persisted && stats.leaving) { stats.leaving = false; fader.fade(0, reducedMotion()); } });

window.BLOOM_TRAINING_UI = { go, status: () => readTraining(storage), stats };
if (window.BLOOM_RUN && window.BLOOM_RUN.started) lift(); else document.addEventListener("bloom:run-ready", lift, { once: true });

function safe(f) { try { return f(); } catch { return null; } }
