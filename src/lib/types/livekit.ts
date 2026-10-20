/**
 * Types for the LiveKit voice agent integration.
 *
 * The integration uses LiveKit (WebRTC transport, VAD, turn detection,
 * interruption, worker-per-call scaling) as the real-time loop, and NeuroLink
 * as the brain (LLM, tools, memory). These types describe the brain seam, the
 * worker configuration, and the join-token request — all transport-agnostic
 * except where a LiveKit-specific concept is named explicitly.
 *
 * See docs/features/livekit-voice-agent.md.
 */

import type { EventEmitter } from "node:events";
import type { NeuroLinkEvents, TypedEventEmitter } from "./common.js";
import type { StreamOptions, StreamResult } from "./stream.js";
import type {
  ConversationSeedMessage,
  ConversationSeedOptions,
  RecordConversationTurnOptions,
  RecordConversationTurnResult,
  StreamEventSequence,
} from "./conversation.js";

/**
 * Minimal structural shape of the NeuroLink instance the brain depends on.
 *
 * Declared structurally (rather than importing the `NeuroLink` class) so the
 * brain layer stays decoupled from SDK construction and can be unit-tested with
 * a lightweight stub. The real `NeuroLink` instance satisfies this shape.
 *
 * `getEventEmitter` is optional so lightweight stubs remain valid; the real
 * `NeuroLink` instance provides it, and the data-channel event bridge uses it
 * to forward tool/text/HITL events to the browser.
 */
export type LiveKitNeuroLinkStreamer = {
  stream: (options: StreamOptions) => Promise<StreamResult>;
  getEventEmitter?: () => TypedEventEmitter<NeuroLinkEvents>;
};

/**
 * Configuration for the transport-agnostic voice brain.
 *
 * The brain owns the conversation: it calls `neurolink.stream()` with a stable
 * `conversationId` so NeuroLink's memory layer is the source of truth, and it
 * leaves tool-calling to the NeuroLink instance.
 */
export type LiveKitBrainConfig = {
  /** Configured NeuroLink instance (memory + tools registered on it). */
  neurolink: LiveKitNeuroLinkStreamer;
  /** LLM provider name passed to `stream()` (e.g. "bedrock"). */
  provider?: string;
  /** LLM model name passed to `stream()` (e.g. "claude-sonnet-4-6"). */
  model?: string;
  /** System prompt applied to every turn. */
  systemPrompt?: string;
  /** Sampling temperature for spoken-style responses. */
  temperature?: number;
  /** Upper bound on tokens per turn. */
  maxTokens?: number;
  /** Optional user identifier recorded alongside memory. */
  userId?: string;
};

/** A single user turn handed to the brain. */
export type LiveKitBrainTurn = {
  /** Final transcript of the user's utterance. */
  transcript: string;
  /** Stable conversation id keying NeuroLink memory for this session. */
  conversationId: string;
  /** Cancellation signal; aborting stops the in-flight LLM and tool calls. */
  signal?: AbortSignal;
  /**
   * User the conversation belongs to for THIS call, overriding the brain's
   * static `userId`. A call whose memory binding verified passes the bound
   * user here so the turn is stored under the person on the call.
   */
  userId?: string;
  /**
   * Run this turn without reading or writing conversation memory. Used for the
   * agent's opening greeting on a bound call, which is an instruction to the
   * agent and must not land in the person's conversation as something they said.
   */
  ephemeral?: boolean;
};

/**
 * The brain's public surface: stream the assistant reply as text deltas.
 * The transport layer converts these deltas into audio (TTS).
 */
export type LiveKitVoiceBrain = {
  streamReply: (
    turn: LiveKitBrainTurn,
  ) => AsyncGenerator<string, void, unknown>;
};

/** Speech-to-text plugin selection for the LiveKit worker. */
export type LiveKitSttConfig = {
  provider: string;
  model?: string;
  language?: string;
  /**
   * Soniox only: maximum delay (ms) between speech cessation and the STT
   * endpoint. Raise it so Soniox does not finalize on short pauses — that lets
   * VAD silence (not the STT endpoint) decide when the turn ends.
   */
  maxEndpointDelayMs?: number;
};

/** Text-to-speech plugin selection for the LiveKit worker. */
export type LiveKitTtsConfig = {
  provider: string;
  voice?: string;
  model?: string;
};

/**
 * Silero VAD tuning. Stricter values reject background noise (higher threshold,
 * longer minimum speech). Durations are in seconds.
 */
export type LiveKitVadConfig = {
  /** Probability cutoff for "this is speech" (default 0.6). Higher = stricter. */
  activationThreshold?: number;
  /** Minimum speech length before a turn starts, seconds (default 0.2). */
  minSpeechDuration?: number;
  /** Silence before a turn ends, seconds (default 0.6) — tolerates pauses. */
  minSilenceDuration?: number;
};

/**
 * Turn-detection (end-of-utterance) tuning.
 *
 * `mode` selects what decides the user's turn is over:
 * - `"vad"`  — Silero VAD silence (see `LiveKitVadConfig.minSilenceDuration`).
 *   Tolerates natural mid-sentence pauses; the turn only ends after a full
 *   silence window. This mirrors Clairvoyance's behavior.
 * - `"stt"`  — the STT provider's own endpoint detection (e.g. Soniox). Often
 *   much faster/aggressive — short pauses can prematurely split one utterance
 *   into several turns.
 * - `"realtime_llm"` / `"manual"` — advanced/manual strategies.
 *
 * `minEndpointingDelay` / `maxEndpointingDelay` are the framework's endpointing
 * window in milliseconds (in VAD mode the effective end delay is
 * `max(VAD silence, minEndpointingDelay)`).
 */
export type LiveKitTurnConfig = {
  mode?: "stt" | "vad" | "realtime_llm" | "manual";
  minEndpointingDelay?: number;
  maxEndpointingDelay?: number;
};

/**
 * Interruption (barge-in) tuning. Requiring real words / a minimum duration
 * stops background noise from cutting off the assistant.
 */
export type LiveKitInterruptionConfig = {
  /** Minimum recognized words to count as an interruption (default 2). */
  minWords?: number;
  /** Minimum audio duration to count as an interruption, ms (default 600). */
  minDuration?: number;
};

/**
 * Options for `defineVoiceAgent` — the agent definition placed as the default
 * export of the worker entry file.
 *
 * LiveKit runs each call as a Job in its own child process and re-imports the
 * entry file there, so the NeuroLink instance cannot be passed as a live object
 * from a parent. Instead, `createNeuroLink` is invoked **inside each job
 * process** to build the brain (and register its tools) for that call.
 */
export type LiveKitVoiceAgentConfig = {
  /**
   * Factory that builds the NeuroLink instance for a job process.
   * Called once per call, inside the job's own process.
   */
  createNeuroLink: () =>
    | LiveKitNeuroLinkStreamer
    | Promise<LiveKitNeuroLinkStreamer>;
  /** Realtime speech-to-text selection. */
  stt: LiveKitSttConfig;
  /** Realtime text-to-speech selection. */
  tts: LiveKitTtsConfig;
  /** LLM provider/model overrides (default to env-resolved values). */
  provider?: string;
  model?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  /** Prefix used when deriving a per-room conversation id (default "voice"). */
  conversationIdPrefix?: string;
  /** Optional user id recorded alongside memory. */
  userId?: string;
  /**
   * Per-call memory identity. When set, the call's room metadata is checked
   * for a signed memory binding (see `signVoiceMemoryBinding`); a binding that
   * verifies replaces `userId` and the room-derived conversation id for that
   * call, and the turns the brain streams are stamped as voice. A call whose
   * binding is missing or does not verify runs with the static `userId` and
   * the room-derived conversation id exactly as before.
   */
  memory?: LiveKitVoiceAgentMemoryConfig;
  greeting?: string;
  /** Silero VAD tuning (stricter = ignores background noise). */
  vad?: LiveKitVadConfig;
  /** Turn-detection tuning (VAD vs STT endpointing, delays). */
  turn?: LiveKitTurnConfig;
  /** Interruption tuning (require words/duration so noise can't barge in). */
  interruption?: LiveKitInterruptionConfig;
  /**
   * Data-channel event bridge: forward NeuroLink events (text, tool calls,
   * tool results, HITL prompts, status) to the browser over the LiveKit data
   * channel, and accept control messages (HITL responses) back. Disabled
   * unless `enabled` is `true`.
   */
  events?: LiveKitEventBridgeConfig;
};

/** Per-call memory identity for the cascaded voice agent. */
export type LiveKitVoiceAgentMemoryConfig = {
  /** Shared secret the binding is signed with. Defaults to `NEUROLINK_VOICE_MEMORY_SECRET`. */
  secret?: string;
};

/** Options for `startVoiceAgentWorker` — launches the LiveKit Agents worker. */
export type LiveKitWorkerLaunchOptions = {
  /**
   * Absolute path to the entry file whose default export is the result of
   * `defineVoiceAgent`. LiveKit re-imports this file in each job process.
   */
  agentFile: string;
  /** Name the worker registers under for dispatch (default "neurolink-voice"). */
  agentName?: string;
};

/** Resolved LiveKit server connection settings. */
export type LiveKitServerConfig = {
  /** LiveKit server URL (ws/wss). */
  url: string;
  /** API key for token signing and worker registration. */
  apiKey: string;
  /** API secret for token signing and worker registration. */
  apiSecret: string;
};

/** LLM defaults resolved from the environment for the brain. */
export type LiveKitBrainDefaults = {
  provider: string;
  model: string;
};

/** Arguments for minting a browser join token. */
export type LiveKitTokenRequest = {
  /** Participant identity (e.g. the authenticated user id). */
  identity: string;
  /** Room name to join (auto-created on first join). */
  room: string;
  /** LiveKit API key. */
  apiKey: string;
  /** LiveKit API secret. */
  apiSecret: string;
  /** Token lifetime in seconds (default 600; clamped to a 3600 max). */
  ttlSeconds?: number;
};

/** Discriminant tags for outbound voice events. */
export type LiveKitVoiceEventType =
  | "user-text"
  | "text"
  | "tool-start"
  | "tool-result"
  | "status"
  | "hitl-prompt"
  | "done"
  | "memory";

/**
 * A user STT transcript for display. Interim partials stream with
 * `final: false`; the end-of-utterance result has `final: true`. The client
 * updates one live bubble and commits it on `final`.
 *
 * `replacesPrevious` is set on the committed (`final: true`) text of a turn that
 * absorbed a previous turn the user interrupted before it produced any reply
 * (strict barge-in club). The client removes the orphaned previous user bubble
 * so the merged utterance shows as one bubble.
 */
export type LiveKitVoiceUserTextEvent = {
  type: "user-text";
  data: { text: string; final: boolean; replacesPrevious?: boolean };
};

/** A streamed chunk of the assistant's spoken/written reply. */
export type LiveKitVoiceTextEvent = {
  type: "text";
  data: { delta: string };
};

/** A tool invocation has started (best-effort status; may not always fire). */
export type LiveKitVoiceToolStartEvent = {
  type: "tool-start";
  data: { id?: string; name: string; input?: unknown };
};

/**
 * A tool invocation has finished. `result` carries the tool's structured
 * output (for example, a chart payload) for the client to render.
 */
export type LiveKitVoiceToolResultEvent = {
  type: "tool-result";
  data: {
    id?: string;
    name: string;
    result?: unknown;
    success?: boolean;
    error?: string;
  };
};

/** Coarse agent state, useful for UI indicators (e.g. "thinking…"). */
export type LiveKitVoiceStatusEvent = {
  type: "status";
  data: {
    state: "thinking" | "speaking" | "listening" | "error";
    detail?: string;
  };
};

/** A human-in-the-loop confirmation the user must approve or reject. */
export type LiveKitVoiceHitlPromptEvent = {
  type: "hitl-prompt";
  data: {
    confirmationId: string;
    toolName: string;
    actionType?: string;
    arguments?: unknown;
    timeoutMs?: number;
    allowModification?: boolean;
  };
};

/**
 * The current turn has finished. `turnId` is set when the call's turns are
 * being recorded: it is the id the stored messages carry (`${turnId}:user`,
 * `${turnId}:assistant`), so a client can merge its live copy with history.
 */
export type LiveKitVoiceDoneEvent = {
  type: "done";
  data: { reason?: string; turnId?: string };
};

/**
 * Something about how the call is being remembered. `not-saved` means a turn
 * could not be stored after retries; the call carries on, and a client may
 * show a quiet note on that turn.
 */
export type LiveKitVoiceMemoryEvent = {
  type: "memory";
  data: { state: "not-saved"; turnId: string };
};

/** Discriminated union of all outbound voice events (before enveloping). */
export type LiveKitVoiceEvent =
  | LiveKitVoiceUserTextEvent
  | LiveKitVoiceTextEvent
  | LiveKitVoiceToolStartEvent
  | LiveKitVoiceToolResultEvent
  | LiveKitVoiceStatusEvent
  | LiveKitVoiceHitlPromptEvent
  | LiveKitVoiceDoneEvent
  | LiveKitVoiceMemoryEvent;

/**
 * Wire format published to the browser: a `LiveKitVoiceEvent` plus a monotonic
 * sequence number and a timestamp so the client can order and de-duplicate.
 */
export type LiveKitVoiceEventEnvelope = LiveKitVoiceEvent & {
  seq: number;
  ts: number;
};

/** Control messages sent from the browser back to the agent. */
export type LiveKitVoiceControlMessage =
  | {
      action: "hitl:accept";
      confirmationId: string;
      modifiedArguments?: unknown;
    }
  | { action: "hitl:reject"; confirmationId: string; reason?: string };

/**
 * Configuration for the data-channel event bridge, set on
 * `LiveKitVoiceAgentConfig.events`.
 */
export type LiveKitEventBridgeConfig = {
  /** Master switch — the bridge is inert unless this is `true`. */
  enabled?: boolean;
  /** Data-channel topic for outbound events (default "ai-events"). */
  eventsTopic?: string;
  /** Data-channel topic for inbound control messages (default "ai-control"). */
  controlTopic?: string;
  /** If set, only these event types are forwarded (default: all). */
  include?: LiveKitVoiceEventType[];
  /**
   * Payloads encoded larger than this many bytes are sent via the chunked text
   * stream API instead of a single reliable data packet (default 12000).
   */
  maxInlineBytes?: number;
};

/**
 * Minimal structural view of the LiveKit room the bridge needs: a local
 * participant to publish on, and event (un)subscription. Declared structurally
 * so `src/lib/types` carries no dependency on `@livekit/rtc-node`; the real
 * `Room` from a job context satisfies this shape.
 */
export type LiveKitBridgeRoom = {
  localParticipant?: {
    // Method signatures (not function properties) so the concrete LiveKit
    // `Room`/`LocalParticipant` types — whose options carry extra optional
    // fields — remain assignable to this minimal shape.
    publishData(
      data: Uint8Array,
      options: { reliable?: boolean; topic?: string },
    ): Promise<void>;
    sendText(text: string, options?: { topic?: string }): Promise<unknown>;
  };
  on(event: string, listener: (...args: unknown[]) => void): unknown;
  off(event: string, listener: (...args: unknown[]) => void): unknown;
};

/**
 * Normalized tool fields extracted from a `tool:start` / `tool:end` emitter
 * payload, used internally by the event bridge.
 */
export type LiveKitToolEventFields = {
  name: string;
  id?: string;
  input?: unknown;
  result?: unknown;
  success?: boolean;
  error?: string;
};

/** Inputs to `attachEventBridge`. */
export type LiveKitEventBridgeParams = {
  /** The LiveKit room for this call (from the job context). */
  room: LiveKitBridgeRoom;
  /** NeuroLink's event emitter (`neurolink.getEventEmitter()`). */
  emitter: TypedEventEmitter<NeuroLinkEvents>;
  /** Bridge options (topics, filtering, chunking threshold). */
  options?: LiveKitEventBridgeConfig;
};

/** Handle returned by `attachEventBridge` for teardown. */
export type LiveKitEventBridgeHandle = {
  /** Remove all listeners and stop publishing. Idempotent. */
  dispose: () => void;
};

/**
 * Credentials for LiveKit server-side REST calls (room create, agent dispatch).
 * `url` accepts `ws(s)://` or `http(s)://`; helpers convert it to https.
 */
export type LiveKitServerCredentials = {
  url: string;
  apiKey: string;
  apiSecret: string;
};

/**
 * The realtime speech-to-speech model a call runs on: Gemini Live on Vertex
 * (the default) or xAI Grok Voice through LiveKit's xAI plugin.
 */
export type RealtimeVoiceBackend = "gemini" | "xai";

/**
 * A LiveKit realtime model as far as callers of the model factory can rely on.
 * It is declared structurally so the published declarations name no optional
 * LiveKit plugin; at runtime it is a `RealtimeModel` subclass of the backend's
 * plugin.
 */
export type RealtimeLlm = {
  readonly model: string;
  label: () => string;
  close: () => Promise<void>;
};

/**
 * A session of the xAI plugin as far as the xai model's watcher needs it: an
 * event emitter (the plugin republishes every server event as
 * `openai_server_event_received`) that can be closed.
 */
export type XaiObservedSession = EventEmitter & {
  close: () => Promise<void>;
};

/**
 * Token counts of one xAI response. xAI sends them at the top level of
 * `response.done`; the plugin reads `response.usage`, which xAI leaves empty.
 */
export type XaiResponseUsage = {
  inputTokens: number;
  inputAudioTokens: number;
  outputTokens: number;
  outputAudioTokens: number;
};

/**
 * Realtime voice configuration resolved from the environment.
 *
 * In speech-to-speech mode one realtime model (Gemini Live on Vertex, or xAI
 * Grok Voice) does STT, reasoning, TTS, and turn detection — so there is no
 * separate STT/TTS/VAD/EOU config. `resolveRealtimeVoiceConfig` fills every
 * field from `process.env` (with defaults); `RealtimeVoiceAgentConfig` lets a
 * caller override any of them. The API key of the xai backend is deliberately
 * not part of the config: the xAI plugin reads `XAI_API_KEY` itself.
 */
export type RealtimeVoiceConfig = {
  /** Which realtime model family handles the call (VOICE_REALTIME_BACKEND; default "gemini"). */
  backend: RealtimeVoiceBackend;
  /** Vertex project id (from VERTEX_PROJECT / GOOGLE_AUTH_* / GOOGLE_CLOUD_PROJECT_ID). Gemini only. */
  project: string | undefined;
  /** Vertex location; native-audio Live is served on `global`, not regionally. Gemini only. */
  location: string;
  /** Realtime model id (e.g. "gemini-live-2.5-flash" for gemini, "grok-voice-3.0" for xai). */
  model: string;
  /** Optional voice name for either backend; omit for the plugin default. */
  voice: string | undefined;
  /** xai only: WebSocket base URL of the realtime endpoint (XAI_REALTIME_BASE_URL); unset keeps the plugin's own endpoint. */
  xaiBaseURL: string | undefined;
  /** Response modality: "AUDIO" (native S2S) or "TEXT" (half-cascade). Gemini only. */
  responseModality: string;
  /** System prompt / instructions for the agent. */
  systemPrompt: string;
  /** Opening line the agent speaks on connect ("" disables). */
  greeting: string;
  /** Whether to bridge Lighthouse MCP tools as function tools of the realtime model (either backend). */
  toolsEnabled: boolean;
  /** Full URL of the MCP server the tools are bridged from. */
  mcpUrl: string;
  /** Grace period after the caller leaves before the job shuts down (ms). */
  emptyRoomGraceMs: number;
  /** Deadline for a participant to join before the job shuts down (ms). */
  joinDeadlineMs: number;
  /** How long a HITL confirmation waits before being treated as a decline (ms). */
  hitlTimeoutMs: number;
  /** Interval for the RSS/heap metrics log (ms). */
  metricsIntervalMs: number;
};

/** A single log record handed to a `RealtimeVoiceAgentConfig.onLog` sink. */
export type RealtimeVoiceLogEntry = {
  level: "debug" | "info" | "warn" | "error";
  message: string;
  timestamp: number;
  data?: unknown;
};

export type RealtimeVoiceLogContext = {
  room: string;
};

/**
 * Options for `defineRealtimeVoiceAgent`. Every field is optional: omitted
 * values fall back to `resolveRealtimeVoiceConfig()` (i.e. the environment), so
 * a caller can use `defineRealtimeVoiceAgent()` with no arguments and configure
 * everything via env.
 */
export type RealtimeVoiceAgentConfig = {
  /** Realtime backend; omitted means the environment's VOICE_REALTIME_BACKEND, and without it "gemini". */
  backend?: RealtimeVoiceBackend;
  project?: string;
  location?: string;
  model?: string;
  voice?: string;
  /** xai only: WebSocket base URL of the realtime endpoint. A `ws://` URL to a host other than localhost, 127.0.0.0/8 or [::1] is refused unless `XAI_REALTIME_ALLOW_INSECURE=true`, because the xAI key would cross the network unencrypted. */
  xaiBaseURL?: string;
  responseModality?: string;
  systemPrompt?: string;
  greeting?: string;
  /** MCP tool bridging overrides. */
  tools?: {
    enabled?: boolean;
    mcpUrl?: string;
  };
  /**
   * Persist the call's turns to conversation memory and seed the model with
   * the conversation's recent history. Off unless set. Takes effect only for
   * a call whose room metadata carries a verified memory binding; otherwise
   * the call runs exactly as it would without this option, and nothing is
   * stored.
   */
  memory?: RealtimeVoiceMemoryConfig;
  /** Data-channel topic for outbound events (default "ai-events"). */
  eventsTopic?: string;
  /** Data-channel topic for inbound control messages (default "ai-control"). */
  controlTopic?: string;
  /**
   * Optional sink for the agent's own logs. When set, the realtime agent wires
   * NeuroLink's logger to this callback for the duration of the call, so a host
   * can forward worker logs into its logging pipeline. Each record is tagged
   * with per-call context (the room name). Subject to the logger's level gate:
   * without debug mode only `error` records are emitted (set `NEUROLINK_DEBUG`).
   */
  onLog?: (entry: RealtimeVoiceLogEntry, ctx: RealtimeVoiceLogContext) => void;
};

/**
 * The part of a NeuroLink instance a voice agent needs to persist and seed a
 * call's turns. The real `NeuroLink` instance satisfies it.
 */
export type LiveKitMemoryNeuroLink = {
  recordConversationTurn: (
    options: RecordConversationTurnOptions,
  ) => Promise<RecordConversationTurnResult>;
  getConversationSeed?: (
    options: ConversationSeedOptions,
  ) => Promise<ConversationSeedMessage[]>;
};

/** Memory options for `defineRealtimeVoiceAgent`. */
export type RealtimeVoiceMemoryConfig = {
  /**
   * Builds the NeuroLink instance, with conversation memory configured the
   * same way the web app's is (same store, key prefix and lifetime), inside
   * the job process. Called once per call, only after a binding verified.
   */
  createNeuroLink: () =>
    | LiveKitMemoryNeuroLink
    | Promise<LiveKitMemoryNeuroLink>;
  /** Shared secret the binding is signed with. Defaults to `NEUROLINK_VOICE_MEMORY_SECRET`. */
  secret?: string;
  /** How long a closed reply waits for its user transcript before being dropped (default 1500 ms). */
  settleMs?: number;
  /** How long shutdown waits for pending writes (default 800 ms; the worker is reaped about 1 s after shutdown starts). */
  flushBudgetMs?: number;
  /** History seeding at call start. `false` turns it off. Defaults: 10 exchanges, 6000 characters. */
  seed?: false | { maxTurns?: number; maxChars?: number };
};

/** One finished exchange of a voice call, as handed to the writer. */
export type VoiceTurnRecord = {
  /** The assistant message id, or a synthetic id for a turn cut off by shutdown or barge-in. */
  turnId: string;
  userMessage: string;
  aiResponse: string;
  /** The reply was cut off. */
  interrupted: boolean;
  /** The call ended while this exchange was open. */
  callEnded: boolean;
  startTime: Date;
  /** Tool events of the exchange, in the shape typed chat stores. */
  events?: StreamEventSequence[];
};

/** A recorder's current exchange: what has been heard and said since the last reply closed. */
export type VoiceTurnOpenExchange = {
  userSegments: string[];
  assistantPartial: string;
  assistantStarted: boolean;
  events: StreamEventSequence[];
  startedAt: number;
};

/** A reply that finished before its user transcript arrived, waiting out the settle window. */
export type VoiceTurnClosedExchange = {
  turnId: string;
  assistantText: string;
  interrupted: boolean;
  events: StreamEventSequence[];
  startedAt: number;
  timer: ReturnType<typeof setTimeout>;
};

/** The recorder returned by `createVoiceTurnRecorder`. */
export type VoiceTurnRecorder = {
  /** A final transcript segment of what the user said. Interim segments are ignored. */
  userTranscript: (segment: { text: string; final: boolean }) => void;
  /** A piece of the assistant's reply as it is produced. */
  assistantDelta: (delta: string) => void;
  /** The assistant's message was added: the reply is complete (or was cut off). */
  assistantMessage: (message: {
    id: string;
    text: string;
    interrupted?: boolean;
  }) => void;
  /**
   * The next assistant-only reply is the agent's opening greeting, not an
   * answer: it is skipped and never paired with the user's first question.
   * Call it once, when the agent is about to speak its greeting.
   */
  expectGreeting: () => void;
  /** A tool call started in the current exchange. */
  toolStart: (call: { name: string; args?: unknown }) => void;
  /** A tool call finished in the current exchange. */
  toolEnd: (call: { name: string; result?: unknown; error?: string }) => void;
  /**
   * Shutdown: close what is open, then wait for pending writes — but no longer
   * than `budgetMs`. Safe to call more than once.
   */
  flush: (budgetMs: number) => Promise<VoiceTurnRecorderStats>;
  /** Counters, for logs and tests. */
  stats: () => VoiceTurnRecorderStats;
};

/** What a realtime call needs from its memory once its binding verified. */
export type RealtimeCallMemory = {
  recorder: VoiceTurnRecorder;
  /** Recent history to seed the model with; empty when there is none or seeding is off. */
  seed: ConversationSeedMessage[];
  /** Late-bound publisher, set once the event bridge exists, for the not-saved notice. */
  setPublisher: (
    publish: (
      type: LiveKitVoiceEventType,
      data: Record<string, unknown>,
    ) => void,
  ) => void;
};

/** Counters of a recorder, for logs and tests. */
export type VoiceTurnRecorderStats = {
  written: number;
  failed: number;
  dropped: number;
  pending: number;
};

/** Options for `createVoiceTurnRecorder`. */
export type VoiceTurnRecorderOptions = {
  /** Stores one exchange. Throwing means "not stored"; the recorder retries. */
  write: (record: VoiceTurnRecord) => Promise<void>;
  /** A write succeeded. */
  onRecorded?: (record: VoiceTurnRecord) => void;
  /** A write failed after every retry. The call continues. */
  onPermanentFailure?: (record: VoiceTurnRecord, error: unknown) => void;
  /** How long a closed reply waits for its user transcript (default 1500 ms). */
  settleMs?: number;
  /** Retries after the first failed attempt (default 2). */
  retries?: number;
  /** Base delay between attempts; grows linearly (default 250 ms). */
  retryDelayMs?: number;
  /** Appended to a reply that was cut off by the call ending. */
  callEndedNote?: string;
  /** Stored as the reply when the call ended with the user's turn unanswered. */
  noReplyNote?: string;
  /** Prefix of synthetic turn ids (default: a random id). */
  callId?: string;
  /** Clock, for tests. */
  now?: () => number;
};

/** A signed memory binding as it appears in room metadata under `memory`. */
export type VoiceMemoryBinding = {
  userId: string;
  sessionId: string;
  /** Expiry, Unix seconds. */
  exp: number;
  /** base64url(HMAC-SHA256) over the room name, userId, sessionId and exp. */
  sig: string;
};

/** Input to `signVoiceMemoryBinding`. */
export type VoiceMemoryBindingInput = {
  /** The LiveKit room name the binding is for. */
  room: string;
  userId: string;
  sessionId: string;
  secret: string;
  /** Lifetime in seconds (default 7200, at most 86400). */
  ttlSeconds?: number;
  /** Current time, Unix seconds (default: now). */
  now?: number;
};

/** Input to `verifyVoiceMemoryBinding`. */
export type VoiceMemoryBindingVerifyInput = {
  /** The room's base64(JSON) metadata string. */
  roomMetadata: string | undefined;
  /** The room name as LiveKit reports it for the joined room. */
  roomName: string | undefined;
  secret: string | undefined;
  /** Current time, Unix seconds (default: now). */
  now?: number;
};

/** Why a binding was not accepted. */
export type VoiceMemoryBindingRejection =
  | "no-secret"
  | "no-binding"
  | "malformed"
  | "bad-signature"
  | "expired"
  | "expiry-too-far";

/** Result of `verifyVoiceMemoryBinding`. */
export type VoiceMemoryBindingVerdict =
  | { ok: true; userId: string; sessionId: string; exp: number }
  | { ok: false; reason: VoiceMemoryBindingRejection };

/** Auth token + base64 MCP execution context decoded from a room's metadata. */
export type LiveKitRoomCallContext = {
  /** Lighthouse access JWT used as `x-auth-token` to the MCP server. */
  authToken: string;
  /** base64(JSON) MCP execution context used as `x-context` (or "" if absent). */
  xContext: string;
};

/** Publishes a single voice event envelope onto the room data channel. */
export type RealtimeEventPublisher = (
  type: LiveKitVoiceEventType,
  data: Record<string, unknown>,
) => void;

/** Requests a HITL confirmation and resolves to the user's decision. */
export type RealtimeConfirmationRequester = (
  toolName: string,
  args: Record<string, unknown>,
) => Promise<boolean>;

/** Handle returned by `attachRealtimeEventBridge`. */
export type RealtimeEventBridgeHandle = {
  /** Publish an outbound event to the browser (data packet or text stream). */
  publishEvent: RealtimeEventPublisher;
  /** Open a HITL prompt and await the browser's decision (timeout = decline). */
  requestConfirmation: RealtimeConfirmationRequester;
  /** Remove the control-channel listener and clear pending confirmations. */
  dispose: () => void;
};

/** Inputs to `attachRealtimeEventBridge`. */
export type RealtimeEventBridgeParams = {
  /** The LiveKit room for this call (from the job context). */
  room: LiveKitBridgeRoom;
  /** HITL confirmation timeout in ms before a request is auto-declined. */
  hitlTimeoutMs?: number;
  /** Outbound events topic (default "ai-events"). */
  eventsTopic?: string;
  /** Inbound control topic (default "ai-control"). */
  controlTopic?: string;
  /** Payloads larger than this are sent via the chunked text stream (default 12000). */
  maxInlineBytes?: number;
};

/** Inputs to `buildRealtimeMcpTools`. */
export type BuildRealtimeMcpToolsParams = {
  /** Full URL of the MCP server (e.g. ".../ai/mcp/v2"). */
  mcpUrl: string;
  /** Lighthouse access JWT forwarded as `x-auth-token`. */
  authToken: string;
  /** base64(JSON) execution context forwarded as `x-context`. */
  xContext: string;
  /** Publishes tool start/result events to the browser. */
  publishEvent: RealtimeEventPublisher;
  /** Opens a HITL confirmation for destructive tools and awaits the decision. */
  requestConfirmation: RealtimeConfirmationRequester;
  /**
   * Hard cap per MCP tool call, in milliseconds (default 30000).
   *
   * Without one, a stalled MCP server holds the realtime turn open forever:
   * The realtime model waits on the function result, so the user gets silence rather than
   * an error. Bounding the call turns that into a normal tool failure the
   * model can talk about.
   */
  toolTimeoutMs?: number;
  /** Observes a tool call as it starts. A throwing observer never affects the call. */
  onToolStart?: (call: { name: string; args: Record<string, unknown> }) => void;
  /** Observes a tool call as it ends, with its result as text or its error. */
  onToolEnd?: (call: { name: string; result?: string; error?: string }) => void;
};
