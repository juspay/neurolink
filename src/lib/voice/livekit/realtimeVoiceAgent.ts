/**
 * LiveKit Agents agent definition — realtime (speech-to-speech).
 *
 * `defineRealtimeVoiceAgent` returns the agent object placed as the default
 * export of a worker entry file. Unlike the cascaded `defineVoiceAgent`
 * (Silero VAD → STT → NeuroLink → TTS), here a single realtime model (Gemini
 * Live on Vertex, or xAI Grok Voice) does STT + reasoning + TTS + turn
 * detection over one connection. The backend is chosen by `VOICE_REALTIME_BACKEND`
 * or the `backend` option; Gemini Live is the default.
 *
 * `@livekit/agents`, the backend's LiveKit plugin (see `realtimeModel.ts`),
 * `@livekit/rtc-node`, and `@google/genai` are imported dynamically so the core
 * package does not require them unless the realtime agent is used. Type-only
 * imports are erased at build.
 *
 * See docs/features/livekit-voice-agent.md.
 */

import { z } from "zod";
import type { JobContext, llm as llmNs } from "@livekit/agents";
import { logger } from "../../utils/logger.js";
import { resolveRealtimeVoiceConfig } from "./config.js";
import { ensureVertexAdc, clearGeminiApiKeyEnv } from "./vertexAuth.js";
import { createRealtimeLlm, requireXaiApiKey } from "./realtimeModel.js";
import { readCallContextFromRoom } from "./roomContext.js";
import { attachRealtimeEventBridge } from "./realtimeEventBridge.js";
import { buildRealtimeMcpTools } from "./realtimeMcpTools.js";
import { setUpRealtimeCallMemory } from "./realtimeMemory.js";
import type {
  RealtimeVoiceAgentConfig,
  RealtimeVoiceConfig,
} from "../../types/index.js";

const realtimeLogEventSchema = z.object({
  level: z.enum(["debug", "info", "warn", "error"]),
  message: z.string(),
  timestamp: z.number(),
  data: z.unknown().optional(),
});

/**
 * Install the per-call job lifecycle: shut down when the caller leaves, log
 * connection transitions, run the empty-room / join-deadline watchdog, and reap
 * the worker (parent) + this job (child) on shutdown.
 *
 * In `connect` mode the worker does NOT exit when a job shuts down, so the child
 * must SIGTERM its parent and hard-exit itself.
 */
async function installRealtimeJobLifecycle(
  ctx: JobContext,
  cfg: RealtimeVoiceConfig,
): Promise<void> {
  const { RoomEvent } = await import("@livekit/rtc-node");
  const joinedAt = Date.now();

  ctx.room.on(RoomEvent.ParticipantDisconnected, () => {
    if (ctx.room.remoteParticipants.size === 0) {
      logger.info("realtime.room.participantLeft", {
        remotes: 0,
        action: "shutdown",
      });
      ctx.shutdown("participant left");
    }
  });
  const logConn =
    (label: string) =>
    (...args: unknown[]): void => {
      if (!logger.shouldLog("debug")) {
        return;
      }
      logger.debug("realtime.room.connection", {
        event: label,
        remotes: ctx.room.remoteParticipants.size,
        ...(args.length ? { detail: JSON.stringify(args).slice(0, 200) } : {}),
      });
    };
  ctx.room.on(RoomEvent.Disconnected, (...args) => {
    logConn("Disconnected")(...args);
    ctx.shutdown("room disconnected");
  });
  ctx.room.on(RoomEvent.Reconnecting, logConn("Reconnecting"));
  ctx.room.on(RoomEvent.Reconnected, logConn("Reconnected"));
  ctx.room.on(
    RoomEvent.ConnectionStateChanged,
    logConn("ConnectionStateChanged"),
  );
  ctx.room.on(
    RoomEvent.ConnectionQualityChanged,
    logConn("ConnectionQualityChanged"),
  );

  let sawParticipant = ctx.room.remoteParticipants.size > 0;
  let emptySince: number | null = null;
  const emptyRoomWatchdog = setInterval(() => {
    const remotes = ctx.room.remoteParticipants.size;
    if (remotes > 0) {
      sawParticipant = true;
      emptySince = null;
      return;
    }
    if (sawParticipant) {
      emptySince ??= Date.now();
      if (Date.now() - emptySince >= cfg.emptyRoomGraceMs) {
        logger.info("realtime.watchdog.emptyRoom", {
          graceMs: cfg.emptyRoomGraceMs,
          action: "shutdown",
        });
        ctx.shutdown("empty-room watchdog");
      }
    } else if (Date.now() - joinedAt >= cfg.joinDeadlineMs) {
      logger.info("realtime.watchdog.joinDeadline", {
        joinDeadlineMs: cfg.joinDeadlineMs,
        action: "shutdown",
      });
      ctx.shutdown("join-deadline watchdog");
    }
  }, 5000);
  emptyRoomWatchdog.unref?.();
  ctx.addShutdownCallback(async () => {
    clearInterval(emptyRoomWatchdog);
  });

  if (process.env.LK_REALTIME_CONNECT_MODE === "true") {
    ctx.addShutdownCallback(async () => {
      const parentPid = process.ppid;
      logger.info("realtime.reap.parent", {
        mode: "connect",
        jobPid: process.pid,
        parentPid,
      });
      if (typeof parentPid === "number" && parentPid > 1) {
        try {
          process.kill(parentPid, "SIGTERM");
        } catch {
          logger.debug("realtime.reap.parentGone", { parentPid });
        }
      }
      setTimeout(() => {
        process.exit(0);
      }, 1000);
    });
  }
}

/** Merge caller overrides over the env-resolved realtime config. */
function resolveConfig(
  overrides: RealtimeVoiceAgentConfig,
): RealtimeVoiceConfig {
  const base = resolveRealtimeVoiceConfig({
    backend: overrides.backend,
    xaiBaseURL: overrides.xaiBaseURL,
  });
  return {
    ...base,
    project: overrides.project ?? base.project,
    location: overrides.location ?? base.location,
    model: overrides.model ?? base.model,
    voice: overrides.voice ?? base.voice,
    responseModality: overrides.responseModality ?? base.responseModality,
    systemPrompt: overrides.systemPrompt ?? base.systemPrompt,
    greeting: overrides.greeting ?? base.greeting,
    toolsEnabled: overrides.tools?.enabled ?? base.toolsEnabled,
    mcpUrl: overrides.tools?.mcpUrl ?? base.mcpUrl,
  };
}

/**
 * Define a realtime (speech-to-speech) LiveKit voice agent: Gemini Live by
 * default, xAI Grok Voice with `VOICE_REALTIME_BACKEND=xai` or `backend: "xai"`.
 *
 * Place the result as the default export of the worker entry file and launch it
 * with `startRealtimeVoiceAgentWorker`. With no `config` everything is resolved
 * from the environment (see `resolveRealtimeVoiceConfig`).
 */
export function defineRealtimeVoiceAgent(
  config: RealtimeVoiceAgentConfig = {},
): { entry: (ctx: JobContext) => Promise<void> } {
  const cfg = resolveConfig(config);
  const eventsTopic = config.eventsTopic;
  const controlTopic = config.controlTopic;
  const onLog = config.onLog;
  const memoryConfig = config.memory;

  async function entry(ctx: JobContext): Promise<void> {
    const isGemini = cfg.backend === "gemini";
    if (isGemini) {
      // The Gemini Live WS authenticates to Vertex via ADC; materialise it and
      // force ADC (not an API key) auth before any realtime connection.
      ensureVertexAdc();
      clearGeminiApiKeyEnv();
    } else {
      requireXaiApiKey();
    }

    logger.info("realtime.config", {
      backend: cfg.backend,
      model: cfg.model,
      ...(isGemini
        ? { location: cfg.location, project: cfg.project ?? null }
        : {}),
      voice: cfg.voice ?? null,
      ...(isGemini
        ? { modality: cfg.responseModality }
        : { customBaseURL: cfg.xaiBaseURL !== undefined }),
      toolsEnabled: cfg.toolsEnabled,
      mcpUrl: cfg.mcpUrl,
    });

    await ctx.connect();
    const connectedAt = Date.now();
    const sinceConnect = (): number => Date.now() - connectedAt;

    if (onLog) {
      const room = ctx.room.name ?? "unknown";
      const voiceLogEmitter = {
        emit: (event: string, ...args: unknown[]): boolean => {
          if (event === "log-event") {
            const decoded = realtimeLogEventSchema.safeParse(args[0]);
            if (decoded.success) {
              try {
                onLog(decoded.data, { room });
              } catch {
                /* a log sink must never break the call */
              }
            }
          }
          return true;
        },
      };
      logger.setEventEmitter(voiceLogEmitter);
      ctx.addShutdownCallback(async () => {
        // Clear only if this agent's emitter is still the active sink —
        // never yank a bridge some other instance installed since.
        logger.clearEventEmitter(voiceLogEmitter);
      });
    }

    logger.info("realtime.room.joined", {
      room: ctx.room.name ?? "unknown",
      backend: cfg.backend,
      model: cfg.model,
      ...(isGemini ? { location: cfg.location } : {}),
      ms: sinceConnect(),
    });

    // Decide whether this call may be remembered BEFORE the lifecycle installs
    // its process reaper, so the shutdown flush is registered first.
    const memory = await setUpRealtimeCallMemory(ctx, memoryConfig, {
      model: cfg.model,
      backend: cfg.backend,
    });

    await installRealtimeJobLifecycle(ctx, cfg);

    const { voice } = await import("@livekit/agents");
    const realtimeLlm = await createRealtimeLlm(cfg);

    const bridge = await attachRealtimeEventBridge({
      room: ctx.room,
      hitlTimeoutMs: cfg.hitlTimeoutMs,
      ...(eventsTopic !== undefined ? { eventsTopic } : {}),
      ...(controlTopic !== undefined ? { controlTopic } : {}),
    });
    ctx.addShutdownCallback(async () => {
      bridge.dispose();
    });
    memory?.setPublisher(bridge.publishEvent);

    let agentTools: llmNs.ToolContext | undefined;
    if (cfg.toolsEnabled) {
      const { authToken, xContext } = readCallContextFromRoom(
        ctx.room.metadata,
      );
      if (xContext === "") {
        logger.warn("realtime.mcp.noContext", {
          reason: "room-metadata-missing-context",
          action: "running-without-tools",
        });
      } else {
        try {
          const toolset = await buildRealtimeMcpTools({
            mcpUrl: cfg.mcpUrl,
            authToken,
            xContext,
            publishEvent: bridge.publishEvent,
            requestConfirmation: bridge.requestConfirmation,
            ...(memory
              ? {
                  onToolStart: (call) => memory.recorder.toolStart(call),
                  onToolEnd: (call) => memory.recorder.toolEnd(call),
                }
              : {}),
          });
          agentTools = toolset.tools;
          logger.info("realtime.mcp.enabled", {
            mcpUrl: cfg.mcpUrl,
            toolCount: Object.keys(toolset.tools).length,
            hasAuthToken: authToken !== "",
          });
          ctx.addShutdownCallback(async () => {
            await toolset.client.close();
          });
        } catch (error) {
          logger.error("realtime.mcp.setupFailed", {
            mcpUrl: cfg.mcpUrl,
            error: error instanceof Error ? error.message : String(error),
            action: "running-without-tools",
          });
        }
      }
    }

    const session = new voice.AgentSession({
      // `RealtimeLlm` is declared structurally so the published declarations
      // name no optional plugin; both backends return a `RealtimeModel`.
      llm: realtimeLlm as llmNs.RealtimeModel,
    });
    // The conversation so far, so a call that appends to an open conversation
    // starts knowing it. Empty (and omitted) when there is nothing to seed.
    let seededChatCtx: llmNs.ChatContext | undefined;
    if (memory && memory.seed.length > 0) {
      const { llm } = await import("@livekit/agents");
      seededChatCtx = llm.ChatContext.empty();
      for (const message of memory.seed) {
        seededChatCtx.addMessage({
          role: message.role,
          content: message.content,
        });
      }
    }
    const agent = new voice.Agent({
      instructions: cfg.systemPrompt,
      ...(agentTools ? { tools: agentTools } : {}),
      ...(seededChatCtx ? { chatCtx: seededChatCtx } : {}),
    });

    agent.transcriptionNode = async (textStream, _modelSettings) => {
      const [forUi, forDownstream] = textStream.tee();
      void (async () => {
        const reader = forUi.getReader();
        let chunkCount = 0;
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) {
              break;
            }
            const chunk =
              typeof value === "string" ? value : (value.text ?? "");
            if (chunk) {
              chunkCount += 1;
              if (chunkCount === 1) {
                logger.debug("realtime.session.assistantFirstChunk", {
                  ms: sinceConnect(),
                  preview: chunk.slice(0, 30),
                });
              }
              bridge.publishEvent("text", { delta: chunk });
              memory?.recorder.assistantDelta(chunk);
            }
          }
        } catch {
          /* best-effort live streaming */
        }
      })();
      return forDownstream;
    };

    session.on(voice.AgentSessionEventTypes.MetricsCollected, (ev) => {
      const metrics = ev.metrics;
      // xAI leaves `response.usage` empty, which is where the plugin reads, so
      // its metrics are zero; the xai model logs `realtime.usage` itself.
      if (!isGemini || metrics.type !== "realtime_model_metrics") {
        return;
      }
      const inAudio = metrics.inputTokenDetails.audioTokens;
      const outAudio = metrics.outputTokenDetails.audioTokens;
      const inText = Math.max(0, metrics.inputTokens - inAudio);
      const outText = Math.max(0, metrics.outputTokens - outAudio);
      logger.info("realtime.usage", {
        inputTokens: metrics.inputTokens,
        inputAudioTokens: inAudio,
        inputTextTokens: inText,
        outputTokens: metrics.outputTokens,
        outputAudioTokens: outAudio,
        outputTextTokens: outText,
      });
    });

    // --- Session events → browser ------------------------------------------
    session.on(voice.AgentSessionEventTypes.UserInputTranscribed, (ev) => {
      logger.debug("realtime.session.userTranscript", {
        ms: sinceConnect(),
        final: ev.isFinal,
        transcript: ev.transcript,
      });
      bridge.publishEvent("user-text", {
        text: ev.transcript,
        final: ev.isFinal,
      });
      memory?.recorder.userTranscript({
        text: ev.transcript,
        final: ev.isFinal,
      });
    });
    session.on(voice.AgentSessionEventTypes.AgentStateChanged, (ev) => {
      logger.debug("realtime.session.stateChanged", {
        ms: sinceConnect(),
        from: ev.oldState,
        to: ev.newState,
      });
      bridge.publishEvent("status", { state: ev.newState });
    });
    session.on(voice.AgentSessionEventTypes.ConversationItemAdded, (ev) => {
      if (
        ev.item.type === "message" &&
        ev.item.role === "assistant" &&
        ev.item.textContent
      ) {
        logger.debug("realtime.session.turnDone", { ms: sinceConnect() });
        // The id the stored messages carry, so a client can merge its live
        // copy of the turn with history instead of showing it twice.
        bridge.publishEvent("done", memory ? { turnId: ev.item.id } : {});
        memory?.recorder.assistantMessage({
          id: ev.item.id,
          text: ev.item.textContent,
          interrupted: ev.item.interrupted,
        });
      }
    });
    session.on(voice.AgentSessionEventTypes.Error, (ev) => {
      logger.error("realtime.session.error", {
        ms: sinceConnect(),
        error: ev.error,
      });
      bridge.publishEvent("status", { state: "error" });
    });

    await session.start({ agent, room: ctx.room });
    logger.info("realtime.session.start", { ms: sinceConnect() });
    bridge.publishEvent("status", { state: "listening" });

    if (cfg.greeting.trim().length > 0) {
      logger.info("realtime.session.greeting", { ms: sinceConnect() });
      memory?.recorder.expectGreeting();
      session.generateReply({ instructions: cfg.greeting });
    }
  }

  return { entry };
}
