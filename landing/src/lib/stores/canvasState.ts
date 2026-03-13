import { writable, derived } from "svelte/store";

export type SectionId =
  | "hero"
  | "streams"
  | "flow"
  | "connectors"
  | "observe"
  | "ecosystem"
  | "cta";

// Which landing section is currently in view
export const activeSection = writable<SectionId>("hero");
export const scrollProgress = writable<number>(0); // 0–1
export const scrollVelocity = writable<number>(0); // pixels/frame, smoothed

// Per-section canvas configuration
export interface SectionCanvasConfig {
  intensity: number;
  particleSpeed: number;
  branchGrowth: number;
  signalDensity: number;
  dominantColor: string;
  glowNodes: boolean;
  spinalActivity: number;
}

const SECTION_CONFIGS: Record<SectionId, SectionCanvasConfig> = {
  hero: {
    intensity: 0.4,
    particleSpeed: 1,
    branchGrowth: 2,
    signalDensity: 8,
    dominantColor: "#00d2ff",
    glowNodes: false,
    spinalActivity: 1,
  },
  streams: {
    intensity: 0.6,
    particleSpeed: 2,
    branchGrowth: 4,
    signalDensity: 20,
    dominantColor: "#00f0ff",
    glowNodes: false,
    spinalActivity: 1.5,
  },
  flow: {
    intensity: 0.7,
    particleSpeed: 1.5,
    branchGrowth: 4,
    signalDensity: 15,
    dominantColor: "#00d2ff",
    glowNodes: false,
    spinalActivity: 2,
  },
  connectors: {
    intensity: 0.8,
    particleSpeed: 1,
    branchGrowth: 5,
    signalDensity: 10,
    dominantColor: "#ff9100",
    glowNodes: true,
    spinalActivity: 1.2,
  },
  observe: {
    intensity: 0.5,
    particleSpeed: 1.5,
    branchGrowth: 3,
    signalDensity: 12,
    dominantColor: "#00f0ff",
    glowNodes: false,
    spinalActivity: 1.2,
  },
  ecosystem: {
    intensity: 0.45,
    particleSpeed: 1.2,
    branchGrowth: 3,
    signalDensity: 10,
    dominantColor: "#00d2ff",
    glowNodes: false,
    spinalActivity: 1,
  },
  cta: {
    intensity: 0.3,
    particleSpeed: 0.5,
    branchGrowth: 3,
    signalDensity: 5,
    dominantColor: "#00d2ff",
    glowNodes: false,
    spinalActivity: 0.8,
  },
};

const DEFAULT_CONFIG: SectionCanvasConfig = SECTION_CONFIGS.hero;

// Derived store: current canvas config based on active section
export const canvasConfig = derived(
  activeSection,
  ($activeSection) => SECTION_CONFIGS[$activeSection] ?? DEFAULT_CONFIG,
);
