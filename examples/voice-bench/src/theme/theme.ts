import { alpha, createTheme, type Theme } from "@mui/material";

export type Mode = "light" | "dark";

// NeuroLink brand, from the logo and the Transcribe page.
export const BRAND = {
  marine: "#0190e0",
  marineDeep: "#016fb9",
  orange: "#ff9505",
  flame: "#ec4e20",
  graphite: "#353531",
};

export const tokens = {
  light: {
    bg: "#f7f8fa",
    surface: "#ffffff",
    surface2: "#f1f4f8",
    line: "#dfe5ec",
    lineStrong: "#c9d2dc",
    fg: "#16202b",
    muted: "#5d6b7a",
    accent: "#016fb9",
    accentBright: BRAND.marine,
    accentSoft: "#e3f1fb",
    accentInk: "#065f97",
    live: "#b85106",
    liveSoft: "#fdebdc",
    rec: "#d93d1a",
    recSoft: "#fde6df",
    ok: "#14866d",
    okSoft: "#ddf3ec",
    warn: "#b4610a",
    warnSoft: "#fdf0dc",
    engine: {
      local: "#016fb9",
      indic: "#b85106",
      whistle: "#0a756d",
      scribe: "#6b4fd8",
    },
    shadow:
      "0 1px 2px rgba(22,32,43,0.04), 0 24px 48px -32px rgba(22,32,43,0.28)",
    shadowLift:
      "0 2px 6px rgba(22,32,43,0.06), 0 30px 60px -36px rgba(22,32,43,0.42)",
  },
  dark: {
    bg: "#0f151c",
    surface: "#161e27",
    surface2: "#1c2632",
    line: "#27333f",
    lineStrong: "#36434f",
    fg: "#e8edf3",
    muted: "#9aa9b8",
    accent: "#3fb0f0",
    accentBright: "#5cc0f5",
    accentSoft: "#10304a",
    accentInk: "#8fd0fa",
    live: "#ff9f3f",
    liveSoft: "#3b2512",
    rec: "#ff7a57",
    recSoft: "#3e1d14",
    ok: "#41d1a7",
    okSoft: "#0f342a",
    warn: "#f2b65a",
    warnSoft: "#382a12",
    engine: {
      local: "#3fb0f0",
      indic: "#ff9f3f",
      whistle: "#3ad6c6",
      scribe: "#a594ff",
    },
    shadow: "0 1px 2px rgba(0,0,0,0.3), 0 24px 48px -28px rgba(0,0,0,0.6)",
    shadowLift:
      "0 2px 8px rgba(0,0,0,0.35), 0 30px 60px -30px rgba(0,0,0,0.75)",
  },
};
export type Tokens = (typeof tokens)["light"];

export const FONT = {
  display: '"Manrope", "Avenir Next", "Segoe UI", sans-serif',
  body: '"IBM Plex Sans", "Noto Sans Devanagari", "Noto Sans Tamil", "Noto Sans Telugu", "Noto Sans Kannada", "Noto Sans Bengali", "Noto Sans Malayalam", "Helvetica Neue", Arial, sans-serif',
};

const EASE = "cubic-bezier(.22,1,.36,1)";

declare module "@mui/material/styles" {
  interface Theme {
    vb: Tokens;
  }
  interface ThemeOptions {
    vb?: Tokens;
  }
}

export function benchTheme(mode: Mode): Theme {
  const t = tokens[mode];
  return createTheme({
    vb: t,
    palette: {
      mode,
      primary: {
        main: t.accent,
        contrastText: mode === "dark" ? "#06121c" : "#fff",
      },
      secondary: { main: t.live },
      error: { main: t.rec },
      warning: { main: t.warn },
      success: { main: t.ok },
      background: { default: t.bg, paper: t.surface },
      text: { primary: t.fg, secondary: t.muted },
      divider: t.line,
    },
    shape: { borderRadius: 4 },
    typography: {
      fontFamily: FONT.body,
      fontSize: 14,
      h1: {
        fontFamily: FONT.display,
        fontWeight: 800,
        letterSpacing: "-0.025em",
      },
      h2: {
        fontFamily: FONT.display,
        fontWeight: 800,
        fontSize: "1.75rem",
        letterSpacing: "-0.02em",
        lineHeight: 1.15,
      },
      h3: {
        fontFamily: FONT.display,
        fontWeight: 700,
        fontSize: "1.05rem",
        letterSpacing: "-0.01em",
      },
      h4: {
        fontFamily: FONT.display,
        fontWeight: 700,
        fontSize: "0.95rem",
        letterSpacing: "-0.005em",
      },
      subtitle2: { fontWeight: 600, fontSize: "0.8125rem" },
      button: { textTransform: "none", fontWeight: 600, letterSpacing: 0 },
      overline: {
        fontFamily: FONT.body,
        fontWeight: 600,
        fontSize: "0.6875rem",
        letterSpacing: "0.08em",
        lineHeight: 1.6,
      },
    },
    transitions: { easing: { easeOut: EASE } },
    components: {
      MuiButtonBase: { defaultProps: { disableRipple: true } },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 10,
            paddingInline: 14,
            minHeight: 36,
            transition: `background-color 180ms ${EASE}, border-color 180ms ${EASE}, color 180ms ${EASE}, box-shadow 180ms ${EASE}, transform 120ms ${EASE}`,
            "&:active": { transform: "scale(0.98)" },
          },
          sizeSmall: {
            minHeight: 30,
            paddingInline: 10,
            fontSize: "0.8125rem",
            borderRadius: 8,
          },
          contained: {
            backgroundColor: t.accent,
            boxShadow: `0 8px 20px -12px ${t.accent}`,
            "&:hover": {
              backgroundColor: mode === "light" ? "#015d9c" : t.accentBright,
              boxShadow: `0 10px 24px -12px ${t.accent}`,
            },
          },
          outlined: {
            borderColor: t.line,
            color: t.fg,
            backgroundColor: t.surface,
            "&:hover": {
              borderColor: t.lineStrong,
              backgroundColor: t.surface2,
            },
          },
          text: {
            color: t.muted,
            "&:hover": { color: t.fg, backgroundColor: alpha(t.fg, 0.05) },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            color: t.muted,
            transition: `background-color 180ms ${EASE}, color 180ms ${EASE}`,
            "&:hover": { color: t.fg, backgroundColor: alpha(t.fg, 0.06) },
          },
        },
      },
      MuiToggleButtonGroup: {
        styleOverrides: {
          root: {
            backgroundColor: t.surface2,
            border: `1px solid ${t.line}`,
            borderRadius: 999,
            padding: 3,
            gap: 2,
          },
          grouped: {
            border: 0,
            borderRadius: "999px !important",
            margin: 0,
          },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
            border: 0,
            color: t.muted,
            fontWeight: 600,
            fontSize: "0.8125rem",
            padding: "5px 12px",
            gap: 7,
            lineHeight: 1.4,
            whiteSpace: "nowrap",
            transition: `background-color 200ms ${EASE}, color 200ms ${EASE}, box-shadow 200ms ${EASE}`,
            "&:hover": { backgroundColor: alpha(t.fg, 0.05), color: t.fg },
            "&.Mui-selected": {
              backgroundColor: t.surface,
              color: t.fg,
              boxShadow:
                mode === "light"
                  ? "0 1px 2px rgba(22,32,43,0.08), 0 4px 12px -6px rgba(22,32,43,0.18)"
                  : "0 1px 2px rgba(0,0,0,0.5)",
              "&:hover": { backgroundColor: t.surface },
            },
            "&.Mui-disabled": { border: 0, opacity: 0.45 },
          },
        },
      },
      MuiSwitch: {
        styleOverrides: {
          root: { width: 40, height: 24, padding: 0, overflow: "visible" },
          switchBase: {
            padding: 3,
            "&.Mui-checked": {
              transform: "translateX(16px)",
              color: "#fff",
              "& + .MuiSwitch-track": { backgroundColor: t.accent, opacity: 1 },
            },
            "&.Mui-focusVisible + .MuiSwitch-track": {
              outline: `2px solid ${t.accent}`,
              outlineOffset: 2,
            },
          },
          thumb: {
            width: 18,
            height: 18,
            boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
            backgroundColor: "#fff",
          },
          track: {
            borderRadius: 999,
            backgroundColor: t.lineStrong,
            opacity: 1,
            transition: `background-color 200ms ${EASE}`,
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            backgroundColor: t.surface,
            transition: `box-shadow 180ms ${EASE}`,
            "& .MuiOutlinedInput-notchedOutline": { borderColor: t.line },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: t.lineStrong,
            },
            "&.Mui-focused": {
              boxShadow: `0 0 0 3px ${alpha(t.accent, 0.18)}`,
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: t.accent,
              borderWidth: 1,
            },
          },
          input: { paddingBlock: 9 },
        },
      },
      MuiInputLabel: { styleOverrides: { root: { color: t.muted } } },
      MuiSelect: { styleOverrides: { icon: { color: t.muted } } },
      MuiMenu: {
        styleOverrides: {
          paper: {
            border: `1px solid ${t.line}`,
            boxShadow: t.shadowLift,
            borderRadius: 12,
            marginTop: 6,
          },
          list: { padding: 4 },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontSize: "0.875rem",
            minHeight: 34,
            "&.Mui-selected": {
              backgroundColor: t.accentSoft,
              color: t.accentInk,
            },
            "&.Mui-selected:hover": { backgroundColor: t.accentSoft },
          },
        },
      },
      MuiTooltip: {
        defaultProps: { arrow: false, enterDelay: 350 },
        styleOverrides: {
          tooltip: {
            backgroundColor: mode === "light" ? "#16202b" : "#e8edf3",
            color: mode === "light" ? "#fff" : "#16202b",
            fontSize: "0.75rem",
            fontWeight: 500,
            borderRadius: 8,
            padding: "6px 10px",
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 999, fontWeight: 500, height: 26 },
          outlined: { borderColor: t.line, backgroundColor: t.surface },
          sizeSmall: { height: 22, fontSize: "0.75rem" },
        },
      },
      MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
      MuiDrawer: {
        styleOverrides: {
          paper: { backgroundColor: t.surface, borderColor: t.line },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: { height: 4, borderRadius: 999, backgroundColor: t.surface2 },
          bar: { borderRadius: 999, transition: `transform 400ms ${EASE}` },
        },
      },
      MuiCheckbox: { styleOverrides: { root: { padding: 4 } } },
      MuiBottomNavigation: {
        styleOverrides: {
          root: { backgroundColor: "transparent", height: 62 },
        },
      },
      MuiBottomNavigationAction: {
        styleOverrides: {
          root: {
            color: t.muted,
            minWidth: 0,
            padding: "6px 0 8px",
            gap: 2,
            "&.Mui-selected": { color: t.accent },
          },
          label: {
            fontSize: "0.6875rem",
            fontWeight: 600,
            "&.Mui-selected": { fontSize: "0.6875rem" },
          },
        },
      },
    },
  });
}
