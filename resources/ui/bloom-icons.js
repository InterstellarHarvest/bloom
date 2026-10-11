// STRANGE BLOOM — the production icon family for the planning screens (BLOOM-034). docs/VISUAL_SYSTEM_v1.md §4.
// The same language as gameplay: 24 × 24 inline-SVG strokes (stroke 2, round caps and joins, styled by .bloom-ic in
// resources/ui/bloom-theme.css), never emoji, always aria-hidden beside a real word. Every glyph that gameplay already has is
// copied here with its path data UNCHANGED from the gameplay tables (resources/run-ui/planet-view.js, decision-rooms.js, run-report.js —
// tools/visual-system-check.js proves the identity); the ones the planning screens add (settings, scan; BLOOM-036A challenge) are drawn on the same grid.
// Pure ES module: no DOM, no state.

export const ICONS = Object.freeze({
  back: '<path d="M15 5l-7 7 7 7"/><path d="M8 12h12"/>',
  world: '<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c3 3 3 13 0 16M12 4c-3 3-3 13 0 16"/>',
  journal: '<path d="M6 3h11a2 2 0 0 1 2 2v16H8a2 2 0 0 1-2-2z"/><path d="M6 3v16a2 2 0 0 0 2 2"/><path d="M10 8h5M10 12h5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7.6" r=".9"/>',
  play: '<path d="M7.5 5l11 7-11 7z"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  alert: '<path d="M12 5v9"/><circle cx="12" cy="18" r="1"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.25 4.15 1 5.85L12 16.9l-5.25 2.8 1-5.85L3.5 9.7l5.9-.9z"/>',
  temp: '<path d="M10 4a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0z"/><circle cx="12" cy="17" r="1.6"/>',
  water: '<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/>',
  soil: '<path d="M3 14h18M3 18h18"/><circle cx="8" cy="9" r="1.3"/><circle cx="14" cy="7" r="1.3"/><circle cx="17" cy="11" r="1.3"/>',
  hazard: '<path d="M12 4l9 16H3z"/><path d="M12 10v4"/><circle cx="12" cy="17" r=".9"/>',
  sky: '<path d="M7 17a4 4 0 0 1-.5-8A6 6 0 0 1 18 9a3.5 3.5 0 0 1 0 8z"/>',
  heat: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  adapt: '<path d="M5 19C5 10 10 5 20 4c0 10-5 15-14 15z"/><path d="M5 19l9-9"/>',
  // (BLOOM-036A) the gameplay's scenario-status glyphs (planet-view.js), for the Challenges that play those scenarios
  pressure: '<path d="M4 8c3-2 5 2 8 0s5-2 8 0M4 12c3-2 5 2 8 0s5-2 8 0M4 16c3-2 5 2 8 0s5-2 8 0"/>',
  competition: '<path d="M12 21V9"/><path d="M12 9c-3 0-5-3-5-6 3 0 5 2 5 6zM12 12c0-4 2-6 5-6 0 3-2 6-5 6z"/><path d="M4 21l4-4M20 21l-4-4"/>',
  climate: '<path d="M3 8h10a2.5 2.5 0 1 0-2.5-2.5M3 12h15a2.5 2.5 0 1 1-2.5 2.5M3 16h8a2.5 2.5 0 1 1-2.5 2.5"/>',
  // new for the planning screens, on the same 24 grid and stroke
  settings: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2.2"/><circle cx="9" cy="17" r="2.2"/>',
  scan: '<circle cx="12" cy="12" r="8.5"/><path d="M12 12l5.2-5.2"/><path d="M12 7.5a4.5 4.5 0 1 0 4.5 4.5"/>',
  // (BLOOM-036A) CHALLENGES: a pennant on its pole — a destination with a purpose, not a rank (no stars, medals or numbers)
  challenge: '<path d="M6 21V3.5"/><path d="M6 4.5h11.5l-3 4 3 4H6"/>',
});

/** One icon as inline SVG markup (decorative: aria-hidden, unfocusable; the caller writes the word beside it). */
export const ico = (name, cls = "") => `<svg class="ic bloom-ic${cls ? " " + cls : ""}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name] || ICONS.info}</svg>`;
