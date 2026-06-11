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

import type { NeuroLinkEvents, TypedEventEmitter } from "./common.js";
import type { StreamOptions, StreamResult } from "./stream.js";

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
  | "done";

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

/** The current turn has finished. */
export type LiveKitVoiceDoneEvent = {
  type: "done";
  data: { reason?: string };
};

/** Discriminated union of all outbound voice events (before enveloping). */
export type LiveKitVoiceEvent =
  | LiveKitVoiceUserTextEvent
  | LiveKitVoiceTextEvent
  | LiveKitVoiceToolStartEvent
  | LiveKitVoiceToolResultEvent
  | LiveKitVoiceStatusEvent
  | LiveKitVoiceHitlPromptEvent
  | LiveKitVoiceDoneEvent;

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
