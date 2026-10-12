import { useEffect, useRef } from "react";
import { onFrame, reducedMotion } from "./frame";

// Rolling level history, drawn as rounded bars that brighten toward "now". At rest it breathes faintly.
export function Waveform({
  active,
  colors,
  idle,
}: {
  active: boolean;
  colors: [string, string];
  idle: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const live = useRef({ active, colors, idle });
  live.current = { active, colors, idle };
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const hist = new Float32Array(180);
    let head = 0,
      last = 0;
    return onFrame((now, lvl) => {
      if (!canvas.offsetParent) return;
      const {
        active: on,
        colors: [c1, c2],
        idle: ic,
      } = live.current;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(canvas.clientWidth * dpr),
        h = Math.round(canvas.clientHeight * dpr);
      if (!w || !h) return;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      if (now - last > 45) {
        hist[head] = on ? lvl : 0;
        head = (head + 1) % hist.length;
        last = now;
      }
      ctx.clearRect(0, 0, w, h);
      const bw = 3 * dpr,
        gap = 3 * dpr,
        n = Math.min(hist.length, Math.floor(w / (bw + gap)));
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, c1);
      grad.addColorStop(1, c2);
      const t = reducedMotion() ? 0 : now;
      for (let i = 0; i < n; i++) {
        const v = hist[(head - n + i + hist.length * 2) % hist.length];
        const rest =
          0.08 +
          0.05 * Math.sin(t / 560 + i * 0.3) * Math.sin(t / 1400 + i * 0.07);
        const amp = Math.max(rest, Math.min(1, v * 1.2));
        const bh = Math.max(bw, amp * h * 0.9);
        ctx.globalAlpha = 0.2 + 0.8 * (i / n);
        ctx.fillStyle = v > 0.02 ? grad : ic;
        ctx.beginPath();
        ctx.roundRect(i * (bw + gap), (h - bh) / 2, bw, bh, bw / 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    });
  }, []);
  return <canvas ref={ref} className="vb-wave" aria-hidden="true" />;
}
