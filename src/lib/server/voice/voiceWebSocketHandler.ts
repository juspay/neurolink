import WebSocket, { WebSocketServer } from "ws";
import { Cobra } from "@picovoice/cobra-node";
import type { Server as HttpServer } from "http";
import { FrameBus } from "./frameBus.js";
import { TurnManager, TurnState } from "./turnManager.js";
import { CartesiaStream } from "../../adapters/tts/cartesiaHandler.js";
import { NeuroLink } from "../../neurolink.js";
import { logger } from "../../utils/logger.js";
import { withTimeout } from "../../utils/async/withTimeout.js";

const SONIOX_URL =
  process.env.SONIOX_WS_URL ?? "wss://stt-rt.soniox.com/transcribe-websocket";

type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

type SonioxToken = {
  is_final?: boolean;
  text?: string;
};

type SonioxMessage = {
  error?: string;
  status?: string;
  type?: string;
  tokens?: SonioxToken[];
};

type ClientControlMessage = {
  type?: string;
};

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set in environment`);
  }
  return value;
}

/**
 * Call from the voice-server command handler BEFORE importing anything else
 * so the env change is scoped to voice mode only.
 */
export function configureVoiceServerEnvironment(): void {
  // Disable MCP tools for the voice server — tools add 5-7s of init latency
  // on every turn and are not needed for real-time voice interaction.
  process.env.NEUROLINK_DISABLE_MCP_TOOLS = "true";
}

let _sonioxApiKey: string | undefined;
function getSonioxApiKey(): string {
  if (!_sonioxApiKey) {
    _sonioxApiKey = getRequiredEnv("SONIOX_API_KEY");
  }
  return _sonioxApiKey;
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

export type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

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

export function setupWebSocket(server: HttpServer) {
  const wss = new WebSocketServer({ server });

  const accessKey = process.env.PICOVOICE_ACCESS_KEY;
  if (!accessKey) {
    throw new Error("PICOVOICE_ACCESS_KEY is not set in environment");
  }

  const neurolink = new NeuroLink();

  wss.on("connection", (clientWs) => {
    logger.info("[WS] Client connected");

    // --- Per-session Cobra instance ---
    let cobra: Cobra | null = null;
    let FRAME_LENGTH = 512;
    let FRAME_BYTES = FRAME_LENGTH * 2;
    try {
      cobra = new Cobra(accessKey);
      FRAME_LENGTH = cobra.frameLength;
      FRAME_BYTES = FRAME_LENGTH * 2;
      logger.info(`[VAD] Cobra ready (frameLength=${FRAME_LENGTH})`);
    } catch (err) {
      logger.error("[VAD] Cobra init failed:", err);
      clientWs.close();
      return;
    }

    // --- Per-session state ---
    const bus = new FrameBus();
    const turnManager = new TurnManager(bus);

    let sonioxWs: WebSocket | null = null;
    let keepAliveTimer: NodeJS.Timeout | null = null;

    let sessionClosed = false;
    let transcriptBuffer = "";
    let activeTTS: CartesiaStream | null = null;
    const conversation: ConversationMessage[] = [];
    let currentTurnId = 0;
    let activePipelineTurnId: number | null = null;
    // Safety fallback: if the client never sends playback_done (crash, network drop),
    // auto-reset the turn state after this many ms so the assistant isn't stuck.
    let playbackResetTimer: NodeJS.Timeout | null = null;
    // Timestamp (ms) before which barge-in via Soniox is suppressed.
    // Set when TTS starts playing to prevent TTS echo from triggering immediate re-interrupt.
    // AEC on the browser needs ~300-400ms to characterise the echo signal before suppressing it.
    let bargeInLockedUntil = 0;

    // Cobra VAD state
    let isSpeaking = false;
    let silenceFrameCount = 0;
    let voiceFrameCount = 0;
    let frameRemainder = Buffer.alloc(0);

    /* ======= INTERRUPT ======= */

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

    function doInterrupt() {
      logger.info("[INTERRUPT] Cutting TTS");
      if (playbackResetTimer) {
        clearTimeout(playbackResetTimer);
        playbackResetTimer = null;
      }
      bargeInLockedUntil = 0;
      currentTurnId++;
      activePipelineTurnId = null;
      transcriptBuffer = "";
      isSpeaking = false;
      silenceFrameCount = 0;
      voiceFrameCount = 0;
      if (activeTTS) {
        closeTts(activeTTS, "[INTERRUPT] Failed to close active TTS stream");
        activeTTS = null;
      }
      turnManager.reset();
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ type: "interrupt" }));
      }
    }

    /* ======= SONIOX ======= */

    function connectSoniox() {
      const ws = new WebSocket(SONIOX_URL);
      sonioxWs = ws;

      ws.on("open", () => {
        logger.info("[SONIOX] Connected");
        ws.send(
          JSON.stringify({
            api_key: getSonioxApiKey(),
            model: "stt-rt-preview",
            audio_format: "auto",
            language_hints: ["en"],
            enable_endpoint_detection: true,
          }),
        );
        ws.send(makeWavHeader(16000, 1));
        startKeepAlive();
      });

      ws.on("message", handleSonioxMessage);
      ws.on("close", (code, reason) => {
        logger.info(
          `[SONIOX] Closed: code=${code} reason=${reason.toString() || "(none)"}`,
        );
        stopKeepAlive();
        if (!sessionClosed) {
          setTimeout(() => {
            connectSoniox();
          }, 500);
        }
      });
      ws.on("error", (err) => {
        logger.error("[SONIOX] Error:", err.message);
      });
    }

    function startKeepAlive() {
      keepAliveTimer = setInterval(() => {
        if (sonioxWs?.readyState === WebSocket.OPEN) {
          sonioxWs.send(JSON.stringify({ type: "keepalive" }));
        }
      }, 8000);
    }

    function stopKeepAlive() {
      if (keepAliveTimer) {
        clearInterval(keepAliveTimer);
        keepAliveTimer = null;
      }
    }

    /* ======= STT HANDLER ======= */

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
        turnManager.state === TurnState.ASSISTANT_SPEAKING &&
        Date.now() > bargeInLockedUntil
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

      transcriptBuffer += finals.map((token) => token.text).join("");

      const hasEnd = finals.some((token) => token.text === "<end>");
      if (!hasEnd) {
        return;
      }

      const finalText = transcriptBuffer.replace("<end>", "").trim();
      transcriptBuffer = "";

      if (!finalText) {
        return;
      }

      logger.info("[STT] Final ->", finalText);
      try {
        await processTurn(finalText);
      } catch (err) {
        logger.error(
          "[PIPELINE] Unhandled error in processTurn:",
          (err as Error).message,
        );
        turnManager.reset();
      }
    }

    /* ======= TURN PROCESSOR ======= */

    async function processTurn(userText: string) {
      if (activePipelineTurnId !== null) {
        logger.info(
          "[PIPELINE] Already running — discarding duplicate STT final",
        );
        return;
      }
      currentTurnId++;
      const myTurn = currentTurnId;
      activePipelineTurnId = myTurn;
      const tSttEnd = now();

      try {
        // Build context without mutating `conversation` — only commit on full completion.
        const stream = await streamAnswer(neurolink, [
          ...conversation,
          { role: "user", content: userText },
        ]);
        if (myTurn !== currentTurnId) {
          return;
        }

        const tts = new CartesiaStream(`turn-${Date.now()}`);
        activeTTS = tts;
        await tts.ready();

        if (myTurn !== currentTurnId) {
          return;
        }

        // Register error handler immediately after ready() — before the LLM stream loop —
        // so Cartesia errors emitted mid-stream (during token sending) are captured.
        // Without this, errors during the for-await loop have no listener and are swallowed.
        let ttsError: Error | null = null;
        tts.on("error", (err: Error) => {
          ttsError = err;
          logger.error("[TTS] Mid-stream error:", err.message);
        });

        // Pre-lock barge-in BEFORE signaling assistant speaking.
        // Without this there is a ~700-1000ms gap where TurnState is ASSISTANT_SPEAKING
        // but bargeInLockedUntil=0, so Soniox residual tokens from the previous TTS echo
        // immediately trigger an interrupt before any audio has even been sent.
        bargeInLockedUntil = Date.now() + 1000;

        // Signal TurnManager that TTS is about to play — barge-in detection is now live.
        turnManager.assistantSpeaking();

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
          if (myTurn !== currentTurnId) {
            return;
          }
          if (!firstAudioSent) {
            firstAudioSent = true;
            // Refresh the lock from when audio ACTUALLY hits the client so it covers
            // the AEC lock-on window (~300-400ms for browser echo cancellation).
            // This extends the protection past the initial 1000ms pre-lock.
            bargeInLockedUntil = Date.now() + 400;
            logger.info(
              `[LATENCY] STT -> First Audio: ${(now() - tSttEnd).toFixed(0)}ms`,
            );
          }
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(audio);
          }
        });

        for await (const chunk of stream) {
          if (myTurn !== currentTurnId) {
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
          turnManager.reset();
          return;
        }

        if (myTurn !== currentTurnId) {
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
          turnManager.reset();
          return;
        }

        closeTts(tts, "[TTS] Failed to close stream after successful playback");

        if (!ttsSucceeded || myTurn !== currentTurnId) {
          return;
        }

        // Only commit conversation when the turn completed fully and was heard.
        conversation.push({ role: "user", content: userText });
        conversation.push({ role: "assistant", content: assistantReply });
        // Do NOT reset state here — the client is still playing buffered audio.
        // The client sends playback_done when the last audio chunk finishes playing,
        // which is the correct moment to return to IDLE and allow new user speech.
        // Safety fallback: if the client never sends playback_done (crash, disconnect),
        // auto-reset after 20 seconds so the assistant doesn't stay stuck.
        if (playbackResetTimer) {
          clearTimeout(playbackResetTimer);
        }
        playbackResetTimer = setTimeout(() => {
          playbackResetTimer = null;
          turnManager.reset();
        }, 20000);
      } finally {
        if (activePipelineTurnId === myTurn) {
          activePipelineTurnId = null;
        }
      }
    }

    /* ======= CLIENT AUDIO + CONTROL ======= */

    clientWs.on("message", (data) => {
      if (typeof data === "string") {
        const msg = parseClientControlMessage(data);
        if (msg?.type === "playback_done") {
          // Client finished playing all audio — now it's safe to listen again.
          if (playbackResetTimer) {
            clearTimeout(playbackResetTimer);
            playbackResetTimer = null;
          }
          turnManager.reset();
        }
        return;
      }

      if (!(data instanceof Buffer)) {
        return;
      }

      // Reassemble into exact FRAME_BYTES-sized Cobra frames.
      const combined = Buffer.concat([frameRemainder, data]);
      let pos = 0;

      while (pos + FRAME_BYTES <= combined.length) {
        const frame = new Int16Array(FRAME_LENGTH);
        for (let i = 0; i < FRAME_LENGTH; i++) {
          frame[i] = combined.readInt16LE(pos + i * 2);
        }
        pos += FRAME_BYTES;

        // Cobra VAD:
        // Cobra tracks when the user is speaking vs silent. Its output drives
        // TurnManager state (USER_SPEAKING / PROCESSING) but does NOT trigger
        // interrupt — that comes from Soniox non-final tokens so echo can't fool it.
        let voiceProb = 0;
        try {
          if (!cobra) {
            continue;
          }
          voiceProb = cobra.process(frame);
        } catch (err) {
          logger.error("[VAD] Cobra process error:", err);
        }

        const isVoice = voiceProb >= VOICE_THRESHOLD;

        if (isVoice) {
          voiceFrameCount++;
          silenceFrameCount = 0;
          if (!isSpeaking && voiceFrameCount >= VOICE_FRAMES_TO_START) {
            isSpeaking = true;
            logger.info(`[VAD] Speech start (prob=${voiceProb.toFixed(2)})`);
            bus.publish({ type: "vad_start" });
          }
        } else {
          voiceFrameCount = 0;
          if (isSpeaking) {
            silenceFrameCount++;
            if (silenceFrameCount >= SILENCE_FRAMES_TO_STOP) {
              isSpeaking = false;
              silenceFrameCount = 0;
              logger.info("[VAD] Speech stop");
              bus.publish({ type: "vad_stop" });
            }
          }
        }

        // Always forward every frame to Soniox for continuous transcription.
        if (sonioxWs?.readyState === WebSocket.OPEN) {
          sonioxWs.send(Buffer.from(frame.buffer));
        }
      }

      frameRemainder = combined.subarray(pos);
    });

    clientWs.on("close", () => {
      logger.info("[WS] Client disconnected");
      sessionClosed = true;
      if (cobra) {
        cobra.release();
      }
      closeTts(activeTTS, "[WS] Failed to close active TTS on disconnect");
      stopKeepAlive();
      if (sonioxWs) {
        sonioxWs.close();
      }
    });

    connectSoniox();
  });
}
