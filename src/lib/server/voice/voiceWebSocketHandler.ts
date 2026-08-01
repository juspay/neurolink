import WebSocket, { WebSocketServer } from "ws";
import type { Server as HttpServer } from "http";
import { FrameBus } from "./frameBus.js";
import { TurnManager, TurnState } from "./turnManager.js";
import { timingSafeEqualString } from "./tokenCompare.js";
import { CartesiaStream } from "../../adapters/tts/cartesiaHandler.js";
import { NeuroLink } from "../../neurolink.js";
import { logger } from "../../utils/logger.js";
import { tryImport } from "../../utils/tryImport.js";
import { withTimeout } from "../../utils/async/withTimeout.js";
import type {
  ClientControlMessage,
  CobraInstance,
  Message,
  ServerVoiceConnectionCtx,
  ServerVoiceSessionState,
  SonioxMessage,
} from "../../types/index.js";

async function loadCobra(accessKey: string): Promise<CobraInstance> {
  const mod = await tryImport<{ Cobra: new (key: string) => CobraInstance }>(
    "@picovoice/cobra-node",
    "Voice activity detection",
  );
  return new mod.Cobra(accessKey);
}

const SONIOX_URL =
  process.env.SONIOX_WS_URL ?? "wss://stt-rt.soniox.com/transcribe-websocket";

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set in environment`);
  }
  return value;
}

/**
 * Voice-server-mode environment configuration.
 *
 * @deprecated NEW12 — this used to mutate `process.env.NEUROLINK_DISABLE_MCP_TOOLS`
 * which is process-wide. That broke any embedder that called this function in
 * a process which ALSO used NeuroLink for non-voice work. The disable-tools
 * intent is now passed explicitly via `disableTools: true` on every NeuroLink
 * `generate()` / `stream()` call inside this server (see line ~167). Calling
 * this function is now a no-op kept for backwards compatibility.
 */
export function configureVoiceServerEnvironment(): void {
  // No-op. The disable-tools intent is plumbed through SDK options instead
  // of via process.env mutation (NEW12).
  // Issue 8 fix: surface a runtime deprecation signal so external callers
  // know their call has no effect — silent no-ops are a footgun.
  logger.warn(
    "[deprecation] configureVoiceServerEnvironment() is a no-op as of NEW12. " +
      "Pass `disableTools: true` via SDK options on each generate()/stream() " +
      "call instead. This function will be removed in a future release.",
  );
}

let _sonioxApiKey: string | undefined;
function getSonioxApiKey(): string {
  if (!_sonioxApiKey) {
    _sonioxApiKey = getRequiredEnv("SONIOX_API_KEY");
  }
  return _sonioxApiKey;
}

/**
 * Returns a copy of an outbound Soniox payload with the API key redacted.
 *
 * Use this whenever debug logging the auth frame — never JSON.stringify the
 * raw object. (C3 mitigation: prevents the Soniox API key from leaking into
 * any aggregated log sink even if a future debug statement serialises the
 * outbound payload.)
 */
export function redactSonioxAuth<T extends { api_key?: string }>(
  payload: T,
): T {
  return { ...payload, api_key: "[REDACTED]" } as T;
}

// How many consecutive silent Cobra frames (each 32ms) before declaring speech end.
// 30 x 32ms = 960ms — long enough to distinguish a thinking pause from a real stop.
const SILENCE_FRAMES_TO_STOP = 30;

// How many consecutive voice frames (each 32ms) before declaring speech start.
// 5 x 32ms = 160ms — filters brief noise/echo transients.
const VOICE_FRAMES_TO_START = 5;

// Cobra voice probability threshold (0–1)
const VOICE_THRESHOLD = 0.7;

// Build a 44-byte WAV header for a streaming PCM connection.
// Data chunk size set to 0xFFFFFFFF (indefinite length) so Soniox can stream continuously.
function makeWavHeader(sampleRate: number, numChannels: number): Buffer {
  const buf = Buffer.alloc(44);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(0xffffffff, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(numChannels, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * numChannels * 2, 28);
  buf.writeUInt16LE(numChannels * 2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(0xffffffff, 40);
  return buf;
}

const now = () => Number(process.hrtime.bigint()) / 1e6;

function parseJson(value: string): unknown {
  return JSON.parse(value) as unknown;
}

function parseSonioxMessage(message: WebSocket.RawData): SonioxMessage | null {
  try {
    return parseJson(message.toString()) as SonioxMessage;
  } catch (error) {
    logger.warn("[SONIOX] Ignoring invalid JSON message", error);
    return null;
  }
}

function parseClientControlMessage(data: string): ClientControlMessage | null {
  try {
    return parseJson(data) as ClientControlMessage;
  } catch (error) {
    logger.warn("[WS] Ignoring invalid client control message", error);
    return null;
  }
}

async function streamAnswer(
  neurolink: NeuroLink,
  messages: Message[],
  options?: { timeoutMs?: number },
) {
  // Last message is the current user turn; everything before it is history.
  const lastMessage = messages[messages.length - 1];
  const history = messages.slice(0, -1);

  const provider = process.env.VOICE_LLM_PROVIDER ?? "azure";
  const model = process.env.VOICE_LLM_MODEL ?? "gpt-4o-automatic";

  const result = await neurolink.stream({
    provider,
    model,

    // Current user message as the active input.
    input: { text: lastMessage.content },

    // Prior turns passed as structured history so NeuroLink's memory layer
    // picks them up correctly (fixes "No memory or context" warning).
    conversationHistory: history.map((m) => ({
      role: m.role,
      content: m.content,
    })),

    timeout: options?.timeoutMs ?? 30000,

    // CRITICAL FOR LATENCY
    temperature: 0.25, // lower = faster + stable
    maxTokens: 140, // FIXES HALF ANSWERS
    disableTools: true, // removes orchestration overhead
    enableAnalytics: false,
    enableEvaluation: false,

    // Voice-specific instruction
    systemPrompt: `You are a real-time voice assistant. Respond naturally and concisely. Use short spoken sentences. Do not write paragraphs.`,
  });

  return result.stream;
}

// CLAUDE.md Rule 2: ServerVoiceConnectionCtx + ServerVoiceSessionState live
// in src/lib/types/server.ts and are imported via the barrel above.

function createVerifyClient(
  authToken: string | undefined,
): WebSocket.VerifyClientCallbackAsync {
  return (info, cb) => {
    if (!authToken) {
      cb(true);
      return;
    }
    const header = info.req.headers["authorization"];
    const headerToken =
      typeof header === "string" && header.startsWith("Bearer ")
        ? header.slice(7)
        : undefined;
    let urlToken: string | undefined;
    try {
      const url = new URL(info.req.url ?? "/", "http://localhost");
      urlToken = url.searchParams.get("token") ?? undefined;
    } catch {
      // Malformed URL — reject below.
    }
    const provided = headerToken ?? urlToken;
    // Bug 2 mitigation: constant-time compare prevents the WS auth gate
    // from leaking token length / prefix when the server is exposed via
    // VOICE_SERVER_ALLOW_PUBLIC=1.
    if (!provided || !timingSafeEqualString(provided, authToken)) {
      cb(false, 401, "Unauthorized");
      return;
    }
    cb(true);
  };
}

function closeTts(stream: CartesiaStream | null, reason: string) {
  if (!stream) {
    return;
  }
  try {
    // Close the WS first so that any pending done/error/close listeners
    // in processTurn() can settle immediately, rather than hanging until
    // the withTimeout fires.
    stream.close();
    stream.removeAllListeners();
  } catch (error) {
    logger.warn(reason, error);
  }
}

async function processTurn(
  userText: string,
  clientWs: WebSocket,
  neurolink: NeuroLink,
  s: ServerVoiceSessionState,
) {
  if (s.activePipelineTurnId !== null) {
    logger.info("[PIPELINE] Already running — discarding duplicate STT final");
    return;
  }
  s.currentTurnId++;
  const myTurn = s.currentTurnId;
  s.activePipelineTurnId = myTurn;
  // M4: register a per-turn abort flag. doInterrupt() flips it; every
  // await suspension can short-circuit via `myAbort.aborted` instead
  // of relying solely on the `myTurn !== currentTurnId` surrogate.
  const myAbort = { aborted: false };
  s.turnAborters.add(myAbort);
  const tSttEnd = now();

  try {
    // Hard-cap conversation history to last N turns to prevent unbounded
    // growth from exceeding the LLM context window in long voice sessions.
    const MAX_HISTORY_TURNS = 20;
    const trimmedHistory = s.conversation.slice(-MAX_HISTORY_TURNS * 2);
    // Build context without mutating `conversation` — only commit on full completion.
    const stream = await streamAnswer(neurolink, [
      ...trimmedHistory,
      { role: "user", content: userText },
    ]);
    if (myAbort.aborted || myTurn !== s.currentTurnId) {
      return;
    }

    const tts = new CartesiaStream(`turn-${Date.now()}`);
    // NEW3: register the error handler BEFORE `await tts.ready()` and
    // BEFORE assigning `activeTTS = tts`. Otherwise a barge-in interrupt
    // landing between `activeTTS = tts` and `await tts.ready()` would
    // call `closeTts(activeTTS)` on a stream whose error events have
    // no listener — emitting an unhandled error.
    let ttsError: Error | null = null;
    tts.on("error", (err: Error) => {
      ttsError = err;
      logger.error("[TTS] Mid-stream error:", err.message);
    });
    s.activeTTS = tts;
    await tts.ready();

    if (myAbort.aborted || myTurn !== s.currentTurnId) {
      return;
    }

    // Pre-lock barge-in BEFORE signaling assistant speaking.
    // Without this there is a ~700-1000ms gap where TurnState is ASSISTANT_SPEAKING
    // but bargeInLockedUntil=0, so Soniox residual tokens from the previous TTS echo
    // immediately trigger an interrupt before any audio has even been sent.
    s.bargeInLockedUntil = Date.now() + 1000;

    // Signal TurnManager that TTS is about to play — barge-in detection is now live.
    s.turnManager.assistantSpeaking();

    let firstAudioSent = false;
    let assistantReply = "";
    let tokenBuffer = "";

    // Sentence/phrase boundaries to flush on — avoids flooding Cartesia with
    // one tiny message per token, which causes "Service unavailable" errors on
    // long responses. We flush when we hit natural speech breaks or the buffer
    // grows large enough to produce a clean TTS chunk.
    const FLUSH_REGEX = /[.!?,;:]\s/;
    const FLUSH_MIN_LENGTH = 80;

    tts.on("audio", (audio: Buffer) => {
      if (myAbort.aborted || myTurn !== s.currentTurnId) {
        return;
      }
      if (!firstAudioSent) {
        firstAudioSent = true;
        // Refresh the lock from when audio ACTUALLY hits the client so it covers
        // the AEC lock-on window (~300-400ms for browser echo cancellation).
        // This extends the protection past the initial 1000ms pre-lock.
        s.bargeInLockedUntil = Date.now() + 400;
        logger.info(
          `[LATENCY] STT -> First Audio: ${(now() - tSttEnd).toFixed(0)}ms`,
        );
      }
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(audio);
      }
    });

    for await (const chunk of stream) {
      if (myAbort.aborted || myTurn !== s.currentTurnId) {
        logger.info("[PIPELINE] Stale LLM stream — dropping");
        break;
      }
      // If Cartesia errored mid-stream, abort sending more tokens.
      if (ttsError) {
        logger.info("[PIPELINE] Aborting LLM stream — Cartesia error");
        break;
      }
      if (!chunk || typeof chunk !== "object" || !("content" in chunk)) {
        continue;
      }
      if (typeof chunk.content !== "string") {
        continue;
      }
      assistantReply += chunk.content;
      tokenBuffer += chunk.content;

      // Flush buffer to Cartesia at sentence/phrase boundaries or when it's
      // grown large enough. This batches tokens into meaningful speech chunks
      // instead of sending one WebSocket message per token.
      if (
        FLUSH_REGEX.test(tokenBuffer) ||
        tokenBuffer.length >= FLUSH_MIN_LENGTH
      ) {
        tts.send(tokenBuffer, true);
        tokenBuffer = "";
      }
    }

    // Flush any remaining buffered tokens before the final flush().
    if (tokenBuffer) {
      tts.send(tokenBuffer, true);
      tokenBuffer = "";
    }

    // If Cartesia errored during the stream, reset and bail out now.
    if (ttsError) {
      logger.error(
        "[TTS] Error during stream — resetting turn so user can retry:",
        String(ttsError),
      );
      closeTts(tts, "[TTS] Failed to close stream after mid-stream error");
      s.turnManager.reset();
      return;
    }

    if (myAbort.aborted || myTurn !== s.currentTurnId) {
      return;
    }

    let ttsSucceeded = false;
    try {
      await withTimeout(
        new Promise<void>((resolve, reject) => {
          tts.once("done", () => {
            ttsSucceeded = true;
            resolve();
          });
          // Re-use the persistent error handler: if another error arrives during flush,
          // the existing "error" listener fires ttsError; reject via a one-time wrapper.
          tts.once("error", reject);
          // Reject if the socket closes without emitting done or error.
          tts.once("close", () =>
            reject(new Error("Cartesia WS closed before flush completed")),
          );
          tts.flush();
        }),
        10000,
        "Cartesia flush timed out",
      );
    } catch (err) {
      // Cartesia failed (e.g. "Service unavailable"). The user heard nothing.
      // Reset state immediately so they can speak and retry — don't commit
      // the turn to conversation history since it was never heard.
      logger.error(
        "[TTS] Error during flush — resetting turn so user can retry:",
        (err as Error).message,
      );
      closeTts(tts, "[TTS] Failed to close stream after flush error");
      s.turnManager.reset();
      return;
    }

    closeTts(tts, "[TTS] Failed to close stream after successful playback");

    if (!ttsSucceeded || myTurn !== s.currentTurnId) {
      return;
    }

    // Only commit conversation when the turn completed fully and was heard.
    s.conversation.push({ role: "user", content: userText });
    s.conversation.push({ role: "assistant", content: assistantReply });
    // Do NOT reset state here — the client is still playing buffered audio.
    // The client sends playback_done when the last audio chunk finishes playing,
    // which is the correct moment to return to IDLE and allow new user speech.
    // Safety fallback: if the client never sends playback_done (crash, disconnect),
    // auto-reset after 20 seconds so the assistant doesn't stay stuck.
    if (s.playbackResetTimer) {
      clearTimeout(s.playbackResetTimer);
    }
    s.playbackResetTimer = setTimeout(() => {
      s.playbackResetTimer = null;
      s.turnManager.reset();
    }, 20000);
  } finally {
    if (s.activePipelineTurnId === myTurn) {
      s.activePipelineTurnId = null;
    }
    // M4: always remove our abort flag from the registry, even on
    // crash. doInterrupt() may have already cleared the set, in which
    // case this is a no-op.
    s.turnAborters.delete(myAbort);
  }
}

function handleClientBinaryAudio(
  data: WebSocket.RawData,
  clientWs: WebSocket,
  s: ServerVoiceSessionState,
) {
  const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);

  // Reassemble into exact FRAME_BYTES-sized Cobra frames.
  const combined = Buffer.concat([s.frameRemainder, buf]);
  let pos = 0;

  while (pos + s.FRAME_BYTES <= combined.length) {
    const frame = new Int16Array(s.FRAME_LENGTH);
    for (let i = 0; i < s.FRAME_LENGTH; i++) {
      frame[i] = combined.readInt16LE(pos + i * 2);
    }
    pos += s.FRAME_BYTES;

    // Cobra VAD:
    // Cobra tracks when the user is speaking vs silent. Its output drives
    // TurnManager state (USER_SPEAKING / PROCESSING) but does NOT trigger
    // interrupt — that comes from Soniox non-final tokens so echo can't fool it.
    let voiceProb = 0;
    try {
      if (!s.cobra) {
        continue;
      }
      voiceProb = s.cobra.process(frame);
    } catch (err) {
      logger.error("[VAD] Cobra process error:", err);
    }

    const isVoice = voiceProb >= VOICE_THRESHOLD;

    if (isVoice) {
      s.voiceFrameCount++;
      s.silenceFrameCount = 0;
      if (!s.isSpeaking && s.voiceFrameCount >= VOICE_FRAMES_TO_START) {
        s.isSpeaking = true;
        logger.info(`[VAD] Speech start (prob=${voiceProb.toFixed(2)})`);
        s.bus.publish({ type: "vad_start" });
      }
    } else {
      s.voiceFrameCount = 0;
      if (s.isSpeaking) {
        s.silenceFrameCount++;
        if (s.silenceFrameCount >= SILENCE_FRAMES_TO_STOP) {
          s.isSpeaking = false;
          s.silenceFrameCount = 0;
          logger.info("[VAD] Speech stop");
          s.bus.publish({ type: "vad_stop" });
        }
      }
    }

    // Always forward every frame to Soniox for continuous transcription.
    if (s.sonioxWs?.readyState === WebSocket.OPEN) {
      s.sonioxWs.send(Buffer.from(frame.buffer));
    }
  }

  s.frameRemainder = combined.subarray(pos);
}

async function handleVoiceConnection(
  clientWs: WebSocket,
  ctx: ServerVoiceConnectionCtx,
) {
  const { neurolink, accessKey } = ctx;
  logger.info("[WS] Client connected");

  // --- Per-session Cobra instance ---
  // Use definite-assignment via early return on catch — avoids dead initial
  // values that ESLint flags as `no-useless-assignment` and matches the
  // intent: if cobra init fails, the connection cannot proceed.
  let cobra: CobraInstance;
  let FRAME_LENGTH: number;
  try {
    cobra = await loadCobra(accessKey);
    FRAME_LENGTH = cobra.frameLength;
    logger.info(`[VAD] Cobra ready (frameLength=${FRAME_LENGTH})`);
  } catch (err) {
    logger.error("[VAD] Cobra init failed:", err);
    clientWs.close();
    return;
  }
  const FRAME_BYTES = FRAME_LENGTH * 2;

  // --- Per-session state ---
  const bus = new FrameBus();
  const s: ServerVoiceSessionState = {
    cobra,
    FRAME_LENGTH,
    FRAME_BYTES,
    bus,
    turnManager: new TurnManager(bus),
    sonioxWs: null,
    keepAliveTimer: null,
    sonioxReconnectTimer: null,
    sessionClosed: false,
    transcriptBuffer: "",
    activeTTS: null,
    conversation: [],
    currentTurnId: 0,
    activePipelineTurnId: null,
    // M4: per-turn abort flags. doInterrupt() flips every flag in this
    // set so any concurrent processTurn invocation can detect abort at
    // every await suspension — without relying on the `myTurn !==
    // currentTurnId` surrogate (which had edge cases when a stale
    // pipeline was mid-await on a closed TTS stream).
    turnAborters: new Set(),
    // Safety fallback: if the client never sends playback_done (crash, network drop),
    // auto-reset the turn state after this many ms so the assistant isn't stuck.
    playbackResetTimer: null,
    // Timestamp (ms) before which barge-in via Soniox is suppressed.
    // Set when TTS starts playing to prevent TTS echo from triggering immediate re-interrupt.
    // AEC on the browser needs ~300-400ms to characterise the echo signal before suppressing it.
    bargeInLockedUntil: 0,
    // Cobra VAD state
    isSpeaking: false,
    silenceFrameCount: 0,
    voiceFrameCount: 0,
    frameRemainder: Buffer.alloc(0),
  };

  /* ======= INTERRUPT ======= */

  function doInterrupt() {
    logger.info("[INTERRUPT] Cutting TTS");
    if (s.playbackResetTimer) {
      clearTimeout(s.playbackResetTimer);
      s.playbackResetTimer = null;
    }
    s.bargeInLockedUntil = 0;
    s.currentTurnId++;
    s.activePipelineTurnId = null;
    // M4: signal every in-flight processTurn that it's been aborted so
    // their await-checkpoints exit immediately, instead of unwinding
    // through awaits on a stream that's already being closed below.
    for (const a of s.turnAborters) {
      a.aborted = true;
    }
    s.turnAborters.clear();
    s.transcriptBuffer = "";
    s.isSpeaking = false;
    s.silenceFrameCount = 0;
    s.voiceFrameCount = 0;
    if (s.activeTTS) {
      closeTts(s.activeTTS, "[INTERRUPT] Failed to close active TTS stream");
      s.activeTTS = null;
    }
    s.turnManager.reset();
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ type: "interrupt" }));
    }
  }

  /* ======= SONIOX ======= */

  function startKeepAlive() {
    s.keepAliveTimer = setInterval(() => {
      if (s.sonioxWs?.readyState === WebSocket.OPEN) {
        s.sonioxWs.send(JSON.stringify({ type: "keepalive" }));
      }
    }, 8000);
  }

  function stopKeepAlive() {
    if (s.keepAliveTimer) {
      clearInterval(s.keepAliveTimer);
      s.keepAliveTimer = null;
    }
  }

  async function handleSonioxMessage(msg: WebSocket.RawData) {
    const data = parseSonioxMessage(msg);
    if (!data) {
      return;
    }

    if (!Array.isArray(data.tokens)) {
      if (data.error || data.status || data.type) {
        if (logger.shouldLog("debug")) {
          logger.info("[SONIOX] msg:", JSON.stringify(data));
        }
      }
      return;
    }

    const tokens = data.tokens;

    // Barge-in detection:
    // Soniox non-final tokens = real speech is being recognised right now.
    // Browser AEC (echo cancellation) suppresses TTS playback at the mic, so
    // non-final tokens can only come from the user's own voice — unlike raw
    // Cobra probability which can be fooled by speaker echo.
    // We only fire interrupt when the TurnManager confirms TTS is actually
    // playing (ASSISTANT_SPEAKING state set by processTurn).
    // bargeInLockedUntil suppresses the first ~400ms after TTS starts so that
    // TTS audio picked up by the mic (before AEC locks on) can't re-trigger.
    if (
      s.turnManager.state === TurnState.ASSISTANT_SPEAKING &&
      Date.now() > s.bargeInLockedUntil
    ) {
      const speechPartials = tokens.filter(
        (token) =>
          !token.is_final && token.text && token.text.trim().length > 1,
      );
      if (speechPartials.length > 0) {
        logger.info(
          `[BARGE-IN] Detected via Soniox: "${speechPartials.map((token) => token.text).join("")}"`,
        );
        doInterrupt();
        return;
      }
    }

    const finals = tokens.filter((token) => token.is_final && token.text);
    if (!finals.length) {
      return;
    }

    s.transcriptBuffer += finals.map((token) => token.text).join("");

    const hasEnd = finals.some((token) => token.text === "<end>");
    if (!hasEnd) {
      return;
    }

    const finalText = s.transcriptBuffer.replace("<end>", "").trim();
    s.transcriptBuffer = "";

    if (!finalText) {
      return;
    }

    logger.info("[STT] Final ->", finalText);
    try {
      await processTurn(finalText, clientWs, neurolink, s);
    } catch (err) {
      logger.error(
        "[PIPELINE] Unhandled error in processTurn:",
        (err as Error).message,
      );
      s.turnManager.reset();
    }
  }

  function connectSoniox() {
    const ws = new WebSocket(SONIOX_URL);
    s.sonioxWs = ws;

    ws.on("open", () => {
      logger.info("[SONIOX] Connected");
      // C3: build the auth frame in a sealed scope. The api_key is only
      // serialised inside ws.send(); never expose the assembled object
      // to any logger or telemetry sink. If you ever need to log the
      // outbound payload during debugging, use the redacted clone via
      // `redactSonioxAuth(payload)` defined below — never JSON.stringify
      // the raw object.
      const authPayload = {
        api_key: getSonioxApiKey(),
        model: "stt-rt-preview",
        audio_format: "auto",
        language_hints: ["en"],
        enable_endpoint_detection: true,
      };
      ws.send(JSON.stringify(authPayload));
      ws.send(makeWavHeader(16000, 1));
      startKeepAlive();
    });

    ws.on("message", handleSonioxMessage);
    ws.on("close", (code, reason) => {
      logger.info(
        `[SONIOX] Closed: code=${code} reason=${reason.toString() || "(none)"}`,
      );
      stopKeepAlive();
      if (!s.sessionClosed) {
        s.sonioxReconnectTimer = setTimeout(() => {
          s.sonioxReconnectTimer = null;
          connectSoniox();
        }, 500);
      }
    });
    ws.on("error", (err) => {
      logger.error("[SONIOX] Error:", err.message);
    });
  }

  /* ======= CLIENT AUDIO + CONTROL ======= */

  clientWs.on("message", (data, isBinary) => {
    if (!isBinary) {
      // Text frame — parse as JSON control message
      const msg = parseClientControlMessage(data.toString());
      if (msg?.type === "playback_done") {
        // Client finished playing all audio — now it's safe to listen again.
        if (s.playbackResetTimer) {
          clearTimeout(s.playbackResetTimer);
          s.playbackResetTimer = null;
        }
        s.turnManager.reset();
      }
      return;
    }
    handleClientBinaryAudio(data, clientWs, s);
  });

  clientWs.on("close", () => {
    logger.info("[WS] Client disconnected");
    s.sessionClosed = true;
    // Cancel any in-flight processTurn pipelines so LLM/TTS work doesn't
    // keep running after the client is gone (otherwise the LLM stream keeps
    // pulling and the Cartesia flush waits its full 10s window).
    for (const a of s.turnAborters) {
      a.aborted = true;
    }
    s.turnAborters.clear();
    s.activePipelineTurnId = null;
    // Cancel all pending timers to prevent callbacks on dead sessions
    if (s.playbackResetTimer) {
      clearTimeout(s.playbackResetTimer);
      s.playbackResetTimer = null;
    }
    if (s.sonioxReconnectTimer) {
      clearTimeout(s.sonioxReconnectTimer);
      s.sonioxReconnectTimer = null;
    }
    if (s.cobra) {
      s.cobra.release();
    }
    closeTts(s.activeTTS, "[WS] Failed to close active TTS on disconnect");
    stopKeepAlive();
    if (s.sonioxWs) {
      s.sonioxWs.close();
    }
  });

  connectSoniox();
}

export function setupWebSocket(
  server: HttpServer,
  options: import("../../types/index.js").ServerVoiceWebSocketOptions = {},
) {
  // NEW11: maxPayload protects against OOM on giant inbound frames.
  // verifyClient enforces auth on the upgrade handshake before any session
  // resources are allocated.
  const wss = new WebSocketServer({
    server,
    maxPayload: options.maxPayload ?? 1_048_576,
    verifyClient: createVerifyClient(options.authToken),
  });

  const accessKey = process.env.PICOVOICE_ACCESS_KEY;
  if (!accessKey) {
    throw new Error("PICOVOICE_ACCESS_KEY is not set in environment");
  }

  const neurolink = new NeuroLink();

  wss.on("connection", (clientWs) => {
    void handleVoiceConnection(clientWs, { neurolink, accessKey }).catch(
      (err) => {
        logger.error("[WS] Connection handler failed:", err);
        clientWs.close();
      },
    );
  });
}
