import { useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { storage } from "../engine/store";
import type { Mode } from "../theme/theme";

// Saved choice wins; otherwise follow the system. The toggle stores an explicit choice.
const media = window.matchMedia("(prefers-color-scheme: dark)");
let saved = storage.get<Mode | null>("voice-bench-theme", null);
const listeners = new Set<() => void>();
const current = (): Mode => saved ?? (media.matches ? "dark" : "light");
media.addEventListener("change", () => listeners.forEach((l) => l()));

export function useThemeMode(): Mode {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    current,
    current,
  );
}

export function toggleTheme(origin?: { x: number; y: number }) {
  const next: Mode = current() === "dark" ? "light" : "dark";
  const apply = () => {
    saved = next;
    storage.set("voice-bench-theme", next);
    flushSync(() => listeners.forEach((l) => l()));
  };
  const root = document.documentElement;
  if (origin) {
    root.style.setProperty("--vt-x", origin.x + "px");
    root.style.setProperty("--vt-y", origin.y + "px");
  }
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (document.startViewTransition && !reduce)
    document.startViewTransition(apply);
  else apply();
}
