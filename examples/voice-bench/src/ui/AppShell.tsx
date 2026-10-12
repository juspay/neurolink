import {
  BottomNavigation,
  BottomNavigationAction,
  Box,
  ButtonBase,
  IconButton,
  Tooltip,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import DarkModeRounded from "@mui/icons-material/DarkModeRounded";
import DescriptionRounded from "@mui/icons-material/DescriptionRounded";
import GraphicEqRounded from "@mui/icons-material/GraphicEqRounded";
import LightModeRounded from "@mui/icons-material/LightModeRounded";
import PsychologyRounded from "@mui/icons-material/PsychologyRounded";
import TuneRounded from "@mui/icons-material/TuneRounded";
import { type ReactNode } from "react";
import { nlBase } from "../engine/config";
import { storage, setState, useBench, type Conn } from "../engine/store";
import type { View } from "../engine/types";
import { NeuroMark } from "../fx/NeuroMark";
import { BRAND } from "../theme/theme";
import { toggleTheme, useThemeMode } from "./themeMode";

// Speak (TTS) is not part of the transcription story: it stays reachable from Settings only.
const NAV: { view: View; label: string; icon: ReactNode }[] = [
  { view: "live", label: "Live", icon: <GraphicEqRounded /> },
  { view: "files", label: "Files", icon: <DescriptionRounded /> },
  { view: "dictionary", label: "Memory", icon: <PsychologyRounded /> },
  { view: "settings", label: "Settings", icon: <TuneRounded /> },
];

export function showView(view: View) {
  storage.set("voice-bench-view", view);
  setState({ view });
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
      <NeuroMark size={compact ? 30 : 36} />
      <Box sx={{ minWidth: 0 }}>
        <Typography
          sx={{
            fontFamily: (t) => t.typography.h3.fontFamily,
            fontWeight: 800,
            fontSize: compact ? "1rem" : "1.0625rem",
            letterSpacing: "-0.015em",
            lineHeight: 1.15,
          }}
        >
          Voice Bench
        </Typography>
        {!compact && (
          <Typography
            sx={{
              fontSize: "0.75rem",
              color: "text.secondary",
              lineHeight: 1.3,
            }}
          >
            by NeuroLink
          </Typography>
        )}
      </Box>
    </Box>
  );
}

function StatusDot({
  state,
  size = 8,
}: {
  state: Conn["state"];
  size?: number;
}) {
  const { vb } = useTheme();
  const c = state === "ok" ? vb.ok : state === "bad" ? vb.rec : vb.lineStrong;
  return (
    <Box
      component="span"
      sx={{
        width: size,
        height: size,
        borderRadius: "50%",
        bgcolor: c,
        flex: "none",
        boxShadow: state === "ok" ? `0 0 0 3px ${alpha(c, 0.18)}` : "none",
      }}
    />
  );
}

// One honest signal: is the speech service reachable. No hosts, ports or per-engine rows.
function useConnection(): { state: Conn["state"]; label: string } {
  const health = useBench((st) => st.health);
  const c = nlBase ? health.neurolink : health.spark;
  return c.state === "ok"
    ? { state: "ok", label: "Connected" }
    : c.state === "bad"
      ? { state: "bad", label: "Offline" }
      : { state: "idle", label: "Connecting…" };
}

function Connection() {
  const { state, label } = useConnection();
  return (
    <Box
      sx={{ display: "flex", alignItems: "center", gap: 1.25, px: 1.25, py: 1 }}
      role="status"
      aria-live="polite"
    >
      <StatusDot state={state} />
      <Box>
        <Typography
          sx={{ fontSize: "0.8125rem", fontWeight: 600, lineHeight: 1.3 }}
        >
          {label}
        </Typography>
        <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>
          NeuroLink speech service
        </Typography>
      </Box>
    </Box>
  );
}

function ThemeSwitch() {
  const mode = useThemeMode();
  const { vb } = useTheme();
  const dark = mode === "dark";
  return (
    <ButtonBase
      onClick={(e) => toggleTheme({ x: e.clientX, y: e.clientY })}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.25,
        px: 1.25,
        py: 1,
        borderRadius: 2.5,
        width: "100%",
        justifyContent: "flex-start",
        "&:hover": { bgcolor: alpha(vb.fg, 0.05) },
      }}
    >
      <Box
        sx={{
          position: "relative",
          width: 44,
          height: 24,
          borderRadius: 999,
          bgcolor: vb.surface2,
          border: `1px solid ${vb.line}`,
          flex: "none",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: 2,
            left: 2,
            width: 18,
            height: 18,
            borderRadius: "50%",
            bgcolor: dark ? vb.accent : BRAND.orange,
            color: "#fff",
            display: "grid",
            placeItems: "center",
            transform: `translateX(${dark ? 20 : 0}px)`,
            transition:
              "transform 260ms cubic-bezier(.22,1,.36,1), background-color 260ms",
            "& svg": { fontSize: 12 },
          }}
        >
          {dark ? <DarkModeRounded /> : <LightModeRounded />}
        </Box>
      </Box>
      <Typography
        sx={{ fontSize: "0.8125rem", fontWeight: 500, color: "text.secondary" }}
      >
        {dark ? "Dark" : "Light"} theme
      </Typography>
    </ButtonBase>
  );
}

function Rail() {
  const view = useBench((s) => s.view);
  const dictCount = useBench((s) => s.dictionary.length);
  const { vb } = useTheme();
  const idx = NAV.findIndex(
    (n) => n.view === (view === "speak" ? "settings" : view),
  );
  return (
    <Box
      component="aside"
      sx={{
        width: 252,
        flex: "none",
        display: "flex",
        flexDirection: "column",
        gap: 3,
        p: 2,
        pt: 2.5,
        borderRight: `1px solid ${vb.line}`,
        bgcolor: alpha(vb.surface, 0.72),
        backdropFilter: "blur(14px) saturate(1.2)",
        position: "relative",
        zIndex: 2,
        overflowY: "auto",
      }}
    >
      <Box sx={{ px: 0.75 }}>
        <Brand />
      </Box>
      <Box
        component="nav"
        aria-label="Sections"
        sx={{ position: "relative", display: "grid", gap: 0.5 }}
      >
        <Box
          aria-hidden="true"
          sx={{
            position: "absolute",
            left: 0,
            right: 0,
            height: 42,
            top: 0,
            transform: `translateY(${idx * 46}px)`,
            transition: "transform 280ms cubic-bezier(.22,1,.36,1)",
            borderRadius: 2.5,
            bgcolor: vb.accentSoft,
          }}
        />
        {NAV.map((n) => {
          const on = n.view === (view === "speak" ? "settings" : view);
          return (
            <ButtonBase
              key={n.view}
              onClick={() => showView(n.view)}
              aria-current={on ? "page" : undefined}
              sx={{
                position: "relative",
                height: 42,
                display: "flex",
                justifyContent: "flex-start",
                gap: 1.5,
                px: 1.5,
                borderRadius: 2.5,
                fontSize: "0.9rem",
                fontWeight: on ? 650 : 500,
                color: on ? vb.accentInk : "text.secondary",
                transition: "color 200ms",
                "&:hover": {
                  color: on ? vb.accentInk : "text.primary",
                  bgcolor: on ? "transparent" : alpha(vb.fg, 0.04),
                },
                "& svg": { fontSize: 20 },
              }}
            >
              {n.icon}
              {n.label}
              {n.view === "dictionary" && (
                <Box
                  component="span"
                  className="tabular"
                  sx={{
                    ml: "auto",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    color: "text.secondary",
                    bgcolor: vb.surface2,
                    border: `1px solid ${vb.line}`,
                    px: 0.9,
                    borderRadius: 999,
                  }}
                >
                  {dictCount}
                </Box>
              )}
            </ButtonBase>
          );
        })}
      </Box>
      <Box sx={{ mt: "auto", display: "grid", gap: 1 }}>
        <Connection />
        <Box sx={{ borderTop: `1px solid ${vb.line}`, pt: 1 }}>
          <ThemeSwitch />
        </Box>
      </Box>
    </Box>
  );
}

function MobileTop() {
  const mode = useThemeMode();
  const { vb } = useTheme();
  const { state, label } = useConnection();
  return (
    <Box
      component="header"
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        px: 2,
        py: 1.25,
        pt: "max(10px, env(safe-area-inset-top))",
        borderBottom: `1px solid ${vb.line}`,
        bgcolor: alpha(vb.surface, 0.8),
        backdropFilter: "blur(14px) saturate(1.2)",
        position: "relative",
        zIndex: 3,
      }}
    >
      <Brand compact />
      <Box sx={{ flex: 1 }} />
      <Box
        role="status"
        aria-live="polite"
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          px: 1.25,
          height: 32,
          borderRadius: 999,
          border: `1px solid ${vb.line}`,
          bgcolor: vb.surface,
          fontSize: "0.75rem",
          fontWeight: 600,
        }}
      >
        <StatusDot state={state} />
        {label}
      </Box>
      <Tooltip title={mode === "dark" ? "Light theme" : "Dark theme"}>
        <IconButton
          onClick={(e) => toggleTheme({ x: e.clientX, y: e.clientY })}
          aria-label="Toggle theme"
        >
          {mode === "dark" ? <LightModeRounded /> : <DarkModeRounded />}
        </IconButton>
      </Tooltip>
    </Box>
  );
}

function BottomNav() {
  const view = useBench((s) => s.view);
  const { vb } = useTheme();
  return (
    <Box
      sx={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 5,
        borderTop: `1px solid ${vb.line}`,
        bgcolor: alpha(vb.surface, 0.86),
        backdropFilter: "blur(16px) saturate(1.2)",
        pb: "env(safe-area-inset-bottom)",
      }}
    >
      <BottomNavigation
        value={view === "speak" ? "settings" : view}
        onChange={(_e, v: View) => showView(v)}
        showLabels
        component="nav"
        aria-label="Sections"
      >
        {NAV.map((n) => (
          <BottomNavigationAction
            key={n.view}
            value={n.view}
            label={n.label}
            icon={n.icon}
          />
        ))}
      </BottomNavigation>
    </Box>
  );
}

export function AppShell({ views }: { views: Record<View, ReactNode> }) {
  const view = useBench((s) => s.view);
  const mobile = useMediaQuery("(max-width: 899.95px)");
  return (
    <Box
      sx={{
        position: "relative",
        zIndex: 1,
        height: "100dvh",
        display: "flex",
        flexDirection: mobile ? "column" : "row",
      }}
    >
      {mobile ? <MobileTop /> : <Rail />}
      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        {(Object.keys(views) as View[]).map((v) => (
          <Box
            key={v}
            sx={{
              display: v === view ? "flex" : "none",
              flex: 1,
              minHeight: 0,
              flexDirection: "column",
            }}
            role="region"
            aria-label={v}
          >
            {views[v]}
          </Box>
        ))}
      </Box>
      {mobile && <BottomNav />}
    </Box>
  );
}
