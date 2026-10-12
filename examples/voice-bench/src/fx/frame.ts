import { onLevel } from "../engine/audio";

// One animation loop for every visual: a VU-style smoothed mic level (fast attack, slow release)
// plus per-frame subscribers. Pauses with the tab.
const level = { raw: 0, v: 0 };
onLevel((rms) => {
  // app.js's ring used 1 + min(rms·6, 0.45); the same curve, normalised to 0..1
  level.raw = Math.min(1, (rms * 6) / 0.45);
});

type Sub = (now: number, level: number) => void;
const subs = new Set<Sub>();
let running = false;
function loop(now: number) {
  if (!subs.size) {
    running = false;
    return;
  }
  requestAnimationFrame(loop);
  if (document.hidden) return;
  level.v += (level.raw - level.v) * (level.raw > level.v ? 0.45 : 0.08);
  level.raw *= 0.94;
  subs.forEach((s) => s(now, level.v));
}
export function onFrame(s: Sub) {
  subs.add(s);
  if (!running) {
    running = true;
    requestAnimationFrame(loop);
  }
  return () => {
    subs.delete(s);
  };
}

export const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
