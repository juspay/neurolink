import { useEffect, useRef } from "react";
import { onFrame, reducedMotion } from "./frame";
import { ORB_FRAG, ORB_VERT } from "./orbShader";

type RGB = [number, number, number];
const hex = (h: string): RGB => {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(h);
  return m
    ? [
        parseInt(m[1], 16) / 255,
        parseInt(m[2], 16) / 255,
        parseInt(m[3], 16) / 255,
      ]
    : [0.5, 0.5, 0.5];
};

export type OrbPalette = { a: string; b: string; c: string; hot: string };

// The flowing core. `state` 0 idle · 1 listening · 2 working; `reactive` lets the mic level swell it.
export function Orb({
  size = 0.62,
  palette,
  state = 0,
  reactive = true,
  className,
}: {
  size?: number;
  palette: OrbPalette;
  state?: number;
  reactive?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const live = useRef({ palette, state, reactive });
  live.current = { palette, state, reactive };

  useEffect(() => {
    // A canvas per mount: its context is released on cleanup, and a remount (StrictMode included)
    // starts on a fresh canvas instead of a lost context.
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "display:block;width:100%;height:100%";
    ref.current!.appendChild(canvas);
    const gl = canvas.getContext("webgl", {
      premultipliedAlpha: true,
      alpha: true,
      antialias: true,
    });
    if (!gl) {
      canvas.dataset.fallback = "1";
      return () => canvas.remove();
    }
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, ORB_VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, ORB_FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      canvas.dataset.fallback = "1";
      return () => canvas.remove();
    }
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const u = (n: string) => gl.getUniformLocation(prog, n);
    const U = {
      res: u("uRes"),
      time: u("uTime"),
      level: u("uLevel"),
      state: u("uState"),
      size: u("uSize"),
      a: u("uA"),
      b: u("uB"),
      c: u("uC"),
      hot: u("uHot"),
    };
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);
    let st = 0,
      lastStatic = 0;
    const off = onFrame((now, lvl) => {
      if (!visible || !canvas.offsetParent) return;
      const { palette: p, state: target, reactive: r } = live.current;
      if (reducedMotion() && target === 0) {
        if (now - lastStatic < 1000) return;
        lastStatic = now;
      }
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(canvas.clientWidth * dpr),
        h = Math.round(canvas.clientHeight * dpr);
      if (!w || !h) return;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      st += (target - st) * 0.06;
      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(U.res, w, h);
      gl.uniform1f(U.time, now / 1000);
      gl.uniform1f(U.level, r ? lvl : 0);
      gl.uniform1f(U.state, st);
      gl.uniform1f(U.size, size);
      gl.uniform3fv(U.a, hex(p.a));
      gl.uniform3fv(U.b, hex(p.b));
      gl.uniform3fv(U.c, hex(p.c));
      gl.uniform3fv(U.hot, hex(p.hot));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    });
    return () => {
      off();
      io.disconnect();
      gl.deleteProgram(prog);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
    };
  }, [size]);

  return <span ref={ref} className={className} aria-hidden="true" />;
}
