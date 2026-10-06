// BLOOM — the plain fade through black (028C1), as one shared piece (BLOOM-028D1). ExpeditionEntry fades the menu ↔ survey with
// it; the training run page (resources/training/training-run.js) fades its arrival and its exits with the very same timing,
// easing and reduced-motion rule, so leaving the title for TRAINING and coming back feel like every other crossing.
//
//   import { BlackFade } from "<repo>/resources/main-menu/black-fade.js";
//   const fade = new BlackFade(el);   // el: any full-screen black layer (opacity animated; display: none while clear)
//   await fade.fade(1, rm);           // to black: 220 ms (reduced motion 80 ms)
//   await fade.fade(0, rm);           // from black: 250 ms (reduced motion 80 ms)
//   fade.cancel();
//
// `rm`: true / false force reduced motion; null follows the OS (prefers-reduced-motion, read when the fade starts).
export const FADE = { toBlack: 220, fromBlack: 250, toBlackRm: 80, fromBlackRm: 80 };
export const FADE_EASE = "cubic-bezier(.4,0,.2,1)";

export class BlackFade {
  constructor(el) { this.el = el; this.anim = null; }

  /**
   * The black layer to opacity `to` (1: covered, 0: clear). It takes input while it shows at all and is display: none when
   * clear. Resolves when it is there; a cancel mid-fade resolves too (callers check their own state).
   */
  fade(to, rm) {
    const reduce = rm ?? !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); // (null: follow the OS, read now)
    const el = this.el, dur = to ? (reduce ? FADE.toBlackRm : FADE.toBlack) : (reduce ? FADE.fromBlackRm : FADE.fromBlack);
    if (this.anim) this.anim.cancel();
    el.style.display = "";
    const a = this.anim = el.animate([{ opacity: to ? 0 : 1 }, { opacity: to }], { duration: dur, easing: FADE_EASE, fill: "forwards" });
    return a.finished.then(() => {
      if (this.anim !== a) return;
      el.style.opacity = String(to); a.cancel(); this.anim = null;   // (the final value committed, then the animation dropped)
      if (!to) el.style.display = "none";
    }, () => {});
  }

  cancel() { if (this.anim) { this.anim.cancel(); this.anim = null; } }
}
