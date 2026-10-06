// BLOOM — training status persistence (BLOOM-028D1). Pure, no DOM; Node-testable. Whether this player has finished or skipped
// the training run, so a later first-run prompt (not built yet) and the menu can tell. Stored next to the title's settings
// (main-menu-data.js SETTINGS_KEY) under its own key; never throws without storage (private mode, quota, no localStorage).
//
//   import { readTraining, writeTraining, clearTraining } from "<repo>/resources/training/training-store.js";
//   readTraining(localStorage)                → { status: null | "completed" | "skipped", at: ms | null, v: TRAINING_VERSION }
//   writeTraining(localStorage, "skipped")    → the record now stored ("completed" is never downgraded to "skipped")
//   clearTraining(localStorage)
//
// Stored value: localStorage["strange-bloom.training"] = '{"v":1,"status":"completed","at":1759750000000}'. A record of another
// version reads as no record: bump TRAINING_VERSION when the training changes enough that every player should be offered it again.
export const TRAINING_KEY = "strange-bloom.training";
export const TRAINING_VERSION = 1;
export const TRAINING_STATUSES = Object.freeze(["completed", "skipped"]);

const none = () => ({ status: null, at: null, v: TRAINING_VERSION });

export function readTraining(storage) {
  try {
    const raw = storage && storage.getItem(TRAINING_KEY); if (!raw) return none();
    const o = JSON.parse(raw);
    if (!o || o.v !== TRAINING_VERSION || !TRAINING_STATUSES.includes(o.status)) return none();
    return { status: o.status, at: Number.isFinite(o.at) ? o.at : null, v: TRAINING_VERSION };
  } catch { return none(); }
}

export function writeTraining(storage, status, now = Date.now()) {
  if (!TRAINING_STATUSES.includes(status)) throw new TypeError(`writeTraining: status must be one of ${TRAINING_STATUSES.join(", ")}`);
  const was = readTraining(storage);
  if (was.status === "completed" && status !== "completed") return was;   // finishing once counts for good
  const rec = { v: TRAINING_VERSION, status, at: now };
  try { storage && storage.setItem(TRAINING_KEY, JSON.stringify(rec)); } catch { /* private mode, quota: it still applies to this visit's flow */ }
  return { status, at: now, v: TRAINING_VERSION };
}

export function clearTraining(storage) { try { storage && storage.removeItem(TRAINING_KEY); } catch { /* nothing stored */ } }
