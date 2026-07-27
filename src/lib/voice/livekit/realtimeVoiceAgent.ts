/**
 * LiveKit Agents agent definition — realtime (Gemini Live speech-to-speech).
 *
 * `defineRealtimeVoiceAgent` returns the agent object placed as the default
 * export of a worker entry file. Unlike the cascaded `defineVoiceAgent`
 * (Silero VAD → STT → NeuroLink → TTS), here a single realtime model (Gemini
 * Live on Vertex) does STT + reasoning + TTS + turn detection over one
 *
 * `@livekit/agents`, `@livekit/agents-plugin-google`, `@livekit/rtc-node`, and
 * `@google/genai` are imported dynamically so the core package does not require
 * them unless the realtime agent is used. Type-only imports are erased at build.
 *
 * See docs/features/livekit-voice-agent.md.
 */

import { z } from "zod";
import type { JobContext, llm as llmNs } from "@livekit/agents";
import { logger } from "../../utils/logger.js";
import { resolveRealtimeVoiceConfig } from "./config.js";
import { ensureVertexAdc, clearGeminiApiKeyEnv } from "./vertexAuth.js";
import { readCallContextFromRoom } from "./roomContext.js";
import { attachRealtimeEventBridge } from "./realtimeEventBridge.js";
import { buildRealtimeMcpTools } from "./realtimeMcpTools.js";
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
  const base = resolveRealtimeVoiceConfig();
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
 * Define a realtime (Gemini Live S2S) LiveKit voice agent.
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

  async function entry(ctx: JobContext): Promise<void> {
    // The Gemini Live WS authenticates to Vertex via ADC; materialise it and
    // force ADC (not an API key) auth before any realtime connection.
    ensureVertexAdc();
    clearGeminiApiKeyEnv();

    logger.info("realtime.config", {
      model: cfg.model,
      location: cfg.location,
      project: cfg.project ?? null,
      voice: cfg.voice ?? null,
      modality: cfg.responseModality,
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
      model: cfg.model,
      location: cfg.location,
      ms: sinceConnect(),
    });

    await installRealtimeJobLifecycle(ctx, cfg);

    const { voice } = await import("@livekit/agents");
    const google = await import("@livekit/agents-plugin-google");
    const { Modality } = await import("@google/genai");

    const bridge = await attachRealtimeEventBridge({
      room: ctx.room,
      hitlTimeoutMs: cfg.hitlTimeoutMs,
      ...(eventsTopic !== undefined ? { eventsTopic } : {}),
      ...(controlTopic !== undefined ? { controlTopic } : {}),
    });
    ctx.addShutdownCallback(async () => {
      bridge.dispose();
    });

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

    const modality = Object.values(Modality).find(
      (value) => value === cfg.responseModality,
    );
    const modelOptions: NonNullable<
      ConstructorParameters<typeof google.realtime.RealtimeModel>[0]
    > = {
      vertexai: true,
      model: cfg.model,
      // Emit text transcripts of BOTH sides; LiveKit forwards them to the room.
      inputAudioTranscription: {},
      outputAudioTranscription: {},
    };
    if (modality !== undefined) {
      modelOptions.modalities = [modality];
    }
    if (cfg.project) {
      modelOptions.project = cfg.project;
    }
    if (cfg.location) {
      modelOptions.location = cfg.location;
    }
    if (cfg.voice) {
      modelOptions.voice = cfg.voice;
    }

    const session = new voice.AgentSession({
      llm: new google.realtime.RealtimeModel(modelOptions),
    });
    const agent = new voice.Agent({
      instructions: cfg.systemPrompt,
      ...(agentTools ? { tools: agentTools } : {}),
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
      if (metrics.type !== "realtime_model_metrics") {
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
        bridge.publishEvent("done", {});
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
      session.generateReply({ instructions: cfg.greeting });
    }
  }

  return { entry };
}
