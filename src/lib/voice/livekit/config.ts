/**
 * Environment resolution for the LiveKit voice agent.
 *
 * Reads LiveKit connection settings and LLM defaults from `process.env` with
 * descriptive errors for missing required values. No type assertions: presence
 * is verified with explicit string checks.
 *
 * See docs/features/livekit-voice-agent.md.
 */

import type {
  LiveKitServerConfig,
  LiveKitBrainDefaults,
} from "../../types/index.js";

const DEFAULT_LLM_PROVIDER = "bedrock";
const DEFAULT_LLM_MODEL = "claude-sonnet-4-6";

/** Read a required environment variable or throw a descriptive error. */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(
      `${name} is not set in environment (required for the LiveKit voice agent)`,
    );
  }
  return value.trim();
}

/** Read an optional environment variable, falling back to a default. */
function readEnv(name: string, fallback: string): string {
  const value = process.env[name];
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return fallback;
}

/**
 * Resolve LiveKit server connection settings from the environment.
 *
 * Requires `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET`. Works
 * identically for LiveKit Cloud, a self-hosted server, or `livekit-server --dev`
 * — only the values differ.
 */
export function resolveLiveKitServerConfig(): LiveKitServerConfig {
  return {
    url: requireEnv("LIVEKIT_URL"),
    apiKey: requireEnv("LIVEKIT_API_KEY"),
    apiSecret: requireEnv("LIVEKIT_API_SECRET"),
  };
}

/**
 * Resolve the LLM provider/model defaults for the brain.
 *
 * Defaults to Bedrock / Claude; overridable via `VOICE_LLM_PROVIDER` and
 * `VOICE_LLM_MODEL`.
 */
export function resolveBrainDefaults(): LiveKitBrainDefaults {
  return {
    provider: readEnv("VOICE_LLM_PROVIDER", DEFAULT_LLM_PROVIDER),
    model: readEnv("VOICE_LLM_MODEL", DEFAULT_LLM_MODEL),
  };
}

const EOU_TRUTHY = new Set(["1", "true", "english", "en", "on", "yes"]);

/**
 * Resolve the semantic end-of-utterance (EOU) turn-detection settings.
 *
 * Opt-in via `LIVEKIT_EOU_TURN_DETECTION` (`1`/`true`/`english`/`en`/`on`/`yes`).
 * When enabled, the English `@livekit/agents-plugin-livekit` EOU model decides
 * whether the user's turn is truly over, layered on top of VAD silence — so
 * natural mid-sentence pauses don't split one utterance. English-only; the
 * model adds ~200MB RAM per worker and ~10ms per turn-end.
 *
 * `LIVEKIT_EOU_UNLIKELY_THRESHOLD` optionally overrides the model's confidence
 * threshold (lower = end the turn more eagerly).
 */
export function resolveEouTurnDetection(): {
  enabled: boolean;
  unlikelyThreshold: number | undefined;
} {
  const raw = process.env.LIVEKIT_EOU_TURN_DETECTION;
  const enabled =
    typeof raw === "string" && EOU_TRUTHY.has(raw.trim().toLowerCase());
  const thresholdRaw = process.env.LIVEKIT_EOU_UNLIKELY_THRESHOLD;
  let unlikelyThreshold: number | undefined;
  if (typeof thresholdRaw === "string" && thresholdRaw.trim().length > 0) {
    const parsed = Number(thresholdRaw.trim());
    if (Number.isFinite(parsed)) {
      unlikelyThreshold = parsed;
    }
  }
  return { enabled, unlikelyThreshold };
}
