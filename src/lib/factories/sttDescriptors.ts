import type {
  STTCredentials,
  STTEndpointConfig,
  STTProviderDescriptor,
} from "../types/index.js";
import { logger } from "../utils/logger.js";

/**
 * Every shipped speech-to-text provider — the single source of truth for its
 * name, aliases, credentials slice, env vars and capabilities. Pure data, like
 * `PROVIDER_DESCRIPTORS` for text providers; the handler classes are wired to
 * these names in `voice/index.ts`, and `MEDIA_HANDLER_CATALOG`'s STT rows are
 * derived from this list so the two cannot drift.
 *
 * **Order is precedence.** `resolveDefaultSTTProvider()` returns the first
 * entry that is configured, so reordering changes which engine every
 * `transcribe()` / `generate({ stt })` without an explicit provider uses.
 * `whistle` is last on purpose: it runs on this machine and needs no key, so
 * it is what a caller gets when nothing else is configured.
 */
export const STT_PROVIDER_DESCRIPTORS: readonly STTProviderDescriptor[] = [
  {
    name: "whisper",
    aliases: ["openai-stt", "openai-compatible"],
    label: "OpenAI-compatible /audio/transcriptions",
    credentialsKey: "whisper",
    envVars: ["OPENAI_STT_API_KEY", "OPENAI_API_KEY"],
    baseUrlEnv: "OPENAI_STT_BASE_URL",
    defaultModel: "whisper-1",
    capabilities: {
      streaming: "chunked",
      // OpenAI's own endpoint does not diarize; compatible servers may, and
      // the handler only sends the switch to those.
      diarization: true,
      languageDetect: true,
      prompt: true,
      wordTimestamps: true,
      local: false,
    },
  },
  {
    name: "deepgram",
    label: "Deepgram",
    credentialsKey: "deepgram",
    envVars: ["DEEPGRAM_API_KEY"],
    baseUrlEnv: "DEEPGRAM_BASE_URL",
    defaultModel: "nova-2",
    capabilities: {
      streaming: "native",
      diarization: true,
      languageDetect: true,
      prompt: false,
      wordTimestamps: true,
      local: false,
    },
  },
  {
    name: "elevenlabs-stt",
    // "elevenlabs" is reused across kinds on purpose — TTS primary, STT
    // alias. Each kind has its own registry, so `stt: { provider:
    // "elevenlabs" }` and `tts: { provider: "elevenlabs" }` resolve to
    // different handlers.
    aliases: ["scribe", "elevenlabs"],
    label: "ElevenLabs Scribe",
    credentialsKey: "elevenlabs",
    envVars: ["ELEVENLABS_API_KEY"],
    baseUrlEnv: "ELEVENLABS_STT_BASE_URL",
    defaultModel: "scribe_v2",
    capabilities: {
      streaming: "chunked",
      diarization: true,
      languageDetect: true,
      prompt: false,
      wordTimestamps: true,
      local: false,
    },
  },
  {
    name: "google-stt",
    label: "Google Cloud Speech-to-Text",
    credentialsKey: "google",
    // GoogleSTT accepts the AI Studio key aliases and a service-account file.
    envVars: [
      "GOOGLE_API_KEY",
      "GOOGLE_AI_API_KEY",
      "GEMINI_API_KEY",
      "GOOGLE_APPLICATION_CREDENTIALS",
    ],
    defaultModel: "latest_long",
    capabilities: {
      streaming: "chunked",
      diarization: true,
      languageDetect: false,
      prompt: false,
      wordTimestamps: true,
      local: false,
    },
  },
  {
    name: "azure-stt",
    label: "Azure Speech",
    credentialsKey: "azure",
    envVars: ["AZURE_SPEECH_KEY"],
    capabilities: {
      streaming: "chunked",
      diarization: false,
      languageDetect: false,
      prompt: false,
      wordTimestamps: true,
      local: false,
    },
  },
  {
    name: "whistle",
    aliases: ["cactus-whistle", "local"],
    label: "Whistle (built-in, local)",
    credentialsKey: "whistle",
    envVars: [],
    capabilities: {
      streaming: "chunked",
      diarization: false,
      languageDetect: true,
      prompt: false,
      wordTimestamps: true,
      local: true,
      languages: ["en", "de", "fr", "es", "it", "nl", "pl"],
    },
  },
];

/** The provider used when nothing else is configured. */
export const DEFAULT_LOCAL_STT_PROVIDER = "whistle";

const STT_DESCRIPTORS_BY_NAME: ReadonlyMap<string, STTProviderDescriptor> =
  new Map(STT_PROVIDER_DESCRIPTORS.map((d) => [d.name, d]));

/** Lower-cased name or alias → canonical descriptor name. */
const STT_ALIAS_INDEX: ReadonlyMap<string, string> = new Map(
  STT_PROVIDER_DESCRIPTORS.flatMap((d) => [
    [d.name.toLowerCase(), d.name] as const,
    ...(d.aliases ?? []).map((alias) => [alias.toLowerCase(), d.name] as const),
  ]),
);

/**
 * Canonical descriptor name for a provider name or alias (case-insensitive),
 * or `undefined` when it is not a shipped STT provider — a caller may still
 * have registered a handler of its own under that name.
 */
export function resolveSTTProviderName(
  name: string | undefined,
): string | undefined {
  if (!name) {
    return undefined;
  }
  return STT_ALIAS_INDEX.get(name.trim().toLowerCase());
}

/** The descriptor for a provider name or alias, if it is a shipped one. */
export function getSTTProviderDescriptor(
  name: string,
): STTProviderDescriptor | undefined {
  const canonical = resolveSTTProviderName(name);
  return canonical ? STT_DESCRIPTORS_BY_NAME.get(canonical) : undefined;
}

function hasValue(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Whether a credentials slice configures its provider: a key, a service
 * account file, or — for the OpenAI-compatible handler, whose self-hosted
 * servers often need no key — a base URL.
 */
function sliceConfigures(
  descriptor: STTProviderDescriptor,
  credentials: STTCredentials | undefined,
): boolean {
  const slice: Record<string, unknown> | undefined =
    credentials?.[descriptor.credentialsKey];
  if (!slice) {
    return false;
  }
  if (hasValue(slice.apiKey) || hasValue(slice.credentialsPath)) {
    return true;
  }
  return descriptor.credentialsKey === "whisper" && hasValue(slice.baseURL);
}

/**
 * Whether a provider can run with these credentials and the environment. The
 * local engine needs no configuration and always counts. Unknown names are
 * not configured.
 */
export function isSTTProviderConfigured(
  name: string,
  credentials?: STTCredentials,
): boolean {
  const descriptor = getSTTProviderDescriptor(name);
  if (!descriptor) {
    return false;
  }
  if (descriptor.capabilities.local) {
    return true;
  }
  if (sliceConfigures(descriptor, credentials)) {
    return true;
  }
  return descriptor.envVars.some((envVar) => hasValue(process.env[envVar]));
}

/** Configured providers, in precedence order (the local engine last). */
export function listConfiguredSTTProviders(
  credentials?: STTCredentials,
): string[] {
  return [
    ...STT_PROVIDER_DESCRIPTORS.filter((d) =>
      isSTTProviderConfigured(d.name, credentials),
    ).map((d) => d.name),
    ...Object.keys(resolveSTTEndpoints(credentials)),
  ];
}

/**
 * Named OpenAI-compatible endpoints: `credentials.stt.endpoints` over the
 * `NEUROLINK_STT_ENDPOINTS` JSON object. Keys are lowercased; one that
 * collides with a shipped provider name or alias is dropped with a warning,
 * as is an entry without a `baseURL`. Malformed JSON is reported once and
 * ignored.
 */
export function resolveSTTEndpoints(
  credentials?: STTCredentials,
): Record<string, STTEndpointConfig> {
  const out: Record<string, STTEndpointConfig> = {};
  const raw = process.env.NEUROLINK_STT_ENDPOINTS?.trim();
  if (raw) {
    try {
      Object.assign(
        out,
        validateSTTEndpoints("NEUROLINK_STT_ENDPOINTS", JSON.parse(raw)),
      );
    } catch (error) {
      logger.warn(
        `[STT] NEUROLINK_STT_ENDPOINTS is not valid JSON; ignoring it (${error instanceof Error ? error.message : String(error)})`,
      );
    }
  }
  Object.assign(out, resolveCallSTTEndpoints(credentials));
  return out;
}

/**
 * The per-call endpoints alone (`credentials.stt.endpoints`), validated
 * exactly as the env map is: names lower-cased, a name that collides with a
 * shipped provider or alias dropped, an entry without a `baseURL` dropped.
 * Every per-call lookup goes through this so a request can neither replace a
 * shipped handler nor build an endpoint the env form would have refused.
 */
export function resolveCallSTTEndpoints(
  credentials?: STTCredentials,
): Record<string, STTEndpointConfig> {
  return validateSTTEndpoints(
    "credentials.stt.endpoints",
    credentials?.endpoints,
  );
}

function validateSTTEndpoints(
  source: string,
  entries: unknown,
): Record<string, STTEndpointConfig> {
  const out: Record<string, STTEndpointConfig> = {};
  if (typeof entries !== "object" || entries === null) {
    return out;
  }
  for (const [rawName, cfg] of Object.entries(entries)) {
    const name = rawName.trim().toLowerCase();
    if (!name) {
      continue;
    }
    if (STT_ALIAS_INDEX.has(name)) {
      logger.warn(
        `[STT] ${source}: endpoint "${rawName}" collides with a shipped provider name; ignoring it`,
      );
      continue;
    }
    const baseURL =
      typeof cfg === "object" && cfg !== null && "baseURL" in cfg
        ? (cfg as { baseURL?: unknown }).baseURL
        : undefined;
    if (typeof baseURL !== "string" || !baseURL.trim()) {
      logger.warn(
        `[STT] ${source}: endpoint "${rawName}" has no baseURL; ignoring it`,
      );
      continue;
    }
    const c = cfg as STTEndpointConfig;
    out[name] = {
      baseURL: baseURL.trim(),
      ...(typeof c.apiKey === "string" ? { apiKey: c.apiKey } : {}),
      ...(typeof c.model === "string" ? { model: c.model } : {}),
      ...(typeof c.timeoutMs === "number" ? { timeoutMs: c.timeoutMs } : {}),
    };
  }
  return out;
}

/**
 * The provider a transcription without an explicit one goes to:
 * `NEUROLINK_STT_PROVIDER` when it names a known provider or alias, else the
 * first configured provider in descriptor order, else the built-in local
 * engine. Never throws, never returns an empty string.
 */
export function resolveDefaultSTTProvider(
  credentials?: STTCredentials,
): string {
  const fromEnv = process.env.NEUROLINK_STT_PROVIDER?.trim();
  if (fromEnv) {
    const canonical = resolveSTTProviderName(fromEnv);
    if (canonical) {
      return canonical;
    }
    const endpoint = fromEnv.toLowerCase();
    if (endpoint in resolveSTTEndpoints(credentials)) {
      return endpoint;
    }
    logger.warn(
      `[STT] NEUROLINK_STT_PROVIDER="${fromEnv}" is not a known STT provider; ` +
        `ignoring it. Known: ${STT_PROVIDER_DESCRIPTORS.map((d) => d.name).join(", ")}`,
    );
  }
  const configured = STT_PROVIDER_DESCRIPTORS.find(
    (d) =>
      !d.capabilities.local && isSTTProviderConfigured(d.name, credentials),
  );
  return configured?.name ?? DEFAULT_LOCAL_STT_PROVIDER;
}

/**
 * The variables that would configure each hosted STT provider, one clause per
 * provider in precedence order, e.g. "OPENAI_STT_API_KEY or OPENAI_API_KEY for
 * whisper, or DEEPGRAM_API_KEY for deepgram". Derived from the descriptors so
 * a new provider appears in every "nothing is configured" message.
 */
export function describeSTTProviderKeys(): string {
  return STT_PROVIDER_DESCRIPTORS.filter((d) => d.envVars.length > 0)
    .map((d) => `${d.envVars.join(" or ")} for ${d.name}`)
    .join(", or ");
}
