/**
 * Per-call memory for the realtime (speech-to-speech) voice agent.
 *
 * Decides, once per call and before anything else is wired, whether this call
 * may be remembered: the room metadata must carry a memory binding that
 * verifies against the shared secret and the actual room name. If it does, a
 * NeuroLink instance is built, the conversation's recent history is read for
 * seeding, and a turn recorder is created that writes each finished exchange
 * through `recordConversationTurn`. If it does not, the call proceeds exactly
 * as it would without memory, and a warning says why (never the ids).
 *
 * The shutdown flush is registered here, before the job lifecycle installs its
 * process reaper. LiveKit starts every shutdown callback in registration order
 * and the reaper exits the process about a second later, so the flush gets a
 * budget below that second and starts first.
 *
 * See docs/features/livekit-voice-agent.md.
 */

import type { JobContext } from "@livekit/agents";
import { context, trace } from "@opentelemetry/api";
import { AIProviderName } from "../../constants/enums.js";
import { setLangfuseContext } from "../../services/server/ai/observability/instrumentation.js";
import { observe, observeTrace } from "../../telemetry/observation.js";
import { tracers } from "../../telemetry/tracers.js";
import { logger } from "../../utils/logger.js";
import {
  VOICE_MEMORY_SECRET_ENV,
  verifyVoiceMemoryBinding,
} from "./memoryBinding.js";
import { createVoiceTurnRecorder } from "./turnRecorder.js";
import type {
  ConversationSeedMessage,
  LiveKitVoiceEventType,
  RealtimeCallMemory,
  RealtimeVoiceBackend,
  RealtimeVoiceMemoryConfig,
  VoiceTurnRecord,
} from "../../types/index.js";

const DEFAULT_FLUSH_BUDGET_MS = 800;

/** The provider a backend's turn spans are attributed to: Gemini Live runs on Vertex AI, Grok Voice on xAI. */
const TRACE_PROVIDER: Record<RealtimeVoiceBackend, AIProviderName> = {
  gemini: AIProviderName.VERTEX,
  xai: AIProviderName.XAI,
};

function traceTurn(
  turn: VoiceTurnRecord,
  call: {
    sessionId: string;
    userId: string;
    roomName?: string;
    model?: string;
    provider: AIProviderName;
  },
): void {
  const { sessionId, userId, roomName, model, provider } = call;
  try {
    setLangfuseContext(
      {
        sessionId,
        userId,
        tags: ["voice"],
        traceName: "realtime-turn",
        metadata: { roomName },
      },
      () => {
        const level = turn.interrupted ? "WARNING" : undefined;
        const endTime = new Date();
        const root = tracers.sdk.startSpan("realtime-turn", {
          startTime: turn.startTime,
        });
        observe(root, "agent", {
          input: turn.userMessage,
          output: turn.aiResponse,
          level,
        });
        observeTrace(root, {
          input: turn.userMessage,
          output: turn.aiResponse,
        });
        const inRoot = trace.setSpan(context.active(), root);
        const generation = tracers.generation.startSpan(
          "realtime",
          { startTime: turn.startTime },
          inRoot,
        );
        observe(generation, "generation", {
          ...(model && { model }),
          input: [{ role: "user", content: turn.userMessage }],
          output: [{ role: "assistant", content: turn.aiResponse }],
          level,
          metadata: { provider },
        });
        generation.end(endTime);

        const events = turn.events ?? [];
        for (const start of events.filter((e) => e.type === "tool:start")) {
          const end = events.find(
            (e) =>
              e.type === "tool:end" &&
              e.tool === start.tool &&
              e.seq > start.seq,
          );
          const tool = tracers.sdk.startSpan(
            String(start.tool),
            { startTime: start.timestamp },
            inRoot,
          );
          observe(tool, "tool", {
            input: start.args,
            output: end?.result ?? end?.error,
            level: end?.success === false ? "ERROR" : undefined,
          });
          tool.end(Math.min(end?.timestamp ?? Infinity, endTime.getTime()));
        }
        root.end(endTime);
      },
    );
  } catch (error) {
    logger.debug("realtime.memory.traceFailed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Verify the call's binding and prepare its recorder; `undefined` means "no
 * memory for this call". `call` names the model and the realtime backend the
 * call runs on, which the turn spans carry as `model` and `provider`; the
 * backend defaults to `gemini`, the original and default one.
 */
export async function setUpRealtimeCallMemory(
  ctx: Pick<JobContext, "room" | "addShutdownCallback">,
  config: RealtimeVoiceMemoryConfig | undefined,
  call: { model?: string; backend?: RealtimeVoiceBackend } = {},
): Promise<RealtimeCallMemory | undefined> {
  const { model, backend = "gemini" } = call;
  if (!config) {
    return undefined;
  }
  const verdict = verifyVoiceMemoryBinding({
    roomMetadata: ctx.room.metadata,
    roomName: ctx.room.name,
    secret: config.secret ?? process.env[VOICE_MEMORY_SECRET_ENV],
  });
  if (!verdict.ok) {
    logger.warn("realtime.memory.bindingRejected", {
      reason: verdict.reason,
      action: "continuing-without-memory",
    });
    return undefined;
  }
  const { userId, sessionId } = verdict;

  let neurolink: Awaited<
    ReturnType<RealtimeVoiceMemoryConfig["createNeuroLink"]>
  >;
  try {
    neurolink = await config.createNeuroLink();
  } catch (error) {
    logger.error("realtime.memory.setupFailed", {
      error: error instanceof Error ? error.message : String(error),
      action: "continuing-without-memory",
    });
    return undefined;
  }

  let publish:
    | ((type: LiveKitVoiceEventType, data: Record<string, unknown>) => void)
    | undefined;
  const tracedTurns = new Set<string>();
  const recorder = createVoiceTurnRecorder({
    ...(config.settleMs !== undefined ? { settleMs: config.settleMs } : {}),
    write: async (turn) => {
      if (!tracedTurns.has(turn.turnId)) {
        tracedTurns.add(turn.turnId);
        traceTurn(turn, {
          sessionId,
          userId,
          roomName: ctx.room.name,
          model,
          provider: TRACE_PROVIDER[backend],
        });
      }
      const result = await neurolink.recordConversationTurn({
        sessionId,
        userId,
        userMessage: turn.userMessage,
        aiResponse: turn.aiResponse,
        modality: "voice",
        turnId: turn.turnId,
        interrupted: turn.interrupted,
        callEnded: turn.callEnded,
        startTime: turn.startTime,
        ...(turn.events ? { events: turn.events } : {}),
      });
      if (!result.recorded) {
        logger.debug("realtime.memory.turnSkipped", {
          reason: result.reason,
          turnId: turn.turnId,
        });
      }
    },
    onPermanentFailure: (turn) => {
      publish?.("memory", { state: "not-saved", turnId: turn.turnId });
    },
  });
  ctx.addShutdownCallback(async () => {
    const stats = await recorder.flush(
      config.flushBudgetMs ?? DEFAULT_FLUSH_BUDGET_MS,
    );
    logger.info("realtime.memory.flushed", { ...stats });
  });

  let seed: ConversationSeedMessage[] = [];
  if (config.seed !== false && neurolink.getConversationSeed) {
    try {
      seed = await neurolink.getConversationSeed({
        sessionId,
        userId,
        ...(config.seed?.maxTurns !== undefined
          ? { maxTurns: config.seed.maxTurns }
          : {}),
        ...(config.seed?.maxChars !== undefined
          ? { maxChars: config.seed.maxChars }
          : {}),
      });
    } catch (error) {
      logger.warn("realtime.memory.seedFailed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  logger.info("realtime.memory.enabled", { seeded: seed.length });

  return {
    recorder,
    seed,
    setPublisher: (publisher) => {
      publish = publisher;
    },
  };
}
