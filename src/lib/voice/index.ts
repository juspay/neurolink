/**
 * Voice Module - Unified Voice/Speech Integration for NeuroLink
 *
 * Provides TTS (Text-to-Speech), STT (Speech-to-Text), and
 * Realtime Voice capabilities across multiple providers.
 *
 * Use TTSProcessor (src/lib/utils/ttsProcessor.ts) for TTS.
 * Use STTProcessor (src/lib/utils/sttProcessor.ts) for STT.
 * Use RealtimeProcessor for realtime voice sessions.
 *
 * Importing this module does NOT register any handlers as a side effect.
 * Call `registerDefaultTTSHandlers()` / `registerDefaultSTTHandlers()` /
 * `registerDefaultRealtimeHandlers()` explicitly (or go through
 * `ProviderRegistry.registerAllProviders()`, which every documented
 * `NeuroLink` entry point already calls) to register every shipped handler
 * whose backing API key is present in `process.env`. Registration is
 * idempotent and silently skipped on failure.
 *
 * @module voice
 */

import type {
  RealtimeHandler,
  STTCredentials,
  STTEndpointConfig,
  STTHandler,
  TTSHandler,
} from "../types/index.js";
import { MEDIA_HANDLER_CATALOG } from "../factories/mediaHandlerCatalog.js";
import {
  resolveCallSTTEndpoints,
  resolveSTTEndpoints,
  resolveSTTProviderName,
} from "../factories/sttDescriptors.js";
import { logger } from "../utils/logger.js";
import { STTProcessor } from "../utils/sttProcessor.js";
import { TTSProcessor } from "../utils/ttsProcessor.js";
import { GoogleTTSHandler } from "../adapters/tts/googleTTSHandler.js";
import { RealtimeProcessor } from "./RealtimeVoiceAPI.js";

// ============================================================================
// ERROR CODES AND CONSTANTS
// ============================================================================

export {
  AUDIO_FORMAT_DETAILS,
  DEFAULT_REALTIME_CONFIG,
  DEFAULT_STT_OPTIONS,
  // Type guards
  isSTTResult,
  isTranscriptionSegment,
  isValidRealtimeConfig,
  isValidSTTOptions,
  REALTIME_ERROR_CODES,
  STT_ERROR_CODES,
  VOICE_ERROR_CODES,
} from "../types/index.js";

// ============================================================================
// ERRORS
// ============================================================================

export { RealtimeError, STTError, VoiceError } from "./errors.js";
import { STTError } from "./errors.js";

// ============================================================================
// REALTIME VOICE API
// ============================================================================

export { BaseRealtimeHandler, RealtimeProcessor } from "./RealtimeVoiceAPI.js";

// ============================================================================
// AUDIO UTILITIES
// ============================================================================

export {
  AUDIO_SIGNATURES,
  calculateDuration,
  convertAudioFormat,
  createPcmBuffer,
  createWavFile,
  createWavHeader,
  detectAudioFormat,
  extractPcmSamples,
  getFileExtension,
  getMimeType,
  MIME_TYPES,
  normalizeAudio,
  resamplePcm,
  splitIntoChunks,
} from "./audio-utils.js";

// ============================================================================
// STREAM HANDLER
// ============================================================================

export {
  asyncIterableToStream,
  ChunkedAudioStream,
  StreamHandler,
  StreamMerger,
  StreamSplitter,
  streamToAsyncIterable,
} from "./stream-handler.js";

// ============================================================================
// TTS PROVIDERS
// ============================================================================

export { GoogleTTSHandler } from "../adapters/tts/googleTTSHandler.js";
export { AzureTTS, AzureTTS as AzureTTSHandler } from "./providers/AzureTTS.js";
export {
  SixtyDBTTS,
  SixtyDBTTS as SixtyDBTTSHandler,
} from "./providers/SixtyDBTTS.js";
export {
  CartesiaTTS,
  CartesiaTTS as CartesiaTTSHandler,
} from "./providers/CartesiaTTS.js";
export {
  ElevenLabsTTS,
  ElevenLabsTTS as ElevenLabsTTSHandler,
} from "./providers/ElevenLabsTTS.js";
export {
  FishAudioTTS,
  FishAudioTTS as FishAudioTTSHandler,
} from "./providers/FishAudioTTS.js";
export {
  OpenAITTS,
  OpenAITTS as OpenAITTSHandler,
} from "./providers/OpenAITTS.js";

// ============================================================================
// STT PROVIDERS
// ============================================================================

export { AzureSTT, AzureSTT as AzureSTTHandler } from "./providers/AzureSTT.js";
export {
  DeepgramSTT,
  DeepgramSTT as DeepgramSTTHandler,
} from "./providers/DeepgramSTT.js";
export {
  ElevenLabsSTT,
  ElevenLabsSTT as ElevenLabsSTTHandler,
} from "./providers/ElevenLabsSTT.js";
export {
  GoogleSTT,
  GoogleSTT as GoogleSTTHandler,
} from "./providers/GoogleSTT.js";
export {
  OpenAISTT,
  OpenAISTTHandler,
  WhisperSTT,
  WhisperSTTHandler,
} from "./providers/OpenAISTT.js";
export {
  WhistleSTT,
  WhistleSTT as WhistleSTTHandler,
} from "./providers/WhistleSTT.js";

// ============================================================================
// REALTIME PROVIDERS
// ============================================================================

export {
  GeminiLive,
  GeminiLive as GeminiLiveHandler,
} from "./providers/GeminiLive.js";
export {
  OpenAIRealtime,
  OpenAIRealtime as OpenAIRealtimeHandler,
} from "./providers/OpenAIRealtime.js";

// ============================================================================
// AUTO-REGISTRATION
// ============================================================================

import { AzureTTS } from "./providers/AzureTTS.js";
import { CartesiaTTS } from "./providers/CartesiaTTS.js";
import { ElevenLabsTTS } from "./providers/ElevenLabsTTS.js";
import { FishAudioTTS } from "./providers/FishAudioTTS.js";
import { SixtyDBTTS } from "./providers/SixtyDBTTS.js";
import { OpenAITTS } from "./providers/OpenAITTS.js";

import { AzureSTT } from "./providers/AzureSTT.js";
import { DeepgramSTT } from "./providers/DeepgramSTT.js";
import { ElevenLabsSTT } from "./providers/ElevenLabsSTT.js";
import { GoogleSTT } from "./providers/GoogleSTT.js";
import { OpenAISTT } from "./providers/OpenAISTT.js";
import { WhistleSTT } from "./providers/WhistleSTT.js";

import { GeminiLive } from "./providers/GeminiLive.js";
import { OpenAIRealtime } from "./providers/OpenAIRealtime.js";

// Provider names + aliases are the Task-8 catalog's job — only the factory
// (which needs the imported handler class) stays local to this module.
const TTS_HANDLER_FACTORIES: Readonly<Record<string, () => TTSHandler>> = {
  // Google TTS doubles as both the AI Studio and Vertex TTS handler.
  "google-ai": () => new GoogleTTSHandler(),
  "openai-tts": () => new OpenAITTS(),
  elevenlabs: () => new ElevenLabsTTS(),
  "azure-tts": () => new AzureTTS(),
  "fish-audio": () => new FishAudioTTS(),
  sixtydb: () => new SixtyDBTTS(),
  cartesia: () => new CartesiaTTS(),
};

const TTS_HANDLER_CANDIDATES: ReadonlyArray<{
  readonly name: string;
  readonly aliases?: readonly string[];
  readonly factory: () => TTSHandler;
}> = MEDIA_HANDLER_CATALOG.filter((entry) => entry.kind === "tts").map(
  (entry) => {
    const factory = TTS_HANDLER_FACTORIES[entry.name];
    if (!factory) {
      throw new Error(
        `[voice/tts] no handler factory for catalog entry "${entry.name}"`,
      );
    }
    return { name: entry.name, aliases: entry.aliases, factory };
  },
);

/**
 * One factory per STT descriptor name. Each takes the request's (or
 * instance's) `credentials.stt` and hands its own slice to the handler; the
 * handler fills whatever the slice leaves out from the environment.
 */
const STT_HANDLER_FACTORIES: Readonly<
  Record<string, (credentials?: STTCredentials) => STTHandler>
> = {
  whisper: (credentials) => new OpenAISTT(credentials?.whisper),
  deepgram: (credentials) => new DeepgramSTT(credentials?.deepgram),
  "elevenlabs-stt": (credentials) => new ElevenLabsSTT(credentials?.elevenlabs),
  "google-stt": (credentials) => new GoogleSTT(credentials?.google),
  "azure-stt": (credentials) => new AzureSTT(credentials?.azure),
  whistle: (credentials) => new WhistleSTT(credentials?.whistle),
};

/** Registered even when `isConfigured()` is false: it is the no-config default. */
const ALWAYS_REGISTERED_STT = new Set(["whistle"]);

const STT_HANDLER_CANDIDATES: ReadonlyArray<{
  readonly name: string;
  readonly aliases?: readonly string[];
  readonly factory: (credentials?: STTCredentials) => STTHandler;
}> = MEDIA_HANDLER_CATALOG.filter((entry) => entry.kind === "stt").map(
  (entry) => {
    const factory = STT_HANDLER_FACTORIES[entry.name];
    if (!factory) {
      throw new Error(
        `[voice/stt] no handler factory for catalog entry "${entry.name}"`,
      );
    }
    return { name: entry.name, aliases: entry.aliases, factory };
  },
);

/**
 * A fresh STT handler for a shipped provider name or alias, built from
 * `credentials` with the environment as fallback. Used for per-call
 * credentials, where the registry's shared instance (built from the
 * environment at registration time) is the wrong one.
 *
 * @throws STTError when the name is not a shipped STT provider
 */
export function createSTTHandler(
  provider: string,
  credentials?: STTCredentials,
): STTHandler {
  // A named endpoint in the caller's credentials wins over everything and
  // never touches the shared registry.
  const endpoint =
    resolveCallSTTEndpoints(credentials)[provider.trim().toLowerCase()];
  if (endpoint) {
    return endpointHandler(endpoint);
  }
  const canonical = resolveSTTProviderName(provider);
  const factory = canonical ? STT_HANDLER_FACTORIES[canonical] : undefined;
  if (!factory) {
    throw STTError.providerNotSupported(
      provider,
      Object.keys(STT_HANDLER_FACTORIES),
    );
  }
  return factory(credentials);
}

const REALTIME_HANDLER_FACTORIES: Readonly<
  Record<string, () => RealtimeHandler>
> = {
  "openai-realtime": () => new OpenAIRealtime(),
  "gemini-live": () => new GeminiLive(),
};

const REALTIME_HANDLER_CANDIDATES: ReadonlyArray<{
  readonly name: string;
  readonly aliases?: readonly string[];
  readonly factory: () => RealtimeHandler;
}> = MEDIA_HANDLER_CATALOG.filter((entry) => entry.kind === "realtime").map(
  (entry) => {
    const factory = REALTIME_HANDLER_FACTORIES[entry.name];
    if (!factory) {
      throw new Error(
        `[voice/realtime] no handler factory for catalog entry "${entry.name}"`,
      );
    }
    return { name: entry.name, aliases: entry.aliases, factory };
  },
);

function registerCandidates<H extends { isConfigured(): boolean }>(
  candidates: ReadonlyArray<{
    readonly name: string;
    readonly aliases?: readonly string[];
    readonly factory: () => H;
  }>,
  supports: (name: string) => boolean,
  getRegistered: (name: string) => H | undefined,
  register: (name: string, handler: H) => void,
  scope: string,
  requireConfigured: boolean | ((name: string) => boolean),
): void {
  for (const { name, aliases, factory } of candidates) {
    // Compute missingName / missingAliases separately so a manually-
    // registered primary name doesn't block alias backfill. Important for
    // BC: existing callers that register e.g. "elevenlabs" should still
    // see "elevenlabs-tts" wired up by this loop.
    const missingName = !supports(name);
    const missingAliases = (aliases ?? []).filter((alias) => !supports(alias));
    if (!missingName && missingAliases.length === 0) {
      continue;
    }
    try {
      // If the primary is already registered, reuse that exact handler
      // instance for any alias backfill — wiring an alias to a *different*
      // factory-fresh instance would silently diverge from the canonical
      // primary's behavior (different config, different credentials).
      // Only call factory() when we actually need to register the primary.
      let handler: H | undefined;
      if (!missingName) {
        handler = getRegistered(name);
      }
      if (!handler) {
        handler = factory();
        const mustBeConfigured =
          typeof requireConfigured === "function"
            ? requireConfigured(name)
            : requireConfigured;
        if (mustBeConfigured && !handler.isConfigured()) {
          continue;
        }
      }
      if (missingName) {
        register(name, handler);
      }
      for (const alias of missingAliases) {
        register(alias, handler);
      }
    } catch (err) {
      logger.debug(
        `[${scope}] ${name} auto-registration skipped: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}

/**
 * Register every shipped TTS handler whose backing credentials are
 * present in the environment. Safe to call multiple times.
 */
export function registerDefaultTTSHandlers(): void {
  registerCandidates(
    TTS_HANDLER_CANDIDATES,
    (name) => TTSProcessor.supports(name),
    (name) => TTSProcessor.getHandler(name),
    (name, handler) => TTSProcessor.registerHandler(name, handler),
    "voice/tts",
    true,
  );
}

/**
 * Register every shipped STT handler whose backing credentials are present in
 * the ENVIRONMENT, plus the built-in local engine (Whistle), which is always
 * registered because it is what a transcription with nothing configured falls
 * back to, plus the env-declared named endpoints (`NEUROLINK_STT_ENDPOINTS`).
 * Safe to call multiple times; a name that is already registered is left
 * alone. Deliberately takes no credentials: the registry is process-wide, so
 * a handler built from one caller's keys or base URL would be served to every
 * later caller — per-call and per-instance credentials are resolved at call
 * time by `STTProcessor.resolveHandler` / `createSTTHandler` instead.
 */
export function registerDefaultSTTHandlers(): void {
  registerCandidates(
    STT_HANDLER_CANDIDATES.map((candidate) => ({
      name: candidate.name,
      aliases: candidate.aliases,
      factory: () => candidate.factory(),
    })),
    (name) => STTProcessor.supports(name),
    (name) => STTProcessor.getHandler(name),
    (name, handler) => STTProcessor.registerHandler(name, handler),
    "voice/stt",
    (name) => !ALWAYS_REGISTERED_STT.has(name),
  );
  // Named OpenAI-compatible endpoints become providers of their own, so two
  // self-hosted engines can be told apart and used as each other's fallback.
  for (const [name, endpoint] of Object.entries(resolveSTTEndpoints())) {
    if (!STTProcessor.supports(name)) {
      STTProcessor.registerHandler(name, endpointHandler(endpoint));
    }
  }
}

/** The OpenAI-compatible handler for one named endpoint. */
function endpointHandler(endpoint: STTEndpointConfig): OpenAISTT {
  // A named endpoint sends its own key or none: it never borrows the
  // `whisper` provider's env keys, which belong to a different host.
  return new OpenAISTT({
    apiKey: endpoint.apiKey ?? "",
    baseURL: endpoint.baseURL,
    timeoutMs: endpoint.timeoutMs,
    model: endpoint.model,
  });
}

/**
 * Register every shipped Realtime handler. Realtime handlers don't gate
 * registration on isConfigured() because session-time API keys can be
 * supplied per-call; missing creds surface when `connect()` is invoked.
 */
export function registerDefaultRealtimeHandlers(): void {
  registerCandidates(
    REALTIME_HANDLER_CANDIDATES,
    (name) => RealtimeProcessor.supports(name),
    (name) => RealtimeProcessor.getHandler(name),
    (name, handler) => RealtimeProcessor.registerHandler(name, handler),
    "voice/realtime",
    false,
  );
}
