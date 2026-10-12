import { CssBaseline, ThemeProvider } from "@mui/material";
import { useEffect, useMemo } from "react";
import { boot } from "./engine/boot";
import { benchTheme } from "./theme/theme";
import { AppShell } from "./ui/AppShell";
import { ErrorBoundary } from "./ui/ErrorBoundary";
import { Backdrop, ThemeVars } from "./ui/Backdrop";
import { DictionaryView } from "./ui/DictionaryView";
import { FilesView } from "./ui/FilesView";
import { LiveView } from "./ui/LiveView";
import { SettingsView } from "./ui/SettingsView";
import { SpeakView } from "./ui/SpeakView";
import { useThemeMode } from "./ui/themeMode";

export function App() {
  const mode = useThemeMode();
  const theme = useMemo(() => benchTheme(mode), [mode]);
  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme.vb.bg);
  }, [mode, theme]);
  useEffect(() => {
    boot();
  }, []);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      <ThemeVars />
      <Backdrop />
      <ErrorBoundary
        fallback={
          <div
            style={{
              position: "relative",
              zIndex: 1,
              height: "100dvh",
              display: "grid",
              placeItems: "center",
              padding: 24,
              textAlign: "center",
            }}
          >
            <div>
              <p
                style={{
                  fontWeight: 700,
                  fontSize: "1.1rem",
                  margin: "0 0 8px",
                }}
              >
                Something on this page went wrong.
              </p>
              <button
                type="button"
                onClick={() => location.reload()}
                style={{
                  font: "inherit",
                  padding: "8px 16px",
                  borderRadius: 10,
                  border: "1px solid currentColor",
                  background: "transparent",
                  color: "inherit",
                  cursor: "pointer",
                }}
              >
                Reload
              </button>
            </div>
          </div>
        }
      >
        <AppShell
          views={{
            live: <LiveView />,
            files: <FilesView />,
            dictionary: <DictionaryView />,
            speak: <SpeakView />,
            settings: <SettingsView />,
          }}
        />
      </ErrorBoundary>
    </ThemeProvider>
  );
}
