import { useEffect, useId, useRef } from "react";
import { BRAND } from "../theme/theme";
import { onFrame, reducedMotion } from "./frame";
import { Orb, type OrbPalette } from "./Orb";

// The NeuroLink mark (landing/static/icons/logo-512.svg), alive: the marine core is the flowing
// WebGL orb, and the eight spoke nodes light and travel outward with the mic level.
const NODES: { a: number; r: number; fill: string }[] = [
  { a: -90, r: 22, fill: BRAND.orange },
  { a: -45, r: 18, fill: BRAND.marineDeep },
  { a: 0, r: 22, fill: BRAND.flame },
  { a: 45, r: 18, fill: BRAND.marineDeep },
  { a: 90, r: 22, fill: BRAND.orange },
  { a: 135, r: 18, fill: BRAND.marineDeep },
  { a: 180, r: 22, fill: BRAND.flame },
  { a: 225, r: 18, fill: BRAND.marineDeep },
];

export const MARK_ORB: OrbPalette = {
  a: "#016fb9",
  b: "#0190e0",
  c: "#7fd0ff",
  hot: "#ff9505",
};

export type MarkState = "idle" | "live" | "busy" | "off";

export function NeuroMark({
  size,
  state = "idle",
  disc = true,
  reactive = false,
  glyph = "brain",
}: {
  size: number;
  state?: MarkState;
  disc?: boolean;
  reactive?: boolean;
  glyph?: "brain" | "stop" | "none";
}) {
  const id = useId().replace(/:/g, "");
  const spokes = useRef<(SVGGElement | null)[]>([]);
  const halo = useRef<SVGCircleElement>(null);
  const live = useRef({ state, reactive });
  live.current = { state, reactive };

  useEffect(() => {
    if (!reactive) return;
    let e = 0;
    return onFrame((now, lvl) => {
      const { state: s } = live.current;
      const target =
        s === "live"
          ? lvl
          : s === "busy"
            ? 0.25 + 0.15 * Math.sin(now / 260)
            : 0;
      e += (target - e) * 0.2;
      const t = reducedMotion() ? 0 : now / 1000;
      spokes.current.forEach((g, i) => {
        if (!g) return;
        const wave =
          s === "busy"
            ? 0.5 + 0.5 * Math.sin(t * 5 - i * (Math.PI / 4))
            : 0.65 + 0.35 * Math.sin(t * 9 + i * 1.7);
        const push = e * 26 * wave;
        g.style.transform = `translate(${push}px, 0)`;
        g.style.opacity = String(0.82 + 0.18 * Math.min(1, e * 2));
      });
      if (halo.current) {
        halo.current.style.opacity = String(Math.min(0.55, e * 0.9));
        halo.current.style.transform = `scale(${1 + e * 0.12})`;
      }
    });
  }, [reactive]);

  const orbState = state === "live" ? 1 : state === "busy" ? 2 : 0;
  return (
    <span
      className={`nl-mark nl-mark--${state}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="-256 -256 512 512" width={size} height={size}>
        <defs>
          <linearGradient id={`${id}d`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#3d3d38" />
            <stop offset="1" stopColor="#353531" />
          </linearGradient>
          <radialGradient id={`${id}h`}>
            <stop offset="0.55" stopColor={BRAND.marine} stopOpacity="0.45" />
            <stop offset="1" stopColor={BRAND.marine} stopOpacity="0" />
          </radialGradient>
        </defs>
        {disc && <circle r="256" fill={`url(#${id}d)`} />}
        <circle
          ref={halo}
          r="190"
          fill={`url(#${id}h)`}
          style={{ opacity: 0, transformOrigin: "0 0" }}
        />
        <circle
          r="165"
          fill="none"
          stroke={BRAND.marineDeep}
          strokeWidth="2"
          opacity="0.28"
        />
        <circle
          r="130"
          fill="none"
          stroke={BRAND.marineDeep}
          strokeWidth="1.5"
          opacity="0.18"
        />
        {NODES.map((n, i) => {
          const dist = n.r === 22 ? 120 : 120.2;
          return (
            <g key={n.a} transform={`rotate(${n.a})`}>
              <line
                x1="65"
                y1="0"
                x2="100"
                y2="0"
                stroke={BRAND.marineDeep}
                strokeWidth="5"
                strokeLinecap="round"
              />
              <g
                ref={(el) => void (spokes.current[i] = el)}
                style={{ transition: reactive ? undefined : "transform 300ms" }}
              >
                <circle
                  cx={dist}
                  cy="0"
                  r={n.r}
                  fill={n.fill}
                  className="nl-node"
                />
                <circle
                  cx={dist}
                  cy="0"
                  r={n.r === 22 ? 8 : 6}
                  fill="#fff"
                  opacity="0.9"
                />
              </g>
            </g>
          );
        })}
        {!reactive && <circle r="65" fill={BRAND.marineDeep} />}
      </svg>
      {reactive && (
        <Orb
          className="nl-mark__orb"
          size={0.565}
          palette={MARK_ORB}
          state={orbState}
          reactive={state === "live"}
        />
      )}
      {glyph !== "none" && (
        <svg
          className="nl-mark__glyph"
          viewBox="-256 -256 512 512"
          width={size}
          height={size}
        >
          {glyph === "stop" ? (
            <rect x="-22" y="-22" width="44" height="44" rx="9" fill="#fff" />
          ) : (
            <g
              fill="none"
              stroke="#fff"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path
                d="M-6 -42 C-22 -42 -36 -32 -40 -16 C-44 0 -40 16 -32 28 C-26 36 -18 42 -8 44 C-4 44 -2 42 0 40"
                strokeWidth="4.5"
              />
              <path
                d="M6 -42 C22 -42 36 -32 40 -16 C44 0 40 16 32 28 C26 36 18 42 8 44 C4 44 2 42 0 40"
                strokeWidth="4.5"
              />
              <path d="M0 40 L0 50" strokeWidth="4" />
              <path
                d="M-34 -20 C-26 -26 -18 -20 -14 -10"
                strokeWidth="3"
                opacity="0.75"
              />
              <path
                d="M-36 4 C-28 -2 -20 4 -16 12"
                strokeWidth="3"
                opacity="0.75"
              />
              <path
                d="M-30 22 C-22 18 -16 24 -12 32"
                strokeWidth="2.5"
                opacity="0.65"
              />
              <path
                d="M34 -20 C26 -26 18 -20 14 -10"
                strokeWidth="3"
                opacity="0.75"
              />
              <path
                d="M36 4 C28 -2 20 4 16 12"
                strokeWidth="3"
                opacity="0.75"
              />
              <path
                d="M30 22 C22 18 16 24 12 32"
                strokeWidth="2.5"
                opacity="0.65"
              />
              <line
                x1="0"
                y1="-38"
                x2="0"
                y2="36"
                strokeWidth="2"
                opacity="0.35"
              />
            </g>
          )}
        </svg>
      )}
    </span>
  );
}
