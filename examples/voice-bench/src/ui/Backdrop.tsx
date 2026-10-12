import { GlobalStyles, useTheme } from "@mui/material";

// Theme tokens as CSS variables for the plain-CSS layer, plus the watercolour washes behind the shell.
export function ThemeVars() {
  const { vb: t, palette } = useTheme();
  const dark = palette.mode === "dark";
  return (
    <GlobalStyles
      styles={{
        ":root": {
          colorScheme: palette.mode,
          "--vb-bg": t.bg,
          "--vb-surface": t.surface,
          "--vb-surface2": t.surface2,
          "--vb-line": t.line,
          "--vb-line-strong": t.lineStrong,
          "--vb-fg": t.fg,
          "--vb-muted": t.muted,
          "--vb-accent": t.accent,
          "--vb-accent-soft": t.accentSoft,
          "--vb-accent-ink": t.accentInk,
          "--vb-live": t.live,
          "--vb-wash-blue": dark
            ? "rgba(1,144,224,0.26)"
            : "rgba(1,144,224,0.20)",
          "--vb-wash-orange": dark
            ? "rgba(255,149,5,0.17)"
            : "rgba(255,149,5,0.17)",
          "--vb-wash-violet": dark
            ? "rgba(140,110,240,0.16)"
            : "rgba(120,90,220,0.12)",
          "--vb-wash-teal": dark
            ? "rgba(30,190,180,0.15)"
            : "rgba(20,170,160,0.13)",
          "--vb-grain-opacity": dark ? "0.05" : "0.07",
          "--vb-grain-blend": dark ? "screen" : "multiply",
        },
      }}
    />
  );
}

export function Backdrop() {
  return (
    <>
      <svg
        width="0"
        height="0"
        style={{ position: "absolute" }}
        aria-hidden="true"
      >
        <defs>
          <filter id="vb-wc" x="-30%" y="-30%" width="160%" height="160%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.012 0.018"
              numOctaves="3"
              seed="7"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="70"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
          <filter id="vb-paper">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.9"
              numOctaves="2"
              seed="3"
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>
        </defs>
      </svg>
      <div className="vb-washes" aria-hidden="true">
        <div
          className="vb-wash b"
          style={{ width: 620, height: 460, left: -180, top: -60 }}
        />
        <div
          className="vb-wash o"
          style={{ width: 460, height: 380, right: -140, top: "38%" }}
        />
        <div
          className="vb-wash t"
          style={{ width: 520, height: 360, left: "34%", bottom: -200 }}
        />
        <div
          className="vb-wash v"
          style={{ width: 420, height: 320, right: "18%", top: -160 }}
        />
      </div>
      <div className="vb-grain" aria-hidden="true" />
    </>
  );
}
