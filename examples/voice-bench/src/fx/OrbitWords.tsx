import { useEffect, useRef } from "react";
import { onFrame, reducedMotion } from "./frame";

const GREETINGS: [string, string][] = [
  ["Hello", "en"],
  ["नमस्ते", "hi"],
  ["வணக்கம்", "ta"],
  ["నమస్కారం", "te"],
  ["ನಮಸ್ಕಾರ", "kn"],
  ["নমস্কার", "bn"],
  ["നമസ്കാരം", "ml"],
  ["Hola", "es"],
  ["こんにちは", "ja"],
  ["Bonjour", "fr"],
];

// Greetings ride a tilted ellipse around the mark; behind it they shrink, dim and soften.
// `clear` is the radius (px) words keep away from the centre, so the front pass never crosses the mark.
export function OrbitWords({
  speed = 1,
  clear = 0,
}: {
  speed?: number;
  clear?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = ref.current!;
    const els = [...box.children] as HTMLElement[];
    return onFrame((now, lvl) => {
      const w = box.clientWidth,
        h = box.clientHeight;
      if (!w || !box.offsetParent) return;
      const t = reducedMotion() ? 0 : now / 1000;
      const spin = t * (0.08 + 0.1 * lvl) * speed;
      els.forEach((el, i) => {
        const a = spin + (i / els.length) * Math.PI * 2;
        const depth = Math.sin(a);
        let x = Math.cos(a) * w * 0.5,
          y = depth * h * 0.42;
        const d = Math.hypot(x, y);
        if (d < clear && d > 0) {
          x *= clear / d;
          y *= clear / d;
        }
        const s = 0.74 + 0.26 * (depth + 1) * 0.5;
        el.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${s.toFixed(3)})`;
        el.style.opacity = (
          0.16 +
          0.84 * Math.max(0, depth * 0.5 + 0.5) ** 1.5
        ).toFixed(3);
        el.style.zIndex = depth > 0 ? "3" : "0";
        el.style.filter =
          depth < -0.25 ? `blur(${(-depth * 1.2).toFixed(2)}px)` : "none";
      });
    });
  }, [speed, clear]);
  return (
    <div className="vb-orbit" ref={ref} aria-hidden="true">
      {GREETINGS.map(([w, l]) => (
        <span key={l} lang={l}>
          {w}
        </span>
      ))}
    </div>
  );
}
