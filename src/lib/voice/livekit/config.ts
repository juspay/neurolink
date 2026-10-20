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
  RealtimeVoiceAgentConfig,
  RealtimeVoiceBackend,
  RealtimeVoiceConfig,
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

function readOptionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function readNumberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (typeof raw === "string" && raw.trim().length > 0) {
    const parsed = Number(raw.trim());
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
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

const DEFAULT_REALTIME_MODEL = "gemini-live-2.5-flash";
// xAI's documented flagship Grok Voice id, accepted and honoured by the live
// service (2026-10-20). The plugin's own default, `grok-voice-think-fast-1.0`,
// ran as `grok-voice-3.0` there.
const DEFAULT_XAI_REALTIME_MODEL = "grok-voice-3.0";
const DEFAULT_REALTIME_LOCATION = "global";
const DEFAULT_RESPONSE_MODALITY = "AUDIO";
const DEFAULT_SYSTEM_PROMPT =
  "You are a concise voice assistant for a merchant dashboard. Keep replies short and spoken.";
const DEFAULT_GREETING =
  "Briefly greet the merchant and ask how you can help with their store today.";
const DEFAULT_LIGHTHOUSE_URL = "http://localhost:5173";
const DEFAULT_MCP_PATH = "/ai/mcp/v2";
const ALLOW_INSECURE_ENV = "XAI_REALTIME_ALLOW_INSECURE";

/**
 * The backend named by `VOICE_REALTIME_BACKEND`: `gemini` or `xai`, matched
 * case-insensitively, with blank or absent meaning `gemini`. The error names the
 * variable and the choices and repeats nothing from the environment.
 */
function readRealtimeBackend(): RealtimeVoiceBackend {
  const value = readEnv("VOICE_REALTIME_BACKEND", "gemini").toLowerCase();
  if (value === "gemini" || value === "xai") {
    return value;
  }
  throw new Error(
    'VOICE_REALTIME_BACKEND must be "gemini" or "xai" (leave it unset for gemini)',
  );
}

/**
 * A backend passed in code. The type already limits it, but a plain-JavaScript
 * caller is not held by the type, and a typo would otherwise take the xai
 * branch and fail on a missing key. The error repeats nothing it was given.
 */
function requireKnownBackend(value: string): RealtimeVoiceBackend {
  if (value === "gemini" || value === "xai") {
    return value;
  }
  throw new Error('The realtime voice backend must be "gemini" or "xai"');
}

function parseWebSocketUrl(value: string): URL | undefined {
  try {
    const url = new URL(value);
    return url.protocol === "ws:" || url.protocol === "wss:" ? url : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Whether a WHATWG-parsed hostname is `localhost`, an address in `127.0.0.0/8`
 * or `[::1]`. The parser has already lowercased the name and reduced shorthand
 * IPv4 forms (`127.1`, `0x7f.1`) to dotted decimal, and a userinfo prefix such
 * as `localhost@host` never reaches `hostname`, so neither can pass for a
 * loopback host.
 */
function isLoopbackHost(hostname: string): boolean {
  if (hostname === "localhost" || hostname === "[::1]") {
    return true;
  }
  const octets = hostname.split(".");
  return (
    octets.length === 4 &&
    octets[0] === "127" &&
    octets.every((octet) => /^\d{1,3}$/.test(octet) && Number(octet) <= 255)
  );
}

/**
 * Refuse a `ws://` URL to a host other than loopback unless
 * `XAI_REALTIME_ALLOW_INSECURE=true`: the xAI plugin sends `XAI_API_KEY` to the
 * URL it is given, and `ws://` sends it unencrypted. Anything else passes,
 * including a value that is not a ws or wss URL, which is for the caller's own
 * check. The error names the setting and the opt-in and does not repeat the
 * value.
 */
function requireNoCleartextCrossHost(value: string, name: string): void {
  const url = parseWebSocketUrl(value);
  if (
    url?.protocol === "ws:" &&
    !isLoopbackHost(url.hostname) &&
    readEnv(ALLOW_INSECURE_ENV, "").toLowerCase() !== "true"
  ) {
    throw new Error(
      `${name} is a ws:// URL to a host other than localhost, 127.0.0.0/8 or [::1], which would send XAI_API_KEY unencrypted. Use wss://, or set ${ALLOW_INSECURE_ENV}=true to accept that`,
    );
  }
}

/**
 * A ws or wss URL that passes `requireNoCleartextCrossHost`. The error names the
 * setting and does not repeat the value. Exported so the model factory applies
 * the same check to a hand-built config as config resolution applies to the
 * variable and to a caller's override.
 */
export function requireWebSocketUrl(value: string, name: string): string {
  if (parseWebSocketUrl(value) === undefined) {
    throw new Error(`${name} must be a ws:// or wss:// URL`);
  }
  requireNoCleartextCrossHost(value, name);
  return value;
}

/** `XAI_REALTIME_BASE_URL`, which must be a ws or wss URL when set. */
function readXaiBaseUrl(): string | undefined {
  const value = readOptionalEnv("XAI_REALTIME_BASE_URL");
  return value === undefined
    ? undefined
    : requireWebSocketUrl(value, "XAI_REALTIME_BASE_URL");
}

/** A caller-supplied `xaiBaseURL` gets the same check as the variable; blank means unset, so the variable applies. */
function resolveXaiBaseUrl(override: string | undefined): string | undefined {
  const value = override?.trim();
  return value ? requireWebSocketUrl(value, "xaiBaseURL") : readXaiBaseUrl();
}

/**
 * Resolve the realtime (speech-to-speech) voice configuration from the
 * environment.
 *
 * Every value has a safe default so a worker can run with no realtime-specific
 * env at all. `VOICE_REALTIME_BACKEND` picks the model family (`gemini`, the
 * default, or `xai`); `backend` here overrides it and then the environment's
 * value is not read. A non-blank `xaiBaseURL` here likewise replaces
 * `XAI_REALTIME_BASE_URL` after the same ws or wss check. Either URL is
 * checked whatever the backend. A `ws://` URL to a host other than `localhost`,
 * `127.0.0.0/8` or `[::1]` is refused unless `XAI_REALTIME_ALLOW_INSECURE=true`,
 * because the xAI plugin sends `XAI_API_KEY` to it unencrypted.
 * `VOICE_LIVE_MODEL` overrides the backend's default model.
 * Vertex `project` is resolved from `VERTEX_PROJECT`, then the service-account
 * project (`GOOGLE_AUTH_BREEZE_PROJECT_ID`), then `GOOGLE_CLOUD_PROJECT_ID`;
 * project, location and modality only matter to the gemini backend. The MCP URL
 * is `VOICE_MCP_URL` if set, otherwise `${LIGHTHOUSE_URL}/ai/mcp/v2`.
 */
export function resolveRealtimeVoiceConfig(
  overrides: Pick<RealtimeVoiceAgentConfig, "backend" | "xaiBaseURL"> = {},
): RealtimeVoiceConfig {
  const backend =
    overrides.backend === undefined
      ? readRealtimeBackend()
      : requireKnownBackend(overrides.backend);
  const lighthouseUrl = readEnv("LIGHTHOUSE_URL", DEFAULT_LIGHTHOUSE_URL);
  const mcpUrl = readEnv(
    "VOICE_MCP_URL",
    `${lighthouseUrl}${DEFAULT_MCP_PATH}`,
  );
  return {
    backend,
    project:
      readOptionalEnv("VERTEX_PROJECT") ??
      readOptionalEnv("GOOGLE_AUTH_BREEZE_PROJECT_ID") ??
      readOptionalEnv("GOOGLE_CLOUD_PROJECT_ID"),
    location: readEnv("VERTEX_LOCATION", DEFAULT_REALTIME_LOCATION),
    model: readEnv(
      "VOICE_LIVE_MODEL",
      backend === "xai" ? DEFAULT_XAI_REALTIME_MODEL : DEFAULT_REALTIME_MODEL,
    ),
    voice: readOptionalEnv("VOICE_S2S_VOICE"),
    xaiBaseURL: resolveXaiBaseUrl(overrides.xaiBaseURL),
    responseModality: readEnv(
      "VOICE_RESPONSE_MODALITY",
      DEFAULT_RESPONSE_MODALITY,
    ).toUpperCase(),
    systemPrompt: readEnv("VOICE_SYSTEM_PROMPT", DEFAULT_SYSTEM_PROMPT),
    greeting: readEnv("VOICE_GREETING", DEFAULT_GREETING),
    toolsEnabled: readEnv("VOICE_S2S_TOOLS", "").toLowerCase() === "true",
    mcpUrl,
    emptyRoomGraceMs: readNumberEnv("VOICE_EMPTY_ROOM_GRACE_MS", 30_000),
    joinDeadlineMs: readNumberEnv("VOICE_JOIN_DEADLINE_MS", 60_000),
    hitlTimeoutMs: readNumberEnv("VOICE_HITL_TIMEOUT_MS", 45_000),
    metricsIntervalMs: readNumberEnv("VOICE_METRICS_INTERVAL_MS", 10_000),
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
