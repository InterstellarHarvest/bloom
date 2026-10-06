// BLOOM — Main Menu data (BLOOM-028C): the player-facing title, the background set, the background-picking rule and the
// settings record. Pure ES module (no DOM, no module state, nothing written to globals) so Node can test it
// (tools/main-menu-check.js). The project stays BLOOM internally; only what the player reads says Strange Bloom.

export const TITLE = "Strange Bloom";
export const SUBTITLE = "Unknown Soils";

/** The twelve owner-painted menu backgrounds (1280 × 720 JPEG, untouched), relative to the repository root. */
export const BACKGROUNDS = Array.from({ length: 12 }, (_, i) => `resources/main-menu/backgrounds/menu-${String(i + 1).padStart(2, "0")}.jpg`);

/**
 * Which background the menu shows: a uniformly random index into `list`, never `previous` when the list has more than one
 * entry (the painting the player just saw is not shown again straight away). `rng` → [0, 1).
 */
export function pickBackground(previous = null, rng = Math.random, list = BACKGROUNDS) {
  const n = list.length;
  if (n <= 1) return 0;
  const prev = Number.isInteger(previous) && previous >= 0 && previous < n ? previous : null;
  if (prev === null) return Math.min(n - 1, Math.floor(rng() * n));
  const k = Math.min(n - 2, Math.floor(rng() * (n - 1))); // one of the n − 1 others, in order
  return k >= prev ? k + 1 : k;
}

/** Player settings. `motion`: "system" follows prefers-reduced-motion; "reduced" / "full" force it (what the menu, the
 *  transition and the survey each already accept as reducedMotion true / false). */
export const MOTION_OPTIONS = [
  { id: "system", label: "Follow system setting", hint: "Uses your device's reduce-motion preference" },
  { id: "reduced", label: "Reduced", hint: "Short fades; nothing travels or spins" },
  { id: "full", label: "Full", hint: "Clouds, entrances and the turning worlds" },
];
export const DEFAULT_SETTINGS = Object.freeze({ motion: "system" });
export const SETTINGS_KEY = "strange-bloom.settings";

/** The reducedMotion value (null | true | false) a `motion` setting means for the components. */
export const reducedMotionFor = motion => motion === "reduced" ? true : motion === "full" ? false : null;

/** Read settings from a Storage-like object (missing / malformed / throwing → the defaults; never throws). */
export function readSettings(storage) {
  const out = { ...DEFAULT_SETTINGS };
  try {
    const raw = storage && storage.getItem(SETTINGS_KEY); if (!raw) return out;
    const o = JSON.parse(raw);
    if (o && MOTION_OPTIONS.some(m => m.id === o.motion)) out.motion = o.motion;
  } catch { /* defaults */ }
  return out;
}

/** Write settings (only known keys with valid values); returns the record stored. Never throws. */
export function writeSettings(storage, settings) {
  const s = { ...DEFAULT_SETTINGS, ...readSettings(storage) };
  if (settings && MOTION_OPTIONS.some(m => m.id === settings.motion)) s.motion = settings.motion;
  try { storage && storage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* private mode, quota: the choice still applies this visit */ }
  return s;
}
